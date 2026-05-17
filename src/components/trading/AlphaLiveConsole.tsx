/**
 * AlphaLiveConsole — full "Alpha Live UI Deck".
 * Renders either the Standby Radar (empty state with sonar + telemetry)
 * or the Active Trading Deck (glowing position strips + real-time
 * micro-charts + rolling command feed).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis,
  AreaChart, Area, XAxis, YAxis, Tooltip,
} from 'recharts';
import { useLivePositions, type LiveStatus, type LivePosition } from '@/hooks/use-live-positions';
import { getDailyRiskLimit } from '@/hooks/use-user-preferences';

type Props = { T: any; isRTL: boolean; enabled: boolean };

const MONO = "'JetBrains Mono', monospace";
const POPPINS = "'Poppins', sans-serif";
const FEED_MAX = 50;
const MOMENTUM_WINDOW_MS = 60_000;

// ───────────────────────── helpers ─────────────────────────

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

const calcLiveR = (p: LivePosition, dailyR: number): number => {
  const longSign = (p.side || '').toLowerCase() === 'buy' ? 1 : -1;
  if (p.stopLoss > 0 && p.entryPrice > 0 && p.size > 0) {
    return ((p.markPrice - p.entryPrice) * longSign) / Math.abs(p.entryPrice - p.stopLoss);
  }
  return p.unrealizedPnl / Math.max(dailyR, 1);
};

const calcSlProximity = (p: LivePosition): number | null => {
  // Returns 0..1 where 1 = mark at SL, 0 = mark at entry (or further).
  if (!(p.stopLoss > 0 && p.entryPrice > 0)) return null;
  const longSign = (p.side || '').toLowerCase() === 'buy' ? 1 : -1;
  const risk = Math.abs(p.entryPrice - p.stopLoss);
  if (risk === 0) return null;
  const adverse = longSign > 0
    ? Math.max(0, p.entryPrice - p.markPrice)
    : Math.max(0, p.markPrice - p.entryPrice);
  return Math.max(0, Math.min(1, adverse / risk));
};

const hhmmss = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

// ───────────────────── Standby Radar ─────────────────────

const StandbyRadar = ({ T, isRTL, status, capacityPct }: {
  T: any; isRTL: boolean; status: LiveStatus; capacityPct: number;
}) => {
  const accent = T.accent.cyan;
  return (
    <div style={{
      position: 'relative', minHeight: 320,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 28, gap: 18,
    }}>
      <style>{`
        @keyframes alpha-sonar {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.9; }
          80% { opacity: 0.05; }
          100% { transform: translate(-50%, -50%) scale(2.6); opacity: 0; }
        }
        @keyframes alpha-core-pulse {
          0%, 100% { box-shadow: 0 0 0 0 ${accent}66, 0 0 30px ${accent}88; }
          50% { box-shadow: 0 0 0 12px ${accent}00, 0 0 50px ${accent}cc; }
        }
      `}</style>

      {/* radar */}
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            position: 'absolute', left: '50%', top: '50%',
            width: 160, height: 160, marginLeft: -80, marginTop: -80,
            borderRadius: '50%', border: `2px solid ${accent}`,
            animation: `alpha-sonar 2.6s cubic-bezier(0.2,0.6,0.2,1) ${i * 0.85}s infinite`,
            pointerEvents: 'none',
          }} />
        ))}
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          width: 26, height: 26, marginLeft: -13, marginTop: -13,
          borderRadius: '50%', background: accent,
          animation: 'alpha-core-pulse 2.2s ease-in-out infinite',
        }} />
      </div>

      {/* Telemetry */}
      <div style={{
        width: '100%', maxWidth: 380,
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: 14, borderRadius: 10,
        background: `${T.bg.primary}aa`, border: `1px solid ${T.border.subtle}`,
        fontFamily: MONO, fontSize: 11,
      }}>
        <Telemetry T={T} ok={status === 'subscribed'}
          okText={isRTL ? 'WebSocket: מחובר ויציב' : 'WebSocket: Connected & Stable'}
          badText={isRTL ? 'WebSocket: מנותק' : 'WebSocket: Disconnected'}
        />
        <Telemetry T={T} ok={status === 'subscribed' || status === 'authenticating'}
          okText={isRTL ? 'אימות API: מאובטח' : 'API Authentication: Secure'}
          badText={isRTL ? 'אימות API: ממתין' : 'API Authentication: Pending'}
        />
        <div style={{ color: T.text.muted, fontStyle: 'italic', marginTop: 2 }}>
          {isRTL ? 'סורק את השוק לאיתור עסקאות פעילות…' : 'Scanning market for active executions…'}
        </div>
      </div>

      {/* Risk readiness */}
      <div style={{
        width: '100%', maxWidth: 380,
        padding: 14, borderRadius: 10,
        background: `linear-gradient(135deg, ${accent}10, ${T.accent.purple}10)`,
        border: `1px solid ${accent}33`,
        fontFamily: POPPINS,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 10, letterSpacing: 1, color: T.text.muted, fontWeight: 700, marginBottom: 6,
        }}>
          <span>{isRTL ? 'קיבולת סיכון יומית פנויה' : 'Available Daily Risk Capacity'}</span>
          <span style={{ color: accent, fontFamily: MONO, fontSize: 12, fontWeight: 800 }}>
            {Math.round(capacityPct)}%
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: T.bg.tertiary, overflow: 'hidden' }}>
          <div style={{
            width: `${Math.max(0, Math.min(100, capacityPct))}%`, height: '100%',
            background: `linear-gradient(90deg, ${accent}, ${T.accent.green})`,
            transition: 'width 0.5s ease',
            boxShadow: `0 0 12px ${accent}66`,
          }} />
        </div>
      </div>
    </div>
  );
};

