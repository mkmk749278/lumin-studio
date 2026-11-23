import React from 'react';
import {AbsoluteFill, Series} from 'remotion';
import {LuminDemo, DEMO_FRAMES} from './LuminDemo';

/**
 * 6-9 minute 16:9 long-form documentary. Registered at 3840x2160 (4K master); every scene authors on the
 * 1920x1080 design canvas via <Stage>, so the 4K master and a 1080p review cut are the same layout.
 *
 * Episodes are an ordered list of scenes; durations come from the word-alignment JSON (src/lib/cues.ts)
 * once narration exists. Rule (CLAUDE.md §5): the final 15 s carry no critical text — YouTube end-screen zone.
 */
export type LongScene = {id: string; durationInFrames: number; Component: React.FC};

export const demoLongScenes: LongScene[] = [{id: 'engine-check', durationInFrames: DEMO_FRAMES, Component: LuminDemo}];

export const FuturesLabLong: React.FC<{scenes?: LongScene[]}> = ({scenes = demoLongScenes}) => (
	<AbsoluteFill>
		<Series>
			{scenes.map(({id, durationInFrames, Component}) => (
				<Series.Sequence key={id} durationInFrames={durationInFrames}>
					<Component />
				</Series.Sequence>
			))}
		</Series>
	</AbsoluteFill>
);

export const longDuration = (scenes: LongScene[] = demoLongScenes) => scenes.reduce((a, s) => a + s.durationInFrames, 0);
