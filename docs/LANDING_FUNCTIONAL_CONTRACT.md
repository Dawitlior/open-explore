# Landing Page — Functional Contract (Read-Only Audit)

Binding audit of `/welcome` as it exists today. Every item below must survive the upcoming visual rebuild unchanged unless the user explicitly agrees to drop it. Everything is quoted literally from the source; where something does not exist it is written "none".

Source of truth: `src/pages/Landing.tsx` (1117 lines) plus the five scrollytelling stages under `src/pages/landing/scrollytelling/`.

---

## 1. Routing & entry points

- **Router library:** `react-router-dom` **v6.30.1** (`BrowserRouter` in `src/App.tsx`).
- **Route definition:** `src/App.tsx` line ~145 —
  `<Route path="/welcome" element={<Landing />} />`
- **Component:** `Landing` (default export of `src/pages/Landing.tsx`).
- **Public route:** yes — sits OUTSIDE `<RequireAuth>` and outside `<RequireAdmin>`. Suppressed from the BugArena FAB (`suppressedRoutes` in `src/App.tsx` includes `/welcome`).
- **Root layout wrappers still active on this route:** `ErrorBoundary` → `QueryClientProvider` → `TooltipProvider` → `Toaster` + `Sonner` → `BrowserRouter` → `AuthProvider` → `ActivePortfolioProvider` → skip-link (`<a href="#main" class="orca-skip-link">`) → `SourceProtection` (blocks right-click + DevTools shortcuts globally) → `StorageErrorListener` → lazy `OrcaUXLayer` → `LiquidSweep` → `LegalGate` → `EconomicAlertBanner` → `UpgradeModal` → `CookieConsentRoot` → `OrcaConfirmRoot` → `ImportPreflightRoot` → `A11yPanel` → `BugArenaMount`.

### Destinations reachable from the landing page

Internal (React Router):
| Target | Trigger |
|---|---|
| `/welcome` | Navbar logo `<Link to="/welcome">` |
| `/auth` | `goApp()` → `navigate('/auth')` on all "Enter app" / "Start free" / "Discover trader profile" CTAs; hero `<Link to="/auth">` sign-in link; FinaleStage `onCTA` |
| `/terms` | Footer `<Link to="/terms">` |
| `/privacy` | Footer `<Link to="/privacy">` |
| `/accessibility` | Footer `<Link to="/accessibility">` |

In-page anchors (plain `href="#..."`):
| Anchor | Section id in page |
|---|---|
| `#features` | Feature-tabs section (`<section id="features">`) |
| `#journal` | Journaling section (`<section id="journal">`) |
| `#community` | Community section (`<section id="community">`) |
| `#about` | Footer (`<footer id="about">`) |
| `#` | "עוד ← / More →" link inside `FeatureTabs`; two footer community placeholders ("Telegram", "YouTube") |

External:
| URL | Trigger |
|---|---|
| `https://discord.gg` | Community section "Join the community" button — `window.open('https://discord.gg', '_blank')` |
| `https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap` | `@import` at the top of the inlined `orcaCss` string (loaded on mount) |

### APP_URL

- **Defined in:** `src/pages/Landing.tsx` line 33 — `const APP_URL = 'https://orcainvestment.co.il';`
- **Environments:** the same literal string in every environment. It is currently **not referenced anywhere** in the rendered JSX (declared but unused for navigation). All app entry uses `navigate('/auth')` instead.

---

## 2. Exact section map

Top-to-bottom order inside the `Landing` component's returned tree (`src/pages/Landing.tsx`). Line numbers are the opening line of the section wrapper.

