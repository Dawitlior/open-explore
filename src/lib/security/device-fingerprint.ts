// Stable per-browser device identifier used by the session registry.
// Random (not a tracking fingerprint) and stored locally, so clearing site data
// simply registers the browser as a new device — which is the honest behaviour.

const KEY = 'orca-device-id';

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(KEY);
    if (existing && /^[A-Za-z0-9_-]{8,64}$/.test(existing)) return existing;
    const next = randomId();
    localStorage.setItem(KEY, next);
    return next;
  } catch {
    return randomId();
  }
}

/** Human label for the current browser, used for the "this device" row. */
export function describeThisDevice(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) && !/Chromium/.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux' : '';
  return os ? `${browser} · ${os}` : browser;
}
