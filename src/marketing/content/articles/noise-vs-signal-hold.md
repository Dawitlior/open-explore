Most traders obsess over two moments: the entry and the exit. The vast, silent territory *between* them — the holding period — is treated as dead time, a nervous wait. Yet the duration of a trade encodes some of the richest information in your entire log. Time is not neutral. For every setup you trade, there is a point at which time stops working for you and begins working against you. Finding that point — the **decay point** — is the difference between letting winners run and letting them rot.

---

## 1. Every Edge Has a Half-Life

A trading signal is a temporary statistical dislocation. A liquidity sweep, a breakout, a mean-reversion snap — each carries predictive power that is strongest at inception and *decays* as the market absorbs the information and other participants react.

We can model the surviving edge as an exponential decay:

$$ E(t) = E_0 \cdot e^{-\lambda t} $$

where $E_0$ is the expectancy at the moment of entry, $t$ is time held, and $\lambda$ is the **decay constant** specific to your setup. The larger $\lambda$, the faster your edge evaporates. A momentum scalp might have a $\lambda$ so high that its entire edge is gone within minutes; a structural swing trade might decay over days.

The practical quantity you care about is the **edge half-life** — the time it takes for your entry expectancy to fall by half:

$$ t_{1/2} = \frac{\ln 2}{\lambda} $$

Holding a trade far beyond its half-life is not "letting it run." It is exposing capital to market risk in exchange for an edge that no longer exists.

---

## 2. Measuring Decay From Your Own Data

You don't need to assume $\lambda$ — you can measure it. For a large sample of past trades, record the **Maximum Favorable Excursion (MFE)** as a function of time held, bucketed by minute, hour, or day depending on your timeframe.

Plot average MFE against holding time. Three shapes emerge:

*   **Rising then plateauing:** your trades reach most of their potential quickly, then stall. The plateau is your decay point — beyond it you're holding noise.
*   **Rising steadily:** you are exiting too early; the edge is still compounding when you close. Your take-profits are leaving money on the table.
*   **Rising then falling:** classic overstay. Trades peak and then give back profit — you are systematically converting winners into scratches or losses by holding through the decay.

The peak of that curve is the empirical decay point for your setup. It is one of the few genuinely objective exit rules you can derive.

---

## 3. Signal vs Noise: The Variance Ratio

As a trade ages, the *signal* (your directional edge) shrinks while the *noise* (random volatility) accumulates linearly with time. Under a random-walk assumption, the standard deviation of price grows with the square root of time:

$$ \sigma(t) = \sigma_1 \cdot \sqrt{t} $$

So the ratio of signal to noise degrades roughly as:

$$ \frac{\text{signal}(t)}{\text{noise}(t)} = \frac{E_0 \, e^{-\lambda t}}{\sigma_1 \sqrt{t}} $$

This expression falls quickly. Early in a trade, signal dominates — this is where your edge is real. Later, noise dominates — this is where P&L becomes a coin flip dressed up as conviction. The decay point is, formally, where this ratio drops below the threshold at which your setup is no longer worth the risk.

---

## 4. When Time Becomes a Friend

For most short-term setups time is an enemy — decay is fast, and every extra minute erodes edge. But there is an important inversion. In genuine **trend or expansion regimes**, a second, slower process can dominate: positive autocorrelation, where momentum begets momentum. Here the effective $\lambda$ can go *negative* over the relevant horizon, and edge grows with time rather than decaying.

The professional skill is regime classification: knowing *which* clock you are on.

*   In a **ranging / mean-reversion regime**, respect the half-life. Take profit near the decay point; do not marry the position.
*   In a **trending / expansion regime**, extend the horizon. The base hit converts into a runner precisely because time is now compounding the edge, not eroding it.

The same asset, the same setup, held for the same duration, can be a discipline or a mistake depending only on the regime. That is why decay analysis must always be cut by market context.

---

## 5. Turning Decay Into Exit Rules

Once you know your setup's half-life and its regime dependence, exits stop being emotional:

1.  **Time stops.** If a trade has not performed within its measured half-life, the edge is gone — flatten it, regardless of price. A stale trade is a risk with no remaining reward.
2.  **Regime-conditional targets.** Cap targets near the decay point in ranges; release them in confirmed expansion.
3.  **Re-measure quarterly.** Decay constants drift as market microstructure changes. Yesterday's half-life is not guaranteed to be tomorrow's.

---

## Conclusion

The clock is a variable, not a bystander. Every setup you trade has a moment where signal and noise cross — where holding longer stops being conviction and starts being hope. Measure that point from your own MFE-over-time curve, respect it in ranges, override it only in genuine trends, and you convert the most-ignored dimension of your trade log into one of its sharpest edges.

Stop asking only *where* to exit. Start asking *when*.
