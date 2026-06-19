import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Lock, Mail, User, Languages, ShieldCheck, Sparkles, LineChart, Database } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { evaluatePassword, isValidEmail, translateAuthError } from '@/lib/auth-utils';
import { toast } from 'sonner';

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

type Mode = 'sign-in' | 'sign-up';
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
    tagline: 'טרמינל מסחר חכם · ניהול סיכון · תובנות AI',
    welcomeBack: 'ברוך/ה הבא/ה',
    getStarted: 'הצטרפות',
    signIn: 'התחברות לחשבון',
    signUp: 'יצירת חשבון חדש',
    signInSub: 'המשך/י לטרמינל המסחר שלך',
    signUpSub: 'הצטרף/י לקהילת OrcaInvestment',
    continueGoogle: 'המשך/י עם Google',
    or: 'או',
    displayName: 'שם תצוגה',
    email: 'אימייל',
    password: 'סיסמה',
    passwordHint: 'סיסמה (לפחות 6 תווים)',
    submitSignIn: 'כניסה לפלטפורמה',
    submitSignUp: 'יצירת חשבון',
    forgot: 'שכחת סיסמה?',
    noAccount: 'אין לך חשבון?',
    haveAccount: 'כבר רשום/ה?',
    signUpCta: 'הרשמה',
    signInCta: 'התחברות',
    secured: 'מאובטח · תשתית ענן ברמה מוסדית',
    feature1: 'מנוע R-Multiples וציפיות חיות',
    feature2: '4 שכבות הגנת סיכון',
    feature3: 'תובנות AI מהמסחר שלך',
    feature4: 'אחסון מוצפן פר-משתמש',
    invalidEmail: 'כתובת האימייל לא תקינה',
    weakPw: 'הסיסמה חייבת להכיל לפחות 6 תווים',
    emailSent: 'בדוק/י את האימייל לאישור החשבון',
    resetSent: 'שלחנו לך קישור לאיפוס הסיסמה',
    needEmail: 'הכנס/י אימייל תקין כדי לאפס סיסמה',
    notReg: 'כתובת אימייל זו לא רשומה במערכת',
    verified: 'האימייל אושר — אפשר להתחבר עכשיו',
    consentPrefix: 'אני מאשר/ת את',
    consentTerms: 'תנאי השימוש',
    consentAnd: 'ואת',
    consentPrivacy: 'מדיניות הפרטיות',
    consentRequired: 'יש לאשר את תנאי השימוש ומדיניות הפרטיות כדי להמשיך',
    typewriter: [
      'תוחלת אמיתית במכפלות R.',
      'ארבע שכבות הגנת סיכון.',
      'תובנות AI מהמסחר שלך.',
      'יומן מסחר בילינגוואלי מלא.',
    ],
    poweredBy: 'מופעל ע״י Orca Cloud',
  },
  en: {
    brand: 'OrcaInvestment',
    tagline: 'Smart trading terminal · Risk engine · AI insights',
    welcomeBack: 'Welcome back',
    getStarted: 'Get started',
    signIn: 'Sign in to your account',
    signUp: 'Create a new account',
    signInSub: 'Continue to your trading terminal',
    signUpSub: 'Join the OrcaInvestment community',
    continueGoogle: 'Continue with Google',
    or: 'or',
    displayName: 'Display name',
    email: 'Email',
    password: 'Password',
    passwordHint: 'Password (at least 6 characters)',
    submitSignIn: 'Sign in',
    submitSignUp: 'Create account',
    forgot: 'Forgot password?',
    noAccount: "Don't have an account?",
    haveAccount: 'Already registered?',
    signUpCta: 'Sign up',
    signInCta: 'Sign in',
    secured: 'Secured · institution-grade cloud infrastructure',
    feature1: 'Live R-multiples & expectancy engine',
    feature2: '4-tier risk limits',
    feature3: 'AI insights from your own trades',
    feature4: 'Encrypted per-user cloud storage',
    invalidEmail: 'Invalid email address',
    weakPw: 'Password must be at least 6 characters',
    emailSent: 'Check your email to verify your account',
    resetSent: 'We sent you a password reset link',
    needEmail: 'Enter a valid email to reset your password',
    notReg: 'This email is not registered',
    verified: 'Email verified — you can sign in now',
    consentPrefix: 'I agree to the',
    consentTerms: 'Terms of Service',
    consentAnd: 'and the',
    consentPrivacy: 'Privacy Policy',
    consentRequired: 'You must agree to the Terms of Service and Privacy Policy to continue',
    typewriter: [
      'Real expectancy in R-multiples.',
      'Four-tier risk protection.',
      'AI insights from your own trades.',
      'Fully bilingual trading journal.',
    ],
    poweredBy: 'Powered by Orca Cloud',
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

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const [lang, setLang] = useState<Lang>(() => readLang());
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [idleGate, setIdleGate] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('idle') === '1';
  });
  const c = COPY[lang];
  const isRTL = lang === 'he';
  const typed = useTypewriter(c.typewriter);

  useEffect(() => {
    document.title = `${mode === 'sign-in' ? c.signIn : c.signUp} · ${c.brand}`;
  }, [mode, lang, c]);

  const strength = useMemo(() => evaluatePassword(password), [password]);
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const search = new URLSearchParams(window.location.search);
    const error = hash.get('error_description') || search.get('error_description');
    if (error) toast.error(translateAuthError(decodeURIComponent(error)));
    if (search.get('verified') === '1') toast.success(c.verified);
  }, []); // eslint-disable-line

  // After OAuth redirect lands back with a session, flush any pending consent record.
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!consent) { toast.error(c.consentRequired); return; }
    if (!isValidEmail(cleanEmail)) { toast.error(c.invalidEmail); return; }
    if (mode === 'sign-up' && password.length < 6) { toast.error(c.weakPw); return; }
    setBusy(true);
    try {
      if (mode === 'sign-up') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?verified=1`,
            data: { display_name: displayName.trim() || cleanEmail.split('@')[0] },
          },
        });
        if (error) throw error;
        if (data.user?.id && data.session) await logConsent(data.user.id);
        else try { localStorage.setItem(PENDING_CONSENT_KEY, '1'); } catch { /* noop */ }
        toast.success(c.emailSent);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        if (data.user?.id) await logConsent(data.user.id);
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      toast.error(translateAuthError(err instanceof Error ? err.message : 'Unknown error'));
    } finally { setBusy(false); }
  };

  const handleGoogle = async () => {
    if (!consent) { toast.error(c.consentRequired); return; }
    setBusy(true);
    writeLang(lang);
    writeAuthLangIntent(lang);
    try {
      try { localStorage.setItem(PENDING_CONSENT_KEY, '1'); } catch { /* noop */ }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth`, queryParams: { prompt: 'select_account' } },
      });
      if (error) throw error;
    } catch (err) {
      toast.error(translateAuthError(err instanceof Error ? err.message : 'Google sign-in failed'));
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) { toast.error(c.needEmail); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-password-reset', {
        body: { email: cleanEmail, redirectTo: `${window.location.origin}/reset-password` },
      });
      if (error || !data?.ok) {
        const code = data?.error;
        if (code === 'not_registered') { toast.error(c.notReg); return; }
        if (code === 'invalid_email') { toast.error(c.invalidEmail); return; }
        throw new Error(code || error?.message || 'reset_failed');
      }
      toast.success(c.resetSent);
    } catch (err) {
      toast.error(translateAuthError(err instanceof Error ? err.message : 'Password reset failed'));
    } finally { setBusy(false); }
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
      <style>{`
        @keyframes orca-idle-fadebg { from { opacity: 0; } to { opacity: 1; } }
        @keyframes orca-auth-rise { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orca-caret-blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes orca-aurora-drift { 0% { transform: translate(0,0); } 50% { transform: translate(-2%, 2%); } 100% { transform: translate(0,0); } }
        .orca-caret { display:inline-block; width:2px; height:0.95em; background:${GOLD_BRIGHT}; margin-inline-start:4px; vertical-align:-2px; animation: orca-caret-blink 1s steps(1) infinite; box-shadow: 0 0 8px rgba(240,215,140,0.6); }
        .orca-auth-grid { display:grid; grid-template-columns: 1fr; min-height:100dvh; }
        @media (min-width: 980px) { .orca-auth-grid { grid-template-columns: 1.05fr 1fr; } }
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
          position: 'absolute', top: 20, insetInlineEnd: 20, zIndex: 5,
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
            justifyContent: 'space-between',
            background: `
              linear-gradient(${isRTL ? '270deg' : '90deg'}, ${INK_3} 0%, ${INK_2} 60%, ${INK} 100%)
            `,
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
            <div style={{
              fontSize: 10, letterSpacing: '0.32em', color: GOLD, fontWeight: 700,
              textTransform: 'uppercase',
            }}>
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

          {/* Footer signature */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 10, color: TEXT_MUTED, letterSpacing: '0.22em', textTransform: 'uppercase',
          }}>
            <span>🔒 {c.secured}</span>
            <span>{c.poweredBy}</span>
          </div>
        </aside>

        {/* ── RIGHT COLUMN — Form ── */}
        <section style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'clamp(20px, 4vw, 48px)',
          position: 'relative', zIndex: 1,
        }}>
          <div
            style={{
              width: '100%', maxWidth: 440,
              background: `linear-gradient(180deg, ${INK_2} 0%, ${INK} 100%)`,
              border: `1px solid ${BORDER}`,
              borderRadius: 24,
              padding: 'clamp(24px, 4vw, 36px)',
              boxShadow: '0 30px 90px rgba(0,0,0,0.7), inset 0 1px 0 rgba(240,215,140,0.08)',
              backdropFilter: 'blur(20px)',
              position: 'relative',
            }}
          >
            {/* Top gold line */}
            <div style={{
              position: 'absolute', top: 0, insetInlineStart: 32, insetInlineEnd: 32, height: 1,
              background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
            }} />

            {/* Mobile-only brand strip (the left column is hidden under 980px) */}
            <div className="orca-auth-mobilebrand" style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 18,
            }}>
              <style>{`@media (min-width: 980px) { .orca-auth-mobilebrand { display: none !important; } }`}</style>
              <img src={ORCA_LOGO_SRC} alt="Orca Investment" width={64} height={64}
                style={{ width: 64, height: 64, objectFit: 'contain', filter: 'drop-shadow(0 10px 22px rgba(212,175,90,0.35))' }} />
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.22em', color: GOLD_BRIGHT, lineHeight: 1 }}>ORCA</div>
              <div style={{ fontSize: 8.5, color: TEXT_MUTED, letterSpacing: '0.36em', textTransform: 'uppercase', fontWeight: 600 }}>Investment</div>
            </div>

            {/* Segmented mode tabs */}
            <div
              role="tablist"
              aria-label={isRTL ? 'מצב חשבון' : 'Account mode'}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4,
                background: 'rgba(5,5,5,0.6)', border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: 4, marginBottom: 18,
              }}
            >
              {(['sign-in', 'sign-up'] as Mode[]).map(m => {
                const active = mode === m;
                const label = m === 'sign-in' ? c.signInCta : c.signUpCta;
                return (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => { if (mode !== m) { setMode(m); setPassword(''); } }}
                    style={{
                      padding: '10px 12px', borderRadius: 9,
                      border: 'none', cursor: 'pointer',
                      fontWeight: 700, fontSize: 13, letterSpacing: '0.04em',
                      background: active
                        ? `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD} 100%)`
                        : 'transparent',
                      color: active ? '#1a1300' : TEXT_MUTED,
                      transition: 'background .2s, color .2s',
                    }}
                  >{label}</button>
                );
              })}
            </div>

            <header style={{ marginBottom: 18, textAlign: 'center' }}>
              <div style={{
                fontSize: 10, color: GOLD, fontWeight: 700, letterSpacing: '0.28em',
                textTransform: 'uppercase', marginBottom: 6,
              }}>
                {mode === 'sign-in' ? c.welcomeBack : c.getStarted}
              </div>
              <h1 style={{ fontSize: 20, margin: 0, fontWeight: 700, letterSpacing: '-0.01em', color: TEXT }}>
                {mode === 'sign-in' ? c.signIn : c.signUp}
              </h1>
              <p style={{ marginTop: 5, color: TEXT_MUTED, fontSize: 12 }}>
                {mode === 'sign-in' ? c.signInSub : c.signUpSub}
              </p>
            </header>

            <button
              onClick={handleGoogle}
              disabled={busy || !consent}
              title={!consent ? c.consentRequired : undefined}
              style={{
                width: '100%', padding: '13px 16px', borderRadius: 12,
                border: `1px solid ${BORDER}`,
                background: 'rgba(245,236,214,0.97)', color: '#0a0a0a',
                fontWeight: 600, fontSize: 14, cursor: busy ? 'wait' : (!consent ? 'not-allowed' : 'pointer'),
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                opacity: (busy || !consent) ? 0.5 : 1, transition: 'transform .15s, box-shadow .15s',
              }}
              onMouseEnter={e => { if (consent && !busy) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 12px 28px rgba(212,175,90,0.25)`; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.4 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z"/></svg>
              {c.continueGoogle}
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
              <div style={{ flex: 1, height: 1, background: BORDER_SOFT }} />
              <span style={{ color: TEXT_MUTED, fontSize: 11, letterSpacing: '0.24em' }}>{c.or}</span>
              <div style={{ flex: 1, height: 1, background: BORDER_SOFT }} />
            </div>

            <form onSubmit={handleEmailSubmit} style={{ display: 'grid', gap: 10 }}>
              {mode === 'sign-up' && (
                <IconInput icon={<User size={16} />}>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                    placeholder={c.displayName} autoComplete="name" style={baseInput} />
                </IconInput>
              )}
              <IconInput icon={<Mail size={16} />}>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder={c.email} autoComplete="email" dir="ltr" style={baseInput} />
              </IconInput>

              <IconInput icon={<Lock size={16} />}>
                <input
                  type={showPassword ? 'text' : 'password'} required minLength={6}
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'sign-up' ? c.passwordHint : c.password}
                  autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                  dir="ltr" style={baseInput}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{
                    background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer',
                    padding: 6, display: 'inline-flex', alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </IconInput>

              {mode === 'sign-up' && password.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} dir="ltr">
                  <div style={{ flex: 1, height: 4, background: 'rgba(212,175,90,0.12)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(strength.score / 4) * 100}%`, height: '100%',
                      background: strength.color, transition: 'width .25s ease, background .25s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: strength.color, fontFamily: "'IBM Plex Mono', monospace", minWidth: 70, textAlign: 'right' }}>
                    {strength.label}
                  </span>
                </div>
              )}

              <button type="submit" disabled={busy || !consent} title={!consent ? c.consentRequired : undefined}
                style={{
                  marginTop: 8, padding: '14px 16px', borderRadius: 12, border: `1px solid ${GOLD_DEEP}`,
                  background: `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD} 50%, ${GOLD_DEEP} 100%)`,
                  color: '#1a1300', fontWeight: 800, fontSize: 14, letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  cursor: busy ? 'wait' : 'pointer',
                  boxShadow: '0 12px 28px rgba(212,175,90,0.32), inset 0 1px 0 rgba(255,255,255,0.35)',
                  opacity: busy ? 0.65 : 1,
                  transition: 'transform .15s, box-shadow .15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (!busy) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 16px 36px rgba(212,175,90,0.45), inset 0 1px 0 rgba(255,255,255,0.4)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(212,175,90,0.32), inset 0 1px 0 rgba(255,255,255,0.35)'; }}
              >
                {busy ? '…' : (mode === 'sign-in' ? c.submitSignIn : c.submitSignUp)}
                {!busy && <ArrowRight size={15} style={{ transform: isRTL ? 'scaleX(-1)' : undefined }} />}
              </button>

              {mode === 'sign-in' && (
                <button type="button" onClick={handleForgotPassword} disabled={busy}
                  style={{ background: 'none', border: 'none', color: TEXT_MUTED, cursor: 'pointer', fontSize: 12, padding: 4, marginTop: 2 }}>
                  {c.forgot}
                </button>
              )}
            </form>

            {/* Slim consent row */}
            <label
              htmlFor="orca-consent"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginTop: 14, padding: '8px 4px',
                cursor: 'pointer',
                textAlign: isRTL ? 'right' : 'left',
              }}
            >
              <input
                id="orca-consent"
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                style={{ width: 14, height: 14, accentColor: GOLD, cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{ fontSize: 11, color: TEXT_MUTED, lineHeight: 1.5 }}>
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
              </span>
            </label>

            <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${BORDER_SOFT}`, textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: TEXT_MUTED, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                🔒 {c.secured}
              </div>
            </div>
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
                ? 'לאבטחתך, ננעלת המערכת לאחר חוסר פעילות. לחץ להמשיך לכניסה לחשבון שלך.'
                : "For your security, the session was locked after inactivity. Tap to continue and sign back in."}
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

const baseInput: React.CSSProperties = {
  flex: 1,
  padding: '12px 4px',
  border: 'none',
  background: 'transparent',
  color: TEXT,
  fontSize: 14,
  outline: 'none',
  fontFamily: "'IBM Plex Mono', monospace",
  minWidth: 0,
};

const IconInput = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '2px 14px', borderRadius: 12,
    border: `1px solid ${BORDER}`,
    background: 'rgba(5,5,5,0.65)',
    transition: 'border-color .15s, background .15s',
  }}>
    <span style={{ color: GOLD, display: 'inline-flex' }}>{icon}</span>
    {children}
  </div>
);