| # | Section | DOM `id` | Component/source | Lines | Interactive? |
|---|---|---|---|---|---|
| 1 | Inline `<style>{orcaCss}</style>` | — | inline | 612 | no |
| 2 | Root wrapper `<div class="orca-landing orca-bg-grid" dir=…>` | — | `Landing` | 613 | — |
| 3 | Sticky Navbar `<nav class="orca-nav">` | — | inline | 615–653 | yes (logo link, lang toggle, "Enter app") |
| 4 | Hero | — | inline `<section>` | 656–781 | yes (2 CTAs + sign-in link) |
| 5 | Integrations (Bybit / Binance / CSV) | — | inline `<section class="orca-section">` | 785–799 | no |
| 6 | Divider | — | `<div class="orca-divider" />` | 801 | no |
| 7 | Scrollytelling Phase 1 — Execution Flow | — | `<ExecutionFlowStage isRTL t />` from `src/pages/landing/scrollytelling/ExecutionFlowStage.tsx` | 804 | no |
| 8 | Scrollytelling Phase 2 — Trader Mind Heatmap | — | `<TraderMindHeatmapStage isRTL t />` from `.../TraderMindHeatmapStage.tsx` | 807 | tooltip on cell hover only |
| 9 | Divider | — | `<div class="orca-divider" />` | 809 | no |
| 10 | Feature Tabs | `features` | inline `<section id="features">` + `FeatureTabs` (line 492) | 815–826 | yes (7 tab buttons + "More" link) |
| 11 | Scrollytelling Phase 3 — Trade Card Explode | — | `<TradeCardExplodeStage isRTL t />` from `.../TradeCardExplodeStage.tsx` | 829 | no |
| 12 | Journaling (3 GradCards) | `journal` | inline `<section id="journal">` | 833–851 | no |
| 13 | Video / Demo | — | inline `<section>` | 854–872 | play button rendered but has **no `onClick`** (placeholder) |
| 14 | Insights (Quant Lab / Behavior / What works) | — | inline `<section>` | 875–893 | yes ("Start free" CTA) |
| 15 | Scrollytelling Phase 4 — Risk Geometry | — | `<RiskGeometryStage isRTL t />` from `.../RiskGeometryStage.tsx` | 896 | no |
| 16 | Edge / Risk (ORCA Score + 4-tier meter) | — | inline `<section>` | 899–955 | no |
| 17 | Trader Mind (rotator + 3 steps + CTA) | — | inline `<section class="orca-section orca-mind-bg">` + `TraderMindRotator` (line 351) | 958–1005 | yes (3 slide dots, CTA button) |
| 18 | Community (constellation + CTA) | `community` | inline `<section id="community">` | 1008–1033 | yes (Discord button) |
| 19 | Scrollytelling Phase 5 — Finale | — | `<FinaleStage isRTL t onCTA={goApp} />` from `.../FinaleStage.tsx` | 1039 | yes (its CTA panel) |
| 20 | Final CTA | — | inline `<section class="orca-section orca-final">` | 1042–1055 | yes (Enter app button) |
| 21 | Footer | `about` | `<footer id="about">` | 1058–1105 | yes (product/community/legal links) |
| 22 | Command-bar signature | — | `<div class="orca-cmd-bar hidden sm:block">` | 1109–1111 | no (pointer-events: none) |

Pricing section is intentionally absent (see comment at line 1035: "Pricing section intentionally removed — all plans free during launch.").

---

## 3. Interactive elements inventory

Every clickable/interactive element rendered by the landing tree. `Landing.tsx` lines are literal.

