/**
 * ControlRoomPage — the merged "חדר בקרה / Control Room" surface.
 *
 * Layer 0 : LiveStateBar (shared live state — risk limits + tilt/discipline)
 * Layer 1 : two tabs — RISK (guardrails & exposure) and MIND (behavior)
 *
 * The two underlying pages are unchanged; they are rendered lazily via the
 * render props so only the active tab mounts (keeps chart cost identical to
 * the previous two-page setup).
 */
import { useState, type ReactNode } from 'react';
import type { Trade } from '@/data/trades';
import type { TradingTheme } from '@/lib/trading-theme';
import type { TradingStats } from '@/lib/trading-analytics';
import type { RiskLimits } from '@/lib/risk-limits';
import { LiveStateBar } from './risk/LiveStateBar';

export type ControlRoomTab = 'risk' | 'mind';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  isMobile?: boolean;
  trades: Trade[];
  stats: TradingStats;
  limits?: RiskLimits;
  initialTab?: ControlRoomTab;
  renderRisk: () => ReactNode;
  renderMind: () => ReactNode;
}

export const ControlRoomPage = ({
  T, isRTL, isMobile = false, trades, stats, limits, initialTab = 'risk', renderRisk, renderMind,
}: Props) => {
  const [tab, setTab] = useState<ControlRoomTab>(initialTab);

  const tabs: Array<{ id: ControlRoomTab; icon: string; label: string; sub: string; color: string }> = [
    {
      id: 'risk',
      icon: '🛡️',
      label: isRTL ? 'סיכון' : 'Risk',
      sub: isRTL ? 'מגבלות · חשיפה · איכות תשואות' : 'Limits · Exposure · Return quality',
      color: T.accent.cyan,
    },
    {
      id: 'mind',
      icon: '🧠',
      label: isRTL ? 'תודעה' : 'Mind',
      sub: isRTL ? 'משמעת · טילט · דפוסי התנהגות' : 'Discipline · Tilt · Behavior patterns',
      color: T.accent.purple,
    },
  ];

  return (
    <div>
      {/* ── Page header ───────────────────────────────────────── */}
      <div style={{ marginBottom: 10 }}>
        <div style={{
          fontSize: 9, color: T.text.muted, letterSpacing: '0.2em',
          fontFamily: "'JetBrains Mono', monospace", marginBottom: 4,
        }}>
          {isRTL ? '◆ חדר בקרה' : '◆ CONTROL ROOM'}
        </div>
        <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 200, color: T.text.primary, letterSpacing: '-0.02em' }}>
          {isRTL ? 'ניהול סיכון ותודעת מסחר' : 'Risk & Trading Mind'}
        </div>
      </div>

      {/* ── Layer 0 — shared live state ───────────────────────── */}
      <LiveStateBar T={T} isRTL={isRTL} trades={trades} stats={stats} limits={limits} compact={isMobile} />

      {/* ── Layer 1 — tabs ───────────────────────────────────── */}
      <div
        role="tablist"
        aria-label={isRTL ? 'חדר בקרה' : 'Control Room'}
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 14,
          position: 'sticky',
          top: 0,
          zIndex: 6,
          background: T.bg.primary,
          paddingBottom: 6,
        }}
      >
        {tabs.map(tb => {
          const active = tb.id === tab;
          return (
            <button
              key={tb.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(tb.id)}
              style={{
                textAlign: isRTL ? 'right' : 'left',
                padding: isMobile ? '10px 12px' : '12px 16px',
                borderRadius: 12,
                cursor: 'pointer',
                background: active ? `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${tb.color}18, ${T.bg.card})` : T.bg.card,
                border: `1px solid ${active ? `${tb.color}55` : T.border.subtle}`,
                borderBottom: `2px solid ${active ? tb.color : 'transparent'}`,
                transition: 'all .2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15 }}>{tb.icon}</span>
                <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: active ? tb.color : T.text.primary }}>
                  {tb.label}
                </span>
              </div>
              {!isMobile && (
                <div style={{ fontSize: 10.5, color: T.text.muted, marginTop: 3 }}>{tb.sub}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Active surface ───────────────────────────────────── */}
      <div role="tabpanel">
        {tab === 'risk' ? renderRisk() : renderMind()}
      </div>
    </div>
  );
};

export default ControlRoomPage;
