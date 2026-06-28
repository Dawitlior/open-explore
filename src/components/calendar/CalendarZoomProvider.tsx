/**
 * CalendarZoomProvider
 * Manages zoom level (day | week | month | year), focused date,
 * URL search-param sync, and gesture handlers.
 * Isolated from weekly-review — zero imports from weekly-review.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

export type ZoomLevel = 'month' | 'year';
const ZOOM_ORDER: ZoomLevel[] = ['month', 'year'];

interface CalendarZoomContextValue {
  zoomLevel: ZoomLevel;
  focusedDate: Date;
  setZoomLevel: (level: ZoomLevel) => void;
  setFocusedDate: (date: Date) => void;
  /** Zoom in one step, optionally centering on a specific date */
  zoomIn: (date?: Date) => void;
  /** Zoom out one step */
  zoomOut: () => void;
}

const CalendarZoomContext = createContext<CalendarZoomContextValue | null>(null);

function parseUrlParams(): { level: ZoomLevel; date: Date } {
  try {
    const sp = new URLSearchParams(window.location.search);
    const rawZoom = sp.get('zoom') as ZoomLevel | null;
    const level: ZoomLevel = rawZoom && ZOOM_ORDER.includes(rawZoom) ? rawZoom : 'month';
    const rawDate = sp.get('date');
    const parsed = rawDate ? new Date(rawDate) : new Date();
    const date = isNaN(parsed.getTime()) ? new Date() : parsed;
    return { level, date };
  } catch {
    return { level: 'month', date: new Date() };
  }
}

function updateUrlParams(level: ZoomLevel, date: Date) {
  try {
    const sp = new URLSearchParams(window.location.search);
    sp.set('zoom', level);
    sp.set('date', date.toISOString().slice(0, 10));
    const newUrl = `${window.location.pathname}?${sp.toString()}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  } catch {
    // non-fatal — SSR or sandboxed env
  }
}

interface Props {
  children: React.ReactNode;
  /** Override initial zoom level (e.g. "month" as default for the calendar hub) */
  defaultZoom?: ZoomLevel;
}

export function CalendarZoomProvider({ children, defaultZoom = 'month' }: Props) {
  const init = parseUrlParams();
  // If URL had no zoom param, use the defaultZoom prop
  const initialLevel: ZoomLevel = new URLSearchParams(window.location.search).has('zoom')
    ? init.level
    : defaultZoom;

  const [zoomLevel, setZoomLevelState] = useState<ZoomLevel>(initialLevel);
  const [focusedDate, setFocusedDateState] = useState<Date>(init.date);

  const setZoomLevel = useCallback((level: ZoomLevel) => {
    setZoomLevelState(level);
    setFocusedDateState(prev => {
      updateUrlParams(level, prev);
      return prev;
    });
  }, []);

  const setFocusedDate = useCallback((date: Date) => {
    setFocusedDateState(date);
    setZoomLevelState(prev => {
      updateUrlParams(prev, date);
      return prev;
    });
  }, []);

  const zoomIn = useCallback((date?: Date) => {
    setZoomLevelState(prev => {
      const idx = ZOOM_ORDER.indexOf(prev);
      const next: ZoomLevel = idx > 0 ? ZOOM_ORDER[idx - 1] : prev;
      if (date) setFocusedDateState(date);
      updateUrlParams(next, date ?? focusedDate);
      return next;
    });
  }, [focusedDate]);

  const zoomOut = useCallback(() => {
    setZoomLevelState(prev => {
      const idx = ZOOM_ORDER.indexOf(prev);
      const next: ZoomLevel = idx < ZOOM_ORDER.length - 1 ? ZOOM_ORDER[idx + 1] : prev;
      updateUrlParams(next, focusedDate);
      return next;
    });
  }, [focusedDate]);

  // Keyboard: Cmd/Ctrl + Plus/Minus, Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && (e.key === '+' || e.key === '=')) { e.preventDefault(); zoomIn(); }
      if (mod && e.key === '-') { e.preventDefault(); zoomOut(); }
      if (e.key === 'Escape') zoomOut();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomIn, zoomOut]);

  const value: CalendarZoomContextValue = {
    zoomLevel, focusedDate, setZoomLevel, setFocusedDate, zoomIn, zoomOut,
  };

  return (
    <CalendarZoomContext.Provider value={value}>
      {children}
    </CalendarZoomContext.Provider>
  );
}

export function useCalendarZoom(): CalendarZoomContextValue {
  const ctx = useContext(CalendarZoomContext);
  if (!ctx) throw new Error('useCalendarZoom must be used inside CalendarZoomProvider');
  return ctx;
}

/**
 * useCalendarGestures — attach to a container ref.
 * Handles Ctrl/Cmd+wheel (desktop) and pinch (mobile).
 */
export function useCalendarGestures(containerRef: React.RefObject<HTMLElement>) {
  const { zoomIn, zoomOut } = useCalendarZoom();

  // desktop: ctrl/cmd + wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      if (e.deltaY > 0) zoomOut();
      else zoomIn();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [containerRef, zoomIn, zoomOut]);

  // mobile: pinch
  const touchRef = useRef<{ dist: number } | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const dist = (t: TouchList) => {
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      return Math.hypot(dx, dy);
    };
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) touchRef.current = { dist: dist(e.touches) };
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !touchRef.current) return;
      const d = dist(e.touches);
      const delta = d - touchRef.current.dist;
      if (Math.abs(delta) > 40) {
        if (delta < 0) zoomOut(); else zoomIn();
        touchRef.current = null;
      }
    };
    const onEnd = () => { touchRef.current = null; };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, [containerRef, zoomIn, zoomOut]);
}