| Label (EN) | Label (HE) | Element type | Action | Defined in (file:line) | State deps |
|---|---|---|---|---|---|
| logo (image) | — | `<Link>` | route `/welcome` | Landing.tsx:618 | — |
| `EN` | `עב` | `<button>` | `toggleLang()` — flips `lang` state + writes `orca:auth-lang-override` + `orca:lang-cache` + dispatches `orca:lang-changed` | Landing.tsx:627 | `lang` (local) |
| Enter app | כניסה למערכת | `<button class="grad-btn">` | `goApp()` → `navigate('/auth')` | Landing.tsx:647 | — |
| Start free | התחל בחינם | `<button class="grad-btn">` | `goApp()` | Landing.tsx:691 | — |
| Already registered? Sign in → | כבר רשום? כניסה ← | `<Link to="/auth">` | route `/auth` | Landing.tsx:695 | — |
| Feature tab (7 keys: `journal`, `analytics`, `risk`, `ai`, `mind`, `radar` — plus initial tab) | Auto Journal / Analytics / Risk Management / AI Insights / Trader Mind / Economic Radar | `<button class="orca-tab">` | `setActive(x.key)` | Landing.tsx:500 (rendered in `FeatureTabs`) | `active` tab (local) |
| More → | עוד ← | `<a href="#">` | no-op anchor (dead link, `href="#"`) | Landing.tsx:511 | — |
| Video play button | — | `<div class="orca-video-play">` (visual only) | **no handler** | Landing.tsx:865 | — |
| Start free (Insights) | התחל בחינם | `<button class="grad-btn">` | `goApp()` | Landing.tsx:885 | — |
| Discover your trader profile | גלה את פרופיל הסוחר שלך | `<button class="grad-btn">` | `goApp()` | Landing.tsx:1002 | — |
| Trader Mind rotator dots (× N slides) | — | `<button aria-label="slide N">` | `setI(idx)` | Landing.tsx:386 (inside `TraderMindRotator`) | slide index (local) |
| Join the community | הצטרף לקהילה | `<button class="grad-btn">` | `window.open('https://discord.gg','_blank')` | Landing.tsx:1030 | — |
| FinaleStage CTA | — | button inside `FinaleStage` | `props.onCTA` → `goApp()` | FinaleStage.tsx | — |
| Enter app (Final CTA) | כניסה למערכת | `<button class="grad-btn">` | `goApp()` | Landing.tsx:1050 | — |
| Features | פיצ׳רים | `<a href="#features">` | in-page anchor | Landing.tsx:1074 | — |
| The journal | היומן | `<a href="#journal">` | in-page anchor | Landing.tsx:1075 | — |
| Discord | Discord | `<a href="#community">` | in-page anchor | Landing.tsx:1080 | — |
| Telegram | Telegram | `<a href="#">` | dead link | Landing.tsx:1081 | — |
| YouTube | YouTube | `<a href="#">` | dead link | Landing.tsx:1082 | — |
| Terms of service | תנאי שימוש | `<Link to="/terms">` | route `/terms` | Landing.tsx:1086 | — |
| Privacy | פרטיות | `<Link to="/privacy">` | route `/privacy` | Landing.tsx:1087 | — |
| Accessibility | נגישות | `<Link to="/accessibility">` | route `/accessibility` | Landing.tsx:1088 | — |
| Skip to content | דלג לתוכן | `<a href="#main">` | in-page anchor (target `#main` is NOT rendered by Landing today — dangling) | App.tsx (global) | — |
| Accessibility floating panel trigger | — | button rendered by `<A11yPanel />` | opens A11yPanel modal | src/components/a11y/A11yPanel.tsx (mounted in App.tsx) | — |
| Cookie banner buttons | — | rendered by `<CookieConsentRoot />` | consent flow | src/components/privacy/CookieConsentRoot.tsx | consent state |

**Interactive elements inside scrollytelling stages:** the scroll animations themselves are non-interactive (scroll-driven). The only clickable inside them is the `FinaleStage` CTA (delegated to `onCTA`).

---

## 4. Language & RTL system

### Toggle mechanics (defined inside `Landing.tsx`, not the global `useLang` hook)

- **Initial `lang` value** — `useState` initializer at lines 539–554:
  1. If `localStorage['orca:auth-lang-override']` is `'en'` or `'he'`, use it.
  2. Else if `localStorage['orca:lang-cache']` is `'en'` or `'he'`, use it.
  3. Else detect from `navigator.language` (or the legacy `userLanguage`) — starts with `he`/`iw` → `'he'`, otherwise `'en'`. Detection result is written back into `orca:lang-cache`.
  4. SSR / errors → `'en'`.
- **Override / toggle** — `toggleLang()` (lines 566–578):
  - Flips state.
  - Writes BOTH `orca:auth-lang-override` and `orca:lang-cache` with the new value.
  - Dispatches `window` `CustomEvent('orca:lang-changed', { detail: { lang: next } })` so already-mounted components (`useLang` hook, Auth screen) flip live.

### Storage keys (exact strings)

| Key | File:line | Possible values | Read by | Written by |
|---|---|---|---|---|
| `orca:auth-lang-override` | Landing.tsx:531 (`LANG_OVERRIDE_KEY`) | `'he'` \| `'en'` \| absent | Landing init (line 542) — presumably also Auth (not audited here) | Landing `toggleLang` |
| `orca:lang-cache` | Landing.tsx:532 & `src/hooks/use-lang.ts:12` (`LANG_CACHE_KEY`) | `'he'` \| `'en'` \| absent | `src/hooks/use-lang.ts` `readCachedLang()` (used app-wide for first paint); Landing init | Landing `toggleLang`, `useLang` after cloud fetch, Landing init after auto-detect |

### DOM level & fonts

- `dir` is applied at **two levels** simultaneously:
  1. `document.documentElement` — `useEffect` at 580–584: `html.setAttribute('lang', lang)` + `html.setAttribute('dir', isRTL ? 'rtl' : 'ltr')`.
  2. Landing root `<div class="orca-landing orca-bg-grid" dir={isRTL ? 'rtl' : 'ltr'}>` at line 613.
