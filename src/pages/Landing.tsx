/**
 * ORCA INVESTMENT — Landing v2 (Master Plan rebuild)
 * Stage 1: Design System + Navbar + Hero.
 * Hebrew RTL, Dark Mode only. Mobile-first.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { ExecutionFlowStage, TraderMindHeatmapStage, TradeCardExplodeStage, RiskGeometryStage, FinaleStage } from './landing/scrollytelling';

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
import orcaLogo from '@/assets/landing/orca_logo.png';
import riskManagement from '@/assets/landing/risk_management.png';
import aiMainframe from '@/assets/landing/ai_mainframe.png';
import aiGoldEdge from '@/assets/landing/ai_gold_edge.png';
import behaviorAnalysis from '@/assets/landing/behavior_analysis.png';
import whatWorks from '@/assets/landing/what_works.png';
import tomorrowMorning from '@/assets/landing/tomorrow_morning.png';
import saidVsReal from '@/assets/landing/said_vs_real.png';


const APP_URL = 'https://orcainvestment.co.il';

/* ─────────── Design System (Master Plan §3) ─────────── */
const orcaCss = `
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');

.orca-landing {
  --bg:        #000000;
  --bg-2:      transparent;
  --surface:   #0A0D14;
  --surface-2: #0F131C;
  --border:    rgba(34,211,238,0.10);
  --glass:     rgba(8,12,20,0.55);
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

  background:
    radial-gradient(ellipse 80% 60% at 20% 0%, rgba(34,211,238,0.12), transparent 60%),
    radial-gradient(ellipse 70% 50% at 90% 20%, rgba(52,211,153,0.10), transparent 60%),
    radial-gradient(ellipse 60% 50% at 50% 100%, rgba(139,92,246,0.08), transparent 60%),
    var(--bg);
  color: var(--text);
  font-family: 'Heebo', system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  min-height: 100dvh;
  -webkit-font-smoothing: antialiased;
}
.orca-landing[dir="rtl"] { direction: rtl; }
.orca-landing[dir="ltr"] { direction: ltr; font-family: 'Inter', system-ui, -apple-system, sans-serif; }
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

/* Community constellation — animated orbits around Orca logo */
.orca-constellation { position: relative; aspect-ratio: 1/1; max-width: 560px; margin: 40px auto 0; }
.orca-constellation .center {
  position: absolute; inset-inline-start: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 140px; height: 140px; border-radius: 50%;
  display: grid; place-items: center; z-index: 5;
  background: radial-gradient(circle at center, rgba(34,211,238,0.22), rgba(52,211,153,0.08) 60%, transparent 75%);
  filter: drop-shadow(0 0 30px rgba(34,211,238,0.55));
}
.orca-constellation .center img { width: 100%; height: 100%; object-fit: contain; animation: orca-float 6s ease-in-out infinite; }
@keyframes orca-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
.orca-orbit { position: absolute; inset: 0; border-radius: 50%; border: 1px dashed rgba(34,211,238,0.18); animation: orca-spin 40s linear infinite; }
.orca-orbit.mid { inset: 14%; border-color: rgba(52,211,153,0.22); animation-duration: 28s; animation-direction: reverse; }
.orca-orbit.inner { inset: 28%; border-color: rgba(139,92,246,0.22); animation-duration: 18s; }
@keyframes orca-spin { from { transform: rotate(0) } to { transform: rotate(360deg) } }
.orca-orbit-dot { position: absolute; top: -6px; left: 50%; width: 12px; height: 12px; border-radius: 50%; background: linear-gradient(135deg,#22D3EE,#34D399); box-shadow: 0 0 12px rgba(34,211,238,0.7); transform: translateX(-50%); }
.orca-orbit.mid .orca-orbit-dot { background: linear-gradient(135deg,#34D399,#22D3EE); }
.orca-orbit.inner .orca-orbit-dot { background: linear-gradient(135deg,#8B5CF6,#22D3EE); }
.orca-avatar { position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--border); background: var(--surface-2); display: grid; place-items: center; font-size: 13px; font-weight: 700; color: var(--text); backdrop-filter: blur(6px); box-shadow: 0 6px 18px rgba(0,0,0,0.4); animation: orca-float 7s ease-in-out infinite; z-index: 3; }

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
          decoding="async"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div className="orca-frame-skeleton" />
      ))}
    </div>
  </div>
);

/* TraderMindRotator — single device frame fading between real result screens. */
const TraderMindRotator: React.FC<{ slides: { src: string; caption: string }[] }> = ({ slides }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI(v => (v + 1) % slides.length), 4200);
    return () => window.clearInterval(id);
  }, [slides.length]);
  return (
    <div style={{ maxWidth: 760, margin: '40px auto 0' }}>
      <div className="orca-frame">
        <div className="orca-frame-inner" style={{ aspectRatio: '16 / 10' }}>
          {slides.map((s, idx) => (
            <img
              key={s.src}
              src={s.src}
              alt={s.caption}
              loading={idx === 0 ? 'eager' : 'lazy'}
              {...(idx === 0 ? { fetchpriority: 'high' as any } : {})}
              decoding="async"
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', display: 'block',
                opacity: idx === i ? 1 : 0,
                transform: idx === i ? 'scale(1)' : 'scale(1.02)',
                transition: 'opacity 1.1s ease, transform 6s ease-out',
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14, marginTop: 14 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 13, minHeight: 18, transition: 'opacity .3s' }}>
          {slides[i].caption}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setI(idx)}
              aria-label={`slide ${idx + 1}`}
              style={{
                width: idx === i ? 22 : 8, height: 8, padding: 0, borderRadius: 999,
                border: 'none', cursor: 'pointer',
                background: idx === i ? 'linear-gradient(90deg,#22D3EE,#8B5CF6)' : 'rgba(255,255,255,0.18)',
                transition: 'width .3s ease, background .3s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

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
type TabDef = { key: string; label: string; icon: string; title: string; desc: string; bullets: string[]; image?: string; extraImage?: string };
const getTabs = (t: (he: string, en: string) => string): TabDef[] => [
  { key: 'journal',   label: t('יומן אוטומטי','Auto Journal'), icon: '📓', title: t('יומן מסחר אוטומטי','Automated Trade Journal'), desc: t('חבר את הברוקר פעם אחת, ועסקאות נכנסות אוטומטית — מתויגות ומוכנות לניתוח.','Connect your broker once. Trades flow in automatically — tagged and ready to analyze.'), bullets: [t('סנכרון מ-Bybit / Binance','Sync from Bybit / Binance'), t('יומן בוקר וערב','Morning & evening journaling'), t('צילומי גרפים','Chart screenshots'), t('ארכיון מלא לחיפוש','Full searchable archive')], image: autoJournal },
  { key: 'analytics', label: t('אנליטיקה','Analytics'), icon: '📊', title: t('לוח אנליטיקה מתקדם','Advanced Analytics Deck'), desc: t('עשרות מטריקות כמותיות שחושפות את ה-Edge האמיתי שלך.','Dozens of quantitative metrics that expose your real edge.'), bullets: [t('Equity Curve מתקדמת','Advanced equity curve'), t('Profit Factor & R-Multiples','Profit Factor & R-Multiples'), t('ניתוח לפי נכס / שעה / יום','Breakdown by asset / hour / day'), t('סיכומים שבועי, חודשי, שנתי','Weekly, monthly, yearly summaries')], image: analyticsDeck },
  { key: 'risk',      label: t('ניהול סיכונים','Risk Management'), icon: '🛡️', title: t('מנוע סיכונים 4-שכבתי','4-Tier Risk Engine'), desc: t('הגנה אוטומטית מפני over-trading עם מנגנון משמעת חכם.','Automatic protection against over-trading with an intelligent discipline engine.'), bullets: [t('מגבלות -1R / -2R / -5R / -10R','-1R / -2R / -5R / -10R limits'), t('חישוב גודל פוזיציה אוטומטי','Auto position sizing'), t('התראות Risk Drift','Risk Drift alerts'), t('מצב צינון (Cool-Off)','Cool-Off mode')], image: riskManagement },
  { key: 'ai',        label: t('תובנות AI','AI Insights'), icon: '🧠', title: t('מנוע תובנות עמוק','Deep Insight Engine'), desc: t('מזהה דפוסים סמויים שאף סוחר לא היה רואה לבד.','Detects hidden patterns no trader would catch alone.'), bullets: [t('זיהוי דפוסים נסתרים','Hidden pattern detection'), t('חוזקות וחולשות אישיות','Personal strengths & weaknesses'), t('Orca Coach מבוסס נתונים','Data-driven Orca Coach'), t('גרפים ברמת Awwwards','Awwwards-grade visualizations')], image: aiMainframe, extraImage: aiGoldEdge },
  { key: 'mind',      label: t('תודעת הסוחר','Trader Mind'), icon: '🐋', title: t('אבחון תודעת הסוחר','Trader Mind Diagnostic'), desc: t('פרופיל Archetype אישי שמכייל את ה-AI Coach לפי הסוחר שאתה.','A personal Archetype profile that calibrates the AI Coach to who you really are.'), bullets: [t('אבחון אישיות סוחר','Trader personality diagnostic'), t('פרופיל Archetype','Archetype profile'), t('כיול AI Coach','AI Coach calibration'), t('כיול-מחדש כל 45 יום','Re-calibration every 45 days')], image: traderMindImg },
  { key: 'radar',     label: t('מכ״ם כלכלי','Economic Radar'), icon: '📡', title: t('מכ״ם אירועים כלכליים','Economic Event Radar'), desc: t('רדאר אירועים גלובלי עם חישוב Surprise בזמן אמת.','Global event radar with real-time Surprise scoring.'), bullets: [t('רדאר אירועים עולמי','Global event radar'), t('Tier 1 / 2 / 3','Tier 1 / 2 / 3'), t('עדכוני T-5 / T-1 / Live','T-5 / T-1 / Live updates'), t('חישוב Surprise אוטומטי','Automatic Surprise calculation')], image: radarImg },
];

const FeatureTabs: React.FC<{ t: (he: string, en: string) => string }> = ({ t }) => {
  const TABS = React.useMemo(() => getTabs(t), [t]);
  const [active, setActive] = useState(TABS[0].key);
  const tab = TABS.find(x => x.key === active) || TABS[0];
  return (
    <>
      <div className="orca-tabs" style={{ marginTop: 32 }}>
        {TABS.map(x => (
          <button key={x.key} className={`orca-tab ${active === x.key ? 'active' : ''}`} onClick={() => setActive(x.key)}>
            <span>{x.icon}</span>{x.label}
          </button>
        ))}
      </div>
      <motion.div key={tab.key} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="orca-feature-grid glass-card" style={{ padding: 32 }}>
        <div>
          <SectionLabel>{tab.icon} {tab.label.toUpperCase()}</SectionLabel>
          <h3 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, margin: '12px 0 10px', letterSpacing: '-0.01em' }}>{tab.title}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.7 }}>{tab.desc}</p>
          <ul className="orca-bullets">{tab.bullets.map(b => <li key={b}>{b}</li>)}</ul>
          <a href="#" style={{ color: 'var(--cyan)', fontSize: 14, fontWeight: 600 }}>{t('עוד ←','More →')}</a>
        </div>
        {tab.extraImage ? (
          <ScreenshotFrame alt={tab.title}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', height: '100%', padding: 8, background: 'var(--bg-2)' }}>
              <img src={tab.image} alt={tab.title} loading="lazy" style={{ width: '100%', flex: 1, objectFit: 'cover', borderRadius: 8, minHeight: 0 }} />
              <img src={tab.extraImage} alt={tab.title} loading="lazy" style={{ width: '100%', flex: 1, objectFit: 'cover', borderRadius: 8, minHeight: 0 }} />
            </div>
          </ScreenshotFrame>
        ) : (
          <ScreenshotFrame src={tab.image} alt={tab.title} />
        )}
      </motion.div>
    </>
  );
};



/* ─────────── Page ─────────── */
const LANG_OVERRIDE_KEY = 'orca:auth-lang-override';
const LANG_CACHE_KEY = 'orca:lang-cache';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  const [lang, setLangState] = useState<'he' | 'en'>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      const override = window.localStorage.getItem(LANG_OVERRIDE_KEY);
      if (override === 'en' || override === 'he') return override;
      const cached = window.localStorage.getItem(LANG_CACHE_KEY);
      if (cached === 'en' || cached === 'he') return cached;
      // First visit: auto-detect from browser language. Israel/Hebrew browsers get HE,
      // everyone else gets EN by default.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = (window.navigator?.language || (window.navigator as any)?.userLanguage || '').toLowerCase();
      const detected: 'he' | 'en' = (nav.startsWith('he') || nav.startsWith('iw')) ? 'he' : 'en';
      try { window.localStorage.setItem(LANG_CACHE_KEY, detected); } catch { /* noop */ }
      return detected;
    } catch { return 'en'; }
  });
  const isRTL = lang === 'he';
  const t = React.useCallback((he: string, en: string) => (isRTL ? he : en), [isRTL]);

  /**
   * Persist the user's explicit choice so the rest of the platform (login, app
   * shell, settings) inherits it. We write BOTH keys:
   *   - LANG_CACHE_KEY    → read by useLang() on first paint anywhere in the app
   *   - LANG_OVERRIDE_KEY → read by Auth/Landing on next mount to skip detection
   * And we broadcast `orca:lang-changed` so any already-mounted component flips
   * instantly without a reload.
   */
  const toggleLang = React.useCallback(() => {
    setLangState(prev => {
      const next: 'he' | 'en' = prev === 'he' ? 'en' : 'he';
      try {
        window.localStorage.setItem(LANG_OVERRIDE_KEY, next);
        window.localStorage.setItem(LANG_CACHE_KEY, next);
      } catch { /* noop */ }
      try {
        window.dispatchEvent(new CustomEvent('orca:lang-changed', { detail: { lang: next } }));
      } catch { /* noop */ }
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
  }, [lang, isRTL]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const prevTitle = document.title;
    document.title = isRTL
      ? 'Orca Investment — יומן מסחר חכם ואוטומטי'
      : 'Orca Investment — Smart, Automated Trading Journal';
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute('content') ?? '';
    meta?.setAttribute('content', isRTL
      ? 'Orca Investment — יומן מסחר חכם שמרכז, מנתח ונותן סטטיסטיקות מדויקות לסוחר. חינם בתקופת ההשקה.'
      : 'Orca Investment — a smart trading journal that centralizes, analyzes and delivers precise statistics for traders. Free during launch.');
    return () => { document.title = prevTitle; meta?.setAttribute('content', prevDesc); };
  }, [isRTL]);

  const goApp = () => { navigate('/auth'); };
  // Arrow that respects reading direction (LTR shows →, RTL shows ←)
  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <>
      <style>{orcaCss}</style>
      <div className="orca-landing orca-bg-grid" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* ───── NAVBAR ───── */}
        <nav className={`orca-nav ${scrolled ? 'scrolled' : ''}`}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8" style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Logo */}
            <Link to="/welcome" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src={orcaLogo} alt="Orca Investment" style={{ height: 44, width: 'auto', display: 'block' }} />
            </Link>

            {/* Right — Language toggle + CTA.
                The toggle is intentionally a tiny icon-pill: browser language
                detection in `useLang` already chooses HE/EN automatically on
                first visit, so this only exists as a manual override. */}
            <div className="flex items-center" style={{ gap: 10, marginInlineStart: 'auto' }}>
              <button
                onClick={toggleLang}
                aria-label={t('החלף שפה לאנגלית', 'Switch language to Hebrew')}
                title={t('English', 'עברית')}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '4px 8px', borderRadius: 999,
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'var(--text-dim)',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em',
                  transition: 'color .15s, border-color .15s',
                  height: 26, minWidth: 42,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(34,211,238,0.4)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)'; }}
              >
                {isRTL ? 'EN' : 'עב'}
              </button>
              <button className="grad-btn" onClick={goApp} style={{ padding: '10px 18px', fontSize: 14 }}>
                {t('כניסה למערכת', 'Enter app')}
              </button>
            </div>

          </div>
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
                <SectionLabel>{t('ORCA INVESTMENT · יומן מסחר חכם', 'ORCA INVESTMENT · Smart Trading Journal')}</SectionLabel>

                <h1 style={{
                  fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em',
                  fontSize: 'clamp(2.4rem, 6vw, 4.8rem)',
                  margin: '18px 0 22px',
                }}>
                  {isRTL ? (
                    <>הדרך החכמה לנהל את <span className="grad-text">המסחר שלך</span></>
                  ) : (
                    <>The smart way to manage <span className="grad-text">your trading</span></>
                  )}
                </h1>

                <p style={{ fontSize: 'clamp(16px, 1.6vw, 19px)', lineHeight: 1.7, color: 'var(--text-muted)', maxWidth: 560, marginBottom: 24 }}>
                  {t(
                    'Orca Investment הוא יומן מסחר חכם ואוטומטי שמרכז עבורך את כל המידע על העסקאות שלך, מנתח אותן ונותן לך סטטיסטיקות מדויקות — כדי לקבל החלטות טובות יותר במסחר.',
                    'Orca Investment is a smart, automated trading journal that centralizes every trade you take, analyzes it and surfaces precise statistics — so you can make better decisions.'
                  )}
                </p>

                <div className="orca-pill-free" style={{ marginBottom: 28 }}>
                  <span>🎉</span>
                  <span>{t('חינם בתקופת ההשקה — כל המסלולים פתוחים', 'Free during launch — every plan unlocked')}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', marginBottom: 26 }}>
                  <button className="grad-btn" onClick={goApp} style={{ fontSize: 16, padding: '16px 26px' }}>
                    {t('התחל בחינם', 'Start free')}
                    <Arrow size={18} />
                  </button>
                  <Link to="/auth" style={{ color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>
                    {t('כבר רשום? כניסה ←', 'Already registered? Sign in →')}
                  </Link>
                </div>

              </motion.div>

              {/* Mockup */}
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
                style={{ position: 'relative', order: 2 }}
              >
                <ScreenshotFrame src={dashboardMain} alt="ORCA Dashboard" />

                {/* Zoom-in callout — magnified crop of the dashboard image */}
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.55, duration: 0.6, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    top: '-6%',
                    insetInlineEnd: '-6%',
                    width: 'min(320px, 62%)',
                    borderRadius: 18,
                    padding: 14,
                    background: 'linear-gradient(160deg, rgba(10,14,22,0.92), rgba(8,12,20,0.85))',
                    border: '1px solid rgba(34,211,238,0.35)',
                    boxShadow: '0 0 60px -10px rgba(34,211,238,0.45), 0 20px 50px -20px rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(12px)',
                    zIndex: 3,
                  }}
                >
                  <div style={{
                    width: '100%', aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.06)',
                    backgroundImage: `url(${dashboardMain})`,
                    backgroundSize: '320%',
                    backgroundPosition: '22% 38%',
                    backgroundRepeat: 'no-repeat',
                  }} />
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10,
                      background: 'linear-gradient(135deg,#22D3EE,#34D399)',
                      display: 'grid', placeItems: 'center', fontSize: 16,
                      boxShadow: '0 0 14px rgba(34,211,238,0.5)',
                    }}>🐋</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#34D399' }}>+$2,140</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                        {t('תובנת AI · שני סטאפים מובילים אחראיים ל-127% מהרווח', 'AI insight · Two top setups drive 127% of profit')}
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Small floating snapshot — Trader Mind preview */}
                <motion.div
                  initial={{ opacity: 0, y: 18, scale: 0.92 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.95, duration: 0.6, ease: 'easeOut' }}
                  style={{
                    position: 'absolute',
                    bottom: -22,
                    insetInlineStart: '8%',
                    width: 'min(220px, 42%)',
                    borderRadius: 14,
                    overflow: 'hidden',
                    border: '1px solid rgba(139,92,246,0.45)',
                    background: '#0A0D14',
                    boxShadow: '0 0 50px -10px rgba(139,92,246,0.55), 0 20px 50px -20px rgba(0,0,0,0.85)',
                    zIndex: 3,
                  }}
                >
                  <img
                    src={traderMindImg}
                    alt={t('תודעת הסוחר', 'Trader Mind')}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </motion.div>

              </motion.div>
            </div>
          </div>
        </section>


        {/* ───── 4. INTEGRATIONS ───── */}
        <section className="orca-section" style={{ paddingTop: 0, paddingBottom: 'clamp(40px, 6vw, 70px)' }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <SectionLabel>{t('מסתנכרן אוטומטית עם', 'Auto-syncs with')}</SectionLabel>
            </div>
            <div className="orca-int-row">
              <div className="item">Bybit</div>
              <div className="item">Binance</div>
              <div className="item">{t('ייבוא CSV אוניברסלי', 'Universal CSV Import')}</div>
            </div>
            <div className="mono" style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 11, marginTop: 12 }}>
              {t('API READ-ONLY · מאובטח צד-שרת', 'API READ-ONLY · Server-side secured')}
            </div>
          </div>
        </section>

        <div className="orca-divider" />

        {/* ───── 4b. EXECUTION FLOW (scrollytelling · Phase 1) ───── */}
        <ExecutionFlowStage isRTL={isRTL} t={t} />

        {/* ───── 4c. TRADER MIND HEATMAP (scrollytelling · Phase 2) ───── */}
        <TraderMindHeatmapStage isRTL={isRTL} t={t} />

        <div className="orca-divider" />




        {/* ───── 5. FEATURE TABS ───── */}
        <section id="features" className="orca-section">
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <SectionHeader
              label={t('הפלטפורמה', 'The platform')}
              title={isRTL
                ? <>מערכת אחת. <span className="grad-text">כל הכלים.</span></>
                : <>One system. <span className="grad-text">Every tool.</span></>}
              sub={t('כל מה שהופך אותך לסוחר טוב יותר — במקום אחד.', 'Everything that makes you a better trader — in one place.')}
            />
            <FeatureTabs t={t} />
          </div>
        </section>

        {/* ───── 5b. TRADE CARD EXPLODE (scrollytelling · Phase 3) ───── */}
        <TradeCardExplodeStage isRTL={isRTL} t={t} />

        {/* ───── 6. JOURNALING ───── */}

        <section id="journal" className="orca-section" style={{ background: 'var(--bg-2)' }}>
          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <SectionHeader
              label={t('יומן אוטומטי', 'Auto journal')}
              title={isRTL
                ? <>כל טרייד, <span className="grad-text">מתועד אוטומטית.</span></>
                : <>Every trade, <span className="grad-text">logged automatically.</span></>}
              sub={t(
                'חבר פעם אחת — והעסקאות זורמות פנימה, מתויגות ומוכנות לניתוח. לא עוד תיעוד ידני.',
                'Connect once — trades flow in, tagged and ready to analyze. No more manual logging.'
              )}
            />
            <div className="orca-grad-grid">
              <GradCard accent="#22D3EE" title={t('יומן בוקר וערב', 'Morning & evening journal')} desc={t('ניתוח לפני השוק + רפלקציה אחרי, עם הזרמה אוטומטית של עסקאות היום.', 'Pre-market analysis + post-market reflection, with automatic streaming of the day\'s trades.')} image={journalEntry} />
              <GradCard accent="#34D399" title={t('Calendar Hub', 'Calendar Hub')} desc={t('מרכז ה-P&L: לוח שנה אינטראקטיבי עם סיכומי שבוע וחודש.', 'The P&L hub: an interactive calendar with weekly and monthly summaries.')} image={calendarHub} />
              <GradCard accent="#8B5CF6" title={t('יומן Backtest', 'Backtest Journal')} desc={t('דימנשן נפרד לתיעוד אסטרטגיות, סטטיסטיקות והשוואה לחי.', 'A separate dimension for documenting strategies, stats and live comparison.')} image={backtestJournal} />
            </div>
          </div>
        </section>

        {/* ───── 7. VIDEO ───── */}
        <section className="orca-section">
          <div className="max-w-5xl mx-auto px-5 sm:px-8">
            <SectionHeader
              label="DEMO"
              title={isRTL
                ? <>ראה את <span className="grad-text">Orca בפעולה.</span></>
                : <>See <span className="grad-text">Orca in action.</span></>}
              sub={t('סיור קצר במערכת — מהזנת טרייד ועד תובנת AI.', 'A short tour of the system — from trade entry to AI insight.')}
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
              label={t('דוחות מבוססי-נתונים', 'Data-driven reports')}
              title={isRTL
                ? <>קבל תובנות <span className="grad-text">שלא ראית.</span></>
                : <>Get insights <span className="grad-text">you've never seen.</span></>}
              sub={t('עשרות מודולים כמותיים שחושפים את ה-Edge האמיתי שלך.', 'Dozens of quantitative modules that expose your real edge.')}
            />
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button className="grad-btn" onClick={goApp}>{t('התחל בחינם', 'Start free')} <Arrow size={16} /></button>
            </div>
            <div className="orca-grad-grid">
              <GradCard accent="#22D3EE" title={t('צלול עמוק לאסטרטגיה', 'Dive deep into strategy')} desc={t('Monte Carlo, Box Plot, Risk-Reward Frontier ועוד בלוח Quant Lab.', 'Monte Carlo, Box Plot, Risk-Reward Frontier and more in the Quant Lab.')} num="01" image={quantLab} />
              <GradCard accent="#8B5CF6" title={t('הבן את ההתנהגות שלך', 'Understand your behavior')} desc={t('ניתוח רב-ממדי של 145+ עסקאות וזיהוי דפוסים פסיכולוגיים.', 'Multi-dimensional analysis of 145+ trades and detection of psychological patterns.')} num="02" image={behaviorAnalysis} />
              <GradCard accent="#34D399" title={t('מה עובד בשבילך', 'What works for you')} desc={t('חוזקות, שעות זהב, נכסים מנצחים — והיכן ה-Edge האמיתי שלך.', 'Strengths, golden hours, winning assets — and where your real edge lives.')} num="03" image={whatWorks} />
            </div>
          </div>
        </section>

        {/* ───── 8.5 · Scrollytelling Phase 4 — Edge Geometry ───── */}
        <RiskGeometryStage isRTL={isRTL} t={t} />

        {/* ───── 9. EDGE / RISK ───── */}
        <section className="orca-section">

          <div className="max-w-7xl mx-auto px-5 sm:px-8">
            <SectionHeader
              label="EDGE & RISK"
              title={isRTL
                ? <>האם יש לך <span className="grad-text">Edge רווחי?</span></>
                : <>Do you have a <span className="grad-text">profitable edge?</span></>}
              sub={t('מדדי ORCA וניהול סיכונים שומרים אותך משמעתי ורווחי לאורך זמן.', 'ORCA metrics and risk management keep you disciplined and profitable over time.')}
            />
            <div className="orca-two-up">
              <div className="orca-big-card" style={{ background: 'linear-gradient(160deg, rgba(34,211,238,0.10), rgba(7,9,15,0))' }}>
                <SectionLabel>{t('מדדי ORCA', 'ORCA Metrics')}</SectionLabel>
                <h3 style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2rem)', fontWeight: 800, margin: '10px 0 12px' }}>{t('ORCA Score — 0 עד 100', 'ORCA Score — 0 to 100')}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 18 }}>
                  {t(
                    'ציון משולב של משמעת, עקביות סיכון והתאמת משטר. הכי קרוב שיש לתעודת זהות לסוחר.',
                    'A composite score of discipline, risk consistency and regime adaptation. The closest thing to a trader ID card.'
                  )}
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
                <SectionLabel color="#F59E0B">{t('מנוע סיכונים', 'Risk engine')}</SectionLabel>
                <h3 style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2rem)', fontWeight: 800, margin: '10px 0 12px' }}>{t('הגנה 4-שכבתית', '4-tier protection')}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 15, lineHeight: 1.7, marginBottom: 18 }}>
                  {t(
                    'מגבלות -1R לעסקה, -2R יומי, -5R שבועי, -10R חודשי. מד סיכון חי, התראות Risk Drift ומצב צינון.',
                    '-1R per trade, -2R daily, -5R weekly, -10R monthly. Live risk meter, Risk Drift alerts and a cool-off mode.'
                  )}
                </p>
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    { k: '-1R', v: t('עסקה', 'Trade'), c: '#22D3EE' },
                    { k: '-2R', v: t('יומי', 'Daily'),  c: '#34D399' },
                    { k: '-5R', v: t('שבועי', 'Weekly'), c: '#F59E0B' },
                    { k: '-10R', v: t('חודשי', 'Monthly'), c: '#EF4444' },
                  ].map(l => (
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
              title={isRTL
                ? <>תודעת הסוחר — <span className="grad-text">המנוע שמכיר אותך.</span></>
                : <>Trader Mind — <span className="grad-text">the engine that knows you.</span></>}
              sub={t(
                'מבחן התנהגותי קצר שמראה לך את הפער בין איך שנדמה לך שאתה סוחר לבין איך שאתה באמת פועל — ונותן לך 3 דברים לעשות מחר בבוקר.',
                'A short behavioral test that surfaces the gap between how you think you trade and how you actually trade — and hands you 3 concrete things to do tomorrow morning.'
              )}
              labelColor="#8B5CF6"
            />

            {/* Result-screen rotator — device frame fading between real outputs */}
            <TraderMindRotator slides={[
              { src: tomorrowMorning, caption: t('מחר בבוקר · 3 צעדים פרקטיים', 'Tomorrow morning · 3 practical steps') },
              { src: saidVsReal,      caption: t('אמרת · בפועל — המראה ההתנהגותית', 'Said · Actually — the behavioral mirror') },
              { src: traderMindImg,   caption: t('פרופיל הסוחר שלך', 'Your trader profile') },
            ]} />

            {/* How it works — 3 calm steps */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18,
              maxWidth: 880, margin: '44px auto 0',
            }} className="orca-mind-steps">
              {[
                { n: '01', t: t('עונה', 'Answer'),         d: t('מענה קצר על 12 שאלות התנהגותיות — 3 דקות.', 'A short answer to 12 behavioral questions — 3 minutes.') },
                { n: '02', t: t('המנוע מצליב', 'The engine cross-checks'), d: t('מצליב בין מה שאמרת לקצב, ההיסוסים והעסקאות שלך בפועל.', 'Cross-checks what you said against your real cadence, hesitations and trades.') },
                { n: '03', t: t('3 צעדים', '3 steps'),     d: t('מקבל פרופיל אישי + 3 פעולות קונקרטיות למחר בבוקר.', 'Get a personal profile + 3 concrete actions for tomorrow morning.') },
              ].map(s => (
                <div key={s.n} style={{
                  padding: '20px 18px', borderRadius: 16, border: '1px solid var(--border)',
                  background: 'linear-gradient(180deg, rgba(139,92,246,0.06), rgba(255,255,255,0.01))',
                }}>
                  <div className="mono" style={{ fontSize: 11, color: '#8B5CF6', letterSpacing: '0.18em' }}>STEP {s.n}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, margin: '8px 0 6px', color: 'var(--text)' }}>{s.t}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-muted)' }}>{s.d}</div>
                </div>
              ))}
            </div>
            <style>{`@media (max-width: 720px){ .orca-mind-steps{ grid-template-columns: 1fr !important; } }`}</style>

            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <button className="grad-btn" onClick={goApp}>{t('גלה את פרופיל הסוחר שלך', 'Discover your trader profile')} <Arrow size={16} /></button>
            </div>
          </div>
        </section>

        {/* ───── 11. COMMUNITY ───── */}
        <section id="community" className="orca-section">
          <div className="max-w-5xl mx-auto px-5 sm:px-8" style={{ textAlign: 'center' }}>
            <SectionHeader
              label={t('קהילה', 'Community')}
              title={isRTL
                ? <>אלפי סוחרים <span className="grad-text">בקהילת Orca.</span></>
                : <>Thousands of traders <span className="grad-text">in the Orca community.</span></>}
              sub={t('הצטרף לקהילת סוחרים פעילה — שתף, למד והשתפר ביחד.', 'Join an active trader community — share, learn and improve together.')}
            />
            <div className="orca-constellation">
              <div className="orca-orbit"><div className="orca-orbit-dot" /></div>
              <div className="orca-orbit mid"><div className="orca-orbit-dot" /></div>
              <div className="orca-orbit inner"><div className="orca-orbit-dot" /></div>
              {[
                { x: 8,  y: 18, n: 'AR' }, { x: 86, y: 14, n: 'DM' },
                { x: 4,  y: 72, n: 'YS' }, { x: 90, y: 78, n: 'NL' },
                { x: 50, y: 2,  n: 'OK' }, { x: 50, y: 94, n: 'TH' },
              ].map((a, i) => (
                <div key={i} className="orca-avatar" style={{ insetInlineStart: `${a.x}%`, top: `${a.y}%`, animationDelay: `${i * 0.4}s` }}>{a.n}</div>
              ))}
            </div>
            <div style={{ marginTop: 36 }}>
              <button className="grad-btn" onClick={() => window.open('https://discord.gg', '_blank')}>{t('הצטרף לקהילה', 'Join the community')} <Arrow size={16} /></button>
            </div>
          </div>
        </section>

        {/* Pricing section intentionally removed — all plans free during launch. */}


        {/* ───── 13. FINAL CTA ───── */}
        <section className="orca-section orca-final">
          <div className="max-w-4xl mx-auto px-5 sm:px-8">
            <h2 className="orca-section-title">
              {isRTL
                ? <>התחל לנהל את המסחר שלך — <span className="grad-text">בחינם.</span></>
                : <>Start managing your trading — <span className="grad-text">for free.</span></>}
            </h2>
            <div style={{ marginTop: 28 }}>
              <button className="grad-btn" onClick={goApp} style={{ fontSize: 17, padding: '18px 32px' }}>
                {t('כניסה למערכת', 'Enter app')} <Arrow size={18} />
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
                  <img src={orcaLogo} alt="Orca Investment" style={{ height: 44, width: 'auto', display: 'block' }} />
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, maxWidth: 320 }}>
                  {t(
                    'יומן מסחר חכם ואוטומטי. כל טרייד, כל סטטיסטיקה, החלטה אחת טובה יותר.',
                    'A smart, automated trading journal. Every trade, every stat, one better decision.'
                  )}
                </p>
              </div>
              <div className="orca-footer-col">
                <h4>{t('מוצר', 'Product')}</h4>
                <a href="#features">{t('פיצ׳רים', 'Features')}</a>
                <a href="#journal">{t('היומן', 'The journal')}</a>

              </div>
              <div className="orca-footer-col">
                <h4>{t('קהילה', 'Community')}</h4>
                <a href="#community">Discord</a>
                <a href="#">Telegram</a>
                <a href="#">YouTube</a>
              </div>
              <div className="orca-footer-col">
                <h4>{t('משפטי', 'Legal')}</h4>
                <Link to="/terms">{t('תנאי שימוש', 'Terms of service')}</Link>
                <Link to="/privacy">{t('פרטיות', 'Privacy')}</Link>
                <Link to="/accessibility">{t('נגישות', 'Accessibility')}</Link>
              </div>
            </div>

            <div className="orca-legal">
              ⚠️ <strong style={{ color: 'var(--text)' }}>Orca Investment</strong>{' '}
              {t(
                'אינה מערכת איתותים ואינה מספקת המלצות השקעה. הנתונים מבוססים על פעילות המסחר האישית של המשתמש ונועדו ללמידה, שיפור תהליך ופיתוח משמעת. מסחר בשווקים פיננסיים כרוך בסיכון; כל משתמש פועל לפי שיקול דעתו.',
                'is not a signals service and does not provide investment advice. The data is based on the user\'s own trading activity and is intended for learning, process improvement and discipline. Trading financial markets involves risk; every user acts at their own discretion.'
              )}
            </div>

            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>© 2026 ORCA INVESTMENT. ALL RIGHTS RESERVED.</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>BUILT WITH 🐋 IN TEL AVIV</div>
            </div>
          </div>
        </footer>

        {/* Command bar signature */}

        <div className="orca-cmd-bar hidden sm:block">
          {t('לחץ', 'PRESS')} <kbd>⌘K</kbd> {t('לפקודות', 'FOR COMMAND')} · <kbd>?</kbd> {t('עזרה', 'HELP')}
        </div>
      </div>
    </>
  );
};

export default Landing;
