#!/usr/bin/env python3
"""Episode 1 test bench: do the most-taught 5-minute scalping rules survive Binance futures fees?

Rules (generic textbook versions, not any one creator's):
  ema_cross   EMA 9 crosses EMA 21, in the direction of EMA 200 (long only above it, short only below)
  rsi_revert  RSI 14 crosses back up through 30 (long) / down through 70 (short), in the direction of EMA 200
  macd_trend  MACD (12,26,9) crosses its signal line on the far side of zero, in the direction of EMA 200
  random      control: a coin-flip direction on random bars at the same rate as ema_cross, same exits

Execution, identical for every rule (so only the ENTRY differs):
  - the signal is read on a CLOSED bar; entry at the NEXT bar's open (no look-ahead)
  - stop 1.0 x ATR(14) from entry, target 1.5 x ATR (1.5R), time exit after max-hold bars at that bar's close
  - one position per symbol at a time; a bar that touches both stop and target counts as the stop (conservative)
Costs per trade, % of notional: gross; net at a 0.07% round trip (maker entry 0.02 + taker exit 0.05, the
channel's standard); net at 0.10% (taker both ways, what a market-order scalper actually pays). No slippage
modelled beyond the next-open entry: that makes every number here OPTIMISTIC, and the episode says so.

Timeframes: 5m from the archive; 15m and 1h resampled from the same 5m bars (same data, same window).

usage: python3 scripts/backtest_scalping.py --klines data/raw/klines/5m --out data/stats/ep01_scalping.json
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import statistics as st
import sys
from pathlib import Path

import numpy as np

FEES = {"net_007": 0.07, "net_010": 0.10}
SL_ATR, TP_ATR = 1.0, 1.5
MAX_HOLD = {"5m": 48, "15m": 16, "1h": 8}  # 4 hours on 5m; same wall-clock-ish scale per timeframe is not
#                                             the point — each is "a scalp" on its own chart, bars not hours


def ema(x: np.ndarray, n: int) -> np.ndarray:
    a = 2 / (n + 1)
    out = np.empty_like(x)
    out[0] = x[0]
    for i in range(1, len(x)):
        out[i] = a * x[i] + (1 - a) * out[i - 1]
    return out


def rsi(c: np.ndarray, n: int = 14) -> np.ndarray:
    d = np.diff(c, prepend=c[0])
    up, dn = np.clip(d, 0, None), np.clip(-d, 0, None)
    au, ad = np.empty_like(c), np.empty_like(c)
    au[0], ad[0] = up[0], dn[0]
    for i in range(1, len(c)):  # Wilder smoothing
        au[i] = (au[i - 1] * (n - 1) + up[i]) / n
        ad[i] = (ad[i - 1] * (n - 1) + dn[i]) / n
    rs = np.divide(au, ad, out=np.full_like(au, np.inf), where=ad > 0)
    return 100 - 100 / (1 + rs)


def atr(h, l, c, n: int = 14) -> np.ndarray:
    pc = np.concatenate([[c[0]], c[:-1]])
    tr = np.maximum(h - l, np.maximum(abs(h - pc), abs(l - pc)))
    out = np.empty_like(tr)
    out[0] = tr[0]
    for i in range(1, len(tr)):
        out[i] = (out[i - 1] * (n - 1) + tr[i]) / n
    return out


def resample(d: dict, k: int) -> dict:
    """k consecutive 5m bars -> one bar, aligned to UTC multiples of k*5 minutes; partial groups dropped."""
    t = d["open_time_ms"]
    step = k * 300_000
    g = t // step
    starts = np.nonzero(np.diff(np.concatenate([[-1], g])))[0]
    ends = np.concatenate([starts[1:], [len(t)]])
    full = (ends - starts) == k
    s, e = starts[full], ends[full]
    return {"open_time_ms": g[s] * step, "open": d["open"][s], "close": d["close"][e - 1],
            "high": np.maximum.reduceat(d["high"], starts)[full], "low": np.minimum.reduceat(d["low"], starts)[full],
            "volume": np.add.reduceat(d["volume"], starts)[full]}


def cross_up(a, b):
    return np.concatenate([[False], (a[1:] > b[1:]) & (a[:-1] <= b[:-1])])


def signals(d: dict, rng: np.random.Generator) -> dict[str, np.ndarray]:
    """+1 long / -1 short / 0 none, per bar, decided on that bar's close."""
    c = d["close"]
    e9, e21, e200 = ema(c, 9), ema(c, 21), ema(c, 200)
    up, dn = c > e200, c < e200
    r = rsi(c)
    m = ema(c, 12) - ema(c, 26)
    sig = ema(m, 9)
    out = {
        "ema_cross": np.where(cross_up(e9, e21) & up, 1, np.where(cross_up(e21, e9) & dn, -1, 0)),
        "rsi_revert": np.where(cross_up(r, np.full_like(r, 30)) & up, 1,
                               np.where(cross_up(np.full_like(r, 70), r) & dn, -1, 0)),
        "macd_trend": np.where(cross_up(m, sig) & (m < 0) & up, 1, np.where(cross_up(sig, m) & (m > 0) & dn, -1, 0)),
    }
    rate = (out["ema_cross"] != 0).mean()
    pick = rng.random(len(c)) < rate
    out["random"] = np.where(pick, rng.choice([-1, 1], size=len(c)), 0)
    for k in out:
        out[k][:250] = 0  # indicator warm-up (EMA 200)
    return out


