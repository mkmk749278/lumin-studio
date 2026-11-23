import React from 'react';
import {AbsoluteFill, useVideoConfig} from 'remotion';

/**
 * Author once, render at any resolution: children are laid out on a fixed design canvas
 * (1920x1080 long-form, 1080x1920 Shorts) and scaled to the composition size. A 4K master is the
 * same layout at scale 2 — vector text and SVG stay crisp because Chromium rasterises at output size.
 */
export const Stage: React.FC<{design: {width: number; height: number}; children: React.ReactNode}> = ({design, children}) => {
	const {width} = useVideoConfig();
	const k = width / design.width;
	return (
		<AbsoluteFill style={{overflow: 'hidden'}}>
			<div style={{position: 'absolute', left: 0, top: 0, width: design.width, height: design.height, transform: `scale(${k})`, transformOrigin: '0 0'}}>{children}</div>
		</AbsoluteFill>
	);
};
