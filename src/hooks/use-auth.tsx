import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { setScopedUid } from '@/lib/scoped-storage';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

async function ensureProfile(user: User) {
  const meta = user.user_metadata ?? {};
  const displayName =
    meta.display_name ||
    meta.full_name ||
    meta.name ||
    user.email?.split('@')[0] ||
    'Orca Trader';

  // Check if a profile already exists — if it does, DO NOT overwrite avatar_url
  // (the user may have uploaded a custom avatar that would otherwise be wiped on
  // every sign-in / page refresh by the OAuth metadata avatar).
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    // Only update non-destructive fields (email/display_name) — preserve avatar.
    const { error } = await supabase
      .from('profiles')
      .update({ email: user.email ?? null, display_name: displayName })
      .eq('id', user.id);
    if (error) console.error('Failed to update profile:', error);
    return;
  }

  // First-time profile creation — seed avatar from OAuth metadata if present.
  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    email: user.email ?? null,
    display_name: displayName,
    avatar_url: meta.avatar_url ?? null,
  });
  if (error) console.error('Failed to create profile:', error);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setScopedUid(s?.user?.id ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setScopedUid(data.session?.user?.id ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    void ensureProfile(session.user);
  }, [session?.user?.id]);

  const signOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      await new Promise(r => setTimeout(r, 600));
    } finally {
      window.location.href = '/welcome';
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user: session?.user ?? null, loading, signOut }),
    [session, loading, signOut],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {signingOut && <SignOutOverlay />}
    </AuthContext.Provider>
  );
};

const SignOutOverlay = () => {
  // Lazy import to avoid circular deps at module init
  const { OrcaBootLoader } = require('@/components/OrcaBootLoader') as typeof import('@/components/OrcaBootLoader');
  return <OrcaBootLoader label="Signing out" />;
};


export const useAuth = () => useContext(AuthContext);
