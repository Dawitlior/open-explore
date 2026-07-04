import { memo } from 'react';
import type { EconomicEvent, EconomicImpact } from '@/lib/economic';

const TIER_COLOR: Record<EconomicImpact, string> = {
  t1: '#f43f5e', // critical — rose
  t2: '#f59e0b', // material — amber
  t3: '#64748b', // background — slate
};

const FLAG: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', AUD: '🇦🇺',
  CAD: '🇨🇦', CHF: '🇨🇭', NZD: '🇳🇿', CNY: '🇨🇳', ILS: '🇮🇱',
};

interface Props {
  events: EconomicEvent[];
  compact?: boolean;
  isPast?: boolean;
}

/**
 * iOS-style strip of macro event indicators inside a calendar cell.
 * Renders up to 3 pills + "+N" overflow. Dims past events.
 */
function MacroEventStripImpl({ events, compact = false, isPast = false }: Props) {
  if (!events?.length) return null;

  // Sort: T1 first, then earliest in day
  const sorted = [...events].sort((a, b) => {
    if (a.impact !== b.impact) {
      return a.impact === 't1' ? -1 : b.impact === 't1' ? 1 : a.impact === 't2' ? -1 : 1;
    }
    return new Date(a.release_at).getTime() - new Date(b.release_at).getTime();
  });

  const max = compact ? 2 : 3;
  const shown = sorted.slice(0, max);
  const extra = sorted.length - shown.length;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        marginTop: compact ? 2 : 4,
        opacity: isPast ? 0.4 : 1,
        flexWrap: 'wrap',
      }}
    >
      {shown.map((e) => {
        const color = TIER_COLOR[e.impact];
        const flag = e.currency ? FLAG[e.currency] : null;
        return (
          <span
            key={e.id}
            title={`${e.currency ?? ''} · ${e.event_name}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
              padding: compact ? '0 3px' : '1px 5px',
              borderRadius: 4,
              fontSize: compact ? 8 : 9,
              fontWeight: 700,
              color,
              background: `${color}1a`,
              border: `1px solid ${color}33`,
              fontFamily: "'IBM Plex Mono', monospace",
              lineHeight: compact ? '12px' : '14px',
              maxWidth: '100%',
            }}
          >
            {flag && <span style={{ fontSize: compact ? 8 : 9 }}>{flag}</span>}
            <span>{e.currency || '•'}</span>
          </span>
        );
      })}
      {extra > 0 && (
        <span
          style={{
            fontSize: compact ? 8 : 9,
            fontWeight: 700,
            color: '#94a3b8',
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

export const MacroEventStrip = memo(MacroEventStripImpl);

/** Single dot variant for ultra-compact mobile cells. */
export function MacroDot({ events, isPast }: { events: EconomicEvent[]; isPast?: boolean }) {
  if (!events?.length) return null;
  const tier = events.some((e) => e.impact === 't1') ? 't1' : events.some((e) => e.impact === 't2') ? 't2' : 't3';
  const color = TIER_COLOR[tier];
  return (
    <span
      title={`${events.length} macro event${events.length > 1 ? 's' : ''}`}
      style={{
        position: 'absolute',
        top: 2,
        insetInlineEnd: 2,
        width: 5,
        height: 5,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 4px ${color}80`,
        opacity: isPast ? 0.35 : 1,
      }}
    />
  );
}

/**
 * Premium side-dot stack for calendar cells (desktop MonthView + YearView).
 * Renders up to `max` vertical dots on the inline-end side of a relatively-
 * positioned cell, colored by tier severity (T1 rose, T2 amber, T3 slate).
 * "+N" overflow badge appears when there are more events than dots.
 */
export function MacroSideDots({
  events, isPast = false, max = 3, size = 6, gap = 4, inset = 4,
}: {
  events: EconomicEvent[];
  isPast?: boolean;
  max?: number;
  size?: number;
  gap?: number;
  inset?: number;
}) {
  if (!events?.length) return null;
  const sorted = [...events].sort((a, b) => {
    const rank = (i: EconomicImpact) => (i === 't1' ? 0 : i === 't2' ? 1 : 2);
    return rank(a.impact) - rank(b.impact);
  });
  const shown = sorted.slice(0, max);
  const extra = sorted.length - shown.length;
  const title = sorted
    .slice(0, 6)
    .map((e) => `${e.currency ?? ''} ${e.event_name}`.trim())
    .join('\n') + (sorted.length > 6 ? `\n+${sorted.length - 6} more` : '');
  return (
    <div
      title={title}
      style={{
        position: 'absolute',
        top: inset,
        bottom: inset,
        insetInlineEnd: inset,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap,
        opacity: isPast ? 0.4 : 1,
        pointerEvents: 'auto',
        zIndex: 2,
      }}
    >
      {shown.map((e) => {
        const color = TIER_COLOR[e.impact];
        return (
          <span
            key={e.id}
            aria-hidden
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 6px ${color}aa, inset 0 0 0 1px rgba(255,255,255,0.18)`,
            }}
          />
        );
      })}
      {extra > 0 && (
        <span
          style={{
            fontSize: 8,
            fontWeight: 800,
            color: '#f43f5e',
            fontFamily: "'IBM Plex Mono', monospace",
            lineHeight: 1,
            marginTop: 1,
          }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

export { FLAG as CURRENCY_FLAG, TIER_COLOR as MACRO_TIER_COLOR };
