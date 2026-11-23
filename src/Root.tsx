import React from 'react';
import {Composition} from 'remotion';
import {FuturesLabLong, longDuration} from './compositions/FuturesLabLong';
import {DEMO_FRAMES, LuminDemo} from './compositions/LuminDemo';
import {shortDuration, TradeAutopsyShort} from './compositions/TradeAutopsyShort';
import {loadStudioFonts} from './lib/fonts';
import {FPS} from './theme/tokens';

loadStudioFonts();

export const Root: React.FC = () => (
	<>
		{/* 4K 16:9 long-form master. Review cuts: --scale=0.5 (1080p) or 1/3 (720p). */}
		<Composition id="FuturesLabLong" component={FuturesLabLong} width={3840} height={2160} fps={FPS} durationInFrames={longDuration()} />
		{/* 9:16 Shorts */}
		<Composition id="TradeAutopsyShort" component={TradeAutopsyShort} width={1080} height={1920} fps={FPS} durationInFrames={shortDuration()} />
		{/* 5 s engine check at 1080p — the Modal smoke-test target */}
		<Composition id="LuminDemo" component={LuminDemo} width={1920} height={1080} fps={FPS} durationInFrames={DEMO_FRAMES} />
	</>
);
