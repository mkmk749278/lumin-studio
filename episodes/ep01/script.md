# ep01 — narration script: 5-Minute Scalping Was No Better Than a Coin Flip

> Status: draft for the owner's approval (narration gate). Opening written first and checked against the promise.
> Every figure is a row in `claims.csv`. Spoken text only below the headings; cue lines are stripped before
> recording. Target about nine minutes at about one hundred fifty words a minute.

## 0:00 — Cold open (promise check: the coin flip, the 93 pairs, after fees)

[[CUE: CandleReplay 5m — a candle closes, EMA 9 crosses EMA 21, a LONG ticket prints — on "rules"]]
[[CUE: coin flip beside the chart, landing on the same LONG — on "coin flip"]]
We ran the three most popular five-minute scalping rules on one hundred seventeen thousand crypto futures trades, and a coin flip did just as well.

[[CUE: KineticCallout counter 0 → 93 pairs; 92 grey out, 1 stays green — on "one"]]
After fees, out of ninety-three coins, the best-known rule made money on exactly one.

This is not an opinion about scalping. It is six months of Binance futures candles, the same exits for every rule, and the fee charged on every single trade. Here is what the data showed, and why it happens.

## 0:40 — The test

[[CUE: grid of 93 tickers fills the screen, date bar 01 MAY → 31 OCT 2026 — on "ninety-three"]]
We took every five-minute candle from the first of May to the end of October, twenty twenty-six, for ninety-three perpetual futures pairs on Binance. Bitcoin, Ethereum, Solana, and ninety other coins, straight from Binance's own public archive.

[[CUE: three rule cards slide in, one per sentence — on "E-M-A", "R-S-I", "M-A-C-D"]]
Then we coded the three rules you will find in almost every scalping tutorial. One, the moving average cross, the nine E-M-A crossing the twenty-one E-M-A. Two, the R-S-I reversal, buying when R-S-I climbs back above thirty and selling when it drops back below seventy. Three, the M-A-C-D cross, when the M-A-C-D line crosses its signal line.

[[CUE: EMA 200 line draws across the chart; longs only above it, shorts only below — on "two hundred"]]
All three get the filter every tutorial adds. Only buy above the two hundred E-M-A, only sell below it.

[[CUE: fourth card, a coin, labelled CONTROL — on "fourth"]]
And then a fourth strategy that should not work at all. A coin flip. Random bars, a random direction, traded just as often as the moving average rule.

## 1:50 — Same exits for everyone

[[CUE: LuminAlertCard-style ticket: ENTRY next open, STOP 1 × A-T-R, TARGET 1.5 × A-T-R — on "stop"]]
Every trade, from every rule, is managed the same way. The signal has to appear on a closed candle. We enter at the open of the next candle, so nothing peeks into the future. The stop goes one average true range away, the target one and a half ranges away. If price touches both inside one candle, we count the loss.

[[CUE: fee ticker 0.02 + 0.05 = 0.07 percent of the position — on "seven hundredths"]]
And every trade pays a fee of seven hundredths of a percent of the position, entry and exit together. That is a limit order going in and a market order coming out, at Binance's standard rates. A scalper using market orders both ways pays more, ten hundredths.

So the only thing that differs between the four strategies is the entry. That is the whole question. Does the entry signal know anything?

## 2:50 — The result before fees

[[CUE: DatasetChart bars, four strategies, average result per trade before fees, all hugging zero — on "zero"]]
Before fees, here is the average result per trade. The moving average cross, minus four thousandths of a percent. M-A-C-D, zero. R-S-I, minus six thousandths. And the coin flip, minus five thousandths.

[[CUE: confidence ranges draw over the bars and overlap — on "overlap"]]
Those differences are noise. Draw the statistical range around each one and they all overlap, and all of them sit on zero. Over one hundred seventeen thousand trades, the most popular entry signal on a five-minute chart did exactly what a random entry did.

