# ep01 — narration script v2: 5-Minute Scalping Was No Better Than a Coin Flip

> v2, 23 NOV 2026 (channel name added the same day: Lumin Futures): the owner's five fixes on v1 (fee wording, trader decimals and "Mac-D" for Reid, a real BTCUSDT
> trade on screen, the cumulative fee line, the Episode 2 bridge). This file is the RECORDING source (spoken forms:
> Mac-D, decimals in words). Captions use the display forms in vo/captions.txt (MACD, EMA, 0.07%).
> Every figure is a row in claims.csv. Cue lines are stripped before recording. Runtime about 7:30.
> DisclaimerFooter runs under every chart segment (0:00–7:15); it is off for the last 15 s (end-screen zone).

## 0:00 — Cold open

[[CUE: CandleReplay 5m — a candle closes, EMA 9 crosses EMA 21, a LONG ticket prints — on "rules"]]
[[CUE: coin flip beside the chart, landing on the same LONG — on "coin flip"]]
We ran the three most popular five-minute scalping rules on one hundred and seventeen thousand crypto futures trades, and a coin flip did just as well.

[[CUE: KineticCallout counter 0 → 93 pairs; 92 grey out, 1 stays green — on "one"]]
After fees, out of ninety-three coins, the best-known rule made money on exactly one.

[[CUE: channel ident: Lumin Futures logo resolves on the grid, under one second — on "Lumin Futures"]]
This is Lumin Futures. We test trading ideas on real futures data, with the fees left in.

This is not an opinion about scalping. It is six months of Binance futures candles, the same exits for every rule, and the fee charged on every single trade. Here is what the data showed, and why it happens.

## 0:35 — The test

[[CUE: grid of 93 tickers fills the screen, date bar 01 MAY → 31 OCT 2026 — on "ninety-three"]]
We took every five-minute candle from the first of May to the end of October, twenty twenty-six, for ninety-three perpetual futures pairs on Binance. Bitcoin, Ethereum, Solana, and ninety other coins, straight from Binance's own public archive.

[[CUE: three rule cards slide in, one per sentence — on "E-M-A", "R-S-I", "Mac-D"]]
Then we coded the three rules you will find in almost every scalping tutorial. One, the moving average cross, the nine E-M-A crossing the twenty-one E-M-A. Two, the R-S-I reversal, buying when R-S-I climbs back above thirty and selling when it drops back below seventy. Three, the Mac-D cross, when the Mac-D line crosses its signal line.

[[CUE: EMA 200 line draws across the chart; longs only above it, shorts only below — on "two hundred"]]
All three get the filter every tutorial adds. Only buy above the two hundred E-M-A, only sell below it.

[[CUE: fourth card, a coin, labelled CONTROL — on "fourth"]]
And then a fourth strategy that should not work at all. A coin flip. Random candles, a random direction, traded just as often as the moving average rule.

## 1:40 — Same exits for everyone

[[CUE: trade ticket: ENTRY next open, STOP 1 × ATR, TARGET 1.5 × ATR — on "stop"]]
Every trade, from every rule, is managed the same way. The signal has to appear on a closed candle. We enter at the open of the next candle, so nothing peeks into the future. The stop goes one average true range away, the target one and a half ranges away. If price touches both inside one candle, we count the loss.

[[CUE: fee ticker 0.02% maker + 0.05% taker = 0.07% round trip; a second, dimmer ticker 0.10% — on "zero point zero seven"]]
We charge zero point zero seven percent round-trip. That is Binance's standard rate when one side gets a maker fill and the other is a market order. Real scalpers using market entries and stop-losses often pay zero point one zero percent, so this test is actually generous.

So the only thing that differs between the four strategies is the entry. That is the whole question. Does the entry signal know anything?

## 2:40 — The result before fees

[[CUE: DatasetChart bars, four strategies, average result per trade before fees, all hugging zero — on "zero"]]
Before fees, here is the average result per trade. The moving average cross, minus zero point zero zero four percent. Mac-D, zero. R-S-I, minus zero point zero zero six percent. And the coin flip, minus zero point zero zero five percent.

[[CUE: confidence ranges draw over the bars and overlap — on "overlap"]]
Those differences are noise. Draw the statistical range around each one and they all overlap, and all of them sit on zero. Over one hundred and seventeen thousand trades, the most popular entry signal on a five-minute chart did exactly what a random entry did.

[[CUE: win-rate counters 39.7 / 39.8 / 38.7 / 39.9 % — on "forty"]]
Look at the win rates. All four win about forty percent of the time. That is not a coincidence. With a target one and a half times farther than the stop, price that moves at random reaches the stop first about sixty percent of the time. Forty percent wins is exactly what no edge looks like with this setup.

## 3:45 — One real trade

[[CUE: CandleReplay of data/market/ep01_sample_trade.json, BTCUSDT 5m, 01 JUL 2026; candles print to 01:40 UTC — on "Bitcoin"]]
Here is what that looks like on one real trade. Bitcoin, the first of July, twenty twenty-six, on the five-minute chart.

