import {scaleLinear} from 'd3-scale';
import React from 'react';
import {interpolate, useCurrentFrame, Easing} from 'remotion';
import {Candle, fmtPrice, fmtTime} from '../lib/market';
import {alpha, colors, fonts, monoNumeric} from '../theme/tokens';

export type CameraKey = {frame: number; zoom: number; focusIndex: number; focusPrice: number};

export type CandleReplayProps = {
	candles: Candle[];
	width: number;
	height: number;
	/** frame at which the first candle prints */
	startFrame?: number;
	/** candles printed per frame (fractional ok); the newest candle grows in as it prints */
	candlesPerFrame?: number;
	/** camera keyframes: zoom about (focusIndex, focusPrice). Interpolated, eased, clamped. */
	camera?: CameraKey[];
	/** render-prop for overlays drawn in chart space: receives the live x/y mappers */
	overlay?: (m: {x: (i: number) => number; y: (p: number) => number; slot: number; visible: number}) => React.ReactNode;
	showAxis?: boolean;
};

const AXIS_W = 132;
const AXIS_H = 40;

/**
 * Frame-synced left-to-right OHLCV printer with an eased camera (zoom/pan) and a live price line.
 * Y-domain tracks the printed candles so the chart breathes as it grows — never a static hold.
 */
export const CandleReplay: React.FC<CandleReplayProps> = ({
	candles,
	width,
	height,
	startFrame = 0,
	candlesPerFrame = 1,
	camera,
	overlay,
	showAxis = true,
}) => {
	const frame = useCurrentFrame();
	const n = candles.length;
	const printed = Math.max(0, Math.min(n, (frame - startFrame) * candlesPerFrame));
	const whole = Math.floor(printed);
	const partial = printed - whole; // growth of the candle currently printing
	const visible = Math.min(n, whole + (partial > 0 ? 1 : 0));

	const plotW = width - (showAxis ? AXIS_W : 0);
	const plotH = height - (showAxis ? AXIS_H : 0);

	// Y-domain over everything printed so far (at least 12 bars, so the first frames are not absurdly zoomed).
	const span = candles.slice(0, Math.max(12, visible));
	let lo = Math.min(...span.map((c) => c.low));
	let hi = Math.max(...span.map((c) => c.high));
	// Asymmetric headroom: pins and labels hang below a swept low, so the floor gets more room than the ceiling.
	const pad = hi - lo;
	lo -= pad * 0.16;
	hi += pad * 0.08;

	const slot = plotW / n;
	const baseX = (i: number) => (i + 0.5) * slot;
	const baseY = scaleLinear().domain([lo, hi]).range([plotH, 0]);

	// Camera: zoom about a focal candle/price, eased between keys.
	let zoom = 1;
	let fx = plotW / 2;
	let fy = plotH / 2;
	if (camera && camera.length > 0) {
		const frames = camera.map((k) => k.frame);
		const opt = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)} as const;
		zoom = camera.length === 1 ? camera[0].zoom : interpolate(frame, frames, camera.map((k) => k.zoom), opt);
		fx = camera.length === 1 ? baseX(camera[0].focusIndex) : interpolate(frame, frames, camera.map((k) => baseX(k.focusIndex)), opt);
		fy = camera.length === 1 ? baseY(camera[0].focusPrice) : interpolate(frame, frames, camera.map((k) => baseY(k.focusPrice)), opt);
	}
	// Zoom about the focal point; as zoom grows the focal point is pulled toward the plot centre (t: 0 -> 1).
	const t = (zoom - 1) / zoom;
	const X = (i: number) => (baseX(i) - fx) * zoom + fx + (plotW / 2 - fx) * t;
	const Y = (p: number) => (baseY(p) - fy) * zoom + fy + (plotH / 2 - fy) * t;

	const bodyW = Math.max(1.5, slot * 0.62 * zoom);
	const last = visible > 0 ? candles[visible - 1] : candles[0];
	const liveClose = visible > 0 && partial > 0 && whole < n ? last.open + (last.close - last.open) * partial : last.close;

	const ticks = baseY.ticks(6);

	return (
		<div style={{position: 'relative', width, height}}>
			<svg width={plotW} height={plotH} style={{position: 'absolute', left: 0, top: 0, overflow: 'hidden'}}>
				{ticks.map((p) => (
					<line key={p} x1={0} x2={plotW} y1={Y(p)} y2={Y(p)} stroke={colors.hairline} strokeWidth={1} />
				))}
				{candles.slice(0, visible).map((c, i) => {
					const grow = i === whole ? partial : 1;
					const close = c.open + (c.close - c.open) * grow;
					const high = c.open + (Math.max(c.high, c.open) - c.open) * grow;
					const low = c.open - (c.open - Math.min(c.low, c.open)) * grow;
					const up = close >= c.open;
					const col = up ? colors.bull : colors.bear;
					const cxp = X(i);
					const top = Y(Math.max(c.open, close));
					const bot = Y(Math.min(c.open, close));
					return (
						<g key={c.timestamp} opacity={i === whole ? 0.5 + 0.5 * grow : 1}>
							<line x1={cxp} x2={cxp} y1={Y(high)} y2={Y(low)} stroke={col} strokeWidth={Math.max(1, zoom * 1.2)} />
							<rect x={cxp - bodyW / 2} y={top} width={bodyW} height={Math.max(1, bot - top)} fill={col} />
						</g>
					);
				})}
				{visible > 0 && (
					<>
						<line x1={0} x2={plotW} y1={Y(liveClose)} y2={Y(liveClose)} stroke={colors.telemetry} strokeWidth={1.5} strokeDasharray="6 6" />
						<line x1={X(visible - 1)} x2={X(visible - 1)} y1={0} y2={plotH} stroke={alpha(colors.telemetry, 0.35)} strokeWidth={1} />
					</>
				)}
				{overlay && overlay({x: X, y: Y, slot: slot * zoom, visible})}
			</svg>
			{showAxis && (
				<>
					{ticks.map((p) => (
						<div
							key={p}
							style={{
								position: 'absolute', left: plotW + 14, top: Y(p) - 13, color: colors.muted,
								fontSize: 20, ...monoNumeric,
								opacity: Y(p) > 8 && Y(p) < plotH - 8 && (visible === 0 || Math.abs(Y(p) - Y(liveClose)) > 30) ? 1 : 0,
							}}
						>
							{fmtPrice(p)}
						</div>
					))}
					{visible > 0 && (
						<div
							style={{
								position: 'absolute', left: plotW + 4, top: Math.min(plotH - 34, Math.max(0, Y(liveClose) - 17)),
								background: colors.telemetry, color: colors.canvas, padding: '4px 10px', borderRadius: 4,
								fontSize: 22, fontWeight: 700, ...monoNumeric,
							}}
						>
							{fmtPrice(liveClose)}
						</div>
					)}
					{visible > 0 && (
						<div style={{position: 'absolute', left: Math.max(0, Math.min(plotW - 150, X(visible - 1) - 75)), top: plotH + 8, color: colors.muted, fontSize: 20, fontFamily: fonts.mono}}>
							{fmtTime(last.timestamp)}
						</div>
					)}
				</>
			)}
		</div>
	);
};
