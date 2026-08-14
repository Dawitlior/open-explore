import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Languages, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useAuth } from '@/hooks/use-auth';
import { translateAuthError } from '@/lib/auth-utils';
import { toast } from 'sonner';

// ─── Deep navy / cyan terminal palette ───
const DEEP      = '#0B0E14';
const DEEP_2    = '#0F131C';
const DEEP_3    = '#131925';
const CYAN      = '#4DD0E1';
const CYAN_GLOW = 'rgba(77,208,225,0.35)';
const CYAN_SOFT = 'rgba(77,208,225,0.12)';
const WHITE     = '#F0F5FA';
const WHITE_70  = 'rgba(240,245,250,0.70)';
const WHITE_40  = 'rgba(240,245,250,0.40)';
const WHITE_10  = 'rgba(240,245,250,0.10)';
const WHITE_06  = 'rgba(240,245,250,0.06)';
const RED       = '#E57373';

const COPY = {
  he: {
    brand: 'Orca Investment',
    terminal: 'TRADING INTELLIGENCE TERMINAL',
    access: 'כניסה למערכת',
    continueGoogle: 'המשך/י עם Google',
    connecting: 'מתחבר…',
    retry: 'נסה/י שוב',
    failed: 'ההתחברות ל-Google נכשלה. נסה/י שוב.',
    consentPrefix: 'בכניסה אני מאשר/ת את',
    consentTerms: 'תנאי השימוש',
    consentAnd: 'ואת',
    consentPrivacy: 'מדיניות הפרטיות',
    locked: 'הפלטפורמה ננעלה',
    welcomeBack: 'ברוך שובך ל-Orca Investment',
    lockBody: 'לאבטחתך, ננעלה המערכת לאחר חוסר פעילות. לחץ להמשיך לכניסה לחשבון שלך.',
    lockCta: 'המשך לכניסה →',
    fca: 'Authorised and Regulated by Financial Conduct Authority.',
  },
  en: {
    brand: 'Orca Investment',
    terminal: 'TRADING INTELLIGENCE TERMINAL',
    access: 'Access Platform',
    continueGoogle: 'Continue with Google',
    connecting: 'Connecting…',
    retry: 'Try again',
    failed: 'Google sign-in failed. Please try again.',
    consentPrefix: 'By continuing you agree to the',
    consentTerms: 'Terms of Service',
    consentAnd: 'and the',
    consentPrivacy: 'Privacy Policy',
    locked: 'Session locked',
    welcomeBack: 'Welcome back to Orca Investment',
    lockBody: 'For your security, the session was locked after inactivity. Tap to continue and sign back in.',
    lockCta: 'Continue to sign in →',
    fca: 'Authorised and Regulated by Financial Conduct Authority.',
  },
} as const;

const GoogleMark = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.4 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z" />
  </svg>
);

const WireframeOrca = ({ size = 120 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 200 140" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="orca-wire" x1="0" y1="0" x2="200" y2="140" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor={CYAN} />
        <stop offset="100%" stopColor="#26C6DA" />
      </linearGradient>
      <filter id="orca-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
    <g stroke="url(#orca-wire)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#orca-glow)" fill="none">
      <path d="M26 84 L44 62 L58 80 L78 56 L102 76 L126 48 L150 68 L176 58" />
      <path d="M44 62 L54 44 L72 60 L90 38 L112 58 L132 32 L154 50 L176 34" />
      <path d="M58 80 L54 104 L78 96 L90 116 L112 96 L130 110 L150 92 L176 98" />
      <path d="M26 84 L20 110 L42 108 L54 104" />
      <path d="M176 58 L190 44 L190 76 L176 98" />
      <path d="M102 76 L90 94 L112 96" />
      <path d="M126 48 L120 66 L150 68" />
      <path d="M78 56 L84 78 L58 80" />
      <path d="M54 44 L68 34 L90 38" />
      <path d="M132 32 L148 22 L176 34" />
    </g>
  </svg>
);

const ChartBackground = () => (
  <svg
    className="auth-chart-bg"
    preserveAspectRatio="xMidYMid slice"
    aria-hidden="true"
    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.16, pointerEvents: 'none' }}
  >
    <defs>
      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={CYAN} stopOpacity="0.5" />
        <stop offset="100%" stopColor={CYAN} stopOpacity="0" />
      </linearGradient>
    </defs>
    {/* grid */}
    {Array.from({ length: 12 }).map((_, i) => (
      <line key={`h-${i}`} x1="0" y1={`${i * 8 + 6}%`} x2="100%" y2={`${i * 8 + 6}%`} stroke={WHITE_10} strokeWidth="0.5" />
    ))}
    {Array.from({ length: 16 }).map((_, i) => (
      <line key={`v-${i}`} x1={`${i * 6 + 5}%`} y1="0" x2={`${i * 6 + 5}%`} y2="100%" stroke={WHITE_10} strokeWidth="0.5" />
    ))}
    {/* area under curve */}
    <path d="M0 85% Q 10% 70%, 20% 78% T 35% 65% T 50% 72% T 65% 55% T 80% 60% T 100% 45% V 100% H 0 Z" fill="url(#chartGrad)" opacity="0.35" />
    {/* candles */}
    {[12, 22, 31, 42, 52, 63, 74, 83, 93].map((x, i) => {
      const open = 60 + Math.sin(i * 1.3) * 12;
      const close = open + (i % 3 === 0 ? -8 : i % 3 === 1 ? 5 : 10);
      const high = Math.min(open, close) - 6;
      const low = Math.max(open, close) + 6;
      const isUp = close > open;
      const y = (v: number) => `${v}%`;
      return (
        <g key={i}>
          <line x1={`${x}%`} y1={y(high)} x2={`${x}%`} y2={y(low)} stroke={WHITE_70} strokeWidth="0.6" />
          <rect
            x={`${x - 1.4}%`} y={y(Math.min(open, close))}
            width="2.8%" height={`${Math.abs(close - open)}%`}
            rx="1" fill={isUp ? CYAN : RED} fillOpacity="0.75"
          />
        </g>
      );
    })}
  </svg>
);

