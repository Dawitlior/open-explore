import { useEffect, useMemo, useRef, useState } from 'react';
import { Plug, Shield, ShieldCheck, X, Trash2, Sparkles, Lock, ChevronDown, BookOpen, AlertTriangle, RefreshCw, FileSpreadsheet, UploadCloud, CheckCircle2, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type { TradingTheme } from '@/lib/trading-theme';
import { useTrades } from '@/hooks/use-trades';
import { runImportWithPreflight } from '@/lib/uie/run-import-with-preflight';
import { useActivePortfolio } from '@/hooks/use-active-portfolio';
import { BrokerRegistry } from '@/lib/brokers';
import type { BrokerMeta } from '@/lib/brokers/types';
import { useBrokerAccounts } from '@/hooks/use-broker-accounts';
import { orcaConfirm } from '@/lib/orca-confirm';

type ProviderId = string;

/* Cooldown formatter: "2.0s" / "32.0s" / "1m 02s" */
function formatCooldown(ms: number): string {
  const totalSec = ms / 1000;
  if (totalSec < 60) return `${totalSec.toFixed(1)}s`;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/* ============= Registry-derived adapter lists =============
 * Phase 3: PROVIDERS and CSV_BROKERS come from BrokerRegistry instead of
 * hardcoded constants. Adding a broker = registering an adapter; tiles
 * appear automatically. */

interface ProviderMeta {
  id: ProviderId;
  name: string;
  tagline: { he: string; en: string };
  gradient: string;
  accent: string;
  enabled: boolean;
}

function metaToProvider(m: BrokerMeta): ProviderMeta {
  return {
    id: m.id,
    name: m.name,
    tagline: m.tagline,
    gradient: m.gradient ?? `linear-gradient(135deg, ${m.accent}2e, ${m.accent}0a)`,
    accent: m.accent,
    enabled: true,
  };
}

interface CsvBrokerMeta {
  id: string;
  name: string;
  tagline: { he: string; en: string };
  accent: string;
  glyph: string;
}

function metaToCsvBroker(m: BrokerMeta): CsvBrokerMeta {
  return {
    id: m.id,
    name: m.name,
    tagline: m.tagline,
    accent: m.accent,
    glyph: m.glyph ?? m.name.slice(0, 2).toUpperCase(),
  };
}

const PROVIDERS: ProviderMeta[] = BrokerRegistry.apiCapable()
  .filter(a => !a.meta.hidden && a.meta.supportsSync)
  .map(a => metaToProvider(a.meta));

const CSV_BROKERS: CsvBrokerMeta[] = BrokerRegistry.fileCapable()
  .filter(a => !a.meta.hidden && a.meta.kind === 'file')
  .map(a => metaToCsvBroker(a.meta));


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
  const [csvBrokerId, setCsvBrokerId] = useState<string | null>(null);

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
    try { window.dispatchEvent(new CustomEvent('orca:exchange-credentials-changed')); } catch {/*noop*/}
    void refresh();
  };

  const [syncingProvider, setSyncingProvider] = useState<ProviderId | null>(null);
  const onSync = async (providerId: ProviderId, label: string | null) => {
    if (!user) return;
    setSyncingProvider(providerId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('NO_SESSION');
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-futures-trades`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ provider: providerId, label: label ?? undefined }),
      });
      const payload = await res.json().catch(() => ({} as { ok?: boolean; inserted?: number; skipped?: number; error?: string; detail?: string }));
      if (res.status === 200 && payload.ok) {
        toast.success(t(
          `סנכרון הושלם • ${payload.inserted ?? 0} חדשות, ${payload.skipped ?? 0} קיימות`,
          `Sync complete • ${payload.inserted ?? 0} new, ${payload.skipped ?? 0} existing`
        ));
        // Notify any listeners (useTrades, journal) that data changed
        window.dispatchEvent(new CustomEvent('orca:trades-synced', { detail: payload }));
      } else if (res.status === 404 || payload.error === 'no_credential') {
        toast.error(t('לא נמצא חיבור פעיל לבורסה.', 'No active exchange connection found.'));
      } else if (res.status === 502 || res.status === 503 || payload.error === 'exchange_error') {
        toast.error(t('הבורסה לא הגיבה. נסה שוב מאוחר יותר.', 'Exchange unavailable. Try again later.'));
      } else {
        toast.error(t('סנכרון נכשל.', 'Sync failed.') + (payload.detail ? ` (${payload.detail})` : ''));
      }
    } catch (e) {
      toast.error(t('שגיאת רשת בסנכרון.', 'Network error during sync.'));
    } finally {
      setSyncingProvider(null);
    }
  };

  return (
    <div>
      <style>{`@keyframes orcaStream { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }`}</style>
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
              onSync={connected ? () => onSync(p.id, conns[0].label) : undefined}
              syncing={syncingProvider === p.id}
            />
          );
        })}
      </div>

      {/* ========== Accounts summary (Phase 3) ========== */}
      <AccountsSummaryStrip T={T} isRTL={isRTL} />


      {/* ============ CSV Import Brokers ============ */}
      <div style={{
        marginTop: 28, marginBottom: 14, padding: '14px 18px',
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(168,85,247,0.06), rgba(168,85,247,0.01))',
        border: `1px solid ${T.border.subtle}`,
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <FileSpreadsheet size={15} color="#a855f7" />
          <h3 style={{ margin: 0, fontFamily: sans, fontWeight: 700, fontSize: 13.5, color: T.text.primary, letterSpacing: 0.3 }}>
            {t('ייבוא מברוקרים (CSV)', 'Broker CSV Import')}
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: T.text.muted, fontFamily: sans }}>
          {t(
            'ברוקרים ופלטפורמות ללא גישת API — גרור קובץ היסטוריית מסחר כדי לטעון אותו אל היומן.',
            'Brokers and platforms without API access — drag a trade history file to import into the journal.'
          )}
        </p>
      </div>

      <style>{`
        @keyframes orcaCsvCardIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes orcaShineSweep { 0% { transform: translateX(-120%) skewX(-18deg); } 100% { transform: translateX(220%) skewX(-18deg); } }
        @keyframes orcaConicSpin { to { transform: rotate(360deg); } }
        @keyframes orcaScanLine { 0% { transform: translateY(-100%); } 100% { transform: translateY(700%); } }
        @keyframes orcaDotOrbit { 0%, 100% { opacity: 0.25; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.1); } }
      `}</style>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
      }}>
        {CSV_BROKERS.map((b, idx) => {
          const active = csvBrokerId === b.id;
          return (
            <button
              key={b.id}
              onClick={() => setCsvBrokerId(active ? null : b.id)}
              style={{
                position: 'relative', textAlign: isRTL ? 'right' : 'left',
                padding: 14, borderRadius: 14,
                background: active
                  ? `linear-gradient(135deg, ${b.accent}22, ${b.accent}06 45%, rgba(11,23,48,0.7))`
                  : 'linear-gradient(135deg, rgba(255,255,255,0.025), rgba(11,23,48,0.55))',
                border: `1px solid ${active ? b.accent + '77' : 'rgba(255,255,255,0.06)'}`,
                backdropFilter: 'blur(22px) saturate(160%)', WebkitBackdropFilter: 'blur(22px) saturate(160%)',
                cursor: 'pointer',
                filter: active ? 'none' : 'saturate(0.45)',
                opacity: active ? 1 : 0.82,
                transition: 'transform .25s cubic-bezier(.16,1,.3,1), filter .25s ease, opacity .25s ease, border-color .25s ease, box-shadow .25s ease, background .25s ease',
                boxShadow: active
                  ? `0 18px 40px -22px ${b.accent}cc, 0 0 0 1px ${b.accent}44, inset 0 1px 0 rgba(255,255,255,0.06)`
                  : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                display: 'flex', flexDirection: 'column', gap: 10,
                overflow: 'hidden',
                animation: `orcaCsvCardIn .35s cubic-bezier(.16,1,.3,1) ${idx * 25}ms both`,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLButtonElement;
                el.style.filter = 'saturate(1)';
                el.style.opacity = '1';
                el.style.transform = 'translateY(-3px)';
                el.style.boxShadow = `0 18px 40px -22px ${b.accent}cc, 0 0 0 1px ${b.accent}55, inset 0 1px 0 rgba(255,255,255,0.08)`;
                el.style.borderColor = `${b.accent}66`;
                const shine = el.querySelector('[data-shine]') as HTMLElement | null;
                if (shine) { shine.style.animation = 'none'; void shine.offsetWidth; shine.style.animation = 'orcaShineSweep 0.9s cubic-bezier(.16,1,.3,1)'; }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLButtonElement;
                if (!active) {
                  el.style.filter = 'saturate(0.45)';
                  el.style.opacity = '0.82';
                  el.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.04)';
                  el.style.borderColor = 'rgba(255,255,255,0.06)';
                }
                el.style.transform = 'none';
              }}
            >
              {/* shine sweep */}
              <span data-shine style={{
                position: 'absolute', top: 0, bottom: 0, width: '40%',
                background: `linear-gradient(90deg, transparent, ${b.accent}22, transparent)`,
                pointerEvents: 'none', mixBlendMode: 'screen',
              }} />
              {/* corner glow */}
              <span style={{
                position: 'absolute', top: -36, insetInlineEnd: -36, width: 110, height: 110,
                background: `radial-gradient(circle, ${b.accent}${active ? '33' : '14'} 0%, transparent 70%)`,
                pointerEvents: 'none', transition: 'background .3s ease',
              }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: `linear-gradient(135deg, ${b.accent}, ${b.accent}88)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#0b1730', fontFamily: mono, fontWeight: 800, fontSize: 12, letterSpacing: 0.5,
                  boxShadow: `0 8px 20px -10px ${b.accent}dd, inset 0 1px 0 rgba(255,255,255,0.28)`,
                  border: '1px solid rgba(255,255,255,0.12)',
                }}>{b.glyph}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 13, color: T.text.primary, lineHeight: 1.2 }}>
                    {b.name}
                  </div>
                  <div style={{ fontFamily: sans, fontSize: 10.5, color: T.text.muted, marginTop: 2, lineHeight: 1.3 }}>
                    {b.tagline[isRTL ? 'he' : 'en']}
                  </div>
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, position: 'relative',
                fontSize: 9.5, fontFamily: mono, color: active ? b.accent : T.text.muted,
                letterSpacing: 0.6, textTransform: 'uppercase', fontWeight: 700,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: active ? b.accent : 'rgba(255,255,255,0.25)',
                  boxShadow: active ? `0 0 8px ${b.accent}` : 'none',
                  animation: active ? 'orcaDotOrbit 1.8s ease-in-out infinite' : undefined,
                }} />
                <UploadCloud size={11} />
                {active ? t('פתוח לטעינה', 'Ready to import') : t('CSV', 'CSV')}
              </div>
            </button>
          );
        })}
      </div>


      {csvBrokerId && (
        <CsvDropZone
          T={T}
          isRTL={isRTL}
          broker={CSV_BROKERS.find(b => b.id === csvBrokerId)!}
          onClose={() => setCsvBrokerId(null)}
        />
      )}


      {openProvider && openProvider !== 'ibkr' && (
        <CredentialModal
          T={T}
          isRTL={isRTL}
          provider={PROVIDERS.find(p => p.id === openProvider)!}
          onClose={() => setOpenProvider(null)}
          onSaved={() => { setOpenProvider(null); void refresh(); }}
        />
      )}

      {syncingProvider && (
        <SyncOverlay
          isRTL={isRTL}
          providerName={PROVIDERS.find(p => p.id === syncingProvider)?.name ?? syncingProvider}
          accent={PROVIDERS.find(p => p.id === syncingProvider)?.accent ?? '#00f2ff'}
        />
      )}
    </div>
  );
}

