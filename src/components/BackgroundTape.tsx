import {scaleLinear} from 'd3-scale';
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Candle} from '../lib/market';
import {alpha, canvas, colors} from '../theme/tokens';

export type BackgroundTapeProps = {
	candles: Candle[];
	duration: number;
	/** Frame intervals [start, end] where live full-frame charts or clean end-screens require attenuation to 0. */
	hideRanges?: [number, number][];
	baseOpacity?: number;
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * Dimmed, blurred real candlestick tape rendered behind non-chart sections so the dark quant grid
 * maintains visual depth without competing with foreground telemetry.
 */
export const BackgroundTape: React.FC<BackgroundTapeProps> = ({
	candles,
	duration,
	hideRanges = [],
	baseOpacity = 0.07,
}) => {
	const frame = useCurrentFrame();

	if (candles.length === 0) return null;

	let gate = 1;
	for (const [start, end] of hideRanges) {
		const fade = 10;
		if (frame >= start - fade && frame <= end + fade) {
			const hidden = interpolate(
				frame,
				[start - fade, start, end, end + fade],
				[1, 0, 0, 1],
				clamp,
			);
			gate = Math.min(gate, hidden);
		}
	}

	const opacity = baseOpacity * gate;
	if (opacity <= 0.001) return null;

	const driftMax = 480;
	const translateX = interpolate(frame, [0, duration], [0, -driftMax], clamp);
	const totalWidth = canvas.long.width + driftMax;
	const height = canvas.long.height;

	// Repeat the historical sequence across totalWidth so the slow horizontal drift never exposes an empty edge.
	const targetCount = Math.max(candles.length, 96);
	const tape = Array.from({length: targetCount}, (_, i) => candles[i % candles.length]);

	const lo = Math.min(...tape.map((c) => c.low));
	const hi = Math.max(...tape.map((c) => c.high));
	const y = scaleLinear().domain([lo, hi]).range([height * 0.88, height * 0.14]);
	const slot = totalWidth / tape.length;
	const x = (i: number) => (i + 0.5) * slot;

	const linePath = tape.map((c, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(c.close).toFixed(1)}`).join('');

	return (
		<AbsoluteFill style={{overflow: 'hidden', pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: 0,
					width: totalWidth,
					height,
					opacity,
					filter: 'blur(8px)',
					transform: `translateX(${translateX}px)`,
				}}
			>
				<svg width={totalWidth} height={height}>
					<path d={linePath} fill="none" stroke={alpha(colors.telemetry, 0.7)} strokeWidth={3} />
					{tape.map((c, i) => {
						const col = c.close >= c.open ? colors.bull : colors.bear;
						const top = y(Math.max(c.open, c.close));
						const bot = y(Math.min(c.open, c.close));
						return (
							<g key={`${c.timestamp}-${i}`}>
								<line
									x1={x(i)}
									x2={x(i)}
									y1={y(c.high)}
									y2={y(c.low)}
									stroke={col}
									strokeWidth={3}
								/>
								<rect
									x={x(i) - slot * 0.34}
									y={top}
									width={slot * 0.68}
									height={Math.max(3, bot - top)}
									fill={col}
									rx={2}
								/>
							</g>
						);
					})}
				</svg>
			</div>
		</AbsoluteFill>
	);
};
