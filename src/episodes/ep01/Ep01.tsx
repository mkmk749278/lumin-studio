import {scaleLinear} from 'd3-scale';
import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {BackgroundTape} from '../../components/BackgroundTape';
import {DisclaimerFooter} from '../../components/DisclaimerFooter';
import {TerminalBackdrop} from '../../components/TerminalBackdrop';
import {ChromeSection, TerminalChrome} from '../../components/TerminalChrome';
import {Monogram} from '../../brand/Monogram';
import {Stage} from '../../lib/Stage';
import {alpha, canvas, colors, fonts, monoNumeric} from '../../theme/tokens';
import {at, AUDIO_END, DURATION, MONTHS, R, RULES, S, T} from './data';
import {Card, clamp, Coin, ease, Kicker, pct, Roll, Section, SourceLine, useIn, useSpring, ZeroBars} from './kit';
import {TradeChart} from './TradeChart';

/**
 * Lumin Futures — ep01 "5-Minute Scalping Was No Better Than a Coin Flip".
 * One timeline, absolute frames, every change on Reid's word (data.ts `at`). Design canvas 1920x1080 in <Stage>.
 */

const BACKTEST = `BACKTEST · BINANCE USD-M 5M · ${S.provenance.symbols.length} PAIRS · 01 MAY – 31 OCT 2026 · NEXT-OPEN ENTRY · STOP 1× ATR · TARGET 1.5× ATR`;
const base = (s: string) => s.replace(/USDT$/, '');

// ---- section boundaries (the first spoken words of each section) -------------------------------------------
const B = {
	cold: 0,
	ident: at('This is Lumin Futures'),
	premise: at('This is not an opinion'),
	test: at('We took every'),
	exits: at('Every trade, from every rule'),
	before: at('Before fees, here'),
	trade: at('Here is what that looks like'),
	feeall: at('Now charge the fee'),
	why: at('Here is the part'),
	limits: at('Three honest limits'),
	maths: at('If there is no edge'),
	close: at('Next, we test'),
};
const END_SCREEN = DURATION - 15 * 30; // no footer, no critical text after this frame

const CHROME_SECTIONS: ChromeSection[] = [
	{from: B.cold, label: 'COLD OPEN'},
	{from: B.premise, label: 'DATASET'},
	{from: B.test, label: 'DATASET'},
	{from: B.exits, label: 'EXIT RULES'},
	{from: B.before, label: 'BEFORE FEES'},
	{from: B.trade, label: 'BTCUSDT REPLAY'},
	{from: B.feeall, label: 'AFTER FEES'},
	{from: B.why, label: 'FEE DRAG'},
	{from: B.limits, label: 'HONEST LIMITS'},
	{from: B.maths, label: 'WHAT CHANGES'},
];

// ---- shared pieces ---------------------------------------------------------------------------------------------

