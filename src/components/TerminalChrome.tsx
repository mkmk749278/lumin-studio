import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {alpha, colors, fonts, FPS, monoNumeric} from '../theme/tokens';

export type ChromeSection = {
	from: number;
	label: string;
};

export type TerminalChromeProps = {
	labTag?: string;
	context?: string;
	sections: ChromeSection[];
	identRange?: [number, number];
	endScreen: number;
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/**
 * Persistent quant-desk header chrome: anchors the live section badge, dataset context, and tabular MM:SS clock.
 * Pure function of the frame; clears during Ident and fades out cleanly before the YouTube end-screen zone.
 */
export const TerminalChrome: React.FC<TerminalChromeProps> = ({
	labTag = 'LUMIN FUTURES // LAB-01',
	context = 'BINANCE USD-M · 93 PAIRS · 01 MAY – 31 OCT 2026',
	sections,
	identRange,
	endScreen,
}) => {
	const frame = useCurrentFrame();
	const {fps = FPS} = useVideoConfig();

	const identOpacity = identRange
		? interpolate(
				frame,
				[identRange[0] - 6, identRange[0], identRange[1], identRange[1] + 8],
				[1, 0, 0, 1],
				clamp,
			)
		: 1;
	const endOpacity = interpolate(frame, [endScreen - 15, endScreen], [1, 0], clamp);
	const opacity = identOpacity * endOpacity;
	if (opacity <= 0.001) return null;

	let activeLabel = sections[0]?.label ?? '';
	for (const s of sections) {
		if (frame >= s.from) activeLabel = s.label;
	}

	const totalSec = Math.max(0, Math.floor(frame / fps));
	const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
	const ss = String(totalSec % 60).padStart(2, '0');
	const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 2);

	const pillStyle: React.CSSProperties = {
		display: 'flex',
		alignItems: 'center',
		gap: 10,
		padding: '5px 12px',
		borderRadius: 6,
		backgroundColor: alpha(colors.canvas, 0.55),
		border: `1px solid ${colors.hairline}`,
		fontFamily: fonts.mono,
		fontSize: 16,
		letterSpacing: 2,
		lineHeight: 1,
		whiteSpace: 'nowrap',
	};

	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				right: 0,
				height: 52,
				padding: '0 32px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				backgroundColor: alpha(colors.panel, 0.72),
				borderBottom: `1px solid ${colors.hairline}`,
				opacity,
				zIndex: 50,
			}}
		>
			<div style={{display: 'flex', alignItems: 'center', gap: 14}}>
				<div style={{...pillStyle, color: colors.telemetry, fontWeight: 700}}>
					<span
						style={{
							width: 8,
							height: 8,
							borderRadius: '50%',
							backgroundColor: colors.bull,
							opacity: 0.45 + 0.55 * pulse,
						}}
					/>
					<span>{labTag}</span>
				</div>
				{activeLabel && (
					<div
						style={{
							...pillStyle,
							color: colors.text,
							borderColor: alpha(colors.telemetry, 0.35),
							fontWeight: 700,
						}}
					>
						{activeLabel}
					</div>
				)}
			</div>

			<div style={{display: 'flex', alignItems: 'center', gap: 14}}>
				<div style={{...pillStyle, color: colors.muted}}>
					<span>{context}</span>
					<span style={{color: colors.hairline}}>|</span>
					<span style={{color: colors.text, fontWeight: 700, ...monoNumeric}}>{`${mm}:${ss}`}</span>
				</div>
			</div>
		</div>
	);
};
