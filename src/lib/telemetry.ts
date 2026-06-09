/**
 * Lightweight client-error telemetry.
 * - Deduplicates by hash(message + stack head + route)
 * - Throttles to one network write per 10s
 * - Silently no-ops when the user is signed out
 */
import { supabase } from '@/integrations/supabase/client';

const seenHashes = new Map<string, number>();
let lastSentAt = 0;

async function hash(input: string): Promise<string> {
  try {
    const buf = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(digest))
      .slice(0, 12)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return String(input.length) + ':' + input.slice(0, 16);
  }
}

export async function reportClientError(error: Error, ctx?: { route?: string }) {
  try {
    const route = ctx?.route ?? (typeof location !== 'undefined' ? location.pathname : '');
    const stackHead = (error.stack || '').split('\n').slice(0, 3).join('\n');
    const h = await hash(`${error.message}|${stackHead}|${route}`);

    const now = Date.now();
    const lastForHash = seenHashes.get(h) ?? 0;
    // Suppress duplicate within 60s window
    if (now - lastForHash < 60_000) return;
    seenHashes.set(h, now);

    // Global throttle: 1 write per 10s across all errors
    if (now - lastSentAt < 10_000) return;
    lastSentAt = now;

    const { data: userData } = await supabase.auth.getUser();
    const user_id = userData?.user?.id;
    if (!user_id) return; // anonymous → skip

    // Upsert-ish: try increment; fall back to insert.
    const { data: existing } = await supabase
      .from('client_errors')
      .select('id, occurrences')
      .eq('user_id', user_id)
      .eq('stack_hash', h)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from('client_errors')
        .update({
          occurrences: (existing.occurrences ?? 1) + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('client_errors').insert({
        user_id,
        route,
        message: error.message.slice(0, 500),
        stack_hash: h,
        user_agent: navigator.userAgent.slice(0, 256),
      });
    }
  } catch {
    /* never let telemetry crash the app */
  }
}

let installed = false;
export function installGlobalErrorTelemetry() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e) => {
    if (e.error instanceof Error) reportClientError(e.error);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const reason = (e as PromiseRejectionEvent).reason;
    if (reason instanceof Error) reportClientError(reason);
    else if (reason) reportClientError(new Error(String(reason)));
  });
}
