/**
 * ImportPreflightModal — premium re-skin.
 *
 * UI / copy / tooltips only. Engine, pipeline, mapping logic, props, state, and
 * event handshake are unchanged. The `result` from `runImport` is rendered as-is.
 *
 * Design language: deep navy-black surface, subtle gold accents, Heebo type,
 * airy spacing, no jargon. Built to feel like a premium financial product.
 */

import { useEffect, useMemo, useState, useCallback } from 'react';
import type { PreflightOpenDetail } from '@/lib/uie/run-import-with-preflight';
import type { FieldMatch, GapItem, ImportResult, UnitsMode } from '@/lib/uie/types';
import { FIELD_TAXONOMY } from '@/lib/uie/dictionary/canonical-fields';

type Open = PreflightOpenDetail | null;

// ── design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: '#0A0F1C',
  surface: '#0F1729',
  surfaceSoft: 'rgba(20, 28, 48, 0.55)',
  hairline: 'rgba(201, 168, 76, 0.14)',
  hairlineSoft: 'rgba(148, 163, 184, 0.10)',
  gold: '#C9A84C',
  goldSoft: 'rgba(201, 168, 76, 0.55)',
  goldGlow: 'rgba(201, 168, 76, 0.18)',
  text: '#E8ECF1',
  textSoft: '#A8B2C4',
  textMuted: '#5A6478',
  green: '#34D399',
  amber: '#F5B947',
  red: '#F87171',
  font: "'Heebo', system-ui, -apple-system, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
};

// ── humanised copy ───────────────────────────────────────────────────────────
function isRTLDoc() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.dir === 'rtl' || document.documentElement.lang === 'he';
}

function fieldHumanName(canonical: string, rtl: boolean): string {
  const map: Record<string, [string, string]> = {
    symbol: ['סימול / נכס', 'Symbol'],
    direction: ['כיוון (Long/Short)', 'Direction'],
    entryDate: ['תאריך כניסה', 'Entry date'],
    exitDate: ['תאריך יציאה', 'Exit date'],
    entryPrice: ['מחיר כניסה', 'Entry price'],
    exitPrice: ['מחיר יציאה', 'Exit price'],
    quantity: ['כמות', 'Quantity'],
    positionSize: ['גודל פוזיציה', 'Position size'],
    leverage: ['מינוף', 'Leverage'],
    stopLoss: ['סטופ-לוס', 'Stop loss'],
    takeProfit: ['טייק-פרופיט', 'Take profit'],
    riskAmount: ['סיכון בכסף', 'Risk amount'],
    rMultiple: ['R (יחס סיכון/תשואה)', 'R-Multiple'],
    pnl: ['רווח / הפסד', 'P&L'],
    pnlPercent: ['רווח / הפסד באחוזים', 'P&L %'],
    commission: ['עמלה', 'Commission'],
    externalId: ['מזהה ייחודי', 'External ID'],
    notes: ['הערות', 'Notes'],
    currentPrice: ['מחיר נוכחי', 'Current price'],
    cashBalance: ['יתרה במזומן', 'Cash balance'],
    activityType: ['סוג פעולה', 'Activity type'],
    timeOnly: ['שעה בלבד', 'Time only'],
  };
  const v = map[canonical];
  if (v) return rtl ? v[0] : v[1];
  // graceful fallback for canonicals without a hebrew label
  return canonical;
}

function unitsModeLabel(mode: UnitsMode, rtl: boolean): string {
  if (mode === 'R_MODE') return rtl ? 'התיק נמדד ב-R' : 'Portfolio measured in R';
  if (mode === 'MONEY') return rtl ? 'התיק נמדד בכסף' : 'Portfolio measured in money';
  return rtl ? 'התיק נמדד גם ב-R וגם בכסף' : 'Portfolio measured in both R and money';
}

