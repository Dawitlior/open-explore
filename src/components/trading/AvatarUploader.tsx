import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { resolveAvatarUrl } from '@/lib/avatar';

interface Props {
  T: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  size?: number;
  isRTL?: boolean;
}

/**
 * Click-to-upload avatar. Stores under `avatars/<uid>/avatar.<ext>` (private bucket)
 * and writes the storage **path** into `profiles.avatar_url`. Resolves to a short-lived
 * signed URL for display.
 */
export const AvatarUploader = ({ T, size = 72, isRTL }: Props) => {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(() => {
    try {
      const cachedPath = sessionStorage.getItem('orca:avatar-path');
      if (!cachedPath) return null;
      // Lazy-import to avoid bundle changes — use the sync cache helper directly.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { getCachedAvatarUrl } = require('@/lib/avatar') as typeof import('@/lib/avatar');
      return getCachedAvatarUrl(cachedPath);
    } catch { return null; }
  });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle();
      if (data?.avatar_url) {
        try { sessionStorage.setItem('orca:avatar-path', data.avatar_url); } catch { /* noop */ }
      }
      const signed = await resolveAvatarUrl(data?.avatar_url);
      if (!cancelled) setUrl(signed);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const onFile = async (file: File) => {
    if (!user?.id) return;
    if (!file.type.startsWith('image/')) {
      toast.error(isRTL ? 'קובץ לא תקין — חובה תמונה' : 'Invalid file — image required');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error(isRTL ? 'מקסימום 3MB' : 'Max file size: 3MB');
      return;
    }
    setBusy(true);
    const tId = toast.loading(isRTL ? 'מעלה תמונה...' : 'Uploading image...');
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', user.id);
      if (dbErr) throw dbErr;
      const signed = await resolveAvatarUrl(path);
      const finalUrl = signed ? `${signed}${signed.includes('?') ? '&' : '?'}v=${Date.now()}` : null;
      setUrl(finalUrl);
      window.dispatchEvent(new CustomEvent('orca:avatar-changed', { detail: { url: finalUrl } }));
      toast.success(isRTL ? 'תמונת פרופיל עודכנה' : 'Profile photo updated', { id: tId });
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast.error(e?.message || (isRTL ? 'שגיאה בהעלאת התמונה' : 'Upload failed'), { id: tId });
    } finally {
      setBusy(false);
    }
  };

  const initial = (user?.email || '?').charAt(0).toUpperCase();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title={isRTL ? 'שינוי תמונת פרופיל' : 'Change profile picture'}
        style={{
          position: 'relative', width: size, height: size, borderRadius: '50%',
          background: url ? '#000' : `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.purple})`,
          display: 'grid', placeItems: 'center', overflow: 'hidden',
          border: `2px solid ${T.border.medium}`, cursor: busy ? 'wait' : 'pointer',
          padding: 0, flexShrink: 0,
          boxShadow: T.shadow.glow(T.accent.cyanGlow),
        }}
      >
        {url ? (
          <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: Math.round(size * 0.4), fontWeight: 800, color: T.bg.primary }}>{initial}</span>
        )}
        <span style={{
          position: 'absolute', insetInlineEnd: -2, bottom: -2,
          width: Math.max(20, size * 0.32), height: Math.max(20, size * 0.32), borderRadius: '50%',
          background: T.bg.primary, border: `1px solid ${T.border.medium}`,
          display: 'grid', placeItems: 'center', color: T.accent.cyan,
        }}>
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }}
      />
    </div>
  );
};

export default AvatarUploader;
