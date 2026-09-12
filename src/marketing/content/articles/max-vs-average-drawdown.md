Ask a trader about their risk and they will quote you a number: *"My max drawdown is 18%."* They say it with the confidence of a fact. It is not a fact. It is a **sample minimum** — the worst outcome that happened to occur in a finite, lucky-so-far history — and treating it as a ceiling is one of the most dangerous errors in risk management. Your historical max drawdown is always a lie of omission. The real question is not what your worst day *was*, but what your worst day *will be*.

---

## 1. Max Drawdown Is an Extreme-Value Statistic

Maximum drawdown is, by definition, the largest peak-to-trough decline in an equity curve:

$$ \text{MDD} = \max_{t} \left( \frac{\text{Peak}_{t} - \text{Trough}_{t}}{\text{Peak}_{t}} \right) $$

It is the single most extreme point in your entire sample. And extremes have a treacherous statistical property: **they grow with sample size.** The longer you trade, the deeper your worst drawdown becomes — not because your strategy degrades, but because you give the tail more chances to express itself. A record set over one year will, with near certainty, be broken over ten.

Reporting max drawdown as a fixed risk budget is therefore like a bridge engineer quoting "the strongest earthquake we've felt so far" as the design limit. The one that matters hasn't happened yet.

---

## 2. Expected Maximum Drawdown Grows With Time

For a strategy with per-period volatility $\sigma$ and drift $\mu$, the *expected* maximum drawdown scales with the length of the observation window. For a driftless process, expected max drawdown grows roughly with the square root of time:

$$ \mathbb{E}[\text{MDD}_T] \;\propto\; \sigma \sqrt{T} $$

The implication is stark: the drawdown you should *prepare for* is materially larger than the one you've *experienced*, and it keeps growing the longer you stay in the game. Planning around your historical MDD guarantees you will one day be surprised by a drawdown your risk model called "impossible."

---

## 3. Why Average Drawdown Is the Better Compass

If max drawdown is a noisy, sample-dependent extreme, what should you steer by? Two more stable statistics:

**Average drawdown** — the mean depth of all declines — describes the *typical* pain of holding the strategy. It is far more stable across samples and far more representative of the day-to-day experience that actually erodes discipline.

**Ulcer Index** — the root-mean-square of drawdowns — captures both depth *and* duration of underwater periods:

$$ \text{UI} = \sqrt{\frac{1}{n} \sum_{i=1}^{n} D_i^2} $$

where $D_i$ is the drawdown at time $i$. Because it squares the declines, the Ulcer Index punishes deep, prolonged drawdowns more than shallow ones — a much better proxy for the psychological cost you'll actually bear than a single historical extreme.

Judging a strategy by average drawdown and Ulcer Index gives you a stable, honest picture; judging it by max drawdown gives you a number that will be revised — downward — at the worst possible moment.

---

## 4. Preparing for the Record-Breaking Day

Since a new max drawdown is not a possibility but an eventuality, plan for it explicitly:

1.  **Stress beyond history.** Assume your future max drawdown is at least 1.5×–2× your historical one, and confirm the account (and your psychology) survives it. If 2× your worst drawdown would end you, you are already overleveraged.
2.  **Size from the tail, not the average.** Position sizing should be calibrated so that a drawdown well beyond anything you've seen is uncomfortable but survivable.
3.  **Simulate, don't reminisce.** Monte Carlo resampling of your trade sequence produces a *distribution* of possible max drawdowns, not the single lucky path you happened to walk. The 95th-percentile simulated drawdown is a far better budget than your realized one.
4.  **Watch duration, not just depth.** The Ulcer Index reminds you that a shallow drawdown lasting a year can break discipline as surely as a sharp one — plan for time underwater, not only distance.

---

## 5. The Mindset Shift

The professional does not ask, *"What is my max drawdown?"* as if the answer were carved in stone. They ask, *"What is the distribution of drawdowns this strategy can produce, and am I sized to survive its tail?"* One framing invites false confidence; the other builds durability.

Your historical worst is a floor on your imagination, never a ceiling on reality.

---

## Conclusion

Max drawdown is a single lucky data point masquerading as a risk limit. It grows with time, it will be broken, and it flatters you until it doesn't. Steer by average drawdown and the Ulcer Index for a stable read on typical pain, simulate the full distribution of possible drawdowns, and size so that a decline well beyond anything in your history is merely survivable. Prepare for the record you haven't set yet — because the market is always, patiently, working on it.
