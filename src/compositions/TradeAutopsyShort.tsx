import React from 'react';
import {AbsoluteFill, Series} from 'remotion';
import {CandleReplay} from '../components/CandleReplay';
import {DisclaimerFooter} from '../components/DisclaimerFooter';
import {LowerThird} from '../components/KineticCallout';
import {StressGauge, SweepZone} from '../components/LiquidityOverlay';
import {LuminAlertCard} from '../components/LuminAlertCard';
import {TerminalBackdrop} from '../components/TerminalBackdrop';
import funding from '../../data/market/sample_btcusdt_funding_2026-10.json';
import {ex, illustrativeSetup, sweepZone, window24h} from '../demo/derive';
import {fmtDate} from '../lib/market';
import {Stage} from '../lib/Stage';
import {canvas, safe} from '../theme/tokens';

/**
 * 35-50 s 9:16 Shorts template. Layout lives inside the Shorts safe zone: nothing critical in the bottom 22%
 * or the right 15% (YouTube's caption/title and action-button rail).
 */
const W = canvas.short.width;
const H = canvas.short.height;
export const SHORT_SAFE = {
	left: W * safe.short.left,
	top: H * safe.short.top,
	right: W * (1 - safe.short.right),
	bottom: H * (1 - safe.short.bottom),
};
const innerW = SHORT_SAFE.right - SHORT_SAFE.left;

type FundingFile = {meta: {month: string}; funding: {timestamp: number; rate: number}[]};
const f = funding as FundingFile;
const peak = f.funding.reduce((a, b) => (Math.abs(b.rate) > Math.abs(a.rate) ? b : a));

export type ShortScene = {id: string; durationInFrames: number; render: () => React.ReactNode};

/** Demo scene list (engine check). Real episodes register their own scene lists in src/episodes.ts. */
export const demoShortScenes: ShortScene[] = [
	{
		id: 'replay',
		durationInFrames: 150,
		render: () => (
			<>
				<div style={{position: 'absolute', left: SHORT_SAFE.left, top: SHORT_SAFE.top}}>
					<LowerThird kicker={`USD-M PERP · 15M · ${fmtDate(window24h[0].timestamp)}`} title="BTCUSDT STOP HUNT" />
				</div>
				<div style={{position: 'absolute', left: SHORT_SAFE.left, top: SHORT_SAFE.top + 170}}>
					<CandleReplay
						candles={window24h}
						width={innerW}
						height={820}
						startFrame={4}
						candlesPerFrame={96 / 80}
						overlay={(m) => (m.visible > ex.lowIndex ? <SweepZone {...m} width={innerW} zoneLow={sweepZone.low} zoneHigh={sweepZone.high} wickIndex={ex.lowIndex} wickPrice={ex.low} label="LOW SWEPT" enterFrame={84} /> : null)}
					/>
				</div>
				<div style={{position: 'absolute', left: SHORT_SAFE.left, top: SHORT_SAFE.top + 1030}}>
					<StressGauge value={peak.rate * 100} threshold={0.01} label={`PEAK FUNDING · ${fmtDate(peak.timestamp)}`} format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(4)}%`} enterFrame={20} width={innerW} />
				</div>
			</>
		),
	},
	{
		id: 'setup',
		durationInFrames: 90,
		render: () => (
			<div style={{position: 'absolute', left: SHORT_SAFE.left, top: SHORT_SAFE.top + 200}}>
				<LuminAlertCard setup={illustrativeSetup} label="ILLUSTRATIVE — NOT A LOGGED SIGNAL" width={innerW} />
			</div>
		),
	},
];

export const TradeAutopsyShort: React.FC<{scenes?: ShortScene[]}> = ({scenes = demoShortScenes}) => (
	<Stage design={canvas.short}>
		<TerminalBackdrop>
			<Series>
				{scenes.map((s) => (
					<Series.Sequence key={s.id} durationInFrames={s.durationInFrames}>
						<AbsoluteFill>{s.render()}</AbsoluteFill>
					</Series.Sequence>
				))}
			</Series>
			{/* inside the safe area: the bottom 22% belongs to the Shorts UI */}
			<div style={{position: 'absolute', left: SHORT_SAFE.left, width: innerW, top: SHORT_SAFE.bottom - 90, height: 90}}>
				<DisclaimerFooter fontSize={22} bottom={0} maxWidth={innerW} />
			</div>
		</TerminalBackdrop>
	</Stage>
);

export const shortDuration = (scenes: ShortScene[] = demoShortScenes) => scenes.reduce((a, s) => a + s.durationInFrames, 0);