/* ============================ SYNC OVERLAY ============================ */
function SyncOverlay({ isRTL, providerName, accent }: { isRTL: boolean; providerName: string; accent: string }) {
  const t = (he: string, en: string) => (isRTL ? he : en);
  const sans = "'Poppins', sans-serif";
  const mono = "'IBM Plex Mono', monospace";

  const phases = isRTL
    ? ['מאמת מפתח בכספת', 'מושך 180 ימי היסטוריה', 'ממפה עסקאות ו-PnL', 'שומר במאגר']
    : ['Verifying vault key', 'Fetching 180-day history', 'Mapping trades & PnL', 'Saving to journal'];

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const tick = setInterval(() => setElapsed((Date.now() - t0) / 1000), 100);
    const adv = setInterval(() => setPhaseIdx(i => Math.min(i + 1, phases.length - 1)), 2200);
    return () => { clearInterval(tick); clearInterval(adv); };
  }, [phases.length]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 10050,
        background: 'radial-gradient(ellipse at center, rgba(6,12,28,0.92) 0%, rgba(2,6,15,0.96) 70%)',
        backdropFilter: 'blur(22px) saturate(160%)', WebkitBackdropFilter: 'blur(22px) saturate(160%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, direction: isRTL ? 'rtl' : 'ltr',
        animation: 'orcaFadeIn 0.35s ease',
      }}
    >
      <style>{`
        @keyframes orcaFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes orcaSyncRing { 0% { transform: scale(0.6); opacity: 0.8 } 100% { transform: scale(1.8); opacity: 0 } }
        @keyframes orcaSyncCore { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(0.85); opacity: 0.85 } }
        @keyframes orcaSyncBar { 0% { background-position: 0% 0 } 100% { background-position: 200% 0 } }
        @keyframes orcaDotPulse { 0%,100% { transform: scale(1); opacity: 0.4 } 50% { transform: scale(1.4); opacity: 1 } }
      `}</style>
      <div style={{
        width: '100%', maxWidth: 460, padding: 'clamp(28px,5vw,40px)',
        borderRadius: 22,
        background: 'linear-gradient(180deg, rgba(11,23,48,0.88), rgba(6,12,28,0.92))',
        border: `1px solid ${accent}44`,
        boxShadow: `0 30px 80px -30px ${accent}55, 0 0 0 1px rgba(255,255,255,0.04) inset`,
        fontFamily: sans, color: '#f0f5ff', textAlign: 'center',
      }}>
        <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 24px' }}>
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1px solid ${accent}88`, animation: 'orcaSyncRing 1.8s cubic-bezier(0.4,0,0.2,1) infinite',
          }} />
          <span style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: `1px solid ${accent}66`, animation: 'orcaSyncRing 1.8s cubic-bezier(0.4,0,0.2,1) infinite 0.6s',
          }} />
          <div style={{
            position: 'absolute', inset: 30, borderRadius: '50%',
            background: `radial-gradient(circle, ${accent} 0%, ${accent}aa 50%, transparent 100%)`,
            boxShadow: `0 0 28px ${accent}99`,
            animation: 'orcaSyncCore 1.6s ease-in-out infinite',
          }} />
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.3, marginBottom: 6 }}>
          {t(`מסנכרן את ${providerName}`, `Syncing ${providerName}`)}
        </div>
        <div style={{ fontSize: 12.5, color: 'rgba(240,245,255,0.55)', marginBottom: 22 }}>
          {t('המתן בבקשה — מאחזר את כל העסקאות מהבורסה', 'Please wait — pulling all trades from the exchange')}
        </div>
        <div style={{
          position: 'relative', height: 3, background: 'rgba(255,255,255,0.06)',
          borderRadius: 999, overflow: 'hidden', marginBottom: 22,
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            backgroundSize: '200% 100%',
            animation: 'orcaSyncBar 1.4s linear infinite',
          }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, textAlign: isRTL ? 'right' : 'left' }}>
          {phases.map((p, i) => {
            const done = i < phaseIdx;
            const active = i === phaseIdx;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                opacity: done || active ? 1 : 0.4, transition: 'opacity 0.4s ease',
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: done ? '#22c55e' : active ? accent : 'rgba(255,255,255,0.2)',
                  boxShadow: done ? '0 0 8px rgba(34,197,94,0.6)' : active ? `0 0 8px ${accent}99` : undefined,
                  animation: active ? 'orcaDotPulse 1.2s ease-in-out infinite' : undefined,
                  flexShrink: 0,
                }} />
                <div style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>{p}</div>
              </div>
            );
          })}
        </div>
        <div style={{
          marginTop: 22, paddingTop: 14,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, color: 'rgba(240,245,255,0.4)',
          fontFamily: mono, letterSpacing: 0.5,
        }}>
          <span>{elapsed.toFixed(1)}s</span>
          <span>ORCA · SYNC</span>
        </div>
      </div>
    </div>
  );
}

/* ============================== CARD ============================== */
function ExchangeCard({
  T, meta, connected, loading, connectionLabel, isRTL, onConnect, onDisconnect, onSync, syncing,
}: {
  T: TradingTheme;
  meta: ProviderMeta;
  connected: boolean;
  loading: boolean;
  connectionLabel: string | null;
  isRTL: boolean;
  onConnect: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
  syncing?: boolean;
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
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = await orcaConfirm({
                    title: t('לנתק את החיבור?', 'Disconnect this account?'),
                    description: t('פעולה זו תסיר את החיבור מהחשבון.', 'This will remove the connection from this account.'),
                    confirmLabel: t('נתק', 'Disconnect'),
                    cancelLabel: t('ביטול', 'Cancel'),
                    tone: 'danger',
                    isRTL,
                  });
                  if (ok) onDisconnect();
                }}
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

      {/* Sync Trades — futures fetch engine */}
      {connected && onSync && (
        <button
          onClick={(e) => { e.stopPropagation(); if (!syncing) onSync(); }}
          disabled={syncing}
          style={{
            position: 'relative', overflow: 'hidden',
            marginTop: 10, width: '100%',
            padding: '10px 12px', borderRadius: 10,
            background: syncing
              ? 'linear-gradient(180deg, rgba(6,12,28,0.95), rgba(2,6,15,0.95))'
              : 'linear-gradient(135deg, rgba(0,242,255,0.14), rgba(0,242,255,0.04))',
            border: `1px solid ${syncing ? '#00f2ff66' : '#00f2ff44'}`,
            color: '#7defff',
            fontWeight: 800, fontSize: 11, fontFamily: sans,
            cursor: syncing ? 'wait' : 'pointer', letterSpacing: 0.5,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: syncing ? '0 0 22px -6px #00f2ffaa' : '0 8px 22px -16px #00f2ff',
            transition: 'background .2s ease, box-shadow .2s ease',
          }}
        >
          {syncing ? (
            <>
              <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                {t('מסנכרן…', 'Syncing…')}
              </span>
              <span style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, #00f2ff, transparent)',
                backgroundSize: '200% 100%',
                animation: 'orcaStream 1.1s linear infinite',
                boxShadow: '0 0 10px #00f2ff',
              }} />
            </>
          ) : (
            <>
              <RefreshCw size={11} />
              {t('סנכרן עסקאות פיוצ\'רס', 'Sync Futures Trades')}
            </>
          )}
        </button>
      )}

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
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTick, setNowTick] = useState(Date.now());
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);

  // Live tick while cooldown is active so the button re-enables crisply
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNowTick(Date.now()), 120);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownRemainingMs = Math.max(0, cooldownUntil - nowTick);
  const inCooldown = cooldownRemainingMs > 0;

  type AlertKind = 'success' | 'error';
  interface AlertState {
    kind: AlertKind;
    title: string;
    body: string;
    code?: string;
    shakeKey: number;
  }
  const [alertState, setAlertState] = useState<AlertState | null>(null);

  const canSubmit = apiKey.trim().length >= 8 && apiSecret.trim().length >= 8 && !busy && !inCooldown;

  // Escalating backoff: 1st fail = 2s, every subsequent fail adds +30s.
  // (1=2s, 2=32s, 3=62s, 4=92s, ...)
  const computeCooldownMs = (failures: number) =>
    failures <= 0 ? 0 : (2 + (failures - 1) * 30) * 1000;

  const fireAlert = (a: Omit<AlertState, 'shakeKey'>) => {
    setAlertState({ ...a, shakeKey: Date.now() });
    if (a.kind === 'error') {
      setConsecutiveFailures(prev => {
        const next = prev + 1;
        setCooldownUntil(Date.now() + computeCooldownMs(next));
        return next;
      });
    } else if (a.kind === 'success') {
      setConsecutiveFailures(0);
      setCooldownUntil(0);
    }
  };

  const submit = async () => {
    if (!user) {
      fireAlert({ kind: 'error', title: t('נדרשת התחברות', 'Sign-in required'),
        body: t('יש להתחבר לפני חיבור בורסה.', 'Please sign in before connecting an exchange.'),
        code: 'AUTH_REQUIRED' });
      return;
    }
    if (!canSubmit) return;
    setAlertState(null);
    setBusy(true);

    let status = 0;
    let payload: { ok?: boolean; error?: string; reason?: string; detail?: string } = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setBusy(false);
        fireAlert({ kind: 'error', title: t('פג תוקף החיבור', 'Session expired'),
          body: t('יש להתחבר מחדש.', 'Please sign in again.'), code: 'NO_SESSION' });
        return;
      }
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-exchange-credential`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          provider: provider.id,
          label: label.trim() || 'main',
          api_key: apiKey.trim(),
          api_secret: apiSecret.trim(),
        }),
      });
      status = res.status;
      payload = await res.json().catch(() => ({}));
    } catch {
      setBusy(false);
      fireAlert({ kind: 'error', title: t('שגיאת רשת', 'Network error'),
        body: t('לא ניתן להגיע לשרת. נסה שוב.', 'Could not reach the server. Please try again.'),
        code: 'NETWORK' });
      return;
    }
    setBusy(false);

    const verified = status === 200 && payload.ok === true;

    if (!verified) {
      if (status === 403 || payload.error === 'security_rejected') {
        fireAlert({ kind: 'error',
          title: t('חיבור נדחה — הרשאות גבוהות מדי', 'Connection refused — scope too broad'),
          body: t(
            'מפתח ה־API מכיל הרשאות מסחר או משיכה. Orca מקבלת אך ורק מפתחות לקריאה בלבד (Read-Only).',
            'This API key carries Trading or Withdrawal permissions. Orca accepts strictly Read-Only keys.'
          ),
          code: 'SECURITY_REJECTED' });
      } else if (status === 503 || payload.error === 'connection_error') {
        fireAlert({ kind: 'error',
          title: t('הבורסה לא זמינה', 'Exchange unavailable'),
          body: t('לא הצלחנו לאמת את המפתח מול הבורסה. החיבור נחסם.',
            'We could not verify against the exchange. Connection blocked.'),
          code: 'CONNECTION_ERROR' });
      } else if (status === 429 || payload.error === 'rate_limited') {
        fireAlert({ kind: 'error',
          title: t('יותר מדי ניסיונות', 'Rate-limited'),
          body: t('המתן דקה ונסה שוב.', 'Please wait a minute and try again.'),
          code: 'RATE_LIMITED' });
      } else if (status === 401 || payload.error === 'unauthorized') {
        fireAlert({ kind: 'error',
          title: t('נדרשת התחברות מחדש', 'Re-authentication required'),
          body: t('הסשן פג. התחבר מחדש.', 'Your session expired. Please sign in again.'),
          code: 'UNAUTHORIZED' });
      } else if (
        payload.error === 'invalid_api_key' ||
        payload.error === 'invalid_api_secret' ||
        payload.error === 'invalid_label' ||
        payload.error === 'invalid_body'
      ) {
        fireAlert({ kind: 'error',
          title: t('קלט לא תקין', 'Invalid input'),
          body: t(
            'המפתח או הסוד מכילים תווים אסורים. הדבק את הערכים כפי שסופקו על ידי הבורסה.',
            'The key or secret contains forbidden characters. Paste the values exactly as the exchange provided them.'
          ),
          code: payload.error?.toUpperCase() });
      } else {
        fireAlert({ kind: 'error',
          title: t('האימות נכשל', 'Verification failed'),
          body: payload.detail || payload.error || `HTTP ${status}`,
          code: `HTTP_${status}` });
      }
      return;
    }

    fireAlert({ kind: 'success',
      title: t(`${provider.name} מחובר`, `${provider.name} connected`),
      body: t('המפתח אומת כ־Read-Only ואוחסן בכספת השרת.',
        'Key verified as Read-Only and sealed inside the server vault.'),
      code: 'VAULT_SEALED' });
    setApiKey(''); setApiSecret('');
    try { window.dispatchEvent(new CustomEvent('orca:exchange-credentials-changed', { detail: { provider: provider.id } })); } catch {/*noop*/}
    setTimeout(() => onSaved(), 1600);
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

        {/* Embedded Onboarding Guide (Phase 4) */}
        <KeyGuide T={T} isRTL={isRTL} provider={provider} />
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
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', position: 'relative' }}>
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
            aria-busy={busy}
            style={{
              position: 'relative', overflow: 'hidden',
              padding: '11px 18px', borderRadius: 10,
              minWidth: 168,
              background: busy
                ? 'linear-gradient(180deg, rgba(6,12,28,0.95), rgba(2,6,15,0.95))'
                : inCooldown
                ? 'rgba(255,59,92,0.10)'
                : canSubmit ? provider.accent : T.bg.tertiary,
              border: busy
                ? `1px solid ${provider.accent}66`
                : inCooldown
                ? '1px solid rgba(255,59,92,0.45)'
                : 'none',
              color: busy
                ? provider.accent
                : inCooldown
                ? '#ff8198'
                : canSubmit ? '#06121f' : T.text.muted,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontWeight: 800, fontSize: 12.5, fontFamily: sans,
              letterSpacing: 0.4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: busy
                ? `0 0 22px -6px ${provider.accent}aa, inset 0 0 0 1px rgba(255,255,255,0.04)`
                : inCooldown
                ? '0 0 22px -10px rgba(255,59,92,0.6)'
                : canSubmit ? `0 12px 28px -16px ${provider.accent}` : 'none',
              transition: 'background .2s ease, color .2s ease, box-shadow .2s ease',
            }}
          >
            {busy ? (
              <>
                {/* Premium data-stream loader replaces the label */}
                <span style={{
                  fontFamily: mono, fontSize: 10.5, fontWeight: 800,
                  letterSpacing: 1.4, textTransform: 'uppercase',
                }}>
                  {t('מאמת…', 'Verifying…')}
                </span>
                <span style={{
                  position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
                  background: `linear-gradient(90deg, transparent, ${provider.accent}, transparent)`,
                  backgroundSize: '200% 100%',
                  animation: 'orcaStream 1.1s linear infinite',
                  boxShadow: `0 0 10px ${provider.accent}`,
                }} />
              </>
            ) : inCooldown ? (
              <>
                <Lock size={12} />
                <span style={{ fontFamily: mono, letterSpacing: 1 }}>
                  {t('נעול', 'Locked')} {formatCooldown(cooldownRemainingMs)}
                </span>
              </>
            ) : (
              <>
                <Plug size={13} />
                {t('חבר חשבון', 'Connect Account')}
              </>
            )}
          </button>
        </div>

        {/* Cinematic in-modal alert overlay (replaces toasts) */}
        {(busy || alertState) && (
          <CinematicAlert
            T={T}
            isRTL={isRTL}
            loading={busy}
            alert={alertState}
            onDismiss={() => setAlertState(null)}
          />
        )}

        <style>{`
          .orca-spin { animation: orcaSpin 0.9s linear infinite; }
          @keyframes orcaSpin { to { transform: rotate(360deg); } }
          @keyframes orcaAlertIn {
            0%   { opacity: 0; transform: translateY(8px) scale(0.96); filter: blur(6px); }
            100% { opacity: 1; transform: translateY(0)   scale(1);    filter: blur(0); }
          }
          @keyframes orcaShake {
            0%, 100% { transform: translateX(0); }
            15%      { transform: translateX(-6px); }
            30%      { transform: translateX(5px); }
            45%      { transform: translateX(-4px); }
            60%      { transform: translateX(3px); }
            75%      { transform: translateX(-2px); }
            90%      { transform: translateX(1px); }
          }
          @keyframes orcaPulseGlow {
            0%, 100% { opacity: .55; transform: scale(1); }
            50%      { opacity: 1;   transform: scale(1.08); }
          }
          @keyframes orcaRadarSweep {
            0%   { transform: rotate(0deg);   opacity: 0; }
            10%  { opacity: .9; }
            90%  { opacity: .9; }
            100% { transform: rotate(360deg); opacity: 0; }
          }
          @keyframes orcaScanLine {
            0%   { transform: translateY(-100%); }
            100% { transform: translateY(220%); }
          }
          @keyframes orcaStream {
            0%   { background-position: 0% 50%; }
            100% { background-position: 200% 50%; }
          }
        `}</style>
      </div>
    </div>
  );
}

