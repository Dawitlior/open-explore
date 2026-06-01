/**
 * Landing — public Hebrew-first marketing page for the Israeli trading
 * community. Lives at `/welcome` and is rendered for unauthenticated
 * visitors. Split-screen hero with live interactive demo on the left,
 * pitch + CTAs on the right (RTL primary side).
 */
import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Sparkles, Shield, Brain, LineChart, Radar, Lock,
  Check, Zap, Crown, Star,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { LandingDemo } from '@/components/landing/LandingDemo';

const PRIMARY = '#4f46e5';
const PRIMARY_2 = '#a78bfa';

export default function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  // Authed visitors don't need the marketing page — bounce to the app.
  useEffect(() => {
    if (!loading && session) navigate('/', { replace: true });
  }, [loading, session, navigate]);

  // Lock document direction to RTL while this page is mounted
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
      dir="rtl"
      className="min-h-screen text-slate-100 antialiased overflow-x-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(79,70,229,0.25), transparent 60%), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(167,139,250,0.18), transparent 60%), linear-gradient(180deg, #0a0a1a 0%, #06061a 100%)',
        fontFamily: "'DM Sans', 'Heebo', sans-serif",
      }}
    >
      <Nav />
      <Hero />
      <SocialProof />
      <Features />
      <DeepDive />
      <Pricing />
      <Testimonials />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

