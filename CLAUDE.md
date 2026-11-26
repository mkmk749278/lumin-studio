# Lumin Studio: Claude Code guide

YouTube channel: **Lumin Futures** (owner, 23 NOV 2026). Said once after the cold open ("This is Lumin Futures.") and
once at the close; logo and banner: `src/brand/`, rendered with `npx remotion still` (BrandLogo 800x800, BrandBanner 2560x1440).

Programmatic video studio for the **Lumin: Crypto Signals** YouTube channel (the Google Play app for Binance
USD-M perpetual futures traders). Every rule here is permanent; change one only with the owner's word, and
write the reason beside it.

## Every session
1. Read this file, then the open episode's `episodes/<id>/brief.md` and its `handoff.md` if one exists.
2. **Work on `main`** (owner, 23 NOV 2026: "create main, work on that"). Commit and push at least every 30–45
   minutes and at each stage's end; every push to `main` is backed up to Drive by `drive-backup.yml`.
3. Times told to the owner in chat are **IST** ("11:00 AM IST"; IST = UTC + 5:30). Files and on-screen dates
   stay UTC, day-first (`05 JAN 2026`).
4. The owner works **only from an Android phone**: every script is headless CLI with clear stdout progress,
   every result opens on a phone (a link, a file sent with SendUserFile, a click-to-copy block).

## 1. Channel and story
- **Identity:** clinical, data-first **quant-desk futures forensics** (institutional desk look). Zero hype, zero
  price targets, zero "crypto guru" energy. Global English, USD/USDT only, no regional framing.
- **Brand isolation (hard line):** this repo and channel are 100% separate from any other channel or personal
  brand. Nothing here, on screen, in descriptions or comments names or cross-promotes another channel, repo or
  person. Our voice is used by this channel only.
- **Market scope:** Binance USD-M perpetuals, ~75 large/mid-cap pairs plus high-volatility 24h top gainers/losers.
- **Story arc.** The Lumin engine is moving from reactive bar-close indicator triggers (5m/15m/1h) to an hourly
  analyst that outputs pre-planned limit setups executed deterministically (fixed Entry, SL, TP).
  - *Phase 1 (launch, weeks 1–3):* forensic breakdowns of why reactive indicator-chasing fails, from our own
    closed-signal dataset and market-microstructure math. Lumin is a soft plug (mid-roll, pinned comment) as the
    engine being rebuilt in the open.
  - *Phase 2 (after the upgrade):* live setup autopsies, monthly open-ledger audits (every winner and loser),
    direct Play Store conversion.
