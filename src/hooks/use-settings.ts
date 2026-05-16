import { useState, useEffect, useCallback, useRef } from 'react';
import { getSetting, setSetting } from '@/lib/storage';
import { applyThemeToDOM } from '@/lib/trading-theme';
import { writeCachedLang } from '@/hooks/use-lang';

export type ThemeId = 'midnight' | 'indigo' | 'platinum';
export type SystemMode = 'standard' | 'alpha';
export type OperatingMode = 'live' | 'review' | 'research' | 'beginner';
export type Lang = 'he' | 'en';

export interface ModeCombo {
  operating: OperatingMode;
  depth: SystemMode;
}

/**
 * Mode-switch event bus — lets the global Liquid Sweep overlay react
 * without coupling to React state across the tree.
 */
export const ModeSwitchEvents = {
  emit(detail: { kind: 'theme' | 'operating' | 'depth'; from: string; to: string }) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('orca:mode-switch', { detail }));
  },
};

export function useSettings() {
  const [theme, setThemeState] = useState<ThemeId>('midnight');
  const [systemMode, setSystemModeState] = useState<SystemMode>('standard');
  const [operatingMode, setOperatingModeState] = useState<OperatingMode>('beginner');
  const [lang, setLangState] = useState<Lang>('he');
  const [privacyMode, setPrivacyModeState] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const prev = useRef({ theme, systemMode, operatingMode });

  useEffect(() => {
    Promise.all([
      getSetting<ThemeId>('theme'),
      getSetting<SystemMode>('systemMode'),
      getSetting<OperatingMode>('operatingMode'),
      getSetting<Lang>('lang'),
      getSetting<boolean>('privacyMode'),
    ]).then(([t, m, o, l, p]) => {
      // Migrate legacy themes (arctic/ember/crimson) to new ones
      const migrated: ThemeId = (t === 'midnight' || t === 'indigo' || t === 'platinum') ? t : 'midnight';
      setThemeState(migrated);
      if (m) setSystemModeState(m);
      if (o) setOperatingModeState(o);
      if (l) { setLangState(l); writeCachedLang(l); }
      if (p !== undefined) setPrivacyModeState(p);
      applyThemeToDOM(migrated);
      prev.current = { theme: migrated, systemMode: m || 'standard', operatingMode: o || 'beginner' };
      setLoaded(true);
    });
  }, []);

  // Apply theme to DOM whenever it changes
  useEffect(() => {
    if (loaded) applyThemeToDOM(theme);
  }, [theme, loaded]);

  const setTheme = useCallback((t: ThemeId) => {
    const from = prev.current.theme;
    setThemeState(t);
    setSetting('theme', t);
    if (from !== t) ModeSwitchEvents.emit({ kind: 'theme', from, to: t });
    prev.current.theme = t;
  }, []);
  const setSystemMode = useCallback((m: SystemMode) => {
    const from = prev.current.systemMode;
    setSystemModeState(m); setSetting('systemMode', m);
    if (from !== m) ModeSwitchEvents.emit({ kind: 'depth', from, to: m });
    prev.current.systemMode = m;
  }, []);
  const setOperatingMode = useCallback((o: OperatingMode) => {
    const from = prev.current.operatingMode;
    setOperatingModeState(o); setSetting('operatingMode', o);
    if (from !== o) ModeSwitchEvents.emit({ kind: 'operating', from, to: o });
    prev.current.operatingMode = o;
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l); setSetting('lang', l); writeCachedLang(l);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('orca:lang-changed', { detail: { lang: l } }));
  }, []);
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
