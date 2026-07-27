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
import { Suspense, useState, type ReactNode } from 'react';
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

/** Shared skeleton so both tabs load with identical rhythm. */
const TabSkeleton = ({ T }: { T: TradingTheme }) => (
  <div style={{ display: 'grid', gap: 12 }} aria-busy="true">
    {[220, 160, 160].map((h, i) => (
      <div
        key={i}
        style={{
          height: h,
          borderRadius: 14,
          background: T.bg.card,
          border: `1px solid ${T.border.subtle}`,
          opacity: 0.55,
          animation: 'pulse 1.6s ease-in-out infinite',
        }}
      />
    ))}
  </div>
);

const EmptyState = ({ T, isRTL, tab }: { T: TradingTheme; isRTL: boolean; tab: ControlRoomTab }) => (
  <div
    style={{
      padding: '46px 22px',
      borderRadius: 14,
      textAlign: 'center',
      background: T.bg.card,
      border: `1px dashed ${T.border.medium}`,
    }}
  >
    <div style={{ fontSize: 26, marginBottom: 10 }}>{tab === 'risk' ? '🛡️' : '🧠'}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color: T.text.primary, marginBottom: 6 }}>
      {isRTL ? 'אין עדיין נתונים' : 'No data yet'}
    </div>
    <div style={{ fontSize: 12, lineHeight: 1.6, color: T.text.muted, maxWidth: 420, margin: '0 auto' }}>
      {tab === 'risk'
        ? (isRTL ? 'הוסף או ייבא עסקאות כדי לחשב מגבלות סיכון, חשיפה ואיכות תשואות.' : 'Add or import trades to compute risk limits, exposure and return quality.')
        : (isRTL ? 'הוסף או ייבא עסקאות כדי לנתח משמעת, טילט ודפוסי התנהגות.' : 'Add or import trades to analyse discipline, tilt and behavior patterns.')}
    </div>
  </div>
);

export const ControlRoomPage = ({
  T, isRTL, isMobile = false, trades, stats, limits, initialTab = 'risk', renderRisk, renderMind,
}: Props) => {
  const [tab, setTab] = useState<ControlRoomTab>(initialTab);
  const isEmpty = trades.length === 0;


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
