import { useState, useEffect, useCallback, useMemo, useRef, forwardRef } from 'react';
import type { Trade } from '@/data/trades';
import { readJournalState, writeJournalState, type JournalDay, type JournalTrade, type JournalState, type PsychAnswers } from '@/lib/journal-storage';
import { ReturnButton } from './DimensionController';
import { playSystemOpen, playMorningLock, playEODLock, playRiskAlert } from '@/lib/apex-sounds';

// ═══════════════════════════════════════════════════════════════
// CINEMATIC ENTRY SCREEN
// ═══════════════════════════════════════════════════════════════
const ENTRY_SESSION_KEY = 'journal-entry-seen';

const JournalEntryScreen = ({ onEnter }: { onEnter: () => void }) => {
  const [phase, setPhase] = useState<'boot' | 'ready' | 'exiting'>('boot');
  const [bootStep, setBootStep] = useState(0);
  const [clock, setClock] = useState('');
  const soundPlayed = useRef(false);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const timers = [
      setTimeout(() => setBootStep(1), 400),
      setTimeout(() => setBootStep(2), 900),
      setTimeout(() => setBootStep(3), 1400),
      setTimeout(() => { setBootStep(4); setPhase('ready'); }, 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase !== 'ready' || soundPlayed.current) return;
    soundPlayed.current = true;
    playSystemOpen();
  }, [phase]);

  const handleEnter = () => {
    setPhase('exiting');
    sessionStorage.setItem(ENTRY_SESSION_KEY, '1');
    setTimeout(onEnter, 700);
  };

  const BOOT_LABELS = ['SYSTEM', 'DATA', 'ENGINE', 'READY'];
  const TICKER = [
    { pair: 'BTC/USD', change: '+1.21' },
    { pair: 'ETH/USD', change: '+4.30' },
    { pair: 'SOL/USD', change: '-2.85' },
    { pair: 'BNB/USD', change: '-0.41' },
    { pair: 'XRP/USD', change: '+3.12' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#050a18',
      display: 'flex', flexDirection: 'column',
      opacity: phase === 'exiting' ? 0 : 1,
      filter: phase === 'exiting' ? 'blur(12px)' : 'none',
      transition: 'opacity 0.7s ease, filter 0.7s ease',
      fontFamily: "'Poppins', 'Inter', sans-serif",
      overflow: 'hidden',
    }}>
      {/* Grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,255,163,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,163,0.04) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        opacity: bootStep >= 1 ? 0.6 : 0,
        transition: 'opacity 1.5s ease',
      }} />
      {/* Radial glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 40%, rgba(0,255,163,0.06) 0%, transparent 60%)',
        opacity: bootStep >= 2 ? 1 : 0,
        transition: 'opacity 1.2s ease',
      }} />
      {/* SVG equity lines */}
      <svg style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity: bootStep >= 2 ? 0.12 : 0,
        transition: 'opacity 1s ease',
      }} viewBox="0 0 1000 500" preserveAspectRatio="none">
        <polyline points="0,350 80,330 160,340 240,280 320,300 400,240 480,260 560,200 640,220 720,180 800,190 880,160 960,170 1000,150"
          fill="none" stroke="#00FFA3" strokeWidth="2"
          style={{ strokeDasharray: 2200, strokeDashoffset: bootStep >= 2 ? 0 : 2200, transition: 'stroke-dashoffset 2s ease' }}
        />
        <polyline points="0,380 80,370 160,385 240,350 320,365 400,320 480,340 560,310 640,320 720,290 800,300 880,270 960,280 1000,260"
          fill="none" stroke="#5AA9FF" strokeWidth="1.5" opacity="0.5"
          style={{ strokeDasharray: 2200, strokeDashoffset: bootStep >= 2 ? 0 : 2200, transition: 'stroke-dashoffset 2.5s ease' }}
        />
      </svg>

      {/* Top ticker */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(0,255,163,0.1)',
        background: 'rgba(0,0,0,0.4)',
        fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
        opacity: bootStep >= 1 ? 1 : 0,
        transform: bootStep >= 1 ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'all 0.6s ease',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00FFA3', boxShadow: '0 0 10px #00FFA3', animation: 'j-pulse-dot 2s infinite' }} />
          <span style={{ color: '#00FFA3', fontWeight: 700, letterSpacing: 2 }}>LIVE</span>
        </div>
        <div style={{ display: 'flex', gap: 24, overflow: 'hidden' }}>
          {TICKER.map((t, i) => (
            <span key={i} style={{ color: '#94a3b8', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{t.pair}</span>{' '}
              <span style={{ color: t.change.startsWith('+') ? '#00FFA3' : '#FF4040', fontWeight: 700 }}>{t.change}%</span>
            </span>
          ))}
        </div>
        <span style={{ color: '#00FFA3', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{clock}</span>
      </div>

      {/* Center */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 2, padding: '20px 16px',
      }}>
        <div style={{
          width: 64, height: 64, marginBottom: 24, borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(0,255,163,0.15), rgba(90,169,255,0.15))',
          border: '1px solid rgba(0,255,163,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 60px rgba(0,255,163,0.1)',
          opacity: bootStep >= 1 ? 1 : 0,
          transform: bootStep >= 1 ? 'scale(1)' : 'scale(0.8)',
          transition: 'all 0.6s ease',
        }}>
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#00FFA3" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 17l3-3 4 4 6-8 5 5" />
            <path d="M14 7l7 0 0 7" />
          </svg>
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 7vw, 48px)', fontWeight: 800,
          letterSpacing: '-1px', marginBottom: 8, lineHeight: 1.1,
          color: '#ffffff',
          opacity: bootStep >= 1 ? 1 : 0,
          transform: bootStep >= 1 ? 'translateY(0)' : 'translateY(20px)',
          transition: 'all 0.8s ease',
        }}>
          <span style={{ fontWeight: 300, color: '#94a3b8' }}>Orca</span>Investment
        </h1>

        <p style={{
          fontSize: 'clamp(14px, 3vw, 17px)', fontWeight: 500,
          color: '#94a3b8', letterSpacing: 4,
          marginBottom: 6, direction: 'rtl',
          opacity: bootStep >= 2 ? 1 : 0,
          transition: 'opacity 0.8s ease',
        }}>יומן מסחר מתקדם</p>
        <p style={{
          fontSize: 'clamp(10px, 2vw, 12px)', fontWeight: 400,
          color: '#64748b', letterSpacing: 6,
          marginBottom: 48, direction: 'rtl',
          opacity: bootStep >= 2 ? 1 : 0,
          transition: 'opacity 0.8s ease 0.2s',
        }}>מקצועיות · תהליך · הצלחה</p>

        {/* Boot indicators */}
        <div style={{ display: 'flex', gap: 20, marginBottom: 32, fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
          {BOOT_LABELS.map((label, i) => (
            <span key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: bootStep > i ? '#00FFA3' : '#334155',
              transition: 'color 0.4s ease',
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%',
                background: bootStep > i ? '#00FFA3' : '#334155',
                boxShadow: bootStep > i ? '0 0 8px #00FFA3' : 'none',
                transition: 'all 0.4s ease',
              }} />
              {label}
            </span>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{
          width: 'min(240px, 70vw)', height: 3,
          background: 'rgba(255,255,255,0.06)', borderRadius: 2,
          overflow: 'hidden', marginBottom: 36,
          opacity: phase === 'ready' ? 0 : 1,
          transition: 'opacity 0.5s ease',
        }}>
          <div style={{
            height: '100%', width: `${(bootStep / 4) * 100}%`,
            background: 'linear-gradient(90deg, #00FFA3, #5AA9FF)',
            borderRadius: 2, transition: 'width 0.6s ease',
            boxShadow: '0 0 12px rgba(0,255,163,0.5)',
          }} />
        </div>

        {/* Enter button */}
        {phase === 'ready' && (
          <button onClick={handleEnter} style={{
            padding: 'clamp(14px, 2.5vw, 18px) clamp(40px, 10vw, 64px)',
            fontSize: 'clamp(13px, 2.5vw, 15px)', fontWeight: 700,
            letterSpacing: 3, textTransform: 'uppercase' as const,
            color: '#050a18', background: 'linear-gradient(135deg, #00FFA3, #00CC82)',
            border: 'none', borderRadius: 12, cursor: 'pointer',
            boxShadow: '0 0 50px rgba(0,255,163,0.25), 0 4px 24px rgba(0,0,0,0.5)',
            transition: 'all 0.25s ease', fontFamily: "'Poppins', sans-serif",
            animation: 'j-entry-btn 0.5s ease-out',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-3px) scale(1.04)';
            e.currentTarget.style.boxShadow = '0 0 70px rgba(0,255,163,0.35), 0 8px 32px rgba(0,0,0,0.6)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 0 50px rgba(0,255,163,0.25), 0 4px 24px rgba(0,0,0,0.5)';
          }}
          >כניסה למערכת</button>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24,
        padding: '12px 16px',
        borderTop: '1px solid rgba(0,255,163,0.08)',
        background: 'rgba(0,0,0,0.3)',
        fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
        color: '#475569', letterSpacing: 2,
        opacity: bootStep >= 1 ? 1 : 0,
        transform: bootStep >= 1 ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.6s ease',
        flexWrap: 'wrap',
      }}>
        <span>ORCA TERMINAL v3.0</span>
        <span style={{ color: '#00FFA3' }}>●</span>
        <span>ENCRYPTED</span>
        <span style={{ color: '#00FFA3' }}>●</span>
        <span>LOCAL STORAGE</span>
      </div>

      <style>{`
        @keyframes j-entry-btn {
          from { opacity: 0; transform: translateY(12px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes j-pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════
const TR: Record<string, any> = {
  en: {
    dir: 'ltr', locale: 'en-US',
    app: 'APEX OS', sub: 'Private Trading Operating System',
    nav: { journal: 'Journal', archive: 'Archive', dashboard: 'Dashboard', calendar: 'Calendar' },
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
      btcThoughts: 'Bitcoin Thoughts', btcThoughtsPh: 'What thoughts are coming up about Bitcoin this morning?',
      images: 'Chart Screenshots', imageUpload: 'Drop images here or click to upload',
      psych: 'Psychology Check', discipline: 'Daily Commitment',
      disciplineQ: 'What do I commit to today?', disciplineConfirm: 'I commit to this.',
      disciplineMin: 'Select at least 2 commitments',
      analytics: 'Analytics',
    },
    bias: ['Bullish', 'Bearish', 'Neutral', 'Expansion', 'Contraction'],
    struct: ['Markup', 'Markdown', 'Accumulation', 'Distribution', 'Range'],
    states: ['Focused', 'Calm', 'Confident', 'Impulsive', 'Hesitant', 'Tired', 'Sharp'],
    tasks: ['Pre-market structure review ☕','HTF bias confirmed 📊','Key levels mapped 🗺','Setups identified 🔍','Risk defined 🛡','No-trade zones set ❌','Execution rules confirmed ✅','Mindset calibrated 🧘'],
    goals: ['Physical training 💪','Nutrition discipline 🥗','Sleep 7h+ 😴','Hydration goal 💧','Integrity — zero lies 🤝'],
    psychQ: { sleepWell: 'Did I sleep well?', feelingPressure: 'Am I feeling pressure?', seekingExcitement: 'Am I seeking excitement?', recoveringLosses: 'Am I trying to recover losses?' },
    commitments: ['Follow the plan', 'Max 3 trades', 'No revenge trading', 'Accept losses gracefully', 'Wait for confirmation', 'Stick to risk limits', 'No FOMO entries', 'Review before acting'],
    arch: { title: 'Journal Archive', search: 'Search...', all: 'All', bull: 'Bullish', bear: 'Bearish', newest: 'Newest', oldest: 'Oldest', best: 'Best P&L', readonly: 'READ ONLY — SEALED DAY', notice: 'This day is permanently locked.', close: 'Close', open: 'Open Day', morning: 'Morning Analysis', eod: 'End of Day', none: 'No archived entries yet.' },
    risk: {
      daily: 'You have reached your daily loss limit (-2R). It is recommended to stop trading for today.',
      weekly: 'You have reached your weekly loss limit (-5R). Consider stopping trading and reviewing your strategy.',
      monthly: 'You have reached your monthly loss limit (-10R). A deeper performance review is recommended.',
      title: 'Risk Limit Breached', understand: 'I Understand',
      dailyLabel: 'Daily', weeklyLabel: 'Weekly', monthlyLabel: 'Monthly',
      banner: 'MONTHLY LOSS LIMIT REACHED',
    },
  },
  he: {
    dir: 'rtl', locale: 'he-IL',
    app: 'APEX OS', sub: 'מערכת הפעלה פרטית למסחר',
    nav: { journal: 'יומן', archive: 'ארכיון', dashboard: 'דשבורד', calendar: 'לוח שנה' },
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
      btcThoughts: 'מחשבות על ביטקוין', btcThoughtsPh: 'מה עולה לך בראש על ביטקוין הבוקר?',
      images: 'צילומי מסך גרפים', imageUpload: 'גרור תמונות לכאן או לחץ להעלאה',
      psych: 'בדיקה פסיכולוגית', discipline: 'מחויבות יומית',
      disciplineQ: 'למה אני מתחייב היום?', disciplineConfirm: 'אני מתחייב לזה.',
      disciplineMin: 'בחר לפחות 2 מחויבויות',
      analytics: 'אנליטיקה',
    },
    bias: ['שורי', 'דובי', 'ניטרלי', 'התרחבות', 'התכווצות'],
    struct: ['עלייה', 'ירידה', 'צבירה', 'חלוקה', 'טווח'],
    states: ['ממוקד', 'רגוע', 'בטוח', 'אימפולסיבי', 'מהסס', 'עייף', 'חד'],
    tasks: ['סקירת מבנה לפני שוק ☕','אישור כיוון HTF 📊','מיפוי רמות מפתח 🗺','זיהוי סטאפים 🔍','הגדרת סיכון 🛡','סימון אזורי ללא מסחר ❌','אישור כללי ביצוע ✅','כיול מיינדסט 🧘'],
    goals: ['אימון גופני 💪','משמעת תזונה 🥗','שינה 7+ שעות 😴','יעד שתייה 💧','יושרה — אפס שקרים 🤝'],
    psychQ: { sleepWell: 'ישנתי טוב?', feelingPressure: 'אני מרגיש לחץ?', seekingExcitement: 'אני מחפש ריגושים?', recoveringLosses: 'אני מנסה לשחזר הפסדים?' },
    commitments: ['לעקוב אחרי התוכנית', 'מקסימום 3 עסקאות', 'בלי מסחר נקמה', 'לקבל הפסדים', 'לחכות לאישור', 'להישאר בגבולות סיכון', 'בלי FOMO', 'לבדוק לפני פעולה'],
    arch: { title: 'ארכיון יומן', search: 'חיפוש...', all: 'הכל', bull: 'שורי', bear: 'דובי', newest: 'חדש ראשון', oldest: 'ישן ראשון', best: 'הכי טוב', readonly: 'קריאה בלבד — יום נעול', notice: 'יום זה נעול לצמיתות.', close: 'סגור', open: 'פתח יום', morning: 'ניתוח בוקר', eod: 'סוף יום', none: 'אין רשומות בארכיון עדיין.' },
    risk: {
      daily: 'הגעת למגבלת ההפסד היומית (-2R). מומלץ להפסיק לסחור היום.',
      weekly: 'הגעת למגבלת ההפסד השבועית (-5R). שקול להפסיק לסחור ולבדוק את האסטרטגיה שלך.',
      monthly: 'הגעת למגבלת ההפסד החודשית (-10R). מומלץ לבצע סקירת ביצועים מעמיקה.',
      title: 'חריגת מגבלת סיכון', understand: 'הבנתי',
      dailyLabel: 'יומי', weeklyLabel: 'שבועי', monthlyLabel: 'חודשי',
      banner: 'הגעת למגבלת ההפסד החודשית',
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPERS — SAFE DATE HANDLING
// ═══════════════════════════════════════════════════════════════
function safeDateStr(input: string | Date | undefined | null): string {
  if (!input) return new Date().toISOString().split('T')[0];
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return new Date().toISOString().split('T')[0];
    return input.toISOString().split('T')[0];
  }
  // Try ISO YYYY-MM-DD
  const iso = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const d = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    if (!isNaN(d.getTime()) && d.getUTCDate() === +iso[3] && d.getUTCMonth() === +iso[2] - 1) return input;
  }
  // Try DD/MM/YYYY
  const dmy = input.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    let yr = parseInt(dmy[3]); if (yr < 100) yr += 2000;
    const d = new Date(Date.UTC(yr, parseInt(dmy[2]) - 1, parseInt(dmy[1])));
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  // Fallback
  const fallback = new Date(input);
  if (!isNaN(fallback.getTime())) return fallback.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

const makeDay = (lang = 'he'): JournalDay => {
  const t = TR[lang];
  return {
    id: `d_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: safeDateStr(new Date()),
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
    morningImages: [],
    btcThoughts: '',
    psychAnswers: { sleepWell: null, feelingPressure: null, seekingExcitement: null, recoveringLosses: null },
    disciplineCommitments: [],
    disciplineConfirmed: false,
    sectionLocks: {},
  };
};

const sumPnl = (d: JournalDay) => (d.trades || []).reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
const numWins = (d: JournalDay) => (d.trades || []).filter(t => parseFloat(t.pnl) > 0).length;
const fmtFull = (iso: string, locale: string) => {
  const safe = safeDateStr(iso);
  try { return new Date(safe + 'T12:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); } catch { return safe; }
};
const fmtShort = (iso: string, locale: string) => {
  const safe = safeDateStr(iso);
  try { return new Date(safe + 'T12:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }); } catch { return safe; }
};

const MORNING_KEYS = new Set(['mood','plan','tasks','goals','bias','mktStruct','mentalTags','btcNote','t3Note','domNote','macroNote','levels','setups','emotionScore','fearGreed','dayNum','weekNum','date','morningImages','btcThoughts','psychAnswers','disciplineCommitments','disciplineConfirmed','sectionLocks']);

const isDayFullyLocked = (d: JournalDay) => d.morningSaved && d.eodSaved;

// ═══════════════════════════════════════════════════════════════
// JOURNAL RISK ENGINE
// ═══════════════════════════════════════════════════════════════
const RISK_LIMITS = { trade: -1, day: -2, week: -5, month: -10 };

function parseRR(rr: string): number {
  // Try to parse R:R values like "1:3", "-1", "+2R", "2R" etc.
  const s = (rr || '').trim().replace(/r$/i, '');
  // Check for ratio like 1:3
  if (s.includes(':')) {
    const parts = s.split(':');
    const risk = parseFloat(parts[0]) || 0;
    const reward = parseFloat(parts[1]) || 0;
    if (risk === 0) return 0;
    return reward / risk;
  }
  return parseFloat(s) || 0;
}

function getTradeR(t: JournalTrade): number {
  // Use RR field first, fallback to PnL sign
  const rr = parseRR(t.rr);
  if (rr !== 0) {
    const pnl = parseFloat(t.pnl) || 0;
    return pnl < 0 ? -Math.abs(rr) : pnl > 0 ? Math.abs(rr) : 0;
  }
  // Fallback: use pnl sign as 1R
  const pnl = parseFloat(t.pnl) || 0;
  if (pnl < 0) return -1;
  if (pnl > 0) return 1;
  return 0;
}

function sumNegR(trades: JournalTrade[]): number {
  return trades.reduce((s, t) => {
    const r = getTradeR(t);
    return r < -0.001 ? s + r : s;
  }, 0);
}

interface JRiskStatus {
  dailyR: number;
  weeklyR: number;
  monthlyR: number;
  dailyBreached: boolean;
  weeklyBreached: boolean;
  monthlyBreached: boolean;
  breachedLevel: 'none' | 'daily' | 'weekly' | 'monthly';
}

function checkJournalRisk(days: JournalDay[], refDate: Date = new Date()): JRiskStatus {
  const refStr = safeDateStr(refDate);
  const refD = new Date(refStr + 'T12:00');

  // Daily
  const dailyDays = days.filter(d => d.date === refStr);
  const dailyTrades = dailyDays.flatMap(d => d.trades || []);
  const dailyR = sumNegR(dailyTrades);

  // Weekly (Sunday-based)
  const dayOfWeek = refD.getDay();
  const weekStart = new Date(refD);
  weekStart.setDate(refD.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weeklyDays = days.filter(d => {
    const dd = new Date(d.date + 'T12:00');
    return dd >= weekStart && dd < weekEnd;
  });
  const weeklyR = sumNegR(weeklyDays.flatMap(d => d.trades || []));

  // Monthly
  const monthlyDays = days.filter(d => {
    const dd = new Date(d.date + 'T12:00');
    return dd.getMonth() === refD.getMonth() && dd.getFullYear() === refD.getFullYear();
  });
  const monthlyR = sumNegR(monthlyDays.flatMap(d => d.trades || []));

  const dailyBreached = dailyR <= RISK_LIMITS.day;
  const weeklyBreached = weeklyR <= RISK_LIMITS.week;
  const monthlyBreached = monthlyR <= RISK_LIMITS.month;

  let breachedLevel: JRiskStatus['breachedLevel'] = 'none';
  if (monthlyBreached) breachedLevel = 'monthly';
  else if (weeklyBreached) breachedLevel = 'weekly';
  else if (dailyBreached) breachedLevel = 'daily';

  return { dailyR, weeklyR, monthlyR, dailyBreached, weeklyBreached, monthlyBreached, breachedLevel };
}

function getDayColor(day: JournalDay): 'green' | 'red' | 'darkred' | 'neutral' {
  if (!day.trades || day.trades.length === 0) return 'neutral';
  const pnl = sumPnl(day);
  const negR = sumNegR(day.trades);
  if (negR <= RISK_LIMITS.day) return 'darkred';
  if (pnl < 0) return 'red';
  return 'green';
}

// ═══════════════════════════════════════════════════════════════
// THEME SYSTEM
// ═══════════════════════════════════════════════════════════════
type JTheme = 'dark' | 'light';
const THEMES = {
  dark: {
    bg: '#080c18', bg1: '#0d1220', bg2: '#111827', bg3: 'rgba(255,255,255,0.06)',
    br: 'rgba(255,255,255,0.06)', br2: 'rgba(255,255,255,0.1)',
    tx: 'rgba(255,255,255,0.92)', tx2: 'rgba(255,255,255,0.6)', tx3: 'rgba(255,255,255,0.3)',
    inputBg: 'rgba(255,255,255,0.04)', inputBr: 'rgba(255,255,255,0.08)',
    cardBg: 'rgba(255,255,255,0.025)', cardBr: 'rgba(255,255,255,0.06)',
    navBg: 'rgba(13,18,32,0.85)', sidebarBg: 'rgba(13,18,32,0.7)',
    scrollThumb: 'rgba(255,255,255,0.08)', scrollHover: 'rgba(255,255,255,0.15)',
    focusBr: 'rgba(90,169,255,.4)', focusShadow: 'rgba(90,169,255,.08)',
    phColor: 'rgba(255,255,255,0.18)',
    checkBr: 'rgba(255,255,255,0.2)', checkTx: 'rgba(255,255,255,0.65)',
    divider: 'rgba(255,255,255,0.04)',
    selBg: 'rgba(90,169,255,.08)', selBr: 'rgba(90,169,255,.2)',
    unselBg: 'rgba(255,255,255,0.04)', unselBr: 'rgba(255,255,255,0.1)', unselTx: 'rgba(255,255,255,0.4)',
    tagUnsel: 'rgba(255,255,255,0.04)', tagUnselBr: 'rgba(255,255,255,0.08)', tagUnselTx: 'rgba(255,255,255,0.4)',
  },
  light: {
    bg: '#f5f7fa', bg1: '#edf0f5', bg2: '#e4e8ee', bg3: 'rgba(0,0,0,0.03)',
    br: 'rgba(0,0,0,0.08)', br2: 'rgba(0,0,0,0.12)',
    tx: 'rgba(15,23,42,0.92)', tx2: 'rgba(15,23,42,0.6)', tx3: 'rgba(15,23,42,0.35)',
    inputBg: 'rgba(0,0,0,0.03)', inputBr: 'rgba(0,0,0,0.1)',
    cardBg: 'rgba(255,255,255,0.8)', cardBr: 'rgba(0,0,0,0.08)',
    navBg: 'rgba(255,255,255,0.9)', sidebarBg: 'rgba(248,250,252,0.95)',
    scrollThumb: 'rgba(0,0,0,0.12)', scrollHover: 'rgba(0,0,0,0.2)',
    focusBr: 'rgba(59,130,246,.5)', focusShadow: 'rgba(59,130,246,.1)',
    phColor: 'rgba(0,0,0,0.3)',
    checkBr: 'rgba(0,0,0,0.2)', checkTx: 'rgba(15,23,42,0.65)',
    divider: 'rgba(0,0,0,0.06)',
    selBg: 'rgba(59,130,246,.08)', selBr: 'rgba(59,130,246,.25)',
    unselBg: 'rgba(0,0,0,0.03)', unselBr: 'rgba(0,0,0,0.1)', unselTx: 'rgba(15,23,42,0.5)',
    tagUnsel: 'rgba(0,0,0,0.03)', tagUnselBr: 'rgba(0,0,0,0.08)', tagUnselTx: 'rgba(15,23,42,0.45)',
  },
};

// ═══════════════════════════════════════════════════════════════
// MICRO ATOMS
// ═══════════════════════════════════════════════════════════════
const Lbl = ({ c, dir, th }: { c: string; dir: string; th: typeof THEMES.dark }) => (
  <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: th.tx3, marginBottom: 6, display: 'block', textAlign: dir === 'rtl' ? 'right' : 'left' }}>{c}</span>
);

const TA = ({ val, set, ph, rows = 4, dir, disabled, th }: any) => (
  <textarea value={val} rows={rows} disabled={disabled}
    onChange={e => set?.(e.target.value)} placeholder={ph}
    style={{ width: '100%', background: th.inputBg, border: `1px solid ${th.inputBr}`, borderRadius: 10, color: th.tx, fontFamily: "'Poppins',sans-serif", fontSize: 13, outline: 'none', padding: '10px 14px', lineHeight: 1.75, resize: 'vertical' as const, direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left', transition: 'border-color .2s, box-shadow .2s, background .2s' }} />
);

const IN = ({ val, set, ph, dir, disabled, style = {}, th }: any) => (
  <input value={val} disabled={disabled}
    onChange={e => set?.(e.target.value)} placeholder={ph}
    style={{ width: '100%', background: th.inputBg, border: `1px solid ${th.inputBr}`, borderRadius: 10, color: th.tx, fontFamily: "'Poppins',sans-serif", fontSize: 13, outline: 'none', padding: '9px 14px', direction: dir, textAlign: dir === 'rtl' ? 'right' : 'left', transition: 'border-color .2s, box-shadow .2s, background .2s', ...style }} />
);

// Section with lock/unlock + animation
const Sec = ({ title, icon, accent = '#5AA9FF', children, open: initOpen = true, locked, onLock, onUnlock, th, fullLocked }: any) => {
  const [open, setOpen] = useState(initOpen);
  const isLocked = locked || fullLocked;
  return (
    <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 14, marginBottom: 12, overflow: 'hidden', transition: 'box-shadow .25s, transform .2s', boxShadow: open ? `0 0 20px ${accent}08` : 'none' }}
      onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
      <div onClick={() => setOpen((o: boolean) => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '13px 18px', cursor: 'pointer', userSelect: 'none' as const, transition: 'background .2s', background: open ? `linear-gradient(90deg,${accent}08,transparent 60%)` : 'transparent' }}>
        <span style={{ fontSize: 14, transition: 'transform .3s', transform: open ? 'scale(1.1)' : 'scale(1)' }}>{icon}</span>
        <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: th.tx3, flex: 1 }}>{title}</span>
        {isLocked && <span style={{ fontSize: 10, color: accent, opacity: 0.7, animation: 'j-pulse 3s ease-in-out infinite' }}>🔒</span>}
        {!fullLocked && onLock && !locked && (
          <button onClick={e => { e.stopPropagation(); onLock(); }} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, border: `1px solid ${accent}30`, background: `${accent}10`, color: accent, cursor: 'pointer', fontWeight: 600, fontFamily: "'Poppins',sans-serif", transition: 'all .2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${accent}20`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${accent}10`; }}>Lock</button>
        )}
        {!fullLocked && onUnlock && locked && (
          <button onClick={e => { e.stopPropagation(); onUnlock(); }} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, border: `1px solid ${accent}30`, background: `${accent}10`, color: accent, cursor: 'pointer', fontWeight: 600, fontFamily: "'Poppins',sans-serif" }}>Unlock</button>
        )}
        <span style={{ color: accent, fontSize: 11, transition: 'transform .25s ease', transform: open ? 'none' : 'rotate(-90deg)' }}>▾</span>
      </div>
      <div style={{ maxHeight: open ? '5000px' : '0', overflow: 'hidden', transition: 'max-height .4s ease, opacity .3s ease', opacity: open ? 1 : 0 }}>
        <div style={{ padding: '4px 18px 18px', pointerEvents: isLocked ? 'none' : 'auto', opacity: isLocked ? 0.6 : 1, transition: 'opacity .3s' }}>{children}</div>
      </div>
    </div>
  );
};