- `index.html` ships as `<html lang="he" dir="rtl">` — the effect above overrides it after mount.
- **Font stacks** (defined in the injected `orcaCss`, lines 65 & 71):
  - Default / HE: `'Heebo', system-ui, -apple-system, sans-serif`
  - LTR / EN: `'Inter', system-ui, -apple-system, sans-serif` (via `.orca-landing[dir="ltr"]`).
  - Monospace utility `.mono`: `'JetBrains Mono', ui-monospace, monospace` with `letter-spacing: 0.12em`.
- All three families loaded via a single `@import` from Google Fonts at line 37 of the inlined stylesheet.

### Where landing copy lives

- All strings live **inline** inside JSX in `Landing.tsx` (and the five scrollytelling stage files), passed through `t(he, en)` — a local `useCallback` bilingual selector (`isRTL ? he : en`). There is no i18n file, no JSON dictionary, no `react-i18next`.
- Feature tab data lives in `getTabs(t)` (Landing.tsx:483–490) — an array of `TabDef` objects built per render.

### Reading-direction affordances

- Icon direction: `const Arrow = isRTL ? ArrowLeft : ArrowRight;` (line 608) — used inside CTAs so the chevron points with the reading direction.
- `inset-inline-start` / `inset-inline-end` / `margin-inline-*` are used throughout the inline CSS so RTL mirrors automatically.

---

## 5. Backend & network touchpoints

### Landing-page-initiated requests

- **`Landing` itself:** makes **zero** direct network calls. It does not call Supabase, does not fetch data, does not submit forms, has no waitlist.
- **`useAuth` hook** (consumed at Landing.tsx:536 — `const { user } = useAuth();`, and only used for its side effect of subscribing): does trigger Supabase auth calls on mount app-wide:
  - `supabase.auth.getSession()` — one call at app boot (src/hooks/use-auth.tsx).
  - `supabase.auth.onAuthStateChange(...)` — subscription.
  - If a session exists, `ensureProfile(user)` → `supabase.from('profiles').select(...).eq('id', ...).maybeSingle()` and either `update` or `insert` on `profiles`. Fires only for signed-in users landing on `/welcome`.
- **Auth token storage:** localStorage (`src/integrations/supabase/client.ts` — `storage: localStorage, persistSession: true, autoRefreshToken: true`).
- **Env vars used by the Supabase client:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (`.env`). `VITE_SUPABASE_PROJECT_ID` is also declared but not consumed by client.ts.
- **Global side-effects that may fire on Landing:** `EconomicAlertBanner`, `LegalGate`, `UpgradeModal`, `CookieConsentRoot`, `A11yPanel`, `DeploymentToast`, `useDeploymentWatcher`, `useKillSwitch` — each may issue their own Supabase reads (out of scope for this audit, not initiated by Landing markup).
- **Fonts:** Google Fonts CSS request at mount (see §1).
- **Images:** all bundled locally via ES imports — no CDN egress.

### Analytics / pixels / event tracking

- **none.** No `gtag`, no Facebook pixel, no Segment, no PostHog, no Plausible, no custom `track()` call is invoked from `Landing.tsx`, from any of the five scrollytelling stages, or from `index.html`.

### Forms

- **none.** No email capture, no waitlist, no contact form on the landing page.

---

## 6. Hooks, contexts, and providers the landing tree depends on

Direct dependencies of `Landing.tsx`:

| Symbol | File | Returns / provides | Consumed by |
|---|---|---|---|
| `useNavigate` | `react-router-dom` | navigator fn | `goApp()` |
| `useAuth` | `src/hooks/use-auth.tsx` | `{ session, user, loading, signOut }` | Landing (destructures `user` only, unused after) |
| `motion` | `framer-motion` v12.38.0 | motion components | Hero mockup, callouts, `Reveal`, `GradCard`, `FeatureTabs`, all scrollytelling stages |
| Local `React.useState` / `useEffect` / `useCallback` / `useMemo` / `useRef` | react | — | scroll listener, lang state, count-up, rotator |

