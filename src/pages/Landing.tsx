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
