# Orca Mobile-First Master Plan

Transform Orca into a native-feeling mobile trading terminal with full desktop parity. Phased, additive — no desktop regressions.

---

## Phase 1 — Foundation Layer (Shell, Safe Areas, Viewport)

**Goal:** every screen respects iOS/Android chrome and behaves like an app shell.

- **Viewport lock** (`index.html`): `viewport-fit=cover`, `user-scalable=no`, `interactive-widget=resizes-content`.
- **Safe-area tokens** in `index.css`: `--sa-top/right/bottom/left: env(safe-area-inset-*)`. Apply to root layout, bottom nav, modals, drawers, banners.
- **Mobile shell component** `MobileShell.tsx` wrapping `Index.tsx` content: fixed header (44px + safe-top), scroll body, fixed bottom nav (56px + safe-bottom).
- **Prevent input zoom**: enforce `font-size:16px` on all inputs/selects/textareas via a global mobile CSS rule.
- **Keyboard handling**: use `visualViewport` API hook (`useKeyboardInsets`) to lift bottom nav / active input above the soft keyboard; suppress bottom nav while keyboard is open.
- **Overscroll**: `overscroll-behavior: contain` on scroll containers, `-webkit-tap-highlight-color: transparent`, momentum scroll on iOS.

## Phase 2 — Bottom Navigation & Workspace Switching

**Goal:** persistent thumb-reachable navigation, smooth dimension transitions.

- New `MobileBottomNav.tsx`: 5 slots — **Calendar · Journal · Radar · Insights · More**.
- Thumb zone: 56px tall, icon + micro-label, active = Orca-Cyan glow + APEX OS soft tick.
- Long-press center slot opens **Quick-Action sheet** (New Trade, Quick Note, Weekly Review).
- **Dimension switching** (Orca / Journal / Backtest): bottom **slide-up sheet** (`DimensionSwitcherSheet`) replacing the desktop `PortalButton`. Triggered from "More" → Workspace. Uses existing `DimensionController` but transitions: vertical slide + blur instead of scale.
- Tab switches use shared-element fade (200ms) — reuse existing `AnimatePresence` pattern in `DimensionController`.

## Phase 3 — Vertical Architecture (Per-Dimension Refactor)

**Goal:** every module collapses to a single vertical column on mobile.

Strategy: a single `useIsMobile()` branch per top-level page renders a `*Mobile` variant. No conditional class jungle.

- **Dashboard** → `DashboardMobile`: stacked KPI cards (snap-scroll horizontal carousel for the top 4 KPIs), then full-width charts, then activity feed.
- **CalendarHub** → already grid; mobile: keep month grid but smaller cells, tap → bottom sheet day detail (reuse `CalendarModal` re-styled as `Drawer`).
- **Journal / Trades Table** → **Card-Stack pattern** (see Phase 4).
- **Backtest** → vertical step-flow: Setup → Chart → Commit, with swipe-between-steps.
- **Risk Control** → vertical limit cards with progress rings; tap to expand.
- **Economic Radar** → single column; mini-calendar collapses into a horizontal week strip above the feed.
- **AI Insights / Weekly Review** → already vertical; tighten typography scale + larger tap targets (44pt min).

## Phase 4 — Card-Stack Transformation (Tables → Cards)

**Goal:** kill horizontal scroll on data tables.

- Reusable `MobileTradeCard.tsx`: symbol + direction badge top-left, P&L top-right, R-multiple chip, date/time, tags row. Tap → trade detail drawer.
- Apply pattern to: Trades list, Backtest results, Economic events list, Risk events log.
- **Virtualized** with `@tanstack/react-virtual` (already common) for lists > 50 rows.

## Phase 5 — Gestural Layer

**Goal:** native swipe interactions.

- `SwipeableRow.tsx` (framer-motion `drag="x"` with snap points):
  - Swipe-left → reveal **Delete** (red) + **Archive** (slate).
  - Swipe-right → reveal **Edit** (cyan) + **Duplicate** (indigo).
  - Haptic + APEX OS tick on threshold cross.
- Applied to: trade rows, backtest entries, journal notes, economic event favorites.
- **Pull-to-refresh** on Calendar, Radar, Insights using a lightweight custom hook (no extra dep).
- **Swipe between dimensions** (edge swipe from left → Journal, right → Backtest) — optional, behind setting.

