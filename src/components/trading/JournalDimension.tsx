import { useState, useEffect, useCallback, useMemo, useRef, forwardRef } from 'react';
import type { Trade } from '@/data/trades';
import { readJournalState, writeJournalState, type JournalDay, type JournalTrade, type JournalState, type PsychAnswers } from '@/lib/journal-storage';
import { ReturnButton } from './DimensionController';
import { playSystemOpen, playMorningLock, playEODLock, playRiskAlert } from '@/lib/apex-sounds';
import { MORNING_VARIATIONS, EOD_VARIATIONS } from '@/lib/journal-demo-data';
import { getR, sumR, formatR } from '@/lib/r-multiple';

// ─── Display-mode awareness ────────────────────────────────────
// Lightweight hook so any sub-component can hide $ amounts when the
// user is in R-Multiple mode. Mirrors the key used by display-mode.tsx.
const JDM_KEY = 'orca:displayMode';
function useJournalIsR(): boolean {
  const [isR, setIsR] = useState<boolean>(() => {
    try { return typeof window !== 'undefined' && window.localStorage.getItem(JDM_KEY) === 'R_MULTIPLE'; }
    catch { return false; }
  });
  useEffect(() => {
    const onChange = (e: Event) => {
      const ce = e as CustomEvent<string>;
      if (ce.detail === 'R_MULTIPLE' || ce.detail === 'MONEY') setIsR(ce.detail === 'R_MULTIPLE');
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === JDM_KEY) setIsR(e.newValue === 'R_MULTIPLE');
    };
    window.addEventListener('orca:displayMode-changed', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('orca:displayMode-changed', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return isR;
}


// ═══════════════════════════════════════════════════════════════
// CINEMATIC ENTRY SCREEN
// ═══════════════════════════════════════════════════════════════
const ENTRY_SESSION_KEY = 'journal-entry-seen';

const JournalEntryScreen = ({ onEnter, isRTL = true }: { onEnter: () => void; isRTL?: boolean }) => {
  const [phase, setPhase] = useState<'ambient' | 'boot' | 'ready' | 'portal' | 'consumed'>('ambient');
  const [bootStep, setBootStep] = useState(0);
  const [clock, setClock] = useState('');
  const [portalScale, setPortalScale] = useState(0);
  const [particles, setParticles] = useState<{id:number;x:number;y:number;s:number;d:number;o:number}[]>([]);
  const soundPlayed = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour12: false }));
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, []);

  // Ambient particle field
  useEffect(() => {
    const pts = Array.from({ length: 60 }, (_, i) => ({
      id: i, x: Math.random() * 100, y: Math.random() * 100,
      s: 0.5 + Math.random() * 2, d: Math.random() * 360, o: 0.1 + Math.random() * 0.4,
    }));
    setParticles(pts);
  }, []);

  // Canvas waveform animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let t = 0;
    const animate = () => {
      t += 0.008;
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw 3 waves
      [{ c: '#00FFA3', a: 30, f: 0.008, o: 0.15 }, { c: '#5AA9FF', a: 20, f: 0.012, o: 0.1 }, { c: '#b794f6', a: 15, f: 0.006, o: 0.08 }].forEach(wave => {
        ctx.beginPath();
        ctx.strokeStyle = wave.c;
        ctx.globalAlpha = wave.o;
        ctx.lineWidth = 2;
        for (let x = 0; x < canvas.width; x += 2) {
          const y = canvas.height / 2 + Math.sin(x * wave.f + t * 3) * wave.a * 2 + Math.sin(x * wave.f * 0.5 + t * 1.5) * wave.a;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      });
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Boot sequence
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('boot'), 800);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== 'boot') return;
    const timers = [
      setTimeout(() => setBootStep(1), 300),
      setTimeout(() => setBootStep(2), 700),
      setTimeout(() => setBootStep(3), 1100),
      setTimeout(() => { setBootStep(4); setPhase('ready'); }, 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'ready' || soundPlayed.current) return;
    soundPlayed.current = true;
    playSystemOpen();
  }, [phase]);

  const handleEnter = () => {
    setPhase('portal');
    setPortalScale(0);
    // Animate portal expansion
    let scale = 0;
    const step = () => {
      scale += 0.025;
      if (scale >= 1) {
        setPortalScale(1);
        setPhase('consumed');
        sessionStorage.setItem(ENTRY_SESSION_KEY, '1');
        setTimeout(onEnter, 400);
        return;
      }
      // Easing: cubic ease-in
      const eased = scale * scale * scale;
      setPortalScale(eased);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  const handleSkip = () => {
    sessionStorage.setItem(ENTRY_SESSION_KEY, '1');
    onEnter();
  };

  const BOOT_LABELS = ['CORE', 'DATA', 'ENGINE', 'ONLINE'];
  const TICKER = [
    { pair: 'BTC/USD', change: '+1.21' }, { pair: 'ETH/USD', change: '+4.30' },
    { pair: 'SOL/USD', change: '-2.85' }, { pair: 'BNB/USD', change: '-0.41' },
  ];

  const portalRadius = portalScale * Math.max(window.innerWidth, window.innerHeight) * 1.5;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#030610',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Poppins', 'Inter', sans-serif",
      overflow: 'hidden',
      opacity: phase === 'consumed' ? 0 : 1,
      transition: phase === 'consumed' ? 'opacity 0.4s ease' : 'none',
    }}>
      {/* Floating particles */}
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
          width: p.s, height: p.s, borderRadius: '50%',
          background: p.id % 3 === 0 ? '#00FFA3' : p.id % 3 === 1 ? '#5AA9FF' : '#b794f6',
          opacity: phase === 'portal' ? 0 : p.o,
          transition: 'opacity 0.5s ease',
          animation: `j-float-particle ${8 + p.id % 5}s ease-in-out infinite alternate`,
          animationDelay: `${p.id * 0.1}s`,
        }} />
      ))}

      {/* Canvas waveform */}
      <canvas ref={canvasRef} style={{
        position: 'absolute', bottom: 0, left: 0, width: '100%', height: '35%',
        opacity: phase === 'portal' ? 0 : 0.6,
        transition: 'opacity 0.6s ease',
      }} />

      {/* Radial vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 45%, transparent 30%, #030610 75%)',
      }} />

      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,255,163,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,163,0.025) 1px, transparent 1px)',
        backgroundSize: '80px 80px',
        opacity: bootStep >= 1 ? 0.5 : 0,
        transition: 'opacity 1.5s ease',
        transform: `perspective(800px) rotateX(${phase === 'portal' ? 25 : 0}deg)`,
        transformOrigin: 'bottom center',
      }} />

      {/* Skip button */}
      <button onClick={handleSkip} style={{
        position: 'absolute', top: 16, right: 20, zIndex: 20,
        fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 600,
        color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
        padding: '6px 16px', cursor: 'pointer', letterSpacing: '1px',
        transition: 'all 0.2s ease',
        opacity: phase === 'portal' || phase === 'consumed' ? 0 : 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
      >SKIP →</button>

      {/* Top ticker */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', borderBottom: '1px solid rgba(0,255,163,0.06)',
        background: 'rgba(0,0,0,0.3)', fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        opacity: bootStep >= 1 ? 1 : 0, transform: bootStep >= 1 ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'all 0.6s ease',
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FFA3', boxShadow: '0 0 12px #00FFA3', animation: 'j-pulse-dot 2s infinite' }} />
          <span style={{ color: '#00FFA3', fontWeight: 700, letterSpacing: 2, fontSize: 10 }}>LIVE</span>
        </div>
        <div style={{ display: 'flex', gap: 20, overflow: 'hidden' }}>
          {TICKER.map((t, i) => (
            <span key={i} style={{ color: '#94a3b8', whiteSpace: 'nowrap', fontSize: 10 }}>
              <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{t.pair}</span>{' '}
              <span style={{ color: t.change.startsWith('+') ? '#00FFA3' : '#FF4040', fontWeight: 700 }}>{t.change}%</span>
            </span>
          ))}
        </div>
        <span style={{ color: '#00FFA3', fontWeight: 700, fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>{clock}</span>
      </div>

      {/* Center content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 2,
        opacity: phase === 'portal' || phase === 'consumed' ? 0 : 1,
        transform: phase === 'portal' ? 'scale(0.8)' : 'scale(1)',
        transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
      }}>
        {/* Logo hexagon */}
        <div style={{
          width: 80, height: 80, marginBottom: 28, position: 'relative',
          opacity: bootStep >= 1 ? 1 : 0,
          transform: bootStep >= 1 ? 'scale(1) rotateY(0deg)' : 'scale(0.5) rotateY(90deg)',
          transition: 'all 0.8s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="hex-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#00FFA3" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#5AA9FF" stopOpacity="0.1" />
              </linearGradient>
              <filter id="hex-glow"><feGaussianBlur stdDeviation="3" /><feComposite in="SourceGraphic" /></filter>
            </defs>
            <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="url(#hex-grad)" stroke="#00FFA3" strokeWidth="1" opacity="0.6" filter="url(#hex-glow)" />
            <polygon points="40,4 72,22 72,58 40,76 8,58 8,22" fill="none" stroke="#00FFA3" strokeWidth="0.5" opacity="0.3" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#00FFA3" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 17l3-3 4 4 6-8 5 5" /><path d="M14 7l7 0 0 7" />
            </svg>
          </div>
        </div>

        <h1 style={{
          fontSize: 'clamp(36px, 8vw, 56px)', fontWeight: 800,
          letterSpacing: '-2px', marginBottom: 6, lineHeight: 1,
          opacity: bootStep >= 1 ? 1 : 0,
          transform: bootStep >= 1 ? 'translateY(0)' : 'translateY(30px)',
          transition: 'all 0.9s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <span style={{ color: '#ffffff' }}>Orca</span>
          <span style={{ fontWeight: 300, color: '#475569', marginLeft: 8 }}>Journal</span>
        </h1>
        <p style={{
          fontSize: 'clamp(10px, 2vw, 12px)', fontWeight: 600,
          color: '#475569', letterSpacing: 6, textTransform: 'uppercase' as const,
          marginBottom: 48,
          opacity: bootStep >= 2 ? 1 : 0, transition: 'opacity 1s ease 0.2s',
        }}>{isRTL ? 'יומן מסחר חכם' : 'Smart Trading Journal'}</p>

        {/* Boot indicators */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 28, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
          {BOOT_LABELS.map((label, i) => (
            <span key={i} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              color: bootStep > i ? '#00FFA3' : '#1e293b',
              transition: 'color 0.4s ease',
            }}>
              <span style={{
                width: 4, height: 4, borderRadius: '50%',
                background: bootStep > i ? '#00FFA3' : '#1e293b',
                boxShadow: bootStep > i ? '0 0 10px #00FFA3' : 'none',
                transition: 'all 0.4s ease',
              }} />
              {label}
            </span>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{
          width: 'min(200px, 60vw)', height: 2,
          background: 'rgba(255,255,255,0.04)', borderRadius: 1,
          overflow: 'hidden', marginBottom: 32,
          opacity: phase === 'ready' ? 0 : 1, transition: 'opacity 0.5s ease',
        }}>
          <div style={{
            height: '100%', width: `${(bootStep / 4) * 100}%`,
            background: 'linear-gradient(90deg, #00FFA3, #5AA9FF)',
            borderRadius: 1, transition: 'width 0.5s ease',
            boxShadow: '0 0 10px rgba(0,255,163,0.5)',
          }} />
        </div>

        {/* Enter button */}
        {phase === 'ready' && (
          <div style={{ animation: 'j-entry-btn 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
            <button onClick={handleEnter} style={{
              padding: 'clamp(16px, 3vw, 20px) clamp(48px, 12vw, 72px)',
              fontSize: 'clamp(12px, 2.5vw, 14px)', fontWeight: 800,
              letterSpacing: 4, textTransform: 'uppercase' as const,
              color: '#030610', background: 'linear-gradient(135deg, #00FFA3, #00CC82)',
              border: 'none', borderRadius: 14, cursor: 'pointer',
              boxShadow: '0 0 60px rgba(0,255,163,0.2), 0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
              transition: 'all 0.3s cubic-bezier(0.16,1,0.3,1)',
              fontFamily: "'Poppins', sans-serif", position: 'relative',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
              e.currentTarget.style.boxShadow = '0 0 100px rgba(0,255,163,0.3), 0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 0 60px rgba(0,255,163,0.2), 0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)';
            }}
            >{isRTL ? 'כניסה ליומן' : 'ENTER JOURNAL'}</button>
            <div style={{
              textAlign: 'center', marginTop: 12, fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, color: '#334155', letterSpacing: 2,
            }}>{isRTL ? 'לחץ אנטר או על הכפתור' : 'PRESS ENTER OR CLICK'}</div>
          </div>
        )}
      </div>

      {/* Portal overlay */}
      {(phase === 'portal' || phase === 'consumed') && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            width: portalRadius * 2, height: portalRadius * 2,
            borderRadius: '50%', background: '#030610',
            boxShadow: `0 0 ${80 + portalScale * 120}px ${40 + portalScale * 60}px rgba(0,255,163,${0.15 * (1 - portalScale)}), inset 0 0 ${60 + portalScale * 100}px rgba(0,255,163,${0.1 * (1 - portalScale)})`,
            border: `2px solid rgba(0,255,163,${0.3 * (1 - portalScale)})`,
            transition: 'none',
          }} />
        </div>
      )}

      {/* Bottom bar */}
      <div style={{
        position: 'relative', zIndex: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
        padding: '10px 16px', borderTop: '1px solid rgba(0,255,163,0.05)',
        background: 'rgba(0,0,0,0.2)', fontSize: 9,
        fontFamily: "'JetBrains Mono', monospace", color: '#334155', letterSpacing: 2,
        opacity: phase === 'portal' || phase === 'consumed' ? 0 : 1,
        transition: 'opacity 0.4s ease',
      }}>
        <span>Orca Journal v4.0</span>
        <span style={{ color: '#00FFA340' }}>●</span>
        <span>ENCRYPTED</span>
        <span style={{ color: '#00FFA340' }}>●</span>
        <span>LOCAL STORAGE</span>
      </div>

      <style>{`
        @keyframes j-entry-btn {
          from { opacity: 0; transform: translateY(20px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes j-pulse-dot {
          0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
        }
        @keyframes j-float-particle {
          0% { transform: translate(0, 0); }
          100% { transform: translate(${Math.random() * 20 - 10}px, ${Math.random() * 20 - 10}px); }
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
    eodImages: [],
    btcThoughts: '',
    psychAnswers: { sleepWell: null, feelingPressure: null, seekingExcitement: null, recoveringLosses: null },
    disciplineCommitments: [],
    disciplineConfirmed: false,
    sectionLocks: {},
  };
};

const sumPnl = (d: JournalDay) => (d.trades || []).reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
const numWins = (d: JournalDay) => (d.trades || []).filter(t => parseFloat(t.pnl) > 0).length;
const isMeaningfulJournalTrade = (jtr: Partial<JournalTrade> | undefined | null) => {
  const pair = String(jtr?.pair || '').trim();
  const hasData = [jtr?.pair, jtr?.entry, jtr?.exit, jtr?.pnl, jtr?.rr, jtr?.size, jtr?.notes].some(v => {
    if (typeof v === 'string' && v.trim().length > 0) return true;
    const n = parseFloat(String(v ?? ''));
    return Number.isFinite(n) && n !== 0;
  });
  return pair.length > 0 || hasData;
};
const buildJournalOrcaPayload = (day: JournalDay, jtr: JournalTrade): Omit<Trade, 'id' | 'balance'> => {
  const nowTime = new Date().toTimeString().slice(0, 5);
  const dateStr = `${safeDateStr(day.date)} ${nowTime}`;
  const dayLabel = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(`${safeDateStr(day.date)}T12:00`).getDay()] || 'Mon';
  const entry = parseFloat(jtr.entry) || 0;
  const exit = parseFloat(jtr.exit) || 0;
  const size = parseFloat(jtr.size) || 0;
  const pnl = parseFloat(jtr.pnl) || 0;
  const rr = getTradeR(jtr);
  const winLoss: Trade['winLoss'] = pnl > 0.05 ? 'Win' : pnl < -0.05 ? 'Loss' : 'Break Even';
  const direction: Trade['direction'] = (jtr.side === 'SHORT' || jtr.side === 'Short') ? 'Short' : 'Long';
  return {
    date: dateStr, day: dayLabel,
    coin: (jtr.pair || 'JOURNAL').toString().toUpperCase().slice(0, 12),
    direction, orderType: 'Market',
    entry, stopLoss: 0, exit, returnR: rr,
    winLoss, risk: Math.abs(pnl / Math.max(Math.abs(rr) || 1, 1)) || 0,
    expectedLoss: 0, pnl, deviation: 0,
    positionSize: size, leverage: 1, riskPct: 0, rules: true,
    comments: `__JID:${jtr.id}__ ${jtr.notes || ''}`.trim(),
  };
};
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

// Compact Risk Control for EOD section
const CompactRiskControl = ({ risk, dir, th }: { risk: JRiskStatus; dir: string; th: typeof THEMES.dark }) => {
  if (!risk) return null;
  const items = [
    { label: dir === 'rtl' ? 'יומי' : 'Daily', used: risk.dailyR, limit: RISK_LIMITS.day, c: '#00FFA3' },
    { label: dir === 'rtl' ? 'שבועי' : 'Weekly', used: risk.weeklyR, limit: RISK_LIMITS.week, c: '#FFC857' },
    { label: dir === 'rtl' ? 'חודשי' : 'Monthly', used: risk.monthlyR, limit: RISK_LIMITS.month, c: '#5AA9FF' },
  ];
  return (
    <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 12, padding: '12px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ fontSize: 11 }}>🛡</span>
        <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8, fontWeight: 800, letterSpacing: '2px', color: th.tx3, textTransform: 'uppercase' as const }}>RISK CONTROL</span>
        {risk.breachedLevel !== 'none' && <span style={{ fontSize: 8, color: '#FF4D4D', fontWeight: 700, animation: 'j-pulse 1s infinite' }}>⚠</span>}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        {items.map(item => {
          const pct = Math.min(100, (Math.abs(item.used) / Math.abs(item.limit)) * 100);
          const mc = pct >= 80 ? '#FF4D4D' : pct >= 50 ? '#FFC857' : item.c;
          return (
            <div key={item.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1px', marginBottom: 4 }}>{item.label}</div>
              <div style={{ height: 3, background: th.inputBg, borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: mc, borderRadius: 2, transition: 'width .5s ease' }} />
              </div>
              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 800, color: mc }}>{item.used.toFixed(1)}R <span style={{ fontSize: 8, color: th.tx3, fontWeight: 400 }}>/ {item.limit}R</span></div>
            </div>
          );
        })}
      </div>
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
// RISK ALERT MODAL — Cinematic fullscreen warning
// ═══════════════════════════════════════════════════════════════
const RiskAlertModal = ({ risk, t, dir, onClose, th }: { risk: JRiskStatus; t: any; dir: string; onClose: () => void; th: typeof THEMES.dark }) => {
  const level = risk.breachedLevel;
  const [step, setStep] = useState(0);
  const [scanLine, setScanLine] = useState(0);

  const cfgMap = {
    daily: { icon: '⚠️', color: '#f97316', glow: 'rgba(249,115,22,', severity: 'DAILY LIMIT', msg: t.risk.daily },
    weekly: { icon: '🔴', color: '#FF4D4D', glow: 'rgba(255,77,77,', severity: 'WEEKLY LIMIT', msg: t.risk.weekly },
    monthly: { icon: '🚨', color: '#FF0040', glow: 'rgba(255,0,64,', severity: 'MONTHLY LIMIT', msg: t.risk.monthly },
    none: { icon: '', color: '', glow: '', severity: '', msg: '' },
  };
  const cfg = cfgMap[level];

  useEffect(() => {
    if (level === 'none') return;
    playRiskAlert();
    const t1 = setTimeout(() => setStep(1), 100);
    const t2 = setTimeout(() => setStep(2), 500);
    const t3 = setTimeout(() => setStep(3), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [level]);

  useEffect(() => {
    if (step < 2) return;
    let y = 0;
    const iv = setInterval(() => { y = (y + 1.5) % 100; setScanLine(y); }, 30);
    return () => clearInterval(iv);
  }, [step]);

  if (level === 'none') return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 9990,
      background: `radial-gradient(ellipse at 50% 50%, ${cfg.glow}0.15) 0%, rgba(0,0,0,0.94) 60%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(16px)',
      opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.5s ease',
    }}>
      {/* Scan line */}
      <div style={{ position: 'absolute', left: 0, right: 0, height: 2, top: `${scanLine}%`, background: `linear-gradient(90deg, transparent, ${cfg.color}40, transparent)`, opacity: step >= 2 ? 0.5 : 0, pointerEvents: 'none' }} />

      {/* Pulsing rings */}
      {step >= 2 && [1, 2, 3].map(i => (
        <div key={i} style={{
          position: 'absolute', width: 200 + i * 100, height: 200 + i * 100,
          borderRadius: '50%', border: `1px solid ${cfg.glow}${(0.12 / i).toFixed(2)})`,
          animation: `j-risk-ring ${2 + i * 0.5}s ease-in-out infinite`,
          animationDelay: `${i * 0.3}s`,
        }} />
      ))}

      <div onClick={e => e.stopPropagation()} style={{
        position: 'relative', zIndex: 2,
        background: 'linear-gradient(180deg, rgba(15,20,35,0.98), rgba(8,12,24,0.98))',
        border: `1px solid ${cfg.glow}0.3)`, borderRadius: 24,
        padding: '40px 36px', maxWidth: 500, width: '92%', textAlign: 'center',
        boxShadow: `0 0 100px ${cfg.glow}0.15), 0 0 200px ${cfg.glow}0.06), inset 0 1px 0 rgba(255,255,255,0.05)`,
        transform: step >= 2 ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(40px)',
        opacity: step >= 2 ? 1 : 0,
        transition: 'all 0.6s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`, borderRadius: '24px 24px 0 0', animation: 'j-pulse 1.5s ease-in-out infinite' }} />

        <div style={{ fontSize: 64, marginBottom: 20, lineHeight: 1, filter: `drop-shadow(0 0 20px ${cfg.glow}0.5))`, animation: step >= 3 ? 'j-risk-icon-shake 0.5s ease-in-out' : 'none' }}>{cfg.icon}</div>

        <div style={{ display: 'inline-block', padding: '6px 20px', borderRadius: 20, background: `${cfg.glow}0.12)`, border: `1px solid ${cfg.glow}0.3)`, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: 3, color: cfg.color, marginBottom: 16, animation: 'j-pulse 1.5s ease-in-out infinite' }}>⚡ {cfg.severity} BREACHED</div>

        <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: "'Poppins',sans-serif", marginBottom: 14 }}>{t.risk.title}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, marginBottom: 24, fontFamily: "'Poppins',sans-serif", direction: dir as 'ltr' | 'rtl', maxWidth: 380, margin: '0 auto 24px' }}>{cfg.msg}</div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 28 }}>
          {[
            { l: t.risk.dailyLabel, v: risk.dailyR, b: risk.dailyBreached, limit: '-2R' },
            { l: t.risk.weeklyLabel, v: risk.weeklyR, b: risk.weeklyBreached, limit: '-5R' },
            { l: t.risk.monthlyLabel, v: risk.monthlyR, b: risk.monthlyBreached, limit: '-10R' },
          ].map(s => (
            <div key={s.l} style={{
              flex: 1, padding: '14px 12px', borderRadius: 14,
              background: s.b ? `${cfg.glow}0.08)` : 'rgba(255,255,255,0.03)',
              border: `1px solid ${s.b ? `${cfg.glow}0.25)` : 'rgba(255,255,255,0.06)'}`,
            }}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 7, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, textTransform: 'uppercase' as const, marginBottom: 6 }}>{s.l}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 800, color: s.b ? cfg.color : 'rgba(255,255,255,0.8)', lineHeight: 1, textShadow: s.b ? `0 0 20px ${cfg.glow}0.4)` : 'none' }}>{s.v.toFixed(1)}R</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>limit {s.limit}</div>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{
          padding: '14px 44px', borderRadius: 14, cursor: 'pointer', fontSize: 13, fontWeight: 800,
          fontFamily: "'Poppins',sans-serif", letterSpacing: 1, textTransform: 'uppercase' as const,
          color: '#fff', background: `linear-gradient(135deg, ${cfg.glow}0.3), ${cfg.glow}0.15))`,
          border: `1px solid ${cfg.glow}0.4)`, boxShadow: `0 4px 20px ${cfg.glow}0.2)`,
          transition: 'all 0.25s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >{t.risk.understand}</button>
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
  const isR = useJournalIsR();
  const rVal = (() => { try { return getR(trade as any); } catch { return 0; } })();
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
          {isR
            ? (rVal !== 0 && <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 800, color: rVal > 0 ? '#00FFA3' : '#FF4D4D', textShadow: `0 0 12px ${rVal > 0 ? 'rgba(0,255,163,0.3)' : 'rgba(255,77,77,0.3)'}` }}>{rVal > 0 ? '+' : ''}{rVal.toFixed(2)}R</span>)
            : (p !== 0 && <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 800, color: p > 0 ? '#00FFA3' : '#FF4D4D', textShadow: `0 0 12px ${p > 0 ? 'rgba(0,255,163,0.3)' : 'rgba(255,77,77,0.3)'}` }}>{p > 0 ? '+' : ''}{p.toFixed(2)}$</span>)}
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

