#!/usr/bin/env python3
"""Spoken narration -> caption text (display forms), and, once words.json exists, a timed SRT.

The recording text is written for the voice (Mac-D, E-M-A, "zero point zero seven percent", "one hundred and
seventeen thousand"); captions show what a reader expects (MACD, EMA, 0.07%, 117,000). This is the one place that
mapping lives, so the recording and the captions can never drift.

  python3 scripts/captions.py episodes/<id>/vo/vo.txt                 -> episodes/<id>/vo/captions.txt
  python3 scripts/captions.py episodes/<id>/vo/vo.txt --words episodes/<id>/words.json   -> also <id>.srt

Times and other phrases the number rules cannot read go in vo/caption_overrides.json {spoken: display}.
SRT cues: one sentence per cue (split at ~84 characters on a comma), timed from the aligned words.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ACRONYMS = {"Mac-D": "MACD", "E-M-A": "EMA", "R-S-I": "RSI", "A-T-R": "ATR", "U-T-C": "UTC", "U-S-D-T": "USDT"}
UNITS = {w: i for i, w in enumerate("zero one two three four five six seven eight nine ten eleven twelve thirteen "
                                    "fourteen fifteen sixteen seventeen eighteen nineteen".split())}
TENS = {w: 10 * i for i, w in enumerate("_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()) if w != "_"}
SCALES = {"hundred": 100, "thousand": 1000, "million": 1_000_000, "billion": 1_000_000_000}
WORD = r"(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|" \
       r"seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|" \
       r"billion)(?:-(?:one|two|three|four|five|six|seven|eight|nine))?"
NUM = re.compile(rf"\b(?:minus )?{WORD}(?:(?: and | |-){WORD})*(?: point(?: {WORD})+)?(?: percent)?\b")


def words_to_int(ws: list[str]) -> int:
    total = cur = 0
    for w in ws:
        for part in w.split("-"):
            if part in UNITS:
                cur += UNITS[part]
            elif part in TENS:
                cur += TENS[part]
            elif part == "hundred":
                cur *= 100
            elif part in SCALES:
                total += cur * SCALES[part]
                cur = 0
    return total + cur


def render(m: re.Match) -> str:
    s = m.group(0)
    neg = s.startswith("minus ")
    pct = s.endswith(" percent")
    core = s.removeprefix("minus ").removesuffix(" percent")
    if re.fullmatch(r"twenty twenty-\w+", core):  # a year said as two numbers
        return str(2000 + words_to_int([core.split()[1]]))
    if core in ("one", "zero") and not pct and not neg:
        return s  # "one rule", "one real trade": leave small counting words as words
    if " point " in core or core.startswith("point "):
        whole, frac = core.split(" point ") if " point " in core else ("zero", core[6:])
        digits = "".join(str(UNITS[w]) for w in frac.split())
        val = f"{words_to_int(whole.replace(' and ', ' ').split())}.{digits}"
    else:
        n = words_to_int(core.replace(" and ", " ").split())
        if n < 10 and not pct:
            return s
        val = f"{n:,}"
    return ("−" if neg else "") + val + ("%" if pct else "")


OVERRIDES: dict[str, str] = {}  # per-episode spoken -> display phrases (vo/caption_overrides.json), applied first


def caption_text(spoken: str) -> str:
    for k, v in OVERRIDES.items():
        spoken = spoken.replace(k, v)
    for k, v in ACRONYMS.items():
        spoken = spoken.replace(k, v)
    out = NUM.sub(render, spoken)
    # an indicator period reads as a digit even when it is small ("the 9 EMA")
    return re.sub(r"\b(one|two|three|four|five|six|seven|eight|nine) (EMA|RSI|ATR)\b",
                  lambda m: f"{UNITS[m.group(1)]} {m.group(2)}", out)


def srt(words: list[dict], text: str) -> str:
    def ts(x: float) -> str:
        ms = int(round(x * 1000))
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"
    sentences = [s for p in text.split("\n") for s in re.split(r"(?<=[.?!])\s+", p.strip()) if s]
    cues, wi = [], 0
    for sent in sentences:
        n = len(sent.split())
        chunk = words[wi:wi + n]
        wi += n
        if chunk:
            cues.append((chunk[0]["start"], chunk[-1]["end"], caption_text(sent)))
    return "\n".join(f"{i}\n{ts(a)} --> {ts(b)}\n{t}\n" for i, (a, b, t) in enumerate(cues, 1))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("vo")
    ap.add_argument("--words")
    a = ap.parse_args()
    vo = Path(a.vo)
    ov = vo.parent / "caption_overrides.json"
    if ov.exists():
        OVERRIDES.update(json.loads(ov.read_text()))
    spoken = vo.read_text(encoding="utf-8")
    (vo.parent / "captions.txt").write_text(caption_text(spoken), encoding="utf-8")
    print(f"wrote {vo.parent / 'captions.txt'}")
    if a.words:
        words = json.loads(Path(a.words).read_text())["words"]
        out = vo.parent.parent / f"{vo.parent.parent.name}.srt"
        out.write_text(srt(words, spoken), encoding="utf-8")
        print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
