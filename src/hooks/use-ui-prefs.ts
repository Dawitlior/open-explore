import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '@/lib/storage';
import { scopedStorage } from '@/lib/scoped-storage';
import type { OperatingMode } from '@/hooks/use-settings';
import { applyDerivedPalette, clearCustomAccent, applyCustomTheme, clearCustomTheme, CUSTOM_THEME_DEFAULT, type CustomTheme } from '@/lib/trading-theme';

function writePrefsCaches(json: string) {
  try { window.localStorage.setItem('orca:ui-prefs-cache', json); } catch { /* noop */ }
  try { scopedStorage.setSync('ui-prefs-cache', json); } catch { /* noop */ }
}

export type DensityLevel = 'compact' | 'comfortable' | 'spacious';

export interface UIPrefs {
  hiddenOperatingModes: OperatingMode[];
  hideDepthSwitch: boolean;
  hideHeaderBadges: boolean;
  hideQuickActions: boolean;
  hideAddTradeButton: boolean;
  hideHeaderDate: boolean;
  hideDiscord: boolean;
  hideAbout: boolean;
  hideInstallPrompt: boolean;
  compactSidebarIcons: boolean;
  reduceMotion: boolean;
  denseTables: boolean;

  density: DensityLevel;
  fontScale: number;
  soundsEnabled: boolean;
  soundVolume: number;

  // Custom theme — derived full palette
  customAccentEnabled: boolean;
  customAccent: string;            // committed hex (drives DOM)
  customAccentLockedUntil: number; // ms timestamp

  // Advanced Theme Studio — multi-axis customTheme
  customThemeEnabled: boolean;
  customTheme: CustomTheme;

  defaultRiskPercent: number;
  defaultRMultiple: number;
}

const DEFAULTS: UIPrefs = {
  hiddenOperatingModes: [],
  hideDepthSwitch: false,
  hideHeaderBadges: false,
  hideQuickActions: false,
  hideAddTradeButton: false,
  hideHeaderDate: false,
  hideDiscord: false,
  hideAbout: false,
  hideInstallPrompt: false,
  compactSidebarIcons: false,
  reduceMotion: false,
  denseTables: false,
  density: 'comfortable',
  fontScale: 1,
  soundsEnabled: true,
  soundVolume: 0.7,
  customAccentEnabled: false,
  customAccent: '#00f2ff',
  customAccentLockedUntil: 0,
  customThemeEnabled: false,
  customTheme: CUSTOM_THEME_DEFAULT,
  defaultRiskPercent: 1,
  defaultRMultiple: 2,
};

const KEY = 'uiPrefs';
const CACHE_KEY = 'orca:ui-prefs-cache';
export const THEME_LOCK_MS = 24 * 60 * 60 * 1000; // 1 day

function normalizePrefs(p?: Partial<UIPrefs> | null): UIPrefs {
  return {
    ...DEFAULTS,
    ...(p || {}),
    customTheme: { ...CUSTOM_THEME_DEFAULT, ...(p?.customTheme || {}) },
  };
}

function readCachedPrefs(): UIPrefs {
  if (typeof window === 'undefined') return DEFAULTS;
  try {
    const raw = readCachedPrefsRaw();
    return raw ? normalizePrefs(JSON.parse(raw) as Partial<UIPrefs>) : DEFAULTS;
  } catch { return DEFAULTS; }
}

function readCachedPrefsRaw(): string | null {
  if (typeof window === 'undefined') return null;
  try { return scopedStorage.getSync('ui-prefs-cache') || window.localStorage.getItem(CACHE_KEY); }
  catch { return null; }
}

function persistPrefs(next: UIPrefs) {
  try { writePrefsCaches(JSON.stringify(next)); } catch { /* noop */ }
  setSetting(KEY, next);
}

declare global {
  interface Window {
    __orcaPrefs?: { soundsEnabled: boolean; soundVolume: number };
  }
}

