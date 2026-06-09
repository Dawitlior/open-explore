import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import type { ReactNode } from 'react';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          background: '#061326',
          color: '#90a3c0',
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          letterSpacing: '0.2em',
        }}
      >
        LOADING…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/welcome" replace state={{ from: location }} />;
  }


  return <>{children}</>;
}
