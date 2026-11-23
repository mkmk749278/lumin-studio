import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {alpha, colors, fonts, monoNumeric} from '../theme/tokens';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * Stop-hunt sweep zone + wick highlight, drawn INSIDE CandleReplay's overlay (chart space).
 * The zone is a price band [zoneLow, zoneHigh] that sweeps in from the left; the swept candle's wick is
 * bracketed and pulses. Colour: crimson for a sweep / liquidation, amber for a warning band.
 */
export const SweepZone: React.FC<{
	x: (i: number) => number;
	y: (p: number) => number;
	slot: number;
	zoneLow: number;
	zoneHigh: number;
	wickIndex: number;
	wickPrice: number;
	label: string;
	enterFrame?: number;
	width: number;
	tone?: 'sweep' | 'warning';
}> = ({x, y, slot, zoneLow, zoneHigh, wickIndex, wickPrice, label, enterFrame = 0, width, tone = 'sweep'}) => {
	const frame = useCurrentFrame();
	const col = tone === 'sweep' ? colors.bear : colors.warning;
	const w = interpolate(frame, [enterFrame, enterFrame + 18], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const br = interpolate(frame, [enterFrame + 10, enterFrame + 22], [0, 1], clamp);
	const pulse = 0.55 + 0.45 * Math.abs(Math.sin(((frame - enterFrame) / 30) * Math.PI));
	const top = y(zoneHigh);
	const bot = y(zoneLow);
	const wx = x(wickIndex);
	const wy = y(wickPrice);
	return (
		<g>
			<rect x={0} y={top} width={width * w} height={Math.max(2, bot - top)} fill={alpha(col, 0.12)} />
			<line x1={0} x2={width * w} y1={top} y2={top} stroke={alpha(col, 0.6)} strokeWidth={1.5} strokeDasharray="10 6" />
			<line x1={0} x2={width * w} y1={bot} y2={bot} stroke={alpha(col, 0.6)} strokeWidth={1.5} strokeDasharray="10 6" />
			<g opacity={br}>
				<rect x={wx - slot * 1.2} y={wy - 14} width={slot * 2.4} height={28} fill="none" stroke={col} strokeWidth={2.5} opacity={pulse} rx={4} />
				<text x={wx + slot * 1.6} y={wy + 9} fill={col} fontSize={24} fontWeight={700} style={{fontFamily: fonts.mono}}>{label}</text>
			</g>
		</g>
	);
};

/** Funding-rate / OI stress gauge: a horizontal bar from neutral (0) toward the stress threshold. */
export const StressGauge: React.FC<{value: number; threshold: number; label: string; format: (v: number) => string; enterFrame?: number; width?: number}> = ({
	value, threshold, label, format, enterFrame = 0, width = 520,
}) => {
	const frame = useCurrentFrame();
	const v = interpolate(frame, [enterFrame, enterFrame + 30], [0, value], {...clamp, easing: Easing.out(Easing.cubic)});
	const frac = Math.min(1, Math.abs(v) / (threshold * 1.5));
	const stressed = Math.abs(v) >= threshold;
	const col = stressed ? colors.warning : colors.telemetry;
	return (
		<div style={{width, background: colors.panel, border: `1px solid ${colors.hairline}`, borderRadius: 14, padding: 22, boxSizing: 'border-box'}}>
			<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
				<div style={{color: colors.muted, fontSize: 20, letterSpacing: 3, fontWeight: 600, fontFamily: fonts.sans}}>{label}</div>
				<div style={{color: col, fontSize: 32, fontWeight: 700, ...monoNumeric}}>{format(v)}</div>
			</div>
			<div style={{position: 'relative', height: 12, background: colors.hairline, borderRadius: 6, marginTop: 16}}>
				<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${frac * 100}%`, background: col, borderRadius: 6}} />
				<div style={{position: 'absolute', left: `${(1 / 1.5) * 100}%`, top: -6, bottom: -6, width: 2, background: colors.warning}} />
			</div>
		</div>
	);
};
