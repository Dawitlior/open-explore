import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import type { ReactNode } from 'react';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';
import { MfaGate } from '@/components/auth/MfaGate';
import { useDeviceSession } from '@/hooks/use-device-session';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  useDeviceSession();

  if (loading) {
    return <OrcaBootLoader />;
  }


  if (!session) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }


  return <MfaGate>{children}</MfaGate>;
}
