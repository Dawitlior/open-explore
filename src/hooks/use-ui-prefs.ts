import { useState, useEffect, useCallback } from 'react';
import { getSetting, setSetting } from '@/lib/storage';
import type { OperatingMode } from '@/hooks/use-settings';

export interface UIPrefs {
  hiddenOperatingModes: OperatingMode[]; // modes removed from the navbar mode-switcher
  hideDepthSwitch: boolean;              // hide Standard/Alpha switch
  hideHeaderBadges: boolean;             // hide mode badges in main header
  hideQuickActions: boolean;             // hide ⌘K Quick Actions button
  hideAddTradeButton: boolean;           // hide the prominent + Add Trade button in header
  hideHeaderDate: boolean;               // hide date in header
  hideDiscord: boolean;                  // hide discord link in sidebar
  hideAbout: boolean;                    // hide "About System" link
  hideInstallPrompt: boolean;            // hide PWA install prompt in sidebar
  compactSidebarIcons: boolean;          // smaller icons in sidebar
  reduceMotion: boolean;                 // disable hover/transition animations
  denseTables: boolean;                  // tighter row padding
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
};

const KEY = 'uiPrefs';

export function useUIPrefs() {
  const [prefs, setPrefsState] = useState<UIPrefs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSetting<Partial<UIPrefs>>(KEY).then(p => {
      if (p && typeof p === 'object') setPrefsState({ ...DEFAULTS, ...p });
      setLoaded(true);
    });
  }, []);

  // Apply reduce-motion as a body data-attribute so CSS can react.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.dataset.reduceMotion = prefs.reduceMotion ? '1' : '0';
    document.body.dataset.denseTables = prefs.denseTables ? '1' : '0';
  }, [prefs.reduceMotion, prefs.denseTables]);

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
