import { useEffect, useMemo, useState } from 'react';
import { Plug, Shield, ShieldCheck, X, Loader2, Trash2, Sparkles, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type { TradingTheme } from '@/lib/trading-theme';

type ProviderId = 'bybit' | 'binance' | 'ibkr';

interface ProviderMeta {
  id: ProviderId;
  name: string;
  tagline: { he: string; en: string };
  gradient: string;
  accent: string;
  enabled: boolean;
}

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'bybit',
    name: 'Bybit',
    tagline: { he: 'נגזרים וספוט • API v5', en: 'Derivatives & Spot • API v5' },
    gradient: 'linear-gradient(135deg, rgba(247,164,29,0.18), rgba(247,164,29,0.04))',
    accent: '#f7a41d',
    enabled: true,
  },
  {
    id: 'binance',
    name: 'Binance',
    tagline: { he: 'הבורסה הגדולה בעולם • Spot & Futures', en: 'World\u2019s largest exchange \u2022 Spot & Futures' },
    gradient: 'linear-gradient(135deg, rgba(243,186,47,0.18), rgba(243,186,47,0.04))',
    accent: '#f3ba2f',
    enabled: true,
  },
  {
    id: 'ibkr',
    name: 'Interactive Brokers',
    tagline: { he: 'מניות, אופציות וחוזים • Flex Query', en: 'Stocks, Options & Futures \u2022 Flex Query' },
    gradient: 'linear-gradient(135deg, rgba(220,38,38,0.16), rgba(220,38,38,0.04))',
    accent: '#dc2626',
    enabled: false,
  },
];

interface ConnectionRow {
  id: string;
  provider: string;
  label: string | null;
  is_active: boolean;
  last_validated_at: string | null;
  created_at: string;
}

interface Props {
  T: TradingTheme;
  isRTL: boolean;
}

