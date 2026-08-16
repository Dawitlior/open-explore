/**
 * Compact, collapsible legend explaining the calendar's two visual channels:
 * graded background fill = trading result, neutral dot = report exists.
 * Expanded on first ever view, collapsed thereafter (per-device preference).
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { TradingTheme } from '@/lib/trading-theme';
import { withAlpha } from '@/lib/chart-theme';
import { fillRamp, reportDotColor } from '@/lib/calendar-fill';

const SEEN_KEY = 'orca:calendarLegendSeen';

export function CalendarLegend({ T, isRTL }: { T: TradingTheme; isRTL: boolean }) {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(SEEN_KEY) !== '1'; } catch { return true; }
  });

  const toggle = () => {
    setOpen(o => {
      if (o) { try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ } }
      return !o;
    });
  };

  const ramp = fillRamp(T);
  const steps: Array<{ c: string; a: number }> = [
    { c: T.state.loss, a: ramp.strong },
    { c: T.state.loss, a: ramp.medium },
    { c: T.state.loss, a: ramp.light },
    { c: T.text.muted, a: ramp.breakeven },
    { c: T.state.profit, a: ramp.light },
    { c: T.state.profit, a: ramp.medium },
    { c: T.state.profit, a: ramp.strong },
  ];

  const label = isRTL ? 'מקרא' : 'Legend';

  return (
    <div style={{ marginTop: 12, paddingBottom: 72, direction: isRTL ? 'rtl' : 'ltr' }}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: T.text.muted, fontSize: 11, fontWeight: 600,
          letterSpacing: '0.06em', textTransform: 'uppercase', padding: '6px 4px',
        }}
      >
        {label}
        <ChevronDown size={13} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 160ms ease' }} />
      </button>

      {open && (
        <div style={{
          border: `1px solid ${T.border.subtle}`,
          borderRadius: 12,
          padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: 10,
          background: withAlpha(T.text.muted, T.isLight ? 0.04 : 0.03),
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', border: `1px solid ${T.border.subtle}` }}>
              {steps.map((s, i) => (
                <div key={i} style={{ flex: 1, background: withAlpha(s.c, s.a) }} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.text.muted }}>
              <span>{isRTL ? 'הפסד' : 'Negative'}</span>
              <span>{isRTL ? 'איזון' : 'Breakeven'}</span>
              <span>{isRTL ? 'רווח' : 'Positive'}</span>
            </div>
            <div style={{ fontSize: 10, color: T.text.muted }}>
              {isRTL ? 'עוצמת הרקע = גודל התוצאה (R)' : 'Fill intensity = size of the day’s result (R)'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: T.text.secondary }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: reportDotColor(T), flexShrink: 0 }} />
            {isRTL ? 'קיים דיווח כלכלי ביום זה' : 'An economic report exists on this day'}
          </div>
        </div>
      )}
    </div>
  );
}

export default CalendarLegend;
