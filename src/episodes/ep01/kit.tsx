import {scaleLinear} from 'd3-scale';
import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {alpha, colors, fonts, monoNumeric, springs} from '../../theme/tokens';

/** Small building blocks for ep01. All timings are ABSOLUTE frames (the film is one timeline, no Sequences). */

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.out(Easing.cubic);

/** 0 -> 1 from frame `a` over `d` frames. */
export const useIn = (a: number, d = 14): number => {
	const f = useCurrentFrame();
	return interpolate(f, [a, a + d], [0, 1], {...clamp, easing: ease});
};

export const useSpring = (a: number): number => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	return spring({frame: f - a, fps, config: springs.settle});
};

/**
 * A section of the film: mounted only inside [from, to) plus fades, fades in/out, and pushes in slowly the whole
 * time it is on screen (continuous motion: nothing holds still while it is showing).
 */
export const Section: React.FC<{from: number; to: number; children: React.ReactNode; push?: number}> = ({from, to, children, push = 0.035}) => {
	const f = useCurrentFrame();
	if (f < from - 1 || f > to + 12) return null;
	const o = interpolate(f, [from, from + 10, to, to + 12], [0, 1, 1, 0], clamp);
	const s = interpolate(f, [from, to], [1, 1 + push], clamp);
	return <div style={{position: 'absolute', inset: 0, opacity: o, transform: `scale(${s})`, transformOrigin: '50% 45%'}}>{children}</div>;
};

export const Kicker: React.FC<{text: string; at: number; x?: number; y?: number; color?: string}> = ({text, at, x = 96, y = 82, color = colors.telemetry}) => {
	const p = useIn(at, 12);
	return (
		<div style={{position: 'absolute', left: x, top: y, opacity: p, transform: `translateX(${(1 - p) * -20}px)`, display: 'flex', alignItems: 'center', gap: 16}}>
			<div style={{width: 6, height: 40, background: color}} />
			<div style={{color, fontFamily: fonts.mono, fontWeight: 700, fontSize: 28, letterSpacing: 5}}>{text}</div>
		</div>
	);
};

/** Source / honesty line along the bottom-left, above the disclaimer. */
export const SourceLine: React.FC<{text: string; at: number; color?: string}> = ({text, at, color = colors.muted}) => {
	const p = useIn(at, 12);
	return (
		<div style={{position: 'absolute', left: 96, bottom: 78, color, opacity: 0.9 * p, fontFamily: fonts.mono, fontSize: 22, letterSpacing: 1}}>{text}</div>
	);
};

export const Card: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
	<div style={{background: colors.panel, border: `1px solid ${colors.hairline}`, borderRadius: 18, boxShadow: `0 24px 60px ${alpha('#000000', 0.45)}`, ...style}}>{children}</div>
);

/** A number that rolls to its value; signed, fixed decimals, tabular. */
export const Roll: React.FC<{value: number; at: number; d?: number; dp?: number; suffix?: string; prefix?: string; signed?: boolean; size?: number; color?: string; weight?: number}> = ({
	value, at, d = 24, dp = 0, suffix = '', prefix = '', signed = false, size = 64, color = colors.text, weight = 700,
}) => {
	const f = useCurrentFrame();
	const v = interpolate(f, [at, at + d], [0, value], {...clamp, easing: ease});
	const s = v.toLocaleString('en-US', {minimumFractionDigits: dp, maximumFractionDigits: dp});
	const sign = signed && value > 0 ? '+' : '';
	return <span style={{color, fontSize: size, fontWeight: weight, ...monoNumeric}}>{prefix}{v < 0 ? '−' + s.replace('-', '') : sign + s}{suffix}</span>;
};

export const pct = (x: number, dp = 3): string => {
	const r = Number(x.toFixed(dp)); // a value that rounds to zero is shown as zero, never as "−0.000%"
	return `${r < 0 ? '−' : r > 0 ? '+' : ''}${Math.abs(r).toFixed(dp)}%`;
};

/**
 * Horizontal-axis bar chart around zero with optional confidence whiskers. Bars grow on their own cue frames.
 * `domain` is fixed by the caller so tiny values stay honest in scale (never auto-zoomed to look big).
 */