const PairGrid: React.FC<{fillAt: number; colorAt?: number; values?: Record<string, number>; highlight?: string[]; onlyGreenAt?: number}> = ({fillAt, colorAt, values, highlight = [], onlyGreenAt}) => {
	const f = useCurrentFrame();
	const syms = S.provenance.symbols;
	const cols = 12;
	return (
		<div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 118px)`, gap: 10}}>
			{syms.map((s, i) => {
				const p = interpolate(f, [fillAt + i * 0.6, fillAt + i * 0.6 + 8], [0, 1], clamp);
				const v = values?.[s];
				const c = colorAt !== undefined && f >= colorAt + (i % 12) * 1.2 && v !== undefined;
				const win = c && v! > 0;
				const lit = highlight.includes(base(s));
				const dimOthers = onlyGreenAt !== undefined && f >= onlyGreenAt && !win;
				const col = c ? (win ? colors.bull : colors.bear) : lit ? colors.telemetry : colors.muted;
				return (
					<div key={s} style={{
						opacity: p * (dimOthers ? 0.25 : 1), height: 46, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
						border: `1.5px solid ${alpha(col, c || lit ? 0.9 : 0.35)}`, background: alpha(col, c ? (win ? 0.28 : 0.12) : lit ? 0.18 : 0.04),
						color: c || lit ? colors.text : colors.muted, fontFamily: fonts.mono, fontSize: 18, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap',
					}}>{base(s)}</div>
				);
			})}
		</div>
	);
};

const Footer: React.FC = () => {
	const f = useCurrentFrame();
	const show = f < END_SCREEN && !(f >= B.ident && f < B.premise);
	return show ? <DisclaimerFooter fontSize={20} bottom={26} /> : null;
};

// ---- 1. cold open ----------------------------------------------------------------------------------------------
const ColdOpen: React.FC = () => {
	const thousand = at('one hundred and seventeen thousand');
	const coin = at('coin flip');
	const fees = at('After fees');
	const one = at('exactly one');
	const chart = useIn(0, 10);
	return (
		<Section from={B.cold} to={B.ident}>
			{/* the 5m chart and the coin: what the episode tests */}
			<div style={{position: 'absolute', left: 96, top: 162, opacity: chart * interpolate(useCurrentFrame(), [fees - 6, fees + 6], [1, 0], clamp)}}>
				<TradeChart width={1150} height={630}
					reveal={{frames: [0, fees - 10], candles: [32, T.candles.length - 0.01]}}
					cues={{run: 1e9, levels: 1e9, sweep: 1e9, zoomIn: 1e9, zoomOut: 2e9, target: 1e9}} />
			</div>
			<div style={{position: 'absolute', left: 1380, top: 300, opacity: interpolate(useCurrentFrame(), [coin - 8, coin, fees - 6, fees + 6], [0, 1, 1, 0], clamp)}}>
				<Coin start={coin - 4} land={coin + 40} side="LONG" size={300} />
				<div style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 26, letterSpacing: 4, textAlign: 'center', marginTop: 30}}>CONTROL</div>
			</div>
			<div style={{position: 'absolute', left: 96, top: 76, opacity: useIn(thousand, 10) * interpolate(useCurrentFrame(), [fees - 6, fees + 6], [1, 0], clamp)}}>
				<Roll value={R('5m|ema_cross').n} at={thousand} d={30} size={72} color={colors.telemetry} />
				<span style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 30, letterSpacing: 4, marginLeft: 20}}>TRADES · EMA RULE ALONE</span>
			</div>
			{/* after fees: 93 pairs, one stays green */}
			<div style={{position: 'absolute', left: 96, top: 206, opacity: useIn(fees, 12)}}>
				<PairGrid fillAt={fees} colorAt={fees + 30} values={S.per_symbol_net_007['5m|ema_cross']} onlyGreenAt={one} />
			</div>
			<div style={{position: 'absolute', left: 96, top: 86, opacity: useIn(fees, 12)}}>
				<span style={{color: colors.text, fontFamily: fonts.sans, fontWeight: 700, fontSize: 52, letterSpacing: 2}}>EMA 9/21 · AFTER FEES · PROFITABLE PAIRS </span>
				<span style={{color: colors.bull, fontSize: 64, fontWeight: 700, ...monoNumeric}}>{useCurrentFrame() >= one ? `${R('5m|ema_cross').symbols_profitable_net_007} / 93` : ''}</span>
			</div>
			<SourceLine text={BACKTEST} at={fees} />
		</Section>
	);
};

// ---- 2. ident ----------------------------------------------------------------------------------------------------
const Ident: React.FC = () => {
	const p = useSpring(B.ident);
	return (
		<Section from={B.ident} to={B.premise} push={0.025}>
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 60}}>
				<div style={{transform: `scale(${0.8 + 0.2 * p})`, opacity: p}}><Monogram size={300} /></div>
				<div style={{opacity: p, transform: `translateX(${(1 - p) * 40}px)`}}>
					<div style={{fontFamily: fonts.sans, fontWeight: 700, fontSize: 110, letterSpacing: 8, color: colors.text, lineHeight: 1}}>LUMIN <span style={{color: colors.telemetry}}>FUTURES</span></div>
					<div style={{fontFamily: fonts.mono, fontSize: 30, letterSpacing: 5, color: colors.muted, marginTop: 24}}>REAL DATA · FEES INCLUDED</div>
				</div>
			</AbsoluteFill>
		</Section>
	);
};

// ---- 3. premise --------------------------------------------------------------------------------------------------
const Premise: React.FC = () => {
	const f = useCurrentFrame();
	const cards = [
		{
			at: at('six months'),
			tag: '01 // SAMPLE WINDOW',
			big: '6 MONTHS',
			body: '93 USD-M PAIRS · 5M ARCHIVE',
			small: '01 MAY – 31 OCT 2026',
			col: colors.telemetry,
		},
		{
			at: at('the same exits'),
			tag: '02 // FIXED BRACKET',
			big: 'SAME EXITS',
			body: 'NEXT-OPEN ENTRY ON EVERY RULE',
			small: 'STOP 1× ATR · TARGET 1.5× ATR',
			col: colors.text,
		},
		{
			at: at('the fee charged'),
			tag: '03 // EXECUTION COST',
			big: '0.07% FEE',
			body: 'CHARGED ON EVERY SINGLE TRADE',
			small: '0.02% MAKER + 0.05% TAKER',
			col: colors.warning,
		},
	];
	return (
		<Section from={B.premise} to={B.test}>
			<Kicker text="PROTOCOL · NO CHERRY-PICKING" at={B.premise} />
			<div style={{position: 'absolute', left: 96, width: 1728, top: 185, display: 'flex', gap: 36}}>
				{cards.map((c) => {
					const p = useSpring(c.at);
					const sweep = interpolate(f, [c.at, B.test], [0.18, 1], clamp);
					return (
						<Card
							key={c.big}
							style={{
								flex: 1,
								minHeight: 540,
								padding: 48,
								opacity: p,
								transform: `translateY(${(1 - p) * 50}px)`,
								borderColor: alpha(c.col, 0.45),
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'space-between',
							}}
						>
							<div>
								<div style={{height: 6, width: '100%', background: alpha(c.col, 0.16), borderRadius: 4, marginBottom: 28, overflow: 'hidden'}}>
									<div style={{height: '100%', width: `${sweep * 100}%`, background: c.col, borderRadius: 4}} />
								</div>
								<div style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 24, letterSpacing: 2}}>{c.tag}</div>
								<div style={{color: c.col, fontFamily: fonts.sans, fontWeight: 700, fontSize: 74, letterSpacing: 1, marginTop: 18, lineHeight: 1.05}}>{c.big}</div>
								<div style={{color: colors.text, fontFamily: fonts.sans, fontWeight: 600, fontSize: 38, marginTop: 28, lineHeight: 1.28}}>{c.body}</div>
							</div>
							<div style={{color: c.col === colors.text ? colors.telemetry : c.col, fontFamily: fonts.mono, fontSize: 28, fontWeight: 700, paddingTop: 24, borderTop: `1px solid ${colors.hairline}`}}>
								{c.small}
							</div>
						</Card>
					);
				})}
			</div>
			<SourceLine text={BACKTEST} at={B.premise} />
		</Section>
	);
};

// ---- 4. the test -------------------------------------------------------------------------------------------------
const RuleMiniViz: React.FC<{kind: 'ema' | 'rsi' | 'macd'; start: number}> = ({kind, start}) => {
	const f = useCurrentFrame();
	const prog = interpolate(f, [start, start + 36], [0.1, 1], clamp);
	const pulse = 0.6 + 0.4 * Math.sin(f * 0.2);
	const W = 340, H = 132;
	if (kind === 'ema') {
		const pts = Array.from({length: 25}, (_, i) => i / 24);
		const fast = pts.map((t, i) => `${i ? 'L' : 'M'}${(t * W).toFixed(1)},${(96 - t * 66 - Math.sin(t * 5) * 10).toFixed(1)}`).join('');
		const slow = pts.map((t, i) => `${i ? 'L' : 'M'}${(t * W).toFixed(1)},${(78 - t * 28).toFixed(1)}`).join('');
		return (
			<svg width={W} height={H} style={{marginTop: 18}}>
				<line x1={0} x2={W} y1={H - 8} y2={H - 8} stroke={colors.hairline} strokeWidth={1.5} />
				<path d={slow} fill="none" stroke={colors.warning} strokeWidth={4} strokeDasharray={420} strokeDashoffset={420 * (1 - prog)} />
				<path d={fast} fill="none" stroke={colors.telemetry} strokeWidth={4.5} strokeDasharray={420} strokeDashoffset={420 * (1 - prog)} />
				<circle cx={W * 0.46} cy={65} r={8} fill={colors.telemetry} opacity={prog > 0.45 ? pulse : 0} />
			</svg>
		);
	}
	if (kind === 'rsi') {
		const pts = Array.from({length: 25}, (_, i) => i / 24);
		const d = pts.map((t, i) => {
			const v = 50 - Math.sin(t * Math.PI * 1.4) * 42;
			return `${i ? 'L' : 'M'}${(t * W).toFixed(1)},${(16 + ((100 - v) / 100) * 96).toFixed(1)}`;
		}).join('');
		return (
			<svg width={W} height={H} style={{marginTop: 18}}>
				<line x1={0} x2={W} y1={34} y2={34} stroke={colors.bear} strokeWidth={1.5} strokeDasharray="6 6" />
				<line x1={0} x2={W} y1={96} y2={96} stroke={colors.bull} strokeWidth={1.5} strokeDasharray="6 6" />
				<text x={4} y={28} fill={colors.bear} fontSize={18} style={{fontFamily: fonts.mono}}>70</text>
				<text x={4} y={116} fill={colors.bull} fontSize={18} style={{fontFamily: fonts.mono}}>30</text>
				<path d={d} fill="none" stroke={colors.warning} strokeWidth={4.5} strokeDasharray={450} strokeDashoffset={450 * (1 - prog)} />
				<circle cx={W * 0.62} cy={96} r={8} fill={colors.bull} opacity={prog > 0.6 ? pulse : 0} />
			</svg>
		);
	}
	const bars = [-16, -24, -18, -10, -4, 6, 15, 24, 30, 34, 28, 36];
	const bw = W / bars.length;
	return (
		<svg width={W} height={H} style={{marginTop: 18}}>
			<line x1={0} x2={W} y1={72} y2={72} stroke={colors.hairline} strokeWidth={2} />
			{bars.map((v, i) => {
				const show = prog >= i / bars.length ? 1 : 0.15;
				const h = Math.abs(v) * 1.45;
				return (
					<rect
						key={i}
						x={i * bw + 4}
						y={v >= 0 ? 72 - h : 72}
						width={bw - 8}
						height={h}
						rx={3}
						fill={v >= 0 ? colors.bull : colors.bear}
						opacity={show}
					/>
				);
			})}
		</svg>
	);
};

const RuleCard: React.FC<{title: string; body: string; at: number; color: string; children?: React.ReactNode}> = ({title, body, at: a, color, children}) => {
	const p = useSpring(a);
	return (
		<Card
			style={{
				flex: 1,
				minHeight: 460,
				padding: 34,
				opacity: p,
				transform: `translateY(${(1 - p) * 40}px)`,
				borderColor: alpha(color, 0.55),
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
			}}
		>
			<div>
				<div style={{color, fontFamily: fonts.sans, fontWeight: 700, fontSize: 42, letterSpacing: 1}}>{title}</div>
				<div style={{color: colors.text, fontFamily: fonts.sans, fontSize: 36, marginTop: 16, lineHeight: 1.28}}>{body}</div>
			</div>
			{children}
		</Card>
	);
};

const TheTest: React.FC = () => {
	const f = useCurrentFrame();
	const grid = at('ninety-three perpetual');
	const coded = at('Then we coded');
	const emaAt = at('One, the moving average');
	const rsiAt = at('Two, the R-S-I');
	const macdAt = at('Three, the Mac-D');
	const filter = at('All three get');
	const fourth = at('And then a fourth');
	const gridOut = interpolate(f, [coded - 6, coded + 6], [1, 0], clamp);
	return (
		<Section from={B.test} to={B.exits}>
			<Kicker text="THE TEST" at={B.test} />
			<div style={{position: 'absolute', left: 96, top: 170, opacity: gridOut}}>
				<div style={{color: colors.text, fontFamily: fonts.sans, fontWeight: 700, fontSize: 46, marginBottom: 26, opacity: useIn(B.test)}}>
					EVERY 5-MINUTE CANDLE · <span style={{color: colors.telemetry}}>01 MAY → 31 OCT 2026</span>
				</div>
				<PairGrid fillAt={grid} highlight={f >= at('Bitcoin, Ethereum, Solana') ? ['BTC', 'ETH', 'SOL'] : []} />
			</div>
			<div style={{position: 'absolute', left: 96, width: 1728, top: 150, display: 'flex', gap: 28, opacity: interpolate(f, [coded - 4, coded + 8], [0, 1], clamp)}}>
				<RuleCard title="1 · EMA 9/21" body="Fast average crosses the slow one." at={emaAt} color={colors.telemetry}>
					<RuleMiniViz kind="ema" start={emaAt} />
				</RuleCard>
				<RuleCard title="2 · RSI 30/70" body="Buy back above 30. Sell below 70." at={rsiAt} color={colors.warning}>
					<RuleMiniViz kind="rsi" start={rsiAt} />
				</RuleCard>
				<RuleCard title="3 · MACD" body="MACD line crosses signal line." at={macdAt} color={colors.bull}>
					<RuleMiniViz kind="macd" start={macdAt} />
				</RuleCard>
				<Card
					style={{
						flex: 1,
						minHeight: 460,
						padding: 34,
						opacity: useIn(fourth),
						alignItems: 'center',
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'space-between',
						borderColor: alpha(colors.warning, 0.65),
					}}
				>
					<div style={{color: colors.warning, fontFamily: fonts.sans, fontWeight: 700, fontSize: 42, letterSpacing: 1, alignSelf: 'flex-start'}}>4 · CONTROL</div>
					<Coin start={fourth} land={fourth + 45} side="SHORT" size={186} />
					<div style={{color: colors.text, fontFamily: fonts.sans, fontSize: 34, textAlign: 'center', lineHeight: 1.25}}>Random side, same rate as EMA.</div>
				</Card>
			</div>
			{/* the filter every tutorial adds */}
			<Card style={{position: 'absolute', left: 96, width: 1728, top: 642, padding: '32px 42px', opacity: useIn(filter), borderColor: alpha(colors.telemetry, 0.45)}}>
				<div style={{color: colors.text, fontFamily: fonts.sans, fontWeight: 700, fontSize: 42, letterSpacing: 1}}>
					TREND FILTER · <span style={{color: colors.bull}}>LONG ONLY ABOVE EMA 200</span> · <span style={{color: colors.bear}}>SHORT ONLY BELOW</span>
				</div>
				<div style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 26, marginTop: 12}}>
					SAME REGIME GATE APPLIED TO ALL THREE INDICATOR RULES
				</div>
			</Card>
		</Section>
	);
};

// ---- 5. same exits -----------------------------------------------------------------------------------------------
const Exits: React.FC = () => {
	const f = useCurrentFrame();
	const next = at('We enter at the open');
	const stop = at('The stop goes');
	const target = at('the target one and a half');
	const both = at('If price touches both');
	const fee = at('We charge');
	const real = at('Real scalpers');
	const only = at('So the only thing');
	const y = (r: number) => 560 - r * 148; // R units -> px
	const diagram = interpolate(f, [fee - 6, fee + 6], [1, 0.0], clamp);
	const stopIn = useIn(stop);
	const targetIn = useIn(target);
	return (
		<Section from={B.exits} to={B.before}>
			<Kicker text="SAME EXITS FOR EVERY RULE" at={B.exits} />
			<div style={{position: 'absolute', inset: 0, opacity: diagram}}>
				<Card style={{position: 'absolute', left: 96, top: 185, width: 470, padding: 40, borderColor: alpha(colors.telemetry, 0.5)}}>
					<div style={{color: colors.telemetry, fontFamily: fonts.mono, fontSize: 24, letterSpacing: 2}}>TRADE TICKET · FIXED</div>
					<div style={{marginTop: 26, display: 'flex', flexDirection: 'column', gap: 22, fontFamily: fonts.mono}}>
						<div style={{opacity: useIn(next)}}>
							<div style={{color: colors.muted, fontSize: 24}}>ENTRY</div>
							<div style={{color: colors.telemetry, fontSize: 42, fontWeight: 700}}>NEXT OPEN</div>
						</div>
						<div style={{opacity: stopIn, paddingTop: 16, borderTop: `1px solid ${colors.hairline}`}}>
							<div style={{color: colors.muted, fontSize: 24}}>STOP LOSS</div>
							<div style={{color: colors.bear, fontSize: 42, fontWeight: 700}}>1.0× ATR</div>
						</div>
						<div style={{opacity: targetIn, paddingTop: 16, borderTop: `1px solid ${colors.hairline}`}}>
							<div style={{color: colors.muted, fontSize: 24}}>TARGET</div>
							<div style={{color: colors.bull, fontSize: 42, fontWeight: 700}}>1.5× ATR</div>
						</div>
					</div>
				</Card>
				<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
					{/* shaded TP & SL bands */}
					<rect x={820} y={y(1.5)} width={640} height={y(0) - y(1.5)} fill={alpha(colors.bull, 0.09)} opacity={targetIn} />
					<rect x={820} y={y(0)} width={640} height={y(-1) - y(0)} fill={alpha(colors.bear, 0.09)} opacity={stopIn} />
					{/* the signal candle and the next open */}
					<rect x={650} y={480} width={48} height={120} fill={colors.bull} opacity={useIn(B.exits)} rx={3} />
					<text x={674} y={648} textAnchor="middle" fill={colors.muted} fontSize={24} style={{fontFamily: fonts.mono}} opacity={useIn(B.exits)}>SIGNAL CLOSE</text>
					<g opacity={useIn(next)}>
						<rect x={734} y={y(0) - 10} width={48} height={20} fill={colors.telemetry} rx={2} />
						<text x={820} y={y(0) - 26} textAnchor="start" fill={colors.telemetry} fontSize={26} fontWeight={700} style={{fontFamily: fonts.mono}}>NEXT OPEN</text>
						<line x1={820} x2={1460} y1={y(0)} y2={y(0)} stroke={colors.telemetry} strokeWidth={3.5} />
						<text x={1480} y={y(0) + 11} fill={colors.telemetry} fontSize={36} fontWeight={700} style={{fontFamily: fonts.mono}}>ENTRY</text>
					</g>
					<g opacity={stopIn}>
						<line x1={820} x2={1460} y1={y(-1)} y2={y(-1)} stroke={colors.bear} strokeWidth={3.5} strokeDasharray="12 8" />
						<text x={1480} y={y(-1) + 11} fill={colors.bear} fontSize={36} fontWeight={700} style={{fontFamily: fonts.mono}}>STOP −1× ATR</text>
					</g>
					<g opacity={targetIn}>
						<line x1={820} x2={1460} y1={y(1.5)} y2={y(1.5)} stroke={colors.bull} strokeWidth={3.5} strokeDasharray="12 8" />
						<text x={1480} y={y(1.5) + 11} fill={colors.bull} fontSize={36} fontWeight={700} style={{fontFamily: fonts.mono}}>TARGET +1.5× ATR</text>
					</g>
					<g opacity={useIn(both)}>
						<line x1={1040} x2={1040} y1={y(1.6)} y2={y(-1.1)} stroke={colors.warning} strokeWidth={5} />
						<text x={1065} y={y(1.2)} fill={colors.warning} fontSize={30} fontWeight={700} style={{fontFamily: fonts.mono}}>BOTH HIT IN 1 CANDLE → LOSS</text>
					</g>
				</svg>
			</div>
			{/* the fee */}
			<div style={{position: 'absolute', left: 96, width: 1728, top: 190, opacity: interpolate(f, [fee - 4, fee + 8, only - 6, only + 6], [0, 1, 1, 0], clamp)}}>
				<div style={{display: 'flex', gap: 28, alignItems: 'center', fontFamily: fonts.mono, fontWeight: 700}}>
					<Card style={{flex: 1, padding: '38px 42px'}}>
						<div style={{color: colors.muted, fontSize: 30}}>MAKER IN</div>
						<div style={{color: colors.text, fontSize: 92, marginTop: 8, ...monoNumeric}}>0.02%</div>
					</Card>
					<div style={{color: colors.muted, fontSize: 72}}>+</div>
					<Card style={{flex: 1, padding: '38px 42px'}}>
						<div style={{color: colors.muted, fontSize: 30}}>MARKET OUT</div>
						<div style={{color: colors.text, fontSize: 92, marginTop: 8, ...monoNumeric}}>0.05%</div>
					</Card>
					<div style={{color: colors.muted, fontSize: 72}}>=</div>
					<Card style={{flex: 1.15, padding: '38px 42px', borderColor: colors.warning}}>
						<div style={{color: colors.warning, fontSize: 30}}>CHARGED HERE</div>
						<div style={{color: colors.warning, fontSize: 104, marginTop: 8, ...monoNumeric}}>0.07%</div>
					</Card>
				</div>
				<Card style={{marginTop: 40, padding: '34px 42px', opacity: useIn(real), borderColor: alpha(colors.bear, 0.55)}}>
					<div style={{fontFamily: fonts.mono, fontSize: 40, color: colors.text, fontWeight: 700}}>
						MARKET IN + MARKET OUT = <span style={{color: colors.bear}}>0.10%</span> <span style={{color: colors.muted, fontWeight: 400}}>· VS 0.07% TESTED (GENEROUS CASE)</span>
					</div>
				</Card>
			</div>
			<div style={{opacity: interpolate(f, [fee - 4, fee + 8, only - 6, only + 6], [0, 1, 1, 0], clamp)}}>
				<SourceLine text="FEES: BINANCE USD-M REGULAR USER, MAKER 0.02% / TAKER 0.05% (BINANCE FUTURES FEE FAQ)" at={fee} />
			</div>
			{/* only the entry differs */}
			<div style={{position: 'absolute', left: 96, width: 1728, top: 210, display: 'flex', gap: 28, opacity: useIn(only)}}>
				{RULES.map((r) => (
					<Card key={r.key} style={{flex: 1, padding: 38, minHeight: 420, display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
						<div style={{color: colors.telemetry, fontFamily: fonts.sans, fontWeight: 700, fontSize: 42}}>{r.label}</div>
						<div style={{fontFamily: fonts.mono, fontSize: 32, marginTop: 22, lineHeight: 1.75}}>
							<div style={{color: colors.warning, fontWeight: 700}}>ENTRY · DIFFERENT</div>
							<div style={{color: colors.muted}}>STOP · SAME</div>
							<div style={{color: colors.muted}}>TARGET · SAME</div>
							<div style={{color: colors.muted}}>FEE · SAME</div>
						</div>
					</Card>
				))}
			</div>
		</Section>
	);
};

// ---- 6. before fees ----------------------------------------------------------------------------------------------
const BeforeFees: React.FC = () => {
	const f = useCurrentFrame();
	const overlap = at('they all overlap');
	const wins = at('Look at the win');
	const sixty = at('reaches the stop first');
	const cues = [at('The moving average cross, minus'), at('Mac-D, zero'), at('R-S-I, minus'), at('And the coin flip, minus')];
	const chartOut = interpolate(f, [wins - 6, wins + 6], [1, 0], clamp);
	return (
		<Section from={B.before} to={B.trade}>
			<Kicker text="AVERAGE RESULT PER TRADE · BEFORE FEES · 5-MINUTE" at={B.before} />
			<div style={{position: 'absolute', left: 260, top: 180, opacity: chartOut}}>
				<ZeroBars width={1400} height={660} domain={[-0.03, 0.03]} tick={0.01} ciAt={overlap}
					bars={RULES.map((r, i) => ({label: r.label, value: R(`5m|${r.key}`).avg_gross_pct, at: cues[i], ci: R(`5m|${r.key}`).gross_ci95 as [number, number], color: r.key === 'random' ? colors.warning : undefined}))} />
			</div>
			<Card style={{position: 'absolute', left: 1450, top: 175, width: 380, padding: '24px 28px', opacity: useIn(overlap) * chartOut, borderColor: alpha(colors.warning, 0.6)}}>
				<div style={{color: colors.warning, fontFamily: fonts.mono, fontSize: 28, lineHeight: 1.5, fontWeight: 700}}>
					━ 95% RANGE<br />ALL FOUR OVERLAP<br />ALL FOUR TOUCH ZERO
				</div>
			</Card>
			{/* win rates */}
			<div style={{position: 'absolute', left: 96, width: 1728, top: 185, display: 'flex', gap: 28, opacity: useIn(wins)}}>
				{RULES.map((r) => (
					<Card key={r.key} style={{flex: 1, padding: 38}}>
						<div style={{color: colors.muted, fontFamily: fonts.sans, fontWeight: 700, fontSize: 38, letterSpacing: 1}}>{r.label}</div>
						<div style={{marginTop: 8}}>
							<Roll value={R(`5m|${r.key}`).win_rate_pct} at={wins + 4} dp={1} suffix="%" size={102} color={r.key === 'random' ? colors.warning : colors.text} />
						</div>
						<div style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 28, marginTop: 8}}>WIN RATE</div>
					</Card>
				))}
			</div>
			<Card style={{position: 'absolute', left: 96, top: 530, width: 1728, padding: 42, opacity: useIn(sixty), borderColor: alpha(colors.warning, 0.6)}}>
				<div style={{fontFamily: fonts.sans, fontSize: 44, color: colors.text, fontWeight: 700}}>
					Random price, target 1.5× the stop: target first <span style={{color: colors.bull}}>40%</span> · stop first <span style={{color: colors.bear}}>60%</span>
				</div>
				<div style={{fontFamily: fonts.mono, fontSize: 30, color: colors.muted, marginTop: 18}}>1 ÷ (1 + 1.5) = 0.40 · ZERO EDGE LOOKS LIKE A 40% WIN RATE WITH THIS BRACKET</div>
				<div style={{fontFamily: fonts.mono, fontSize: 28, color: colors.warning, marginTop: 18, fontWeight: 700}}>OUR CALCULATION</div>
			</Card>
			<SourceLine text={BACKTEST} at={B.before} />
		</Section>
	);
};

// ---- 7. one real trade -------------------------------------------------------------------------------------------
const OneTrade: React.FC = () => {
	const f = useCurrentFrame();
	const tr = T.trade;
	const signal = at('At one forty');
	const run = at('Bitcoin has already climbed');
	const enters = at('The trade enters');
	const twenty = at('Twenty minutes later');
	const out = at('The trade is out');
	const fee = at('Then the fee');
	const ten = at('And by ten to four');
	const idea = at('The idea was not wrong');
	const res = interpolate(f, [out, out + 10], [0, 1], clamp);
	const feeP = interpolate(f, [fee, fee + 16], [0, 1], {...clamp, easing: ease});
	return (
		<Section from={B.trade} to={B.feeall} push={0.025}>
			<Kicker text="ONE REAL TRADE · EMA 9/21 LONG" at={B.trade} />
			<div style={{position: 'absolute', left: 96, top: 150}}>
				<TradeChart width={1340} height={760}
					reveal={{frames: [B.trade, signal, enters, twenty + 20, ten, ten + 40], candles: [6, tr.signal_index + 0.99, tr.entry_index + 0.2, tr.stop_index + 0.99, tr.stop_index + 1, 74.99]}}
					cues={{run, levels: enters, sweep: twenty + 16, zoomIn: twenty, zoomOut: fee + 10, target: ten + 30}} />
			</div>
			<Card style={{position: 'absolute', left: 1470, top: 220, width: 360, padding: 30, opacity: useIn(signal)}}>
				<div style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 24}}>SIGNAL · 01:40 UTC</div>
				<div style={{color: colors.bull, fontFamily: fonts.sans, fontWeight: 700, fontSize: 44, marginTop: 8}}>LONG</div>
				<div style={{color: colors.text, fontFamily: fonts.mono, fontSize: 26, marginTop: 18, lineHeight: 1.6, opacity: useIn(enters)}}>
					ENTRY {tr.entry.toLocaleString('en-US')}<br />
					<span style={{color: colors.bear}}>STOP {tr.stop.toLocaleString('en-US')}</span><br />
					<span style={{color: colors.bull}}>TARGET {tr.target.toLocaleString('en-US')}</span>
				</div>
				<div style={{marginTop: 22, opacity: res}}>
					<div style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 24}}>RESULT</div>
					<div style={{color: colors.bear, fontSize: 56, fontWeight: 700, ...monoNumeric}}>{pct(tr.gross_pct + (tr.net_pct - tr.gross_pct) * feeP, 2)}</div>
					<div style={{color: colors.warning, fontFamily: fonts.mono, fontSize: 24, opacity: feeP}}>INCL. 0.07% FEE</div>
				</div>
				<div style={{marginTop: 22, color: colors.text, fontFamily: fonts.mono, fontSize: 24, lineHeight: 1.6, opacity: useIn(idea)}}>
					<span style={{color: colors.warning}}>LATE ENTRY</span><br />
					<span style={{color: colors.bear}}>STOP INSIDE THE NOISE</span><br />
					<span style={{color: colors.warning}}>FEE PAID ANYWAY</span>
				</div>
			</Card>
			<SourceLine text="BINANCE USD-M ARCHIVE · BTCUSDT 5M · 01 JUL 2026 · SAME RULES AS THE BACKTEST" at={B.trade} />
		</Section>
	);
};

// ---- 8. the fee on every trade -----------------------------------------------------------------------------------
const FeeAll: React.FC = () => {
	const f = useCurrentFrame();
	const stack = at('Stack every trade');
	const total = at('The total loss is');
	const month = at('It was not one');
	const coin = at('Coin by coin');
	const eq = S.equity_5m_ema_net_007;
	const t0 = eq[0][0];
	const t1 = eq[eq.length - 1][0];
	const W = 1500, H = 540;
	const x = scaleLinear().domain([t0, t1]).range([0, W]);
	const y = scaleLinear().domain([Math.min(...eq.map((p) => p[1])), 0]).range([H, 0]);
	const prog = interpolate(f, [stack, total + 20], [0, 1], {...clamp, easing: ease});
	const k = Math.max(1, Math.floor(prog * (eq.length - 1)));
	const d = eq.slice(0, k + 1).map((p, i) => `${i ? 'L' : 'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join('');
	const last = eq[k];
	const areaD = `M${x(eq[0][0]).toFixed(1)},${y(0).toFixed(1)} ${d.replace(/^M/, 'L')} L${x(last[0]).toFixed(1)},${y(0).toFixed(1)} Z`;
	const drop = interpolate(f, [B.feeall + 20, B.feeall + 50], [0, 1], {...clamp, easing: ease});
	const phase = (a: number, b: number) => interpolate(f, [a - 6, a + 6, b - 6, b + 6], [0, 1, 1, 0], clamp);
	return (
		<Section from={B.feeall} to={B.why}>
			<Kicker text="AFTER THE 0.07% FEE" at={B.feeall} />
			<div style={{position: 'absolute', left: 260, top: 180, opacity: phase(B.feeall, stack)}}>
				<ZeroBars width={1400} height={660} domain={[-0.1, 0.02]} tick={0.02}
					bars={RULES.map((r) => ({label: r.label, value: R(`5m|${r.key}`).avg_gross_pct - 0.07 * drop, at: B.feeall}))} />
			</div>
			<div style={{position: 'absolute', left: 220, top: 180, opacity: phase(stack, month)}}>
				<div style={{color: colors.text, fontFamily: fonts.sans, fontWeight: 700, fontSize: 40, marginBottom: 20}}>
					EMA 9/21 · EVERY TRADE STACKED · NO COMPOUNDING · <span style={{color: colors.muted}}>IN POSITION SIZES</span>
				</div>
				<svg width={W + 260} height={H + 40} style={{overflow: 'visible'}}>
					<defs>
						<linearGradient id="eqFill" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor={colors.bear} stopOpacity={0.28} />
							<stop offset="100%" stopColor={colors.bear} stopOpacity={0} />
						</linearGradient>
					</defs>
					{[0, -20, -40, -60, -80].map((v) => (
						<g key={v}>
							<line x1={0} x2={W} y1={y(v * 100)} y2={y(v * 100)} stroke={colors.hairline} strokeWidth={1.5} />
							<text x={-14} y={y(v * 100) + 8} textAnchor="end" fill={colors.muted} fontSize={24} style={{fontFamily: fonts.mono}}>{v === 0 ? '0' : `−${-v}`}</text>
						</g>
					))}
					<path d={areaD} fill="url(#eqFill)" />
					<path d={d} fill="none" stroke={colors.bear} strokeWidth={4.5} />
					<circle cx={x(last[0])} cy={y(last[1])} r={9} fill={colors.bear} />
					<text x={x(last[0]) + 20} y={y(last[1]) + 10} fill={colors.bear} fontSize={44} fontWeight={700} style={{fontFamily: fonts.mono}}>{`−${(-last[1] / 100).toFixed(1)}`}</text>
				</svg>
				<div style={{display: 'flex', gap: 60, marginTop: 14, fontFamily: fonts.mono, fontSize: 38}}>
					<span style={{opacity: useIn(stack + 60), color: colors.warning, fontWeight: 700}}>FEES ALONE · −{((R('5m|ema_cross').n * 0.07) / 100).toFixed(1)}</span>
					<span style={{opacity: useIn(total), color: colors.bear, fontWeight: 700}}>TOTAL · −{(-R('5m|ema_cross').sum_net_007_pct / 100).toFixed(1)}</span>
				</div>
			</div>
			<div style={{position: 'absolute', left: 96, width: 1728, top: 225, opacity: phase(month, coin)}}>
				<div style={{color: colors.text, fontFamily: fonts.sans, fontWeight: 700, fontSize: 44, marginBottom: 34}}>EMA 9/21 · AVERAGE PER TRADE AFTER FEES, BY MONTH</div>
				<div style={{display: 'flex', gap: 24}}>
					{MONTHS.map((m, i) => {
						const v = S.monthly_net_007[`5m|ema_cross|${m}`];
						const p = useIn(month + 8 + i * 6, 10);
						return (
							<Card key={m} style={{flex: 1, padding: '36px 26px', opacity: p, borderColor: alpha(colors.bear, 0.6), background: alpha(colors.bear, 0.1)}}>
								<div style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 30}}>{['MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT'][i]} 2026</div>
								<div style={{color: colors.bear, fontSize: 56, fontWeight: 700, marginTop: 14, ...monoNumeric}}>{pct(v)}</div>
							</Card>
						);
					})}
				</div>
			</div>
			<div style={{position: 'absolute', left: 96, top: 170, opacity: useIn(coin)}}>
				<div style={{display: 'flex', gap: 26, marginBottom: 30}}>
					{RULES.map((r, i) => {
						const a = [at('the moving average rule was profitable'), at('Mac-D on two'), at('R-S-I on thirteen'), at('The coin flip, on none')][i];
						return (
							<Card key={r.key} style={{padding: '18px 28px', opacity: useIn(a), display: 'flex', gap: 20, alignItems: 'baseline'}}>
								<span style={{color: colors.muted, fontFamily: fonts.sans, fontWeight: 700, fontSize: 30}}>{r.label}</span>
								<span style={{color: R(`5m|${r.key}`).symbols_profitable_net_007 > 0 ? colors.bull : colors.bear, fontSize: 48, fontWeight: 700, ...monoNumeric}}>{R(`5m|${r.key}`).symbols_profitable_net_007} / 93</span>
							</Card>
						);
					})}
				</div>
				<PairGrid fillAt={coin} colorAt={coin + 10} values={S.per_symbol_net_007['5m|ema_cross']} />
			</div>
			<SourceLine text={`${BACKTEST} · FEE 0.07%`} at={B.feeall} />
		</Section>
	);
};

