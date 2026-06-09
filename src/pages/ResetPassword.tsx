import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { evaluatePassword, PASSWORD_REQUIREMENTS, translateAuthError } from '@/lib/auth-utils';
import { toast } from 'sonner';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const strength = useMemo(() => evaluatePassword(password), [password]);

  useEffect(() => {
    document.title = 'Reset password · Orca';
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const error = hash.get('error_description');
    if (error) toast.error(translateAuthError(decodeURIComponent(error)));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strength.score < 4) {
      toast.error(PASSWORD_REQUIREMENTS);
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('הסיסמה עודכנה בהצלחה');
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Password update failed';
      toast.error(translateAuthError(msg));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main dir="rtl" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#061326', color: '#e8eef9', padding: 24, fontFamily: "'Poppins', system-ui, sans-serif" }}>
      <section style={{ width: '100%', maxWidth: 420, background: 'linear-gradient(180deg, rgba(13,28,50,0.85), rgba(8,18,36,0.92))', border: '1px solid rgba(120,160,220,0.18)', borderRadius: 20, padding: 32, boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }}>
        <h1 style={{ margin: 0, fontSize: 24, textAlign: 'center' }}>איפוס סיסמה</h1>
        <p style={{ color: '#90a3c0', fontSize: 13, textAlign: 'center' }}>בחר/י סיסמה חדשה לחשבון שלך</p>
        <form onSubmit={submit} style={{ display: 'grid', gap: 12, marginTop: 18 }}>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="סיסמה חדשה" autoComplete="new-password" dir="ltr" style={{ ...inputStyle, paddingRight: 44, width: '100%' }} />
            <button type="button" onClick={() => setShowPassword(v => !v)} aria-label={showPassword ? 'Hide password' : 'Show password'} style={{ position: 'absolute', top: '50%', right: 10, transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#90a3c0', cursor: 'pointer', padding: 6 }}>
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {password && <p dir="ltr" style={{ margin: 0, color: strength.color, fontSize: 12 }}>{strength.hints.length ? PASSWORD_REQUIREMENTS : 'All minimum requirements are met.'}</p>}
          <button disabled={busy} style={{ padding: '12px 16px', borderRadius: 12, border: 'none', background: 'linear-gradient(180deg, #38bdf8, #0ea5e9)', color: '#001023', fontWeight: 700, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>
            {busy ? '…' : 'עדכן/י סיסמה'}
          </button>
        </form>
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