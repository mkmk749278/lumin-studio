# ep01 — brief (awaiting the owner's approval of the package)

Topic chosen by the owner on 23 NOV 2026 from the demand check (`research/demand-2026-11-23/`): 5-minute scalping
strategies are the most-watched futures topic we measured (top long videos ~2.0M, 1.3M, 1.3M views).

## The test (`scripts/backtest_scalping.py` → `data/stats/ep01_scalping.json`, klines SHA-256 `398ddaccd8d7f773…`)
- **Data:** every 5-minute candle, 01 MAY – 31 OCT 2026, for **93** Binance USD-M perpetuals (the engine's current
  universe; 2 pairs without six full months excluded), from Binance's own public archive.
- **Rules (textbook versions):** EMA 9/21 cross with the EMA 200 trend filter · RSI 30/70 reversal with the same
  filter · MACD signal cross with the same filter · and a **coin flip** (random entries at the EMA rule's rate).
- **Same exits for all:** stop 1 × ATR, target 1.5 × ATR, entry at the next candle's open, fees 0.07% (and 0.10%
  for market orders both ways).

## What it found (5-minute)
| Rule | Trades | Win | Avg before fees | Avg after 0.07% | Pairs profitable after fees |
|---|---|---|---|---|---|
| EMA 9/21 | 117,634 | 39.7% | −0.004% | −0.074% | 1 of 93 |
| MACD | 77,338 | 39.8% | −0.000% | −0.070% | 2 of 93 |
| RSI 30/70 | 9,455 | 38.7% | −0.006% | −0.076% | 13 of 93 |
| **Coin flip** | 112,524 | 39.9% | −0.005% | −0.075% | 0 of 93 |

- **Before fees every rule is a coin flip** (all four averages sit inside each other's 95% ranges, around zero).
- **The fee is the strategy's real result:** it costs 13% of the average 5-minute trade's whole move, 8% on 15m and
  4% on 1h. Every month from May to October is negative for the EMA rule after fees.
- **Honest limits, said on screen:** no slippage modelled (real results are worse); today's coin list applied
  backwards; textbook rules, not any one creator's exact system; this measures rules, not discretionary skill.

## Package (title < 60, no colon; thumbnail never repeats the title)
Recommended:
- **Title:** `5-Minute Scalping Was No Better Than a Coin Flip` (48)
- **Thumbnail:** `1 OF 93` beside a coin mid-flip over a 5-minute chart.
Challengers (same promise):
- `We Tested 5-Minute Scalping on 117,634 Crypto Trades` (52) · thumbnail `FEES WIN`
- `Why 5-Minute Crypto Scalping Loses (117,634 Trades)` (51) · thumbnail `13% GONE`

**The promise:** the popular 5-minute rules, tested on six months of real Binance futures candles, against a coin
flip, after fees.

## Click-contract, 0:00–0:15
First frame: a 5-minute candle closing and an EMA cross firing a trade, next to a coin flipping. Sentence 1:
*We ran the three most popular five-minute scalping rules on one hundred seventeen thousand crypto futures
trades, and a coin flip did just as well.* By 0:12: after fees, one coin pair out of ninety-three made money.

## Thesis
On five-minute crypto futures charts the textbook entry has no measurable edge, and the fee, about an eighth of
the average move, decides the result. Slower charts cut that fee share by two thirds. The episode ends on what
actually changes the maths (fewer, larger moves; limit entries that pay the lower fee) without promising a strategy.

## Lumin
None in this episode beyond the channel name (owner, 23 NOV 2026: high-demand crypto first, not the app).

## Target length: about 7 minutes (1,030 words of narration)
