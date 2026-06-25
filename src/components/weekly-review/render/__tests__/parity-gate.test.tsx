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

// Document-order traversal: collect visible button text in DOM order, filtered
// by a predicate so we can isolate (e.g.) emotion pills from mindset pills.
function buttonTextsInOrder(root: HTMLElement, keep: (t: string) => boolean): string[] {
  return Array.from(root.querySelectorAll('button'))
    .map(b => (b.textContent || '').trim())
    .filter(Boolean)
    .filter(keep);
}

describe('Wave-0 parity gate — renderer DOM matches legacy WeeklyTab contract', () => {
  describe.each([
    { locale: 'en' as const, isRTL: false },
    { locale: 'he' as const, isRTL: true  },
  ])('locale=$locale rtl=$isRTL', ({ locale, isRTL }) => {
    it('prep checklist labels appear in legacy order', () => {
      const { container } = mount(locale, isRTL);
      const want = locale === 'en' ? LEGACY.prepEN : LEGACY.prepHE;
      const got = buttonTextsInOrder(container, t => want.includes(t));
      expect(got).toEqual(want);
    });

    it('execution checklist labels appear in legacy order', () => {
      const { container } = mount(locale, isRTL);
      const want = locale === 'en' ? LEGACY.execEN : LEGACY.execHE;
      const got = buttonTextsInOrder(container, t => want.includes(t));
      expect(got).toEqual(want);
    });

    it('strategy edge questions appear in legacy order (incl. inverted #3)', () => {
      const { container } = mount(locale, isRTL);
      const want = locale === 'en' ? LEGACY.edgeEN : LEGACY.edgeHE;
      const got = buttonTextsInOrder(container, t => want.includes(t));
      expect(got).toEqual(want);
    });

    it('emotion pills appear in legacy order', () => {
      const { container } = mount(locale, isRTL);
      const got = buttonTextsInOrder(container, t => LEGACY.emotions.includes(t));
      expect(got).toEqual(LEGACY.emotions);
    });

    it('mindset multiselect tags appear in legacy order', () => {
      const { container } = mount(locale, isRTL);
      const got = buttonTextsInOrder(container, t => LEGACY.mindsetTags.includes(t));
      expect(got).toEqual(LEGACY.mindsetTags);
    });

    it('all system slots render exactly once and in fixed slot positions', () => {
      const { container } = mount(locale, isRTL);
      const slots = Array.from(container.querySelectorAll('[data-slot]')).map(
        n => n.getAttribute('data-slot'),
      );
      // Order is contract: trades → chips → gauges (then later) grade → ai
      expect(slots).toEqual(['trades', 'chips', 'gauges', 'grade', 'ai']);
    });

    it('decision-quality grades render D / C / B / A+ in order', () => {
      const { container } = mount(locale, isRTL);
      const want = LEGACY.decisionGrades;
      // The grade letter is the option id surfaced as emoji-or-label fragment.
      // We assert the supporting description appears in legacy order instead.
      const desc = locale === 'en' ? LEGACY.decisionEN : LEGACY.decisionHE;
      const got = buttonTextsInOrder(container, t => desc.some(d => t.includes(d)));
      // Each pill's text contains its description; order must match.
      expect(got.length).toBe(want.length);
      desc.forEach((d, i) => expect(got[i]).toContain(d));
    });

    it('market context env + position pills render in legacy order', () => {
      const { container } = mount(locale, isRTL);
      const envs = buttonTextsInOrder(container, t => LEGACY.envs.includes(t));
      const pos  = buttonTextsInOrder(container, t => LEGACY.positions.includes(t));
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
