import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

interface Props {
  T: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  size?: number;
  onClick?: () => void;
}

/**
 * Small clickable avatar shown in the global navbar. Listens for
 * `orca:avatar-changed` from AvatarUploader to update without a page reload.
 */
export const NavAvatar = ({ T, size = 30, onClick }: Props) => {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) { setUrl(null); return; }
    supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setUrl(data?.avatar_url ?? null); });
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.url) setUrl(detail.url);
    };
    window.addEventListener('orca:avatar-changed', onChange);
    return () => { cancelled = true; window.removeEventListener('orca:avatar-changed', onChange); };
  }, [user?.id]);

  const initial = (user?.email || '?').charAt(0).toUpperCase();

  return (
    <button
      type="button"
      onClick={onClick}
      title={user?.email || ''}
      aria-label="Open settings"
      style={{
        width: size, height: size, borderRadius: '50%',
        background: url ? '#000' : `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.purple})`,
        border: `1px solid ${T.border.medium}`, padding: 0, overflow: 'hidden',
        cursor: 'pointer', display: 'grid', placeItems: 'center',
        boxShadow: `0 0 8px ${T.accent.cyan}30`, flexShrink: 0,
      }}
    >
      {url ? (
        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontSize: Math.round(size * 0.42), fontWeight: 800, color: T.bg.primary }}>{initial}</span>
      )}
    </button>
  );
};

export default NavAvatar;
