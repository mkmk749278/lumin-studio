# later-fill-gap — brief (parked 23 NOV 2026: owner wants a high-demand crypto topic first, not the app)

## The finding (data/stats/ep01_fill_gap.json, input SHA-256 `09ea5584ab8266ab…`)
Every delivered Lumin signal that closed between 25 JUN and 23 NOV 2026: **5,130 trades**.
- **On paper** (scored from the published entry price), after a 0.07% round trip: **+0.085% per trade**
  (95% CI +0.009% to +0.168%). Remove the best 1% of trades and it is **−0.01%**: the paper edge rests on a few.
- **At the fill.** From 05 SEP the engine also recorded the first price a trader could actually trade after each
  signal (3,408 trades). On that same set: paper **+0.103%**, at the real entry **−0.100%** (CI −0.20% to +0.005%),
  and **−0.040%** with a break-even stop placed at the fill.
- **Why:** the entry had already moved against the trade on 58% of signals (median +0.06%, 1 in 10 by more than
  0.9%). A signal that fires when a candle closes is published after the move it reacts to.
- **5m vs 15m:** the late fill hurts both. 5m: paper +0.058% → fill −0.046%. 15m: paper +0.124% → fill −0.122%
  (15m drifts more: 10% of entries more than 1.08% late). So the honest title is about *bar-close timing*, not
  "5m indicators".

## Package (title < 60 characters, no colon; thumbnail 2–3 words, never repeating the title)
Recommended:
- **Title:** `5,130 Crypto Signals Made Money on Paper. Not at the Fill` (57)
- **Thumbnail:** `PAPER EDGE` over a split candle: the published entry line, and the real fill one tick above it.
Challengers (same promise):
- `Why Bar-Close Signals Lose the Edge Before You Enter` (52) · thumbnail `TOO LATE`
- `We Audited 5,130 of Our Own Futures Signals` (44) · thumbnail `+0.10% → −0.10%`

**The promise:** our own 5,130-signal ledger, the gap between the published entry and the real fill, and the
number that flips sign.

## Click-contract, 0:00–0:15
First frame: the ledger counter rolling to 5,130 beside a candle closing. Sentence 1: *We published five thousand
one hundred and thirty futures signals. On paper, they made money.* By 0:10 the second number lands: at the
price a trader could actually get, they did not.

## Thesis (distinct, provable from the file)
A bar-close indicator trigger is late by construction: it reacts to a move that has already happened, so the
trader pays the drift on entry. Our own audited ledger shows that drift alone turns a small paper edge negative.
The episode ends on the mechanism that removes it (a level chosen before the move, filled by a limit order) as
what Lumin is being rebuilt around — stated as a design choice, never as a proven result (Phase 2 measures it).

## Risks and fairness
- This publicly says Lumin's own signals lost money at the real fill after fees. **That is the owner's call.** It
  is also the most credible possible opening for a channel built on open ledgers.
- No profit claim anywhere; the limit-order design is never promised to win. CIs are shown on screen for every
  headline number.
- "Paper" and "fill" are both measured by the engine, not by us; the 1,722 trades without a recorded fill
  (before 05 SEP, 1,721 + 1 stale) are named, not hidden.

## Target length: about 8 minutes (cold open, the ledger, the drift mechanism, 5m vs 15m, the top-1% test, the fix)
