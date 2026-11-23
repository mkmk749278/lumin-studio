#!/usr/bin/env python3
"""Export ep01's on-screen sample trade (one real 5m EMA 9/21 cross on BTCUSDT) for CandleReplay.

Chosen 23 NOV 2026 from data/raw/klines/5m/BTCUSDT.npz (data.binance.vision, May-Oct 2026) by the rule the
episode shows: a long EMA 9/21 cross above EMA 200 whose signal candle had already run more than four ATR off the
last six candles' low (a late entry), whose 1 x ATR stop was hit by a wick less than 0.4 ATR deep within 15 candles,
and after which price went on to pass the 1.5 x ATR target within two hours. Everything here is recomputed from the
archive with the exact backtest code (scripts/backtest_scalping.py), so the screen and the test cannot disagree.

usage: python3 scripts/ep01_sample_trade.py  ->  data/market/ep01_sample_trade.json
"""
import datetime as dt
import hashlib
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import backtest_scalping as b  # noqa: E402

SYMBOL, SIGNAL_UTC = "BTCUSDT", "2026-07-01T01:40:00+00:00"
FEE = 0.07

src = ROOT / "data/raw/klines/5m" / f"{SYMBOL}.npz"
z = np.load(src)
d = {k: z[k] for k in z.files}
c, o, h, l, t = d["close"], d["open"], d["high"], d["low"], d["open_time_ms"]
e9, e21, e200, a = b.ema(c, 9), b.ema(c, 21), b.ema(c, 200), b.atr(h, l, c)
s = int(np.nonzero(t == int(dt.datetime.fromisoformat(SIGNAL_UTC).timestamp() * 1000))[0][0])
assert b.cross_up(e9, e21)[s] and c[s] > e200[s], "not an EMA 9/21 long signal"
e = s + 1
entry, stop, target = float(o[e]), float(o[e] - a[s]), float(o[e] + 1.5 * a[s])
k = int(np.nonzero(l[e:e + 48] <= stop)[0][0])
assert not (h[e:e + k + 1] >= target).any(), "target hit first"
lo, hi = s - 40, e + k + 30
fmt = lambda i: dt.datetime.fromtimestamp(t[i] / 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
gross = (stop - entry) / entry * 100
out = {
    "meta": {"symbol": SYMBOL, "interval": "5m", "market": "binance_usdm_perpetual",
             "source": "data.binance.vision monthly klines", "archive_sha256": hashlib.sha256(src.read_bytes()).hexdigest(),
             "window": [fmt(lo), fmt(hi - 1)]},
    "trade": {
        "signal_index": s - lo, "entry_index": e - lo, "stop_index": e + k - lo,
        "signal_time_utc": fmt(s), "signal_close": float(c[s]), "entry_time_utc": fmt(e), "entry": entry,
        "atr": round(float(a[s]), 2), "stop": round(stop, 2), "target": round(target, 2),
        "stop_hit_time_utc": fmt(e + k), "stop_wick_low": float(l[e + k]),
        "run_before_signal_atr": round(float((c[s] - l[s - 5:s + 1].min()) / a[s]), 2),
        "gross_pct": round(gross, 3), "net_pct": round(gross - FEE, 3), "fee_pct": FEE,
        "high_after_stop_2h": float(h[e + k + 1:e + k + 25].max()),
        "target_passed_after_stop_utc": fmt(e + k + 1 + int(np.nonzero(h[e + k + 1:e + k + 25] >= target)[0][0])),
    },
    "ema9": [round(float(x), 2) for x in e9[lo:hi]], "ema21": [round(float(x), 2) for x in e21[lo:hi]],
    "candles": [{"timestamp": int(t[i]), "open": float(o[i]), "high": float(h[i]), "low": float(l[i]),
                 "close": float(c[i]), "volume": float(d["volume"][i])} for i in range(lo, hi)],
}
(ROOT / "data/market/ep01_sample_trade.json").write_text(json.dumps(out, separators=(",", ":")) + "\n")
print(json.dumps(out["trade"], indent=1))
