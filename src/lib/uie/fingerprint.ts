/**
 * Fingerprint store — remembers the user's mapping overrides per broker+headers shape.
 * On the next import of a file with the same shape, the engine re-runs with the
 * stored overrides automatically and the Preflight modal opens with those choices
 * already applied (and marked as "remembered").
 */

const KEY = 'orca:uie:fingerprints';

export interface FingerprintEntry {
  overrides: Record<number, string | null>;
  savedAt: number;
  fileName?: string;
  brokerId?: string;
  headersHash?: string;
}

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

export function computeFingerprint(headers: string[], brokerId?: string): string {
  const norm = headers.map((h) => (h || '').trim().toLowerCase()).join('|');
  return `${brokerId || 'any'}::n${headers.length}::${hash(norm)}`;
}

function readAll(): Record<string, FingerprintEntry> {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeAll(m: Record<string, FingerprintEntry>) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* quota or disabled — silently no-op */
  }
}

export function loadFingerprint(fp: string): FingerprintEntry | null {
  return readAll()[fp] || null;
}
export function saveFingerprint(fp: string, entry: FingerprintEntry): void {
  const all = readAll();
  all[fp] = entry;
  writeAll(all);
}
export function clearFingerprint(fp: string): void {
  const all = readAll();
  delete all[fp];
  writeAll(all);
}
export function listFingerprints(): Array<{ fp: string; entry: FingerprintEntry }> {
  const all = readAll();
  return Object.keys(all).map((fp) => ({ fp, entry: all[fp] }));
}