const Telemetry = ({ T, ok, okText, badText }: { T: any; ok: boolean; okText: string; badText: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: ok ? T.accent.green : T.accent.orange }}>
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: ok ? T.accent.green : T.accent.orange,
      boxShadow: `0 0 8px ${ok ? T.accent.green : T.accent.orange}`,
      animation: 'pulse 1.6s ease-in-out infinite',
    }} />
    {ok ? `🟢 ${okText}` : `🟠 ${badText}`}
  </div>
);

// ───────────────── Position Strip ─────────────────

const PositionStrip = ({ T, isRTL, p, dailyR }: {
  T: any; isRTL: boolean; p: LivePosition; dailyR: number;
}) => {
  const longSign = (p.side || '').toLowerCase() === 'buy' ? 1 : -1;
  const isLong = longSign > 0;
  const glow = isLong ? T.accent.green : T.accent.red;
  const liveR = calcLiveR(p, dailyR);
  const rColor = liveR >= 0 ? T.accent.green : T.accent.red;
  const proximity = calcSlProximity(p); // 0..1
  const warning = proximity !== null && proximity >= 0.85; // within 15% of SL

  // Pulse mark price on tick — flash via key cycling.
  const [tick, setTick] = useState(0);
  const lastMarkRef = useRef<number>(p.markPrice);
  useEffect(() => {
    if (p.markPrice !== lastMarkRef.current) {
      lastMarkRef.current = p.markPrice;
      setTick(t => t + 1);
    }
  }, [p.markPrice]);

  return (
    <div style={{
      position: 'relative',
      display: 'grid',
      gridTemplateColumns: 'minmax(140px, 1.4fr) repeat(4, minmax(80px, 1fr)) minmax(120px, 1.3fr)',
      alignItems: 'center', gap: 14,
      padding: '14px 18px', marginBottom: 10,
      borderRadius: 12,
      background: `linear-gradient(180deg, ${T.bg.card}, ${T.bg.secondary})`,
      border: `1px solid ${glow}55`,
      boxShadow: `0 0 0 1px ${glow}10, 0 0 24px -6px ${glow}55, inset 0 0 30px ${glow}10`,
      transition: 'box-shadow 0.4s',
      fontFamily: MONO,
    }}>
      {/* Symbol + Side */}
      <div>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.accent.cyan, fontFamily: POPPINS, letterSpacing: 0.4 }}>
          {p.symbol}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: glow, letterSpacing: 1.2, marginTop: 2 }}>
          {isLong ? '↑ LONG' : '↓ SHORT'} · {p.leverage > 0 ? `${p.leverage}×` : ''}
        </div>
      </div>

      <StripCell T={T} label={isRTL ? 'גודל' : 'SIZE'} value={String(p.size)} />
      <StripCell T={T} label={isRTL ? 'כניסה' : 'ENTRY'} value={p.entryPrice.toString()} />
      <StripCell
        T={T} label={isRTL ? 'מחיר נוכחי' : 'MARK'}
        valueNode={
          <span
            key={tick}
            style={{
              display: 'inline-block', color: T.text.primary, fontSize: 14, fontWeight: 800,
              animation: 'alpha-tick 0.55s ease-out',
            }}
          >
            {p.markPrice}
          </span>
        }
      />
      <StripCell
        T={T} label="uPnL"
        valueNode={
          <span style={{ color: p.unrealizedPnl >= 0 ? T.accent.green : T.accent.red, fontWeight: 800 }}>
            {p.unrealizedPnl >= 0 ? '+' : ''}${p.unrealizedPnl.toFixed(2)}
          </span>
        }
      />

      {/* Live R Flasher */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, color: T.text.muted }}>
          LIVE R
        </div>
        <div style={{
          fontFamily: POPPINS, fontSize: 28, fontWeight: 900, lineHeight: 1,
          color: rColor, textShadow: `0 0 20px ${rColor}88`,
          transition: 'color 0.3s, text-shadow 0.3s',
          letterSpacing: -0.5,
        }}>
          {liveR >= 0 ? '+' : ''}{liveR.toFixed(2)}R
        </div>
      </div>

      {/* SL proximity bar */}
      {proximity !== null && (
        <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            fontSize: 9, color: T.text.muted, letterSpacing: 1, marginBottom: 4,
          }}>
            <span>{isRTL ? 'מרחק מ-Stop Loss' : 'STOP-LOSS PROXIMITY'}</span>
            <span style={{ color: warning ? T.accent.red : T.text.dim, fontWeight: 700 }}>
              {warning ? (isRTL ? '⚠ אזור סכנה' : '⚠ DANGER ZONE') : `${Math.round((1 - proximity) * 100)}% ${isRTL ? 'באפר' : 'BUFFER'}`}
            </span>
          </div>
          <div style={{
            height: 6, borderRadius: 3, background: T.bg.tertiary, overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              width: `${proximity * 100}%`, height: '100%',
              background: warning
                ? `linear-gradient(90deg, ${T.accent.orange}, ${T.accent.red})`
                : `linear-gradient(90deg, ${T.accent.green}, ${T.accent.orange})`,
              boxShadow: warning ? `0 0 12px ${T.accent.red}` : 'none',
              animation: warning ? 'alpha-slbar-flash 0.9s ease-in-out infinite' : 'none',
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      )}
    </div>
  );
};

