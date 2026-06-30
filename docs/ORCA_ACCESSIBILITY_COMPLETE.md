# ORCA — Accessibility System · מערכת נגישות
### Complete, Lovable-ready implementation spec · WCAG 2.1 AA (built toward 2.2 AA)

> **The one decision that matters.** An accessibility *widget* is **not** legal compliance, and a bolted-on third-party overlay (the accessiBe / UserWay / EqualWeb / "נגישות בקליק" pattern) actively *raises* your legal and UX risk. ORCA gets two layers: **(1)** an accessible *foundation* (where compliance actually lives) and **(2)** a genuine *preferences panel* built natively into ORCA that tunes that already-accessible experience. The panel below does **real** things — real rem-based text scaling, real contrast palettes, real motion control — never cosmetic filters pretending to be compliance.

---

## 0. Why we are NOT shipping an overlay (read this first)

You showed a floating wheelchair widget. That UI pattern is an **accessibility overlay**, and the entire professional accessibility field has turned against it:

- **Regulators:** In April 2025 the US FTC fined **accessiBe $1,000,000** for falsely marketing that its AI overlay made sites "WCAG compliant," and barred unsubstantiated compliance claims for 20 years. The **European Commission has explicitly rejected** overlay-based approaches for EN 301 549 conformance.
- **Courts:** Overlays have been **rejected by courts** as inadequate (e.g. *Murphy v. Eyebobs*; the *LightHouse v. ADP* settlement stated overlays "will not be sufficient to achieve accessibility"). Roughly **25% of all 2024 US accessibility lawsuits targeted sites that HAD an overlay installed** — the overlay becomes the evidence.
- **The disability community:** The **Overlay Fact Sheet** (overlayfactsheet.com) is signed by **800+** accessibility professionals, including the W3C ARIA chair and NVDA contributors, recommending against overlays. Screen-reader users frequently **block** them because they fight JAWS/NVDA/VoiceOver.
- **Technically:** automated/overlay code detects **only ~30–40%** of WCAG issues; the other 60–70% must be fixed in the source. Overlays also raise **GDPR/privacy** concerns by silently detecting assistive-tech usage (which is disability data).

**Conclusion for ORCA:** build it ourselves, do it right, and never claim "100% compliant."

---

## 1. The legal target — one standard satisfies all three regions

You asked for Israel + EU + US. They converge on **one** technical target, which makes our job clean.

### 🇮🇱 Israel
- **Law:** חוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח-1998 + תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), and the website obligation in **תקנה 35**, with the technical standard **ת"י 5568 (IS 5568)**.
- **Technical level:** IS 5568 is built on WCAG (originally **2.0 AA**; current practice and guidance align with **2.1 AA**). Target 2.1 AA and you are safe.
- **Teeth:** A claimant can win **statutory damages up to ₪50,000 *without proving any actual harm*** — they only have to prove the site isn't compliant. Enforced by the נציבות שוויון זכויות under the Ministry of Justice.
- **Mandatory extras (not optional):** a published **הצהרת נגישות** (accessibility statement) **and** the contact details of a **רכז נגישות** (accessibility coordinator). Both are delivered in §5 below.

### 🇪🇺 European Union — this one directly covers ORCA
- **Law:** the **European Accessibility Act (EAA), Directive (EU) 2019/882**, **enforceable since 28 June 2025**.
- **Technical standard:** **EN 301 549 v3.2.1**, which incorporates **WCAG 2.1 Level AA**.
- **Why it hits ORCA specifically:** the EAA expressly covers **banking / financial services and e-commerce / consumer digital services**, and it has **extraterritorial reach** — it applies to *any* business offering covered services to EU consumers, regardless of where you're based. A trading-journal/analytics SaaS sold to EU users is squarely in scope.
- **Microenterprise note:** businesses with **<10 employees AND <€2M turnover** have limited service exemptions — you may currently qualify, but (a) you'll outgrow it and (b) it doesn't exempt you from the IL or US exposure, so build to standard now.
- **Mandatory extra:** an **accessibility statement** with a **feedback mechanism**, a description of **known non-accessible content**, and **planned improvements**. The bilingual statement in §5 is written to satisfy this *and* the Israeli requirement at once.

### 🇺🇸 United States
- **ADA Title III** (private businesses serving the public): the ADA names no version, but DOJ enforcement and the courts **consistently apply WCAG 2.1 AA** as the benchmark; thousands of web suits are filed yearly. State laws (e.g. California Unruh Act) add statutory damages.
- **Section 508** (federal/contractors): **WCAG 2.1 AA**.
- **DOJ ADA Title II rule (April 2024)** for state/local government: **WCAG 2.1 AA** (compliance now phased to 2027/2028). It signals the direction for Title III.

### ✅ The target we build to
> **Floor: WCAG 2.1 Level AA** (satisfies IL IS 5568, EU EN 301 549/EAA, and US ADA/508 simultaneously).
> **We build toward WCAG 2.2 Level AA** as future-proofing — 2.2 only adds criteria (focus appearance, dragging alternatives, target size, consistent help, redundant entry) and is the likely next legal baseline. None of it conflicts with 2.1.

---

