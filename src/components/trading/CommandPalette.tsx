import { useState, useEffect, useCallback, useRef } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';

interface Command {
  id: string;
  label: string;
  icon: string;
  category: string;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  T: TradingTheme;
  commands: Command[];
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette = ({ T, commands, isOpen, onClose }: CommandPaletteProps) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // toggle handled externally
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const filtered = commands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const handleSelect = useCallback((cmd: Command) => {
    cmd.action();
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      data-bottom-sheet-overlay
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh',
        background: 'radial-gradient(ellipse at top, rgba(8,14,28,0.65) 0%, rgba(0,0,0,0.78) 80%)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        animation: 'cp-fade 0.18s ease-out',
      }}
    >
      <style>{`
        @keyframes cp-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes cp-rise { from { opacity: 0; transform: translateY(-8px) scale(0.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes cp-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
      `}</style>
      <div onClick={e => e.stopPropagation()} data-bottom-sheet style={{
        width: '100%', maxWidth: 560,
        background: `linear-gradient(180deg, ${T.bg.card} 0%, ${T.bg.tertiary || T.bg.card} 100%)`,
        border: `1px solid ${T.accent.cyan}33`,
        borderRadius: 18,
        boxShadow: `0 30px 80px -20px ${T.accent.cyan}25, 0 20px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)`,
        overflow: 'hidden',
        animation: 'cp-rise 0.22s cubic-bezier(0.16,1,0.3,1)',
        position: 'relative',
      }}>
        {/* Top hairline shimmer accent */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${T.accent.cyan}, transparent)`,
          backgroundSize: '200% 100%',
          animation: 'cp-shimmer 3.2s linear infinite',
          opacity: 0.7,
        }} />
        <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: `1px solid ${T.border.subtle}` }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, marginRight: 12,
            background: `linear-gradient(135deg, ${T.accent.cyan}25, ${T.accent.teal || T.accent.cyan}15)`,
            border: `1px solid ${T.accent.cyan}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: `inset 0 0 12px ${T.accent.cyan}20`,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.accent.cyan} strokeWidth="2.2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search actions, pages, settings…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: T.text.primary, fontSize: 15, fontWeight: 500,
              fontFamily: "'Poppins', 'Inter', sans-serif",
              letterSpacing: '0.01em',
            }}
          />
          <span style={{
            fontSize: 9.5, color: T.text.muted, padding: '4px 8px',
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border.subtle}`,
            borderRadius: 6, fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.08em', fontWeight: 600,
          }}>ESC</span>
        </div>
        <div style={{ maxHeight: 380, overflow: 'auto', padding: '8px 0' }}>
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category} style={{ marginBottom: 4 }}>
              <div style={{
                padding: '10px 20px 6px', fontSize: 9.5, color: T.accent.cyan,
                textTransform: 'uppercase', letterSpacing: '0.18em', fontWeight: 700,
                opacity: 0.78,
              }}>{category}</div>
              {cmds.map(cmd => (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, width: '100%',
                    padding: '10px 20px', background: 'transparent', border: 'none',
                    borderInlineStart: '2px solid transparent',
                    color: T.text.primary, cursor: 'pointer', fontSize: 13.5, textAlign: 'left',
                    fontFamily: "'Poppins', sans-serif", fontWeight: 500,
                    transition: 'all 0.16s cubic-bezier(0.16,1,0.3,1)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `linear-gradient(90deg, ${T.accent.cyan}12, transparent)`;
                    e.currentTarget.style.borderInlineStartColor = T.accent.cyan;
                    e.currentTarget.style.transform = 'translateX(2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderInlineStartColor = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                >
                  <span style={{
                    fontSize: 16, width: 28, height: 28, display: 'inline-flex',
                    alignItems: 'center', justifyContent: 'center', borderRadius: 7,
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${T.border.subtle}`,
                  }}>{cmd.icon}</span>
                  <span style={{ flex: 1 }}>{cmd.label}</span>
                  {cmd.shortcut && (
                    <span style={{
                      fontSize: 10, color: T.text.muted,
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: '3px 7px', borderRadius: 5,
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${T.border.subtle}`,
                      letterSpacing: '0.05em',
                    }}>{cmd.shortcut}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: T.text.muted, fontSize: 13 }}>
              <div style={{ fontSize: 28, opacity: 0.4, marginBottom: 6 }}>⌕</div>
              No matching commands
            </div>
          )}
        </div>
        {/* Footer hint */}
        <div style={{
          padding: '10px 20px', borderTop: `1px solid ${T.border.subtle}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          fontSize: 10, color: T.text.muted, fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.05em',
        }}>
          <span>↑ ↓ navigate</span>
          <span>↵ select</span>
          <span style={{ color: T.accent.cyan, opacity: 0.7 }}>ORCA · COMMAND</span>
        </div>
      </div>
    </div>
  );
};
