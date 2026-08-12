/**
 * DateTimePicker
 * ──────────────
 * Replaces the native <input type="datetime-local"> in the Add-Trade form.
 * Radix Popover + shadcn Calendar, styled inline from the active trading
 * theme so it matches every scheme (midnight / platinum / …).
 *
 * Value contract is identical to the native input: "YYYY-MM-DDTHH:mm".
 */
import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { TradingTheme } from '@/lib/trading-theme';
import { infoColor } from '@/lib/semantic-color';

const pad = (n: number) => String(n).padStart(2, '0');

export const toLocalValue = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const parseValue = (v: string): Date | null => {
  if (!v) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return isNaN(d.getTime()) ? null : d;
};

interface Props {
  value: string;
  onChange: (v: string) => void;
  T: TradingTheme;
  isRTL: boolean;
  isMobile?: boolean;
  placeholder?: string;
  invalid?: boolean;
  /** Minimum selectable value in the same "YYYY-MM-DDTHH:mm" format. */
  min?: string;
  clearable?: boolean;
  ariaLabel?: string;
}

export function DateTimePicker({
  value, onChange, T, isRTL, isMobile, placeholder, invalid, min, clearable, ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const date = useMemo(() => parseValue(value), [value]);
  const minDate = useMemo(() => parseValue(min || ''), [min]);
  const accent = infoColor(T);

  const commit = (d: Date) => onChange(toLocalValue(d));

  const setDatePart = (picked?: Date) => {
    if (!picked) return;
    const base = date ?? new Date();
    const next = new Date(picked);
    next.setHours(base.getHours(), base.getMinutes(), 0, 0);
    commit(next);
  };

  const setTimePart = (h: number, m: number) => {
    const next = date ? new Date(date) : new Date();
    next.setHours(h, m, 0, 0);
    commit(next);
  };

  const offset = (mins: number) => {
    const base = date ?? new Date();
    commit(new Date(base.getTime() + mins * 60000));
  };

  const label = date
    ? `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`
    : (placeholder ?? (isRTL ? 'בחר תאריך ושעה' : 'Pick date & time'));

  const quickBtn: React.CSSProperties = {
    padding: '6px 10px',
    borderRadius: 8,
    border: `1px solid ${T.border.medium}`,
    background: T.bg.tertiary,
    color: T.text.secondary,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    transition: 'all 0.15s',
  };

  const numCell = (active: boolean): React.CSSProperties => ({
    padding: '6px 0',
    textAlign: 'center',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    border: `1px solid ${active ? accent : 'transparent'}`,
    background: active ? `${accent}22` : 'transparent',
    color: active ? accent : T.text.secondary,
    fontFamily: "'JetBrains Mono', monospace",
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const panel = (
    <>
      <div style={{ padding: 10, borderBottom: `1px solid ${T.border.subtle}`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" style={{ ...quickBtn, borderColor: accent, color: accent }}
          onClick={() => commit(new Date())}>{isRTL ? 'עכשיו' : 'Now'}</button>
        <button type="button" style={quickBtn} onClick={() => offset(-5)}>-5m</button>
        <button type="button" style={quickBtn} onClick={() => offset(-15)}>-15m</button>
        <button type="button" style={quickBtn} onClick={() => offset(-60)}>-1h</button>
        {clearable && (
          <button type="button" style={{ ...quickBtn, marginInlineStart: 'auto' }}
            onClick={() => { onChange(''); setOpen(false); }}>{isRTL ? 'נקה' : 'Clear'}</button>
        )}
        {isMobile && (
          <button type="button" style={{ ...quickBtn, marginInlineStart: clearable ? 0 : 'auto', borderColor: accent, color: accent }}
            onClick={() => setOpen(false)}>{isRTL ? 'סיום' : 'Done'}</button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'stretch' }}>
        <Calendar
          mode="single"
          selected={date ?? undefined}
          defaultMonth={date ?? undefined}
          onSelect={setDatePart}
          disabled={minDate ? { before: new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate()) } : undefined}
          initialFocus={!isMobile}
          className={cn('pointer-events-auto', isMobile ? 'p-2 w-full' : 'p-3')}
          classNames={isMobile ? {
            months: 'flex flex-col w-full',
            month: 'space-y-2 w-full',
            caption: 'flex justify-center pt-1 relative items-center',
            caption_label: 'text-sm font-medium',
            nav_button: 'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 inline-flex items-center justify-center rounded-md border',
            table: 'w-full border-collapse table-fixed',
            head_row: 'flex w-full',
            head_cell: 'text-muted-foreground flex-1 min-w-0 font-normal text-[0.65rem]',
            row: 'flex w-full mt-1',
            cell: 'flex-1 min-w-0 h-8 text-center text-xs p-0 relative focus-within:relative focus-within:z-20',
            day: 'h-8 w-full p-0 text-xs font-normal rounded-md aria-selected:opacity-100 inline-flex items-center justify-center hover:bg-accent',
          } : undefined}
        />

        <div style={{
          borderInlineStart: isMobile ? 'none' : `1px solid ${T.border.subtle}`,
          borderTop: isMobile ? `1px solid ${T.border.subtle}` : 'none',
          padding: 10, display: 'flex', gap: 8,
          flexDirection: isMobile ? 'column' : 'row',
          minWidth: 0,
        }}>
          {[{ label: isRTL ? 'שעה' : 'HH', items: hours, sel: date?.getHours() ?? -1, on: (v: number) => setTimePart(v, date?.getMinutes() ?? 0) },
            { label: isRTL ? 'דקה' : 'mm', items: minutes, sel: date ? Math.floor(date.getMinutes() / 5) * 5 : -1, on: (v: number) => setTimePart(date?.getHours() ?? new Date().getHours(), v) },
          ].map(col => (
            <div key={col.label} style={{
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              alignItems: isMobile ? 'center' : 'stretch',
              gap: isMobile ? 8 : 0,
              minWidth: 0,
              width: isMobile ? '100%' : 54,
            }}>
              <span style={{ fontSize: 9, letterSpacing: 0.6, fontWeight: 700, color: T.text.muted, textAlign: 'center', marginBottom: isMobile ? 0 : 6, textTransform: 'uppercase', flexShrink: 0, width: isMobile ? 24 : 'auto' }}>{col.label}</span>
              <div style={{
                maxHeight: isMobile ? undefined : 210,
                overflowY: isMobile ? 'hidden' : 'auto',
                overflowX: isMobile ? 'auto' : 'hidden',
                display: isMobile ? 'flex' : 'grid',
                gap: isMobile ? 6 : 2,
                paddingInlineEnd: 2,
                paddingBottom: isMobile ? 4 : 0,
                flex: isMobile ? 1 : undefined,
                minWidth: 0,
                WebkitOverflowScrolling: 'touch',
              }}>
                {col.items.map(v => (
                  <div key={v} role="button" tabIndex={0}
                    onClick={() => col.on(v)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); col.on(v); } }}
                    style={{ ...numCell(col.sel === v), ...(isMobile ? { flex: '0 0 auto', minWidth: 38, padding: '8px 0' } : null) }}>{pad(v)}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const trigger = (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      onClick={isMobile ? () => setOpen(true) : undefined}
      style={{
        width: '100%',
        padding: isMobile ? '13px 14px' : '12px 14px',
        borderRadius: 12,
        border: `1.5px solid ${invalid ? T.accent.red : (open ? accent : T.border.medium)}`,
        background: T.bg.tertiary,
        color: date ? T.text.primary : T.text.muted,
        fontSize: isMobile ? 14 : 14,
        fontWeight: 600,
        fontFamily: "'JetBrains Mono', monospace",
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        cursor: 'pointer',
        textAlign: isRTL ? 'right' : 'left',
        boxShadow: open ? `0 0 0 3px ${accent}22` : 'none',
        transition: 'all 0.18s',
      }}
    >
      <span>{label}</span>
      <span style={{ opacity: 0.7, fontSize: 15 }}>🗓</span>
    </button>
  );

  /* Mobile: a real bottom sheet — no popover positioning games, never
     overflows the viewport. */
  if (isMobile) {
    return (
      <>
        {trigger}
        {open && createPortal(
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100000,
              background: 'rgba(2,6,15,0.6)', backdropFilter: 'blur(3px)',
              display: 'flex', alignItems: 'flex-end',
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%',
                background: T.bg.secondary,
                borderTop: `1px solid ${T.border.medium}`,
                borderTopLeftRadius: 18, borderTopRightRadius: 18,
                color: T.text.primary,
                maxHeight: '85vh', overflowY: 'auto',
                paddingBottom: 'env(safe-area-inset-bottom)',
                boxShadow: '0 -18px 50px rgba(0,0,0,0.5)',
              }}
            >
              {panel}
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={12}
        avoidCollisions
        className="p-0 pointer-events-auto"
        style={{
          background: T.bg.secondary,
          border: `1px solid ${T.border.medium}`,
          borderRadius: 14,
          color: T.text.primary,
          boxShadow: '0 24px 60px -20px rgba(0,0,0,0.55)',
          zIndex: 9999,
          width: 'auto',
          maxWidth: 'calc(100vw - 24px)',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
        }}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}


export default DateTimePicker;