## 2. Architecture — two layers, in this order

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2 — Preferences Panel (this spec, §3)                  │
│  Genuine user tuning, persisted to Supabase + localStorage.   │
│  A *complement*. Never the compliance mechanism.              │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1 — Accessible Foundation (this spec, §4)  ★ compliance│
│  Semantic HTML, keyboard, focus mgmt, contrast, labels,       │
│  chart alternatives, aria-live, reduced motion, lang/dir.     │
│  ORCA must be fully usable with JAWS/NVDA/VoiceOver           │
│  WITHOUT ever opening the panel.                              │
└─────────────────────────────────────────────────────────────┘
```

**The acceptance test for compliance:** a blind user with a screen reader, and a sighted keyboard-only user, complete ORCA's core flows (log in → add a trade → read the dashboard → open the calendar → run an analysis) **without touching the panel.** If that passes, the panel is the bonus it's supposed to be. If it fails, the panel is overlay theater. Build Layer 1 first.

---

## 3. Layer 2 — The Preferences Panel (full implementation)

Stack: **React + TypeScript + Tailwind + shadcn/ui + Supabase** (your existing ORCA stack). RTL, Heebo/Poppins, navy-black + gold/cyan.

**How the engine works:** the panel writes **data-attributes and a CSS variable onto `<html>`**; CSS reacts. Because Tailwind's type scale is already in `rem`, scaling the root font-size cascades to the whole UI automatically. The contrast modes **remap your existing shadcn HSL tokens** (`--background`, `--foreground`, `--primary`, `--border`, `--ring`, …) so they integrate with ORCA's theme instead of fighting it.

> ⚠️ **One dependency to verify:** for text scaling to propagate, ORCA's font sizes must be in **rem/Tailwind text-\*** utilities, **not hard-coded `px`**. Audit for `px` font sizes and convert. (Tailwind defaults are already rem, so this is usually fine.)

### 3.1 `src/index.css` (or your global stylesheet) — the engine

```css
/* ===== ORCA Accessibility Engine ===== */

/* Text scaling (WCAG 1.4.4 Resize Text — up to 200%). Tailwind rem cascades. */
:root { --a11y-font-scale: 1; }
html { font-size: calc(100% * var(--a11y-font-scale)); }

/* Baseline visible focus — FOUNDATION, always on (WCAG 2.4.7). */
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
  border-radius: 6px;
}

/* Reduced motion — honor OS setting globally (WCAG 2.3.3 / 2.2.2) ... */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
    scroll-behavior: auto !important;
  }
}
/* ...and via the manual toggle */
:root[data-a11y-motion="reduced"] *,
:root[data-a11y-motion="reduced"] *::before,
:root[data-a11y-motion="reduced"] *::after {
  animation-duration: .01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: .01ms !important;
  scroll-behavior: auto !important;
}

/* CONTRAST: HIGH (גבוהה) — remaps shadcn tokens to a max-contrast dark theme.
   Adjust channel values to taste; these all clear WCAG AAA 7:1. */
:root[data-a11y-contrast="high"] {
  --background: 0 0% 0%;
  --foreground: 0 0% 100%;
  --card: 0 0% 4%;            --card-foreground: 0 0% 100%;
  --popover: 0 0% 4%;         --popover-foreground: 0 0% 100%;
  --primary: 48 100% 64%;     --primary-foreground: 0 0% 0%;   /* gold */
  --secondary: 0 0% 10%;      --secondary-foreground: 0 0% 100%;
  --muted: 0 0% 10%;          --muted-foreground: 48 35% 88%;
  --accent: 186 100% 74%;     --accent-foreground: 0 0% 0%;    /* cyan */
  --border: 48 100% 64%;      --input: 48 100% 64%;
  --ring: 186 100% 74%;
}

/* CONTRAST: INVERTED (הפוכה) — a real light theme for users who need it. */
:root[data-a11y-contrast="inverted"] {
  --background: 60 20% 98%;   --foreground: 222 30% 10%;
  --card: 0 0% 100%;          --card-foreground: 222 30% 10%;
  --popover: 0 0% 100%;       --popover-foreground: 222 30% 10%;
  --primary: 42 80% 30%;      --primary-foreground: 0 0% 100%;
  --secondary: 60 12% 92%;    --secondary-foreground: 222 30% 10%;
  --muted: 60 12% 94%;        --muted-foreground: 222 14% 32%;
  --accent: 190 90% 28%;      --accent-foreground: 0 0% 100%;
  --border: 90 6% 78%;        --input: 90 6% 78%;
  --ring: 190 90% 28%;
}

/* Grayscale (גווני אפור) — applied to the app shell only, never the panel. */
:root[data-a11y-grayscale="true"] #orca-app-root { filter: grayscale(1); }

/* Readable font (גופן קריא) — legible stack + spacing. */
:root[data-a11y-readable="true"] {
  --font-sans: 'Heebo', Verdana, system-ui, sans-serif;
}
:root[data-a11y-readable="true"] body {
  letter-spacing: .03em; word-spacing: .16em; line-height: 1.9; font-weight: 500;
}

/* Text spacing only (WCAG 1.4.12) — content must survive this. */
:root[data-a11y-spacing="true"] body {
  letter-spacing: .12em !important; word-spacing: .18em !important;
  line-height: 2 !important;
}
:root[data-a11y-spacing="true"] p { margin-block-end: 2em !important; }

/* Highlight links (WCAG 1.4.1 — never color alone). */
:root[data-a11y-links="true"] a:not([role="button"]) {
  text-decoration: underline !important;
  text-underline-offset: 3px;
  background: hsl(var(--primary) / .15);
  outline: 1px solid hsl(var(--primary) / .55);
  outline-offset: 1px; border-radius: 3px;
}

/* Bold focus (WCAG 2.2 — 2.4.13 Focus Appearance) — stronger than baseline. */
:root[data-a11y-focus="true"] :where(a,button,input,select,textarea,[tabindex]):focus-visible {
  outline: 4px solid hsl(var(--accent)) !important;
  outline-offset: 3px !important;
  box-shadow: 0 0 0 2px hsl(var(--background)) !important;
}

/* Big cursor (high-contrast SVG cursors). */
:root[data-a11y-cursor="true"], :root[data-a11y-cursor="true"] * {
  cursor: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><path d='M6 3 L6 38 L15 29 L21 43 L28 40 L22 26 L34 26 Z' fill='white' stroke='black' stroke-width='2.5' stroke-linejoin='round'/></svg>") 4 2, auto;
}
:root[data-a11y-cursor="true"] a,
:root[data-a11y-cursor="true"] button { cursor: pointer; }