export const ZeroBars: React.FC<{
	bars: {label: string; value: number; at: number; ci?: [number, number]; color?: string}[];
	domain: [number, number];
	width: number;
	height: number;
	ciAt?: number;
	dp?: number;
	tick?: number;
}> = ({bars, domain, width, height, ciAt, dp = 3, tick}) => {
	const f = useCurrentFrame();
	const y = scaleLinear().domain(domain).range([height - 70, 20]);
	const bw = width / bars.length;
	const ciP = ciAt === undefined ? 0 : interpolate(f, [ciAt, ciAt + 16], [0, 1], clamp);
	const ticks = tick ? Array.from({length: Math.round((domain[1] - domain[0]) / tick) + 1}, (_, i) => domain[0] + i * tick) : [];
	return (
		<svg width={width} height={height} style={{overflow: 'visible'}}>
			{ticks.map((t) => (
				<g key={t}>
					<line x1={0} x2={width} y1={y(t)} y2={y(t)} stroke={colors.hairline} strokeWidth={1.5} />
					<text x={-14} y={y(t) + 8} fill={colors.muted} fontSize={22} textAnchor="end" style={{fontFamily: fonts.mono}}>{pct(t, dp === 3 ? 2 : dp)}</text>
				</g>
			))}
			<line x1={0} x2={width} y1={y(0)} y2={y(0)} stroke={colors.text} strokeOpacity={0.6} strokeWidth={2} />
			{bars.map((b, i) => {
				const p = interpolate(f, [b.at, b.at + 16], [0, 1], {...clamp, easing: ease});
				const v = b.value * p;
				const col = b.color ?? (b.value >= 0 ? colors.bull : colors.bear);
				const x0 = i * bw + bw * 0.2;
				const top = Math.min(y(0), y(v));
				const h = Math.max(2, Math.abs(y(v) - y(0)));
				return (
					<g key={b.label} opacity={interpolate(f, [b.at - 6, b.at], [0.25, 1], clamp)}>
						<rect x={x0} y={top} width={bw * 0.6} height={h} fill={col} rx={4} />
						{b.ci && ciP > 0 && (
							<g opacity={ciP} stroke={colors.warning} strokeWidth={3}>
								<line x1={x0 + bw * 0.3} x2={x0 + bw * 0.3} y1={y(b.ci[0])} y2={y(b.ci[1])} />
								<line x1={x0 + bw * 0.18} x2={x0 + bw * 0.42} y1={y(b.ci[0])} y2={y(b.ci[0])} />
								<line x1={x0 + bw * 0.18} x2={x0 + bw * 0.42} y1={y(b.ci[1])} y2={y(b.ci[1])} />
							</g>
						)}
						<text x={x0 + bw * 0.3} y={height - 30} fill={colors.text} fontSize={26} fontWeight={700} textAnchor="middle" style={{fontFamily: fonts.sans, letterSpacing: 2}}>{b.label}</text>
						<text x={x0 + bw * 0.3} y={(b.value >= 0 ? top : top + h) + (b.value >= 0 ? -14 : 34)} fill={col} fontSize={28} fontWeight={700} textAnchor="middle" opacity={p} style={{fontFamily: fonts.mono}}>{pct(v, dp)}</text>
					</g>
				);
			})}
		</svg>
	);
};

/** A coin that flips about its vertical axis and lands on `side` at frame `land`. */
export const Coin: React.FC<{start: number; land: number; size?: number; side: 'LONG' | 'SHORT'}> = ({start, land, size = 220, side}) => {
	const f = useCurrentFrame();
	const t = interpolate(f, [start, land], [0, 1], {...clamp, easing: Easing.out(Easing.quad)});
	const angle = t * Math.PI * 9; // 4.5 turns, lands face-on
	const sx = Math.cos(angle);
	const face = sx >= 0 ? side : side === 'LONG' ? 'SHORT' : 'LONG';
	const col = face === 'LONG' ? colors.bull : colors.bear;
	const bob = Math.sin(t * Math.PI) * -60;
	return (
		<div style={{width: size, height: size, transform: `translateY(${bob}px) scaleX(${Math.max(0.04, Math.abs(sx))})`}}>
			<svg width={size} height={size} viewBox="0 0 100 100">
				<circle cx={50} cy={50} r={46} fill={colors.panel} stroke={col} strokeWidth={4} />
				<circle cx={50} cy={50} r={38} fill="none" stroke={alpha(col, 0.4)} strokeWidth={2} />
				<text x={50} y={58} textAnchor="middle" fill={col} fontSize={20} fontWeight={700} style={{fontFamily: fonts.mono, letterSpacing: 1}}>{face}</text>
			</svg>
		</div>
	);
};
