import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import type { ReactNode } from 'react';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <OrcaBootLoader />;
  }


  if (!session) {
    return <Navigate to="/welcome" replace state={{ from: location }} />;
  }


  return <>{children}</>;
}
