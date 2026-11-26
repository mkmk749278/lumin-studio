# Gemini handoff request templates

`scripts/gemini_handoff.sh new <id> <task>` copies one section below into `episodes/<id>/handoff/to_gemini.md` under
its front matter. Fill every `<fill: …>` line (push refuses a file that still has one), cut what does not apply, add
what this episode needs. Never name anyone or anything outside this channel in a request. Gemini's answer is a list
of leads: each point is checked against code, `words.json` and a rendered still, and logged in
`episodes/<id>/review/gemini_<task>_check.md` (CONFIRMED / PARTLY / NOT CONFIRMED) before any fix.

## task: research
## Files in Drive to inspect
- Brief: <fill: Drive link to episodes/<slug>/repo/brief.md>

## Specific checks requested
1. Run Deep Research (really run it; open every page you cite) on: <fill: the thesis in one line>.
2. What everyone says: the 5 strongest YouTube videos on it (views, length, angle, top comments), and where they
   promise profits or hype.
3. What primary sources say: exchange documentation (Binance USD-M contract specs, funding, liquidation engine),
   academic market-microstructure papers; each point with its URL and the exact sentence.
4. Gaps no video covers, and search words traders type.
Do not write a script or a title. No price targets, no profit claims.

## task: fact-check
## Files in Drive to inspect
- Script: <fill: Drive link to script.md>
- Claims file: <fill: Drive link to claims.csv>

## Specific checks requested
1. For every row with a URL: open it. Does it support the script line exactly (number, unit, date, tense)? OK /
   WRONG / UNSUPPORTED / SOURCE DEAD, with the right figure.
2. Dataset rows cite a stats file and sha256: do not re-check those numbers; check only that the script says gross or
   net, PnL % with R beside it, and never implies live results from a backtest.
3. Any line YouTube's finance policy would flag (profit promises, win rates, guarantees).

## task: fresh-facts
## Files in Drive to inspect
- Claims file: <fill: Drive link to claims.csv>

## Specific checks requested
1. Any exchange rule change in the last 30 days (funding intervals, liquidation, tick sizes, listings) that dates a
   line? Give the page and its date.

## task: narration-review
## Files in Drive to inspect
- Script: <fill: Drive link to script.md>
- Locked package (title + thumbnail words + 0:00–0:15 promise): <fill: one line>

## Specific checks requested
Read it as five futures traders: a prop-desk quant in London, a retail scalper in Singapore, a swing trader in Texas,
a crypto-curious engineer in Berlin, a cautious beginner in Sydney.
1. Does sentence 1 keep the thumbnail's promise? Where would each one stop watching? Quote the line.
2. Any hype, guru tone, price target, or claim that sounds like a profit promise.
3. Is the thesis distinct and proven by the data shown? Scores 1–10: trust, watch to the end, subscribe.

## task: audio-audit
## Files in Drive to inspect
- Takes (in order): <fill: Drive links to the enhanced blocks>
- Script read: <fill: Drive link to the recording blocks>

## Specific checks requested
Listen to every file in full against the script (clinical, data-first desk voice).
1. Wrong, skipped, repeated or added words.
2. Numbers, prices, percentages and acronyms read exactly as written (U-S-D-T, M-A-C-D as written in the script).
3. Delivery: uptalk, vocal fry, robotic or glitchy spots, clicks, loudness or room changes between blocks.
4. Re-take list (exact sentences, in order of importance) and a keep list (5 best moments).

## task: cut-audit
## Files in Drive to inspect
- Review cut: <fill: Drive link>
- Script: <fill: Drive link to script.md>

## Specific checks requested
Watch it in full on a desktop, then as a phone viewer.
1. Any static chart over 1.5 s; empty canvas; dark-slide fatigue.
2. Every spoken event (sweep, fill, stop hit, a figure): does its visual land within 100 ms of the word?
3. Prices, times and PnL readable on a phone; honesty labels on illustrative setups; the disclaimer footer on every
   chart segment; nothing critical in the last 15 s.
4. Sound: voice level, bed under the voice, clicks.
5. Return a fix list as a Claude Code spec: timestamp, what is wrong, the exact change.

## task: analytics-audit
## Files in Drive to inspect
- Studio export or screenshots: <fill: Drive link>

## Specific checks requested
1. Impressions, CTR, average view duration, retention dips, traffic sources, countries, subscribers, Play Store
   clicks from the description.
2. Three changes for the next episode, most valuable first.

## task: second-opinion
## Files in Drive to inspect
- <fill: Drive links>

## Specific checks requested
1. <fill: the exact question>

## How to answer (every task)
Save the answer as `from_gemini.md` (a file or a Google Doc named from_gemini) at the `return_path` above. If you
cannot write to Drive, email the whole answer instead, subject `[GEMINI-RESULT] <repo> <slug> <task_type>`.
Start with this front matter, then the sections:
```
---
repo: <repo>
slug: <slug>
task_type: <task_type>
completed_ist: YYYY-MM-DD HH:MM IST
verdict: APPROVED | FIXES_REQUIRED | DO_NOT_PROCEED
---
```
1. Verdict in one sentence. 2. Findings, most serious first, each with a timestamp (file, mm:ss) or line, what you
saw or heard, why it matters to the viewer, and the exact fix. 3. What is good and must be kept. 4. Anything you
could not open or check (say so; never guess). Every fact you report carries the URL of the page you opened.
