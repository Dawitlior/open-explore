import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { Trade } from '@/data/trades';
import { readJournalState, writeJournalState, type JournalDay, type JournalTrade, type JournalState } from '@/lib/journal-storage';
import { ReturnButton } from './DimensionController';

// ═══════════════════════════════════════════════════════════════
// TRANSLATIONS (UNCHANGED)
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
// HELPERS (UNCHANGED)
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
// MICRO ATOMS — DARK INSTITUTIONAL THEME
// ═══════════════════════════════════════════════════════════════
const Lbl = ({ c, dir }: { c: string; dir: string }) => (
  <span style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'var(--j-tx3)', marginBottom: 6, display: 'block', textAlign: dir === 'rtl' ? 'right' : 'left' }}>{c}</span>
);

const TA = ({ val, set, ph, rows = 4, dir, disabled }: any) => (
  <textarea value={val} rows={rows} disabled={disabled}
    onChange={e => set?.(e.target.value)} placeholder={ph}
    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'var(--j-tx)', fontFamily: 'var(--j-sans)', fontSize: 13, outline: 'none', padding: '10px 12px', lineHeight: 1.75, resize: 'vertical' as const, direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left', transition: 'border-color .2s, box-shadow .2s, background .2s', backdropFilter: 'blur(8px)' }} />
);

const IN = ({ val, set, ph, dir, disabled, style = {} }: any) => (
  <input value={val} disabled={disabled}
    onChange={e => set?.(e.target.value)} placeholder={ph}
    style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'var(--j-tx)', fontFamily: 'var(--j-sans)', fontSize: 13, outline: 'none', padding: '9px 12px', direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left', transition: 'border-color .2s, box-shadow .2s, background .2s', backdropFilter: 'blur(8px)', ...style }} />
);

const Sec = ({ title, icon, accent = 'var(--j-b)', children, open: initOpen = true }: any) => {
  const [open, setOpen] = useState(initOpen);
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, marginBottom: 10, overflow: 'hidden', backdropFilter: 'blur(12px)', transition: 'box-shadow .25s', boxShadow: open ? `0 0 20px ${accent}08` : 'none' }}>
      <div onClick={() => setOpen((o: boolean) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', cursor: 'pointer', userSelect: 'none' as const, transition: 'background .2s', background: open ? `linear-gradient(90deg,${accent}12,transparent 60%)` : 'transparent' }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontFamily: 'var(--j-mono)', fontSize: '10px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.45)', flex: 1 }}>{title}</span>
        <span style={{ color: accent, fontSize: 11, transition: 'transform .25s ease', transform: open ? 'none' : 'rotate(-90deg)' }}>▾</span>
      </div>
      <div style={{ maxHeight: open ? '2000px' : '0', overflow: 'hidden', transition: 'max-height .4s ease, opacity .3s ease', opacity: open ? 1 : 0 }}>
        <div style={{ padding: 15 }}>{children}</div>
      </div>
    </div>
  );
};

const Chk = ({ item, toggle, color, dir, disabled }: any) => (
  <div onClick={() => !disabled && toggle?.()}
    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: disabled ? 'default' : 'pointer', direction: dir, transition: 'background .15s' }}>
    <div style={{ width: 17, height: 17, borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', border: `2px solid ${item.done ? color : 'rgba(255,255,255,0.2)'}`, background: item.done ? `${color}20` : 'transparent', boxShadow: item.done ? `0 0 8px ${color}30` : 'none' }}>
      {item.done && <span style={{ fontSize: 9, color, fontWeight: 700 }}>✓</span>}
    </div>
    <span style={{ fontSize: 12.5, color: item.done ? `${color}88` : 'rgba(255,255,255,0.65)', textDecoration: item.done ? 'line-through' : 'none', transition: 'all .15s' }}>{item.label}</span>
  </div>
);

const PDiv = ({ label, color, icon }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '22px 0 16px' }}>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${color}35)` }} />
    <div style={{ fontFamily: 'var(--j-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, padding: '6px 16px', borderRadius: 20, color, border: `1px solid ${color}25`, background: `${color}0a`, boxShadow: `0 0 15px ${color}15` }}>{icon} {label}</div>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${color}35,transparent)` }} />
  </div>
);

