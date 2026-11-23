import React from 'react';
import {alpha, colors} from '../theme/tokens';

/**
 * Lumin Futures monogram: an instrument dial (tick ring, four cardinal marks) around an angular "LF" —
 * L in telemetry cyan, F in emerald, outlined with a soft glow. Drawn on a 400 x 400 box; scale with `size`.
 * Owner, 23 NOV 2026: "keep like this, more simple, with our theme" (reference: a dial with an LF monogram).
 */
const C = 200;

const ticks = (r1: number, r2: number, every: number, skip = 0) =>
	Array.from({length: 360 / every}, (_, i) => i * every)
		.filter((a) => skip === 0 || a % skip !== 0)
		.map((a) => {
			const t = ((a - 90) * Math.PI) / 180;
			return `M${C + r1 * Math.cos(t)},${C + r1 * Math.sin(t)}L${C + r2 * Math.cos(t)},${C + r2 * Math.sin(t)}`;
		})
		.join('');

// Angular letters with chamfered corners (the dial's "machined" look, no font dependency).
const L = 'M110,118 L148,118 L148,250 L204,250 L180,282 L110,282 Z';
const F = 'M218,118 L300,118 L276,150 L254,150 L254,186 L290,186 L268,214 L254,214 L254,282 L218,282 Z';

export const Monogram: React.FC<{size: number}> = ({size}) => (
	<svg width={size} height={size} viewBox="0 0 400 400">
		<defs>
			<linearGradient id="lf-ring" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" stopColor={colors.telemetry} />
				<stop offset="1" stopColor={colors.bull} />
			</linearGradient>
			<filter id="lf-soft" x="-30%" y="-30%" width="160%" height="160%">
				<feGaussianBlur stdDeviation="4" result="b" />
				<feMerge>
					<feMergeNode in="b" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>
		{/* dial face */}
		<circle cx={C} cy={C} r={186} fill={colors.panel} stroke={alpha(colors.telemetry, 0.25)} strokeWidth={2} />
		{/* tick ring (minor every 6°, none where a cardinal mark sits) */}
		<path d={ticks(166, 174, 6, 90)} stroke="url(#lf-ring)" strokeWidth={2} opacity={0.55} />
		{/* the two rings */}
		<circle cx={C} cy={C} r={178} fill="none" stroke="url(#lf-ring)" strokeWidth={3} opacity={0.85} />
		<circle cx={C} cy={C} r={158} fill="none" stroke="url(#lf-ring)" strokeWidth={4} filter="url(#lf-soft)" />
		{/* cardinal marks */}
		<path d={ticks(150, 192, 90)} stroke="url(#lf-ring)" strokeWidth={4} strokeLinecap="round" />
		{/* letters: translucent fill + bright outline */}
		<path d={L} fill={alpha(colors.telemetry, 0.16)} stroke={colors.telemetry} strokeWidth={6} strokeLinejoin="miter" filter="url(#lf-soft)" />
		<path d={F} fill={alpha(colors.bull, 0.16)} stroke={colors.bull} strokeWidth={6} strokeLinejoin="miter" filter="url(#lf-soft)" />
	</svg>
);