Indirect (mounted by `App.tsx` but present when Landing renders):
- `AuthProvider` (`src/hooks/use-auth.tsx`)
- `ActivePortfolioProvider` (`src/hooks/use-active-portfolio.tsx`)
- `TooltipProvider` (Radix)
- `QueryClientProvider` (`@tanstack/react-query`)
- `ErrorBoundary`
- `LegalGate`, `EconomicAlertBanner`, `UpgradeModal`, `CookieConsentRoot`, `OrcaConfirmRoot`, `ImportPreflightRoot`, `A11yPanel`, lazy `OrcaUXLayer`, `LiquidSweep`, `StorageErrorListener`, `SourceProtection`

Hooks the scrollytelling stages consume (`framer-motion`): `useScroll`, `useTransform`, `useMotionValueEvent`, `useReducedMotion`, `useSpring`, `useRef`.

Landing does **not** consume `useLang`, `useIsMobile`, `useSettings`, `useUiPrefs`, `use-active-portfolio`, `use-trades`, `use-trader-mind`, or any dashboard hook. Language state is fully local.

---

## 7. Assets

### Images (all imported from `src/assets/landing/`)

| Import name | File | Used in |
|---|---|---|
| `dashboardMain` | `dashboard_main.png` | Hero mockup + zoom-callout background |
| `journalEntry` | `journal_entry.png` | Journaling GradCard #1 |
| `autoJournal` | `auto_journal.png` | Feature tab `journal` |
| `analyticsDeck` | `analytics_deck.png` | Feature tab `analytics` |
| `quantLab` | `quant_lab.png` | Insights GradCard #1 |
| `calendarHub` | `calendar.png` | Journaling GradCard #2 |
| `radarImg` | `radar.png` | Feature tab `radar` |
| `traderMindImg` | `trader_mind.png` | Feature tab `mind`, hero floating snapshot, Trader Mind rotator slide 3 |
| `backtestJournal` | `backtest_journal.png` | Journaling GradCard #3 |
| `backtestAnalytics` | `backtest_analytics.png` | imported but currently unused in JSX |
| `orcaLogo` | `orca_logo.png` | Navbar logo, footer logo |
| `riskManagement` | `risk_management.png` | Feature tab `risk` |
| `aiMainframe` | `ai_mainframe.png` | Feature tab `ai` (primary image) |
| `aiGoldEdge` | `ai_gold_edge.png` | Feature tab `ai` (extra image, stacked) |
| `behaviorAnalysis` | `behavior_analysis.png` | Insights GradCard #2 |
| `whatWorks` | `what_works.png` | Insights GradCard #3 |
| `tomorrowMorning` | `tomorrow_morning.png` | Trader Mind rotator slide 1 |
| `saidVsReal` | `said_vs_real.png` | Trader Mind rotator slide 2 |