export function useUIPrefs() {
  const [prefs, setPrefsState] = useState<UIPrefs>(() => readCachedPrefs());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetting<Partial<UIPrefs>>(KEY).then(p => {
      const cachedRaw = readCachedPrefsRaw();
      if (cachedRaw) {
        try {
          const next = normalizePrefs(JSON.parse(cachedRaw) as Partial<UIPrefs>);
          setPrefsState(next);
          writePrefsCaches(JSON.stringify(next));
          setSetting(KEY, next);
        } catch { /* ignore malformed cache */ }
      } else if (p && typeof p === 'object') {
        const next = normalizePrefs(p);
        setPrefsState(next);
        writePrefsCaches(JSON.stringify(next));
      }
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    body.dataset.reduceMotion = prefs.reduceMotion ? '1' : '0';
    body.dataset.denseTables = prefs.denseTables ? '1' : '0';
    body.dataset.density = prefs.density;
    document.documentElement.style.setProperty('--orca-font-scale', String(prefs.fontScale));
    document.documentElement.style.fontSize = `${16 * prefs.fontScale}px`;

    if (typeof window !== 'undefined') {
      window.__orcaPrefs = { soundsEnabled: prefs.soundsEnabled, soundVolume: prefs.soundVolume };
    }

    if (prefs.customThemeEnabled && prefs.customTheme) {
      applyCustomTheme(prefs.customTheme);
    } else if (prefs.customAccentEnabled && prefs.customAccent) {
      applyDerivedPalette(prefs.customAccent);
    } else {
      clearCustomTheme();
      clearCustomAccent();
    }
  }, [prefs.reduceMotion, prefs.denseTables, prefs.density, prefs.fontScale, prefs.soundsEnabled, prefs.soundVolume, prefs.customAccentEnabled, prefs.customAccent, prefs.customThemeEnabled, prefs.customTheme]);

  const setPrefs = useCallback((patch: Partial<UIPrefs>) => {
    setPrefsState(prev => {
      const next = { ...prev, ...patch };
      persistPrefs(next);
      return next;
    });
  }, []);

  const toggleHiddenMode = useCallback((m: OperatingMode) => {
    setPrefsState(prev => {
      const has = prev.hiddenOperatingModes.includes(m);
      const next = {
        ...prev,
        hiddenOperatingModes: has
          ? prev.hiddenOperatingModes.filter(x => x !== m)
          : [...prev.hiddenOperatingModes, m],
      };
      persistPrefs(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPrefsState(DEFAULTS);
    persistPrefs(DEFAULTS);
  }, []);

  /** Commit a new custom accent and lock it for 7 days. */
  const commitCustomAccent = useCallback((hex: string) => {
    const now = Date.now();
    setPrefsState(prev => {
      if (prev.customAccentLockedUntil > now) return prev; // still locked
      const next: UIPrefs = {
        ...prev,
        customAccent: hex,
        customAccentEnabled: true,
        customAccentLockedUntil: now + THEME_LOCK_MS,
      };
      persistPrefs(next);
      return next;
    });
  }, []);

  /** Force-clear custom accent (also resets lock). */
  const removeCustomAccent = useCallback(() => {
    setPrefsState(prev => {
      const next: UIPrefs = {
        ...prev,
        customAccentEnabled: false,
        customAccentLockedUntil: 0,
      };
      persistPrefs(next);
      return next;
    });
  }, []);

  /** Commit a multi-axis CustomTheme and lock for 24h. */
  const commitCustomTheme = useCallback((theme: CustomTheme) => {
    const now = Date.now();
    setPrefsState(prev => {
      if (prev.customAccentLockedUntil > now) return prev;
      const next: UIPrefs = {
        ...prev,
        customTheme: theme,
        customThemeEnabled: true,
        customAccentEnabled: false, // theme studio supersedes single-accent mode
        customAccentLockedUntil: now + THEME_LOCK_MS,
      };
      persistPrefs(next);
      return next;
    });
  }, []);

  /** Force-clear custom theme (keeps base theme intact). */
  const removeCustomTheme = useCallback(() => {
    setPrefsState(prev => {
      const next: UIPrefs = {
        ...prev,
        customThemeEnabled: false,
        customAccentLockedUntil: 0,
      };
      persistPrefs(next);
      return next;
    });
  }, []);

  /** Bypass the 24h lock — caller is responsible for double-confirmation UI. */
  const unlockTheme = useCallback(() => {
    setPrefsState(prev => {
      const next: UIPrefs = { ...prev, customAccentLockedUntil: 0 };
      persistPrefs(next);
      return next;
    });
  }, []);

  const themeLockMsRemaining = Math.max(0, prefs.customAccentLockedUntil - Date.now());
  const themeLocked = themeLockMsRemaining > 0;

  return {
    prefs, setPrefs, toggleHiddenMode, reset, loaded,
    commitCustomAccent, removeCustomAccent,
    commitCustomTheme, removeCustomTheme, unlockTheme,
    themeLocked, themeLockMsRemaining,
  };
}
