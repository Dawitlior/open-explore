import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '@/lib/storage';

export type ThemeId = 'midnight' | 'arctic' | 'ember';
export type SystemMode = 'standard' | 'alpha';
export type Lang = 'he' | 'en';

export function useSettings() {
  const [theme, setThemeState] = useState<ThemeId>('midnight');
  const [systemMode, setSystemModeState] = useState<SystemMode>('standard');
  const [lang, setLangState] = useState<Lang>('he');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      getSetting<ThemeId>('theme'),
      getSetting<SystemMode>('systemMode'),
      getSetting<Lang>('lang'),
    ]).then(([t, m, l]) => {
      if (t) setThemeState(t);
      if (m) setSystemModeState(m);
      if (l) setLangState(l);
      setLoaded(true);
    });
  }, []);

  const setTheme = useCallback((t: ThemeId) => { setThemeState(t); setSetting('theme', t); }, []);
  const setSystemMode = useCallback((m: SystemMode) => { setSystemModeState(m); setSetting('systemMode', m); }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); setSetting('lang', l); }, []);

  return {
    theme, setTheme,
    systemMode, setSystemMode,
    isAlpha: systemMode === 'alpha',
    lang, setLang,
    isRTL: lang === 'he',
    loaded
  };
}
