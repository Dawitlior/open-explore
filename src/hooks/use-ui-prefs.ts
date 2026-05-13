import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '@/lib/storage';
import type { OperatingMode } from '@/hooks/use-settings';
import { applyCustomAccent, clearCustomAccent } from '@/lib/trading-theme';

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

  // ── NEW: functional UX prefs ──────────────────────
  density: DensityLevel;          // global spacing posture
  fontScale: number;              // 0.85 .. 1.15 (1 = default)
  soundsEnabled: boolean;         // master sound switch
  soundVolume: number;            // 0..1
  // Custom accent — a single hex applied on top of the active theme
  customAccentEnabled: boolean;
  customAccent: string;           // "#00f2ff"
  // Trading defaults
  defaultRiskPercent: number;     // 0.25..5
  defaultRMultiple: number;       // 1..5
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
  defaultRiskPercent: 1,
  defaultRMultiple: 2,
};

const KEY = 'uiPrefs';

// Expose a tiny global hook so non-React modules (apex-sounds) can read prefs
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

  // Apply prefs that have global DOM/window side-effects
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    body.dataset.reduceMotion = prefs.reduceMotion ? '1' : '0';
    body.dataset.denseTables = prefs.denseTables ? '1' : '0';
    body.dataset.density = prefs.density;
    document.documentElement.style.setProperty('--orca-font-scale', String(prefs.fontScale));
    document.documentElement.style.fontSize = `${16 * prefs.fontScale}px`;

    // Sound bridge for non-React modules
    if (typeof window !== 'undefined') {
      window.__orcaPrefs = { soundsEnabled: prefs.soundsEnabled, soundVolume: prefs.soundVolume };
    }

    // Custom accent
    if (prefs.customAccentEnabled && prefs.customAccent) {
      applyCustomAccent(prefs.customAccent);
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

  return { prefs, setPrefs, toggleHiddenMode, reset, loaded };
}
