import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Languages, ShieldCheck, Sparkles, LineChart, Database, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useAuth } from '@/hooks/use-auth';
import { translateAuthError } from '@/lib/auth-utils';
import { toast } from 'sonner';
import Seo from '@/components/Seo';

const ORCA_LOGO_SRC = '/orca-logo.png';

// Brand palette — Orca Investment (black/gold)
const GOLD = '#d4af5a';
const GOLD_BRIGHT = '#f0d78c';
const GOLD_DEEP = '#a8862d';
const INK = '#000000';
const INK_2 = '#07090f';
const INK_3 = '#0e131c';
const TEXT = '#f5ecd6';
const TEXT_MUTED = '#9a9381';
const BORDER = 'rgba(212,175,90,0.22)';
const BORDER_SOFT = 'rgba(212,175,90,0.12)';

type Lang = 'he' | 'en';

const LANG_KEY = 'orca:lang-cache';
const AUTH_LANG_OVERRIDE_KEY = 'orca:auth-lang-override';
const PENDING_CONSENT_KEY = 'orca:pending-consent';
const CONSENT_VERSION = 'v1.2_telemetry_indie';

async function logConsent(userId: string) {
  try {
    await supabase.from('consent_log').insert({
      user_id: userId,
      version: CONSENT_VERSION,
      choices: { terms: true, privacy: true },
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    });
  } catch { /* non-blocking */ }
}

const COPY = {
  he: {
    brand: 'OrcaInvestment',
    tagline: 'חיבור לבורסאות · העלאת קבצים אוניברסלית · תובנות AI',
    welcome: 'ברוך/ה הבא/ה',
    title: 'כניסה לטרמינל',
    sub: 'ההרשמה והכניסה מתבצעות דרך חשבון Google.',
    continueGoogle: 'המשך/י עם Google',
    connecting: 'מתחבר…',
    retry: 'נסה/י שוב',
    feature1: 'חיבור מרובה לבורסאות דרך API',
    feature2: 'העלאת קבצים אוניברסלית — תומך במגוון פורמטים',
    feature3: 'תובנות AI מהמסחר שלך',
    feature4: 'אחסון מוצפן פר-משתמש',
    consentPrefix: 'בכניסה אני מאשר/ת את',
    consentTerms: 'תנאי השימוש',
    consentAnd: 'ואת',
    consentPrivacy: 'מדיניות הפרטיות',
    failed: 'ההתחברות ל-Google נכשלה. נסה/י שוב.',
    typewriter: [
      'חיבור מרובה לבורסאות דרך API.',
      'העלאת קבצים אוניברסלית בכל פורמט.',
      'תובנות AI מהמסחר שלך.',
      'יומן מסחר בילינגוואלי מלא.',
    ],
  },
  en: {
    brand: 'OrcaInvestment',
    tagline: 'Multi-exchange API · Universal file ingestion · AI insights',
    welcome: 'Welcome',
    title: 'Sign in to the terminal',
    sub: 'Sign-up and sign-in run through your Google account.',
    continueGoogle: 'Continue with Google',
    connecting: 'Connecting…',
    retry: 'Try again',
    feature1: 'Connect multiple exchanges via API',
    feature2: 'Universal file uploader — supports many formats',
    feature3: 'AI insights from your own trades',
    feature4: 'Encrypted per-user cloud storage',
    consentPrefix: 'By continuing you agree to the',
    consentTerms: 'Terms of Service',
    consentAnd: 'and the',
    consentPrivacy: 'Privacy Policy',
    failed: 'Google sign-in failed. Please try again.',
    typewriter: [
      'Connect multiple exchanges via API.',
      'Universal file uploader for every format.',
      'AI insights from your own trades.',
      'Fully bilingual trading journal.',
    ],
  },
} as const;

function readLang(): Lang {
  if (typeof window === 'undefined') return 'he';
  try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'he'; } catch { return 'he'; }
}
function writeLang(l: Lang) {
  try { localStorage.setItem(LANG_KEY, l); } catch { /* noop */ }
}
function writeAuthLangIntent(l: Lang) {
  try { localStorage.setItem(AUTH_LANG_OVERRIDE_KEY, l); } catch { /* noop */ }
}

