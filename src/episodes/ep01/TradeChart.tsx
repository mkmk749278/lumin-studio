import {scaleLinear} from 'd3-scale';
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {fmtPrice, fmtTime} from '../../lib/market';
import {alpha, colors, fonts, monoNumeric} from '../../theme/tokens';
import {clamp, ease} from './kit';
import {RUN_LOW, T, TARGET_PASS_INDEX} from './data';

/**
 * The one real trade (BTCUSDT 5m, 01 JUL 2026), drawn from data/market/ep01_sample_trade.json.
 * `reveal` maps absolute frames to how many candles are printed; every overlay arrives on its own cue.
 */
export const TradeChart: React.FC<{
	width: number;
	height: number;
	reveal: {frames: number[]; candles: number[]};
	cues: {run: number; levels: number; sweep: number; zoomIn: number; zoomOut: number; target: number};
	showEma?: boolean;
}> = ({width, height, reveal, cues, showEma = true}) => {
	const f = useCurrentFrame();
	const cs = T.candles;
	const shown = interpolate(f, reveal.frames, reveal.candles, clamp);
	const n = Math.floor(shown);
	const plotW = width - 280; // room for the full TP / ENTRY / SL price labels
	const lo = Math.min(...cs.map((c) => c.low)) - 60;
	const hi = Math.max(...cs.map((c) => c.high)) + 60;
	const y = scaleLinear().domain([lo, hi]).range([height - 40, 20]);
	const slot = plotW / cs.length;
	const x = (i: number) => (i + 0.5) * slot;
	const tr = T.trade;

	// camera: push into the stop-hit candle, then back out
	const z = interpolate(f, [cues.zoomIn, cues.zoomIn + 20, cues.zoomOut, cues.zoomOut + 20], [1, 2.2, 2.2, 1], {...clamp, easing: ease});
	const fx = x(tr.stop_index);
	const fy = y(tr.stop);
	const cam = `translate(${fx}px, ${fy}px) scale(${z}) translate(${-fx}px, ${-fy}px)`;

	const emaPath = (arr: number[]) => arr.slice(0, Math.max(1, n)).map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
	const lv = interpolate(f, [cues.levels, cues.levels + 14], [0, 1], clamp);
	const run = interpolate(f, [cues.run, cues.run + 16], [0, 1], {...clamp, easing: ease});
	const sw = interpolate(f, [cues.sweep, cues.sweep + 12], [0, 1], clamp);
	const tg = interpolate(f, [cues.target, cues.target + 12], [0, 1], clamp);
	const level = (price: number, col: string, label: string, dash?: string) => (
		<g opacity={lv}>
			<line x1={x(tr.entry_index) - slot / 2} x2={plotW * lv + (1 - lv) * x(tr.entry_index)} y1={y(price)} y2={y(price)} stroke={col} strokeWidth={2.5} strokeDasharray={dash} />
			<text x={plotW + 12} y={y(price) + 9} fill={col} fontSize={24} fontWeight={700} style={{fontFamily: fonts.mono}}>{label}</text>
		</g>
	);

	return (
		<div style={{position: 'relative', width, height, overflow: 'hidden'}}>
			<svg width={width} height={height}>
				<g style={{transform: cam}}>
					{y.ticks(6).map((p) => (
						<line key={p} x1={0} x2={plotW} y1={y(p)} y2={y(p)} stroke={colors.hairline} strokeWidth={1} />
					))}
					{cs.slice(0, n + 1).map((c, i) => {
						const g = i === n ? shown - n : 1;
						if (g <= 0) return null;
						const close = c.open + (c.close - c.open) * g;
						const col = close >= c.open ? colors.bull : colors.bear;
						const top = y(Math.max(c.open, close));
						const bot = y(Math.min(c.open, close));
						return (
							<g key={c.timestamp}>
								<line x1={x(i)} x2={x(i)} y1={y(c.open + (c.high - c.open) * g)} y2={y(c.open - (c.open - c.low) * g)} stroke={col} strokeWidth={1.6} />
								<rect x={x(i) - slot * 0.32} y={top} width={slot * 0.64} height={Math.max(1.5, bot - top)} fill={col} />
							</g>
						);
					})}
					{showEma && (
						<>
							<path d={emaPath(T.ema9)} fill="none" stroke={colors.telemetry} strokeWidth={2.5} />
							<path d={emaPath(T.ema21)} fill="none" stroke={colors.warning} strokeWidth={2.5} />
						</>
					)}
					{/* "already ran": bracket from the six-candle low to the signal close */}
					{run > 0 && (
						<g opacity={run}>
							<line x1={x(tr.signal_index) + slot} x2={x(tr.signal_index) + slot} y1={y(RUN_LOW)} y2={y(RUN_LOW + (tr.signal_close - RUN_LOW) * run)} stroke={colors.warning} strokeWidth={4} />
							<line x1={x(tr.signal_index - 5)} x2={x(tr.signal_index) + slot * 1.4} y1={y(RUN_LOW)} y2={y(RUN_LOW)} stroke={colors.warning} strokeWidth={2} strokeDasharray="6 6" />
							<text x={x(tr.signal_index) + slot * 1.8} y={y((RUN_LOW + tr.signal_close) / 2) + 10} fill={colors.warning} fontSize={30} fontWeight={700} style={{fontFamily: fonts.mono}}>
								{`+$${Math.round(tr.signal_close - RUN_LOW)} IN 30 MIN`}
							</text>
						</g>
					)}
					{level(tr.target, colors.bull, `TP ${fmtPrice(tr.target)}`, '10 6')}
					{level(tr.entry, colors.telemetry, `ENTRY ${fmtPrice(tr.entry)}`)}
					{level(tr.stop, colors.bear, `SL ${fmtPrice(tr.stop)}`, '10 6')}
					{sw > 0 && (
						<g opacity={sw}>
							<rect x={x(tr.stop_index) - slot * 1.1} y={y(tr.stop) - 6} width={slot * 2.2} height={y(tr.stop_wick_low) - y(tr.stop) + 12} fill="none" stroke={colors.bear} strokeWidth={3} rx={4} />
							<text x={x(tr.stop_index) + slot * 1.5} y={y(tr.stop_wick_low) + 6} fill={colors.bear} fontSize={14} fontWeight={700} style={{fontFamily: fonts.mono}}>
								STOP SWEPT · WICK {fmtPrice(tr.stop_wick_low)}
							</text>
						</g>
					)}
					{tg > 0 && TARGET_PASS_INDEX > 0 && (
						<g opacity={tg}>
							<circle cx={x(TARGET_PASS_INDEX)} cy={y(tr.target)} r={14} fill="none" stroke={colors.bull} strokeWidth={3} />
							<text x={x(TARGET_PASS_INDEX) - 20} y={y(tr.target) - 26} textAnchor="end" fill={colors.bull} fontSize={26} fontWeight={700} style={{fontFamily: fonts.mono}}>
								TARGET PASSED {fmtTime(cs[TARGET_PASS_INDEX].timestamp).replace(' UTC', '')} · TRADE ALREADY STOPPED OUT
							</text>
						</g>
					)}
				</g>
			</svg>
			{n > 0 && (
				<div style={{position: 'absolute', right: 0, bottom: 0, color: colors.muted, fontSize: 22, ...monoNumeric}}>
					{fmtTime(cs[Math.min(n, cs.length - 1)].timestamp)}
				</div>
			)}
			{showEma && (
				<div style={{position: 'absolute', left: 8, top: 8, display: 'flex', gap: 28, fontFamily: fonts.mono, fontSize: 24, fontWeight: 700}}>
					<span style={{color: colors.telemetry}}>EMA 9</span>
					<span style={{color: colors.warning}}>EMA 21</span>
					<span style={{color: alpha(colors.text, 0.8)}}>BTCUSDT PERP · 5M · 01 JUL 2026</span>
				</div>
			)}
		</div>
	);
};