const Chk = ({ item, toggle, color, dir, disabled, th }: any) => (
  <div onClick={() => !disabled && toggle?.()}
    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 0', borderBottom: `1px solid ${th.divider}`, cursor: disabled ? 'default' : 'pointer', direction: dir, transition: 'background .15s' }}>
    <div style={{ width: 17, height: 17, borderRadius: 5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', border: `2px solid ${item.done ? color : th.checkBr}`, background: item.done ? `${color}20` : 'transparent', boxShadow: item.done ? `0 0 8px ${color}30` : 'none' }}>
      {item.done && <span style={{ fontSize: 9, color, fontWeight: 700 }}>✓</span>}
    </div>
    <span style={{ fontSize: 12.5, fontFamily: "'Poppins',sans-serif", color: item.done ? `${color}88` : th.checkTx, textDecoration: item.done ? 'line-through' : 'none', transition: 'all .15s' }}>{item.label}</span>
  </div>
);

const PDiv = ({ label, color, icon, th }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 11, margin: '22px 0 16px' }}>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${color}25)` }} />
    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase' as const, padding: '6px 16px', borderRadius: 20, color, border: `1px solid ${color}20`, background: `${color}08` }}>{icon} {label}</div>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${color}25,transparent)` }} />
  </div>
);

// ═══════════════════════════════════════════════════════════════
// IMAGE UPLOAD COMPONENT
// ═══════════════════════════════════════════════════════════════
const ImageUpload = ({ images, onUpdate, label, uploadLabel, dir, disabled, th }: any) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; zoom: number; x: number; y: number; dragging: boolean; sx: number; sy: number } | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || disabled) return;
    Array.from(files).slice(0, 2 - (images || []).length).forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        onUpdate([...(images || []), base64].slice(0, 2));
      };
      reader.readAsDataURL(file);
    });
  };

  // ESC to close lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox]);

  return (
    <div>
      <Lbl c={label} dir={dir} th={th} />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
        {(images || []).map((img: string, i: number) => (
          <div key={i} style={{ position: 'relative', width: 140, height: 100, borderRadius: 10, overflow: 'hidden', border: `1px solid ${th.cardBr}`, cursor: 'pointer', transition: 'all .3s' }}
            onClick={() => setLightbox({ src: img, zoom: 1, x: 0, y: 0, dragging: false, sx: 0, sy: 0 })}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
            <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .3s' }} />
            <div style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 5px', fontSize: 9, color: '#fff' }}>🔍</div>
            {!disabled && (
              <button onClick={e => { e.stopPropagation(); onUpdate((images || []).filter((_: any, j: number) => j !== i)); }}
                style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,77,77,0.9)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, transition: 'all .2s' }}>✕</button>
            )}
          </div>
        ))}
        {(images || []).length < 2 && !disabled && (
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => fileRef.current?.click()}
            style={{ width: 140, height: 100, borderRadius: 10, border: `2px dashed ${dragOver ? '#5AA9FF' : th.inputBr}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: dragOver ? 'rgba(90,169,255,0.05)' : th.inputBg, transition: 'all .2s' }}>
            <span style={{ fontSize: 22, marginBottom: 4 }}>📷</span>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, color: th.tx3, textAlign: 'center', padding: '0 8px' }}>{uploadLabel}</span>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
      {/* PREMIUM LIGHTBOX */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{
          position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(12px)', animation: 'j-fade-in .25s ease-out', cursor: 'zoom-out',
        }}>
          {/* Controls */}
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 6, zIndex: 10 }}>
            <button onClick={() => setLightbox(lb => lb ? { ...lb, zoom: Math.min(lb.zoom + 0.5, 5) } : null)}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', backdropFilter: 'blur(8px)' }}>+</button>
            <button onClick={() => setLightbox(lb => lb ? { ...lb, zoom: Math.max(lb.zoom - 0.5, 0.5), x: 0, y: 0 } : null)}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', backdropFilter: 'blur(8px)' }}>−</button>
            <button onClick={() => setLightbox(lb => lb ? { ...lb, zoom: 1, x: 0, y: 0 } : null)}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', color: '#fff', cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', backdropFilter: 'blur(8px)' }}>1:1</button>
            <button onClick={() => setLightbox(null)}
              style={{ width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,77,77,0.3)', background: 'rgba(255,77,77,0.12)', color: '#FF4D4D', cursor: 'pointer', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', backdropFilter: 'blur(8px)' }}>✕</button>
          </div>
          {/* Zoom indicator */}
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.5)', padding: '4px 14px', borderRadius: 20, backdropFilter: 'blur(8px)' }}>
            {Math.round(lightbox.zoom * 100)}%
          </div>
          {/* Image */}
          <img src={lightbox.src} alt="" onClick={e => e.stopPropagation()}
            draggable={false}
            onMouseDown={e => {
              if (lightbox.zoom <= 1) return;
              e.stopPropagation();
              setLightbox(lb => lb ? { ...lb, dragging: true, sx: e.clientX - lb.x, sy: e.clientY - lb.y } : null);
            }}
            onMouseMove={e => {
              if (!lightbox.dragging) return;
              setLightbox(lb => lb ? { ...lb, x: e.clientX - lb.sx, y: e.clientY - lb.sy } : null);
            }}
            onMouseUp={() => setLightbox(lb => lb ? { ...lb, dragging: false } : null)}
            onMouseLeave={() => setLightbox(lb => lb ? { ...lb, dragging: false } : null)}
            onWheel={e => {
              e.stopPropagation();
              setLightbox(lb => {
                if (!lb) return null;
                const newZoom = Math.max(0.5, Math.min(5, lb.zoom + (e.deltaY > 0 ? -0.2 : 0.2)));
                return { ...lb, zoom: newZoom, x: newZoom <= 1 ? 0 : lb.x, y: newZoom <= 1 ? 0 : lb.y };
              });
            }}
            style={{
              maxWidth: '92vw', maxHeight: '88vh', borderRadius: 8,
              boxShadow: '0 20px 80px rgba(0,0,0,0.6)',
              transform: `scale(${lightbox.zoom}) translate(${lightbox.x / lightbox.zoom}px, ${lightbox.y / lightbox.zoom}px)`,
              transition: lightbox.dragging ? 'none' : 'transform .2s ease-out',
              cursor: lightbox.zoom > 1 ? (lightbox.dragging ? 'grabbing' : 'grab') : 'zoom-out',
              animation: 'j-scale-in .25s ease-out',
            }} />
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// PSYCHOLOGY QUESTIONS
// ═══════════════════════════════════════════════════════════════
const PsychSection = ({ answers, onUpdate, questions, dir, disabled, th }: any) => {
  const keys = ['sleepWell', 'feelingPressure', 'seekingExcitement', 'recoveringLosses'] as const;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {keys.map(k => {
        const val = answers?.[k];
        return (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, direction: dir }}>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12.5, color: th.tx2, flex: 1 }}>{questions[k]}</span>
            <div style={{ display: 'flex', gap: 5 }}>
              {[true, false].map(v => {
                const active = val === v;
                const label = v ? (dir === 'rtl' ? 'כן' : 'Yes') : (dir === 'rtl' ? 'לא' : 'No');
                const c = (v && k === 'sleepWell') || (!v && k !== 'sleepWell') ? '#00FFA3' : '#FF4D4D';
                return (
                  <button key={String(v)} disabled={disabled} onClick={() => onUpdate({ ...answers, [k]: active ? null : v })}
                    style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 20, border: active ? `1px solid ${c}50` : `1px solid ${th.inputBr}`, background: active ? `${c}15` : th.inputBg, color: active ? c : th.tx3, cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .2s', boxShadow: active ? `0 0 12px ${c}20` : 'none' }}>
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// DISCIPLINE COMMITMENT
// ═══════════════════════════════════════════════════════════════
const DisciplineSection = ({ commitments, confirmed, onUpdate, onConfirm, options, f, dir, disabled, th }: any) => {
  const selected = commitments || [];
  const canConfirm = selected.length >= 2 && !confirmed;
  return (
    <div>
      <Lbl c={f.disciplineQ} dir={dir} th={th} />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 14 }}>
        {options.map((opt: string) => {
          const on = selected.includes(opt);
          return (
            <button key={opt} disabled={disabled || confirmed}
              onClick={() => onUpdate(on ? selected.filter((x: string) => x !== opt) : [...selected, opt])}
              style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 600, padding: '6px 16px', borderRadius: 20, transition: 'all .2s', cursor: disabled || confirmed ? 'not-allowed' : 'pointer', ...(on ? { background: 'rgba(0,255,163,0.12)', border: '1px solid rgba(0,255,163,0.3)', color: '#00FFA3', boxShadow: '0 0 12px rgba(0,255,163,0.15)' } : { background: th.tagUnsel, border: `1px solid ${th.tagUnselBr}`, color: th.tagUnselTx }) }}>
              {on ? '✓ ' : ''}{opt}
            </button>
          );
        })}
      </div>
      {selected.length < 2 && !confirmed && (
        <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, color: '#FFC857', opacity: 0.8 }}>⚠ {f.disciplineMin}</p>
      )}
      {!confirmed && canConfirm && (
        <button onClick={onConfirm} style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700, padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg,#00FFA3,#0a9e76)', color: '#0a0e1a', border: 'none', cursor: 'pointer', transition: 'all .2s', marginTop: 4, boxShadow: '0 4px 20px rgba(0,255,163,0.25)' }}>
          ✓ {f.disciplineConfirm}
        </button>
      )}
      {confirmed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 14, animation: 'j-pulse 3s ease-in-out infinite' }}>🔒</span>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 700, color: '#00FFA3', letterSpacing: '1px' }}>COMMITTED</span>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MARKET OVERVIEW STRIP (F&G removed — it's now in standalone widget)
// ═══════════════════════════════════════════════════════════════
const MarketStrip = ({ day, dir, th }: { day: JournalDay; dir: string; th: typeof THEMES.dark }) => {
  const emo = day.emotionScore;
  const emoColor = emo >= 8 ? '#00FFA3' : emo >= 5 ? '#FFC857' : '#FF4D4D';

  const badges = [
    { label: dir === 'rtl' ? 'כיוון' : 'BIAS', value: day.bias || '—', color: day.bias?.includes('ull') || day.bias?.includes('שורי') ? '#00FFA3' : day.bias?.includes('ear') || day.bias?.includes('דובי') ? '#FF4D4D' : '#FFC857' },
    { label: dir === 'rtl' ? 'מבנה' : 'STRUCTURE', value: day.mktStruct || '—', color: '#5AA9FF' },
    { label: dir === 'rtl' ? 'רגש' : 'EMOTION', value: `${emo}/10`, color: emoColor },
  ];

  return (
    <div style={{ display: 'flex', gap: 8, padding: '10px 0', overflowX: 'auto' as const, direction: dir as 'ltr' | 'rtl' }}>
      {badges.map(b => (
        <div key={b.label} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
          background: `${b.color}08`, border: `1px solid ${b.color}15`,
          borderRadius: 10, flexShrink: 0, transition: 'all .25s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${b.color}20`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: b.color, boxShadow: `0 0 8px ${b.color}60`, animation: 'j-pulse 2.5s ease-in-out infinite' }} />
          <div>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '1.8px', color: th.tx3, textTransform: 'uppercase' as const }}>{b.label}</div>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700, color: b.color, marginTop: 1 }}>{b.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CIRCULAR RISK METER
// ═══════════════════════════════════════════════════════════════
const CircularMeter = ({ used, limit, label, color, th }: { used: number; limit: number; label: string; color: string; th: typeof THEMES.dark }) => {
  const pct = Math.min(Math.abs(used / limit) * 100, 100);
  const meterColor = pct >= 80 ? '#FF4D4D' : pct >= 50 ? '#FFC857' : color;
  const R = 42, C = 2 * Math.PI * R;
  const offset = C - (pct / 100) * C;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={R} fill="none" stroke={th.inputBg} strokeWidth="6" />
          <circle cx="50" cy="50" r={R} fill="none" stroke={meterColor} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={offset}
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 1s ease-out, stroke .5s ease', filter: `drop-shadow(0 0 6px ${meterColor}60)` }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 800, color: meterColor, lineHeight: 1, textShadow: `0 0 12px ${meterColor}30` }}>{pct.toFixed(0)}%</span>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: th.tx3, textTransform: 'uppercase' as const }}>{label}</div>
        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 800, color: meterColor, marginTop: 2 }}>
          {used.toFixed(1)}R <span style={{ fontSize: 10, color: th.tx3, fontWeight: 400 }}>/ {limit}R</span>
        </div>
      </div>
      {pct >= 80 && <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, fontWeight: 700, color: '#FF4D4D', background: 'rgba(255,77,77,0.1)', padding: '3px 10px', borderRadius: 12, animation: 'j-pulse 1.5s ease-in-out infinite' }}>⚠ {pct >= 100 ? 'BREACHED' : 'APPROACHING'}</div>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// RISK COMMAND CENTER
// ═══════════════════════════════════════════════════════════════
const RiskCommandCenter = ({ risk, days, dir, th }: { risk: JRiskStatus; days: JournalDay[]; dir: string; th: typeof THEMES.dark }) => {
  const recentDays = days.filter(d => d.eodSaved).slice(-14);
  const disciplineScore = useMemo(() => {
    if (recentDays.length < 1) return 100;
    let score = 100;
    recentDays.forEach(d => {
      const negR = sumNegR(d.trades || []);
      if (negR <= RISK_LIMITS.day) score -= 15;
      else if (negR <= RISK_LIMITS.day * 0.8) score -= 5;
      if (!d.disciplineConfirmed) score -= 3;
      if ((d.trades || []).length > 4) score -= 3;
    });
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [recentDays]);

  const discColor = disciplineScore >= 80 ? '#00FFA3' : disciplineScore >= 50 ? '#FFC857' : '#FF4D4D';

  const today = new Date();
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const matchDays = days.filter(jd => jd.date === dateStr);
    const trades = matchDays.flatMap(jd => jd.trades || []);
    const totalR = trades.reduce((s, t) => s + getTradeR(t), 0);
    const dayName = d.toLocaleDateString(dir === 'rtl' ? 'he-IL' : 'en-US', { weekday: 'short' });
    const isToday = dateStr === today.toISOString().split('T')[0];
    return { dayName, totalR, isToday, hasTrades: trades.length > 0 };
  });

  return (
    <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 16, padding: '20px 18px', marginBottom: 16, transition: 'all .3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <span style={{ fontSize: 15 }}>🛡</span>
        <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '2.5px', color: th.tx3, textTransform: 'uppercase' as const }}>RISK CONTROL</span>
        {risk.breachedLevel !== 'none' && <span style={{ marginInlineStart: 'auto', background: 'rgba(255,77,77,0.1)', padding: '3px 10px', borderRadius: 12, color: '#FF4D4D', fontFamily: "'Poppins',sans-serif", fontWeight: 700, fontSize: 9, animation: 'j-pulse 1s ease-in-out infinite' }}>⚠ ALERT</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }} className="j-grid-2col">
        <CircularMeter used={risk.dailyR} limit={RISK_LIMITS.day} label={dir === 'rtl' ? 'יומי' : 'Daily'} color="#00FFA3" th={th} />
        <CircularMeter used={risk.weeklyR} limit={RISK_LIMITS.week} label={dir === 'rtl' ? 'שבועי' : 'Weekly'} color="#FFC857" th={th} />
        <CircularMeter used={risk.monthlyR} limit={RISK_LIMITS.month} label={dir === 'rtl' ? 'חודשי' : 'Monthly'} color="#5AA9FF" th={th} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: th.tx3, marginBottom: 10, textTransform: 'uppercase' as const }}>{dir === 'rtl' ? 'ציר סיכון שבועי' : 'WEEKLY RISK TIMELINE'}</div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
          {weekDays.map((wd, i) => {
            const barH = Math.max(4, Math.min(40, Math.abs(wd.totalR) * 15));
            const c = wd.totalR > 0 ? '#00FFA3' : wd.totalR < 0 ? '#FF4D4D' : th.inputBg;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, fontWeight: 700, color: wd.hasTrades ? c : th.tx3 }}>
                  {wd.hasTrades ? `${wd.totalR > 0 ? '+' : ''}${wd.totalR.toFixed(1)}R` : '—'}
                </span>
                <div style={{ width: '100%', height: barH, borderRadius: 4, background: c, transition: 'all .5s ease', boxShadow: wd.hasTrades ? `0 0 8px ${c}30` : 'none', opacity: wd.hasTrades ? 1 : 0.3 }} />
                <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8, fontWeight: wd.isToday ? 800 : 600, color: wd.isToday ? '#5AA9FF' : th.tx3 }}>{wd.dayName}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: `${discColor}06`, border: `1px solid ${discColor}15`, borderRadius: 12 }}>
        <div>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: th.tx3, textTransform: 'uppercase' as const }}>{dir === 'rtl' ? 'ציון משמעת סיכון' : 'RISK DISCIPLINE'}</div>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, color: th.tx3, marginTop: 3 }}>
            {disciplineScore >= 80 ? (dir === 'rtl' ? 'עקביות מצוינת' : 'Excellent') : disciplineScore >= 50 ? (dir === 'rtl' ? 'יש מקום לשיפור' : 'Needs work') : (dir === 'rtl' ? 'דורש תשומת לב' : 'Critical')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 32, fontWeight: 800, color: discColor, textShadow: `0 0 20px ${discColor}30`, lineHeight: 1 }}>{disciplineScore}</span>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, color: th.tx3, fontWeight: 600 }}>/ 100</span>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TRADING KNOWLEDGE PANEL
