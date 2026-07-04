// src/components/trading/HeaderBar.tsx
// Desktop-only floating command bar. The parent MUST render it inside {!isMobile && ...}.

import { useEffect, useState, type ReactNode } from 'react';
import { ImportDock } from './ImportDock';
import { HeaderModeToggle } from './HeaderModeToggle';
import type { TradingTheme } from '@/lib/trading-theme';

interface HeaderBarProps {
  T: TradingTheme;
  isRTL: boolean;
  pageLabel: string;
  startSlot?: ReactNode;
  onImport: () => void;
  showAddTrade: boolean;
  addTradeLabel: string;
  onAddTrade: () => void;
  showQuickActions: boolean;
  onOpenPalette: () => void;
  hiddenChartsCount: number;
  onRestoreCharts: () => void;
}

const COLLAPSE_KEY = 'orca:header:collapsed';

const HEADER_CSS = `
.ohb-wrap{position:sticky;top:0;z-index:5;padding:10px 24px 6px;background:transparent;pointer-events:none}
.ohb-wrap > *{pointer-events:auto}
.ohb{max-width:1400px;margin:0 auto;display:flex;align-items:center;gap:12px;
  padding:8px 10px;border-radius:14px;
  background:hsl(var(--trading-bg-secondary) / 0.72);
  -webkit-backdrop-filter:blur(14px) saturate(140%);
  backdrop-filter:blur(14px) saturate(140%);
  box-shadow:0 0 0 1px hsl(var(--border)), 0 8px 24px -14px rgb(0 0 0 / 0.7);
  transition:box-shadow .25s ease, opacity .25s ease, transform .3s cubic-bezier(.2,.8,.2,1);
  transform-origin:top center;
  animation:ohb-in .32s cubic-bezier(.2,.8,.2,1) both}
@keyframes ohb-in{
  from{opacity:0;transform:translateY(-6px) scale(.985)}
  to{opacity:1;transform:translateY(0) scale(1)}
}
.ohb[data-scrolled="true"]{
  box-shadow:0 0 0 1px hsl(var(--border)), 0 12px 32px -14px rgb(0 0 0 / 0.85),
             0 22px 48px -22px hsl(var(--trading-cyan) / 0.16)}
.ohb-cluster{display:flex;align-items:center;gap:10px;flex:0 1 auto;min-width:0}
.ohb-cluster--end{flex:0 0 auto}
.ohb-title{font-size:14.5px;font-weight:600;margin:0;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;color:hsl(var(--foreground));
  font-family:'Inter',system-ui,sans-serif;letter-spacing:-0.01em}
.ohb-ghost{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 11px;
  border:1px solid hsl(var(--border));border-radius:8px;cursor:pointer;
  background:hsl(var(--trading-bg-surface) / 0.5);color:hsl(var(--muted-foreground));
  font-size:12px;white-space:nowrap;font-family:'Inter',system-ui,sans-serif;
  transition:background .15s, color .15s, transform .15s, border-color .15s}
.ohb-ghost:hover{background:hsl(var(--trading-bg-surface));color:hsl(var(--foreground));
  border-color:hsl(var(--trading-cyan) / 0.35);transform:translateY(-1px)}
.ohb-ghost:focus-visible,.ohb-primary:focus-visible,.ohb-collapse:focus-visible,.ohb-pill:focus-visible{outline:2px solid hsl(var(--ring));outline-offset:2px}
.ohb-kbd{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:hsl(var(--muted-foreground) / 0.7)}
.ohb-primary{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 15px;
  border:1px solid rgb(255 255 255 / 0.12);border-radius:8px;cursor:pointer;
  background:#f5f6f8;color:#0a0e1a;font-weight:600;font-size:12.5px;white-space:nowrap;
  font-family:'Inter',system-ui,sans-serif;letter-spacing:-0.005em;
  transition:transform .15s, box-shadow .15s}
.ohb-primary:hover{transform:translateY(-1px);box-shadow:0 6px 16px -8px rgb(255 255 255 / 0.35)}
.ohb-collapse{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;
  border:1px solid hsl(var(--border));border-radius:8px;cursor:pointer;
  background:hsl(var(--trading-bg-surface) / 0.5);color:hsl(var(--foreground));
  transition:background .15s, color .15s, transform .15s}
.ohb-collapse svg{opacity:.95}
.ohb-collapse:hover{background:hsl(var(--trading-bg-surface));color:hsl(var(--foreground));transform:translateY(-1px)}
.ohb-pill-wrap{position:sticky;top:0;z-index:5;padding:10px 24px 6px;background:transparent;pointer-events:none;
  display:flex;justify-content:center;animation:ohb-in .28s cubic-bezier(.2,.8,.2,1) both}
.ohb-pill-wrap > *{pointer-events:auto}
.ohb-pill{display:inline-flex;align-items:center;gap:10px;height:34px;padding:0 16px;
  border-radius:999px;cursor:pointer;
  background:hsl(var(--trading-bg-secondary) / 0.8);
  -webkit-backdrop-filter:blur(14px) saturate(140%);
  backdrop-filter:blur(14px) saturate(140%);
  border:1px solid hsl(var(--border));
  box-shadow:0 0 0 1px hsl(var(--border) / 0.4), 0 8px 24px -14px rgb(0 0 0 / 0.7);
  color:hsl(var(--foreground));font-family:'Inter',system-ui,sans-serif;
  font-size:12.5px;font-weight:600;letter-spacing:-0.005em;
  transition:transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s ease, background .18s ease}
.ohb-pill:hover{transform:translateY(1px) scale(1.02);
  box-shadow:0 0 0 1px hsl(var(--trading-cyan) / 0.4), 0 12px 28px -14px hsl(var(--trading-cyan) / 0.35)}
.ohb-pill svg{opacity:1;color:hsl(var(--foreground));transition:transform .2s ease}
.ohb-pill:hover svg{transform:translateX(2px);opacity:1}
@media (prefers-reduced-motion:reduce){
  .ohb,.ohb-ghost,.ohb-primary,.ohb-collapse,.ohb-pill,.ohb-pill-wrap,.ohb-pill svg{transition:none;animation:none}
  .ohb-ghost:hover,.ohb-primary:hover,.ohb-collapse:hover,.ohb-pill:hover{transform:none}
}
`;