Intrinsic dimensions are not declared anywhere; images are rendered with `object-fit: cover` at responsive parent sizes. Hero image uses `fetchpriority="high"` (via the rotator's first slide only); everything else uses `loading="lazy"` + `decoding="async"`.

### Videos

- **none embedded.** The Demo section renders a static `.orca-frame-skeleton` and a decorative play button — no `<video>`, no iframe, no third-party embed.

### Favicon / manifest

`index.html`: `<link rel="icon" type="image/png" href="/orca-logo.png" />`, `<link rel="manifest" href="/manifest.json" />`.

### Fonts

Loaded exclusively via `@import` inside the inlined `orcaCss` string (Landing.tsx line 37):
- Heebo weights 300, 400, 500, 600, 700, 800, 900
- Inter weights 400, 500, 600, 700, 800, 900
- JetBrains Mono weights 400, 500, 700
- All with `&display=swap`

No `<link rel="preconnect">` or `<link rel="preload">` for fonts. No self-hosted `@font-face`.

---

## 8. Styling & motion baseline

### Design tokens the landing consumes

Defined as CSS custom properties inside `.orca-landing` in the injected `orcaCss` (Landing.tsx lines 39–69):

| Token | Value |
|---|---|
| `--bg` | `#000000` |
| `--bg-2` | `transparent` |
| `--surface` | `#0A0D14` |
| `--surface-2` | `#0F131C` |
| `--border` | `rgba(34,211,238,0.10)` |
| `--glass` | `rgba(8,12,20,0.55)` |
| `--text` | `#F5F7FA` |
| `--text-muted` | `#8A93A6` |
| `--text-dim` | `#5A6477` |
| `--cyan` | `#22D3EE` |
| `--mint` | `#34D399` |
| `--green` | `#10B981` |
| `--red` | `#EF4444` |
| `--gold` | `#F59E0B` |
| `--amber` | `#FBBF24` |
| `--orange` | `#FB923C` |
| `--purple` | `#8B5CF6` |
| `--blue` | `#3B82F6` |

Background is a layered radial gradient stack (cyan → mint → purple → `--bg`), see lines 59–63.

The landing does **not** consume the global shadcn HSL token set (`--background`, `--primary`, `--card`, …) from `index.html`/`src/index.css` — those are still applied to `<html>` by the preboot script but Landing paints over them via its own `.orca-landing` scope.

### Tailwind

- `tailwind.config.ts` — no landing-specific extensions. Landing uses Tailwind mainly for layout utilities (`max-w-7xl mx-auto px-5 sm:px-8`, `grid`, `flex`, `items-center`, `hidden sm:block`). Colors are almost never Tailwind — they come from the CSS variables above.

### Global CSS that affects the landing

- `src/index.css` (loaded via `src/main.tsx`) — shadcn HSL variables and app-wide resets. Landing scopes over most of it inside `.orca-landing`.
- `.orca-skip-link` — styles come from `src/components/a11y/a11y-engine.css` (imported in App.tsx).
- `index.html` inline preboot sets `--background`, `--primary`, etc. on `<html>` (see §1 of the file dump).

### Motion dependencies (exact installed versions)

| Package | Version | Where used on landing |
|---|---|---|
| `framer-motion` | `^12.38.0` | hero enter animation, `Reveal`, `GradCard` hover, `FeatureTabs` swap, all 5 scrollytelling stages (`useScroll`, `useTransform`, `useMotionValueEvent`, `useReducedMotion`) |
| `lucide-react` | `^0.462.0` | `ArrowLeft`, `ArrowRight`, `TrendingUp` icons (only `ArrowLeft`/`ArrowRight` visible in JSX today) |
| React / React DOM | `^18.3.1` | — |
| `react-router-dom` | `^6.30.1` | `<Link>`, `useNavigate` |
| Tailwind | `^3.4.17` | layout utilities |
| Vite | `^5.4.19` | build |
| `@supabase/supabase-js` | `^2.105.4` | via `useAuth` only (see §5) |

### Existing scroll-based logic

- Navbar shadow toggle (`Landing.tsx:586–591`): `window.addEventListener('scroll', onScroll, { passive: true })` — sets `scrolled = window.scrollY > 12`. Cleaned up on unmount.
- `Reveal` component (Landing.tsx:414–423): framer-motion `whileInView` with `viewport={{ once: true, margin: '-60px' }}` — used by many blocks.
- `CountUp` component (Landing.tsx:426–464): `IntersectionObserver` with `threshold: 0.4` starts a `requestAnimationFrame` count-up. (Note: `CountUp` is currently declared but not called from JSX today — dead code path.)
- `TraderMindRotator` interval (Landing.tsx:351–402): `setInterval` every 4200 ms cycling `i` through slides.
- All five scrollytelling stages use framer-motion's `useScroll({ target: ref, offset: [...] })` + `useTransform` with sticky viewport containers of heights **1.7–2.0 vh multipliers** (see `ScrollStage.tsx`). Each stage checks `useReducedMotion()` and renders a static fallback layout when true.

---

## 9. Accessibility & motion safety

### Native accessibility system integration

- **Global panel:** `<A11yPanel />` (`src/components/a11y/A11yPanel.tsx`) is mounted app-wide in `src/App.tsx` and appears on `/welcome`. It is documented as targeting WCAG 2.1 AA and Israeli standard IS 5568 (see `docs/ORCA_ACCESSIBILITY_*` and `docs/orca-a11y-demo.html`).
- **Runtime effect:** the panel toggles utility classes on `<html>` / `<body>` and injects the styles from `src/components/a11y/a11y-engine.css` (imported in `App.tsx`). Common toggles: high-contrast, larger font size, reduced-motion opt-in, focus-ring boost, dyslexia-friendly font (see `a11y-engine.css`).
- **Skip link:** `<a href="#main" class="orca-skip-link">דלג לתוכן · Skip to content</a>` — rendered at the top of `<AuthProvider>` in `App.tsx`. **Landing does NOT render a matching `id="main"` landmark**, so today the skip link's target is dangling on `/welcome`. This is a fragile point (see §12).

### `prefers-reduced-motion`

- Global CSS override at the end of `orcaCss` (Landing.tsx:307–311):
  ```css
  @media (prefers-reduced-motion: reduce) {
    .orca-landing *, .orca-landing *::before, .orca-landing *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
- Each scrollytelling stage additionally calls framer-motion's `useReducedMotion()` and returns a static, non-animated fallback layout when true.

### ARIA landmarks & heading hierarchy

- Landmarks present: `<nav>` (navbar), `<footer id="about">`. Multiple `<section>`s (some with `id`s).
- **No `<main>` landmark** anywhere in Landing.tsx.
- Headings: exactly **one `<h1>`** (hero, line 666). Section titles use `<h2 class="orca-section-title">` via `SectionHeader`. Sub-headings inside cards use `<h3>`. Hierarchy is clean h1 → h2 → h3.
- Buttons vs anchors: CTAs are `<button>`s (correct — they trigger `navigate` / `window.open`, not URL nav); actual navigations use `<Link>` or `<a href="#anchor">`.
- Language toggle has `aria-label` and `title` bilingually (Landing.tsx:629–630).
- Rotator dots have `aria-label={`slide ${idx + 1}`}` (Landing.tsx:389).
- Images have `alt` text (some bilingual via `t()`, some fixed like `"Orca Investment"` / `"ORCA Dashboard"`).

---

## 10. SEO & meta

- **Route-level meta:** set imperatively inside a `useEffect` on Landing (Landing.tsx:593–604):
  - `document.title = 'Orca Investment — יומן מסחר חכם ואוטומטי'` (HE) or `'Orca Investment — Smart, Automated Trading Journal'` (EN).
  - Updates the `<meta name="description">` content in-place; both HE/EN copy present in the file.
  - Restores previous title/description on unmount.
- **`index.html` defaults:** ships as `<html lang="he" dir="rtl">` with theme-color meta, iOS format-detection meta, PWA manifest and icon links, a `Content-Security-Policy-Report-Only` meta, and the theme preboot script. Static `<title>` and `<meta name="description">` values in `index.html` are the fallback for crawlers that don't execute JS.
- **Open Graph / Twitter tags:** none set from Landing (`document.querySelector('meta[name="description"]')` only). Any `og:*` present in `index.html` is the sitewide fallback.
- **JSON-LD / structured data:** none.
- **Canonical link:** none set from Landing; whatever is in `index.html` applies.
- **`react-helmet-async`:** not installed.
- **Sitemap / robots:** `public/sitemap.xml` and `public/robots.txt` exist. `public/_redirects` also present. Not audited beyond existence.
- **Prerender / SSR:** none — pure Vite SPA.

---

## 11. Mobile behavior

- **`useIsMobile`** (`src/hooks/use-mobile.tsx`) breakpoint constant: `MOBILE_BREAKPOINT = 768` (`(max-width: 767px)`). Landing **does not import this hook** — it uses CSS `@media` queries only.
- **Breakpoints in the injected `orcaCss`:**
  - `@media (max-width: 900px)` — collapses `.orca-feature-grid`, `.orca-grad-grid`, `.orca-two-up`, `.orca-pricing` to a single column.
  - `@media (max-width: 768px)` — `.orca-stats` becomes 2 columns; `.orca-footer-grid` becomes 2 columns.
  - `@media (max-width: 720px)` — Trader Mind "How it works" 3-step grid collapses to 1 column (inline `<style>` at line 999).
  - Tailwind responsive prefixes used inline: `sm:px-8`, `hidden sm:block` (command bar hidden below sm), `lg:grid-cols-2`, `lg:gap-16`.
- **Section layout differences on mobile:** hero collapses to single column with the mockup rendered second (both hero children carry `order: 1`/`order: 2` inline so RTL/LTR both stack text-then-image).
- **Scrollytelling mobile fallback:** each stage renders a simpler layout below its lg breakpoint (see the reduced-motion fallback in each of the 5 stage files).

---

## 12. Fragile points & constraints

- **Skip link target missing:** `<a href="#main">` in App.tsx has **no `id="main"` on the Landing page** — clicking it does nothing. Any rebuild must add `id="main"` on the primary content wrapper.
- **`APP_URL` constant is declared but unused** (line 33) — do not delete it without confirming no other file expects it; and do not "activate" it either, since all CTAs correctly use `navigate('/auth')`.
- **`CountUp` component is defined but never rendered.** If the rebuild's stats section wants it, it exists.
- **`backtestAnalytics` image is imported but never rendered.**
- **"More →" links, "Telegram" and "YouTube" footer links point to `href="#"`** — must be updated or removed intentionally, not silently kept.
- **Video "play" button has no `onClick`** — decorative only. Any rebuild that adds a real video needs to add the handler and mount an actual `<video>` / iframe (CSP `frame-src` is currently absent → iframes will be blocked when CSP is switched from report-only to enforcing).
- **CSP is `Content-Security-Policy-Report-Only`.** Notable directives:
  - `script-src` allows `'unsafe-inline'` and `'unsafe-eval'`.
  - `style-src` allows `'unsafe-inline'` + `https://fonts.googleapis.com` (needed by the inlined `<style>` and the `@import`).
  - `font-src` allows `https://fonts.gstatic.com`.
  - `connect-src` allows Supabase (`https://*.supabase.co`, `wss://*.supabase.co`) and Google Fonts.
  - `img-src 'self' data: blob: https:`.
  - No `frame-src` / `media-src` — embedding YouTube/Vimeo would require additions before CSP is enforced.
- **`SourceProtection`** (App.tsx) intercepts right-click and DevTools shortcuts (`F12`, `Ctrl/Cmd+Shift+I/J/C`, `Ctrl+U`, `Cmd+Option+I/J/C/U`). This is global — do NOT re-enable those inside Landing "for demo purposes". Right-click is dead on the whole page.
- **`<html>` starts as `lang="he" dir="rtl"`** (index.html). Landing mounts and overrides via effect — this creates a one-frame RTL flash for EN visitors. Preserve or fix, but be aware.
- **Language storage:** overwriting either key (`orca:auth-lang-override`, `orca:lang-cache`) directly bypasses the CustomEvent dispatch and desynchronizes mounted `useLang` consumers.
- **Font `@import` inside inlined `<style>`** delays first paint slightly and depends on `style-src` allowing `https://fonts.googleapis.com` (currently allowed). Do not move fonts to `<link>` without keeping both preconnects, and never mix strategies.
- **All landing copy is inline** — no i18n dictionary. Rebuild must either preserve every `t(he, en)` pair or migrate them into a translation store; nothing else knows those strings.
- **Sticky navbar (`position: sticky; top: 0; z-index: 50`)** — any full-viewport sticky in the rebuild must respect this z-index or the nav will disappear under scrollytelling sticky panels.
- **Scrollytelling stages use sticky viewport heights of ~1.7–2.0 vh multipliers.** Shrinking them further will cut off animations; growing them re-introduces the black-gap issue the user already reported.
- **Third-party embeds:** none today (Discord button uses `window.open`, not embed). No YouTube/Loom demo iframe.
- **Hydration:** SPA, no SSR — no hydration mismatch risk, but also no accurate per-route social previews for non-JS crawlers.
- **Known past regressions on this page:** black gaps between scrollytelling stages caused by oversized sticky spacers (already reduced from 2.4–2.8vh → 1.7–2.0vh). Do not regress.

---

## 13. Performance baseline

- **Lighthouse scores (mobile / desktop):** none recorded in the repo. No `.lighthouseci/`, no CI performance job. **Establish a baseline before the rebuild** (`npx lighthouse https://<preview-url>/welcome`) so regressions can be spotted.
- **Bundle chunking:** `vite.config.ts` declares `manualChunks` for `vendor-react`, `vendor-charts` (recharts), `vendor-motion` (framer-motion), `vendor-xlsx`, `vendor-supabase`. Landing therefore pulls `vendor-react` + `vendor-motion` + `vendor-supabase` at minimum, plus the Landing chunk itself.
- **Landing chunk size:** not measured (no build artifact captured in repo). Rough source-code size: `Landing.tsx` ~1117 lines (~55 KB source) + 5 scrollytelling stages totaling 1811 lines (~90 KB source). Framer-motion v12 is the dominant vendor cost.
- **Optimizations already in place:**
  - Lazy-loaded `OrcaUXLayer` (framer-motion effects layer) — not blocking LCP.
  - All landing images use `loading="lazy"` + `decoding="async"`; hero rotator's first slide additionally sets `fetchpriority="high"`.
  - Scroll listener is `{ passive: true }`.
  - `IntersectionObserver` used for the (currently dormant) `CountUp`.

---

**End of contract.** Every EN/HE label, every `href`, every storage key, every CSS variable, every image path, every framer-motion version above must round-trip through the rebuild unchanged. Anything intentionally dropped needs an explicit sign-off from the user.
