import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '@/lib/storage';
import type { OperatingMode } from '@/hooks/use-settings';
import { applyDerivedPalette, clearCustomAccent } from '@/lib/trading-theme';

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
  defaultRiskPercent: 1,
  defaultRMultiple: 2,
};

const KEY = 'uiPrefs';
export const THEME_LOCK_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

declare global {
  interface Window {
    __orcaPrefs?: { soundsEnabled: boolean; soundVolume: number };
  }
}

export function useUIPrefs() {
  const [prefs, setPrefsState] = useState<UIPrefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetting<Partial<UIPrefs>>(KEY).then(p => {
      if (p && typeof p === 'object') setPrefsState({ ...DEFAULTS, ...p });
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

    if (prefs.customAccentEnabled && prefs.customAccent) {
      applyDerivedPalette(prefs.customAccent);
    } else {
      clearCustomAccent();
    }
  }, [prefs.reduceMotion, prefs.denseTables, prefs.density, prefs.fontScale, prefs.soundsEnabled, prefs.soundVolume, prefs.customAccentEnabled, prefs.customAccent]);

  const setPrefs = useCallback((patch: Partial<UIPrefs>) => {
    setPrefsState(prev => {
      const next = { ...prev, ...patch };
      setSetting(KEY, next);
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
      setSetting(KEY, next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setPrefsState(DEFAULTS);
    setSetting(KEY, DEFAULTS);
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
      setSetting(KEY, next);
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
      setSetting(KEY, next);
      return next;
    });
  }, []);

  const themeLockMsRemaining = Math.max(0, prefs.customAccentLockedUntil - Date.now());
  const themeLocked = themeLockMsRemaining > 0;

  return {
    prefs, setPrefs, toggleHiddenMode, reset, loaded,
    commitCustomAccent, removeCustomAccent,
    themeLocked, themeLockMsRemaining,
  };
}
