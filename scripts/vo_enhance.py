#!/usr/bin/env python3
"""Enhance the owner's recording blocks with Resemble Enhance and join them into one narration track.

  python3 scripts/vo_enhance.py episodes/<id> BLOCK1.mp3 BLOCK2.mp3 ...  [--backend modal|local]   (block order)

Backends:
  modal (default)  each block goes to a GPU container on Modal (modal_gpu.py, T4), all blocks in parallel. Needs
                   MODAL_TOKEN_ID / MODAL_TOKEN_SECRET — in practice this runs inside the `modal` GitHub workflow
                   (task: enhance), which holds them as repo secrets. Here: only `pip install modal numpy`.
  local            CPU in this process, in the Resemble venv (requirements-enhance.txt). Measured 23 NOV 2026 in a
                   cloud session: about 6x the audio's length (a 7.7 s block took 84 s), so ~50 min for an 8-min VO.

For each take: decode to 44.1 kHz mono, enhance (denoise + bandwidth/quality restoration), trim the take's own
leading/trailing silence, then join the blocks with one fixed pause (blocks end on paragraph breaks, so the pause is
a paragraph pause). Writes, in episodes/<id>/audio/ (gitignored; media lives on Drive):
  vo_raw.wav   the takes joined WITHOUT enhancement (the A/B reference)
  vo.wav       the takes enhanced and joined (what align_audio.py and audio_master.py read next)
and episodes/<id>/vo/enhance.json: input names + SHA-256, settings, durations, timings.

Settings: Resemble's `enhance` with a LOW denoise strength (lambd 0.1). A studio TTS take has almost no noise, and a
strong denoiser on clean speech eats breaths and consonant tails; nfe 64 / midpoint / tau 0.5 is the model's own
quality setting. Change them only after an A/B listen, and record why in enhance.json.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

import numpy as np

SR = 44100
GAP_S = 0.8          # pause inserted between blocks (a paragraph pause)
SILENCE_DB = -45.0   # threshold for trimming each take's own head/tail silence
KEEP_S = 0.08        # air kept at each trimmed edge
SETTINGS = {"mode": "enhance", "nfe": 64, "solver": "midpoint", "lambd": 0.1, "tau": 0.5}


def log(msg: str) -> None:
    print(f"[enhance] {msg}", flush=True)


def decode_bytes(data: bytes) -> np.ndarray:
    """Any audio file's bytes -> 44.1 kHz mono float32 (ffmpeg)."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         input=data, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def trim(w: np.ndarray) -> np.ndarray:
    thr = 10 ** (SILENCE_DB / 20)
    win = int(0.02 * SR)
    n = len(w) // win
    env = np.abs(w[: n * win]).reshape(n, win).max(axis=1)
    on = np.nonzero(env > thr)[0]
    if len(on) == 0:
        return w
    a = max(0, on[0] * win - int(KEEP_S * SR))
    b = min(len(w), (on[-1] + 1) * win + int(KEEP_S * SR))
    return w[a:b]


def join(parts: list[np.ndarray]) -> np.ndarray:
    gap = np.zeros(int(GAP_S * SR), dtype=np.float32)
    out: list[np.ndarray] = []
    for i, p in enumerate(parts):
        if i:
            out.append(gap)
        out.append(p)
    return np.concatenate(out)


def write(path: Path, w: np.ndarray) -> None:
    pcm = np.clip(w, -1, 1).astype(np.float32).tobytes()
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                    "-c:a", "pcm_s24le", str(path)], input=pcm, check=True)


def enhance_array(w: np.ndarray, device: str | None = None) -> np.ndarray:
    """Resemble Enhance on one mono 44.1 kHz array. Runs wherever resemble_enhance is installed (venv or GPU image)."""
    import torch
    from resemble_enhance.enhancer.inference import enhance

    device = device or ("cuda" if torch.cuda.is_available() else "cpu")
    out, sr = enhance(torch.from_numpy(w), SR, device, nfe=SETTINGS["nfe"], solver=SETTINGS["solver"],
                      lambd=SETTINGS["lambd"], tau=SETTINGS["tau"])
    out = out.float().cpu()
    if sr != SR:
        import torchaudio.functional as F
        out = F.resample(out, sr, SR)
    return out.numpy().astype(np.float32)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episode")
    ap.add_argument("blocks", nargs="+")
    ap.add_argument("--backend", choices=["modal", "local"], default="modal")
    a = ap.parse_args()
    ep = Path(a.episode)
    datas = [Path(b).read_bytes() for b in a.blocks]
    raws = [decode_bytes(d) for d in datas]
    t0 = time.time()
    if a.backend == "modal":
        sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
        from modal_gpu import app, enhance_block
        log(f"{len(datas)} block(s) -> Modal GPU, in parallel")
        with app.run():
            results = list(enhance_block.map(datas))
        enh = [np.frombuffer(r["pcm"], dtype=np.float32).copy() for r in results]
        secs = [r["seconds"] for r in results]
        device = results[0]["device"]
    else:
        enh, secs = [], []
        for i, w in enumerate(raws, 1):
            s0 = time.time()
            enh.append(enhance_array(w))
            secs.append(round(time.time() - s0, 1))
            log(f"block {i}/{len(raws)}: {len(w) / SR:.1f}s audio in {secs[-1]:.0f}s")
        device = "cpu"
    wall = time.time() - t0

    raw_parts = [trim(w) for w in raws]
    enh_parts = [trim(w) for w in enh]
    audio = ep / "audio"
    audio.mkdir(parents=True, exist_ok=True)
    write(audio / "vo_raw.wav", join(raw_parts))
    write(audio / "vo.wav", join(enh_parts))
    report = [{"block": i, "file": Path(b).name, "sha256": hashlib.sha256(d).hexdigest(),
               "seconds_in": round(len(w) / SR, 2), "seconds_out": round(len(e) / SR, 2), "process_seconds": s}
              for i, (b, d, w, e, s) in enumerate(zip(a.blocks, datas, raws, enh_parts, secs), 1)]
    (ep / "vo").mkdir(parents=True, exist_ok=True)
    total = sum(len(p) for p in enh_parts) / SR + GAP_S * (len(enh_parts) - 1)
    (ep / "vo" / "enhance.json").write_text(json.dumps({
        "tool": "resemble-enhance 0.0.1", "backend": a.backend, "device": device, "settings": SETTINGS,
        "gap_seconds": GAP_S, "sample_rate": SR, "wall_seconds": round(wall, 1), "total_seconds": round(total, 2),
        "blocks": report}, indent=1) + "\n")
    log(f"{len(report)} block(s), {total:.1f}s of narration, enhanced in {wall:.0f}s on {device}")
    log(f"wrote {audio / 'vo.wav'} (+ vo_raw.wav for A/B) and {ep / 'vo' / 'enhance.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