- **Launch slate** (packages are drafts until each passes §6's package rules and the facts gate):
  1. *We Analyzed 4,900 Crypto Futures Signals. Here's Why 5m Indicators Fail.* — thumbnail `4,900 TRADES`
  2. *Why 90% of Traders Get Liquidated Shorting 24h Top Gainers* — thumbnail `STOP HUNT`
  3. *Market Orders vs. Pre-Planned Limit Setups (Math Over 1,000 Futures Trades)* — thumbnail `LIMIT VS MARKET`

  Open issues on the slate, found at bootstrap: titles 1 and 3 are over the 60-character limit; title 1 has a
  full stop where §6 forbids only colons but reads as two titles; "4,900" and "90%" are claims that need a row
  in `claims.csv` before they appear anywhere, and title 1's verdict ("5m Indicators Fail") must be what the
  dataset actually shows, decided after `analyze_dataset.py` runs — never before.

## 2. Infrastructure (non-negotiable)
### A. GitHub Actions: renders now, light and by hand (owner, 23 NOV 2026)
- **Owner's decision, 23 NOV 2026: "as of now we do render with GitHub runners."** This replaces the bootstrap's
  "zero GitHub Actions" rule until Modal is set up; then 4K masters move to Modal (`modal_render.py`, same pipeline).
- *The risk, stated once so nobody forgets it:* GitHub's terms allow Actions for building and testing a repo's own
  software, and heavy video renders on runners have already got one of the owner's repos disabled. So every render
  here is: started by hand (`workflow_dispatch`, never on push), at most **6 runners**, review cuts at 720p/1080p, the
  4K master once per episode after the owner approves the cut, and **everything backed up to Drive** so a disabled
  repo loses nothing.
- Workflows (`.github/workflows/`):
  - `render.yml` — plan (bundle, frame count) → up to 6 runners render non-overlapping frame ranges **muted** →
    join: lossless concat, ONE master WAV muxed (AAC 320k), frame count checked, uploaded to Drive
    `Lumin-Studio/episodes/<id>/renders/`.
  - `drive-backup.yml` — **after every merge to `main`**, a `git bundle` of every branch and commit goes to Drive
    `Lumin-Studio/_Backups/lumin-studio/` (dated + `latest.bundle`; restore: `git clone latest.bundle`).
- The repo is **public**: logs and artifacts are readable by anyone. Never echo a secret; never commit raw
  datasets (`data/raw/` is ignored); renders go to Drive, artifacts last 3 days.
- **Secrets: one Termux command** (owner, 23 NOV 2026), run on the phone; it sets `GDRIVE_RCLONE_TOKEN`,
  `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` as repo secrets, prints nothing secret, and can be re-run to replace one:
  ```bash
  bash <(curl -fsSL https://raw.githubusercontent.com/mkmk749278/lumin-studio/main/scripts/termux_secrets.sh)
  ```
  The Modal pair comes from modal.com → Settings → API Tokens → New Token.
- `modal.yml` (by hand): the runner only orchestrates; the compute is on Modal. `task: enhance` runs Resemble
  Enhance on T4 GPUs (`modal_gpu.py`), every block in parallel; `task: render` runs `modal_render.py` (the 4K master
  path). The session starts these with the GitHub tools and reads the results from Drive.
- GPU choice: Modal T4 (cheapest GPU, ~3 GB VRAM needed). Kaggle's free GPUs are the fallback if the Modal credit
  runs low; the session's Kaggle API access is already connected.

### Drive (owner, 23 NOV 2026)
- The channel's own top-level folder **`Lumin-Studio`** (id `1d6YOipH7yiKxiBOZTNzNhBF2X229XZsC`); never write in any
  other Drive folder. `scripts/gdrive.sh up|pull|sync|ls`. Layout: `episodes/<id>/{blocks,audio,renders,repo}/`,
  `_Backups/lumin-studio/`.
- At each stage's end the session mirrors the episode's text folder to `episodes/<id>/repo/`
  (`scripts/gdrive.sh sync episodes/<id> episodes/<id>/repo`). Takes, enhanced audio and renders live only on Drive.

### B. Modal (`modal>=1.6`, pinned 1.6.4)
- Workspace: Modal Starter, $30/month free credit with a **hard $29 monthly usage limit**. State the estimated
  cost of every render before a big one; ask before anything that could pass the free credit.
- SDK: `modal.Image.add_local_dir(..., ignore=[...])` / `add_local_file(...)`. Never `modal.Mount` or
  `Image.copy_local_dir`.
- `scaledown_window=2` on every render function. Plain `@app.function` only: never Sandboxes, never
  `non_preemptible=True` (3x cost), never pin a `region` (+15–75%).
- **Bundle once, fan out:** one container runs `npm ci` (cached image layer) + `remotion bundle` onto the
  shared Volume `lumin-render-vol`; then 25–35 CPU containers (`cpu=4.0, memory=8192`) render non-overlapping
  `--frames=start-end` video-only slices via `.starmap()`; `stitch_master` concats losslessly.
- **No audio clicks:** never concatenate per-chunk AAC. Chunks render `--muted`; the single mastered WAV is
  muxed once at the stitch (`-map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k`).
- 3D is optional and rare (headless Blender on `gpu="T4"`/`"L4"` for an occasional conceptual metaphor);
  90%+ of visuals are 2D/2.5D React/SVG in Remotion.
- Credentials: `MODAL_TOKEN_ID` / `MODAL_TOKEN_SECRET` as environment variables of the cloud environment —
  never in git, chat or docs.

### C. Repo hygiene
- Never commit heavy binaries or secrets. `.gitignore` covers `node_modules/`, `out/`, `build/`, media
  (`*.mp4 *.mov *.wav *.mp3 *.zip` …), `.env*`, `data/raw/`, `episodes/*/assets|audio/`. Large media lives on
  the Modal Volume or Google Drive / Cloudflare R2. Vendored OFL fonts (`public/fonts/`, ~190 KB) are the
  only binaries in git.
- Optional GitLab mirror: `git remote set-url --add --push origin https://gitlab.com/<user>/lumin-studio.git`
  (after re-adding the GitHub push URL the same way).

## 3. Layout
```
CLAUDE.md  .gitignore  package.json  tsconfig.json  remotion.config.ts  requirements*.txt
modal_render.py                 Modal: prepare_bundle -> render_chunk x N (.starmap) -> stitch_master (+WAV mux)
scripts/fetch_market_data.py    geo-block-safe Binance USD-M klines / funding -> data/market/
scripts/analyze_dataset.py      closed-signal CSV/JSON -> data/stats/<name>/*.json (with input sha256)
scripts/align_audio.py          narration -> words.json (ElevenLabs timestamps or local MMS forced alignment)
scripts/audio_master.py         VO (+bed) -> one 48 kHz/24-bit WAV at -14 LUFS / -1.5 dBTP, verified
scripts/composition_meta.mjs    composition metadata as JSON (render.yml, modal_render.py)
scripts/vo_blocks.py            approved script -> <=10,000-character recording blocks + lint
scripts/vo_enhance.py           owner's takes -> Resemble Enhance -> joined vo.wav (+ vo_raw.wav)
scripts/gdrive.sh               Drive up / pull / sync / ls (folder Lumin-Studio)
scripts/gemini_handoff.sh       Gemini handoff: new / push / pull / status (§8)
config/voice.json               the channel voice (Reid) and its settings
modal_gpu.py                    Modal T4: Resemble Enhance per block (vo_enhance.py --backend modal)
scripts/termux_secrets.sh       the owner's one Termux command for every repo secret
.github/workflows/              render.yml (runners, <=6) · modal.yml (enhance | render on Modal) · drive-backup.yml
data/market/  data/stats/       cached, deterministic inputs — the ONLY data a render reads
src/Root.tsx                    FuturesLabLong 3840x2160@30 · TradeAutopsyShort 1080x1920@30 · LuminDemo 1920x1080@30 (5 s)
src/theme/tokens.ts             colours, type, springs, safe zones
src/components/                 TerminalBackdrop CandleReplay LuminAlertCard DatasetChart LiquidityOverlay
                                KineticCallout DisclaimerFooter
src/compositions/               FuturesLabLong (scene list) · TradeAutopsyShort (scene list) · LuminDemo
src/lib/                        Stage (design canvas -> output size), cues (word -> frame), market, fonts
episodes/_template/             brief.md · script.md · claims.csv — copy to episodes/<id>/ for each episode
```

## 4. Market data (geo-block-safe)
- Cloud sessions and Modal run on US IPs where `fapi.binance.com` returns **HTTP 451** (measured at bootstrap;
  `api.bybit.com` returned 403 too). So `data.binance.vision` archives (daily + monthly klines, monthly
  `fundingRate`) are the **primary** source; only the current UTC day falls back to live REST
  fapi → Bybit linear → OKX swap, each attempt logged.
- A series that mixes venues says so in `meta.sources` (counted per rendered candle). A Binance-labelled chart
  is built from Binance bars only: pick windows that end at 00:00 UTC of a published day when the chart says
  "Binance".
- **Render determinism:** Remotion reads only `data/market/` and `data/stats/` JSON (imported at build time).
  Never an HTTP request inside a render frame. The still-forming bar is always dropped.

## 5. Visual system
| Token | Value | Use |
|---|---|---|
| canvas | `#070B12` | background (never pure black) |
| panel / hairline | `#0D131F` / `#1E293B` | cards, 1px borders |
| grid | `#162032` | drifting coordinate grid (never a flat void) |
| bull | `#10B981` | up candles, limit fills, TP |
| bear | `#F43F5E` | down candles, stop hunts, liquidations, invalidations |
| telemetry | `#22D3EE` | price line, crosshair, focus |
| warning | `#F59E0B` | funding stress, warning zones, honesty labels |
| text / muted | `#F8FAFC` / `#94A3B8` | headings / axis labels (muted never carries a fact alone) |

- Type: Inter (headlines) + JetBrains Mono with `tabular-nums` for every price, time, % and PnL. Colours only
  from `src/theme/tokens.ts`.
- **Motion:** continuous evolution (candles printing, camera into the wick, crosshair, pulsing bands). No
  static chart longer than 1.5 s. Everything is a pure function of the frame: no CSS keyframes, no
  `Math.random`, no `Date.now`, no network.
- **Semantic 1:1 lock:** each spoken event ("liquidity sweep", "limit fill", "stop loss hit", "4,900 signals")
  triggers its visual within 100 ms, keyed with `cueFrame()` from `words.json` — never hand-typed frames.
- **Safe zones:** long-form — the last 15 s carry no critical text/data (end-screen zone). Shorts — keep the
  bottom 22% and right 15% clear (`SHORT_SAFE` in `TradeAutopsyShort.tsx`).
- Author on the design canvas (1920x1080 / 1080x1920) inside `<Stage>`; 4K is the same layout at scale 2.
- **Honesty labels:** any setup card, level or number that is not from a logged Lumin signal or a cited
  record carries an on-screen label (`ILLUSTRATIVE — NOT A LOGGED SIGNAL`, `ILLUSTRATIVE VALUES`).

## 6. Editorial, audio and compliance
- **Packaging first:** lock the title (< 60 characters, no colons), the thumbnail (2–3 bold words, never
  repeating the title) and the 0:00–0:15 click-contract in `brief.md` before any script. The opening's first
  sentence confirms the thumbnail's promise.
- **Facts:** every number, date and name on screen or in narration has a `claims.csv` row (source file or URL,
  exact figure, verified yes/no). Dataset figures come only from `analyze_dataset.py` outputs, cited by file and
  input sha256. Never state a figure from memory, never fabricate or round a performance number into a better
  one, never imply live results from a backtest or a counterfactual.
- **Units:** PnL % leads; R is shown beside it, never alone (R divides by each trade's own stop, which equalises
  nothing at a fixed notional and can flip a sign). Say whether a figure is gross or net of fees.
- **Voice: Reid** (`1PdyZcb9N22kC6entd5C`, `config/voice.json`), used **only** by this channel. TTS text: punctuation-driven pacing (`,` `—` `.`), no bracketed emotion tags,
  no `...`; numbers and acronyms spelled for speech (`four thousand nine hundred signals`, `five-minute candle`,
  `U-S-D-T`).
- **Narration flow (owner, 23 NOV 2026):** `scripts/vo_blocks.py episodes/<id>/script.md` packs the approved
  narration into as few blocks as possible, each **at most 10,000 characters** and ending on a paragraph break,
  and lints it. The session posts every block in the chat as a click-to-copy code block (plus `vo/vo_blocks.md`
  via SendUserFile). The owner generates each block in the ElevenLabs app with the same settings and sends the
  files back (`<id>_b01.mp3`, …). The session uploads the takes to Drive `episodes/<id>/blocks/`, then runs
  **Resemble Enhance** on each on a Modal GPU (GitHub workflow `modal`, task `enhance`; CPU fallback:
  `scripts/vo_enhance.py --backend local` in its own venv, `requirements-enhance.txt`, ~6x real time), joins them,
  keeps `vo_raw.wav` for an A/B listen, and goes on to `align_audio.py` and `audio_master.py`.
- **Mastering:** VO to **-14 LUFS, -1.5 dBTP**; ambient bed at -25 LUFS, sidechain-ducked under voice
  (`audio_master.py` re-measures and fails if the master misses target).
- **Disclosure:** never mention "AI voice" or ElevenLabs in public text; use YouTube Studio's altered-content
  setting only as the owner decides.
- **YouTube finance guardrails:** no profit guarantees, fixed income or unrealistic win rates — frame every
  video around probability, risk-to-reward, execution mechanics and invalidation. No synthetic human trader
  avatar. Every long-form video carries a distinct analytical thesis (no ticker-swap templates).
- **Footer + description line:** `Market and execution analysis for educational purposes only. Perpetual
  futures carry high risk of liquidation.` (`DisclaimerFooter` on every chart segment; one line in every
  description.)
- **Owner gates:** the owner approves the package+brief, the narration, the audio and the review cut. Never send
  a draft, test or placeholder; tests stay inside the session.

## 7. Commands
```bash
npm ci && npx tsc --noEmit
B=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell   # session only
npx remotion still src/index.ts LuminDemo out/f100.png --frame=100 --browser-executable=$B
python3 scripts/fetch_market_data.py klines --symbol BTCUSDT --interval 15m --start 2026-11-21 --end 2026-11-23 \
    --out data/market/sample_btcusdt_15m.json
python3 scripts/analyze_dataset.py data/raw/<file>.csv --out data/stats/<name> [--outcome pct|r]
python3 scripts/align_audio.py --audio vo.wav --text vo.txt --out episodes/<id>/words.json
python3 scripts/audio_master.py --vo vo.wav [--bed bed.wav] --out master.wav
python3 scripts/vo_blocks.py episodes/<id>/script.md
scripts/gdrive.sh up --sub episodes/<id>/blocks <id>_b01.mp3 <id>_b02.mp3 ...   # then run workflow modal, task enhance
scripts/gdrive.sh up --sub episodes/<id>/audio episodes/<id>/audio/master.wav
# render on GitHub (Actions tab -> render -> Run workflow), or later on Modal:
pip install -r requirements.txt && modal run modal_render.py --composition LuminDemo --workers 2
modal run modal_render.py --composition FuturesLabLong --scale 0.5 --workers 30 --audio master.wav
```
In a cloud session, Remotion's own browser download is blocked: pass `--browser-executable` (above). On
Modal the image runs `npx remotion browser ensure` at build time.

## 8. The Gemini handoff: Drive bus, Gmail bell (owner, 26 NOV 2026)
- The owner's Gemini workspace agent (memory, custom audit skills, Drive, YouTube, live web; it listens to audio and
  watches video) does the **first pass** at seven gates so the session spends its usage on building: `research`,
  `narration-review`, `fact-check`, `audio-audit` (enhanced blocks, before audio lock), `cut-audit` (every review
  cut), `fresh-facts`, `analytics-audit`. *Why:* owner, 26 NOV 2026: better films, simpler, less usage; Gemini hears
  and watches directly and keeps the channel's memory, which a stateless API call lacks. No raw Gemini API calls for
  audits.