const Expandable = ({ title, icon, accent, children, th, defaultOpen = false }: { title: string; icon: string; accent: string; children: React.ReactNode; th: typeof THEMES.dark; defaultOpen?: boolean }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 14, overflow: 'hidden', transition: 'all .3s' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' as const, color: accent }}>{title}</span>
        </div>
        <span style={{ fontSize: 11, color: th.tx3, fontWeight: 700, transition: 'transform .3s', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>⊕</span>
      </button>
      {open && <div style={{ padding: '0 16px 16px', animation: 'j-slide-up .3s ease' }}>{children}</div>}
    </div>
  );
};

const KPI = ({ label, value, color, sub, th, large }: { label: string; value: string; color: string; sub?: string; th: typeof THEMES.dark; large?: boolean }) => (
  <div style={{ textAlign: 'center', padding: large ? '10px 6px' : '8px 4px' }}>
    <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '1.5px', color: th.tx3, textTransform: 'uppercase' as const, marginBottom: 3 }}>{label}</div>
    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: large ? 20 : 15, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
    {sub && <div style={{ fontSize: 8, color: th.tx3, marginTop: 2, fontWeight: 600 }}>{sub}</div>}
  </div>
);

const AnalyticsPanel = ({ days, dir, th }: { days: JournalDay[]; dir: string; th: typeof THEMES.dark }) => {
  const isRTL = dir === 'rtl';
  const isR = useJournalIsR();
  const completeDays = useMemo(() => days.filter(d => d.eodSaved && d.trades?.length > 0).sort((a, b) => a.date.localeCompare(b.date)), [days]);
  const allTrades = useMemo(() => completeDays.flatMap(d => (d.trades || []).map(t => ({ ...t, dayDate: d.date, dayScore: d.dayScore, emotionScore: d.emotionScore, plan: d.plan, disciplineConfirmed: d.disciplineConfirmed }))), [completeDays]);
  const [heatMonth, setHeatMonth] = useState(() => { const n = new Date(); return { y: n.getFullYear(), m: n.getMonth() }; });
  const [perfTab, setPerfTab] = useState<'monthly' | 'yearly'>('monthly');

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
  const avgEmotion = completeDays.length > 0 ? completeDays.reduce((s, d) => s + (d.emotionScore || 5), 0) / completeDays.length : 5;

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

  // ─── Streaks ───
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

  // ─── Drawdown ───
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

  // ─── Consistency ───
  const consistency = useMemo(() => {
    const greenDays = completeDays.filter(d => sumPnl(d) >= 0).length;
    const greenRatio = completeDays.length > 0 ? (greenDays / completeDays.length) * 100 : 0;
    const dailyR = completeDays.map(d => (d.trades || []).reduce((s, t) => s + getTradeR(t), 0));
    const meanR = dailyR.length > 0 ? dailyR.reduce((s, r) => s + r, 0) / dailyR.length : 0;
    const variance = dailyR.length > 1 ? dailyR.reduce((s, r) => s + (r - meanR) ** 2, 0) / (dailyR.length - 1) : 0;
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev > 0 ? meanR / stdDev : 0;
    const sortedPnl = [...dailyR].sort((a, b) => b - a);
    const topDayR = sortedPnl[0] || 0;
    const totalPos = dailyR.filter(r => r > 0).reduce((s, r) => s + r, 0);
    const concentration = totalPos > 0 ? (topDayR / totalPos) * 100 : 0;
    return { greenDays, greenRatio, sharpe, stdDev, concentration, meanR };
  }, [completeDays]);

  // ─── R-Distribution ───
  const rDistribution = useMemo(() => {
    const rValues = allTrades.map(t => getTradeR(t as any));
    if (rValues.length === 0) return { buckets: [], median: 0, skew: 0, mode: '' };
    const sorted = [...rValues].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const mean = rValues.reduce((s, r) => s + r, 0) / rValues.length;
    const std = Math.sqrt(rValues.reduce((s, r) => s + (r - mean) ** 2, 0) / rValues.length);
    const skew = std > 0 ? rValues.reduce((s, r) => s + ((r - mean) / std) ** 3, 0) / rValues.length : 0;
    const bucketDef = [
      { label: '<-2R', min: -Infinity, max: -2 },
      { label: '-2→-1R', min: -2, max: -1 },
      { label: '-1→0R', min: -1, max: 0 },
      { label: '0→1R', min: 0, max: 1 },
      { label: '1→2R', min: 1, max: 2 },
      { label: '2→3R', min: 2, max: 3 },
      { label: '>3R', min: 3, max: Infinity },
    ];
    const buckets = bucketDef.map(b => ({ ...b, count: rValues.filter(r => r >= b.min && r < b.max).length }));
    const maxCount = Math.max(...buckets.map(b => b.count));
    const modeBucket = buckets.find(b => b.count === maxCount);
    return { buckets, median, skew, mode: modeBucket ? modeBucket.label : '—' };
  }, [allTrades]);

  // ─── Trade Frequency ───
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
    return { entries, optimal, avgTradesPerDay, overtradingDays: overtrading.length };
  }, [completeDays, totalTrades]);

  // ─── Decision Quality ───
  const decisionQuality = useMemo(() => {
    const withPlan = completeDays.filter(d => d.plan && d.plan.trim().length > 15);
    const goodDecGoodOut = withPlan.filter(d => d.disciplineConfirmed && sumPnl(d) > 0).length;
    const goodDecBadOut = withPlan.filter(d => d.disciplineConfirmed && sumPnl(d) < 0).length;
    const badDecGoodOut = completeDays.filter(d => !d.disciplineConfirmed && sumPnl(d) > 0).length;
    const badDecBadOut = completeDays.filter(d => !d.disciplineConfirmed && sumPnl(d) < 0).length;
    const totalDec = goodDecGoodOut + goodDecBadOut;
    const decisionPct = (goodDecGoodOut + goodDecBadOut + badDecGoodOut + badDecBadOut) > 0 ? ((goodDecGoodOut + goodDecBadOut) / (goodDecGoodOut + goodDecBadOut + badDecGoodOut + badDecBadOut)) * 100 : 0;
    const outcomePct = (goodDecGoodOut + goodDecBadOut + badDecGoodOut + badDecBadOut) > 0 ? ((goodDecGoodOut + badDecGoodOut) / (goodDecGoodOut + goodDecBadOut + badDecGoodOut + badDecBadOut)) * 100 : 0;
    return { goodDecGoodOut, goodDecBadOut, badDecGoodOut, badDecBadOut, total: goodDecGoodOut + goodDecBadOut + badDecGoodOut + badDecBadOut, decisionPct, outcomePct };
  }, [completeDays]);

  // ─── Execution Intelligence ───
  const executionIntel = useMemo(() => {
    const withNotes = allTrades.filter(t => (t.notes || '').trim().length > 5);
    const earlyExits = withNotes.filter(t => (t.notes || '').toLowerCase().includes('early') || (t.notes || '').includes('מוקדם'));
    const deviations = withNotes.filter(t => (t.notes || '').toLowerCase().includes('deviat') || (t.notes || '').includes('סטייה'));
    const entryPct = totalTrades > 0 ? Math.min(100, Math.round(((totalTrades - deviations.length) / totalTrades) * 100)) : 100;
    const exitPct = totalTrades > 0 ? Math.min(100, Math.round(((totalTrades - earlyExits.length) / totalTrades) * 100)) : 100;
    return { entryPct, exitPct, earlyExitPct: totalTrades > 0 ? Math.round((earlyExits.length / totalTrades) * 100) : 0, deviationPct: totalTrades > 0 ? Math.round((deviations.length / totalTrades) * 100) : 0 };
  }, [allTrades, totalTrades]);

  // ─── Behavioral tags from emotion data ───
  const behaviorTags = useMemo(() => {
    const tags: { label: string; icon: string; impact: number; color: string }[] = [];
    const highEmo = completeDays.filter(d => d.emotionScore >= 8);
    const lowEmo = completeDays.filter(d => d.emotionScore <= 4);
    if (highEmo.length > 0) { const avg = highEmo.reduce((s, d) => s + (d.trades || []).reduce((ss, t) => ss + getTradeR(t), 0), 0) / highEmo.length; tags.push({ label: 'focus', icon: '🎯', impact: avg, color: avg >= 0 ? '#00FFA3' : '#FF4D4D' }); }
    if (lowEmo.length > 0) { const avg = lowEmo.reduce((s, d) => s + (d.trades || []).reduce((ss, t) => ss + getTradeR(t), 0), 0) / lowEmo.length; tags.push({ label: 'frustration', icon: '😠', impact: avg, color: avg >= 0 ? '#00FFA3' : '#FF4D4D' }); }
    const pressured = completeDays.filter(d => d.psychAnswers?.feelingPressure);
    if (pressured.length > 0) { const avg = pressured.reduce((s, d) => s + (d.trades || []).reduce((ss, t) => ss + getTradeR(t), 0), 0) / pressured.length; tags.push({ label: 'pressure', icon: '😰', impact: avg, color: avg >= 0 ? '#00FFA3' : '#FF4D4D' }); }
    const disciplined = completeDays.filter(d => d.disciplineConfirmed);
    if (disciplined.length > 0) { const avg = disciplined.reduce((s, d) => s + (d.trades || []).reduce((ss, t) => ss + getTradeR(t), 0), 0) / disciplined.length; tags.push({ label: 'conviction', icon: '💪', impact: avg, color: avg >= 0 ? '#00FFA3' : '#FF4D4D' }); }
    return tags.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }, [completeDays]);

  // ─── Emotion-based insights ───
  const emotionInsights = useMemo(() => {
    const ins: { text: string; type: 'warning' | 'success' | 'info' | 'neutral'; icon: string; priority: number }[] = [];
    if (decisionQuality.decisionPct > decisionQuality.outcomePct && decisionQuality.total > 2) {
      ins.push({ icon: '🎯', text: isRTL ? `איכות ההחלטות שלך (${decisionQuality.decisionPct.toFixed(0)}%) גבוהה מהתוצאות (${decisionQuality.outcomePct.toFixed(0)}%) — התהליך שלך חזק יותר ממה שהמספרים מראים` : `Your decision quality (${decisionQuality.decisionPct.toFixed(0)}%) exceeds outcomes (${decisionQuality.outcomePct.toFixed(0)}%) — your process is stronger than results show`, type: 'success', priority: 9 });
    }
    if (streaks.postLossCount >= 2 && streaks.postLossAvg < -0.3) {
      ins.push({ icon: '📉', text: isRTL ? `רצפי הפסדים גוררים עוד הפסדים (ממוצע ${streaks.postLossAvg.toFixed(1)}R)` : `Loss streaks drag further losses (avg ${streaks.postLossAvg.toFixed(1)}R)`, type: 'warning', priority: 7 });
    }
    const pressured = completeDays.filter(d => d.psychAnswers?.feelingPressure);
    if (pressured.length >= 2) {
      const avg = pressured.reduce((s, d) => s + sumPnl(d), 0) / pressured.length;
      ins.push({ icon: '💭', text: isRTL ? `מסחר תחת לחץ מפסיד — ממוצע $${avg.toFixed(0)} ב-${pressured.length} סשנים` : `Trading under pressure loses — avg $${avg.toFixed(0)} in ${pressured.length} sessions`, type: avg < 0 ? 'warning' : 'info', priority: 7 });
    }
    if (decisionQuality.goodDecBadOut >= 3) {
      ins.push({ icon: '✅', text: isRTL ? `${decisionQuality.goodDecBadOut} "הפסדים טובים" — החלטות נכונות עם תוצאות שליליות. התהליך עובד, המשך.` : `${decisionQuality.goodDecBadOut} "good losses" — correct decisions with negative results. Process works, continue.`, type: 'success', priority: 7 });
    }
    if (byStrategy.length > 0 && byStrategy[0].wr > 0) {
      const best = byStrategy[0];
      ins.push({ icon: '🎯', text: isRTL ? `${best.name} היא השיטה החזקה שלך — ממוצע ${best.avgR.toFixed(1)}R, WR ${best.wr.toFixed(0)}%` : `${best.name} is your strongest method — avg ${best.avgR.toFixed(1)}R, WR ${best.wr.toFixed(0)}%`, type: 'success', priority: 7 });
    }
    if (byAsset.length > 0 && byAsset[byAsset.length - 1].r < -2) {
      const worst = byAsset[byAsset.length - 1];
      ins.push({ icon: '💀', text: isRTL ? `${worst.asset} מפסיד — סה"כ ${worst.r.toFixed(1)}R ב-${worst.count} עסקאות` : `${worst.asset} losing — total ${worst.r.toFixed(1)}R in ${worst.count} trades`, type: 'warning', priority: 6 });
    }
    const overDays = completeDays.filter(d => (d.trades || []).length >= 4);
    if (overDays.length >= 1) {
      const avg = overDays.reduce((s, d) => s + (d.trades || []).reduce((ss, t) => ss + getTradeR(t), 0), 0) / overDays.length;
      if (avg < 0) ins.push({ icon: '📊', text: isRTL ? `ביצועים יורדים בימי מסחר-יתר (ממוצע ${avg.toFixed(1)}R)` : `Performance drops on overtrading days (avg ${avg.toFixed(1)}R)`, type: 'warning', priority: 8 });
    }
    return ins.sort((a, b) => b.priority - a.priority);
  }, [completeDays, isRTL, decisionQuality, streaks, byStrategy, byAsset]);

  // ─── Monthly Recap ───
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
      const label = new Date(+y, +m - 1).toLocaleDateString(isRTL ? 'he-IL' : 'en-US', { month: 'long', year: 'numeric' });
      return { ym, label, days: mDays.length, trades: trades.length, wins, losses, be, totalR: tR, totalWinR: wR, totalLossR: lR, avgWinR: wins > 0 ? wR / wins : 0, avgLossR: losses > 0 ? lR / losses : 0, pnl, ev, wr: trades.length > 0 ? (wins / trades.length) * 100 : 0, pf: lR > 0 ? wR / lR : wR > 0 ? Infinity : 0 };
    });
  }, [completeDays, isRTL]);

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
      return { year: yr, days: yDays.length, trades: trades.length, wins, losses, be, totalR: tR, pnl, ev: trades.length > 0 ? tR / trades.length : 0, wr: trades.length > 0 ? (wins / trades.length) * 100 : 0, pf: lR > 0 ? wR / lR : 0 };
    });
  }, [completeDays]);

  // ─── Monthly Heatmap ───
  const heatmapData = useMemo(() => {
    const { y, m } = heatMonth;
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells: { day: number | null; r: number | null; pnl: number | null; hasTrades: boolean }[] = [];
    for (let i = 0; i < firstDay; i++) cells.push({ day: null, r: null, pnl: null, hasTrades: false });
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = completeDays.filter(dd => dd.date === dateStr);
      const dayR = dayData.length > 0 ? dayData.flatMap(dd => dd.trades || []).reduce((s, t) => s + getTradeR(t), 0) : null;
      const dayPnl = dayData.length > 0 ? dayData.reduce((s, dd) => s + sumPnl(dd), 0) : null;
      cells.push({ day: d, r: dayR, pnl: dayPnl, hasTrades: dayData.length > 0 });
    }
    return { cells };
  }, [completeDays, heatMonth]);

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
  const statusColor = totalR >= 0 ? '#00FFA3' : '#FF4D4D';

  // Generate status summary
  const statusSummary = isRTL
    ? `${decisionQuality.decisionPct > 60 ? 'איכות ההחלטות חזקה מהתוצאות.' : 'יש מקום לשיפור באיכות ההחלטות.'} ${byStrategy.length > 0 ? `שיטה מובילה: ${byStrategy[0].name}.` : ''}`
    : `${decisionQuality.decisionPct > 60 ? 'Decision quality stronger than outcomes.' : 'Room to improve decision quality.'} ${byStrategy.length > 0 ? `Leading method: ${byStrategy[0].name}.` : ''}`;

  return (
    <div style={{ display: 'grid', gap: 12 }}>

      {/* ═══ HERO HEADER ═══ */}
      <div style={{ background: `linear-gradient(135deg, ${th.cardBg}, rgba(0,255,163,0.02))`, border: `1px solid ${th.cardBr}`, borderRadius: 16, padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle glow */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${statusColor}08 0%, transparent 70%)`, pointerEvents: 'none' }} />

        {/* Top bar: days · trades · streak */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' as const }}>
          <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: '#5AA9FF', textTransform: 'uppercase' as const }}>{isRTL ? 'מרכז מודיעין מסחרי' : 'TRADING INTELLIGENCE CENTER'}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 10, color: th.tx3, fontWeight: 700 }}>{completeDays.length} {isRTL ? 'ימים' : 'days'}</span>
          <span style={{ fontSize: 10, color: th.tx3 }}>·</span>
          <span style={{ fontSize: 10, color: th.tx3, fontWeight: 700 }}>{totalTrades} {isRTL ? 'עסקאות' : 'trades'}</span>
          <span style={{ fontSize: 10, color: th.tx3 }}>·</span>
          <span style={{ fontSize: 10, color: streaks.currentStreakType === 'win' ? '#00FFA3' : '#FF4D4D', fontWeight: 700 }}>🔥 {streaks.currentStreak}</span>
        </div>

        {/* Big R number */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 36, fontWeight: 800, color: statusColor, lineHeight: 1, letterSpacing: '-0.03em' }}>{totalR >= 0 ? '+' : ''}{totalR.toFixed(1)}R</span>
          <span style={{ fontSize: 10, color: th.tx3, fontWeight: 700 }}>{isRTL ? 'סה"כ R' : 'Total R'}</span>
        </div>

        {/* Status summary */}
        <div style={{ fontSize: 11, color: th.tx2, lineHeight: 1.6, marginBottom: 14, fontFamily: "'Poppins',sans-serif", maxWidth: 500 }}>
          {statusSummary}
        </div>

        {/* Quick KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 6 }} className="j-grid-2col">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: th.inputBg, borderRadius: 10 }}>
            <span style={{ fontSize: 12 }}>💰</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: '#00FFA3' }}>{totalWins}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: '#FF4D4D' }}>{totalLosses}</span>
            {totalBE > 0 && <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: th.tx3 }}>{totalBE}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: th.inputBg, borderRadius: 10 }}>
            <span style={{ fontSize: 10, color: th.tx3, fontWeight: 700 }}>{isRTL ? 'סה"כ' : 'P&L'}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: totalPnl >= 0 ? '#00FFA3' : '#FF4D4D' }}>{totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(0)}$</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: th.inputBg, borderRadius: 10 }}>
            <span style={{ fontSize: 10, color: th.tx3, fontWeight: 700 }}>{isRTL ? 'הצלחה' : 'WR'}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: winRate >= 40 ? '#00FFA3' : '#FF4D4D' }}>{winRate.toFixed(1)}%</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }} className="j-grid-2col">
          <div style={{ textAlign: 'center', padding: '6px 4px', background: th.inputBg, borderRadius: 8 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1px' }}>📐 EV</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: expectancy >= 0 ? '#00FFA3' : '#FF4D4D', marginTop: 2 }}>{expectancy >= 0 ? '+' : ''}{expectancy.toFixed(2)}R</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px 4px', background: th.inputBg, borderRadius: 8 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1px' }}>⚖️ PF</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: profitFactor >= 1 ? '#00FFA3' : '#FF4D4D', marginTop: 2 }}>{profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px 4px', background: th.inputBg, borderRadius: 8 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1px' }}>🧠 {isRTL ? 'רגש' : 'EMO'}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: '#b794f6', marginTop: 2 }}>{avgEmotion.toFixed(1)}</div>
          </div>
          <div style={{ textAlign: 'center', padding: '6px 4px', background: th.inputBg, borderRadius: 8 }}>
            <div style={{ fontSize: 7, fontWeight: 700, color: th.tx3, letterSpacing: '1px' }}>✓ {isRTL ? 'ממ. +' : 'Avg ✓'}</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 800, color: '#00FFA3', marginTop: 2 }}>+{avgWinR.toFixed(1)}R</div>
          </div>
        </div>
      </div>

      {/* ═══ ROW: STREAKS + DRAWDOWN + CONSISTENCY ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }} className="j-grid-2col">
        {/* Streaks */}
        <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 14, padding: '14px 12px' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.5px', color: '#FFC857', textTransform: 'uppercase' as const, marginBottom: 10, fontFamily: "'Poppins',sans-serif" }}>{isRTL ? 'רצפים' : 'STREAKS'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: th.tx3 }}>❄️</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: streaks.currentStreakType === 'win' ? '#00FFA3' : '#FF4D4D' }}>{streaks.currentStreak}</span>
            <span style={{ fontSize: 8, color: th.tx3, fontWeight: 600 }}>{isRTL ? 'רצף נוכחי' : 'current'}</span>
          </div>
          <div style={{ display: 'flex', gap: 10, fontSize: 9, color: th.tx3 }}>
            <span>{isRTL ? 'שיא' : 'Best'} ✓<strong style={{ color: '#00FFA3' }}>{streaks.bestWin}</strong></span>
            <span>{isRTL ? 'שיא' : 'Best'} ✗<strong style={{ color: '#FF4D4D' }}>{streaks.bestLoss}</strong></span>
          </div>
        </div>

        {/* Drawdown */}
        <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 14, padding: '14px 12px' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.5px', color: '#FF4D4D', textTransform: 'uppercase' as const, marginBottom: 8, fontFamily: "'Poppins',sans-serif" }}>{isRTL ? 'משיכה מקסימלית' : 'MAX DRAWDOWN'}</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: '#FF4D4D', marginBottom: 4 }}>-{drawdown.maxDD.toFixed(1)}R</div>
          <div style={{ fontSize: 9, color: th.tx3 }}>{isRTL ? 'נוכחי' : 'Current'} <span style={{ color: drawdown.currentDD > 0 ? '#FFC857' : '#00FFA3', fontWeight: 700 }}>-{drawdown.currentDD.toFixed(1)}R</span></div>
          <div style={{ fontSize: 9, color: th.tx3, marginTop: 2 }}>{isRTL ? 'שחזור' : 'Recovery'} <span style={{ color: '#5AA9FF', fontWeight: 700 }}>{drawdown.recoveryFactor === Infinity ? '∞' : drawdown.recoveryFactor.toFixed(1)}x</span></div>
        </div>

        {/* Consistency */}
        <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 14, padding: '14px 12px' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.5px', color: '#5AA9FF', textTransform: 'uppercase' as const, marginBottom: 8, fontFamily: "'Poppins',sans-serif" }}>{isRTL ? 'עקביות' : 'CONSISTENCY'}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: th.tx3 }}>{isRTL ? 'ימים ירוקים' : 'Green Days'}</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 800, color: consistency.greenRatio >= 50 ? '#00FFA3' : '#FF4D4D' }}>{consistency.greenRatio.toFixed(0)}%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: th.tx3 }}>Sharpe</span>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 800, color: consistency.sharpe >= 0.5 ? '#00FFA3' : '#FF4D4D' }}>{consistency.sharpe.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 9, color: th.tx3 }}>{isRTL ? 'ממ. ✓' : 'Avg ✓'}/{isRTL ? 'ממ. ✗' : 'Avg ✗'}</span>
            <span style={{ fontSize: 10 }}><span style={{ color: '#00FFA3', fontWeight: 700 }}>+{avgWinR.toFixed(0)}$</span> <span style={{ color: '#FF4D4D', fontWeight: 700 }}>-{avgLossR.toFixed(0)}$</span></span>
          </div>
        </div>
      </div>

      {/* ═══ INTELLIGENCE INSIGHTS ═══ */}
      {emotionInsights.length > 0 && (
        <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 14 }}>🔬</span>
            <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', color: '#b794f6', textTransform: 'uppercase' as const }}>{isRTL ? 'מודיעין מסחרי' : 'TRADING INTELLIGENCE'}</span>
          </div>
          <div style={{ fontSize: 9, color: th.tx3, marginBottom: 10, lineHeight: 1.5 }}>{isRTL ? 'תובנות בעדיפות גבוהה מהתנהגות המסחר שלך' : 'High-priority insights from your trading behavior'}</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {emotionInsights.slice(0, 8).map((ins, i) => {
              const c = ins.type === 'warning' ? '#FF4D4D' : ins.type === 'success' ? '#00FFA3' : '#5AA9FF';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: `${c}06`, border: `1px solid ${c}10`, borderRadius: 10 }}>
                  <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{ins.icon}</span>
                  <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, color: th.tx, lineHeight: 1.6 }}>{ins.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ R-DISTRIBUTION ═══ */}
      {rDistribution.buckets.length > 0 && (
        <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.5px', color: '#b794f6', textTransform: 'uppercase' as const, marginBottom: 10, fontFamily: "'Poppins',sans-serif" }}>{isRTL ? 'התפלגות R' : 'R-DISTRIBUTION'}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <span style={{ fontSize: 9, color: th.tx3 }}>{isRTL ? 'חציון' : 'Median'}: <strong style={{ color: '#b794f6' }}>{rDistribution.median.toFixed(1)}R</strong></span>
          </div>
          <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 70, marginBottom: 6 }}>
            {rDistribution.buckets.map((b, i) => {
              const maxC = Math.max(...rDistribution.buckets.map(x => x.count), 1);
              const barH = Math.max(4, (b.count / maxC) * 60);
              const isNeg = b.min < 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 2 }}>
                  {b.count > 0 && <span style={{ fontSize: 8, fontWeight: 800, color: th.tx2 }}>{b.count}</span>}
                  <div style={{ width: '75%', height: barH, borderRadius: 3, background: isNeg ? '#FF4D4D' : '#00FFA3', opacity: 0.7, transition: 'height .5s ease' }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {rDistribution.buckets.map((b, i) => <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: 7, color: th.tx3, fontWeight: 600 }}>{b.label}</div>)}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 9, color: th.tx3 }}>
            <span>{isRTL ? 'הטיה' : 'Skew'}: <strong style={{ color: '#b794f6' }}>{rDistribution.skew > 0 ? '+' : ''}{rDistribution.skew.toFixed(2)}</strong></span>
            <span>{isRTL ? 'מצב' : 'Mode'}: <strong style={{ color: '#b794f6' }}>{rDistribution.mode}</strong></span>
          </div>
        </div>
      )}

      {/* ═══ TRADE FREQUENCY ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="j-grid-2col">
        <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.5px', color: '#FFC857', textTransform: 'uppercase' as const, marginBottom: 10, fontFamily: "'Poppins',sans-serif" }}>{isRTL ? 'תדירות מסחר' : 'TRADE FREQUENCY'}</div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
            <div><div style={{ fontSize: 7, color: th.tx3, fontWeight: 700, letterSpacing: '1px' }}>{isRTL ? 'ממוצע/יום' : 'AVG/DAY'}</div><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: '#5AA9FF' }}>{frequency.avgTradesPerDay.toFixed(1)}</div></div>
            {frequency.optimal && <div><div style={{ fontSize: 7, color: th.tx3, fontWeight: 700, letterSpacing: '1px' }}>{isRTL ? 'אופטימלי' : 'OPTIMAL'}</div><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: '#00FFA3' }}>{frequency.optimal.trades}</div></div>}
            <div><div style={{ fontSize: 7, color: th.tx3, fontWeight: 700, letterSpacing: '1px' }}>{isRTL ? 'ימי יתר' : 'OVER'}</div><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: frequency.overtradingDays > 0 ? '#FF4D4D' : '#00FFA3' }}>{frequency.overtradingDays}</div></div>
          </div>
          {frequency.entries.length > 0 && (
            <div style={{ display: 'grid', gap: 3 }}>
              {frequency.entries.sort((a, b) => a.trades - b.trades).slice(0, 5).map(e => (
                <div key={e.trades} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9 }}>
                  <span style={{ color: th.tx3, fontWeight: 700, minWidth: 16 }}>{e.trades}t</span>
                  <div style={{ flex: 1, height: 3, background: th.inputBg, borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, (e.days / Math.max(...frequency.entries.map(x => x.days))) * 100)}%`, background: e.avgR >= 0 ? '#00FFA3' : '#FF4D4D', borderRadius: 2 }} />
                  </div>
                  <span style={{ color: e.avgR >= 0 ? '#00FFA3' : '#FF4D4D', fontWeight: 800, minWidth: 35, textAlign: 'right' as const, fontFamily: "'JetBrains Mono',monospace" }}>{e.avgR >= 0 ? '+' : ''}{e.avgR.toFixed(1)}R</span>
                  <span style={{ color: th.tx3, minWidth: 16 }}>{e.days}d</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Decision Quality Compact */}
        <Expandable title={isRTL ? 'איכות החלטות' : 'DECISION QUALITY'} icon="🎯" accent="#b794f6" th={th} defaultOpen={decisionQuality.total > 0}>
          {decisionQuality.total > 0 ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                <div style={{ textAlign: 'center', padding: 8, background: 'rgba(0,255,163,0.04)', borderRadius: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#00FFA3', fontFamily: "'JetBrains Mono',monospace" }}>{decisionQuality.goodDecGoodOut}</div>
                  <div style={{ fontSize: 7, color: th.tx3, fontWeight: 700, marginTop: 2 }}>{isRTL ? 'טובה + ניצחון' : 'Good + Win'}</div>
                </div>
                <div style={{ textAlign: 'center', padding: 8, background: 'rgba(90,169,255,0.04)', borderRadius: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#5AA9FF', fontFamily: "'JetBrains Mono',monospace" }}>{decisionQuality.goodDecBadOut}</div>
                  <div style={{ fontSize: 7, color: th.tx3, fontWeight: 700, marginTop: 2 }}>{isRTL ? 'טובה + הפסד' : 'Good + Loss'}</div>
                </div>
                <div style={{ textAlign: 'center', padding: 8, background: 'rgba(255,200,87,0.04)', borderRadius: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#FFC857', fontFamily: "'JetBrains Mono',monospace" }}>{decisionQuality.badDecGoodOut}</div>
                  <div style={{ fontSize: 7, color: th.tx3, fontWeight: 700, marginTop: 2 }}>{isRTL ? 'חלשה + ניצחון' : 'Weak + Win'}</div>
                </div>
                <div style={{ textAlign: 'center', padding: 8, background: 'rgba(255,77,77,0.04)', borderRadius: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#FF4D4D', fontFamily: "'JetBrains Mono',monospace" }}>{decisionQuality.badDecBadOut}</div>
                  <div style={{ fontSize: 7, color: th.tx3, fontWeight: 700, marginTop: 2 }}>{isRTL ? 'חלשה + הפסד' : 'Weak + Loss'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: th.inputBg, borderRadius: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 9, color: th.tx3, fontWeight: 700 }}>{isRTL ? 'החלטה' : 'Decision'}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: decisionQuality.decisionPct >= 60 ? '#00FFA3' : '#FFC857', fontFamily: "'JetBrains Mono',monospace" }}>{decisionQuality.decisionPct.toFixed(0)}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: th.inputBg, borderRadius: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 9, color: th.tx3, fontWeight: 700 }}>{isRTL ? 'תוצאה' : 'Outcome'}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: decisionQuality.outcomePct >= 40 ? '#00FFA3' : '#FF4D4D', fontFamily: "'JetBrains Mono',monospace" }}>{decisionQuality.outcomePct.toFixed(0)}%</span>
              </div>
              {decisionQuality.decisionPct > decisionQuality.outcomePct && (
                <div style={{ fontSize: 9, color: '#00FFA3', fontWeight: 700, textAlign: 'center', padding: '4px 0' }}>
                  {isRTL ? 'פער קיימות' : 'Sustainability gap'}: +{(decisionQuality.decisionPct - decisionQuality.outcomePct).toFixed(0)}%
                </div>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: th.tx3, textAlign: 'center', padding: 12 }}>{isRTL ? 'צריך מחויבות יומית ותוכנית כדי לנתח' : 'Need daily commitment & plan to analyze'}</div>
          )}
        </Expandable>
      </div>

      {/* ═══ EXECUTION + BEHAVIORAL INTELLIGENCE ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="j-grid-2col">
        <Expandable title={isRTL ? 'מודיעין ביצוע' : 'EXECUTION INTEL'} icon="📊" accent="#5AA9FF" th={th}>
          <div style={{ display: 'grid', gap: 6 }}>
            {[
              { l: isRTL ? 'כניסה' : 'Entry', v: `${executionIntel.entryPct}%`, c: executionIntel.entryPct >= 90 ? '#00FFA3' : '#FFC857' },
              { l: isRTL ? 'יציאה' : 'Exit', v: `${executionIntel.exitPct}%`, c: executionIntel.exitPct >= 80 ? '#00FFA3' : '#FFC857' },
              { l: isRTL ? 'יציאות מוקדמות' : 'Early Exits', v: `${executionIntel.earlyExitPct}%`, c: executionIntel.earlyExitPct <= 10 ? '#00FFA3' : '#FF4D4D' },
              { l: isRTL ? 'סטייה מתוכנית' : 'Plan Deviation', v: `${executionIntel.deviationPct}%`, c: executionIntel.deviationPct <= 10 ? '#00FFA3' : '#FF4D4D' },
            ].map(s => (
              <div key={s.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: th.inputBg, borderRadius: 8 }}>
                <span style={{ fontSize: 10, color: th.tx3, fontWeight: 700 }}>{s.l}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 800, color: s.c }}>{s.v}</span>
              </div>
            ))}
          </div>
        </Expandable>

        <Expandable title={isRTL ? 'מודיעין התנהגותי' : 'BEHAVIORAL INTEL'} icon="🧠" accent="#b794f6" th={th}>
          {behaviorTags.length > 0 ? (
            <div style={{ display: 'grid', gap: 4 }}>
              {behaviorTags.map((tag, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: `${tag.color}06`, borderRadius: 8, border: `1px solid ${tag.color}10` }}>
                  <span style={{ fontSize: 13 }}>{tag.icon}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: th.tx2, flex: 1 }}>{tag.label}</span>
                  <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 800, color: tag.color }}>{tag.impact >= 0 ? '+' : ''}{tag.impact.toFixed(1)}R</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: th.tx3, textAlign: 'center', padding: 12 }}>{isRTL ? 'צריך יותר נתונים' : 'Need more data'}</div>
          )}
        </Expandable>
      </div>

      {/* ═══ EQUITY CURVE + TRADE DISTRIBUTION ═══ */}
      <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 14, padding: '14px 16px' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.5px', color: '#00FFA3', textTransform: 'uppercase' as const, marginBottom: 8, fontFamily: "'Poppins',sans-serif" }}>{isRTL ? 'עקומת הון' : 'EQUITY CURVE'} · {totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(0)}$</div>
        {drawdown.equity.length > 2 && (
          <svg width="100%" height="50" viewBox={`0 0 ${drawdown.equity.length} 50`} preserveAspectRatio="none" style={{ borderRadius: 6, overflow: 'hidden' }}>
            {(() => {
              const eq = drawdown.equity;
              const min = Math.min(...eq), max = Math.max(...eq);
              const range = max - min || 1;
              const pts = eq.map((v, i) => `${i},${46 - ((v - min) / range) * 42}`).join(' ');
              return <>
                <polyline points={pts} fill="none" stroke={totalR >= 0 ? '#00FFA3' : '#FF4D4D'} strokeWidth="1.5" opacity="0.8" />
                <polyline points={`0,46 ${pts} ${eq.length - 1},46`} fill={totalR >= 0 ? 'rgba(0,255,163,0.08)' : 'rgba(255,77,77,0.08)'} stroke="none" />
              </>;
            })()}
          </svg>
        )}
        {/* Trade distribution bar */}
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 9, color: th.tx3, fontWeight: 700 }}>{totalTrades} {isRTL ? 'עסקאות' : 'TRADES'}</span>
          <div style={{ flex: 1, height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex', background: th.inputBg }}>
            {totalTrades > 0 && <>
              <div style={{ width: `${(totalWins / totalTrades) * 100}%`, background: '#00FFA3', height: '100%' }} />
              <div style={{ width: `${(totalLosses / totalTrades) * 100}%`, background: '#FF4D4D', height: '100%' }} />
              {totalBE > 0 && <div style={{ width: `${(totalBE / totalTrades) * 100}%`, background: th.tx3, height: '100%' }} />}
            </>}
          </div>
          <div style={{ display: 'flex', gap: 6, fontSize: 9 }}>
            <span style={{ color: '#00FFA3', fontWeight: 700 }}>W {totalWins}</span>
            <span style={{ color: '#FF4D4D', fontWeight: 700 }}>L {totalLosses}</span>
            {totalBE > 0 && <span style={{ color: th.tx3, fontWeight: 700 }}>M {totalBE}</span>}
          </div>
        </div>
      </div>

      {/* ═══ DAILY PNL CALENDAR ═══ */}
      <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 14, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.5px', color: '#00FFA3', textTransform: 'uppercase' as const, fontFamily: "'Poppins',sans-serif" }}>📊 {isRTL ? 'לוח PnL יומי' : 'DAILY PNL BOARD'}</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={() => setHeatMonth(p => p.m === 0 ? { y: p.y - 1, m: 11 } : { ...p, m: p.m - 1 })} style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${th.inputBr}`, background: th.inputBg, cursor: 'pointer', color: th.tx3, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
            <span style={{ fontSize: 10, fontWeight: 700, color: th.tx2, minWidth: 80, textAlign: 'center' }}>{monthLabel}</span>
            <button onClick={() => setHeatMonth(p => p.m === 11 ? { y: p.y + 1, m: 0 } : { ...p, m: p.m + 1 })} style={{ width: 22, height: 22, borderRadius: 6, border: `1px solid ${th.inputBr}`, background: th.inputBg, cursor: 'pointer', color: th.tx3, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 3 }}>
          {(isRTL ? ['א','ב','ג','ד','ה','ו','ש'] : ['S','M','T','W','T','F','S']).map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 7, fontWeight: 700, color: th.tx3, padding: 2 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
          {heatmapData.cells.map((cell, i) => (
            <div key={i} style={{
              aspectRatio: '1', borderRadius: 5,
              background: cell.day === null ? 'transparent' : heatColor(cell.r),
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: cell.hasTrades ? `1px solid ${cell.r !== null && cell.r >= 0 ? 'rgba(0,255,163,0.2)' : 'rgba(255,77,77,0.2)'}` : '1px solid transparent',
            }}>
              {cell.day !== null && (
                <>
                  <span style={{ fontSize: 8, fontWeight: 700, color: cell.hasTrades ? '#fff' : th.tx3, opacity: cell.hasTrades ? 0.9 : 0.4 }}>{cell.day}</span>
                  {cell.pnl !== null && <span style={{ fontSize: 6, fontWeight: 800, color: '#fff', opacity: 0.8 }}>{cell.pnl >= 0 ? '+' : ''}{cell.pnl.toFixed(0)}$</span>}
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 8, fontSize: 8, color: th.tx3 }}>
            <span>🟢 {isRTL ? 'רווחי' : 'Profit'}</span>
            <span>🔴 {isRTL ? 'הפסד' : 'Loss'}</span>
          </div>
          <span style={{ fontSize: 9, color: th.tx3 }}>{isRTL ? 'מגמת רגש' : 'Emo trend'} <strong style={{ color: '#b794f6' }}>{avgEmotion.toFixed(1)}/10</strong></span>
        </div>
      </div>

      {/* ═══ STRATEGY INTELLIGENCE ═══ */}
      {byStrategy.length > 0 && (
        <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 14, padding: '14px 16px' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.5px', color: '#b794f6', textTransform: 'uppercase' as const, marginBottom: 10, fontFamily: "'Poppins',sans-serif" }}>🎯 {isRTL ? 'מודיעין שיטות' : 'STRATEGY INTELLIGENCE'}</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {byStrategy.map(s => {
              const c = s.r >= 0 ? '#00FFA3' : '#FF4D4D';
              return (
                <div key={s.name} style={{ background: `${c}04`, border: `1px solid ${c}10`, borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: th.tx }}>{s.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 800, color: c }}>{s.r >= 0 ? '+' : ''}{s.r.toFixed(1)}R</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 9, color: th.tx3, flexWrap: 'wrap' as const }}>
                    <span>{s.count} {isRTL ? 'עסקאות' : 'trades'}</span>
                    <span style={{ color: s.wr >= 40 ? '#00FFA3' : '#FF4D4D' }}>{s.wr.toFixed(0)}% WR</span>
                    <span style={{ color: s.avgR >= 0 ? '#00FFA3' : '#FF4D4D' }}>{s.avgR >= 0 ? '+' : ''}{s.avgR.toFixed(2)}R {isRTL ? 'ממוצע' : 'avg'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ PERFORMANCE SUMMARY ═══ */}
      <div style={{ background: th.cardBg, border: `1px solid ${th.cardBr}`, borderRadius: 14, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1.5px', color: '#FFC857', textTransform: 'uppercase' as const, fontFamily: "'Poppins',sans-serif" }}>📊 {isRTL ? 'סיכום ביצועים' : 'PERFORMANCE SUMMARY'}</div>
          <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: `1px solid ${th.inputBr}` }}>
            {(['monthly', 'yearly'] as const).map(tab => (
              <button key={tab} onClick={() => setPerfTab(tab)} style={{
                padding: '4px 10px', fontSize: 8, fontWeight: 700, cursor: 'pointer', border: 'none',
                background: perfTab === tab ? '#FFC857' : th.inputBg, color: perfTab === tab ? '#000' : th.tx3,
                letterSpacing: '1px', textTransform: 'uppercase' as const,
              }}>{tab === 'monthly' ? (isRTL ? 'חודשי' : 'Monthly') : (isRTL ? 'שנתי' : 'Yearly')}</button>
            ))}
          </div>
        </div>

        {/* Cumulative total */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: th.inputBg, borderRadius: 10, marginBottom: 10, flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: 9, color: th.tx3, fontWeight: 700 }}>{isRTL ? 'סה"כ מצטבר' : 'Cumulative'}</span>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 15, fontWeight: 800, color: statusColor }}>{totalR >= 0 ? '+' : ''}{totalR.toFixed(1)}R</span>
          <span style={{ fontSize: 9, color: th.tx3 }}>{totalTrades}t · {winRate.toFixed(0)}% · EV {expectancy >= 0 ? '+' : ''}{expectancy.toFixed(2)}R</span>
        </div>

        {perfTab === 'monthly' ? (
          <div style={{ display: 'grid', gap: 6 }}>
            {monthlyRecap.map(m => {
              const c = m.totalR >= 0 ? '#00FFA3' : '#FF4D4D';
              return (
                <div key={m.ym} style={{ padding: '10px 12px', background: `${c}04`, borderRadius: 10, border: `1px solid ${c}08` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: th.tx }}>{m.label}</span>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 14, fontWeight: 800, color: c }}>{m.totalR >= 0 ? '+' : ''}{m.totalR.toFixed(1)}R</span>
                      <span style={{ fontSize: 9, color: c, marginLeft: 6 }}>{m.pnl >= 0 ? '+' : ''}{m.pnl.toFixed(0)}$</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, fontSize: 8, color: th.tx3, flexWrap: 'wrap' as const }}>
                    <span>{m.days} {isRTL ? 'ימים' : 'days'} · {m.trades}t</span>
                    <span style={{ color: m.wr >= 40 ? '#00FFA3' : '#FF4D4D' }}>{m.wr.toFixed(0)}%</span>
                    <span>EV {m.ev >= 0 ? '+' : ''}{m.ev.toFixed(2)}R</span>
                    <span>PF: {m.pf === Infinity ? '∞' : m.pf.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 6 }}>
            {yearlyRecap.map(yr => {
              const c = yr.totalR >= 0 ? '#00FFA3' : '#FF4D4D';
              return (
                <div key={yr.year} style={{ padding: '12px 14px', background: 'rgba(212,175,55,0.03)', borderRadius: 12, border: '1px solid rgba(212,175,55,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#D4AF37', fontFamily: "'Poppins',sans-serif" }}>{yr.year}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 18, fontWeight: 800, color: c }}>{yr.totalR >= 0 ? '+' : ''}{yr.totalR.toFixed(1)}R</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 9, color: th.tx3, flexWrap: 'wrap' as const }}>
                    <span>{yr.trades}t</span>
                    <span>{yr.wins}W/{yr.losses}L/{yr.be}BE</span>
                    <span style={{ color: yr.wr >= 40 ? '#00FFA3' : '#FF4D4D' }}>{yr.wr.toFixed(0)}%</span>
                    <span>EV {yr.ev >= 0 ? '+' : ''}{yr.ev.toFixed(2)}R</span>
                    {!isR && <span>{yr.pnl >= 0 ? '+' : ''}{yr.pnl.toFixed(0)}$</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ WEEKDAY + ASSET (expandable) ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }} className="j-grid-2col">
        <Expandable title={isRTL ? 'מודיעין יום בשבוע' : 'WEEKDAY INTEL'} icon="📅" accent="#5AA9FF" th={th}>
          {byWeekday.length > 0 && (
            <div style={{ display: 'grid', gap: 3 }}>
              {byWeekday.map(wd => {
                const c = wd.pnl >= 0 ? '#00FFA3' : '#FF4D4D';
                return (
                  <div key={wd.dow} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', background: `${c}04`, borderRadius: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: th.tx2, minWidth: 40 }}>{wd.name}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 800, color: c }}>{wd.pnl >= 0 ? '+' : ''}{wd.pnl.toFixed(0)}$</span>
                    <span style={{ fontSize: 8, color: th.tx3 }}>{wd.count}d</span>
                  </div>
                );
              })}
            </div>
          )}
        </Expandable>

        <Expandable title={isRTL ? 'מודיעין נכסים' : 'ASSET INTEL'} icon="🪙" accent="#FFC857" th={th}>
          {byAsset.length > 0 && (
            <div style={{ display: 'grid', gap: 3 }}>
              {byAsset.slice(0, 8).map(a => {
                const c = a.r >= 0 ? '#00FFA3' : '#FF4D4D';
                return (
                  <div key={a.asset} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', background: `${c}04`, borderRadius: 6 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: th.tx, fontFamily: "'JetBrains Mono',monospace" }}>{a.asset}</span>
                    <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, fontWeight: 800, color: c }}>{a.r >= 0 ? '+' : ''}{a.r.toFixed(1)}R</span>
                    <span style={{ fontSize: 8, color: th.tx3 }}>{a.count}t</span>
                  </div>
                );
              })}
            </div>
          )}
        </Expandable>
      </div>
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
  const [tradePage, setTradePage] = useState(0);
  const TRADES_PER_PAGE = 50;
  const isRTL = dir === 'rtl';
  const isR = useJournalIsR();
  const trades = Array.isArray(day?.trades) ? day.trades : [];
  // Memoise heavy aggregates so re-renders on dense days (1k+ trades) stay snappy.
  const { pnl, wins, totalR, winRate, negR } = useMemo(() => {
    const p = sumPnl(day);
    const w = numWins(day);
    const tR = trades.reduce((s, t) => s + (parseFloat(t.rr) || 0), 0);
    const wr = trades.length > 0 ? ((w / trades.length) * 100).toFixed(0) : '0';
    const nR = sumNegR(trades);
    return { pnl: p, wins: w, totalR: tR, winRate: wr, negR: nR };
  }, [day, trades]);
  const totalPages = Math.max(1, Math.ceil(trades.length / TRADES_PER_PAGE));
  const safePage = Math.min(tradePage, totalPages - 1);
  const pagedTrades = useMemo(
    () => trades.slice(safePage * TRADES_PER_PAGE, (safePage + 1) * TRADES_PER_PAGE),
    [trades, safePage],
  );
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
          {trades.length > 0 && Array.isArray(pagedTrades) && pagedTrades.length > 0 && (
            <div style={S.section}>
              <div style={{ ...S.secTitle, color: '#FFC857' }}>
                <span>📈</span> {isRTL ? `עסקאות (${trades.length})` : `Trades (${trades.length})`}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pagedTrades.map((tr, i) => {
                  const trPnl = parseFloat(tr.pnl) || 0;
                  const trR = parseFloat(tr.rr) || 0;
                  const isWin = trPnl > 0;
                  // Stagger only the first page; on dense days animations would jank the browser.
                  const animDelay = safePage === 0 ? `${0.2 + i * 0.05}s` : '0s';
                  return (
                    <div key={`${safePage}-${i}`} style={{
                      background: `${isWin ? 'rgba(0,255,163,0.03)' : 'rgba(255,77,77,0.03)'}`,
                      border: `1px solid ${isWin ? 'rgba(0,255,163,0.12)' : 'rgba(255,77,77,0.12)'}`,
                      borderRadius: 10, padding: '12px 16px',
                      animation: `j-fade-in ${animDelay} ease-out`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: '#5AA9FF', fontFamily: "'JetBrains Mono',monospace" }}>{tr.pair || '—'}</span>
                          <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, fontWeight: 700, background: tr.side === 'Long' ? 'rgba(0,255,163,0.1)' : 'rgba(255,77,77,0.1)', color: tr.side === 'Long' ? '#00FFA3' : '#FF4D4D' }}>{tr.side || '—'}</span>
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 800, color: (isR ? trR : trPnl) >= 0 ? '#00FFA3' : '#FF4D4D', fontFamily: "'JetBrains Mono',monospace" }}>
                          {isR ? `${trR >= 0 ? '+' : ''}${trR.toFixed(2)}R` : `${trPnl >= 0 ? '+' : ''}${trPnl.toFixed(2)}$`}
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
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, padding: '8px 4px' }}>
                  <button
                    onClick={() => setTradePage(p => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.04)', color: safePage === 0 ? th.tx3 : th.tx2,
                      fontSize: 11, fontWeight: 700, cursor: safePage === 0 ? 'default' : 'pointer',
                      opacity: safePage === 0 ? 0.4 : 1,
                    }}
                  >‹ {isRTL ? 'הקודם' : 'Prev'}</button>
                  <div style={{ fontSize: 10, color: th.tx3, fontFamily: "'JetBrains Mono',monospace" }}>
                    {isRTL
                      ? `עמוד ${safePage + 1} / ${totalPages} • ${safePage * TRADES_PER_PAGE + 1}–${Math.min((safePage + 1) * TRADES_PER_PAGE, trades.length)} מתוך ${trades.length}`
                      : `Page ${safePage + 1} / ${totalPages} • ${safePage * TRADES_PER_PAGE + 1}–${Math.min((safePage + 1) * TRADES_PER_PAGE, trades.length)} of ${trades.length}`}
                  </div>
                  <button
                    onClick={() => setTradePage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage >= totalPages - 1}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.04)', color: safePage >= totalPages - 1 ? th.tx3 : th.tx2,
                      fontSize: 11, fontWeight: 700, cursor: safePage >= totalPages - 1 ? 'default' : 'pointer',
                      opacity: safePage >= totalPages - 1 ? 0.4 : 1,
                    }}
                  >{isRTL ? 'הבא' : 'Next'} ›</button>
                </div>
              )}
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
const AutoFillButton = ({ onClick, dir, th, label }: { onClick: () => void; dir: string; th: typeof THEMES.dark; label: string }) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 20,
    background: 'linear-gradient(135deg, rgba(255,200,87,0.12), rgba(245,160,32,0.08))',
    border: '1px solid rgba(255,200,87,0.25)', color: '#FFC857', cursor: 'pointer',
    fontFamily: "'Poppins',sans-serif", fontSize: 10.5, fontWeight: 700, letterSpacing: '.3px',
    transition: 'all .25s', direction: dir as 'ltr' | 'rtl',
  }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(255,200,87,0.22), rgba(245,160,32,0.15))'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(255,200,87,0.2)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(255,200,87,0.12), rgba(245,160,32,0.08))'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
    <span style={{ fontSize: 13 }}>✨</span> {label}
  </button>
);

