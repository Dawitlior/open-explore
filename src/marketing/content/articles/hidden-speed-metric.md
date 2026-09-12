Two traders take the identical setup on the identical chart. Both win. Both book $+2R$. On every standard metric — win rate, profit factor, expectancy — they are indistinguishable. Yet one has a far higher-quality edge than the other, and no conventional statistic will ever reveal it.

The hidden variable is **speed**: how long it takes a trade to reach its target versus how long it takes to reach its stop. This single, overlooked dimension is one of the most honest measures of entry quality you can compute — and almost no retail journal tracks it.

---

## 1. Why Speed Encodes Entry Quality

When you enter at a genuinely good level, the market tends to move in your favour *quickly and directly*. Price has little reason to trade back into your zone. A high-quality entry produces winners that reach target fast, and losers that — when you are wrong — also resolve fast, because the thesis is cleanly invalidated.

A low-quality entry looks different even when it wins. Price meanders, dips deep against you, chops, and only eventually grinds to target. You got paid, but you got paid for *tolerating heat*, not for precision. That heat is invisible in the P&L and glaring in the timing.

Speed, in other words, separates edges that are **structural** from wins that are merely **survived**.

---

## 2. The Velocity Ratio

Define, for each trade, the time from entry to the take-profit ($T_{\text{win}}$) and the time from entry to the stop ($T_{\text{loss}}$). Aggregate them across your sample into average speeds, and form the **Velocity Ratio**:

$$ V = \frac{\overline{T}_{\text{loss}}}{\overline{T}_{\text{win}}} $$

The interpretation is sharp and counter-intuitive:

*   **$V > 1$ (winners are faster than losers):** the hallmark of a high-quality entry. When you're right, price leaves quickly; when you're wrong, it takes longer to grind to your stop (often because the level offered real support before finally failing). Your edge front-loads reward and back-loads risk.
*   **$V \approx 1$:** neutral. Speed carries no information; your entries are essentially coin flips on timing.
*   **$V < 1$ (losers are faster than winners):** a warning. When you're wrong, you're wrong *immediately* — you are consistently entering just before adverse moves — while your winners crawl to target. This is the signature of chasing, late entries, and mistimed breakouts.

A trader can have positive expectancy and a $V < 1$, which tells them their *risk management* is bailing out a poorly timed entry. Fixing the entry would raise both expectancy and peace of mind.

---

## 3. Coupling Speed With Excursion

Speed becomes even more powerful when paired with **Maximum Adverse Excursion (MAE)** — how far a trade travels against you before resolving. A high-quality entry shows low MAE *and* high velocity: price barely dips, then goes. A poor entry shows high MAE and low velocity: price digs deep against you and takes forever to recover.

Consider the **Entry Efficiency** score, combining the two:

$$ \eta = \frac{1}{1 + \overline{\text{MAE}}_R} \cdot V $$

where $\overline{\text{MAE}}_R$ is your average adverse excursion in R. As MAE rises, the first factor shrinks; as winners outpace losers, $V$ lifts it. A rising $\eta$ over time is direct, quantitative proof that your entries are improving — independent of whether the market happened to be kind that month.

---

## 4. What the Numbers Prescribe

Speed analysis doesn't just diagnose — it hands you concrete adjustments:

*   **Winners slow, MAE high → your entries are early or loose.** Wait for confirmation; enter on the retest, not the anticipation. You will trade less and hold cleaner positions.
*   **Losers very fast → you are entering into momentum against you.** You are late, buying the top of the move. Demand a pullback before committing.
*   **Winners very fast, targets rarely extended → you may be under-targeting.** If price reaches $+2R$ in minutes, the move likely had more to give. Cross-reference with MFE-over-time to justify wider targets.

---

## 5. Building It Into the Journal

To track speed you need only two extra timestamps per trade: the moment of entry, and the moment of exit, together with whether the exit was target or stop. From those, $T_{\text{win}}$, $T_{\text{loss}}$, $V$, and $\eta$ fall out automatically.

Recompute them per setup and per session. You will often find the same strategy has a healthy $V$ during the New York session and a broken one during the Asian range — another reminder that entry quality is inseparable from market context.

---

## Conclusion

P&L tells you *whether* you won. Speed tells you *how* — and "how" is where skill hides. When your winners consistently outrun your losers, you are entering with genuine precision. When they don't, no amount of favourable expectancy changes the fact that you are being paid to endure heat you could have avoided.

Track the clock on both sides of every trade. The velocity ratio will tell you the truth about your entries long before your equity curve does.