/** Typewriter — cycles through a list of phrases with type/erase animation. */
function useTypewriter(phrases: readonly string[], opts?: { type?: number; erase?: number; hold?: number }) {
  const typeSpeed = opts?.type ?? 55;
  const eraseSpeed = opts?.erase ?? 28;
  const holdTime = opts?.hold ?? 1600;
  const [text, setText] = useState('');
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'holding' | 'erasing'>('typing');

  useEffect(() => {
    if (!phrases.length) return;
    const current = phrases[i % phrases.length];
    let to: ReturnType<typeof setTimeout>;
    if (phase === 'typing') {
      if (text.length < current.length) {
        to = setTimeout(() => setText(current.slice(0, text.length + 1)), typeSpeed);
      } else {
        to = setTimeout(() => setPhase('holding'), 0);
      }
    } else if (phase === 'holding') {
      to = setTimeout(() => setPhase('erasing'), holdTime);
    } else {
      if (text.length > 0) {
        to = setTimeout(() => setText(current.slice(0, text.length - 1)), eraseSpeed);
      } else {
        to = setTimeout(() => { setI(v => v + 1); setPhase('typing'); }, 120);
      }
    }
    return () => clearTimeout(to);
  }, [text, phase, i, phrases, typeSpeed, eraseSpeed, holdTime]);

  return text;
}

const GoogleMark = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.4 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z" />
  </svg>
);

