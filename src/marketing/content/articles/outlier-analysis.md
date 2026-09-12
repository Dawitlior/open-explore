Every trader's equity curve tells a story — but the headline of that story is usually written by a tiny handful of trades. A single revenge trade that spiraled. One perfect runner you held for a week. The catastrophic Monday you'd rather forget. These extreme events, the **outliers**, distort every aggregate statistic you use to judge yourself.

The single most clarifying exercise you can run on your trade log is deceptively simple: **delete your three best and your three worst trades, then look again.** What remains is the true face of your system — the repeatable core, stripped of luck and stripped of catastrophe.

---

## 1. Why Averages Lie

Most performance metrics — average win, average loss, profit factor, even expectancy — are *means*. And the arithmetic mean is exquisitely sensitive to outliers. A single 15R winner in a sample of 50 trades can single-handedly drag a losing system into apparent profitability.

Consider the mean:

$$ \bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i $$

One value of $x_i$ that is 20× the typical trade moves $\bar{x}$ far more than a hundred ordinary results ever could. This is why two traders with identical average returns can have completely different realities: one is consistent, the other is a lottery ticket that happened to hit.

The professional's instinct is therefore to ask not *"what is my average?"* but *"what is my average once I remove the events I cannot reliably reproduce?"*

---

## 2. The Trimmed Statistic

The formal tool here is the **trimmed mean** — the average after discarding the top and bottom $k$ observations:

$$ \bar{x}_{\text{trim}} = \frac{1}{n - 2k} \sum_{i=k+1}^{n-k} x_{(i)} $$

where $x_{(i)}$ is the $i$-th value in the *sorted* dataset. For a discretionary trader reviewing a quarter, $k = 3$ is a superb starting point: strip the three biggest winners and the three biggest losers, then recompute win rate, average R, and profit factor on what's left.

You are now looking at your **base-rate performance** — the machine running on a normal day, with no heroics and no disasters.

---

## 3. Reading the Two Diagnoses

The gap between your *raw* metrics and your *trimmed* metrics is itself the most valuable signal.

**Diagnosis A — The luck-dependent system.** Raw expectancy is $+0.4R$. Trimmed expectancy collapses to $-0.1R$. Translation: your profitability lives entirely in a few home runs you cannot summon on command. Miss them — through a bad week, a vacation, a data outage — and the base system bleeds. You are not running a strategy; you are holding a small number of lottery tickets and paying the premium in daily losses.

**Diagnosis B — The robust system.** Raw expectancy is $+0.4R$. Trimmed expectancy holds at $+0.3R$. Translation: your base hits carry the account. The outliers are genuine bonus capital that accelerate compounding, not the life support keeping you above water. This is a system you can scale with confidence.

The two numbers together tell you something neither tells alone: **how much of your edge is skill you can repeat, versus variance you merely survived.**

---

## 4. The Worst-Trade Cut Is the More Important One

Traders love to strip out their best trades to test fragility. Fewer have the stomach to study their *worst* trades with the same rigour — and that is where the real money is saved.

Sort your losses in descending magnitude and isolate the top three. Then ask, honestly, of each:

*   Was the stop **defined before entry**, or did the loss balloon because I moved it?
*   Did the size match my risk plan, or was this an oversized, emotional position?
*   Was it a **normal $-1R$** that simply lost, or a $-4R$ that should never have existed?

If your worst three losses are all multiples of your intended $1R$, your problem is not strategy selection — it's **risk control**. No entry model can outrun a trader who lets losers run. Trimming reveals this instantly: if removing three losses transforms a red quarter into a green one, your edge was always there; your discipline was the leak.

---

## 5. Turning the Cut Into a Rule

Outlier analysis is diagnostic, but it also prescribes. Once you know your base-rate expectancy, you can:

1.  **Cap position size** so that no single trade can become a top-three outlier by magnitude. If your worst losses are all size accidents, hard limits fix it.
2.  **Study the winners you can reproduce** — the setups inside the trimmed set — and allocate more attention there, rather than fantasizing about the next 15R runner.
3.  **Re-run the cut every quarter.** A healthy system shows a small, stable gap between raw and trimmed metrics over time. A widening gap is an early warning that you're drifting toward luck-dependence.

---

## Conclusion

Your three best trades flatter you. Your three worst trades frighten you. Neither is the truth about your edge. Delete all six, and the trader who remains — the one who shows up on the ordinary Tuesday — is the one whose numbers you should actually trust and actually scale.

Cut the extremes. Judge the core. Everything else is a story.
