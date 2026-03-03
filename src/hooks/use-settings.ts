import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '@/lib/storage';

export type ThemeId = 'midnight' | 'arctic' | 'ember';
export type SystemMode = 'standard' | 'alpha';
export type OperatingMode = 'live' | 'review' | 'research';
export type Lang = 'he' | 'en';

export interface ModeCombo {
  operating: OperatingMode;
  depth: SystemMode;
}

export function useSettings() {
  const [theme, setThemeState] = useState<ThemeId>('midnight');
  const [systemMode, setSystemModeState] = useState<SystemMode>('standard');
  const [operatingMode, setOperatingModeState] = useState<OperatingMode>('review');
  const [lang, setLangState] = useState<Lang>('he');
  const [privacyMode, setPrivacyModeState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      getSetting<ThemeId>('theme'),
      getSetting<SystemMode>('systemMode'),
      getSetting<OperatingMode>('operatingMode'),
      getSetting<Lang>('lang'),
      getSetting<boolean>('privacyMode'),
    ]).then(([t, m, o, l, p]) => {
      if (t) setThemeState(t);
      if (m) setSystemModeState(m);
      if (o) setOperatingModeState(o);
      if (l) setLangState(l);
      if (p !== undefined) setPrivacyModeState(p);
      setLoaded(true);
    });
  }, []);

  const setTheme = useCallback((t: ThemeId) => { setThemeState(t); setSetting('theme', t); }, []);
  const setSystemMode = useCallback((m: SystemMode) => { setSystemModeState(m); setSetting('systemMode', m); }, []);
  const setOperatingMode = useCallback((o: OperatingMode) => { setOperatingModeState(o); setSetting('operatingMode', o); }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); setSetting('lang', l); }, []);
  const setPrivacyMode = useCallback((p: boolean) => { setPrivacyModeState(p); setSetting('privacyMode', p); }, []);

  const modeCombo: ModeCombo = { operating: operatingMode, depth: systemMode };

  return {
    theme, setTheme,
    systemMode, setSystemMode,
    operatingMode, setOperatingMode,
    isAlpha: systemMode === 'alpha',
    lang, setLang,
    isRTL: lang === 'he',
    privacyMode, setPrivacyMode,
    modeCombo,
    loaded
  };
}
