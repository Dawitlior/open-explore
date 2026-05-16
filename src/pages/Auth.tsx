import { useState, useEffect, useMemo } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, TrendingUp, Shield, Zap, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { evaluatePassword, isValidEmail, translateAuthError } from '@/lib/auth-utils';
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
    document.title = mode === 'sign-in' ? 'Sign in · OrcaInvestment' : 'Create account · OrcaInvestment';
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
    if (!isValidEmail(cleanEmail)) { toast.error('כתובת האימייל לא תקינה'); return; }
    if (mode === 'sign-up' && password.length < 6) { toast.error('הסיסמה חייבת להכיל לפחות 6 תווים'); return; }
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
        toast.success('בדוק/י את האימייל לאישור החשבון');
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
    if (!isValidEmail(cleanEmail)) { toast.error('הכנס/י אימייל תקין כדי לאפס סיסמה'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('שלחנו לך קישור לאיפוס הסיסמה');
    } catch (err) {
      toast.error(translateAuthError(err instanceof Error ? err.message : 'Password reset failed'));
    } finally { setBusy(false); }
  };

  return (
    <main
      dir="rtl"
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '1fr',
        background: '#05080f',
        color: '#e8eef9',
        fontFamily: "'Poppins', system-ui, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated gradient backdrop */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: `
          radial-gradient(900px 500px at 12% 18%, rgba(6,214,160,0.16), transparent 60%),
          radial-gradient(700px 500px at 88% 82%, rgba(56,189,248,0.14), transparent 65%),
          radial-gradient(600px 400px at 50% 50%, rgba(167,139,250,0.08), transparent 70%)
        `,
      }} />
      {/* Subtle grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.06, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(6,214,160,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(6,214,160,0.6) 1px, transparent 1px)',
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(ellipse at center, #000 30%, transparent 75%)',
      }} />
      {/* Floating ticker chips */}
      <FloatingTicker symbol="BTC" change="+2.4%" top="14%" left="6%" delay="0s" up />
      <FloatingTicker symbol="ETH" change="+1.1%" top="72%" left="10%" delay="1.2s" up />
      <FloatingTicker symbol="SOL" change="-0.8%" top="22%" left="84%" delay="2.4s" />
      <FloatingTicker symbol="SPX" change="+0.5%" top="78%" left="86%" delay="0.6s" up />

      <section
        style={{
          margin: 'auto',
          width: '100%',
          maxWidth: 1080,
          padding: 24,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(380px, 460px)',
          gap: 48,
          alignItems: 'center',
          zIndex: 1,
        }}
        className="orca-auth-grid"
      >
        {/* LEFT — Brand pitch */}
        <div className="orca-auth-pitch" style={{ direction: 'ltr', textAlign: 'left' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #06d6a0, #0ea5e9)',
              display: 'grid', placeItems: 'center',
              boxShadow: '0 8px 24px rgba(6,214,160,0.35)',
              fontSize: 22,
            }}>🐋</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>
                Orca<span style={{ color: '#06d6a0' }}>Investment</span>
              </div>
              <div style={{ fontSize: 10, color: '#5b6b87', letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 4 }}>
                Trading Intelligence
              </div>
            </div>
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 4.2vw, 52px)',
            fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em', margin: 0,
          }}>
            Trade smarter.{' '}
            <span style={{
              background: 'linear-gradient(135deg, #06d6a0, #38bdf8 60%, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Compound your edge.
            </span>
          </h1>
          <p style={{ marginTop: 16, fontSize: 15, color: '#90a3c0', maxWidth: 480, lineHeight: 1.6 }}>
            The professional terminal for crypto, equities and FX traders — risk engine, AI insights and a journal that actually changes how you trade.
          </p>

          <div style={{ marginTop: 28, display: 'grid', gap: 12 }}>
            {[
              { icon: TrendingUp, label: 'Live R-multiples & expectancy engine' },
              { icon: Shield, label: '4-tier risk limits keep you in the game' },
              { icon: BarChart3, label: 'AI insights from your own trade DNA' },
              { icon: Zap, label: 'Encrypted per-user cloud storage' },
            ].map(({ icon: Icon, label }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'rgba(6,214,160,0.08)', border: '1px solid rgba(6,214,160,0.22)',
                  display: 'grid', placeItems: 'center', color: '#06d6a0',
                }}>
                  <Icon size={15} />
                </div>
                <span style={{ fontSize: 13, color: '#cbd5e1' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Auth card */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(15,28,52,0.78), rgba(8,18,36,0.92))',
            border: '1px solid rgba(120,160,220,0.16)',
            borderRadius: 24,
            padding: 32,
            boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
            backdropFilter: 'blur(20px)',
            position: 'relative',
          }}
        >
          {/* Top glow line */}
          <div style={{
            position: 'absolute', top: 0, left: 24, right: 24, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(6,214,160,0.6), transparent)',
          }} />

          <header style={{ marginBottom: 22, textAlign: 'center' }}>
            <div style={{
              fontSize: 11, color: '#06d6a0', fontWeight: 700, letterSpacing: '0.22em',
              textTransform: 'uppercase', marginBottom: 8,
            }}>
              {mode === 'sign-in' ? 'Welcome back' : 'Get started'}
            </div>
            <h2 style={{ fontSize: 22, margin: 0, fontWeight: 700, letterSpacing: '-0.01em' }}>
              {mode === 'sign-in' ? 'התחברות לחשבון' : 'יצירת חשבון חדש'}
            </h2>
            <p style={{ marginTop: 6, color: '#7a8aa3', fontSize: 12 }}>
              {mode === 'sign-in' ? 'המשך/י לטרמינל המסחר שלך' : 'הצטרף/י לקהילת OrcaInvestment'}
            </p>
          </header>

          <button
            onClick={handleGoogle}
            disabled={busy}
            style={{
              width: '100%', padding: '13px 16px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.96)', color: '#0f172a',
              fontWeight: 600, fontSize: 14, cursor: busy ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              opacity: busy ? 0.6 : 1, transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.4 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.3-.1-2.3-.4-3.5z"/></svg>
            המשך/י עם Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(120,160,220,0.15)' }} />
            <span style={{ color: '#5d7090', fontSize: 11, letterSpacing: '0.18em' }}>או</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(120,160,220,0.15)' }} />
          </div>

          <form onSubmit={handleEmailSubmit} style={{ display: 'grid', gap: 10 }}>
            {mode === 'sign-up' && (
              <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder="שם תצוגה" autoComplete="name" style={inputStyle} />
            )}
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="אימייל" autoComplete="email" dir="ltr" style={inputStyle} />

            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'} required minLength={6}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder={mode === 'sign-up' ? 'סיסמה (לפחות 6 תווים)' : 'סיסמה'}
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                dir="ltr" style={{ ...inputStyle, paddingRight: 44, width: '100%' }}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#90a3c0', cursor: 'pointer',
                  padding: 6, display: 'inline-flex', alignItems: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {mode === 'sign-up' && password.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} dir="ltr">
                <div style={{ flex: 1, height: 4, background: 'rgba(120,160,220,0.12)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{
                    width: `${(strength.score / 4) * 100}%`, height: '100%',
                    background: strength.color, transition: 'width 0.25s ease, background 0.25s ease',
                  }} />
                </div>
                <span style={{ fontSize: 11, color: strength.color, fontFamily: "'IBM Plex Mono', monospace", minWidth: 70, textAlign: 'right' }}>
                  {strength.label}
                </span>
              </div>
            )}

            <button type="submit" disabled={busy}
              style={{
                marginTop: 6, padding: '13px 16px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #06d6a0, #0ea5e9)',
                color: '#001023', fontWeight: 800, fontSize: 14, letterSpacing: '0.02em',
                cursor: busy ? 'wait' : 'pointer',
                boxShadow: '0 10px 26px rgba(6,214,160,0.32)',
                opacity: busy ? 0.65 : 1,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={e => { if (!busy) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 14px 32px rgba(6,214,160,0.45)'; } }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 26px rgba(6,214,160,0.32)'; }}
            >
              {busy ? '…' : mode === 'sign-in' ? 'כניסה לפלטפורמה' : 'יצירת חשבון'}
            </button>

            {mode === 'sign-in' && (
              <button type="button" onClick={handleForgotPassword} disabled={busy}
                style={{ background: 'none', border: 'none', color: '#90a3c0', cursor: 'pointer', fontSize: 12, padding: 4, marginTop: 2 }}>
                שכחת סיסמה?
              </button>
            )}
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#90a3c0' }}>
            {mode === 'sign-in' ? 'אין לך חשבון?' : 'כבר רשום/ה?'}{' '}
            <button type="button"
              onClick={() => { setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in'); setPassword(''); }}
              style={{ background: 'none', border: 'none', color: '#06d6a0', cursor: 'pointer', fontWeight: 700 }}>
              {mode === 'sign-in' ? 'הרשמה' : 'התחברות'}
            </button>
          </p>

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(120,160,220,0.1)', textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: '#5d7090', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
              🔒 End-to-end secured · SOC-grade infrastructure
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          .orca-auth-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .orca-auth-pitch { display: none !important; }
        }
        @keyframes orcaFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </main>
  );
}

const FloatingTicker = ({ symbol, change, top, left, delay, up }: { symbol: string; change: string; top: string; left: string; delay: string; up?: boolean }) => (
  <div style={{
    position: 'absolute', top, left,
    background: 'rgba(13,28,50,0.7)', border: '1px solid rgba(120,160,220,0.18)',
    borderRadius: 12, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
    backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
    animation: `orcaFloat 5s ease-in-out infinite`,
    animationDelay: delay,
    pointerEvents: 'none',
  }} className="orca-auth-pitch">
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: up ? '#06d6a0' : '#f43f5e',
      boxShadow: `0 0 10px ${up ? '#06d6a0' : '#f43f5e'}`,
    }} />
    <span style={{ fontSize: 12, fontWeight: 700, color: '#e8eef9', letterSpacing: '0.06em' }}>{symbol}</span>
    <span style={{ fontSize: 11, color: up ? '#06d6a0' : '#f43f5e', fontFamily: "'IBM Plex Mono', monospace" }}>{change}</span>
  </div>
);

const inputStyle: React.CSSProperties = {
  padding: '12px 14px', borderRadius: 12,
  border: '1px solid rgba(120,160,220,0.2)',
  background: 'rgba(8,18,36,0.6)', color: '#e8eef9',
  fontSize: 14, outline: 'none',
  fontFamily: "'IBM Plex Mono', monospace",
};