[[CUE: bracket from the six-candle low to the 01:40 close; DataPin "+872" — on "already"]]
[[CUE: EMA 9 crosses EMA 21 on the 01:40 candle — on "cross"]]
At one forty in the morning, U-T-C, the nine E-M-A crosses above the twenty-one. A textbook long. But look at where it fires. Bitcoin has already climbed about eight hundred and seventy dollars off its low in the last half hour. The signal only arrives after the move it is reacting to.

[[CUE: entry line at 58,872.1, stop 58,681.3 (bear), target 59,158.3 (bull) — on "enters"]]
The trade enters at the next open, fifty-eight thousand eight hundred and seventy-two. The stop sits one average range below, the target one and a half above.

[[CUE: camera zooms into the 02:05 candle; SweepZone on the wick through the stop — on "wick"]]
Twenty minutes later, a single wick dips through the stop by less than a third of a range. Ordinary noise for that hour. The trade is out, down zero point three two percent.

[[CUE: fee block drops the result to −0.39% — on "fee"]]
Then the fee. Minus zero point three nine percent.

[[CUE: candles keep printing; price passes the old target at 03:50 — on "target"]]
And by ten to four, Bitcoin trades straight through the old target. The idea was not wrong. The entry was late, the stop sat inside the noise, and the fee was charged either way.

## 4:20 — Then the fee, on every trade

[[CUE: each bar drops by the same fee block, all four end in the red — on "charge"]]
Now charge the fee on every trade. Every strategy loses, about zero point zero seven percent per trade, because that is the fee and there was no edge to pay it.

[[CUE: equity curve of the moving average rule, all trades stacked, no compounding, sliding down — on "eighty-two"]]
Stack every trade the moving average rule took across all ninety-three pairs together, without compounding, and the fees alone come to more than eighty-two full position sizes. The total loss is more than eighty-seven.

[[CUE: month strip MAY → OCT, every month red for the moving average rule — on "every month"]]
It was not one bad month either. Every month from May to October was negative for the moving average rule after fees.

[[CUE: 93-pair grid, green for profitable after fees: EMA 1, MACD 2, RSI 13, coin 0 — on "one", "two", "thirteen"]]
Coin by coin, after fees, the moving average rule was profitable on one pair out of ninety-three. Mac-D on two. R-S-I on thirteen, from far fewer trades. The coin flip, on none.

## 5:15 — Why five minutes is the worst place to pay a fee

[[CUE: average move per trade, 5m vs 15m vs 1h, drawn as bars — on "average"]]
Here is the part most scalping videos skip. A fee is a fixed cost, but a five-minute trade is a small move. On these coins, the average five-minute trade moved about half a percent from entry to exit.

[[CUE: KineticCallout 13% on 5m, 8% on 15m, 4% on 1h — on "thirteen percent"]]
So the fee ate about thirteen percent of the average move. Run the same rules on fifteen-minute candles and the fee is about eight percent of the move. On one-hour candles, about four percent.

[[CUE: same three bars, all still below zero after fees — on "still"]]
But be careful with what that means. The slower charts did not rescue these rules. On fifteen minutes and one hour, the same entries still lost after fees. A slower chart makes the fee smaller. It does not create an edge that was never there.

[[CUE: one small green bar, RSI on 1h, with a huge error bar — on "eight hundred"]]
One rule did clear the fee. R-S-I on the one-hour chart, by about zero point zero one percent per trade, over eight hundred and forty-one trades. The statistical range on that runs from a clear loss to a clear gain. That is not an edge. That is not enough trades to know.

## 6:20 — What this does and does not prove

[[CUE: three caveat tags pinned to the chart, warning colour — on "optimistic"]]
Three honest limits. First, these results are optimistic. We gave every trade a perfect entry at the next open and no slippage, and real fills are worse. Second, we tested today's list of coins across six months, and coins that died along the way are not in it. Third, these are the textbook rules, not any one trader's personal system, and this says nothing about a skilled trader reading the chart by hand.

What it does show is narrower and harder to argue with. The entry signals that most tutorials teach, on the timeframe most tutorials use, carried no measurable information about the next move. And on that timeframe, the fee is a large slice of every trade.

## 7:00 — What actually changes the maths

[[CUE: the fee block splits: maker 0.02% vs taker 0.05% — on "limit order"]]
If there is no edge in the entry, only two things change the result. The cost of each trade, and the size of each trade's move. A limit order that rests on the book pays the lower fee. A trade planned around a level before price gets there, instead of a reaction after a candle closes, can aim for a larger move with the same risk.

[[CUE: end-screen safe zone from here: no critical text, no DisclaimerFooter, in the last 15 seconds]]
Neither is a promise. They are the two things this test says matter.

Next, we test pre-planned limit levels on the exact same six months of data. Subscribe to see if the maths finally flips.

This has been Lumin Futures.
