import { ReactNode, useEffect } from 'react';

interface PrivacyMaskProps {
  enabled: boolean;
  children: ReactNode;
  type?: 'dollar' | 'percent' | 'number';
}

/**
 * Privacy mask — when enabled, the underlying value is REPLACED by a
 * placeholder string in the DOM. This is hardened against trivial DOM
 * inspection: the real number is never rendered into the document tree
 * while masking is on (unlike a CSS-blur approach which leaks the value).
 *
 * The `data-orca-mask` attribute lets QA / e2e tests assert masking state
 * without exposing the underlying number.
 */
export const PrivacyMask = ({ enabled, children, type = 'dollar' }: PrivacyMaskProps) => {
  if (!enabled) return <>{children}</>;

  const placeholder = type === 'dollar' ? '$•••' : type === 'percent' ? '•••%' : '•••';

  return (
    <span
      data-orca-mask="on"
      aria-label="hidden"
      style={{
        display: 'inline-block',
        userSelect: 'none',
        letterSpacing: '0.05em',
        fontVariantNumeric: 'tabular-nums',
        opacity: 0.85,
      }}
    >
      {placeholder}
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
