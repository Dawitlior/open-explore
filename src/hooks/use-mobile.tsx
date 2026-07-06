import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * Shared-subscriber mobile-viewport hook.
 *
 * Old behaviour: every consumer registered its own `matchMedia` listener,
 * so a page with 20 charts installed 20 identical listeners and re-rendered
 * 20 components on every resize. The new implementation keeps a single
 * module-level listener and fans out to all subscribers with a shared
 * boolean, which the shallow-compare re-render only fires when the value
 * actually flips.
 */

type Listener = (value: boolean) => void;
const listeners = new Set<Listener>();
let cachedValue: boolean | undefined =
  typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : undefined;
let installed = false;

function ensureInstalled() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  const onChange = () => {
    const next = window.innerWidth < MOBILE_BREAKPOINT;
    if (next === cachedValue) return;
    cachedValue = next;
    listeners.forEach(l => l(next));
  };
  mql.addEventListener("change", onChange);
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(cachedValue);

  React.useEffect(() => {
    ensureInstalled();
    const l: Listener = v => setIsMobile(v);
    listeners.add(l);
    // Sync initial in case it changed before mount.
    if (cachedValue !== isMobile) setIsMobile(cachedValue);
    return () => {
      listeners.delete(l);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return !!isMobile;
}
