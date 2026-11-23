#!/usr/bin/env python3
"""Word-level timestamps for the narration -> words.json, so every visual cue lands within 100 ms of its word.

The locked script is the truth; the aligner only measures WHERE each word is spoken (no transcription, so a
mis-heard number can never enter the timeline). Two sources:

  --elevenlabs-json FILE   Convert the character alignment returned by ElevenLabs'
                           /v1/text-to-speech/{voice_id}/with-timestamps response (or a list of such
                           responses, one per recording block, in order) into words. Exact, costs nothing extra.
  (default) MMS forced alignment
                           CTC forced alignment with torchaudio's MMS_FA (wav2vec2 trained for alignment) of
                           --text against --audio. Local, free, CPU. Emissions are computed in overlapping
                           windows so a full episode fits in memory.

Output (src/lib/cues.ts reads it): {"source": ..., "audio": ..., "words": [{"word", "start", "end", "score"}]}
Words scoring under 0.35 (MMS) are listed for a listen — a weak score usually means the script and the
audio disagree.

Pins: torch 2.8.0 + torchaudio 2.8.0 CPU wheels (pip install --index-url https://download.pytorch.org/whl/cpu).

Usage:
    python3 scripts/align_audio.py --audio episodes/ep01/audio/vo.wav --text episodes/ep01/vo.txt \
        --out episodes/ep01/words.json
    python3 scripts/align_audio.py --elevenlabs-json episodes/ep01/audio/block*.json --out episodes/ep01/words.json
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path

SR = 16000
WIN_S = 30.0  # emission window
CTX_S = 2.0   # context either side, discarded after inference
WEAK = 0.35


def log(msg: str) -> None:
    print(f"[align] {msg}", flush=True)


def script_words(text: str) -> list[str]:
    # em dashes join two words in prose ("wrote—and"); they are two spoken words
    return [w for w in re.split(r"\s+|—", text) if w.strip()]


def letters(w: str) -> str:
    return re.sub(r"[^a-z']", "", w.lower().replace("-", ""))


def from_elevenlabs(paths: list[str]) -> list[dict]:
    words: list[dict] = []
    offset = 0.0
    for p in paths:
        body = json.loads(Path(p).read_text())
        al = body.get("alignment") or body.get("normalized_alignment") or body
        chars, starts, ends = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
        cur, a, b = "", None, 0.0
        for c, s, e in zip(chars, starts, ends):
            if c.isspace():
                if cur:
                    words.append({"word": cur, "start": round(offset + a, 3), "end": round(offset + b, 3), "score": 1.0})
                cur, a = "", None
                continue
            if a is None:
                a = s
            cur += c
            b = e
        if cur:
            words.append({"word": cur, "start": round(offset + a, 3), "end": round(offset + b, 3), "score": 1.0})
        offset += max(ends) if ends else 0.0
    return words


def from_mms(audio_path: str, text: str) -> list[dict]:
    import numpy as np
    import torch
    import torchaudio

    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", audio_path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    audio = torch.from_numpy(np.frombuffer(raw, dtype=np.float32).copy())
    bundle = torchaudio.pipelines.MMS_FA
    model = bundle.get_model(with_star=False).eval()
    tokenizer, aligner = bundle.get_tokenizer(), bundle.get_aligner()

    # Windowed emissions: run each window with context, keep only its own span of output frames.
    n = audio.shape[0]
    win, ctx = int(WIN_S * SR), int(CTX_S * SR)
    chunks = []
    frames_per_sample = None
    with torch.inference_mode():
        for s in range(0, n, win):
            lo, hi = max(0, s - ctx), min(n, s + win + ctx)
            em, _ = model(audio[lo:hi].unsqueeze(0))
            fps_ = em.shape[1] / (hi - lo)
            frames_per_sample = fps_
            a = round((s - lo) * fps_)
            b = a + round((min(n, s + win) - s) * fps_)
            chunks.append(em[0, a:b])
    emission = torch.cat(chunks)
    step = 1.0 / (frames_per_sample * SR)  # seconds per emission frame

    ws = script_words(text)
    spoken = [(k, letters(w)) for k, w in enumerate(ws)]
    spoken = [(k, x) for k, x in spoken if x]
    spans = aligner(emission, tokenizer([x for _, x in spoken]))
    timed = {}
    for (k, _), sp in zip(spoken, spans):
        timed[k] = (sp[0].start * step, sp[-1].end * step, float(np.mean([x.score for x in sp])))
    out, prev = [], 0.0
    for k, w in enumerate(ws):
        a, b, sc = timed.get(k, (prev, prev, 1.0))  # a token with no letters (e.g. "—") takes no time
        prev = b
        out.append({"word": w, "start": round(a, 3), "end": round(b, 3), "score": round(sc, 3)})
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--audio")
    ap.add_argument("--text", help="the locked narration text file (vo.txt)")
    ap.add_argument("--elevenlabs-json", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--threads", type=int, default=4)
    a = ap.parse_args()
    t0 = time.time()
    if a.elevenlabs_json:
        words, source = from_elevenlabs(a.elevenlabs_json), "elevenlabs with-timestamps character alignment"
    else:
        if not (a.audio and a.text):
            ap.error("MMS alignment needs --audio and --text")
        import torch
        torch.set_num_threads(a.threads)
        words = from_mms(a.audio, Path(a.text).read_text())
        source = "measured: CTC forced alignment (torchaudio 2.8.0 MMS_FA)"
    weak = [w for w in words if w["score"] < WEAK]
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps({"source": source, "audio": a.audio, "words": words}, indent=1) + "\n")
    log(f"{len(words)} words aligned in {time.time() - t0:.1f}s -> {a.out}")
    for w in weak[:40]:
        log(f"  check by ear: {w['start']:.2f}s '{w['word']}' score {w['score']}")
    if weak:
        log(f"{len(weak)} weak word(s) under {WEAK}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
