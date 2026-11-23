import {scaleLinear} from 'd3-scale';
import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {alpha, colors, fonts, monoNumeric} from '../theme/tokens';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type Frame = {width: number; height: number; title?: string; startFrame?: number; durationFrames?: number};

const Panel: React.FC<Frame & {children: React.ReactNode; subtitle?: string; headerRight?: React.ReactNode}> = ({width, height, title, subtitle, headerRight, children}) => (
	<div style={{width, height, background: colors.panel, border: `1px solid ${colors.hairline}`, borderRadius: 16, padding: 24, boxSizing: 'border-box', display: 'flex', flexDirection: 'column'}}>
		<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16}}>
			<div>
				{title && <div style={{color: colors.text, fontSize: 24, fontWeight: 700, letterSpacing: 2, fontFamily: fonts.sans}}>{title}</div>}
				{subtitle && <div style={{color: colors.muted, fontSize: 18, fontFamily: fonts.mono, marginTop: 4}}>{subtitle}</div>}
			</div>
			{headerRight}
		</div>
		<div style={{flex: 1, position: 'relative', marginTop: 12}}>{children}</div>
	</div>
);

/** Animated equity curve: the line draws left to right and the final value counts with it. */
export const EquityCurve: React.FC<Frame & {values: number[]; subtitle?: string; unit?: string}> = ({values, width, height, title, subtitle, unit = '%', startFrame = 0, durationFrames = 60}) => {
	const frame = useCurrentFrame();
	const prog = interpolate(frame, [startFrame, startFrame + durationFrames], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
	const w = width - 48 - 90;
	const h = height - 48 - 90;
	const lo = Math.min(0, ...values);
	const hi = Math.max(0, ...values);
	const x = scaleLinear().domain([0, values.length - 1]).range([0, w]);
	const y = scaleLinear().domain([lo, hi]).nice().range([h, 0]);
	const k = prog * (values.length - 1);
	const n = Math.floor(k);
	const pts = values.slice(0, n + 1).map((v, i) => [x(i), y(v)] as const);
	const tail = n < values.length - 1 ? values[n] + (values[n + 1] - values[n]) * (k - n) : values[n];
	if (n < values.length - 1) pts.push([x(k), y(tail)]);
	const d = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join('');
	const col = tail >= 0 ? colors.bull : colors.bear;
	const last = pts[pts.length - 1];
	return (
		<Panel
			width={width}
			height={height}
			title={title}
			subtitle={subtitle}
			headerRight={<div style={{color: col, fontSize: 36, fontWeight: 700, lineHeight: 1, ...monoNumeric}}>{`${tail >= 0 ? '+' : ''}${tail.toFixed(2)}${unit}`}</div>}
		>
			<svg width={w + 90} height={h} style={{overflow: 'visible'}}>
				{y.ticks(4).map((t) => (
					<g key={t}>
						<line x1={0} x2={w} y1={y(t)} y2={y(t)} stroke={t === 0 ? colors.muted : colors.hairline} strokeWidth={1} strokeDasharray={t === 0 ? '4 4' : undefined} />
						<text x={w + 10} y={y(t) + 6} fill={colors.muted} fontSize={18} style={{fontFamily: fonts.mono}}>{`${t > 0 ? '+' : ''}${t}${unit}`}</text>
					</g>
				))}
				<path d={`${d}L${last[0]},${y(0)}L0,${y(0)}Z`} fill={alpha(col, 0.12)} />
				<path d={d} fill="none" stroke={col} strokeWidth={3} />
				<circle cx={last[0]} cy={last[1]} r={6} fill={col} />
			</svg>
		</Panel>
	);
};

/** Histogram (e.g. R-multiple or win-rate distribution); bars rise in sequence. */
export const Histogram: React.FC<Frame & {bins: {label: string; value: number; color?: string}[]; subtitle?: string}> = ({bins, width, height, title, subtitle, startFrame = 0, durationFrames = 40}) => {
	const frame = useCurrentFrame();
	const w = width - 48;
	const h = height - 48 - 100;
	const max = Math.max(...bins.map((b) => b.value), 1);
	const bw = w / bins.length;
	return (
		<Panel width={width} height={height} title={title} subtitle={subtitle}>
			<svg width={w} height={h + 40}>
				{bins.map((b, i) => {
					const p = interpolate(frame, [startFrame + (i * durationFrames) / bins.length, startFrame + ((i + 1) * durationFrames) / bins.length + 8], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
					const bh = (b.value / max) * h * p;
					return (
						<g key={b.label}>
							<rect x={i * bw + bw * 0.12} y={h - bh} width={bw * 0.76} height={bh} fill={b.color ?? colors.telemetry} rx={3} />
							<text x={i * bw + bw / 2} y={h + 28} fill={colors.muted} fontSize={17} textAnchor="middle" style={{fontFamily: fonts.mono}}>{b.label}</text>
						</g>
					);
				})}
			</svg>
		</Panel>
	);
};

/** R:R scatter (x = designed reward:risk, y = realised R); points pop in over the duration. */
export const RRScatter: React.FC<Frame & {points: {x: number; y: number}[]; subtitle?: string}> = ({points, width, height, title, subtitle, startFrame = 0, durationFrames = 45}) => {
	const frame = useCurrentFrame();
	const w = width - 48 - 40;
	const h = height - 48 - 100;
	const x = scaleLinear().domain([0, Math.max(...points.map((p) => p.x), 1)]).nice().range([0, w]);
	const y = scaleLinear().domain([Math.min(-1, ...points.map((p) => p.y)), Math.max(1, ...points.map((p) => p.y))]).nice().range([h, 0]);
	return (
		<Panel width={width} height={height} title={title} subtitle={subtitle}>
			<svg width={w + 40} height={h + 30}>
				<line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke={colors.muted} strokeDasharray="4 4" />
				{points.map((p, i) => {
					const a = interpolate(frame, [startFrame + (i / points.length) * durationFrames, startFrame + (i / points.length) * durationFrames + 6], [0, 1], clamp);
					return <circle key={i} cx={x(p.x)} cy={y(p.y)} r={4 * a} fill={p.y >= 0 ? colors.bull : colors.bear} opacity={0.8 * a} />;
				})}
			</svg>
		</Panel>
	);
};
