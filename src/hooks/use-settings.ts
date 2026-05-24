import { useState, useEffect, useCallback, useRef } from 'react';
import { getSetting, setSetting } from '@/lib/storage';
import { applyThemeToDOM } from '@/lib/trading-theme';
import { writeCachedLang } from '@/hooks/use-lang';

export type ThemeId = 'midnight' | 'indigo' | 'platinum';
export type SystemMode = 'standard' | 'alpha';
export type OperatingMode = 'live' | 'review' | 'research' | 'beginner';
export type Lang = 'he' | 'en';

/**
 * Tier — the new single-axis monetization model.
 *  starter — free / basic journal (calendar + journal + risk meter)
 *  pro     — paid (radar full + AI insights + weekly review + advanced analytics)
 *  alpha   — ultimate (everything: oracle, quantlab, alpha widgets)
 *
 * `operatingMode` and `systemMode` are now *derived* legacy mirrors kept
 * for back-compat with the existing dashboard-matrix and consumer sites.
 */
export type Tier = 'starter' | 'pro' | 'alpha';

export interface ModeCombo {
  operating: OperatingMode;
  depth: SystemMode;
}

export const ModeSwitchEvents = {
  emit(detail: { kind: 'theme' | 'operating' | 'depth' | 'tier'; from: string; to: string }) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('orca:mode-switch', { detail }));
  },
};

/** Derive legacy (operatingMode, isAlpha) from a tier. */
export function tierToLegacy(tier: Tier): { operating: OperatingMode; system: SystemMode } {
  if (tier === 'starter') return { operating: 'beginner', system: 'standard' };
  if (tier === 'alpha')   return { operating: 'live',     system: 'alpha'    };
  return { operating: 'live', system: 'standard' };
}

/** Reverse-map legacy storage to a tier (one-shot migration). */
function legacyToTier(opMode: OperatingMode | null, sysMode: SystemMode | null): Tier {
  if (sysMode === 'alpha') return 'alpha';
  if (opMode === 'beginner') return 'starter';
  return 'pro';
}

export function useSettings() {
  const [theme, setThemeState] = useState<ThemeId>('midnight');
  const [tier, setTierState] = useState<Tier>('pro');
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'he';
    try { const v = window.localStorage.getItem('orca:lang-cache'); return v === 'en' ? 'en' : 'he'; } catch { return 'he'; }
  });
  const [privacyMode, setPrivacyModeState] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const prev = useRef<{ theme: ThemeId; tier: Tier }>({ theme, tier });

  useEffect(() => {
    Promise.all([
      getSetting<ThemeId>('theme'),
      getSetting<Tier>('tier'),
      getSetting<SystemMode>('systemMode'),
      getSetting<OperatingMode>('operatingMode'),
      getSetting<Lang>('lang'),
      getSetting<boolean>('privacyMode'),
    ]).then(([t, storedTier, m, o, l, p]) => {
      const migrated: ThemeId = (t === 'midnight' || t === 'indigo' || t === 'platinum') ? t : 'midnight';
      setThemeState(migrated);
      const resolvedTier: Tier =
        storedTier === 'starter' || storedTier === 'pro' || storedTier === 'alpha'
          ? storedTier
          : legacyToTier(o ?? null, m ?? null);
      setTierState(resolvedTier);
      if (!storedTier) setSetting('tier', resolvedTier); // backfill once
      if (l) { setLangState(l); writeCachedLang(l); }
      if (p !== undefined) setPrivacyModeState(p);
      applyThemeToDOM(migrated);
      prev.current = { theme: migrated, tier: resolvedTier };
      setLoaded(true);
    });
  }, []);

  useEffect(() => { if (loaded) applyThemeToDOM(theme); }, [theme, loaded]);

  const setTheme = useCallback((t: ThemeId) => {
    const from = prev.current.theme;
    setThemeState(t);
    setSetting('theme', t);
    if (from !== t) ModeSwitchEvents.emit({ kind: 'theme', from, to: t });
    prev.current.theme = t;
  }, []);

  const setTier = useCallback((next: Tier) => {
    const from = prev.current.tier;
    setTierState(next);
    setSetting('tier', next);
    // Mirror to legacy keys so any unmigrated consumer keeps working.
    const legacy = tierToLegacy(next);
    setSetting('operatingMode', legacy.operating);
    setSetting('systemMode', legacy.system);
    if (from !== next) ModeSwitchEvents.emit({ kind: 'tier', from, to: next });
    prev.current.tier = next;
  }, []);

  // Legacy setters — keep working, but route through tier transitions.
  const setSystemMode = useCallback((m: SystemMode) => {
    setTier(m === 'alpha' ? 'alpha' : 'pro');
  }, [setTier]);
  const setOperatingMode = useCallback((o: OperatingMode) => {
    if (o === 'beginner') setTier('starter');
    else setTier(prev.current.tier === 'alpha' ? 'alpha' : 'pro');
  }, [setTier]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l); setSetting('lang', l); writeCachedLang(l);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('orca:lang-changed', { detail: { lang: l } }));
  }, []);
  const setPrivacyMode = useCallback((p: boolean) => { setPrivacyModeState(p); setSetting('privacyMode', p); }, []);

  const legacy = tierToLegacy(tier);
  const operatingMode = legacy.operating;
  const systemMode = legacy.system;
  const isAlpha = systemMode === 'alpha';
  const modeCombo: ModeCombo = { operating: operatingMode, depth: systemMode };

  return {
    theme, setTheme,
    tier, setTier,
    systemMode, setSystemMode,
    operatingMode, setOperatingMode,
    isAlpha,
    lang, setLang,
    isRTL: lang === 'he',
    privacyMode, setPrivacyMode,
    modeCombo,
    loaded
  };
}
