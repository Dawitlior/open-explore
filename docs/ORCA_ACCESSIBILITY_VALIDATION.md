# ORCA Accessibility — Validation Report
### What was actually tested on the demo, with real numbers · דוח בדיקות

> **Honest framing first.** This report covers **automated + scripted browser testing** of the interactive demo (`orca-a11y-demo.html`), run in a real headless **Chromium** with **axe-core 4.12.1** and **Playwright**. Automated tooling reliably catches only **~30–40%** of WCAG issues. **Passing everything here is necessary but NOT sufficient for a conformance claim** — the remaining ~60% (meaningful alt text, logical reading order, real screen-reader usability, cognitive load) requires manual testing with **NVDA/VoiceOver** by a human, ideally including disabled users. See "Limits" at the end.

---

## 1. Test matrix & results

**Tooling:** headless Chromium 1194 · axe-core 4.12.1 · Playwright 1.56 · tags `wcag2a, wcag2aa, wcag21a, wcag21aa`.
**Viewports:** 320×568 (smallest realistic phone), 375×667 (mobile), 768×1024 (tablet), 1440×900 (desktop).

| Check | 320 | 375 | 768 | 1440 |
|---|---|---|---|---|
| axe automated violations | **0** | **0** | **0** | **0** |
| Horizontal overflow / reflow (1.4.10) | ✓ none | ✓ none | ✓ none | ✓ none |
| Interactive target ≥24px (2.5.8) | ✓ | ✓ | ✓ | ✓ |
| axe pass-checks | 23 | 23 | 23 | 24 |
| axe needs-review (manual) | 2 | 2 | 2 | 2 |

*Inline text links measure <24px tall — correctly treated as exempt under the WCAG 2.2 §2.5.8 **inline exception**, not counted as failures.*

## 2. Functional smoke tests — 14 / 14 passed

Each control was driven in the real browser and asserted against the actual DOM/computed style — proving the panel does **real** things, not cosmetic filters:

| Test | Result | Evidence |
|---|---|---|
| Panel hidden on load | ✓ | `hidden=true` |
| FAB opens panel | ✓ | `hidden=false`, `aria-expanded=true` |
| **Font scale is real** | ✓ | `.orca-root` font **16px → 20px**; `--a11y-scale` 1 → 1.25; label 100%→125% |
| **Contrast HIGH is real** | ✓ | surface bg **rgb(10,14,26) → rgb(0,0,0)** (real repaint, not a filter) |
| Contrast INVERTED | ✓ | `data-contrast=inverted` |
| **All 8 toggles activate** | ✓ | grayscale, links, readable, spacing, cursor, focus, guide, motion=reduced |
| Reset restores defaults | ✓ | contrast=normal, all flags false, font back to 16px |
| Focus trap | ✓ | **10/10** real Tab presses stayed inside the panel |
| Esc closes + restores focus | ✓ | `hidden=true`, `aria-expanded=false`, focus returned to FAB |
| Alt+A shortcut | ✓ | toggles panel open |
| Skip link target exists | ✓ | `#preview-main` present |

Screenshots captured at every viewport (`shot-320 / 375 / 768 / 1440.png`); the 320px panel renders fully with no clipping.

## 3. Bugs found by testing — and fixed

Two **real** defects were caught and corrected in the demo:

1. **`link-in-text-block` — serious (WCAG 1.4.1).** In-prose links were distinguished by color only in the default (normal-contrast) state. axe flagged it at 768/1440. **Fixed:** content links now carry a resting `underline`. The same fix was added to the master spec's foundation (§4) as a base-stylesheet rule, because the production app inherits the identical risk.
2. **Horizontal overflow at 320px (WCAG 1.4.10).** A pill-shaped hint element didn't wrap and pushed document width to 356px > 320px. **Fixed:** the element now wraps and is width-capped; 320px is clean.

*(A third "failure" — font scaling appearing not to change — was a flaw in the test probe, which measured `<html>` while the demo intentionally scopes scaling to `.orca-root`. Re-probed correctly: it works. Noted for transparency.)*

## 4. What this tells us about platform integration

The demo and the production engine in the spec share one architecture, and it is **integration-safe by design**:

- **Dormant by default.** Every override rule is gated on `:root[data-a11y-*="…"]` with a non-default value. With all prefs off, **none** of the rules match — the engine has zero effect on ORCA's normal rendering. It cannot "break" the platform when idle.
- **Theme-cooperative.** Contrast modes **remap ORCA's existing shadcn HSL tokens** (`--background`, `--foreground`, `--primary`, …) rather than hard-coding a parallel palette, so they flow through the current theme.
- **Root-scaled text.** Production scales `<html>` font-size; because the Tailwind/shadcn type scale is rem-based, it cascades automatically.
- **Scope guards.** The grayscale filter targets `#orca-app-root` (not the panel); the reading guide is its own fixed layer.

**The one real integration risk** is not the engine but ORCA's own CSS: any hard-coded **`px`** font sizes or fixed pixel heights won't scale with the root and can clip or overflow when a user enlarges text or zooms to 200%. Action: convert `px` fonts to `rem` and let containers grow (already listed in spec §4 and the Lovable prompt).

## 5. Limits of this validation (read before claiming conformance)

- Automated + scripted testing ≈ **30–40%** of WCAG. The rest is human judgment.
- **Not yet done, and required before any conformance statement:**
  - Manual **screen-reader** passes in Hebrew with **NVDA** (Windows) and **VoiceOver** (macOS/iOS) through ORCA's core flows.
  - **Keyboard-only** walkthrough of the *real* app (login → add trade → dashboard → calendar → analysis) with the panel closed.
  - **Contrast sweep** of every gold/cyan token pair against navy with a contrast checker.
  - **Recharts** text-alternative + data-table work (ORCA's largest gap).
  - Ideally, a session with a professional auditor and with disabled users.
- Fonts (Heebo/Poppins) 403'd in the sandbox and fell back to system fonts; this is an environment limitation, not a code issue, and does not affect the structural/contrast results.

**Verdict:** the demo is empirically clean on everything automation can verify (0 axe violations, 14/14 functional, responsive 320→1440), and the architecture is safe to drop into ORCA without breaking it. It is **not** the same as certified compliance — that depends on the Layer-1 foundation work and human screen-reader testing in the spec.