def trades(d: dict, sig: np.ndarray, max_hold: int) -> list[tuple[int, float]]:
    """Returns (entry_time_ms, gross pnl % of notional) per trade."""
    o, h, l, c, t = d["open"], d["high"], d["low"], d["close"], d["open_time_ms"]
    a = atr(h, l, c)
    out = []
    i, n = 0, len(c)
    idx = np.nonzero(sig)[0]
    j = 0
    while j < len(idx):
        s = idx[j]
        e = s + 1
        if e >= n - 1:
            break
        side = sig[s]
        entry = o[e]
        stop = entry - side * SL_ATR * a[s]
        target = entry + side * TP_ATR * a[s]
        last = min(n - 1, e + max_hold - 1)
        hh, ll = h[e:last + 1], l[e:last + 1]
        if side > 0:
            hit_s, hit_t = np.nonzero(ll <= stop)[0], np.nonzero(hh >= target)[0]
        else:
            hit_s, hit_t = np.nonzero(hh >= stop)[0], np.nonzero(ll <= target)[0]
        fs = hit_s[0] if len(hit_s) else 10**9
        ft = hit_t[0] if len(hit_t) else 10**9
        if fs == 10**9 and ft == 10**9:
            exit_px, k = c[last], last - e
        elif fs <= ft:  # same bar -> stop first
            exit_px, k = stop, fs
        else:
            exit_px, k = target, ft
        out.append((int(t[e]), float(side * (exit_px - entry) / entry * 100)))
        nxt = e + k + 1  # free to trade again after the exit bar
        while j < len(idx) and idx[j] < nxt:
            j += 1
    return out


