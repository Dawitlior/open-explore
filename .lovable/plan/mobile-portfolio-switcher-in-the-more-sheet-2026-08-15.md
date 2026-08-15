# Mobile portfolio switcher in the "More" sheet

## What changes

In the mobile "More" bottom sheet:

1. **Remove the "Package" section** (the plan/mode switcher currently sitting there).
2. **Add an Apple-style "Portfolio" block** in its place, letting you switch the active portfolio directly from mobile.
3. **Remove the "Actions" section** — "About System" and "Bug Board" rows disappear from the mobile menu. The admin-only "Report Bug" row moves to a quiet footer row above Settings (still admin-only), so bug reporting isn't lost.

Everything else in the sheet (Navigation, Dimensions, Settings CTA) stays as-is. Desktop is untouched.

## Design of the portfolio block

Mobile-first, iOS-like:

- A grouped "inset list" card: rounded 18px, hairline border, subtle elevated surface.
- Each row = colored portfolio dot + name + currency/balance subtitle, with a checkmark on the active one (SF-style, not a radio).
- Active row gets a soft accent tint; press state is a 0.98 scale with tap-highlight removed.
- Locked (over-tier) portfolios show a lock glyph, are dimmed and non-tappable.
- Tapping a portfolio switches instantly, gives a light haptic, and closes the sheet.
- Section header reads "Portfolio" / "תיק" in the same small caps style as the other section labels.
- Full RTL/Hebrew support and theme tokens only (no hardcoded colors).

```text
PORTFOLIO
┌──────────────────────────────┐
│ ● Main Account      USD   ✓  │
│ ● Prop Challenge    USD      │
│ ● Crypto Swing      USDT  🔒 │
└──────────────────────────────┘
```

## Technical notes

- New component `src/components/trading/MobilePortfolioPicker.tsx`, driven by `useActivePortfolio()` (`portfolios`, `activePortfolioId`, `setActivePortfolioId`, `isPortfolioLocked`), styled from the `T` theme tokens + `semantic-color` helpers.
- `src/pages/Index.tsx`: in the mobile sheet's scroll area, replace the Package section (`ModeSwitch`) with `<MobilePortfolioPicker />`, delete the Actions section block, and re-add the admin-gated Report Bug row as a compact footer row.
- Uses `haptics.selection()` on switch, consistent with `MobileBottomNav`.