/* ──────────────── NAV ──────────────── */
function Nav() {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#0a0a1a]/60 border-b border-[#1e1e5a]/40">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-3.5 flex items-center gap-6">
        <Link to="/welcome" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4f46e5] to-[#a78bfa] flex items-center justify-center shadow-lg shadow-[#4f46e5]/30">
            <span className="text-white font-bold text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>O</span>
          </div>
          <span className="text-white font-semibold tracking-tight text-lg" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Orca</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400 mr-auto">
          <a href="#features" className="hover:text-white transition">תכונות</a>
          <a href="#pricing" className="hover:text-white transition">מחירים</a>
          <a href="#faq" className="hover:text-white transition">שאלות נפוצות</a>
        </nav>
        <div className="flex items-center gap-2 ml-auto md:mr-0">
          <Link to="/auth" className="text-sm text-slate-300 hover:text-white px-3 py-2 transition">התחברות</Link>
          <Link
            to="/auth?signup=1"
            className="text-sm font-medium text-white px-4 py-2 rounded-lg bg-gradient-to-l from-[#4f46e5] to-[#7c3aed] shadow-lg shadow-[#4f46e5]/30 hover:shadow-[#4f46e5]/50 transition-all hover:scale-105"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            התחל ניסיון חינם
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ──────────────── HERO ──────────────── */
function Hero() {
  return (
    <section className="relative max-w-7xl mx-auto px-5 lg:px-8 pt-14 lg:pt-20 pb-16 lg:pb-24">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* RTL primary side — pitch */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-right"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4f46e5]/10 border border-[#4f46e5]/30 text-xs text-[#a78bfa] mb-6">
            <Sparkles className="w-3 h-3" />
            <span style={{ fontFamily: "'Space Grotesk', sans-serif" }}>הראשון בעברית · נבנה לסוחרים ישראלים</span>
          </div>
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-white mb-6"
            style={{ fontFamily: "'Space Grotesk', 'Heebo', sans-serif" }}
          >
            היומן שמלמד אותך{' '}
            <span className="bg-gradient-to-l from-[#a78bfa] via-[#4f46e5] to-[#06b6d4] bg-clip-text text-transparent">
              לנצח
            </span>
            <br />
            לפני שהשוק יעניש אותך.
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed mb-8 max-w-xl mr-0 ml-auto">
            Orca הוא יומן מסחר מקצועי עם מנוע סיכון בזמן אמת, אבחון פסיכולוגי AI ודשבורד שמתאים את עצמו לרמה שלך —
            הכל בעברית, מתוכנן מאפס לקהילת הסוחרים בישראל.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Link
              to="/auth?signup=1"
              className="group inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-l from-[#4f46e5] to-[#7c3aed] text-white font-semibold shadow-xl shadow-[#4f46e5]/40 hover:shadow-[#4f46e5]/60 hover:scale-[1.02] transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              התחל ניסיון חינם · 7 ימים
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 font-medium hover:bg-white/10 transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              שחק עם הדמו ←
            </a>
          </div>

          <div className="flex items-center gap-5 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> ללא כרטיס אשראי</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> ביטול בכל רגע</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> RTL מלא</span>
          </div>
        </motion.div>

        {/* Left — live interactive demo */}
        <motion.div
          id="demo"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          className="relative"
        >
          <div className="absolute -inset-6 bg-gradient-to-br from-[#4f46e5]/20 to-[#a78bfa]/10 blur-3xl rounded-full pointer-events-none" />
          <LandingDemo />
          <div className="text-center text-[11px] text-slate-500 mt-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            ← לחץ על הטאבים ועל התוכניות. זה אינטראקטיבי.
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ──────────────── SOCIAL PROOF ──────────────── */
function SocialProof() {
  const items = ['Crypto IL', 'Trading TLV', 'VWAP Brothers', 'הסוחרים', 'Day-Trading.co.il', 'StockGuru'];
  return (
    <section className="border-y border-[#1e1e5a]/40 bg-[#0a0a1a]/40 py-6">
      <div className="max-w-7xl mx-auto px-5 lg:px-8">
        <div className="text-center text-[10px] text-slate-500 tracking-[0.25em] uppercase mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          סוחרים מקהילות מובילות בישראל משתמשים ב-Orca
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-slate-500 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {items.map(x => <span key={x} className="hover:text-slate-300 transition">{x}</span>)}
        </div>
      </div>
    </section>
  );
}

/* ──────────────── FEATURES ──────────────── */
function Features() {
  const features = [
    { icon: LineChart, title: 'R-Multiples ברירת מחדל', body: 'כל תוחלת ביחידות סיכון. לא דולרים. לא אחוזים. רק האמת.' },
    { icon: Shield, title: 'מנוע סיכון 4 שכבות', body: 'מגבלות אוטומטיות: -1R לעסקה, -2R ליום, -5R לשבוע, -10R לחודש.' },
    { icon: Brain, title: 'Oracle · אבחון התנהגותי', body: '7 שכבות עומק, 37 צמתים — דיוקן פסיכולוגי שמתעדכן עם הסחר שלך.' },
    { icon: Sparkles, title: 'AI Weekly Review', body: 'דה-בריף יום שישי אוטומטי שמסכם לך את השבוע ומראה מה לעבוד עליו.' },
    { icon: Radar, title: 'Economic Radar', body: 'התראות T-5 ו-T-1 לפני אירועים מאקרו. בלי רעש מיותר.' },
    { icon: Lock, title: 'RTL · פרטיות מלאה', body: 'הנתונים שלך אצלך. הצפנה ברמת שורה. מסכת פרטיות מובנית.' },
  ];
  return (
    <section id="features" className="max-w-7xl mx-auto px-5 lg:px-8 py-20 lg:py-28">
      <div className="text-center mb-14">
        <div className="text-[10px] tracking-[0.25em] text-[#a78bfa] uppercase mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>תכונות</div>
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          הכל מה שסוחר רציני צריך.
        </h2>
        <p className="text-slate-400 mt-3 max-w-2xl mx-auto">לא עוד גוגל-שיט. לא עוד אקסל. מערכת בנויה ספציפית לאופן שבו סוחרים חושבים.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="group relative p-6 rounded-2xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/10 hover:border-[#4f46e5]/40 hover:from-[#4f46e5]/10 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4f46e5]/20 to-[#a78bfa]/10 border border-[#4f46e5]/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <f.icon className="w-5 h-5 text-[#a78bfa]" />
            </div>
            <h3 className="text-base font-semibold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{f.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────── DEEP DIVE ──────────────── */
function DeepDive() {
  const blocks = [
    {
      tag: 'ניתוח',
      title: 'תוחלת מתגלגלת. דעיכת יתרון. Sortino.',
      body: 'הסטטיסטיקות שמדמים מקצועיים משתמשים בהן — בלי לפתוח קוד פייתון. רואים מתי האדג׳ שלך מתחיל לדעוך, רגעים לפני שזה פוגע בחשבון.',
    },
    {
      tag: 'סיכון',
      title: 'אזעקות לפני שאתה שובר את החוקים שלך.',
      body: '4 שכבות מגבלות. עוקבות אחריך אוטומטית. כשאתה מתקרב לקיר — המערכת שולחת התראה. כשאתה חוצה — היא עוצרת אותך לפני העסקה הבאה.',
    },
    {
      tag: 'פסיכולוגיה',
      title: 'Oracle יודע איך אתה מפסיד.',
      body: 'אבחון התנהגותי בן 37 צמתים מזהה את הדפוסים הנסתרים שלך: revenge trading, overtrading אחרי רצף הפסדים, FOMO. ואז מציע מה לעשות.',
    },
  ];
  return (
    <section className="bg-gradient-to-b from-transparent via-[#141432]/30 to-transparent py-20 lg:py-28">
      <div className="max-w-6xl mx-auto px-5 lg:px-8 space-y-20">
        {blocks.map((b, i) => (
          <motion.div
            key={b.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className={`grid md:grid-cols-2 gap-8 items-center ${i % 2 ? 'md:[direction:ltr]' : ''}`}
          >
            <div dir="rtl" className="text-right">
              <div className="text-[10px] tracking-[0.25em] text-[#a78bfa] uppercase mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{b.tag}</div>
              <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{b.title}</h3>
              <p className="text-slate-400 text-base leading-relaxed">{b.body}</p>
            </div>
            <div dir="rtl" className="aspect-[5/3] rounded-2xl bg-gradient-to-br from-[#4f46e5]/15 to-[#a78bfa]/5 border border-white/10 p-1.5">
              <div className="w-full h-full rounded-xl bg-[#0a0a1a]/80 flex items-center justify-center text-slate-600 text-xs font-mono tracking-widest" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                ◆ {b.tag.toUpperCase()} VIEW
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────── PRICING ──────────────── */
function Pricing() {
  const tiers = [
    {
      name: 'Standard', price: 'חינם', sub: 'לתמיד', icon: Star, tint: '#64748b',
      features: ['יומן עסקאות מלא', 'מגבלות סיכון בסיסיות', 'דשבורד עיקרי', 'התפלגות R', 'עד 100 עסקאות / חודש'],
      cta: 'התחל חינם', highlight: false,
    },
    {
      name: 'Advanced', price: '₪79', sub: '/חודש', icon: Zap, tint: '#4f46e5',
      features: ['כל מה שב-Standard', 'אנליטיקה מקצועית מלאה', 'AI Weekly Review', 'Economic Radar', 'מנוע סיכון 4 שכבות', 'ייצוא XLSX/JSON', 'עסקאות ללא הגבלה'],
      cta: 'התחל ניסיון 7 ימים', highlight: true,
    },
    {
      name: 'Ultimate', price: '₪149', sub: '/חודש', icon: Crown, tint: '#a78bfa',
      features: ['כל מה שב-Advanced', 'Oracle · אבחון התנהגותי', 'Quant Lab', 'Psychology Lab', 'Kelly Optimal Sizing', 'תמיכה עדיפות'],
      cta: 'התחל ניסיון 7 ימים', highlight: false,
    },
  ];
  return (
    <section id="pricing" className="max-w-7xl mx-auto px-5 lg:px-8 py-20 lg:py-28">
      <div className="text-center mb-14">
        <div className="text-[10px] tracking-[0.25em] text-[#a78bfa] uppercase mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>מחירים</div>
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>בחר תוכנית. שדרג מתי שתרצה.</h2>
        <p className="text-slate-400 mt-3">7 ימי ניסיון על כל תוכנית בתשלום. בלי כרטיס אשראי. בלי טריקים.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-5">
        {tiers.map(t => (
          <div
            key={t.name}
            className={`relative rounded-2xl p-7 border transition-all ${
              t.highlight
                ? 'bg-gradient-to-br from-[#4f46e5]/15 to-[#a78bfa]/5 border-[#4f46e5]/60 shadow-2xl shadow-[#4f46e5]/20 scale-[1.02]'
                : 'bg-white/[0.03] border-white/10 hover:border-white/20'
            }`}
          >
            {t.highlight && (
              <div className="absolute -top-3 right-6 px-3 py-1 text-[10px] tracking-[0.2em] uppercase rounded-full bg-gradient-to-l from-[#4f46e5] to-[#7c3aed] text-white font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                הכי פופולרי
              </div>
            )}
            <div className="flex items-center gap-2 mb-3">
              <t.icon className="w-4 h-4" style={{ color: t.tint }} />
              <div className="text-sm tracking-wider text-slate-300" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t.name}</div>
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{t.price}</span>
              <span className="text-sm text-slate-500">{t.sub}</span>
            </div>
            <div className="text-xs text-slate-500 mb-6">חשבונית מס/קבלה ישראלית</div>
            <ul className="space-y-2.5 mb-7">
              {t.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/auth?signup=1"
              className={`block text-center px-5 py-3 rounded-xl font-semibold transition-all ${
                t.highlight
                  ? 'bg-gradient-to-l from-[#4f46e5] to-[#7c3aed] text-white shadow-lg shadow-[#4f46e5]/30 hover:shadow-[#4f46e5]/50'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              {t.cta}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ──────────────── TESTIMONIALS ──────────────── */
function Testimonials() {
  const quotes = [
    { name: 'יואב מ.', role: 'סוחר קריפטו · 3 שנים', body: 'הפסקתי להחזיק את היומן באקסל אחרי שבוע. ה-Oracle תפס לי דפוס של overtrading שלא ידעתי שיש לי.' },
    { name: 'נועה ל.', role: 'Day Trader · S&P', body: 'מנוע הסיכון פשוט עצר אותי באמצע יום אדום. מנע ממני להמשיך לרדוף. שווה את הכסף בעסקה אחת.' },
    { name: 'דניאל ק.', role: 'סוחר עצמאי', body: 'הפעם הראשונה שיש לי באמת תמונה ברורה של ה-edge שלי. ה-R-Multiples עשו לי סדר אחרי שנתיים של ערפל.' },
  ];
  return (
    <section className="max-w-7xl mx-auto px-5 lg:px-8 py-20 lg:py-24">
      <div className="grid md:grid-cols-3 gap-5">
        {quotes.map((q, i) => (
          <motion.div
            key={q.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="p-6 rounded-2xl bg-white/[0.03] border border-white/10"
          >
            <div className="flex gap-0.5 mb-3">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-[#a78bfa] text-[#a78bfa]" />)}
            </div>
            <p className="text-slate-200 text-sm leading-relaxed mb-4">"{q.body}"</p>
            <div className="text-xs">
              <div className="text-white font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{q.name}</div>
              <div className="text-slate-500">{q.role}</div>
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
    { q: 'האם אני באמת מקבל 7 ימים חינם?', a: 'כן. בלי כרטיס אשראי, בלי התחייבות. אחרי 7 ימים אתה יכול לבחור תוכנית — או להישאר ב-Standard החינמי לתמיד.' },
    { q: 'אילו ברוקרים נתמכים?', a: 'Bybit, Binance, OKX, Bitget, Coinbase, Kraken — דרך API קריאה בלבד, או ייבוא קובץ CSV/XLSX מכל פלטפורמה.' },
    { q: 'האם הנתונים שלי מוגנים?', a: 'הצפנה ברמת שורה (RLS), אחסון בענן Lovable Cloud, ומסכת פרטיות שמסתירה מספרים במסך עם קליק אחד. הנתונים שלך אצלך בלבד.' },
    { q: 'יש תמיכה בעברית?', a: 'כל המערכת RTL מלא. תפריטים, גרפים, AI, הכל. גם אנגלית זמינה במעבר כפתור.' },
    { q: 'אפשר לבטל בכל רגע?', a: 'כן. ביטול בקליק אחד מ-/account/billing. תשמור את הגישה עד סוף תקופת החיוב.' },
    { q: 'מה ההבדל בין Advanced ל-Ultimate?', a: 'Advanced נותן לך אנליטיקה מקצועית מלאה. Ultimate מוסיף את Oracle (אבחון התנהגותי בן 37 צמתים), Quant Lab ו-Kelly Sizing — כלים ברמה של קרנות.' },
  ];
  return (
    <section id="faq" className="max-w-3xl mx-auto px-5 lg:px-8 py-20 lg:py-28">
      <div className="text-center mb-12">
        <div className="text-[10px] tracking-[0.25em] text-[#a78bfa] uppercase mb-3" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>שאלות נפוצות</div>
        <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>שאלות שכבר שאלו אותנו.</h2>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <details key={item.q} className="group rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all overflow-hidden">
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3 px-5 py-4 text-white font-medium text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span>{item.q}</span>
              <span className="text-[#a78bfa] group-open:rotate-45 transition-transform text-lg leading-none">+</span>
            </summary>
            <div className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">{item.a}</div>
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
      <div className="relative rounded-3xl bg-gradient-to-br from-[#4f46e5] via-[#6366f1] to-[#7c3aed] p-12 md:p-16 text-center overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 blur-3xl rounded-full" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-black/20 blur-3xl rounded-full" />
        <div className="relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            תפסיק לתעד. תתחיל להבין.
          </h2>
          <p className="text-white/80 max-w-xl mx-auto mb-8">7 ימים חינם. בלי כרטיס אשראי. רק יומן אחד שיכול לשנות את שנת המסחר שלך.</p>
          <Link
            to="/auth?signup=1"
            className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-white text-[#4f46e5] font-bold shadow-2xl shadow-black/30 hover:scale-105 transition-all"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            התחל עכשיו — חינם
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
    <footer className="border-t border-[#1e1e5a]/40 py-10 mt-10">
      <div className="max-w-7xl mx-auto px-5 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#4f46e5] to-[#a78bfa] flex items-center justify-center">
            <span className="text-white text-[10px] font-bold">O</span>
          </div>
          <span>© {new Date().getFullYear()} Orca · נבנה בישראל לסוחרים ישראלים</span>
        </div>
        <div className="flex items-center gap-5">
          <Link to="/terms" className="hover:text-slate-300 transition">תנאי שימוש</Link>
          <Link to="/terms" className="hover:text-slate-300 transition">פרטיות</Link>
          <Link to="/auth" className="hover:text-slate-300 transition">התחברות</Link>
        </div>
      </div>
    </footer>
  );
}
