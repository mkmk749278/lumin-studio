# ep01 handoff — end of 23 NOV 2026

## Where it stands
- **Package LOCKED:** "5-Minute Scalping Was No Better Than a Coin Flip" · thumbnails main `1 IN 93`, challenger `117,000 TRADES`.
- **Narration LOCKED:** `script_v2.md` (1,202 words, voice Reid). **Audio APPROVED** by the owner.
  Drive `Lumin-Studio/episodes/ep01/audio/`: `master.wav` (-14.00 LUFS, -2.4 dBTP), `vo.wav` (enhanced), `vo_raw.wav`, take `blocks/ep01_b01.mp3`.
- **Review cut round 1 SENT, awaiting the owner's notes:** `renders/ep01_review_720p_r1.mp4`
  (https://drive.google.com/file/d/12Oknt_piE0PB2YWJkC6ldPHeep5Yqkkh/view) — 13,037 frames, 7:14, seams and sync checked.

## Open questions for the owner
1. Notes on review cut r1 (by timestamp), or approval.
2. Music bed + soft sound cues: yes/no, and the source (none exists for this channel yet).
3. 2:20 "Mac-D, zero" — Whisper heard "Back D"; owner to confirm by ear (re-record that one sentence if needed).
4. ElevenLabs model and slider settings used for Reid -> `config/voice.json`.

## Next steps once the cut is approved
1. Apply notes -> render r2 (render.yml: composition `Ep01`, scale `0.3333333333333333`, runners 6, audio `master.wav`).
2. 4K master once: `modal.yml` task `render`, composition `Ep01`, scale 1, workers 30, audio `master.wav` (est. under $1).
3. YouTube package: 2 thumbnails (Test & Compare), title, description (disclaimer line, sources, chapters from the
   section starts in `src/episodes/ep01/Ep01.tsx` `B`), `ep01.srt`, pinned comment.

## How the pieces fit (for a fresh session)
- Film: `src/episodes/ep01/` (Ep01.tsx sections, TradeChart.tsx, kit.tsx, data.ts). Every cue = `at("<spoken phrase>")`
  from `episodes/ep01/words.json`; a script change means re-align (`scripts/align_audio.py`) and the cues follow.
- Numbers: `data/stats/ep01_scalping.json` (`scripts/backtest_scalping.py`, klines from `scripts/fetch_universe.py`
  into gitignored `data/raw/`), sample trade `data/market/ep01_sample_trade.json` (`scripts/ep01_sample_trade.py`).
- Claims: `claims.csv` rows 1-25.
