import { themeBgs } from '../lib/theme-bg';
// Weekly Summary — native, full-fidelity port of the legacy iframe app.
// Mirrors the layout from the user's screenshots:
//   Header → Prep Checklist → Week Trades cards → Risk Limit gauges →
//   Execution Quality (score + 5 tri-state) → Strategy Adherence (4 edges) →
//   Mistake count + pattern → Market Context (env + position) →
//   Mindset (emotion, focus, big mistake, repeat, tags, free reflection) →
//   Decision Quality (D/C/B/+A) → Final Grade → AI Insights → Close Week.
//
// All form state is persisted per-week into Cloud (`weekly_review.draft.*`)
// so the user can resume on any device. Close-week snapshots into archive.

import { useMemo, useState } from 'react';
import type { Trade } from '@/data/trades';
import type { useWeeklyReviewState } from '../hooks/use-weekly-review-state';
import { useWeekAggregates } from '../hooks/use-week-aggregates';
import { useWeekDraft, type WeekDraft } from '../hooks/use-week-draft';
import { useReviewUnit, fmtR, fmtUSD } from '../hooks/use-review-unit';
import { useRiskPrefs } from '../hooks/use-risk-prefs';
import { gradeWeek, GRADE_COLORS } from '../lib/grading';
import { isCloseWeekAllowed } from '../lib/week-key';
import type { WeekRecord } from '../lib/types';
import { TriState } from '../widgets/TriState';
import { SectionTitle } from '../widgets/SectionTitle';
// Wave-0 schema renderer wiring point. Flag is OFF — legacy JSX below is
// the source of truth until the side-by-side parity gate is green.
import { WR_SCHEMA_RENDERER_ENABLED, WR_EDIT_MODE_ENABLED } from '../lib/wr-flag';
import { ORCA_DEFAULT_TEMPLATE } from '../lib/wr-default-template';
import { readDraft, writeBlock } from '../render/legacy-adapter';
import { WeeklyReviewRenderer } from '../render/WeeklyReviewRenderer';
import { createDefaultActionRegistry } from '../render/action-registry';
import { useUserTemplate } from '../hooks/use-user-template';
import { useWeekStart } from '../hooks/use-week-start';
import { useCloseDays } from '../hooks/use-close-days';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Theme = any;
interface Props { T: Theme; isRTL: boolean; trades: Trade[]; state: ReturnType<typeof useWeeklyReviewState>; }

// ── Static config — pulled verbatim from the legacy iframe app ──
const PREP_LABELS_HE = ['הכנת קפה ☕', 'פתיחת לוג סטטיסטי (Statistical Trade Log)', 'פתיחת יומן קלנדרי (Weekly Calendar)', 'פתיחת Market Journal'];
const PREP_LABELS_EN = ['Coffee ready ☕', 'Open Statistical Trade Log', 'Open Weekly Calendar', 'Open Market Journal'];
const EDGE_LABELS_HE = [
  { text: 'האם ה-Primary Setup התנהג כצפוי?', tag: 'P', goodIs: 1 as const },
  { text: 'האם זה היה שבוע סטטיסטי נורמלי לסטאפ?', tag: 'P', goodIs: 1 as const },
  { text: 'האם כפיתי עסקאות לא נקיות (Forced Trades)?', tag: 'P', goodIs: 2 as const },
  { text: 'האם כל העסקאות עקבו אחרי החוקים?', tag: 'P', goodIs: 1 as const },
];
const EDGE_LABELS_EN = [
  { text: 'Did the Primary Setup behave as expected?', tag: 'P', goodIs: 1 as const },
  { text: 'Was this a statistically normal week for the setup?', tag: 'P', goodIs: 1 as const },
  { text: 'Did I force any non-clean trades?', tag: 'P', goodIs: 2 as const },
  { text: 'Did every trade follow the rules?', tag: 'P', goodIs: 1 as const },
];
const EXEC_LABELS_HE: { key: keyof WeekDraft['executionChecklist']; label: string }[] = [
  { key: 'entryFollowedPlan', label: 'כניסה עקבה אחרי התוכנית' },
  { key: 'stopLossRespected', label: 'Stop Loss נשמר' },
  { key: 'noChasingPrice', label: 'לא רדפתי אחרי מחיר' },
  { key: 'correctPositionSize', label: 'גודל פוזיציה נכון' },
  { key: 'noRevengeTrade', label: 'ללא מסחר נקמה' },
];
const EXEC_LABELS_EN: { key: keyof WeekDraft['executionChecklist']; label: string }[] = [
  { key: 'entryFollowedPlan', label: 'Entry followed the plan' },
  { key: 'stopLossRespected', label: 'Stop Loss respected' },
  { key: 'noChasingPrice', label: 'Did not chase price' },
  { key: 'correctPositionSize', label: 'Correct position size' },
  { key: 'noRevengeTrade', label: 'No revenge trade' },
];
const EMOTIONS = [
  { e: '🔥', l: 'In the Zone' }, { e: '🧊', l: 'Neutral' }, { e: '😨', l: 'Fearful' },
  { e: '💪', l: 'Confident' }, { e: '😤', l: 'Frustrated' }, { e: '😌', l: 'Calm' },
];
const MINDSET_TAGS = ['Tired', 'Sharp', 'Overconfident', 'Hesitant', 'Disciplined', 'Patient', 'Revenge', 'FOMO'];
const MISTAKE_OPTIONS = ['None', 'Chasing', 'No SL', 'Oversize', 'FOMO'];
const ENV_OPTIONS = ['Trending', 'Ranging', 'Low Vol', 'High Vol', 'Choppy'];
const POS_OPTIONS = ['Aggressive', 'Passive', 'Balanced'];
const DECISION_QUALITY = [
  { v: 'D' as const,  he: 'מסחר רגשי',     en: 'Emotional trading' },
  { v: 'C' as const,  he: 'מספר טעויות',   en: 'Several mistakes' },
  { v: 'B' as const,  he: 'משמעת טובה',    en: 'Good discipline' },
  { v: 'A+' as const, he: 'ביצוע מושלם',   en: 'Perfect execution' },
];

// 4-tier R limits (memory)
const LIMITS = { daily: -2, weekly: -5, monthly: -10 };

