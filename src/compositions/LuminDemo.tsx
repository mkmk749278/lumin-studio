import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {CandleReplay} from '../components/CandleReplay';
import {EquityCurve} from '../components/DatasetChart';
import {DisclaimerFooter} from '../components/DisclaimerFooter';
import {DataPin, LowerThird, MetricCounter} from '../components/KineticCallout';
import {SweepZone} from '../components/LiquidityOverlay';
import {LuminAlertCard} from '../components/LuminAlertCard';
import {TerminalBackdrop} from '../components/TerminalBackdrop';
import {all, cumulative, ex, illustrativeSetup, market, range48Pct, sweepZone, window24h} from '../demo/derive';
import {fmtDate, fmtPrice} from '../lib/market';
import {Stage} from '../lib/Stage';
import {canvas, colors, fonts} from '../theme/tokens';

export const DEMO_FRAMES = 150; // 5 s @ 30 fps — the Modal smoke-test composition

const CHART = {x: 80, y: 190, w: 1180, h: 720};

/** 5-second engine check: every core component, driven by the real cached BTCUSDT 15m file. */
export const LuminDemo: React.FC = () => {
	const frame = useCurrentFrame();
	const sweepAt = 78;
	const zoomFrom = 92;
	return (
		<Stage design={canvas.long}>
			<TerminalBackdrop>
				<AbsoluteFill>
					<div style={{position: 'absolute', left: CHART.x, top: 64}}>
						<LowerThird kicker={`BINANCE USD-M PERP · 15M · ${fmtDate(window24h[0].timestamp)}`} title="BTCUSDT — 24H REPLAY" enterFrame={0} />
					</div>
					<div style={{position: 'absolute', left: CHART.x, top: CHART.y}}>
						<CandleReplay
							candles={window24h}
							width={CHART.w}
							height={CHART.h}
							startFrame={4}
							candlesPerFrame={96 / 74}
							camera={[
								{frame: zoomFrom, zoom: 1, focusIndex: ex.lowIndex, focusPrice: ex.low},
								{frame: DEMO_FRAMES, zoom: 1.9, focusIndex: ex.lowIndex, focusPrice: ex.low},
							]}
							overlay={(m) =>
								m.visible > ex.lowIndex ? (
									<>
										<SweepZone {...m} width={CHART.w} zoneLow={sweepZone.low} zoneHigh={sweepZone.high} wickIndex={ex.lowIndex} wickPrice={ex.low} label="24H LOW SWEPT" enterFrame={sweepAt} />
										<DataPin x={m.x(ex.lowIndex)} y={m.y(ex.low)} text={fmtPrice(ex.low)} color={colors.bear} enterFrame={sweepAt + 14} dx={-70} dy={50} />
									</>
								) : null
							}
						/>
					</div>
					<div style={{position: 'absolute', left: 1340, top: 64, width: 500}}>
						<MetricCounter value={range48Pct} decimals={2} suffix="%" label="48H HIGH-TO-LOW RANGE" startFrame={10} durationFrames={45} size={84} color={colors.telemetry} />
					</div>
					<div style={{position: 'absolute', left: 1340, top: 250, opacity: interpolate(frame, [96, 104], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
						<LuminAlertCard setup={illustrativeSetup} enterFrame={96} label="ILLUSTRATIVE — NOT A LOGGED SIGNAL" width={500} />
					</div>
					<div style={{position: 'absolute', left: 1340, top: 250, opacity: interpolate(frame, [86, 96], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
						<EquityCurve values={cumulative} width={500} height={420} title="BTCUSDT PERP" subtitle={`48H · ${market.meta.count} × 15M CLOSES`} startFrame={12} durationFrames={70} />
					</div>
					<div style={{position: 'absolute', left: CHART.x, top: CHART.y + CHART.h + 18, color: colors.muted, fontSize: 18, fontFamily: fonts.mono}}>
						SOURCE: data.binance.vision · {all.length} × 15m candles · {fmtDate(all[0].timestamp)} – {fmtDate(all[all.length - 1].timestamp)}
					</div>
					<DisclaimerFooter />
				</AbsoluteFill>
			</TerminalBackdrop>
		</Stage>
	);
};