const ClearDemoButton = ({ onClick, dir, label }: { onClick: () => void; dir: string; label: string }) => (
  <button onClick={onClick} style={{
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 20,
    background: 'linear-gradient(135deg, rgba(255,77,77,0.10), rgba(255,77,77,0.05))',
    border: '1px solid rgba(255,77,77,0.28)', color: '#FF6B6B', cursor: 'pointer',
    fontFamily: "'Poppins',sans-serif", fontSize: 10.5, fontWeight: 700, letterSpacing: '.3px',
    transition: 'all .25s', direction: dir as 'ltr' | 'rtl',
  }}
    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(255,77,77,0.20), rgba(255,77,77,0.10))'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(255,77,77,0.18)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'linear-gradient(135deg, rgba(255,77,77,0.10), rgba(255,77,77,0.05))'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
    <span style={{ fontSize: 13 }}>🗑️</span> {label}
  </button>
);

const MorningForm = ({ day, upd, t, dir, onSave, dirty, th, onInfoClick }: any) => {
  const f = t.f;
  const U = (k: string) => (v: any) => upd({ [k]: v });
  const taskArr = day.tasks || [];
  const done = taskArr.filter((t: any) => t.done).length;
  const sLocks = day.sectionLocks || {};
  const lockSec = (k: string) => upd({ sectionLocks: { ...sLocks, [k]: true } });
  const unlockSec = (k: string) => upd({ sectionLocks: { ...sLocks, [k]: false } });
  const BC = ['#00FFA3', '#FF4D4D', '#FFC857', '#5AA9FF', '#b794f6'];
  const morningIdxRef = useRef(Math.floor(Math.random() * MORNING_VARIATIONS.length));

  const fillMorning = () => {
    const v = MORNING_VARIATIONS[morningIdxRef.current % MORNING_VARIATIONS.length];
    morningIdxRef.current++;
    // Map English demo values → current language by index in EN reference arrays
    const EN_BIAS = ['Bullish', 'Bearish', 'Neutral', 'Expansion', 'Contraction'];
    const EN_STRUCT = ['Markup', 'Markdown', 'Accumulation', 'Distribution', 'Range'];
    const EN_STATES = ['Focused', 'Calm', 'Confident', 'Impulsive', 'Hesitant', 'Tired', 'Sharp'];
    const mapBias = (en: string) => { const i = EN_BIAS.indexOf(en); return i >= 0 ? t.bias[i] : t.bias[0]; };
    const mapStruct = (en: string) => { const i = EN_STRUCT.indexOf(en); return i >= 0 ? t.struct[i] : t.struct[0]; };
    const mapStates = (arr: string[]) => arr.map(en => { const i = EN_STATES.indexOf(en); return i >= 0 ? t.states[i] : en; });
    // Map textual fearGreed → numeric 0-100 (gauge expects numeric string)
    const FG_MAP: Record<string, number> = { 'Extreme Fear': 15, 'Fear': 30, 'Neutral': 50, 'Greed': 72, 'Extreme Greed': 88 };
    const fgNum = FG_MAP[v.fearGreed] ?? 50;
    // Mark tasks and goals as done (simulate human user filling checklists)
    const filledTasks = (day.tasks || []).map((tk: any, i: number) => ({ ...tk, done: i < 6 || Math.random() > 0.3 }));
    const filledGoals = (day.goals || []).map((g: any, i: number) => ({ ...g, done: i < 3 || Math.random() > 0.4 }));
    // Pick discipline commitments
    const commitOpts = t.commitments || [];
    const picked = commitOpts.filter((_: string, i: number) => i < 3 || Math.random() > 0.5).slice(0, 4);
    upd({
      mood: v.mood, plan: v.plan, btcThoughts: v.btcThoughts,
      bias: mapBias(v.bias), mktStruct: mapStruct(v.mktStruct), mentalTags: mapStates(v.mentalTags),
      btcNote: v.btcNote, t3Note: v.t3Note, domNote: v.domNote, macroNote: v.macroNote,
      levels: v.levels, setups: v.setups, emotionScore: v.emotionScore,
      fearGreed: String(fgNum), psychAnswers: v.psychAnswers,
      tasks: filledTasks, goals: filledGoals,
      disciplineCommitments: picked, disciplineConfirmed: true,
      sectionLocks: { ...day.sectionLocks, discipline: true },
    });
  };

  const clearMorning = () => {
    upd({
      mood: '', plan: '', btcThoughts: '',
      bias: '', mktStruct: '', mentalTags: [],
      btcNote: '', t3Note: '', domNote: '', macroNote: '',
      levels: [], setups: [], emotionScore: null,
      fearGreed: '', psychAnswers: {},
      tasks: (day.tasks || []).map((tk: any) => ({ ...tk, done: false })),
      goals: (day.goals || []).map((g: any) => ({ ...g, done: false })),
      disciplineCommitments: [], disciplineConfirmed: false,
      morningImages: [],
      sectionLocks: {},
    });
  };


  return (
    <div>
      <MarketStrip day={day} dir={dir} th={th} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <div onClick={onInfoClick} style={{ cursor: 'pointer', flex: 1 }}>
          <PDiv label={dir === 'rtl' ? 'תדריך טרום-שוק' : 'PRE-MARKET BRIEFING'} color="#5AA9FF" icon="☀️" th={th} />
        </div>
        <AutoFillButton onClick={fillMorning} dir={dir} th={th} label={dir === 'rtl' ? 'מילוי דוגמה' : 'Demo Fill'} />
        <ClearDemoButton onClick={clearMorning} dir={dir} label={dir === 'rtl' ? 'מחק דוגמה' : 'Clear Demo'} />
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
const EodForm = ({ day, upd, t, dir, onSave, dirty, orcaTrades, allOrcaTrades, th, risk, onInfoClick, onAddOrcaTrade, onUpdateOrcaTrade, onUpsertJournalTrade }: any) => {
  const f = t.f;
  const U = (k: string) => (v: any) => upd({ [k]: v });
  const dp = sumPnl(day), dw = numWins(day);
  const bridgeTrades = allOrcaTrades || orcaTrades || [];

  // Map of Journal-trade-id → Orca-trade-id, kept in a ref so it survives
  // every keystroke without depending on stale `orcaTrades` snapshots.
  const jidMapRef = useRef<Map<string, number>>(new Map());
  // Per-jid in-flight guard so rapid edits don't create duplicate Orca trades.
  const inFlightRef = useRef<Set<string>>(new Set());
  const pendingRef = useRef<Set<string>>(new Set());
  const latestRowsRef = useRef<Map<string, any>>(new Map());
  const syncRowRef = useRef<(jtr: any) => void>(() => {});

  // Keep the map fresh from props (covers reloads / external changes).
  useEffect(() => {
    const map = jidMapRef.current;
    (bridgeTrades || []).forEach((o: Trade) => {
      const m = typeof o.comments === 'string' ? o.comments.match(/__JID:([^_]+)__/ ) : null;
      if (m) map.set(m[1], o.id);
    });
    pendingRef.current.forEach(jid => {
      const linkedId = map.get(jid);
      if (linkedId == null || !(bridgeTrades || []).some((o: Trade) => o.id === linkedId)) return;
      pendingRef.current.delete(jid);
      const latest = latestRowsRef.current.get(jid);
      if (latest) setTimeout(() => syncRowRef.current(latest), 0);
    });
  }, [bridgeTrades]);

  // Build a "snapshot" of an Orca trade derived from a Journal trade row.
  const buildOrcaPayload = (jtr: any): Omit<Trade, 'id' | 'balance'> => {
    return buildJournalOrcaPayload(day, jtr);
  };

  const addTrade = () => {
    // Add an empty row locally only — we only push to Orca once the row
    // has meaningful data (pair + a price/PNL). Avoids creating ghost
    // Orca trades full of zeros.
    const newJTrade = { id: Date.now(), pair: '', side: 'LONG', entry: '', exit: '', size: '', pnl: '', rr: '', notes: '' };
    upd({ trades: [...(day.trades || []), newJTrade] });
  };

  // Sync a single journal-trade edit to its linked Orca trade (or create one if missing).
  // Treats Journal trades as first-class siblings of Orca trades — full bidirectional bridge.
  const isMeaningful = (jtr: any) => {
    return isMeaningfulJournalTrade(jtr);
  };
  const syncRowToOrca = async (jtr: any) => {
    if (!isMeaningful(jtr)) return;
    const jid = String(jtr.id);
    latestRowsRef.current.set(jid, jtr);
    if (typeof onUpsertJournalTrade === 'function') {
      try {
        const saved = await onUpsertJournalTrade(jid, buildOrcaPayload(jtr));
        if (saved && typeof saved === 'object' && 'id' in saved) jidMapRef.current.set(jid, (saved as Trade).id);
      } catch { /* fallback to legacy bridge below */ }
      return;
    }
    const map = jidMapRef.current;
    const linkedId = map.get(jid);
    const linked = linkedId != null
      ? (bridgeTrades || []).find((o: Trade) => o.id === linkedId)
      : (bridgeTrades || []).find((o: Trade) => typeof o.comments === 'string' && o.comments.includes(`__JID:${jtr.id}__`));

    if (linkedId != null && !linked) { pendingRef.current.add(jid); return; }

    if (linked && typeof onUpdateOrcaTrade === 'function') {
      try {
        const payload = buildOrcaPayload(jtr);
        await onUpdateOrcaTrade({ ...linked, ...payload });
        map.set(jid, linked.id);
      } catch { /* silent */ }
      return;
    }
    if (typeof onAddOrcaTrade !== 'function') return;
    if (inFlightRef.current.has(jid)) { pendingRef.current.add(jid); return; }
    inFlightRef.current.add(jid);
    try {
      const created = await onAddOrcaTrade(buildOrcaPayload(jtr));
      const newId = (created && typeof created === 'object' && 'id' in (created as any))
        ? (created as Trade).id : null;
      if (newId != null) map.set(jid, newId);
    } catch { /* silent */ }
    finally {
      inFlightRef.current.delete(jid);
      if (pendingRef.current.delete(jid)) {
        const latest = latestRowsRef.current.get(jid);
        if (latest) setTimeout(() => syncRowRef.current(latest), 0);
      }
    }
  };
  syncRowRef.current = (jtr: any) => { void syncRowToOrca(jtr); };

  const fullLocked = isDayFullyLocked(day);
  const sLocks = day.sectionLocks || {};
  const lockSec = (k: string) => upd({ sectionLocks: { ...sLocks, [k]: true } });
  const unlockSec = (k: string) => upd({ sectionLocks: { ...sLocks, [k]: false } });
  const eodIdxRef = useRef(Math.floor(Math.random() * EOD_VARIATIONS.length));

  const fillEod = () => {
    const v = EOD_VARIATIONS[eodIdxRef.current % EOD_VARIATIONS.length];
    eodIdxRef.current++;
    // Set hasOpen explicitly (simulates clicking the Yes/No button)
    // Then inject trades with unique IDs (simulates clicking "+ Log Trade" and filling)
    upd({
      hasOpen: v.hasOpen,
      trades: v.trades.map((tr, i) => ({ ...tr, id: Date.now() + i + Math.random() })),
      actualMove: v.actualMove, dayScore: v.dayScore,
      wins: v.wins, lessons: v.lessons, mistakes: v.mistakes,
      solutions: v.solutions, closing: v.closing,
      // Also fill EOD images placeholder — empty since demo
      eodImages: day.eodImages || [],
    });
  };

  const clearEod = () => {
    upd({
      hasOpen: null,
      trades: [],
      actualMove: '', dayScore: null,
      wins: '', lessons: '', mistakes: '',
      solutions: '', closing: '',
      eodImages: [],
    });
  };


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

      {/* EOD Chart Screenshots — FIRST in EOD */}
      <Sec title={dir === 'rtl' ? 'צילומי מסך - סוף יום' : 'EOD CHART SCREENSHOTS'} icon="📸" accent="#5AA9FF" th={th} fullLocked={fullLocked} locked={sLocks['eodImages']} onLock={() => lockSec('eodImages')} onUnlock={() => unlockSec('eodImages')}>
        <ImageUpload images={day.eodImages || []} onUpdate={(imgs: string[]) => upd({ eodImages: imgs })} label={dir === 'rtl' ? 'צילומי גרפים מסוף היום' : 'End of day chart captures'} uploadLabel={f.imageUpload} dir={dir} disabled={fullLocked || sLocks['eodImages']} th={th} />
      </Sec>

      {/* Orca Trade Bridge — live sync from Orca Investment for THIS day */}
      {orcaTrades?.length > 0 && (() => {
        const totalPnl = orcaTrades.reduce((s, tr) => s + (tr.pnl || 0), 0);
        const wins = orcaTrades.filter(tr => tr.pnl > 0).length;
        const wr = (wins / orcaTrades.length) * 100;
        return (
          <div style={{
            background: `linear-gradient(135deg, ${totalPnl >= 0 ? 'rgba(0,255,163,0.06)' : 'rgba(255,77,77,0.06)'}, ${th.cardBg})`,
            border: `1px solid ${totalPnl >= 0 ? 'rgba(0,255,163,0.25)' : 'rgba(255,77,77,0.25)'}`,
            borderRadius: 14, padding: '14px 16px', marginBottom: 16,
            boxShadow: `0 0 24px ${totalPnl >= 0 ? 'rgba(0,255,163,0.08)' : 'rgba(255,77,77,0.08)'}`,
            animation: 'j-fade-in .35s ease-out',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' as const }}>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 9, color: '#5AA9FF', letterSpacing: '2px', fontWeight: 800, textTransform: 'uppercase' as const, padding: '3px 8px', background: 'rgba(90,169,255,0.1)', borderRadius: 6, border: '1px solid rgba(90,169,255,0.2)' }}>⚡ ORCA LIVE BRIDGE</span>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, color: th.tx3, letterSpacing: '1px' }}>
                {dir === 'rtl' ? `${orcaTrades.length} עסקאות סונכרנו ליום זה` : `${orcaTrades.length} trades synced for this day`}
              </span>
              <div style={{ marginInlineStart: 'auto', display: 'flex', gap: 14 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: th.tx3, letterSpacing: '1.5px', fontWeight: 700 }}>P&L</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: totalPnl >= 0 ? '#00FFA3' : '#FF4D4D', fontFamily: "'Poppins',sans-serif" }}>{totalPnl >= 0 ? '+' : ''}{totalPnl.toFixed(2)}$</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: th.tx3, letterSpacing: '1.5px', fontWeight: 700 }}>WR</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#FFC857', fontFamily: "'Poppins',sans-serif" }}>{wr.toFixed(0)}%</div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto' as const, paddingBottom: 4 }}>
              {orcaTrades.map((tr: Trade) => (
                <div key={tr.id} style={{
                  flexShrink: 0, padding: '10px 14px', background: th.inputBg, borderRadius: 10,
                  border: `1px solid ${tr.pnl >= 0 ? 'rgba(0,255,163,.2)' : 'rgba(255,77,77,.2)'}`, minWidth: 120,
                  transition: 'all .2s',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 20px ${tr.pnl >= 0 ? 'rgba(0,255,163,0.15)' : 'rgba(255,77,77,0.15)'}`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 11, fontWeight: 700, color: th.tx2 }}>{tr.coin}</div>
                    <div style={{ fontSize: 8, color: tr.direction === 'Long' ? '#00FFA3' : '#FF4D4D', fontWeight: 700, letterSpacing: '1px' }}>{tr.direction === 'Long' ? '▲' : '▼'}</div>
                  </div>
                  <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 800, color: tr.pnl >= 0 ? '#00FFA3' : '#FF4D4D', marginTop: 2, textShadow: `0 0 10px ${tr.pnl >= 0 ? 'rgba(0,255,163,0.3)' : 'rgba(255,77,77,0.3)'}` }}>{tr.pnl >= 0 ? '+' : ''}{tr.pnl.toFixed(2)}$</div>
                  {(() => { const r = getR(tr as any); return (
                    <div style={{ fontSize: 9, color: th.tx3, marginTop: 2, fontFamily: "'Poppins',sans-serif" }}>{formatR(r, 2)}</div>
                  ); })()}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
        <div onClick={onInfoClick} style={{ cursor: 'pointer', flex: 1 }}>
          <PDiv label={dir === 'rtl' ? 'תחקיר אחרי-שוק' : 'POST-MARKET DEBRIEF'} color="#b794f6" icon="🌙" th={th} />
        </div>
        {!fullLocked && <AutoFillButton onClick={fillEod} dir={dir} th={th} label={dir === 'rtl' ? 'מילוי דוגמה' : 'Demo Fill'} />}
        {!fullLocked && <ClearDemoButton onClick={clearEod} dir={dir} label={dir === 'rtl' ? 'מחק דוגמה' : 'Clear Demo'} />}
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
                onChange={(nt: JournalTrade) => { upd({ trades: (day.trades || []).map((x: any, j: number) => j === i ? nt : x) }); syncRowRef.current(nt); }}
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

      {/* Compact Risk Control — EOD only */}
      <CompactRiskControl risk={risk} dir={dir} th={th} />

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
// CINEMATIC LOCK OVERLAYS — Fully responsive
// ═══════════════════════════════════════════════════════════════
const MorningLockOverlay = ({ onDone, isRTL }: { onDone: () => void; isRTL: boolean }) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setStep(1), 40),
      setTimeout(() => setStep(2), 220),
      setTimeout(() => setStep(3), 700),
      setTimeout(() => { setStep(4); onDone(); }, 1500),
    ];
    playMorningLock();
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden', width: '100vw', height: '100dvh',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(10,20,50,0.92) 0%, rgba(3,6,16,0.96) 70%)',
        opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.3s ease',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      }} />
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 80, height: 80, marginLeft: -40, marginTop: -40,
          borderRadius: '50%', border: '2px solid rgba(90,169,255,0.5)',
          opacity: 0,
          animation: step >= 2 ? `j-mlock-ring 1.2s cubic-bezier(0.16,1,0.3,1) ${i * 0.18}s forwards` : 'none',
        }} />
      ))}
      <div style={{
        position: 'relative', zIndex: 2, textAlign: 'center',
        opacity: step >= 2 ? 1 : 0,
        transform: step >= 2 ? 'scale(1)' : 'scale(0.6)',
        transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
      }}>
        <div style={{
          width: 'clamp(72px, 14vw, 96px)', height: 'clamp(72px, 14vw, 96px)',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, rgba(90,169,255,0.35), rgba(90,169,255,0.08))',
          border: '2px solid rgba(90,169,255,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 18px',
          fontSize: 'clamp(30px, 6vw, 42px)', color: '#5AA9FF',
          boxShadow: '0 0 60px rgba(90,169,255,0.45), inset 0 0 30px rgba(90,169,255,0.15)',
          transform: step >= 3 ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}>✓</div>
        <div style={{
          fontFamily: "'Poppins',sans-serif", fontSize: 'clamp(16px, 4vw, 22px)',
          fontWeight: 800, color: '#5AA9FF', letterSpacing: 0.5,
          textShadow: '0 0 30px rgba(90,169,255,0.5)',
          direction: isRTL ? 'rtl' : 'ltr',
          opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.35s ease',
        }}>
          {isRTL ? 'ניתוח הבוקר ננעל' : 'Morning Analysis Locked'}
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono',monospace", fontSize: 10,
          color: 'rgba(90,169,255,0.55)', letterSpacing: 4, marginTop: 8,
          textTransform: 'uppercase' as const,
          opacity: step >= 3 ? 1 : 0, transition: 'opacity 0.4s ease 0.1s',
        }}>SEALED · PROTECTED</div>
      </div>
      <style>{`
        @keyframes j-mlock-ring {
          0% { transform: scale(0.5); opacity: 0.9; border-width: 2px; }
          100% { transform: scale(6); opacity: 0; border-width: 0.5px; }
        }
      `}</style>
    </div>
  );
};

const EODLockOverlay = ({ onDone, isRTL }: { onDone: () => void; isRTL: boolean }) => {
  const [step, setStep] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const t = [
      setTimeout(() => setStep(1), 100),
      setTimeout(() => setStep(2), 600),
      setTimeout(() => setStep(3), 1800),
      setTimeout(() => setStep(4), 2400),
      setTimeout(() => { setStep(5); onDone(); }, 3000),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const ctx = c.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth, h = c.clientHeight;
    c.width = w * dpr; c.height = h * dpr;
    ctx.scale(dpr, dpr);

    const pts: number[] = [];
    let price = h * 0.6;
    for (let i = 0; i < 120; i++) {
      price += (Math.random() - 0.42) * (h * 0.03);
      price = Math.max(h * 0.15, Math.min(h * 0.85, price));
      pts.push(price);
    }

    let frame = 0; let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(212,175,55,0.04)'; ctx.lineWidth = 0.5;
      for (let y = 0; y < h; y += h / 6) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      const visible = Math.min(pts.length, Math.floor(frame * 1.5));
      if (visible > 1) {
        const sp = w / (pts.length - 1);
        ctx.beginPath(); ctx.moveTo(0, pts[0]);
        for (let i = 1; i < visible; i++) ctx.lineTo(i * sp, pts[i]);
        ctx.strokeStyle = 'rgba(0,255,163,0.15)'; ctx.lineWidth = 6; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, pts[0]);
        for (let i = 1; i < visible; i++) ctx.lineTo(i * sp, pts[i]);
        ctx.strokeStyle = '#00FFA3'; ctx.lineWidth = 2; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, pts[0]);
        for (let i = 1; i < visible; i++) ctx.lineTo(i * sp, pts[i]);
        ctx.lineTo((visible - 1) * sp, h); ctx.lineTo(0, h); ctx.closePath();
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, 'rgba(0,255,163,0.08)'); grad.addColorStop(1, 'rgba(0,255,163,0)');
        ctx.fillStyle = grad; ctx.fill();
        if (visible > 0) {
          const tx = (visible - 1) * sp, ty = pts[visible - 1];
          const pulse = 0.5 + Math.sin(frame * 0.1) * 0.5;
          ctx.beginPath(); ctx.arc(tx, ty, 4 + pulse * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(0,255,163,${0.2 + pulse * 0.3})`; ctx.fill();
          ctx.beginPath(); ctx.arc(tx, ty, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#00FFA3'; ctx.fill();
        }
      }
      frame++;
      if (frame < 120) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', width: '100vw', height: '100dvh', maxWidth: '100vw' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,8,20,0.92)', opacity: step >= 1 ? 1 : 0, transition: 'opacity 0.5s ease', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }} />
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: step >= 2 && step < 5 ? 0.25 : 0, transition: 'opacity 0.6s ease' }} />
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', width: '85%', maxWidth: 360, opacity: step >= 3 ? 1 : 0, transform: step >= 3 ? 'scale(1)' : 'scale(0.85)', transition: 'all 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(212,175,55,0.08)', border: '2px solid rgba(212,175,55,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28, boxShadow: '0 0 40px rgba(212,175,55,0.15)', transition: 'transform 0.3s ease', transform: step >= 4 ? 'rotateY(180deg)' : 'rotateY(0)' }}>🔒</div>
        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 'clamp(16px, 4.5vw, 22px)', fontWeight: 800, color: '#D4AF37', letterSpacing: 0.5, textShadow: '0 0 30px rgba(212,175,55,0.4)', direction: isRTL ? 'rtl' : 'ltr' }}>
          {isRTL ? 'יום המסחר ננעל' : 'Trading Day Sealed'}
        </div>
        <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, color: 'rgba(212,175,55,0.35)', letterSpacing: 3, marginTop: 8, textTransform: 'uppercase' as const }}>PERMANENTLY LOCKED</div>
        <div style={{ width: 60, height: 2, background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)', margin: '14px auto 0', borderRadius: 1, opacity: step >= 4 ? 1 : 0, transition: 'opacity 0.4s ease' }} />
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
  /** Optional bridge: when set, every new Journal trade also creates an Orca trade. */
  onAddOrcaTrade?: (trade: Omit<Trade, 'id' | 'balance'>) => Promise<unknown> | void;
  /** Optional bridge: when set, journal trade edits update the linked Orca trade. */
  onUpdateOrcaTrade?: (trade: Trade) => Promise<unknown> | void;
  /** Guaranteed bridge: creates or updates the Orca mirror by Journal trade id. */
  onUpsertJournalTrade?: (journalTradeId: number | string, trade: Omit<Trade, 'id' | 'balance'>) => Promise<unknown> | void;
}

