import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {alpha, colors} from '../theme/tokens';

/**
 * Grounded quant-desk backdrop: obsidian base, a coordinate grid that drifts slowly (never a flat void),
 * a faint major grid every 4 cells, and a vignette that keeps the eye centre-screen.
 * Pure function of the frame — deterministic across parallel render chunks.
 */
export const TerminalBackdrop: React.FC<{cell?: number; driftPxPerSec?: number; children?: React.ReactNode}> = ({
	cell = 48,
	driftPxPerSec = 6,
	children,
}) => {
	const frame = useCurrentFrame();
	const {fps, width, height} = useVideoConfig();
	const off = ((frame / fps) * driftPxPerSec) % (cell * 4);
	const minor = `linear-gradient(${colors.grid} 1px, transparent 1px), linear-gradient(90deg, ${colors.grid} 1px, transparent 1px)`;
	const major = `linear-gradient(${alpha(colors.telemetry, 0.05)} 1px, transparent 1px), linear-gradient(90deg, ${alpha(colors.telemetry, 0.05)} 1px, transparent 1px)`;
	return (
		<AbsoluteFill style={{backgroundColor: colors.canvas, overflow: 'hidden'}}>
			<AbsoluteFill
				style={{
					backgroundImage: `${major}, ${minor}`,
					backgroundSize: `${cell * 4}px ${cell * 4}px, ${cell * 4}px ${cell * 4}px, ${cell}px ${cell}px, ${cell}px ${cell}px`,
					backgroundPosition: `${off}px ${off * 0.5}px`,
					opacity: 0.55,
				}}
			/>
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse ${width * 0.75}px ${height * 0.7}px at 50% 45%, transparent 40%, ${alpha(colors.canvas, 0.92)} 100%)`,
				}}
			/>
			{children}
		</AbsoluteFill>
	);
};
