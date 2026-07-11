import * as React from 'react';
import { motion, useInView } from 'framer-motion';

interface Props {
  isRTL: boolean;
  t: (he: string, en: string) => string;
}

const CYAN = '#22D3EE';

/* ─── Scramble text — resolves target string with glitchy characters ─── */
const GLYPHS = '!<>-_\\/[]{}—=+*^?#________01';
const useScramble = (target: string, active: boolean, duration = 900) => {
  const [out, setOut] = React.useState('');
  React.useEffect(() => {
    if (!active) { setOut(''); return; }
    const start = performance.now();
    const chars = target.split('');
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const revealed = Math.floor(p * chars.length);
      let s = '';
      for (let i = 0; i < chars.length; i++) {
        if (i < revealed || chars[i] === ' ') s += chars[i];
        else s += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setOut(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return out || target.replace(/./g, ' ');
};

const ScrambleWord: React.FC<{ text: string; active: boolean; color?: string; delay?: number }> = ({ text, active, color, delay = 0 }) => {
  const [go, setGo] = React.useState(false);
  React.useEffect(() => {
    if (!active) { setGo(false); return; }
    const id = setTimeout(() => setGo(true), delay);
    return () => clearTimeout(id);
  }, [active, delay]);
  const s = useScramble(text, go, 700);
  return <span style={{ color }}>{s}</span>;
};

/* ─── Marquee of platform capability tags ─── */
const TAGS_HE = [
  'Bybit', 'Binance', 'IBKR', 'Coinbase', 'Kraken', 'MEXC', 'CSV אוניברסלי',
  'תיוג AI', 'R-Multiple', 'יומן אוטומטי', 'מנוע סיכון',
  'תודעת הסוחר', 'מפת חום', 'סשן לונדון', 'קלי', 'תוחלת', 'שארפ',
  'ניתוח סטאפים', 'סקירה שבועית', 'רדאר מאקרו',
];
const TAGS_EN = [
  'Bybit', 'Binance', 'IBKR', 'Coinbase', 'Kraken', 'MEXC', 'Universal CSV',
  'AI Tagging', 'R-Multiple', 'Auto Journal', 'Risk Engine',
  'Trader Mind', 'Heatmap', 'London Session', 'Kelly', 'Expectancy', 'Sharpe',
  'Setup Analytics', 'Weekly Review', 'Macro Radar',
];

const Marquee: React.FC<{ tags: string[]; reverse?: boolean }> = ({ tags, reverse }) => {
  const loop = [...tags, ...tags];
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '14px 0',
      // Fade edges
      maskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
      WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)',
    }}>
      <div style={{
        display: 'flex', gap: 40, whiteSpace: 'nowrap',
        width: 'max-content',
        animation: `${reverse ? 'orca-marquee-r' : 'orca-marquee-l'} 40s linear infinite`,
      }}>
        {loop.map((tag, i) => (
          <span key={i} style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: 12, letterSpacing: 2, textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
            display: 'inline-flex', alignItems: 'center', gap: 40,
          }}>
            <span style={{ color: CYAN }}>+</span>
            <span>{tag}</span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes orca-marquee-l { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes orca-marquee-r { from { transform: translateX(-50%); } to { transform: translateX(0); } }
      `}</style>
    </div>
  );
};

/* ─── Word-by-word headline reveal ─── */
const WordReveal: React.FC<{ text: string; active: boolean; baseDelay?: number; accentIdx?: number[] }> = ({ text, active, baseDelay = 0, accentIdx = [] }) => {
  const words = text.split(' ');
  return (
    <>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 24 }}
          animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{ duration: 0.55, delay: baseDelay + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          style={{
            display: 'inline-block', marginInlineEnd: '0.32em',
            color: accentIdx.includes(i) ? CYAN : '#fff',
          }}
        >
          {w}
        </motion.span>
      ))}
    </>
  );
};

export const EdgeBridgeStage: React.FC<Props> = ({ isRTL, t }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35, once: false });

  const scrambleText = t("בוא נפצח את היתרון שלך.", "Let's decode your edge.");
  const [w1, w2] = scrambleText.split(/\s+(?=[^\s]+$)/); // split last word off
  const lastWord = w2 || '';
  const firstPart = w2 ? w1 : scrambleText;

  const headline = t(
    'המערכות שמסתתרות מאחורי סוחרים רציניים.',
    'The systems behind serious traders.'
  );
  const accentIdx = isRTL ? [0] : [headline.split(' ').length - 1]; // "המערכות" or "traders."

  return (
    <section
      ref={ref}
      className="orca-section"
      style={{
        paddingTop: 'clamp(60px, 10vw, 120px)',
        paddingBottom: 'clamp(40px, 6vw, 80px)',
        background: 'var(--bg)',
        overflow: 'hidden',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
      aria-label={t('בין ביצוע לתודעה', 'Between execution and cognition')}
    >
      {/* Scramble hero line */}
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        padding: '0 clamp(20px, 5vw, 60px)',
        textAlign: 'center', marginBottom: 'clamp(28px, 5vw, 56px)',
      }}>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10, letterSpacing: 3, color: CYAN,
          textTransform: 'uppercase', marginBottom: 16,
        }}>
          {t('שלב הבא · מהנתון לתובנה', 'Next phase · from data to insight')}
        </div>
        <h2 style={{
          fontFamily: 'Poppins, sans-serif', fontWeight: 800,
          fontSize: 'clamp(40px, 9vw, 96px)', lineHeight: 0.95,
          margin: 0, letterSpacing: '-0.03em',
          color: '#fff',
          whiteSpace: 'normal',
        }}>
          <ScrambleWord text={firstPart} active={inView} />
          {lastWord && (
            <>
              {' '}
              <ScrambleWord text={lastWord} active={inView} color={CYAN} delay={350} />
            </>
          )}
        </h2>
      </div>

      {/* Two-row counter-scrolling marquee */}
      <div>
        <Marquee tags={TAGS_EN} />
        <Marquee tags={TAGS_HE} reverse />
      </div>

      {/* Big word-by-word headline */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        padding: 'clamp(56px, 8vw, 100px) clamp(20px, 5vw, 60px) 0',
      }}>
        <div style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10, letterSpacing: 2, color: CYAN,
          textTransform: 'uppercase', marginBottom: 18,
        }}>
          ( {t('מה אנחנו בונים', 'What we build')} )
        </div>
        <h3 style={{
          fontFamily: 'Poppins, sans-serif', fontWeight: 700,
          fontSize: 'clamp(28px, 5.5vw, 56px)', lineHeight: 1.15,
          margin: 0, color: '#fff', letterSpacing: '-0.02em',
        }}>
          <WordReveal text={headline} active={inView} accentIdx={accentIdx} />
        </h3>
        <div style={{ marginTop: 24, maxWidth: 620 }}>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            style={{
              fontFamily: 'Poppins, sans-serif',
              fontSize: 15, lineHeight: 1.7,
              color: 'rgba(255,255,255,0.6)', margin: 0,
            }}
          >
            {t(
              'ברוקרים, תיוג AI, יומן, סיכון, תודעה — כל השכבות של מסחר מקצועי, בקוד אחד, מסתנכרן אליך.',
              'Brokers, AI tagging, journal, risk, cognition — every layer of professional trading, in one codebase, synced to you.'
            )}
          </motion.p>
        </div>
      </div>
    </section>
  );
};
