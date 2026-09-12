/* ============================================================================
   FIRST-RUN UI — copy map (single source of UI strings). English-only for now;
   the platform adds language switching later (the `lang` prop stays in every
   contract). Keep all user-facing text here — components must not hardcode it.
   ========================================================================== */

export const COPY = {
  auth: {
    title: 'Welcome to Orca',
    sub: 'Sign in or create your account to begin — it’s free, no card required.',
    google: 'Continue with Google',
    connecting: 'Connecting…',
    error: 'Sign-in didn’t go through. Please try again.',
    offline: 'You appear to be offline. Check your connection and try again.',
    retry: 'Try again',
    legal: 'By continuing you’ll review and sign our Terms & Privacy.',
    terms: 'Terms',
    privacy: 'Privacy',
    back: 'Back',
  },

  legal: {
    read: 'Please read through, then confirm below.',
    agreeTerms: 'I have read and agree to the Terms of Service.',
    agreePrivacy: 'I have read and understand the Privacy Policy.',
    accept: 'Agree & continue',
    saving: 'Recording your consent…',
    saveErr: 'We couldn’t record your consent. Please try again.',
    retry: 'Try again',
    back: 'Back',
    scrollHint: 'Scroll to read the full document',
    version: 'Version',
    consent: 'By continuing you sign this document electronically.',
  },

  onboarding: {
    common: { back: 'Back', next: 'Continue', finish: 'Finish', saving: 'Saving…', saveErr: 'We couldn’t save that step. Please try again.' },
    stepOf: (i: number, n: number) => `Step ${i} of ${n}`,
    labels: { identity: 'You', community: 'Community', experience: 'Experience', palette: 'Theme', riskMatrix: 'Risk', briefing: 'Briefing', commitment: 'Commitment' },
    heads: {
      identity: { t: 'First, the basics', s: 'Tell us who’s behind the trades.' },
      community: { t: 'Are you one of us?', s: 'Members get a tailored start.' },
      experience: { t: 'Where are you today?', s: 'So Orca meets you at your level.' },
      palette: { t: 'Make it yours', s: 'Pick a color theme — you can change it anytime.' },
      riskMatrix: { t: 'Set your guardrails', s: 'Your risk limits power the Risk Engine from day one.' },
      briefing: { t: 'Here’s the plan', s: 'What Orca will do for you next.' },
      commitment: { t: 'One last thing', s: 'A promise to your future self.' },
    },
    identity: { label: 'Your full name', ph: 'e.g. Alex Morgan', help: 'This is how Orca will greet you.', err: 'Please enter your name (at least 2 letters).' },
    community: {
      member: 'Yes, I’m a member', memberSub: 'I’m in the Orca community',
      not: 'Not yet', notSub: 'I’d like to join',
      qrTitle: 'Scan to verify your membership', qrNote: 'Open the community app and scan this code.',
      placeholder: 'QR placeholder — real code injected on connect',
    },
    experience: {
      beginner: 'Beginner', beginnerSub: 'New to trading, or under a year in.',
      intermediate: 'Intermediate', intermediateSub: 'A year or two, still finding my edge.',
      advanced: 'Advanced', advancedSub: 'Experienced, refining a proven process.',
    },
    palette: {
      hint: 'This sets the look of your whole platform. You can change it later in Settings.',
      midnight: 'Midnight', midnightSub: 'Classic black · Default',
      blue: 'Blue', blueSub: 'Deep navy · Sky blue',
      graphite: 'Graphite Formal', graphiteSub: 'Gray · Green · Red only',
      platinum: 'Light', platinumSub: 'Clean white · Indigo',
    },
    riskMatrix: {
      hint: 'USD risk budgets — the Risk Engine uses these limits and blocks new risk once one is hit. You can adjust them anytime in Settings.',
      perTrade: 'Risk per trade', perTradeHelp: 'Max you’ll risk on a single trade.',
      daily: 'Daily limit', dailyHelp: 'Max risk in one day.',
      weekly: 'Weekly limit', weeklyHelp: 'Max risk in one week.',
      monthly: 'Monthly limit', monthlyHelp: 'Max risk in one month.',
      unit: '$',
      err: 'Enter a positive amount for each limit.',
    },
    briefing: {
      beginner: { title: 'We’ll keep it simple to start', points: ['Connect read-only — Orca builds the journal for you', 'Plain-language insights, one lesson at a time', 'No jargon, no pressure — learn as you go'] },
      intermediate: { title: 'Let’s sharpen your edge', points: ['See where your real edge hides in the data', 'Catch the leaks costing you R', 'Build a repeatable, measured process'] },
      advanced: { title: 'Precision tools, ready for you', points: ['Deep analytics, risk engine and Trader DNA', 'Statistical significance — no chasing noise', 'Everything on your device, provable and private'] },
    },
    commitment: {
      title: 'A quick commitment to yourself',
      body: 'Orca isn’t a signals service. It’s a mirror. I’ll review my own trades honestly, follow my plan, and treat every loss as information — not a verdict.',
      checkbox: 'I commit to trading my process, not my emotions.',
    },
  },

  completion: {
    title: (name?: string) => (name ? `You’re all set, ${name}.` : 'You’re all set.'),
    sub: 'Your account is ready. Connect a broker and Orca starts turning your trades into one better decision.',
    enter: 'Enter Orca',
    pills: ['Journal builds itself', 'Insights on your device', 'Free to start'],
  },
} as const
