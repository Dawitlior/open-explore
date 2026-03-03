import { ReactNode, useEffect } from 'react';

interface PrivacyMaskProps {
  enabled: boolean;
  children: ReactNode;
  type?: 'dollar' | 'percent' | 'number';
}

export const PrivacyMask = ({ enabled, children, type = 'dollar' }: PrivacyMaskProps) => {
  if (!enabled) return <>{children}</>;

  const placeholder = type === 'dollar' ? '$•••' : type === 'percent' ? '•••%' : '•••';

  return (
    <span style={{ filter: 'blur(6px)', userSelect: 'none', transition: 'filter 0.3s ease' }}>
      {children}
    </span>
  );
};

export const usePrivacyShortcut = (onToggle: () => void) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Shift+P or Cmd+Shift+P
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onToggle]);
};
