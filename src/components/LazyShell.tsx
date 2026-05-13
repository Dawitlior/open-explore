import type { ReactNode } from 'react';
import { Suspense } from 'react';

const fallback = (
  <div
    style={{
      minHeight: 240,
      display: 'grid',
      placeItems: 'center',
      color: '#6b7a93',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 11,
      letterSpacing: '0.3em',
    }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        border: '2px solid #2a3a55',
        borderTopColor: '#3d8bff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }}
    />
  </div>
);

export const LazyShell = ({ children }: { children: ReactNode }) => (
  <Suspense fallback={fallback}>{children}</Suspense>
);
