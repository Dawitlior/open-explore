// Wave-0 side-by-side parity gate.
//
// Goal: prove the schema-driven renderer emits DOM that is structurally
// equivalent to the legacy WeeklyTab.tsx JSX path for every block the
// renderer owns. The legacy path is NOT mounted here (it requires Cloud,
// `useWeeklyReviewState`, broker state, etc.); instead we encode the
// legacy contract as the canonical label lists copied verbatim from
// WeeklyTab.tsx and assert the renderer emits them in identical order
// and count, in both locales, for both LTR and RTL.
//
// If WeeklyTab.tsx labels diverge from this gate, the gate breaks and
// forces the seed to be reconciled — that is the intent.
//
// Gate must be green before WR_SCHEMA_RENDERER_ENABLED can flip to true.

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ORCA_DEFAULT_TEMPLATE } from '../../lib/wr-default-template';
import { WeeklyReviewRenderer } from '../WeeklyReviewRenderer';
import { readDraft } from '../legacy-adapter';
import { EMPTY_DRAFT } from '../../hooks/use-week-draft';

// ── Canonical labels — copied verbatim from tabs/WeeklyTab.tsx ────────────
// If these drift from WeeklyTab.tsx the seed is wrong; fix the seed.

const LEGACY = {
  prepEN: ['Coffee ready ☕', 'Open Statistical Trade Log', 'Open Weekly Calendar', 'Open Market Journal'],
  prepHE: ['הכנת קפה ☕', 'פתיחת לוג סטטיסטי (Statistical Trade Log)', 'פתיחת יומן קלנדרי (Weekly Calendar)', 'פתיחת Market Journal'],
  edgeEN: [
    'Did the Primary Setup behave as expected?',
    'Was this a statistically normal week for the setup?',
    'Did I force any non-clean trades?',
    'Did every trade follow the rules?',
  ],
  edgeHE: [
    'האם ה-Primary Setup התנהג כצפוי?',
    'האם זה היה שבוע סטטיסטי נורמלי לסטאפ?',
    'האם כפיתי עסקאות לא נקיות (Forced Trades)?',
    'האם כל העסקאות עקבו אחרי החוקים?',
  ],
  execEN: [
    'Entry followed the plan',
    'Stop Loss respected',
    'Did not chase price',
    'Correct position size',
    'No revenge trade',
  ],
  execHE: [
    'כניסה עקבה אחרי התוכנית',
    'Stop Loss נשמר',
    'לא רדפתי אחרי מחיר',
    'גודל פוזיציה נכון',
    'ללא מסחר נקמה',
  ],
  emotions:    ['In the Zone', 'Neutral', 'Fearful', 'Confident', 'Frustrated', 'Calm'],
  mindsetTags: ['Tired', 'Sharp', 'Overconfident', 'Hesitant', 'Disciplined', 'Patient', 'Revenge', 'FOMO'],
  mistakes:    ['None', 'Chasing', 'No SL', 'Oversize', 'FOMO'],
  envs:        ['Trending', 'Ranging', 'Low Vol', 'High Vol', 'Choppy'],
  positions:   ['Aggressive', 'Passive', 'Balanced'],
  decisionEN:  ['Emotional trading', 'Several mistakes', 'Good discipline', 'Perfect execution'],
  decisionHE:  ['מסחר רגשי', 'מספר טעויות', 'משמעת טובה', 'ביצוע מושלם'],
  decisionGrades: ['D', 'C', 'B', 'A+'],
};

const T_MIDNIGHT = {
  id: 'midnight',
  text: { primary: '#fff', muted: '#888' },
  bg: { surface: '#111' },
  border: { subtle: '#222' },
  accent: { cyan: '#0ff' },
  status: { success: '#0f0', danger: '#f00', warning: '#fb0' },
};

const SLOTS = {
  'system-trades-table': () => <div data-slot="trades" />,
  'system-stat-chips':   () => <div data-slot="chips" />,
  'system-risk-gauges':  () => <div data-slot="gauges" />,
  'system-grade':        () => <div data-slot="grade" />,
  'system-ai-insights':  () => <div data-slot="ai" />,
} as const;

function mount(locale: 'he' | 'en', isRTL: boolean) {
  const values = readDraft(EMPTY_DRAFT);
  return render(
    <WeeklyReviewRenderer
      schema={ORCA_DEFAULT_TEMPLATE}
      values={values}
      onChange={() => {}}
      T={T_MIDNIGHT}
      isRTL={isRTL}
      locale={locale}
      systemSlots={SLOTS}
    />,
  );
}

