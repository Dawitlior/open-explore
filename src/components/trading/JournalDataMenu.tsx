import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { TradingTheme } from '@/lib/trading-theme';
import { infoColor, neutralRamp } from '@/lib/semantic-color';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  onImport: (file?: File) => void;
  onExportXlsx: () => void;
  onExportJson: () => void;
}

/**
 * Compact "Data" popover for the journal header — collapses Import / XLSX /
 * JSON into a single control so the toolbar stops eating horizontal space.
 */
export function JournalDataMenu({ T, isRTL, onImport, onExportXlsx, onExportJson }: Props) {
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<File | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const chooseFile = (file?: File) => {
    if (!file) return;
    const supported = /\.(xlsx?|csv|txt|tsv|json)$/i.test(file.name);
    if (!supported || file.size === 0) {
      toast.error(isRTL ? 'הקובץ אינו נתמך' : 'Unsupported file', {
        description: isRTL ? 'בחר קובץ XLSX, XLS, CSV, TSV, TXT או JSON שאינו ריק.' : 'Choose a non-empty XLSX, XLS, CSV, TSV, TXT, or JSON file.',
      });
      return;
    }
    setPreview(file);
  };

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
    { icon: '📥', label: isRTL ? 'ייבוא נתונים' : 'Import data', run: () => inputRef.current?.click() },
    { icon: '📊', label: isRTL ? 'ייצוא XLSX' : 'Export XLSX', run: onExportXlsx },
    { icon: '📤', label: isRTL ? 'ייצוא JSON' : 'Export JSON', run: onExportJson },
  ];

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <input ref={inputRef} type="file" hidden accept=".xlsx,.xls,.csv,.txt,.tsv,.json" onChange={e => chooseFile(e.target.files?.[0])} />
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="orca-focus"
        style={{
          padding: '7px 14px', background: open ? T.bg.card : T.bg.tertiary,
          border: `1px solid ${open ? infoColor(T) : T.border.medium}`,
          borderRadius: T.radius.md, color: open ? infoColor(T) : T.text.secondary,
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
          <div
            onDragEnter={e => { e.preventDefault(); setDragging(true); }}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={e => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files?.[0]); }}
            style={{
              marginTop: 4, padding: '12px 10px', textAlign: 'center', borderRadius: T.radius.sm,
              border: `1px dashed ${dragging ? infoColor(T) : T.border.medium}`,
              background: dragging ? `${infoColor(T)}12` : T.bg.tertiary,
              color: dragging ? infoColor(T) : T.text.muted, fontSize: 10.5, lineHeight: 1.45,
            }}
          >
            {isRTL ? 'גרור קובץ לכאן' : 'Drop a file here'}
          </div>
          {preview && (
            <div style={{ marginTop: 4, padding: 10, borderRadius: T.radius.sm, border: `1px solid ${T.border.medium}`, background: T.bg.tertiary }}>
              <div style={{ color: T.text.primary, fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{preview.name}</div>
              <div style={{ color: T.text.muted, fontSize: 9.5, marginTop: 3 }}>{(preview.size / 1024).toFixed(1)} KB</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                  className="orca-focus"
                  onClick={() => { const file = preview; setPreview(null); setOpen(false); onImport(file); }}
                  style={{ flex: 1, padding: '6px 8px', border: 'none', borderRadius: T.radius.sm, background: infoColor(T), color: T.bg.primary, fontSize: 10.5, fontWeight: 800, cursor: 'pointer' }}
                >{isRTL ? 'בדיקה וייבוא' : 'Review & import'}</button>
                <button
                  className="orca-focus"
                  onClick={() => setPreview(null)}
                  style={{ padding: '6px 8px', border: `1px solid ${T.border.medium}`, borderRadius: T.radius.sm, background: 'transparent', color: T.text.secondary, fontSize: 10.5, cursor: 'pointer' }}
                >{isRTL ? 'הסר' : 'Remove'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default JournalDataMenu;