const LANG_KEY = 'orca:lang-cache';
const AUTH_LANG_OVERRIDE_KEY = 'orca:auth-lang-override';
const PENDING_CONSENT_KEY = 'orca:pending-consent';
const CONSENT_VERSION = 'v1.2_telemetry_indie';

type Lang = 'he' | 'en';

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

  useEffect(() => {
    document.title = `${c.access} · ${c.brand}`;
  }, [lang, c]);

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const search = new URLSearchParams(window.location.search);
    const error = hash.get('error_description') || search.get('error_description');
    if (error) { toast.error(translateAuthError(decodeURIComponent(error))); setFailed(true); }
  }, []);

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
        return;
      }
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: { prompt: 'select_account' },
      });
      if (result?.error) throw result.error;
      if (result?.redirected) return;
    } catch (err) {
      toast.error(translateAuthError(err instanceof Error ? err.message : c.failed));
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <main
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100dvh',
        background: DEEP,
        color: WHITE,
        fontFamily: "'Poppins', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(20px, env(safe-area-inset-top)) max(20px, env(safe-area-inset-right)) max(20px, env(safe-area-inset-bottom)) max(20px, env(safe-area-inset-left))',
      }}
    >
      <style>{`
        @keyframes auth-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-1%, 1%) scale(1.02); }
        }
        @keyframes auth-pulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.85; }
        }
        @keyframes auth-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes auth-spin {
          to { transform: rotate(360deg); }
        }
        .auth-orca-line { stroke-dasharray: 320; stroke-dashoffset: 320; animation: auth-draw 2.2s ease forwards; }
        @keyframes auth-draw {
          to { stroke-dashoffset: 0; }
        }
        .auth-access-btn {
          transition: transform .18s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease;
        }
        .auth-access-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 0 40px ${CYAN_GLOW}, inset 0 0 20px rgba(77,208,225,0.10);
          border-color: CYAN;
        }
        .auth-access-btn:active:not(:disabled) { transform: translateY(0); }
        .auth-spin { animation: auth-spin 0.9s linear infinite; }
        .auth-chart-bg { animation: auth-drift 20s ease-in-out infinite; }
      `}</style>

      {/* Background layers */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(circle at 50% 0%, rgba(77,208,225,0.08), transparent 55%),
          radial-gradient(circle at 80% 90%, rgba(38,198,218,0.05), transparent 45%)
        `,
        pointerEvents: 'none',
      }} />
      <ChartBackground />
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(${WHITE_06} 1px, transparent 1px), linear-gradient(90deg, ${WHITE_06} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
        opacity: 0.5,
        maskImage: 'radial-gradient(ellipse at center, #000 20%, transparent 80%)',
        pointerEvents: 'none',
      }} />

      {/* Top-right language toggle */}
      <button
        onClick={toggleLang}
        className="auth-access-btn"
        style={{
          position: 'absolute', top: 'max(20px, env(safe-area-inset-top))', insetInlineEnd: 20, zIndex: 5,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 999,
          background: DEEP_3, border: `1px solid ${WHITE_10}`,
          color: WHITE, cursor: 'pointer', fontSize: 12, fontWeight: 600,
          backdropFilter: 'blur(10px)',
        }}
      >
        <Languages size={14} />
        {lang === 'he' ? 'English' : 'עברית'}
      </button>

      {/* Center card */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          width: 'min(420px, 92vw)',
          textAlign: 'center',
          animation: 'auth-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              position: 'absolute', inset: '-30% -30%',
              background: `radial-gradient(circle, ${CYAN_GLOW}, transparent 70%)`,
              filter: 'blur(20px)', opacity: 0.6,
            }} />
            <WireframeOrca size={isRTL ? 110 : 120} />
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 10px', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: WHITE,
          fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
        }}>
          {c.brand}
        </h1>

        {/* Subtitle */}
        <div style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: 10, letterSpacing: '0.32em', color: WHITE_40, textTransform: 'uppercase',
          marginBottom: 36,
        }}>
          {c.terminal}
        </div>

        {/* Access button */}
        <button
          onClick={handleGoogle}
          disabled={busy}
          aria-busy={busy}
          className="auth-access-btn"
          style={{
            position: 'relative',
            width: 'min(280px, 80%)', minHeight: 52,
            padding: '14px 28px', borderRadius: 999,
            border: `1px solid ${CYAN}`,
            background: `linear-gradient(180deg, rgba(77,208,225,0.10) 0%, rgba(77,208,225,0.02) 100%)`,
            color: WHITE, cursor: busy ? 'wait' : 'pointer',
            fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
            fontSize: 13, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: `0 0 0 1px ${CYAN_SOFT}, 0 12px 40px rgba(0,0,0,0.35)`,
            backdropFilter: 'blur(10px)',
            opacity: busy ? 0.75 : 1,
            marginBottom: 24,
          }}
        >
          {busy ? <Loader2 size={18} className="auth-spin" /> : <GoogleMark size={18} />}
          {busy ? c.connecting : c.access}
        </button>

        {failed && !busy && (
          <div role="alert" style={{
            margin: '0 auto 18px', maxWidth: 360,
            padding: '10px 12px', borderRadius: 12,
            border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.08)',
            color: '#f7c5c5', fontSize: 12, lineHeight: 1.5,
          }}>
            {c.failed}
          </div>
        )}

        {/* Consent */}
        <p style={{
          fontSize: 10.5, color: WHITE_40, lineHeight: 1.6, margin: '0 auto 16px', maxWidth: 340,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}>
          {c.consentPrefix}{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: WHITE_70, fontWeight: 600, textDecoration: 'underline' }}>
            {c.consentTerms}
          </a>{' '}
          {c.consentAnd}{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: WHITE_70, fontWeight: 600, textDecoration: 'underline' }}>
            {c.consentPrivacy}
          </a>
        </p>

        {/* FCA footer */}
        <div style={{
          fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
          fontSize: 9, letterSpacing: '0.05em', color: WHITE_40,
        }}>
          {c.fca}
        </div>
      </div>

      {/* Idle lock modal */}
      {idleGate && (
        <div
          onClick={() => { setIdleGate(false); try { window.history.replaceState({}, '', '/auth'); } catch { /* noop */ } }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(11,14,20,0.96)',
            backdropFilter: 'blur(18px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            direction: isRTL ? 'rtl' : 'ltr',
            cursor: 'pointer',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 'min(400px, 90vw)', textAlign: 'center', padding: '44px 32px',
              background: `linear-gradient(180deg, ${DEEP_2} 0%, ${DEEP} 100%)`,
              border: `1px solid ${WHITE_10}`, borderRadius: 26,
              boxShadow: `0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px ${CYAN_SOFT}`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <WireframeOrca size={72} />
            </div>
            <div style={{
              fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
              fontSize: 10, letterSpacing: '0.28em', color: CYAN,
              fontWeight: 700, textTransform: 'uppercase', marginBottom: 10,
            }}>
              {c.locked}
            </div>
            <h2 style={{ fontSize: 20, margin: '0 0 10px', fontWeight: 700, letterSpacing: '-0.01em', color: WHITE }}>
              {c.welcomeBack}
            </h2>
            <p style={{ fontSize: 13, color: WHITE_70, lineHeight: 1.7, margin: '0 0 26px' }}>
              {c.lockBody}
            </p>
            <button
              onClick={() => { setIdleGate(false); try { window.history.replaceState({}, '', '/auth'); } catch { /* noop */ } }}
              className="auth-access-btn"
              style={{
                width: '100%', padding: '14px 18px', borderRadius: 999,
                border: `1px solid ${CYAN}`, cursor: 'pointer',
                background: `linear-gradient(180deg, rgba(77,208,225,0.15) 0%, rgba(77,208,225,0.03) 100%)`,
                color: WHITE, fontSize: 13, fontWeight: 700,
                boxShadow: `0 0 30px ${CYAN_GLOW}`,
                fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}
            >
              {c.lockCta}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