function statusChip(status: FieldMatch['status'], rtl: boolean) {
  if (status === 'auto') return { color: T.green, dot: '🟢', tip: rtl ? 'זוהה בוודאות' : 'High confidence' };
  if (status === 'suggested') return { color: T.amber, dot: '🟡', tip: rtl ? 'כדאי שתאשר' : 'Please confirm' };
  if (status === 'pending-content') return { color: T.amber, dot: '🟡', tip: rtl ? 'דרוש מידע נוסף' : 'Needs more info' };
  return { color: T.red, dot: '🔴', tip: rtl ? 'לא הצלחנו לזהות — בחר ידנית' : 'Could not identify — pick manually' };
}

function severityColor(s: GapItem['severity']) {
  if (s === 'blocker') return T.red;
  if (s === 'warning') return T.amber;
  return T.gold;
}

function severityLabel(s: GapItem['severity'], rtl: boolean) {
  if (s === 'blocker') return rtl ? 'חוסם' : 'Blocker';
  if (s === 'warning') return rtl ? 'אזהרה' : 'Warning';
  return rtl ? 'לידיעה' : 'Info';
}

// ── tiny info-tooltip primitive (native title for a11y, custom bubble on hover)─
function InfoDot({ tip }: { tip: string }) {
  return (
    <span
      title={tip}
      aria-label={tip}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 14, height: 14, borderRadius: '50%',
        border: `1px solid ${T.goldSoft}`, color: T.gold,
        fontSize: 9, fontWeight: 700, marginInline: 6,
        cursor: 'help', userSelect: 'none', lineHeight: 1,
        fontFamily: T.font, opacity: 0.85,
      }}
    >
      i
    </span>
  );
}

