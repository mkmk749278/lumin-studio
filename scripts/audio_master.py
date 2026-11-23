#!/usr/bin/env python3
"""Master the narration (+ optional ambient bed) to the channel target: -14 LUFS integrated, -1.5 dBTP.

Chain (FFmpeg only, deterministic):
  1. VO: two-pass EBU R128 loudnorm (measure, then apply linear gain) — no pumping on a calm voice.
  2. Bed (optional): normalised to BED_LUFS (-25), looped/trimmed to the VO length, faded in/out, then
     sidechain-ducked under the voice so it dips further while words are spoken and recovers in pauses.
  3. Mix, then a final two-pass loudnorm on the mix to land the master on -14 LUFS / -1.5 dBTP.
  4. Re-measure the written file and FAIL if it misses the target by more than the tolerance.

The master is ONE 48 kHz / 24-bit WAV that modal_render.py muxes in a single pass at the stitch step
(video chunks are rendered muted, so no AAC boundary clicks).

Usage:
    python3 scripts/audio_master.py --vo episodes/ep01/audio/vo.wav --out episodes/ep01/audio/master.wav
    python3 scripts/audio_master.py --vo vo.wav --bed bed.wav --out master.wav [--target -14 --tp -1.5]
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

BED_LUFS = -25.0
TOLERANCE_LU = 0.5


def log(msg: str) -> None:
    print(f"[master] {msg}", flush=True)


def run(cmd: list[str]) -> str:
    p = subprocess.run(cmd, capture_output=True, text=True)
    if p.returncode != 0:
        raise SystemExit(f"ffmpeg failed: {' '.join(cmd)}\n{p.stderr[-2000:]}")
    return p.stderr


def measure(path: str, pre: str = "", target: float = -14.0, tp: float = -1.5) -> dict:
    """loudnorm first pass: returns input_i / input_tp / input_lra / input_thresh / target_offset."""
    af = (pre + "," if pre else "") + f"loudnorm=I={target}:TP={tp}:LRA=11:print_format=json"
    err = run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-af", af, "-f", "null", "-"])
    block = re.findall(r"\{[^{}]*\"input_i\"[^{}]*\}", err, re.S)
    if not block:
        raise SystemExit(f"could not read loudnorm stats for {path}")
    return json.loads(block[-1])


def norm_filter(m: dict, target: float, tp: float) -> str:
    return (f"loudnorm=I={target}:TP={tp}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
            f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")


def duration(path: str) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
                         capture_output=True, text=True).stdout.strip()
    return float(out)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--vo", required=True)
    ap.add_argument("--bed")
    ap.add_argument("--out", required=True)
    ap.add_argument("--target", type=float, default=-14.0)
    ap.add_argument("--tp", type=float, default=-1.5)
    a = ap.parse_args()
    out = Path(a.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    dur = duration(a.vo)
    log(f"VO {a.vo}: {dur:.2f}s")

    m_vo = measure(a.vo, target=a.target, tp=a.tp)
    log(f"VO measured {m_vo['input_i']} LUFS, {m_vo['input_tp']} dBTP")
    vo_chain = f"aresample=48000,aformat=channel_layouts=stereo,{norm_filter(m_vo, a.target, a.tp)}"

    if a.bed:
        bed_pre = f"aresample=48000,aformat=channel_layouts=stereo,aloop=loop=-1:size=2e9,atrim=0:{dur:.3f}"
        m_bed = measure(a.bed, pre=bed_pre, target=BED_LUFS, tp=-6)
        log(f"bed measured {m_bed['input_i']} LUFS -> {BED_LUFS} LUFS, ducked under VO")
        fade_out = max(0.0, dur - 3)
        graph = (
            f"[0:a]{vo_chain},asplit=2[vo][key];"
            f"[1:a]{bed_pre},{norm_filter(m_bed, BED_LUFS, -6)},afade=t=in:d=2,afade=t=out:st={fade_out:.3f}:d=3[bed];"
            "[bed][key]sidechaincompress=threshold=0.03:ratio=4:attack=40:release=600:makeup=1[duck];"
            "[vo][duck]amix=inputs=2:duration=first:normalize=0[mix]"
        )
        tmp = out.with_suffix(".premix.wav")
        run(["ffmpeg", "-y", "-hide_banner", "-i", a.vo, "-i", a.bed, "-filter_complex", graph, "-map", "[mix]",
             "-c:a", "pcm_s24le", str(tmp)])
    else:
        tmp = out.with_suffix(".premix.wav")
        run(["ffmpeg", "-y", "-hide_banner", "-i", a.vo, "-af", vo_chain, "-c:a", "pcm_s24le", str(tmp)])

    # Final pass on the mix so the MASTER (not just the VO) is on target.
    m_mix = measure(str(tmp), target=a.target, tp=a.tp)
    run(["ffmpeg", "-y", "-hide_banner", "-i", str(tmp), "-af", f"{norm_filter(m_mix, a.target, a.tp)},aresample=48000",
         "-ar", "48000", "-c:a", "pcm_s24le", str(out)])
    tmp.unlink(missing_ok=True)

    check = measure(str(out), target=a.target, tp=a.tp)
    i, tp = float(check["input_i"]), float(check["input_tp"])
    ok = abs(i - a.target) <= TOLERANCE_LU and tp <= a.tp + 0.3
    log(f"master {out}: {i:.2f} LUFS, {tp:.2f} dBTP, {duration(str(out)):.2f}s -> {'PASS' if ok else 'FAIL'}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
