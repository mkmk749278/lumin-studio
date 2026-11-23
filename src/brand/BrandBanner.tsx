import React from 'react';
import {AbsoluteFill} from 'remotion';
import {alpha, colors, fonts} from '../theme/tokens';

/**
 * YouTube banner: 2560 x 1440. Wordmark + tagline inside the 1546 x 423 safe centre; a HUD frame (corner brackets,
 * ruler ticks) and the grid fill the TV-only edges. Owner, 23 NOV 2026: simpler, reference-led, our palette.
 */
const W = 2560;
const H = 1440;

const Ruler: React.FC<{x: number; y: number; n: number; vertical?: boolean}> = ({x, y, n, vertical}) => (
	<>
		{Array.from({length: n}, (_, i) => (
			<div
				key={i}
				style={{
					position: 'absolute', background: alpha(colors.telemetry, i % 5 === 0 ? 0.5 : 0.28),
					...(vertical
						? {left: x, top: y + i * 22, width: i % 5 === 0 ? 22 : 12, height: 2}
						: {left: x + i * 22, top: y, width: 2, height: i % 5 === 0 ? 22 : 12}),
				}}
			/>
		))}
	</>
);

export const BrandBanner: React.FC = () => (
	<AbsoluteFill style={{background: colors.canvas, overflow: 'hidden'}}>
		<AbsoluteFill
			style={{
				backgroundImage: `linear-gradient(${colors.grid} 2px, transparent 2px), linear-gradient(90deg, ${colors.grid} 2px, transparent 2px)`,
				backgroundSize: '86px 86px', backgroundPosition: '-20px -20px', opacity: 0.7,
			}}
		/>
		{/* the glow behind the wordmark: cyan left, emerald right */}
		<AbsoluteFill style={{background: `radial-gradient(ellipse 620px 240px at 38% 50%, ${alpha(colors.telemetry, 0.16)}, transparent 70%), radial-gradient(ellipse 620px 240px at 64% 52%, ${alpha(colors.bull, 0.14)}, transparent 70%)`}} />
		{/* HUD frame: corner brackets + rulers */}
		<div style={{position: 'absolute', left: 48, top: 48, right: 48, bottom: 48, border: `2px solid ${alpha(colors.telemetry, 0.28)}`}} />
		<Ruler x={90} y={48} n={16} />
		<Ruler x={W - 90 - 15 * 22} y={48} n={16} />
		<Ruler x={48} y={H / 2 - 7 * 22} n={15} vertical />
		<Ruler x={W - 48 - 22} y={H / 2 - 7 * 22} n={15} vertical />
		<div style={{position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
			<svg width={1546} height={190} viewBox="0 0 1546 190" style={{overflow: 'visible'}}>
				<defs>
					<linearGradient id="wm" x1="0" y1="0" x2="1" y2="0">
						<stop offset="0" stopColor={colors.telemetry} />
						<stop offset="1" stopColor={colors.bull} />
					</linearGradient>
					<linearGradient id="wm-fill" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor={colors.text} />
						<stop offset="1" stopColor="#B8C4D4" />
					</linearGradient>
					<filter id="wm-glow" x="-10%" y="-40%" width="120%" height="180%">
						<feGaussianBlur stdDeviation="7" result="b" />
						<feMerge>
							<feMergeNode in="b" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>
				<text x={778} y={150} textAnchor="middle" fontFamily="Inter" fontWeight={700} fontSize={150} letterSpacing={10}
					fill="url(#wm-fill)" stroke="url(#wm)" strokeWidth={5} paintOrder="stroke" filter="url(#wm-glow)">
					LUMIN FUTURES
				</text>
			</svg>
			<div style={{color: colors.muted, fontFamily: fonts.mono, fontWeight: 500, fontSize: 30, letterSpacing: 5, marginTop: 34, whiteSpace: 'nowrap'}}>
				CRYPTO FUTURES · TESTED ON REAL DATA · FEES INCLUDED
			</div>
		</div>
	</AbsoluteFill>
);