// ═══════════════════════════════════════════════════════════════
// MARKET OVERVIEW STRIP
// ═══════════════════════════════════════════════════════════════
const MarketStrip = ({ day, dir }: { day: JournalDay; dir: string }) => {
  const emo = day.emotionScore;
  const emoColor = emo >= 8 ? '#00FFA3' : emo >= 5 ? '#FFC857' : '#FF4D4D';
  const fg = parseInt(day.fearGreed) || 0;
  const fgColor = fg <= 30 ? '#FF4D4D' : fg <= 60 ? '#FFC857' : '#00FFA3';
  const fgLabel = fg <= 20 ? 'Extreme Fear' : fg <= 40 ? 'Fear' : fg <= 60 ? 'Neutral' : fg <= 80 ? 'Greed' : 'Extreme Greed';

  const badges = [
    { label: dir === 'rtl' ? 'כיוון' : 'BIAS', value: day.bias || '—', color: day.bias?.includes('ull') || day.bias?.includes('שורי') ? '#00FFA3' : day.bias?.includes('ear') || day.bias?.includes('דובי') ? '#FF4D4D' : '#FFC857' },
    { label: dir === 'rtl' ? 'מבנה' : 'STRUCTURE', value: day.mktStruct || '—', color: '#5AA9FF' },
    { label: dir === 'rtl' ? 'רגש' : 'EMOTION', value: `${emo}/10`, color: emoColor },
    { label: dir === 'rtl' ? 'פחד/תאוות בצע' : 'F&G', value: day.fearGreed ? `${fg} · ${fgLabel}` : '—', color: fgColor },
  ];

  return (
    <div style={{ display: 'flex', gap: 8, padding: '10px 0', overflowX: 'auto' as const, direction: dir as 'ltr' | 'rtl' }}>
      {badges.map(b => (
        <div key={b.label} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          background: `${b.color}08`, border: `1px solid ${b.color}20`,
          borderRadius: 10, flexShrink: 0, backdropFilter: 'blur(8px)',
          transition: 'all .2s',
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, boxShadow: `0 0 8px ${b.color}60`, animation: 'j-pulse 2.5s ease-in-out infinite' }} />
          <div>
            <div style={{ fontFamily: 'var(--j-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '1.8px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' as const }}>{b.label}</div>
            <div style={{ fontFamily: 'var(--j-mono)', fontSize: 12, fontWeight: 700, color: b.color, marginTop: 1 }}>{b.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EMOTION SLIDER
// ═══════════════════════════════════════════════════════════════
const EmoSlider = ({ val, set, label, dir, disabled }: any) => {
  const c = val >= 8 ? '#00FFA3' : val >= 5 ? '#FFC857' : '#FF4D4D';
  const e = val >= 9 ? '🔥' : val >= 7 ? '💪' : val >= 5 ? '😐' : val >= 3 ? '😔' : '💀';
  return (
    <div style={{ direction: dir }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Lbl c={label} dir={dir} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>{e}</span>
          <span style={{ fontFamily: 'var(--j-mono)', fontSize: 24, fontWeight: 800, color: c, lineHeight: 1, textShadow: `0 0 20px ${c}50` }}>{val}</span>
          <span style={{ fontFamily: 'var(--j-mono)', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>/10</span>
        </div>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', width: `${((val - 1) / 9) * 100}%`, background: `linear-gradient(90deg,#FF4D4D,#FFC857,#00FFA3)`, transition: 'width .3s ease', borderRadius: 2, boxShadow: `0 0 10px ${c}40` }} />
      </div>
      <input type="range" min={1} max={10} value={val} disabled={disabled}
        onChange={e => set?.(+e.target.value)} style={{ width: '100%', accentColor: c, cursor: disabled ? 'not-allowed' : 'pointer' }} />
    </div>
  );
};


const Scores = ({ val, set, disabled }: any) => (
  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
      const on = val >= n, h = (n / 10) * 120;
      return (
        <button key={n} onClick={() => !disabled && set?.(n)} style={{
          width: 32, height: 32, borderRadius: 8, border: 'none', fontFamily: 'var(--j-mono)',
          cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 12,
          background: on ? `hsla(${h},70%,46%,.85)` : 'rgba(255,255,255,0.04)',
          color: on ? '#fff' : 'rgba(255,255,255,0.25)', transition: 'all .15s',
          boxShadow: on ? `0 0 12px hsla(${h},70%,44%,.5)` : 'none',
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
  const color = v <= 20 ? '#FF4D4D' : v <= 40 ? '#f97316' : v <= 60 ? '#FFC857' : v <= 80 ? '#84cc16' : '#00FFA3';
  const label = v <= 20 ? 'Extreme Fear' : v <= 40 ? 'Fear' : v <= 60 ? 'Neutral' : v <= 80 ? 'Greed' : 'Extreme Greed';
  const rad = (d: number) => d * Math.PI / 180;
  const cx = 75, cy = 72, R = 54, ri = 38;
  const segs = [
    { s: -180, e: -144, c: '#FF4D4D' }, { s: -144, e: -108, c: '#f97316' },
    { s: -108, e: -72, c: '#FFC857' }, { s: -72, e: -36, c: '#84cc16' }, { s: -36, e: 0, c: '#00FFA3' }
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
        {segs.map((s, i) => <path key={i} d={arc(s.s, s.e)} fill={s.c} opacity={0.85} />)}
        <line x1={cx} y1={cy} x2={cx + 46 * Math.cos(nr)} y2={cy + 46 * Math.sin(nr)} stroke="rgba(255,255,255,0.9)" strokeWidth={2.5} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        <circle cx={cx} cy={cy} r={5} fill="rgba(255,255,255,0.9)" />
      </svg>
      <div style={{ textAlign: 'center', marginTop: -6 }}>
        <div style={{ fontFamily: 'var(--j-mono)', fontSize: 20, fontWeight: 800, color, lineHeight: 1, textShadow: `0 0 15px ${color}50` }}>{v}</div>
        <div style={{ fontFamily: 'var(--j-mono)', fontSize: '8.5px', color, letterSpacing: 1, textTransform: 'uppercase' as const, marginTop: 3, opacity: 0.8 }}>{label}</div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TRADE CARD
// ═══════════════════════════════════════════════════════════════
const TCard = ({ trade, idx, onChange, onDel, f, dir, disabled }: any) => {
  const p = parseFloat(trade.pnl) || 0;
  const sc = trade.side === 'LONG' ? '#00FFA3' : trade.side === 'SHORT' ? '#FF4D4D' : '#5AA9FF';
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14, marginBottom: 10,
      borderInlineStart: `3px solid ${sc}`, backdropFilter: 'blur(8px)',
      transition: 'all .25s ease', boxShadow: `0 0 0 0 ${sc}00`,
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${sc}15`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 0 ${sc}00`; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, direction: dir }}>
        <span style={{ fontFamily: 'var(--j-mono)', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.2 }}>{f.tradeN} #{idx + 1}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {p !== 0 && <span style={{ fontFamily: 'var(--j-mono)', fontSize: 14, fontWeight: 800, color: p > 0 ? '#00FFA3' : '#FF4D4D', textShadow: p > 0 ? '0 0 12px rgba(0,255,163,0.4)' : '0 0 12px rgba(255,77,77,0.4)' }}>{p > 0 ? '+' : ''}{p.toFixed(2)}$</span>}
          {!disabled && <button onClick={onDel} style={{ background: 'rgba(255,77,77,.1)', border: '1px solid rgba(255,77,77,.2)', color: '#FF4D4D', padding: '5px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer', fontWeight: 600, transition: 'all .15s' }}>✕ {f.del}</button>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
        {[['ins','pair','BTC/USDT'],['en','entry','95000'],['ex','exit','97000'],['sz','size','0.1'],['pnl','pnl','+200'],['rr','rr','1:3']].map(([lKey, k, ph]: any) => (
          <div key={k}><Lbl c={f[lKey]} dir={dir} /><IN val={trade[k] || ''} set={(v: string) => onChange?.({ ...trade, [k]: v })} ph={ph} dir={dir} disabled={disabled} /></div>
        ))}
      </div>
      {!disabled && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
          {['LONG', 'SHORT', 'MISSED'].map(s => (
            <button key={s} onClick={() => onChange?.({ ...trade, side: s })}
              style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const, borderRadius: 20, padding: '5px 14px', cursor: 'pointer', transition: 'all .2s', ...(trade.side === s ? { background: s === 'LONG' ? '#00FFA3' : s === 'SHORT' ? '#FF4D4D' : '#5AA9FF', color: '#0a0e1a', border: 'none', boxShadow: `0 0 12px ${s === 'LONG' ? 'rgba(0,255,163,0.3)' : s === 'SHORT' ? 'rgba(255,77,77,0.3)' : 'rgba(90,169,255,0.3)'}` } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }) }}>
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
// MORNING FORM — "PRE-MARKET BRIEFING"
// ═══════════════════════════════════════════════════════════════
const MorningForm = ({ day, upd, t, dir, onSave, dirty }: any) => {
  const f = t.f;
  const U = (k: string) => (v: any) => upd({ [k]: v });
  const taskArr = day.tasks || [];
  const done = taskArr.filter((x: any) => x.done).length;
  const BC = ['linear-gradient(135deg,#00FFA3,#0a9e76)', 'linear-gradient(135deg,#FF4D4D,#c02040)', 'linear-gradient(135deg,#5AA9FF,#2a6fd4)', 'linear-gradient(135deg,#FFC857,#c48010)', 'linear-gradient(135deg,#9968f8,#5820b8)'];

  return (
    <div>
      <PDiv label={dir === 'rtl' ? 'תדריך טרום-שוק' : 'PRE-MARKET BRIEFING'} color="#00FFA3" icon="🌅" />
      <MarketStrip day={day} dir={dir} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <div>
          <Sec title={f.moodTitle} icon="💭" accent="#FFC857">
            <TA val={day.mood} set={U('mood')} ph={f.moodPh} rows={5} dir={dir} />
          </Sec>
          <Sec title={f.planTitle} icon="🎯" accent="#5AA9FF">
            <TA val={day.plan} set={U('plan')} ph={f.planPh} rows={5} dir={dir} />
          </Sec>
          <Sec title={f.checklist} icon="✅" accent="#00FFA3">
            {(day.tasks || []).map((tk: any, i: number) => (
              <Chk key={i} item={tk} color="#00FFA3" dir={dir}
                toggle={() => upd({ tasks: (day.tasks || []).map((x: any, j: number) => j === i ? { ...x, done: !x.done } : x) })} />
            ))}
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${taskArr.length ? (done / taskArr.length) * 100 : 0}%`, background: 'linear-gradient(90deg,#00FFA3,#06d6a0)', transition: 'width .5s ease', borderRadius: 2, boxShadow: '0 0 8px rgba(0,255,163,0.3)' }} />
              </div>
              <span style={{ fontFamily: 'var(--j-mono)', fontSize: '10px', color: '#00FFA3', fontWeight: 700 }}>{done}/{taskArr.length}</span>
            </div>
          </Sec>
          <Sec title={f.goals} icon="🏆" accent="#FFC857" open={false}>
            {(day.goals || []).map((g: any, i: number) => (
              <Chk key={i} item={g} color="#FFC857" dir={dir}
                toggle={() => upd({ goals: (day.goals || []).map((x: any, j: number) => j === i ? { ...x, done: !x.done } : x) })} />
            ))}
          </Sec>
        </div>
        <div>
          <Sec title={`${f.biasTitle} & ${f.phaseTitle}`} icon="📊" accent="#00FFA3">
            <div style={{ marginBottom: 14 }}>
              <Lbl c={f.biasTitle} dir={dir} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {t.bias.map((o: string, i: number) => (
                  <button key={o} onClick={() => upd({ bias: o })}
                    style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 700, borderRadius: 20, padding: '5px 14px', cursor: 'pointer', transition: 'all .2s', ...(day.bias === o ? { background: BC[i], color: '#0a0e1a', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }) }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <Lbl c={f.phaseTitle} dir={dir} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {t.struct.map((o: string, i: number) => (
                  <button key={o} onClick={() => upd({ mktStruct: o })}
                    style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 700, borderRadius: 20, padding: '5px 14px', cursor: 'pointer', transition: 'all .2s', ...(day.mktStruct === o ? { background: BC[i], color: '#0a0e1a', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.3)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)' }) }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Lbl c={f.stateTitle} dir={dir} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {t.states.map((s: string) => {
                  const on = (day.mentalTags || []).includes(s);
                  return (
                    <button key={s} onClick={() => {
                      const cur = day.mentalTags || [];
                      upd({ mentalTags: on ? cur.filter((x: string) => x !== s) : [...cur, s] });
                    }} style={{ fontFamily: 'var(--j-sans)', fontSize: 11, fontWeight: 600, borderRadius: 8, padding: '5px 13px', cursor: 'pointer', transition: 'all .2s', ...(on ? { background: 'rgba(153,104,248,.15)', border: '1px solid rgba(153,104,248,.35)', color: '#b794f6', boxShadow: '0 0 10px rgba(153,104,248,0.2)' } : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }) }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </Sec>
          <Sec title="Asset Intelligence" icon="🪙" accent="#FFC857">
            {[
              { key: 'btcNote', lbl: f.btc, ph: f.btcPh, badge: '₿', c: '#f5a020' },
              { key: 't3Note', lbl: f.t3, ph: f.t3Ph, badge: 'T3', c: '#b794f6' },
              { key: 'domNote', lbl: f.dom, ph: f.domPh, badge: 'DOM', c: '#5AA9FF' },
              { key: 'macroNote', lbl: f.macro, ph: f.macroPh, badge: 'M', c: '#00FFA3' },
            ].map(({ key, lbl, ph, badge, c }) => (
              <div key={key} style={{ marginBottom: 13, paddingInlineStart: 12, borderInlineStart: `2px solid ${c}25` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--j-mono)', fontSize: 8.5, fontWeight: 700, color: c, background: `${c}15`, padding: '3px 8px', borderRadius: 5, boxShadow: `0 0 8px ${c}15` }}>{badge}</span>
                  <Lbl c={lbl} dir={dir} />
                </div>
                <TA val={day[key] || ''} set={(v: string) => upd({ [key]: v })} ph={ph} rows={2} dir={dir} />
              </div>
            ))}
          </Sec>
          <Sec title={f.levels} icon="🗺" accent="#5AA9FF">
            <TA val={day.levels} set={U('levels')} ph={f.levelsPh} rows={5} dir={dir} />
          </Sec>
          <Sec title={f.setups} icon="🔍" accent="#5AA9FF">
            <TA val={day.setups} set={U('setups')} ph={f.setupsPh} rows={4} dir={dir} />
          </Sec>
          <Sec title={`${f.emotion} & ${f.fg}`} icon="🧠" accent="#b794f6">
            <EmoSlider val={day.emotionScore} set={U('emotionScore')} label={f.emotion} dir={dir} />
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '14px 0' }} />
            <Lbl c={f.fg} dir={dir} />
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' as const }}>
              <IN val={day.fearGreed || ''} set={(v: string) => { const n = v.replace(/\D/g, '').slice(0, 3); if (n === '' || parseInt(n) <= 100) upd({ fearGreed: n }); }} ph={f.fgPh} dir={dir} style={{ width: 90 }} />
              {day.fearGreed !== '' && day.fearGreed !== undefined && <FGGauge value={parseInt(day.fearGreed) || 0} />}
            </div>
          </Sec>
        </div>
      </div>
      {/* Lock Button */}
      <div style={{ margin: '22px 0 8px', background: 'rgba(255,200,87,0.06)', border: '1px solid rgba(255,200,87,0.15)', borderRadius: 14, padding: '18px 24px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
        <p style={{ fontFamily: 'var(--j-sans)', fontSize: '11.5px', color: '#FFC857', marginBottom: 12, opacity: 0.8 }}>{t.m.lockSub}</p>
        <button onClick={onSave} disabled={!dirty} style={{
          background: 'linear-gradient(135deg,#FFC857,#f5a020)', color: '#0a0e1a', padding: '12px 28px', fontSize: '12.5px', fontWeight: 800, letterSpacing: '.5px',
          boxShadow: dirty ? '0 4px 24px rgba(255,200,87,.35)' : 'none', borderRadius: 12, border: 'none',
          cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.3, fontFamily: 'var(--j-mono)',
          transition: 'all .25s', textTransform: 'uppercase' as const,
        }}>🔒 {t.m.lock}</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EOD FORM — "POST-MARKET DEBRIEF"
// ═══════════════════════════════════════════════════════════════
const EodForm = ({ day, upd, t, dir, onSave, dirty, orcaTrades }: any) => {
  const f = t.f;
  const U = (k: string) => (v: any) => upd({ [k]: v });
  const dp = sumPnl(day), dw = numWins(day);
  const addTrade = () => upd({ trades: [...(day.trades || []), { id: Date.now(), pair: '', side: 'LONG', entry: '', exit: '', size: '', pnl: '', rr: '', notes: '' }] });

  return (
    <div>
      {/* Morning Locked Recap */}
      <div style={{
        background: 'linear-gradient(135deg,rgba(0,255,163,0.06),rgba(0,255,163,0.02))', border: '1px solid rgba(0,255,163,0.15)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 16, backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
            <span style={{ fontFamily: 'var(--j-mono)', fontSize: '8.5px', color: '#00FFA3', letterSpacing: '1.8px', textTransform: 'uppercase' as const, background: 'rgba(0,255,163,.12)', padding: '3px 10px', borderRadius: 5, fontWeight: 700, boxShadow: '0 0 10px rgba(0,255,163,0.15)' }}>🔒 {t.m.locked}</span>
            <span style={{ fontFamily: 'var(--j-mono)', fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{day.bias} · {day.mktStruct}</span>
          </div>
          <span style={{ fontFamily: 'var(--j-mono)', fontSize: 14, fontWeight: 800, color: day.emotionScore >= 7 ? '#00FFA3' : day.emotionScore >= 5 ? '#FFC857' : '#FF4D4D', textShadow: `0 0 10px ${day.emotionScore >= 7 ? 'rgba(0,255,163,0.3)' : day.emotionScore >= 5 ? 'rgba(255,200,87,0.3)' : 'rgba(255,77,77,0.3)'}` }}>{day.emotionScore}/10</span>
        </div>
      </div>

      {/* Market Overview Strip (EOD state) */}
      <MarketStrip day={day} dir={dir} />

      {/* Orca Trade Bridge */}
      {orcaTrades && orcaTrades.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg,rgba(0,255,163,0.04),rgba(90,169,255,0.04))', border: '1px solid rgba(0,255,163,0.12)', borderRadius: 12, padding: '13px 16px', marginBottom: 14, marginTop: 8, backdropFilter: 'blur(8px)' }}>
          <div style={{ fontFamily: 'var(--j-mono)', fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#00FFA3', marginBottom: 9 }}>
            ⚡ {dir === 'rtl' ? 'עסקאות מ-Orca' : 'Orca Trade Bridge'} — {orcaTrades.length} {dir === 'rtl' ? 'עסקאות' : 'trades'}
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' as const, paddingBottom: 4 }}>
            {orcaTrades.slice(0, 6).map((tr: Trade) => (
              <div key={tr.id} style={{
                flexShrink: 0, padding: '9px 13px', background: 'rgba(255,255,255,0.03)', borderRadius: 10,
                border: `1px solid ${tr.pnl >= 0 ? 'rgba(0,255,163,.15)' : 'rgba(255,77,77,.15)'}`, minWidth: 110,
                backdropFilter: 'blur(6px)', transition: 'all .2s',
              }}>
                <div style={{ fontFamily: 'var(--j-mono)', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{tr.coin}</div>
                <div style={{ fontFamily: 'var(--j-mono)', fontSize: 13, fontWeight: 800, color: tr.pnl >= 0 ? '#00FFA3' : '#FF4D4D', marginTop: 3, textShadow: `0 0 10px ${tr.pnl >= 0 ? 'rgba(0,255,163,0.3)' : 'rgba(255,77,77,0.3)'}` }}>{tr.pnl >= 0 ? '+' : ''}{tr.pnl.toFixed(2)}$</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <PDiv label={dir === 'rtl' ? 'תחקיר אחרי-שוק' : 'POST-MARKET DEBRIEF'} color="#b794f6" icon="🌙" />

      {/* Trade Log */}
      <Sec title={f.tlog} icon="💹" accent="#5AA9FF">
        {day.hasOpen === null ? (
          <div style={{ borderRadius: 12, padding: 22, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>📂</div>
            <div style={{ fontFamily: 'var(--j-sans)', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>{f.openQ}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' as const }}>
              <button onClick={() => upd({ hasOpen: true })} style={{ background: 'linear-gradient(135deg,#FFC857,#f5a020)', color: '#0a0e1a', padding: '10px 22px', fontSize: 12, borderRadius: 10, fontFamily: 'var(--j-mono)', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255,200,87,0.25)', transition: 'all .2s' }}>📈 {f.openY}</button>
              <button onClick={() => upd({ hasOpen: false })} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', padding: '7px 15px', fontSize: '11.5px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, transition: 'all .2s' }}>✖ {f.openN}</button>
            </div>
          </div>
        ) : (
          <>
            {(day.trades || []).map((tr: JournalTrade, i: number) => (
              <TCard key={tr.id} trade={tr} idx={i} f={f} dir={dir}
                onChange={(nt: JournalTrade) => upd({ trades: (day.trades || []).map((x: any, j: number) => j === i ? nt : x) })}
                onDel={() => upd({ trades: day.trades.filter((_: any, j: number) => j !== i) })} />
            ))}
            <button onClick={addTrade} style={{
              width: '100%', padding: 10, borderRadius: 10, color: '#5AA9FF',
              marginTop: 5, background: 'rgba(90,169,255,0.04)', border: '1px dashed rgba(90,169,255,0.2)',
              cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'var(--j-mono)',
              transition: 'all .2s', letterSpacing: '.5px',
            }}>{f.addTrade}</button>
            {(day.trades || []).length > 0 && (
              <div style={{ display: 'flex', gap: 20, marginTop: 12, padding: '12px 16px', background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                {[
                  { l: 'P&L', v: `${dp >= 0 ? '+' : ''}${dp.toFixed(2)}$`, c: dp >= 0 ? '#00FFA3' : '#FF4D4D', glow: dp >= 0 ? 'rgba(0,255,163,0.3)' : 'rgba(255,77,77,0.3)' },
                  { l: 'TRADES', v: String(day.trades.length), c: 'rgba(255,255,255,0.7)', glow: 'none' },
                  { l: 'WIN %', v: `${((dw / Math.max(day.trades.length, 1)) * 100).toFixed(0)}%`, c: '#FFC857', glow: 'rgba(255,200,87,0.2)' },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontFamily: 'var(--j-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '2px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' as const }}>{s.l}</div>
                    <div style={{ fontFamily: 'var(--j-mono)', fontSize: 20, fontWeight: 800, color: s.c, textShadow: `0 0 15px ${s.glow}`, marginTop: 2 }}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Sec>

      {/* EOD Review */}
      <Sec title={dir === 'rtl' ? 'תחקיר ביצוע' : 'EXECUTION REVIEW'} icon="🌙" accent="#b794f6">
        <div style={{ marginBottom: 14 }}><Lbl c={f.actualMove} dir={dir} /><TA val={day.actualMove} set={U('actualMove')} ph={f.actualPh} rows={3} dir={dir} /></div>
        <div style={{ marginBottom: 16 }}><Lbl c={f.score} dir={dir} /><Scores val={day.dayScore} set={U('dayScore')} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          {[
            { k: 'wins', l: f.wins, ph: f.winsPh, c: '#00FFA3' },
            { k: 'lessons', l: f.lessons, ph: f.lessonsPh, c: '#5AA9FF' },
            { k: 'mistakes', l: f.mistakes, ph: f.mistakesPh, c: '#FF4D4D' },
            { k: 'solutions', l: f.solutions, ph: f.solutionsPh, c: '#FFC857' },
          ].map(item => (
            <div key={item.k} style={{ borderInlineStart: `2px solid ${item.c}20`, paddingInlineStart: 11 }}>
              <Lbl c={item.l} dir={dir} />
              <TA val={day[item.k]} set={U(item.k)} ph={item.ph} rows={4} dir={dir} />
            </div>
          ))}
        </div>
        <Lbl c={f.closing} dir={dir} />
        <TA val={day.closing} set={U('closing')} ph={f.closingPh} rows={3} dir={dir} />
      </Sec>

      {/* Seal Day */}
      <div style={{ margin: '22px 0 8px', background: 'rgba(183,148,246,0.06)', border: '1px solid rgba(183,148,246,0.15)', borderRadius: 14, padding: '18px 24px', textAlign: 'center', backdropFilter: 'blur(8px)' }}>
        <p style={{ fontFamily: 'var(--j-sans)', fontSize: '11.5px', color: '#b794f6', marginBottom: 12, opacity: 0.8 }}>{t.e.lockSub}</p>
        <button onClick={onSave} disabled={!dirty} style={{
          background: 'linear-gradient(135deg,#b794f6,#7c3aed)', color: '#fff', padding: '12px 28px', fontSize: '12.5px', fontWeight: 800, letterSpacing: '.5px',
          boxShadow: dirty ? '0 4px 24px rgba(153,104,248,.35)' : 'none', borderRadius: 12, border: 'none',
          cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.3, fontFamily: 'var(--j-mono)',
          transition: 'all .25s', textTransform: 'uppercase' as const,
        }}>✓ {t.e.lock}</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN JOURNAL DIMENSION (LOGIC UNCHANGED)
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

  const todayOrcaTrades = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return orcaTrades.filter(tr => tr.date?.startsWith(today));
  }, [orcaTrades]);

  if (!loaded) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#080c18' }}>
      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#00FFA3', letterSpacing: 3, animation: 'j-pulse 1.5s ease-in-out infinite' }}>INITIALIZING...</div>
    </div>
  );

  const TOAST_STYLES: Record<string, React.CSSProperties> = {
    a: { background: 'rgba(255,200,87,.12)', border: '1px solid rgba(255,200,87,.25)', color: '#FFC857', boxShadow: '0 4px 20px rgba(255,200,87,0.15)' },
    p: { background: 'rgba(183,148,246,.12)', border: '1px solid rgba(183,148,246,.25)', color: '#b794f6', boxShadow: '0 4px 20px rgba(183,148,246,0.15)' },
    g: { background: 'rgba(0,255,163,.12)', border: '1px solid rgba(0,255,163,.25)', color: '#00FFA3', boxShadow: '0 4px 20px rgba(0,255,163,0.15)' },
  };

  return (
    <div className="journal-dimension" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      fontFamily: "'IBM Plex Sans', sans-serif", direction: dir,
      background: '#080c18',
    }}>
      {/* SCOPED CSS — DARK INSTITUTIONAL */}
      <style>{`
        .journal-dimension {
          --j-bg: #080c18; --j-bg1: #0d1220; --j-bg2: #111827; --j-bg3: rgba(255,255,255,0.06);
          --j-br: rgba(255,255,255,0.06); --j-br2: rgba(255,255,255,0.1);
          --j-tx: rgba(255,255,255,0.92); --j-tx2: rgba(255,255,255,0.6); --j-tx3: rgba(255,255,255,0.3);
          --j-g: #00FFA3; --j-r: #FF4D4D; --j-a: #FFC857; --j-b: #5AA9FF; --j-p: #b794f6;
          --j-mono: 'IBM Plex Mono', 'JetBrains Mono', monospace;
          --j-sans: 'IBM Plex Sans', 'Inter', sans-serif;
          --j-head: 'Syne', 'Inter', sans-serif;
        }
        .journal-dimension ::-webkit-scrollbar { width: 4px; height: 4px; }
        .journal-dimension ::-webkit-scrollbar-track { background: transparent; }
        .journal-dimension ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .journal-dimension ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
        .journal-dimension textarea:focus, .journal-dimension input:focus {
          border-color: rgba(90,169,255,.4) !important;
          box-shadow: 0 0 0 3px rgba(90,169,255,.08), 0 0 15px rgba(90,169,255,.1) !important;
          background: rgba(255,255,255,0.06) !important;
        }
        .journal-dimension textarea::placeholder, .journal-dimension input::placeholder {
          color: rgba(255,255,255,0.18) !important;
        }
        @keyframes j-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes j-gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes j-glow-breathe {
          0%,100% { box-shadow: 0 0 15px rgba(0,255,163,0.05); }
          50% { box-shadow: 0 0 25px rgba(0,255,163,0.12); }
        }
        .j-card-hover { transition: all .25s ease !important; }
        .j-card-hover:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 25px rgba(0,0,0,0.4) !important; }
      `}</style>

      {/* ANIMATED BG GRADIENTS */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', width: '600px', height: '600px', top: '-100px', left: '-100px',
          background: 'radial-gradient(circle, rgba(0,255,163,0.04) 0%, transparent 70%)',
          animation: 'j-gradient-shift 15s ease-in-out infinite',
          backgroundSize: '200% 200%',
        }} />
        <div style={{
          position: 'absolute', width: '500px', height: '500px', bottom: '-50px', right: '-50px',
          background: 'radial-gradient(circle, rgba(183,148,246,0.04) 0%, transparent 70%)',
          animation: 'j-gradient-shift 20s ease-in-out infinite reverse',
          backgroundSize: '200% 200%',
        }} />
        <div style={{
          position: 'absolute', width: '400px', height: '400px', top: '40%', left: '50%',
          background: 'radial-gradient(circle, rgba(90,169,255,0.03) 0%, transparent 70%)',
          animation: 'j-gradient-shift 18s ease-in-out infinite 3s',
          backgroundSize: '200% 200%',
        }} />
      </div>

      {/* TOPBAR */}
      <nav style={{
        height: 52, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px',
        background: 'rgba(13,18,32,0.85)', borderBottom: '1px solid rgba(255,255,255,0.06)', zIndex: 100,
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setSidebar(o => !o)} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', padding: '6px 10px', fontSize: 13, borderRadius: 8, cursor: 'pointer', fontWeight: 600, transition: 'all .2s' }}>☰</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, background: 'linear-gradient(135deg,#5AA9FF,#b794f6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, boxShadow: '0 0 15px rgba(90,169,255,.35)' }}>⚡</div>
            <span style={{ fontFamily: 'var(--j-head)', fontSize: 15, fontWeight: 800, background: 'linear-gradient(90deg,#5AA9FF,#b794f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>APEX OS</span>
            <span style={{ fontFamily: 'var(--j-mono)', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: '1.8px' }}>{t.sub}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {([['journal', t.nav.journal], ['archive', t.nav.archive]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setView(v as string)}
              style={{ fontFamily: 'var(--j-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, border: 'none', cursor: 'pointer', borderRadius: 8, padding: '7px 16px', transition: 'all .2s', ...(view === v ? { background: 'rgba(90,169,255,.12)', color: '#5AA9FF', boxShadow: '0 0 10px rgba(90,169,255,0.1)' } : { background: 'none', color: 'rgba(255,255,255,0.3)' }) }}>
              {l}
            </button>
          ))}
          <div style={{ width: 1, height: 18, background: 'rgba(255,255,255,0.08)', margin: '0 6px' }} />
          <ReturnButton onClick={onReturn} isRTL={isRTL} />
        </div>
      </nav>

      {/* LAYOUT */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* SIDEBAR */}
        <aside style={{
          width: sidebar ? 258 : 0, minWidth: sidebar ? 258 : 0, overflow: 'hidden', transition: 'all .3s ease',
          background: 'rgba(13,18,32,0.7)', borderInlineEnd: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', flexDirection: 'column', order: dir === 'rtl' ? 2 : 0, backdropFilter: 'blur(16px)',
        }}>
          <div style={{ padding: '10px 10px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input value={sbQ} onChange={e => setSbQ(e.target.value)} placeholder={t.arch.search}
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: 'rgba(255,255,255,0.85)', fontSize: '11.5px', outline: 'none', padding: '9px 12px', direction: dir, fontFamily: 'var(--j-mono)', transition: 'all .2s' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: 6 }}>
            {sbDays.map(d => {
              const dp = sumPnl(d);
              const ec = d.emotionScore >= 8 ? '#00FFA3' : d.emotionScore >= 5 ? '#FFC857' : '#FF4D4D';
              const phase = d.morningSaved && d.eodSaved ? '#00FFA3' : d.morningSaved ? '#b794f6' : 'rgba(255,255,255,0.2)';
              const sel = d.id === activeId;
              return (
                <div key={d.id} onClick={() => { setActiveId(d.id); setView('journal'); }}
                  className="j-card-hover"
                  style={{
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 3,
                    border: '1px solid transparent', transition: 'all .2s',
                    ...(sel ? { background: 'rgba(90,169,255,.08)', borderColor: 'rgba(90,169,255,.2)', boxShadow: '0 0 15px rgba(90,169,255,0.05)' } : { background: 'transparent' }),
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--j-mono)', fontSize: '10.5px', fontWeight: 700, color: sel ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)' }}>{fmtShort(d.date, t.locale)}</span>
                        <span style={{ fontSize: 6, color: phase, filter: `drop-shadow(0 0 3px ${phase})` }}>●</span>
                      </div>
                      <div style={{ fontFamily: 'var(--j-mono)', fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
                        {dir === 'rtl' ? 'יום' : 'Day'} {d.dayNum || '?'} · {dir === 'rtl' ? 'שבוע' : 'Wk'} {d.weekNum || '?'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, marginInlineStart: 6, flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--j-mono)', fontSize: '10.5px', fontWeight: 800, color: ec, textShadow: `0 0 8px ${ec}30` }}>{d.emotionScore}</span>
                      {dp !== 0 && <span style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 700, color: dp > 0 ? '#00FFA3' : '#FF4D4D' }}>{dp > 0 ? '+' : ''}{dp.toFixed(0)}$</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* MAIN */}
        <main style={{ flex: 1, overflowY: 'auto', background: 'transparent', order: 1 }}>
          {view === 'journal' && activeDay && (
            <div style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 22px 50px', direction: dir }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: 12, marginBottom: 20 }}>
                <div>
                  <div style={{ fontFamily: 'var(--j-head)', fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-.3px' }}>
                    {fmtFull(activeDay.date, t.locale)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9, flexWrap: 'wrap' as const }}>
                    {[['dayNum', dir === 'rtl' ? 'יום #' : 'Day #', '52px'], ['weekNum', dir === 'rtl' ? 'שבוע #' : 'Week #', '55px']].map(([k, l, w]: any) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'var(--j-mono)', fontSize: '9.5px', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.25)' }}>{l}</span>
                        <input value={(activeDay as any)[k] || ''} onChange={e => upd({ [k]: e.target.value } as any)} placeholder="—"
                          style={{ width: w, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: 'rgba(255,255,255,0.85)', padding: '5px 7px', fontSize: 14, fontWeight: 800, fontFamily: 'var(--j-mono)', outline: 'none', textAlign: 'center', transition: 'all .2s' }} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* P&L Card with Glow */}
                <div style={{ display: 'flex', gap: 8 }}>
                  {(() => { const dp = sumPnl(activeDay); const glowC = dp >= 0 ? 'rgba(0,255,163,0.15)' : 'rgba(255,77,77,0.15)'; return (
                    <div style={{
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 18px', textAlign: 'center',
                      backdropFilter: 'blur(8px)', boxShadow: `0 0 25px ${glowC}`, transition: 'all .3s',
                      animation: 'j-glow-breathe 4s ease-in-out infinite',
                    }}>
                      <div style={{ fontFamily: 'var(--j-mono)', fontSize: 18, fontWeight: 800, color: dp >= 0 ? '#00FFA3' : '#FF4D4D', textShadow: `0 0 18px ${dp >= 0 ? 'rgba(0,255,163,0.4)' : 'rgba(255,77,77,0.4)'}` }}>{dp >= 0 ? '+' : ''}{dp.toFixed(0)}$</div>
                      <span style={{ fontFamily: 'var(--j-mono)', fontSize: '9px', fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)' }}>SESSION P&L</span>
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
            <div style={{ maxWidth: 940, margin: '0 auto', padding: '22px 22px 50px', direction: dir }}>
              <div style={{ fontFamily: 'var(--j-head)', fontSize: 22, fontWeight: 800, color: 'rgba(255,255,255,0.95)', marginBottom: 6 }}>{t.arch.title}</div>
              <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
                {days.filter(d => d.morningSaved).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(day => {
                  const dp = sumPnl(day);
                  const complete = day.morningSaved && day.eodSaved;
                  return (
                    <div key={day.id} onClick={() => { setActiveId(day.id); setView('journal'); }}
                      className="j-card-hover"
                      style={{
                        background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
                        overflow: 'hidden', cursor: 'pointer', transition: 'all .25s', backdropFilter: 'blur(8px)',
                      }}>
                      <div style={{ background: 'rgba(0,255,163,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '13px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <span style={{ fontFamily: 'var(--j-mono)', fontSize: 9, color: '#00FFA3', letterSpacing: '1.8px', fontWeight: 700 }}>🌅 {t.arch.morning}</span>
                          <span style={{ fontFamily: 'var(--j-head)', fontSize: '14px', fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>{fmtFull(day.date, t.locale)}</span>
                          <span style={{ fontFamily: 'var(--j-mono)', fontSize: '8.5px', fontWeight: 700, color: complete ? '#00FFA3' : '#FFC857', background: complete ? 'rgba(0,255,163,.1)' : 'rgba(255,200,87,.1)', padding: '3px 9px', borderRadius: 6 }}>{complete ? '✓ COMPLETE' : 'MORNING ONLY'}</span>
                        </div>
                        <div style={{ fontFamily: 'var(--j-mono)', fontSize: 14, fontWeight: 800, color: dp >= 0 ? '#00FFA3' : '#FF4D4D', textShadow: `0 0 10px ${dp >= 0 ? 'rgba(0,255,163,0.3)' : 'rgba(255,77,77,0.3)'}` }}>{dp >= 0 ? '+' : ''}{dp.toFixed(0)}$</div>
                      </div>
                    </div>
                  );
                })}
                {days.filter(d => d.morningSaved).length === 0 && (
                  <div style={{ textAlign: 'center', padding: 70, color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--j-sans)', fontSize: 14 }}>{t.arch.none}</div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* TOAST */}
      {toast && <div style={{
        position: 'fixed', bottom: 22, right: 22, borderRadius: 12, padding: '11px 18px',
        fontFamily: 'var(--j-mono)', fontSize: 11, fontWeight: 700, zIndex: 9999, pointerEvents: 'none',
        letterSpacing: '.8px', backdropFilter: 'blur(12px)', ...TOAST_STYLES[toast.type],
      }}>{toast.msg}</div>}
    </div>
  );
};