export default function AuthPage() {
  const location = useLocation();
  const { session, loading } = useAuth();
  const [lang, setLang] = useState<Lang>(() => readLang());
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [idleGate, setIdleGate] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('idle') === '1';
  });
  const c = COPY[lang];
  const isRTL = lang === 'he';
  const typed = useTypewriter(c.typewriter);

  useEffect(() => {
    document.title = `${c.title} · ${c.brand}`;
  }, [lang, c]);

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const search = new URLSearchParams(window.location.search);
    const error = hash.get('error_description') || search.get('error_description');
    if (error) { toast.error(translateAuthError(decodeURIComponent(error))); setFailed(true); }
  }, []);

  // After OAuth lands back with a session, flush any pending consent record.
  useEffect(() => {
    if (loading || !session?.user?.id) return;
    try {
      if (localStorage.getItem(PENDING_CONSENT_KEY) === '1') {
        logConsent(session.user.id);
        localStorage.removeItem(PENDING_CONSENT_KEY);
      }
    } catch { /* noop */ }
  }, [loading, session]);

  if (!loading && session) return <Navigate to={redirectTo} replace />;

  const toggleLang = () => {
    const next: Lang = lang === 'he' ? 'en' : 'he';
    setLang(next);
    writeLang(next);
    writeAuthLangIntent(next);
  };

  /**
   * The Lovable OAuth broker lives behind the `/~oauth/*` paths, which only exist
   * on Lovable-hosted origins (*.lovable.app / *.lovableproject.com and their
   * proxied custom domains). On our external (Netlify) deployment those paths hit
   * the SPA fallback and render the 404 page, so Google sign-in can never finish.
   * On any non-Lovable origin we go straight to the backend's own OAuth endpoint.
   */
  const isLovableHost = () => /(^|\.)lovable\.app$|(^|\.)lovableproject\.com$|localhost|127\.0\.0\.1/.test(window.location.hostname);

  const handleGoogle = async () => {
    setBusy(true);
    setFailed(false);
    writeLang(lang);
    writeAuthLangIntent(lang);
    try { localStorage.setItem(PENDING_CONSENT_KEY, '1'); } catch { /* noop */ }
    try {
      if (!isLovableHost()) {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth`,
            queryParams: { prompt: 'select_account' },
          },
        });
        if (error) throw error;
        return; // browser navigates away to Google
      }
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: { prompt: 'select_account' },
      });
      if (result?.error) throw result.error;
      if (result?.redirected) return; // browser navigates away
      // Session already set by the helper — the guard above will redirect.
    } catch (err) {
      toast.error(translateAuthError(err instanceof Error ? err.message : c.failed));
      setFailed(true);
      setBusy(false);
    }
  };


  const featureList = [
    { icon: <LineChart size={14} />, label: c.feature1 },
    { icon: <ShieldCheck size={14} />, label: c.feature2 },
    { icon: <Sparkles size={14} />, label: c.feature3 },
    { icon: <Database size={14} />, label: c.feature4 },
  ];

  return (
    <main
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100dvh',
        background: INK,
        color: TEXT,
        fontFamily: "'Poppins', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Seo
        title={isRTL ? 'התחברות — Orca פלטפורמת המסחר לסוחרים מקצועיים' : 'Sign in — Orca trading platform for professional traders'}
        description={isRTL ? 'התחברות לחשבון Orca עם Google — גישה ליומן המסחר, ניהול הסיכונים והאנליטיקה ההתנהגותית שלך.' : 'Sign in to your Orca account with Google to access your trading journal, risk management and behavioral analytics.'}
        path="/auth"
      />
      <style>{`
        @keyframes orca-idle-fadebg { from { opacity: 0; } to { opacity: 1; } }
        @keyframes orca-auth-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orca-caret-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes orca-aurora-drift { 0% { transform: translate(0,0); } 50% { transform: translate(-2%, 2%); } 100% { transform: translate(0,0); } }
        @keyframes orca-spin { to { transform: rotate(360deg); } }
        .orca-caret { display:inline-block; width:2px; height:0.95em; background:${GOLD_BRIGHT}; margin-inline-start:4px; vertical-align:-2px; animation: orca-caret-blink 1s steps(1) infinite; box-shadow: 0 0 8px rgba(240,215,140,0.6); }
        .orca-auth-grid { display:grid; grid-template-columns: 1fr; min-height:100dvh; }
        @media (min-width: 980px) { .orca-auth-grid { grid-template-columns: 1.05fr 1fr; } }
        .orca-google-btn { transition: transform .16s ease, box-shadow .16s ease, filter .16s ease; }
        .orca-google-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 18px 40px rgba(212,175,90,0.32); }
        .orca-google-btn:active:not(:disabled) { transform: translateY(0); }
        .orca-spin { animation: orca-spin 0.9s linear infinite; }
      `}</style>

      {/* Gold aurora — global */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(900px 700px at 18% 22%, rgba(212,175,90,0.12), transparent 62%),
          radial-gradient(700px 600px at 82% 78%, rgba(168,134,45,0.10), transparent 65%)
        `,
        animation: 'orca-aurora-drift 18s ease-in-out infinite',
      }} />
      {/* Subtle gold mesh */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(212,175,90,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,90,0.6) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 78%)',
      }} />

      {/* Top-right language toggle */}
      <button
        onClick={toggleLang}
        style={{
          position: 'absolute', top: 'max(20px, env(safe-area-inset-top))', insetInlineEnd: 20, zIndex: 5,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 999,
          background: 'rgba(15,15,18,0.75)', border: `1px solid ${BORDER}`,
          color: GOLD_BRIGHT, cursor: 'pointer', fontSize: 12, fontWeight: 600,
          backdropFilter: 'blur(10px)',
        }}
      >
        <Languages size={14} />
        {lang === 'he' ? 'English' : 'עברית'}
      </button>

      <div className="orca-auth-grid">
        {/* ── LEFT COLUMN — Brand / Typewriter / Features (hidden on mobile) ── */}
        <aside
          style={{
            display: 'none',
            position: 'relative',
            zIndex: 1,
            padding: 'clamp(40px, 6vw, 72px)',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: 'clamp(28px, 4vw, 56px)',
            background: `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${INK_3} 0%, ${INK_2} 60%, ${INK} 100%)`,
            borderInlineEnd: `1px solid ${BORDER_SOFT}`,
          }}
          className="orca-auth-aside"
        >
          <style>{`@media (min-width: 980px) { .orca-auth-aside { display: flex !important; } }`}</style>

          {/* Brand mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img src={ORCA_LOGO_SRC} alt="Orca" width={56} height={56}
              style={{ width: 56, height: 56, objectFit: 'contain', filter: 'drop-shadow(0 8px 20px rgba(212,175,90,0.35))' }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.22em', color: GOLD_BRIGHT, lineHeight: 1 }}>ORCA</div>
              <div style={{ fontSize: 9, color: TEXT_MUTED, letterSpacing: '0.36em', textTransform: 'uppercase', marginTop: 6, fontWeight: 600 }}>Investment</div>
            </div>
          </div>

          {/* Typewriter hero */}
          <div style={{ display: 'grid', gap: 22, maxWidth: 520 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.32em', color: GOLD, fontWeight: 700, textTransform: 'uppercase' }}>
              {c.tagline}
            </div>
            <h2 style={{
              fontSize: 'clamp(28px, 3.6vw, 44px)',
              lineHeight: 1.15,
              margin: 0, fontWeight: 700, letterSpacing: '-0.02em',
              color: TEXT,
              minHeight: '2.6em',
            }}>
              <span style={{
                background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>{typed}</span>
              <span className="orca-caret" />
            </h2>

            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {featureList.map((f, idx) => (
                <li key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 12,
                  border: `1px solid ${BORDER_SOFT}`,
                  background: 'rgba(7,9,15,0.55)',
                  fontSize: 13, color: TEXT,
                }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 8,
                    display: 'grid', placeItems: 'center', color: GOLD_BRIGHT,
                    background: 'rgba(212,175,90,0.10)', border: `1px solid ${BORDER_SOFT}`,
                  }}>{f.icon}</span>
                  <span style={{ fontWeight: 500 }}>{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* ── RIGHT COLUMN — Google-only sign-in card ── */}
        <section style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(20px, 4vw, 48px)',
          paddingBottom: 'max(clamp(20px, 4vw, 48px), env(safe-area-inset-bottom))',
          position: 'relative', zIndex: 1,
        }}>
          <div
            style={{
              width: '100%', maxWidth: 440,
              background: `linear-gradient(180deg, ${INK_2} 0%, ${INK} 100%)`,
              border: `1px solid ${BORDER}`,
              borderRadius: 24,
              padding: 'clamp(26px, 4vw, 38px)',
              boxShadow: '0 30px 90px rgba(0,0,0,0.7), inset 0 1px 0 rgba(240,215,140,0.08)',
              backdropFilter: 'blur(20px)',
              position: 'relative',
              textAlign: 'center',
            }}
          >
            {/* Top gold line */}
            <div style={{
              position: 'absolute', top: 0, insetInlineStart: 32, insetInlineEnd: 32, height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
            }} />

            {/* Brand mark inside the card */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 22 }}>
              <img src={ORCA_LOGO_SRC} alt="Orca Investment" width={72} height={72}
                style={{ width: 72, height: 72, objectFit: 'contain', filter: 'drop-shadow(0 12px 26px rgba(212,175,90,0.38))' }} />
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.22em', color: GOLD_BRIGHT, lineHeight: 1 }}>ORCA</div>
              <div style={{ fontSize: 8.5, color: TEXT_MUTED, letterSpacing: '0.36em', textTransform: 'uppercase', fontWeight: 600 }}>Investment</div>
            </div>

            <header style={{ marginBottom: 24 }}>
              <div style={{
                fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: '0.28em',
                textTransform: 'uppercase', marginBottom: 8,
              }}>
                {c.welcome}
              </div>
              <h1 style={{ fontSize: 22, margin: 0, fontWeight: 700, letterSpacing: '-0.01em', color: TEXT }}>
                {c.title}
              </h1>
              <p style={{ marginTop: 8, color: TEXT_MUTED, fontSize: 12.5, lineHeight: 1.6 }}>
                {c.sub}
              </p>
            </header>

            {/* Glow behind the button */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: '-14px -8px', borderRadius: 22, pointerEvents: 'none',
                background: 'radial-gradient(60% 100% at 50% 50%, rgba(212,175,90,0.22), transparent 70%)',
                filter: 'blur(6px)',
              }} />
              <button
                className="orca-google-btn"
                onClick={handleGoogle}
                disabled={busy}
                aria-busy={busy}
                style={{
                  position: 'relative',
                  width: '100%', minHeight: 54, padding: '15px 18px', borderRadius: 14,
                  border: `1px solid ${GOLD_DEEP}`,
                  background: 'linear-gradient(180deg, #ffffff 0%, #f5ecd6 100%)',
                  color: '#0a0a0a',
                  fontFamily: "'Poppins', system-ui, sans-serif",
                  fontWeight: 700, fontSize: 15, letterSpacing: '0.01em',
                  cursor: busy ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.9)',
                  opacity: busy ? 0.75 : 1,
                }}
              >
                {busy ? <Loader2 size={18} className="orca-spin" /> : <GoogleMark size={20} />}
                {busy ? c.connecting : c.continueGoogle}
              </button>
            </div>

            {failed && !busy && (
              <div role="alert" style={{
                marginTop: 14, padding: '10px 12px', borderRadius: 12,
                border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)',
                color: '#f7c5c5', fontSize: 12, lineHeight: 1.5,
              }}>
                {c.failed}
              </div>
            )}

            <div style={{ height: 1, background: BORDER_SOFT, margin: '18px 0' }} />

            <p style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 1.6, margin: 0 }}>
              {c.consentPrefix}{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer"
                style={{ color: GOLD_BRIGHT, fontWeight: 700, textDecoration: 'underline' }}>
                {c.consentTerms}
              </a>{' '}
              {c.consentAnd}{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer"
                style={{ color: GOLD_BRIGHT, fontWeight: 700, textDecoration: 'underline' }}>
                {c.consentPrivacy}
              </a>
            </p>
          </div>
        </section>
      </div>

      {idleGate && (
        <div
          onClick={() => { setIdleGate(false); try { window.history.replaceState({}, '', '/auth'); } catch { /* noop */ } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'radial-gradient(circle at 50% 40%, rgba(10,10,10,0.94), rgba(0,0,0,0.98))',
            backdropFilter: 'blur(14px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            direction: isRTL ? 'rtl' : 'ltr',
            cursor: 'pointer',
            animation: 'orca-idle-fadebg 0.35s ease forwards',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(440px, 92vw)', textAlign: 'center', padding: '40px 28px',
              background: `linear-gradient(180deg, ${INK_2} 0%, ${INK} 100%)`,
              border: `1px solid ${BORDER}`, borderRadius: 24,
              boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
              animation: 'orca-auth-rise 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            <img
              src={ORCA_LOGO_SRC}
              alt="Orca Investment"
              width={80}
              height={80}
              loading="eager"
              decoding="async"
              style={{ width: 80, height: 80, objectFit: 'contain', margin: '0 auto 14px', display: 'block', filter: 'drop-shadow(0 12px 28px rgba(212,175,90,0.4))' }}
            />
            <div style={{
              fontSize: 10, letterSpacing: '0.32em', color: GOLD,
              fontWeight: 700, textTransform: 'uppercase', marginBottom: 8,
            }}>
              {lang === 'he' ? 'הפלטפורמה ננעלה' : 'Session locked'}
            </div>
            <h2 style={{ fontSize: 22, margin: '0 0 10px', fontWeight: 700, letterSpacing: '-0.01em', color: TEXT }}>
              {lang === 'he' ? 'ברוך שובך ל-Orca Investment' : 'Welcome back to Orca Investment'}
            </h2>
            <p style={{ fontSize: 13, color: TEXT_MUTED, lineHeight: 1.7, margin: '0 0 24px' }}>
              {lang === 'he'
                ? 'לאבטחתך, ננעלה המערכת לאחר חוסר פעילות. לחץ להמשיך לכניסה לחשבון שלך.'
                : 'For your security, the session was locked after inactivity. Tap to continue and sign back in.'}
            </p>
            <button
              onClick={() => { setIdleGate(false); try { window.history.replaceState({}, '', '/auth'); } catch { /* noop */ } }}
              style={{
                width: '100%', padding: '14px 18px', borderRadius: 14,
                border: `1px solid ${GOLD_DEEP}`, cursor: 'pointer',
                background: `linear-gradient(135deg, ${GOLD_BRIGHT}, ${GOLD}, ${GOLD_DEEP})`,
                color: '#1a1300', fontSize: 15, fontWeight: 800,
                boxShadow: '0 14px 36px rgba(212,175,90,0.42), inset 0 1px 0 rgba(255,255,255,0.35)',
                fontFamily: "'Poppins', system-ui, sans-serif",
                letterSpacing: '0.04em', textTransform: 'uppercase',
              }}
            >
              {lang === 'he' ? 'המשך לכניסה →' : 'Continue to sign in →'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