// ═══════════════════════════════════════════════════════════════
const KnowledgePanel = ({ type, days, dir, th, onClose, onOpenDay }: { type: 'morning' | 'eod'; days: JournalDay[]; dir: string; th: typeof THEMES.dark; onClose: () => void; onOpenDay: (id: string) => void }) => {
  const isMorning = type === 'morning';
  const accent = isMorning ? '#5AA9FF' : '#b794f6';

  const purposes = isMorning
    ? [
        { icon: '🌍', text: dir === 'rtl' ? 'הגדרת הקשר שוק — הבנה מאיפה מגיעים ולאן הולכים' : 'Define market context — understand where we are' },
        { icon: '📋', text: dir === 'rtl' ? 'יצירת תוכנית מסחר — הימנעות ממסחר רגשי' : 'Create a trading plan — avoid emotional trading' },
        { icon: '🎯', text: dir === 'rtl' ? 'זיהוי סטאפים בהסתברות גבוהה' : 'Identify high-probability setups' },
        { icon: '🧘', text: dir === 'rtl' ? 'כיול מיינדסט — כניסה למצב ריכוז' : 'Calibrate mindset — enter focus mode' },
      ]
    : [
        { icon: '🔍', text: dir === 'rtl' ? 'זיהוי טעויות — למידה מכישלונות' : 'Detect mistakes — learn from failures' },
        { icon: '⚔️', text: dir === 'rtl' ? 'חיזוק משמעת — מדידת עקביות' : 'Reinforce discipline — measure consistency' },
        { icon: '📊', text: dir === 'rtl' ? 'ניתוח ביצוע — איכות כניסה ויציאה' : 'Analyze execution quality' },
        { icon: '🧠', text: dir === 'rtl' ? 'שיפור קבלת החלטות לאורך זמן' : 'Improve decision quality over time' },
      ];

  const relevant = days.filter(d => isMorning ? d.morningSaved : d.eodSaved).slice(-8).reverse();

  const patterns: string[] = [];
  const completeDays = days.filter(d => d.eodSaved && d.trades?.length);
  if (completeDays.length >= 3) {
    const mistakeDays = completeDays.filter(d => d.mistakes?.trim());
    if (mistakeDays.length >= 2) {
      const words = mistakeDays.flatMap(d => (d.mistakes || '').toLowerCase().split(/\s+/).filter(w => w.length > 3));
      const freq: Record<string, number> = {};
      words.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
      const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
      if (top && top[1] >= 2) patterns.push(dir === 'rtl' ? `מילה חוזרת בטעויות: "${top[0]}" (${top[1]}x)` : `Recurring in mistakes: "${top[0]}" (${top[1]}x)`);
    }
    const byDay: Record<number, number[]> = {};
    completeDays.forEach(d => {
      const dow = new Date(d.date + 'T12:00').getDay();
      if (!byDay[dow]) byDay[dow] = [];
      byDay[dow].push(sumPnl(d));
    });
    const bestDow = Object.entries(byDay).filter(([_, v]) => v.length >= 2).sort((a, b) => {
      const avgA = a[1].reduce((s, x) => s + x, 0) / a[1].length;
      const avgB = b[1].reduce((s, x) => s + x, 0) / b[1].length;
      return avgB - avgA;
    })[0];
    if (bestDow) {
      const dayNames = dir === 'rtl' ? ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const avg = bestDow[1].reduce((s, x) => s + x, 0) / bestDow[1].length;
      patterns.push(dir === 'rtl' ? `יום טוב: ${dayNames[+bestDow[0]]} (ממוצע ${avg.toFixed(0)}$)` : `Best day: ${dayNames[+bestDow[0]]} (avg ${avg.toFixed(0)}$)`);
    }
    const withPlan = completeDays.filter(d => d.plan?.trim()?.length > 20);
    const noPlan = completeDays.filter(d => !d.plan?.trim() || d.plan.trim().length < 5);
    if (withPlan.length >= 2 && noPlan.length >= 1) {
      const planAvg = withPlan.reduce((s, d) => s + sumPnl(d), 0) / withPlan.length;
      const noPlanAvg = noPlan.reduce((s, d) => s + sumPnl(d), 0) / noPlan.length;
      if (planAvg > noPlanAvg) patterns.push(dir === 'rtl' ? `תוכנית מפורטת → ביצוע טוב יותר` : `Detailed plan → better performance`);
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'j-fade-in .25s ease-out' }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(720px, 94vw)', maxHeight: '88vh', overflowY: 'auto',
        background: th.bg1, border: `1px solid ${accent}25`, borderRadius: 20,
        padding: '28px 24px', animation: 'j-scale-in .3s ease-out',
        boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 40px ${accent}10`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}15`, border: `1px solid ${accent}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{isMorning ? '☀️' : '🌙'}</div>
            <div>
              <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 16, fontWeight: 800, color: th.tx }}>{isMorning ? (dir === 'rtl' ? 'ניתוח בוקר' : 'Morning Analysis') : (dir === 'rtl' ? 'סקירת סוף יום' : 'End of Day Review')}</div>
              <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, color: accent, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const }}>TRADING INTELLIGENCE</div>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${th.inputBr}`, background: th.inputBg, cursor: 'pointer', color: th.tx3, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
        </div>

        <div style={{ background: `${accent}06`, border: `1px solid ${accent}12`, borderRadius: 14, padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '2.5px', color: accent, marginBottom: 12, textTransform: 'uppercase' as const }}>💡 {dir === 'rtl' ? 'מטרה ותפקיד' : 'PURPOSE & ROLE'}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {purposes.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: th.cardBg, borderRadius: 10, border: `1px solid ${th.cardBr}`, direction: dir as 'ltr' | 'rtl' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{p.icon}</span>
                <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, color: th.tx2, lineHeight: 1.5 }}>{p.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '2.5px', color: th.tx3, marginBottom: 10, textTransform: 'uppercase' as const }}>📂 {dir === 'rtl' ? 'היסטוריה אחרונה' : 'RECENT HISTORY'}</div>
          {relevant.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: th.tx3, fontFamily: "'Poppins',sans-serif", fontSize: 12 }}>{dir === 'rtl' ? 'אין רשומות עדיין' : 'No entries yet'}</div>
          ) : (
            <div style={{ display: 'grid', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
              {relevant.map(d => {
                const dp = sumPnl(d);
                const emo = d.emotionScore;
                const tag = emo >= 8 ? (dir === 'rtl' ? 'ממוקד' : 'Focused') : emo >= 5 ? (dir === 'rtl' ? 'סביר' : 'OK') : (dir === 'rtl' ? 'מאתגר' : 'Hard');
                const tagC = emo >= 8 ? '#00FFA3' : emo >= 5 ? '#FFC857' : '#FF4D4D';
                return (
                  <div key={d.id} onClick={() => { onOpenDay(d.id); onClose(); }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 10, cursor: 'pointer', transition: 'all .2s', direction: dir as 'ltr' | 'rtl' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${accent}30`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = th.cardBr; }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700, color: th.tx }}>{fmtShort(d.date, dir === 'rtl' ? 'he-IL' : 'en-US')}</span>
                      <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, fontWeight: 700, color: tagC, background: `${tagC}12`, padding: '2px 8px', borderRadius: 8 }}>{tag}</span>
                    </div>
                    <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 800, color: dp >= 0 ? '#00FFA3' : '#FF4D4D' }}>{dp >= 0 ? '+' : ''}{dp.toFixed(0)}$</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {patterns.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '2.5px', color: th.tx3, marginBottom: 10, textTransform: 'uppercase' as const }}>🤖 {dir === 'rtl' ? 'תובנות' : 'INSIGHTS'}</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {patterns.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: `${accent}06`, border: `1px solid ${accent}12`, borderRadius: 10, direction: dir as 'ltr' | 'rtl' }}>
                  <span style={{ fontSize: 14 }}>💡</span>
                  <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, color: th.tx, lineHeight: 1.5 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
          {relevant[0] && (
            <button onClick={() => { onOpenDay(relevant[0].id); onClose(); }}
              style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 700, padding: '10px 18px', borderRadius: 10, border: `1px solid ${accent}25`, background: `${accent}08`, color: accent, cursor: 'pointer', transition: 'all .2s' }}>
              📄 {dir === 'rtl' ? 'פתח אחרון' : 'Open Latest'}
            </button>
          )}
          <button onClick={onClose}
            style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 700, padding: '10px 18px', borderRadius: 10, border: `1px solid ${th.inputBr}`, background: th.inputBg, color: th.tx2, cursor: 'pointer', transition: 'all .2s' }}>
            ✏️ {dir === 'rtl' ? 'המשך' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// RISK STATUS STRIP (legacy, used in calendar)
// ═══════════════════════════════════════════════════════════════
const RiskStrip = ({ risk, dir, th }: { risk: JRiskStatus; dir: string; th: typeof THEMES.dark }) => {
  const items = [
    { label: dir === 'rtl' ? 'יומי' : 'DAILY', value: `${risk.dailyR.toFixed(1)}R`, limit: `${RISK_LIMITS.day}R`, breached: risk.dailyBreached, color: risk.dailyBreached ? '#FF4D4D' : '#00FFA3' },
    { label: dir === 'rtl' ? 'שבועי' : 'WEEKLY', value: `${risk.weeklyR.toFixed(1)}R`, limit: `${RISK_LIMITS.week}R`, breached: risk.weeklyBreached, color: risk.weeklyBreached ? '#FF4D4D' : '#FFC857' },
    { label: dir === 'rtl' ? 'חודשי' : 'MONTHLY', value: `${risk.monthlyR.toFixed(1)}R`, limit: `${RISK_LIMITS.month}R`, breached: risk.monthlyBreached, color: risk.monthlyBreached ? '#FF4D4D' : '#5AA9FF' },
  ];
  return (
    <div style={{ display: 'flex', gap: 8, padding: '6px 0', overflowX: 'auto' as const }}>
      {items.map(it => (
        <div key={it.label} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px',
          background: it.breached ? 'rgba(255,77,77,0.08)' : th.cardBg,
          border: `1px solid ${it.breached ? 'rgba(255,77,77,0.25)' : th.cardBr}`,
          borderRadius: 8, flexShrink: 0, transition: 'all .3s',
          animation: it.breached ? 'j-glow-red 2s ease-in-out infinite' : 'none',
        }}>
          {it.breached && <span style={{ fontSize: 12, animation: 'j-pulse 1s ease-in-out infinite' }}>⚠️</span>}
          <div>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', color: th.tx3, textTransform: 'uppercase' as const }}>{it.label}</div>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 800, color: it.color }}>{it.value} <span style={{ fontSize: 9, color: th.tx3, fontWeight: 400 }}>/ {it.limit}</span></div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// RISK ALERT MODAL
// ═══════════════════════════════════════════════════════════════
const RiskAlertModal = ({ risk, t, dir, onClose, th }: { risk: JRiskStatus; t: any; dir: string; onClose: () => void; th: typeof THEMES.dark }) => {
  const level = risk.breachedLevel;
  if (level === 'none') return null;
  const cfg = {
    daily: { icon: '⚠️', color: '#f97316', msg: t.risk.daily },
    weekly: { icon: '🔴', color: '#FF4D4D', msg: t.risk.weekly },
    monthly: { icon: '🚨', color: '#991b1b', msg: t.risk.monthly },
  }[level]!;

  // Sound alert
  playRiskAlert();

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9990, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', animation: 'j-fade-in .3s ease-out' }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: th.bg1, border: `2px solid ${cfg.color}`, borderRadius: 20, padding: 32, maxWidth: 460, width: '90%',
        textAlign: 'center', boxShadow: `0 0 80px ${cfg.color}30`, animation: 'j-scale-in .3s ease-out',
      }}>
        <div style={{ fontSize: 56, marginBottom: 16, animation: 'j-pulse 1.5s ease-in-out infinite' }}>{cfg.icon}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: cfg.color, fontFamily: "'Poppins',sans-serif", marginBottom: 14, letterSpacing: '.5px' }}>{t.risk.title}</div>
        <div style={{ fontSize: 13, color: th.tx2, lineHeight: 1.8, marginBottom: 20, fontFamily: "'Poppins',sans-serif", direction: dir as 'ltr' | 'rtl' }}>{cfg.msg}</div>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 22 }}>
          {[
            { l: t.risk.dailyLabel, v: risk.dailyR.toFixed(1), b: risk.dailyBreached },
            { l: t.risk.weeklyLabel, v: risk.weeklyR.toFixed(1), b: risk.weeklyBreached },
            { l: t.risk.monthlyLabel, v: risk.monthlyR.toFixed(1), b: risk.monthlyBreached },
          ].map(s => (
            <div key={s.l} style={{ padding: '10px 16px', background: th.inputBg, borderRadius: 10, border: `1px solid ${s.b ? 'rgba(255,77,77,0.3)' : th.inputBr}` }}>
              <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8, color: th.tx3, letterSpacing: '1.5px', textTransform: 'uppercase' as const }}>{s.l}</div>
              <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 800, color: s.b ? '#FF4D4D' : th.tx, marginTop: 3 }}>{s.v}R</div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{
          padding: '12px 36px', background: `${cfg.color}20`, border: `1px solid ${cfg.color}`, borderRadius: 12,
          color: cfg.color, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'Poppins',sans-serif",
          transition: 'all .2s', letterSpacing: '.5px',
        }}>{t.risk.understand}</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EMOTION SLIDER
// ═══════════════════════════════════════════════════════════════
const EmoSlider = ({ val, set, label, dir, disabled, th }: any) => {
  const c = val >= 8 ? '#00FFA3' : val >= 5 ? '#FFC857' : '#FF4D4D';
  const e = val >= 9 ? '🔥' : val >= 7 ? '💪' : val >= 5 ? '😐' : val >= 3 ? '😔' : '💀';
  return (
    <div style={{ direction: dir }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Lbl c={label} dir={dir} th={th} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18 }}>{e}</span>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 24, fontWeight: 800, color: c, lineHeight: 1, textShadow: `0 0 20px ${c}40` }}>{val}</span>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, color: th.tx3 }}>/10</span>
        </div>
      </div>
      <div style={{ height: 4, background: th.inputBg, borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', width: `${((val - 1) / 9) * 100}%`, background: `linear-gradient(90deg,#FF4D4D,#FFC857,#00FFA3)`, transition: 'width .3s ease', borderRadius: 2 }} />
      </div>
      <input type="range" min={1} max={10} value={val} disabled={disabled}
        onChange={e => set?.(+e.target.value)} style={{ width: '100%', accentColor: c, cursor: disabled ? 'not-allowed' : 'pointer' }} />
    </div>
  );
};

const Scores = ({ val, set, disabled, th }: any) => (
  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => {
      const on = val >= n, h = (n / 10) * 120;
      return (
        <button key={n} onClick={() => !disabled && set?.(n)} style={{
          width: 32, height: 32, borderRadius: 8, border: 'none', fontFamily: "'Poppins',sans-serif",
          cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 12,
          background: on ? `hsla(${h},70%,46%,.85)` : th.inputBg,
          color: on ? '#fff' : th.tx3, transition: 'all .15s',
          boxShadow: on ? `0 0 10px hsla(${h},70%,46%,.3)` : 'none',
        }}>{n}</button>
      );
    })}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// MARKET SENTIMENT GAUGE — Premium standalone widget
// ═══════════════════════════════════════════════════════════════
const MarketSentimentGauge = ({ value, dir, th, onChangeValue, disabled }: { value: string; dir: string; th: typeof THEMES.dark; onChangeValue?: (v: string) => void; disabled?: boolean }) => {
  const v = Math.min(100, Math.max(0, parseInt(value) || 0));
  const hasValue = value !== '' && value !== undefined;
  const color = v <= 20 ? '#FF4D4D' : v <= 40 ? '#f97316' : v <= 60 ? '#FFC857' : v <= 80 ? '#84cc16' : '#00FFA3';
  const labelEN = v <= 20 ? 'Extreme Fear' : v <= 40 ? 'Fear' : v <= 60 ? 'Neutral' : v <= 80 ? 'Greed' : 'Extreme Greed';
  const labelHE = v <= 20 ? 'פחד קיצוני' : v <= 40 ? 'פחד' : v <= 60 ? 'ניטרלי' : v <= 80 ? 'תאוות בצע' : 'תאוות בצע קיצונית';
  const label = dir === 'rtl' ? labelHE : labelEN;
  const isRTL = dir === 'rtl';
  const glowIntensity = hasValue ? Math.max(0.05, v / 200) : 0;

  const rad = (d: number) => d * Math.PI / 180;
  const cx = 100, cy = 92, R = 72, ri = 50;
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
    <div style={{
      background: `linear-gradient(165deg, ${th.cardBg}, rgba(0,0,0,0.3))`,
      border: `1px solid ${hasValue ? `${color}25` : th.cardBr}`,
      borderRadius: 18, padding: '22px 20px 18px', marginBottom: 12,
      position: 'relative', overflow: 'hidden',
      boxShadow: hasValue ? `0 0 ${30 + glowIntensity * 40}px ${color}${Math.round(glowIntensity * 25).toString(16).padStart(2, '0')}` : 'none',
      transition: 'all .5s ease',
    }}>
      {/* Subtle background glow */}
      {hasValue && <div style={{
        position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)',
        width: 200, height: 200, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}08 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: `linear-gradient(135deg, ${color}20, ${color}08)`,
          border: `1px solid ${color}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
        }}>₿</div>
        <div>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' as const, color: th.tx3 }}>
            {isRTL ? 'סנטימנט שוק הקריפטו' : 'CRYPTO MARKET SENTIMENT'}
          </div>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, color: th.tx3, opacity: 0.6, marginTop: 2 }}>
            {isRTL ? 'מדד פחד ותאוות בצע — פסיכולוגיית שוק חיצונית' : 'Fear & Greed Index — external market psychology'}
          </div>
        </div>
      </div>

      {/* Gauge + Input */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexWrap: 'wrap' as const, position: 'relative', zIndex: 1 }}>
        {/* SVG Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg width="200" height="110" viewBox="0 0 200 110">
            {/* Track */}
            {segs.map((s, i) => (
              <path key={i} d={arc(s.s, s.e)} fill={s.c} opacity={hasValue ? 0.85 : 0.2} style={{ transition: 'opacity .5s ease' }} />
            ))}
            {/* Tick marks */}
            {[0, 25, 50, 75, 100].map(tick => {
              const a = rad(-180 + (tick / 100) * 180);
              const x1 = cx + (R + 4) * Math.cos(a), y1 = cy + (R + 4) * Math.sin(a);
              const x2 = cx + (R + 10) * Math.cos(a), y2 = cy + (R + 10) * Math.sin(a);
              return <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke={th.tx3} strokeWidth={1.5} opacity={0.4} />;
            })}
            {/* Needle */}
            {hasValue && (
              <>
                <line x1={cx} y1={cy} x2={cx + 60 * Math.cos(nr)} y2={cy + 60 * Math.sin(nr)}
                  stroke="rgba(255,255,255,0.95)" strokeWidth={3} strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'all .6s cubic-bezier(0.34,1.56,0.64,1)' }} />
                <circle cx={cx} cy={cy} r={6} fill="rgba(255,255,255,0.95)" style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
                <circle cx={cx} cy={cy} r={3} fill={color} />
              </>
            )}
          </svg>
          {/* Value display */}
          <div style={{ textAlign: 'center', marginTop: -8 }}>
            <div style={{
              fontFamily: "'JetBrains Mono',monospace", fontSize: 32, fontWeight: 800,
              color: hasValue ? color : th.tx3, lineHeight: 1,
              textShadow: hasValue ? `0 0 25px ${color}50` : 'none',
              transition: 'all .5s ease',
            }}>{hasValue ? v : '—'}</div>
            {hasValue && (
              <div style={{
                fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 700,
                color, letterSpacing: '1.5px', textTransform: 'uppercase' as const,
                marginTop: 4, opacity: 0.9,
              }}>{label}</div>
            )}
          </div>
        </div>

        {/* Input */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <input
            value={value || ''}
            onChange={e => {
              if (disabled) return;
              const n = e.target.value.replace(/\D/g, '').slice(0, 3);
              if (n === '' || parseInt(n) <= 100) onChangeValue?.(n);
            }}
            placeholder="0 – 100"
            disabled={disabled}
            style={{
              width: 90, textAlign: 'center',
              background: th.inputBg, border: `1px solid ${hasValue ? `${color}30` : th.inputBr}`,
              borderRadius: 10, color: th.tx, padding: '10px 12px',
              fontSize: 18, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace",
              outline: 'none', transition: 'all .3s',
            }}
          />
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8, color: th.tx3, textAlign: 'center', opacity: 0.5 }}>
            {isRTL ? 'הזן ערך מ-0 עד 100' : 'Enter value 0–100'}
          </div>
        </div>
      </div>

      {/* Scale labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, padding: '0 10px', position: 'relative', zIndex: 1 }}>
        {[
          { l: isRTL ? 'פחד קיצוני' : 'Extreme Fear', c: '#FF4D4D' },
          { l: isRTL ? 'פחד' : 'Fear', c: '#f97316' },
          { l: isRTL ? 'ניטרלי' : 'Neutral', c: '#FFC857' },
          { l: isRTL ? 'תאוות בצע' : 'Greed', c: '#84cc16' },
          { l: isRTL ? 'קיצוני' : 'Extreme', c: '#00FFA3' },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: s.c, margin: '0 auto 3px', opacity: 0.6 }} />
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 7, color: s.c, opacity: 0.6, letterSpacing: '0.5px' }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TRADE CARD
// ═══════════════════════════════════════════════════════════════
const TCard = ({ trade, idx, onChange, onDel, f, dir, disabled, th }: any) => {
  const p = parseFloat(trade.pnl) || 0;
  const sc = trade.side === 'LONG' ? '#00FFA3' : trade.side === 'SHORT' ? '#FF4D4D' : '#5AA9FF';
  return (
    <div style={{
      background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 12, padding: 14, marginBottom: 10,
      borderInlineStart: `3px solid ${sc}`, transition: 'all .25s ease',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${sc}15`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, direction: dir }}>
        <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, color: th.tx3, letterSpacing: 1.2 }}>{f.tradeN} #{idx + 1}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {p !== 0 && <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 800, color: p > 0 ? '#00FFA3' : '#FF4D4D', textShadow: `0 0 12px ${p > 0 ? 'rgba(0,255,163,0.3)' : 'rgba(255,77,77,0.3)'}` }}>{p > 0 ? '+' : ''}{p.toFixed(2)}$</span>}
          {!disabled && <button onClick={onDel} style={{ background: 'rgba(255,77,77,.1)', border: '1px solid rgba(255,77,77,.2)', color: '#FF4D4D', padding: '5px 10px', fontSize: 11, borderRadius: 6, cursor: 'pointer', fontWeight: 600, transition: 'all .15s' }}>✕ {f.del}</button>}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
        {[['ins','pair','BTC/USDT'],['en','entry','95000'],['ex','exit','97000'],['sz','size','0.1'],['pnl','pnl','+200'],['rr','rr','1:3']].map(([lKey, k, ph]: any) => (
          <div key={k}><Lbl c={f[lKey]} dir={dir} th={th} /><IN val={trade[k] || ''} set={(v: string) => onChange?.({ ...trade, [k]: v })} ph={ph} dir={dir} disabled={disabled} th={th} /></div>
        ))}
      </div>
      {!disabled && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 9 }}>
          {['LONG', 'SHORT', 'MISSED'].map(s => (
            <button key={s} onClick={() => onChange?.({ ...trade, side: s })}
              style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const, borderRadius: 20, padding: '5px 14px', cursor: 'pointer', transition: 'all .2s', ...(trade.side === s ? { background: s === 'LONG' ? '#00FFA3' : s === 'SHORT' ? '#FF4D4D' : '#5AA9FF', color: '#0a0e1a', border: 'none', boxShadow: `0 0 12px ${s === 'LONG' ? 'rgba(0,255,163,0.3)' : s === 'SHORT' ? 'rgba(255,77,77,0.3)' : 'rgba(90,169,255,0.3)'}` } : { background: th.unselBg, border: `1px solid ${th.unselBr}`, color: th.unselTx }) }}>
              {s}
            </button>
          ))}
        </div>
      )}
      <Lbl c={f.tNotes} dir={dir} th={th} />
      <TA val={trade.notes || ''} set={(v: string) => onChange?.({ ...trade, notes: v })} ph={f.tNotesPh} rows={2} dir={dir} disabled={disabled} th={th} />
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// BEHAVIORAL ANALYTICS ENGINE — INTELLIGENCE DASHBOARD
// ═══════════════════════════════════════════════════════════════

const AnimCard = ({ children, delay = 0, accent = 'transparent', th, style = {} }: { children: React.ReactNode; delay?: number; accent?: string; th: typeof THEMES.dark; style?: React.CSSProperties }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{
      background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 16,
      padding: '20px 22px', transition: 'all .6s cubic-bezier(0.16,1,0.3,1)',
      opacity: visible ? 1 : 0, transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
      borderTop: accent !== 'transparent' ? `2px solid ${accent}` : undefined,
      ...style,
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px ${accent}20`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
      {children}
    </div>
  );
};

const SectionLabel = ({ icon, text, accent, th }: { icon: string; text: string; accent: string; th: typeof THEMES.dark }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${accent}12`, border: `1px solid ${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{icon}</div>
    <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase' as const, color: accent }}>{text}</span>
  </div>
);

const MiniStat = ({ label, value, color, sub, th }: { label: string; value: string; color: string; sub?: string; th: typeof THEMES.dark }) => (
  <div style={{ background: `${color}06`, border: `1px solid ${color}12`, borderRadius: 12, padding: '14px 12px', textAlign: 'center', transition: 'all .3s' }}>
    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '2px', color: th.tx3, textTransform: 'uppercase' as const, marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, color: th.tx3, marginTop: 4 }}>{sub}</div>}
  </div>
);

const InsightRow = ({ icon, text, type, th, delay = 0 }: { icon: string; text: string; type: 'warning' | 'success' | 'info' | 'neutral'; th: typeof THEMES.dark; delay?: number }) => {
  const c = { warning: '#FF4D4D', success: '#00FFA3', info: '#5AA9FF', neutral: '#FFC857' }[type];
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
      background: `${c}06`, border: `1px solid ${c}15`, borderRadius: 12,
      opacity: vis ? 1 : 0, transform: vis ? 'translateX(0)' : 'translateX(-16px)',
      transition: 'all .5s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13, color: th.tx, lineHeight: 1.7 }}>{text}</span>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// FULLSCREEN INTELLIGENCE MODAL
// ═══════════════════════════════════════════════════════════════
const IntelModal = ({ title, icon, accent, children, onClose, th }: { title: string; icon: string; accent: string; children: React.ReactNode; onClose: () => void; th: typeof THEMES.dark }) => {
  const [phase, setPhase] = useState<'enter' | 'open' | 'exit'>('enter');
  useEffect(() => { const t = setTimeout(() => setPhase('open'), 30); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);
  const close = () => { setPhase('exit'); setTimeout(onClose, 350); };
  return (
    <div onClick={close} style={{
      position: 'fixed', inset: 0, zIndex: 9500,
      background: phase === 'open' ? 'rgba(0,0,0,0.82)' : 'rgba(0,0,0,0)',
      backdropFilter: phase === 'open' ? 'blur(16px)' : 'blur(0)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all .35s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '94%', maxWidth: 800, maxHeight: '92vh', overflowY: 'auto',
        background: `linear-gradient(170deg, ${th.bg1}, ${th.bg})`,
        border: `1px solid ${accent}20`,
        borderRadius: 22, padding: '30px 28px',
        boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 60px ${accent}08`,
        transform: phase === 'open' ? 'scale(1) rotateY(0deg)' : phase === 'exit' ? 'scale(0.92) rotateY(-3deg)' : 'scale(0.88) rotateY(5deg)',
        opacity: phase === 'open' ? 1 : 0,
        transition: 'all .4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22, paddingBottom: 16, borderBottom: `1px solid ${accent}12` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${accent}12`, border: `1px solid ${accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
            <div>
              <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 800, color: th.tx }}>{title}</div>
              <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '2px', color: accent, textTransform: 'uppercase' as const }}>DEEP INTELLIGENCE</div>
            </div>
          </div>
          <button onClick={close} style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${th.inputBr}`, background: th.inputBg, cursor: 'pointer', color: th.tx3, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Clickable intelligence card wrapper
const IntelCard = ({ children, delay = 0, accent = 'transparent', th, style = {}, modalTitle, modalIcon, modalContent }: { children: React.ReactNode; delay?: number; accent?: string; th: typeof THEMES.dark; style?: React.CSSProperties; modalTitle?: string; modalIcon?: string; modalContent?: React.ReactNode }) => {
  const [visible, setVisible] = useState(false);
  const [modal, setModal] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  const hasModal = modalTitle && modalContent;
  return (
    <>
      <div style={{
        background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 16,
        padding: '20px 22px', transition: 'all .6s cubic-bezier(0.16,1,0.3,1)',
        opacity: visible ? 1 : 0, transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
        borderTop: accent !== 'transparent' ? `2px solid ${accent}` : undefined,
        cursor: hasModal ? 'pointer' : 'default',
        ...style,
      }}
        onClick={() => hasModal && setModal(true)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.2), 0 0 0 1px ${accent}20`; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
        {hasModal && <div style={{ position: 'absolute', top: 12, right: 14, fontSize: 8, color: th.tx3, fontWeight: 700, letterSpacing: '1px', opacity: 0.5 }}>CLICK TO EXPAND ↗</div>}
        {children}
      </div>
      {modal && hasModal && <IntelModal title={modalTitle!} icon={modalIcon || '📊'} accent={accent || '#5AA9FF'} onClose={() => setModal(false)} th={th}>{modalContent}</IntelModal>}
    </>
  );
};

