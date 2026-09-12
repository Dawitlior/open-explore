Every trader eventually asks the right question: *given that I have an edge, how much should I bet?* Too little and you leave compounding on the table. Too much and you go bankrupt with a **winning** strategy — a genuinely tragic outcome. The mathematically optimal answer was formalized in 1956 by John Kelly, and it remains the single most important — and most dangerous — formula in position sizing.

---

## 1. The Kelly Criterion

Kelly finds the fraction of capital $f^*$ that maximizes the long-run **geometric** growth rate of wealth. For a bet with win probability $p$, loss probability $q = 1-p$, and reward-to-risk ratio $b$ (your average win divided by your average loss), the optimal fraction is:

$$ f^* = \frac{bp - q}{b} $$

Equivalently, in trader's terms:

$$ f^* = p - \frac{q}{b} $$

**A worked example.** Suppose you win 45% of the time ($p = 0.45$) at a reward-to-risk of $b = 2$:

$$ f^* = \frac{2(0.45) - 0.55}{2} = \frac{0.90 - 0.55}{2} = \frac{0.35}{2} = 0.175 $$

Full Kelly says risk **17.5%** of capital on this bet. That single number should make you deeply uncomfortable — and that discomfort is correct.

---

## 2. Why Full Kelly Is Almost Never Right

Kelly maximizes growth *in theory*, under assumptions that never hold in trading:

*   **Your edge is estimated, not known.** $p$ and $b$ come from a finite, noisy sample. Overestimate your edge even slightly and Kelly overbets catastrophically — and the penalty for overbetting is severe and asymmetric.
*   **Returns aren't binary or independent.** Real trades have variable outcomes, fat tails, and correlation. Kelly's clean derivation assumes none of that.
*   **The drawdowns are savage.** Even at full Kelly with a *true* edge, expect drawdowns exceeding 50%. Recall the recovery math: a 50% loss needs a 100% gain. Full Kelly rides that edge constantly.

The geometry is unforgiving. Growth rate as a function of bet fraction is a concave curve that peaks at $f^*$ and then *falls*, crossing zero at $2f^*$. Bet more than twice Kelly and your long-run growth turns **negative** — you lose money with a positive-expectancy system. Because your edge estimate is uncertain, you might be at $2f^*$ without knowing it.

---

## 3. Fractional Kelly: The Professional Compromise

The practical solution is to bet a *fraction* of the Kelly amount — typically one-quarter to one-half:

$$ f_{\text{used}} = \lambda \cdot f^*, \qquad \lambda \in [0.25,\, 0.5] $$

The tradeoff is extraordinarily favourable. Because the growth curve is nearly flat near its peak, **half-Kelly captures about 75% of the growth for roughly half the volatility.** Quarter-Kelly gives up a little more growth for a dramatic reduction in drawdown. You sacrifice a slice of theoretical return to buy a huge margin of safety against estimation error and tail risk.

In our example, full Kelly of 17.5% becomes a far saner **~4.4%** at quarter-Kelly — still aggressive, but survivable, and robust to the very real possibility that your true edge is smaller than your sample suggested.

---

## 4. Kelly With Uncertain Edge

Since your inputs are estimates, the honest approach shrinks them:

1.  **Use conservative $p$ and $b$** — the lower bound of your confidence interval, not the point estimate. A large sample (100+ trades) narrows the interval and earns you a bit more sizing confidence.
2.  **Recompute continuously** as new trades arrive; your edge is not static.
3.  **Cap the output.** Impose a hard ceiling (e.g., never risk more than 2% per trade) regardless of what Kelly suggests. The formula is an upper guide, not a mandate.

---

## 5. Kelly Across a Portfolio

With multiple simultaneous positions, individual Kelly fractions do **not** simply add — correlation matters. Two correlated bets sized independently at Kelly are jointly overbet, because their risks reinforce (recall the hidden-correlation trap). The multivariate Kelly solution scales each position down according to the covariance structure. In practice: when positions are correlated, cut each one's fraction; treat the correlated cluster as a single larger bet for sizing purposes.

---

## Conclusion

Kelly answers the deepest question in trading — how much to bet — with mathematical precision. But full Kelly is a knife-edge that assumes perfect knowledge you will never have, and its drawdowns are brutal even when it's right. The professional move is fractional Kelly: take a quarter to a half of the formula's suggestion, capture most of the growth for a fraction of the pain, shrink your inputs for estimation error, cap the output, and scale down for correlation.

Bet enough to compound. Never enough to detonate. Fractional Kelly is where those two goals meet.