/* Reading guide bar (driven by the ReadingGuide component). */
#a11y-reading-guide {
  position: fixed; inset-inline: 0; height: 3px;
  background: hsl(var(--accent)); box-shadow: 0 0 14px 1px hsl(var(--accent));
  pointer-events: none; z-index: 2147483000; display: none;
}
:root[data-a11y-guide="true"] #a11y-reading-guide { display: block; }
```

### 3.2 `index.html` — no-flash hydration (set prefs BEFORE React mounts)

Paste inside `<head>` (and set `lang`/`dir` on the root — see §4):

```html
<script>
  // Apply saved + OS accessibility prefs before first paint (prevents flash).
  (function () {
    try {
      var el = document.documentElement;
      var s = JSON.parse(localStorage.getItem('orca:a11y') || '{}');
      var mm = function (q) { return window.matchMedia && window.matchMedia(q).matches; };
      el.style.setProperty('--a11y-font-scale', String(s.fontScale || 1));
      el.dataset.a11yContrast  = s.contrast || (mm('(prefers-contrast: more)') ? 'high' : 'normal');
      el.dataset.a11yMotion    = (s.reducedMotion || mm('(prefers-reduced-motion: reduce)')) ? 'reduced' : 'normal';
      el.dataset.a11yGrayscale = String(!!s.grayscale);
      el.dataset.a11yReadable  = String(!!s.readableFont);
      el.dataset.a11ySpacing   = String(!!s.textSpacing);
      el.dataset.a11yLinks     = String(!!s.highlightLinks);
      el.dataset.a11yFocus     = String(!!s.boldFocus);
      el.dataset.a11yCursor    = String(!!s.bigCursor);
      el.dataset.a11yGuide     = String(!!s.readingGuide);
    } catch (e) {}
  })();
</script>
```

### 3.3 `src/accessibility/types.ts`

```ts
export type ContrastMode = 'normal' | 'high' | 'inverted';

export interface A11yPrefs {
  fontScale: number;        // 0.875 | 1 | 1.125 | 1.25 | 1.5 | 1.75 | 2
  contrast: ContrastMode;
  grayscale: boolean;
  highlightLinks: boolean;
  readableFont: boolean;
  textSpacing: boolean;
  bigCursor: boolean;
  boldFocus: boolean;
  readingGuide: boolean;
  reducedMotion: boolean;
}

export const FONT_SCALES = [0.875, 1, 1.125, 1.25, 1.5, 1.75, 2] as const;

export const DEFAULT_PREFS: A11yPrefs = {
  fontScale: 1,
  contrast: 'normal',
  grayscale: false,
  highlightLinks: false,
  readableFont: false,
  textSpacing: false,
  bigCursor: false,
  boldFocus: false,
  readingGuide: false,
  reducedMotion: false,
};

export const A11Y_STORAGE_KEY = 'orca:a11y';
```

### 3.4 `src/accessibility/AccessibilityProvider.tsx`

Hydration precedence: **OS preferences → localStorage → Supabase (if logged in)**. On change: write localStorage immediately + upsert to Supabase (debounced) when authenticated. On login: pull the server row if it exists, else push local prefs up.

```tsx
import {
  createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client'; // adjust to your path
import {
  type A11yPrefs, DEFAULT_PREFS, A11Y_STORAGE_KEY,
} from './types';

interface Ctx {
  prefs: A11yPrefs;
  setPref: <K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) => void;
  reset: () => void;
}

const AccessibilityContext = createContext<Ctx | null>(null);

