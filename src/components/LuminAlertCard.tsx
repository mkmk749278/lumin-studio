import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {fmtPct, fmtPrice} from '../lib/market';
import {alpha, colors, fonts, monoNumeric, springs} from '../theme/tokens';

export type Setup = {
	pair: string;
	side: 'LONG' | 'SHORT';
	entry: number;
	stopLoss: number;
	takeProfit: number;
	/** e.g. "LIMIT" — pre-planned setups are limit orders, executed deterministically */
	orderType?: string;
	timeframe?: string;
};

/** Reward-to-risk from the setup's own geometry. Never typed by hand. */
export const rewardToRisk = (s: Setup): number => Math.abs(s.takeProfit - s.entry) / Math.abs(s.entry - s.stopLoss);

/**
 * Native app-style setup card: pair, side, Entry / SL / TP and the R:R computed from them.
 * `label` is an honesty label (e.g. "ILLUSTRATIVE SETUP") and is mandatory whenever the setup is not a
 * real, logged Lumin signal.
 */
export const LuminAlertCard: React.FC<{setup: Setup; enterFrame?: number; label?: string; width?: number}> = ({
	setup,
	enterFrame = 0,
	label,
	width = 520,
}) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const p = spring({frame: frame - enterFrame, fps, config: springs.settle});
	const sideCol = setup.side === 'LONG' ? colors.bull : colors.bear;
	const rr = rewardToRisk(setup);
	const pct = (v: number) => ((v - setup.entry) / setup.entry) * 100;
	// Rows reveal one after another so each level lands on its own beat.
	const row = (i: number) => interpolate(frame - enterFrame, [8 + i * 6, 18 + i * 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const rows: [string, number, string][] = [
		['ENTRY', setup.entry, colors.telemetry],
		['STOP LOSS', setup.stopLoss, colors.bear],
		['TAKE PROFIT', setup.takeProfit, colors.bull],
	];
	return (
		<div
			style={{
				width, background: colors.panel, border: `1px solid ${colors.hairline}`, borderRadius: 18,
				padding: 30, opacity: p, transform: `translateY(${(1 - p) * 40}px) scale(${0.96 + 0.04 * p})`,
				boxShadow: `0 24px 60px ${alpha('#000000', 0.45)}`, fontFamily: fonts.sans,
			}}
		>
			<div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
				<div style={{color: colors.text, fontSize: 40, fontWeight: 700, letterSpacing: 0.5}}>{setup.pair}</div>
				<div style={{background: alpha(sideCol, 0.16), color: sideCol, border: `1px solid ${alpha(sideCol, 0.5)}`, borderRadius: 8, padding: '6px 16px', fontSize: 24, fontWeight: 700, letterSpacing: 2}}>
					{setup.side}
				</div>
			</div>
			<div style={{color: colors.muted, fontSize: 20, marginTop: 6, fontFamily: fonts.mono}}>
				USD-M PERP · {setup.orderType ?? 'LIMIT'}{setup.timeframe ? ` · ${setup.timeframe}` : ''}
			</div>
			<div style={{height: 1, background: colors.hairline, margin: '22px 0'}} />
			{rows.map(([name, v, col], i) => (
				<div key={name} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '14px 0', opacity: row(i), transform: `translateX(${(1 - row(i)) * 18}px)`}}>
					<div style={{color: colors.muted, fontSize: 22, fontWeight: 600, letterSpacing: 2}}>{name}</div>
					<div style={{display: 'flex', gap: 18, alignItems: 'baseline'}}>
						{i > 0 && <div style={{color: col, fontSize: 22, ...monoNumeric}}>{fmtPct(pct(v))}</div>}
						<div style={{color: col, fontSize: 34, fontWeight: 700, ...monoNumeric}}>{fmtPrice(v)}</div>
					</div>
				</div>
			))}
			<div style={{height: 1, background: colors.hairline, margin: '22px 0 16px'}} />
			<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', opacity: row(3)}}>
				<div style={{color: colors.muted, fontSize: 22, fontWeight: 600, letterSpacing: 2}}>REWARD : RISK</div>
				<div style={{color: colors.text, fontSize: 34, fontWeight: 700, ...monoNumeric}}>{rr.toFixed(2)} R</div>
			</div>
			{label && (
				<div style={{marginTop: 18, color: colors.warning, fontSize: 18, fontWeight: 700, letterSpacing: 1.5, fontFamily: fonts.mono}}>{label}</div>
			)}
		</div>
	);
};