// ── i18n bundles ──
const HE = {
  pageTitle: 'יומן מסחר — שבועי', lock: 'נעל יומן',
  notFriday: 'יומן השבוע נעול עד שישי/שבת',
  prep: 'הכנה', prepCue: 'לחץ: — → ✅ בוצע → ❌ לא בוצע',
  trades: 'עסקאות השבוע', addTrade: '+ הוסף עסקה',
  rr: 'R:R', winR: 'WIN R', avgR: 'AVG R', winRate: 'WIN RATE', tradesK: 'עסקאות', netR: 'NET R',
  noTrades: 'אין עסקאות השבוע — לחץ "הוסף עסקה" להתחיל',
  riskLimits: 'מגבלות סיכון', daily: 'יומי', weekly: 'שבועי', monthly: 'חודשי', limit: 'מגבלה',
  execQ: 'איכות ביצוע', execScore: 'Execution Score', execCue: 'ציון מבוסס צ׳קליסט (לחץ: — → ❌ → ✅)',
  strategy: 'איכות אסטרטגיה',
  mistakes: 'מספר הפרות משמעת', mistakesPh: '0',
  pattern: 'דפוס חוזר של הפרה?', patternPh: 'תאר...',
  market: 'הקשר שוק', env: 'סביבת שוק', envPh: '— בחר —',
  pos: 'Execution Positioning',
  mindset: 'פסיכולוגיה וניהול עצמי',
  feel: 'איך הרגשת השבוע?', feelCue: 'בחר את המצב הרגשי הדומיננטי שלך',
  focus: 'דירוג פוקוס השבוע', focusCue: 'Low · 5 = Excellent | 1',
  none: 'לא נבחר',
  bigMistake: 'הטעות הגדולה ביותר השבוע', bigMistakeCue: 'אם לא הייתה טעות — בחר None',
  repeat: 'חזרת על טעות מהשבוע הקודם?', repeatCue: 'כנות עם עצמך היא הצעד הראשון לשיפור',
  yes: 'כן, חזרתי', no: 'לא, שיפרתי',
  tags: 'תגיות מסחר', tagsCue: 'בחר כמה שרוצה',
  reflection: 'סיכום מחשבות חופשי', reflectionCue: 'מה עבד? מה לא? מה לוקח לשבוע הבא?',
  reflectionPh: 'כתוב כאן בחופשיות...',
  decision: 'איכות החלטות',
  finalGrade: 'ציון סופי',
  insights: 'תובנות מערכת', noInsights: 'אין מספיק נתונים לתובנות — המשך לתעד',
  closeWeek: 'סגור שבוע (שישי / שבת)', closed: 'נסגר', saved: '✅ נשמר',
  empty: '—',
};
const EN = {
  pageTitle: 'Trading Journal — Weekly', lock: 'Lock journal',
  notFriday: 'Locked until Friday / Saturday',
  prep: 'Prep checklist', prepCue: 'Tap to cycle: — → ✅ done → ❌ missed',
  trades: 'Week trades', addTrade: '+ Add trade',
  rr: 'R:R', winR: 'WIN R', avgR: 'AVG R', winRate: 'WIN RATE', tradesK: 'TRADES', netR: 'NET R',
  noTrades: 'No trades this week — press "Add trade" to begin',
  riskLimits: 'Risk limits', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', limit: 'Limit',
  execQ: 'Execution quality', execScore: 'Execution Score', execCue: 'Score from the checklist (tap: — → ❌ → ✅)',
  strategy: 'Strategy adherence',
  mistakes: 'Discipline violations count', mistakesPh: '0',
  pattern: 'Recurring violation pattern?', patternPh: 'Describe…',
  market: 'Market context', env: 'Market environment', envPh: '— choose —',
  pos: 'Execution positioning',
  mindset: 'Mindset & self-management',
  feel: 'How did the week feel?', feelCue: 'Pick your dominant emotion',
  focus: 'Focus rating', focusCue: 'Low · 5 = Excellent | 1',
  none: 'Not set',
  bigMistake: 'Biggest mistake of the week', bigMistakeCue: 'If none — choose "None"',
  repeat: 'Repeated last week\'s mistake?', repeatCue: 'Honesty is the first step to improvement',
  yes: 'Yes, repeated', no: 'No, improved',
  tags: 'Trader tags', tagsCue: 'Pick as many as fit',
  reflection: 'Free reflection', reflectionCue: 'What worked? What didn\'t? What to bring next week?',
  reflectionPh: 'Write freely…',
  decision: 'Decision quality',
  finalGrade: 'Final grade',
  insights: 'System insights', noInsights: 'Not enough data for insights — keep journaling',
  closeWeek: 'Close week (Fri / Sat)', closed: 'Closed', saved: '✅ Saved',
  empty: '—',
};

