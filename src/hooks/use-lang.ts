import { useEffect, useState } from 'react';
import { getSetting } from '@/lib/storage';

export type Lang = 'he' | 'en';

/**
 * Lightweight global language hook so components that aren't already wired
 * to `useSettings` (lazy-loaded pages, iframe shells, etc.) can read the
 * current language without prop drilling.
 *
 * Reactively updates on `orca:lang-changed` (dispatched by useSettings.setLang).
 */
// Synchronous cache so language is correct on first paint of any
// lazy-loaded page. Without this, EN users briefly see HE before the
// async cloud setting resolves.
const LANG_CACHE_KEY = 'orca:lang-cache';
function readCachedLang(): Lang {
  if (typeof window === 'undefined') return 'he';
  try {
    const v = window.localStorage.getItem(LANG_CACHE_KEY);
    return v === 'en' ? 'en' : 'he';
  } catch { return 'he'; }
}
export function writeCachedLang(v: Lang) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(LANG_CACHE_KEY, v); } catch { /* noop */ }
}

function applyHtmlDir(lang: Lang) {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  html.setAttribute('lang', lang);
  html.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');
}

// Apply on initial module load so portals (toasts, sheets) inherit RTL immediately.
if (typeof document !== 'undefined') applyHtmlDir(readCachedLang());

export function useLang() {
  const [lang, setLang] = useState<Lang>(() => readCachedLang());

  useEffect(() => {
    applyHtmlDir(lang);
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    getSetting<Lang>('lang').then(v => {
      if (!cancelled && (v === 'he' || v === 'en')) { setLang(v); writeCachedLang(v); applyHtmlDir(v); }
    });
    const onChange = (e: Event) => {
      const next = (e as CustomEvent).detail?.lang as Lang | undefined;
      if (next === 'he' || next === 'en') { setLang(next); applyHtmlDir(next); }
    };
    window.addEventListener('orca:lang-changed', onChange);
    return () => { cancelled = true; window.removeEventListener('orca:lang-changed', onChange); };
  }, []);

  const isRTL = lang === 'he';
  const t = (he: string, en: string) => (isRTL ? he : en);
  return { lang, isRTL, t };
}
