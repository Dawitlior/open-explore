/**
 * Minimalist Exchange Card
 * ------------------------------------------------------------------
 * Stripped-back, Bloomberg/TradingView-grade tile. No glassmorphism,
 * no gradients, no stagger cascade, no concentric pulses. Flat dark
 * surface, sharp 1px borders, generous whitespace, monospaced telemetry.
 *
 * Kept the file name `GlassTechExchangeCard` to avoid touching imports —
 * the component itself is intentionally not "glass-tech" anymore.
 */

import { Plug, Sparkles, Trash2, RefreshCw, Lock } from 'lucide-react';
import type { TradingTheme } from '@/lib/trading-theme';

interface ProviderMetaLite {
  id: string;
  name: string;
  tagline: { he: string; en: string };
  gradient: string;
  accent: string;
  enabled: boolean;
}

export interface GlassTechExchangeCardProps {
  T: TradingTheme;
  meta: ProviderMetaLite;
  connected: boolean;
  loading: boolean;
  connectionLabel: string | null;
  isRTL: boolean;
  index?: number;
  onConnect: () => void;
  onDisconnect?: () => void;
  onSync?: () => void;
  syncing?: boolean;
}

const sans = "'Poppins', sans-serif";
const mono = "'IBM Plex Mono', 'JetBrains Mono', monospace";

export function GlassTechExchangeCard({
  T, meta, connected, connectionLabel, isRTL,
  onConnect, onDisconnect, onSync, syncing,
}: GlassTechExchangeCardProps) {
  const t = (he: string, en: string) => (isRTL ? he : en);
  const disabled = !meta.enabled;

  const statusColor = disabled ? T.text.muted : connected ? '#10b981' : T.text.muted;
  const statusLabel = disabled
    ? t('בקרוב', 'Coming Soon')
    : connected ? t('פעיל', 'Live') : t('לא מחובר', 'Offline');

  const interactive = !disabled && !connected;

  return (
    <div
      onClick={() => interactive && onConnect()}
      style={{
        position: 'relative',
        borderRadius: 6,
        padding: 24,
        background: T.bg.card,
        border: `1px solid ${connected ? meta.accent + '40' : T.border.subtle}`,
        cursor: disabled ? 'not-allowed' : connected ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color 120ms ease',
        display: 'flex', flexDirection: 'column',
        minHeight: connected ? 220 : 180,
      }}
      onMouseEnter={(e) => {
        if (interactive) (e.currentTarget as HTMLDivElement).style.borderColor = meta.accent + '60';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = connected ? meta.accent + '40' : T.border.subtle;
      }}
    >
      {/* ───── TOP META ROW ───── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 10, fontWeight: 600, color: statusColor,
          fontFamily: mono, letterSpacing: 1.2, textTransform: 'uppercase',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: statusColor,
          }} />
          {statusLabel}
        </div>

        <div style={{
          fontFamily: mono, fontSize: 10, color: T.text.muted,
          letterSpacing: 1.4, textTransform: 'uppercase',
        }}>
          {disabled ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Lock size={9} /> Soon</span> : meta.id}
        </div>
      </div>

      {/* ───── IDENTITY ───── */}
      <div style={{ marginBottom: 'auto' }}>
        <div style={{
          fontFamily: sans, fontWeight: 600, fontSize: 20,
          color: T.text.primary, letterSpacing: -0.3, lineHeight: 1.1,
        }}>{meta.name}</div>
        <div style={{
          fontFamily: sans, fontSize: 12, color: T.text.muted,
          marginTop: 8, lineHeight: 1.5, fontWeight: 400,
        }}>{meta.tagline[isRTL ? 'he' : 'en']}</div>
      </div>

      {/* ───── ACTIVE ACCOUNT TELEMETRY ───── */}
      {connected && connectionLabel && (
        <div style={{
          marginTop: 24, paddingTop: 16,
          borderTop: `1px solid ${T.border.subtle}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: 12,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: mono, fontSize: 9.5, color: T.text.muted,
              letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4,
            }}>{t('חשבון', 'Account')}</div>
            <div style={{
              fontFamily: mono, fontSize: 12, color: T.text.primary, fontWeight: 500,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{connectionLabel}</div>
          </div>
        </div>
      )}

      {/* ───── ACTIONS ───── */}
      <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
        {disabled ? (
          <span style={{ fontSize: 11, fontFamily: sans, color: T.text.muted }}>
            {t('תמיכת API בפיתוח', 'API support in development')}
          </span>
        ) : connected ? (
          <>
            {onSync && (
              <button
                onClick={(e) => { e.stopPropagation(); if (!syncing) onSync(); }}
                disabled={syncing}
                style={ghostButton(meta.accent, syncing)}
              >
                <RefreshCw size={11} style={{
                  animation: syncing ? 'orcaSpin 1s linear infinite' : undefined,
                }} />
                {syncing ? t('מסנכרן…', 'Syncing…') : t('סנכרן', 'Sync')}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onConnect(); }}
              style={ghostButton(T.text.muted, false)}
              title={t('עדכן מפתח', 'Rotate key')}
            ><Sparkles size={11} /></button>
            {onDisconnect && (
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(t('לנתק את החיבור?', 'Disconnect this account?'))) onDisconnect(); }}
                style={ghostButton('#ef4444', false)}
                title={t('נתק', 'Disconnect')}
              ><Trash2 size={11} /></button>
            )}
          </>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onConnect(); }}
            style={{
              flex: 1,
              padding: '10px 14px', borderRadius: 4,
              background: 'transparent',
              border: `1px solid ${meta.accent}`,
              color: meta.accent,
              fontWeight: 600, fontSize: 11.5, fontFamily: sans,
              cursor: 'pointer', letterSpacing: 0.4,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background-color 120ms ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = meta.accent + '12'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
          ><Plug size={11} /> {t('חבר', 'Connect')}</button>
        )}
      </div>

      <style>{`@keyframes orcaSpin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ghostButton(accent: string, busy: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '9px 12px', borderRadius: 4,
    background: 'transparent',
    border: `1px solid ${accent}40`,
    color: accent,
    fontWeight: 600, fontSize: 11, fontFamily: sans,
    cursor: busy ? 'wait' : 'pointer', letterSpacing: 0.4,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    transition: 'border-color 120ms ease, color 120ms ease',
  };
}
