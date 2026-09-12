// Blocking two-factor challenge.
//
// Runs inside RequireAuth: when the account has a verified TOTP factor but the
// current session is still aal1, nothing of the platform renders until a valid
// 6-digit code (or a one-time backup code) is supplied.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';
import { ShieldCheck, KeyRound, LogOut } from 'lucide-react';

type Phase = 'checking' | 'blocked' | 'clear';

const BG = '#050A14';
const PANEL = '#0B1120';
const LINE = '#1E293B';
const ACCENT = '#38BDF8';
const TEXT = '#E6EEF8';
const MUTED = '#7C8AA0';

export function MfaGate({ children }: { children: ReactNode }) {
  const { session, signOut } = useAuth();
  const [phase, setPhase] = useState<Phase>('checking');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useBackup, setUseBackup] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const evaluate = useCallback(async () => {
    if (!session) { setPhase('clear'); return; }
    try {
      const { data, error: aalErr } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalErr) { setPhase('clear'); return; }
      const needs = data?.currentLevel === 'aal1' && data?.nextLevel === 'aal2';
      setPhase(needs ? 'blocked' : 'clear');
    } catch {
      setPhase('clear');
    }
  }, [session]);

  useEffect(() => { void evaluate(); }, [evaluate]);

  useEffect(() => {
    if (phase === 'blocked') inputRef.current?.focus();
  }, [phase, useBackup]);

  const submit = async () => {
    const value = code.trim().toUpperCase();
    if (!value) return;
    setBusy(true);
    setError(null);
    try {
      if (useBackup) {
        const { data, error: fnErr } = await supabase.functions.invoke('mfa-backup', {
          body: { action: 'recover', code: value },
        });
        if (fnErr || !(data as { ok?: boolean } | null)?.ok) {
          setError('Backup code is not valid.');
          return;
        }
        await supabase.auth.refreshSession();
        setPhase('clear');
        return;
      }

      const { data: factorList } = await supabase.auth.mfa.listFactors();
      const factor = factorList?.totp?.find((f) => f.status === 'verified') ?? factorList?.totp?.[0];
      if (!factor) { setPhase('clear'); return; }

      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factor.id,
        code: value.replace(/\D/g, ''),
      });
      if (verifyErr) {
        setError('Incorrect code. Check your authenticator app and try again.');
        return;
      }
      setCode('');
      await evaluate();
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'checking') return <OrcaBootLoader />;
  if (phase === 'clear') return <>{children}</>;

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    background: '#060B15', border: `1px solid ${LINE}`, color: TEXT,
    fontSize: useBackup ? 16 : 26, letterSpacing: useBackup ? 2 : 10,
    textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', outline: 'none',
  };

  return (
    <div dir="ltr" style={{
      position: 'fixed', inset: 0, background: BG, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div style={{
        width: 'min(420px, 100%)', background: PANEL, border: `1px solid ${LINE}`,
        borderRadius: 18, padding: 28, boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ShieldCheck size={18} color={ACCENT} />
          <h1 style={{ fontSize: 16, fontWeight: 800, color: TEXT, margin: 0 }}>
            Two-factor verification
          </h1>
        </div>
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, margin: '0 0 18px' }}>
          {useBackup
            ? 'Enter one of your one-time backup codes. Using it will turn two-factor off so you can set it up again on a new device.'
            : 'Open Google Authenticator and enter the 6-digit code for Orca Investment.'}
        </p>

        <input
          ref={inputRef}
          value={code}
          onChange={(e) => setCode(useBackup ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => { if (e.key === 'Enter') void submit(); }}
          inputMode={useBackup ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          placeholder={useBackup ? 'XXXXX-XXXXX' : '000000'}
          style={inputStyle}
        />

        {error && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#F87171' }}>{error}</div>
        )}

        <button
          onClick={() => void submit()}
          disabled={busy || !code.trim()}
          style={{
            width: '100%', marginTop: 16, padding: '13px 16px', borderRadius: 12, border: 'none',
            background: busy || !code.trim() ? '#1F2A3C' : ACCENT,
            color: busy || !code.trim() ? MUTED : '#04121F',
            fontWeight: 800, fontSize: 14, cursor: busy || !code.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Verifying…' : 'Verify and continue'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <button
            onClick={() => { setUseBackup((v) => !v); setCode(''); setError(null); }}
            style={{ background: 'none', border: 'none', color: ACCENT, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0 }}
          >
            <KeyRound size={13} /> {useBackup ? 'Use authenticator code' : 'Use a backup code'}
          </button>
          <button
            onClick={() => { void signOut(); }}
            style={{ background: 'none', border: 'none', color: MUTED, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0 }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
