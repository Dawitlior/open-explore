/**
 * Landing — Orca Investment public marketing page.
 * Midnight (#061326) + Gold (#c9a84c) premium aesthetic. RTL Hebrew-first.
 * Structure mirrors top-tier competitors: Hero → Stats → Brokers ticker →
 * Feature showcase → Interactive Demo → Brokers grid → Tools → Pricing →
 * Testimonials → FAQ → Footer.
 */
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Shield, Brain, Radar, Lock, Check, Zap, Crown, Star,
  RefreshCw, Smartphone, BarChart3, LineChart as LineIcon, Settings2,
  HeartPulse, Menu, X, Mail, MessageCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { LandingDemo } from '@/components/landing/LandingDemo';
import orcaLogoAsset from '@/assets/orca-logo.png.asset.json';

/* ── Palette ──────────────────────────────────────────────── */
const BG = '#061326';
const BG_2 = '#0a1f3d';
const BG_3 = '#0f2a4d';
const GOLD = '#c9a84c';
const GOLD_2 = '#e8b84a';
const GOLD_SOFT = '#f0d78c';
const LINE = 'rgba(201,168,76,0.18)';
const TXT = '#f5f3ee';
const TXT_2 = '#9aa8bc';
const TXT_3 = '#6b7990';

const FONT_DISPLAY = "'Heebo', 'Space Grotesk', sans-serif";
const FONT_BODY = "'Heebo', 'DM Sans', sans-serif";

