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
import { Suspense, useState, useRef, useEffect, useCallback, type ReactNode } from 'react';
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

/**
 * Reduced-motion is a device/OS level setting — resolve it once at module load
 * instead of hitting matchMedia on every render of every skeleton block.
 */
const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const prefersReducedMotion = () => REDUCED_MOTION;

/**
 * Skeleton block. Shape-only — it never renders content, just reserves the
 * geometry of the real element it stands in for.
 */
const Block = ({ T, h, radius = 14, flex, pulse }: { T: TradingTheme; h: number; radius?: number; flex?: number; pulse: boolean }) => (
  <div
    style={{
      height: h,
      flex,
      minWidth: 0,
      borderRadius: radius,
      background: T.bg.card,
      border: `1px solid ${T.border.subtle}`,
      opacity: 0.55,
      animation: pulse ? 'pulse 1.6s ease-in-out infinite' : 'none',
    }}
  />
);

/**
 * Per-tab skeleton that mirrors the real layout of each surface, so the swap
 * from skeleton → content does not shift anything on screen.
 *
 * Risk : KPI row → wide exposure block → correlation grid → table
 * Mind : header strip → radar + donut pair → stacked insight cards
 */
const TabSkeleton = ({ T, tab, isMobile }: { T: TradingTheme; tab: ControlRoomTab; isMobile: boolean }) => {
  const pulse = !prefersReducedMotion();
  const row: React.CSSProperties = { display: 'flex', gap: 12, flexWrap: isMobile ? 'wrap' : 'nowrap' };

  if (tab === 'risk') {
    return (
      <div style={{ display: 'grid', gap: 12 }} aria-busy="true" aria-live="polite">
        <div style={row}>
          <Block T={T} h={92} flex={1} pulse={pulse} />
          <Block T={T} h={92} flex={1} pulse={pulse} />
          {!isMobile && <Block T={T} h={92} flex={1} pulse={pulse} />}
        </div>
        <Block T={T} h={isMobile ? 240 : 300} pulse={pulse} />
        <div style={row}>
          <Block T={T} h={isMobile ? 200 : 240} flex={1.4} pulse={pulse} />
          <Block T={T} h={isMobile ? 200 : 240} flex={1} pulse={pulse} />
        </div>
        <Block T={T} h={isMobile ? 220 : 260} pulse={pulse} />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 12 }} aria-busy="true" aria-live="polite">
      <Block T={T} h={72} pulse={pulse} />
      <div style={row}>
        <Block T={T} h={isMobile ? 260 : 320} flex={1} pulse={pulse} />
        <Block T={T} h={isMobile ? 260 : 320} flex={1} pulse={pulse} />
      </div>
      <Block T={T} h={isMobile ? 180 : 200} pulse={pulse} />
      <Block T={T} h={isMobile ? 180 : 200} pulse={pulse} />
    </div>
  );
};


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

  /**
   * Zero-layout-shift tab swapping: remember the last measured height of each
   * tab's real content and use it as the panel's `min-height` while the next
   * tab is still loading. First visit falls back to the skeleton's own height.
   */
  const panelRef = useRef<HTMLDivElement | null>(null);
  const heightsRef = useRef<Partial<Record<ControlRoomTab, number>>>({});
  const [reservedHeight, setReservedHeight] = useState<number | undefined>(undefined);

  const measure = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    const h = el.offsetHeight;
    if (h > 0) heightsRef.current[tab] = h;
  }, [tab]);

  useEffect(() => {
    const el = panelRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  // Once the new tab has painted, release the reserved height so the panel can
  // shrink/grow naturally with its real content.
  useEffect(() => {
    if (reservedHeight === undefined) return;
    const id = requestAnimationFrame(() => setReservedHeight(undefined));
    return () => cancelAnimationFrame(id);
  }, [reservedHeight, tab]);

  const switchTab = useCallback((next: ControlRoomTab) => {
    if (next === tab) return;
    measure();
    setReservedHeight(heightsRef.current[next] ?? heightsRef.current[tab]);
    setTab(next);
  }, [tab, measure]);




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
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 9, color: T.text.muted, letterSpacing: '0.2em',
          fontFamily: "'JetBrains Mono', monospace", marginBottom: 5,
        }}>
          {isRTL ? '◆ חדר בקרה' : '◆ CONTROL ROOM'}
        </div>
        <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 200, color: T.text.primary, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
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
              onClick={() => switchTab(tb.id)}
              style={{
                textAlign: isRTL ? 'right' : 'left',
                padding: isMobile ? '10px 12px' : '12px 16px',
                minHeight: isMobile ? 44 : 62,
                borderRadius: 12,
                cursor: 'pointer',
                background: active ? `linear-gradient(${isRTL ? '270deg' : '90deg'}, ${tb.color}18, ${T.bg.card})` : T.bg.card,
                border: `1px solid ${active ? `${tb.color}55` : T.border.subtle}`,
                borderBottom: `2px solid ${active ? tb.color : 'transparent'}`,
                transition: 'all .2s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, lineHeight: 1 }}>{tb.icon}</span>
                <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: active ? tb.color : T.text.primary, letterSpacing: '-0.01em' }}>
                  {tb.label}
                </span>
              </div>
              {!isMobile && (
                <div style={{ fontSize: 10.5, lineHeight: 1.5, color: T.text.muted, marginTop: 4 }}>{tb.sub}</div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Active surface ───────────────────────────────────── */}
      <div
        role="tabpanel"
        ref={panelRef}
        key={tab}
        aria-label={tab === 'risk' ? (isRTL ? 'סיכון' : 'Risk') : (isRTL ? 'תודעה' : 'Mind')}
        style={{
          display: 'grid',
          gap: 12,
          minHeight: reservedHeight,
          animation: prefersReducedMotion() ? 'none' : 'fadeIn .25s ease',
        }}
      >
        {isEmpty ? (
          <EmptyState T={T} isRTL={isRTL} tab={tab} />
        ) : (
          <Suspense fallback={<TabSkeleton T={T} tab={tab} isMobile={isMobile} />}>
            {tab === 'risk' ? renderRisk() : renderMind()}
          </Suspense>
        )}
      </div>

    </div>

  );
};

export default ControlRoomPage;
