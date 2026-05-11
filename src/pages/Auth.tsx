import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { useAuth } from '@/hooks/use-auth';
import { evaluatePassword, isValidEmail, PASSWORD_REQUIREMENTS, translateAuthError } from '@/lib/auth-utils';
import { toast } from 'sonner';

type Mode = 'sign-in' | 'sign-up';

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = mode === 'sign-in' ? 'Sign in · Orca' : 'Create account · Orca';
  }, [mode]);

  const strength = useMemo(() => evaluatePassword(password), [password]);
  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const search = new URLSearchParams(window.location.search);
    const error = hash.get('error_description') || search.get('error_description');
    if (error) toast.error(translateAuthError(decodeURIComponent(error)));
    if (search.get('verified') === '1') toast.success('האימייל אושר — אפשר להתחבר עכשיו');
  }, []);

  if (!loading && session) return <Navigate to={redirectTo} replace />;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      toast.error('כתובת האימייל לא תקינה');
      return;
    }
    if (mode === 'sign-up' && strength.score < 4) {
      toast.error(PASSWORD_REQUIREMENTS);
      return;
    }
    setBusy(true);
    try {
      if (mode === 'sign-up') {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?verified=1`,
            data: { display_name: displayName.trim() || cleanEmail.split('@')[0] },
          },
        });
        if (error) throw error;
        toast.success('בדוק/י את האימייל לאישור החשבון');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        navigate(redirectTo, { replace: true });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(translateAuthError(msg));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
        extraParams: { prompt: 'select_account' },
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      navigate(redirectTo, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign-in failed';
      toast.error(translateAuthError(msg));
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      toast.error('הכנס/י אימייל תקין כדי לאפס סיסמה');
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('שלחנו לך קישור לאיפוס הסיסמה');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Password reset failed';
      toast.error(translateAuthError(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      dir="rtl"
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'radial-gradient(1200px 600px at 50% -10%, rgba(56,189,248,0.12), transparent 60%), #061326',
        color: '#e8eef9',
        fontFamily: "'Poppins', system-ui, sans-serif",
        padding: 24,
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'linear-gradient(180deg, rgba(13,28,50,0.85), rgba(8,18,36,0.92))',
          border: '1px solid rgba(120,160,220,0.18)',
          borderRadius: 20,
          padding: 32,
          boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(120,160,220,0.08) inset',
          backdropFilter: 'blur(18px)',
        }}
      >
        <header style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, margin: 0, letterSpacing: '0.04em', fontWeight: 700 }}>
            Orca <span style={{ color: '#38bdf8' }}>·</span> Trading OS
          </h1>
          <p style={{ marginTop: 8, color: '#90a3c0', fontSize: 13 }}>
            {mode === 'sign-in' ? 'התחבר/י לחשבון שלך' : 'צור/צרי חשבון חדש'}
          </p>
        </header>

        <button
          onClick={handleGoogle}
          disabled={busy}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid rgba(120,160,220,0.25)',
            background: '#fff',
            color: '#1a1a1a',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            opacity: busy ? 0.6 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.4 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z"/></svg>
          המשך/י עם Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(120,160,220,0.15)' }} />
          <span style={{ color: '#5d7090', fontSize: 11, letterSpacing: '0.1em' }}>או</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(120,160,220,0.15)' }} />
        </div>

        <form onSubmit={handleEmailSubmit} style={{ display: 'grid', gap: 12 }}>
          {mode === 'sign-up' && (
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="שם תצוגה"
              autoComplete="name"
              style={inputStyle}
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="אימייל"
            autoComplete="email"
            dir="ltr"
            style={inputStyle}
          />

          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={mode === 'sign-up' ? 8 : 6}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'sign-up' ? 'סיסמה (לפחות 8 תווים)' : 'סיסמה'}
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              dir="ltr"
              style={{ ...inputStyle, paddingRight: 44, width: '100%' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                top: '50%',
                right: 10,
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#90a3c0',
                cursor: 'pointer',
                padding: 6,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {mode === 'sign-up' && password.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }} dir="ltr">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, background: 'rgba(120,160,220,0.12)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(strength.score / 4) * 100}%`,
                    height: '100%',
                    background: strength.color,
                    transition: 'width 0.25s ease, background 0.25s ease',
                  }} />
                </div>
                <span style={{ fontSize: 11, color: strength.color, fontFamily: "'IBM Plex Mono', monospace", minWidth: 70, textAlign: 'right' }}>
                  {strength.label}
                </span>
              </div>
              {strength.hints.length > 0 && (
                <ul style={{
                  margin: 0,
                  paddingInlineStart: 18,
                  fontSize: 11,
                  color: '#90a3c0',
                  fontFamily: "'IBM Plex Mono', monospace",
                  lineHeight: 1.6,
                }}>
                  <li style={{ color: '#cbd5e1', listStyle: 'none', marginBottom: 2, marginInlineStart: -18 }}>
                    Password must include:
                  </li>
                  {strength.hints.map(h => <li key={h}>{h}</li>)}
                  {strength.hints.length === 0 && (
                    <li style={{ color: '#10b981' }}>All minimum requirements are met.</li>
                  )}
                </ul>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(180deg, #38bdf8, #0ea5e9)',
              color: '#001023',
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 8px 24px rgba(14,165,233,0.35)',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? '…' : mode === 'sign-in' ? 'התחבר/י' : 'הרשם/י'}
          </button>
          {mode === 'sign-in' && (
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={busy}
              style={{ background: 'none', border: 'none', color: '#90a3c0', cursor: 'pointer', fontSize: 12, padding: 4 }}
            >
              שכחת סיסמה?
            </button>
          )}
        </form>

        <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: '#90a3c0' }}>
          {mode === 'sign-in' ? 'אין לך חשבון?' : 'כבר רשום?'}{' '}
          <button
            type="button"
            onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setPassword(''); }}
            style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontWeight: 600 }}
          >
            {mode === 'sign-in' ? 'הרשמה' : 'התחברות'}
          </button>
        </p>
      </section>
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(120,160,220,0.2)',
  background: 'rgba(8,18,36,0.6)',
  color: '#e8eef9',
  fontSize: 14,
  outline: 'none',
  fontFamily: "'IBM Plex Mono', monospace",
};
