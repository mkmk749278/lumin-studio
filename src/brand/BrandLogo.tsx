import React from 'react';
import {AbsoluteFill} from 'remotion';
import {alpha, colors} from '../theme/tokens';
import {Monogram} from './Monogram';

/** YouTube profile picture: 800 x 800, shown cropped to a circle — the dial fills that circle. */
export const BrandLogo: React.FC = () => (
	<AbsoluteFill style={{background: colors.canvas, alignItems: 'center', justifyContent: 'center'}}>
		<AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, ${alpha(colors.telemetry, 0.08)} 0%, transparent 60%)`}} />
		<Monogram size={760} />
	</AbsoluteFill>
);