// ---- 9. why five minutes -----------------------------------------------------------------------------------------
const WhyFive: React.FC = () => {
	const f = useCurrentFrame();
	const ate = at('So the fee ate');
	const careful = at('But be careful');
	const one = at('One rule did clear');
	const tfs = ['5m', '15m', '1h'] as const;
	const moves = tfs.map((t) => R(`${t}|ema_cross`).avg_abs_move_pct);
	const maxMove = Math.max(...moves);
	const phase = (a: number, b: number) => interpolate(f, [a - 6, a + 6, b - 6, b + 6], [0, 1, 1, 0], clamp);
	return (
		<Section from={B.why} to={B.limits}>
			<Kicker text="THE FEE AS A SHARE OF THE MOVE" at={B.why} />
			<div style={{position: 'absolute', left: 96, top: 195, opacity: phase(B.why, careful)}}>
				<div style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 32, marginBottom: 34}}>AVERAGE MOVE PER TRADE, ENTRY TO EXIT · EMA RULE</div>
				{tfs.map((t, i) => {
					const w = (moves[i] / maxMove) * 1240;
					const feeW = (0.07 / maxMove) * 1240;
					const p = useIn(B.why + 20 + i * 10, 18);
					return (
						<div key={t} style={{display: 'flex', alignItems: 'center', gap: 32, marginBottom: 50}}>
							<div style={{width: 110, color: colors.text, fontFamily: fonts.sans, fontWeight: 700, fontSize: 48}}>{t.toUpperCase()}</div>
							<div style={{position: 'relative', width: w * p, height: 92, background: alpha(colors.telemetry, 0.35), borderRadius: 8}}>
								<div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: feeW * useIn(ate + i * 8), background: colors.warning, borderRadius: 8}} />
								<div style={{position: 'absolute', left: w * p + 26, top: 18, whiteSpace: 'nowrap', fontFamily: fonts.mono, fontSize: 42, color: colors.text, fontWeight: 700}}>
									{moves[i].toFixed(2)}%<span style={{color: colors.warning, opacity: useIn(ate + i * 8)}}>{`  FEE = ${Math.round(R(`${t}|ema_cross`).fee_share_of_avg_move_net_007_pct)}%`}</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>
			<div style={{position: 'absolute', left: 260, top: 180, opacity: phase(careful, one)}}>
				<div style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 28, marginBottom: 10}}>EMA 9/21 · AVERAGE PER TRADE AFTER FEES</div>
				<ZeroBars width={1300} height={620} domain={[-0.25, 0.05]} tick={0.05}
					bars={tfs.map((t) => ({label: t.toUpperCase(), value: R(`${t}|ema_cross`).avg_net_007_pct, at: careful + 10}))} />
			</div>
			<div style={{position: 'absolute', left: 200, top: 180, opacity: useIn(one)}}>
				<div style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 30, marginBottom: 12}}>
					RSI 30/70 · 1-HOUR · {R('1h|rsi_revert').n} TRADES · AFTER FEES
				</div>
				<ZeroBars width={620} height={620} domain={[-0.25, 0.25]} tick={0.05} ciAt={one + 40}
					bars={[{label: 'RSI 1H', value: R('1h|rsi_revert').avg_net_007_pct, at: one + 10, ci: [R('1h|rsi_revert').gross_ci95[0] - 0.07, R('1h|rsi_revert').gross_ci95[1] - 0.07] as [number, number]}]} />
				<Card style={{position: 'absolute', left: 740, top: 170, width: 820, padding: 42, opacity: useIn(one + 40), borderColor: alpha(colors.warning, 0.6)}}>
					<div style={{fontFamily: fonts.mono, fontSize: 38, color: colors.warning, lineHeight: 1.55, fontWeight: 700}}>
						95% RANGE {pct(R('1h|rsi_revert').gross_ci95[0] - 0.07, 2)} TO {pct(R('1h|rsi_revert').gross_ci95[1] - 0.07, 2)}
					</div>
					<div style={{fontFamily: fonts.sans, fontSize: 44, color: colors.text, fontWeight: 700, marginTop: 18}}>
						TOO FEW TRADES TO CALL AN EDGE
					</div>
				</Card>
			</div>
			<SourceLine text={`${BACKTEST} · 15M AND 1H RESAMPLED FROM THE SAME 5M CANDLES`} at={B.why} />
		</Section>
	);
};