[[CUE: win-rate counters 39.7 / 39.8 / 38.7 / 39.9 percent — on "forty"]]
Look at the win rates. All four win about forty percent of the time. That is not a coincidence. With a target one and a half times farther than the stop, price that moves at random hits the stop first about sixty percent of the time. Forty percent wins is exactly what no edge looks like with this bracket.

## 4:00 — Then the fee

[[CUE: each bar drops by the same fee block, all four end in the red — on "fee"]]
Now charge the fee. Every strategy loses, about seven hundredths of a percent per trade, because that is the fee and there was no edge to pay it.

[[CUE: equity curve of the moving average rule, sum of all trades after fees, sliding down — on "eighty-seven"]]
Add it up across every trade the moving average rule took, and the losses after fees add up to more than eight thousand seven hundred percent of position size. Not because the rule was terrible. Because it traded a lot, and every trade paid.

[[CUE: month strip MAY → OCT, every month red for the moving average rule — on "every month"]]
It was not one bad month either. Every month from May to October was negative for the moving average rule after fees.

[[CUE: 93-pair grid, green for profitable after fees: EMA 1, MACD 2, RSI 13, coin 0 — on "one", "two", "thirteen"]]
Coin by coin, after fees, the moving average rule was profitable on one pair out of ninety-three. M-A-C-D on two. R-S-I on thirteen, from far fewer trades. The coin flip, on none.

## 5:10 — Why five minutes is the worst place to pay a fee

[[CUE: candle size comparison, 5m vs 15m vs 1h, average move per trade drawn as bars — on "average move"]]
Here is the part most scalping videos skip. A fee is a fixed cost, but a five-minute trade is a small move. On these coins, the average five-minute trade moved about half a percent from entry to exit.

[[CUE: KineticCallout 13% on 5m, 8% on 15m, 4% on 1h — on "thirteen percent"]]
So the fee ate about thirteen percent of the average move. Run the same rules on fifteen-minute candles and the fee is about eight percent of the move. On one-hour candles, about four percent.

[[CUE: same three bars, all still below zero after fees — on "still"]]
But be careful with what that means. The slower charts did not rescue these rules. On fifteen minutes and one hour, the same entries still lost after fees. A slower chart makes the fee smaller. It does not create an edge that was never there.

[[CUE: one small green bar, R-S-I on 1h, with a huge error bar — on "eight hundred"]]
One rule did clear the fee. R-S-I on the one-hour chart, by about one hundredth of a percent per trade, over eight hundred forty-one trades. The statistical range on that runs from a clear loss to a clear gain. That is not an edge. That is not enough trades to know.

## 6:30 — What this does and does not prove

[[CUE: three caveat tags pinned to the chart, warning colour — on "optimistic"]]
Three honest limits. First, these results are optimistic. We gave every trade a perfect entry at the next open and no slippage, and real fills are worse. Second, we tested today's list of coins across six months, and coins that died along the way are not in it. Third, these are the textbook rules, not any one trader's personal system, and this says nothing about a skilled trader reading the chart by hand.

What it does show is narrower and harder to argue with. The entry signals that most tutorials teach, on the timeframe most tutorials use, carried no measurable information about the next move. And on that timeframe, the fee is a large slice of every trade.

## 7:30 — What actually changes the maths

[[CUE: the fee block splits: maker 0.02 vs taker 0.05 — on "limit order"]]
If there is no edge in the entry, only two things change the result. The cost of each trade, and the size of each trade's move. A limit order that rests on the book pays the lower fee. A trade planned around a level before price gets there, instead of a reaction after a candle closes, can aim for a larger move with the same risk.

[[CUE: the coin lands, the chart fades to the grid — on "measure"]]
Neither is a promise. They are the two variables this test says matter. And on this channel, we will measure them the same way we measured this. Every trade counted, the fee charged, the losers shown.

[[CUE: end-screen safe zone from here: no critical text in the last fifteen seconds]]
The data, the rules and the exact settings are in the description. If you trade five-minute charts, run your own rules against a coin flip before you pay another fee.