// Document-order traversal: for each button, return the FIRST matching label
// from `candidates` whose text appears as a substring of the button. This is
// robust to leading icons (—/✅/❌), emoji prefixes (🔥), and sub-labels.
// Order in the returned array == DOM order; ordering of `candidates` is the
// contract we're proving.
function labelsInOrder(root: HTMLElement, candidates: string[]): string[] {
  const out: string[] = [];
  for (const btn of Array.from(root.querySelectorAll('button'))) {
    const text = (btn.textContent || '').trim();
    // Prefer the longest match to avoid 'FOMO' inside 'No FOMO'-style strings.
    const hit = candidates
      .filter(c => text.includes(c))
      .sort((a, b) => b.length - a.length)[0];
    if (hit) out.push(hit);
  }
  return out;
}

describe('Wave-0 parity gate — renderer DOM matches legacy WeeklyTab contract', () => {
  describe.each([
    { locale: 'en' as const, isRTL: false },
    { locale: 'he' as const, isRTL: true  },
  ])('locale=$locale rtl=$isRTL', ({ locale, isRTL }) => {
    it('prep checklist labels appear in legacy order', () => {
      const { container } = mount(locale, isRTL);
      const want = locale === 'en' ? LEGACY.prepEN : LEGACY.prepHE;
      const got = labelsInOrder(container, want);
      expect(got).toEqual(want);
    });

    it('execution checklist labels appear in legacy order', () => {
      const { container } = mount(locale, isRTL);
      const want = locale === 'en' ? LEGACY.execEN : LEGACY.execHE;
      const got = labelsInOrder(container, want);
      expect(got).toEqual(want);
    });

    it('strategy edge questions appear in legacy order (incl. inverted #3)', () => {
      const { container } = mount(locale, isRTL);
      const want = locale === 'en' ? LEGACY.edgeEN : LEGACY.edgeHE;
      const got = labelsInOrder(container, want);
      expect(got).toEqual(want);
    });

    it('emotion pills appear in legacy order', () => {
      const { container } = mount(locale, isRTL);
      const got = labelsInOrder(container, LEGACY.emotions);
      expect(got).toEqual(LEGACY.emotions);
    });

    it('mindset multiselect tags appear in legacy order', () => {
      const { container } = mount(locale, isRTL);
      // FOMO appears in both Mistakes and Mindset — dedupe to the contiguous
      // 8-button mindset run (the multiselect is the only place where all
      // 8 tags appear together, in order).
      const all = labelsInOrder(container, LEGACY.mindsetTags);
      // Find the contiguous match starting at 'Tired' through 'FOMO'.
      const start = all.indexOf(LEGACY.mindsetTags[0]);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(all.slice(start, start + LEGACY.mindsetTags.length)).toEqual(LEGACY.mindsetTags);
    });

    it('all system slots render exactly once and in fixed slot positions', () => {
      const { container } = mount(locale, isRTL);
      const slots = Array.from(container.querySelectorAll('[data-slot]')).map(
        n => n.getAttribute('data-slot'),
      );
      // Plan-1 layout bands: risk band renders FIRST (above main), footer LAST.
      // Order becomes: gauges → trades → chips → grade → ai.
      expect(slots).toEqual(['gauges', 'trades', 'chips', 'grade', 'ai']);
    });

    it('decision-quality grades render D / C / B / A+ in order', () => {
      const { container } = mount(locale, isRTL);
      const want = LEGACY.decisionGrades;
      // The grade letter is the option id surfaced as emoji-or-label fragment.
      // We assert the supporting description appears in legacy order instead.
      const desc = locale === 'en' ? LEGACY.decisionEN : LEGACY.decisionHE;
      const got = labelsInOrder(container, desc);
      // Each pill's text contains its description; order must match.
      expect(got.length).toBe(want.length);
      desc.forEach((d, i) => expect(got[i]).toContain(d));
    });

    it('market context env + position dropdowns render in legacy order', () => {
      // Env / position are native <select> dropdowns in both the legacy
      // SelectField and the seed (variant: 'dropdown'); assert via <option>.
      const { container } = mount(locale, isRTL);
      const allOpts = Array.from(container.querySelectorAll('option'))
        .map(o => (o.textContent || '').trim());
      const envs = allOpts.filter(t => LEGACY.envs.includes(t));
      const pos  = allOpts.filter(t => LEGACY.positions.includes(t));
      expect(envs).toEqual(LEGACY.envs);
      expect(pos).toEqual(LEGACY.positions);
    });

    it('mistake options render in legacy order', () => {
      const { container } = mount(locale, isRTL);
      // 'None' / 'FOMO' overlap with mindset tags — filter by being inside the
      // mistake select block (rendered first time in document order after
      // execution section). Easiest stable check: at least all 5 strings
      // appear and in sequence somewhere in the doc.
      const all = Array.from(container.querySelectorAll('button'))
        .map(b => (b.textContent || '').trim());
      // Find a window where the 5 appear in order.
      let i = 0;
      for (const t of all) {
        if (t === LEGACY.mistakes[i]) i++;
        if (i === LEGACY.mistakes.length) break;
      }
      expect(i).toBe(LEGACY.mistakes.length);
    });
  });
});
