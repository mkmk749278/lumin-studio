import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {alpha, colors, fonts, monoNumeric, springs} from '../theme/tokens';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** A metric that rolls to its value (numbers never jump) — e.g. "4,900 SIGNALS", "-1.62%". */
export const MetricCounter: React.FC<{
	value: number;
	label: string;
	startFrame?: number;
	durationFrames?: number;
	decimals?: number;
	prefix?: string;
	suffix?: string;
	color?: string;
	size?: number;
	signed?: boolean;
}> = ({value, label, startFrame = 0, durationFrames = 30, decimals = 0, prefix = '', suffix = '', color = colors.text, size = 96, signed = false}) => {
	const frame = useCurrentFrame();
	const v = interpolate(frame, [startFrame, startFrame + durationFrames], [0, value], {...clamp, easing: Easing.out(Easing.cubic)});
	const a = interpolate(frame, [startFrame - 6, startFrame + 6], [0, 1], clamp);
	const sign = signed && v > 0 ? '+' : '';
	const txt = v.toLocaleString('en-US', {minimumFractionDigits: decimals, maximumFractionDigits: decimals});
	return (
		<div style={{opacity: a}}>
			<div style={{color, fontSize: size, fontWeight: 700, lineHeight: 1, ...monoNumeric}}>
				{prefix}
				{sign}
				{txt}
				{suffix}
			</div>
			<div style={{color: colors.muted, fontSize: size * 0.24, letterSpacing: 4, fontWeight: 600, marginTop: 12, fontFamily: fonts.sans}}>{label}</div>
		</div>
	);
};

/** Data pin: a dot on a chart point with a leader line and a label — the spoken thing, pointed at. */
export const DataPin: React.FC<{x: number; y: number; text: string; color?: string; enterFrame?: number; dx?: number; dy?: number}> = ({
	x, y, text, color = colors.telemetry, enterFrame = 0, dx = 60, dy = -60,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = spring({frame: frame - enterFrame, fps, config: springs.snap});
	const pulse = 1 + 0.25 * Math.sin(((frame - enterFrame) / fps) * Math.PI * 2) * p;
	return (
		<g opacity={p}>
			<circle cx={x} cy={y} r={14 * pulse} fill="none" stroke={alpha(color, 0.5)} strokeWidth={2} />
			<circle cx={x} cy={y} r={6} fill={color} />
			<line x1={x} y1={y} x2={x + dx * p} y2={y + dy * p} stroke={color} strokeWidth={2} />
			<text x={x + dx + (dx >= 0 ? 10 : -10)} y={y + dy + 8} fill={color} fontSize={26} fontWeight={700} textAnchor={dx >= 0 ? 'start' : 'end'} style={{fontFamily: fonts.mono, fontVariantNumeric: 'tabular-nums'}}>
				{text}
			</text>
		</g>
	);
};

/** Lower-third: a structural title + kicker, wiping in from the left. */
export const LowerThird: React.FC<{title: string; kicker?: string; enterFrame?: number; accent?: string}> = ({title, kicker, enterFrame = 0, accent = colors.telemetry}) => {
	const frame = useCurrentFrame();
	const w = interpolate(frame, [enterFrame, enterFrame + 14], [0, 100], {...clamp, easing: Easing.out(Easing.cubic)});
	const t = interpolate(frame, [enterFrame + 6, enterFrame + 18], [0, 1], clamp);
	return (
		<div style={{display: 'flex', alignItems: 'stretch', gap: 18}}>
			<div style={{width: 6, background: accent, transform: `scaleY(${w / 100})`, transformOrigin: 'top'}} />
			<div style={{clipPath: `inset(0 ${100 - w}% 0 0)`}}>
				{kicker && <div style={{color: accent, fontSize: 22, letterSpacing: 5, fontWeight: 700, fontFamily: fonts.mono, opacity: t}}>{kicker}</div>}
				<div style={{color: colors.text, fontSize: 52, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: fonts.sans}}>{title}</div>
			</div>
		</div>
	);
};
