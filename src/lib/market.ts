/** Cached market data shapes — written by scripts/fetch_market_data.py, read offline at render time. */
export type Candle = {timestamp: number; open: number; high: number; low: number; close: number; volume: number};

export type MarketFile = {
	meta: {
		symbol: string;
		interval: string;
		market: string;
		start: string;
		end: string;
		count: number;
		sources: Record<string, number>;
	};
	candles: Candle[];
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** `05 JAN 2026` — day-first, unambiguous for a global audience. UTC, always. */
export const fmtDate = (ms: number): string => {
	const d = new Date(ms);
	return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export const fmtTime = (ms: number): string => {
	const d = new Date(ms);
	return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`;
};

/** Price with a tick-appropriate number of decimals (a book spans 60,000 and 0.02). */
export const fmtPrice = (p: number): string => {
	const dp = p >= 1000 ? 1 : p >= 1 ? 3 : p >= 0.01 ? 5 : 7;
	return p.toLocaleString('en-US', {minimumFractionDigits: dp, maximumFractionDigits: dp});
};

export const fmtPct = (x: number, dp = 2): string => `${x >= 0 ? '+' : ''}${x.toFixed(dp)}%`;

export const extremes = (cs: Candle[]) => {
	let lo = 0;
	let hi = 0;
	cs.forEach((c, i) => {
		if (c.low < cs[lo].low) lo = i;
		if (c.high > cs[hi].high) hi = i;
	});
	return {lowIndex: lo, highIndex: hi, low: cs[lo].low, high: cs[hi].high};
};
