/**
 * ORCA INVESTMENT — Landing v2 (Master Plan rebuild)
 * Stage 1: Design System + Navbar + Hero.
 * Hebrew RTL, Dark Mode only. Mobile-first.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Menu, X, ArrowLeft, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import dashboardMain from '@/assets/landing/dashboard_main.png';
import journalEntry from '@/assets/landing/journal_entry.png';
import autoJournal from '@/assets/landing/auto_journal.png';
import analyticsDeck from '@/assets/landing/analytics_deck.png';
import quantLab from '@/assets/landing/quant_lab.png';
import calendarHub from '@/assets/landing/calendar.png';
import radarImg from '@/assets/landing/radar.png';
import traderMindImg from '@/assets/landing/trader_mind.png';
import backtestJournal from '@/assets/landing/backtest_journal.png';
import backtestAnalytics from '@/assets/landing/backtest_analytics.png';
import behaviorAnalysis from '@/assets/landing/behavior_analysis.png';
import whatWorks from '@/assets/landing/what_works.png';

const APP_URL = 'https://orcainvestment.co.il';

/* ─────────── Design System (Master Plan §3) ─────────── */
const orcaCss = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

.orca-landing {
  --bg:        #07090F;
  --bg-2:      #0B0E16;
  --surface:   #0E131C;
  --surface-2: #131926;
  --border:    rgba(255,255,255,0.07);
  --glass:     rgba(14,19,28,0.55);
  --text:       #F5F7FA;
  --text-muted: #8A93A6;
  --text-dim:   #5A6477;
  --cyan:   #22D3EE;
  --mint:   #34D399;
  --green:  #10B981;
  --red:    #EF4444;
  --gold:   #F59E0B;
  --amber:  #FBBF24;
  --orange: #FB923C;
  --purple: #8B5CF6;
  --blue:   #3B82F6;

  background: var(--bg);
  color: var(--text);
  font-family: 'Heebo', system-ui, -apple-system, sans-serif;
  direction: rtl;
  min-height: 100vh;
  min-height: 100dvh;
  -webkit-font-smoothing: antialiased;
}
.orca-landing .mono { font-family: 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.12em; }
.orca-landing .glass-card {
  background: var(--glass);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}
.orca-landing .grad-text {
  background: linear-gradient(90deg, #22D3EE, #34D399);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.orca-landing .grad-btn {
  background: linear-gradient(135deg, #34D399, #10B981);
  color: #052e1f;
  font-weight: 700;
  border-radius: 14px;
  padding: 14px 22px;
  display: inline-flex; align-items: center; gap: 8px;
  box-shadow: 0 0 24px rgba(52,211,153,0.30), 0 8px 30px -10px rgba(16,185,129,0.55);
  transition: transform .2s ease, box-shadow .2s ease, filter .2s ease;
  border: none; cursor: pointer; font-family: 'Heebo', sans-serif;
  min-height: 44px;
}
.orca-landing .grad-btn:hover { filter: brightness(1.08); transform: translateY(-1px); box-shadow: 0 0 32px rgba(52,211,153,0.45), 0 12px 40px -10px rgba(16,185,129,0.7); }
.orca-landing .text-glow { text-shadow: 0 0 18px currentColor; }
.orca-landing .glow-cyan { box-shadow: 0 0 32px rgba(34,211,238,0.25); }
.orca-landing .glow-mint { box-shadow: 0 0 32px rgba(52,211,153,0.25); }

/* dotted background */
.orca-bg-grid {
  background-image:
    radial-gradient(circle at 50% 0%, rgba(34,211,238,0.08), transparent 50%),
    radial-gradient(circle at 80% 60%, rgba(52,211,153,0.06), transparent 55%),
    radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: auto, auto, 26px 26px;
}

/* Nav */
.orca-nav { position: sticky; top: 0; z-index: 50; transition: background .3s ease, backdrop-filter .3s ease, border-color .3s ease; border-bottom: 1px solid transparent; }
.orca-nav.scrolled { background: rgba(7,9,15,0.75); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom-color: var(--border); }
.orca-nav a.nav-link { color: var(--text-muted); transition: color .15s ease; font-weight: 500; font-size: 14px; }
.orca-nav a.nav-link:hover { color: var(--text); }

/* Hexagon logo */
.orca-hex {
  width: 36px; height: 36px;
  background: linear-gradient(135deg, rgba(34,211,238,0.18), rgba(52,211,153,0.18));
  border: 1px solid rgba(34,211,238,0.35);
  clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%);
  display: grid; place-items: center;
  color: var(--cyan);
}

/* Live ticker */
.orca-ticker { display: flex; gap: 22px; flex-wrap: wrap; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--text-muted); }
.orca-ticker .pos { color: var(--green); }
.orca-ticker .neg { color: var(--red); }

/* Screenshot frame placeholder */
.orca-frame {
  position: relative;
  border-radius: 22px;
  padding: 14px;
  background: linear-gradient(140deg, rgba(34,211,238,0.10), rgba(52,211,153,0.06) 40%, rgba(139,92,246,0.08));
  border: 1px solid var(--border);
  box-shadow: 0 0 60px -10px rgba(34,211,238,0.35), 0 30px 80px -30px rgba(0,0,0,0.8);
}
.orca-frame-inner {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  position: relative;
}
.orca-frame-skeleton {
  position: absolute; inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(34,211,238,0.14), transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(52,211,153,0.10), transparent 40%),
    linear-gradient(180deg, #0B1220, #07090F);
}
.orca-skel-row { height: 10px; background: rgba(255,255,255,0.04); border-radius: 4px; }