// ---- 10. limits ----------------------------------------------------------------------------------------------------
const Limits: React.FC = () => {
	const tags = [
		{at: at('First, these results'), num: 'LIMIT 01', big: 'RESULTS FLATTERED', small: 'PERFECT NEXT-OPEN FILLS · NO SLIPPAGE'},
		{at: at("Second, we tested today's"), num: 'LIMIT 02', big: 'SURVIVORS ONLY', small: "TODAY'S COIN LIST · DEAD COINS MISSING"},
		{at: at('Third, these are the textbook'), num: 'LIMIT 03', big: 'TEXTBOOK RULES', small: 'NOT DISCRETIONARY CHART READING'},
	];
	const show = at('What it does show');
	return (
		<Section from={B.limits} to={B.maths}>
			<Kicker text="WHAT THIS DOES NOT PROVE" at={B.limits} color={colors.warning} />
			<div style={{position: 'absolute', left: 96, right: 96, top: 185, display: 'flex', gap: 32}}>
				{tags.map((t) => {
					const p = useSpring(t.at);
					return (
						<Card key={t.big} style={{flex: 1, minHeight: 330, padding: 44, opacity: p, transform: `translateY(${(1 - p) * 40}px)`, borderColor: alpha(colors.warning, 0.65), display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
							<div>
								<div style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 24, letterSpacing: 2}}>{t.num}</div>
								<div style={{color: colors.warning, fontFamily: fonts.sans, fontWeight: 700, fontSize: 48, marginTop: 14, lineHeight: 1.1}}>{t.big}</div>
							</div>
							<div style={{color: colors.text, fontFamily: fonts.mono, fontSize: 32, marginTop: 22, lineHeight: 1.4}}>{t.small}</div>
						</Card>
					);
				})}
			</div>
			<Card style={{position: 'absolute', left: 96, right: 96, top: 560, padding: 44, opacity: useIn(show), borderColor: alpha(colors.telemetry, 0.5)}}>
				<div style={{color: colors.muted, fontFamily: fonts.mono, fontSize: 30}}>WHAT IT DOES SHOW · 5-MINUTE CHARTS</div>
				<div style={{display: 'flex', gap: 80, marginTop: 22, fontFamily: fonts.sans, fontWeight: 700, fontSize: 52}}>
					<span style={{color: colors.text}}>ENTRY SIGNAL <span style={{color: colors.warning}}>≈ COIN FLIP</span></span>
					<span style={{color: colors.text}}>FEE <span style={{color: colors.bear}}>≈ 13% OF THE MOVE</span></span>
				</div>
			</Card>
		</Section>
	);
};