function readLocal(): A11yPrefs {
  try {
    const raw = localStorage.getItem(A11Y_STORAGE_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

/** Mirror prefs onto <html> so the CSS engine reacts. */
function applyToDOM(p: A11yPrefs) {
  const el = document.documentElement;
  el.style.setProperty('--a11y-font-scale', String(p.fontScale));
  el.dataset.a11yContrast  = p.contrast;
  el.dataset.a11yMotion    = p.reducedMotion ? 'reduced' : 'normal';
  el.dataset.a11yGrayscale = String(p.grayscale);
  el.dataset.a11yReadable  = String(p.readableFont);
  el.dataset.a11ySpacing   = String(p.textSpacing);
  el.dataset.a11yLinks     = String(p.highlightLinks);
  el.dataset.a11yFocus     = String(p.boldFocus);
  el.dataset.a11yCursor    = String(p.bigCursor);
  el.dataset.a11yGuide     = String(p.readingGuide);
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<A11yPrefs>(readLocal);
  const userIdRef = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // keep DOM in sync
  useEffect(() => { applyToDOM(prefs); }, [prefs]);

  // debounced server upsert (only when authenticated)
  const persistServer = useCallback((p: A11yPrefs) => {
    if (!userIdRef.current) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase
        .from('accessibility_preferences')
        .upsert(
          { user_id: userIdRef.current!, prefs: p, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
        .then(({ error }) => { if (error) console.warn('[a11y] save failed', error.message); });
    }, 600);
  }, []);

  const commit = useCallback((next: A11yPrefs) => {
    setPrefs(next);
    try { localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next)); } catch {}
    persistServer(next);
  }, [persistServer]);

  const setPref = useCallback(
    <K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) =>
      commit({ ...prefsRef.current, [key]: value }),
    [commit],
  );

  // always-fresh ref so setPref never closes over stale state
  const prefsRef = useRef(prefs);
  useEffect(() => { prefsRef.current = prefs; }, [prefs]);

  const reset = useCallback(() => commit({ ...DEFAULT_PREFS }), [commit]);

  // sync with Supabase auth: pull server prefs, or seed them from local
  useEffect(() => {
    let active = true;

    const sync = async (userId: string | null) => {
      userIdRef.current = userId;
      if (!userId) return;
      const { data, error } = await supabase
        .from('accessibility_preferences')
        .select('prefs')
        .eq('user_id', userId)
        .maybeSingle();
      if (!active) return;
      if (!error && data?.prefs) {
        const merged = { ...DEFAULT_PREFS, ...(data.prefs as Partial<A11yPrefs>) };
        setPrefs(merged);
        try { localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(merged)); } catch {}
      } else {
        // no server row yet → seed from current local prefs
        persistServer(prefsRef.current);
      }
    };

    supabase.auth.getSession().then(({ data }) => sync(data.session?.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      sync(session?.user?.id ?? null),
    );
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [persistServer]);

  return (
    <AccessibilityContext.Provider value={{ prefs, setPref, reset }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error('useAccessibility must be used within <AccessibilityProvider>');
  return ctx;
}
```

### 3.5 `src/accessibility/ReadingGuide.tsx`

```tsx
import { useEffect } from 'react';
import { useAccessibility } from './AccessibilityProvider';

export function ReadingGuide() {
  const { prefs } = useAccessibility();
  useEffect(() => {
    if (!prefs.readingGuide) return;
    let bar = document.getElementById('a11y-reading-guide');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'a11y-reading-guide';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }
    const move = (e: PointerEvent) => { bar!.style.top = `${e.clientY}px`; };
    window.addEventListener('pointermove', move);
    return () => window.removeEventListener('pointermove', move);
  }, [prefs.readingGuide]);
  return null;
}
```

### 3.6 `src/accessibility/AccessibilityPanel.tsx`

Built on **Radix Dialog** (`@radix-ui/react-dialog`) styled as a **floating chat-style popup** anchored above the FAB (not a full-height sheet). Radix gives focus trapping, `Esc` to close, click-outside-to-close, scroll lock, `role="dialog"` + `aria-modal`, and focus restoration **for free** — exactly the modal semantics WCAG requires. The popup geometry, animation, scrim and scrollbar are the `.a11y-popup` / `.a11y-scrim` rules below — add them to your global stylesheet (§3.1):

```css
/* accessibility popup — floating chat-style card anchored to the FAB */
.a11y-popup{
  position:fixed; z-index:95;
  inset-block-end:6rem; inset-inline-end:1.25rem;     /* sits above the FAB, opposite the sidebar */
  width:min(360px, calc(100vw - 2rem));
  max-height:min(74vh, 560px);
  display:flex; flex-direction:column;
  border-radius:20px; overflow:hidden;
  background:linear-gradient(180deg, hsl(var(--card)), hsl(var(--background)));
  border:1px solid hsl(var(--border));
  box-shadow:0 24px 70px -18px rgba(0,0,0,.85), 0 2px 10px rgba(0,0,0,.5);
  transform-origin:bottom right;
}
[dir="rtl"] .a11y-popup{ transform-origin:bottom left }
.a11y-popup[data-state="open"]{ animation:a11yPopIn .2s cubic-bezier(.22,1,.36,1) }
@keyframes a11yPopIn{ from{ opacity:0; transform:scale(.92) translateY(12px) } to{ opacity:1; transform:none } }
.a11y-scrim{ position:fixed; inset:0; z-index:94; background:rgb(3 5 11 / .42); backdrop-filter:blur(2px) }
@media (max-width:480px){
  .a11y-popup{ inset-inline:.75rem; width:auto; inset-block-end:5.25rem; max-height:80vh }
}
@media (prefers-reduced-motion:reduce){ .a11y-popup[data-state="open"]{ animation:none } }
/* refined thin scrollbar inside the popup body */
.a11y-popup__body{ scrollbar-width:thin; scrollbar-color:hsl(var(--muted-foreground) / .4) transparent }
.a11y-popup__body::-webkit-scrollbar{ width:10px }
.a11y-popup__body::-webkit-scrollbar-thumb{
  background:hsl(var(--muted-foreground) / .35); border:3px solid transparent;
  background-clip:padding-box; border-radius:999px;
}
.a11y-popup__body::-webkit-scrollbar-thumb:hover{ background:hsl(var(--primary) / .6); background-clip:padding-box; border:3px solid transparent }
```

```tsx
import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Accessibility, Minus, Plus, X } from 'lucide-react';
import { useAccessibility } from './AccessibilityProvider';
import { FONT_SCALES, type ContrastMode } from './types';

const TOGGLES: { key: keyof ReturnType<typeof useAccessibility>['prefs']; label: string; hint: string }[] = [
  { key: 'grayscale',     label: 'גווני אפור',     hint: 'הסרת צבעים מהתצוגה' },
  { key: 'highlightLinks',label: 'הדגשת קישורים',  hint: 'קו תחתון ומסגרת לכל קישור' },
  { key: 'readableFont',  label: 'גופן קריא',      hint: 'פונט ברור עם מרווח מוגדל' },
  { key: 'textSpacing',   label: 'מרווח טקסט',     hint: 'ריווח שורות ואותיות' },
  { key: 'bigCursor',     label: 'סמן עכבר גדול',  hint: 'סמן בקונטרסט גבוה' },
  { key: 'boldFocus',     label: 'הדגשת פוקוס',    hint: 'מסגרת בולטת לניווט מקלדת' },
  { key: 'readingGuide',  label: 'מדריך קריאה',    hint: 'סרגל שעוקב אחרי העכבר' },
  { key: 'reducedMotion', label: 'עצירת אנימציות', hint: 'השבתת תנועה ומעברים' },
];

const CONTRASTS: { value: ContrastMode; label: string }[] = [
  { value: 'normal', label: 'רגיל' },
  { value: 'high', label: 'גבוהה' },
  { value: 'inverted', label: 'הפוכה' },
];

export function AccessibilityPanel() {
  const { prefs, setPref, reset } = useAccessibility();
  const [open, setOpen] = useState(false);

  // global shortcut: Alt + A
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && (e.code === 'KeyA')) { e.preventDefault(); setOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const scaleIdx = Math.max(0, FONT_SCALES.indexOf(prefs.fontScale as typeof FONT_SCALES[number]));
  const stepFont = (dir: 1 | -1) => {
    const i = Math.min(FONT_SCALES.length - 1, Math.max(0, scaleIdx + dir));
    setPref('fontScale', FONT_SCALES[i]);
  };

  return (
    <>
      {/* Floating trigger (FAB) */}
      <button
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="פתח הגדרות נגישות"
        className="fixed bottom-6 end-6 z-[60] grid h-14 w-14 place-items-center rounded-full
                   bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-950 shadow-lg
                   transition-transform hover:scale-105
                   focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400"
      >
        <Accessibility className="h-7 w-7" aria-hidden="true" />
      </button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="a11y-scrim" />
          <Dialog.Content className="a11y-popup" aria-describedby={undefined}>
            <header className="flex items-center justify-between border-b border-border/60 p-4">
              <Dialog.Title className="flex items-center gap-2.5 text-base font-bold">
                <Accessibility className="h-5 w-5 text-amber-400" aria-hidden="true" />
                הגדרות נגישות
              </Dialog.Title>
              <Dialog.Close
                aria-label="סגור"
                className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground
                           transition hover:bg-card hover:text-foreground
                           focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">
                <X className="h-4 w-4" aria-hidden="true" />
              </Dialog.Close>
            </header>

            <div className="a11y-popup__body flex-1 overflow-y-auto p-4 space-y-5">
            {/* Text size */}
            <section aria-labelledby="a11y-size">
              <h3 id="a11y-size" className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-400">גודל טקסט</h3>
              <div className="flex items-center gap-2.5">
                <button onClick={() => stepFont(1)} aria-label="הגדל טקסט"
                  className="grid h-14 flex-1 place-items-center rounded-xl border border-border bg-card text-2xl font-bold
                             hover:border-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400">+א</button>
                <div className="min-w-[62px] text-center">
                  <div className="text-lg font-bold tabular-nums">{Math.round(prefs.fontScale * 100)}%</div>
                  <div className="text-[10px] text-muted-foreground">גופן</div>
                </div>
                <button onClick={() => stepFont(-1)} aria-label="הקטן טקסט"
                  className="grid h-14 flex-1 place-items-center rounded-xl border border-border bg-card text-base font-bold
                             hover:border-amber-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400">-א</button>
              </div>
            </section>

            {/* Contrast */}
            <section aria-labelledby="a11y-contrast">
              <h3 id="a11y-contrast" className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-400">ניגודיות</h3>
              <div role="group" aria-label="מצב ניגודיות" className="grid grid-cols-3 gap-2">
                {CONTRASTS.map(c => (
                  <button key={c.value} onClick={() => setPref('contrast', c.value)}
                    aria-pressed={prefs.contrast === c.value}
                    className={`h-11 rounded-xl border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400
                      ${prefs.contrast === c.value
                        ? 'border-transparent bg-gradient-to-br from-amber-300 to-yellow-500 text-slate-950'
                        : 'border-border bg-card text-muted-foreground hover:border-slate-500'}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Toggles */}
            <section aria-labelledby="a11y-display">
              <h3 id="a11y-display" className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-400">התאמות תצוגה</h3>
              <div className="space-y-2.5">
                {TOGGLES.map(t => {
                  const on = Boolean(prefs[t.key]);
                  return (
                    <button key={String(t.key)} onClick={() => setPref(t.key, !on as never)}
                      aria-pressed={on}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card/60 p-3.5 text-start
                                 transition hover:border-slate-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400">
                      <span className="flex flex-col">
                        <span className="text-sm font-semibold">{t.label}</span>
                        <span className="text-[11.5px] text-muted-foreground">{t.hint}</span>
                      </span>
                      <span aria-hidden="true"
                        className={`relative h-7 w-11 flex-none rounded-full transition
                          ${on ? 'bg-gradient-to-br from-amber-300 to-yellow-500' : 'bg-slate-600'}`}>
                        <span className={`absolute top-[3px] h-[21px] w-[21px] rounded-full bg-white shadow transition-all
                          ${on ? 'start-[22px]' : 'start-[3px]'}`} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="border-t border-border/60 p-5">
            <button onClick={reset}
              className="h-12 w-full rounded-xl border border-border font-semibold transition hover:border-amber-400 hover:bg-card
                         focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cyan-400">
              איפוס הגדרות
            </button>
            <p className="mt-3.5 text-center text-[12.5px] text-muted-foreground">
              נתקלתם בבעיית נגישות?{' '}
              <a href="/accessibility" className="text-cyan-400 underline underline-offset-2
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded">הצהרת הנגישות</a>
            </p>
          </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
```

### 3.7 Wire it into the app root

```tsx
// main.tsx / App.tsx
import { AccessibilityProvider } from '@/accessibility/AccessibilityProvider';
import { AccessibilityPanel } from '@/accessibility/AccessibilityPanel';
import { ReadingGuide } from '@/accessibility/ReadingGuide';

export default function App() {
  return (
    <AccessibilityProvider>
      {/* Skip link — first focusable element on the page (WCAG 2.4.1) */}
      <a href="#main-content"
         className="sr-only focus:not-sr-only focus:absolute focus:start-1/2 focus:top-0 focus:z-[200]
                    focus:-translate-x-1/2 focus:rounded-b-lg focus:bg-amber-400 focus:px-4 focus:py-2.5
                    focus:font-bold focus:text-slate-950">
        דלג לתוכן הראשי
      </a>

      <div id="orca-app-root">
        {/* ...your routes/layout... main region must carry id="main-content" + tabIndex={-1} */}
      </div>

      <AccessibilityPanel />
      <ReadingGuide />
    </AccessibilityProvider>
  );
}
```

### 3.8 Supabase migration

```sql
-- accessibility_preferences: one row per user, prefs as JSONB
create table if not exists public.accessibility_preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  prefs      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.accessibility_preferences enable row level security;

create policy "a11y_select_own"
  on public.accessibility_preferences for select
  using (auth.uid() = user_id);

create policy "a11y_insert_own"
  on public.accessibility_preferences for insert
  with check (auth.uid() = user_id);

create policy "a11y_update_own"
  on public.accessibility_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

### 3.9 Internationalization — the panel follows the active app language
ORCA auto-detects the browser language and switches the platform locale (`he`/`en`). The accessibility panel is part of that: it renders in **whichever language the app is currently in**, one language at a time (never mixed), and its layout direction follows automatically because every position uses **logical** CSS properties (`inset-inline-*`), not `left`/`right`.

Rules:
- Wire every panel string through the existing i18n (`t('a11y.…')`) — never hardcode Hebrew.
- Set `<html lang dir>` from the active locale (`lang="he" dir="rtl"` or `lang="en" dir="ltr"`); do **not** hardcode `dir="rtl"`.
- The FAB uses `inset-inline-end`, so it sits opposite the sidebar in both directions automatically.
- The popup is anchored opposite the sidebar via logical `inset-inline-end` and opens above the FAB, so direction (RTL/LTR) is handled automatically — there is no physical `side` prop to compute.

| key | he | en |
|---|---|---|
| `a11y.fab` | פתח הגדרות נגישות | Open accessibility settings |
| `a11y.title` | הגדרות נגישות | Accessibility settings |
| `a11y.close` | סגור | Close |
| `a11y.textSize` | גודל טקסט | Text size |
| `a11y.bigger` / `a11y.smaller` | הגדל טקסט / הקטן טקסט | Increase text / Decrease text |
| `a11y.contrast` | ניגודיות | Contrast |
| `a11y.contrast.normal/high/inverted` | רגיל / גבוהה / הפוכה | Normal / High / Inverted |
| `a11y.display` | התאמות תצוגה | Display adjustments |
| `a11y.grayscale` | גווני אפור | Grayscale |
| `a11y.links` | הדגשת קישורים | Highlight links |
| `a11y.readable` | גופן קריא | Readable font |
| `a11y.spacing` | מרווח טקסט | Text spacing |
| `a11y.cursor` | סמן עכבר גדול | Large cursor |
| `a11y.focus` | הדגשת פוקוס | Strong focus |
| `a11y.guide` | מדריך קריאה | Reading guide |
| `a11y.motion` | עצירת אנימציות | Stop animations |
| `a11y.reset` | איפוס הגדרות | Reset settings |
| `a11y.statement` | הצהרת הנגישות | Accessibility statement |

`aria-live` announcements localize too: `t('a11y.announce.fontSize', { pct })` → "גודל טקסט 125 אחוז" / "Text size 125 percent".

---

## 4. Layer 1 — The Accessible Foundation (★ where compliance lives)

This is the part the panel cannot do for you, and the part lawsuits are actually about. Map each item to ORCA. WCAG criteria noted in `(brackets)`.

**Document & structure**
- `<html>` `lang` and `dir` must reflect the **active locale**, set dynamically by your language detection: `lang="he" dir="rtl"` for Hebrew, `lang="en" dir="ltr"` for English — do **not** hardcode `dir="rtl"`. Mark opposite-language runs with their own `lang` *(3.1.1, 3.1.2)*.
- One `<h1>` per page; headings in logical order with no skipped levels *(1.3.1, 2.4.6)*.
- Real landmarks: `<header>`, `<nav>`, `<main id="main-content" tabindex="-1">`, `<aside>`, `<footer>` *(1.3.1, 2.4.1)*. The skip link in §3.7 targets `#main-content`.

**Keyboard & focus**
- Everything operable by keyboard; no traps *(2.1.1, 2.1.2)*. Test ORCA with the mouse unplugged.
- Logical tab order; visible focus on every control — the baseline ring in §3.1 covers this *(2.4.3, 2.4.7)*.
- **Modals / bottom-sheets:** trap focus inside, restore on close, `Esc` to close, `role="dialog"` + `aria-modal="true"` + `aria-labelledby`. Use shadcn `Dialog`/`Sheet` (Radix) for all of them — your mobile bottom-sheet conversion work should standardize on this so every modal is correct by construction.

**Forms — your trade-entry & onboarding consent are high-risk surfaces**
- Every input has a programmatically associated `<label>` (or `aria-label`) — *missing labels are the #1 IS 5568 failure* *(1.3.1, 3.3.2, 4.1.2)*.
- Errors are identified in text (not color alone), linked to the field via `aria-describedby`, and announced via an `aria-live` region *(3.3.1, 1.4.1, 4.1.3)*.
- Required fields and formats are stated in the label, not only enforced on submit.
- The onboarding consent step (`consent_log`) must be fully keyboard- and screen-reader-operable.

**Color & contrast — AUDIT THE GOLD/CYAN PALETTE**
- Body text ≥ **4.5:1**, large text (≥24px or ≥19px bold) and UI components/borders ≥ **3:1** *(1.4.3, 1.4.11)*.
- ⚠️ Gold (`#E5B94E`-ish) and cyan on navy are at risk for small text and for the cyan-on-navy combination. Run every token pair through a contrast checker; where a combo fails for body text, reserve it for large text / non-text use or darken/lighten the token. Don't assume — measure.
- Never encode meaning by color alone (win/loss, up/down, status dots) — pair with a glyph, label, or shape *(1.4.1)*. Your `+R / -R` and green/red deltas need a non-color cue (▲/▼, "+"/"−").
- **Links inside body text must be distinguishable without color by default** — i.e. underlined (or another non-color cue) in their *resting* state, not only on hover/focus and not only when the "highlight links" pref is on *(1.4.1, "link-in-text-block")*. In testing, axe-core flagged this exact pattern as a **serious** violation when in-prose links were color-only. Add to your base stylesheet so it ships on by default:
  ```css
  /* content links distinguishable without color (1.4.1) */
  main :where(p, li, .prose, [data-rich-text]) a:not([role="button"]):not(.btn) {
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  ```
  Nav items, buttons, and card-as-link tiles are exempt (they're distinguished by layout/role); scope the rule to text contexts as above so it doesn't underline your whole UI.

**Charts & data viz — the biggest ORCA-specific gap (Recharts everywhere)**
- A chart that's only an SVG of colored lines is invisible to screen readers. For each chart *(1.1.1, 1.4.1)*:
  - Give the chart container an accessible name + one-sentence summary (`role="img"` + `aria-label`, or a visually-hidden caption).
  - Provide the underlying numbers as a **visually-hidden (or toggleable) data table** — this is the real text alternative and doubles as a "view data" feature users like.
  - Don't distinguish series by color alone; add patterns/markers/direct labels.
  - Respect reduced motion for entrance/transition animations (the engine's global rule covers CSS; for Recharts use `isAnimationActive={!reducedMotion}`).

**Images, icons, media**
- Meaningful images: descriptive `alt`. Decorative images: `alt=""` *(1.1.1)*.
- Icon-only buttons (you have many) need an accessible name: `aria-label` or visually-hidden text *(4.1.2)*.

**Motion, timing, zoom**
- Honor reduced motion globally — engine §3.1 does this for CSS; also gate JS/Recharts animations on the pref *(2.3.3, 2.2.2)*.
- No content flashing >3×/sec *(2.3.1)*.
- Content reflows with no loss at **320px** width and at **200% zoom** *(1.4.10, 1.4.4)* — dovetails with your mobile remediation waves.
- `<meta name="viewport">` must **allow** user scaling (no `user-scalable=no`, no `maximum-scale=1`).
- A trading journal may have session timeouts — if so, warn and allow extension *(2.2.1)*.

**Dynamic updates**
- Toasts and async status (sync results, import progress, save confirmations) go through an `aria-live="polite"` region so screen-reader users hear them *(4.1.3)*.

**WCAG 2.2 additions worth doing now (cheap future-proofing)**
- Interactive targets ≥ **24×24px** *(2.5.8)*; "Help"/contact in a consistent place *(3.2.6)*; don't force re-entry of data already given in a flow *(3.3.7)*; the bold-focus pref already addresses focus appearance *(2.4.13)*.

---

## 5. The Accessibility Statement — הצהרת נגישות (required: IL + EU)

Publish at **`/accessibility`** (the panel and footer link here). Israeli law requires a statement **and** a named **רכז נגישות**; the EAA requires a statement with a **feedback mechanism + known limitations**. The bilingual page below satisfies both. **Fill every `[bracket]`.**

> **Do not** state "the site is fully accessible / 100% WCAG compliant." State the **target standard, the date, and known limitations honestly.** Over-claiming is the exact thing the FTC penalized.

```md
# הצהרת נגישות · Accessibility Statement

## עברית

חברת [שם החברה / ORCA Investment OS] רואה חשיבות עליונה במתן שירות שוויוני לכלל
המשתמשים, ופועלת להנגשת הפלטפורמה בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות,
התשנ"ח-1998, ולתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות),
התשע"ג-2013, ברמת התאמה התואמת את תקן ישראלי ת"י 5568 (מבוסס WCAG) ברמה AA.

**אמצעי הנגישות באתר** כוללים, בין היתר: מבנה סמנטי וניווט מלא במקלדת; חיווי פוקוס
נראה; תאימות לקוראי מסך; ניגודיות צבעים תקנית; אפשרות הגדלת טקסט עד 200%;
מצבי ניגודיות חלופיים; וכיבוד העדפת "הפחתת תנועה". בנוסף, האתר כולל פאנל הגדרות
נגישות ייעודי לכוונון חוויית השימוש.

**החרגות וסייגים:** [פרטו רכיבים שטרם הונגשו במלואם, אם קיימים — לדוגמה: גרפים
אינטראקטיביים מסוימים / תוכן צד-שלישי. אם אין — ציינו כי לא ידוע על מגבלות.]

**רכז הנגישות:** [שם מלא], [תפקיד]
דוא"ל: [email] · טלפון: [phone]
נשתדל להשיב לפניות בנושא נגישות בתוך [X] ימי עסקים.

אם נתקלתם ברכיב שאינו נגיש, נשמח שתעדכנו אותנו ונפעל לתיקון בהקדם.

**תאריך עדכון ההצהרה:** [DD/MM/YYYY]

---

## English

[Company name / ORCA Investment OS] is committed to providing an equitable
experience for all users. We aim to conform to **WCAG 2.1 Level AA**, the
technical standard underlying Israel's IS 5568, the EU's EN 301 549 (European
Accessibility Act, Directive (EU) 2019/882), and the benchmark applied under the
US ADA and Section 508.

**Accessibility features** include: semantic structure and full keyboard
operability; visible focus indicators; screen-reader compatibility; compliant
color contrast; text resizing up to 200%; alternative contrast modes; respect
for the "reduced motion" preference; and a dedicated accessibility settings panel.

**Known limitations:** [List any components not yet fully accessible, or state
that none are currently known.]

**Feedback & contact (Accessibility Coordinator):** [Full name], [role]
Email: [email] · Phone: [phone]
We aim to respond to accessibility enquiries within [X] business days.

If you encounter an accessibility barrier, please tell us and we will work to fix it.

**Statement last updated:** [YYYY-MM-DD]
```

Also: add a permanent **"הצהרת נגישות / Accessibility"** link in the site **footer**, not only inside the panel.

---

## 6. Verification — because the panel is not proof

The panel makes ORCA *better*; it does not make ORCA *compliant*. Verify Layer 1 like this:

1. **Automated (catches ~30–40%):** run **axe DevTools** (browser extension) and **Lighthouse → Accessibility** on every key route. Fix everything flagged. Treat a green score as necessary, never sufficient.
2. **Keyboard-only pass:** unplug the mouse. Reach and operate every control; confirm focus is always visible and never trapped; confirm `Esc` closes modals; confirm the skip link works.
3. **Screen-reader pass:** **NVDA** (Windows, free) and **VoiceOver** (Mac/iOS). Run the core flows. Confirm headings, labels, button names, form errors, chart summaries, and toasts are all announced. Test in **Hebrew** (RTL) specifically.
4. **Zoom & reflow:** browser zoom to **200%** and a **320px** viewport — no clipped or lost content.
5. **Contrast sweep:** check every token pair (esp. gold/cyan-on-navy) in a contrast checker.
6. **Reduced motion:** enable OS "reduce motion" and the panel toggle; confirm animations stop, including Recharts.
7. **Before you publish a conformance claim:** commission a one-off **professional WCAG 2.1 AA audit**, and ideally **usability testing with disabled users** (the only way to catch what tools miss). Keep the audit + remediation records — documentation is itself legal protection.

---

## 7. Lovable prompt (paste-ready)

> Implement a native accessibility system for ORCA — **do not** install any third-party accessibility overlay (accessiBe/UserWay/EqualWeb). Build exactly to the spec file I'm providing. Two layers:
>
> **Layer A — Preferences panel & engine.** Create `src/accessibility/{types.ts, AccessibilityProvider.tsx, AccessibilityPanel.tsx, ReadingGuide.tsx}` exactly as specified. Add the CSS engine block to the global stylesheet (`:root` CSS variable `--a11y-font-scale`, `html` font-size scaling, the `data-a11y-*` contrast/motion/links/readable/spacing/cursor/focus/guide rules, and the baseline `:focus-visible`). Add the no-flash hydration `<script>` to `index.html` and ensure `<html>` `lang`/`dir` are set from the active locale (he/rtl or en/ltr). Wrap the app in `<AccessibilityProvider>`, render `<AccessibilityPanel/>` + `<ReadingGuide/>`, add the skip link, and give the primary content region `id="main-content" tabIndex={-1}`. Persist prefs to `localStorage` immediately and to Supabase table `accessibility_preferences` when authenticated (create the table + RLS migration as specified). The panel is a floating chat-style popup built on **Radix Dialog** (`@radix-ui/react-dialog`), positioned as a rounded card anchored above the FAB (not a full-height sheet); add its `.a11y-popup`/`.a11y-scrim`/scrollbar CSS to the global stylesheet. All panel strings localized through the app's i18n (Hebrew in `he`, English in `en` — one language at a time, matching the active platform language; never hardcode Hebrew); layout direction (RTL/LTR) and the FAB/panel side follow automatically via logical CSS properties (`inset-inline-end`), and the FAB + popup sit opposite the sidebar via logical CSS properties (`inset-inline-end`), so they flip automatically with direction (no physical `side` prop); navy-black with gold/cyan accents, Heebo/Poppins. Real text scaling up to 200%, real contrast palettes (remap the shadcn HSL tokens — do not use a fake darkening filter as the contrast story).
>
> **Layer B — Foundation fixes.** Audit and fix: missing form `<label>`s (esp. trade-entry + onboarding consent), icon-only buttons without `aria-label`, color-only status cues (add ▲/▼/+/− glyphs to win-loss and deltas), modal focus-trap/Esc/restore (standardize on Radix `Dialog`/`Sheet`), heading order + landmarks, `aria-live` for toasts and async sync/import status, and **chart accessibility** — give each Recharts chart an accessible name, a one-sentence summary, a visually-hidden data-table alternative, and gate its animation on the reduced-motion pref. Verify no `user-scalable=no` in the viewport meta and convert any hard-coded `px` font sizes to rem so scaling cascades.
>
> Then create the `/accessibility` route rendering the bilingual statement, and add an "הצהרת נגישות" link in the footer. **Do not** add any text claiming the site is "fully" or "100%" compliant.

---

## 8. Iron rules (don't let these drift)

1. **Foundation before panel.** The panel is a complement; the source code is the compliance. A screen-reader user must finish core flows without ever opening it.
2. **Never claim 100% / "fully compliant."** State the target (WCAG 2.1 AA), the date, and known limitations. Over-claiming is what the FTC penalized.
3. **No silent disability detection.** Don't sniff assistive tech or store disability data without consent (GDPR/privacy). Prefs are user-chosen, stored per-user under RLS.
4. **Real, not cosmetic.** Real rem scaling; real contrast palettes that hit the ratios; real motion control. A grayscale filter is a nice-to-have, never the contrast solution.
5. **Reduced motion is honored globally** from the OS media query, not only via the toggle.
6. **One UI language per surface** (your standing rule). The *panel* follows the **active app language** (Hebrew in `he`, English in `en` — one language at a time, never mixed), driven by your browser-language detection; the *statement* is intentionally bilingual.
7. **Charts are content.** Every chart needs a text alternative. No exceptions — this is ORCA's single biggest a11y exposure.
8. **Test with the mouse unplugged and a screen reader on** before claiming anything.

---

### Sources verified for the legal section
Israeli Equal Rights Law 1998 + Accessibility Regulations + IS 5568 (WCAG 2.0/2.1 AA, ₪50k statutory damages, mandatory statement + coordinator); EU EAA Directive 2019/882 enforceable 28 June 2025 + EN 301 549 v3.2.1 = WCAG 2.1 AA (covers banking/finance + e-commerce, extraterritorial, microenterprise <10 staff & <€2M); US ADA Title III (WCAG 2.1 AA via case law), Section 508 (WCAG 2.1 AA), DOJ Title II 2024 rule (WCAG 2.1 AA); FTC v. accessiBe $1M order (Apr 2025); EU Commission rejection of overlays; Overlay Fact Sheet (800+ signatories); UsableNet litigation data (~25% of 2024 suits hit overlay sites).