export default function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate('/', { replace: true });
  }, [loading, session, navigate]);

  useEffect(() => {
    const prevDir = document.documentElement.dir;
    const prevLang = document.documentElement.lang;
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = 'he';
    return () => {
      document.documentElement.dir = prevDir;
      document.documentElement.lang = prevLang;
    };
  }, []);

  return (
    <div
      data-public-landing="true"
      dir="rtl"
      className="min-h-screen antialiased"
      style={{
        color: TXT,
        background: `
          radial-gradient(ellipse 90% 60% at 50% -10%, rgba(201,168,76,0.16), transparent 60%),
          radial-gradient(ellipse 60% 40% at 0% 20%, rgba(201,168,76,0.06), transparent 60%),
          linear-gradient(180deg, ${BG} 0%, #04101f 100%)
        `,
        fontFamily: FONT_BODY,
        // hard-stop any rogue horizontal scroll on mobile (floating chips, gradients)
        overflowX: 'clip',
        overflowY: 'visible',
        maxWidth: '100vw',
      }}
    >
      {/* Public page must use document scroll, not the locked app-shell scroll model. */}
      <style>{`
        html, body, #root {
          height: auto !important;
          min-height: 100% !important;
          max-height: none !important;
          overflow-y: auto !important;
          overflow-x: clip !important;
          max-width: 100vw;
          overscroll-behavior-x: none;
        }
        body { position: static !important; }
        @media (max-width: 767px) {
          body { -webkit-text-size-adjust: 100%; }
        }
      `}</style>
      <Nav />
      <FreeAccessBanner />
      <Hero />
      <Stats />
      <BrokerTicker />
      <FeatureShowcase />
      <TryItDemo />
      <BrokersGrid />
      <Tools />
      <Pricing />
      <Testimonials />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ──────────────── FREE ACCESS BANNER ──────────────── */
function FreeAccessBanner() {
  return (
    <div
      style={{
        position: 'relative',
        zIndex: 40,
        background: `linear-gradient(90deg, rgba(16,185,129,0.18), rgba(201,168,76,0.18))`,
        borderBottom: `1px solid ${LINE}`,
        padding: '10px 16px',
        textAlign: 'center',
        fontFamily: FONT_DISPLAY,
        fontSize: 12.5,
        color: TXT,
        lineHeight: 1.45,
        letterSpacing: '0.01em',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span
          style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: '#10b981', boxShadow: '0 0 10px #10b981',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        <strong style={{ color: GOLD_SOFT, fontWeight: 800 }}>חינמי לתקופה מוגבלת</strong>
        <span style={{ color: TXT_2 }}>· ההתחברות והשימוש בפלטפורמה ללא עלות בתקופה הקרובה</span>
      </span>
    </div>
  );
}


/* ──────────────── BRAND ──────────────── */
function Logo({ size = 36 }: { size?: number }) {
  return (
    <Link to="/welcome" className="flex items-center gap-3 group">
      <img
        src={orcaLogoAsset.url}
        alt="Orca Investment"
        width={size}
        height={size}
        className="object-contain drop-shadow-[0_0_12px_rgba(201,168,76,0.35)] group-hover:drop-shadow-[0_0_18px_rgba(201,168,76,0.6)] transition-all"
        style={{ width: size, height: size }}
      />
      <div className="flex flex-col leading-none">
        <span
          className="font-bold tracking-[0.18em] text-base"
          style={{ fontFamily: FONT_DISPLAY, color: TXT, letterSpacing: '0.18em' }}
        >
          ORCA
        </span>
        <span
          className="text-[9px] tracking-[0.32em] mt-0.5"
          style={{ color: GOLD, fontFamily: FONT_DISPLAY }}
        >
          INVESTMENT
        </span>
      </div>
    </Link>
  );
}

/* ──────────────── NAV ──────────────── */
function Nav() {
  const [open, setOpen] = useState(false);
  const link = "text-sm transition hover:text-[color:var(--gold)]";
  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl border-b"
      style={{ background: 'rgba(6,19,38,0.78)', borderColor: LINE, ['--gold' as any]: GOLD }}
    >
      <div className="max-w-7xl mx-auto px-5 lg:px-8 h-16 flex items-center justify-between">
        <Logo />
        <nav className="hidden lg:flex items-center gap-7 text-[color:var(--txt2)]" style={{ ['--txt2' as any]: TXT_2 }}>
          <a href="#features" className={link} style={{ color: TXT_2 }}>פיצ'רים</a>
          <a href="#brokers" className={link} style={{ color: TXT_2 }}>פלטפורמות וברוקרים</a>
          <a href="#pricing" className={link} style={{ color: TXT_2 }}>מחירים</a>
          <a href="#faq" className={link} style={{ color: TXT_2 }}>שאלות ותשובות</a>
          <a href="#contact" className={link} style={{ color: TXT_2 }}>צור קשר</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden sm:inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-[1.03]"
            style={{
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_2} 100%)`,
              color: BG,
              fontFamily: FONT_DISPLAY,
              boxShadow: '0 10px 30px rgba(201,168,76,0.35)',
            }}
          >
            כניסה למערכת
          </Link>
          <button
            className="lg:hidden p-2 rounded-lg border"
            style={{ borderColor: LINE, color: TXT }}
            onClick={() => setOpen(v => !v)}
            aria-label="menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden border-t" style={{ borderColor: LINE, background: BG }}>
          <div className="px-5 py-4 flex flex-col gap-3 text-sm">
            {[['פיצ\'רים', '#features'], ['פלטפורמות', '#brokers'], ['מחירים', '#pricing'], ['שאלות', '#faq'], ['צור קשר', '#contact']].map(([l, h]) => (
              <a key={h} href={h} onClick={() => setOpen(false)} className="py-2" style={{ color: TXT_2 }}>{l}</a>
            ))}
            <Link to="/auth" className="mt-2 text-center py-3 rounded-full font-semibold" style={{ background: GOLD, color: BG, fontFamily: FONT_DISPLAY }}>
              כניסה למערכת
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ──────────────── HERO ──────────────── */
function Hero() {
  return (
    <section className="relative max-w-7xl mx-auto px-5 lg:px-8 pt-12 lg:pt-20 pb-16">
      <div className="grid lg:grid-cols-[1fr_1.05fr] gap-10 lg:gap-14 items-center">
        {/* RTL primary — pitch (right side) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-right order-2 lg:order-1"
        >
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] mb-6"
            style={{
              background: 'rgba(201,168,76,0.08)',
              border: `1px solid ${LINE}`,
              color: GOLD_SOFT,
              fontFamily: FONT_DISPLAY,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: GOLD }} />
            יומן המסחר המקצועי של ישראל
          </div>
          <h1
            className="text-4xl md:text-5xl lg:text-[58px] font-extrabold leading-[1.08] tracking-tight mb-6"
            style={{ fontFamily: FONT_DISPLAY, color: TXT }}
          >
            הדרך החכמה לנהל את{' '}
            <span
              style={{
                background: `linear-gradient(135deg, ${GOLD_SOFT} 0%, ${GOLD} 50%, ${GOLD_2} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              המסחר שלך
            </span>
          </h1>
          <p className="text-base md:text-lg leading-relaxed mb-8 max-w-xl mr-0 ml-auto" style={{ color: TXT_2 }}>
            Orca Investment הוא יומן מסחר חכם ואוטומטי שמרכז עבורך את כל המידע על העסקאות שלך, מנתח אותן ונותן לך
            סטטיסטיקות מדויקות כדי לקבל החלטות טובות יותר במסחר.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <Link
              to="/auth"
              className="group inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-bold text-sm transition-all hover:scale-[1.03]"
              style={{
                background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_2} 100%)`,
                color: BG,
                fontFamily: FONT_DISPLAY,
                boxShadow: '0 18px 40px rgba(201,168,76,0.4)',
              }}
            >
              התחילו תקופת ניסיון בחינם!
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full font-semibold text-sm transition-all"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${LINE}`,
                color: TXT,
                fontFamily: FONT_DISPLAY,
              }}
            >
              נסה את המערכת ←
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs" style={{ color: TXT_3 }}>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" style={{ color: GOLD }} /> ללא כרטיס אשראי</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" style={{ color: GOLD }} /> ביטול בכל רגע</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" style={{ color: GOLD }} /> RTL מלא בעברית</span>
          </div>
        </motion.div>

        {/* Hero visual — dashboard mock framed */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative order-1 lg:order-2"
        >
          <div
            className="absolute -inset-8 blur-3xl rounded-full pointer-events-none opacity-70"
            style={{ background: `radial-gradient(circle, ${GOLD}33, transparent 60%)` }}
          />
          <HeroMock />

          {/* Floating chips */}
          <div
            className="absolute -top-4 right-4 lg:right-8 px-4 py-2.5 rounded-2xl backdrop-blur-md flex items-center gap-2.5 shadow-2xl"
            style={{ background: 'rgba(6,19,38,0.85)', border: `1px solid ${LINE}` }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#10b981' }} />
            <div className="text-right">
              <div className="text-[9px] tracking-wider" style={{ color: TXT_3, fontFamily: FONT_DISPLAY }}>רווח יומי</div>
              <div className="text-sm font-bold" style={{ color: '#10b981', fontFamily: FONT_DISPLAY }}>+$1,520</div>
            </div>
          </div>
          <div
            className="absolute -bottom-4 left-4 lg:left-8 px-4 py-2.5 rounded-2xl backdrop-blur-md flex items-center gap-2.5 shadow-2xl"
            style={{ background: 'rgba(6,19,38,0.85)', border: `1px solid ${LINE}` }}
          >
            <BarChart3 className="w-4 h-4" style={{ color: GOLD }} />
            <div className="text-right">
              <div className="text-[9px] tracking-wider" style={{ color: TXT_3, fontFamily: FONT_DISPLAY }}>סה"כ עסקאות</div>
              <div className="text-sm font-bold" style={{ color: TXT, fontFamily: FONT_DISPLAY }}>12</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function HeroMock() {
  // Stylized static dashboard preview matching the app's aesthetic
  return (
    <div
      className="relative rounded-3xl overflow-hidden p-3 lg:p-4"
      style={{
        background: `linear-gradient(135deg, ${BG_2} 0%, ${BG} 100%)`,
        border: `1px solid ${LINE}`,
        boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(201,168,76,0.05)',
      }}
    >
      <div className="rounded-2xl overflow-hidden" style={{ background: BG, border: `1px solid ${LINE}` }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: LINE }}>
          <div className="flex items-center gap-2">
            <img src={orcaLogoAsset.url} alt="" className="w-5 h-5" />
            <span className="text-xs font-bold tracking-wider" style={{ color: TXT, fontFamily: FONT_DISPLAY }}>ORCA</span>
          </div>
          <div className="flex gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: '#ef4444' }} />
            <span className="w-2 h-2 rounded-full" style={{ background: GOLD }} />
            <span className="w-2 h-2 rounded-full" style={{ background: '#10b981' }} />
          </div>
        </div>
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-2 p-3">
          {[
            { l: 'ימים רווחיים', v: '85.71%', c: '#10b981' },
            { l: 'אחוז הצלחה', v: '56.82%', c: GOLD },
            { l: 'יחס ר/ה ממוצע', v: '1.81', c: TXT },
            { l: 'P&L', v: '+$5,002', c: '#10b981' },
          ].map(k => (
            <div key={k.l} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${LINE}` }}>
              <div className="text-[8px] mb-1" style={{ color: TXT_3 }}>{k.l}</div>
              <div className="text-xs font-bold" style={{ color: k.c, fontFamily: FONT_DISPLAY }}>{k.v}</div>
            </div>
          ))}
        </div>
        {/* Chart row */}
        <div className="grid grid-cols-3 gap-2 px-3 pb-3">
          <div className="rounded-xl p-2.5 h-32" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${LINE}` }}>
            <div className="text-[8px] mb-1" style={{ color: TXT_3 }}>Radar</div>
            <svg viewBox="0 0 100 70" className="w-full h-full">
              <polygon points="50,8 85,28 78,60 22,60 15,28" fill="none" stroke={LINE} />
              <polygon points="50,18 78,32 73,55 27,55 22,32" fill={`${GOLD}33`} stroke={GOLD} strokeWidth="1.2" />
            </svg>
          </div>
          <div className="rounded-xl p-2.5 h-32" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${LINE}` }}>
            <div className="text-[8px] mb-1" style={{ color: TXT_3 }}>P&L יומי</div>
            <svg viewBox="0 0 120 60" className="w-full h-full">
              {[12, 28, 18, 42, 8, 35, 22, 48, 30, 38].map((h, i) => (
                <rect key={i} x={i * 12 + 2} y={55 - h} width="9" height={h} fill={h > 25 ? '#10b981' : i === 4 ? '#ef4444' : GOLD} opacity={0.85} rx="1.5" />
              ))}
            </svg>
          </div>
          <div className="rounded-xl p-2.5 h-32" style={{ background: 'rgba(255,255,255,0.025)', border: `1px solid ${LINE}` }}>
            <div className="text-[8px] mb-1" style={{ color: TXT_3 }}>Equity Curve</div>
            <svg viewBox="0 0 120 60" className="w-full h-full">
              <defs>
                <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity="0.5" />
                  <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,50 L15,42 L30,46 L45,32 L60,28 L75,18 L90,22 L105,10 L120,8 L120,60 L0,60 Z" fill="url(#hg)" />
              <path d="M0,50 L15,42 L30,46 L45,32 L60,28 L75,18 L90,22 L105,10 L120,8" fill="none" stroke={GOLD} strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────── STATS STRIP ──────────────── */
function Stats() {
  const stats = [
    { v: '2,000+', l: 'חשבונות מסחר' },
    { v: '100+', l: 'ברוקרים נתמכים' },
    { v: '50k+', l: 'עסקאות מתועדות' },
    { v: '99.9%', l: 'זמינות מערכת' },
  ];
  return (
    <section className="py-12 border-y" style={{ borderColor: LINE, background: 'rgba(10,31,61,0.4)' }}>
      <div className="max-w-7xl mx-auto px-5 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {stats.map((s, i) => (
          <motion.div
            key={s.l}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06 }}
          >
            <div
              className="text-3xl md:text-4xl font-extrabold mb-1"
              style={{
                fontFamily: FONT_DISPLAY,
                background: `linear-gradient(135deg, ${GOLD_SOFT}, ${GOLD})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {s.v}
            </div>
            <div className="text-xs tracking-wider" style={{ color: TXT_2, fontFamily: FONT_DISPLAY }}>{s.l}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────── BROKER TICKER ──────────────── */
function BrokerTicker() {
  const brokers = [
    'MetaTrader 5', 'MetaTrader 4', 'TradingView', 'NinjaTrader', 'Tradovate',
    'Bybit', 'Binance', 'TopstepX', 'Rithmic', 'Sierra Chart',
    'Interactive Brokers', 'DXTrade', 'Tradezella', 'ColmexPro', 'TradeLocker',
  ];
  const row = [...brokers, ...brokers];
  return (
    <section className="py-8 overflow-hidden" style={{ background: 'rgba(6,19,38,0.6)' }}>
      <div className="text-center text-[10px] tracking-[0.3em] mb-5" style={{ color: TXT_3, fontFamily: FONT_DISPLAY }}>
        משתלב עם הפלטפורמות המובילות בעולם
      </div>
      <div className="relative">
        <div
          className="flex gap-10 animate-[ticker_45s_linear_infinite] whitespace-nowrap"
          style={{ width: 'max-content' }}
        >
          {row.map((b, i) => (
            <span
              key={i}
              className="text-base font-semibold tracking-wide opacity-50 hover:opacity-100 transition-opacity"
              style={{ color: TXT_2, fontFamily: FONT_DISPLAY }}
            >
              {b}
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </section>
  );
}

/* ──────────────── FEATURE SHOWCASE (tabs) ──────────────── */
function FeatureShowcase() {
  const tabs = [
    { id: 'dashboard',  label: 'דשבורד',         title: 'מבט שוטף — בריאות מערכת בזמן אמת',     body: 'דשבורד עם 4 ציוני ליבה (משמעת, עקביות סיכון, התאמת משטר, ציון ORCA), עקומת הון, התפלגות רווח/הפסד, פירוט מטבעות ורדאר ביצועים — הכל בעמוד אחד.' },
    { id: 'calendar',   label: 'לוח שנה',        title: 'לוח שנה אינטראקטיבי + מכ"ם כלכלי',    body: 'לוח שנה חודשי עם סימון יומי של אירועים כלכליים מרכזיים (CPI, FOMC, NFP) — מסונכרן ישירות מהיומן הכלכלי. תזכורת לפני שאתה פותח פוזיציה ביום חדשות.' },
    { id: 'risk',       label: 'ניהול סיכונים',  title: 'מנוע סיכון 4 שכבות',                   body: '-1R לעסקה, -2R ליום, -5R לשבוע, -10R לחודש. ברי התקדמות חיים, מד סיכון 100%, ועצירה אוטומטית לפני שאתה שובר את עצמך.' },
    { id: 'psychology', label: 'פסיכולוגיה',     title: 'אינדקס בריאות התנהגותית',              body: 'מטריצת ביצוע 6-צירים, ציוני עקביות / משמעת / רגשי, מפת חום שבועית וזיהוי רצפי הפסדים. דע בדיוק מתי אתה ב-Tilt.' },
    { id: 'ai',         label: 'תובנות AI',      title: 'מנוע AI שמגלה את ה-Alpha שלך',         body: 'ניתוח רב-שכבתי של כל הטריידים — מזהה דפוסים סמויים: באילו סשנים אתה רווחי, אילו סטאפים דולפים, ומה מקור היתרון האמיתי שלך.' },
    { id: 'review',     label: 'סקירות',         title: 'סקירה שבועית · חודשית · שנתית',        body: 'דיבריף אוטומטי בכל סוף שבוע + סיכומים חודשיים ושנתיים. R:R, Win Rate, Net R, Prep Checklist, ו-AI Synthesis שמסכם לך מה לעשות אחרת.' },
    { id: 'oracle',     label: 'Oracle Bot',     title: 'בוט Oracle — אבחון אישיות סוחר',       body: '30+ שאלות לאורך 7 שכבות התנהגותיות (S1-S7) ו-37 צמתים. מנתח את האישיות שלך, מאתר איפה אתה חזק ואיפה אתה מדמם — ומציע מסלול שיפור אישי.' },
  ];
  const [active, setActive] = useState(0);
  const cur = tabs[active];

  return (
    <section id="features" className="max-w-7xl mx-auto px-5 lg:px-8 py-20 lg:py-28">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight" style={{ fontFamily: FONT_DISPLAY, color: TXT }}>
          מה מחכה לכם במערכת שלנו?
        </h2>
        <div className="mx-auto mt-4 w-24 h-[3px] rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-10 justify-start lg:justify-center scrollbar-thin" style={{ scrollbarWidth: 'thin' }}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            onClick={() => setActive(i)}
            className="flex-shrink-0 px-4 py-2.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
            style={{
              background: active === i
                ? `linear-gradient(135deg, ${GOLD}, ${GOLD_2})`
                : 'rgba(255,255,255,0.04)',
              color: active === i ? BG : TXT_2,
              border: `1px solid ${active === i ? GOLD : LINE}`,
              fontFamily: FONT_DISPLAY,
              boxShadow: active === i ? '0 10px 25px rgba(201,168,76,0.3)' : 'none',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active panel */}
      <motion.div
        key={cur.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-3xl mx-auto mb-10"
      >
        <h3 className="text-2xl md:text-4xl font-bold mb-4" style={{ fontFamily: FONT_DISPLAY, color: TXT }}>
          {cur.title}
        </h3>
        <p className="text-base md:text-lg leading-relaxed" style={{ color: TXT_2 }}>{cur.body}</p>
      </motion.div>

      <div className="text-center">
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-bold text-sm transition-all hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD_2})`,
            color: BG,
            fontFamily: FONT_DISPLAY,
            boxShadow: '0 12px 30px rgba(201,168,76,0.35)',
          }}
        >
          הצג בהרחבה
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      <motion.div
        key={`mock-${cur.id}`}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="mt-12"
      >
        <HeroMock />
      </motion.div>
    </section>
  );
}

/* ──────────────── TRY IT — INTERACTIVE DEMO ──────────────── */
function TryItDemo() {
  return (
    <section id="demo" className="max-w-7xl mx-auto px-5 lg:px-8 py-20 lg:py-24">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ fontFamily: FONT_DISPLAY, color: TXT }}>
          נסו את המערכת בעצמכם
        </h2>
        <div className="mx-auto w-24 h-[3px] rounded-full mb-5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        <p className="text-base md:text-lg" style={{ color: TXT_2 }}>
          גלו איך נראה יומן מסחר חכם מבפנים — בלי להירשם, בלי כרטיס אשראי.
        </p>
      </div>
      <div
        className="relative rounded-3xl p-2 lg:p-3"
        style={{
          background: `linear-gradient(135deg, ${BG_2}, ${BG})`,
          border: `1px solid ${LINE}`,
          boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
        }}
      >
        <LandingDemo />
      </div>
    </section>
  );
}

/* ──────────────── BROKERS GRID ──────────────── */
function BrokersGrid() {
  const brokers = [
    'TopstepX', 'NinjaTrader', 'Tradovate', 'MetaTrader 5', 'MetaTrader 4',
    'Bybit', 'Binance', 'Sierra Chart', 'TradingView', 'Rithmic',
    'DXTrade', 'Interactive Brokers', 'ColmexPro', 'Tradezella', 'TradeLocker',
  ];
  return (
    <section id="brokers" className="py-20 lg:py-28" style={{ background: 'rgba(10,31,61,0.3)' }}>
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ fontFamily: FONT_DISPLAY, color: TXT }}>
            פלטפורמות וברוקרים שאנחנו עובדים איתם
          </h2>
          <div className="mx-auto w-24 h-[3px] rounded-full mb-5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <p style={{ color: TXT_2 }}>אנו תומכים ברוב הפלטפורמות המובילות בשוק.</p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {brokers.map((b, i) => (
            <motion.div
              key={b}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: (i % 5) * 0.04 }}
              className="aspect-square rounded-2xl flex flex-col items-center justify-center p-3 transition-all hover:-translate-y-1 group"
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: `1px solid ${LINE}`,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl mb-2 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}08)`,
                  border: `1px solid ${LINE}`,
                  color: GOLD,
                  fontFamily: FONT_DISPLAY,
                }}
              >
                {b[0]}
              </div>
              <div className="text-[11px] text-center font-medium" style={{ color: TXT_2, fontFamily: FONT_DISPLAY }}>{b}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────── TOOLS (6 cards) ──────────────── */
function Tools() {
  const tools = [
    { icon: RefreshCw, title: 'תיעוד אוטומטי', body: 'שכחו מאקסלים מבולגנים או מהקלדות ידניות — המערכת מתעדת עבורך כל עסקה באופן מלא ומדויק.' },
    { icon: Smartphone, title: 'גישה מכל מקום', body: 'יומן המסחר שלך תמיד איתך — במחשב, טאבלט או סמארטפון. הכל בענן, בכל זמן.' },
    { icon: BarChart3, title: 'סטטיסטיקות מתקדמות', body: 'ניתוח חכם של כל העסקאות שלכם עם גרפים ברורים ותובנות שמבליטות את מה שבאמת חשוב.' },
    { icon: LineIcon, title: 'גרפים אינטראקטיביים', body: 'באמצעות שיתוף פעולה עם TradingView — תראו גרף חי של כל עסקה שביצעתם, כולל כניסות ויציאות.' },
    { icon: Settings2, title: 'הגדרת סטאפים', body: 'הגדירו סטאפים מותאמים אישית ונתחו אותם מול התוצאות בפועל — כדי לדעת בדיוק מה עובד.' },
    { icon: HeartPulse, title: 'תיעוד רגשי', body: 'תעדו את התחושות שלכם בזמן אמת כדי לזהות דפוסים רגשיים, לשלוט טוב יותר בהחלטות ולהשתפר.' },
  ];
  return (
    <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 lg:py-28">
      <div className="text-center mb-14">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ fontFamily: FONT_DISPLAY, color: TXT }}>
          הכלים המתקדמים ביותר לסוחרים
        </h2>
        <div className="mx-auto w-24 h-[3px] rounded-full mb-5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        <p style={{ color: TXT_2 }}>פתרונות חכמים שיעזרו לך לנהל, לנתח ולשפר את הביצועים שלך.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {tools.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="group p-7 rounded-3xl transition-all hover:-translate-y-1"
            style={{
              background: `linear-gradient(135deg, rgba(10,31,61,0.6), rgba(6,19,38,0.4))`,
              border: `1px solid ${LINE}`,
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: TXT, fontFamily: FONT_DISPLAY }}>{t.title}</h3>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
                style={{
                  background: `linear-gradient(135deg, ${GOLD}22, ${GOLD}08)`,
                  border: `1px solid ${LINE}`,
                }}
              >
                <t.icon className="w-5 h-5" style={{ color: GOLD }} />
              </div>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: TXT_2 }}>{t.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────── PRICING ──────────────── */
function Pricing() {
  const [yearly, setYearly] = useState(true);

  const tiers = [
    {
      name: 'Basic', icon: Star, sub: 'מתאים לסוחרים בתחילת דרכם',
      monthly: 60, yearly: 54,
      features: ['2 חשבונות מסחר', 'עד 5 סטאפים', 'ייבוא עסקאות אוטומטי וידני', 'יומן כלכלי', 'ניתוחים ודוחות אוטומטיים', 'אפליקציה לטלפון', 'מערכת ניהול סיכונים'],
      cta: 'התחילו 5 ימי ניסיון', highlight: false,
    },
    {
      name: 'Pro', icon: Crown, sub: 'מתאים לסוחרים מנוסים עם מספר תיקי מסחר',
      monthly: 80, yearly: 72,
      features: ['חשבונות מסחר ללא הגבלה', 'סטאפים ללא הגבלה', 'ייבוא עסקאות אוטומטי וידני', 'יומן כלכלי', 'ניתוחים ודוחות אוטומטיים', 'אפליקציה לטלפון', 'מערכת ניהול סיכונים', 'מנטורים ללא הגבלה', 'מערכת בקטסטינג מתקדמת'],
      cta: 'התחילו 5 ימי ניסיון', highlight: true,
    },
  ];

  return (
    <section id="pricing" className="py-20 lg:py-28" style={{ background: 'rgba(10,31,61,0.3)' }}>
      <div className="max-w-6xl mx-auto px-5 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ fontFamily: FONT_DISPLAY, color: TXT }}>
            מחירים שמתאימים לכל סוג סוחר
          </h2>
          <div className="mx-auto w-24 h-[3px] rounded-full mb-5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
          <p style={{ color: TXT_2 }}>מתאים לסוחרים בכל הרמות שרוצים לקחת את עצמם צעד קדימה.</p>
        </div>

        {/* Toggle */}
        <div className="flex justify-center mb-12">
          <div
            className="inline-flex p-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${LINE}` }}
          >
            <button
              onClick={() => setYearly(false)}
              className="px-6 py-2 rounded-full text-xs font-bold transition-all"
              style={{
                background: !yearly ? `linear-gradient(135deg, ${GOLD}, ${GOLD_2})` : 'transparent',
                color: !yearly ? BG : TXT_2,
                fontFamily: FONT_DISPLAY,
              }}
            >
              חודשי
            </button>
            <button
              onClick={() => setYearly(true)}
              className="px-6 py-2 rounded-full text-xs font-bold transition-all relative"
              style={{
                background: yearly ? `linear-gradient(135deg, ${GOLD}, ${GOLD_2})` : 'transparent',
                color: yearly ? BG : TXT_2,
                fontFamily: FONT_DISPLAY,
              }}
            >
              שנתי
              <span className="absolute -top-2 -left-2 text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#10b981', color: '#fff' }}>
                -10%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {tiers.map(t => {
            const price = yearly ? t.yearly : t.monthly;
            return (
              <div
                key={t.name}
                className="relative rounded-3xl p-8 transition-all"
                style={{
                  background: t.highlight
                    ? `linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.03))`
                    : 'rgba(10,31,61,0.4)',
                  border: t.highlight ? `1.5px solid ${GOLD}` : `1px solid ${LINE}`,
                  boxShadow: t.highlight ? '0 30px 70px rgba(201,168,76,0.15)' : 'none',
                  transform: t.highlight ? 'scale(1.02)' : 'none',
                }}
              >
                {t.highlight && (
                  <div
                    className="absolute -top-3 right-6 px-3 py-1 text-[10px] tracking-[0.2em] uppercase rounded-full font-bold"
                    style={{
                      background: `linear-gradient(135deg, ${GOLD}, ${GOLD_2})`,
                      color: BG,
                      fontFamily: FONT_DISPLAY,
                    }}
                  >
                    הכי פופולרי
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <t.icon className="w-5 h-5" style={{ color: GOLD }} />
                  <div className="text-xl font-bold" style={{ color: TXT, fontFamily: FONT_DISPLAY }}>מסלול {t.name}</div>
                </div>
                <div className="text-sm mb-6" style={{ color: TXT_2 }}>{t.sub}</div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-extrabold" style={{ color: TXT, fontFamily: FONT_DISPLAY }}>₪{price}</span>
                  <span className="text-sm" style={{ color: TXT_3 }}>/ חודש</span>
                  {yearly && (
                    <span className="text-xs px-2 py-0.5 rounded-full mr-2" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                      10% הנחה
                    </span>
                  )}
                </div>
                <ul className="space-y-3 mb-8">
                  {t.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: TXT_2 }}>
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth"
                  className="block text-center px-6 py-3.5 rounded-full font-bold text-sm transition-all hover:scale-[1.02]"
                  style={{
                    background: t.highlight
                      ? `linear-gradient(135deg, ${GOLD}, ${GOLD_2})`
                      : 'rgba(255,255,255,0.06)',
                    color: t.highlight ? BG : TXT,
                    border: t.highlight ? 'none' : `1px solid ${LINE}`,
                    fontFamily: FONT_DISPLAY,
                    boxShadow: t.highlight ? '0 14px 30px rgba(201,168,76,0.35)' : 'none',
                  }}
                >
                  {t.cta}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ──────────────── TESTIMONIALS ──────────────── */
function Testimonials() {
  const quotes = [
    { name: 'יואב מ.', role: 'סוחר קריפטו · 3 שנים', body: 'הפסקתי להחזיק את היומן באקסל אחרי שבוע. ה-Oracle תפס לי דפוס של overtrading שלא ידעתי שיש לי.' },
    { name: 'נועה ל.', role: 'Day Trader · S&P', body: 'מנוע הסיכון עצר אותי באמצע יום אדום. מנע ממני להמשיך לרדוף. שווה את הכסף בעסקה אחת.' },
    { name: 'דניאל ק.', role: 'סוחר עצמאי', body: 'הפעם הראשונה שיש לי תמונה ברורה של ה-edge שלי. ה-R-Multiples עשו לי סדר אחרי שנתיים של ערפל.' },
  ];
  return (
    <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 lg:py-24">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ fontFamily: FONT_DISPLAY, color: TXT }}>
          מה אומרים סוחרים שלנו
        </h2>
        <div className="mx-auto w-24 h-[3px] rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {quotes.map((q, i) => (
          <motion.div
            key={q.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="p-7 rounded-3xl"
            style={{ background: 'rgba(10,31,61,0.5)', border: `1px solid ${LINE}` }}
          >
            <div className="flex gap-0.5 mb-4">
              {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4" style={{ fill: GOLD, color: GOLD }} />)}
            </div>
            <p className="text-base leading-relaxed mb-5" style={{ color: TXT }}>"{q.body}"</p>
            <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: LINE }}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                style={{
                  background: `linear-gradient(135deg, ${GOLD}, ${GOLD_2})`,
                  color: BG,
                  fontFamily: FONT_DISPLAY,
                }}
              >
                {q.name[0]}
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: TXT, fontFamily: FONT_DISPLAY }}>{q.name}</div>
                <div className="text-xs" style={{ color: TXT_3 }}>{q.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────── FAQ ──────────────── */
function Faq() {
  const items = [
    { q: 'האם יש אפליקציה לטלפון?', a: 'כן. PWA מלאה — נכנסים מהטלפון, מוסיפים למסך הבית, ויש לכם את כל המערכת כמו אפליקציה רגילה. iOS ו-Android.' },
    { q: 'למי האפליקציה מתאימה?', a: 'לסוחרים בכל הרמות — מתחילים שצריכים מסגרת, ועד פרופים שצריכים אנליטיקה רצינית. עובד עם קריפטו, מניות, פיוצ׳רס ופורקס.' },
    { q: 'למה לא פשוט לתעד באקסל?', a: 'אקסל לא יודע לחשב לך תוחלת מתגלגלת, לזהות דפוסים התנהגותיים, או לעצור אותך כשאתה חוצה מגבלות סיכון. Orca הוא כלי מקצועי — לא טבלה.' },
    { q: 'אני משתמש בכמה תיקי מסחר — זה מתאים לי?', a: 'מסלול Pro תומך בחשבונות ללא הגבלה. כל חשבון עם נתונים, מגבלות ויעדים נפרדים — ועם ניתוח מצרפי מעל הכל.' },
    { q: 'יש לי מנטור — הוא יכול לעקוב אחרי העסקאות שלי?', a: 'כן. אפשר להזמין מנטור לצפייה בחשבון שלך עם הרשאות מותאמות — והוא יכול לראות הכל ולהשאיר הערות בזמן אמת.' },
    { q: 'מה עם פרטיות? זה בטוח?', a: 'הצפנה ברמת שורה (RLS), אחסון בענן בטוח, מסכת פרטיות מובנית בקליק. הנתונים שלך — אצלך בלבד.' },
  ];
  return (
    <section id="faq" className="max-w-5xl mx-auto px-5 lg:px-8 py-20 lg:py-28">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ fontFamily: FONT_DISPLAY, color: TXT }}>
          שאלות נפוצות
        </h2>
        <div className="mx-auto w-24 h-[3px] rounded-full mb-5" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }} />
        <p style={{ color: TXT_2 }}>תשובות לשאלות הנפוצות ביותר על השירות שלנו.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map(item => (
          <details
            key={item.q}
            className="group rounded-2xl overflow-hidden transition-all"
            style={{ background: 'rgba(10,31,61,0.5)', border: `1px solid ${LINE}` }}
          >
            <summary
              className="cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-4 text-sm font-semibold"
              style={{ color: TXT, fontFamily: FONT_DISPLAY }}
            >
              <span>{item.q}</span>
              <span className="group-open:rotate-45 transition-transform text-xl leading-none" style={{ color: GOLD }}>+</span>
            </summary>
            <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: TXT_2 }}>{item.a}</div>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ──────────────── FINAL CTA ──────────────── */
function FinalCta() {
  return (
    <section className="relative max-w-5xl mx-auto px-5 lg:px-8 py-20">
      <div
        className="relative rounded-[2rem] p-12 md:p-16 text-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${BG_2} 0%, ${BG_3} 50%, ${BG_2} 100%)`,
          border: `1.5px solid ${GOLD}`,
          boxShadow: `0 40px 100px rgba(201,168,76,0.2), inset 0 0 80px rgba(201,168,76,0.04)`,
        }}
      >
        <div
          className="absolute -top-20 -right-20 w-64 h-64 blur-3xl rounded-full"
          style={{ background: `${GOLD}33` }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-64 h-64 blur-3xl rounded-full"
          style={{ background: `${GOLD}22` }}
        />
        <div className="relative">
          <img src={orcaLogoAsset.url} alt="" className="w-16 h-16 mx-auto mb-5 drop-shadow-[0_0_20px_rgba(201,168,76,0.5)]" />
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4" style={{ fontFamily: FONT_DISPLAY, color: TXT }}>
            תפסיק לתעד. תתחיל להבין.
          </h2>
          <p className="max-w-xl mx-auto mb-8" style={{ color: TXT_2 }}>
            5 ימי ניסיון. בלי כרטיס אשראי. רק יומן אחד שיכול לשנות את שנת המסחר שלך.
          </p>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-bold text-sm transition-all hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${GOLD}, ${GOLD_2})`,
              color: BG,
              fontFamily: FONT_DISPLAY,
              boxShadow: '0 20px 50px rgba(201,168,76,0.45)',
            }}
          >
            התחילו ניסיון בחינם!
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ──────────────── FOOTER ──────────────── */
function Footer() {
  return (
    <footer id="contact" className="border-t mt-10 pt-16 pb-8" style={{ borderColor: LINE, background: 'rgba(6,19,38,0.7)' }}>
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <Logo size={40} />
            <p className="text-sm mt-4 leading-relaxed" style={{ color: TXT_2 }}>
              יומן המסחר המקצועי לסוחרים ישראלים. נבנה בישראל, בעברית, מאפס.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs tracking-[0.2em] mb-4 font-bold" style={{ color: GOLD, fontFamily: FONT_DISPLAY }}>קישורים מהירים</h4>
            <ul className="space-y-2.5 text-sm" style={{ color: TXT_2 }}>
              <li><a href="#features" className="hover:text-white transition">פיצ'רים</a></li>
              <li><a href="#brokers" className="hover:text-white transition">פלטפורמות וברוקרים</a></li>
              <li><a href="#pricing" className="hover:text-white transition">מחירים</a></li>
              <li><a href="#faq" className="hover:text-white transition">שאלות ותשובות</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-xs tracking-[0.2em] mb-4 font-bold" style={{ color: GOLD, fontFamily: FONT_DISPLAY }}>משפטי</h4>
            <ul className="space-y-2.5 text-sm" style={{ color: TXT_2 }}>
              <li><Link to="/terms" className="hover:text-white transition">תנאי שימוש</Link></li>
              <li><Link to="/terms" className="hover:text-white transition">מדיניות פרטיות</Link></li>
              <li><Link to="/terms" className="hover:text-white transition">Risk Disclosure</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs tracking-[0.2em] mb-4 font-bold" style={{ color: GOLD, fontFamily: FONT_DISPLAY }}>צור קשר</h4>
            <ul className="space-y-3 text-sm" style={{ color: TXT_2 }}>
              <li className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4" style={{ color: GOLD }} />
                <span>054-615-0818</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4" style={{ color: GOLD }} />
                <a href="mailto:support@orca-investment.co.il" className="hover:text-white transition">support@orca-investment.co.il</a>
              </li>
            </ul>
          </div>
        </div>

        {/* Risk disclosure */}
        <div className="text-[11px] leading-relaxed pt-6 border-t" style={{ borderColor: LINE, color: TXT_3 }}>
          <strong style={{ color: TXT_2 }}>Risk Disclosure:</strong> Futures and forex trading contains substantial risk and is not for every investor.
          An investor could potentially lose all or more than the initial investment. Risk capital is money that can be lost without jeopardizing
          one's financial security or lifestyle. Only risk capital should be used for trading. Past performance is not necessarily indicative of future results.
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-6 border-t text-xs" style={{ borderColor: LINE, color: TXT_3 }}>
          <span>© {new Date().getFullYear()} Orca Investment · כל הזכויות שמורות</span>
          <span>נבנה בישראל לסוחרים ישראלים 🇮🇱</span>
        </div>
      </div>
    </footer>
  );
}