// ---- 11. what changes the maths -----------------------------------------------------------------------------------
const Maths: React.FC = () => {
	const cost = at('The cost of each trade');
	const size = at('the size of each');
	const limit = at('A limit order that rests');
	const planned = at('A trade planned around');
	const promise = at('Neither is a promise');
	return (
		<Section from={B.maths} to={B.close}>
			<Kicker text="ONLY TWO VARIABLES LEFT" at={B.maths} />
			<div style={{position: 'absolute', left: 96, right: 96, top: 190, display: 'flex', gap: 36}}>
				<Card style={{flex: 1, minHeight: 390, padding: 48, opacity: useIn(cost), borderColor: alpha(colors.warning, 0.55), display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
					<div style={{color: colors.warning, fontFamily: fonts.sans, fontWeight: 700, fontSize: 54}}>1 · COST PER TRADE</div>
					<div style={{fontFamily: fonts.mono, fontSize: 38, color: colors.text, marginTop: 28, opacity: useIn(limit), lineHeight: 1.55}}>
						LIMIT ORDER RESTING ON THE BOOK<br />
						<span style={{color: colors.bull, fontWeight: 700}}>MAKER 0.02%</span> <span style={{color: colors.muted}}>vs</span> <span style={{color: colors.bear, fontWeight: 700}}>TAKER 0.05%</span>
					</div>
				</Card>
				<Card style={{flex: 1, minHeight: 390, padding: 48, opacity: useIn(size), borderColor: alpha(colors.telemetry, 0.55), display: 'flex', flexDirection: 'column', justifyContent: 'space-between'}}>
					<div style={{color: colors.telemetry, fontFamily: fonts.sans, fontWeight: 700, fontSize: 54}}>2 · SIZE OF THE MOVE</div>
					<div style={{fontFamily: fonts.mono, fontSize: 38, color: colors.text, marginTop: 28, opacity: useIn(planned), lineHeight: 1.55}}>
						LEVEL PLANNED BEFORE PRICE ARRIVES<br />
						<span style={{color: colors.muted}}>NOT A REACTION AFTER A CANDLE CLOSES</span>
					</div>
				</Card>
			</div>
			<Card style={{position: 'absolute', left: 96, right: 96, top: 635, padding: '32px 44px', opacity: useIn(promise), borderColor: alpha(colors.warning, 0.55)}}>
				<div style={{fontFamily: fonts.mono, fontSize: 38, color: colors.warning, fontWeight: 700}}>
					NOT A PROMISE · THE TWO THINGS THIS TEST SAYS MATTER
				</div>
			</Card>
		</Section>
	);
};

// ---- 12. close (end-screen safe: logo only) ------------------------------------------------------------------------
const Close: React.FC = () => {
	const f = useCurrentFrame();
	const p = useSpring(B.close);
	return (
		<Section from={B.close} to={DURATION + 20} push={0.025}>
			<AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', paddingBottom: 40}}>
				<div style={{opacity: p * interpolate(f, [AUDIO_END, DURATION], [1, 0.85], clamp), transform: `scale(${0.85 + 0.15 * p})`}}>
					<Monogram size={260} />
				</div>
				<div style={{marginTop: 30, fontFamily: fonts.sans, fontWeight: 700, fontSize: 64, letterSpacing: 6, color: colors.text, opacity: p}}>
					LUMIN <span style={{color: colors.telemetry}}>FUTURES</span>
				</div>
			</AbsoluteFill>
		</Section>
	);
};

export const EP01_DURATION = DURATION;

export const Ep01: React.FC<{withAudio?: boolean}> = ({withAudio = false}) => (
	<Stage design={canvas.long}>
		<TerminalBackdrop>
			<BackgroundTape
				candles={T.candles}
				duration={DURATION}
				hideRanges={[
					[B.cold, at('After fees')],
					[B.ident, B.premise],
					[B.trade, B.feeall],
					[END_SCREEN - 15, DURATION],
				]}
			/>
			{withAudio && <Audio src={staticFile('ep01/master.wav')} />}
			<ColdOpen />
			<Ident />
			<Premise />
			<TheTest />
			<Exits />
			<BeforeFees />
			<OneTrade />
			<FeeAll />
			<WhyFive />
			<Limits />
			<Maths />
			<Close />
			<TerminalChrome
				sections={CHROME_SECTIONS}
				identRange={[B.ident, B.premise]}
				endScreen={END_SCREEN}
			/>
			<Footer />
		</TerminalBackdrop>
	</Stage>
);
