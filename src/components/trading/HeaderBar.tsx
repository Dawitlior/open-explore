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

const HEADER_CSS = `
.ohb-wrap{position:sticky;top:0;z-index:5;padding:10px 24px 6px;background:transparent;pointer-events:none}
.ohb-wrap > *{pointer-events:auto}
.ohb{max-width:1400px;margin:0 auto;display:flex;align-items:center;gap:12px;
  padding:8px 10px;border-radius:14px;
  background:hsl(var(--trading-bg-secondary) / 0.72);
  -webkit-backdrop-filter:blur(14px) saturate(140%);
  backdrop-filter:blur(14px) saturate(140%);
  box-shadow:0 0 0 1px hsl(var(--border)), 0 8px 24px -14px rgb(0 0 0 / 0.7);
  transition:box-shadow .25s ease}
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
.ohb-ghost:focus-visible,.ohb-primary:focus-visible{outline:2px solid hsl(var(--ring));outline-offset:2px}
.ohb-kbd{font-family:'JetBrains Mono',monospace;font-size:10.5px;color:hsl(var(--muted-foreground) / 0.7)}
.ohb-primary{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 15px;
  border:1px solid rgb(255 255 255 / 0.12);border-radius:8px;cursor:pointer;
  background:#f5f6f8;color:#0a0e1a;font-weight:600;font-size:12.5px;white-space:nowrap;
  font-family:'Inter',system-ui,sans-serif;letter-spacing:-0.005em;
  transition:transform .15s, box-shadow .15s}
.ohb-primary:hover{transform:translateY(-1px);box-shadow:0 6px 16px -8px rgb(255 255 255 / 0.35)}
@media (prefers-reduced-motion:reduce){
  .ohb,.ohb-ghost,.ohb-primary{transition:none}
  .ohb-ghost:hover,.ohb-primary:hover{transform:none}
}
`;

export function HeaderBar(props: HeaderBarProps) {
  const { isRTL } = props;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="ohb-wrap">
      <style>{HEADER_CSS}</style>
      <div className="ohb" data-scrolled={scrolled ? 'true' : 'false'}>
        {/* start */}
        <div className="ohb-cluster">
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
