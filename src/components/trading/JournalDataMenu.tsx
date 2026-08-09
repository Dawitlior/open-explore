import { useEffect, useRef, useState } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  onImport: () => void;
  onExportXlsx: () => void;
  onExportJson: () => void;
}

/**
 * Compact "Data" popover for the journal header — collapses Import / XLSX /
 * JSON into a single control so the toolbar stops eating horizontal space.
 */
export function JournalDataMenu({ T, isRTL, onImport, onExportXlsx, onExportJson }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const items = [
    { icon: '📥', label: isRTL ? 'ייבוא נתונים' : 'Import data', run: onImport },
    { icon: '📊', label: isRTL ? 'ייצוא XLSX' : 'Export XLSX', run: onExportXlsx },
    { icon: '📤', label: isRTL ? 'ייצוא JSON' : 'Export JSON', run: onExportJson },
  ];

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="orca-focus"
        style={{
          padding: '7px 14px', background: open ? T.bg.card : T.bg.tertiary,
          border: `1px solid ${open ? T.accent.cyan : T.border.medium}`,
          borderRadius: T.radius.md, color: open ? T.accent.cyan : T.text.secondary,
          fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
      >
        <span>🗂</span>
        <span>{isRTL ? 'נתונים' : 'Data'}</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)',
            [isRTL ? 'left' : 'right']: 0,
            minWidth: 180, zIndex: 60,
            background: T.bg.card, border: `1px solid ${T.border.medium}`,
            borderRadius: T.radius.md, boxShadow: '0 18px 40px -18px rgba(0,0,0,0.55)',
            padding: 6, display: 'flex', flexDirection: 'column', gap: 2,
          } as React.CSSProperties}
        >
          {items.map(it => (
            <button
              key={it.label}
              role="menuitem"
              onClick={() => { setOpen(false); it.run(); }}
              className="orca-focus"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '8px 10px', background: 'transparent', border: 'none',
                borderRadius: T.radius.sm, color: T.text.secondary, fontSize: 11.5,
                cursor: 'pointer', textAlign: isRTL ? 'right' : 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.bg.tertiary; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span>{it.icon}</span>
              <span>{it.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default JournalDataMenu;
