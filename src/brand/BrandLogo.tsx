import React from 'react';
import {AbsoluteFill} from 'remotion';
import {alpha, colors} from '../theme/tokens';
import {Mark} from './Mark';

/** YouTube profile picture: 800 x 800, shown as a circle (keep the mark inside the centre ~70%). */
export const BrandLogo: React.FC = () => (
	<AbsoluteFill style={{background: colors.canvas, alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
		<AbsoluteFill
			style={{
				backgroundImage: `linear-gradient(${colors.grid} 2px, transparent 2px), linear-gradient(90deg, ${colors.grid} 2px, transparent 2px)`,
				backgroundSize: '80px 80px',
				backgroundPosition: '40px 40px',
				opacity: 0.55,
			}}
		/>
		<AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, ${alpha(colors.telemetry, 0.10)} 0%, transparent 45%, ${alpha(colors.canvas, 0.95)} 72%)`}} />
		<div style={{transform: 'translate(-44px, -7px)'}}>
			<Mark size={460} />
		</div>
	</AbsoluteFill>
);
