/**
 * Lumin Studio design tokens — the single source of colour, type and motion (CLAUDE.md §5).
 * Quant-desk forensics: obsidian canvas, hairline panels, colour = meaning. Never hardcode a hex elsewhere.
 */
export const colors = {
	canvas: '#070B12', // deep obsidian terminal background (never pure black)
	panel: '#0D131F', // elevated cards & panels
	hairline: '#1E293B', // 1px panel borders
	grid: '#162032', // drifting coordinate grid
	bull: '#10B981', // bullish candles, limit fills, take-profit
	bear: '#F43F5E', // bearish candles, stop hunts, liquidations, invalidations
	telemetry: '#22D3EE', // active price line, crosshair, focus
	warning: '#F59E0B', // funding stress, warning zones
	text: '#F8FAFC',
	muted: '#94A3B8', // axis labels only — never carries a fact on its own
} as const;

export const alpha = (hex: string, a: number): string => {
	const n = parseInt(hex.slice(1), 16);
	return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

export const fonts = {
	sans: "'Inter', Arial, sans-serif",
	mono: "'JetBrains Mono', 'Courier New', monospace",
} as const;

/** Prices, timestamps, % and PnL: tabular figures so animated digits never jitter. */
export const monoNumeric = {
	fontFamily: fonts.mono,
	fontVariantNumeric: 'tabular-nums',
	fontFeatureSettings: '"tnum" 1, "zero" 1',
} as const;

/** Spring presets (remotion `spring` config). Clinical: fast settle, no bounce. */
export const springs = {
	settle: {damping: 200, stiffness: 120, mass: 1},
	snap: {damping: 30, stiffness: 220, mass: 0.6},
	glide: {damping: 200, stiffness: 40, mass: 1.2},
} as const;

export const FPS = 30;

/** Design canvases. Compositions author at these sizes; `Stage` scales to the output resolution. */
export const canvas = {
	long: {width: 1920, height: 1080},
	short: {width: 1080, height: 1920},
} as const;

/** Platform safe zones, as fractions of the canvas (CLAUDE.md §5). */
export const safe = {
	short: {bottom: 0.22, right: 0.15, top: 0.08, left: 0.05},
	long: {endScreenSeconds: 15, margin: 0.05},
} as const;

/** Motion rule: no static chart may hold longer than this many frames. */
export const MAX_STATIC_HOLD_FRAMES = Math.round(1.5 * FPS);
