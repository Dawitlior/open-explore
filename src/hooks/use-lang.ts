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
export function useLang() {
  const [lang, setLang] = useState<Lang>('he');

  useEffect(() => {
    let cancelled = false;
    getSetting<Lang>('lang').then(v => { if (!cancelled && (v === 'he' || v === 'en')) setLang(v); });
    const onChange = (e: Event) => {
      const next = (e as CustomEvent).detail?.lang as Lang | undefined;
      if (next === 'he' || next === 'en') setLang(next);
    };
    window.addEventListener('orca:lang-changed', onChange);
    return () => { cancelled = true; window.removeEventListener('orca:lang-changed', onChange); };
  }, []);

  const isRTL = lang === 'he';
  const t = (he: string, en: string) => (isRTL ? he : en);
  return { lang, isRTL, t };
}
