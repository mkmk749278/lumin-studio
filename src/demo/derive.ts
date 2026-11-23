import sample from '../../data/market/sample_btcusdt_15m.json';
import {Candle, extremes, MarketFile} from '../lib/market';
import type {Setup} from '../components/LuminAlertCard';

/**
 * Everything the demo shows is computed from the real cached Binance USD-M file — no typed numbers.
 * The only non-record element is the setup card, which is labelled ILLUSTRATIVE SETUP on screen.
 */
export const market = sample as MarketFile;
export const all: Candle[] = market.candles;
export const window24h: Candle[] = all.slice(-96);
export const ex = extremes(window24h);
export const ex48 = extremes(all);
export const range48Pct = ((ex48.high - ex48.low) / ex48.low) * 100;

/** Cumulative close-to-close return (%) over the 48h file, one point per hour. */
export const cumulative: number[] = all.filter((_, i) => i % 4 === 0 || i === all.length - 1).map((c) => ((c.close - all[0].close) / all[0].close) * 100);

const r = (p: number) => Math.round(p * 10) / 10;
const swept = ex.low;
const zoneTop = swept + (ex.high - ex.low) * 0.06;
/** Illustrative pre-planned limit long: entry at the top of the swept zone, SL under the wick, TP at 2R. */
export const illustrativeSetup: Setup = (() => {
	const entry = r(zoneTop);
	const sl = r(swept - (zoneTop - swept) * 0.6);
	return {pair: 'BTCUSDT', side: 'LONG', entry, stopLoss: sl, takeProfit: r(entry + 2 * (entry - sl)), orderType: 'LIMIT', timeframe: '15m'};
})();
export const sweepZone = {low: swept, high: zoneTop};
