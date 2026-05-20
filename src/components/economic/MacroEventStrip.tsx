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

export { FLAG as CURRENCY_FLAG, TIER_COLOR as MACRO_TIER_COLOR };
