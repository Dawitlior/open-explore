import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Camera, Loader2 } from 'lucide-react';

interface Props {
  T: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  size?: number;
  isRTL?: boolean;
}

/**
 * Click-to-upload avatar. Stores under `avatars/<uid>/avatar.<ext>` and writes the
 * resulting public URL into `profiles.avatar_url`. Falls back to the email initial.
 */
export const AvatarUploader = ({ T, size = 72, isRTL }: Props) => {
  const { user } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (!cancelled) setUrl(data?.avatar_url ?? null); });
    return () => { cancelled = true; };
  }, [user?.id]);

  const onFile = async (file: File) => {
    if (!user?.id) return;
    setErr(null);
    if (!file.type.startsWith('image/')) { setErr(isRTL ? 'קובץ לא תקין' : 'Invalid file'); return; }
    if (file.size > 3 * 1024 * 1024) { setErr(isRTL ? 'מקסימום 3MB' : 'Max 3MB'); return; }
    setBusy(true);
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      const finalUrl = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: dbErr } = await supabase.from('profiles').update({ avatar_url: finalUrl }).eq('id', user.id);
      if (dbErr) throw dbErr;
      setUrl(finalUrl);
      window.dispatchEvent(new CustomEvent('orca:avatar-changed', { detail: { url: finalUrl } }));
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      setErr(e?.message || (isRTL ? 'שגיאת העלאה' : 'Upload failed'));
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
      {err && <span style={{ fontSize: 11, color: T.accent.orange }}>{err}</span>}
    </div>
  );
};

export default AvatarUploader;