## Phase 6 — Mobile-Native Inputs

**Goal:** replace desktop forms in `TradeForm.tsx` and friends.

- **Date/time**: native `<input type="datetime-local">` styled to match terminal aesthetic.
- **Number stepper**: `NumberStepper.tsx` with −/+ buttons (44pt) + long-press accelerate.
- **Direction chips**: Long/Short as large pill toggle (segmented control).
- **R-Multiple quick-select**: chip row `−2R · −1R · BE · +1R · +2R · +3R · Custom`.
- **Symbol picker**: full-screen sheet with search + recent + favorites.
- **Tags**: chip multi-select sheet.
- **Numeric inputs**: `inputMode="decimal"`, `enterKeyHint="next"`, autofocus next field on Enter.

## Phase 7 — Feedback Layer (Sound + Visual + Haptics)

- Verify APEX OS sound engine unlocks on first touch (mobile Web Audio requires user gesture) — add `OrcaUXLayer` audio-unlock guard.
- Add **`navigator.vibrate`** wrappers paired to existing sound cues (swipe action, limit breach, trade saved).
- Risk-limit alerts: full-width toast from top with safe-area offset (replace current `RiskLimitAlert` position on mobile).
- `EconomicAlertBanner`: docks below header on mobile, never overlapping bottom nav.

## Phase 8 — Performance Pass

- Code-split each dimension (`React.lazy`) so initial mobile bundle < 200KB.
- Defer heavy charts (Recharts) until in-viewport (already partially done via `LazyChart`).
- Image/icon `loading="lazy"`, `decoding="async"`.
- Replace any `100vh` with `100dvh` to avoid Safari URL-bar jump.
- Memoize trade-list rows; throttle realtime listeners on mobile (300ms coalesce).

## Phase 9 — Global Audit Checklist

Run across **every** page: Dashboard, Calendar, Radar, Insights, Journal, Backtest, Risk, Weekly Review, Settings, Auth.

- [ ] Safe-area top + bottom respected
- [ ] No horizontal scroll
- [ ] All tap targets ≥ 44×44
- [ ] No input triggers zoom
- [ ] Keyboard does not cover active input
- [ ] Bottom nav visible & functional
- [ ] RTL Hebrew mirrored correctly (swipe directions flipped)
- [ ] Dark theme contrast WCAG AA
- [ ] APEX sound + haptic fire
- [ ] Pull-to-refresh works (where applicable)

---

## Technical Blueprint Summary

```text
┌─────────────────────────────────┐
│  Header (44 + safe-top)         │  ← context title, back, actions
├─────────────────────────────────┤
│                                 │
│  <Dimension Outlet />           │  ← vertical, virtualized,
│   - Cards, not tables           │     card-stack, swipeable rows
│   - Sheets, not modals          │
│   - Steppers, not number inputs │
│                                 │
├─────────────────────────────────┤
│  Bottom Nav (56 + safe-bottom)  │  ← 5 slots + center long-press
└─────────────────────────────────┘
       ↑ DimensionSwitcherSheet (slide-up)
       ↑ Quick-Action Sheet (long-press)
       ↑ Trade/Day Detail Drawers
```

**New files (~12):** `MobileShell`, `MobileBottomNav`, `DimensionSwitcherSheet`, `QuickActionSheet`, `SwipeableRow`, `NumberStepper`, `MobileTradeCard`, `DashboardMobile`, `JournalMobile`, `BacktestMobile`, `RiskMobile`, `useKeyboardInsets`.

**Modified:** `index.html` (viewport), `index.css` (safe-area + input zoom guards), `Index.tsx` (mobile branch), `TradeForm.tsx`, `CalendarModal.tsx` (→ Drawer on mobile), `RiskLimitAlert.tsx`, `EconomicAlertBanner.tsx`, `OrcaUXLayer` (audio unlock).

**Rollout:** Phases 1–2 first (foundation + nav) → immediate native feel. Phases 3–6 module by module behind `useIsMobile()` so desktop stays untouched. Phases 7–9 polish + audit.

**Estimated scope:** 4 implementation batches, ~25–30 files touched, zero breaking changes to desktop.

Approve and I'll start with Phase 1 + 2 (foundation + bottom nav) — that alone flips the entire app to feel native.
