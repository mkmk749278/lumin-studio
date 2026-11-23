import React from 'react';
import {alpha, colors} from '../theme/tokens';

/**
 * The Lumin Futures mark: an "L" drawn from the desk's own vocabulary — a rising emerald candle (the upright)
 * and a cyan live-price line (the base) ending in the price dot. Two shapes, two colours, legible at 48 px.
 * Drawn on a 100 x 100 box; scale with `size`.
 */
export const Mark: React.FC<{size: number; glow?: boolean}> = ({size, glow = true}) => (
	<svg width={size} height={size} viewBox="0 0 100 100" style={{overflow: 'visible'}}>
		<defs>
			<filter id="lf-glow" x="-50%" y="-50%" width="200%" height="200%">
				<feGaussianBlur stdDeviation="2.4" result="b" />
				<feMerge>
					<feMergeNode in="b" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		</defs>
		{/* wick */}
		<rect x={30.5} y={8} width={5} height={14} rx={2.5} fill={colors.bull} />
		{/* candle body = the upright of the L */}
		<rect x={22} y={20} width={22} height={52} rx={3.5} fill={colors.bull} />
		{/* small lower wick into the base */}
		<rect x={30.5} y={70} width={5} height={8} fill={colors.bull} />
		{/* the live price line = the base of the L */}
		<rect x={22} y={78} width={58} height={8} rx={4} fill={colors.telemetry} filter={glow ? 'url(#lf-glow)' : undefined} />
		{/* the price dot */}
		<circle cx={84} cy={82} r={7.5} fill={colors.telemetry} filter={glow ? 'url(#lf-glow)' : undefined} />
		<circle cx={84} cy={82} r={13} fill="none" stroke={alpha(colors.telemetry, 0.35)} strokeWidth={2} />
	</svg>
);
