/**
 * Marketing-scoped UI context.
 * Owns lang (he/en) and theme (midnight/indigo/platinum) for /welcome only.
 * Does NOT touch the global app theme / language.
 */
import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';

export type MktLang = 'he' | 'en';
export type MktTheme = 'midnight' | 'indigo' | 'platinum';

interface Ctx {
  lang: MktLang;
  theme: MktTheme;
  toggleLang: () => void;
  cycleTheme: () => void;
  setLang: (l: MktLang) => void;
  setTheme: (t: MktTheme) => void;
}

const UIContext = createContext<Ctx | null>(null);

const LS_LANG = 'orca.mkt.lang';
const LS_THEME = 'orca.mkt.theme';

export function MarketingUIProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<MktLang>(() => {
    if (typeof window === 'undefined') return 'he';
    try { return (localStorage.getItem(LS_LANG) as MktLang) || 'he'; } catch { return 'he'; }
  });
  const [theme, setThemeState] = useState<MktTheme>(() => {
    if (typeof window === 'undefined') return 'midnight';
    try { return (localStorage.getItem(LS_THEME) as MktTheme) || 'midnight'; } catch { return 'midnight'; }
  });

  const setLang = useCallback((l: MktLang) => {
    setLangState(l);
    try { localStorage.setItem(LS_LANG, l); } catch {}
  }, []);
  const setTheme = useCallback((t: MktTheme) => {
    setThemeState(t);
    try { localStorage.setItem(LS_THEME, t); } catch {}
  }, []);

  const toggleLang = useCallback(() => setLang(lang === 'he' ? 'en' : 'he'), [lang, setLang]);
  const cycleTheme = useCallback(() => {
    const order: MktTheme[] = ['midnight', 'indigo', 'platinum'];
    setTheme(order[(order.indexOf(theme) + 1) % order.length]);
  }, [theme, setTheme]);

  // Apply lang/dir at the document level while landing is mounted.
  useEffect(() => {
    const prevDir = document.documentElement.dir;
    const prevLang = document.documentElement.lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.dir = prevDir;
      document.documentElement.lang = prevLang;
    };
  }, [lang]);

  return (
    <UIContext.Provider value={{ lang, theme, toggleLang, cycleTheme, setLang, setTheme }}>
      {children}
    </UIContext.Provider>
  );
}

export function useMarketingUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useMarketingUI must be used inside <MarketingUIProvider>');
  return ctx;
}
