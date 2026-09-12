There is a single piece of arithmetic that separates traders who last from traders who blow up, and most people learn it far too late. It is the brutal, non-linear relationship between a loss and the gain required to undo it. A 50% loss does not need a 50% gain to recover. It needs a **100%** gain. The physics of drawdown are asymmetric, unforgiving, and they should govern how you size every single position.

---

## 1. The Recovery Formula

If you lose a fraction $L$ of your capital, the gain $G$ required to return to break-even is:

$$ G = \frac{1}{1 - L} - 1 $$

Run the numbers and the cruelty becomes obvious:

*   Lose **10%** → need **11.1%** to recover.
*   Lose **20%** → need **25%**.
*   Lose **33%** → need **50%**.
*   Lose **50%** → need **100%**.
*   Lose **75%** → need **300%**.
*   Lose **90%** → need **900%**.

The relationship is convex: each additional unit of loss demands a *disproportionately* larger gain to reverse. Small drawdowns are linear-ish and survivable. Deep drawdowns enter a death spiral where the required recovery outruns any realistic edge.

---

## 2. Why This Destroys Accounts

The danger is not just mathematical — it is compounding and psychological at once. As drawdown deepens, three things happen simultaneously:

1.  **The required return explodes** (per the formula above).
2.  **The capital base shrinks**, so the same dollar profit is a larger *percentage* — but you have less capital to generate it with.
3.  **Psychology deteriorates.** A trader down 50% needs a 100% gain — a doubling — which tempts exactly the reckless, oversized bets that dig the hole deeper.

A trader chasing a 100% recovery will take on risk they'd never accept at break-even, and that risk is what converts a recoverable drawdown into a terminal one. The math and the mind fail together.

---

## 3. The Compounding Perspective

Terminal wealth is a *product* of returns, not a sum:

$$ W_n = W_0 \prod_{i=1}^{n} (1 + r_i) $$

Because it's a product, a single large negative $r_i$ has an outsized, permanent effect — it scales *every* subsequent term. This is why the geometric mean (what you actually compound) is always below the arithmetic mean, and the gap widens with volatility:

$$ g \approx \mu - \frac{\sigma^2}{2} $$

Volatility is not free. Every unit of variance drags your compounded growth below your average return via that $-\sigma^2/2$ term. Two strategies with the same average return but different volatility will end at wildly different places — the smoother one wins, because it avoids the deep drawdowns that recovery math punishes.

---

## 4. What It Prescribes for Position Sizing

The recovery curve is not a curiosity to admire — it is a sizing constraint to obey.

*   **Cap the maximum drawdown you will tolerate**, and back-solve position size from it. If your ceiling is 20% (needing a 25% recovery — still humane), your per-trade risk and correlation exposure must be bounded so a bad cluster cannot breach it.
*   **Risk in small, fixed fractions.** Risking 1% per trade means a 10-loss streak costs ~10% — recoverable. Risking 5% means the same streak costs ~40%, needing a 67% recovery — a different universe of difficulty.
*   **Treat volatility as a cost.** Prefer the strategy with the smoother equity curve even at slightly lower average return, because the $-\sigma^2/2$ drag and the recovery convexity both reward smoothness.

---

## 5. The Survival Mindset

Professionals are not trying to maximize this month's return. They are trying to *never enter the region of the curve where recovery becomes implausible.* Staying out of deep drawdown is worth more than any single winning streak, because you cannot compound an account that no longer exists.

The asymmetry cuts one way only: it is always mathematically easier to *protect* capital than to *rebuild* it. A 20% loss is an inconvenience. A 60% loss is a career-threatening event requiring a 150% return to undo. Guard the downside, and the upside compounds on its own.

---

## Conclusion

Losses and gains are not symmetric, and pretending otherwise is how good traders go broke slowly and then suddenly. Internalize the recovery formula, respect the convexity, treat volatility as the tax it is, and size every position so that no drawdown can push you into the part of the curve where the math turns against you for good.

Protect the base. The compounding does the rest.