export function ExchangesPanel({ T, isRTL }: Props) {
  const { user } = useAuth();
  const t = (he: string, en: string) => (isRTL ? he : en);
  const mono = "'IBM Plex Mono', 'JetBrains Mono', monospace";
  const sans = "'Poppins', sans-serif";

  const [rows, setRows] = useState<ConnectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openProvider, setOpenProvider] = useState<ProviderId | null>(null);

  const refresh = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('exchange_credentials')
      .select('id, provider, label, is_active, last_validated_at, created_at')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('exchange_credentials list', error);
    } else {
      setRows((data ?? []) as ConnectionRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const byProvider = useMemo(() => {
    const map = new Map<string, ConnectionRow[]>();
    rows.forEach(r => {
      const k = r.provider.toLowerCase();
      const arr = map.get(k) ?? [];
      arr.push(r);
      map.set(k, arr);
    });
    return map;
  }, [rows]);

  const onDisconnect = async (id: string) => {
    const { error } = await supabase.from('exchange_credentials').delete().eq('id', id);
    if (error) { toast.error(t('שגיאה בניתוק', 'Disconnect failed')); return; }
    toast.success(t('החיבור הוסר מהכספת', 'Connection removed from vault'));
    void refresh();
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        marginBottom: 18, padding: 18,
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(0,242,255,0.06), rgba(0,242,255,0.01))',
        border: `1px solid ${T.border.subtle}`,
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Plug size={16} color={T.accent.cyan} />
          <h3 style={{ margin: 0, fontFamily: sans, fontWeight: 700, fontSize: 14, color: T.text.primary, letterSpacing: 0.3 }}>
            {t('בורסות מחוברות', 'Connected Exchanges')}
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.6, color: T.text.muted, fontFamily: sans }}>
          {t(
            'חבר בורסות וברוקרים כדי לסנכרן עסקאות אוטומטית. כל המפתחות מאוחסנים בכספת מוצפנת בצד השרת — לעולם לא בדפדפן.',
            'Connect exchanges and brokers to sync trades automatically. All keys live in a server-side encrypted vault — never in your browser.'
          )}
        </p>
      </div>

      {/* Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 14,
      }}>
        {PROVIDERS.map(p => {
          const conns = byProvider.get(p.id) ?? [];
          const connected = conns.length > 0 && p.enabled;
          return (
            <ExchangeCard
              key={p.id}
              T={T}
              meta={p}
              connected={connected}
              loading={loading}
              connectionLabel={connected ? conns[0].label || t('מחובר', 'Connected') : null}
              isRTL={isRTL}
              onConnect={() => p.enabled && setOpenProvider(p.id)}
              onDisconnect={connected ? () => onDisconnect(conns[0].id) : undefined}
            />
          );
        })}
      </div>

      {openProvider && openProvider !== 'ibkr' && (
        <CredentialModal
          T={T}
          isRTL={isRTL}
          provider={PROVIDERS.find(p => p.id === openProvider)!}
          onClose={() => setOpenProvider(null)}
          onSaved={() => { setOpenProvider(null); void refresh(); }}
        />
      )}
    </div>
  );
}

/* ============================== CARD ============================== */
function ExchangeCard({
  T, meta, connected, loading, connectionLabel, isRTL, onConnect, onDisconnect,
}: {
  T: TradingTheme;
  meta: ProviderMeta;
  connected: boolean;
  loading: boolean;
  connectionLabel: string | null;
  isRTL: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
}) {
  const t = (he: string, en: string) => (isRTL ? he : en);
  const sans = "'Poppins', sans-serif";
  const mono = "'IBM Plex Mono', monospace";
  const disabled = !meta.enabled;

  const statusColor = disabled ? T.text.muted : connected ? '#10b981' : '#ef4444';
  const statusLabel = disabled
    ? t('בקרוב', 'Coming Soon')
    : connected ? t('פעיל', 'Live') : t('לא מחובר', 'Disconnected');

  return (
    <div
      onClick={() => !disabled && !connected && onConnect()}
      style={{
        position: 'relative',
        borderRadius: 16,
        padding: 18,
        background: `${meta.gradient}, rgba(11,23,48,0.55)`,
        border: `1px solid ${connected ? meta.accent + '55' : T.border.subtle}`,
        backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
        cursor: disabled ? 'not-allowed' : connected ? 'default' : 'pointer',
        opacity: disabled ? 0.65 : 1,
        transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease',
        boxShadow: connected ? `0 0 0 1px ${meta.accent}33, 0 10px 30px -18px ${meta.accent}88` : 'none',
        overflow: 'hidden',
      }}
      onMouseEnter={e => { if (!disabled && !connected) (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
    >
      {/* glow corner */}
      <div style={{
        position: 'absolute', top: -40, insetInlineEnd: -40, width: 140, height: 140,
        background: `radial-gradient(circle, ${meta.accent}33 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* status dot */}
      <div style={{
        position: 'absolute', top: 14, insetInlineStart: 14,
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 9.5, fontWeight: 700, color: statusColor,
        fontFamily: mono, letterSpacing: 0.5, textTransform: 'uppercase',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: statusColor,
          boxShadow: connected ? `0 0 8px ${statusColor}` : 'none',
        }} />
        {statusLabel}
      </div>

      {/* Coming soon badge */}
      {disabled && (
        <div style={{
          position: 'absolute', top: 12, insetInlineEnd: 12,
          padding: '3px 8px', borderRadius: 999,
          background: 'rgba(220,38,38,0.12)',
          border: '1px solid rgba(220,38,38,0.35)',
          fontSize: 9, fontWeight: 800, color: '#fca5a5',
          fontFamily: mono, letterSpacing: 0.6, textTransform: 'uppercase',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Lock size={9} /> Soon
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <div style={{
          fontFamily: sans, fontWeight: 800, fontSize: 19,
          color: T.text.primary, letterSpacing: 0.2,
        }}>
          {meta.name}
        </div>
        <div style={{
          fontFamily: sans, fontSize: 11, color: T.text.muted, marginTop: 4,
        }}>
          {meta.tagline[isRTL ? 'he' : 'en']}
        </div>
      </div>

      <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
        {disabled ? (
          <span style={{
            fontSize: 10.5, fontFamily: sans, color: T.text.muted,
          }}>
            {t('תמיכה ב־Flex Query / API בפיתוח', 'Flex Query / API support in development')}
          </span>
        ) : connected ? (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onConnect(); }}
              style={{
                flex: 1,
                padding: '9px 12px', borderRadius: 10,
                background: 'transparent',
                border: `1px solid ${meta.accent}66`,
                color: meta.accent,
                fontWeight: 700, fontSize: 11, fontFamily: sans,
                cursor: 'pointer', letterSpacing: 0.3,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Sparkles size={11} /> {t('עדכן מפתח', 'Rotate key')}
            </button>
            {onDisconnect && (
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(t('לנתק את החיבור?', 'Disconnect this account?'))) onDisconnect(); }}
                style={{
                  padding: '9px 11px', borderRadius: 10,
                  background: 'transparent',
                  border: `1px solid ${T.border.medium}`,
                  color: '#ef4444', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center',
                }}
                title={t('נתק', 'Disconnect')}
              >
                <Trash2 size={12} />
              </button>
            )}
          </>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onConnect(); }}
            style={{
              flex: 1,
              padding: '10px 12px', borderRadius: 10,
              background: meta.accent,
              border: 'none',
              color: '#06121f',
              fontWeight: 800, fontSize: 11.5, fontFamily: sans,
              cursor: 'pointer', letterSpacing: 0.4,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <Plug size={11} /> {t('חבר חשבון', 'Connect Account')}
          </button>
        )}
      </div>

      {connected && connectionLabel && (
        <div style={{
          marginTop: 12, paddingTop: 12,
          borderTop: `1px dashed ${T.border.subtle}`,
          fontFamily: mono, fontSize: 10, color: T.text.muted,
        }}>
          {t('פרופיל', 'Profile')}: <span style={{ color: T.text.secondary }}>{connectionLabel}</span>
        </div>
      )}
    </div>
  );
}

/* ============================= MODAL ============================= */
function CredentialModal({
  T, isRTL, provider, onClose, onSaved,
}: {
  T: TradingTheme;
  isRTL: boolean;
  provider: ProviderMeta;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const t = (he: string, en: string) => (isRTL ? he : en);
  const sans = "'Poppins', sans-serif";
  const mono = "'IBM Plex Mono', monospace";

  const [label, setLabel] = useState('main');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const canSubmit = apiKey.trim().length >= 8 && apiSecret.trim().length >= 8 && !busy;

  const submit = async () => {
    if (!user) { toast.error(t('יש להתחבר תחילה', 'Please sign in first')); return; }
    if (!canSubmit) return;
    setBusy(true);
    const { error } = await supabase.from('exchange_credentials').upsert(
      {
        user_id: user.id,
        provider: provider.id,
        label: label.trim() || 'main',
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
        scope: 'read_only',
        is_active: true,
      },
      { onConflict: 'user_id,provider,label' },
    );
    setBusy(false);
    if (error) {
      console.error(error);
      toast.error(t('שמירה נכשלה: ', 'Save failed: ') + error.message);
      return;
    }
    toast.success(t(`הכספת עודכנה עבור ${provider.name}`, `Vault updated for ${provider.name}`));
    setApiKey(''); setApiSecret('');
    onSaved();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10020,
        background: 'rgba(2,6,15,0.78)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, direction: isRTL ? 'rtl' : 'ltr',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520,
          background: 'linear-gradient(180deg, rgba(11,23,48,0.96), rgba(6,12,28,0.96))',
          border: `1px solid ${provider.accent}55`,
          borderRadius: 18,
          padding: 22,
          boxShadow: `0 30px 80px -30px ${provider.accent}55, 0 0 0 1px rgba(255,255,255,0.04) inset`,
          fontFamily: sans,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{
              fontSize: 9.5, fontWeight: 800, fontFamily: mono,
              color: provider.accent, letterSpacing: 0.8, textTransform: 'uppercase',
              marginBottom: 4,
            }}>
              {t('חיבור מאובטח', 'Secure connection')}
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text.primary }}>
              {provider.name}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: `1px solid ${T.border.subtle}`,
              borderRadius: 8, color: T.text.secondary, cursor: 'pointer',
              padding: 6, display: 'inline-flex',
            }}
            aria-label="close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Security notice */}
        <div style={{
          padding: 14, borderRadius: 12, marginBottom: 18,
          background: 'rgba(239,68,68,0.07)',
          border: '1px solid rgba(239,68,68,0.28)',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <ShieldCheck size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: 11.5, lineHeight: 1.6, color: '#fecaca' }}>
            <strong style={{ color: '#fca5a5', fontWeight: 800 }}>
              {t('דרישת אבטחה: ', 'Security Requirement: ')}
            </strong>
            {t(
              'ודא שמפתחות ה־API מוגדרים כ־READ-ONLY / HISTORY בלבד. יש להשבית הרשאות מסחר ומשיכה. הכספת תדחה מפתחות עם הרשאות גבוהות יותר.',
              'Ensure your API keys are configured as READ-ONLY / HISTORY only. Trading and Withdrawal permissions must be disabled. The vault will reject keys with elevated scopes.'
            )}
          </div>
        </div>

        {/* Label */}
        <Field label={t('כינוי לחשבון', 'Account label')} T={T}>
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="main"
            style={inputStyle(T, mono)}
          />
        </Field>

        {/* API Key */}
        <Field label="API Key" T={T}>
          <input
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder={provider.id === 'bybit' ? 'XXXXXXXXXXXXXXXXXXXX' : 'XXXXXXXXXXXXXXXXXXXX'}
            autoComplete="off"
            spellCheck={false}
            style={inputStyle(T, mono)}
          />
        </Field>

        {/* API Secret */}
        <Field label="API Secret" T={T}>
          <div style={{ position: 'relative' }}>
            <input
              type={showSecret ? 'text' : 'password'}
              value={apiSecret}
              onChange={e => setApiSecret(e.target.value)}
              placeholder="••••••••••••••••••••••••"
              autoComplete="off"
              spellCheck={false}
              style={{ ...inputStyle(T, mono), paddingInlineEnd: 64 }}
            />
            <button
              type="button"
              onClick={() => setShowSecret(s => !s)}
              style={{
                position: 'absolute', top: '50%', insetInlineEnd: 8, transform: 'translateY(-50%)',
                background: 'transparent', border: 'none', color: T.text.muted,
                fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: mono,
                letterSpacing: 0.5, textTransform: 'uppercase',
              }}
            >
              {showSecret ? t('הסתר', 'Hide') : t('הצג', 'Show')}
            </button>
          </div>
        </Field>

        {/* Vault note */}
        <div style={{
          marginTop: 6, marginBottom: 16,
          fontSize: 10.5, color: T.text.muted, fontFamily: sans,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Shield size={11} />
          {t(
            'המפתח הפרטי יוצפן ויאוחסן בכספת השרת. לא נשמור עותק בדפדפן.',
            'The private secret is encrypted and stored in the server-side vault. No copy is kept in your browser.'
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              padding: '11px 16px', borderRadius: 10,
              background: 'transparent', border: `1px solid ${T.border.medium}`,
              color: T.text.secondary, cursor: busy ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 12, fontFamily: sans,
            }}
          >
            {t('ביטול', 'Cancel')}
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              padding: '11px 18px', borderRadius: 10,
              background: canSubmit ? provider.accent : T.bg.tertiary,
              border: 'none',
              color: canSubmit ? '#06121f' : T.text.muted,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontWeight: 800, fontSize: 12.5, fontFamily: sans,
              letterSpacing: 0.4, display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: canSubmit ? `0 12px 28px -16px ${provider.accent}` : 'none',
            }}
          >
            {busy ? <Loader2 size={13} className="orca-spin" /> : <Plug size={13} />}
            {t('חבר חשבון', 'Connect Account')}
          </button>
        </div>

        <style>{`
          .orca-spin { animation: orcaSpin 0.9s linear infinite; }
          @keyframes orcaSpin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}

function Field({ label, children, T }: { label: string; children: React.ReactNode; T: TradingTheme }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 10, fontWeight: 800, color: T.text.muted,
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function inputStyle(T: TradingTheme, mono: string): React.CSSProperties {
  return {
    width: '100%', padding: '11px 13px', borderRadius: 10,
    background: 'rgba(2,8,20,0.55)',
    border: `1px solid ${T.border.subtle}`,
    color: T.text.primary, fontSize: 13, outline: 'none',
    fontFamily: mono, boxSizing: 'border-box',
    transition: 'border-color .15s, background .15s',
  };
}
