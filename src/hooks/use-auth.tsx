import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

  const signOut = async () => {
    setSigningOut(true);
    try {
      await supabase.auth.signOut();
      await new Promise(r => setTimeout(r, 600));
    } finally {
      window.location.href = '/auth';
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, signOut }}>
      {children}
      {signingOut && <SignOutOverlay />}
    </AuthContext.Provider>
  );
};

const SignOutOverlay = () => (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'radial-gradient(circle at 50% 40%, rgba(8,14,26,0.96), rgba(0,0,0,0.99))',
      backdropFilter: 'blur(14px)',
      display: 'grid', placeItems: 'center',
      fontFamily: "'Poppins', system-ui, sans-serif",
      color: '#e8eef9',
      animation: 'orca-signout-fade 0.25s ease forwards',
    }}
  >
    <style>{`
      @keyframes orca-signout-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes orca-signout-spin { to { transform: rotate(360deg); } }
      @keyframes orca-signout-pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
    `}</style>
    <div style={{ display: 'grid', placeItems: 'center', gap: 22 }}>
      <div
        style={{
          width: 56, height: 56, borderRadius: '50%',
          border: '2px solid rgba(56,189,248,0.18)',
          borderTopColor: '#38bdf8',
          animation: 'orca-signout-spin 0.9s linear infinite',
        }}
      />
      <div style={{
        fontSize: 11, letterSpacing: '0.32em', textTransform: 'uppercase',
        color: '#7a8aa3', fontWeight: 700,
        animation: 'orca-signout-pulse 1.4s ease-in-out infinite',
      }}>
        Signing out…
      </div>
    </div>
  </div>
);

export const useAuth = () => useContext(AuthContext);
