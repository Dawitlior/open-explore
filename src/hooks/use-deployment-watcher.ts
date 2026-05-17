import { useEffect, useState, useCallback } from 'react';

/**
 * Polls /index.html every 60s with cache-busting headers and compares the
 * main script tag (e.g. /assets/index-HASH.js) against the one that was live
 * when this tab booted. If they differ, a new deployment is live.
 *
 * Skipped inside Lovable preview iframes / dev hosts to avoid noisy reloads
 * during active development.
 */

const POLL_INTERVAL_MS = 60_000;

function extractMainScript(html: string): string | null {
  // Match the first <script type="module" src="..."> tag — Vite injects exactly one
  // module entry into the built index.html. In dev this points at /src/main.tsx;
  // in production it's the hashed bundle like /assets/index-AbCd1234.js.
  const m =
    html.match(/<script[^>]+type=["']module["'][^>]+src=["']([^"']+)["']/i) ||
    html.match(/<script[^>]+src=["']([^"']+)["'][^>]+type=["']module["']/i);
  return m?.[1] ?? null;
}

function isDevOrPreviewHost(): boolean {
  if (typeof window === 'undefined') return true;
  const h = window.location.hostname;
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h.includes('id-preview--') ||
    h.includes('lovableproject.com') ||
    h.includes('lovable.app') && h.includes('preview')
  );
}

let cachedBootScript: string | null | undefined;
async function readCurrentScript(): Promise<string | null> {
  if (cachedBootScript !== undefined) return cachedBootScript;
  // Snapshot the script tag currently in the live DOM (the one that booted this tab).
  if (typeof document !== 'undefined') {
    const tag = document.querySelector('script[type="module"][src]') as HTMLScriptElement | null;
    cachedBootScript = tag?.getAttribute('src') ?? null;
  } else {
    cachedBootScript = null;
  }
  return cachedBootScript;
}

export function useDeploymentWatcher() {
  const [hasNewDeployment, setHasNewDeployment] = useState(false);

  const reload = useCallback(() => {
    try {
      // Force network revalidation by appending a cache-buster.
      const url = new URL(window.location.href);
      url.searchParams.set('_v', String(Date.now()));
      window.location.replace(url.toString());
    } catch {
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    if (isDevOrPreviewHost()) return;

    let cancelled = false;

    const check = async () => {
      try {
        const boot = await readCurrentScript();
        if (!boot) return;
        const res = await fetch(`/index.html?_v=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
        });
        if (!res.ok) return;
        const html = await res.text();
        const remote = extractMainScript(html);
        if (!remote) return;
        if (!cancelled && remote !== boot) {
          setHasNewDeployment(true);
        }
      } catch {
        // Silent — offline / transient network issues are non-fatal.
      }
    };

    // First check after a short delay so the page settles.
    const initial = setTimeout(check, 8_000);
    const iv = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearInterval(iv);
    };
  }, []);

  return { hasNewDeployment, reload };
}
