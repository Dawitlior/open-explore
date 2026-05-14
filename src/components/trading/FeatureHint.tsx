import { useState, useEffect } from 'react';
import { X, HelpCircle } from 'lucide-react';
import type { TradingTheme } from '@/lib/trading-theme';

/**
 * FeatureHint — small dismissible explanation chip.
 * Persists dismissal in localStorage by `id`.
 *
 * Usage:
 *   <FeatureHint T={T} id="dashboard-calendar" text="הלוח שנה מציג את כל העסקאות..." />
 */
interface Props {
  T: TradingTheme;
  id: string;
  text: string;
  /** Optional inline style override */
  style?: React.CSSProperties;
  /** Compact mode = single line, no wrap */
  compact?: boolean;
}

const STORAGE_KEY = 'orca-feature-hints-dismissed';

function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw));
  } catch { return new Set(); }
}

function writeDismissed(set: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...set])); } catch {}
}

export const FeatureHint = ({ T, id, text, style, compact }: Props) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(readDismissed().has(id));
  }, [id]);

  if (dismissed) return null;

  return (
    <div
      role="note"
      style={{
        display: 'flex',
        alignItems: compact ? 'center' : 'flex-start',
        gap: 10,
        padding: compact ? '6px 10px' : '10px 12px',
        marginBottom: 12,
        borderRadius: T.radius.md,
        background: `linear-gradient(135deg, ${T.accent.cyan}10, ${T.accent.cyan}04)`,
        border: `1px solid ${T.accent.cyan}28`,
        fontSize: 12,
        color: T.text.secondary,
        lineHeight: 1.5,
        ...style,
      }}
    >
      <HelpCircle size={14} style={{ color: T.accent.cyan, flexShrink: 0, marginTop: compact ? 0 : 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>{text}</div>
      <button
        aria-label="Dismiss hint"
        onClick={() => {
          const next = readDismissed();
          next.add(id);
          writeDismissed(next);
          setDismissed(true);
        }}
        style={{
          width: 22, height: 22, borderRadius: 6, border: 'none',
          background: 'transparent', color: T.text.muted, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'all .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${T.accent.cyan}18`; e.currentTarget.style.color = T.accent.cyan; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.text.muted; }}
      >
        <X size={13} />
      </button>
    </div>
  );
};