export default function WeeklyTab({ T, isRTL, trades, state }: Props) {
  const L = isRTL ? HE : EN;

  // Tokens — theme-aware so light mode stays readable
  const isLight = (T as { id?: string })?.id === 'platinum';
  const fg = T?.text?.primary || (isLight ? '#0a0e1a' : '#e9eef7');
  const muted = T?.text?.muted || (isLight ? '#4b5566' : '#7a8aa3');
  // In light mode swap the bright cyan/green accent for a deep, readable blue
  const accent = isLight ? '#1d4ed8' : (T?.accent?.cyan || '#39FF14');
  const cyan = isLight ? '#1d4ed8' : (T?.accent?.cyan || '#00f2ff');
  const panel = T?.bg?.surface || (isLight ? '#ffffff' : 'rgba(255,255,255,0.04)');
  const border = T?.border?.subtle || (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)');
  const win = isLight ? '#0a8a4a' : (T?.status?.success || '#39FF14');
  const loss = T?.status?.danger || '#ff3b3b';
  const warn = T?.status?.warning || (isLight ? '#b86e00' : '#ffb830');

  const { weekStart, setWeekStart } = useWeekStart();
  const { closeDays, setCloseDays } = useCloseDays();
  const wk = useWeekAggregates(trades, undefined, weekStart);
  const { draft, update, hardReset } = useWeekDraft(wk.weekKey);
  // Wave-1 — template is hoisted to the outer tab so closeWeek() can freeze
  // it into the WeekRecord. SchemaRendererSurface reuses the same instance.
  const userTpl = useUserTemplate();
  const { isUSD } = useReviewUnit();
  // R-only portfolio guard — when no trade carries real $ data, suppress
  // misleading "0$" in USD-mode columns / dual-stats.
  const hasMoney = useMemo(() => trades.some(t => Number(t.pnl) !== 0 && Number.isFinite(Number(t.pnl))), [trades]);
  const showUSD = isUSD && hasMoney;
  const risk = useRiskPrefs();
  const alreadyClosed = useMemo(
    () => state.archive.some(w => w.weekKey === wk.weekKey),
    [state.archive, wk.weekKey],
  );
  const friday = isCloseWeekAllowed(new Date(), closeDays);


  // Derived: aggregates
  const tradesArr = wk.trades;
  const n = tradesArr.length;
  const rr = useMemo(() => {
    let totalWin = 0, totalLoss = 0, wins = 0, losses = 0;
    for (const t of tradesArr) {
      const r = Number(t.returnR) || 0;
      if (r > 0) { totalWin += r; wins += 1; }
      else if (r < 0) { totalLoss += Math.abs(r); losses += 1; }
    }
    const avgWin = wins ? totalWin / wins : 0;
    const avgLoss = losses ? totalLoss / losses : 0;
    return {
      rr: avgLoss ? avgWin / avgLoss : 0,
      avgWin, avgLoss,
    };
  }, [tradesArr]);

  // Execution score: % of true items in checklist (nulls neutral)
  const execScore = useMemo(() => {
    const vals = Object.values(draft.executionChecklist);
    const set = vals.filter(v => v !== null);
    const goods = set.filter(v => v === true).length;
    return set.length ? Math.round((goods / set.length) * 100) : 0;
  }, [draft.executionChecklist]);

  const computedGrade = gradeWeek({
    netR: wk.netR, wins: wk.wins, losses: wk.losses,
    rulesComplianceRatio: execScore / 100,
  });
  const gradeColor = GRADE_COLORS[computedGrade];

  // ── handlers ──
  const cyclePrep = (i: number) => {
    const next = [...draft.preps]; next[i] = (next[i] + 1) % 3; update({ preps: next });
  };
  const cycleEdge = (i: number) => {
    const next = [...draft.edges]; next[i] = (next[i] + 1) % 3; update({ edges: next });
  };
  const cycleExec = (key: keyof WeekDraft['executionChecklist']) => {
    const cur = draft.executionChecklist[key];
    const next = cur === null ? false : cur === false ? true : null;
    update({ executionChecklist: { ...draft.executionChecklist, [key]: next } });
  };
  const toggleTag = (tag: string) => {
    const has = draft.mindsetTags.includes(tag);
    update({ mindsetTags: has ? draft.mindsetTags.filter(t => t !== tag) : [...draft.mindsetTags, tag] });
  };

  async function closeWeek() {
    if (!friday || alreadyClosed) return;
    const record: WeekRecord = {
      weekEndingISO: wk.weekEndISO,
      weekKey: wk.weekKey,
      tradeLog: tradesArr,
      netR: wk.netR,
      wins: wk.wins,
      losses: wk.losses,
      grade: computedGrade,
      mindset: {
        focus: draft.focusRating || 0,
        confidence: 5,
        discipline: Math.round(execScore / 10),
        emotion: draft.emotion,
        notes: [draft.mindsetTags.join(' · '), draft.bigMistake && `Big mistake: ${draft.bigMistake}`].filter(Boolean).join(' | '),
      },
      reflection: draft.mindset,
      closedAt: new Date().toISOString(),
      // Wave-1 — freeze the template + values the user filled against so
      // historical render survives later template edits. Additive only.
      schemaSnapshot: userTpl.template,
      schemaVersion: userTpl.template.meta.templateVersion,
      values: readDraft(draft),
    };
    await state.saveArchive([...state.archive, record]);
    // After closing the week, wipe ALL inputs so the new week starts clean.
    await hardReset();
  }

  // Reset confirmation modal state: 'idle' | 'ask' | 'sweeping' | 'done'
  const [resetPhase, setResetPhase] = useState<'idle' | 'ask' | 'sweeping' | 'done'>('idle');

  function resetAllInputs() {
    setResetPhase('ask');
  }

  async function confirmReset() {
    setResetPhase('sweeping');
    // Hold the sweep animation a beat so it feels deliberate.
    await new Promise(r => setTimeout(r, 850));
    await hardReset();
    setResetPhase('done');
    setTimeout(() => setResetPhase('idle'), 900);
  }


  // ── styles ──
  const card: React.CSSProperties = {
    padding: 'clamp(14px, 2vw, 20px)', background: panel,
    border: `1px solid ${border}`, borderRadius: 14, boxSizing: 'border-box',
  };
  const cardSubtle: React.CSSProperties = {
    padding: 14, background: themeBgs(T).overlay,
    border: `1px solid ${border}`, borderRadius: 12,
  };
  const statLabel: React.CSSProperties = { color: muted, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 };
  const statValue: React.CSSProperties = { color: fg, fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 800, marginTop: 6 };
  const input: React.CSSProperties = {
    width: '100%', background: 'transparent', color: fg, textAlign: isRTL ? 'right' : 'left',
    border: `1px solid ${border}`, borderRadius: 10, padding: '12px 14px',
    fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box', minHeight: 44,
  };

  // Wave-0: flag-gated schema renderer. Default OFF; legacy JSX renders.
  // Wired here so the swap is a one-line flag flip once parity is green.
  if (WR_SCHEMA_RENDERER_ENABLED) {
    return <SchemaRendererSurface
      T={T} isRTL={isRTL} draft={draft} update={update}
      border={border} fg={fg} muted={muted}
      userTpl={userTpl}
    />;
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'grid', gap: 18, paddingBottom: 48 }}>
      {/* === Header bar === */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Pill color={warn} label={`🔒 ${L.lock}`} />
          <Pill color={muted} label={`📅 ${formatDate(wk.weekEndISO)}`} solid />
          {!friday && <Pill color={warn} label={`⚠️ ${L.notFriday}`} />}
        </div>
        <h1 style={{ margin: 0, color: accent, fontSize: 'clamp(20px, 2.6vw, 26px)', fontWeight: 800, letterSpacing: 0.5 }}>
          {L.pageTitle} ⚡
        </h1>
      </div>

      {/* === PREP CHECKLIST === */}
      <section style={card}>
        <SectionTitle title={L.prep} emoji="✅" T={T} isRTL={isRTL} />
        <div style={{ color: muted, fontSize: 11, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>{L.prepCue}</div>
        <div style={{ display: 'grid', gap: 8 }}>
          {(isRTL ? PREP_LABELS_HE : PREP_LABELS_EN).map((lbl, i) => (
            <TriState key={i} state={draft.preps[i]} label={lbl} T={T} isRTL={isRTL} goodIs={1} onCycle={() => cyclePrep(i)} />
          ))}
        </div>
      </section>

      {/* === WEEK TRADES === */}
      <section style={card}>
        <div style={{
          display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row',
          justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
        }}>
          <SectionTitle title={L.trades} emoji="📓" T={T} isRTL={isRTL} accent={cyan} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
          <Stat label={L.rr}      value={rr.rr ? rr.rr.toFixed(2) : '0.00'}         card={cardSubtle} sl={statLabel} sv={statValue} color={fg} />
          <DualStat label={L.winR}    r={fmtR(rr.avgWin)}   d={fmtUSD(wk.avgWinUSD)}  isUSD={showUSD}
                    card={cardSubtle} sl={statLabel} sv={statValue} color={win} muted={muted} />
          <DualStat label={L.avgR}    r={fmtR(wk.avgR)}     d={fmtUSD(wk.avgUSD)}     isUSD={showUSD}
                    card={cardSubtle} sl={statLabel} sv={statValue} color={wk.avgR >= 0 ? win : loss} muted={muted} />
          <Stat label={L.winRate} value={`${Math.round(wk.winRate * 100)}%`}        card={cardSubtle} sl={statLabel} sv={statValue} color={wk.winRate >= 0.5 ? win : loss} />
          <Stat label={L.tradesK} value={String(n)}                                  card={cardSubtle} sl={statLabel} sv={statValue} color={fg} />
          <DualStat label={L.netR}    r={fmtR(wk.netR)}     d={fmtUSD(wk.netUSD)}     isUSD={showUSD}
                    card={cardSubtle} sl={statLabel} sv={statValue} color={wk.netR >= 0 ? win : loss} muted={muted} />
        </div>

        {/* Trade log preview */}
        {n === 0 ? (
          <div style={{
            padding: '40px 16px', textAlign: 'center', color: muted, fontSize: 13,
            border: `1px solid ${border}`, borderRadius: 12, background: themeBgs(T).subtle,
          }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>📊</div>
            {L.noTrades}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: `1px solid ${border}`, borderRadius: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}>
              <thead>
                <tr style={{ color: muted, background: themeBgs(T).subtle, textAlign: isRTL ? 'right' : 'left' }}>
                  <Th>{isRTL ? 'תאריך' : 'Date'}</Th>
                  <Th>{isRTL ? 'נכס' : 'Asset'}</Th>
                  <Th>{isRTL ? 'כיוון' : 'Side'}</Th>
                  <Th align="right">R</Th>
                  {hasMoney && <Th align="right">$ P&amp;L</Th>}
                  <Th>{isRTL ? 'תוצאה' : 'Result'}</Th>
                </tr>
              </thead>
              <tbody>
                {tradesArr.map(t => {
                  const r = Number(t.returnR) || 0;
                  const usd = Number(t.pnl) || 0;
                  return (
                    <tr key={t.id} style={{ borderTop: `1px solid ${border}`, color: fg }}>
                      <Td>{t.date}</Td>
                      <Td>{t.coin}</Td>
                      <Td style={{ color: t.direction === 'Long' ? win : loss }}>{t.direction}</Td>
                      <Td align="right" style={{ color: r >= 0 ? win : loss, fontWeight: 700 }}>{fmtR(r)}</Td>
                      {hasMoney && <Td align="right" style={{ color: usd >= 0 ? win : loss, fontWeight: 700 }}>{fmtUSD(usd)}</Td>}
                      <Td style={{ color: t.winLoss === 'Win' ? win : t.winLoss === 'Loss' ? loss : muted }}>{t.winLoss}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* === RISK LIMITS === */}
      <section>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <RiskCard label={L.daily}   limitR={LIMITS.daily}   limitUSD={-risk.dailyUSD}
                    valueR={0}                          valueUSD={0}
                    isUSD={isUSD} T={T} isRTL={isRTL} />
          <RiskCard label={L.weekly}  limitR={LIMITS.weekly}  limitUSD={-risk.weeklyUSD}
                    valueR={wk.netR  < 0 ? wk.netR  : 0} valueUSD={wk.netUSD < 0 ? wk.netUSD : 0}
                    isUSD={isUSD} T={T} isRTL={isRTL} />
          <RiskCard label={L.monthly} limitR={LIMITS.monthly} limitUSD={-risk.monthlyUSD}
                    valueR={0}                          valueUSD={0}
                    isUSD={isUSD} T={T} isRTL={isRTL} />
        </div>
      </section>

      {/* === EXECUTION QUALITY === */}
      <section style={card}>
        <SectionTitle title={L.execQ} emoji="🎯" T={T} isRTL={isRTL} />
        <div style={{
          display: 'flex', flexDirection: isRTL ? 'row-reverse' : 'row',
          gap: 18, alignItems: 'center', flexWrap: 'wrap',
          padding: 14, background: themeBgs(T).subtle, borderRadius: 12, marginBottom: 14,
          border: `1px solid ${border}`,
        }}>
          <ScoreRing value={execScore} color={execScore >= 80 ? win : execScore >= 50 ? warn : loss} />
          <div style={{ flex: 1, minWidth: 200, textAlign: isRTL ? 'right' : 'left' }}>
            <div style={{ color: fg, fontWeight: 700, fontSize: 15 }}>{L.execScore}</div>
            <div style={{ color: muted, fontSize: 11, marginTop: 4 }}>{L.execCue}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {(isRTL ? EXEC_LABELS_HE : EXEC_LABELS_EN).map(({ key, label }) => {
            const v = draft.executionChecklist[key];
            const state = v === null ? 0 : v === true ? 1 : 2;
            return <TriState key={key} state={state} label={label} T={T} isRTL={isRTL} goodIs={1} onCycle={() => cycleExec(key)} />;
          })}
        </div>
      </section>

      {/* === STRATEGY ADHERENCE === */}
      <section style={card}>
        <SectionTitle title={L.strategy} emoji="🎯" T={T} isRTL={isRTL} />
        <div style={{ display: 'grid', gap: 8 }}>
          {(isRTL ? EDGE_LABELS_HE : EDGE_LABELS_EN).map((e, i) => (
            <TriState key={i} state={draft.edges[i]} label={e.text} tag={e.tag} goodIs={e.goodIs} T={T} isRTL={isRTL} onCycle={() => cycleEdge(i)} />
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 14 }}>
          <Labeled label={L.mistakes} muted={muted} isRTL={isRTL}>
            <input
              type="number" min={0} value={draft.violations}
              placeholder={L.mistakesPh}
              onChange={e => update({ violations: e.target.value })}
              style={input}
            />
          </Labeled>
          <Labeled label={L.pattern} muted={muted} isRTL={isRTL}>
            <input
              type="text" value={draft.violationPattern}
              placeholder={L.patternPh}
              onChange={e => update({ violationPattern: e.target.value })}
              style={input}
            />
          </Labeled>
        </div>
      </section>

      {/* === MARKET CONTEXT === */}
      <section style={card}>
        <SectionTitle title={L.market} emoji="🌍" T={T} isRTL={isRTL} accent={cyan} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <Labeled label={L.env} muted={muted} isRTL={isRTL}>
            <SelectField value={draft.env} options={ENV_OPTIONS} placeholder={L.envPh} onChange={v => update({ env: v })} input={input} fg={fg} optionBg={T?.bg?.secondary || T?.bg?.primary} muted={muted} />
          </Labeled>
          <Labeled label={L.pos} muted={muted} isRTL={isRTL}>
            <SelectField value={draft.pos} options={POS_OPTIONS} placeholder={L.envPh} onChange={v => update({ pos: v })} input={input} fg={fg} optionBg={T?.bg?.secondary || T?.bg?.primary} muted={muted} />
          </Labeled>

        </div>
      </section>

      {/* === MINDSET === */}
      <section style={card} dir={isRTL ? 'rtl' : 'ltr'}>
        <SectionTitle title={L.mindset} emoji="🧠" T={T} isRTL={isRTL} accent={cyan} />

        {/* Emotion */}
        <div style={cardSubtle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
            <div style={{ color: fg, fontWeight: 700, fontSize: 14, textAlign: isRTL ? 'right' : 'left' }}>{L.feel} 🎭</div>
          </div>
          <div style={{ color: muted, fontSize: 11, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>{L.feelCue}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOTIONS.map(e => {
              const active = draft.emotion === e.l;
              return (
                <Chip key={e.l} active={active} onClick={() => update({ emotion: active ? '' : e.l })} T={T}>
                  {e.l} {e.e}
                </Chip>
              );
            })}
          </div>
        </div>

        {/* Focus rating */}
        <div style={{ ...cardSubtle, marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <div style={{ color: fg, fontWeight: 700, fontSize: 14, textAlign: isRTL ? 'right' : 'left' }}>{L.focus} 🎯</div>
            <div style={{ color: muted, fontSize: 10, textAlign: isRTL ? 'left' : 'right' }}>{L.focusCue}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            {[5, 4, 3, 2, 1].map(n => {
              const active = draft.focusRating === n;
              return (
                <button key={n} onClick={() => update({ focusRating: active ? 0 : n })}
                        style={ratingBtn(active, accent, fg, muted, border)}>
                  {n}
                </button>
              );
            })}
            <span style={{ color: muted, fontSize: 12, alignSelf: 'center' }}>
              {draft.focusRating ? '' : L.none}
            </span>
          </div>
        </div>

        {/* Biggest mistake */}
        <div style={{ ...cardSubtle, marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ color: fg, fontWeight: 700, fontSize: 14, textAlign: isRTL ? 'right' : 'left' }}>{L.bigMistake} ⚠️</div>
          </div>
          <div style={{ color: muted, fontSize: 11, marginTop: 4, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>{L.bigMistakeCue}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MISTAKE_OPTIONS.map(m => {
              const active = draft.bigMistake === m;
              const isNone = m === 'None';
              return (
                <Chip key={m} active={active} onClick={() => update({ bigMistake: active ? '' : m })} T={T}
                      activeBg={isNone ? win : loss}>
                  {m} {active ? (isNone ? '✅' : '') : ''}
                </Chip>
              );
            })}
          </div>
        </div>

        {/* Repeat mistake */}
        <div style={{ ...cardSubtle, marginTop: 12 }}>
          <div style={{ color: fg, fontWeight: 700, fontSize: 14, textAlign: isRTL ? 'right' : 'left' }}>{L.repeat} ♻️</div>
          <div style={{ color: muted, fontSize: 11, marginTop: 4, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>{L.repeatCue}</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Chip active={draft.repeatMistake === false} onClick={() => update({ repeatMistake: draft.repeatMistake === false ? null : false })} T={T} activeBg={win}>
              {L.no} ✅
            </Chip>
            <Chip active={draft.repeatMistake === true} onClick={() => update({ repeatMistake: draft.repeatMistake === true ? null : true })} T={T} activeBg={loss}>
              {L.yes} ❌
            </Chip>
          </div>
        </div>

        {/* Trader tags */}
        <div style={{ ...cardSubtle, marginTop: 12 }}>
          <div style={{ color: fg, fontWeight: 700, fontSize: 14, textAlign: isRTL ? 'right' : 'left' }}>{L.tags} 🏷️</div>
          <div style={{ color: muted, fontSize: 11, marginTop: 4, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>{L.tagsCue}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {MINDSET_TAGS.map(tag => {
              const active = draft.mindsetTags.includes(tag);
              return <Chip key={tag} active={active} onClick={() => toggleTag(tag)} T={T}>{tag}</Chip>;
            })}
          </div>
        </div>

        {/* Free reflection */}
        <div style={{ ...cardSubtle, marginTop: 12 }}>
          <div style={{ color: fg, fontWeight: 700, fontSize: 14, textAlign: isRTL ? 'right' : 'left' }}>{L.reflection} ✍️</div>
          <div style={{ color: muted, fontSize: 11, marginTop: 4, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>{L.reflectionCue}</div>
          <textarea
            rows={6} value={draft.mindset} placeholder={L.reflectionPh} maxLength={5000}
            onChange={e => update({ mindset: e.target.value.slice(0, 5000) })}
            style={{ ...input, minHeight: 140, resize: 'vertical' }}
            dir={isRTL ? 'rtl' : 'ltr'}
          />
        </div>
      </section>

      {/* === DECISION QUALITY === */}
      <section style={card}>
        <SectionTitle title={L.decision} emoji="📊" T={T} isRTL={isRTL} accent={cyan} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {DECISION_QUALITY.map(d => {
            const active = draft.decisionQuality === d.v;
            return (
              <button key={d.v} onClick={() => update({ decisionQuality: active ? '' : d.v })}
                      style={{
                        all: 'unset', cursor: 'pointer', padding: 16, textAlign: 'center',
                        background: active ? `${win}14` : themeBgs(T).overlay,
                        border: `1.5px solid ${active ? win : border}`, borderRadius: 12,
                        boxSizing: 'border-box', transition: 'all 180ms ease',
                      }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: active ? win : muted, fontFamily: "'IBM Plex Mono', monospace" }}>{d.v}</div>
                <div style={{ color: muted, fontSize: 11, marginTop: 6 }}>{isRTL ? d.he : d.en}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* === FINAL GRADE === */}
      <section style={card}>
        <SectionTitle title={L.finalGrade} emoji="🏆" T={T} isRTL={isRTL} accent={cyan} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {(['A+', 'B', 'C'] as const).map(g => {
            const active = computedGrade === g || (g === 'C' && (computedGrade === 'D' || computedGrade === 'F'));
            return (
              <div key={g} style={{
                padding: 16, textAlign: 'center',
                background: active ? `${GRADE_COLORS[g]}14` : themeBgs(T).overlay,
                border: `1px solid ${active ? GRADE_COLORS[g] + '88' : border}`,
                borderRadius: 12,
              }}>
                <div style={{
                  color: active ? GRADE_COLORS[g] : muted,
                  fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: 14,
                }}>
                  {gradeLabel(g, isRTL)}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
          <span style={{ color: muted, fontSize: 11 }}>{isRTL ? 'מחושב:' : 'Computed:'}</span>
          <span style={{
            padding: '4px 12px', borderRadius: 8, fontFamily: "'IBM Plex Mono', monospace",
            fontWeight: 800, color: gradeColor, background: `${gradeColor}1a`,
            border: `1px solid ${gradeColor}66`,
          }}>{computedGrade}</span>
        </div>
      </section>

      {/* === AI INSIGHTS === */}
      <section style={card}>
        <SectionTitle title={L.insights} emoji="🧊" T={T} isRTL={isRTL} accent={cyan} />
        <div style={{
          padding: 16, border: `1px solid ${border}`, borderRadius: 12,
          background: 'rgba(57,255,20,0.04)',
          display: 'flex', alignItems: 'center', gap: 12,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          color: fg, fontSize: 13,
        }}>
          <span style={{ fontSize: 18 }}>💡</span>
          <span>{L.noInsights}</span>
        </div>
      </section>

      {/* === CLOSE WEEK === */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <button
          onClick={closeWeek}
          disabled={!friday || alreadyClosed}
          style={{
            flex: '1 1 320px', minHeight: 56, padding: '14px 18px',
            background: alreadyClosed
              ? `${muted}22`
              : friday ? `linear-gradient(135deg, ${win}, ${win}cc)` : `${win}14`,
            color: alreadyClosed ? muted : friday ? '#03121f' : win,
            border: `1.5px solid ${alreadyClosed ? border : win}${friday ? '' : '88'}`,
            borderRadius: 12, fontFamily: 'inherit', fontWeight: 800, fontSize: 13,
            letterSpacing: 1.5, textTransform: 'uppercase',
            cursor: (!friday || alreadyClosed) ? 'not-allowed' : 'pointer',
          }}>
          🔒 {alreadyClosed ? L.closed : L.closeWeek}
        </button>
        <button
          onClick={() => { /* visual placeholder — Lock Journal mirrors header pill */ }}
          style={{
            minHeight: 56, padding: '14px 22px',
            background: 'transparent', color: warn,
            border: `1.5px solid ${warn}88`, borderRadius: 12,
            fontFamily: 'inherit', fontWeight: 700, fontSize: 12,
            letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
          }}>
          🔒 {isRTL ? 'נעל שבוע' : 'Lock week'}
        </button>
        <button
          onClick={resetAllInputs}
          title={isRTL ? 'איפוס כל האינפוטים' : 'Reset all inputs'}
          style={{
            minHeight: 56, padding: '14px 22px',
            background: 'transparent', color: loss,
            border: `1.5px solid ${loss}88`, borderRadius: 12,
            fontFamily: 'inherit', fontWeight: 800, fontSize: 12,
            letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer',
          }}>
          🧹 {isRTL ? 'אפס אינפוטים' : 'Reset inputs'}
        </button>
      </div>

      {/* === RESET CONFIRM MODAL === */}
      {resetPhase !== 'idle' && (
        <ResetConfirmModal
          phase={resetPhase}
          isRTL={isRTL}
          T={T}
          onConfirm={confirmReset}
          onCancel={() => setResetPhase('idle')}
        />
      )}
    </div>
  );
}

// ── Reset confirm modal ────────────────────────────────────────────────
function ResetConfirmModal({
  phase, isRTL, T, onConfirm, onCancel,
}: {
  phase: 'ask' | 'sweeping' | 'done';
  isRTL: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T: any;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isLight = (T as { id?: string })?.id === 'platinum';
  const fg = T?.text?.primary || (isLight ? '#0a0e1a' : '#e9eef7');
  const muted = T?.text?.muted || (isLight ? '#4b5566' : '#7a8aa3');
  const panel = T?.bg?.surface || (isLight ? '#ffffff' : '#0e1726');
  const border = T?.border?.subtle || (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)');
  const loss = T?.status?.danger || '#ff3b3b';
  const win = isLight ? '#0a8a4a' : (T?.status?.success || '#39FF14');

  const L = isRTL ? {
    title: 'איפוס כל האינפוטים?',
    body: 'כל השדות בסקירה השבועית הנוכחית יתאפסו. שבועות שכבר נסגרו בארכיון לא יושפעו.',
    confirm: 'כן, אפס הכל',
    cancel: 'ביטול',
    sweeping: 'מאפס שדה אחר שדה…',
    done: 'הכל נקי ✨',
  } : {
    title: 'Reset all inputs?',
    body: 'Every field in the current Weekly Review will be cleared. Already-archived weeks stay intact.',
    confirm: 'Yes, reset all',
    cancel: 'Cancel',
    sweeping: 'Sweeping field by field…',
    done: 'All clean ✨',
  };

  return (
    <>
      <style>{`
        @keyframes wr-reset-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes wr-reset-pop {
          0% { transform: scale(.92) translateY(8px); opacity: 0 }
          60% { transform: scale(1.01) translateY(0); opacity: 1 }
          100% { transform: scale(1) translateY(0); opacity: 1 }
        }
        @keyframes wr-sweep {
          0% { transform: translateX(-110%); opacity: .0 }
          20% { opacity: 1 }
          100% { transform: translateX(110%); opacity: .0 }
        }
        @keyframes wr-ring {
          0% { transform: scale(.6); opacity: .8 }
          100% { transform: scale(1.6); opacity: 0 }
        }
        @keyframes wr-check-pop {
          0% { transform: scale(.4); opacity: 0 }
          70% { transform: scale(1.15); opacity: 1 }
          100% { transform: scale(1); opacity: 1 }
        }
      `}</style>
      <div
        role="dialog"
        aria-modal="true"
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={phase === 'ask' ? onCancel : undefined}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(2, 8, 20, 0.65)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16, animation: 'wr-reset-fade .18s ease-out',
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: 'min(460px, 96vw)', background: panel, color: fg,
            border: `1px solid ${border}`, borderRadius: 18,
            boxShadow: '0 30px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.02) inset',
            padding: 22, position: 'relative', overflow: 'hidden',
            animation: 'wr-reset-pop .28s cubic-bezier(.2,.9,.25,1.15)',
            fontFamily: 'inherit',
          }}
        >
          {/* Sweeping shimmer during reset */}
          {phase === 'sweeping' && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              background: `linear-gradient(90deg, transparent, ${loss}33, transparent)`,
              animation: 'wr-sweep .85s ease-in-out',
            }} />
          )}

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: phase === 'done' ? `${win}22` : `${loss}1f`,
              border: `1px solid ${phase === 'done' ? win : loss}55`,
              display: 'grid', placeItems: 'center', fontSize: 22,
              position: 'relative',
            }}>
              {phase === 'done' ? (
                <span style={{ color: win, animation: 'wr-check-pop .35s cubic-bezier(.2,.9,.25,1.4)' }}>✓</span>
              ) : phase === 'sweeping' ? (
                <>
                  <span style={{ position: 'absolute', inset: 0, borderRadius: 12, border: `2px solid ${loss}`, animation: 'wr-ring .9s ease-out infinite' }} />
                  <span>🧹</span>
                </>
              ) : '🧹'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: .2 }}>
                {phase === 'done' ? L.done : phase === 'sweeping' ? L.sweeping : L.title}
              </div>
              {phase === 'ask' && (
                <div style={{ color: muted, fontSize: 12.5, marginTop: 4, lineHeight: 1.5 }}>
                  {L.body}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {phase === 'ask' && (
            <div style={{
              display: 'flex', gap: 10, marginTop: 18,
              flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'flex-end',
            }}>
              <button
                onClick={onCancel}
                style={{
                  minHeight: 44, padding: '10px 18px',
                  background: 'transparent', color: fg,
                  border: `1px solid ${border}`, borderRadius: 10,
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >{L.cancel}</button>
              <button
                onClick={onConfirm}
                autoFocus
                style={{
                  minHeight: 44, padding: '10px 20px',
                  background: `linear-gradient(135deg, ${loss}, ${loss}cc)`,
                  color: '#fff',
                  border: `1px solid ${loss}`, borderRadius: 10,
                  fontFamily: 'inherit', fontWeight: 800, fontSize: 13, letterSpacing: .4,
                  cursor: 'pointer',
                  boxShadow: `0 8px 24px ${loss}55`,
                }}
              >🧹 {L.confirm}</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── pure helpers ────────────────────────────────────────────────────────
function formatDate(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function gradeLabel(g: 'A+' | 'B' | 'C', isRTL: boolean) {
  const he: Record<string, string> = { 'A+': 'מעולה (A+)', B: 'עמדתי בחוקים (B)', C: 'טעון שיפור (C)' };
  const en: Record<string, string> = { 'A+': 'Excellent (A+)', B: 'Within rules (B)', C: 'Needs work (C)' };
  return isRTL ? he[g] : en[g];
}

// ── tiny primitives ─────────────────────────────────────────────────────
function Pill({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '8px 12px', minHeight: 36, boxSizing: 'border-box',
      background: solid ? `${color}14` : `${color}10`,
      border: `1px solid ${color}66`, borderRadius: 8,
      color, fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
      fontFamily: "'IBM Plex Mono', monospace",
    }}>{label}</span>
  );
}
function Stat({ label, value, color, card, sl, sv }: {
  label: string; value: string; color: string;
  card: React.CSSProperties; sl: React.CSSProperties; sv: React.CSSProperties;
}) {
  return (
    <div style={card}>
      <div style={sl}>{label}</div>
      <div style={{ ...sv, color }}>{value}</div>
    </div>
  );
}
function DualStat({ label, r, d, isUSD, color, card, sl, sv, muted }: {
  label: string; r: string; d: string; isUSD: boolean; color: string;
  card: React.CSSProperties; sl: React.CSSProperties; sv: React.CSSProperties; muted: string;
}) {
  const main = isUSD ? d : r;
  const sub  = isUSD ? r : d;
  return (
    <div style={card}>
      <div style={sl}>{label}</div>
      <div style={{ ...sv, color }}>{main}</div>
      <div style={{ color: muted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, marginTop: 2, opacity: 0.85 }}>{sub}</div>
    </div>
  );
}
function Th({ children, align }: { children: React.ReactNode; align?: 'right' | 'left' }) {
  return <th style={{ padding: '10px 12px', fontWeight: 600, fontSize: 10, letterSpacing: 1.5, textAlign: align || 'inherit', textTransform: 'uppercase' }}>{children}</th>;
}
function Td({ children, align, style }: { children: React.ReactNode; align?: 'right' | 'left'; style?: React.CSSProperties }) {
  return <td style={{ padding: '10px 12px', textAlign: align || 'inherit', ...style }}>{children}</td>;
}
function Labeled({ label, children, muted, isRTL }: { label: string; children: React.ReactNode; muted: string; isRTL: boolean }) {
  return (
    <div>
      <div style={{ color: muted, fontSize: 11, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }}>{label}</div>
      {children}
    </div>
  );
}
function SelectField({ value, options, placeholder, onChange, input, fg, optionBg, muted }: {
  value: string; options: string[]; placeholder: string; onChange: (v: string) => void;
  input: React.CSSProperties; fg: string; optionBg?: string; muted?: string;
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...input, color: value ? fg : (muted || 'rgba(127,127,127,0.7)') }}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o} style={{ background: optionBg || '#061326', color: fg }}>{o}</option>)}
    </select>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Chip({ children, active, onClick, T, activeBg }: { children: React.ReactNode; active: boolean; onClick: () => void; T: any; activeBg?: string }) {
  const isLight = (T as { id?: string })?.id === 'platinum';
  const fg = T?.text?.primary || (isLight ? '#0a0e1a' : '#e9eef7');
  const muted = T?.text?.muted || (isLight ? '#4b5566' : '#7a8aa3');
  const border = T?.border?.subtle || (isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.08)');
  // Light mode: use a deep blue for active so it's clearly distinguishable from
  // the bright green default; dark mode keeps the cyan/green accent.
  const bgColor = activeBg || (isLight ? '#1d4ed8' : (T?.accent?.cyan || '#39FF14'));
  const idleBg = isLight ? '#ffffff' : 'transparent';
  const idleColor = isLight ? '#1a2230' : muted;
  const activeBackground = isLight ? bgColor : `${bgColor}1c`;
  const activeColor = isLight ? '#ffffff' : bgColor;
  return (
    <button type="button" onClick={onClick} style={{
      all: 'unset', cursor: 'pointer', padding: '8px 14px', minHeight: 36, boxSizing: 'border-box',
      background: active ? activeBackground : idleBg,
      border: `1px solid ${active ? bgColor : border}`,
      color: active ? activeColor : idleColor,
      borderRadius: 999, fontSize: 12, fontWeight: 600,
      transition: 'all 180ms ease',
      boxShadow: active && isLight ? `0 1px 3px ${bgColor}55` : 'none',
    }}>{children}</button>
  );
}
function ratingBtn(active: boolean, accent: string, fg: string, muted: string, border: string): React.CSSProperties {
  // `accent` is already theme-resolved by the caller (deep blue in light mode).
  const looksLight = accent === '#1d4ed8';
  return {
    width: 48, height: 48, borderRadius: 12,
    background: active ? (looksLight ? accent : `${accent}14`) : (looksLight ? '#ffffff' : 'rgba(255,255,255,0.03)'),
    border: `1.5px solid ${active ? accent : border}`,
    color: active ? (looksLight ? '#ffffff' : accent) : (looksLight ? '#1a2230' : muted),
    fontWeight: 800, fontSize: 16,
    fontFamily: "'IBM Plex Mono', monospace", cursor: 'pointer',
    display: 'grid', placeItems: 'center', transition: 'all 180ms ease',
    boxShadow: active && looksLight ? `0 1px 3px ${accent}55` : 'none',
  };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RiskCard({ label, limitR, limitUSD, valueR, valueUSD, isUSD, T, isRTL }: {
  label: string;
  limitR: number;     // negative R (e.g. -5)
  limitUSD: number;   // negative $ (e.g. -400)
  valueR: number;     // 0 or negative R used so far
  valueUSD: number;   // 0 or negative $ used so far
  isUSD: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T: any; isRTL: boolean;
}) {
  const muted = T?.text?.muted || '#7a8aa3';
  const border = T?.border?.subtle || 'rgba(255,255,255,0.08)';
  const panel = T?.bg?.surface || 'rgba(255,255,255,0.04)';
  const win = T?.status?.success || '#39FF14';
  const loss = T?.status?.danger || '#ff3b3b';
  const warn = T?.status?.warning || '#ffb830';
  const limit = isUSD ? limitUSD : limitR;
  const value = isUSD ? valueUSD : valueR;
  const pct = Math.min(100, Math.max(0, (Math.abs(value) / Math.max(1e-9, Math.abs(limit))) * 100));
  const tone = pct >= 80 ? loss : pct >= 50 ? warn : win;
  const mainStr = isUSD
    ? (value === 0 ? '$0' : fmtUSD(value))
    : (value === 0 ? '0.0R' : fmtR(value));
  const subStr = isUSD ? (valueR === 0 ? '0.0R' : fmtR(valueR))
                       : (valueUSD === 0 ? '$0' : fmtUSD(valueUSD));
  const limitStr = isUSD ? `${fmtUSD(limitUSD)}` : `${limitR}R`;
  return (
    <div style={{ padding: 14, background: panel, border: `1px solid ${border}`, borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <div style={{ color: muted, fontSize: 10, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
      </div>
      <div style={{ marginTop: 8, color: value < 0 ? loss : win, fontFamily: "'IBM Plex Mono', monospace", fontSize: 22, fontWeight: 800, textAlign: isRTL ? 'right' : 'left' }}>
        {mainStr}
      </div>
      <div style={{ color: muted, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600, marginTop: 2, opacity: 0.8, textAlign: isRTL ? 'right' : 'left' }}>
        {subStr}
      </div>
      <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: tone, transition: 'width 240ms ease' }} />
      </div>
      <div style={{ marginTop: 6, color: muted, fontSize: 10, textAlign: isRTL ? 'left' : 'right' }}>
        {isRTL ? 'מגבלה:' : 'Limit:'} {limitStr}
      </div>
    </div>
  );
}
function ScoreRing({ value, color }: { value: number; color: string }) {
  const size = 64, stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
              strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
            fill={color} fontFamily="'IBM Plex Mono', monospace" fontWeight={800} fontSize={16}>
        {value}
      </text>
    </svg>
  );
}

// ── Wave-2 schema renderer surface ─────────────────────────────────────────
// Customize mode: dedicated entry/exit. Fill mode is zero-chrome.

interface SchemaSurfaceProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T: any; isRTL: boolean;
  draft: ReturnType<typeof useWeekDraft>['draft'];
  update: ReturnType<typeof useWeekDraft>['update'];
  border: string; fg: string; muted: string;
  userTpl: ReturnType<typeof useUserTemplate>;
  // Wave-2 §E archive-aware delete
  archive: WeekRecord[];
  // WE-2
  weekStart: number;
  setWeekStart: (n: number) => Promise<void>;
  closeDays: number[];
  setCloseDays: (d: number[]) => Promise<void>;
  currentWeekKey: string;
}

function SchemaRendererSurface(props: SchemaSurfaceProps) {
  const { T, isRTL, draft, update, border, fg, muted, userTpl, archive,
          weekStart, setWeekStart, closeDays, setCloseDays, currentWeekKey } = props;
  const { template, loaded, save, resetToDefault,
          pendingMerge, acceptPendingMerge, dismissPendingMerge } = userTpl;
  const [mode, setMode] = useState<'fill' | 'customize'>('fill');
  const editMode = mode === 'customize';

  if (!loaded) {
    return <div dir={isRTL ? 'rtl' : 'ltr'} style={{ padding: 24, color: muted, fontSize: 12 }}>
      {isRTL ? 'טוען תבנית…' : 'Loading template…'}
    </div>;
  }

  // §E — non-destructive delete intercept. Looks up archive usage; returns
  // true iff user confirms (or no historical reference exists).
  const onConfirmDelete = (slug: string, kind: 'block' | 'item'): boolean => {
    const usage = countArchiveUsage(archive, slug);
    if (usage === 0) return true;
    const msg = isRTL
      ? `${usage} שבועות סגורים מתייחסים ל-${kind === 'item' ? 'פריט' : 'בלוק'} "${slug}".\nהמחיקה תסיר אותו מהתבנית הנוכחית בלבד — הסנאפשוטים ההיסטוריים נשמרים.\nלהמשיך?`
      : `${usage} closed week(s) reference this ${kind} "${slug}".\nThis removes it from your current template only — historical snapshots are preserved.\nProceed?`;
    return window.confirm(msg);
  };

  const onWeekStartChange = async (next: number) => {
    if (next === weekStart) return;
    const proceed = !window.confirm
      ? true
      : window.confirm(isRTL
          ? 'שינוי יום תחילת השבוע עשוי להעביר את הטיוטה הנוכחית לשבוע אחר. להמשיך?'
          : 'Changing the week-start may re-key your in-progress draft to a new week. Continue?');
    if (proceed) await setWeekStart(next);
  };

  // ── Customize toolbar (only when in customize mode) ────────────────────
  const dowLabels = isRTL ? ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת']
                          : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const enterBtnStyle: React.CSSProperties = {
    padding: '6px 14px', fontSize: 12, borderRadius: 8,
    border: `1px solid ${border}`, background: 'transparent', color: fg,
    cursor: 'pointer', fontWeight: 600,
  };
  const doneBtnStyle: React.CSSProperties = { ...enterBtnStyle, background: '#39FF14', color: '#061326' };
  const dangerBtnStyle: React.CSSProperties = { ...enterBtnStyle, color: '#ff3b3b' };
  const fieldStyle: React.CSSProperties = {
    background: 'transparent', color: fg,
    border: `1px solid ${border}`, borderRadius: 8, padding: '4px 8px', fontSize: 12,
  };

  const enterBar = !editMode && WR_EDIT_MODE_ENABLED ? (
    <div style={{ display: 'flex', justifyContent: isRTL ? 'flex-start' : 'flex-end' }}>
      <button type="button" onClick={() => setMode('customize')} style={enterBtnStyle}>
        {isRTL ? '⚙ התאם תבנית' : '⚙ Customize'}
      </button>
    </div>
  ) : null;

  const customizeBar = editMode ? (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
      padding: 12, border: `1px dashed ${border}`, borderRadius: 10,
      flexDirection: isRTL ? 'row-reverse' : 'row',
    }}>
      <button type="button" onClick={() => setMode('fill')} style={doneBtnStyle}>
        {isRTL ? '✓ סיום' : '✓ Done'}
      </button>
      <button
        type="button"
        onClick={() => { if (window.confirm(isRTL ? 'לאפס לתבנית ברירת המחדל?' : 'Reset to default template?')) void resetToDefault(); }}
        style={dangerBtnStyle}
      >{isRTL ? 'אפס לברירת מחדל' : 'Reset to default'}</button>

      <span style={{ width: 1, height: 22, background: border }} />

      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: muted }}>
        {isRTL ? 'תחילת שבוע:' : 'Week starts on:'}
        <select
          value={weekStart}
          onChange={e => void onWeekStartChange(Number(e.target.value))}
          style={fieldStyle}
          aria-label="week start day"
        >
          {dowLabels.map((l, i) => <option key={i} value={i} style={{ background: '#061326', color: fg }}>{l}</option>)}
        </select>
      </label>

      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12, color: muted }}>
        {isRTL ? 'ימי סגירה:' : 'Close days:'}
        {dowLabels.map((l, i) => {
          const active = closeDays.includes(i);
          return (
            <button
              key={i}
              type="button"
              aria-label={`toggle close day ${l}`}
              aria-pressed={active}
              onClick={() => {
                const next = active ? closeDays.filter(d => d !== i) : [...closeDays, i];
                if (next.length === 0) return; // never empty
                void setCloseDays(next);
              }}
              style={{
                ...fieldStyle,
                padding: '4px 8px',
                background: active ? '#39FF14' : 'transparent',
                color: active ? '#061326' : fg,
                cursor: 'pointer',
                fontWeight: active ? 700 : 500,
              }}
            >{l.slice(0, 2)}</button>
          );
        })}
      </span>
    </div>
  ) : null;

  // ── Selective merge banner (Item 3 consent UI) ─────────────────────────
  const mergeBanner = pendingMerge ? (
    <SelectiveMergeBanner
      pendingMerge={pendingMerge}
      currentTemplate={template}
      defaultTemplate={ORCA_DEFAULT_TEMPLATE}
      isRTL={isRTL} fg={fg} muted={muted} border={border}
      onAccept={async (acceptedSlugs, dismissedSlugs) => {
        const { mergeTemplateWith } = await import('../lib/wr-merge');
        const next = mergeTemplateWith(template, ORCA_DEFAULT_TEMPLATE, { acceptedSlugs, dismissedSlugs });
        save(next.schema);
        dismissPendingMerge();
      }}
      onAcceptAll={() => void acceptPendingMerge()}
      onDismissAll={dismissPendingMerge}
    />
  ) : null;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'grid', gap: 14, paddingBottom: 48 }}>
      {mergeBanner}
      {enterBar}
      {customizeBar}
      <WeeklyReviewRenderer
        schema={template}
        values={readDraft(draft)}
        onChange={(blockId, value) => {
          const patch = writeBlock(blockId, value, draft);
          if (patch) update(patch);
        }}
        T={T}
        isRTL={isRTL}
        locale={isRTL ? 'he' : 'en'}
        systemSlots={{}}
        actionRegistry={createDefaultActionRegistry()}
        editMode={editMode}
        onTemplateChange={save}
        onConfirmDelete={onConfirmDelete}
      />
    </div>
  );
}

// ── Selective merge banner ────────────────────────────────────────────────

function SelectiveMergeBanner({ pendingMerge, currentTemplate, defaultTemplate,
                               isRTL, fg, muted, border, onAccept, onAcceptAll, onDismissAll }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pendingMerge: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  currentTemplate: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultTemplate: any;
  isRTL: boolean; fg: string; muted: string; border: string;
  onAccept: (accepted: string[], dismissed: string[]) => void;
  onAcceptAll: () => void;
  onDismissAll: () => void;
}) {
  void currentTemplate; void defaultTemplate;
  const all: string[] = [
    ...pendingMerge.added.sections,
    ...pendingMerge.added.blocks,
    ...pendingMerge.added.items,
  ];
  const [checked, setChecked] = useState<Set<string>>(() => new Set(all));
  if (all.length === 0) return null;
  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const accept = () => {
    const acceptedSlugs = Array.from(checked);
    const dismissedSlugs = all.filter(s => !checked.has(s));
    onAccept(acceptedSlugs, dismissedSlugs);
  };
  return (
    <div style={{
      padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 10,
      background: 'rgba(57,255,20,0.06)', color: fg, fontSize: 12,
      display: 'grid', gap: 8,
    }}>
      <div style={{ fontWeight: 600 }}>
        {isRTL ? 'עדכון תבנית זמין — בחר מה להוסיף:' : 'Template update available — pick what to add:'}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {all.map(slug => (
          <label key={slug} style={{
            display: 'inline-flex', gap: 4, alignItems: 'center',
            border: `1px solid ${border}`, borderRadius: 6, padding: '2px 8px',
            cursor: 'pointer',
          }}>
            <input type="checkbox" checked={checked.has(slug)} onChange={() => toggle(slug)} />
            <code style={{ fontSize: 11 }}>{slug}</code>
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" onClick={onDismissAll} style={{
          padding: '4px 10px', fontSize: 12, borderRadius: 6,
          border: `1px solid ${border}`, background: 'transparent', color: muted, cursor: 'pointer',
        }}>{isRTL ? 'דחה הכל (לצמיתות)' : 'Dismiss all (permanent)'}</button>
        <button type="button" onClick={onAcceptAll} style={{
          padding: '4px 10px', fontSize: 12, borderRadius: 6,
          border: `1px solid ${border}`, background: 'transparent', color: fg, cursor: 'pointer',
        }}>{isRTL ? 'קבל הכל' : 'Accept all'}</button>
        <button type="button" onClick={accept} style={{
          padding: '4px 12px', fontSize: 12, borderRadius: 6,
          border: `1px solid ${border}`, background: '#39FF14', color: '#061326',
          cursor: 'pointer', fontWeight: 700,
        }}>{isRTL ? 'קבל נבחרים' : 'Accept selected'}</button>
      </div>
    </div>
  );
}

// Count of archived weeks whose `values` reference `slug` either as a block
// key or as a checklist item key inside a block's value map.
function countArchiveUsage(archive: WeekRecord[], slug: string): number {
  let n = 0;
  for (const w of archive) {
    const values = w.values;
    if (!values) continue;
    if (Object.prototype.hasOwnProperty.call(values, slug)) { n += 1; continue; }
    for (const v of Object.values(values)) {
      if (v && typeof v === 'object' && !Array.isArray(v) && Object.prototype.hasOwnProperty.call(v as object, slug)) {
        n += 1; break;
      }
    }
  }
  return n;
}