/* ====================== CINEMATIC ALERT BLOCK ====================== */
function CinematicAlert({
  T, isRTL, loading, alert, onDismiss,
}: {
  T: TradingTheme;
  isRTL: boolean;
  loading: boolean;
  alert: { kind: 'success' | 'error'; title: string; body: string; code?: string; shakeKey: number } | null;
  onDismiss: () => void;
}) {
  const sans = "'Poppins', sans-serif";
  const mono = "'IBM Plex Mono', monospace";
  const t = (he: string, en: string) => (isRTL ? he : en);

  const isError = alert?.kind === 'error';
  const isSuccess = alert?.kind === 'success';
  const stateColor = loading ? '#00f2ff' : isError ? '#ff3b5c' : '#22e08a';
  const stateGradient = loading
    ? 'linear-gradient(135deg, rgba(0,242,255,0.95), rgba(20,20,28,0.4))'
    : isError
    ? 'linear-gradient(135deg, rgba(255,59,92,0.95), rgba(20,20,28,0.4))'
    : 'linear-gradient(135deg, rgba(34,224,138,0.95), rgba(20,20,28,0.4))';

  const subhead = loading
    ? t('מאמת מול הבורסה', 'Verifying against exchange')
    : isError ? t('חיבור נחסם', 'Connection blocked')
    : t('כספת נחתמה', 'Vault sealed');

  return (
    <div
      style={{
        position: 'absolute', inset: -22, // covers the modal padding fully
        zIndex: 3,
        background: 'rgba(2,4,10,0.62)',
        backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
        borderRadius: 18,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 22,
        animation: 'orcaAlertIn 480ms cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <div
        key={alert?.shakeKey ?? 'loading'}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 440,
          padding: 2,
          borderRadius: 16,
          background: stateGradient,
          boxShadow: `0 24px 70px -28px ${stateColor}, 0 0 0 1px rgba(255,255,255,0.03)`,
          animation: isError
            ? 'orcaAlertIn 520ms cubic-bezier(0.16,1,0.3,1) both, orcaShake 520ms 480ms cubic-bezier(.36,.07,.19,.97) both'
            : 'orcaAlertIn 520ms cubic-bezier(0.16,1,0.3,1) both',
        }}
      >
        <div style={{
          background: 'linear-gradient(180deg, rgba(6,8,14,0.96), rgba(2,4,10,0.96))',
          borderRadius: 14,
          padding: 22,
          fontFamily: sans,
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Internal glow */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(120% 60% at 50% 0%, ${stateColor}22 0%, transparent 60%)`,
          }} />

          {/* Subhead */}
          <div style={{
            fontFamily: mono, fontSize: 9.5, fontWeight: 800,
            color: stateColor, letterSpacing: 1.2, textTransform: 'uppercase',
            marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: stateColor, boxShadow: `0 0 10px ${stateColor}`,
              animation: 'orcaPulseGlow 1.6s ease-in-out infinite',
            }} />
            {subhead}
            {alert?.code && (
              <span style={{
                marginInlineStart: 'auto',
                fontSize: 9, color: T.text.muted, letterSpacing: 1,
              }}>
                {alert.code}
              </span>
            )}
          </div>

          {/* Icon + content */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <AlertSigil color={stateColor} kind={loading ? 'scan' : isError ? 'shield-x' : 'shield-check'} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 17, fontWeight: 800, color: '#fff',
                letterSpacing: 0.2, marginBottom: 6, lineHeight: 1.25,
              }}>
                {loading
                  ? t('סורק הרשאות מפתח...', 'Scanning key permissions...')
                  : alert?.title}
              </div>
              <div style={{
                fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.6,
              }}>
                {loading
                  ? t(
                      'תקשורת מאובטחת מול שרת האימות. אנא המתן.',
                      'Establishing a sealed channel with the verification server. Please wait.'
                    )
                  : alert?.body}
              </div>

              {/* Loading data-stream */}
              {loading && (
                <div style={{
                  marginTop: 14, height: 4, borderRadius: 4, overflow: 'hidden',
                  background: 'rgba(0,242,255,0.08)',
                  border: '1px solid rgba(0,242,255,0.18)',
                }}>
                  <div style={{
                    width: '40%', height: '100%',
                    background: 'linear-gradient(90deg, transparent, #00f2ff, transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'orcaStream 1.4s linear infinite',
                  }} />
                </div>
              )}

              {/* Dismiss for non-loading alerts */}
              {!loading && (
                <button
                  onClick={onDismiss}
                  style={{
                    marginTop: 16,
                    padding: '8px 14px', borderRadius: 8,
                    background: 'transparent',
                    border: `1px solid ${stateColor}55`,
                    color: stateColor,
                    fontFamily: mono, fontSize: 10.5, fontWeight: 800,
                    letterSpacing: 0.8, textTransform: 'uppercase',
                    cursor: 'pointer',
                  }}
                >
                  {isError ? t('סגור', 'Dismiss') : t('הבנתי', 'Acknowledge')}
                </button>
              )}
            </div>
          </div>

          {/* Loading scan-line over modal */}
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', insetInline: 0, height: 2,
                background: `linear-gradient(90deg, transparent, ${stateColor}, transparent)`,
                boxShadow: `0 0 14px ${stateColor}`,
                animation: 'orcaScanLine 1.8s linear infinite',
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertSigil({ color, kind }: { color: string; kind: 'scan' | 'shield-check' | 'shield-x' }) {
  const size = 56;
  return (
    <div style={{
      position: 'relative', width: size, height: size, flexShrink: 0,
      borderRadius: '50%',
      background: `radial-gradient(circle at 50% 50%, ${color}22 0%, transparent 70%)`,
    }}>
      {/* Radar sweep */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: `conic-gradient(from 0deg, transparent 0deg, ${color}55 60deg, transparent 120deg)`,
        animation: 'orcaRadarSweep 2.4s linear infinite',
        maskImage: 'radial-gradient(circle, black 60%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 70%)',
      }} />
      {/* Pulse ring */}
      <div style={{
        position: 'absolute', inset: 6, borderRadius: '50%',
        border: `1px solid ${color}66`,
        animation: 'orcaPulseGlow 1.8s ease-in-out infinite',
      }} />
      {/* Inner glyph */}
      <svg
        viewBox="0 0 24 24" width={size} height={size}
        style={{ position: 'absolute', inset: 0, display: 'block' }}
        fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3z"
          style={{ filter: `drop-shadow(0 0 6px ${color}88)` }} />
        {kind === 'shield-check' && <path d="M8.5 12.2l2.4 2.4 4.6-4.8" />}
        {kind === 'shield-x' && (
          <>
            <path d="M9 9.5l6 6" />
            <path d="M15 9.5l-6 6" />
          </>
        )}
        {kind === 'scan' && (
          <path d="M7.5 12h9" style={{
            transformOrigin: '12px 12px',
            animation: 'orcaPulseGlow 1.4s ease-in-out infinite',
          }} />
        )}
      </svg>
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

/* ====================== KEY GUIDE — LAUNCHER + LARGE MODAL ====================== */
function KeyGuide({ T, isRTL, provider }: { T: TradingTheme; isRTL: boolean; provider: ProviderMeta }) {
  const [open, setOpen] = useState(false);
  const t = (he: string, en: string) => (isRTL ? he : en);
  const sans = "'Poppins', sans-serif";
  const mono = "'IBM Plex Mono', monospace";

  type Step = { he: { title: string; body: string }; en: { title: string; body: string } };
  const steps: Step[] = provider.id === 'bybit' ? [
    {
      he: { title: 'התחבר לחשבון Bybit שלך', body: 'פתח את האתר bybit.com ולחץ "Log In" בפינה הימנית. אם אין לך חשבון — צור אחד והשלם את אימות הזהות.' },
      en: { title: 'Log in to your Bybit account', body: 'Open bybit.com and click "Log In" at the top right. If you do not have an account, create one and complete identity verification first.' },
    },
    {
      he: { title: 'פתח את עמוד ה-API', body: 'לחץ על תמונת הפרופיל שלך → "Account & Security" → ולאחר מכן "API". זה הדף שבו יוצרים מפתחות חדשים.' },
      en: { title: 'Open the API page', body: 'Click your profile picture → "Account & Security" → then "API". This is where new keys are created.' },
    },
    {
      he: { title: 'צור מפתח חדש', body: 'לחץ על הכפתור הכחול "Create New Key", ובחר באפשרות "System-generated API Keys". Bybit ייצור את הקוד עבורך — לא תצטרך להמציא דבר.' },
      en: { title: 'Create a new key', body: 'Click the blue "Create New Key" button and choose "System-generated API Keys". Bybit will generate the code for you — you do not need to invent anything.' },
    },
    {
      he: { title: 'בחר הרשאות — קריאה בלבד!', body: 'תחת "Permissions" סמן אך ורק את "Read-Only". הפעל את "Unified Trading / Contract" — גם אלו לקריאה בלבד. אל תסמן Trade, Withdraw, Transfer או Options — לעולם!' },
      en: { title: 'Select permissions — Read-Only ONLY!', body: 'Under "Permissions" tick ONLY "Read-Only". Enable "Unified Trading / Contract" — these are still read-only scopes. NEVER tick Trade, Withdraw, Transfer, or Options.' },
    },
    {
      he: { title: 'אשר ושמור', body: 'הזן את קוד האימות מה-Google Authenticator או מה-Email. Bybit יציג לך עכשיו API Key ו-API Secret. שמור אותם במקום בטוח — לא תוכל לראות את ה-Secret שוב.' },
      en: { title: 'Confirm and save', body: 'Enter the 2FA code from Google Authenticator or your email. Bybit will now show you an API Key and API Secret. Save them — you cannot view the Secret again.' },
    },
    {
      he: { title: 'הדבק כאן את שני הקודים', body: 'חזור לחלון הזה והדבק את ה-API Key ואת ה-API Secret בשדות למטה. לחץ "אמת ושמור". זה הכל — Orca יבדוק שהמפתח באמת לקריאה בלבד וישמור אותו בכספת מוצפנת.' },
      en: { title: 'Paste both keys here', body: 'Return to this window and paste the API Key and API Secret into the fields below. Click "Verify & Save". Orca will confirm the key is truly read-only and seal it inside an encrypted vault.' },
    },
  ] : [
    {
      he: { title: 'התחבר ל-Binance', body: 'פתח את binance.com ולחץ "Log In". אם אין לך חשבון, צור אחד והשלם את אימות הזהות (KYC) לפני שתמשיך.' },
      en: { title: 'Log in to Binance', body: 'Open binance.com and click "Log In". If you do not have an account, create one and complete identity verification (KYC) before continuing.' },
    },
    {
      he: { title: 'פתח את עמוד ניהול ה-API', body: 'לחץ על תמונת הפרופיל בפינה הימנית → "Account" → "API Management". זה הדף לניהול מפתחות.' },
      en: { title: 'Open API Management', body: 'Click your profile in the top corner → "Account" → "API Management". This is the page where keys are managed.' },
    },
    {
      he: { title: 'צור API חדש', body: 'לחץ על הכפתור הצהוב "Create API" ובחר "System Generated". תן למפתח שם פשוט כמו "orca".' },
      en: { title: 'Create a new API', body: 'Click the yellow "Create API" button and choose "System Generated". Give the key a simple name like "orca".' },
    },
    {
      he: { title: 'אשר באמצעות אימייל ו-2FA', body: 'Binance ישלח לך אימייל ויבקש קוד מה-Google Authenticator. הזן את הקודים כדי להמשיך.' },
      en: { title: 'Confirm via email and 2FA', body: 'Binance will send you an email and ask for a Google Authenticator code. Enter both codes to continue.' },
    },
    {
      he: { title: 'הגדר הרשאות — קריאה בלבד!', body: 'תחת "API restrictions" השאר מסומן אך ורק את "Enable Reading". בטל את הסימון מ-Spot Trading, Margin, Futures Trading ו-Withdrawals. לעולם אל תסמן אותם!' },
      en: { title: 'Set permissions — Reading ONLY!', body: 'Under "API restrictions" leave ONLY "Enable Reading" ticked. Uncheck Spot Trading, Margin, Futures Trading and Withdrawals. Never enable them!' },
    },
    {
      he: { title: 'הדבק כאן את שני הקודים', body: 'העתק את ה-API Key ואת ה-Secret Key, חזור לחלון הזה, והדבק אותם בשדות למטה. לחץ "אמת ושמור" — אנחנו נוודא שהמפתח באמת לקריאה בלבד.' },
      en: { title: 'Paste both keys here', body: 'Copy the API Key and Secret Key, return to this window, and paste them into the fields below. Click "Verify & Save" — we will confirm the key is truly read-only.' },
    },
  ];

  return (
    <>
      {/* Prominent launcher button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: '100%', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderRadius: 12,
          background: `linear-gradient(135deg, ${provider.accent}26, ${provider.accent}08)`,
          border: `1px solid ${provider.accent}66`,
          boxShadow: `0 12px 30px -18px ${provider.accent}cc, inset 0 0 0 1px rgba(255,255,255,0.04)`,
          color: T.text.primary, cursor: 'pointer',
          fontFamily: sans, fontWeight: 700, fontSize: 13,
          letterSpacing: 0.2, textAlign: isRTL ? 'right' : 'left',
          transition: 'transform .15s ease, box-shadow .2s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `linear-gradient(135deg, ${provider.accent}, ${provider.accent}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: `0 4px 14px -2px ${provider.accent}99`,
        }}>
          <BookOpen size={18} color="#0b1730" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: T.text.primary, marginBottom: 2 }}>
            {t('מדריך שלב-אחר-שלב', 'Step-by-step walkthrough')}
          </div>
          <div style={{ fontSize: 11, fontWeight: 500, color: T.text.muted, lineHeight: 1.45 }}>
            {t(
              `איך מוציאים מפתח API בטוח מ-${provider.name}? לחץ כאן — מוסבר בשפה פשוטה, ללא ידע טכני.`,
              `How to create a safe API key on ${provider.name}? Click here — explained in plain language, no tech skills needed.`
            )}
          </div>
        </div>
        <ChevronDown size={16} color={provider.accent} style={{ flexShrink: 0, transform: 'rotate(-90deg)' }} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10080,
            background: 'rgba(2,6,15,0.82)',
            backdropFilter: 'blur(18px) saturate(160%)', WebkitBackdropFilter: 'blur(18px) saturate(160%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, direction: isRTL ? 'rtl' : 'ltr',
            animation: 'orcaFadeIn 0.3s ease',
          }}
        >
          <style>{`
            @keyframes orcaFadeIn { from { opacity: 0 } to { opacity: 1 } }
            @keyframes orcaGuideIn { from { opacity: 0; transform: translateY(14px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
          `}</style>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto',
              background: 'linear-gradient(180deg, rgba(11,23,48,0.98), rgba(6,12,28,0.98))',
              border: `1px solid ${provider.accent}55`,
              borderRadius: 20,
              padding: 'clamp(22px, 4vw, 32px)',
              boxShadow: `0 40px 100px -30px ${provider.accent}66, inset 0 0 0 1px rgba(255,255,255,0.04)`,
              fontFamily: sans, color: T.text.primary,
              animation: 'orcaGuideIn 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 22 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 10.5, fontWeight: 800, fontFamily: mono,
                  color: provider.accent, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6,
                }}>
                  {provider.name} · {t('מדריך אימות API', 'API onboarding guide')}
                </div>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: -0.4, color: T.text.primary }}>
                  {t('צור מפתח API לקריאה בלבד', 'Create a Read-Only API key')}
                </h2>
                <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.55, color: T.text.muted }}>
                  {t(
                    'עקוב אחרי השלבים אחד-אחד. בכל שלב הסבר מפורט בשפה פשוטה — גם אם אתה רחוק מטכנולוגיה.',
                    'Follow the steps one by one. Each step is explained in plain language — even if you have zero technical background.'
                  )}
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="close"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${T.border.subtle}`,
                  borderRadius: 10, color: T.text.secondary, cursor: 'pointer',
                  padding: 8, display: 'inline-flex', flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {steps.map((s, i) => {
                const copy = s[isRTL ? 'he' : 'en'];
                return (
                  <div key={i} style={{
                    display: 'flex', gap: 14,
                    padding: '16px 18px',
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, rgba(0,242,255,0.04), rgba(11,23,48,0.5))',
                    border: `1px solid ${T.border.subtle}`,
                  }}>
                    <div style={{
                      flexShrink: 0,
                      width: 38, height: 38, borderRadius: 12,
                      background: `linear-gradient(135deg, ${provider.accent}, ${provider.accent}aa)`,
                      color: '#0b1730',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: mono, fontWeight: 800, fontSize: 14,
                      boxShadow: `0 6px 16px -4px ${provider.accent}88`,
                    }}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 14.5, fontWeight: 700, color: T.text.primary,
                        marginBottom: 4, letterSpacing: -0.1,
                      }}>
                        {copy.title}
                      </div>
                      <div style={{
                        fontSize: 13, lineHeight: 1.6, color: T.text.secondary,
                      }}>
                        {copy.body}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Firewall notice */}
            <div style={{
              marginTop: 18, padding: '14px 16px', borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.03))',
              border: '1px solid rgba(245,158,11,0.5)',
              boxShadow: '0 0 26px -10px rgba(245,158,11,0.7), inset 0 0 0 1px rgba(245,158,11,0.05)',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <AlertTriangle size={18} color="#fbbf24" style={{
                flexShrink: 0, marginTop: 1,
                filter: 'drop-shadow(0 0 4px rgba(251,191,36,0.7))',
              }} />
              <div style={{ fontSize: 13, lineHeight: 1.55, color: '#fde68a' }}>
                <div style={{ color: '#fcd34d', fontWeight: 800, marginBottom: 3, letterSpacing: 0.2 }}>
                  {t('חומת המגן של Orca', 'Orca Firewall')}
                </div>
                {t(
                  'כל מפתח עם הרשאות מסחר או משיכה יידחה אוטומטית על-ידי השרת. אנחנו מקבלים אך ורק מפתחות לקריאה בלבד — הכסף שלך לעולם לא בסיכון.',
                  'Any key with Trading or Withdrawal permissions is automatically rejected by our server. Only strict Read-Only keys are accepted — your funds are never at risk.'
                )}
              </div>
            </div>

            {/* Close CTA */}
            <button
              onClick={() => setOpen(false)}
              style={{
                marginTop: 18, width: '100%',
                padding: '13px 18px', borderRadius: 12,
                background: `linear-gradient(135deg, ${provider.accent}, ${provider.accent}cc)`,
                color: '#0b1730', border: 'none', cursor: 'pointer',
                fontFamily: sans, fontWeight: 800, fontSize: 13.5, letterSpacing: 0.3,
                boxShadow: `0 14px 30px -12px ${provider.accent}aa`,
              }}
            >
              {t('הבנתי — בוא נדביק את המפתחות', 'Got it — let me paste the keys')}
            </button>
          </div>
        </div>
      )}
    </>
  );
}


/* ============================ CSV DROP ZONE ============================ */
function CsvDropZone({
  T, isRTL, broker, onClose,
}: {
  T: TradingTheme;
  isRTL: boolean;
  broker: CsvBrokerMeta;
  onClose: () => void;
}) {
  const t = (he: string, en: string) => (isRTL ? he : en);
  const sans = "'Poppins', sans-serif";
  const mono = "'IBM Plex Mono', monospace";
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [doneFile, setDoneFile] = useState<string | null>(null);

  // CSV pipeline (Phase 2 Broker-Agnostic): parse via the registered adapter
  // for `broker.id`, which yields NormalizedTrades that carry full provenance
  // (broker_id, source_type, external_id, etc.). The file-import bridge maps
  // them onto legacy Trade objects + `__provenance` so `useTrades.importTrades`
  // → `saveTrades` populates the new first-class DB columns automatically.
  const { importTrades } = useTrades();
  const handleFiles = async (files: FileList | File[]) => {
    const f = files[0];
    if (!f) return;
    setProcessing(true);
    setDoneFile(null);
    try {
      // ── UIE: the SOLE CSV-import path (legacy fallback removed) ───────────
      const outcome = await runImportWithPreflight(f, { brokerId: broker.id });
      if (!outcome.ok) {
        if (outcome.reason && outcome.reason !== 'user_cancelled') {
          toast.error(t('נכשל בעיבוד הקובץ', 'Failed to process file'), { description: outcome.reason });
        }
        setProcessing(false);
        return;
      }
      await importTrades(outcome.drafts as unknown as Parameters<typeof importTrades>[0]);
      window.dispatchEvent(new CustomEvent('orca:trades-synced'));
      setDoneFile(f.name);
      toast.success(t('הנתונים נטענו בהצלחה', 'Data loaded successfully'), {
        description: t(
          `${outcome.drafts.length} עסקאות יובאו · ${outcome.equityPointsAdded} נקודות יתרה`,
          `${outcome.drafts.length} trades imported · ${outcome.equityPointsAdded} balance points`,
        ),
      });
    } catch (e) {
      console.error('[CSV Import] failed', e);
      toast.error(t('נכשל בעיבוד הקובץ', 'Failed to process file'));
    } finally {
      setProcessing(false);
    }
  };


  return (
    <div
      style={{
        marginTop: 16,
        borderRadius: 20,
        padding: 22,
        background: `
          radial-gradient(120% 80% at 100% 0%, ${broker.accent}18, transparent 55%),
          radial-gradient(80% 60% at 0% 100%, ${broker.accent}10, transparent 60%),
          linear-gradient(180deg, rgba(13,23,44,0.78), rgba(6,12,24,0.78))
        `,
        border: `1px solid rgba(255,255,255,0.07)`,
        backdropFilter: 'blur(26px) saturate(170%)', WebkitBackdropFilter: 'blur(26px) saturate(170%)',
        boxShadow: `0 30px 80px -34px ${broker.accent}88, inset 0 1px 0 rgba(255,255,255,0.05)`,
        direction: isRTL ? 'rtl' : 'ltr',
        animation: 'orcaDropIn .4s cubic-bezier(.16,1,.3,1)',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes orcaDropIn { from { opacity: 0; transform: translateY(10px) scale(.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes orcaConicSpin { to { transform: rotate(360deg); } }
        @keyframes orcaScanY { 0% { transform: translateY(-10%); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(110%); opacity: 0; } }
        @keyframes orcaSpin { to { transform: rotate(360deg); } }
        @keyframes orcaGridShift { 0% { background-position: 0 0; } 100% { background-position: 24px 24px; } }
        @keyframes orcaPulseRing { 0%, 100% { opacity: .4; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
      `}</style>

      <button
        onClick={onClose}
        aria-label={t('סגור', 'Close')}
        style={{
          position: 'absolute', top: 12, insetInlineEnd: 12,
          width: 28, height: 28, borderRadius: 8,
          background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)',
          color: T.text.muted, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background .2s ease, color .2s ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#fff'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.55)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = T.text.muted; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.35)'; }}
      ><X size={14} /></button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: `linear-gradient(135deg, ${broker.accent}, ${broker.accent}99)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#0b1730', fontFamily: mono, fontWeight: 800, fontSize: 11,
          boxShadow: `0 8px 20px -10px ${broker.accent}, inset 0 1px 0 rgba(255,255,255,0.28)`,
          border: '1px solid rgba(255,255,255,0.12)',
        }}>{broker.glyph}</div>
        <div>
          <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 13, color: T.text.primary, lineHeight: 1.2 }}>
            {broker.name}
          </div>
          <div style={{ fontFamily: mono, fontSize: 9.5, color: T.text.muted, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 }}>
            {t('ייבוא CSV', 'CSV Import')}
          </div>
        </div>
      </div>

      {/* Wrapper for animated gradient border */}
      <div style={{ position: 'relative', borderRadius: 18, padding: 1.5 }}>
        {/* spinning conic gradient border on drag-over */}
        {dragOver && (
          <span aria-hidden style={{
            position: 'absolute', inset: -40,
            background: `conic-gradient(from 0deg, transparent 0deg, ${broker.accent} 60deg, transparent 120deg, ${broker.accent}88 200deg, transparent 280deg)`,
            animation: 'orcaConicSpin 3.2s linear infinite',
            filter: 'blur(8px)',
            pointerEvents: 'none',
            borderRadius: 'inherit',
          }} />
        )}
        <div
          onClick={() => !processing && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault(); setDragOver(false);
            if (processing) return;
            if (e.dataTransfer.files?.length) void handleFiles(e.dataTransfer.files);
          }}
          style={{
            position: 'relative',
            borderRadius: 16,
            padding: '42px 22px',
            background: `
              linear-gradient(180deg, rgba(6,12,24,0.85), rgba(6,12,24,0.6)),
              repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 24px),
              repeating-linear-gradient(90deg, rgba(255,255,255,0.018) 0 1px, transparent 1px 24px)
            `,
            backgroundSize: 'auto, 24px 24px, 24px 24px',
            animation: dragOver ? 'orcaGridShift 4s linear infinite' : undefined,
            border: `1.5px dashed ${dragOver ? 'transparent' : 'rgba(255,255,255,0.12)'}`,
            cursor: processing ? 'wait' : 'pointer',
            transition: 'background .25s ease, border-color .25s ease',
            textAlign: 'center',
            minHeight: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
            overflow: 'hidden',
          }}
        >
          {/* drag-over inner glow */}
          {dragOver && (
            <span aria-hidden style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(60% 50% at 50% 50%, ${broker.accent}1f, transparent 70%)`,
              pointerEvents: 'none',
            }} />
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt,.tsv,.xlsx,.xls"
            style={{ display: 'none' }}
            onChange={e => { if (e.target.files?.length) void handleFiles(e.target.files); }}
          />

          {processing ? (
            <>
              {/* scan line */}
              <span aria-hidden style={{
                position: 'absolute', left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, transparent, ${broker.accent}, transparent)`,
                boxShadow: `0 0 14px ${broker.accent}`,
                animation: 'orcaScanY 1.4s cubic-bezier(.4,0,.6,1) infinite',
                pointerEvents: 'none',
              }} />
              {/* pulse ring around loader */}
              <div style={{ position: 'relative', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span aria-hidden style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: `1px solid ${broker.accent}66`,
                  animation: 'orcaPulseRing 1.6s ease-in-out infinite',
                }} />
                <Loader2 size={32} color={broker.accent} style={{ animation: 'orcaSpin 1s linear infinite' }} />
              </div>
              <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 14.5, color: T.text.primary, letterSpacing: 0.2 }}>
                {t('מעבד נתונים…', 'Processing data…')}
              </div>
              <div style={{ fontFamily: mono, fontSize: 10.5, color: T.text.muted, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {t('קורא שורות • חישוב PnL • מיפוי שדות', 'Reading rows • computing PnL • field mapping')}
              </div>
            </>

        ) : doneFile ? (
          <>
            <CheckCircle2 size={36} color="#10b981" />
            <div style={{ fontFamily: sans, fontWeight: 700, fontSize: 14, color: T.text.primary }}>
              {t('הקובץ נטען', 'File loaded')}
            </div>
            <div style={{ fontFamily: mono, fontSize: 11, color: T.text.muted }}>{doneFile}</div>
            <button
              onClick={(e) => { e.stopPropagation(); setDoneFile(null); inputRef.current?.click(); }}
              style={{
                marginTop: 6, padding: '8px 14px', borderRadius: 8,
                background: 'transparent', border: `1px solid ${broker.accent}66`,
                color: broker.accent, fontFamily: sans, fontWeight: 700, fontSize: 11,
                cursor: 'pointer', letterSpacing: 0.4,
              }}
            >{t('טען קובץ נוסף', 'Load another file')}</button>
          </>
        ) : (
          <>
            <UploadCloud size={38} color={dragOver ? broker.accent : T.text.muted} />
            <div style={{
              fontFamily: sans, fontWeight: 700, fontSize: 14.5, color: T.text.primary, lineHeight: 1.4,
              maxWidth: 480,
            }}>
              {t('גרור ושחרר קובץ CSV או היסטוריית מסחר', 'Drag & drop a CSV or trade history file')}
            </div>
            <div style={{
              fontFamily: sans, fontSize: 11.5, color: T.text.muted, lineHeight: 1.5,
              maxWidth: 460,
            }}>
              {t(
                'המערכת תשאב את הנתונים הפיננסיים ותחשב אוטומטית שווי דולרי',
                'The system will extract the financial data and auto-compute the USD value'
              )}
            </div>
            <div style={{
              marginTop: 6, fontFamily: mono, fontSize: 10, color: T.text.muted,
              letterSpacing: 0.6, textTransform: 'uppercase',
            }}>
              {t('או לחץ לבחירה ידנית', 'or click to browse')}
            </div>
          </>
        )}
        </div>
      </div>
    </div>

  );
}

/* =============== AccountsSummaryStrip (Phase 3) ===============
 * Shows distinct (broker_id, account_label) combinations the user already
 * has trades for. Renders nothing when empty so the UI stays calm for new users.
 */
function AccountsSummaryStrip({ T, isRTL }: { T: TradingTheme; isRTL: boolean }) {
  const t = (he: string, en: string) => (isRTL ? he : en);
  const sans = "'Poppins', sans-serif";
  const mono = "'IBM Plex Mono', monospace";
  const { accounts, loading } = useBrokerAccounts();
  if (loading || accounts.length === 0) return null;
  return (
    <div style={{
      marginTop: 18, padding: '12px 16px',
      borderRadius: 12,
      background: 'linear-gradient(135deg, rgba(34,197,94,0.06), rgba(34,197,94,0.01))',
      border: `1px solid ${T.border.subtle}`,
      backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Users size={14} color="#22c55e" />
        <h4 style={{ margin: 0, fontFamily: sans, fontWeight: 700, fontSize: 12.5, color: T.text.primary, letterSpacing: 0.3 }}>
          {t('חשבונות עם נתונים', 'Accounts with data')}
        </h4>
        <span style={{ fontFamily: mono, fontSize: 10, color: T.text.muted, letterSpacing: 0.5 }}>
          {accounts.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {accounts.map(a => {
          const adapter = BrokerRegistry.byId(a.broker_id);
          const accent = adapter?.meta.accent ?? '#94a3b8';
          const name = adapter?.meta.name ?? a.broker_id;
          return (
            <div key={`${a.broker_id}::${a.account_label ?? ''}`} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 10px', borderRadius: 999,
              background: `${accent}14`,
              border: `1px solid ${accent}44`,
              fontFamily: mono, fontSize: 10.5, color: T.text.primary,
              letterSpacing: 0.4,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 6px ${accent}` }} />
              <span style={{ fontWeight: 700 }}>{name}</span>
              {a.account_label && (
                <span style={{ color: T.text.muted }}>· {a.account_label}</span>
              )}
              <span style={{ color: T.text.muted }}>· {a.trade_count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