export const JournalDimension = ({ onReturn, isRTL, orcaTrades, onAddOrcaTrade, onUpdateOrcaTrade, onUpsertJournalTrade }: JournalDimensionProps) => {
  // Language strictly follows the platform language (isRTL prop). Do NOT keep
  // local state for this — it caused HE/EN to desync when the user toggled
  // language while inside the journal and on subsequent loads (we used to
  // restore a stale `s.lang` from storage, overriding the platform setting).
  const lang = isRTL ? 'he' : 'en';
  const setLang = (_v: string) => { /* no-op — language is owned by the platform */ };
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
  const [showEntry, setShowEntry] = useState(true); // Always show entry animation when mounting
  const [exitingToOrca, setExitingToOrca] = useState(false);
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
        // Note: ignore s.lang on purpose — language now follows the platform setting.
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
        const updatedDay = next.find(d => d.id === curId);
        if (updatedDay && typeof onUpsertJournalTrade === 'function') {
          (updatedDay.trades || [])
            .filter(isMeaningfulJournalTrade)
            .forEach(jtr => {
              void onUpsertJournalTrade(String(jtr.id), buildJournalOrcaPayload(updatedDay, jtr));
            });
        }
        const newRisk = checkJournalRisk(next);
        if (newRisk.breachedLevel !== 'none') {
          setRiskAlertShown(true);
        }
      }

      return next;
    });
    if (Object.keys(patch).some(k => MORNING_KEYS.has(k))) setMD(true);
    else setED(true);
  }, [onUpsertJournalTrade]);

  const showToast = useCallback((msg: string, type = 'g') => {
    clearTimeout(tRef.current);
    setToast({ msg, type });
    tRef.current = setTimeout(() => setToast(null), 2500);
  }, []);

  const saveMorning = useCallback(() => {
    // Immediate scroll BEFORE animation — user lands at top instantly
    window.scrollTo({ top: 0, behavior: 'auto' });
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
    window.scrollTo({ top: 0, behavior: 'auto' });
    setLockAnim('eod');
    const curId = activeIdRef.current;
    const curLang = langRef.current;
    setDays(prev => {
      const cur = prev.find(d => d.id === curId);
      if (cur && typeof onUpsertJournalTrade === 'function') {
        (cur.trades || [])
          .filter(isMeaningfulJournalTrade)
          .forEach(jtr => {
            void onUpsertJournalTrade(String(jtr.id), buildJournalOrcaPayload(cur, jtr));
          });
      }
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
  }, [showToast, onUpsertJournalTrade]);

  const sbDays = useMemo(() => {
    const q = sbQ.toLowerCase();
    return [...days]
      .filter(d => !q || d.date?.includes(q) || (d.mood || '').toLowerCase().includes(q))
      .reverse();
  }, [days, sbQ]);

  // ═══════════════════════════════════════════════════════════════
  // AUTO-SYNC: Orca → Journal
  // For every unique date in orcaTrades that has no JournalDay yet,
  // auto-create an archive day (no morning/EOD required) so imported
  // trades show up in the Journal sidebar, calendar, and analytics.
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!loaded || !orcaTrades || orcaTrades.length === 0) return;
    const existingDates = new Set(days.map(d => safeDateStr(d.date)));
    const orcaDates = new Set<string>();
    for (const tr of orcaTrades) {
      if (!tr?.date) continue;
      try { orcaDates.add(safeDateStr(tr.date as any)); } catch { /* skip */ }
    }
    const missing = Array.from(orcaDates).filter(d => !existingDates.has(d)).sort();
    if (missing.length === 0) return;
    const curLang = langRef.current;
    setDays(prev => {
      const newDays: JournalDay[] = missing.map(dateStr => {
        const d = makeDay(curLang);
        d.date = dateStr;
        d.morningSaved = true;
        d.eodSaved = true;
        d.autoSynced = true;
        // Build a dynamic context summary describing the imported day.
        const dayTrades = orcaTrades.filter(tr => {
          try { return safeDateStr(tr.date as any) === dateStr; } catch { return false; }
        });
        const total = dayTrades.length;
        const wins = dayTrades.filter(tr => (tr as any).winLoss === 'Win').length;
        const losses = dayTrades.filter(tr => (tr as any).winLoss === 'Loss').length;
        const wr = total ? (wins / total) * 100 : 0;
        const totalPnl = dayTrades.reduce((s, tr) => s + ((tr as any).pnl || 0), 0);
        const rAgg = sumR(dayTrades as any);
        const totalR = rAgg.total;
        const ev = rAgg.validCount ? totalR / rAgg.validCount : 0;
        const verdict = totalPnl > 0 ? (curLang === 'he' ? 'יום חיובי' : 'profitable day')
                      : totalPnl < 0 ? (curLang === 'he' ? 'יום שלילי' : 'losing day')
                      : (curLang === 'he' ? 'יום ניטרלי' : 'flat day');
        const tone = ev >= 0.3 ? (curLang === 'he' ? 'תוחלת מצוינת' : 'excellent expectancy')
                   : ev >= 0   ? (curLang === 'he' ? 'תוחלת חיובית' : 'positive expectancy')
                                : (curLang === 'he' ? 'תוחלת שלילית' : 'negative expectancy');
        const ctx = curLang === 'he'
          ? `נוסף אוטומטית מייבוא נתונים (${total} עסקאות). ${verdict}: ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)} · ${wins}W/${losses}L · אחוז ניצחון ${wr.toFixed(0)}% · ${tone} (${ev >= 0 ? '+' : ''}${ev.toFixed(2)}R לעסקה).`
          : `Auto-imported from external data (${total} trades). ${verdict}: ${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)} · ${wins}W/${losses}L · ${wr.toFixed(0)}% win-rate · ${tone} (${ev >= 0 ? '+' : ''}${ev.toFixed(2)}R/trade).`;
        d.closing = ctx;
        d.wins = wins > 0 && totalPnl > 0 ? (curLang === 'he' ? `ניצחתי ${wins} עסקאות, P&L חיובי` : `Won ${wins} trades, positive P&L`) : '';
        d.lessons = totalPnl < 0 ? (curLang === 'he' ? 'יש לבחון את העסקאות המפסידות וזיהוי דפוסים' : 'Review losing trades — look for repeating patterns') : '';
        return d;
      });
      const merged = [...prev, ...newDays].sort((a, b) => safeDateStr(a.date).localeCompare(safeDateStr(b.date)));
      merged.forEach((d, i) => {
        d.dayNum = String(i + 1);
        d.weekNum = String(Math.floor(i / 5) + 1);
      });
      writeJournalState({ days: merged, activeDayId: activeIdRef.current, lang: curLang });
      return merged;
    });
  }, [orcaTrades, loaded]);

  // Backfill: if Journal trades already exist but their Orca mirrors are missing
  // (for example trades created before the bridge fix), sync them on load.
  useEffect(() => {
    if (!loaded || typeof onUpsertJournalTrade !== 'function') return;
    const mirroredJids = new Set(
      (orcaTrades || [])
        .map(tr => (typeof tr.comments === 'string' ? tr.comments.match(/__JID:([^_]+)__/ )?.[1] : null))
        .filter(Boolean) as string[]
    );
    days.forEach(day => {
      (day.trades || [])
        .filter(jtr => isMeaningfulJournalTrade(jtr) && !mirroredJids.has(String(jtr.id)))
        .forEach(jtr => {
          void onUpsertJournalTrade(String(jtr.id), buildJournalOrcaPayload(day, jtr));
        });
    });
  }, [loaded, days, orcaTrades, onUpsertJournalTrade]);

  // Bridge: Orca trades filtered by the displayed journal day's date.
  // Recomputes whenever a new Orca trade is added — live sync.
  // Robust date matching — normalizes ANY trade date format (ISO, datetime-local,
  // DD/MM/YYYY from XLSX import, Date objects) to YYYY-MM-DD before comparing.
  // Works for ALL asset classes: crypto, stocks, forex, indices.
  const tradesForDate = useCallback((dateStr?: string) => {
    if (!dateStr) return [];
    const target = safeDateStr(dateStr);
    return orcaTrades.filter(tr => {
      if (!tr?.date) return false;
      try { return safeDateStr(tr.date as any) === target; } catch { return false; }
    });
  }, [orcaTrades]);

  // Unlock an auto-synced day for retroactive editing.
  // Removes morning/EOD locks and clears autoSynced flag, then makes it active.
  const unlockAutoSynced = useCallback((dayId: string) => {
    const curLang = langRef.current;
    setDays(prev => {
      const next = prev.map(d => d.id === dayId
        ? { ...d, morningSaved: false, eodSaved: false, autoSynced: false, sectionLocks: {} }
        : d
      );
      writeJournalState({ days: next, activeDayId: dayId, lang: curLang });
      return next;
    });
    setActiveId(dayId);
    activeIdRef.current = dayId;
    setViewingArchiveId(null);
    setView('journal');
    showToast(langRef.current === 'he' ? '🔓 יום נפתח לעריכה רטרואקטיבית' : '🔓 Day unlocked for retroactive editing', 'a');
  }, [showToast]);

  // Exit animation handler (must be before early returns)
  const handleReturn = useCallback(() => {
    setExitingToOrca(true);
    setTimeout(() => onReturn(), 1200);
  }, [onReturn]);

  if (!loaded) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', background: th.bg }}>
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
    return <JournalEntryScreen onEnter={() => setShowEntry(false)} isRTL={isRTL} />;
  }

  return (
    <div className="journal-dimension j-no-tilt" data-journal-root style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      fontFamily: "'Poppins', sans-serif", direction: dir,
      background: th.bg, color: th.tx,
      opacity: exitingToOrca ? 0 : 1,
      transform: exitingToOrca ? 'scale(0.92)' : 'scale(1)',
      filter: exitingToOrca ? 'blur(12px)' : 'none',
      transition: 'opacity 0.8s ease, transform 0.8s cubic-bezier(0.4,0,0.2,1), filter 0.8s ease',
    }}>
      {/* Exit overlay */}
      {exitingToOrca && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(212,175,55,0.08) 0%, rgba(3,6,16,0.95) 60%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          animation: 'j-exit-overlay 0.8s ease-out',
        }}>
          <div style={{
            fontSize: 28, fontWeight: 800, color: '#D4AF37', fontFamily: "'Poppins',sans-serif",
            letterSpacing: '-0.5px', animation: 'j-exit-text 0.6s ease-out 0.3s both',
          }}>
            ⚔️
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(212,175,55,0.5)', letterSpacing: 4,
            fontFamily: "'JetBrains Mono', monospace", marginTop: 12,
            animation: 'j-exit-text 0.6s ease-out 0.5s both',
          }}>
            RETURNING TO ORCAINVESTMENT
          </div>
        </div>
      )}
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
        @keyframes j-risk-ring { 0%,100% { transform: scale(1); opacity: 0.3; } 50% { transform: scale(1.1); opacity: 0.6; } }
        @keyframes j-risk-icon-shake { 0%,100% { transform: translateX(0); } 10% { transform: translateX(-8px); } 20% { transform: translateX(8px); } 30% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 50% { transform: translateX(-4px); } 60% { transform: translateX(4px); } 70% { transform: translateX(-2px); } 80% { transform: translateX(2px); } }
        @keyframes j-slide-up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes j-exit-overlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes j-exit-text { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes j-menu-slide { from { opacity: 0; transform: translateY(-20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
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
      {lockAnim === 'morning' && <MorningLockOverlay onDone={() => { setLockAnim(null); window.scrollTo({ top: 0, behavior: 'auto' }); }} isRTL={dir === 'rtl'} />}
      {lockAnim === 'eod' && <EODLockOverlay onDone={() => { setLockAnim(null); window.scrollTo({ top: 0, behavior: 'auto' }); }} isRTL={dir === 'rtl'} />}

      {/* KNOWLEDGE PANEL */}
      {knowledgePanel && <KnowledgePanel type={knowledgePanel} days={days} dir={dir} th={th} onClose={() => setKnowledgePanel(null)} onOpenDay={(id) => { setViewingArchiveId(id); setView('journal'); }} />}

      {mobileMenu && (
        <div onClick={() => setMobileMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 'max(16px, env(safe-area-inset-top, 16px))', animation: 'j-fade-in .2s ease-out', overflowY: 'auto' }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: 'min(480px, 92vw)', maxHeight: 'calc(100vh - 32px)',
            background: th.bg1, border: `1px solid ${th.br2}`, borderRadius: 18,
            padding: '20px 18px', overflowY: 'auto',
            animation: 'j-menu-slide .3s cubic-bezier(0.16,1,0.3,1)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            margin: '0 0 16px',
          }}>
            {/* Close button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 14, fontWeight: 800, color: th.tx, letterSpacing: '-.3px' }}>⚡ APEX OS</span>
              <button onClick={() => setMobileMenu(false)} style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${th.inputBr}`, background: th.inputBg, cursor: 'pointer', color: th.tx3, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            {/* Nav buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
              {([['journal', t.nav.journal, '📝'], ['calendar', t.nav.calendar, '📅']] as const).map(([v, l, ic]) => (
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
              <button onClick={() => { handleReturn(); setMobileMenu(false); }}
                style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1px solid rgba(212,175,55,0.3)', background: 'rgba(212,175,55,0.06)', cursor: 'pointer', color: '#D4AF37', fontSize: 13, fontWeight: 600, fontFamily: "'Poppins',sans-serif" }}>
                ⚔️ {isRTL ? 'חזרה ל-OrcaInvestment' : 'Return to OrcaInvestment'}
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
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const }}>
                        <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 700, color: th.tx }}>{fmtShort(d.date, t.locale)}</span>
                        <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 10, color: th.tx3 }}>{dir === 'rtl' ? 'יום' : 'Day'} {d.dayNum || '?'}</span>
                        {d.autoSynced && (
                          <span title={dir === 'rtl' ? 'סונכרן אוטומטית מ-Orca' : 'Auto-synced from Orca'}
                            style={{ fontFamily: "'Poppins',sans-serif", fontSize: 8, fontWeight: 800, letterSpacing: '0.5px', color: '#5AA9FF', background: 'rgba(90,169,255,0.12)', border: '1px solid rgba(90,169,255,0.3)', padding: '2px 5px', borderRadius: 4, textTransform: 'uppercase' as const }}>
                            ⚡ AUTO
                          </span>
                        )}
                      </div>
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
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
        background: th.navBg, borderBottom: `1px solid ${th.br}`, zIndex: 100,
        backdropFilter: 'blur(20px)',
        // iOS notch / Dynamic Island guard
        paddingTop: 'env(safe-area-inset-top, 0px)',
        minHeight: 'calc(54px + env(safe-area-inset-top, 0px))',
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
            {([['journal', t.nav.journal], ['calendar', t.nav.calendar]] as const).map(([v, l]) => (
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
            <ReturnButton onClick={handleReturn} isRTL={isRTL} />
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
                    <span style={{ fontSize: 18 }}>{displayDay?.autoSynced ? '⚡' : '📂'}</span>
                    <div>
                      <span style={{ fontFamily: "'Poppins',sans-serif", fontSize: 13, fontWeight: 800, color: displayDay?.autoSynced ? '#5AA9FF' : '#FFC857', letterSpacing: '0.5px', display: 'block' }}>
                        {displayDay?.autoSynced
                          ? (dir === 'rtl' ? 'יום מסונכרן אוטומטית — ניתן לפתוח לעריכה' : 'AUTO-SYNCED FROM ORCA — UNLOCK TO EDIT')
                          : (dir === 'rtl' ? 'צפייה בארכיון — קריאה בלבד' : 'VIEWING ARCHIVE — READ ONLY')}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: displayDay?.autoSynced ? 'rgba(90,169,255,0.6)' : 'rgba(255,200,87,0.6)', letterSpacing: '0.5px' }}>
                        {displayDay?.date ? fmtShort(displayDay.date, t.locale) : ''}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    {displayDay?.autoSynced && (
                      <button onClick={() => unlockAutoSynced(displayDay.id)}
                        style={{
                          fontFamily: "'Poppins',sans-serif", fontSize: 12, fontWeight: 800, cursor: 'pointer',
                          padding: '8px 18px', borderRadius: 10, border: '1px solid rgba(90,169,255,0.4)',
                          background: 'linear-gradient(135deg, rgba(90,169,255,0.18) 0%, rgba(183,148,246,0.12) 100%)',
                          color: '#5AA9FF', transition: 'all .25s', letterSpacing: '0.3px',
                          boxShadow: '0 0 12px rgba(90,169,255,0.15)',
                        }}
                        onMouseEnter={e => { const s = e.currentTarget.style; s.transform = 'scale(1.03)'; s.boxShadow = '0 0 20px rgba(90,169,255,0.3)'; }}
                        onMouseLeave={e => { const s = e.currentTarget.style; s.transform = 'scale(1)'; s.boxShadow = '0 0 12px rgba(90,169,255,0.15)'; }}>
                        🔓 {dir === 'rtl' ? 'פתח לעריכה' : 'Unlock & Edit'}
                      </button>
                    )}
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
                </div>
              )}
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap' as const, gap: 12, marginBottom: 20 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                    <div style={{ fontFamily: "'Poppins',sans-serif", fontSize: 'clamp(16px, 4vw, 22px)', fontWeight: 800, color: th.tx, letterSpacing: '-.3px' }}>
                      {fmtFull(displayDay.date, t.locale)}
                    </div>
                    {!isViewingArchive && !isDayFullyLocked(displayDay) && (
                      <input
                        type="date"
                        value={displayDay.date}
                        onChange={e => {
                          const v = e.target.value;
                          if (v) upd({ date: v });
                        }}
                        style={{
                          background: th.inputBg, border: `1px solid ${th.inputBr}`, borderRadius: 7,
                          color: th.tx, padding: '4px 8px', fontSize: 11, fontFamily: "'Poppins',sans-serif",
                          outline: 'none', cursor: 'pointer', transition: 'all .2s',
                          colorScheme: 'dark',
                        }}
                      />
                    )}
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

              {/* Risk Command Center removed from main view - now compact in EOD only */}

              {isViewingArchive ? (
                /* Read-only view for archived day */
                displayDay.morningSaved
                 ? <EodForm day={displayDay} upd={() => {}} t={t} dir={dir} onSave={() => {}} dirty={false} orcaTrades={tradesForDate(displayDay.date)} allOrcaTrades={orcaTrades} th={th} risk={riskStatus} onInfoClick={() => setKnowledgePanel('eod')} />
                 : <MorningForm day={displayDay} upd={() => {}} t={t} dir={dir} onSave={() => {}} dirty={false} th={th} onInfoClick={() => setKnowledgePanel('morning')} />
              ) : (
                !displayDay.morningSaved
                  ? <MorningForm day={displayDay} upd={upd} t={t} dir={dir} onSave={saveMorning} dirty={mDirty} th={th} onInfoClick={() => setKnowledgePanel('morning')} />
                  : <EodForm day={displayDay} upd={upd} t={t} dir={dir} onSave={saveEOD} dirty={eDirty} orcaTrades={tradesForDate(displayDay.date)} allOrcaTrades={orcaTrades} th={th} risk={riskStatus} onInfoClick={() => setKnowledgePanel('eod')} onAddOrcaTrade={onAddOrcaTrade} onUpdateOrcaTrade={onUpdateOrcaTrade} onUpsertJournalTrade={onUpsertJournalTrade} />
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
