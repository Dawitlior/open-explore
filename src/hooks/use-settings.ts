import { useState, useEffect, useCallback, useRef } from 'react';
import { getSetting, setSetting } from '@/lib/storage';
import { applyThemeToDOM } from '@/lib/trading-theme';
import { writeCachedLang } from '@/hooks/use-lang';
import { scopedStorage } from '@/lib/scoped-storage';

function writeThemeCaches(t: string) {
  try { window.localStorage.setItem('orca:theme-cache', t); } catch { /* noop */ }
  try { scopedStorage.setSync('theme-cache', t); } catch { /* noop */ }
}

export type ThemeId = 'midnight' | 'blue' | 'platinum' | 'graphite';
const VALID_THEMES: ThemeId[] = ['midnight', 'blue', 'platinum', 'graphite'];
// Legacy theme migration: indigo/hightech → blue, precision/institutional → blue
const migrateTheme = (v: unknown): ThemeId => {
  if (v === 'indigo' || v === 'hightech' || v === 'institutional') return 'blue';
  if (v === 'precision') return 'graphite';
  return (typeof v === 'string' && (VALID_THEMES as string[]).includes(v)) ? (v as ThemeId) : 'graphite';
};


export type SystemMode = 'standard' | 'alpha';
export type OperatingMode = 'live' | 'review' | 'research' | 'beginner';
export type Lang = 'he' | 'en';
const AUTH_LANG_OVERRIDE_KEY = 'orca:auth-lang-override';

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
  const readAuthLangOverride = useCallback((): Lang | null => {
    if (typeof window === 'undefined') return null;
    try {
      const v = window.localStorage.getItem(AUTH_LANG_OVERRIDE_KEY);
      return v === 'he' || v === 'en' ? v : null;
    } catch { return null; }
  }, []);

  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') return 'graphite';
    try {
      const v = window.localStorage.getItem('orca:theme-cache');
      return migrateTheme(v);
    } catch { return 'graphite'; }
  });

  const [systemMode, setSystemModeState] = useState<SystemMode>('standard');
  const [operatingMode, setOperatingModeState] = useState<OperatingMode>('beginner');
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'he';
    try { const v = window.localStorage.getItem('orca:lang-cache'); return v === 'en' ? 'en' : 'he'; } catch { return 'he'; }
  });
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
      const migrated: ThemeId = migrateTheme(t);

      setThemeState(migrated);
      try { window.localStorage.setItem('orca:theme-cache', migrated); } catch { /* noop */ }
      if (m) setSystemModeState(m);
      if (o) setOperatingModeState(o);
      const authLangOverride = readAuthLangOverride();
      const resolvedLang = authLangOverride || l;
      if (resolvedLang) {
        setLangState(resolvedLang);
        writeCachedLang(resolvedLang);
        if (authLangOverride && authLangOverride !== l) void setSetting('lang', authLangOverride);
        if (authLangOverride && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('orca:lang-changed', { detail: { lang: authLangOverride } }));
      }
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
    try { window.localStorage.setItem('orca:theme-cache', t); } catch { /* noop */ }
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
    try { window.localStorage.setItem(AUTH_LANG_OVERRIDE_KEY, l); } catch { /* noop */ }
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
