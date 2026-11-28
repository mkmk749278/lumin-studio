# ep01 handoff — 28 NOV 2026 (r2 polish ready for 720p review render)

## Where it stands
- **Package LOCKED:** "5-Minute Scalping Was No Better Than a Coin Flip" · thumbnails main `1 IN 93`, challenger `117,000 TRADES`.
- **Narration & Voice LOCKED:** `script_v2.md` (1,202 words, voice Reid). `config/voice.json` populated (`eleven_v4`, `stability: 0.0`, `similarity: 0.70`, `style: 0.0`, `speaker_boost: true`). **Audio APPROVED** by the owner.
  Drive `Lumin-Studio/episodes/ep01/audio/`: `master.wav` (-14.00 LUFS, -2.4 dBTP), `vo.wav` (enhanced), `vo_raw.wav`, take `blocks/ep01_b01.mp3`.
- **Review cut round 1:** `renders/ep01_review_720p_r1.mp4`
  (https://drive.google.com/file/d/12Oknt_piE0PB2YWJkC6ldPHeep5Yqkkh/view) — 13,037 frames, 7:14.
- **r2 visual polish applied on `main`:**
  - Created `src/components/TerminalChrome.tsx` (52 px persistent top header, auto-hides during `Ident` and fades out across `[END_SCREEN - 15, END_SCREEN]`).
  - Created `src/components/BackgroundTape.tsx` (blurred, slow-drifting `T.candles` tape behind non-chart sections, attenuated to `0` during live `TradeChart` and end-screen).
  - Polished `src/episodes/ep01/Ep01.tsx` and `src/episodes/ep01/kit.tsx`: scaled up non-chart cards (`Premise`, `TheTest` + mini SVG rule charts, `Exits` trade ticket + fee ticker, `BeforeFees`, `FeeAll` equity fill + monthly cards, `WhyFive`, `Limits`, `Maths`) and kept the final 15 s (`>= END_SCREEN`) uncluttered.
  - Verified `tsc --noEmit` (`0` errors) and all `at(...)` word cues against `episodes/ep01/words.json`.

## Open questions for the owner
1. Explicit sign-off on `ep01_review_720p_r2.mp4` once `render.yml` finishes (HARD 4K GATE).
2. Music bed + soft sound cues: optional (`master.wav` untouched for r2 so it ships immediately).
3. 2:20 "Mac-D, zero" — owner to confirm by ear on `ep01_master_listen.mp3` (keep if clean).

## Next steps
1. Trigger `render.yml` for r2 (composition `Ep01`, episode `ep01`, scale `0.3333333333333333`, runners `6`, audio `master.wav`, name `ep01_review_720p_r2.mp4`).
2. **Wait for owner approval of r2**, then run 4K master once: `modal.yml` task `render`, composition `Ep01`, scale `1`, workers `30`, audio `master.wav` (est. under $1).
3. YouTube package: 2 thumbnails (Test & Compare: `1 IN 93` / `117,000 TRADES`), title, description (disclaimer line, `data.binance.vision` citation, chapters from the section starts in `src/episodes/ep01/Ep01.tsx` `B`), `ep01.srt`, pinned comment teasing `ep02` (`later-fill-gap`).

## How the pieces fit (for a fresh session)
- Film: `src/episodes/ep01/` (Ep01.tsx sections, TradeChart.tsx, kit.tsx, data.ts). Every cue = `at("<spoken phrase>")`
  from `episodes/ep01/words.json`; a script change means re-align (`scripts/align_audio.py`) and the cues follow.
- Numbers: `data/stats/ep01_scalping.json` (`scripts/backtest_scalping.py`, klines from `scripts/fetch_universe.py`
  into gitignored `data/raw/`), sample trade `data/market/ep01_sample_trade.json` (`scripts/ep01_sample_trade.py`).
- Claims: `claims.csv` rows 1-25.