/* Floating notif */
.orca-notif {
  background: rgba(14,19,28,0.85);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 14px;
  display: flex; align-items: center; gap: 10px;
  font-size: 13px;
  box-shadow: 0 12px 40px -10px rgba(0,0,0,0.7);
}

/* Command bar */
.orca-cmd-bar {
  position: fixed; bottom: 12px; left: 14px;
  font-family: 'JetBrains Mono', monospace; font-size: 11px;
  color: var(--text-dim); letter-spacing: 0.15em;
  pointer-events: none; z-index: 10;
}
.orca-cmd-bar kbd {
  background: var(--surface); border: 1px solid var(--border);
  padding: 1px 5px; border-radius: 4px; color: var(--text-muted);
}

/* Free pill */
.orca-pill-free {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 14px; border-radius: 999px;
  background: linear-gradient(90deg, rgba(52,211,153,0.18), rgba(34,211,238,0.18));
  border: 1px solid rgba(52,211,153,0.4);
  color: var(--mint); font-size: 12px; font-weight: 600;
  box-shadow: 0 0 18px rgba(52,211,153,0.25);
}

/* Mobile menu */
.orca-mobile-menu { background: var(--bg-2); border-top: 1px solid var(--border); }
.orca-mobile-menu a { padding: 14px 20px; display: block; color: var(--text); border-bottom: 1px solid var(--border); }

/* Section helpers */
.orca-section { padding: clamp(60px, 9vw, 120px) 0; position: relative; }
.orca-section-title { font-weight: 800; line-height: 1.1; letter-spacing: -0.02em; font-size: clamp(2rem, 4.4vw, 3.4rem); text-align: center; margin: 14px 0 14px; }
.orca-section-sub { color: var(--text-muted); font-size: clamp(15px, 1.4vw, 18px); text-align: center; max-width: 680px; margin: 0 auto; line-height: 1.7; }
.orca-divider { height: 1px; background: linear-gradient(90deg, transparent, var(--border), transparent); margin: 0; }

/* Stats bar */
.orca-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; }
.orca-stats > div { padding: 24px 16px; text-align: center; border-inline-end: 1px solid var(--border); }
.orca-stats > div:last-child { border-inline-end: none; }
@media (max-width: 768px) { .orca-stats { grid-template-columns: repeat(2, 1fr); } .orca-stats > div:nth-child(2) { border-inline-end: none; } .orca-stats > div:nth-child(-n+2) { border-bottom: 1px solid var(--border); } }
.orca-stat-num { font-size: clamp(2rem, 4vw, 3rem); font-weight: 800; letter-spacing: -0.02em; }
.orca-stat-label { color: var(--text-muted); font-size: 13px; margin-top: 6px; }

/* Integrations */
.orca-int-row { display: flex; align-items: center; justify-content: center; gap: clamp(20px, 5vw, 60px); flex-wrap: wrap; padding: 20px 0; }
.orca-int-row .item { font-weight: 700; color: var(--text-muted); font-size: clamp(18px, 2.2vw, 26px); letter-spacing: -0.01em; opacity: 0.85; transition: color .2s, opacity .2s; }
.orca-int-row .item:hover { color: var(--text); opacity: 1; }

/* Tabs */
.orca-tabs { display: flex; gap: 8px; overflow-x: auto; padding: 6px 4px; scrollbar-width: none; justify-content: center; flex-wrap: wrap; }
.orca-tabs::-webkit-scrollbar { display: none; }
.orca-tab { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface); color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: all .2s; min-height: 40px; }
.orca-tab:hover { color: var(--text); border-color: rgba(34,211,238,0.3); }
.orca-tab.active { color: var(--cyan); border-color: rgba(34,211,238,0.5); background: rgba(34,211,238,0.08); box-shadow: 0 0 18px rgba(34,211,238,0.2); }

/* Feature card grid */
.orca-feature-grid { display: grid; grid-template-columns: 1.05fr 1fr; gap: 36px; align-items: center; margin-top: 36px; }
@media (max-width: 900px) { .orca-feature-grid { grid-template-columns: 1fr; gap: 28px; } }
.orca-bullets { list-style: none; padding: 0; margin: 18px 0 22px; display: grid; gap: 12px; }
.orca-bullets li { display: flex; gap: 10px; align-items: flex-start; color: var(--text-muted); font-size: 15px; line-height: 1.6; }
.orca-bullets li::before { content: '✓'; color: var(--mint); font-weight: 700; margin-top: 1px; }

/* Gradient card 3-up */
.orca-grad-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 40px; }
@media (max-width: 900px) { .orca-grad-grid { grid-template-columns: 1fr; } }
.orca-grad-card { position: relative; padding: 28px; border-radius: 22px; border: 1px solid var(--border); background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)); overflow: hidden; transition: transform .25s, box-shadow .25s, border-color .25s; }
.orca-grad-card:hover { transform: translateY(-4px); }
.orca-grad-card .accent-line { position: absolute; top: 0; inset-inline-start: 0; inset-inline-end: 0; height: 2px; }
.orca-grad-card .num-badge { position: absolute; top: 18px; inset-inline-end: 20px; font-family: 'JetBrains Mono', monospace; font-size: 64px; font-weight: 800; color: rgba(255,255,255,0.04); line-height: 1; }

