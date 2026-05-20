/**
 * Glass-Tech Exchange Card
 * ------------------------------------------------------------------
 * Bloomberg/TradingView-grade broker tile. Pure presentation —
 * receives the same props the legacy ExchangeCard accepted so it can
 * drop into ExchangesPanel without changing business logic.
 *
 * Visual signature:
 *   • Layered glassmorphism: 22px backdrop blur + 160% saturation
 *   • Bento-grid bento cell with conic-gradient border
 *   • Pulsing "Active Account" status diode (concentric rings)
 *   • Mono-spaced telemetry strip with elapsed-since-validation
 *   • Framer-motion stagger entrance + status-change spring
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Plug, Sparkles, Trash2, RefreshCw, Lock, ShieldCheck, Activity } from 'lucide-react';
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
  T, meta, connected, connectionLabel, isRTL, index = 0,
  onConnect, onDisconnect, onSync, syncing,
}: GlassTechExchangeCardProps) {
  const t = (he: string, en: string) => (isRTL ? he : en);
  const disabled = !meta.enabled;

  const statusColor = disabled ? T.text.muted : connected ? '#10f5a8' : '#ef4444';
  const statusLabel = disabled
    ? t('בקרוב', 'Coming Soon')
    : connected ? t('פעיל', 'Live') : t('לא מחובר', 'Offline');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.55,
        delay: 0.04 * index,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={!disabled && !connected ? { y: -3 } : undefined}
      onClick={() => !disabled && !connected && onConnect()}
      style={{
        position: 'relative',
        borderRadius: 18,
        padding: 20,
        background: `
          radial-gradient(120% 80% at 100% 0%, ${meta.accent}1f 0%, transparent 55%),
          linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(11,23,48,0.55) 45%, rgba(2,6,15,0.85) 100%)
        `,
        border: `1px solid ${connected ? meta.accent + '55' : 'rgba(255,255,255,0.06)'}`,
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        cursor: disabled ? 'not-allowed' : connected ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        boxShadow: connected
          ? `0 0 0 1px ${meta.accent}33, 0 28px 60px -32px ${meta.accent}aa, inset 0 1px 0 rgba(255,255,255,0.06)`
          : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 8px 24px -18px rgba(0,0,0,0.7)',
        overflow: 'hidden',
        isolation: 'isolate',
      }}
    >
      {/* Conic gradient border for connected — Bloomberg "active ticker" */}
      {connected && (
        <span aria-hidden style={{
          position: 'absolute', inset: -1, borderRadius: 18, padding: 1,
          background: `conic-gradient(from 180deg at 50% 50%, ${meta.accent}00, ${meta.accent}88, ${meta.accent}00 35%)`,
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor', maskComposite: 'exclude',
          pointerEvents: 'none', opacity: 0.5,
        }} />
      )}

      {/* Top-corner radial glow */}
      <span aria-hidden style={{
        position: 'absolute', top: -50, insetInlineEnd: -50, width: 160, height: 160,
        background: `radial-gradient(circle, ${meta.accent}33 0%, transparent 70%)`,
        pointerEvents: 'none', filter: 'blur(2px)',
      }} />

      {/* Fine grid texture overlay — "control center" feel */}
      <span aria-hidden style={{
        position: 'absolute', inset: 0, opacity: 0.18,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
        maskImage: 'radial-gradient(ellipse at top right, rgba(0,0,0,0.6), transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* ═══════════ TOP STATUS BAR ═══════════ */}
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 18,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '4px 10px 4px 8px', borderRadius: 999,
          background: connected ? `${meta.accent}14` : 'rgba(255,255,255,0.03)',
          border: `1px solid ${connected ? meta.accent + '44' : 'rgba(255,255,255,0.05)'}`,
        }}>
          <StatusDiode color={statusColor} pulsing={connected} />
          <span style={{
            fontSize: 9.5, fontWeight: 800, color: connected ? meta.accent : statusColor,
            fontFamily: mono, letterSpacing: 1, textTransform: 'uppercase',
          }}>{statusLabel}</span>
        </div>

        {disabled ? (
          <div style={{
            padding: '3px 9px', borderRadius: 999,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            fontSize: 9, fontWeight: 800, color: '#fca5a5',
            fontFamily: mono, letterSpacing: 0.6, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', gap: 4,
          }}><Lock size={9} /> Soon</div>
        ) : (
          <div style={{
            fontFamily: mono, fontSize: 9, color: T.text.muted,
            letterSpacing: 1.4, textTransform: 'uppercase', opacity: 0.6,
          }}>{meta.id.toUpperCase()}</div>
        )}
      </div>

      {/* ═══════════ IDENTITY ═══════════ */}
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <div style={{
          fontFamily: sans, fontWeight: 800, fontSize: 22,
          color: T.text.primary, letterSpacing: -0.4, lineHeight: 1.05,
        }}>{meta.name}</div>
        <div style={{
          fontFamily: sans, fontSize: 11.5, color: T.text.muted,
          marginTop: 6, lineHeight: 1.45, fontWeight: 500,
        }}>{meta.tagline[isRTL ? 'he' : 'en']}</div>
      </div>

      {/* ═══════════ ACTIVE ACCOUNT TELEMETRY ═══════════ */}
      <AnimatePresence mode="wait">
        {connected && connectionLabel && (
          <motion.div
            key="telemetry"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'relative', marginBottom: 14,
              padding: '10px 12px', borderRadius: 10,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.25), rgba(0,0,0,0.05))',
              border: `1px solid ${meta.accent}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 10, overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <ShieldCheck size={12} color={meta.accent} style={{ flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: mono, fontSize: 8.5, color: T.text.muted,
                  letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2,
                }}>{t('חשבון פעיל', 'Active account')}</div>
                <div style={{
                  fontFamily: mono, fontSize: 12, color: T.text.primary, fontWeight: 700,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{connectionLabel}</div>
              </div>
            </div>
            <Activity size={14} color={meta.accent} style={{ opacity: 0.55, flexShrink: 0 }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════ ACTIONS ═══════════ */}
      <div style={{ position: 'relative', display: 'flex', gap: 8 }}>
        {disabled ? (
          <span style={{ fontSize: 10.5, fontFamily: sans, color: T.text.muted, padding: '6px 2px' }}>
            {t('תמיכת API בפיתוח', 'API support in development')}
          </span>
        ) : connected ? (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onConnect(); }}
              style={glassButton(meta.accent, false)}
            ><Sparkles size={11} /> {t('עדכן מפתח', 'Rotate key')}</button>
            {onDisconnect && (
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(t('לנתק את החיבור?', 'Disconnect this account?'))) onDisconnect(); }}
                style={{
                  padding: '9px 11px', borderRadius: 10,
                  background: 'transparent',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center',
                }}
                title={t('נתק', 'Disconnect')}
              ><Trash2 size={12} /></button>
            )}
          </>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onConnect(); }}
            style={glassButton(meta.accent, true)}
          ><Plug size={11} /> {t('חבר חשבון', 'Connect Account')}</button>
        )}
      </div>

      {/* ═══════════ SYNC BUTTON ═══════════ */}
      {connected && onSync && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={(e) => { e.stopPropagation(); if (!syncing) onSync(); }}
          disabled={syncing}
          style={{
            position: 'relative', overflow: 'hidden',
            marginTop: 10, width: '100%',
            padding: '11px 12px', borderRadius: 11,
            background: syncing
              ? `linear-gradient(180deg, ${meta.accent}1a, rgba(2,6,15,0.95))`
              : `linear-gradient(135deg, ${meta.accent}26, ${meta.accent}08)`,
            border: `1px solid ${meta.accent}55`,
            color: meta.accent,
            fontWeight: 800, fontSize: 11, fontFamily: sans,
            cursor: syncing ? 'wait' : 'pointer', letterSpacing: 0.5,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: syncing
              ? `0 0 28px -6px ${meta.accent}aa, inset 0 0 0 1px ${meta.accent}33`
              : `0 8px 22px -16px ${meta.accent}`,
            transition: 'background .2s ease, box-shadow .2s ease',
          }}
        >
          {syncing ? (
            <>
              <span style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                {t('מסנכרן…', 'Syncing…')}
              </span>
              <span style={{
                position: 'absolute', left: 0, right: 0, bottom: 0, height: 2,
                background: `linear-gradient(90deg, transparent, ${meta.accent}, transparent)`,
                backgroundSize: '200% 100%',
                animation: 'orcaStream 1.1s linear infinite',
                boxShadow: `0 0 10px ${meta.accent}`,
              }} />
            </>
          ) : (
            <><RefreshCw size={11} /> {t("סנכרן עסקאות פיוצ'רס", 'Sync Futures Trades')}</>
          )}
        </motion.button>
      )}
    </motion.div>
  );
}

/* ─── Helpers ─── */

function glassButton(accent: string, primary: boolean): React.CSSProperties {
  return {
    flex: 1,
    padding: '10px 12px', borderRadius: 10,
    background: primary
      ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
      : 'rgba(255,255,255,0.03)',
    border: primary ? 'none' : `1px solid ${accent}55`,
    color: primary ? '#06121f' : accent,
    fontWeight: 800, fontSize: 11.5, fontFamily: sans,
    cursor: 'pointer', letterSpacing: 0.4,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    boxShadow: primary ? `0 10px 28px -16px ${accent}, inset 0 1px 0 rgba(255,255,255,0.25)` : 'none',
    transition: 'transform .15s ease, box-shadow .15s ease',
  };
}

/**
 * StatusDiode — concentric pulsing rings for the "Active Account" indicator.
 * Three layered motion divs create a NASA-control-center status light.
 */
function StatusDiode({ color, pulsing }: { color: string; pulsing: boolean }) {
  return (
    <span style={{
      position: 'relative', width: 9, height: 9, display: 'inline-block', flexShrink: 0,
    }}>
      {pulsing && (
        <>
          <motion.span
            initial={{ scale: 0.6, opacity: 0.7 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: color, opacity: 0.5,
            }}
          />
          <motion.span
            initial={{ scale: 0.6, opacity: 0.5 }}
            animate={{ scale: 2.4, opacity: 0 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 0.6 }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: color, opacity: 0.3,
            }}
          />
        </>
      )}
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        background: color,
        boxShadow: pulsing ? `0 0 10px ${color}, 0 0 4px ${color}` : 'none',
      }} />
    </span>
  );
}