const AnalyticsPanel = ({ days, dir, th }: { days: JournalDay[]; dir: string; th: typeof THEMES.dark }) => {
  const isRTL = dir === 'rtl';
  const completeDays = useMemo(() => days.filter(d => d.eodSaved && d.trades?.length > 0).sort((a, b) => a.date.localeCompare(b.date)), [days]);
  const allTrades = useMemo(() => completeDays.flatMap(d => (d.trades || []).map(t => ({ ...t, dayDate: d.date, dayScore: d.dayScore, emotionScore: d.emotionScore, plan: d.plan, disciplineConfirmed: d.disciplineConfirmed }))), [completeDays]);
  const [heatMonth, setHeatMonth] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });

  // ─── Core Metrics ───
  const totalPnl = completeDays.reduce((s, d) => s + sumPnl(d), 0);
  const totalTrades = allTrades.length;
  const totalWins = allTrades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
  const totalLosses = allTrades.filter(t => (parseFloat(t.pnl) || 0) < 0).length;
  const totalBE = totalTrades - totalWins - totalLosses;
  const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
  const totalWinR = allTrades.reduce((s, t) => { const r = getTradeR(t as any); return r > 0 ? s + r : s; }, 0);
  const totalLossR = allTrades.reduce((s, t) => { const r = getTradeR(t as any); return r < 0 ? s + Math.abs(r) : s; }, 0);
  const avgWinR = totalWins > 0 ? totalWinR / totalWins : 0;
  const avgLossR = totalLosses > 0 ? totalLossR / totalLosses : 0;
  const totalR = allTrades.reduce((s, t) => s + getTradeR(t as any), 0);
  const profitFactor = totalLossR > 0 ? totalWinR / totalLossR : totalWinR > 0 ? Infinity : 0;
  const expectancy = totalTrades > 0 ? totalR / totalTrades : 0;
  const avgScore = completeDays.length > 0 ? completeDays.reduce((s, d) => s + d.dayScore, 0) / completeDays.length : 0;

  // ─── Weekday Analysis ───
  const byWeekday = useMemo(() => {
    const dayNames = isRTL ? ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'] : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const map: Record<number, { pnl: number; r: number; count: number; wins: number; trades: number }> = {};
    completeDays.forEach(d => {
      const dow = new Date(d.date + 'T12:00').getDay();
      if (!map[dow]) map[dow] = { pnl: 0, r: 0, count: 0, wins: 0, trades: 0 };
      map[dow].pnl += sumPnl(d);
      map[dow].r += (d.trades || []).reduce((s, t) => s + getTradeR(t), 0);
      map[dow].count++;
      map[dow].wins += numWins(d);
      map[dow].trades += (d.trades || []).length;
    });
    return Object.entries(map).map(([k, v]) => ({ dow: +k, name: dayNames[+k], ...v, avgR: v.count > 0 ? v.r / v.count : 0, wr: v.trades > 0 ? (v.wins / v.trades) * 100 : 0 })).sort((a, b) => a.dow - b.dow);
  }, [completeDays, isRTL]);

  const bestDay = byWeekday.length > 0 ? [...byWeekday].sort((a, b) => b.avgR - a.avgR)[0] : null;
  const worstDay = byWeekday.length > 0 ? [...byWeekday].sort((a, b) => a.avgR - b.avgR)[0] : null;

  // ─── Asset Analysis ───
  const byAsset = useMemo(() => {
    const map: Record<string, { pnl: number; r: number; wins: number; count: number }> = {};
    allTrades.forEach(t => {
      const pair = (t.pair || 'Unknown').toUpperCase().trim();
      if (!map[pair]) map[pair] = { pnl: 0, r: 0, wins: 0, count: 0 };
      map[pair].pnl += parseFloat(t.pnl) || 0;
      map[pair].r += getTradeR(t as any);
      if ((parseFloat(t.pnl) || 0) > 0) map[pair].wins++;
      map[pair].count++;
    });
    return Object.entries(map).map(([k, v]) => ({ asset: k, ...v, wr: v.count > 0 ? (v.wins / v.count) * 100 : 0, avgR: v.count > 0 ? v.r / v.count : 0 })).sort((a, b) => b.r - a.r);
  }, [allTrades]);

  // ─── Strategy Analysis ───
  const byStrategy = useMemo(() => {
    const strategies = ['MSB + BOS', 'MSB+BOS', 'BOS', 'Daily Open', 'DAILY OPEN'];
    const normalize = (s: string) => {
      const up = s.toUpperCase().trim();
      if (up.includes('MSB') && up.includes('BOS')) return 'MSB + BOS';
      if (up === 'BOS') return 'BOS';
      if (up.includes('DAILY') && up.includes('OPEN')) return 'Daily Open';
      return s.trim();
    };
    const map: Record<string, { r: number; wins: number; count: number; pnl: number }> = {};
    allTrades.forEach(t => {
      const notes = (t.notes || '').trim();
      const pair = (t.pair || '').trim();
      let strat = '';
      for (const s of strategies) {
        if (notes.toUpperCase().includes(s.toUpperCase()) || pair.toUpperCase().includes(s.toUpperCase())) { strat = normalize(s); break; }
      }
      if (!strat) strat = isRTL ? 'אחר' : 'Other';
      if (!map[strat]) map[strat] = { r: 0, wins: 0, count: 0, pnl: 0 };
      map[strat].r += getTradeR(t as any);
      map[strat].pnl += parseFloat(t.pnl) || 0;
      if ((parseFloat(t.pnl) || 0) > 0) map[strat].wins++;
      map[strat].count++;
    });
    return Object.entries(map).filter(([_, v]) => v.count >= 1).map(([k, v]) => ({ name: k, ...v, wr: v.count > 0 ? (v.wins / v.count) * 100 : 0, avgR: v.count > 0 ? v.r / v.count : 0 })).sort((a, b) => b.r - a.r);
  }, [allTrades, isRTL]);

  // ─── Streak Analysis (Enhanced) ───
  const streaks = useMemo(() => {
    let curWin = 0, curLoss = 0, bestWin = 0, bestLoss = 0, currentStreak = 0, currentStreakType = '';
    const sorted = [...completeDays];
    sorted.forEach(d => {
      const p = sumPnl(d);
      if (p >= 0) { curWin++; curLoss = 0; bestWin = Math.max(bestWin, curWin); currentStreak = curWin; currentStreakType = 'win'; }
      else { curLoss++; curWin = 0; bestLoss = Math.max(bestLoss, curLoss); currentStreak = curLoss; currentStreakType = 'loss'; }
    });
    let postWinR = 0, postWinCount = 0, postLossR = 0, postLossCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prevP = sumPnl(sorted[i - 1]);
      const curR = (sorted[i].trades || []).reduce((s, t) => s + getTradeR(t), 0);
      if (prevP > 0) { postWinR += curR; postWinCount++; }
      else if (prevP < 0) { postLossR += curR; postLossCount++; }
    }
    return { bestWin, bestLoss, currentStreak, currentStreakType, postWinAvg: postWinCount > 0 ? postWinR / postWinCount : 0, postLossAvg: postLossCount > 0 ? postLossR / postLossCount : 0, postWinCount, postLossCount };
  }, [completeDays]);

  // ─── Drawdown Tracker ───
  const drawdown = useMemo(() => {
    let peak = 0, maxDD = 0, currentDD = 0;
    const equity: number[] = [];
    let running = 0;
    completeDays.forEach(d => {
      running += (d.trades || []).reduce((s, t) => s + getTradeR(t), 0);
      equity.push(running);
      if (running > peak) peak = running;
      const dd = peak - running;
      if (dd > maxDD) maxDD = dd;
      currentDD = dd;
    });
    const recoveryFactor = maxDD > 0 ? running / maxDD : running > 0 ? Infinity : 0;
    return { maxDD, currentDD, recoveryFactor, equity, peak };
  }, [completeDays]);

  // ─── Consistency Metrics ───
  const consistency = useMemo(() => {
    const greenDays = completeDays.filter(d => sumPnl(d) >= 0).length;
    const greenRatio = completeDays.length > 0 ? (greenDays / completeDays.length) * 100 : 0;
    const dailyR = completeDays.map(d => (d.trades || []).reduce((s, t) => s + getTradeR(t), 0));
    const meanR = dailyR.length > 0 ? dailyR.reduce((s, r) => s + r, 0) / dailyR.length : 0;
    const variance = dailyR.length > 1 ? dailyR.reduce((s, r) => s + (r - meanR) ** 2, 0) / (dailyR.length - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev > 0 ? meanR / stdDev : 0;
    // Profit concentration — what % of profit comes from best day
    const sortedPnl = [...dailyR].sort((a, b) => b - a);
    const topDayR = sortedPnl[0] || 0;
    const totalPos = dailyR.filter(r => r > 0).reduce((s, r) => s + r, 0);
    const concentration = totalPos > 0 ? (topDayR / totalPos) * 100 : 0;
    return { greenDays, greenRatio, sharpe, stdDev, concentration, meanR };
  }, [completeDays]);

  // ─── R-Distribution ───
  const rDistribution = useMemo(() => {
    const rValues = allTrades.map(t => getTradeR(t as any));
    if (rValues.length === 0) return { buckets: [], median: 0, skew: 0, mode: 0 };
    const sorted = [...rValues].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = rValues.reduce((s, r) => s + r, 0) / rValues.length;
    const std = Math.sqrt(rValues.reduce((s, r) => s + (r - mean) ** 2, 0) / rValues.length);
    const skew = std > 0 ? rValues.reduce((s, r) => s + ((r - mean) / std) ** 3, 0) / rValues.length : 0;
    // Buckets
    const bucketDef = [
      { label: '<-3R', min: -Infinity, max: -3 },
      { label: '-3 to -2R', min: -3, max: -2 },
      { label: '-2 to -1R', min: -2, max: -1 },
      { label: '-1 to 0R', min: -1, max: 0 },
      { label: '0 to 1R', min: 0, max: 1 },
      { label: '1 to 2R', min: 1, max: 2 },
      { label: '2 to 3R', min: 2, max: 3 },
      { label: '3R+', min: 3, max: Infinity },
    ];
    const buckets = bucketDef.map(b => ({ ...b, count: rValues.filter(r => r >= b.min && r < b.max).length }));
    // Mode bucket
    const maxCount = Math.max(...buckets.map(b => b.count));
    const modeBucket = buckets.find(b => b.count === maxCount);
    return { buckets, median, skew, mode: modeBucket ? modeBucket.label : '—' };
  }, [allTrades]);

  // ─── Trade Frequency Analysis ───
  const frequency = useMemo(() => {
    const byCount: Record<number, { r: number; pnl: number; count: number }> = {};
    completeDays.forEach(d => {
      const tc = (d.trades || []).length;
      if (!byCount[tc]) byCount[tc] = { r: 0, pnl: 0, count: 0 };
      byCount[tc].r += (d.trades || []).reduce((s, t) => s + getTradeR(t), 0);
      byCount[tc].pnl += sumPnl(d);
      byCount[tc].count++;
    });
    const entries = Object.entries(byCount).map(([k, v]) => ({ trades: +k, avgR: v.count > 0 ? v.r / v.count : 0, days: v.count }));
    const optimal = entries.length > 0 ? [...entries].sort((a, b) => b.avgR - a.avgR)[0] : null;
    const avgTradesPerDay = completeDays.length > 0 ? totalTrades / completeDays.length : 0;
    const overtrading = completeDays.filter(d => (d.trades || []).length >= 4);
    const overtradingAvgR = overtrading.length > 0 ? overtrading.reduce((s, d) => s + (d.trades || []).reduce((ss, t) => ss + getTradeR(t), 0), 0) / overtrading.length : 0;
    return { entries, optimal, avgTradesPerDay, overtradingDays: overtrading.length, overtradingAvgR };
  }, [completeDays, totalTrades]);

  // ─── Monthly Heatmap Data ───
  const heatmapData = useMemo(() => {
    const { y, m } = heatMonth;
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: { day: number | null; r: number | null; hasTrades: boolean }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, r: null, hasTrades: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = completeDays.filter(dd => dd.date === dateStr);
      const dayR = dayData.length > 0 ? dayData.flatMap(dd => dd.trades || []).reduce((s, t) => s + getTradeR(t), 0) : null;
      cells.push({ day: d, r: dayR, hasTrades: dayData.length > 0 });
    }
    const monthR = cells.filter(c => c.r !== null).reduce((s, c) => s + (c.r || 0), 0);
    const tradeDays = cells.filter(c => c.hasTrades).length;
    return { cells, monthR, tradeDays };
  }, [completeDays, heatMonth]);

  // ─── Emotion/Behavior Correlation ───
  const emotionInsights = useMemo(() => {
    const ins: { text: string; type: 'warning' | 'success' | 'info' | 'neutral'; icon: string }[] = [];
    const highEmo = completeDays.filter(d => d.emotionScore >= 8);
    const lowEmo = completeDays.filter(d => d.emotionScore <= 4);
    if (highEmo.length >= 1 && lowEmo.length >= 1) {
      const hAvg = highEmo.reduce((s, d) => s + sumPnl(d), 0) / highEmo.length;
      const lAvg = lowEmo.reduce((s, d) => s + sumPnl(d), 0) / lowEmo.length;
      ins.push({ text: isRTL ? `ציון רגשי גבוה (8+): ממוצע ${hAvg.toFixed(0)}$. ציון נמוך (≤4): ממוצע ${lAvg.toFixed(0)}$. ${hAvg > lAvg ? 'מצב רוח טוב = ביצוע טוב יותר.' : 'ביצוע לא תלוי במצב רוח — סימן חיובי למשמעת.'}` : `High emotion (8+): avg ${hAvg.toFixed(0)}$. Low emotion (≤4): avg ${lAvg.toFixed(0)}$. ${hAvg > lAvg ? 'Good mood = better execution.' : 'Performance not mood-dependent — sign of discipline.'}`, type: hAvg > lAvg ? 'success' : 'info', icon: '🧠' });
    }
    const withDisc = completeDays.filter(d => d.disciplineConfirmed);
    const noDisc = completeDays.filter(d => !d.disciplineConfirmed);
    if (withDisc.length >= 1 && noDisc.length >= 1) {
      const dAvg = withDisc.reduce((s, d) => s + sumPnl(d), 0) / withDisc.length;
      const ndAvg = noDisc.reduce((s, d) => s + sumPnl(d), 0) / noDisc.length;
      ins.push({ text: isRTL ? `עם מחויבות יומית: ממוצע ${dAvg.toFixed(0)}$. בלי: ${ndAvg.toFixed(0)}$. ${dAvg > ndAvg ? 'מחויבות = תוצאות.' : 'המחויבות לא משפיעה עדיין.'}` : `With commitment: avg ${dAvg.toFixed(0)}$. Without: ${ndAvg.toFixed(0)}$. ${dAvg > ndAvg ? 'Commitment = results.' : 'Commitment not impacting yet.'}`, type: dAvg > ndAvg ? 'success' : 'neutral', icon: '⚔️' });
    }
    const sleptWell = completeDays.filter(d => d.psychAnswers?.sleepWell === true);
    const sleptBad = completeDays.filter(d => d.psychAnswers?.sleepWell === false);
    if (sleptWell.length >= 1 && sleptBad.length >= 1) {
      const gAvg = sleptWell.reduce((s, d) => s + sumPnl(d), 0) / sleptWell.length;
      const bAvg = sleptBad.reduce((s, d) => s + sumPnl(d), 0) / sleptBad.length;
      ins.push({ text: isRTL ? `שינה טובה: ממוצע ${gAvg.toFixed(0)}$. שינה גרועה: ${bAvg.toFixed(0)}$.` : `Good sleep: avg ${gAvg.toFixed(0)}$. Bad sleep: avg ${bAvg.toFixed(0)}$.`, type: gAvg > bAvg ? 'success' : 'warning', icon: '😴' });
    }
    const overDays = completeDays.filter(d => (d.trades || []).length >= 4);
    if (overDays.length >= 1) {
      const avg = overDays.reduce((s, d) => s + sumPnl(d), 0) / overDays.length;
      ins.push({ text: isRTL ? `ימים עם 4+ עסקאות (${overDays.length}): ממוצע ${avg.toFixed(0)}$. ${avg < 0 ? 'מסחר-יתר פוגע בביצוע.' : ''}` : `Days with 4+ trades (${overDays.length}): avg ${avg.toFixed(0)}$. ${avg < 0 ? 'Overtrading hurts performance.' : ''}`, type: avg < 0 ? 'warning' : 'info', icon: '⚡' });
    }
    const withPlan = completeDays.filter(d => d.plan && d.plan.trim().length > 20);
    const noPlan = completeDays.filter(d => !d.plan || d.plan.trim().length < 5);
    if (withPlan.length >= 1 && noPlan.length >= 1) {
      const pAvg = withPlan.reduce((s, d) => s + sumPnl(d), 0) / withPlan.length;
      const npAvg = noPlan.reduce((s, d) => s + sumPnl(d), 0) / noPlan.length;
      ins.push({ text: isRTL ? `תוכנית מפורטת → ממוצע ${pAvg.toFixed(0)}$. בלי תוכנית → ${npAvg.toFixed(0)}$. ${pAvg > npAvg ? 'תכנון = יתרון.' : ''}` : `Detailed plan → avg ${pAvg.toFixed(0)}$. No plan → ${npAvg.toFixed(0)}$. ${pAvg > npAvg ? 'Planning = edge.' : ''}`, type: pAvg > npAvg ? 'success' : 'neutral', icon: '📋' });
    }
    const underPressure = completeDays.filter(d => d.psychAnswers?.feelingPressure === true);
    if (underPressure.length >= 1) {
      const avg = underPressure.reduce((s, d) => s + sumPnl(d), 0) / underPressure.length;
      ins.push({ text: isRTL ? `תחת לחץ (${underPressure.length} ימים): ממוצע ${avg.toFixed(0)}$. ${avg < 0 ? 'לחץ = הפסדים.' : 'יציב תחת לחץ — משמעת חזקה.'}` : `Under pressure (${underPressure.length} days): avg ${avg.toFixed(0)}$. ${avg < 0 ? 'Pressure = losses.' : 'Stable under pressure — strong discipline.'}`, type: avg < 0 ? 'warning' : 'success', icon: '💀' });
    }
    if (streaks.postWinCount >= 2) {
      ins.push({ text: isRTL ? `אחרי יום מנצח: ממוצע ${streaks.postWinAvg.toFixed(2)}R. ${streaks.postWinAvg < 0 ? 'הביצוע יורד אחרי ניצחונות — ביטחון-יתר.' : 'עקביות אחרי ניצחונות.'}` : `After winning day: avg ${streaks.postWinAvg.toFixed(2)}R. ${streaks.postWinAvg < 0 ? 'Performance drops after wins — overconfidence.' : 'Consistent after wins.'}`, type: streaks.postWinAvg < 0 ? 'warning' : 'success', icon: '🔥' });
    }
    if (streaks.postLossCount >= 2) {
      ins.push({ text: isRTL ? `אחרי יום מפסיד: ממוצע ${streaks.postLossAvg.toFixed(2)}R. ${streaks.postLossAvg < -0.5 ? 'דפוס מסחר נקמה — עצור אחרי הפסד.' : 'התאוששות חזקה.'}` : `After losing day: avg ${streaks.postLossAvg.toFixed(2)}R. ${streaks.postLossAvg < -0.5 ? 'Revenge trading pattern — stop after loss.' : 'Strong recovery.'}`, type: streaks.postLossAvg < -0.5 ? 'warning' : 'success', icon: '📉' });
    }
    const tagPnl: Record<string, { total: number; count: number }> = {};
    completeDays.forEach(d => { (d.mentalTags || []).forEach(tag => { if (!tagPnl[tag]) tagPnl[tag] = { total: 0, count: 0 }; tagPnl[tag].total += sumPnl(d); tagPnl[tag].count++; }); });
    Object.entries(tagPnl).filter(([_, v]) => v.count >= 2).forEach(([tag, data]) => {
      const avg = data.total / data.count;
      ins.push({ text: isRTL ? `כשאתה "${tag}": ממוצע ${avg.toFixed(0)}$ (${data.count} ימים). ${avg < 0 ? 'מצב זה מזיק.' : 'מצב זה תומך.'}` : `When "${tag}": avg ${avg.toFixed(0)}$ (${data.count} days). ${avg < 0 ? 'This state hurts.' : 'This state supports.'}`, type: avg < 0 ? 'warning' : 'success', icon: '🏷️' });
    });
    return ins;
  }, [completeDays, isRTL, streaks]);

  // ─── Decision Quality ───
  const decisionQuality = useMemo(() => {
    const withPlan = completeDays.filter(d => d.plan && d.plan.trim().length > 15);
    const goodDecGoodOut = withPlan.filter(d => d.disciplineConfirmed && sumPnl(d) > 0).length;
    const goodDecBadOut = withPlan.filter(d => d.disciplineConfirmed && sumPnl(d) < 0).length;
    const badDecGoodOut = completeDays.filter(d => !d.disciplineConfirmed && sumPnl(d) > 0).length;
    const badDecBadOut = completeDays.filter(d => !d.disciplineConfirmed && sumPnl(d) < 0).length;
    const total = goodDecGoodOut + goodDecBadOut + badDecGoodOut + badDecBadOut;
    return { goodDecGoodOut, goodDecBadOut, badDecGoodOut, badDecBadOut, total };
  }, [completeDays]);

  // ─── Monthly Recap (compact) ───
  const monthlyRecap = useMemo(() => {
    const map: Record<string, JournalDay[]> = {};
    completeDays.forEach(d => { const ym = d.date.slice(0, 7); if (!map[ym]) map[ym] = []; map[ym].push(d); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).map(([ym, mDays]) => {
      const trades = mDays.flatMap(d => d.trades || []);
      const wins = trades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
      const losses = trades.filter(t => (parseFloat(t.pnl) || 0) < 0).length;
      const be = trades.length - wins - losses;
      const wR = trades.reduce((s, t) => { const r = getTradeR(t); return r > 0 ? s + r : s; }, 0);
      const lR = trades.reduce((s, t) => { const r = getTradeR(t); return r < 0 ? s + Math.abs(r) : s; }, 0);
      const tR = trades.reduce((s, t) => s + getTradeR(t), 0);
      const pnl = mDays.reduce((s, d) => s + sumPnl(d), 0);
      const ev = trades.length > 0 ? tR / trades.length : 0;
      const [y, m] = ym.split('-');
      const label = new Date(+y, +m - 1).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'short', year: 'numeric' });
      return { ym, label, days: mDays.length, trades: trades.length, wins, losses, be, totalR: tR, totalWinR: wR, totalLossR: lR, avgWinR: wins > 0 ? wR / wins : 0, avgLossR: losses > 0 ? lR / losses : 0, pnl, ev, wr: trades.length > 0 ? (wins / trades.length) * 100 : 0 };
    });
  }, [completeDays, isRTL]);

  const runningR = useMemo(() => {
    let acc = 0;
    return [...monthlyRecap].reverse().map(m => { acc += m.totalR; return { ...m, runningR: acc }; }).reverse();
  }, [monthlyRecap]);

  // ─── Yearly Recap ───
  const yearlyRecap = useMemo(() => {
    const map: Record<string, JournalDay[]> = {};
    completeDays.forEach(d => { const yr = d.date.slice(0, 4); if (!map[yr]) map[yr] = []; map[yr].push(d); });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).map(([yr, yDays]) => {
      const trades = yDays.flatMap(d => d.trades || []);
      const wins = trades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
      const losses = trades.filter(t => (parseFloat(t.pnl) || 0) < 0).length;
      const be = trades.length - wins - losses;
      const wR = trades.reduce((s, t) => { const r = getTradeR(t); return r > 0 ? s + r : s; }, 0);
      const lR = trades.reduce((s, t) => { const r = getTradeR(t); return r < 0 ? s + Math.abs(r) : s; }, 0);
      const tR = trades.reduce((s, t) => s + getTradeR(t), 0);
      const pnl = yDays.reduce((s, d) => s + sumPnl(d), 0);
      return { year: yr, days: yDays.length, trades: trades.length, wins, losses, be, totalR: tR, totalWinR: wR, totalLossR: lR, avgWinR: wins > 0 ? wR / wins : 0, avgLossR: losses > 0 ? lR / losses : 0, pnl, ev: trades.length > 0 ? tR / trades.length : 0, wr: trades.length > 0 ? (wins / trades.length) * 100 : 0 };
    });
  }, [completeDays]);

  if (completeDays.length < 1) return (
    <div style={{ textAlign: 'center', padding: 60, color: th.tx3, fontFamily: "'Poppins',sans-serif" }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>📊</div>
      <div style={{ fontSize: 14, fontWeight: 600 }}>{isRTL ? 'צריך לפחות יום אחד שלם עם עסקאות' : 'Need at least 1 complete day with trades'}</div>
    </div>
  );

  const heatColor = (r: number | null) => {
    if (r === null) return th.inputBg;
    if (r >= 3) return '#00FFA3';
    if (r >= 1) return 'rgba(0,255,163,0.6)';
    if (r >= 0) return 'rgba(0,255,163,0.25)';
    if (r >= -1) return 'rgba(255,77,77,0.3)';
    if (r >= -2) return 'rgba(255,77,77,0.55)';
    return '#FF4D4D';
  };

  const monthLabel = new Date(heatMonth.y, heatMonth.m).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* ═══ HERO STATS ═══ */}
      <IntelCard delay={0} th={th} accent="#00FFA3" style={{ background: `linear-gradient(165deg, ${th.cardBg}, rgba(0,255,163,0.02))` }}>
        <SectionLabel icon="⚡" text={isRTL ? 'סיכום ביצוע' : 'PERFORMANCE OVERVIEW'} accent="#00FFA3" th={th} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }} className="j-grid-2col">
          <MiniStat label={isRTL ? 'סה"כ R' : 'Total R'} value={`${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`} color={totalR >= 0 ? '#00FFA3' : '#FF4D4D'} th={th} />
          <MiniStat label="P&L" value={`${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)}$`} color={totalPnl >= 0 ? '#00FFA3' : '#FF4D4D'} th={th} />
          <MiniStat label={isRTL ? 'הצלחה' : 'Win Rate'} value={`${winRate.toFixed(0)}%`} color={winRate >= 50 ? '#00FFA3' : '#FF4D4D'} sub={`${totalWins}W/${totalLosses}L/${totalBE}BE`} th={th} />
          <MiniStat label="PF" value={profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)} color={profitFactor >= 1.5 ? '#00FFA3' : profitFactor >= 1 ? '#FFC857' : '#FF4D4D'} th={th} />
          <MiniStat label="EV" value={`${expectancy >= 0 ? '+' : ''}${expectancy.toFixed(2)}R`} color={expectancy >= 0 ? '#00FFA3' : '#FF4D4D'} th={th} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 8 }} className="j-grid-2col">
          <MiniStat label={isRTL ? 'עסקאות' : 'Trades'} value={String(totalTrades)} color="#5AA9FF" th={th} />
          <MiniStat label={isRTL ? 'ממ. נצחון' : 'Avg Win'} value={`+${avgWinR.toFixed(2)}R`} color="#00FFA3" th={th} />
          <MiniStat label={isRTL ? 'ממ. הפסד' : 'Avg Loss'} value={`-${avgLossR.toFixed(2)}R`} color="#FF4D4D" th={th} />
          <MiniStat label={isRTL ? 'ציון' : 'Score'} value={avgScore.toFixed(1)} color="#b794f6" sub="/10" th={th} />
          <MiniStat label={isRTL ? 'ימים' : 'Days'} value={String(completeDays.length)} color="#FFC857" th={th} />
        </div>
      </IntelCard>

      {/* ═══ ROW: STREAK + DRAWDOWN + CONSISTENCY ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="j-grid-2col">
        {/* Streak Analysis */}
        <IntelCard delay={80} accent="#FFC857" th={th}>
          <SectionLabel icon="🔥" text={isRTL ? 'רצפים' : 'STREAKS'} accent="#FFC857" th={th} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(0,255,163,0.04)', borderRadius: 10 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1.5px', marginBottom: 4 }}>{isRTL ? 'שיא נצחונות' : 'BEST WIN'}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#00FFA3', fontFamily: "'JetBrains Mono',monospace" }}>{streaks.bestWin}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,77,77,0.04)', borderRadius: 10 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1.5px', marginBottom: 4 }}>{isRTL ? 'שיא הפסדים' : 'MAX LOSS'}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#FF4D4D', fontFamily: "'JetBrains Mono',monospace" }}>{streaks.bestLoss}</div>
            </div>
          </div>
          <div style={{ marginTop: 10, padding: '10px 12px', background: th.inputBg, borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1.5px', marginBottom: 4 }}>{isRTL ? 'רצף נוכחי' : 'CURRENT'}</div>
            <span style={{ fontSize: 18, fontWeight: 800, color: streaks.currentStreakType === 'win' ? '#00FFA3' : '#FF4D4D', fontFamily: "'JetBrains Mono',monospace" }}>
              {streaks.currentStreak} {streaks.currentStreakType === 'win' ? '🟢' : '🔴'}
            </span>
          </div>
          {streaks.postWinCount >= 1 && (
            <div style={{ marginTop: 8, fontSize: 10, color: th.tx3, lineHeight: 1.6 }}>
              {isRTL ? `אחרי נצחון: ${streaks.postWinAvg.toFixed(2)}R` : `Post-win: ${streaks.postWinAvg.toFixed(2)}R`} · {isRTL ? `אחרי הפסד: ${streaks.postLossAvg.toFixed(2)}R` : `Post-loss: ${streaks.postLossAvg.toFixed(2)}R`}
            </div>
          )}
        </IntelCard>

        {/* Drawdown Tracker */}
        <IntelCard delay={160} accent="#FF4D4D" th={th}>
          <SectionLabel icon="📉" text={isRTL ? 'מעקב ירידות' : 'DRAWDOWN'} accent="#FF4D4D" th={th} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div style={{ textAlign: 'center', padding: '12px 8px', background: 'rgba(255,77,77,0.04)', borderRadius: 10 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1.5px', marginBottom: 4 }}>MAX DD</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#FF4D4D', fontFamily: "'JetBrains Mono',monospace" }}>{drawdown.maxDD.toFixed(2)}R</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 8px', background: drawdown.currentDD > 0 ? 'rgba(255,200,87,0.04)' : 'rgba(0,255,163,0.04)', borderRadius: 10 }}>
              <div style={{ fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1.5px', marginBottom: 4 }}>{isRTL ? 'נוכחי' : 'CURRENT'}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: drawdown.currentDD > 0 ? '#FFC857' : '#00FFA3', fontFamily: "'JetBrains Mono',monospace" }}>{drawdown.currentDD.toFixed(2)}R</div>
            </div>
          </div>
          <div style={{ padding: '8px 12px', background: th.inputBg, borderRadius: 8, textAlign: 'center', marginBottom: 8 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1.5px', marginBottom: 2 }}>{isRTL ? 'מקדם התאוששות' : 'RECOVERY FACTOR'}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: drawdown.recoveryFactor >= 2 ? '#00FFA3' : '#FFC857', fontFamily: "'JetBrains Mono',monospace" }}>{drawdown.recoveryFactor === Infinity ? '∞' : drawdown.recoveryFactor.toFixed(2)}</div>
          </div>
          {/* Mini sparkline */}
          {drawdown.equity.length > 2 && (
            <svg width="100%" height="32" viewBox={`0 0 ${drawdown.equity.length} 32`} preserveAspectRatio="none" style={{ borderRadius: 4, overflow: 'hidden' }}>
              {(() => {
                const eq = drawdown.equity;
                const min = Math.min(...eq), max = Math.max(...eq);
                const range = max - min || 1;
                const pts = eq.map((v, i) => `${i},${30 - ((v - min) / range) * 28}`).join(' ');
                return <polyline points={pts} fill="none" stroke={totalR >= 0 ? '#00FFA3' : '#FF4D4D'} strokeWidth="1.5" opacity="0.7" />;
              })()}
            </svg>
          )}
        </IntelCard>

        {/* Consistency Metrics */}
        <IntelCard delay={240} accent="#5AA9FF" th={th}>
          <SectionLabel icon="📊" text={isRTL ? 'עקביות' : 'CONSISTENCY'} accent="#5AA9FF" th={th} />
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: th.inputBg, borderRadius: 8 }}>
              <span style={{ fontSize: 10, color: th.tx3, fontWeight: 700 }}>{isRTL ? 'ימים ירוקים' : 'Green Days'}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: consistency.greenRatio >= 55 ? '#00FFA3' : '#FFC857', fontFamily: "'JetBrains Mono',monospace" }}>{consistency.greenRatio.toFixed(0)}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: th.inputBg, borderRadius: 8 }}>
              <span style={{ fontSize: 10, color: th.tx3, fontWeight: 700 }}>Sharpe</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: consistency.sharpe >= 1 ? '#00FFA3' : consistency.sharpe >= 0.5 ? '#FFC857' : '#FF4D4D', fontFamily: "'JetBrains Mono',monospace" }}>{consistency.sharpe.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: th.inputBg, borderRadius: 8 }}>
              <span style={{ fontSize: 10, color: th.tx3, fontWeight: 700 }}>{isRTL ? 'סטיית תקן' : 'Std Dev'}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: th.tx2, fontFamily: "'JetBrains Mono',monospace" }}>{consistency.stdDev.toFixed(2)}R</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: th.inputBg, borderRadius: 8 }}>
              <span style={{ fontSize: 10, color: th.tx3, fontWeight: 700 }}>{isRTL ? 'ריכוז רווח' : 'Profit Conc.'}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: consistency.concentration > 50 ? '#FFC857' : '#00FFA3', fontFamily: "'JetBrains Mono',monospace" }}>{consistency.concentration.toFixed(0)}%</span>
            </div>
          </div>
        </IntelCard>
      </div>

      {/* ═══ R-DISTRIBUTION HISTOGRAM ═══ */}
      {rDistribution.buckets.length > 0 && (
        <IntelCard delay={320} accent="#b794f6" th={th}>
          <SectionLabel icon="📐" text={isRTL ? 'התפלגות R' : 'R-DISTRIBUTION'} accent="#b794f6" th={th} />
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 100, marginBottom: 8 }}>
            {rDistribution.buckets.map((b, i) => {
              const maxC = Math.max(...rDistribution.buckets.map(x => x.count), 1);
              const barH = Math.max(4, (b.count / maxC) * 90);
              const isNeg = b.min < 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                  {b.count > 0 && <span style={{ fontSize: 8, fontWeight: 700, color: th.tx3 }}>{b.count}</span>}
                  <div style={{ width: '80%', height: barH, borderRadius: 4, background: isNeg ? `linear-gradient(180deg, #FF4D4D, rgba(255,77,77,0.4))` : `linear-gradient(180deg, #00FFA3, rgba(0,255,163,0.4))`, transition: 'height .6s cubic-bezier(0.16,1,0.3,1)' }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {rDistribution.buckets.map((b, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 7, color: th.tx3, fontWeight: 600 }}>{b.label}</div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, justifyContent: 'center' }}>
            {[
              { l: isRTL ? 'חציון' : 'Median', v: `${rDistribution.median.toFixed(2)}R` },
              { l: isRTL ? 'הטיה' : 'Skew', v: rDistribution.skew.toFixed(2) },
              { l: isRTL ? 'מוד' : 'Mode', v: rDistribution.mode },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: th.tx3, letterSpacing: '1px' }}>{s.l}</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#b794f6', fontFamily: "'JetBrains Mono',monospace" }}>{s.v}</div>
              </div>
            ))}
          </div>
        </IntelCard>
      )}

      {/* ═══ ROW: TRADE FREQUENCY + MONTHLY HEATMAP ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }} className="j-grid-2col">
        {/* Trade Frequency */}
        <IntelCard delay={400} accent="#FFC857" th={th}>
          <SectionLabel icon="⚡" text={isRTL ? 'תדירות מסחר' : 'TRADE FREQUENCY'} accent="#FFC857" th={th} />
          <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: th.inputBg, borderRadius: 8 }}>
              <span style={{ fontSize: 10, color: th.tx3, fontWeight: 700 }}>{isRTL ? 'ממוצע/יום' : 'Avg/Day'}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#5AA9FF', fontFamily: "'JetBrains Mono',monospace" }}>{frequency.avgTradesPerDay.toFixed(1)}</span>
            </div>
            {frequency.optimal && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,255,163,0.04)', borderRadius: 8, border: '1px solid rgba(0,255,163,0.1)' }}>
                <span style={{ fontSize: 10, color: '#00FFA3', fontWeight: 700 }}>{isRTL ? 'אופטימלי' : 'Optimal'}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#00FFA3', fontFamily: "'JetBrains Mono',monospace" }}>{frequency.optimal.trades} {isRTL ? 'עסקאות' : 'trades'}</span>
              </div>
            )}
          </div>
          {frequency.overtradingDays > 0 && (
            <div style={{ padding: '8px 12px', background: frequency.overtradingAvgR < 0 ? 'rgba(255,77,77,0.05)' : 'rgba(255,200,87,0.05)', borderRadius: 8, border: `1px solid ${frequency.overtradingAvgR < 0 ? 'rgba(255,77,77,0.12)' : 'rgba(255,200,87,0.12)'}` }}>
              <div style={{ fontSize: 9, color: frequency.overtradingAvgR < 0 ? '#FF4D4D' : '#FFC857', fontWeight: 700, marginBottom: 4 }}>{isRTL ? `${frequency.overtradingDays} ימי מסחר-יתר (4+)` : `${frequency.overtradingDays} overtrading days (4+)`}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: frequency.overtradingAvgR < 0 ? '#FF4D4D' : '#FFC857', fontFamily: "'JetBrains Mono',monospace" }}>{isRTL ? 'ממוצע' : 'Avg'}: {frequency.overtradingAvgR.toFixed(2)}R</div>
            </div>
          )}
          {/* Frequency bars */}
          {frequency.entries.length > 0 && (
            <div style={{ marginTop: 10, display: 'flex', gap: 4, alignItems: 'flex-end', height: 50 }}>
              {frequency.entries.sort((a, b) => a.trades - b.trades).map(e => {
                const maxD = Math.max(...frequency.entries.map(x => x.days), 1);
                const h = Math.max(6, (e.days / maxD) * 45);
                const c = e.avgR >= 0 ? '#00FFA3' : '#FF4D4D';
                return (
                  <div key={e.trades} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 7, fontWeight: 700, color: c }}>{e.avgR.toFixed(1)}R</span>
                    <div style={{ width: '70%', height: h, borderRadius: 3, background: c, opacity: 0.6 }} />
                    <span style={{ fontSize: 8, color: th.tx3, fontWeight: 700 }}>{e.trades}t</span>
                  </div>
                );
              })}
            </div>
          )}
        </IntelCard>

        {/* Monthly Heatmap */}
        <IntelCard delay={480} accent="#00FFA3" th={th}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <SectionLabel icon="🗓" text={isRTL ? 'מפת חום חודשית' : 'MONTHLY HEATMAP'} accent="#00FFA3" th={th} />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={() => setHeatMonth(p => p.m === 0 ? { y: p.y - 1, m: 11 } : { ...p, m: p.m - 1 })} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${th.inputBr}`, background: th.inputBg, cursor: 'pointer', color: th.tx3, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <span style={{ fontSize: 11, fontWeight: 700, color: th.tx2, fontFamily: "'Poppins',sans-serif", minWidth: 90, textAlign: 'center' }}>{monthLabel}</span>
              <button onClick={() => setHeatMonth(p => p.m === 11 ? { y: p.y + 1, m: 0 } : { ...p, m: p.m + 1 })} style={{ width: 24, height: 24, borderRadius: 6, border: `1px solid ${th.inputBr}`, background: th.inputBg, cursor: 'pointer', color: th.tx3, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
          </div>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 4 }}>
            {(isRTL ? ['א','ב','ג','ד','ה','ו','ש'] : ['S','M','T','W','T','F','S']).map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 8, fontWeight: 700, color: th.tx3, padding: 2 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
            {heatmapData.cells.map((cell, i) => (
              <div key={i} style={{
                aspectRatio: '1', borderRadius: 5,
                background: cell.day === null ? 'transparent' : heatColor(cell.r),
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                transition: 'all .3s', position: 'relative',
                border: cell.day !== null && cell.hasTrades ? `1px solid ${cell.r !== null && cell.r >= 0 ? 'rgba(0,255,163,0.2)' : 'rgba(255,77,77,0.2)'}` : '1px solid transparent',
              }}>
                {cell.day !== null && (
                  <>
                    <span style={{ fontSize: 9, fontWeight: 700, color: cell.hasTrades ? '#fff' : th.tx3, opacity: cell.hasTrades ? 0.9 : 0.4 }}>{cell.day}</span>
                    {cell.r !== null && <span style={{ fontSize: 6, fontWeight: 800, color: '#fff', opacity: 0.8 }}>{cell.r >= 0 ? '+' : ''}{cell.r.toFixed(1)}</span>}
                  </>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, padding: '6px 0' }}>
            <span style={{ fontSize: 9, color: th.tx3 }}>{isRTL ? `${heatmapData.tradeDays} ימי מסחר` : `${heatmapData.tradeDays} trade days`}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: heatmapData.monthR >= 0 ? '#00FFA3' : '#FF4D4D', fontFamily: "'JetBrains Mono',monospace" }}>{heatmapData.monthR >= 0 ? '+' : ''}{heatmapData.monthR.toFixed(2)}R</span>
          </div>
        </IntelCard>
      </div>

      {/* ═══ DECISION QUALITY MATRIX ═══ */}
      {decisionQuality.total > 0 && (
        <IntelCard delay={540} accent="#b794f6" th={th}>
          <SectionLabel icon="🎯" text={isRTL ? 'איכות החלטות' : 'DECISION QUALITY'} accent="#b794f6" th={th} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {[
              { l: isRTL ? 'החלטה טובה + תוצאה טובה' : 'Good Decision + Good Outcome', v: decisionQuality.goodDecGoodOut, c: '#00FFA3', icon: '✅' },
              { l: isRTL ? 'החלטה טובה + תוצאה רעה' : 'Good Decision + Bad Outcome', v: decisionQuality.goodDecBadOut, c: '#5AA9FF', icon: '🔵' },
              { l: isRTL ? 'החלטה רעה + תוצאה טובה' : 'Bad Decision + Good Outcome', v: decisionQuality.badDecGoodOut, c: '#FFC857', icon: '⚠️' },
              { l: isRTL ? 'החלטה רעה + תוצאה רעה' : 'Bad Decision + Bad Outcome', v: decisionQuality.badDecBadOut, c: '#FF4D4D', icon: '❌' },
            ].map(q => (
              <div key={q.l} style={{ padding: '14px 12px', background: `${q.c}06`, border: `1px solid ${q.c}12`, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{q.icon}</span>
                <div>
                  <div style={{ fontSize: 9, color: th.tx3, fontWeight: 700, marginBottom: 4, lineHeight: 1.4 }}>{q.l}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: q.c, fontFamily: "'JetBrains Mono',monospace" }}>{q.v}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: '8px 14px', background: 'rgba(183,148,246,0.05)', borderRadius: 8, fontSize: 10, color: th.tx3, lineHeight: 1.6 }}>
            💡 {isRTL ? 'מבוסס על מחויבות יומית (החלטה) ותוצאת P&L (תוצאה). אל תשפוט ביצוע רק לפי תוצאות.' : 'Based on daily commitment (decision) and P&L outcome. Don\'t judge execution by outcomes alone.'}
          </div>
        </IntelCard>
      )}

      {/* ═══ PATTERN RECOGNITION ═══ */}
      <IntelCard delay={620} accent="#b794f6" th={th}>
        <SectionLabel icon="🧠" text={isRTL ? 'זיהוי דפוסים' : 'PATTERN RECOGNITION'} accent="#b794f6" th={th} />
        <div style={{ display: 'grid', gap: 8 }}>
          {bestDay && bestDay.avgR > 0 && <InsightRow icon="📅" text={isRTL ? `יום טוב: ${bestDay.name} (${bestDay.avgR.toFixed(2)}R, ${bestDay.wr.toFixed(0)}%, ${bestDay.count}d)` : `Best: ${bestDay.name} (${bestDay.avgR.toFixed(2)}R, ${bestDay.wr.toFixed(0)}%, ${bestDay.count}d)`} type="success" th={th} delay={0} />}
          {worstDay && worstDay.avgR < 0 && <InsightRow icon="🚫" text={isRTL ? `יום גרוע: ${worstDay.name} (${worstDay.avgR.toFixed(2)}R). הקטן סיכון.` : `Worst: ${worstDay.name} (${worstDay.avgR.toFixed(2)}R). Reduce risk.`} type="warning" th={th} delay={80} />}
          {byAsset.length >= 2 && byAsset[0].r > 0 && <InsightRow icon="🪙" text={isRTL ? `נכס מוביל: ${byAsset[0].asset} (+${byAsset[0].r.toFixed(2)}R). ${byAsset[byAsset.length - 1].r < 0 ? `מפסיד: ${byAsset[byAsset.length - 1].asset} (${byAsset[byAsset.length - 1].r.toFixed(2)}R).` : ''}` : `Top asset: ${byAsset[0].asset} (+${byAsset[0].r.toFixed(2)}R). ${byAsset[byAsset.length - 1].r < 0 ? `Worst: ${byAsset[byAsset.length - 1].asset} (${byAsset[byAsset.length - 1].r.toFixed(2)}R).` : ''}`} type="success" th={th} delay={160} />}
          {emotionInsights.map((ins, i) => <InsightRow key={i} icon={ins.icon} text={ins.text} type={ins.type} th={th} delay={240 + i * 60} />)}
        </div>
      </IntelCard>

      {/* ═══ WEEKDAY + ASSET ROW ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="j-grid-2col">
        {byWeekday.length > 0 && (
          <IntelCard delay={700} accent="#5AA9FF" th={th}>
            <SectionLabel icon="📅" text={isRTL ? 'ימים בשבוע' : 'WEEKDAY'} accent="#5AA9FF" th={th} />
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 90 }}>
              {byWeekday.map(wd => {
                const maxR = Math.max(...byWeekday.map(w => Math.abs(w.avgR)), 0.5);
                const barH = Math.max(6, (Math.abs(wd.avgR) / maxR) * 75);
                const c = wd.avgR >= 0 ? '#00FFA3' : '#FF4D4D';
                return (
                  <div key={wd.dow} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: c, fontFamily: "'JetBrains Mono',monospace" }}>{wd.avgR >= 0 ? '+' : ''}{wd.avgR.toFixed(1)}</span>
                    <div style={{ width: '65%', height: barH, borderRadius: 4, background: `linear-gradient(180deg, ${c}, ${c}50)`, transition: 'height .6s ease' }} />
                    <span style={{ fontSize: 8, fontWeight: 700, color: th.tx3 }}>{wd.name}</span>
                  </div>
                );
              })}
            </div>
          </IntelCard>
        )}

        {byAsset.length > 0 && (
          <IntelCard delay={780} accent="#FFC857" th={th}>
            <SectionLabel icon="🪙" text={isRTL ? 'נכסים' : 'ASSETS'} accent="#FFC857" th={th} />
            <div style={{ display: 'grid', gap: 4 }}>
              {byAsset.slice(0, 6).map(a => {
                const c = a.r >= 0 ? '#00FFA3' : '#FF4D4D';
                const maxR = Math.max(...byAsset.map(x => Math.abs(x.r)), 1);
                const barW = Math.max(8, (Math.abs(a.r) / maxR) * 100);
                return (
                  <div key={a.asset} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: `${c}04`, borderRadius: 8 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: th.tx, minWidth: 60, fontFamily: "'JetBrains Mono',monospace" }}>{a.asset}</span>
                    <div style={{ flex: 1, height: 4, background: th.inputBg, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barW}%`, background: c, borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: c, minWidth: 45, textAlign: 'right', fontFamily: "'JetBrains Mono',monospace" }}>{a.r >= 0 ? '+' : ''}{a.r.toFixed(1)}R</span>
                  </div>
                );
              })}
            </div>
          </IntelCard>
        )}
      </div>

      {/* ═══ STRATEGY ANALYSIS ═══ */}
      {byStrategy.length > 0 && (
        <IntelCard delay={860} accent="#b794f6" th={th}>
          <SectionLabel icon="⚔️" text={isRTL ? 'אסטרטגיה' : 'STRATEGY'} accent="#b794f6" th={th} />
          <div style={{ display: 'grid', gridTemplateColumns: byStrategy.length > 2 ? 'repeat(3,1fr)' : `repeat(${byStrategy.length},1fr)`, gap: 8 }} className="j-grid-2col">
            {byStrategy.map(s => {
              const c = s.r >= 0 ? '#00FFA3' : '#FF4D4D';
              return (
                <div key={s.name} style={{ background: `${c}06`, border: `1px solid ${c}12`, borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: th.tx, marginBottom: 6 }}>{s.name}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: c, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 }}>{s.r >= 0 ? '+' : ''}{s.r.toFixed(2)}R</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 8, fontSize: 9 }}>
                    <span style={{ color: th.tx3 }}>{s.count}t</span>
                    <span style={{ color: s.wr >= 50 ? '#00FFA3' : '#FF4D4D' }}>{s.wr.toFixed(0)}%</span>
                    <span style={{ color: s.avgR >= 0 ? '#00FFA3' : '#FF4D4D' }}>{s.avgR.toFixed(2)}R</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(183,148,246,0.04)', borderRadius: 8, fontSize: 9, color: th.tx3 }}>
            💡 {isRTL ? 'הזן MSB + BOS, BOS, או Daily Open בהערות הביצוע.' : 'Enter MSB + BOS, BOS, or Daily Open in trade notes.'}
          </div>
        </IntelCard>
      )}

      {/* ═══ MONTHLY RECAP (compact) ═══ */}
      {monthlyRecap.length > 0 && (
        <IntelCard delay={940} accent="#FFC857" th={th}>
          <SectionLabel icon="📅" text={isRTL ? 'סיכום חודשי' : 'MONTHLY RECAP'} accent="#FFC857" th={th} />
          <div style={{ display: 'grid', gap: 6 }}>
            {runningR.map(m => {
              const c = m.totalR >= 0 ? '#00FFA3' : '#FF4D4D';
              return (
                <div key={m.ym} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: `${c}04`, borderRadius: 10, border: `1px solid ${c}10`, gap: 8, flexWrap: 'wrap' as const }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: th.tx, minWidth: 80 }}>{m.label}</span>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' as const }}>
                    <span style={{ fontSize: 8, color: th.tx3, fontWeight: 700 }}>{m.trades}t</span>
                    <span style={{ fontSize: 8, color: m.wr >= 50 ? '#00FFA3' : '#FF4D4D', fontWeight: 700 }}>{m.wr.toFixed(0)}%</span>
                    <span style={{ fontSize: 8, color: th.tx3, fontWeight: 700 }}>EV {m.ev >= 0 ? '+' : ''}{m.ev.toFixed(2)}R</span>
                    <span style={{ fontSize: 8, color: m.runningR >= 0 ? '#00FFA3' : '#FF4D4D', fontWeight: 700 }}>{isRTL ? 'מצטבר' : 'Run'} {m.runningR >= 0 ? '+' : ''}{m.runningR.toFixed(1)}R</span>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: c, fontFamily: "'JetBrains Mono',monospace" }}>{m.totalR >= 0 ? '+' : ''}{m.totalR.toFixed(2)}R</span>
                </div>
              );
            })}
          </div>
        </IntelCard>
      )}

      {/* ═══ YEARLY RECAP ═══ */}
      {yearlyRecap.length > 0 && (
        <IntelCard delay={1020} accent="#D4AF37" th={th}>
          <SectionLabel icon="🏆" text={isRTL ? 'שנתי' : 'YEARLY'} accent="#D4AF37" th={th} />
          {yearlyRecap.map(yr => {
              const c = yr.totalR >= 0 ? '#00FFA3' : '#FF4D4D';
              return (
                <div key={yr.year} style={{ background: 'rgba(212,175,55,0.03)', border: '1px solid rgba(212,175,55,0.12)', borderRadius: 16, padding: '22px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 24, fontWeight: 800, color: '#D4AF37' }}>{yr.year}</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 28, fontWeight: 800, color: c, lineHeight: 1 }}>{yr.totalR >= 0 ? '+' : ''}{yr.totalR.toFixed(2)}R</div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: c, opacity: 0.7, marginTop: 2 }}>{yr.pnl >= 0 ? '+' : ''}{yr.pnl.toFixed(0)}$</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }} className="j-grid-2col">
                    {[
                      { l: isRTL ? 'עסקאות' : 'Trades', v: String(yr.trades), c: '#5AA9FF' },
                      { l: isRTL ? 'ניצחונות' : 'W/L/BE', v: `${yr.wins}/${yr.losses}/${yr.be}`, c: th.tx2 },
                      { l: isRTL ? 'הצלחה' : 'Win%', v: `${yr.wr.toFixed(0)}%`, c: yr.wr >= 50 ? '#00FFA3' : '#FF4D4D' },
                      { l: isRTL ? 'ימי מסחר' : 'Days', v: String(yr.days), c: '#FFC857' },
                      { l: 'EV', v: `${yr.ev >= 0 ? '+' : ''}${yr.ev.toFixed(3)}R`, c: yr.ev >= 0 ? '#00FFA3' : '#FF4D4D' },
                      { l: isRTL ? 'ממוצע נצחון' : 'Avg Win', v: `+${yr.avgWinR.toFixed(2)}R`, c: '#00FFA3' },
                    ].map(s => (
                      <div key={s.l} style={{ textAlign: 'center', padding: '8px 4px', background: `${s.c}06`, borderRadius: 8 }}>
                        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 7, fontWeight: 700, letterSpacing: '1.5px', color: th.tx3, textTransform: 'uppercase' as const }}>{s.l}</div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: s.c, marginTop: 3 }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </AnimCard>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// DAILY INTELLIGENCE PANEL (Calendar Overlay)
// ═══════════════════════════════════════════════════════════════
const DailyIntelligencePanel = ({ day, dir, th, onClose, onOpenJournal }: {
  day: JournalDay; dir: string; th: typeof THEMES.dark; onClose: () => void; onOpenJournal: (id: string) => void;
}) => {
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const isRTL = dir === 'rtl';
  const trades = day.trades || [];
  const pnl = sumPnl(day);
  const wins = numWins(day);
  const totalR = trades.reduce((s, t) => s + (parseFloat(t.rr) || 0), 0);
  const winRate = trades.length > 0 ? ((wins / trades.length) * 100).toFixed(0) : '0';
  const negR = sumNegR(trades);
  const dateFmt = fmtFull(day.date, isRTL ? 'he-IL' : 'en-US');

  const runAI = () => {
    if (trades.length === 0 && !day.morningSaved) return;
    setAiLoading(true);
    setTimeout(() => {
      const lines: string[] = [];
      // Plan adherence
      if (day.plan && trades.length > 0) {
        lines.push(isRTL ? '📋 תוכנית המסחר הוגדרה בבוקר — ' : '📋 A trading plan was set in the morning — ');
        const planLen = day.plan.length;
        lines[0] += planLen > 80
          ? (isRTL ? 'תוכנית מפורטת, סימן חיובי למשמעת.' : 'detailed plan, a positive sign for discipline.')
          : (isRTL ? 'תוכנית קצרה, שקול להרחיב בימים הבאים.' : 'brief plan — consider expanding in future days.');
      } else if (!day.plan && trades.length > 0) {
        lines.push(isRTL ? '⚠️ לא הוגדרה תוכנית בוקר — עסקאות בוצעו ללא הכנה ברורה.' : '⚠️ No morning plan was set — trades were taken without clear preparation.');
      }
      // Mistakes
      if (day.mistakes) {
        lines.push(isRTL ? `🔴 טעויות שצוינו: "${day.mistakes.slice(0, 80)}${day.mistakes.length > 80 ? '...' : ''}"` : `🔴 Noted mistakes: "${day.mistakes.slice(0, 80)}${day.mistakes.length > 80 ? '...' : ''}"`);
      }
      // Strong decisions
      if (day.wins) {
        lines.push(isRTL ? `🟢 החלטות טובות: "${day.wins.slice(0, 80)}${day.wins.length > 80 ? '...' : ''}"` : `🟢 Strong decisions: "${day.wins.slice(0, 80)}${day.wins.length > 80 ? '...' : ''}"`);
      }
      // Emotional patterns
      if (day.emotionScore <= 3) {
        lines.push(isRTL ? '😟 ציון רגשי נמוך — יום מאתגר מבחינה פסיכולוגית.' : '😟 Low emotional score — psychologically challenging day.');
      } else if (day.emotionScore >= 8) {
        lines.push(isRTL ? '😊 ציון רגשי גבוה — מצב מנטלי מצוין.' : '😊 High emotional score — excellent mental state.');
      }
      // R performance
      if (totalR > 0) {
        lines.push(isRTL ? `✅ יום חיובי ב-R: +${totalR.toFixed(2)}R — ביצוע איכותי.` : `✅ Positive R day: +${totalR.toFixed(2)}R — quality execution.`);
      } else if (totalR < 0 && trades.length > 0) {
        lines.push(isRTL ? `📉 יום שלילי ב-R: ${totalR.toFixed(2)}R — נדרשת סקירה.` : `📉 Negative R day: ${totalR.toFixed(2)}R — review needed.`);
      }
      // Overtrading
      if (trades.length >= 4) {
        lines.push(isRTL ? `⚡ ${trades.length} עסקאות — שקול האם מדובר במסחר-יתר.` : `⚡ ${trades.length} trades — consider if overtrading occurred.`);
      }
      // Improvement
      if (day.lessons) {
        lines.push(isRTL ? `💡 לקחים: "${day.lessons.slice(0, 80)}${day.lessons.length > 80 ? '...' : ''}"` : `💡 Lessons: "${day.lessons.slice(0, 80)}${day.lessons.length > 80 ? '...' : ''}"`);
      }
      if (lines.length === 0) {
        lines.push(isRTL ? 'אין מספיק נתונים לניתוח מעמיק.' : 'Not enough data for deep analysis.');
      }
      setAiResult(lines.join('\n\n'));
      setAiLoading(false);
    }, 800);
  };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const S = {
    stat: { padding: '14px 10px', background: th.inputBg, borderRadius: 12, textAlign: 'center' as const, border: `1px solid ${th.cardBr}` },
    label: { fontSize: 9, color: th.tx3, textTransform: 'uppercase' as const, letterSpacing: '1.2px', fontFamily: "'Poppins',sans-serif", fontWeight: 700 },
    value: { fontSize: 22, fontWeight: 800, fontFamily: "'JetBrains Mono',monospace", marginTop: 4 },
    section: { marginBottom: 20 },
    secTitle: { fontSize: 10, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' as const, fontFamily: "'Poppins',sans-serif", marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 },
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'j-fade-in .25s ease-out',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '94%', maxWidth: 760, maxHeight: '90vh', overflow: 'hidden',
        background: 'linear-gradient(165deg, #0d1117 0%, #0a0e1a 50%, #0d1117 100%)',
        border: '1px solid rgba(90,169,255,0.15)',
        borderRadius: 18,
        boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 40px rgba(90,169,255,0.08)',
        animation: 'j-scale-in .3s cubic-bezier(0.16,1,0.3,1)',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '22px 28px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: `linear-gradient(135deg, ${pnl >= 0 ? 'rgba(0,255,163,0.04)' : 'rgba(255,77,77,0.04)'}, transparent)`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 9, color: th.tx3, fontFamily: "'Poppins',sans-serif", fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 4 }}>
                {isRTL ? '📊 דוח יומי מקיף' : '📊 DAILY INTELLIGENCE REPORT'}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Poppins',sans-serif", color: th.tx }}>{dateFmt}</div>
              <div style={{ fontSize: 11, color: th.tx3, marginTop: 4, fontFamily: "'JetBrains Mono',monospace" }}>
                {isRTL ? `יום ${day.dayNum || '—'} • שבוע ${day.weekNum || '—'}` : `Day ${day.dayNum || '—'} • Week ${day.weekNum || '—'}`}
              </div>
            </div>
            <button onClick={onClose} style={{
              width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)', color: th.tx3, fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}>×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '22px 28px 30px', flex: 1, direction: dir as any }}>
          {/* SECTION 1 — Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 24 }} className="j-grid-2col">
            {[
              { l: isRTL ? 'סה"כ עסקאות' : 'Trades', v: String(trades.length), c: '#5AA9FF' },
              { l: isRTL ? 'תוצאה נטו' : 'Net R', v: `${totalR >= 0 ? '+' : ''}${totalR.toFixed(2)}R`, c: totalR >= 0 ? '#00FFA3' : '#FF4D4D' },
              { l: isRTL ? 'אחוז הצלחה' : 'Win Rate', v: `${winRate}%`, c: parseInt(winRate) >= 50 ? '#00FFA3' : '#FF4D4D' },
              { l: isRTL ? 'ממוצע R' : 'Avg R', v: trades.length > 0 ? `${(totalR / trades.length).toFixed(2)}R` : '—', c: totalR >= 0 ? '#00FFA3' : '#FF4D4D' },
              { l: isRTL ? 'סיכון יומי' : 'Risk Used', v: `${negR.toFixed(1)}R`, c: negR <= -3 ? '#FF4D4D' : negR <= -2 ? '#FFC857' : '#00FFA3' },
            ].map((s, i) => (
              <div key={i} style={{ ...S.stat, animation: `j-fade-in ${0.2 + i * 0.06}s ease-out` }}>
                <div style={S.label}>{s.l}</div>
                <div style={{ ...S.value, color: s.c }}>{s.v}</div>
              </div>
            ))}
          </div>

          {/* SECTION 2 — Morning Analysis */}
          {day.morningSaved && (
            <div style={S.section}>
              <div style={{ ...S.secTitle, color: '#5AA9FF' }}>
                <span>☀️</span> {isRTL ? 'ניתוח בוקר' : 'Morning Analysis'}
              </div>
              <div style={{ background: 'rgba(90,169,255,0.04)', border: '1px solid rgba(90,169,255,0.12)', borderRadius: 12, padding: 16 }}>
                {day.mood && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#5AA9FF', fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>{isRTL ? 'מצב רוח' : 'MOOD'}</div>
                    <div style={{ fontSize: 13, color: th.tx2, lineHeight: 1.7 }}>{day.mood}</div>
                  </div>
                )}
                {day.plan && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#FFC857', fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>{isRTL ? 'תוכנית מסחר' : 'TRADING PLAN'}</div>
                    <div style={{ fontSize: 13, color: th.tx2, lineHeight: 1.7 }}>{day.plan}</div>
                  </div>
                )}
                {day.setups && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#b794f6', fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>{isRTL ? 'סט-אפים מתוכננים' : 'PLANNED SETUPS'}</div>
                    <div style={{ fontSize: 13, color: th.tx2, lineHeight: 1.7 }}>{day.setups}</div>
                  </div>
                )}
                {day.levels && (
                  <div>
                    <div style={{ fontSize: 9, color: '#00FFA3', fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>{isRTL ? 'רמות מפתח' : 'KEY LEVELS'}</div>
                    <div style={{ fontSize: 13, color: th.tx2, lineHeight: 1.7 }}>{day.levels}</div>
                  </div>
                )}
                {day.emotionScore > 0 && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 9, color: th.tx3, fontWeight: 700 }}>{isRTL ? 'ציון רגשי' : 'EMOTION'}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: day.emotionScore >= 7 ? '#00FFA3' : day.emotionScore >= 4 ? '#FFC857' : '#FF4D4D', fontFamily: "'JetBrains Mono',monospace" }}>{day.emotionScore}/10</div>
                  </div>
                )}
                {!day.mood && !day.plan && !day.setups && !day.levels && (
                  <div style={{ fontSize: 12, color: th.tx3, textAlign: 'center', padding: 10 }}>{isRTL ? 'נעול ללא תוכן מפורט' : 'Locked without detailed content'}</div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 3 — Trade List */}
          {trades.length > 0 && (
            <div style={S.section}>
              <div style={{ ...S.secTitle, color: '#FFC857' }}>
                <span>📈</span> {isRTL ? `עסקאות (${trades.length})` : `Trades (${trades.length})`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trades.map((tr, i) => {
                  const trPnl = parseFloat(tr.pnl) || 0;
                  const trR = parseFloat(tr.rr) || 0;
                  const isWin = trPnl > 0;
                  return (
                    <div key={i} style={{
                      background: `${isWin ? 'rgba(0,255,163,0.03)' : 'rgba(255,77,77,0.03)'}`,
                      border: `1px solid ${isWin ? 'rgba(0,255,163,0.12)' : 'rgba(255,77,77,0.12)'}`,
                      borderRadius: 10, padding: '12px 16px',
                      animation: `j-fade-in ${0.2 + i * 0.05}s ease-out`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#5AA9FF', fontFamily: "'JetBrains Mono',monospace" }}>{tr.pair || '—'}</span>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: tr.side === 'Long' ? 'rgba(0,255,163,0.1)' : 'rgba(255,77,77,0.1)', color: tr.side === 'Long' ? '#00FFA3' : '#FF4D4D' }}>{tr.side || '—'}</span>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: isWin ? '#00FFA3' : '#FF4D4D', fontFamily: "'JetBrains Mono',monospace" }}>
                          {trPnl >= 0 ? '+' : ''}{trPnl.toFixed(2)}$
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, fontSize: 10 }}>
                        {[
                          { l: 'Entry', v: tr.entry || '—' },
                          { l: 'Exit', v: tr.exit || '—' },
                          { l: 'Size', v: tr.size || '—' },
                          { l: 'R', v: `${trR >= 0 ? '+' : ''}${trR.toFixed(2)}R`, c: trR >= 0 ? '#00FFA3' : '#FF4D4D' },
                        ].map((f, fi) => (
                          <div key={fi}>
                            <span style={{ color: th.tx3, fontSize: 8, fontWeight: 700 }}>{f.l} </span>
                            <span style={{ color: (f as any).c || th.tx2, fontFamily: "'JetBrains Mono',monospace" }}>{f.v}</span>
                          </div>
                        ))}
                      </div>
                      {tr.notes && <div style={{ fontSize: 11, color: th.tx3, marginTop: 6, fontStyle: 'italic' }}>"{tr.notes}"</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 4 — End of Day Review */}
          {day.eodSaved && (
            <div style={S.section}>
              <div style={{ ...S.secTitle, color: '#b794f6' }}>
                <span>🌙</span> {isRTL ? 'סקירת סוף יום' : 'End-of-Day Review'}
              </div>
              <div style={{ background: 'rgba(183,148,246,0.04)', border: '1px solid rgba(183,148,246,0.12)', borderRadius: 12, padding: 16 }}>
                {day.dayScore > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ fontSize: 9, color: '#b794f6', fontWeight: 700, letterSpacing: '1px' }}>{isRTL ? 'ציון יום' : 'DAY SCORE'}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: day.dayScore >= 7 ? '#00FFA3' : day.dayScore >= 4 ? '#FFC857' : '#FF4D4D', fontFamily: "'JetBrains Mono',monospace" }}>{day.dayScore}/10</div>
                  </div>
                )}
                {day.wins && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#00FFA3', fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>{isRTL ? 'הצלחות' : 'WINS'}</div>
                    <div style={{ fontSize: 13, color: th.tx2, lineHeight: 1.7 }}>{day.wins}</div>
                  </div>
                )}
                {day.mistakes && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#FF4D4D', fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>{isRTL ? 'טעויות' : 'MISTAKES'}</div>
                    <div style={{ fontSize: 13, color: th.tx2, lineHeight: 1.7 }}>{day.mistakes}</div>
                  </div>
                )}
                {day.lessons && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, color: '#FFC857', fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>{isRTL ? 'לקחים' : 'LESSONS'}</div>
                    <div style={{ fontSize: 13, color: th.tx2, lineHeight: 1.7 }}>{day.lessons}</div>
                  </div>
                )}
                {day.solutions && (
                  <div>
                    <div style={{ fontSize: 9, color: '#5AA9FF', fontWeight: 700, letterSpacing: '1px', marginBottom: 4 }}>{isRTL ? 'פתרונות' : 'SOLUTIONS'}</div>
                    <div style={{ fontSize: 13, color: th.tx2, lineHeight: 1.7 }}>{day.solutions}</div>
                  </div>
                )}
                {!day.wins && !day.mistakes && !day.lessons && !day.solutions && (
                  <div style={{ fontSize: 12, color: th.tx3, textAlign: 'center', padding: 10 }}>{isRTL ? 'נעול ללא תוכן מפורט' : 'Locked without detailed content'}</div>
                )}
              </div>
            </div>
          )}

          {/* SECTION 5 — AI Day Analysis */}
          <div style={S.section}>
            <div style={{ ...S.secTitle, color: '#b794f6' }}>
              <span>🧠</span> {isRTL ? 'ניתוח AI יומי' : 'AI Day Analysis'}
            </div>
            {!aiResult && !aiLoading ? (
              <button onClick={runAI} style={{
                width: '100%', padding: '14px 20px', borderRadius: 12, cursor: 'pointer',
                background: 'linear-gradient(135deg, rgba(183,148,246,0.08), rgba(90,169,255,0.08))',
                border: '1px solid rgba(183,148,246,0.2)',
                color: '#b794f6', fontSize: 13, fontWeight: 700, fontFamily: "'Poppins',sans-serif",
                transition: 'all .25s', letterSpacing: '0.3px',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(183,148,246,0.15), rgba(90,169,255,0.15))'; e.currentTarget.style.transform = 'scale(1.01)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(183,148,246,0.08), rgba(90,169,255,0.08))'; e.currentTarget.style.transform = 'scale(1)'; }}>
                🧠 {isRTL ? 'נתח את היום הזה' : 'Analyze This Day'}
              </button>
            ) : aiLoading ? (
              <div style={{ textAlign: 'center', padding: 24, background: 'rgba(183,148,246,0.04)', borderRadius: 12, border: '1px solid rgba(183,148,246,0.1)' }}>
                <div style={{ fontSize: 30, marginBottom: 8, animation: 'j-pulse 1.2s ease-in-out infinite' }}>🧠</div>
                <div style={{ fontSize: 12, color: th.tx3 }}>{isRTL ? 'מנתח ביצועים...' : 'Analyzing performance...'}</div>
              </div>
            ) : (
              <div style={{
                background: 'rgba(183,148,246,0.04)', border: '1px solid rgba(183,148,246,0.12)',
                borderRadius: 12, padding: 18, animation: 'j-fade-in .4s ease-out',
              }}>
                {aiResult!.split('\n\n').map((line, i) => (
                  <div key={i} style={{
                    fontSize: 13, color: th.tx2, lineHeight: 1.8, marginBottom: i < aiResult!.split('\n\n').length - 1 ? 12 : 0,
                    paddingBottom: i < aiResult!.split('\n\n').length - 1 ? 12 : 0,
                    borderBottom: i < aiResult!.split('\n\n').length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>{line}</div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 6 — Quick Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => { onClose(); onOpenJournal(day.id); }} style={{
              flex: 1, minWidth: 160, padding: '12px 18px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(90,169,255,0.08)', border: '1px solid rgba(90,169,255,0.2)',
              color: '#5AA9FF', fontSize: 12, fontWeight: 700, fontFamily: "'Poppins',sans-serif", transition: 'all .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(90,169,255,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(90,169,255,0.08)'; }}>
              📝 {isRTL ? 'פתח יומן מלא ליום זה' : 'Open Full Journal'}
            </button>
            {(day.morningImages?.length > 0) && (
              <button onClick={() => { /* scroll to images in journal */ onClose(); onOpenJournal(day.id); }} style={{
                flex: 1, minWidth: 160, padding: '12px 18px', borderRadius: 10, cursor: 'pointer',
                background: 'rgba(0,255,163,0.06)', border: '1px solid rgba(0,255,163,0.15)',
                color: '#00FFA3', fontSize: 12, fontWeight: 700, fontFamily: "'Poppins',sans-serif", transition: 'all .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,163,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,255,163,0.06)'; }}>
                📷 {isRTL ? 'צפה בצילומי מסך' : 'View Screenshots'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CALENDAR VIEW
// ═══════════════════════════════════════════════════════════════
const CalendarView = ({ days, dir, th, t, risk, onSelectDay }: { days: JournalDay[]; dir: string; th: typeof THEMES.dark; t: any; risk: JRiskStatus; onSelectDay: (id: string) => void }) => {
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [intelDay, setIntelDay] = useState<JournalDay | null>(null);
  const today = new Date();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = new Date(year, month).toLocaleDateString(t.locale, { month: 'long', year: 'numeric' });

  // Map dates to journal days
  const dayMap = useMemo(() => {
    const m: Record<number, JournalDay[]> = {};
    days.forEach(d => {
      const dd = new Date(d.date + 'T12:00');
      if (dd.getMonth() === month && dd.getFullYear() === year) {
        const day = dd.getDate();
        if (!m[day]) m[day] = [];
        m[day].push(d);
      }
    });
    return m;
  }, [days, month, year]);

  // Weekly risk check
  const weeklyBreachedWeeks = useMemo(() => {
    const breached = new Set<number>();
    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      if (dt.getDay() === 0) { // Sunday = week start
        const weekEnd = new Date(dt);
        weekEnd.setDate(dt.getDate() + 7);
        const weekDays = days.filter(jd => {
          const jdd = new Date(jd.date + 'T12:00');
          return jdd >= dt && jdd < weekEnd;
        });
        const weekR = sumNegR(weekDays.flatMap(jd => jd.trades || []));
        if (weekR <= RISK_LIMITS.week) breached.add(d);
      }
    }
    return breached;
  }, [days, month, year, daysInMonth]);

  const monthlyR = useMemo(() => {
    const mDays = days.filter(d => {
      const dd = new Date(d.date + 'T12:00');
      return dd.getMonth() === month && dd.getFullYear() === year;
    });
    return sumNegR(mDays.flatMap(d => d.trades || []));
  }, [days, month, year]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const dayNames = dir === 'rtl'
    ? ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const monthlyBreached = monthlyR <= RISK_LIMITS.month;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '22px 22px 50px', direction: dir as 'ltr' | 'rtl' }}>
      {/* Monthly banner */}
      {monthlyBreached && (
        <div style={{
          background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.25)',
          borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12,
          animation: 'j-glow-red 2s ease-in-out infinite',
        }}>
          <span style={{ fontSize: 20, animation: 'j-pulse 1s ease-in-out infinite' }}>🚨</span>
          <div>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 800, color: '#FF4D4D', letterSpacing: '1px' }}>{t.risk.banner}</div>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, color: th.tx3, marginTop: 2 }}>{monthlyR.toFixed(1)}R / {RISK_LIMITS.month}R</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={prevMonth} style={{ background: th.inputBg, border: `1px solid ${th.inputBr}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: th.tx2, fontSize: 14, transition: 'all .2s' }}>◀</button>
        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 800, color: th.tx }}>{monthName}</div>
        <button onClick={nextMonth} style={{ background: th.inputBg, border: `1px solid ${th.inputBr}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: th.tx2, fontSize: 14, transition: 'all .2s' }}>▶</button>
      </div>

      {/* Risk summary for month */}
      <RiskStrip risk={checkJournalRisk(days, new Date(year, month, 15))} dir={dir} th={th} />

      {/* Day names */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginTop: 16, marginBottom: 8 }}>
        {dayNames.map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 700, color: th.tx3, letterSpacing: '1px', padding: '6px 0' }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
        {/* Empty cells */}
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const dayNum = i + 1;
          const jDays = dayMap[dayNum] || [];
          const hasTrades = jDays.some(d => d.trades && d.trades.length > 0);
          const hasMorning = jDays.some(d => d.morningSaved);
          const pnl = jDays.reduce((s, d) => s + sumPnl(d), 0);
          const negR = sumNegR(jDays.flatMap(d => d.trades || []));
          const dayBreached = negR <= RISK_LIMITS.day;
          const isToday = dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          const color = !hasTrades ? 'transparent' : dayBreached ? 'rgba(153,27,27,0.4)' : pnl < 0 ? 'rgba(255,77,77,0.15)' : 'rgba(0,255,163,0.12)';
          const borderColor = isToday ? '#5AA9FF' : dayBreached ? 'rgba(255,77,77,0.4)' : hasMorning ? th.cardBr : 'transparent';
          const jDay = jDays[0];

          return (
            <div key={dayNum}
              onClick={() => jDay && setIntelDay(jDay)}
              style={{
                aspectRatio: '1', borderRadius: 10, background: color, border: `1.5px solid ${borderColor}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: jDay ? 'pointer' : 'default', transition: 'all .25s', position: 'relative',
                boxShadow: isToday ? '0 0 12px rgba(90,169,255,0.3)' : dayBreached ? '0 0 10px rgba(255,77,77,0.2)' : 'none',
              }}
              onMouseEnter={e => { if (jDay) { (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)'; (e.currentTarget as HTMLElement).style.zIndex = '10'; } }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLElement).style.zIndex = '1'; }}>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: isToday ? 800 : 600, color: isToday ? '#5AA9FF' : hasTrades ? th.tx : th.tx3 }}>{dayNum}</span>
              {hasTrades && (
                <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8.5, fontWeight: 700, color: pnl >= 0 ? '#00FFA3' : '#FF4D4D', marginTop: 1 }}>
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(0)}$
                </span>
              )}
              {dayBreached && <span style={{ position: 'absolute', top: 2, right: 2, fontSize: 8, animation: 'j-pulse 1s ease-in-out infinite' }}>⚠️</span>}
              {hasMorning && !hasTrades && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#b794f6', marginTop: 3 }} />}
            </div>
          );
        })}
      </div>

      {/* Weekly warnings */}
      {weeklyBreachedWeeks.size > 0 && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.15)', borderRadius: 10 }}>
          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 700, color: '#FF4D4D', letterSpacing: '1.5px' }}>
            ⚠️ {dir === 'rtl' ? 'שבועות שחרגו ממגבלת סיכון' : 'WEEKS WITH RISK LIMIT BREACH'}
          </div>
        </div>
      )}

      {/* Daily Intelligence Panel */}
      {intelDay && (
        <DailyIntelligencePanel
          day={intelDay}
          dir={dir}
          th={th}
          onClose={() => setIntelDay(null)}
          onOpenJournal={(id) => { setIntelDay(null); onSelectDay(id); }}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// MORNING FORM
// ═══════════════════════════════════════════════════════════════
const MorningForm = ({ day, upd, t, dir, onSave, dirty, th, onInfoClick }: any) => {
  const f = t.f;
  const U = (k: string) => (v: any) => upd({ [k]: v });
  const taskArr = day.tasks || [];
  const done = taskArr.filter((t: any) => t.done).length;
  const sLocks = day.sectionLocks || {};
  const lockSec = (k: string) => upd({ sectionLocks: { ...sLocks, [k]: true } });
  const unlockSec = (k: string) => upd({ sectionLocks: { ...sLocks, [k]: false } });
  const BC = ['#00FFA3', '#FF4D4D', '#FFC857', '#5AA9FF', '#b794f6'];

  return (
    <div>
      <MarketStrip day={day} dir={dir} th={th} />
      <div onClick={onInfoClick} style={{ cursor: 'pointer' }}>
        <PDiv label={dir === 'rtl' ? 'תדריך טרום-שוק' : 'PRE-MARKET BRIEFING'} color="#5AA9FF" icon="☀️" th={th} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }} className="j-grid-2col">
        <div>
          <Sec title={f.moodTitle} icon="🧠" accent="#5AA9FF" th={th} locked={sLocks['mood']} onLock={() => lockSec('mood')} onUnlock={() => unlockSec('mood')}>
            <TA val={day.mood} set={U('mood')} ph={f.moodPh} rows={3} dir={dir} disabled={sLocks['mood']} th={th} />
          </Sec>
          <Sec title={f.planTitle} icon="📋" accent="#FFC857" th={th} locked={sLocks['plan']} onLock={() => lockSec('plan')} onUnlock={() => unlockSec('plan')}>
            <TA val={day.plan} set={U('plan')} ph={f.planPh} rows={3} dir={dir} disabled={sLocks['plan']} th={th} />
          </Sec>

          {/* Bitcoin Thoughts */}
          <Sec title={f.btcThoughts} icon="₿" accent="#f5a020" th={th} locked={sLocks['btcThoughts']} onLock={() => lockSec('btcThoughts')} onUnlock={() => unlockSec('btcThoughts')}>
            <TA val={day.btcThoughts} set={U('btcThoughts')} ph={f.btcThoughtsPh} rows={3} dir={dir} disabled={sLocks['btcThoughts']} th={th} />
          </Sec>

          {/* Image Upload */}
          <Sec title={f.images} icon="📷" accent="#5AA9FF" th={th} locked={sLocks['images']} onLock={() => lockSec('images')} onUnlock={() => unlockSec('images')}>
            <ImageUpload images={day.morningImages} onUpdate={(imgs: string[]) => upd({ morningImages: imgs })} label={f.images} uploadLabel={f.imageUpload} dir={dir} disabled={sLocks['images']} th={th} />
          </Sec>

          <Sec title={f.checklist} icon="✅" accent="#00FFA3" th={th} locked={sLocks['checklist']} onLock={() => lockSec('checklist')} onUnlock={() => unlockSec('checklist')}>
            {(day.tasks || []).map((tk: any, i: number) => (
              <Chk key={i} item={tk} color="#00FFA3" dir={dir} disabled={sLocks['checklist']} th={th}
                toggle={() => upd({ tasks: (day.tasks || []).map((x: any, j: number) => j === i ? { ...x, done: !x.done } : x) })} />
            ))}
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 4, background: th.inputBg, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${taskArr.length ? (done / taskArr.length) * 100 : 0}%`, background: 'linear-gradient(90deg,#00FFA3,#06d6a0)', transition: 'width .5s ease', borderRadius: 2, boxShadow: done === taskArr.length ? '0 0 8px rgba(0,255,163,0.4)' : 'none' }} />
              </div>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, color: done === taskArr.length ? '#00FFA3' : th.tx3, fontWeight: 700 }}>{done}/{taskArr.length}</span>
            </div>
          </Sec>

          <Sec title={f.goals} icon="🏆" accent="#FFC857" open={false} th={th} locked={sLocks['goals']} onLock={() => lockSec('goals')} onUnlock={() => unlockSec('goals')}>
            {(day.goals || []).map((g: any, i: number) => (
              <Chk key={i} item={g} color="#FFC857" dir={dir} disabled={sLocks['goals']} th={th}
                toggle={() => upd({ goals: (day.goals || []).map((x: any, j: number) => j === i ? { ...x, done: !x.done } : x) })} />
            ))}
          </Sec>
        </div>

        <div>
          {/* Psychology Check */}
          <Sec title={f.psych} icon="🧠" accent="#b794f6" th={th} locked={sLocks['psych']} onLock={() => lockSec('psych')} onUnlock={() => unlockSec('psych')}>
            <PsychSection answers={day.psychAnswers} onUpdate={(a: PsychAnswers) => upd({ psychAnswers: a })} questions={t.psychQ} dir={dir} disabled={sLocks['psych']} th={th} />
          </Sec>

          {/* Discipline Commitment */}
          <Sec title={f.discipline} icon="⚔️" accent="#00FFA3" th={th} locked={day.disciplineConfirmed} fullLocked={day.disciplineConfirmed}>
            <DisciplineSection commitments={day.disciplineCommitments} confirmed={day.disciplineConfirmed} onUpdate={(c: string[]) => upd({ disciplineCommitments: c })} onConfirm={() => upd({ disciplineConfirmed: true, sectionLocks: { ...sLocks, discipline: true } })} options={t.commitments} f={f} dir={dir} disabled={day.disciplineConfirmed} th={th} />
          </Sec>

          <Sec title={`${f.biasTitle} & ${f.phaseTitle}`} icon="📊" accent="#00FFA3" th={th} locked={sLocks['bias']} onLock={() => lockSec('bias')} onUnlock={() => unlockSec('bias')}>
            <div style={{ marginBottom: 14 }}>
              <Lbl c={f.biasTitle} dir={dir} th={th} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {t.bias.map((o: string, i: number) => (
                  <button key={o} onClick={() => upd({ bias: o })} disabled={sLocks['bias']}
                    style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '5px 14px', cursor: sLocks['bias'] ? 'not-allowed' : 'pointer', transition: 'all .2s', ...(day.bias === o ? { background: BC[i], color: '#0a0e1a', border: 'none', boxShadow: `0 0 10px ${BC[i]}30` } : { background: th.unselBg, border: `1px solid ${th.unselBr}`, color: th.unselTx }) }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <Lbl c={f.phaseTitle} dir={dir} th={th} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {t.struct.map((o: string, i: number) => (
                  <button key={o} onClick={() => upd({ mktStruct: o })} disabled={sLocks['bias']}
                    style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '5px 14px', cursor: sLocks['bias'] ? 'not-allowed' : 'pointer', transition: 'all .2s', ...(day.mktStruct === o ? { background: BC[i], color: '#0a0e1a', border: 'none', boxShadow: `0 0 10px ${BC[i]}30` } : { background: th.unselBg, border: `1px solid ${th.unselBr}`, color: th.unselTx }) }}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Lbl c={f.stateTitle} dir={dir} th={th} />
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                {t.states.map((s: string) => {
                  const on = (day.mentalTags || []).includes(s);
                  return (
                    <button key={s} onClick={() => {
                      const cur = day.mentalTags || [];
                      upd({ mentalTags: on ? cur.filter((x: string) => x !== s) : [...cur, s] });
                    }} disabled={sLocks['bias']} style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 600, borderRadius: 8, padding: '5px 13px', cursor: sLocks['bias'] ? 'not-allowed' : 'pointer', transition: 'all .2s', ...(on ? { background: 'rgba(153,104,248,.15)', border: '1px solid rgba(153,104,248,.35)', color: '#b794f6', boxShadow: '0 0 10px rgba(153,104,248,0.15)' } : { background: th.tagUnsel, border: `1px solid ${th.tagUnselBr}`, color: th.tagUnselTx }) }}>
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </Sec>

          <Sec title="Asset Intelligence" icon="🪙" accent="#FFC857" th={th} locked={sLocks['assets']} onLock={() => lockSec('assets')} onUnlock={() => unlockSec('assets')}>
            {[
              { key: 'btcNote', lbl: f.btc, ph: f.btcPh, badge: '₿', c: '#f5a020' },
              { key: 't3Note', lbl: f.t3, ph: f.t3Ph, badge: 'T3', c: '#b794f6' },
              { key: 'domNote', lbl: f.dom, ph: f.domPh, badge: 'DOM', c: '#5AA9FF' },
              { key: 'macroNote', lbl: f.macro, ph: f.macroPh, badge: 'M', c: '#00FFA3' },
            ].map(({ key, lbl, ph, badge, c }) => (
              <div key={key} style={{ marginBottom: 13, paddingInlineStart: 12, borderInlineStart: `2px solid ${c}25` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8.5, fontWeight: 700, color: c, background: `${c}15`, padding: '3px 8px', borderRadius: 5 }}>{badge}</span>
                  <Lbl c={lbl} dir={dir} th={th} />
                </div>
                <TA val={day[key] || ''} set={(v: string) => upd({ [key]: v })} ph={ph} rows={2} dir={dir} disabled={sLocks['assets']} th={th} />
              </div>
            ))}
          </Sec>

          <Sec title={f.levels} icon="🗺" accent="#5AA9FF" th={th} locked={sLocks['levels']} onLock={() => lockSec('levels')} onUnlock={() => unlockSec('levels')}>
            <TA val={day.levels} set={U('levels')} ph={f.levelsPh} rows={5} dir={dir} disabled={sLocks['levels']} th={th} />
          </Sec>
          <Sec title={f.setups} icon="🔍" accent="#5AA9FF" th={th} locked={sLocks['setups']} onLock={() => lockSec('setups')} onUnlock={() => unlockSec('setups')}>
            <TA val={day.setups} set={U('setups')} ph={f.setupsPh} rows={4} dir={dir} disabled={sLocks['setups']} th={th} />
          </Sec>
          <Sec title={f.emotion} icon="🧠" accent="#b794f6" th={th} locked={sLocks['emotion']} onLock={() => lockSec('emotion')} onUnlock={() => unlockSec('emotion')}>
            <EmoSlider val={day.emotionScore} set={U('emotionScore')} label={f.emotion} dir={dir} disabled={sLocks['emotion']} th={th} />
          </Sec>

          {/* Market Sentiment — separate from trader psychology */}
          <MarketSentimentGauge
            value={day.fearGreed || ''}
            dir={dir}
            th={th}
            onChangeValue={(v: string) => upd({ fearGreed: v })}
            disabled={sLocks['emotion']}
          />
        </div>
      </div>

      {/* Lock Button */}
      <div style={{ margin: '22px 0 8px', background: 'rgba(255,200,87,0.06)', border: '1px solid rgba(255,200,87,0.12)', borderRadius: 14, padding: '18px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11.5, color: '#FFC857', marginBottom: 12, opacity: 0.8 }}>{t.m.lockSub}</p>
        <button onClick={onSave} disabled={!dirty} style={{
          background: 'linear-gradient(135deg,#FFC857,#f5a020)', color: '#0a0e1a', padding: '12px 28px', fontSize: 12.5, fontWeight: 800, letterSpacing: '.5px',
          boxShadow: dirty ? '0 4px 24px rgba(255,200,87,.35)' : 'none', borderRadius: 12, border: 'none',
          cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.3, fontFamily: "'Poppins',sans-serif",
          transition: 'all .25s', textTransform: 'uppercase' as const,
        }}>🔒 {t.m.lock}</button>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// EOD FORM
// ═══════════════════════════════════════════════════════════════
const EodForm = ({ day, upd, t, dir, onSave, dirty, orcaTrades, th, risk, onInfoClick }: any) => {
  const f = t.f;
  const U = (k: string) => (v: any) => upd({ [k]: v });
  const dp = sumPnl(day), dw = numWins(day);
  const addTrade = () => upd({ trades: [...(day.trades || []), { id: Date.now(), pair: '', side: 'LONG', entry: '', exit: '', size: '', pnl: '', rr: '', notes: '' }] });
  const fullLocked = isDayFullyLocked(day);
  const sLocks = day.sectionLocks || {};
  const lockSec = (k: string) => upd({ sectionLocks: { ...sLocks, [k]: true } });
  const unlockSec = (k: string) => upd({ sectionLocks: { ...sLocks, [k]: false } });

  return (
    <div>
      {/* Morning Locked Recap */}
      <div style={{
        background: 'rgba(0,255,163,0.04)', border: '1px solid rgba(0,255,163,0.12)',
        borderRadius: 12, padding: '12px 16px', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8.5, color: '#00FFA3', letterSpacing: '1.8px', textTransform: 'uppercase' as const, background: 'rgba(0,255,163,.1)', padding: '3px 10px', borderRadius: 5, fontWeight: 700 }}>🔒 {t.m.locked}</span>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, color: th.tx2, fontWeight: 600 }}>{day.bias} · {day.mktStruct}</span>
          </div>
          {(day.morningImages || []).length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {day.morningImages.map((img: string, i: number) => (
                <img key={i} src={img} alt="" style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 6, border: `1px solid ${th.cardBr}` }} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Risk Status */}
      {risk && risk.breachedLevel !== 'none' && (
        <div style={{
          background: 'rgba(255,77,77,0.06)', border: '1px solid rgba(255,77,77,0.2)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8,
          animation: 'j-glow-red 2s ease-in-out infinite',
        }}>
          <span style={{ fontSize: 14, animation: 'j-pulse 1s ease-in-out infinite' }}>⚠️</span>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 700, color: '#FF4D4D' }}>
            {risk.breachedLevel === 'daily' ? t.risk.daily : risk.breachedLevel === 'weekly' ? t.risk.weekly : t.risk.monthly}
          </span>
        </div>
      )}

      {/* Orca Trade Bridge */}
      {orcaTrades?.length > 0 && (
        <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 12, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8.5, color: '#5AA9FF', letterSpacing: '1.8px', fontWeight: 700, textTransform: 'uppercase' as const }}>⚡ ORCA BRIDGE</span>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, color: th.tx3 }}>{orcaTrades.length} trades</span>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' as const, paddingBottom: 4 }}>
            {orcaTrades.slice(0, 6).map((tr: Trade) => (
              <div key={tr.id} style={{
                flexShrink: 0, padding: '9px 13px', background: th.inputBg, borderRadius: 10,
                border: `1px solid ${tr.pnl >= 0 ? 'rgba(0,255,163,.15)' : 'rgba(255,77,77,.15)'}`, minWidth: 110,
                transition: 'all .2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
                <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 700, color: th.tx2 }}>{tr.coin}</div>
                <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 800, color: tr.pnl >= 0 ? '#00FFA3' : '#FF4D4D', marginTop: 3, textShadow: `0 0 10px ${tr.pnl >= 0 ? 'rgba(0,255,163,0.25)' : 'rgba(255,77,77,0.25)'}` }}>{tr.pnl >= 0 ? '+' : ''}{tr.pnl.toFixed(2)}$</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div onClick={onInfoClick} style={{ cursor: 'pointer' }}>
        <PDiv label={dir === 'rtl' ? 'תחקיר אחרי-שוק' : 'POST-MARKET DEBRIEF'} color="#b794f6" icon="🌙" th={th} />
      </div>

      {/* Trade Log */}
      <Sec title={f.tlog} icon="💹" accent="#5AA9FF" th={th} fullLocked={fullLocked} locked={sLocks['trades']} onLock={() => lockSec('trades')} onUnlock={() => unlockSec('trades')}>
        {day.hasOpen === null && !fullLocked ? (
          <div style={{ borderRadius: 12, padding: 22, textAlign: 'center', border: `1px dashed ${th.inputBr}`, background: th.inputBg }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>📂</div>
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 600, color: th.tx2, marginBottom: 16 }}>{f.openQ}</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' as const }}>
              <button onClick={() => upd({ hasOpen: true })} style={{ background: 'linear-gradient(135deg,#FFC857,#f5a020)', color: '#0a0e1a', padding: '10px 22px', fontSize: 12, borderRadius: 10, fontFamily: "'Poppins',sans-serif", fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all .2s', boxShadow: '0 4px 16px rgba(255,200,87,0.25)' }}>📈 {f.openY}</button>
              <button onClick={() => upd({ hasOpen: false })} style={{ background: th.inputBg, border: `1px solid ${th.inputBr}`, color: th.tx2, padding: '7px 15px', fontSize: 11.5, borderRadius: 8, cursor: 'pointer', fontWeight: 600, transition: 'all .2s' }}>✖ {f.openN}</button>
            </div>
          </div>
        ) : (
          <>
            {(day.trades || []).map((tr: JournalTrade, i: number) => (
              <TCard key={tr.id} trade={tr} idx={i} f={f} dir={dir} disabled={fullLocked || sLocks['trades']} th={th}
                onChange={(nt: JournalTrade) => upd({ trades: (day.trades || []).map((x: any, j: number) => j === i ? nt : x) })}
                onDel={() => upd({ trades: day.trades.filter((_: any, j: number) => j !== i) })} />
            ))}
            {!fullLocked && !sLocks['trades'] && (
              <button onClick={addTrade} style={{
                width: '100%', padding: 10, borderRadius: 10, color: '#5AA9FF',
                marginTop: 5, background: 'rgba(90,169,255,0.04)', border: '1px dashed rgba(90,169,255,0.2)',
                cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: "'Poppins',sans-serif",
                transition: 'all .2s', letterSpacing: '.5px',
              }}>{f.addTrade}</button>
            )}
            {(day.trades || []).length > 0 && (
              <div style={{ display: 'flex', gap: 20, marginTop: 12, padding: '12px 16px', background: th.cardBg, borderRadius: 10, border: `1px solid ${th.cardBr}` }}>
                {[
                  { l: 'P&L', v: `${dp >= 0 ? '+' : ''}${dp.toFixed(2)}$`, c: dp >= 0 ? '#00FFA3' : '#FF4D4D' },
                  { l: 'TRADES', v: String(day.trades.length), c: th.tx2 },
                  { l: 'WIN %', v: `${((dw / Math.max(day.trades.length, 1)) * 100).toFixed(0)}%`, c: '#FFC857' },
                ].map(s => (
                  <div key={s.l}>
                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '2px', color: th.tx3, textTransform: 'uppercase' as const }}>{s.l}</div>
                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 20, fontWeight: 800, color: s.c, marginTop: 2, textShadow: `0 0 12px ${s.c}25` }}>{s.v}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Sec>

      {/* EOD Review */}
      <Sec title={dir === 'rtl' ? 'תחקיר ביצוע' : 'EXECUTION REVIEW'} icon="🌙" accent="#b794f6" th={th} fullLocked={fullLocked} locked={sLocks['review']} onLock={() => lockSec('review')} onUnlock={() => unlockSec('review')}>
        <div style={{ marginBottom: 14 }}><Lbl c={f.actualMove} dir={dir} th={th} /><TA val={day.actualMove} set={U('actualMove')} ph={f.actualPh} rows={3} dir={dir} disabled={fullLocked || sLocks['review']} th={th} /></div>
        <div style={{ marginBottom: 16 }}><Lbl c={f.score} dir={dir} th={th} /><Scores val={day.dayScore} set={U('dayScore')} disabled={fullLocked || sLocks['review']} th={th} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }} className="j-grid-2col">
          {[
            { k: 'wins', l: f.wins, ph: f.winsPh, c: '#00FFA3' },
            { k: 'lessons', l: f.lessons, ph: f.lessonsPh, c: '#5AA9FF' },
            { k: 'mistakes', l: f.mistakes, ph: f.mistakesPh, c: '#FF4D4D' },
            { k: 'solutions', l: f.solutions, ph: f.solutionsPh, c: '#FFC857' },
          ].map(item => (
            <div key={item.k} style={{ borderInlineStart: `2px solid ${item.c}20`, paddingInlineStart: 11 }}>
              <Lbl c={item.l} dir={dir} th={th} />
              <TA val={day[item.k]} set={U(item.k)} ph={item.ph} rows={4} dir={dir} disabled={fullLocked || sLocks['review']} th={th} />
            </div>
          ))}
        </div>
        <Lbl c={f.closing} dir={dir} th={th} />
        <TA val={day.closing} set={U('closing')} ph={f.closingPh} rows={3} dir={dir} disabled={fullLocked || sLocks['review']} th={th} />
      </Sec>

      {/* Seal Day */}
      {!fullLocked && (
        <div style={{ margin: '22px 0 8px', background: 'rgba(183,148,246,0.06)', border: '1px solid rgba(183,148,246,0.12)', borderRadius: 14, padding: '18px 24px', textAlign: 'center' }}>
          <p style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11.5, color: '#b794f6', marginBottom: 12, opacity: 0.8 }}>{t.e.lockSub}</p>
          <button onClick={onSave} disabled={!dirty} style={{
            background: 'linear-gradient(135deg,#b794f6,#7c3aed)', color: '#fff', padding: '12px 28px', fontSize: 12.5, fontWeight: 800, letterSpacing: '.5px',
            boxShadow: dirty ? '0 4px 24px rgba(153,104,248,.35)' : 'none', borderRadius: 12, border: 'none',
            cursor: dirty ? 'pointer' : 'not-allowed', opacity: dirty ? 1 : 0.3, fontFamily: "'Poppins',sans-serif",
            transition: 'all .25s', textTransform: 'uppercase' as const,
          }}>✓ {t.e.lock}</button>
        </div>
      )}
      {fullLocked && (
        <div style={{ margin: '22px 0', padding: '16px 24px', borderRadius: 14, background: 'rgba(0,255,163,0.06)', border: '1px solid rgba(0,255,163,0.15)', textAlign: 'center' }}>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700, color: '#00FFA3', letterSpacing: '2px' }}>🔒 {dir === 'rtl' ? 'יום זה נעול לצמיתות' : 'THIS DAY IS PERMANENTLY LOCKED'}</span>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// CINEMATIC LOCK OVERLAYS
// ═══════════════════════════════════════════════════════════════
const MorningLockOverlay = ({ onDone, isRTL }: { onDone: () => void; isRTL: boolean }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setStep(1), 100),
      setTimeout(() => setStep(2), 500),
      setTimeout(() => setStep(3), 1200),
      setTimeout(() => setStep(4), 1700),
      setTimeout(() => { setStep(5); onDone(); }, 2200),
    ];
    playMorningLock();
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {/* Dim overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,10,30,0.75)', opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.4s ease', backdropFilter: 'blur(4px)' }} />
      {/* Grid lines */}
      <div style={{ position: 'absolute', inset: 0, opacity: step >= 1 ? 0.08 : 0, transition: 'opacity 0.6s ease',
        backgroundImage: 'linear-gradient(rgba(90,169,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(90,169,255,0.4) 1px, transparent 1px)', backgroundSize: '80px 60px' }} />
      {/* Chart line */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: step >= 2 ? 0.3 : 0, transition: 'opacity 0.5s ease' }} viewBox="0 0 1000 400" preserveAspectRatio="none">
        <polyline points="0,300 100,290 200,295 300,270 400,260 500,240 600,200 700,180 750,100 800,60 850,40 900,30"
          fill="none" stroke="#5AA9FF" strokeWidth="2.5"
          style={{ strokeDasharray: 2000, strokeDashoffset: step >= 2 ? 0 : 2000, transition: 'stroke-dashoffset 1s ease-out',
            filter: 'drop-shadow(0 0 6px rgba(90,169,255,0.6))' }} />
      </svg>
      {/* Center text */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? 'scale(1)' : 'scale(0.9)', transition: 'all 0.4s ease' }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 'clamp(16px, 4vw, 22px)', fontWeight: 800, color: '#5AA9FF', letterSpacing: 1, textShadow: '0 0 30px rgba(90,169,255,0.5)', direction: isRTL ? 'rtl' : 'ltr' }}>
          {isRTL ? 'ניתוח הבוקר ננעל' : 'Morning Analysis Locked'}
        </div>
        <div style={{ width: 60, height: 2, background: '#5AA9FF', margin: '12px auto', borderRadius: 1, boxShadow: '0 0 15px rgba(90,169,255,0.5)',
          opacity: step >= 4 ? 1 : 0, transform: step >= 4 ? 'scaleX(1)' : 'scaleX(0)', transition: 'all 0.3s ease' }} />
      </div>
    </div>
  );
};

const EODLockOverlay = ({ onDone, isRTL }: { onDone: () => void; isRTL: boolean }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setStep(1), 100),
      setTimeout(() => setStep(2), 600),
      setTimeout(() => setStep(3), 1400),
      setTimeout(() => setStep(4), 2000),
      setTimeout(() => { setStep(5); onDone(); }, 2600),
    ];
    // Lock click sound at step 3 timing
    setTimeout(() => playEODLock(), 1400);
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  const candles = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    const base = 200 + Math.sin(i * 0.4) * 60 + Math.cos(i * 0.15) * 30;
    const body = (Math.random() - 0.45) * 40;
    return { x: (i + 0.5) / 30, o: base, c: base + body, green: body > 0 };
  }), []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,8,20,0.8)', opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.5s ease', backdropFilter: 'blur(6px)' }} />
      {/* Candlestick replay */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: step >= 2 && step < 4 ? 0.25 : 0, transition: 'opacity 0.6s ease' }} viewBox="0 0 1000 400" preserveAspectRatio="none">
        {candles.map((c, i) => {
          const cx = c.x * 1000; const top = Math.min(c.o, c.c); const bot = Math.max(c.o, c.c); const h = Math.max(4, bot - top);
          const show = step >= 2;
          return <rect key={i} x={cx - 8} y={top} width={16} height={h}
            fill={c.green ? '#00FFA3' : '#FF4D4D'} rx={2}
            style={{ opacity: show ? 1 : 0, transform: show ? 'scaleY(1)' : 'scaleY(0)', transformOrigin: 'center', transition: `all 0.15s ease ${i * 0.025}s` }} />;
        })}
        {/* Golden close line */}
        <line x1="970" y1="0" x2="970" y2="400" stroke="#D4AF37" strokeWidth="2"
          style={{ opacity: step >= 3 ? 0.6 : 0, transition: 'opacity 0.3s ease', filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.5))' }} />
      </svg>
      {/* Center content */}
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? 'scale(1)' : 'scale(0.9)', transition: 'all 0.5s ease' }}>
        <div style={{ fontSize: 44, marginBottom: 10, transition: 'transform 0.3s ease', transform: step >= 4 ? 'rotateY(180deg)' : 'rotateY(0)' }}>🔒</div>
        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 'clamp(16px, 4vw, 22px)', fontWeight: 800, color: '#D4AF37', letterSpacing: 1, textShadow: '0 0 30px rgba(212,175,55,0.4)', direction: isRTL ? 'rtl' : 'ltr' }}>
          {isRTL ? 'יום המסחר ננעל' : 'Trading Day Sealed'}
        </div>
        <div style={{ width: 80, height: 2, background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)', margin: '14px auto', borderRadius: 1,
          opacity: step >= 4 ? 1 : 0, transition: 'opacity 0.4s ease' }} />
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
  const [mDirty, setMD] = useState(false);
  const [eDirty, setED] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [sbQ, setSbQ] = useState('');
  const [theme, setTheme] = useState<JTheme>('dark');
  const [riskAlertShown, setRiskAlertShown] = useState(false);
  const [showEntry, setShowEntry] = useState(() => sessionStorage.getItem(ENTRY_SESSION_KEY) !== '1');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [lockAnim, setLockAnim] = useState<'morning' | 'eod' | null>(null);
  const [viewingArchiveId, setViewingArchiveId] = useState<string | null>(null);
  const [knowledgePanel, setKnowledgePanel] = useState<'morning' | 'eod' | null>(null);
  const tRef = useRef<any>(null);

  const daysRef = useRef(days);
  const activeIdRef = useRef(activeId);
  const langRef = useRef(lang);
  useEffect(() => { daysRef.current = days; }, [days]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { langRef.current = lang; }, [lang]);

  const t = TR[lang];
  const dir = t.dir;
  const th = THEMES[theme];

  // Risk status
  const riskStatus = useMemo(() => checkJournalRisk(days), [days]);

  // Load from IndexedDB
  useEffect(() => {
    readJournalState().then(s => {
      if (s?.days?.length) {
        // Validate all dates on load
        const sanitized = s.days.map(d => ({ ...d, date: safeDateStr(d.date) }));
        setDays(sanitized);
        setActiveId(s.activeDayId || sanitized[sanitized.length - 1].id);
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

  const archiveViewDay = useMemo(() => {
    if (!viewingArchiveId) return null;
    return days.find(d => d.id === viewingArchiveId) || null;
  }, [days, viewingArchiveId]);

  const displayDay = archiveViewDay || activeDay;
  const isViewingArchive = !!viewingArchiveId;

  const commit = useCallback((nextDays: JournalDay[], nextId: string | null, nextLang?: string) => {
    writeJournalState({ days: nextDays, activeDayId: nextId, lang: nextLang || langRef.current });
  }, []);

  const upd = useCallback((patch: Partial<JournalDay>) => {
    const curId = activeIdRef.current;
    setDays(prev => {
      const day = prev.find(d => d.id === curId);
      if (day && isDayFullyLocked(day)) return prev; // Hard lock
      const next = prev.map(d => d.id === curId ? { ...d, ...patch } : d);
      writeJournalState({ days: next, activeDayId: curId, lang: langRef.current });

      // Check risk after trade updates
      if ('trades' in patch) {
        const newRisk = checkJournalRisk(next);
        if (newRisk.breachedLevel !== 'none') {
          setRiskAlertShown(true);
        }
      }

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
    setLockAnim('morning');
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
    setLockAnim('eod');
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
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: th.bg }}>
      <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, color: '#00FFA3', letterSpacing: 3, animation: 'j-pulse 1.5s ease-in-out infinite' }}>INITIALIZING...</div>
    </div>
  );

  const TOAST_STYLES: Record<string, React.CSSProperties> = {
    a: { background: 'rgba(255,200,87,.12)', border: '1px solid rgba(255,200,87,.25)', color: '#FFC857' },
    p: { background: 'rgba(183,148,246,.12)', border: '1px solid rgba(183,148,246,.25)', color: '#b794f6' },
    g: { background: 'rgba(0,255,163,.12)', border: '1px solid rgba(0,255,163,.25)', color: '#00FFA3' },
  };

  // Entry screen
  if (showEntry) {
    return <JournalEntryScreen onEnter={() => setShowEntry(false)} />;
  }

  return (
    <div className="journal-dimension" style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      fontFamily: "'Poppins', sans-serif", direction: dir,
      background: th.bg, color: th.tx,
    }}>
      {/* SCOPED CSS */}
      <style>{`
        .journal-dimension ::-webkit-scrollbar { width: 4px; height: 4px; }
        .journal-dimension ::-webkit-scrollbar-track { background: transparent; }
        .journal-dimension ::-webkit-scrollbar-thumb { background: ${th.scrollThumb}; border-radius: 2px; }
        .journal-dimension ::-webkit-scrollbar-thumb:hover { background: ${th.scrollHover}; }
        .journal-dimension textarea:focus, .journal-dimension input:focus {
          border-color: ${th.focusBr} !important;
          box-shadow: 0 0 0 3px ${th.focusShadow} !important;
        }
        .journal-dimension textarea::placeholder, .journal-dimension input::placeholder {
          color: ${th.phColor} !important;
        }
        @keyframes j-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes j-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes j-scale-in { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes j-glow-red { 0%,100% { box-shadow: 0 0 5px rgba(255,77,77,0.1); } 50% { box-shadow: 0 0 20px rgba(255,77,77,0.2); } }
        @keyframes j-slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .j-card-hover { transition: all .25s ease !important; }
        .j-card-hover:hover { transform: translateY(-1px) !important; box-shadow: 0 4px 15px rgba(0,0,0,0.1) !important; }
        @media (max-width: 768px) {
          .j-grid-2col { grid-template-columns: 1fr !important; }
          .j-nav-labels { display: none !important; }
          .j-topbar { padding: 0 10px !important; gap: 6px !important; }
          .j-topbar-right { gap: 3px !important; }
          .j-lock-btn-text { display: none !important; }
          .j-return-desktop { display: none !important; }
          .j-main-content { padding: 14px 12px 40px !important; }
        }
      `}</style>

      {/* RISK ALERT MODAL */}
      {riskAlertShown && riskStatus.breachedLevel !== 'none' && (
        <RiskAlertModal risk={riskStatus} t={t} dir={dir} onClose={() => setRiskAlertShown(false)} th={th} />
      )}

      {/* LOCK ANIMATIONS */}
      {lockAnim === 'morning' && <MorningLockOverlay onDone={() => setLockAnim(null)} isRTL={dir === 'rtl'} />}
      {lockAnim === 'eod' && <EODLockOverlay onDone={() => setLockAnim(null)} isRTL={dir === 'rtl'} />}

      {/* KNOWLEDGE PANEL */}
      {knowledgePanel && <KnowledgePanel type={knowledgePanel} days={days} dir={dir} th={th} onClose={() => setKnowledgePanel(null)} onOpenDay={(id) => { setViewingArchiveId(id); setView('journal'); }} />}

      {mobileMenu && (
        <div onClick={() => setMobileMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'j-fade-in .2s ease-out' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 'min(480px, 90vw)', maxHeight: '80vh',
            background: th.bg1, border: `1px solid ${th.br2}`, borderRadius: 18,
            padding: '24px 20px', overflowY: 'auto', animation: 'j-scale-in .25s ease-out',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 800, color: th.tx, letterSpacing: '-.3px' }}>⚡ APEX OS</span>
              <button onClick={() => setMobileMenu(false)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${th.inputBr}`, background: th.inputBg, cursor: 'pointer', color: th.tx3, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {/* Nav buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
              {([['journal', t.nav.journal, '📝'], ['calendar', t.nav.calendar, '📅'], ['archive', t.nav.archive, '📂'], ['analytics', t.f.analytics, '📊']] as const).map(([v, l, ic]) => (
                <button key={v} onClick={() => { if (v === 'journal') setViewingArchiveId(null); setView(v as string); setMobileMenu(false); }}
                  style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 12, padding: '14px 10px', transition: 'all .2s', ...(view === v ? { background: th.selBg, color: '#5AA9FF', border: `1px solid ${th.selBr}` } : { background: th.inputBg, color: th.tx3, border: `1px solid ${th.inputBr}` }) }}>
                  <span style={{ fontSize: 18, display: 'block', marginBottom: 4 }}>{ic}</span> {l}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button onClick={() => { setTheme(p => p === 'dark' ? 'light' : 'dark'); setMobileMenu(false); }}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${th.inputBr}`, background: th.inputBg, cursor: 'pointer', color: th.tx2, fontSize: 13, fontWeight: 600, fontFamily: "'Poppins',sans-serif" }}>
                {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
              </button>
              <button onClick={() => { setShowEntry(true); setMobileMenu(false); }}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${th.inputBr}`, background: th.inputBg, cursor: 'pointer', color: '#FFC857', fontSize: 13, fontWeight: 600, fontFamily: "'Poppins',sans-serif" }}>
                🔒 Lock System
              </button>
              <button onClick={() => { onReturn(); setMobileMenu(false); }}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.06)', cursor: 'pointer', color: '#D4AF37', fontSize: 13, fontWeight: 600, fontFamily: "'Poppins',sans-serif" }}>
                ⚔️ {isRTL ? 'חמ"ל' : 'Orca'}
              </button>
            </div>
            {/* Day list */}
            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 700, color: th.tx3, letterSpacing: '1.5px', marginBottom: 8, textTransform: 'uppercase' }}>{dir === 'rtl' ? 'ימי יומן' : 'JOURNAL DAYS'}</div>
            <input value={sbQ} onChange={e => setSbQ(e.target.value)} placeholder={t.arch.search}
              style={{ width: '100%', background: th.inputBg, border: `1px solid ${th.inputBr}`, borderRadius: 10, color: th.tx, fontSize: 13, outline: 'none', padding: '10px 14px', direction: dir, fontFamily: "'Poppins',sans-serif", marginBottom: 10 }} />
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {sbDays.map(d => {
                const dp = sumPnl(d);
                const sel = d.id === activeId;
                const ec = d.emotionScore >= 8 ? '#00FFA3' : d.emotionScore >= 5 ? '#FFC857' : '#FF4D4D';
                return (
                  <div key={d.id} onClick={() => { setActiveId(d.id); setView('journal'); setMobileMenu(false); }}
                    style={{ padding: '12px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      ...(sel ? { background: th.selBg, border: `1px solid ${th.selBr}` } : { background: 'transparent', border: '1px solid transparent' }) }}>
                    <div>
                      <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700, color: th.tx }}>{fmtShort(d.date, t.locale)}</span>
                      <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, color: th.tx3, marginInlineStart: 8 }}>{dir === 'rtl' ? 'יום' : 'Day'} {d.dayNum || '?'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 800, color: ec }}>{d.emotionScore}</span>
                      {dp !== 0 && <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 700, color: dp > 0 ? '#00FFA3' : '#FF4D4D' }}>{dp > 0 ? '+' : ''}{dp.toFixed(0)}$</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TOPBAR */}
      <nav className="j-topbar" style={{
        height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
        background: th.navBg, borderBottom: `1px solid ${th.br}`, zIndex: 100,
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setMobileMenu(true)} style={{ background: th.inputBg, border: `1px solid ${th.inputBr}`, color: th.tx2, padding: '6px 10px', fontSize: 13, borderRadius: 8, cursor: 'pointer', fontWeight: 600, transition: 'all .2s' }}>☰</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, background: 'linear-gradient(135deg,#5AA9FF,#b794f6)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>⚡</div>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 15, fontWeight: 800, background: 'linear-gradient(90deg,#5AA9FF,#b794f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>APEX OS</span>
          </div>
        </div>
        <div className="j-topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {/* Desktop nav labels */}
          <div className="j-nav-labels" style={{ display: 'flex', gap: 3 }}>
            {([['journal', t.nav.journal], ['calendar', t.nav.calendar], ['archive', t.nav.archive], ['analytics', t.f.analytics]] as const).map(([v, l]) => (
              <button key={v} onClick={() => { if (v === 'journal') setViewingArchiveId(null); setView(v as string); }}
                style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' as const, border: 'none', cursor: 'pointer', borderRadius: 8, padding: '7px 14px', transition: 'all .2s', ...(view === v ? { background: th.selBg, color: '#5AA9FF' } : { background: 'none', color: th.tx3 }) }}>
                {l}
              </button>
            ))}
          </div>
          {/* Spacer */}
          <div style={{ width: 1, height: 18, background: th.br, margin: '0 4px' }} />
          <button onClick={() => setTheme(p => p === 'dark' ? 'light' : 'dark')}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${th.inputBr}`, background: th.inputBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, transition: 'all .2s' }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button onClick={() => setShowEntry(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: `1px solid ${th.inputBr}`, background: th.inputBg, cursor: 'pointer', color: th.tx3, fontSize: 11, fontWeight: 600, fontFamily: "'Poppins',sans-serif", transition: 'all .2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,200,87,0.3)'; (e.currentTarget as HTMLElement).style.color = '#FFC857'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = th.inputBr; (e.currentTarget as HTMLElement).style.color = th.tx3; }}>
            🔒 <span className="j-lock-btn-text">Lock</span>
          </button>
          <div className="j-return-desktop">
            <ReturnButton onClick={onReturn} isRTL={isRTL} />
          </div>
        </div>
      </nav>

      {/* LAYOUT */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {/* MAIN */}
        <main style={{ flex: 1, overflowY: 'auto', background: 'transparent' }}>
          {view === 'journal' && displayDay && (
            <div className="j-main-content" style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 22px 50px', direction: dir, animation: 'j-fade-in .3s ease-out' }}>
              {/* Archive viewing banner — sticky top bar */}
              {isViewingArchive && (
                <div style={{
                  position: 'sticky', top: 0, zIndex: 90,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 10,
                  padding: '12px 20px', marginBottom: 18, borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(255,200,87,0.1) 0%, rgba(255,160,40,0.08) 100%)',
                  border: '1px solid rgba(255,200,87,0.25)',
                  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,200,87,0.1) inset',
                  animation: 'j-fade-in .3s ease-out',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>📂</span>
                    <div>
                      <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 800, color: '#FFC857', letterSpacing: '0.5px', display: 'block' }}>
                        {dir === 'rtl' ? 'צפייה בארכיון — קריאה בלבד' : 'VIEWING ARCHIVE — READ ONLY'}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: 'rgba(255,200,87,0.6)', letterSpacing: '0.5px' }}>
                        {displayDay?.date ? fmtShort(displayDay.date, t.locale) : ''}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => { setViewingArchiveId(null); setView('journal'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{
                      fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 800, cursor: 'pointer',
                      padding: '8px 22px', borderRadius: 10, border: '1px solid rgba(0,255,163,0.4)',
                      background: 'linear-gradient(135deg, rgba(0,255,163,0.12) 0%, rgba(0,255,163,0.06) 100%)',
                      color: '#00FFA3', transition: 'all .25s', letterSpacing: '0.3px',
                      boxShadow: '0 0 12px rgba(0,255,163,0.1)',
                    }}
                    onMouseEnter={e => { const s = e.currentTarget.style; s.background = 'rgba(0,255,163,0.22)'; s.boxShadow = '0 0 20px rgba(0,255,163,0.2)'; s.transform = 'scale(1.03)'; }}
                    onMouseLeave={e => { const s = e.currentTarget.style; s.background = 'linear-gradient(135deg, rgba(0,255,163,0.12) 0%, rgba(0,255,163,0.06) 100%)'; s.boxShadow = '0 0 12px rgba(0,255,163,0.1)'; s.transform = 'scale(1)'; }}>
                    ↩ {dir === 'rtl' ? 'חזור ליום הנוכחי' : 'Back to Today'}
                  </button>
                </div>
              )}
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: 12, marginBottom: 20 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 'clamp(16px, 4vw, 22px)', fontWeight: 800, color: th.tx, letterSpacing: '-.3px' }}>
                    {fmtFull(displayDay.date, t.locale)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 9, flexWrap: 'wrap' as const }}>
                    {[['dayNum', dir === 'rtl' ? 'יום #' : 'Day #', '52px'], ['weekNum', dir === 'rtl' ? 'שבוע #' : 'Week #', '55px']].map(([k, l, w]: any) => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9.5, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: th.tx3 }}>{l}</span>
                        <input value={(displayDay as any)[k] || ''} onChange={e => !isViewingArchive && upd({ [k]: e.target.value } as any)} placeholder="—" disabled={isViewingArchive || isDayFullyLocked(displayDay)}
                          style={{ width: w, background: th.inputBg, border: `1px solid ${th.inputBr}`, borderRadius: 7, color: th.tx, padding: '5px 7px', fontSize: 14, fontWeight: 800, fontFamily: "'Poppins',sans-serif", outline: 'none', textAlign: 'center', transition: 'all .2s' }} />
                      </div>
                    ))}
                    {(isViewingArchive || isDayFullyLocked(displayDay)) && <span style={{ fontSize: 10, fontFamily: "'Poppins',sans-serif", color: '#00FFA3', fontWeight: 700, letterSpacing: '1.5px', background: 'rgba(0,255,163,0.08)', padding: '4px 12px', borderRadius: 6 }}>🔒 SEALED</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(() => { const dp = sumPnl(displayDay); return (
                    <div style={{
                      background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 12, padding: '10px 18px', textAlign: 'center',
                      transition: 'all .3s',
                    }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 20px ${dp >= 0 ? 'rgba(0,255,163,0.15)' : 'rgba(255,77,77,0.15)'}`;}}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                      <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 18, fontWeight: 800, color: dp >= 0 ? '#00FFA3' : '#FF4D4D', textShadow: `0 0 15px ${dp >= 0 ? 'rgba(0,255,163,0.3)' : 'rgba(255,77,77,0.3)'}` }}>{dp >= 0 ? '+' : ''}{dp.toFixed(0)}$</div>
                      <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' as const, color: th.tx3 }}>SESSION P&L</span>
                    </div>
                  ); })()}
                </div>
              </div>

              {/* Risk Command Center in journal view */}
              {!isViewingArchive && <RiskCommandCenter risk={riskStatus} days={days} dir={dir} th={th} />}

              {isViewingArchive ? (
                /* Read-only view for archived day */
                displayDay.morningSaved
                 ? <EodForm day={displayDay} upd={() => {}} t={t} dir={dir} onSave={() => {}} dirty={false} orcaTrades={[]} th={th} risk={riskStatus} onInfoClick={() => setKnowledgePanel('eod')} />
                 : <MorningForm day={displayDay} upd={() => {}} t={t} dir={dir} onSave={() => {}} dirty={false} th={th} onInfoClick={() => setKnowledgePanel('morning')} />
              ) : (
                !displayDay.morningSaved
                  ? <MorningForm day={displayDay} upd={upd} t={t} dir={dir} onSave={saveMorning} dirty={mDirty} th={th} onInfoClick={() => setKnowledgePanel('morning')} />
                  : <EodForm day={displayDay} upd={upd} t={t} dir={dir} onSave={saveEOD} dirty={eDirty} orcaTrades={todayOrcaTrades} th={th} risk={riskStatus} onInfoClick={() => setKnowledgePanel('eod')} />
              )}
            </div>
          )}

          {view === 'calendar' && (
            <CalendarView days={days} dir={dir} th={th} t={t} risk={riskStatus} onSelectDay={(id) => { setActiveId(id); setView('journal'); }} />
          )}

          {view === 'archive' && (
            <div style={{ maxWidth: 940, margin: '0 auto', padding: '22px 22px 50px', direction: dir }}>
              {/* Archive Header */}
              <div style={{ marginBottom: 24, animation: 'j-fade-in .4s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, rgba(255,200,87,0.12), rgba(255,160,40,0.06))', border: '1px solid rgba(255,200,87,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📂</div>
                  <div>
                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 22, fontWeight: 800, color: th.tx }}>{t.arch.title}</div>
                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, color: th.tx3, marginTop: 2 }}>
                      {dir === 'rtl' ? `${days.filter(d => d.morningSaved).length} ימים מתועדים` : `${days.filter(d => d.morningSaved).length} documented days`}
                    </div>
                  </div>
                </div>
                {/* Archive stats summary */}
                {(() => {
                  const archived = days.filter(d => d.morningSaved);
                  const totalPnl = archived.reduce((s, d) => s + sumPnl(d), 0);
                  const totalR = archived.flatMap(d => d.trades || []).reduce((s, t) => s + getTradeR(t), 0);
                  const complete = archived.filter(d => isDayFullyLocked(d)).length;
                  return archived.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 16, animation: 'j-fade-in .5s ease-out' }} className="j-grid-2col">
                      {[
                        { l: dir === 'rtl' ? 'סה"כ ימים' : 'Total Days', v: String(archived.length), c: '#5AA9FF' },
                        { l: dir === 'rtl' ? 'הושלמו' : 'Completed', v: String(complete), c: '#00FFA3' },
                        { l: dir === 'rtl' ? 'סה"כ R' : 'Total R', v: `${totalR >= 0 ? '+' : ''}${totalR.toFixed(1)}R`, c: totalR >= 0 ? '#00FFA3' : '#FF4D4D' },
                        { l: dir === 'rtl' ? 'סה"כ P&L' : 'Total P&L', v: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)}$`, c: totalPnl >= 0 ? '#00FFA3' : '#FF4D4D' },
                      ].map(s => (
                        <div key={s.l} style={{ background: `${s.c}06`, border: `1px solid ${s.c}12`, borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
                          <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', color: th.tx3, textTransform: 'uppercase' as const, marginBottom: 4 }}>{s.l}</div>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: s.c }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}
              </div>
              {/* Archive List */}
              <div style={{ display: 'grid', gap: 8 }}>
                {days.filter(d => d.morningSaved).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((day, idx) => {
                  const dp = sumPnl(day);
                  const complete = isDayFullyLocked(day);
                  const dayRisk = getDayColor(day);
                  const totalR = (day.trades || []).reduce((s, t) => s + getTradeR(t), 0);
                  const tradeCount = (day.trades || []).length;
                  const winCount = numWins(day);
                  const wr = tradeCount > 0 ? ((winCount / tradeCount) * 100).toFixed(0) : '—';
                  const c = dp >= 0 ? '#00FFA3' : '#FF4D4D';
                  return (
                    <div key={day.id} onClick={() => { setViewingArchiveId(day.id); setView('journal'); }}
                      style={{
                        background: th.cardBg, border: `1px solid ${dayRisk === 'darkred' ? 'rgba(255,77,77,0.3)' : th.cardBr}`, borderRadius: 14,
                        overflow: 'hidden', cursor: 'pointer', transition: 'all .4s cubic-bezier(0.16,1,0.3,1)',
                        opacity: 0, animation: `j-slide-up .4s ease-out ${idx * 0.04}s forwards`,
                        borderInlineStart: `3px solid ${c}`,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px rgba(0,0,0,0.2), 0 0 0 1px ${c}15`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                      <div style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, flexWrap: 'wrap' as const }}>
                          {/* Date */}
                          <div style={{ minWidth: 100 }}>
                            <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 800, color: th.tx }}>{fmtShort(day.date, t.locale)}</div>
                            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 9, color: th.tx3, marginTop: 2 }}>{day.dayNum ? `${dir === 'rtl' ? 'יום' : 'Day'} ${day.dayNum}` : ''}</div>
                          </div>
                          {/* Tags */}
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const }}>
                            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8, fontWeight: 700, color: complete ? '#00FFA3' : '#FFC857', background: complete ? 'rgba(0,255,163,.08)' : 'rgba(255,200,87,.08)', padding: '3px 8px', borderRadius: 6, letterSpacing: '0.5px' }}>{complete ? '🔒' : '☀️'}</span>
                            {dayRisk === 'darkred' && <span style={{ fontSize: 8, fontWeight: 700, color: '#FF4D4D', background: 'rgba(255,77,77,.08)', padding: '3px 8px', borderRadius: 6 }}>⚠️</span>}
                            {day.bias && <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8, fontWeight: 600, color: th.tx3, background: th.inputBg, padding: '3px 8px', borderRadius: 6 }}>{day.bias}</span>}
                          </div>
                          {/* Mini metrics */}
                          {tradeCount > 0 && (
                            <div style={{ display: 'flex', gap: 12, marginInlineStart: 'auto' }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1px' }}>TRADES</div>
                                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 800, color: th.tx2 }}>{tradeCount}</div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1px' }}>WIN%</div>
                                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 800, color: parseInt(wr) >= 50 ? '#00FFA3' : '#FF4D4D' }}>{wr}%</div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1px' }}>R</div>
                                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 800, color: totalR >= 0 ? '#00FFA3' : '#FF4D4D' }}>{totalR >= 0 ? '+' : ''}{totalR.toFixed(1)}</div>
                              </div>
                            </div>
                          )}
                        </div>
                        {/* P&L */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 16, fontWeight: 800, color: c, textShadow: `0 0 12px ${c}25` }}>{dp >= 0 ? '+' : ''}{dp.toFixed(0)}$</div>
                          {day.emotionScore && <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, color: day.emotionScore >= 7 ? '#00FFA3' : day.emotionScore >= 4 ? '#FFC857' : '#FF4D4D', marginTop: 2 }}>😊 {day.emotionScore}/10</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {days.filter(d => d.morningSaved).length === 0 && (
                  <div style={{ textAlign: 'center', padding: 70, color: th.tx3, fontFamily: "'Poppins',sans-serif", fontSize: 14 }}>
                    <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📂</div>
                    {t.arch.none}
                  </div>
                )}
              </div>
            </div>
          )}

          {view === 'analytics' && (
            <div style={{ maxWidth: 1000, margin: '0 auto', padding: '22px 22px 50px', direction: dir }}>
              {/* Dashboard Header */}
              <div style={{ marginBottom: 24, animation: 'j-fade-in .3s ease-out' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, rgba(90,169,255,0.12), rgba(183,148,246,0.08))', border: '1px solid rgba(90,169,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📊</div>
                  <div>
                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 22, fontWeight: 800, color: th.tx }}>{dir === 'rtl' ? 'מערכת מודיעין למסחר' : 'Trading Intelligence System'}</div>
                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, color: th.tx3 }}>{dir === 'rtl' ? 'תובנות אוטומטיות · זיהוי דפוסים · ניתוח אסטרטגי' : 'Auto insights · Pattern recognition · Strategy analysis'}</div>
                  </div>
                </div>
              </div>
              <AnalyticsPanel days={days} dir={dir} th={th} />
            </div>
          )}
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          padding: '10px 22px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "'Poppins',sans-serif",
          ...TOAST_STYLES[toast.type],
          animation: 'j-slide-up .3s ease-out',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>{toast.msg}</div>
      )}
    </div>
  );
};
