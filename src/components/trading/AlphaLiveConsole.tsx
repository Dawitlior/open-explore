/**
 * AlphaLiveConsole — minimal high-contrast streaming console
 * activated only when the Alpha switch is ON. Renders the active
 * Bybit position table and the latest raw JSON frame for sanity.
 */

import { useState } from 'react';
import { useLivePositions, type LiveStatus } from '@/hooks/use-live-positions';
import { getDailyRiskLimit } from '@/hooks/use-user-preferences';

type Props = { T: any; isRTL: boolean; enabled: boolean };

const statusColor = (s: LiveStatus, T: any): string => {
  switch (s) {
    case 'subscribed': return T.accent.green;
    case 'connecting':
    case 'authenticating':
    case 'loading_creds':
    case 'reconnecting': return T.accent.orange;
    case 'no_creds':
    case 'error': return T.accent.red;
    default: return T.text.muted;
  }
};

const statusLabel = (s: LiveStatus, isRTL: boolean): string => {
  const map: Record<LiveStatus, [string, string]> = {
    idle: ['ידני', 'IDLE'],
    loading_creds: ['טוען מפתחות…', 'LOADING CREDS…'],
    no_creds: ['אין מפתחות Bybit פעילים', 'NO ACTIVE BYBIT CREDS'],
    connecting: ['מתחבר…', 'CONNECTING…'],
    authenticating: ['מאמת…', 'AUTH…'],
    subscribed: ['פעיל', 'LIVE'],
    reconnecting: ['מתחבר מחדש…', 'RECONNECTING…'],
    error: ['שגיאה', 'ERROR'],
    closed: ['סגור', 'CLOSED'],
  };
  return map[s][isRTL ? 0 : 1];
};

export const AlphaLiveConsole = ({ T, isRTL, enabled }: Props) => {
  const { positions, status, lastError, lastFrameAt } = useLivePositions(enabled);
  const [showRaw, setShowRaw] = useState(false);
  if (!enabled) return null;

  const mono = "'JetBrains Mono', monospace";
  const dailyR = getDailyRiskLimit();
  const dot = statusColor(status, T);

  return (
    <div style={{
      marginBottom: 16, padding: 0, borderRadius: 12, overflow: 'hidden',
      background: `linear-gradient(180deg, ${T.bg.card}, ${T.bg.secondary})`,
      border: `1px solid ${T.accent.purple}55`,
      boxShadow: `0 0 0 1px ${T.accent.purple}10, 0 8px 32px -10px ${T.accent.purple}30`,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '10px 14px', background: `${T.accent.purple}08`,
        borderBottom: `1px solid ${T.border.subtle}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: dot,
            boxShadow: `0 0 10px ${dot}`, animation: status === 'subscribed' ? 'pulse 1.4s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.4, color: T.accent.purple, fontFamily: mono }}>
            ⚡ ALPHA · LIVE STREAM
          </span>
          <span style={{ fontSize: 10, color: dot, fontFamily: mono, fontWeight: 700 }}>
            {statusLabel(status, isRTL)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: T.text.muted, fontFamily: mono }}>
          <span>{positions.length} {isRTL ? 'פוזיציות' : 'POS'}</span>
          {lastFrameAt && <span>· {Math.max(0, Math.round((Date.now() - lastFrameAt) / 1000))}s</span>}
          <button onClick={() => setShowRaw(s => !s)} style={{
            padding: '3px 8px', fontSize: 9, fontWeight: 700, letterSpacing: 0.6,
            background: showRaw ? T.accent.purple : 'transparent',
            color: showRaw ? T.bg.primary : T.accent.purple,
            border: `1px solid ${T.accent.purple}55`, borderRadius: 4, cursor: 'pointer', fontFamily: mono,
          }}>JSON</button>
        </div>
      </div>

      {/* Body */}
      {status === 'no_creds' && (
        <div style={{ padding: 18, fontSize: 12, color: T.text.muted, textAlign: 'center', fontFamily: mono }}>
          {isRTL
            ? 'חבר חשבון Bybit פעיל (Read-Only) ב-Settings → Exchanges כדי להפעיל את הזרם.'
            : 'Connect an active read-only Bybit account under Settings → Exchanges to enable the stream.'}
        </div>
      )}

      {status !== 'no_creds' && positions.length === 0 && (
        <div style={{ padding: 18, fontSize: 12, color: T.text.dim, textAlign: 'center', fontFamily: mono }}>
          {isRTL ? '— אין פוזיציות פתוחות —' : '— no open positions —'}
        </div>
      )}

      {positions.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: mono }}>
            <thead>
              <tr style={{ background: T.bg.tertiary }}>
                {['SYMBOL', 'SIDE', 'SIZE', 'ENTRY', 'MARK', 'SL', 'uPnL', 'LIVE R'].map(h => (
                  <th key={h} style={{
                    padding: '8px 10px', textAlign: 'right', color: T.text.muted,
                    fontSize: 9, fontWeight: 700, letterSpacing: 1,
                    borderBottom: `1px solid ${T.border.medium}`,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => {
                const longSign = (p.side || '').toLowerCase() === 'buy' ? 1 : -1;
                // Tier-2 live R when SL is present, Tier-3 USD-proxy fallback otherwise.
                const liveR = p.stopLoss > 0 && p.entryPrice > 0 && p.size > 0
                  ? ((p.markPrice - p.entryPrice) * longSign) / Math.abs(p.entryPrice - p.stopLoss)
                  : (p.unrealizedPnl / Math.max(dailyR, 1));
                const pnlColor = p.unrealizedPnl >= 0 ? T.accent.green : T.accent.red;
                const rColor = liveR >= 0 ? T.accent.green : T.accent.red;
                return (
                  <tr key={`${p.symbol}:${p.positionIdx ?? 0}`} style={{ background: i % 2 ? `${T.bg.tertiary}40` : 'transparent' }}>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: T.accent.cyan, fontWeight: 800 }}>{p.symbol}</td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: longSign > 0 ? T.accent.green : T.accent.red, fontWeight: 700 }}>
                      {longSign > 0 ? '↑ LONG' : '↓ SHORT'}
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: T.text.primary }}>{p.size}</td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: T.text.secondary }}>{p.entryPrice}</td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: T.text.primary, fontWeight: 700 }}>{p.markPrice}</td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: p.stopLoss > 0 ? T.accent.orange : T.text.dim }}>
                      {p.stopLoss > 0 ? p.stopLoss : '—'}
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: pnlColor, fontWeight: 800 }}>
                      {p.unrealizedPnl >= 0 ? '+' : ''}${p.unrealizedPnl.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px 10px', borderBottom: `1px solid ${T.border.subtle}`, color: rColor, fontWeight: 800 }}>
                      {liveR >= 0 ? '+' : ''}{liveR.toFixed(2)}R
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showRaw && (
        <pre style={{
          margin: 0, padding: 12, fontSize: 10, fontFamily: mono,
          background: T.bg.primary, color: T.text.muted,
          borderTop: `1px solid ${T.border.subtle}`,
          maxHeight: 220, overflow: 'auto',
        }}>
          {JSON.stringify({ status, lastError, positions }, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default AlphaLiveConsole;
