#!/usr/bin/env python3
"""Recording blocks for the owner to generate in the ElevenLabs app (voice Reid, config/voice.json).

Reads an episode's narration (script.md: headings and [[CUE: ...]] lines are stripped; or a plain vo.txt), checks it
is TTS-clean, and packs whole paragraphs into as FEW blocks as possible, each at most 10,000 characters (the app's
limit; owner, 23 NOV 2026: "each block as full as possible up to that limit"). A block always ends on a paragraph
break, so a block boundary is a natural pause and the joined takes never cut a sentence. A paragraph longer than the
limit on its own is split at its last sentence end that fits.

Writes episodes/<id>/vo/vo.txt (the exact spoken text, one paragraph per line) and episodes/<id>/vo/vo_blocks.md
(click-to-copy blocks with file names to save each take as). Fails, naming the line, on anything the voice reads
badly: digits, brackets, "...", %, $, &, or a bare acronym written without hyphens.

usage: python3 scripts/vo_blocks.py episodes/<id>/script.md [--limit 10000]
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BAD = [
    (re.compile(r"\d"), "digit (write numbers as words)"),
    (re.compile(r"\.\.\.|…"), "ellipsis (the voice reads it as a trailing whisper; use a comma or a full stop)"),
    (re.compile(r"[\[\]{}()<>]"), "bracket (no tags or asides in the spoken text)"),
    (re.compile(r"[%$&#@*_=+/\\|~^]"), "symbol (write it as words: percent, dollars, and)"),
    (re.compile(r"\b[A-Z]{2,}\b"), "bare acronym (write as spoken: U-S-D-T, or as a word)"),
]


def spoken_paragraphs(text: str) -> list[str]:
    keep = []
    for line in text.splitlines():
        s = line.strip()
        if s.startswith("#") or s.startswith("[[") or s.startswith(">") or s.startswith("<!--"):
            s = ""
        keep.append(s)
    paras = [" ".join(p.split()) for p in "\n".join(keep).split("\n\n")]
    return [p for p in paras if p]


def lint(paras: list[str]) -> list[str]:
    errs = []
    for i, p in enumerate(paras, 1):
        for rx, why in BAD:
            m = rx.search(p)
            if m:
                errs.append(f"paragraph {i}: '{m.group(0)}' — {why}: …{p[max(0, m.start() - 40):m.end() + 40]}…")
    return errs


def split_long(p: str, limit: int) -> list[str]:
    out = []
    while len(p) > limit:
        cut = max(p.rfind(". ", 0, limit), p.rfind("? ", 0, limit), p.rfind("! ", 0, limit))
        if cut <= 0:
            raise SystemExit(f"a sentence is longer than {limit} characters: {p[:80]}…")
        out.append(p[:cut + 1])
        p = p[cut + 2:]
    return out + [p]


def pack(paras: list[str], limit: int) -> list[str]:
    units = [u for p in paras for u in split_long(p, limit)]
    blocks, cur = [], ""
    for u in units:
        cand = f"{cur}\n\n{u}" if cur else u
        if len(cand) <= limit:
            cur = cand
        else:
            blocks.append(cur)
            cur = u
    if cur:
        blocks.append(cur)
    return blocks


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script")
    ap.add_argument("--limit", type=int, default=None)
    a = ap.parse_args()
    voice = json.loads((ROOT / "config/voice.json").read_text())
    limit = a.limit or voice["block_max_chars"]
    src = Path(a.script)
    ep = src.parent if src.parent.name != "vo" else src.parent.parent
    paras = spoken_paragraphs(src.read_text(encoding="utf-8"))
    errs = lint(paras)
    if errs:
        print("\n".join(errs))
        print(f"FAILED: {len(errs)} line(s) the voice would read badly; fix the script and run again")
        return 1
    blocks = pack(paras, limit)
    vo_dir = ep / "vo"
    vo_dir.mkdir(parents=True, exist_ok=True)
    (vo_dir / "vo.txt").write_text("\n\n".join(paras) + "\n", encoding="utf-8")
    words = sum(len(p.split()) for p in paras)
    md = [f"# Recording blocks: {ep.name}", "",
          f"Voice **{voice['name']}** (`{voice['voice_id']}`). {len(blocks)} block(s), {words} words, "
          f"about {words / 150:.1f} minutes at 150 words a minute.", "",
          "Paste each block as it is (the blank lines are pauses), keep the same settings for every block, and save "
          "each take under the file name shown. Send all the files back together.", ""]
    for i, b in enumerate(blocks, 1):
        md += [f"## Block {i} of {len(blocks)}: save as `{ep.name}_b{i:02d}.mp3` ({len(b):,} characters)", "",
               "```", b, "```", ""]
    (vo_dir / "vo_blocks.md").write_text("\n".join(md), encoding="utf-8")
    print(f"{len(paras)} paragraphs, {words} words -> {len(blocks)} block(s): "
          + ", ".join(f"b{i:02d}={len(b):,}" for i, b in enumerate(blocks, 1)))
    print(f"wrote {vo_dir / 'vo.txt'} and {vo_dir / 'vo_blocks.md'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
