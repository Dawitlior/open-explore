/**
 * Session UI — a compact filter row (Asia / London / NY) plus the per-day
 * marker rendered inside calendar cells.
 *
 * The filter is purely presentational: turning a session off hides its marker
 * so the grid stays readable; it never filters trades or P&L.
 */
import { memo } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import { SESSIONS, type SessionId, type DaySessionStat } from '@/lib/market-sessions';

export type SessionFilter = Record<SessionId, boolean>;

export const ALL_SESSIONS_ON: SessionFilter = { asia: true, london: true, ny: true };

interface ToggleProps {
  T: TradingTheme;
  isRTL: boolean;
  value: SessionFilter;
  onChange: (next: SessionFilter) => void;
  compact?: boolean;
}

export const SessionToggles = memo(function SessionToggles({ T, isRTL, value, onChange, compact }: ToggleProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? 4 : 6, flexWrap: 'wrap' }}>
      <span style={{
        fontSize: compact ? 8.5 : 9,
        letterSpacing: '0.12em',
        color: T.text.muted,
        fontFamily: "'JetBrains Mono', monospace",
        marginInlineEnd: 2,
      }}>
        {isRTL ? 'סשנים' : 'SESSIONS'}
      </span>
      {SESSIONS.map(s => {
        const on = value[s.id];
        const name = isRTL ? s.labelHe : s.labelEn;
        return (
          <button
            key={s.id}
            type="button"
            role="switch"
            aria-checked={on}
            aria-label={isRTL
              ? `סשן ${name} — ${on ? 'מוצג' : 'מוסתר'}`
              : `${name} session — ${on ? 'shown' : 'hidden'}`}
            onClick={() => onChange({ ...value, [s.id]: !on })}
            title={name}
            className="orca-session-chip"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: compact ? '2px 7px' : '3px 9px',
              borderRadius: 999,
              cursor: 'pointer',
              fontSize: compact ? 9.5 : 10.5,
              fontWeight: 700,
              letterSpacing: '0.04em',
              fontFamily: "'JetBrains Mono', monospace",
              background: on ? `${s.color}18` : 'transparent',
              border: `1px solid ${on ? `${s.color}55` : T.border.subtle}`,
              color: on ? T.text.primary : T.text.muted,
              transition: 'background .15s, color .15s, border-color .15s',
              ['--orca-session-ring' as string]: s.color,
            }}
          >
            <span aria-hidden style={{
              width: 6, height: 6, borderRadius: '50%',
              background: on ? s.color : T.text.muted,
              opacity: on ? s.weight : 0.32,
            }} />
            {compact ? s.short : name}
          </button>
        );
      })}

    </div>
  );
});

interface MarkerProps {
  stat?: DaySessionStat;
  filter: SessionFilter;
  /** Height of the marker bar. */
  size?: number;
  align?: 'center' | 'stretch';
}

/**
 * Three-segment marker. A lit segment = the day had trades in that session.
 * Unlit sessions are omitted entirely so quiet days stay clean.
 */
export const SessionMarker = memo(function SessionMarker({ stat, filter, size = 3, align = 'center' }: MarkerProps) {
  if (!stat) return null;
  const active = SESSIONS.filter(s => filter[s.id] && stat.sessions.has(s.id));
  if (!active.length) return null;
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        gap: 2,
        justifyContent: align === 'center' ? 'center' : 'stretch',
        width: align === 'stretch' ? '100%' : undefined,
      }}
    >
      {active.map(s => (
        <span
          key={s.id}
          title={s.labelEn}
          style={{
            height: size,
            width: align === 'stretch' ? undefined : size * 4,
            flex: align === 'stretch' ? 1 : undefined,
            borderRadius: 999,
            background: s.color,
            opacity: s.weight,
          }}
        />
      ))}
    </div>
  );
});