export function ImportPreflightRoot() {
  const [open, setOpen] = useState<Open>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [overrides, setOverrides] = useState<Record<number, string | null>>({});
  const [applying, setApplying] = useState(false);
  const rtl = isRTLDoc();

  useEffect(() => {
    const onOpen = (e: Event) => {
      const ce = e as CustomEvent<PreflightOpenDetail>;
      setOpen(ce.detail);
      setResult(ce.detail.result);
      setEditMode(false);
      setOverrides(ce.detail.initialOverrides ? { ...ce.detail.initialOverrides } : {});
    };
    window.addEventListener('orca:uie:preflight', onOpen as EventListener);
    return () => window.removeEventListener('orca:uie:preflight', onOpen as EventListener);
  }, []);

  const close = useCallback((confirm: boolean) => {
    if (!open) return;
    try { open.resolve({ confirm, result: result || open.result, overrides }); } catch { /* */ }
    setOpen(null);
    setResult(null);
    setOverrides({});
    setEditMode(false);
  }, [open, result, overrides]);

  const applyOverrides = useCallback(async () => {
    if (!open) return;
    setApplying(true);
    try {
      const next = await open.rerun(overrides);
      setResult(next);
    } catch (err) {
      console.error('[UIE] rerun failed', err);
    } finally {
      setApplying(false);
    }
  }, [open, overrides]);

  const fieldOptions = useMemo(
    () => FIELD_TAXONOMY.map((f) => f.canonical).sort((a, b) => a.localeCompare(b)),
    [],
  );

  if (!open || !result) return null;

  const r = result;
  const headers = r.structure.headers;
  const matchByCol = new Map<number, FieldMatch>();
  for (const m of r.mapping) matchByCol.set(m.columnIndex, m);

  const rows = headers.map((h, i) => {
    const absCol = i + r.structure.regionCols[0];
    const fm = matchByCol.get(absCol) || matchByCol.get(i);
    return { idx: i, absCol, header: h || `(${i + 1})`, fm };
  });

  const readinessColor = r.gap.readiness >= 80 ? T.green : r.gap.readiness >= 50 ? T.amber : T.red;
  const equityPoints = r.equityEvents.filter((e) => e.type === 'balance_snapshot');
  const pendingChanges = Object.keys(overrides).length;

  const counts = [
    { k: rtl ? 'סגורות' : 'Closed', v: r.gap.counts.tradesClosed, tip: rtl ? 'עסקאות שנסגרו במלואן (כניסה ויציאה).' : 'Trades fully closed (entry + exit).' },
    { k: rtl ? 'פתוחות' : 'Open', v: r.gap.counts.tradesOpen, tip: rtl ? 'עסקאות שעדיין פתוחות בקובץ.' : 'Trades still open in the file.' },
    { k: rtl ? 'נקודות יתרה' : 'Equity', v: r.gap.counts.equityEvents, tip: rtl ? 'נקודות יתרה שנקראו מהקובץ — יוצגו בגרף ההון.' : 'Balance snapshots read from the file.' },
    { k: rtl ? 'דולגו' : 'Skipped', v: r.gap.counts.rowsSkipped, tip: rtl ? 'שורות שדולגו (סיכומים, כותרות חוזרות, שורות ריקות).' : 'Rows skipped (totals, repeated headers, blanks).' },
    { k: rtl ? 'כפילויות' : 'Duplicates', v: r.gap.counts.duplicates, tip: rtl ? 'עסקאות זהות שזוהו ולא יובאו פעמיים.' : 'Duplicate trades detected and de-duplicated.' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      dir={rtl ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'radial-gradient(ellipse at top, rgba(10,15,28,0.92), rgba(2,5,12,0.97))',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 28,
        animation: 'orcaUieFadeIn 240ms ease-out',
        fontFamily: T.font,
      }}
    >
      <style>{`
        @keyframes orcaUieFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes orcaUieScaleIn { from { transform: scale(0.97); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        .orca-uie-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
        .orca-uie-scroll::-webkit-scrollbar-track { background: transparent; }
        .orca-uie-scroll::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.18); border-radius: 8px; }
        .orca-uie-scroll::-webkit-scrollbar-thumb:hover { background: rgba(201,168,76,0.32); }
      `}</style>

      <div
        style={{
          width: 'min(1080px, 96vw)', maxHeight: '92vh',
          background: `linear-gradient(180deg, ${T.surface} 0%, ${T.bg} 100%)`,
          border: `1px solid ${T.hairline}`,
          borderRadius: 16,
          boxShadow: `0 32px 80px rgba(0,0,0,0.65), 0 0 0 1px ${T.goldGlow} inset`,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'orcaUieScaleIn 320ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ padding: '22px 32px', borderBottom: `1px solid ${T.hairline}`, display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 600, color: T.text, letterSpacing: 0.1 }}>
              {rtl ? 'בדיקת קובץ לפני ייבוא' : 'Review file before import'}
            </div>
            <div style={{ fontSize: 12, color: T.textMuted, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {open.fileName}
            </div>
          </div>
          {open.fromMemory && (
            <div
              title={rtl ? 'הגדרות המיפוי נטענו מקובץ קודם עם אותו מבנה.' : 'Mapping loaded from a previous file with the same shape.'}
              style={{
                fontSize: 11, padding: '5px 12px', borderRadius: 999,
                background: T.goldGlow, color: T.gold,
                border: `1px solid ${T.goldSoft}`,
                fontFamily: T.font, letterSpacing: 0.2,
              }}
            >
              {rtl ? 'מיפוי מהזיכרון' : 'Remembered mapping'}
            </div>
          )}
          <button
            onClick={() => close(false)}
            aria-label={rtl ? 'סגור' : 'Close'}
            style={{
              background: 'transparent', border: `1px solid ${T.hairlineSoft}`,
              color: T.textSoft, width: 34, height: 34, borderRadius: 10,
              cursor: 'pointer', fontSize: 14, fontFamily: T.font,
              transition: 'all 140ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.goldSoft; e.currentTarget.style.color = T.gold; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.hairlineSoft; e.currentTarget.style.color = T.textSoft; }}
          >✕</button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <div className="orca-uie-scroll" style={{ overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>

          {/* Readiness + Counts */}
          <div style={{ display: 'flex', gap: 18, alignItems: 'stretch', flexWrap: 'wrap' }}>
            {/* Readiness ring */}
            <div style={{
              minWidth: 240, padding: '20px 24px', borderRadius: 14,
              background: T.surfaceSoft, border: `1px solid ${T.hairline}`,
              display: 'flex', alignItems: 'center', gap: 18,
            }}>
              <div style={{
                width: 68, height: 68, borderRadius: '50%',
                background: `conic-gradient(${readinessColor} ${r.gap.readiness * 3.6}deg, rgba(148,163,184,0.10) 0)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 24px ${readinessColor}22`,
              }}>
                <div style={{
                  width: 58, height: 58, borderRadius: '50%', background: T.surface,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17, fontWeight: 600, color: readinessColor,
                  fontFamily: T.font, letterSpacing: -0.5,
                }}>
                  {r.gap.readiness}%
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                  {rtl ? 'מוכן לייבוא' : 'Ready to import'}
                  <InfoDot tip={rtl
                    ? 'כמה הקובץ מוכן. 100% = כל הפרטים זוהו. פחות = חסרים פרטים שנראה לך.'
                    : 'How ready the file is. 100% = everything detected. Less = something is missing — we will show you what.'} />
                </div>
                <div style={{ fontSize: 13, color: T.text, marginTop: 6 }}>{unitsModeLabel(r.gap.unitsMode, rtl)}</div>
              </div>
            </div>

            {/* Counts */}
            <div style={{ flex: 1, minWidth: 320, padding: '20px 24px', borderRadius: 14, background: T.surfaceSoft, border: `1px solid ${T.hairline}` }}>
              <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, marginBottom: 14 }}>
                {rtl ? 'מה נמצא בקובץ' : 'What we found'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
                {counts.map((x) => (
                  <div key={x.k} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 600, color: T.text, fontFamily: T.font, letterSpacing: -0.5 }}>{x.v}</div>
                    <div style={{ fontSize: 10.5, color: T.textSoft, marginTop: 4, display: 'inline-flex', alignItems: 'center' }}>
                      {x.k}
                      <InfoDot tip={x.tip} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mapping table */}
          <div id="uie-mapping-table">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, fontSize: 13, color: T.text, fontWeight: 500, display: 'inline-flex', alignItems: 'center' }}>
                {rtl ? 'זיהוי העמודות מהקובץ' : 'What each column means'}
                <InfoDot tip={rtl
                  ? 'זיהינו אוטומטית מה כל עמודה. אם משהו לא נכון — לחץ "ערוך זיהוי" ובחר ידנית.'
                  : 'We auto-detected what each column means. If something is wrong — click "Edit" and pick manually.'} />
                <span style={{ marginInlineStart: 8, color: T.textMuted, fontSize: 12 }}>· {rows.length}</span>
              </div>
              {pendingChanges > 0 && (
                <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: 'rgba(245,185,71,0.12)', color: T.amber, border: `1px solid ${T.amber}33` }}>
                  {pendingChanges} {rtl ? 'שינויים בהמתנה' : 'pending'}
                </span>
              )}
              <button
                onClick={() => setEditMode((v) => !v)}
                style={{
                  padding: '7px 14px', borderRadius: 8, fontSize: 12,
                  background: editMode ? T.goldGlow : 'transparent',
                  color: editMode ? T.gold : T.textSoft,
                  border: `1px solid ${editMode ? T.goldSoft : T.hairlineSoft}`,
                  cursor: 'pointer', fontFamily: T.font, letterSpacing: 0.2,
                  transition: 'all 140ms ease',
                }}
              >
                {editMode ? (rtl ? 'עריכה פעילה' : 'Editing') : (rtl ? 'ערוך זיהוי' : 'Edit')}
              </button>
              {editMode && pendingChanges > 0 && (
                <button
                  onClick={applyOverrides}
                  disabled={applying}
                  style={{
                    padding: '7px 16px', borderRadius: 8, fontSize: 12,
                    background: applying ? 'rgba(148,163,184,0.18)' : T.gold,
                    color: applying ? T.textMuted : T.bg,
                    border: 'none', cursor: applying ? 'wait' : 'pointer',
                    fontFamily: T.font, fontWeight: 600, letterSpacing: 0.2,
                  }}
                >
                  {applying ? (rtl ? 'מנתח…' : 'Analysing…') : (rtl ? 'החל ונתח מחדש' : 'Apply & re-analyse')}
                </button>
              )}
            </div>

            <div style={{ border: `1px solid ${T.hairline}`, borderRadius: 12, overflow: 'hidden', background: T.surfaceSoft }}>
              {/* head */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: editMode ? '36px 1.1fr 1.5fr 70px 1.4fr' : '36px 1.1fr 1.1fr 70px 1.8fr',
                padding: '12px 18px', background: 'rgba(8,12,22,0.6)',
                fontSize: 11, color: T.textMuted, fontWeight: 500,
                borderBottom: `1px solid ${T.hairlineSoft}`,
              }}>
                <div>#</div>
                <div>{rtl ? 'עמודה בקובץ' : 'Column in file'}</div>
                <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {rtl ? 'מה זה' : 'What it is'}
                  <InfoDot tip={rtl
                    ? 'סוג הנתון שזיהינו בעמודה. אם טעינו, אפשר לשנות.'
                    : 'The kind of data we detected in this column. You can change it.'} />
                </div>
                <div style={{ textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {rtl ? 'ביטחון' : 'Conf.'}
                  <InfoDot tip={rtl
                    ? '🟢 זוהה בוודאות · 🟡 כדאי שתאשר · 🔴 לא הצלחנו לזהות'
                    : '🟢 High confidence · 🟡 Please confirm · 🔴 Could not identify'} />
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center' }}>
                  {rtl ? 'למה זוהה ככה' : 'Why'}
                  <InfoDot tip={rtl
                    ? 'הסימנים שגרמו לנו לזהות את העמודה בצורה הזו.'
                    : 'The signals that led to this identification.'} />
                </div>
              </div>

              {/* rows */}
              <div className="orca-uie-scroll" style={{ maxHeight: 380, overflowY: 'auto' }}>
                {rows.map((row) => {
                  const fm = row.fm;
                  const chip = statusChip(fm ? fm.status : 'unmapped', rtl);
                  const hasOverride = Object.prototype.hasOwnProperty.call(overrides, row.absCol);
                  const currentValue = hasOverride
                    ? (overrides[row.absCol] === null ? '__ignore__' : (overrides[row.absCol] as string))
                    : (fm?.field || '__unmapped__');
                  const niceName = fm?.field ? fieldHumanName(fm.field, rtl) : (rtl ? 'לא זוהה' : 'Not identified');
                  return (
                    <div key={row.idx} style={{
                      display: 'grid',
                      gridTemplateColumns: editMode ? '36px 1.1fr 1.5fr 70px 1.4fr' : '36px 1.1fr 1.1fr 70px 1.8fr',
                      padding: '14px 18px', borderTop: `1px solid ${T.hairlineSoft}`,
                      fontSize: 13, color: T.text, alignItems: 'center',
                      background: hasOverride ? 'rgba(201,168,76,0.05)' : 'transparent',
                      transition: 'background 140ms ease',
                    }}>
                      <div style={{ color: T.textMuted, fontFamily: T.mono, fontSize: 11 }}>{row.idx + 1}</div>
                      <div style={{ color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.header}>{row.header}</div>
                      <div>
                        {editMode ? (
                          <select
                            value={currentValue}
                            onChange={(e) => {
                              const v = e.target.value;
                              setOverrides((prev) => {
                                const next = { ...prev };
                                if (v === '__unmapped__') delete next[row.absCol];
                                else if (v === '__ignore__') next[row.absCol] = null;
                                else next[row.absCol] = v;
                                return next;
                              });
                            }}
                            style={{
                              width: '100%', padding: '7px 10px', borderRadius: 7,
                              background: T.bg, color: T.text,
                              border: `1px solid ${T.goldSoft}`,
                              fontFamily: T.font, fontSize: 12, cursor: 'pointer',
                            }}
                          >
                            <option value="__unmapped__">{rtl ? '— זיהוי אוטומטי —' : '— Auto-detect —'}</option>
                            <option value="__ignore__">{rtl ? 'התעלם מהעמודה' : 'Ignore column'}</option>
                            <optgroup label={rtl ? 'סוגי נתון' : 'Data types'}>
                              {fieldOptions.map((f) => (
                                <option key={f} value={f}>{fieldHumanName(f, rtl)}</option>
                              ))}
                            </optgroup>
                          </select>
                        ) : (
                          <span style={{ color: fm?.field ? T.text : T.textMuted }}>{niceName}</span>
                        )}
                      </div>
                      <div style={{ textAlign: 'center', color: chip.color, fontSize: 14 }} title={chip.tip}>{chip.dot}</div>
                      <div style={{ color: T.textSoft, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fm?.evidence?.join(' · ')}>
                        {fm?.evidence?.length ? fm.evidence.join(' · ') : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {editMode && (
              <div style={{ marginTop: 10, fontSize: 12, color: T.textMuted }}>
                {rtl
                  ? 'שנה זיהוי של עמודה או בחר "התעלם מהעמודה". לחץ "החל ונתח מחדש" כדי לבדוק את הקובץ מחדש עם השינויים שלך.'
                  : 'Change a column\'s type or pick "Ignore column". Click "Apply & re-analyse" to re-check the file with your changes.'}
              </div>
            )}
          </div>

          {/* Gap items */}
          {r.gap.items.length > 0 && (
            <div>
              <div style={{ fontSize: 13, color: T.text, fontWeight: 500, marginBottom: 12, display: 'inline-flex', alignItems: 'center' }}>
                {rtl ? 'מה חסר או דורש תשומת לב' : 'What needs attention'}
                <InfoDot tip={rtl
                  ? 'דברים שלא הצלחנו לקרוא מהקובץ או שכדאי שתבדוק לפני ייבוא.'
                  : 'Things we could not read from the file, or that you should review before importing.'} />
                <span style={{ marginInlineStart: 8, color: T.textMuted, fontSize: 12 }}>· {r.gap.items.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {r.gap.items.map((it, i) => {
                  const codeToField: Record<string, string> = {
                    T1_SYMBOL: 'symbol', T1_ENTRYDATE: 'entryDate', T1_ENTRYPRICE: 'entryPrice',
                    T1_DIRECTION: 'direction', T1_SIZE: 'quantity', T2_EXIT: 'exitPrice', T2_COMMISSION: 'commission',
                  };
                  const targetField = codeToField[it.code];
                  const sevColor = severityColor(it.severity);
                  return (
                    <div key={i} style={{
                      padding: '12px 16px', borderRadius: 10,
                      background: T.surfaceSoft, border: `1px solid ${T.hairlineSoft}`,
                      borderInlineStart: `3px solid ${sevColor}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: T.text }}>
                        <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 4, background: `${sevColor}1f`, color: sevColor, fontWeight: 600, letterSpacing: 0.3 }}>
                          {severityLabel(it.severity, rtl)}
                        </span>
                        <span style={{ flex: 1 }}>{rtl ? it.he : it.en}</span>
                        {targetField && (
                          <button
                            onClick={() => {
                              setEditMode(true);
                              if (typeof document !== 'undefined') {
                                setTimeout(() => {
                                  document.getElementById('uie-mapping-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 60);
                              }
                            }}
                            style={{
                              padding: '5px 11px', borderRadius: 7, fontSize: 11,
                              background: 'transparent', color: sevColor,
                              border: `1px solid ${sevColor}55`,
                              cursor: 'pointer', fontFamily: T.font, fontWeight: 500,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {rtl ? `מפה ${fieldHumanName(targetField, true)}` : `Map ${fieldHumanName(targetField, false)}`}
                          </button>
                        )}
                      </div>
                      {it.fix && (
                        <div style={{ marginTop: 8, fontSize: 12, color: T.textSoft, lineHeight: 1.6 }}>
                          {rtl ? it.fix.he : it.fix.en}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Equity preview */}
          <div>
            <div style={{ fontSize: 13, color: T.text, fontWeight: 500, marginBottom: 12, display: 'inline-flex', alignItems: 'center' }}>
              {rtl ? 'נקודות יתרה מהקובץ' : 'Balance points from file'}
              <InfoDot tip={rtl
                ? 'היתרה נלקחה מהקובץ שלך ותוצג בגרף ההון — לא מספר מומצא.'
                : 'These balances come from your file and will be shown in the equity chart — no fabricated numbers.'} />
            </div>
            {equityPoints.length > 0 ? (
              <div style={{ border: `1px solid ${T.goldSoft}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '10px 16px', background: T.goldGlow, fontSize: 12, color: T.gold }}>
                  {equityPoints.length}{' '}
                  {rtl ? 'נקודות יתרה — יציגו את גרף ההון האמיתי שלך' : 'balance snapshots — will render your real equity curve'}
                </div>
                <div className="orca-uie-scroll" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {equityPoints.slice(0, 50).map((e, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr',
                      padding: '8px 16px', borderTop: `1px solid ${T.hairlineSoft}`,
                      fontSize: 12,
                    }}>
                      <div style={{ color: T.textSoft, fontFamily: T.mono }}>{e.date}</div>
                      <div style={{ color: T.green, textAlign: rtl ? 'left' : 'right', fontFamily: T.mono }}>
                        {e.amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} {e.currency || ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                padding: '16px 18px', borderRadius: 12,
                background: 'rgba(248,113,113,0.05)', border: `1px solid rgba(248,113,113,0.22)`,
                color: '#FCA5A5', fontSize: 13, lineHeight: 1.7,
              }}>
                {rtl
                  ? 'אין נתוני יתרה בקובץ. גרף ההון יוצג כסכימה מצטברת מ-0, לא כהון אמיתי.'
                  : 'No balance data in file. The equity chart will be a cumulative-from-0 line, not real equity.'}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={{
          padding: '18px 32px', borderTop: `1px solid ${T.hairline}`,
          display: 'flex', gap: 12, justifyContent: rtl ? 'flex-start' : 'flex-end',
          background: 'rgba(2,5,12,0.6)', alignItems: 'center',
        }}>
          <div style={{ flex: 1, fontSize: 12, color: T.textMuted }}>
            {r.trades.length > 0 && (rtl
              ? `${r.trades.length} עסקאות יובאו ליומן`
              : `${r.trades.length} trades will be imported`)}
          </div>
          <button
            onClick={() => close(false)}
            style={{
              padding: '11px 22px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: 'transparent', color: T.textSoft, cursor: 'pointer',
              border: `1px solid ${T.hairlineSoft}`, fontFamily: T.font,
              transition: 'all 140ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.goldSoft; e.currentTarget.style.color = T.gold; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.hairlineSoft; e.currentTarget.style.color = T.textSoft; }}
          >
            {rtl ? 'ביטול' : 'Cancel'}
          </button>
          <button
            onClick={() => close(true)}
            style={{
              padding: '11px 26px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: `linear-gradient(135deg, ${T.gold}, #B89441)`,
              color: T.bg, border: 'none', cursor: 'pointer',
              fontFamily: T.font, letterSpacing: 0.2,
              boxShadow: `0 8px 24px ${T.goldGlow}`,
              transition: 'transform 140ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {rtl ? 'אשר וייבא' : 'Confirm & Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