/* 2-up big cards */
.orca-two-up { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 40px; }
@media (max-width: 900px) { .orca-two-up { grid-template-columns: 1fr; } }
.orca-big-card { padding: 32px; border-radius: 22px; border: 1px solid var(--border); background: linear-gradient(160deg, rgba(34,211,238,0.06), rgba(7,9,15,0)); }

/* Pricing */
.orca-pricing { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; margin-top: 40px; }
@media (max-width: 900px) { .orca-pricing { grid-template-columns: 1fr; } }
.orca-price-card { padding: 32px 26px; border-radius: 22px; border: 1px solid var(--border); background: var(--surface); display: flex; flex-direction: column; gap: 18px; position: relative; transition: transform .25s; }
.orca-price-card:hover { transform: translateY(-4px); }
.orca-price-card.popular { border-color: rgba(139,92,246,0.4); box-shadow: 0 0 40px -10px rgba(139,92,246,0.4); background: linear-gradient(180deg, rgba(139,92,246,0.08), var(--surface)); }
.orca-price-card .badge-pop { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: linear-gradient(90deg, #8B5CF6, #22D3EE); color: white; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 999px; letter-spacing: 0.08em; }
.orca-price-card ul { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; flex: 1; }
.orca-price-card ul li { display: flex; gap: 8px; align-items: flex-start; color: var(--text-muted); font-size: 14px; }
.orca-price-card ul li::before { content: '✓'; color: var(--mint); }

/* Trader Mind special bg */
.orca-mind-bg {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.18), transparent 55%),
    radial-gradient(ellipse at 80% 100%, rgba(34,211,238,0.10), transparent 50%),
    var(--bg-2);
}

/* Final CTA */
.orca-final {
  background:
    radial-gradient(ellipse at 50% 50%, rgba(52,211,153,0.18), transparent 60%),
    radial-gradient(ellipse at 20% 0%, rgba(34,211,238,0.14), transparent 55%),
    var(--bg);
  text-align: center;
}

/* Footer */
.orca-footer { background: var(--bg-2); border-top: 1px solid var(--border); padding: 56px 0 36px; }
.orca-footer-grid { display: grid; grid-template-columns: 1.5fr repeat(3, 1fr); gap: 36px; }
@media (max-width: 768px) { .orca-footer-grid { grid-template-columns: 1fr 1fr; gap: 28px; } }
.orca-footer-col h4 { color: var(--text); font-size: 13px; font-weight: 700; margin-bottom: 14px; letter-spacing: 0.04em; }
.orca-footer-col a { display: block; color: var(--text-muted); font-size: 14px; padding: 5px 0; transition: color .15s; }
.orca-footer-col a:hover { color: var(--text); }
.orca-legal { background: rgba(245,158,11,0.06); border: 1px solid rgba(245,158,11,0.18); border-radius: 14px; padding: 18px 22px; color: var(--text-muted); font-size: 13px; line-height: 1.7; margin-top: 32px; }

