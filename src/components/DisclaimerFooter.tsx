import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {alpha, colors, fonts} from '../theme/tokens';

export const DISCLAIMER = 'Market and execution analysis for educational purposes only. Perpetual futures carry high risk of liquidation.';

/** Subtle, persistent educational risk disclaimer for every chart segment (CLAUDE.md §6). */
export const DisclaimerFooter: React.FC<{fontSize?: number; bottom?: number; maxWidth?: number}> = ({fontSize = 18, bottom = 28, maxWidth}) => {
	const frame = useCurrentFrame();
	const a = interpolate(frame, [0, 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<div style={{position: 'absolute', left: 0, right: 0, bottom, display: 'flex', justifyContent: 'center', opacity: a}}>
			<div style={{color: alpha(colors.muted, 0.85), fontSize, fontFamily: fonts.sans, letterSpacing: 0.3, maxWidth, textAlign: 'center', padding: '0 24px'}}>{DISCLAIMER}</div>
		</div>
	);
};
