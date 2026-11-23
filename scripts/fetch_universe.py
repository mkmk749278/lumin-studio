#!/usr/bin/env python3
"""Bulk-fetch monthly Binance USD-M klines (data.binance.vision, no geo-block) for a symbol universe.

Writes one compressed numpy file per symbol to data/raw/klines/<interval>/<SYMBOL>.npz with arrays
open_time_ms, open, high, low, close, volume (oldest first, de-duplicated). Missing months are listed in
data/raw/klines/<interval>/_coverage.json, never filled. data/raw/ is gitignored (big, re-fetchable).

usage: python3 scripts/fetch_universe.py data/market/universe_20261123.json --interval 5m --months 2026-05 2026-10
"""
from __future__ import annotations

import argparse
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_market_data import archive_month  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def months(a: str, b: str) -> list[tuple[int, int]]:
    y, m = map(int, a.split("-"))
    y2, m2 = map(int, b.split("-"))
    out = []
    while (y, m) <= (y2, m2):
        out.append((y, m))
        y, m = (y + (m == 12), m % 12 + 1)
    return out


def one(sym: str, interval: str, ms: list[tuple[int, int]], dest: Path) -> tuple[str, list[str], int]:
    rows, missing = [], []
    for y, m in ms:
        try:
            got = archive_month(sym, interval, y, m)
        except Exception as e:  # noqa: BLE001 - one symbol failing must not stop the universe
            got = None
            print(f"[universe] {sym} {y}-{m:02d} error {e}", flush=True)
        if got is None:
            missing.append(f"{y}-{m:02d}")
        else:
            rows += got
    if rows:
        seen = {r["timestamp"]: r for r in rows}
        ks = sorted(seen)
        np.savez_compressed(dest / f"{sym}.npz", open_time_ms=np.array(ks, dtype=np.int64),
                            **{c: np.array([seen[k][c] for k in ks], dtype=np.float64)
                               for c in ("open", "high", "low", "close", "volume")})
    print(f"[universe] {sym}: {len(rows)} bars, missing {missing or 'none'}", flush=True)
    return sym, missing, len(rows)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("universe")
    ap.add_argument("--interval", default="5m")
    ap.add_argument("--months", nargs=2, required=True)
    ap.add_argument("--workers", type=int, default=6)
    a = ap.parse_args()
    syms = json.loads(Path(a.universe).read_text())["symbols"]
    dest = ROOT / "data" / "raw" / "klines" / a.interval
    dest.mkdir(parents=True, exist_ok=True)
    ms = months(*a.months)
    with ThreadPoolExecutor(a.workers) as ex:
        res = list(ex.map(lambda s: one(s, a.interval, ms, dest), syms))
    cov = {"universe": a.universe, "interval": a.interval, "months": a.months,
           "complete": [s for s, miss, n in res if not miss and n],
           "partial": {s: miss for s, miss, n in res if miss}}
    (dest / "_coverage.json").write_text(json.dumps(cov, indent=1) + "\n")
    print(f"[universe] complete {len(cov['complete'])}/{len(syms)}; partial {len(cov['partial'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
