#!/usr/bin/env python3
"""Ops closed-signal export (track_record_trades_*.csv) -> data/stats/<name>.json for an episode.

The export comes from ops.luminapp.org/track-record/trades.csv?window=all&fee_pct=0.07 (one row per DELIVERED closed
signal). The raw file stays in data/raw/ (gitignored; the repo is public); only these aggregates are committed, each
stamped with the input's SHA-256 so every on-screen figure traces to one file.

Three books are reported side by side and never blended (the engine's own rule for this data):
  stamped        the outcome against the signal's published entry price (what the record shows)
  rebased        every exit level kept, the entry moved to the first price a trader could actually trade after the
                 signal (first_observed_price); only rows where the engine saw that price
  be_at_fill     as rebased, with a break-even stop parked at the fill instead of the stamped entry
Net = gross minus the round trip in the export's fee column (0.07% of notional at the default).
Each timeframe is the setup's declared trigger timeframe (360-v2 src/setup_timeframes.py, read here from --tf-map).

usage: python3 scripts/analyze_ops_export.py data/raw/ops_trades_20261123.csv --out data/stats/ep01_fill_gap.json \
           --tf-map ../360-v2/src/setup_timeframes.py
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import random
import re
import statistics as st
import sys
from collections import Counter, defaultdict
from pathlib import Path


def ci(values: list[float], seed: int = 7, n: int = 2000) -> list[float]:
    rnd = random.Random(seed)
    bs = sorted(st.fmean(rnd.choices(values, k=len(values))) for _ in range(n))
    return [round(bs[int(0.025 * n)], 4), round(bs[int(0.975 * n)], 4)]


def book(rows: list[dict], fee: float) -> dict:
    g = [float(r["pnl_pct"]) for r in rows]
    out = {"n": len(rows), "win_rate_pct": round(100 * sum(x > 0 for x in g) / len(g), 2),
           "flat_pct": round(100 * sum(x == 0 for x in g) / len(g), 2),
           "stamped_gross_pct": round(st.fmean(g), 4), "stamped_net_pct": round(st.fmean(g) - fee, 4),
           "stamped_net_ci95": [round(x - fee, 4) for x in ci(g)]}
    top = sorted(g, reverse=True)
    k = max(1, len(g) // 100)
    out["stamped_net_without_top_1pct"] = round(st.fmean(top[k:]) - fee, 4)
    obs = [r for r in rows if r["rebased_pnl_pct"] != ""]
    if len(obs) >= 20:
        a = [float(r["rebased_pnl_pct"]) for r in obs]
        b = [float(r["rebased_be_at_fill_pct"]) for r in obs]
        d = [float(r["entry_drift_pct"]) for r in obs]
        s = [float(r["pnl_pct"]) for r in obs]
        out["observed"] = {
            "n": len(obs), "stamped_net_pct": round(st.fmean(s) - fee, 4),
            "rebased_net_pct": round(st.fmean(a) - fee, 4), "rebased_net_ci95": [round(x - fee, 4) for x in ci(a)],
            "be_at_fill_net_pct": round(st.fmean(b) - fee, 4),
            "drift_median_pct": round(st.median(d), 4), "drift_mean_pct": round(st.fmean(d), 4),
            "drift_p90_pct": round(sorted(d)[int(0.9 * len(d))], 4),
            "drift_against_trade_share_pct": round(100 * sum(x > 0 for x in d) / len(d), 1),
        }
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("--out", required=True)
    ap.add_argument("--tf-map", required=True)
    a = ap.parse_args()
    src = Path(a.input)
    tf = {m[1]: m[2] for m in re.finditer(r'"([A-Z_]+)": "(\w+)"', Path(a.tf_map).read_text())}
    rows = list(csv.DictReader(src.open()))
    fees = Counter(r["fee_usd"] for r in rows)
    fee = float(fees.most_common(1)[0][0])  # % of a 100-USDT notional
    unmapped = Counter(r["setup"] for r in rows if r["setup"] not in tf)
    by_tf: dict[str, list] = defaultdict(list)
    by_month: dict[str, list] = defaultdict(list)
    by_side: dict[str, list] = defaultdict(list)
    for r in rows:
        by_tf[tf.get(r["setup"], "unmapped")].append(r)
        by_month[r["closed_iso"][:7]].append(r)
        by_side[r["direction"]].append(r)
    obs = [r for r in rows if r["rebased_pnl_pct"] != ""]
    res = {
        "provenance": {
            "input": src.name, "sha256": hashlib.sha256(src.read_bytes()).hexdigest(), "rows": len(rows),
            "source": "ops.luminapp.org/track-record/trades.csv?window=all&fee_pct=0.07 (delivered closed signals)",
            "entry_window_utc": [min(r["entry_iso"] for r in rows if r["entry_iso"]), max(r["entry_iso"] for r in rows)],
            "rows_without_entry_time": sum(1 for r in rows if not r["entry_iso"]),
            "close_window_utc": [min(r["closed_iso"] for r in rows if r["closed_iso"]), max(r["closed_iso"] for r in rows)],
            "observed_window_utc": [min(r["entry_iso"] for r in obs), max(r["entry_iso"] for r in obs)],
            "fee_round_trip_pct": fee, "fee_values_seen": dict(fees),
            "rebase_refusals": dict(Counter(r["rebase_refusal"] or "none" for r in rows)),
            "unmapped_setups": dict(unmapped),
            "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "units": "% of notional per trade; net = gross - fee; CIs are bootstrap 95% on the mean",
        },
        "all": book(rows, fee),
        "by_timeframe": {k: book(v, fee) for k, v in sorted(by_tf.items()) if len(v) >= 20},
        "by_side": {k: book(v, fee) for k, v in sorted(by_side.items())},
        "by_month": {k: book(v, fee) for k, v in sorted(by_month.items())},
        "outcomes": dict(Counter(r["outcome"] for r in rows)),
    }
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(res, indent=1) + "\n")
    o = res["all"]
    print(f"[ops] {o['n']} trades; stamped net {o['stamped_net_pct']:+.3f}% "
          f"(CI {o['stamped_net_ci95']}); observed n={o['observed']['n']}: rebased net "
          f"{o['observed']['rebased_net_pct']:+.3f}%, be@fill {o['observed']['be_at_fill_net_pct']:+.3f}% -> {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
