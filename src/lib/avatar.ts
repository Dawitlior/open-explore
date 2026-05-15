import { supabase } from '@/integrations/supabase/client';

const SIGNED_TTL = 60 * 60 * 24 * 7; // 7 days

/** Resolve a stored avatar reference (path or URL) to a usable signed URL. */
export async function resolveAvatarUrl(stored: string | null | undefined): Promise<string | null> {
  if (!stored) return null;
  // Legacy public URL — strip down to bucket path so we can sign it.
  const m = stored.match(/\/storage\/v1\/object\/(?:public|sign)\/avatars\/([^?]+)/);
  const path = m ? decodeURIComponent(m[1]) : stored;
  if (/^https?:\/\//i.test(path)) return stored; // unknown external URL — return as-is
  const { data, error } = await supabase.storage.from('avatars').createSignedUrl(path, SIGNED_TTL);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