const StripCell = ({ T, label, value, valueNode }: {
  T: any; label: string; value?: string; valueNode?: React.ReactNode;
}) => (
  <div>
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.4, color: T.text.muted }}>{label}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: T.text.secondary, marginTop: 2 }}>
      {valueNode ?? value}
    </div>
  </div>
);

// ───────────────────────── component ─────────────────────────

export const AlphaLiveConsole = ({ T, isRTL, enabled }: Props) => {
  const { positions, status, lastError, lastFrameAt } = useLivePositions(enabled);
  const [showRaw, setShowRaw] = useState(false);
  const dailyR = getDailyRiskLimit();

  // Aggregate live metrics
  const totalUPnl = useMemo(
    () => positions.reduce((s, p) => s + (p.unrealizedPnl || 0), 0),
    [positions],
  );
  const totalOpenR = useMemo(
    () => positions.reduce((s, p) => s + Math.max(0, -calcLiveR(p, dailyR)), 0),
    [positions, dailyR],
  );
  const capacityPct = Math.max(0, Math.min(100, (1 - totalOpenR / Math.max(dailyR, 1)) * 100));

  // 60-second momentum buffer
  const [momentum, setMomentum] = useState<{ t: number; v: number }[]>([]);
  useEffect(() => {
    if (!enabled) return;
    setMomentum(prev => {
      const now = Date.now();
      const next = [...prev, { t: now, v: totalUPnl }].filter(p => now - p.t <= MOMENTUM_WINDOW_MS);
      return next;
    });
  }, [enabled, totalUPnl, lastFrameAt]);

  // Live command feed
  const [feed, setFeed] = useState<{ id: number; ts: number; text: string; tone: 'info' | 'warn' | 'good' | 'bad' }[]>([]);
  const feedIdRef = useRef(0);
  const lastRRef = useRef<Map<string, number>>(new Map());
  const lastWarnRef = useRef<Map<string, boolean>>(new Map());
  useEffect(() => {
    if (!enabled) return;
    const additions: typeof feed = [];
    positions.forEach(p => {
      const key = `${p.symbol}:${p.positionIdx ?? 0}`;
      const liveR = calcLiveR(p, dailyR);
      const prevR = lastRRef.current.get(key);
      if (prevR === undefined || Math.abs(liveR - prevR) >= 0.1) {
        lastRRef.current.set(key, liveR);
        if (prevR !== undefined) {
          additions.push({
            id: ++feedIdRef.current, ts: Date.now(),
            text: `${p.symbol} ${liveR >= 0 ? 'updated to +' : 'updated to '}${liveR.toFixed(2)}R`,
            tone: liveR >= 0 ? 'good' : 'bad',
          });
        }
      }
      const prox = calcSlProximity(p);
      const inDanger = prox !== null && prox >= 0.85;
      const wasDanger = lastWarnRef.current.get(key) ?? false;
      if (inDanger && !wasDanger) {
        additions.push({
          id: ++feedIdRef.current, ts: Date.now(),
          text: `${p.symbol} within ${Math.round((1 - prox!) * 100)}% of SL`,
          tone: 'warn',
        });
      }
      lastWarnRef.current.set(key, inDanger);
    });
    if (additions.length) {
      setFeed(prev => [...prev, ...additions].slice(-FEED_MAX));
    }
  }, [enabled, positions, dailyR]);

  // Status change feed
  const lastStatusRef = useRef<LiveStatus | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (lastStatusRef.current && lastStatusRef.current !== status) {
      setFeed(prev => [
        ...prev,
        {
          id: ++feedIdRef.current, ts: Date.now(),
          text: `WS · ${statusLabel(status, false)}`,
          tone: status === 'subscribed' ? 'good' : status === 'error' ? 'bad' : 'info',
        },
      ].slice(-FEED_MAX));
    }
    lastStatusRef.current = status;
  }, [enabled, status]);

  const feedRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [feed.length]);

  if (!enabled) return null;
  const dot = statusColor(status, T);

  return (
    <div style={{
      marginBottom: 16, borderRadius: 14, overflow: 'hidden',
      background: `linear-gradient(180deg, ${T.bg.card}, ${T.bg.secondary})`,
      border: `1px solid ${T.accent.purple}55`,
      boxShadow: `0 0 0 1px ${T.accent.purple}10, 0 8px 32px -10px ${T.accent.purple}40`,
      animation: 'alpha-mount 0.45s ease-out',
    }}>
      <style>{`
        @keyframes alpha-mount {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes alpha-tick {
          0% { color: #00f2ff; text-shadow: 0 0 14px #00f2ff; transform: translateY(-1px); }
          100% { color: inherit; text-shadow: none; transform: translateY(0); }
        }
        @keyframes alpha-slbar-flash {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        padding: '10px 14px', background: `${T.accent.purple}08`,
        borderBottom: `1px solid ${T.border.subtle}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: dot,
            boxShadow: `0 0 10px ${dot}`,
            animation: status === 'subscribed' ? 'pulse 1.4s ease-in-out infinite' : 'none',
          }} />
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.4, color: T.accent.purple, fontFamily: MONO }}>
            ⚡ ALPHA · LIVE STREAM
          </span>
          <span style={{ fontSize: 10, color: dot, fontFamily: MONO, fontWeight: 700 }}>
            {statusLabel(status, isRTL)}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: T.text.muted, fontFamily: MONO }}>
          <span>{positions.length} {isRTL ? 'פוזיציות' : 'POS'}</span>
          {lastFrameAt && <span>· {Math.max(0, Math.round((Date.now() - lastFrameAt) / 1000))}s</span>}
          <button onClick={() => setShowRaw(s => !s)} style={{
            padding: '3px 8px', fontSize: 9, fontWeight: 700, letterSpacing: 0.6,
            background: showRaw ? T.accent.purple : 'transparent',
            color: showRaw ? T.bg.primary : T.accent.purple,
            border: `1px solid ${T.accent.purple}55`, borderRadius: 4, cursor: 'pointer', fontFamily: MONO,
          }}>JSON</button>
        </div>
      </div>

      {/* ── Body ── */}
      {status === 'no_creds' ? (
        <div style={{ padding: 24, fontSize: 12, color: T.text.muted, textAlign: 'center', fontFamily: MONO }}>
          {isRTL
            ? 'חבר חשבון Bybit פעיל (Read-Only) ב-Settings → Exchanges כדי להפעיל את הזרם.'
            : 'Connect an active read-only Bybit account under Settings → Exchanges to enable the stream.'}
        </div>
      ) : positions.length === 0 ? (
        <StandbyRadar T={T} isRTL={isRTL} status={status} capacityPct={capacityPct} />
      ) : (
        <div style={{ padding: 14 }}>
          {/* Position strips */}
          <div>
            {positions.map(p => (
              <PositionStrip key={`${p.symbol}:${p.positionIdx ?? 0}`} T={T} isRTL={isRTL} p={p} dailyR={dailyR} />
            ))}
          </div>

          {/* Charts + Feed */}
          <div style={{
            display: 'grid', gap: 12, marginTop: 10,
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(220px, 1.1fr)',
          }}>
            <RiskRadarChart T={T} isRTL={isRTL} totalOpenR={totalOpenR} dailyR={dailyR} />
            <MomentumChart T={T} isRTL={isRTL} data={momentum} />
            <CommandFeed T={T} isRTL={isRTL} feed={feed} feedRef={feedRef} />
          </div>
        </div>
      )}

      {showRaw && (
        <pre style={{
          margin: 0, padding: 12, fontSize: 10, fontFamily: MONO,
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

// ───────────────────── Charts & Feed ─────────────────────

const RiskRadarChart = ({ T, isRTL, totalOpenR, dailyR }: {
  T: any; isRTL: boolean; totalOpenR: number; dailyR: number;
}) => {
  const pct = Math.min(100, (totalOpenR / Math.max(dailyR, 1)) * 100);
  const danger = pct >= 80;
  const warn = pct >= 50 && !danger;
  const color = danger ? T.accent.red : warn ? T.accent.orange : T.accent.green;
  const data = [{ name: 'risk', value: pct, fill: color }];
  return (
    <ChartCard T={T} title={isRTL ? 'מד סיכון פתוח כולל' : 'Total Open Risk'}>
      <ResponsiveContainer width="100%" height={150}>
        <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={180} endAngle={0}>
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar background={{ fill: `${T.bg.tertiary}` }} dataKey="value" cornerRadius={6} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div style={{ marginTop: -42, textAlign: 'center', fontFamily: POPPINS }}>
        <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1, textShadow: `0 0 14px ${color}66` }}>
          {totalOpenR.toFixed(2)}R
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: T.text.muted, marginTop: 4 }}>
          {pct.toFixed(0)}% · {isRTL ? `מגבלה ${dailyR}R` : `LIMIT ${dailyR}R`}
        </div>
      </div>
    </ChartCard>
  );
};