/* Video frame */
.orca-video-wrap { position: relative; aspect-ratio: 16/9; border-radius: 22px; overflow: hidden; border: 1px solid var(--border); background: var(--surface); box-shadow: 0 0 80px -20px rgba(34,211,238,0.4); }
.orca-video-play { position: absolute; inset: 0; display: grid; place-items: center; cursor: pointer; background: radial-gradient(ellipse at center, rgba(34,211,238,0.18), transparent 60%); }
.orca-video-play .btn { width: 88px; height: 88px; border-radius: 50%; background: linear-gradient(135deg, #34D399, #22D3EE); display: grid; place-items: center; color: #07090F; box-shadow: 0 0 50px rgba(34,211,238,0.6); transition: transform .25s; }
.orca-video-play:hover .btn { transform: scale(1.06); }

/* Community constellation */
.orca-constellation { position: relative; aspect-ratio: 16/9; max-width: 720px; margin: 40px auto 0; }
.orca-constellation .center { position: absolute; inset-inline-start: 50%; top: 50%; transform: translate(50%, -50%); width: 90px; height: 90px; border-radius: 50%; background: linear-gradient(135deg, #22D3EE, #34D399); display: grid; place-items: center; font-size: 36px; box-shadow: 0 0 60px rgba(34,211,238,0.6); z-index: 2; }
.orca-avatar { position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface-2); display: grid; place-items: center; font-size: 14px; font-weight: 700; color: var(--text-muted); }

@media (prefers-reduced-motion: reduce) {
  .orca-landing *, .orca-landing *::before, .orca-landing *::after {
    animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;
  }
}
`;

/* ─────────── Components ─────────── */
const SectionLabel: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = '#22D3EE' }) => (
  <div className="mono" style={{ color, fontSize: 11, textTransform: 'uppercase' }}>{children}</div>
);

const Notif: React.FC<{ icon: string; text: string; accent?: string }> = ({ icon, text, accent = '#22D3EE' }) => (
  <div className="orca-notif" style={{ borderColor: `${accent}55` }}>
    <span style={{ fontSize: 16 }}>{icon}</span>
    <span style={{ color: 'var(--text)' }}>{text}</span>
  </div>
);

/**
 * ScreenshotFrame
 * - `src`: real uploaded screenshot URL (from a .asset.json). When provided, renders the image.
 * - Otherwise: renders a neutral grey "SCREENSHOT" placeholder (no fake/invented UI).
 * Do NOT add stock/Unsplash/AI-generated artwork here.
 */
const ScreenshotFrame: React.FC<{ src?: string; alt?: string; children?: React.ReactNode }> = ({ src, alt, children }) => (
  <div className="orca-frame">
    <div className="orca-frame-inner">
      {children ?? (src ? (
        <img
          src={src}
          alt={alt ?? 'ORCA screenshot'}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div className="orca-frame-skeleton" />
      ))}
    </div>
  </div>
);

/* Section title block */
const SectionHeader: React.FC<{ label: string; title: React.ReactNode; sub?: string; labelColor?: string }> = ({ label, title, sub, labelColor }) => (
  <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto 8px' }}>
    <SectionLabel color={labelColor}>{label}</SectionLabel>
    <h2 className="orca-section-title">{title}</h2>
    {sub && <p className="orca-section-sub">{sub}</p>}
  </div>
);

/* Reveal on scroll */
const Reveal: React.FC<{ children: React.ReactNode; delay?: number; y?: number }> = ({ children, delay = 0, y = 24 }) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-60px' }}
    transition={{ duration: 0.7, ease: 'easeOut', delay }}
  >
    {children}
  </motion.div>
);

/* Count-up animation for stats */
const CountUp: React.FC<{ value: string }> = ({ value }) => {
  // Parse "120K+", "3,200+", "40+", "100%" → numeric + suffix
  const match = value.match(/^([0-9.,]+)(.*)$/);
  const target = match ? parseFloat(match[1].replace(/,/g, '')) : 0;
  const suffix = match ? match[2] : '';
  const prefix = match ? '' : value;
  const [n, setN] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = React.useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current || started) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); obs.disconnect(); }
    }, { threshold: 0.4 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [started]);
  useEffect(() => {
    if (!started) return;
    const dur = 1400;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target]);
  const display = (() => {
    if (target >= 1000) return Math.round(n).toLocaleString('en-US');
    if (target % 1 !== 0) return n.toFixed(1);
    return Math.round(n).toString();
  })();
  // Handle "120K+" — keep the K in suffix
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
};


const GradCard: React.FC<{ accent: string; title: string; desc: string; num?: string; image?: string }> = ({ accent, title, desc, num, image }) => (
  <motion.div className="orca-grad-card"
    whileHover={{ borderColor: `${accent}66` }}
    style={{ boxShadow: `0 0 0 1px transparent, 0 20px 60px -20px ${accent}33` }}
  >
    <div className="accent-line" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    {num && <div className="num-badge">{num}</div>}
    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}22`, border: `1px solid ${accent}44`, display: 'grid', placeItems: 'center', marginBottom: 16, color: accent, fontSize: 20 }}>◆</div>
    <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, margin: '0 0 18px' }}>{desc}</p>
    <ScreenshotFrame src={image} alt={title} />
  </motion.div>
);

/* Feature Tabs — `image` is the real uploaded screenshot URL (omit for grey "SCREENSHOT" placeholder) */
const TABS: { key: string; label: string; icon: string; title: string; desc: string; bullets: string[]; image?: string }[] = [
  { key: 'journal', label: 'יומן אוטומטי', icon: '📓', title: 'יומן מסחר אוטומטי', desc: 'חבר את הברוקר פעם אחת, ועסקאות נכנסות אוטומטית — מתויגות ומוכנות לניתוח.', bullets: ['סנכרון מ-Bybit / Binance', 'יומן בוקר וערב', 'צילומי גרפים', 'ארכיון מלא לחיפוש'], image: autoJournal },
  { key: 'analytics', label: 'אנליטיקה', icon: '📊', title: 'לוח אנליטיקה מתקדם', desc: 'עשרות מטריקות כמותיות שחושפות את ה-Edge האמיתי שלך.', bullets: ['Equity Curve מתקדמת', 'Profit Factor & R-Multiples', 'ניתוח לפי נכס / שעה / יום', 'סיכומים שבועי, חודשי, שנתי'], image: analyticsDeck },
  { key: 'risk', label: 'ניהול סיכונים', icon: '🛡️', title: 'מנוע סיכונים 4-שכבתי', desc: 'הגנה אוטומטית מפני over-trading עם מנגנון משמעת חכם.', bullets: ['מגבלות -1R / -2R / -5R / -10R', 'חישוב גודל פוזיציה אוטומטי', 'התראות Risk Drift', 'מצב צינון (Cool-Off)'] },
  { key: 'ai', label: 'תובנות AI', icon: '🧠', title: 'מנוע תובנות עמוק', desc: 'מזהה דפוסים סמויים שאף סוחר לא היה רואה לבד.', bullets: ['זיהוי דפוסים נסתרים', 'חוזקות וחולשות אישיות', 'Orca Coach מבוסס נתונים', 'גרפים ברמת Awwwards'] },
  { key: 'mind', label: 'תודעת הסוחר', icon: '🐋', title: 'אבחון תודעת הסוחר', desc: 'פרופיל Archetype אישי שמכייל את ה-AI Coach לפי הסוחר שאתה.', bullets: ['אבחון אישיות סוחר', 'פרופיל Archetype', 'כיול AI Coach', 'כיול-מחדש כל 45 יום'], image: traderMindImg },
  { key: 'radar', label: 'מכ״ם כלכלי', icon: '📡', title: 'מכ״ם אירועים כלכליים', desc: 'רדאר אירועים גלובלי עם חישוב Surprise בזמן אמת.', bullets: ['רדאר אירועים עולמי', 'Tier 1 / 2 / 3', 'עדכוני T-5 / T-1 / Live', 'חישוב Surprise אוטומטי'], image: radarImg },
];

