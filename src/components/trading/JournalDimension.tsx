import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Trade } from '@/data/trades';
import { readJournalState, writeJournalState, type JournalDay, type JournalTrade, type JournalState } from '@/lib/journal-storage';
import { ReturnButton } from './DimensionController';

// ═══════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════
const TR: Record<string, any> = {
  en: {
    dir: 'ltr', locale: 'en-US',
    app: 'APEX OS', sub: 'Private Trading Operating System',
    nav: { journal: 'Journal', archive: 'Archive', dashboard: 'Dashboard' },
    m: { phase: 'Morning Analysis', lock: 'Lock Morning Analysis', lockSub: 'Morning analysis will be permanently sealed.', locked: 'MORNING LOCKED' },
    e: { phase: 'End of Day', lock: 'Close Day & Open New', lockSub: 'Seals today\'s journal and opens a fresh new day automatically.', locked: 'DAY COMPLETE' },
    f: {
      moodTitle: 'Pre-Market Mindset', moodPh: 'Mental state before market open...',
      planTitle: 'Trading Plan', planPh: 'What you will and won\'t do today.',
      checklist: 'Execution Checklist', goals: 'Life Discipline',
      biasTitle: 'Market Bias', phaseTitle: 'Market Structure', stateTitle: 'Mental State',
      btc: 'Bitcoin', btcPh: 'BTC structure & thesis...',
      t3: 'Total 3', t3Ph: 'Altcoin market read...',
      dom: 'Dominance', domPh: 'BTC dominance thesis...',
      macro: 'Macro', macroPh: 'Global macro context...',
      levels: 'Key Levels', levelsPh: 'Support:\nResistance:\nInvalidation:\nTarget:',
      setups: 'Setups Watching', setupsPh: 'Exact setups, entry conditions...',
      emotion: 'Emotion Score', fg: 'Fear & Greed Index', fgPh: '0 – 100',
      openQ: 'Active positions from previous sessions?',
      openY: 'Yes — active positions', openN: 'No open positions',
      posNote: 'Position Management', posNotePh: 'Instrument, size, entry, current P&L...',
      tlog: 'Trade Log', addTrade: '+ Log Trade',
      ins: 'Instrument', en: 'Entry', ex: 'Exit', sz: 'Size', pnl: 'P&L ($)', rr: 'R:R',
      tNotes: 'Execution Notes', tNotesPh: 'Entry rationale, execution quality...',
      del: 'Remove', tradeN: 'Trade',
      actualMove: 'Actual Market Move', actualPh: 'What really happened...',
      score: 'Session Score',
      wins: 'Wins', winsPh: 'What worked?',
      lessons: 'Lessons', lessonsPh: 'What did the market teach?',
      mistakes: 'Mistakes', mistakesPh: 'Brutal honesty. What failed?',
      solutions: 'Solutions', solutionsPh: 'Corrective action for next time.',
      closing: 'Closing Statement', closingPh: 'One sentence that defines this session.',
    },
    bias: ['Bullish', 'Bearish', 'Neutral', 'Expansion', 'Contraction'],
    struct: ['Markup', 'Markdown', 'Accumulation', 'Distribution', 'Range'],
    states: ['Focused', 'Calm', 'Confident', 'Impulsive', 'Hesitant', 'Tired', 'Sharp'],
    tasks: ['Pre-market structure review ☕','HTF bias confirmed 📊','Key levels mapped 🗺','Setups identified 🔍','Risk defined 🛡','No-trade zones set ❌','Execution rules confirmed ✅','Mindset calibrated 🧘'],
    goals: ['Physical training 💪','Nutrition discipline 🥗','Sleep 7h+ 😴','Hydration goal 💧','Integrity — zero lies 🤝'],
    arch: { title: 'Journal Archive', search: 'Search...', all: 'All', bull: 'Bullish', bear: 'Bearish', newest: 'Newest', oldest: 'Oldest', best: 'Best P&L', readonly: 'READ ONLY — SEALED DAY', notice: 'This day is permanently locked.', close: 'Close', open: 'Open Day', morning: 'Morning Analysis', eod: 'End of Day', none: 'No archived entries yet.' },
  },
  he: {
    dir: 'rtl', locale: 'he-IL',
    app: 'APEX OS', sub: 'מערכת הפעלה פרטית למסחר',
    nav: { journal: 'יומן', archive: 'ארכיון', dashboard: 'דשבורד' },
    m: { phase: 'ניתוח בוקר', lock: 'נעל ניתוח בוקר', lockSub: 'ניתוח הבוקר יינעל לצמיתות.', locked: 'בוקר נעול' },
    e: { phase: 'סקירת סוף יום', lock: 'סגור יום ופתח חדש', lockSub: 'יסגור את היומן של היום ויפתח יום חדש אוטומטית.', locked: 'יום הושלם' },
    f: {
      moodTitle: 'מיינדסט לפני שוק', moodPh: 'מצב מנטלי לפני פתיחת השוק...',
      planTitle: 'תוכנית מסחר', planPh: 'מה תסחר ומה לא היום.',
      checklist: 'צ\'קליסט ביצוע', goals: 'משמעת אישית',
      biasTitle: 'כיוון שוק', phaseTitle: 'מבנה שוק', stateTitle: 'מצב מנטלי',
      btc: 'ביטקוין', btcPh: 'מבנה BTC ותיזה...',
      t3: 'Total 3', t3Ph: 'קריאת שוק האלטים...',
      dom: 'דומיננס', domPh: 'תיזת דומיננס BTC...',
      macro: 'מאקרו', macroPh: 'הקשר מאקרו גלובלי...',
      levels: 'רמות מפתח', levelsPh: 'תמיכה:\nהתנגדות:\nביטול:\nיעד:',
      setups: 'סטאפים שאני עוקב', setupsPh: 'סטאפים מדויקים, תנאי כניסה...',
      emotion: 'ציון רגשי', fg: 'Fear & Greed Index', fgPh: '0 – 100',
      openQ: 'פוזיציות פעילות מסשנים קודמים?',
      openY: 'כן — פוזיציות פעילות', openN: 'אין פוזיציות פתוחות',
      posNote: 'ניהול פוזיציה', posNotePh: 'מכשיר, גודל, כניסה, P&L נוכחי...',
      tlog: 'יומן עסקאות', addTrade: '+ הוסף עסקה',
      ins: 'מכשיר', en: 'כניסה', ex: 'יציאה', sz: 'גודל', pnl: 'R/L ($)', rr: 'R:R',
      tNotes: 'הערות ביצוע', tNotesPh: 'סיבת כניסה, איכות ביצוע...',
      del: 'הסר', tradeN: 'עסקה',
      actualMove: 'מהלך שוק בפועל', actualPh: 'מה באמת קרה...',
      score: 'ציון סשן',
      wins: 'ניצחונות', winsPh: 'מה עבד?',
      lessons: 'לקחים', lessonsPh: 'מה השוק לימד היום?',
      mistakes: 'טעויות', mistakesPh: 'כנות מוחלטת. מה נכשל?',
      solutions: 'פתרונות', solutionsPh: 'פעולת תיקון מדויקת.',
      closing: 'הצהרת סיכום', closingPh: 'משפט אחד שמגדיר את הסשן הזה.',
    },
    bias: ['שורי', 'דובי', 'ניטרלי', 'התרחבות', 'התכווצות'],
    struct: ['עלייה', 'ירידה', 'צבירה', 'חלוקה', 'טווח'],
    states: ['ממוקד', 'רגוע', 'בטוח', 'אימפולסיבי', 'מהסס', 'עייף', 'חד'],
    tasks: ['סקירת מבנה לפני שוק ☕','אישור כיוון HTF 📊','מיפוי רמות מפתח 🗺','זיהוי סטאפים 🔍','הגדרת סיכון 🛡','סימון אזורי ללא מסחר ❌','אישור כללי ביצוע ✅','כיול מיינדסט 🧘'],
    goals: ['אימון גופני 💪','משמעת תזונה 🥗','שינה 7+ שעות 😴','יעד שתייה 💧','יושרה — אפס שקרים 🤝'],
    arch: { title: 'ארכיון יומן', search: 'חיפוש...', all: 'הכל', bull: 'שורי', bear: 'דובי', newest: 'חדש ראשון', oldest: 'ישן ראשון', best: 'הכי טוב', readonly: 'קריאה בלבד — יום נעול', notice: 'יום זה נעול לצמיתות.', close: 'סגור', open: 'פתח יום', morning: 'ניתוח בוקר', eod: 'סוף יום', none: 'אין רשומות בארכיון עדיין.' },
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
const makeDay = (lang = 'he'): JournalDay => {
  const t = TR[lang];
  return {
    id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString().split('T')[0],
    dayNum: '', weekNum: '', lang,
    morningSaved: false,
    mood: '', plan: '',
    tasks: t.tasks.map((l: string) => ({ label: l, done: false })),
    goals: t.goals.map((l: string) => ({ label: l, done: false })),
    bias: t.bias[0], mktStruct: t.struct[4], mentalTags: [],
    btcNote: '', t3Note: '', domNote: '', macroNote: '',
    levels: '', setups: '',
    emotionScore: 7, fearGreed: '',
    eodSaved: false,
    hasOpen: null, posNote: '', trades: [],
    actualMove: '', dayScore: 0,
    wins: '', lessons: '', mistakes: '', solutions: '', closing: '',
  };
};

const sumPnl = (d: JournalDay) => (d.trades || []).reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
const numWins = (d: JournalDay) => (d.trades || []).filter(t => parseFloat(t.pnl) > 0).length;
const fmtFull = (iso: string, locale: string) => {
  try { return new Date(iso + 'T12:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch { return iso; }
};
const fmtShort = (iso: string, locale: string) => {
  try { return new Date(iso + 'T12:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }); } catch { return iso; }
};

const MORNING_KEYS = new Set(['mood','plan','tasks','goals','bias','mktStruct','mentalTags','btcNote','t3Note','domNote','macroNote','levels','setups','emotionScore','fearGreed','dayNum','weekNum','date']);

// ═══════════════════════════════════════════════════════════════
// MICRO ATOMS
// ═══════════════════════════════════════════════════════════════
const Lbl = ({ c, dir }: { c: string; dir: string }) => (
  <span style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase' as const, color: 'var(--j-tx3)', marginBottom: 5, display: 'block', textAlign: dir === 'rtl' ? 'right' : 'left' }}>{c}</span>
);

const TA = ({ val, set, ph, rows = 4, dir, disabled }: any) => (
  <textarea value={val} rows={rows} disabled={disabled}
    onChange={e => set?.(e.target.value)} placeholder={ph}
    style={{ width: '100%', background: 'rgba(255,255,255,0.9)', border: '1.5px solid var(--j-br)', borderRadius: '6px', color: 'var(--j-tx)', fontFamily: 'var(--j-sans)', fontSize: 13, outline: 'none', padding: '9px 11px', lineHeight: 1.75, resize: 'vertical' as const, direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left', transition: 'border-color .18s,box-shadow .18s' }} />
);

const IN = ({ val, set, ph, dir, disabled, style = {} }: any) => (
  <input value={val} disabled={disabled}
    onChange={e => set?.(e.target.value)} placeholder={ph}
    style={{ width: '100%', background: 'rgba(255,255,255,0.9)', border: '1.5px solid var(--j-br)', borderRadius: '6px', color: 'var(--j-tx)', fontFamily: 'var(--j-sans)', fontSize: 13, outline: 'none', padding: '8px 11px', direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left', transition: 'border-color .18s,box-shadow .18s', ...style }} />
);

const Sec = ({ title, icon, accent = 'var(--j-b)', children, open: initOpen = true }: any) => {
  const [open, setOpen] = useState(initOpen);
  return (
    <div style={{ background: 'var(--j-bg1)', border: '1px solid var(--j-br)', borderRadius: 10, marginBottom: 9, overflow: 'hidden' }}>
      <div onClick={() => setOpen((o: boolean) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 15px', cursor: 'pointer', userSelect: 'none' as const, transition: 'background .15s', background: open ? `linear-gradient(90deg,${accent}18,transparent 55%)` : '' }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontFamily: 'var(--j-mono)', fontSize: '9.8px', fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase' as const, color: '#5a6888', flex: 1 }}>{title}</span>
        <span style={{ color: accent, fontSize: 11, transition: 'transform .2s', transform: open ? 'none' : 'rotate(-90deg)' }}>▾</span>
      </div>
      {open && <div style={{ padding: 14 }}>{children}</div>}
    </div>
  );
};

const Chk = ({ item, toggle, color, dir, disabled }: any) => (
  <div onClick={() => !disabled && toggle?.()}
    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 0', borderBottom: '1px solid rgba(15,23,42,.06)', cursor: disabled ? 'default' : 'pointer', direction: dir }}>
    <div style={{ width: 16, height: 16, borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s', border: `2px solid ${item.done ? color : 'var(--j-tx3)'}`, background: item.done ? `${color}22` : 'none' }}>
      {item.done && <span style={{ fontSize: 9, color, fontWeight: 700 }}>✓</span>}
    </div>
    <span style={{ fontSize: 12.5, color: item.done ? `${color}99` : 'var(--j-tx2)', textDecoration: item.done ? 'line-through' : 'none', transition: 'all .15s' }}>{item.label}</span>
  </div>
);

const PDiv = ({ label, color, icon }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '18px 0 14px' }}>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${color}40)` }} />
    <div style={{ fontFamily: 'var(--j-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '2.2px', textTransform: 'uppercase' as const, padding: '5px 13px', borderRadius: 18, color, border: `1px solid ${color}30`, background: `${color}0d` }}>{icon} {label}</div>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${color}40,transparent)` }} />
  </div>
);

// ═══════════════════════════════════════════════════════════════
// EMOTION SLIDER
// ═══════════════════════════════════════════════════════════════
const EmoSlider = ({ val, set, label, dir, disabled }: any) => {
  const c = val >= 8 ? 'var(--j-g)' : val >= 5 ? 'var(--j-a)' : 'var(--j-r)';
  const e = val >= 9 ? '🔥' : val >= 7 ? '💪' : val >= 5 ? '😐' : val >= 3 ? '😔' : '💀';
  return (
    <div style={{ direction: dir }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Lbl c={label} dir={dir} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 16 }}>{e}</span>
          <span style={{ fontFamily: 'var(--j-mono)', fontSize: 21, fontWeight: 700, color: c, lineHeight: 1 }}>{val}</span>
          <span style={{ fontFamily: 'var(--j-mono)', fontSize: 10, color: 'var(--j-tx3)' }}>/10</span>
        </div>
      </div>
      <div style={{ height: 3, background: 'var(--j-bg3)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ height: '100%', width: `${((val - 1) / 9) * 100}%`, background: 'linear-gradient(90deg,var(--j-r),var(--j-a),var(--j-g))', transition: 'width .2s', borderRadius: 2 }} />
      </div>
      <input type="range" min={1} max={10} value={val} disabled={disabled}
        onChange={e => set?.(+e.target.value)} style={{ width: '100%', accentColor: c, cursor: disabled ? 'not-allowed' : 'pointer' }} />
    </div>
  );
};

const Scores = ({ val, set, disabled }: any) => (
  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
      const on = val >= n, h = (n / 10) * 120;
      return (
        <button key={n} onClick={() => !disabled && set?.(n)} style={{
          width: 29, height: 29, borderRadius: 6, border: 'none', fontFamily: 'var(--j-mono)',
          cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 11,
          background: on ? `hsla(${h},70%,46%,.9)` : 'rgba(15,23,42,.05)',
          color: on ? '#fff' : 'var(--j-tx3)', transition: 'all .12s',
          boxShadow: on ? `0 2px 8px hsla(${h},70%,44%,.4)` : 'none',
        }}>{n}</button>
      );
    })}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// FEAR & GREED GAUGE
// ═══════════════════════════════════════════════════════════════
const FGGauge = ({ value }: { value: number }) => {
  const v = Math.min(100, Math.max(0, value || 0));
  const color = v <= 20 ? '#ef4444' : v <= 40 ? '#f97316' : v <= 60 ? '#eab308' : v <= 80 ? '#84cc16' : '#22c55e';
  const label = v <= 20 ? 'Extreme Fear' : v <= 40 ? 'Fear' : v <= 60 ? 'Neutral' : v <= 80 ? 'Greed' : 'Extreme Greed';
  const rad = (d: number) => d * Math.PI / 180;
  const cx = 75, cy = 72, R = 54, ri = 38;
  const segs = [
    { s: -180, e: -144, c: '#ef4444' }, { s: -144, e: -108, c: '#f97316' },
    { s: -108, e: -72, c: '#eab308' }, { s: -72, e: -36, c: '#84cc16' }, { s: -36, e: 0, c: '#22c55e' }
  ];
  const arc = (s: number, e: number) => {
    const sr = rad(s), er = rad(e), lf = e - s > 180 ? 1 : 0;
    return `M${cx + ri * Math.cos(sr)},${cy + ri * Math.sin(sr)} L${cx + R * Math.cos(sr)},${cy + R * Math.sin(sr)} A${R},${R},0,${lf},1,${cx + R * Math.cos(er)},${cy + R * Math.sin(er)} L${cx + ri * Math.cos(er)},${cy + ri * Math.sin(er)} A${ri},${ri},0,${lf},0,${cx + ri * Math.cos(sr)},${cy + ri * Math.sin(sr)}Z`;
  };
  const needleA = -180 + (v / 100) * 180;
  const nr = rad(needleA);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width="150" height="82" viewBox="0 0 150 82">
        {segs.map((s, i) => <path key={i} d={arc(s.s, s.e)} fill={s.c} opacity={0.9} />)}
        <line x1={cx} y1={cy} x2={cx + 46 * Math.cos(nr)} y2={cy + 46 * Math.sin(nr)} stroke="var(--j-tx)" strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill="var(--j-tx)" />
      </svg>
      <div style={{ textAlign: 'center', marginTop: -6 }}>
        <div style={{ fontFamily: 'var(--j-mono)', fontSize: 19, fontWeight: 700, color, lineHeight: 1 }}>{v}</div>
        <div style={{ fontFamily: 'var(--j-mono)', fontSize: '8.5px', color, letterSpacing: 1, textTransform: 'uppercase' as const, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TRADE CARD
// ═══════════════════════════════════════════════════════════════
const TCard = ({ trade, idx, onChange, onDel, f, dir, disabled }: any) => {
  const p = parseFloat(trade.pnl) || 0;
  const sc = trade.side === 'LONG' ? 'var(--j-g)' : trade.side === 'SHORT' ? 'var(--j-r)' : 'var(--j-b)';
  return (
    <div style={{ background: 'rgba(15,23,42,.025)', border: '1px solid var(--j-br)', borderRadius: 10, padding: 13, marginBottom: 9, borderInlineStart: `3px solid ${sc}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, direction: dir }}>
        <span style={{ fontFamily: 'var(--j-mono)', fontSize: 9, color: 'var(--j-tx3)', letterSpacing: 1 }}>{f.tradeN} #{idx + 1}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {p !== 0 && <span style={{ fontFamily: 'var(--j-mono)', fontSize: 13, fontWeight: 700, color: p > 0 ? 'var(--j-g)' : 'var(--j-r)' }}>{p > 0 ? '+' : ''}{p.toFixed(2)}$</span>}
          {!disabled && <button onClick={onDel} style={{ background: 'rgba(220,38,38,.1)', border: '1px solid rgba(240,64,90,.2)', color: 'var(--j-r)', padding: '5px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>✕ {f.del}</button>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 9 }}>
        {[['ins','pair','BTC/USDT'],['en','entry','95000'],['ex','exit','97000'],['sz','size','0.1'],['pnl','pnl','+200'],['rr','rr','1:3']].map(([lKey, k, ph]: any) => (
          <div key={k}><Lbl c={f[lKey]} dir={dir} /><IN val={trade[k] || ''} set={(v: string) => onChange?.({ ...trade, [k]: v })} ph={ph} dir={dir} disabled={disabled} /></div>
        ))}
      </div>
      {!disabled && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
          {['LONG', 'SHORT', 'MISSED'].map(s => (
            <button key={s} onClick={() => onChange?.({ ...trade, side: s })}
              style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 600, letterSpacing: '.9px', textTransform: 'uppercase' as const, borderRadius: 20, padding: '4px 13px', cursor: 'pointer', transition: 'all .15s', ...(trade.side === s ? { background: s === 'LONG' ? 'var(--j-g)' : s === 'SHORT' ? 'var(--j-r)' : 'var(--j-b)', color: '#fff', border: 'none' } : { background: 'rgba(15,23,42,.04)', border: '1.5px solid var(--j-br)', color: 'var(--j-tx3)' }) }}>
              {s}
            </button>
          ))}
        </div>
      )}
      <Lbl c={f.tNotes} dir={dir} />
      <TA val={trade.notes || ''} set={(v: string) => onChange?.({ ...trade, notes: v })} ph={f.tNotesPh} rows={2} dir={dir} disabled={disabled} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MORNING FORM
// ═══════════════════════════════════════════════════════════════
const MorningForm = ({ day, upd, t, dir, onSave, dirty }: any) => {
  const f = t.f;
  const U = (k: string) => (v: any) => upd({ [k]: v });
  const taskArr = day.tasks || [];
  const done = taskArr.filter((x: any) => x.done).length;
  const BC = ['linear-gradient(135deg,var(--j-g),#0a9e76)', 'linear-gradient(135deg,var(--j-r),#c02040)', 'linear-gradient(135deg,var(--j-b),#2a6fd4)', 'linear-gradient(135deg,var(--j-a),#c48010)', 'linear-gradient(135deg,var(--j-p),#5820b8)'];

  return (
    <div>
      <PDiv label={t.m.phase} color="var(--j-g)" icon="🌅" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
        <div>
          <Sec title={f.moodTitle} icon="💭" accent="var(--j-a)">
            <TA val={day.mood} set={U('mood')} ph={f.moodPh} rows={5} dir={dir} />
          </Sec>
          <Sec title={f.planTitle} icon="🎯" accent="var(--j-b)">
            <TA val={day.plan} set={U('plan')} ph={f.planPh} rows={5} dir={dir} />
          </Sec>
          <Sec title={f.checklist} icon="✅" accent="var(--j-g)">
            {(day.tasks || []).map((tk: any, i: number) => (
              <Chk key={i} item={tk} color="var(--j-g)" dir={dir}
                toggle={() => upd({ tasks: (day.tasks || []).map((x: any, j: number) => j === i ? { ...x, done: !x.done } : x) })} />
            ))}
            <div style={{ marginTop: 9, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 3, background: 'var(--j-bg3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${taskArr.length ? (done / taskArr.length) * 100 : 0}%`, background: 'var(--j-g)', transition: 'width .4s', borderRadius: 2 }} />
              </div>
              <span style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', color: 'var(--j-tx3)', fontWeight: 600 }}>{done}/{taskArr.length}</span>
            </div>
          </Sec>
          <Sec title={f.goals} icon="🏆" accent="var(--j-a)" open={false}>
            {(day.goals || []).map((g: any, i: number) => (
              <Chk key={i} item={g} color="var(--j-a)" dir={dir}
                toggle={() => upd({ goals: (day.goals || []).map((x: any, j: number) => j === i ? { ...x, done: !x.done } : x) })} />
            ))}
          </Sec>
        </div>
        <div>
          <Sec title={`${f.biasTitle} & ${f.phaseTitle}`} icon="📊" accent="var(--j-g)">
            <div style={{ marginBottom: 13 }}>
              <Lbl c={f.biasTitle} dir={dir} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {t.bias.map((o: string, i: number) => (
                  <button key={o} onClick={() => upd({ bias: o })}
                    style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 600, borderRadius: 20, padding: '4px 13px', cursor: 'pointer', transition: 'all .15s', ...(day.bias === o ? { background: BC[i], color: '#fff', border: 'none' } : { background: 'rgba(15,23,42,.04)', border: '1.5px solid var(--j-br)', color: 'var(--j-tx3)' }) }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 13 }}>
              <Lbl c={f.phaseTitle} dir={dir} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {t.struct.map((o: string, i: number) => (
                  <button key={o} onClick={() => upd({ mktStruct: o })}
                    style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 600, borderRadius: 20, padding: '4px 13px', cursor: 'pointer', transition: 'all .15s', ...(day.mktStruct === o ? { background: BC[i], color: '#fff', border: 'none' } : { background: 'rgba(15,23,42,.04)', border: '1.5px solid var(--j-br)', color: 'var(--j-tx3)' }) }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Lbl c={f.stateTitle} dir={dir} />
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                {t.states.map((s: string) => {
                  const on = (day.mentalTags || []).includes(s);
                  return (
                    <button key={s} onClick={() => {
                      const cur = day.mentalTags || [];
                      upd({ mentalTags: on ? cur.filter((x: string) => x !== s) : [...cur, s] });
                    }} style={{ fontFamily: 'var(--j-sans)', fontSize: 11, fontWeight: 500, borderRadius: 8, padding: '5px 12px', cursor: 'pointer', transition: 'all .15s', ...(on ? { background: 'rgba(124,58,237,.1)', borderColor: 'rgba(153,104,248,.4)', color: '#6d28d9', border: '1.5px solid rgba(153,104,248,.4)' } : { background: 'rgba(15,23,42,.04)', border: '1.5px solid var(--j-br)', color: 'var(--j-tx3)' }) }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </Sec>
          <Sec title="Asset Analysis" icon="🪙" accent="var(--j-a)">
            {[
              { key: 'btcNote', lbl: f.btc, ph: f.btcPh, badge: '₿', c: '#f5a020' },
              { key: 't3Note', lbl: f.t3, ph: f.t3Ph, badge: 'T3', c: '#9968f8' },
              { key: 'domNote', lbl: f.dom, ph: f.domPh, badge: 'DOM', c: '#4a8ff4' },
              { key: 'macroNote', lbl: f.macro, ph: f.macroPh, badge: 'M', c: '#00c896' },
            ].map(({ key, lbl, ph, badge, c }) => (
              <div key={key} style={{ marginBottom: 12, paddingInlineStart: 10, borderInlineStart: `2px solid ${c}28` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                  <span style={{ fontFamily: 'var(--j-mono)', fontSize: 8, fontWeight: 700, color: c, background: `${c}20`, padding: '2px 7px', borderRadius: 4 }}>{badge}</span>
                  <Lbl c={lbl} dir={dir} />
                </div>
                <TA val={day[key] || ''} set={(v: string) => upd({ [key]: v })} ph={ph} rows={2} dir={dir} />
              </div>
            ))}
          </Sec>
          <Sec title={f.levels} icon="🗺" accent="var(--j-b)">
            <TA val={day.levels} set={U('levels')} ph={f.levelsPh} rows={5} dir={dir} />
          </Sec>
          <Sec title={f.setups} icon="🔍" accent="var(--j-b)">
            <TA val={day.setups} set={U('setups')} ph={f.setupsPh} rows={4} dir={dir} />
          </Sec>
          <Sec title={`${f.emotion} & ${f.fg}`} icon="🧠" accent="var(--j-p)">
            <EmoSlider val={day.emotionScore} set={U('emotionScore')} label={f.emotion} dir={dir} />
            <div style={{ height: 1, background: 'var(--j-br)', margin: '13px 0' }} />
            <Lbl c={f.fg} dir={dir} />
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' as const }}>
              <IN val={day.fearGreed || ''} set={(v: string) => { const n = v.replace(/\D/g, '').slice(0, 3); if (n === '' || parseInt(n) <= 100) upd({ fearGreed: n }); }} ph={f.fgPh} dir={dir} style={{ width: 90 }} />
              {day.fearGreed !== '' && day.fearGreed !== undefined && <FGGauge value={parseInt(day.fearGreed) || 0} />}
            </div>
          </Sec>
        </div>
      </div>
      <div style={{ margin: '20px 0 6px', background: 'rgba(245,160,32,.06)', border: '1px solid rgba(245,160,32,.16)', borderRadius: 12, padding: '17px 22px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--j-sans)', fontSize: '11.5px', color: '#92400e', marginBottom: 12 }}>{t.m.lockSub}</p>
        <button onClick={onSave} disabled={!dirty} style={{ background: 'linear-gradient(135deg,#f5a020,#d48010)', color: '#fff', padding: '11px 24px', fontSize: '12.5px', fontWeight: 700, letterSpacing: '.3px', boxShadow: '0 4px 18px rgba(245,160,32,.3)', borderRadius: 10, border: 'none', cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.3, fontFamily: 'var(--j-sans)' }}>🔒 {t.m.lock}</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EOD FORM
// ═══════════════════════════════════════════════════════════════
const EodForm = ({ day, upd, t, dir, onSave, dirty, orcaTrades }: any) => {
  const f = t.f;
  const U = (k: string) => (v: any) => upd({ [k]: v });
  const dp = sumPnl(day), dw = numWins(day);
  const addTrade = () => upd({ trades: [...(day.trades || []), { id: Date.now(), pair: '', side: 'LONG', entry: '', exit: '', size: '', pnl: '', rr: '', notes: '' }] });

  return (
    <div>
      {/* Morning Locked Recap */}
      <div style={{ background: 'linear-gradient(135deg,rgba(5,150,105,.08),rgba(5,150,105,.03))', border: '1px solid rgba(5,150,105,.22)', borderRadius: 11, padding: '11px 15px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' as const }}>
            <span style={{ fontFamily: 'var(--j-mono)', fontSize: '8.5px', color: 'var(--j-g)', letterSpacing: '1.5px', textTransform: 'uppercase' as const, background: 'rgba(0,200,150,.15)', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>🔒 {t.m.locked}</span>
            <span style={{ fontFamily: 'var(--j-sans)', fontSize: 12, color: '#065f46' }}>{day.bias} · {day.mktStruct}</span>
          </div>
          <span style={{ fontFamily: 'var(--j-mono)', fontSize: 13, fontWeight: 700, color: day.emotionScore >= 7 ? 'var(--j-g)' : day.emotionScore >= 5 ? 'var(--j-a)' : 'var(--j-r)' }}>{day.emotionScore}/10</span>
        </div>
      </div>

      {/* Orca Trade Bridge */}
      {orcaTrades && orcaTrades.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,rgba(0,242,255,.04),rgba(6,214,160,.04))', border: '1px solid rgba(0,242,255,.15)', borderRadius: 10, padding: '12px 15px', marginBottom: 14 }}>
          <div style={{ fontFamily: 'var(--j-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: '#06d6a0', marginBottom: 8 }}>
            ⚡ {dir === 'rtl' ? 'עסקאות מ-Orca' : 'Orca Trade Bridge'} — {orcaTrades.length} {dir === 'rtl' ? 'עסקאות' : 'trades'}
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' as const, paddingBottom: 4 }}>
            {orcaTrades.slice(0, 6).map((tr: Trade) => (
              <div key={tr.id} style={{ flexShrink: 0, padding: '8px 12px', background: 'rgba(255,255,255,.6)', borderRadius: 8, border: `1px solid ${tr.pnl >= 0 ? 'rgba(5,150,105,.2)' : 'rgba(220,38,38,.2)'}`, minWidth: 100 }}>
                <div style={{ fontFamily: 'var(--j-mono)', fontSize: 11, fontWeight: 700, color: 'var(--j-tx)' }}>{tr.coin}</div>
                <div style={{ fontFamily: 'var(--j-mono)', fontSize: 12, fontWeight: 700, color: tr.pnl >= 0 ? 'var(--j-g)' : 'var(--j-r)', marginTop: 2 }}>{tr.pnl >= 0 ? '+' : ''}{tr.pnl.toFixed(2)}$</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PDiv label={t.e.phase} color="var(--j-p)" icon="🌙" />

      {/* Trade Log */}
      <Sec title={f.tlog} icon="💹" accent="var(--j-b)">
        {day.hasOpen === null ? (
          <div style={{ borderRadius: 10, padding: 20, textAlign: 'center', border: '1.5px dashed var(--j-br2)', background: 'rgba(15,23,42,.025)' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>📂</div>
            <div style={{ fontFamily: 'var(--j-sans)', fontSize: 13, fontWeight: 600, color: 'var(--j-tx2)', marginBottom: 16 }}>{f.openQ}</div>
            <div style={{ display: 'flex', gap: 9, justifyContent: 'center', flexWrap: 'wrap' as const }}>
              <button onClick={() => upd({ hasOpen: true })} style={{ background: 'linear-gradient(135deg,var(--j-a),#c48010)', color: '#fff', padding: '9px 20px', fontSize: 12, borderRadius: 8, fontFamily: 'var(--j-sans)', fontWeight: 600, border: 'none', cursor: 'pointer' }}>📈 {f.openY}</button>
              <button onClick={() => upd({ hasOpen: false })} style={{ background: 'rgba(15,23,42,.04)', border: '1px solid var(--j-br2)', color: 'var(--j-tx2)', padding: '6px 13px', fontSize: '11.5px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>✖ {f.openN}</button>
            </div>
          </div>
        ) : (
          <>
            {(day.trades || []).map((tr: JournalTrade, i: number) => (
              <TCard key={tr.id} trade={tr} idx={i} f={f} dir={dir}
                onChange={(nt: JournalTrade) => upd({ trades: (day.trades || []).map((x: any, j: number) => j === i ? nt : x) })}
                onDel={() => upd({ trades: day.trades.filter((_: any, j: number) => j !== i) })} />
            ))}
            <button onClick={addTrade} style={{ width: '100%', padding: 9, borderRadius: 8, borderStyle: 'dashed', color: 'var(--j-b)', borderColor: 'rgba(74,143,244,.3)', marginTop: 4, background: 'rgba(15,23,42,.04)', border: '1px dashed var(--j-br2)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>{f.addTrade}</button>
            {(day.trades || []).length > 0 && (
              <div style={{ display: 'flex', gap: 18, marginTop: 11, padding: '10px 14px', background: 'rgba(15,23,42,.03)', borderRadius: 9 }}>
                {[{ l: f.pnl, v: `${dp >= 0 ? '+' : ''}${dp.toFixed(2)}$`, c: dp >= 0 ? 'var(--j-g)' : 'var(--j-r)' }, { l: f.tlog, v: String(day.trades.length), c: 'var(--j-tx2)' }, { l: 'Win %', v: `${((dw / Math.max(day.trades.length, 1)) * 100).toFixed(0)}%`, c: 'var(--j-a)' }].map(s => (
                  <div key={s.l}><Lbl c={s.l} dir={dir} /><div style={{ fontFamily: 'var(--j-mono)', fontSize: 17, fontWeight: 700, color: s.c }}>{s.v}</div></div>
                ))}
              </div>
            )}
          </>
        )}
      </Sec>

      {/* EOD Review */}
      <Sec title={t.e.phase} icon="🌙" accent="var(--j-p)">
        <div style={{ marginBottom: 13 }}><Lbl c={f.actualMove} dir={dir} /><TA val={day.actualMove} set={U('actualMove')} ph={f.actualPh} rows={3} dir={dir} /></div>
        <div style={{ marginBottom: 15 }}><Lbl c={f.score} dir={dir} /><Scores val={day.dayScore} set={U('dayScore')} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 13 }}>
          {[{ k: 'wins', l: f.wins, ph: f.winsPh, c: 'var(--j-g)' }, { k: 'lessons', l: f.lessons, ph: f.lessonsPh, c: 'var(--j-b)' }, { k: 'mistakes', l: f.mistakes, ph: f.mistakesPh, c: 'var(--j-r)' }, { k: 'solutions', l: f.solutions, ph: f.solutionsPh, c: 'var(--j-a)' }].map(item => (
            <div key={item.k} style={{ borderInlineStart: `2px solid ${item.c}22`, paddingInlineStart: 10 }}>
              <Lbl c={item.l} dir={dir} />
              <TA val={day[item.k]} set={U(item.k)} ph={item.ph} rows={4} dir={dir} />
            </div>
          ))}
        </div>
        <Lbl c={f.closing} dir={dir} />
        <TA val={day.closing} set={U('closing')} ph={f.closingPh} rows={3} dir={dir} />
      </Sec>

      <div style={{ margin: '20px 0 6px', background: 'rgba(153,104,248,.06)', border: '1px solid rgba(153,104,248,.16)', borderRadius: 12, padding: '17px 22px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--j-sans)', fontSize: '11.5px', color: '#6d28d9', marginBottom: 12 }}>{t.e.lockSub}</p>
        <button onClick={onSave} disabled={!dirty} style={{ background: 'linear-gradient(135deg,#9968f8,#6830d4)', color: '#fff', padding: '11px 24px', fontSize: '12.5px', fontWeight: 700, letterSpacing: '.3px', boxShadow: '0 4px 18px rgba(153,104,248,.3)', borderRadius: 10, border: 'none', cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.3, fontFamily: 'var(--j-sans)' }}>✓ {t.e.lock}</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN JOURNAL DIMENSION
// ═══════════════════════════════════════════════════════════════
interface JournalDimensionProps {
  onReturn: () => void;
  isRTL: boolean;
  orcaTrades: Trade[];
}

export const JournalDimension = ({ onReturn, isRTL, orcaTrades }: JournalDimensionProps) => {
  const [lang, setLang] = useState(isRTL ? 'he' : 'en');
  const [days, setDays] = useState<JournalDay[]>(() => {
    const d = makeDay(isRTL ? 'he' : 'en'); d.dayNum = '1'; d.weekNum = '1';
    return [d];
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState('journal');
  const [sidebar, setSidebar] = useState(true);
  const [mDirty, setMD] = useState(false);
  const [eDirty, setED] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [sbQ, setSbQ] = useState('');
  const tRef = useRef<any>(null);

  const daysRef = useRef(days);
  const activeIdRef = useRef(activeId);
  const langRef = useRef(lang);
  useEffect(() => { daysRef.current = days; }, [days]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const t = TR[lang];
  const dir = t.dir;

  // Load from IndexedDB
  useEffect(() => {
    readJournalState().then(s => {
      if (s?.days?.length) {
        setDays(s.days);
        setActiveId(s.activeDayId || s.days[s.days.length - 1].id);
        if (s.lang) setLang(s.lang);
      } else {
        const d = makeDay(isRTL ? 'he' : 'en'); d.dayNum = '1'; d.weekNum = '1';
        setDays([d]);
        setActiveId(d.id);
      }
      setLoaded(true);
    });
  }, []);

  const activeDay = useMemo(() => {
    if (!activeId) return days[days.length - 1] || null;
    return days.find(d => d.id === activeId) || days[days.length - 1] || null;
  }, [days, activeId]);

  const commit = useCallback((nextDays: JournalDay[], nextId: string | null, nextLang?: string) => {
    writeJournalState({ days: nextDays, activeDayId: nextId, lang: nextLang || langRef.current });
  }, []);

  const upd = useCallback((patch: Partial<JournalDay>) => {
    const curId = activeIdRef.current;
    setDays(prev => {
      const next = prev.map(d => d.id === curId ? { ...d, ...patch } : d);
      writeJournalState({ days: next, activeDayId: curId, lang: langRef.current });
      return next;
    });
    if (Object.keys(patch).some(k => MORNING_KEYS.has(k))) setMD(true);
    else setED(true);
  }, []);

  const showToast = useCallback((msg: string, type = 'g') => {
    clearTimeout(tRef.current);
    setToast({ msg, type });
    tRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const saveMorning = useCallback(() => {
    const curId = activeIdRef.current;
    setDays(prev => {
      const next = prev.map(d => d.id === curId ? { ...d, morningSaved: true } : d);
      writeJournalState({ days: next, activeDayId: curId, lang: langRef.current });
      return next;
    });
    setMD(false);
    showToast(langRef.current === 'he' ? '🔒 ניתוח בוקר נעול' : '🔒 Morning analysis locked', 'a');
  }, [showToast]);

  const saveEOD = useCallback(() => {
    const curId = activeIdRef.current;
    const curLang = langRef.current;
    setDays(prev => {
      const cur = prev.find(d => d.id === curId);
      const sealed = prev.map(d => d.id === curId ? { ...d, eodSaved: true } : d);
      const newDay = makeDay(curLang);
      const lastNum = parseInt(cur?.dayNum || '0') || 0;
      const lastWk = parseInt(cur?.weekNum || '1') || 1;
      newDay.dayNum = String(lastNum + 1);
      newDay.weekNum = String(lastNum % 5 === 4 ? lastWk + 1 : lastWk);
      const next = [...sealed, newDay];
      setActiveId(newDay.id);
      activeIdRef.current = newDay.id;
      writeJournalState({ days: next, activeDayId: newDay.id, lang: curLang });
      return next;
    });
    setED(false); setMD(false);
    showToast(langRef.current === 'he' ? '✓ יום נסגר — יום חדש נפתח' : '✓ Day sealed — new day opened', 'p');
  }, [showToast]);

  const sbDays = useMemo(() => {
    const q = sbQ.toLowerCase();
    return [...days]
      .filter(d => !q || d.date?.includes(q) || (d.mood || '').toLowerCase().includes(q))
      .reverse();
  }, [days, sbQ]);

  // Today's orca trades for the trade bridge
  const todayOrcaTrades = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return orcaTrades.filter(tr => tr.date?.startsWith(today));
  }, [orcaTrades]);

  if (!loaded) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eef2f7' }}>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#2563eb', letterSpacing: 2 }}>LOADING...</div>
    </div>
  );

  const TOAST_STYLES: Record<string, React.CSSProperties> = {
    a: { background: 'rgba(245,160,32,.14)', border: '1px solid rgba(245,160,32,.28)', color: '#d97706' },
    p: { background: 'rgba(153,104,248,.14)', border: '1px solid rgba(153,104,248,.28)', color: '#7c3aed' },
    g: { background: 'rgba(0,200,150,.14)', border: '1px solid rgba(0,200,150,.28)', color: '#059669' },
  };

  return (
    <div className="journal-dimension" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      fontFamily: "'IBM Plex Sans', sans-serif", direction: dir,
      background: '#eef2f7',
      backgroundImage: 'radial-gradient(circle at 20% 50%,rgba(219,234,254,.6) 0%,transparent 50%),radial-gradient(circle at 80% 20%,rgba(237,233,254,.5) 0%,transparent 40%)',
    }}>
      {/* SCOPED CSS VARS */}
      <style>{`
        .journal-dimension {
          --j-bg: #eef2f7; --j-bg1: #ffffff; --j-bg2: #f5f8fc; --j-bg3: #e4eaf4;
          --j-br: rgba(15,23,42,.09); --j-br2: rgba(15,23,42,.15);
          --j-tx: #0f172a; --j-tx2: #3d4d72; --j-tx3: #94a3c0;
          --j-g: #059669; --j-r: #dc2626; --j-a: #d97706; --j-b: #2563eb; --j-p: #7c3aed;
          --j-mono: 'IBM Plex Mono', 'JetBrains Mono', monospace;
          --j-sans: 'IBM Plex Sans', 'Inter', sans-serif;
          --j-head: 'Syne', 'Inter', sans-serif;
        }
        .journal-dimension ::-webkit-scrollbar { width: 3px; height: 3px; }
        .journal-dimension ::-webkit-scrollbar-track { background: transparent; }
        .journal-dimension ::-webkit-scrollbar-thumb { background: rgba(15,23,42,.15); border-radius: 2px; }
        .journal-dimension textarea:focus, .journal-dimension input:focus {
          border-color: rgba(37,99,235,.5) !important;
          box-shadow: 0 0 0 3px rgba(37,99,235,.1) !important;
        }
      `}</style>

      {/* TOPBAR */}
      <nav style={{ height: 50, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', background: 'var(--j-bg1)', borderBottom: '1px solid var(--j-br)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setSidebar(o => !o)} style={{ background: 'rgba(15,23,42,.04)', border: '1px solid var(--j-br2)', color: 'var(--j-tx2)', padding: '5px 9px', fontSize: 13, borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>☰</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,var(--j-b),var(--j-p))', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, boxShadow: '0 2px 10px rgba(74,143,244,.45)' }}>⚡</div>
            <span style={{ fontFamily: 'var(--j-head)', fontSize: 14, fontWeight: 800, background: 'linear-gradient(90deg,var(--j-b),var(--j-p))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>APEX OS</span>
            <span style={{ fontFamily: 'var(--j-mono)', fontSize: 8, color: 'var(--j-tx3)', letterSpacing: '1.5px' }}>{t.sub}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {([['journal', t.nav.journal], ['archive', t.nav.archive]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setView(v as string)}
              style={{ fontFamily: 'var(--j-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase' as const, border: 'none', cursor: 'pointer', borderRadius: 6, padding: '6px 14px', transition: 'all .18s', ...(view === v ? { background: 'rgba(37,99,235,.1)', color: '#1d4ed8' } : { background: 'none', color: 'var(--j-tx3)' }) }}>
              {l}
            </button>
          ))}
          <div style={{ width: 1, height: 16, background: 'var(--j-br)', margin: '0 4px' }} />
          <ReturnButton onClick={onReturn} isRTL={isRTL} />
        </div>
      </nav>

      {/* LAYOUT */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* SIDEBAR */}
        <aside style={{ width: sidebar ? 248 : 0, minWidth: sidebar ? 248 : 0, overflow: 'hidden', transition: 'all .28s ease', background: 'var(--j-bg1)', borderInlineEnd: '1px solid var(--j-br)', display: 'flex', flexDirection: 'column', order: dir === 'rtl' ? 2 : 0 }}>
          <div style={{ padding: '9px 9px 7px', borderBottom: '1px solid var(--j-br)' }}>
            <input value={sbQ} onChange={e => setSbQ(e.target.value)} placeholder={t.arch.search}
              style={{ width: '100%', background: 'rgba(255,255,255,.9)', border: '1.5px solid var(--j-br)', borderRadius: 6, color: 'var(--j-tx)', fontSize: '11.5px', outline: 'none', padding: '8px 11px', direction: dir }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 5 }}>
            {sbDays.map(d => {
              const dp = sumPnl(d);
              const ec = d.emotionScore >= 8 ? 'var(--j-g)' : d.emotionScore >= 5 ? 'var(--j-a)' : 'var(--j-r)';
              const phase = d.morningSaved && d.eodSaved ? 'var(--j-g)' : d.morningSaved ? 'var(--j-p)' : 'var(--j-tx3)';
              const sel = d.id === activeId;
              return (
                <div key={d.id} onClick={() => { setActiveId(d.id); setView('journal'); }}
                  style={{ padding: '9px 11px', borderRadius: 9, cursor: 'pointer', transition: 'background .12s', marginBottom: 2, border: '1px solid transparent', ...(sel ? { background: 'rgba(37,99,235,.1)', borderColor: 'rgba(37,99,235,.25)' } : {}) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontFamily: 'var(--j-mono)', fontSize: '10.5px', fontWeight: 600, color: sel ? 'var(--j-tx)' : 'var(--j-tx2)' }}>{fmtShort(d.date, t.locale)}</span>
                        <span style={{ fontSize: 6, color: phase }}>●</span>
                      </div>
                      <div style={{ fontFamily: 'var(--j-mono)', fontSize: 9, color: 'var(--j-tx3)', marginTop: 1 }}>
                        {dir === 'rtl' ? 'יום' : 'Day'} {d.dayNum || '?'} · {dir === 'rtl' ? 'שבוע' : 'Wk'} {d.weekNum || '?'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, marginInlineStart: 6, flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--j-mono)', fontSize: '10.5px', fontWeight: 700, color: ec }}>{d.emotionScore}</span>
                      {dp !== 0 && <span style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 600, color: dp > 0 ? 'var(--j-g)' : 'var(--j-r)' }}>{dp > 0 ? '+' : ''}{dp.toFixed(0)}$</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--j-bg)', order: 1 }}>
          {view === 'journal' && activeDay && (
            <div style={{ maxWidth: 1060, margin: '0 auto', padding: '20px 20px 40px', direction: dir }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: 11, marginBottom: 18 }}>
                <div>
                  <div style={{ fontFamily: 'var(--j-head)', fontSize: 19, fontWeight: 800, color: 'var(--j-tx)', letterSpacing: '-.3px' }}>
                    {fmtFull(activeDay.date, t.locale)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 8, flexWrap: 'wrap' as const }}>
                    {[['dayNum', dir === 'rtl' ? 'יום #' : 'Day #', '50px'], ['weekNum', dir === 'rtl' ? 'שבוע #' : 'Week #', '52px']].map(([k, l, w]: any) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase' as const, color: 'var(--j-tx3)', marginBottom: 0 }}>{l}</span>
                        <input value={(activeDay as any)[k] || ''} onChange={e => upd({ [k]: e.target.value } as any)} placeholder="—"
                          style={{ width: w, background: 'rgba(15,23,42,.04)', border: '1px solid var(--j-br)', borderRadius: 6, color: '#334080', padding: '4px 6px', fontSize: 13, fontWeight: 700, fontFamily: 'var(--j-mono)', outline: 'none', textAlign: 'center' }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(() => { const dp = sumPnl(activeDay); return (
                    <div style={{ background: 'rgba(15,23,42,.04)', border: '1px solid var(--j-br)', borderRadius: 9, padding: '7px 13px', textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--j-mono)', fontSize: 14, fontWeight: 700, color: dp >= 0 ? 'var(--j-g)' : 'var(--j-r)' }}>{dp >= 0 ? '+' : ''}{dp.toFixed(0)}$</div>
                      <span style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase' as const, color: 'var(--j-tx3)' }}>P&L</span>
                    </div>
                  ); })()}
                </div>
              </div>
              {!activeDay.morningSaved
                ? <MorningForm day={activeDay} upd={upd} t={t} dir={dir} onSave={saveMorning} dirty={mDirty} />
                : <EodForm day={activeDay} upd={upd} t={t} dir={dir} onSave={saveEOD} dirty={eDirty} orcaTrades={todayOrcaTrades} />
              }
            </div>
          )}
          {view === 'archive' && (
            <div style={{ maxWidth: 920, margin: '0 auto', padding: '20px 20px 40px', direction: dir }}>
              <div style={{ fontFamily: 'var(--j-head)', fontSize: 20, fontWeight: 800, color: 'var(--j-tx)', marginBottom: 5 }}>{t.arch.title}</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {days.filter(d => d.morningSaved).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(day => {
                  const dp = sumPnl(day);
                  const complete = day.morningSaved && day.eodSaved;
                  return (
                    <div key={day.id} onClick={() => { setActiveId(day.id); setView('journal'); }}
                      style={{ background: 'var(--j-bg1)', border: '1px solid var(--j-br)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'all .17s' }}>
                      <div style={{ background: 'rgba(5,150,105,.05)', borderBottom: '1px solid var(--j-br)', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--j-mono)', fontSize: 9, color: 'var(--j-g)', letterSpacing: '1.5px', fontWeight: 700 }}>🌅 {t.arch.morning}</span>
                          <span style={{ fontFamily: 'var(--j-head)', fontSize: '13.5px', fontWeight: 800, color: 'var(--j-tx)' }}>{fmtFull(day.date, t.locale)}</span>
                          <span style={{ fontFamily: 'var(--j-mono)', fontSize: '8.5px', fontWeight: 700, color: complete ? 'var(--j-g)' : 'var(--j-a)', background: complete ? 'rgba(5,150,105,.1)' : 'rgba(217,119,6,.1)', padding: '2px 8px', borderRadius: 5 }}>{complete ? '✓ COMPLETE' : 'MORNING ONLY'}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--j-mono)', fontSize: 13, fontWeight: 700, color: dp >= 0 ? 'var(--j-g)' : 'var(--j-r)' }}>{dp >= 0 ? '+' : ''}{dp.toFixed(0)}$</div>
                      </div>
                    </div>
                  );
                })}
                {days.filter(d => d.morningSaved).length === 0 && (
                  <div style={{ textAlign: 'center', padding: 60, color: 'var(--j-tx3)', fontFamily: 'var(--j-sans)' }}>{t.arch.none}</div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* TOAST */}
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, borderRadius: 10, padding: '10px 17px', fontFamily: 'var(--j-mono)', fontSize: 11, fontWeight: 600, zIndex: 9999, pointerEvents: 'none', letterSpacing: '.5px', ...TOAST_STYLES[toast.type] }}>{toast.msg}</div>}
    </div>
  );
};
