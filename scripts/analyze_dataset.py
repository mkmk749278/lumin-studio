#!/usr/bin/env python3
"""Ingest the Lumin closed-signal dataset (CSV or JSON) -> chart-ready JSON metrics in data/stats/.

Every number a video states about the dataset comes out of this script, and every output file carries the
input's SHA-256 so a claims.csv row can point at exactly which file produced it. Nothing is typed by hand.

Expected columns (names are case-insensitive; extra columns are kept for later splits):
    symbol, timeframe, side, entry_price, stop_loss, take_profit, open_time, close_time
    and the outcome as one of:
        pnl_pct        realised move in % of entry (preferred — see "units" below)
        r_multiple     realised outcome in R
        pnl_or_r_multiple   ambiguous: pass --outcome pct|r to say which it is

Units, stated plainly: R divides by each trade's own stop distance, which equalises trades only if position
size scaled inversely with the stop. At a fixed notional it does not, and R can even flip the sign of a book
(a 0.8% loss and a 6% loss are both -1R). So pnl_pct LEADS every output and R is reported beside it only.

Rows that cannot be scored are never silently dropped: each exclusion is counted under a named reason.

Usage:
    python3 scripts/analyze_dataset.py data/raw/lumin_signals.csv --out data/stats/lumin_4900
    python3 scripts/analyze_dataset.py data/raw/signals.json --outcome r --fee-pct 0.07
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import math
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path

REQUIRED = ["symbol", "timeframe", "side", "entry_price", "stop_loss", "take_profit", "open_time", "close_time"]


def log(msg: str) -> None:
    print(f"[analyze] {msg}", flush=True)


def load_rows(path: Path) -> list[dict]:
    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text())
        if isinstance(data, dict):
            data = next((v for v in data.values() if isinstance(v, list)), [])
        return [{k.strip().lower(): v for k, v in r.items()} for r in data]
    with path.open(newline="") as fh:
        return [{(k or "").strip().lower(): v for k, v in r.items()} for r in csv.DictReader(fh)]


def to_float(v) -> float | None:
    try:
        x = float(str(v).strip().replace(",", "").rstrip("%"))
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def to_time(v) -> dt.datetime | None:
    if v is None or str(v).strip() == "":
        return None
    s = str(v).strip()
    try:
        x = float(s)
        if x > 1e12:
            x /= 1000.0  # epoch ms
        return dt.datetime.fromtimestamp(x, dt.timezone.utc)
    except ValueError:
        pass
    try:
        d = dt.datetime.fromisoformat(s.replace("Z", "+00:00"))
        return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)
    except ValueError:
        return None


def norm_side(v) -> str | None:
    s = str(v or "").strip().upper()
    return {"LONG": "LONG", "BUY": "LONG", "SHORT": "SHORT", "SELL": "SHORT"}.get(s)


def score(rows: list[dict], outcome: str | None, fee_pct: float) -> tuple[list[dict], Counter]:
    excluded: Counter = Counter()
    out = []
    for r in rows:
        missing = [c for c in REQUIRED if str(r.get(c, "")).strip() == ""]
        if missing:
            excluded[f"missing:{missing[0]}"] += 1
            continue
        side = norm_side(r["side"])
        entry, sl, tp = to_float(r["entry_price"]), to_float(r["stop_loss"]), to_float(r["take_profit"])
        t_open, t_close = to_time(r["open_time"]), to_time(r["close_time"])
        if side is None:
            excluded["bad:side"] += 1
            continue
        if None in (entry, sl, tp) or entry <= 0:
            excluded["bad:price"] += 1
            continue
        if t_open is None or t_close is None:
            excluded["bad:time"] += 1
            continue
        if t_close < t_open:
            excluded["bad:closed_before_open"] += 1
            continue
        risk_pct = abs(entry - sl) / entry * 100
        reward_pct = abs(tp - entry) / entry * 100
        if risk_pct == 0:
            excluded["bad:zero_stop_distance"] += 1
            continue
        geometry_ok = (side == "LONG" and sl < entry < tp) or (side == "SHORT" and tp < entry < sl)
        pnl_pct = r_mult = None
        if "pnl_pct" in r and to_float(r["pnl_pct"]) is not None:
            pnl_pct = to_float(r["pnl_pct"])
        if "r_multiple" in r and to_float(r["r_multiple"]) is not None:
            r_mult = to_float(r["r_multiple"])
        if "pnl_or_r_multiple" in r and pnl_pct is None and r_mult is None:
            v = to_float(r["pnl_or_r_multiple"])
            if outcome is None:
                raise SystemExit("column 'pnl_or_r_multiple' is ambiguous: pass --outcome pct or --outcome r")
            if v is not None:
                pnl_pct, r_mult = (v, None) if outcome == "pct" else (None, v)
        # Derive the missing unit from the trade's own designed stop distance.
        if pnl_pct is None and r_mult is not None:
            pnl_pct = r_mult * risk_pct
        if r_mult is None and pnl_pct is not None:
            r_mult = pnl_pct / risk_pct
        if pnl_pct is None:
            excluded["missing:outcome"] += 1
            continue
        out.append({
            "symbol": str(r["symbol"]).strip().upper(), "timeframe": str(r["timeframe"]).strip().lower(),
            "side": side, "open_time": t_open, "close_time": t_close,
            "hold_minutes": (t_close - t_open).total_seconds() / 60,
            "risk_pct": risk_pct, "designed_rr": reward_pct / risk_pct, "geometry_ok": geometry_ok,
            "pnl_pct": pnl_pct, "net_pct": pnl_pct - fee_pct, "r": r_mult,
        })
    return out, excluded


def summarise(rows: list[dict]) -> dict:
    n = len(rows)
    if n == 0:
        return {"n": 0}
    pnl = [r["pnl_pct"] for r in rows]
    net = [r["net_pct"] for r in rows]
    wins = sum(1 for x in pnl if x > 0)
    flats = sum(1 for x in pnl if x == 0)
    gross_win = sum(x for x in pnl if x > 0)
    gross_loss = -sum(x for x in pnl if x < 0)
    return {
        "n": n, "wins": wins, "losses": n - wins - flats, "flat": flats,
        "win_rate_pct": round(100 * wins / n, 2),
        "avg_pnl_pct": round(statistics.fmean(pnl), 4), "median_pnl_pct": round(statistics.median(pnl), 4),
        "avg_net_pct": round(statistics.fmean(net), 4), "sum_pnl_pct": round(sum(pnl), 3),
        "sum_net_pct": round(sum(net), 3),
        "profit_factor": round(gross_win / gross_loss, 3) if gross_loss else None,
        "avg_r": round(statistics.fmean(r["r"] for r in rows), 4),
        "median_designed_rr": round(statistics.median(r["designed_rr"] for r in rows), 3),
        "median_risk_pct": round(statistics.median(r["risk_pct"] for r in rows), 3),
        "median_hold_minutes": round(statistics.median(r["hold_minutes"] for r in rows), 1),
        # break-even win rate at the median designed geometry: rr/(1+rr) of trades must lose for 0 expectancy
        "breakeven_win_rate_pct_at_median_rr": round(100 / (1 + statistics.median(r["designed_rr"] for r in rows)), 2),
    }


def breakdown(rows: list[dict], key: str) -> dict:
    groups: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        groups[str(r[key])].append(r)
    return {k: summarise(v) for k, v in sorted(groups.items(), key=lambda kv: -len(kv[1]))}


def equity(rows: list[dict], points: int = 400) -> list[dict]:
    rs = sorted(rows, key=lambda r: r["close_time"])
    cum_g = cum_n = 0.0
    full = []
    for r in rs:
        cum_g += r["pnl_pct"]
        cum_n += r["net_pct"]
        full.append({"t": int(r["close_time"].timestamp() * 1000), "gross_sum_pct": round(cum_g, 3), "net_sum_pct": round(cum_n, 3)})
    step = max(1, len(full) // points)
    return full[::step] + ([full[-1]] if full and (len(full) - 1) % step else [])


def histogram(values: list[float], edges: list[float]) -> list[dict]:
    bins = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        bins.append({"lo": lo, "hi": hi, "count": sum(1 for v in values if lo <= v < hi)})
    bins[0]["count"] += sum(1 for v in values if v < edges[0])  # tails folded into the end bins, and said so
    bins[-1]["count"] += sum(1 for v in values if v >= edges[-1])
    return bins


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input")
    ap.add_argument("--out", default=None, help="output directory (default data/stats/<input stem>)")
    ap.add_argument("--outcome", choices=["pct", "r"], help="meaning of a pnl_or_r_multiple column")
    ap.add_argument("--fee-pct", type=float, default=0.07,
                    help="round-trip cost charged per trade in %% of notional (default 0.07 = 0.02 maker + 0.05 taker)")
    a = ap.parse_args()

    src = Path(a.input)
    digest = hashlib.sha256(src.read_bytes()).hexdigest()
    raw = load_rows(src)
    log(f"read {len(raw)} rows from {src} (sha256 {digest[:12]}…)")
    rows, excluded = score(raw, a.outcome, a.fee_pct)
    log(f"scored {len(rows)}; excluded {sum(excluded.values())} {dict(excluded)}")
    if not rows:
        log("FAILED: no scoreable rows")
        return 1

    out = Path(a.out) if a.out else Path(__file__).resolve().parent.parent / "data" / "stats" / src.stem
    out.mkdir(parents=True, exist_ok=True)
    first = min(r["open_time"] for r in rows)
    last = max(r["close_time"] for r in rows)
    provenance = {
        "input": src.name, "sha256": digest, "rows_read": len(raw), "rows_scored": len(rows),
        "excluded": dict(excluded), "fee_round_trip_pct": a.fee_pct,
        "window_utc": [first.isoformat(), last.isoformat()],
        "bad_geometry_rows": sum(1 for r in rows if not r["geometry_ok"]),
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "units": "pnl_pct leads; r is each trade's outcome divided by its own designed stop distance",
    }
    files = {
        "summary.json": {"provenance": provenance, "overall": summarise(rows)},
        "by_timeframe.json": {"provenance": provenance, "groups": breakdown(rows, "timeframe")},
        "by_side.json": {"provenance": provenance, "groups": breakdown(rows, "side")},
        "by_symbol.json": {"provenance": provenance, "groups": breakdown(rows, "symbol")},
        "equity_curve.json": {"provenance": provenance, "points": equity(rows)},
        "pnl_histogram.json": {"provenance": provenance, "unit": "pnl_pct", "tails_folded_into_end_bins": True,
                               "bins": histogram([r["pnl_pct"] for r in rows], [x / 2 for x in range(-10, 11)])},
        "rr_scatter.json": {"provenance": provenance, "points": [
            {"designed_rr": round(r["designed_rr"], 3), "r": round(r["r"], 3), "pnl_pct": round(r["pnl_pct"], 4),
             "timeframe": r["timeframe"]} for r in rows[:: max(1, len(rows) // 1500)]]},
    }
    for name, body in files.items():
        (out / name).write_text(json.dumps(body, indent=1) + "\n")
    o = files["summary.json"]["overall"]
    log(f"n={o['n']} win={o['win_rate_pct']}% avg={o['avg_pnl_pct']}% net={o['avg_net_pct']}% "
        f"avgR={o['avg_r']} PF={o['profit_factor']}")
    log(f"wrote {len(files)} files -> {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
