Your model assumes you get the price you see. The market disagrees — politely in calm conditions, violently in a crisis. The difference between the price you expected and the price you received is **slippage**, and the single most common reason quantitative strategies fail in production is that they modeled the *ideal* fill instead of the *stressed* one.

Slippage is not a nuisance to round off. In the exact moments your strategy trades most — high volatility, thin books, cascading liquidations — it becomes the dominant term in your P&L. Modeling it honestly is the difference between a strategy that survives its first storm and one that doesn't.

---

## 1. Where Slippage Comes From

Three forces combine to move your fill away from your intended price:

*   **Spread:** you cross the bid–ask to get filled immediately. Half the quoted spread is the minimum cost of demanding liquidity.
*   **Market impact:** your own order consumes resting liquidity and walks the book. Larger orders relative to depth push price against you.
*   **Latency & queue:** between decision and execution, the market moves. In fast conditions it moves a lot.

A useful decomposition of realized execution cost per trade is:

$$ S = \underbrace{\tfrac{1}{2}\,\text{spread}}_{\text{crossing}} + \underbrace{\eta \left(\frac{Q}{V}\right)^{\gamma}}_{\text{impact}} + \underbrace{\epsilon}_{\text{latency drift}} $$

where $Q$ is your order size, $V$ is available volume/depth, $\eta$ is an impact coefficient, and $\gamma$ (often near $0.5$–$1$) governs how impact scales with participation. The square-root law, $\text{impact} \propto \sqrt{Q/V}$, is the classic empirical form.

---

## 2. Why the Crisis Term Dominates

In calm markets, spreads are tight, depth is deep, and $S$ is small — easy to ignore. In a liquidity crisis, all three inputs move the wrong way *simultaneously*:

*   Spreads widen (sometimes 5–10×).
*   Depth $V$ collapses as makers pull quotes.
*   Volatility inflates the latency term $\epsilon$.

Because impact scales with $Q/V$, a *shrinking* $V$ magnifies the cost of the *same* order dramatically. The strategy that paid 2 basis points per trade in backtest can pay 40 in a cascade. If your average edge is $0.2R$, a stressed slippage of even a fraction of $1R$ doesn't dent your expectancy — it *inverts* it.

This is the trap: strategies are validated on average conditions and killed by tail conditions.

---

## 3. Model the Distribution, Not the Average

The core mistake is plugging a single average slippage into a backtest. Slippage is not a constant; it is a **right-skewed distribution** with a long, expensive tail. What matters for survival is not the mean fill but the tail fill.

Borrow the risk manager's language and compute the **Expected Shortfall of execution** — your average slippage in the worst $\alpha$% of fills:

$$ \text{ES}_{\alpha}(S) = \mathbb{E}\big[\, S \mid S > \text{VaR}_{\alpha}(S) \,\big] $$

Size and validate your strategy against $\text{ES}$, not $\bar{S}$. A strategy is only tradable if its edge survives its *bad* fills, because the bad fills cluster precisely when you have the most on the line.

---

## 4. Building an Honest Slippage Model

From your own executed data (pull it via API/CSV — the realized fill vs the intended price):

1.  **Measure realized slippage per trade** and tag each with the prevailing volatility and spread.
2.  **Fit slippage as a function of volatility and participation** ($Q/V$), not a flat number.
3.  **Segment by regime.** Compute separate slippage distributions for calm and stressed conditions.
4.  **Re-run the backtest with the stressed distribution** applied to the trades that occur in stressed windows.

The strategy's *stressed-adjusted* equity curve is the only one worth trusting. If it still climbs, you have something real.

---

## 5. Design Choices That Reduce the Tail

*   **Use limit orders where the strategy allows** — pay the spread on your terms, not the market's, accepting the risk of non-fill.
*   **Scale participation to depth.** Cap $Q$ as a fraction of available $V$; break large orders up.
*   **Avoid trading the eye of the storm.** If your edge doesn't specifically exploit dislocation, standing aside during the thinnest liquidity is itself alpha.
*   **Widen stops' assumptions, not the stops.** Assume your stop fills worse than its level in stress, and size so that a stressed fill is still survivable.

---

## Conclusion

The idealized fill is a fantasy that flatters every backtest. Real execution is spread plus impact plus drift, and in a crisis all three explode together while your available liquidity vanishes. Model slippage as a skewed distribution, validate against its tail with Expected Shortfall, fit it to your own executions by regime, and design orders that respect depth. A strategy that only works on perfect fills was never a strategy — it was a simulation that hadn't met the market yet.

Price the storm before it arrives, or the storm will price you.