def summarise(rows: list[tuple[str, int, float]]) -> dict:
    g = np.array([x[2] for x in rows])
    if len(g) == 0:
        return {"n": 0}
    rnd = np.random.default_rng(7)
    boots = np.array([rnd.choice(g, len(g)).mean() for _ in range(1000)])
    syms = {}
    for s, _, p in rows:
        syms.setdefault(s, []).append(p)
    res = {"n": int(len(g)), "symbols": len(syms), "win_rate_pct": round(float((g > 0).mean() * 100), 2),
           "avg_gross_pct": round(float(g.mean()), 4),
           "gross_ci95": [round(float(np.percentile(boots, 2.5)), 4), round(float(np.percentile(boots, 97.5)), 4)],
           "avg_abs_move_pct": round(float(np.abs(g).mean()), 4)}
    for k, fee in FEES.items():
        res[f"avg_{k}_pct"] = round(float(g.mean() - fee), 4)
        res[f"sum_{k}_pct"] = round(float((g - fee).sum()), 1)
        res[f"symbols_profitable_{k}"] = sum(1 for v in syms.values() if np.mean(v) - fee > 0)
        res[f"fee_share_of_avg_move_{k}_pct"] = round(100 * fee / float(np.abs(g).mean()), 1)
    return res


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--klines", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    kdir = Path(a.klines)
    cov = json.loads((kdir / "_coverage.json").read_text())
    syms = sorted(cov["complete"])
    rng = np.random.default_rng(2026)
    acc: dict[tuple[str, str], list] = {}
    monthly: dict[tuple[str, str, str], list] = {}
    digest = hashlib.sha256()
    for si, sym in enumerate(syms, 1):
        raw = (kdir / f"{sym}.npz").read_bytes()
        digest.update(raw)
        z = np.load(kdir / f"{sym}.npz")
        d5 = {k: z[k] for k in z.files}
        for tf, data in (("5m", d5), ("15m", resample(d5, 3)), ("1h", resample(d5, 12))):
            for rule, sig in signals(data, rng).items():
                for t, p in trades(data, sig, MAX_HOLD[tf]):
                    acc.setdefault((tf, rule), []).append((sym, t, p))
                    month = dt.datetime.fromtimestamp(t / 1000, dt.timezone.utc).strftime("%Y-%m")
                    monthly.setdefault((tf, rule, month), []).append((sym, t, p))
        print(f"[bt] {si}/{len(syms)} {sym}", flush=True)
    res = {
        "provenance": {
            "source": "data.binance.vision monthly USD-M 5m klines", "months": cov["months"],
            "universe": cov["universe"], "symbols": syms, "symbols_excluded_incomplete": sorted(cov["partial"]),
            "klines_sha256": digest.hexdigest(), "stop_atr": SL_ATR, "target_atr": TP_ATR, "max_hold_bars": MAX_HOLD,
            "fees_round_trip_pct": FEES, "entry": "next bar open after a closed-bar signal; both-touched bar = stop",
            "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
            "caveat": "no slippage beyond next-open entry, today's universe applied backwards: both flatter results",
        },
        "results": {f"{tf}|{rule}": summarise(v) for (tf, rule), v in sorted(acc.items())},
        # For the film: per-pair average after 0.07% (the 93-pair grid) and the stacked, uncompounded curve of the
        # 5m EMA rule after fees (the equity chart), downsampled to ~300 points.
        "per_symbol_net_007": {f"{tf}|{rule}": {s: round(float(np.mean([x[2] for x in v if x[0] == s])) - FEES["net_007"], 4)
                                                for s in sorted({x[0] for x in v})}
                               for (tf, rule), v in sorted(acc.items()) if tf == "5m"},
        "equity_5m_ema_net_007": (lambda rows: (lambda cum: [[int(rows[i][1]), round(float(cum[i]), 2)]
                                                              for i in range(0, len(rows), max(1, len(rows) // 300))]
                                                + [[int(rows[-1][1]), round(float(cum[-1]), 2)]])(
            np.cumsum([r[2] - FEES["net_007"] for r in rows])))(sorted(acc[("5m", "ema_cross")], key=lambda r: r[1])),
        "monthly_net_007": {f"{tf}|{rule}|{m}": round(st.fmean(x[2] for x in v) - FEES["net_007"], 4)
                            for (tf, rule, m), v in sorted(monthly.items())},
    }
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(res, indent=1) + "\n")
    for k, v in res["results"].items():
        print(f"{k:18s} n={v['n']:7d} win={v['win_rate_pct']:5.1f}% gross={v['avg_gross_pct']:+.4f}% "
              f"net07={v['avg_net_007_pct']:+.4f}% net10={v['avg_net_010_pct']:+.4f}% "
              f"fee/move={v['fee_share_of_avg_move_net_007_pct']}% profitable syms@07={v['symbols_profitable_net_007']}/{v['symbols']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
