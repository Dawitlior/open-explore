import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Lock, Mail, User, Languages } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { evaluatePassword, isValidEmail, translateAuthError } from '@/lib/auth-utils';
import { toast } from 'sonner';

type Mode = 'sign-in' | 'sign-up';
type Lang = 'he' | 'en';

const LANG_KEY = 'orca:lang-cache';

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
  },
} as const;

function readLang(): Lang {
  if (typeof window === 'undefined') return 'he';
  try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'he'; } catch { return 'he'; }
}
function writeLang(l: Lang) {
  try { localStorage.setItem(LANG_KEY, l); } catch { /* noop */ }
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
  const [idleGate, setIdleGate] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('idle') === '1';
  });
  const c = COPY[lang];
  const isRTL = lang === 'he';

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

  if (!loading && session) return <Navigate to={redirectTo} replace />;

  const toggleLang = () => {
    const next: Lang = lang === 'he' ? 'en' : 'he';
    setLang(next);
    writeLang(next);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) { toast.error(c.invalidEmail); return; }
    if (mode === 'sign-up' && password.length < 6) { toast.error(c.weakPw); return; }
    setBusy(true);
    try {
      if (mode === 'sign-up') {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail, password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?verified=1`,
            data: { display_name: displayName.trim() || cleanEmail.split('@')[0] },
          },
        });
        if (error) throw error;
        toast.success(c.emailSent);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      toast.error(translateAuthError(err instanceof Error ? err.message : 'Unknown error'));
    } finally { setBusy(false); }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
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

  return (
    <main
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: '#06080f',
        color: '#e8eef9',
        fontFamily: "'Poppins', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
        padding: '24px 16px',
      }}
    >
      {/* Aurora background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(800px 600px at 18% 22%, rgba(56,189,248,0.18), transparent 60%),
          radial-gradient(700px 600px at 82% 78%, rgba(167,139,250,0.16), transparent 65%),
          radial-gradient(500px 400px at 50% 100%, rgba(6,214,160,0.10), transparent 70%)
        `,
      }} />
      {/* Mesh grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.05, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(125,160,220,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(125,160,220,0.5) 1px, transparent 1px)',
        backgroundSize: '56px 56px',
        maskImage: 'radial-gradient(ellipse at center, #000 35%, transparent 78%)',
      }} />

      {/* Top-right language toggle */}
      <button
        onClick={toggleLang}
        style={{
          position: 'absolute', top: 20, insetInlineEnd: 20, zIndex: 5,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 999,
          background: 'rgba(15,28,52,0.7)', border: '1px solid rgba(125,160,220,0.18)',
          color: '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          backdropFilter: 'blur(10px)',
        }}
      >
        <Languages size={14} />
        {lang === 'he' ? 'English' : 'עברית'}
      </button>

      <section
        style={{
          width: '100%', maxWidth: 440,
          background: 'linear-gradient(180deg, rgba(15,24,44,0.85), rgba(8,14,26,0.95))',
          border: '1px solid rgba(125,160,220,0.16)',
          borderRadius: 28,
          padding: 'clamp(24px, 4vw, 36px)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Top gradient line */}
        <div style={{
          position: 'absolute', top: 0, insetInlineStart: 24, insetInlineEnd: 24, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(56,189,248,0.7), transparent)',
        }} />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, direction: 'ltr', justifyContent: 'center' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'linear-gradient(135deg, #38bdf8, #a78bfa)',
            display: 'grid', placeItems: 'center',
            boxShadow: '0 10px 28px rgba(56,189,248,0.35)',
            fontSize: 22,
          }}>🐋</div>
          <div style={{ textAlign: 'start' }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1 }}>
              Orca<span style={{ color: '#38bdf8' }}>Investment</span>
            </div>
            <div style={{ fontSize: 9, color: '#6b7c99', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>
              {c.tagline}
            </div>
          </div>
        </div>

        <header style={{ marginBottom: 22, textAlign: 'center' }}>
          <div style={{
            fontSize: 10, color: '#38bdf8', fontWeight: 800, letterSpacing: '0.24em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            {mode === 'sign-in' ? c.welcomeBack : c.getStarted}
          </div>
          <h1 style={{ fontSize: 22, margin: 0, fontWeight: 800, letterSpacing: '-0.01em' }}>
            {mode === 'sign-in' ? c.signIn : c.signUp}
          </h1>
          <p style={{ marginTop: 6, color: '#7a8aa3', fontSize: 12 }}>
            {mode === 'sign-in' ? c.signInSub : c.signUpSub}
          </p>
        </header>

        <button
          onClick={handleGoogle}
          disabled={busy}
          style={{
            width: '100%', padding: '13px 16px', borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.97)', color: '#0f172a',
            fontWeight: 600, fontSize: 14, cursor: busy ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            opacity: busy ? 0.6 : 1, transition: 'transform .15s, box-shadow .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.35)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.4 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z"/></svg>
          {c.continueGoogle}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(125,160,220,0.15)' }} />
          <span style={{ color: '#5d7090', fontSize: 11, letterSpacing: '0.2em' }}>{c.or}</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(125,160,220,0.15)' }} />
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
                background: 'none', border: 'none', color: '#90a3c0', cursor: 'pointer',
                padding: 6, display: 'inline-flex', alignItems: 'center',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </IconInput>

          {mode === 'sign-up' && password.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} dir="ltr">
              <div style={{ flex: 1, height: 4, background: 'rgba(125,160,220,0.12)', borderRadius: 999, overflow: 'hidden' }}>
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

          <button type="submit" disabled={busy}
            style={{
              marginTop: 6, padding: '14px 16px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #38bdf8, #818cf8)',
              color: '#001023', fontWeight: 800, fontSize: 14, letterSpacing: '0.02em',
              cursor: busy ? 'wait' : 'pointer',
              boxShadow: '0 12px 28px rgba(56,189,248,0.32)',
              opacity: busy ? 0.65 : 1,
              transition: 'transform .15s, box-shadow .15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (!busy) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 16px 34px rgba(56,189,248,0.45)'; } }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(56,189,248,0.32)'; }}
          >
            {busy ? '…' : (mode === 'sign-in' ? c.submitSignIn : c.submitSignUp)}
            {!busy && <ArrowRight size={15} style={{ transform: isRTL ? 'scaleX(-1)' : undefined }} />}
          </button>

          {mode === 'sign-in' && (
            <button type="button" onClick={handleForgotPassword} disabled={busy}
              style={{ background: 'none', border: 'none', color: '#90a3c0', cursor: 'pointer', fontSize: 12, padding: 4, marginTop: 2 }}>
              {c.forgot}
            </button>
          )}
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: '#90a3c0' }}>
          {mode === 'sign-in' ? c.noAccount : c.haveAccount}{' '}
          <button type="button"
            onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setPassword(''); }}
            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: 700 }}>
            {mode === 'sign-in' ? c.signUpCta : c.signInCta}
          </button>
        </p>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid rgba(125,160,220,0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#5d7090', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            🔒 {c.secured}
          </div>
        </div>
      </section>
    </main>
  );
}

const baseInput: React.CSSProperties = {
  flex: 1,
  padding: '12px 4px',
  border: 'none',
  background: 'transparent',
  color: '#e8eef9',
  fontSize: 14,
  outline: 'none',
  fontFamily: "'IBM Plex Mono', monospace",
  minWidth: 0,
};

const IconInput = ({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '2px 14px', borderRadius: 14,
    border: '1px solid rgba(125,160,220,0.2)',
    background: 'rgba(8,14,26,0.6)',
    transition: 'border-color .15s, background .15s',
  }}>
    <span style={{ color: '#7a8aa3', display: 'inline-flex' }}>{icon}</span>
    {children}
  </div>
);
