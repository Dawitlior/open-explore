import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { setScopedUid } from '@/lib/scoped-storage';
import { OrcaBootLoader } from '@/components/OrcaBootLoader';


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
  const sessionRef = useRef<Session | null>(null);

  const commitSession = useCallback((next: Session | null) => {
    const prev = sessionRef.current;
    const prevUid = prev?.user?.id ?? null;
    const nextUid = next?.user?.id ?? null;
    if (prevUid === nextUid) {
      // Same user (or both signed-out) — keep the existing session reference
      // so background token refreshes don't trigger re-renders downstream.
      // Still ensure scoped-storage uid + loading flag are correct.
      sessionRef.current = prev ?? next;
      setScopedUid(prevUid);
      setLoading(false);
      return;
    }
    sessionRef.current = next;
    setSession(next);
    setScopedUid(nextUid);
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      commitSession(s);
    });

    supabase.auth.getSession().then(({ data }) => {
      commitSession(data.session);
    });
    return () => sub.subscription.unsubscribe();
  }, [commitSession]);

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

const SignOutOverlay = () => <OrcaBootLoader label="Signing out" />;



export const useAuth = () => useContext(AuthContext);