const FeatureTabs: React.FC = () => {
  const [active, setActive] = useState(TABS[0].key);
  const tab = TABS.find(t => t.key === active) || TABS[0];
  return (
    <>
      <div className="orca-tabs" style={{ marginTop: 32 }}>
        {TABS.map(t => (
          <button key={t.key} className={`orca-tab ${active === t.key ? 'active' : ''}`} onClick={() => setActive(t.key)}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>
      <motion.div key={tab.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="orca-feature-grid glass-card" style={{ padding: 32 }}>
        <div>
          <SectionLabel>{tab.icon} {tab.label.toUpperCase()}</SectionLabel>
          <h3 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, margin: '12px 0 10px', letterSpacing: '-0.01em' }}>{tab.title}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7 }}>{tab.desc}</p>
          <ul className="orca-bullets">{tab.bullets.map(b => <li key={b}>{b}</li>)}</ul>
          <a href="#" style={{ color: 'var(--cyan)', fontSize: 14, fontWeight: 600 }}>עוד ←</a>
        </div>
        <ScreenshotFrame src={tab.image} alt={tab.title} />
      </motion.div>
    </>
  );
};



/* ─────────── Page ─────────── */
const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'Orca Investment — יומן מסחר חכם ואוטומטי';
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute('content') ?? '';
    meta?.setAttribute('content', 'Orca Investment — יומן מסחר חכם שמרכז, מנתח ונותן סטטיסטיקות מדויקות לסוחר. חינם בתקופת ההשקה.');
    return () => { document.title = prevTitle; meta?.setAttribute('content', prevDesc); };
  }, []);

  const goApp = () => { navigate('/auth'); };

  const navLinks = [
    { href: '#features', label: 'פיצ׳רים' },
    { href: '#journal', label: 'היומן' },
    { href: '#community', label: 'הקהילה' },
    { href: '#pricing', label: 'מחירים' },
    { href: '#about', label: 'אודות' },
  ];

  return (
    <>
      <style>{orcaCss}</style>
      <div className="orca-landing orca-bg-grid">
        {/* ───── NAVBAR ───── */}
        <nav className={`orca-nav ${scrolled ? 'scrolled' : ''}`}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8" style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Logo */}
            <Link to="/welcome" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="orca-hex"><TrendingUp size={16} /></div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em' }}>Orca</span>
                <span style={{ fontWeight: 300, fontSize: 15, color: 'var(--text-muted)' }}>Investment</span>
              </div>
            </Link>

            {/* Center nav (desktop) */}
            <div className="hidden lg:flex items-center" style={{ gap: 28 }}>
              {navLinks.map(l => (
                <a key={l.href} href={l.href} className="nav-link">{l.label}</a>
              ))}
            </div>

            {/* Right (desktop) */}
            <div className="hidden lg:flex items-center" style={{ gap: 14 }}>
              <button className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: 8 }}>
                עב / EN
              </button>
              <button className="grad-btn" onClick={goApp} style={{ padding: '10px 18px', fontSize: 14 }}>
                כניסה למערכת
              </button>
            </div>

            {/* Mobile toggle */}
            <button className="lg:hidden" onClick={() => setMenuOpen(o => !o)} aria-label="תפריט"
              style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 10, width: 44, height: 44, display: 'grid', placeItems: 'center', color: 'var(--text)' }}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {menuOpen && (
            <div className="orca-mobile-menu lg:hidden">
              {navLinks.map(l => (
                <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}>{l.label}</a>
              ))}
              <div style={{ padding: 16 }}>
                <button className="grad-btn" onClick={() => { setMenuOpen(false); goApp(); }} style={{ width: '100%', justifyContent: 'center' }}>
                  כניסה למערכת
                </button>
              </div>
            </div>
          )}
        </nav>

        {/* ───── HERO ───── */}
        <section style={{ position: 'relative', paddingTop: 'clamp(48px, 9vw, 96px)', paddingBottom: 'clamp(56px, 10vw, 120px)' }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              {/* Text */}
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }}
                style={{ order: 1 }}
              >
                <SectionLabel>ORCA INVESTMENT · יומן מסחר חכם</SectionLabel>

                <h1 style={{
                  fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em',
                  fontSize: 'clamp(2.4rem, 6vw, 4.8rem)',
                  margin: '18px 0 22px',
                }}>
                  הדרך החכמה לנהל את{' '}
                  <span className="grad-text">המסחר שלך</span>
                </h1>

                <p style={{ fontSize: 'clamp(16px, 1.6vw, 19px)', lineHeight: 1.7, color: 'var(--text-muted)', maxWidth: 560, marginBottom: 24 }}>
                  Orca Investment הוא יומן מסחר חכם ואוטומטי שמרכז עבורך את כל המידע על העסקאות שלך,
                  מנתח אותן ונותן לך סטטיסטיקות מדויקות — כדי לקבל החלטות טובות יותר במסחר.
                </p>

                <div className="orca-pill-free" style={{ marginBottom: 28 }}>
                  <span>🎉</span>
                  <span>חינם בתקופת ההשקה — כל המסלולים פתוחים</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 26 }}>
                  <button className="grad-btn" onClick={goApp} style={{ fontSize: 16, padding: '16px 26px' }}>
                    התחל בחינם
                    <ArrowLeft size={18} />
                  </button>
                  <Link to="/auth" style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
                    כבר רשום? כניסה ←
                  </Link>
                </div>

                {/* Live ticker */}
                <div className="orca-ticker">
                  <span>BTC/USD <span className="pos">+1.21%</span></span>
                  <span>ETH/USD <span className="pos">+4.30%</span></span>
                  <span>SOL/USD <span className="neg">-2.85%</span></span>
                  <span>BNB/USD <span className="neg">-0.41%</span></span>
                </div>
              </motion.div>

              {/* Mockup */}
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
                style={{ position: 'relative', order: 2 }}
              >
                <ScreenshotFrame src={dashboardMain} alt="ORCA Dashboard" />


                {/* Floating notifs */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7, duration: 0.5 }}
                  style={{ position: 'absolute', top: -14, insetInlineStart: -10 }}
                >
                  <Notif icon="🐋" text="ציון ORCA: 86 — GREAT" accent="#22D3EE" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.95, duration: 0.5 }}
                  style={{ position: 'absolute', insetBlockEnd: 30, insetInlineEnd: -14 }}
                >
                  <Notif icon="✅" text="סנכרון אוטומטי · 32 עסקאות מ-Bybit" accent="#34D399" />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.5 }}
                  style={{ position: 'absolute', bottom: -18, insetInlineStart: '18%' }}
                >
                  <Notif icon="🧠" text="תובנת AI חדשה זוהתה" accent="#8B5CF6" />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ───── 3. STATS BAR ───── */}
        <section className="orca-section" style={{ paddingTop: 0, paddingBottom: 'clamp(40px, 6vw, 70px)' }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="glass-card orca-stats">
              {[
                { num: '120K+', label: 'עסקאות תועדו' },
                { num: '3,200+', label: 'חברי קהילה' },
                { num: '40+', label: 'מדדים מנותחים' },
                { num: '100%', label: 'אוטומטי' },
              ].map((s, i) => (
                <div key={i}>
                  <div className="orca-stat-num grad-text text-glow"><CountUp value={s.num} /></div>
                  <div className="orca-stat-label mono">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── 4. INTEGRATIONS ───── */}
        <section className="orca-section" style={{ paddingTop: 0, paddingBottom: 'clamp(40px, 6vw, 70px)' }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <SectionLabel>מסתנכרן אוטומטית עם</SectionLabel>
            </div>
            <div className="orca-int-row">
              <div className="item">Bybit</div>
              <div className="item">Binance</div>
              <div className="item">ייבוא CSV אוניברסלי</div>
            </div>
            <div className="mono" style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 11, marginTop: 12 }}>
              API READ-ONLY · מאובטח צד-שרת
            </div>
          </div>
        </section>

        <div className="orca-divider" />

        {/* ───── 5. FEATURE TABS ───── */}
        <section id="features" className="orca-section">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <SectionHeader
              label="הפלטפורמה"
              title={<>מערכת אחת. <span className="grad-text">כל הכלים.</span></>}
              sub="כל מה שהופך אותך לסוחר טוב יותר — במקום אחד."
            />
            <FeatureTabs />
          </div>
        </section>

        {/* ───── 6. JOURNALING ───── */}
        <section id="journal" className="orca-section" style={{ background: 'var(--bg-2)' }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <SectionHeader
              label="יומן אוטומטי"
              title={<>כל טרייד, <span className="grad-text">מתועד אוטומטית.</span></>}
              sub="חבר פעם אחת — והעסקאות זורמות פנימה, מתויגות ומוכנות לניתוח. לא עוד תיעוד ידני."
            />
            <div className="orca-grad-grid">
              <GradCard accent="#22D3EE" title="יומן בוקר וערב" desc="ניתוח לפני השוק + רפלקציה אחרי, עם הזרמה אוטומטית של עסקאות היום." image={journalEntry} />
              <GradCard accent="#34D399" title="Calendar Hub" desc="מרכז ה-P&L: לוח שנה אינטראקטיבי עם סיכומי שבוע וחודש." image={calendarHub} />
              <GradCard accent="#8B5CF6" title="יומן Backtest" desc="דימנשן נפרד לתיעוד אסטרטגיות, סטטיסטיקות והשוואה לחי." image={backtestJournal} />
            </div>
          </div>
        </section>

        {/* ───── 7. VIDEO ───── */}
        <section className="orca-section">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <SectionHeader
              label="DEMO"
              title={<>ראה את <span className="grad-text">Orca בפעולה.</span></>}
              sub="סיור קצר במערכת — מהזנת טרייד ועד תובנת AI."
            />
            <div className="orca-video-wrap" style={{ marginTop: 36 }}>
              <div className="orca-frame-skeleton" style={{ position: 'absolute', inset: 0 }} />
              <div className="orca-video-play">
                <div className="btn">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── 8. INSIGHTS ───── */}
        <section className="orca-section" style={{ background: 'var(--bg-2)' }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <SectionHeader
              label="דוחות מבוססי-נתונים"
              title={<>קבל תובנות <span className="grad-text">שלא ראית.</span></>}
              sub="עשרות מודולים כמותיים שחושפים את ה-Edge האמיתי שלך."
            />
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button className="grad-btn" onClick={goApp}>התחל בחינם <ArrowLeft size={16} /></button>
            </div>
            <div className="orca-grad-grid">
              <GradCard accent="#22D3EE" title="צלול עמוק לאסטרטגיה" desc="Monte Carlo, Box Plot, Risk-Reward Frontier ועוד בלוח Quant Lab." num="01" image={quantLab} />
              <GradCard accent="#8B5CF6" title="הבן את ההתנהגות שלך" desc="ניתוח רב-ממדי של 145+ עסקאות וזיהוי דפוסים פסיכולוגיים." num="02" image={behaviorAnalysis} />
              <GradCard accent="#34D399" title="מה עובד בשבילך" desc="חוזקות, שעות זהב, נכסים מנצחים — והיכן ה-Edge האמיתי שלך." num="03" image={whatWorks} />
            </div>
          </div>
        </section>

        {/* ───── 9. EDGE / RISK ───── */}
        <section className="orca-section">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <SectionHeader
              label="EDGE & RISK"
              title={<>האם יש לך <span className="grad-text">Edge רווחי?</span></>}
              sub="מדדי ORCA וניהול סיכונים שומרים אותך משמעתי ורווחי לאורך זמן."
            />
            <div className="orca-two-up">
              <div className="orca-big-card" style={{ background: 'linear-gradient(160deg, rgba(34,211,238,0.10), rgba(7,9,15,0))' }}>
                <SectionLabel>מדדי ORCA</SectionLabel>
                <h3 style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2rem)', fontWeight: 800, margin: '10px 0 12px' }}>ORCA Score — 0 עד 100</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 18 }}>
                  ציון משולב של משמעת, עקביות סיכון והתאמת משטר. הכי קרוב שיש לתעודת זהות לסוחר.
                </p>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 12 }}>
                  {[{ v: 86, c: '#22D3EE' }, { v: 81, c: '#F59E0B' }, { v: 56, c: '#8B5CF6' }, { v: 100, c: '#34D399' }].map((g, i) => (
                    <div key={i} style={{ width: 86, height: 86, borderRadius: '50%', border: `4px solid ${g.c}`, display: 'grid', placeItems: 'center', boxShadow: `0 0 24px ${g.c}55`, background: 'var(--surface)' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: g.c, textShadow: `0 0 12px ${g.c}` }}>{g.v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="orca-big-card" style={{ background: 'linear-gradient(160deg, rgba(245,158,11,0.10), rgba(7,9,15,0))' }}>
                <SectionLabel color="#F59E0B">מנוע סיכונים</SectionLabel>
                <h3 style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2rem)', fontWeight: 800, margin: '10px 0 12px' }}>הגנה 4-שכבתית</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 18 }}>
                  מגבלות -1R לעסקה, -2R יומי, -5R שבועי, -10R חודשי. מד סיכון חי, התראות Risk Drift ומצב צינון.
                </p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {[{ k: '-1R', v: 'עסקה', c: '#22D3EE' }, { k: '-2R', v: 'יומי', c: '#34D399' }, { k: '-5R', v: 'שבועי', c: '#F59E0B' }, { k: '-10R', v: 'חודשי', c: '#EF4444' }].map(l => (
                    <div key={l.k} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                      <div className="mono" style={{ color: l.c, fontWeight: 700, fontSize: 14, minWidth: 48 }}>{l.k}</div>
                      <div style={{ color: 'var(--text)', fontSize: 14 }}>{l.v}</div>
                      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${[35, 55, 70, 88][['-1R', '-2R', '-5R', '-10R'].indexOf(l.k)]}%`, height: '100%', background: l.c, boxShadow: `0 0 8px ${l.c}` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── 10. TRADER MIND ───── */}
        <section className="orca-section orca-mind-bg">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <SectionHeader
              label="ORCA · MAINFRAME"
              title={<>תודעת הסוחר — <span className="grad-text">המנוע שמכיר אותך.</span></>}
              sub="אבחון התנהגותי שבונה לך פרופיל אישי (Archetype), ומכייל את ה-AI Coach בדיוק לחולשות ולחוזקות שלך."
              labelColor="#8B5CF6"
            />
            <div style={{ maxWidth: 720, margin: '36px auto 0' }}>
              <ScreenshotFrame src={traderMindImg} />
            </div>
            <div style={{ textAlign: 'center', marginTop: 28 }}>
              <button className="grad-btn" onClick={goApp}>גלה את פרופיל הסוחר שלך <ArrowLeft size={16} /></button>
            </div>
          </div>
        </section>

        {/* ───── 11. COMMUNITY ───── */}
        <section id="community" className="orca-section">
          <div className="max-w-5xl mx-auto px-5 sm:px-8" style={{ textAlign: 'center' }}>
            <SectionHeader
              label="קהילה"
              title={<>אלפי סוחרים <span className="grad-text">בקהילת Orca.</span></>}
              sub="הצטרף לקהילת סוחרים פעילה — שתף, למד והשתפר ביחד."
            />
            <div className="orca-constellation">
              <svg viewBox="0 0 600 340" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
                <defs>
                  <linearGradient id="conn" x1="0" x2="1">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#34D399" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                {[[300, 170, 80, 60], [300, 170, 500, 70], [300, 170, 100, 270], [300, 170, 520, 280], [300, 170, 60, 170], [300, 170, 540, 170]].map((l, i) => (
                  <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} stroke="url(#conn)" strokeWidth="1" />
                ))}
              </svg>
              <div className="center">🐋</div>
              {[{ x: 60, y: 40, n: 'AR' }, { x: 480, y: 50, n: 'DM' }, { x: 80, y: 250, n: 'YS' }, { x: 500, y: 260, n: 'NL' }, { x: 30, y: 150, n: 'OK' }, { x: 520, y: 150, n: 'TH' }].map((a, i) => (
                <div key={i} className="orca-avatar" style={{ insetInlineStart: `${(a.x / 600) * 100}%`, top: `${(a.y / 340) * 100}%` }}>{a.n}</div>
              ))}
            </div>
            <div style={{ marginTop: 36 }}>
              <button className="grad-btn" onClick={() => window.open('https://discord.gg', '_blank')}>הצטרף לקהילה <ArrowLeft size={16} /></button>
            </div>
          </div>
        </section>

        {/* ───── 12. PRICING ───── */}
        <section id="pricing" className="orca-section" style={{ background: 'var(--bg-2)' }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <SectionHeader label="מחירים" title={<>מסלול <span className="grad-text">לכל סוחר.</span></>} />
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <div className="orca-pill-free" style={{ fontSize: 14, padding: '10px 20px' }}>
                🎉 בתקופת ההשקה — כל המסלולים פתוחים בחינם!
              </div>
            </div>
            <div className="orca-pricing">
              {[
                { name: 'Standard', desc: 'יומן + אנליטיקה בסיסית.', feats: ['יומן מסחר אוטומטי', 'KPIs ליבה', 'Calendar Hub', 'ייבוא CSV'] },
                { name: 'Pro', desc: 'ניהול סיכונים, תובנות AI, תודעת סוחר.', feats: ['כל מה ש-Standard', 'מנוע סיכונים 4-שכבתי', 'תובנות AI עמוקות', 'אבחון תודעת הסוחר'], popular: true },
                { name: 'Ultimate', desc: 'מעבדת אנליטיקה מתקדמת.', feats: ['כל מה ש-Pro', 'Quant Lab מלא', 'Monte Carlo + Box Plot', 'Risk-Reward Frontier'] },
              ].map((p) => (
                <div key={p.name} className={`orca-price-card ${p.popular ? 'popular' : ''}`}>
                  {p.popular && <div className="badge-pop">המומלץ</div>}
                  <div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>מסלול</div>
                    <h3 style={{ fontSize: 26, fontWeight: 800, margin: '6px 0 6px', color: p.popular ? '#8B5CF6' : 'var(--text)' }}>{p.name}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6 }}>{p.desc}</p>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>מחיר</span>
                      <span style={{ fontSize: 24, fontWeight: 800, color: p.popular ? '#8B5CF6' : 'var(--cyan)' }}>בקרוב</span>
                    </div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--mint)', marginTop: 4 }}>חינם בתקופת ההשקה</div>
                  </div>
                  <ul>{p.feats.map(f => <li key={f}>{f}</li>)}</ul>
                  <button className="grad-btn" onClick={goApp} style={{ width: '100%', justifyContent: 'center' }}>
                    התחל בחינם
                  </button>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center' }}>
                    ללא כרטיס אשראי · גישה מלאה עכשיו
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── 13. FINAL CTA ───── */}
        <section className="orca-section orca-final">
          <div className="max-w-4xl mx-auto px-5 sm:px-8">
            <h2 className="orca-section-title">
              התחל לנהל את המסחר שלך — <span className="grad-text">בחינם.</span>
            </h2>
            <div style={{ marginTop: 28 }}>
              <button className="grad-btn" onClick={goApp} style={{ fontSize: 17, padding: '18px 32px' }}>
                כניסה למערכת <ArrowLeft size={18} />
              </button>
            </div>
          </div>
        </section>

        {/* ───── 14. FOOTER ───── */}
        <footer id="about" className="orca-footer">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div className="orca-footer-grid">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div className="orca-hex"><TrendingUp size={16} /></div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontWeight: 800, fontSize: 18 }}>Orca</span>
                    <span style={{ fontWeight: 300, fontSize: 15, color: 'var(--text-muted)' }}>Investment</span>
                  </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, maxWidth: 320 }}>
                  יומן מסחר חכם ואוטומטי. כל טרייד, כל סטטיסטיקה, החלטה אחת טובה יותר.
                </p>
              </div>
              <div className="orca-footer-col">
                <h4>מוצר</h4>
                <a href="#features">פיצ׳רים</a>
                <a href="#journal">היומן</a>
                <a href="#pricing">מחירים</a>
              </div>
              <div className="orca-footer-col">
                <h4>קהילה</h4>
                <a href="#community">Discord</a>
                <a href="#">Telegram</a>
                <a href="#">YouTube</a>
              </div>
              <div className="orca-footer-col">
                <h4>משפטי</h4>
                <Link to="/terms">תנאי שימוש</Link>
                <a href="#">פרטיות</a>
                <a href="#">נגישות</a>
              </div>
            </div>

            <div className="orca-legal">
              ⚠️ <strong style={{ color: 'var(--text)' }}>Orca Investment</strong> אינה מערכת איתותים ואינה מספקת המלצות השקעה.
              הנתונים מבוססים על פעילות המסחר האישית של המשתמש ונועדו ללמידה, שיפור תהליך ופיתוח משמעת.
              מסחר בשווקים פיננסיים כרוך בסיכון; כל משתמש פועל לפי שיקול דעתו.
            </div>

            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>© 2026 ORCA INVESTMENT. ALL RIGHTS RESERVED.</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>BUILT WITH 🐋 IN TEL AVIV</div>
            </div>
          </div>
        </footer>

        {/* Command bar signature */}

        <div className="orca-cmd-bar hidden sm:block">
          PRESS <kbd>⌘K</kbd> FOR COMMAND · <kbd>?</kbd> HELP
        </div>
      </div>
    </>
  );
};

export default Landing;
