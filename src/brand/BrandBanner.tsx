import React from 'react';
import {AbsoluteFill} from 'remotion';
import sample from '../../data/market/sample_btcusdt_15m.json';
import {CandleReplay} from '../components/CandleReplay';
import {MarketFile} from '../lib/market';
import {alpha, colors, fonts} from '../theme/tokens';
import {Mark} from './Mark';

/**
 * YouTube banner: 2560 x 1440. Only the centre 1546 x 423 is safe on every device, so the wordmark and tagline sit
 * there; the real BTCUSDT 15m candles (data.binance.vision) fill the TV-only edges at low opacity.
 */
const W = 2560;
const H = 1440;
const SAFE = {w: 1546, h: 423};

export const BrandBanner: React.FC = () => {
	const m = sample as MarketFile;
	return (
		<AbsoluteFill style={{background: colors.canvas, overflow: 'hidden'}}>
			<AbsoluteFill
				style={{
					backgroundImage: `linear-gradient(${colors.grid} 2px, transparent 2px), linear-gradient(90deg, ${colors.grid} 2px, transparent 2px)`,
					backgroundSize: '96px 96px',
					opacity: 0.6,
				}}
			/>
			<div style={{position: 'absolute', left: 0, top: 300, opacity: 0.32}}>
				<CandleReplay candles={m.candles} width={W} height={840} startFrame={-1000} showAxis={false} />
			</div>
			<AbsoluteFill
				style={{background: `radial-gradient(ellipse ${SAFE.w * 0.75}px ${SAFE.h * 0.95}px at 50% 50%, ${alpha(colors.canvas, 0.96)} 0%, ${alpha(colors.canvas, 0.85)} 55%, transparent 100%)`}}
			/>
			<div
				style={{
					position: 'absolute', left: (W - SAFE.w) / 2, top: (H - SAFE.h) / 2, width: SAFE.w, height: SAFE.h,
					display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48,
				}}
			>
				<Mark size={190} />
				<div>
					<div style={{color: colors.text, fontFamily: fonts.sans, fontWeight: 700, fontSize: 124, letterSpacing: 6, lineHeight: 1, whiteSpace: 'nowrap'}}>
						LUMIN <span style={{color: colors.telemetry}}>FUTURES</span>
					</div>
					<div style={{color: colors.muted, fontFamily: fonts.mono, fontWeight: 500, fontSize: 30, letterSpacing: 3, marginTop: 26, whiteSpace: 'nowrap'}}>
						CRYPTO FUTURES · TESTED ON REAL DATA · FEES INCLUDED
					</div>
				</div>
			</div>
		</AbsoluteFill>
	);
};
