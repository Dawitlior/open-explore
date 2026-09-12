/**
 * ProLockOverlay — renders its children heavily blurred + non-interactive and
 * floats an upgrade card on top. Used for Pro-only channels that should stay
 * *visible* (so users see what exists) but not usable.
 *
 * When `locked` is false it renders children untouched.
 */
import type { ReactNode } from 'react';
import { useLang } from '@/hooks/use-lang';

interface Props {
  locked: boolean;
  children: ReactNode;
  /** Optional one-liner describing the locked channel. */
  note?: string;
}

export function ProLockOverlay({ locked, children, note }: Props) {
  const { lang } = useLang();
  const isHe = lang === 'he';

  if (!locked) return <>{children}</>;

  return (
    <div style={{ position: 'relative', minHeight: 320 }} dir={isHe ? 'rtl' : 'ltr'}>
      <div
        aria-hidden
        
        style={{
          filter: 'blur(11px) saturate(0.65)',
          WebkitFilter: 'blur(11px) saturate(0.65)',
          opacity: 0.5,
          pointerEvents: 'none',
          userSelect: 'none',
          maxHeight: 720,
          overflow: 'hidden',
        }}
      >
        {children}
      </div>

      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 3,
          display: 'grid', placeItems: 'center', padding: 16,
        }}
      >
        <div
          style={{
            maxWidth: 420, width: '100%', textAlign: 'center',
            borderRadius: 18, padding: '26px 22px',
            background: 'hsl(var(--card) / 0.92)',
            border: '1px solid hsl(var(--primary) / 0.35)',
            boxShadow: '0 30px 90px -24px hsl(var(--primary) / 0.45), inset 0 0 0 1px hsl(var(--border) / 0.6)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            aria-hidden
            style={{
              fontSize: 26, lineHeight: 1, marginBottom: 10,
              color: 'hsl(var(--primary))',
              textShadow: '0 0 14px hsl(var(--primary) / 0.85), 0 0 30px hsl(var(--primary) / 0.5)',
            }}
          >
            ★
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'hsl(var(--foreground))', marginBottom: 6 }}>
            {isHe ? 'הערוץ הזה נפתח בשדרוג' : 'Unlock this channel'}
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'hsl(var(--muted-foreground))', margin: '0 0 16px' }}>
            {note ?? (isHe
              ? 'התוכן כאן זמין בתוכנית המלאה. שדרג כדי לראות אותו במלואו.'
              : 'This content is part of the full plan. Upgrade to see it in full.')}
          </p>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('orca:open-upgrade', { detail: { required: 'pro' } }))}
            style={{
              padding: '10px 22px', borderRadius: 10, cursor: 'pointer',
              border: '1px solid hsl(var(--primary) / 0.5)',
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              fontSize: 13, fontWeight: 700,
              boxShadow: '0 0 24px -6px hsl(var(--primary) / 0.8)',
            }}
          >
            {isHe ? 'שדרוג' : 'Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProLockOverlay;