export function HeaderBar(props: HeaderBarProps) {
  const { isRTL } = props;
  const [scrolled, setScrolled] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSE_KEY) === '1';
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
  }, [collapsed]);

  if (collapsed) {
    return (
      <div className="ohb-pill-wrap">
        <style>{HEADER_CSS}</style>
        <button
          type="button"
          className="ohb-pill"
          onClick={() => setCollapsed(false)}
          aria-label={isRTL ? 'הרחב סרגל ניווט' : 'Expand navbar'}
          title={isRTL ? 'הרחב' : 'Expand'}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 12h16M4 6h16M4 18h16"/>
          </svg>
          <span>{props.pageLabel}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="ohb-wrap">
      <style>{HEADER_CSS}</style>
      <div className="ohb" data-scrolled={scrolled ? 'true' : 'false'}>
        {/* start */}
        <div className="ohb-cluster">
          <button
            type="button"
            className="ohb-collapse"
            onClick={() => setCollapsed(true)}
            aria-label={isRTL ? 'מזער סרגל ניווט' : 'Collapse navbar'}
            title={isRTL ? 'מזער' : 'Collapse'}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 15l7-7 7 7"/>
            </svg>
          </button>
          <h1 className="ohb-title">{props.pageLabel}</h1>
          {props.startSlot}
        </div>

        {/* center: Universal Import showcase */}
        <ImportDock isRTL={isRTL} onImport={props.onImport} />

        {/* end */}
        <div className="ohb-cluster ohb-cluster--end">
          {props.showQuickActions && (
            <button
              type="button"
              className="ohb-ghost"
              onClick={props.onOpenPalette}
              aria-label={isRTL ? 'פעולות מהירות' : 'Quick Actions'}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <span>{isRTL ? 'חיפוש' : 'Search'}</span>
              <span className="ohb-kbd">⌘K</span>
            </button>
          )}

          <HeaderModeToggle isRTL={isRTL} />

          {props.hiddenChartsCount > 0 && (
            <button
              type="button"
              className="ohb-ghost"
              onClick={props.onRestoreCharts}
              style={{ color: 'hsl(var(--trading-orange, 30 90% 60%))' }}
            >
              ↩ {isRTL ? 'שחזר גרפים' : 'Restore Charts'} ({props.hiddenChartsCount})
            </button>
          )}

          {props.showAddTrade && (
            <button
              type="button"
              className="ohb-primary"
              onClick={props.onAddTrade}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              {props.addTradeLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