const MomentumChart = ({ T, isRTL, data }: {
  T: any; isRTL: boolean; data: { t: number; v: number }[];
}) => {
  const last = data[data.length - 1]?.v ?? 0;
  const positive = last >= 0;
  const color = positive ? T.accent.green : T.accent.red;
  const formatted = data.map(d => ({ x: d.t, y: d.v }));
  return (
    <ChartCard T={T} title={isRTL ? 'מומנטום uPnL (60ש׳)' : 'uPnL Momentum (60s)'}>
      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={formatted} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="alpha-momentum-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.55} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="x" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{
              background: T.bg.primary, border: `1px solid ${T.border.medium}`, borderRadius: 6,
              fontSize: 10, fontFamily: MONO, color: T.text.primary,
            }}
            labelFormatter={(t) => hhmmss(Number(t))}
            formatter={(v: number) => [`$${v.toFixed(2)}`, 'uPnL']}
          />
          <Area type="monotone" dataKey="y" stroke={color} strokeWidth={2} fill="url(#alpha-momentum-grad)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ marginTop: -34, textAlign: 'center', fontFamily: POPPINS, position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color, textShadow: `0 0 10px ${color}55` }}>
          {positive ? '+' : ''}${last.toFixed(2)}
        </span>
      </div>
    </ChartCard>
  );
};

