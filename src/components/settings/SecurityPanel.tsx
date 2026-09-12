// Security channel (Settings → Personal → Security).
//  1. Two-factor authentication with any TOTP app (Google Authenticator…)
//  2. Active devices / sessions with per-device revocation.
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import QRCode from 'qrcode';
import { ShieldCheck, ShieldOff, Smartphone, Monitor, Tablet, Copy, Download, RefreshCw, LogOut, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TradingTheme } from '@/lib/trading-theme';
import { getDeviceId } from '@/lib/security/device-fingerprint';

interface DeviceRow {
  id: string;
  device_id: string;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  ip: string | null;
  city: string | null;
  country: string | null;
  first_seen_at: string;
  last_seen_at: string;
}

export function SecurityPanel(props: {
  T: TradingTheme;
  isRTL: boolean;
  t: (he: string, en: string) => string;
  card: CSSProperties;
  sectionTitle: CSSProperties;
  sectionHint: CSSProperties;
  mono: string;
}) {
  const { T, isRTL, t, card, sectionTitle, sectionHint, mono } = props;

  // ── MFA state ──────────────────────────────────────────────────────────────
  const [mfaOn, setMfaOn] = useState<boolean | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [disableCode, setDisableCode] = useState('');
  const [disabling, setDisabling] = useState(false);

  // ── Devices state ──────────────────────────────────────────────────────────
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [devLoading, setDevLoading] = useState(true);
  const thisDevice = getDeviceId();

  const refreshMfa = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = (data?.totp ?? []).filter((f) => f.status === 'verified');
    setMfaOn(verified.length > 0);
    if (verified.length > 0) {
      const { data: st } = await supabase.functions.invoke('mfa-backup', { body: { action: 'status' } });
      setRemaining((st as { remaining?: number } | null)?.remaining ?? 0);
    } else {
      setRemaining(null);
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    setDevLoading(true);
    const { data } = await supabase
      .from('user_devices')
      .select('id, device_id, browser, os, device_type, ip, city, country, first_seen_at, last_seen_at')
      .is('revoked_at', null)
      .order('last_seen_at', { ascending: false });
    setDevices((data as DeviceRow[]) ?? []);
    setDevLoading(false);
  }, []);

  useEffect(() => { void refreshMfa(); void refreshDevices(); }, [refreshMfa, refreshDevices]);

  const startEnroll = async () => {
    setBusy(true);
    try {
      // Clear any half-finished factor from a previous attempt.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const f of existing?.totp ?? []) {
        if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Orca ${new Date().toISOString().slice(0, 10)}`,
      });
      if (error || !data) { toast.error(error?.message ?? t('ההפעלה נכשלה', 'Enrollment failed')); return; }
      setFactorId(data.id);
      setSecret(data.totp.secret);
      setQr(await QRCode.toDataURL(data.totp.uri, { margin: 1, width: 220, color: { dark: '#0B1120', light: '#FFFFFF' } }));
      setEnrolling(true);
      setCode('');
    } finally { setBusy(false); }
  };

  const confirmEnroll = async () => {
    if (!factorId || code.replace(/\D/g, '').length !== 6) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.replace(/\D/g, '') });
      if (error) { toast.error(t('קוד שגוי — נסה שוב', 'Wrong code — try again')); return; }
      const { data } = await supabase.functions.invoke('mfa-backup', { body: { action: 'generate' } });
      setBackupCodes((data as { codes?: string[] } | null)?.codes ?? null);
      setEnrolling(false);
      setQr(null); setSecret(null); setFactorId(null); setCode('');
      await refreshMfa();
      toast.success(t('אימות דו-שלבי הופעל', 'Two-factor authentication enabled'));
    } finally { setBusy(false); }
  };

  const cancelEnroll = async () => {
    if (factorId) await supabase.auth.mfa.unenroll({ factorId });
    setEnrolling(false); setQr(null); setSecret(null); setFactorId(null); setCode('');
  };

  const disableMfa = async () => {
    const clean = disableCode.replace(/\D/g, '');
    if (clean.length !== 6) return;
    setBusy(true);
    try {
      const { data: list } = await supabase.auth.mfa.listFactors();
      const factor = (list?.totp ?? []).find((f) => f.status === 'verified');
      if (!factor) { await refreshMfa(); return; }
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: clean });
      if (error) { toast.error(t('קוד שגוי', 'Wrong code')); return; }
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
      const { data: me } = await supabase.auth.getUser();
      if (me?.user) await supabase.from('mfa_backup_codes').delete().eq('user_id', me.user.id);
      setDisabling(false); setDisableCode(''); setBackupCodes(null);
      await refreshMfa();
      toast.success(t('אימות דו-שלבי כובה', 'Two-factor authentication disabled'));
    } finally { setBusy(false); }
  };

  const regenerateCodes = async () => {
    setBusy(true);
    try {
      const { data } = await supabase.functions.invoke('mfa-backup', { body: { action: 'generate' } });
      setBackupCodes((data as { codes?: string[] } | null)?.codes ?? null);
      await refreshMfa();
    } finally { setBusy(false); }
  };

  const revokeDevice = async (row: DeviceRow) => {
    await supabase.from('user_devices').update({ revoked_at: new Date().toISOString() }).eq('id', row.id);
    toast.success(t('המכשיר נותק', 'Device signed out'));
    await refreshDevices();
  };

  const revokeAll = async () => {
    await supabase.functions.invoke('security-devices', { body: { action: 'revoke_all' } });
    toast.success(t('כל המכשירים נותקו', 'All devices signed out'));
    await refreshDevices();
  };

  const fmt = (iso: string) => new Date(iso).toLocaleString(isRTL ? 'he-IL' : 'en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  const btn: CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 10,
    border: `1px solid ${T.border.medium}`, background: 'transparent', color: T.text.primary,
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
  };
  const primary: CSSProperties = {
    ...btn, border: 'none', background: T.accent.cyan, color: T.bg.primary,
  };
  const input: CSSProperties = {
    padding: '10px 14px', borderRadius: 10, background: T.bg.primary,
    border: `1px solid ${T.border.medium}`, color: T.text.primary,
    fontFamily: mono, fontSize: 18, letterSpacing: 6, textAlign: 'center', width: 170, outline: 'none',
  };

  const DeviceIcon = ({ type }: { type: string | null }) =>
    type === 'mobile' ? <Smartphone size={15} /> : type === 'tablet' ? <Tablet size={15} /> : <Monitor size={15} />;

  return (
    <div>
      {/* ═══ Two-factor authentication ═══ */}
      <div style={card}>
        <h3 style={sectionTitle}>
          {mfaOn ? <ShieldCheck size={14} /> : <ShieldOff size={14} />} {t('אימות דו-שלבי (2FA)', 'Two-factor authentication')}
        </h3>
        <p style={sectionHint}>
          {t(
            'שכבת הגנה שנייה על החשבון: בכל כניסה תתבקש להזין קוד בן 6 ספרות מאפליקציית אימות בטלפון (Google Authenticator, Authy, 1Password).',
            'A second layer on your account: every sign-in asks for a 6-digit code from an authenticator app on your phone (Google Authenticator, Authy, 1Password).',
          )}
        </p>

        {mfaOn === null && <div style={{ fontSize: 12, color: T.text.muted }}>…</div>}

        {mfaOn === false && !enrolling && (
          <button onClick={() => void startEnroll()} disabled={busy} style={primary}>
            <ShieldCheck size={13} /> {t('הפעל אימות דו-שלבי', 'Enable two-factor')}
          </button>
        )}

        {enrolling && (
          <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
            {qr && (
              <img
                src={qr}
                alt={t('קוד QR להפעלת אימות דו-שלבי', 'QR code for two-factor setup')}
                style={{ width: 180, height: 180, borderRadius: 12, background: '#fff', padding: 8 }}
              />
            )}
            <div style={{ flex: 1, minWidth: 240 }}>
              <ol style={{ margin: 0, paddingInlineStart: 18, fontSize: 12, color: T.text.secondary, lineHeight: 1.9 }}>
                <li>{t('פתח את Google Authenticator בטלפון.', 'Open Google Authenticator on your phone.')}</li>
                <li>{t('סרוק את קוד ה-QR (או הזן את המפתח ידנית).', 'Scan the QR code (or enter the key manually).')}</li>
                <li>{t('הזן כאן את הקוד בן 6 הספרות.', 'Enter the 6-digit code here.')}</li>
              </ol>
              {secret && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <code dir="ltr" style={{ fontFamily: mono, fontSize: 12, color: T.text.muted, wordBreak: 'break-all' }}>{secret}</code>
                  <button onClick={() => { void navigator.clipboard.writeText(secret); toast.success(t('הועתק', 'Copied')); }} style={{ ...btn, padding: '5px 8px' }}>
                    <Copy size={12} />
                  </button>
                </div>
              )}
              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  dir="ltr" value={code} inputMode="numeric" placeholder="000000"
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={(e) => { if (e.key === 'Enter') void confirmEnroll(); }}
                  style={input}
                />
                <button onClick={() => void confirmEnroll()} disabled={busy || code.length !== 6} style={primary}>
                  <Check size={13} /> {t('אמת והפעל', 'Verify & enable')}
                </button>
                <button onClick={() => void cancelEnroll()} style={btn}>{t('ביטול', 'Cancel')}</button>
              </div>
            </div>
          </div>
        )}

        {mfaOn === true && !enrolling && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderRadius: 999, background: `${T.state.profit}18`, color: T.state.profit, fontSize: 12, fontWeight: 800 }}>
              <ShieldCheck size={13} /> {t('פעיל', 'Active')}
            </div>
            {remaining !== null && (
              <div style={{ marginTop: 10, fontSize: 12, color: T.text.muted }}>
                {t(`נותרו ${remaining} קודי גיבוי`, `${remaining} backup codes remaining`)}
              </div>
            )}
            <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => void regenerateCodes()} disabled={busy} style={btn}>
                <RefreshCw size={13} /> {t('צור קודי גיבוי חדשים', 'Regenerate backup codes')}
              </button>
              {!disabling ? (
                <button onClick={() => setDisabling(true)} style={{ ...btn, color: T.state.warn, borderColor: `${T.state.warn}55` }}>
                  <ShieldOff size={13} /> {t('כבה אימות דו-שלבי', 'Disable two-factor')}
                </button>
              ) : (
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    dir="ltr" value={disableCode} inputMode="numeric" placeholder="000000"
                    onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    style={input}
                  />
                  <button onClick={() => void disableMfa()} disabled={busy || disableCode.length !== 6} style={{ ...btn, color: T.state.warn, borderColor: `${T.state.warn}55` }}>
                    {t('אשר כיבוי', 'Confirm disable')}
                  </button>
                  <button onClick={() => { setDisabling(false); setDisableCode(''); }} style={btn}>{t('ביטול', 'Cancel')}</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ Backup codes (shown once) ═══ */}
      {backupCodes && (
        <div style={{ ...card, borderColor: `${T.state.warn}55`, background: `linear-gradient(135deg, ${T.state.warn}08, transparent)` }}>
          <h3 style={{ ...sectionTitle, color: T.state.warn }}><AlertTriangle size={14} /> {t('קודי גיבוי — מוצגים פעם אחת בלבד', 'Backup codes — shown only once')}</h3>
          <p style={sectionHint}>
            {t('שמור אותם במקום בטוח. אם תאבד את הטלפון, קוד כזה יאפשר לך להיכנס ולכבות את האימות הדו-שלבי. כל קוד תקף לשימוש אחד.',
               'Store them somewhere safe. If you lose your phone, one of these lets you back in and turns two-factor off. Each code works once.')}
          </p>
          <div dir="ltr" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8, marginTop: 10 }}>
            {backupCodes.map((c) => (
              <code key={c} style={{ fontFamily: mono, fontSize: 13, padding: '8px 10px', borderRadius: 8, background: T.bg.primary, border: `1px solid ${T.border.medium}`, color: T.text.primary, textAlign: 'center' }}>{c}</code>
            ))}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => { void navigator.clipboard.writeText(backupCodes.join('\n')); toast.success(t('הועתק', 'Copied')); }} style={btn}>
              <Copy size={13} /> {t('העתק', 'Copy')}
            </button>
            <button
              onClick={() => {
                const blob = new Blob([`Orca Investment — backup codes\n\n${backupCodes.join('\n')}\n`], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'orca-backup-codes.txt'; a.click();
                URL.revokeObjectURL(url);
              }}
              style={btn}
            >
              <Download size={13} /> {t('הורד', 'Download')}
            </button>
            <button onClick={() => setBackupCodes(null)} style={primary}><Check size={13} /> {t('שמרתי אותם', 'I saved them')}</button>
          </div>
        </div>
      )}

      {/* ═══ Active devices ═══ */}
      <div style={card}>
        <h3 style={sectionTitle}><Monitor size={14} /> {t('מכשירים וסשנים פעילים', 'Active devices & sessions')}</h3>
        <p style={sectionHint}>
          {t('כל מכשיר שהתחבר לחשבון הזה. אם משהו לא מוכר לך — נתק אותו מיד.',
             'Every device signed in to this account. If something looks unfamiliar, sign it out immediately.')}
        </p>

        {devLoading && <div style={{ fontSize: 12, color: T.text.muted }}>…</div>}
        {!devLoading && devices.length === 0 && (
          <div style={{ fontSize: 12, color: T.text.muted }}>{t('אין מכשירים רשומים עדיין.', 'No devices recorded yet.')}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
          {devices.map((d) => {
            const current = d.device_id === thisDevice;
            return (
              <div key={d.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12,
                background: T.bg.primary, border: `1px solid ${current ? `${T.accent.cyan}66` : T.border.medium}`,
              }}>
                <span style={{ color: current ? T.accent.cyan : T.text.muted, display: 'flex' }}><DeviceIcon type={d.device_type} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text.primary }}>
                    {d.browser ?? '—'} · {d.os ?? '—'}
                    {current && (
                      <span style={{ marginInlineStart: 8, fontSize: 10, fontWeight: 800, color: T.accent.cyan }}>
                        {t('המכשיר הנוכחי', 'This device')}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: T.text.muted, display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 3 }}>
                    {(d.city || d.country) && <span>{[d.city, d.country].filter(Boolean).join(', ')}</span>}
                    {d.ip && <span dir="ltr" style={{ fontFamily: mono }}>{d.ip}</span>}
                    <span>{t('פעילות אחרונה', 'Last active')}: {fmt(d.last_seen_at)}</span>
                    <span>{t('כניסה ראשונה', 'First seen')}: {fmt(d.first_seen_at)}</span>
                  </div>
                </div>
                {!current && (
                  <button onClick={() => void revokeDevice(d)} style={{ ...btn, padding: '7px 11px', color: T.state.warn, borderColor: `${T.state.warn}55` }}>
                    <LogOut size={12} /> {t('נתק', 'Sign out')}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {devices.length > 0 && (
          <button onClick={() => void revokeAll()} style={{ ...btn, marginTop: 14, color: T.state.warn, borderColor: `${T.state.warn}55` }}>
            <LogOut size={13} /> {t('נתק מכל המכשירים', 'Sign out of all devices')}
          </button>
        )}
      </div>
    </div>
  );
}