- **The loop:** `scripts/gemini_handoff.sh new <id> <task>` writes `episodes/<id>/handoff/to_gemini.md` from
  `prompts/gemini_handoff.md` → fill every `<fill: …>` line with Drive view links → `push <id> <task> [--attach FILE …]`
  lints it (no placeholders, secrets, email addresses or names from outside this channel), uploads it to
  `Lumin-Studio/episodes/<id>/handoff/to_gemini.md` and prints the wake-up email → the session sends it with the
  **Gmail connector** (`send_message`, plain text, subject `[GEMINI-HANDOFF] lumin-studio <id> <task>`, to the owner's
  own address: never written in this public repo) → carry on, never wait or poll → at the next step
  `pull <id>` saves the reply to `episodes/<id>/review/gemini_<task>.md` (exit 4 = none yet: search Gmail for
  `[GEMINI-RESULT]`, Gemini's fallback; if neither, say so in one line and continue).
- **Gemini's answer is a list of leads:** every point is checked against code, `words.json` and a rendered still in
  `review/gemini_<task>_check.md` (CONFIRMED / PARTLY / NOT CONFIRMED) before any fix; every fact still gets its
  source opened by us, and dataset figures come only from `analyze_dataset.py`.
- **Hard stops:** no 4K master before the Gemini cut audit is checked and the owner approves the cut; Gemini never
  writes to the repo or decides a gate. The owner's one-time Gemini setup lives in the owner's Gemini, not in git.
- *Tested 2026-11-26:* the Gmail monitor fired the minute the email arrived and the answer was right (it quoted the
  check word from the attached file). Two lessons: an unattended run stops at Gemini's "create files in Drive?"
  prompt unless Drive is set to always allowed in Gemini's app permissions (the owner set it); and a 5-hour usage
  limit can pause a run until it resets, so a reply can take hours. A Google Doc reply renders the front matter as
  a bullet list; `pull` reads either form.