const ChartCard = ({ T, title, children }: { T: any; title: string; children: React.ReactNode }) => (
  <div style={{
    background: `${T.bg.primary}`,
    border: `1px solid ${T.border.subtle}`,
    borderRadius: 10, padding: 10, position: 'relative', overflow: 'hidden',
  }}>
    <div style={{
      fontSize: 9, fontWeight: 800, letterSpacing: 1.4, color: T.text.muted,
      fontFamily: MONO, marginBottom: 4,
    }}>
      {title}
    </div>
    {children}
  </div>
);

const CommandFeed = ({ T, isRTL, feed, feedRef }: {
  T: any; isRTL: boolean;
  feed: { id: number; ts: number; text: string; tone: 'info' | 'warn' | 'good' | 'bad' }[];
  feedRef: React.RefObject<HTMLDivElement>;
}) => {
  const toneColor = (tone: string): string => {
    if (tone === 'good') return T.accent.green;
    if (tone === 'bad') return T.accent.red;
    if (tone === 'warn') return T.accent.orange;
    return T.text.muted;
  };
  const tonePrefix = (tone: string): string => {
    if (tone === 'good') return '🟢';
    if (tone === 'bad') return '🔴';
    if (tone === 'warn') return '⚠️';
    return '·';
  };
  return (
    <div style={{
      background: T.bg.primary,
      border: `1px solid ${T.border.subtle}`,
      borderRadius: 10, padding: 10, display: 'flex', flexDirection: 'column', minHeight: 180,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 800, letterSpacing: 1.4, color: T.text.muted,
        fontFamily: MONO, marginBottom: 6, display: 'flex', justifyContent: 'space-between',
      }}>
        <span>{isRTL ? 'יומן פקודות חי' : 'LIVE COMMAND FEED'}</span>
        <span>{feed.length}/{FEED_MAX}</span>
      </div>
      <div
        ref={feedRef}
        dir="ltr"
        style={{
          flex: 1, overflowY: 'auto', maxHeight: 180,
          fontFamily: MONO, fontSize: 10, lineHeight: 1.6,
          scrollbarColor: `${T.accent.purple}55 transparent`,
          scrollbarWidth: 'thin',
        }}
      >
        {feed.length === 0 ? (
          <div style={{ color: T.text.dim, fontStyle: 'italic', textAlign: 'center', marginTop: 24 }}>
            — awaiting events —
          </div>
        ) : feed.map(ev => (
          <div key={ev.id} style={{ color: toneColor(ev.tone), padding: '1px 0' }}>
            <span style={{ color: T.text.dim }}>[{hhmmss(ev.ts)}]</span>{' '}
            {tonePrefix(ev.tone)} {ev.text}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlphaLiveConsole;
