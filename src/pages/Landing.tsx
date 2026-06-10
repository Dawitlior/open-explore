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
.orca-price-card .badge-pop { position: absolute; top: -12px; inset-inline-start: 50%; transform: translateX(50%); background: linear-gradient(90deg, #8B5CF6, #22D3EE); color: white; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 999px; letter-spacing: 0.08em; }
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

const ScreenshotFrame: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="orca-frame">
    <div className="orca-frame-inner">
      {children ?? (
        <div className="orca-frame-skeleton" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)' }}>ORCA · DASHBOARD</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px #34D399' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FBBF24' }} />
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {['86','+$115','28%','294%'].map((v,i)=>(
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                <div className="mono" style={{ fontSize: 8, color: 'var(--text-dim)' }}>KPI {i+1}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: ['#22D3EE','#34D399','#F59E0B','#8B5CF6'][i], textShadow: `0 0 14px ${['#22D3EE','#34D399','#F59E0B','#8B5CF6'][i]}66` }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, position: 'relative', marginTop: 6, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
            <svg viewBox="0 0 400 140" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="eqg" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,110 C40,100 70,95 100,90 S160,70 200,75 260,55 300,40 360,30 400,20 L400,140 L0,140 Z" fill="url(#eqg)" />
              <path d="M0,110 C40,100 70,95 100,90 S160,70 200,75 260,55 300,40 360,30 400,20" stroke="#22D3EE" strokeWidth="2" fill="none" style={{ filter: 'drop-shadow(0 0 6px #22D3EE)' }} />
            </svg>
          </div>
        </div>
      )}
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

/* Gradient card with screenshot */
const GradCard: React.FC<{ accent: string; title: string; desc: string; num?: string }> = ({ accent, title, desc, num }) => (
  <motion.div className="orca-grad-card"
    whileHover={{ borderColor: `${accent}66` }}
    style={{ boxShadow: `0 0 0 1px transparent, 0 20px 60px -20px ${accent}33` }}
  >
    <div className="accent-line" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    {num && <div className="num-badge">{num}</div>}
    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}22`, border: `1px solid ${accent}44`, display: 'grid', placeItems: 'center', marginBottom: 16, color: accent, fontSize: 20 }}>◆</div>
    <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>{title}</h3>
    <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, margin: '0 0 18px' }}>{desc}</p>
    <ScreenshotFrame />
  </motion.div>
);

/* Feature Tabs */
const TABS: { key: string; label: string; icon: string; title: string; desc: string; bullets: string[] }[] = [
  { key: 'journal', label: 'יומן אוטומטי', icon: '📓', title: 'יומן מסחר אוטומטי', desc: 'חבר את הברוקר פעם אחת, ועסקאות נכנסות אוטומטית — מתויגות ומוכנות לניתוח.', bullets: ['סנכרון מ-Bybit / Binance', 'יומן בוקר וערב', 'צילומי גרפים', 'ארכיון מלא לחיפוש'] },
  { key: 'analytics', label: 'אנליטיקה', icon: '📊', title: 'לוח אנליטיקה מתקדם', desc: 'עשרות מטריקות כמותיות שחושפות את ה-Edge האמיתי שלך.', bullets: ['Equity Curve מתקדמת', 'Profit Factor & R-Multiples', 'ניתוח לפי נכס / שעה / יום', 'סיכומים שבועי, חודשי, שנתי'] },
  { key: 'risk', label: 'ניהול סיכונים', icon: '🛡️', title: 'מנוע סיכונים 4-שכבתי', desc: 'הגנה אוטומטית מפני over-trading עם מנגנון משמעת חכם.', bullets: ['מגבלות -1R / -2R / -5R / -10R', 'חישוב גודל פוזיציה אוטומטי', 'התראות Risk Drift', 'מצב צינון (Cool-Off)'] },
  { key: 'ai', label: 'תובנות AI', icon: '🧠', title: 'מנוע תובנות עמוק', desc: 'מזהה דפוסים סמויים שאף סוחר לא היה רואה לבד.', bullets: ['זיהוי דפוסים נסתרים', 'חוזקות וחולשות אישיות', 'Orca Coach מבוסס נתונים', 'גרפים ברמת Awwwards'] },
  { key: 'mind', label: 'תודעת הסוחר', icon: '🐋', title: 'אבחון תודעת הסוחר', desc: 'פרופיל Archetype אישי שמכייל את ה-AI Coach לפי הסוחר שאתה.', bullets: ['אבחון אישיות סוחר', 'פרופיל Archetype', 'כיול AI Coach', 'כיול-מחדש כל 45 יום'] },
  { key: 'radar', label: 'מכ״ם כלכלי', icon: '📡', title: 'מכ״ם אירועים כלכליים', desc: 'רדאר אירועים גלובלי עם חישוב Surprise בזמן אמת.', bullets: ['רדאר אירועים עולמי', 'Tier 1 / 2 / 3', 'עדכוני T-5 / T-1 / Live', 'חישוב Surprise אוטומטי'] },
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
        <ScreenshotFrame />
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

  const goApp = () => { if (user) navigate('/'); else window.location.href = APP_URL; };

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
                <ScreenshotFrame />

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

        {/* Command bar signature */}
        <div className="orca-cmd-bar hidden sm:block">
          PRESS <kbd>⌘K</kbd> FOR COMMAND · <kbd>?</kbd> HELP
        </div>
      </div>
    </>
  );
};

export default Landing;
