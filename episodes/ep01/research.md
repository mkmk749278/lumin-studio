# ep01 — research notes

## Source 1: the engine's published per-setup summary (first read, 23 NOV 2026)
- File: `360-v2` branch `monitor-logs`, `monitor/report/analysis/performance_setup.csv`, bundle generated
  2026-11-23T08:05:21Z, engine git `f8830f1`. SHA-256 `389d0e195613cba693820fd78599354fda24875dfc92169e4c06a9464b47e98e`.
- What it is: every closed signal in the engine's closed-signal record, per setup: n, wins, losses, neutral,
  win rate, average `pnl_pct` (gross, before fees).
- Grouped by each setup's declared trigger timeframe (`360-v2/src/setup_timeframes.py`):

| Trigger timeframe | Signals | Win | Loss | Avg gross | Avg after a 0.07% round trip (estimate) |
|---|---|---|---|---|---|
| 15m | 3,268 | 31.8% | 41.1% | +0.172% | +0.102% |
| 5m | 1,831 | 28.7% | 42.7% | +0.120% | +0.050% |
| 1h | 21 | 23.8% | 52.4% | +0.106% | +0.036% |
| 1m | 3 | 0.0% | 66.7% | −1.067% | −1.137% |
| **All** | **5,123** | | | | |

## What this already says about the slate
- **"4,900" is not the current count:** the record holds **5,123** closed signals today. The title number must
  come from the exact window the episode uses (claims.csv), not from the handoff.
- **"5m indicators fail" is not what this summary shows.** 5m-triggered signals average +0.12% gross, below 15m
  (+0.17%) but positive before fees, and only thinly positive after them. The defensible thesis is narrower and
  probably stronger: *the edge is thinner than the fees and the fill*, i.e. a bar-close entry is already late.
- That needs per-trade data this summary does not carry: entry vs the first price a user could actually trade
  (`entry_drift_pct`, `rebased_pnl_pct` in the ops trades export), fees per row, and the window dates.

## Next
- Owner downloads the full per-trade export from ops (`/track-record/trades.csv?window=all`), sends it here.
- Run `scripts/analyze_dataset.py` (adapter for the ops export columns), then lock the title and thesis.
