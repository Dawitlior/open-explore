# First-Run UI (handoff package)

Presentation-only React/TypeScript for the first-run flow:
**Auth → Terms → Privacy → Onboarding → Completion.**

Built to the Lovable handoff spec: every screen receives data + a `status`
through **props** and reports intent through **callbacks**. No auth, cloud,
routing, storage, network or analytics — Lovable wires those after handoff.
Visual language is Orca's cool-light / violet (deliberate — matches the
marketing site, independent of the platform's own theme).

## Review the flow

```
npm run dev      # then open /first-run
```

`/first-run` mounts `FirstRunDemo` — in-memory only, with a top control bar to
switch screen and status (idle/loading/error/offline). It never saves, calls the
network, or touches localStorage. It is **not** part of the product; Lovable
replaces it with real routing/state.

> Language: the flow ships **English-only**. The `lang` prop is kept in every
> contract so the platform can add languages later; the demo forces `en`.

## Consume a component

```tsx
import { AuthScreen, LegalStep, OnboardingFlow, CompletionScreen } from '@/features/first-run-ui'

<AuthScreen lang="en" status={status} onGoogleSignIn={...} onOpenLegal={...} />

<LegalStep lang="en" kind="terms" title={title} sections={sections}
           versionLabel="2.0" status={status} onAccept={...} onBack={...} />

<OnboardingFlow lang="en" status={status}
                communityQrSrc={qrUrl}
                onSaveStep={(step, partial) => ...}
                onComplete={(answers) => ...} />

<CompletionScreen lang="en" fullName={name} onEnterApp={...} />
```

Full prop types live in `first-run.types.ts`. Status values: `idle | loading |
submitting | success | error`.

## Advancement is gated (verified)

- **Onboarding:** the `Continue` button is `disabled` and `goNext()` is blocked
  until the current step reports valid. Per-step rules:
  - Identity — full name ≥ 2 chars
  - Community — a choice is made (member/not); QR shows for members
  - Experience — a level is chosen
  - Briefing — informational, always advanceable (no data captured)
  - Commitment — the commitment checkbox is ticked
- **Legal (digital signatures):** the accept CTA is `disabled` until the
  "I have read and agree" checkbox is ticked, on **both** Terms and Privacy.

## Files

```
first-run.types.ts        # contracts (props, Answers, UiStatus, Lang)
first-run.tokens.ts       # token map (roles → project token classes)
first-run.legal.ts        # authoritative Terms + Privacy (typed), passed via props
legal/terms.json          # raw delivered source of first-run.legal.ts
legal/privacy.json        # raw delivered source of first-run.legal.ts
components/ui.tsx         # local kit: Button, TextField, StatusBanner, ScreenShell, Spinner, Brand
components/AuthScreen.tsx
components/LegalStep.tsx
components/OnboardingProgress.tsx
components/OnboardingFlow.tsx
components/CompletionScreen.tsx
steps/IdentityStep.tsx ... CommitmentStep.tsx
FirstRunDemo.tsx          # demo harness (not shipped)
index.ts                  # exports
```

## Accessibility

Real labels + `aria-describedby` for errors; `aria-live` on status banners;
visible focus rings; focus moves to the step heading on change; ≥44px targets;
selection states are not color-only (icon + border + tint).

## Content status

- **Legal copy — delivered.** Authoritative Terms (v1.0) and Privacy Policy (v1.0)
  live in `first-run.legal.ts` (raw source: `legal/*.json`) and are passed to
  `<LegalStep>` via props. Update = edit the JSON/TS and the version label.
- **Community QR — delivered.** Real code at `public/orca-community-qr.png`,
  passed as `communityQrSrc`.

## Known gaps

- No `LandingPage` component here — the marketing landing already exists on the site.
- Screenshots (desktop + mobile per screen) to be attached with the final handoff.
