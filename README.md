# Lumin Studio

Programmatic video for the **Lumin: Crypto Signals** channel: Remotion (React/SVG) compositions driven by cached
Binance USD-M data, rendered in parallel on Modal. Rules, layout and commands: **[CLAUDE.md](CLAUDE.md)**.

```bash
npm ci && npx tsc --noEmit
pip install -r requirements.txt
modal run modal_render.py --composition LuminDemo --workers 2     # 5 s smoke test at 1080p
```
