import words from '../../../episodes/ep01/words.json';
import stats from '../../../data/stats/ep01_scalping.json';
import sample from '../../../data/market/ep01_sample_trade.json';
import {cueFrame, Word} from '../../lib/cues';
import {Candle} from '../../lib/market';
import {FPS} from '../../theme/tokens';

/**
 * Everything ep01 shows comes from three files: Reid's aligned words (timing), the backtest output (every number)
 * and the exported BTCUSDT trade (the one real trade). Nothing on screen is typed by hand.
 */
export const W = (words as {words: Word[]}).words;

/** Absolute frame at which `phrase` is spoken (occurrence counts from 0). Throws if the script and audio differ. */
export const at = (phrase: string, occurrence = 0, lead = 3): number => cueFrame(W, phrase, FPS, occurrence, lead);

export const AUDIO_END = Math.ceil(W[W.length - 1].end * FPS);
export const TAIL = 8 * FPS;
export const DURATION = AUDIO_END + TAIL;

type Result = {
	n: number; win_rate_pct: number; avg_gross_pct: number; gross_ci95: [number, number]; avg_abs_move_pct: number;
	avg_net_007_pct: number; sum_net_007_pct: number; symbols_profitable_net_007: number; symbols: number;
	fee_share_of_avg_move_net_007_pct: number;
};
type Stats = {
	provenance: {symbols: string[]; months: [string, string]};
	results: Record<string, Result>;
	per_symbol_net_007: Record<string, Record<string, number>>;
	equity_5m_ema_net_007: [number, number][];
	monthly_net_007: Record<string, number>;
};
export const S = stats as unknown as Stats;
export const R = (key: string): Result => {
	const r = S.results[key];
	if (!r) throw new Error(`no result ${key}`);
	return r;
};

export const RULES = [
	{key: 'ema_cross', label: 'EMA 9/21', short: 'EMA'},
	{key: 'macd_trend', label: 'MACD', short: 'MACD'},
	{key: 'rsi_revert', label: 'RSI 30/70', short: 'RSI'},
	{key: 'random', label: 'COIN FLIP', short: 'COIN'},
] as const;

export const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];

type SampleFile = {
	candles: Candle[]; ema9: number[]; ema21: number[];
	trade: {
		signal_index: number; entry_index: number; stop_index: number; signal_close: number; entry: number; atr: number;
		stop: number; target: number; stop_wick_low: number; gross_pct: number; net_pct: number; run_before_signal_atr: number;
		high_after_stop_2h: number; target_passed_after_stop_utc: string;
	};
};
export const T = sample as unknown as SampleFile;
/** Index of the candle in which price first passed the old target after the stop. */
export const TARGET_PASS_INDEX = T.candles.findIndex(
	(c, i) => i > T.trade.stop_index && c.high >= T.trade.target,
);
/** Lowest low of the six candles up to the signal: where the "already ran" bracket starts. */
export const RUN_LOW = Math.min(...T.candles.slice(T.trade.signal_index - 5, T.trade.signal_index + 1).map((c) => c.low));
