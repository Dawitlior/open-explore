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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 520, background: T.bg.card, border: `1px solid ${T.border.medium}`,
        borderRadius: T.radius.lg, boxShadow: T.shadow.elevated, overflow: 'hidden',
        animation: 'fadeIn 0.15s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${T.border.subtle}` }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.text.dim} strokeWidth="2" style={{ marginRight: 10, flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: T.text.primary, fontSize: 14, fontFamily: "'Inter', sans-serif"
            }}
          />
          <span style={{ fontSize: 10, color: T.text.dim, padding: '2px 6px', background: T.bg.tertiary, borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>ESC</span>
        </div>
        <div style={{ maxHeight: 340, overflow: 'auto', padding: '6px 0' }}>
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div style={{ padding: '6px 16px', fontSize: 9, color: T.text.dim, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{category}</div>
              {cmds.map(cmd => (
                <button
                  key={cmd.id}
                  onClick={() => handleSelect(cmd)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 16px', background: 'transparent', border: 'none',
                    color: T.text.primary, cursor: 'pointer', fontSize: 13, textAlign: 'left',
                    transition: 'background 0.1s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${T.accent.cyan}10`)}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ fontSize: 15 }}>{cmd.icon}</span>
                  <span style={{ flex: 1 }}>{cmd.label}</span>
                  {cmd.shortcut && <span style={{ fontSize: 10, color: T.text.dim, fontFamily: "'JetBrains Mono', monospace" }}>{cmd.shortcut}</span>}
                </button>
              ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '20px 16px', textAlign: 'center', color: T.text.dim, fontSize: 13 }}>No commands found</div>
          )}
        </div>
      </div>
    </div>
  );
};
