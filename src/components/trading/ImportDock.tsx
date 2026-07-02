// src/components/trading/ImportDock.tsx
// Desktop-only Universal Import showcase panel. Delegates the click to the
// existing Universal Import command wired in Index.tsx. Zero new state.

import { useCallback, useState } from 'react';

interface ImportDockProps {
  isRTL: boolean;
  onImport: () => void;
}

const FORMATS = ['CSV', 'XLSX', 'JSON', 'PDF', 'TSV'];

const DOCK_CSS = `
.odk{flex:1 1 auto;min-width:0;max-width:640px;height:44px;padding:0;
  border:0;background:none;cursor:pointer;display:flex;align-items:stretch;
  transition:transform .18s ease}
.odk:hover{transform:translateY(-1px)}
.odk:focus-visible{outline:2px solid hsl(var(--ring));outline-offset:3px;border-radius:12px}
.odk-well{position:relative;flex:1;display:flex;align-items:center;gap:12px;
  padding-inline:12px 8px;border-radius:12px;overflow:hidden;
  background:linear-gradient(180deg, hsl(var(--trading-bg-primary) / 0.55), hsl(var(--trading-bg-secondary) / 0.4));
  border:1px solid hsl(var(--border));
  box-shadow:inset 0 1px 0 hsl(var(--foreground) / 0.03),
             inset 0 -1px 0 rgb(0 0 0 / 0.35)}
.odk:hover .odk-well{border-color:hsl(var(--trading-cyan) / 0.35);
  box-shadow:inset 0 1px 0 hsl(var(--foreground) / 0.04),
             inset 0 -1px 0 rgb(0 0 0 / 0.35),
             0 0 0 1px hsl(var(--trading-cyan) / 0.18)}
.odk-slot{display:grid;place-items:center;width:30px;height:30px;flex:0 0 auto;
  border-radius:8px;color:hsl(var(--trading-cyan));
  background:hsl(var(--trading-cyan) / 0.10);
  border:1px solid hsl(var(--trading-cyan) / 0.25)}
.odk-copy{display:flex;flex-direction:column;line-height:1.15;min-width:0;text-align:start}
.odk-copy b{font-size:12.5px;font-weight:600;color:hsl(var(--foreground));
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.odk-copy small{font-size:10.5px;color:hsl(var(--muted-foreground));
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Inter',system-ui,sans-serif}
.odk-stage{position:relative;flex:1 1 auto;min-width:60px;height:28px;margin-inline-start:auto;
  border-radius:6px;overflow:hidden;
  background:linear-gradient(90deg, transparent, hsl(var(--trading-bg-primary) / 0.6));
  border:1px dashed hsl(var(--border))}
.odk-file{position:absolute;top:50%;transform:translateY(-50%);
  display:inline-flex;align-items:center;gap:5px;height:20px;padding:0 8px;
  border-radius:5px;background:hsl(var(--trading-bg-secondary));
  border:1px solid hsl(var(--trading-cyan) / 0.45);
  color:hsl(var(--trading-cyan));font-family:'JetBrains Mono',monospace;
  font-size:10px;font-weight:700;letter-spacing:.04em;
  box-shadow:0 4px 10px -6px hsl(var(--trading-cyan) / 0.5);
  animation:odk-travel 3.6s cubic-bezier(.55,.05,.35,1) infinite}
.odk-file-tag{white-space:nowrap}

@keyframes odk-travel{
  0%{inset-inline-start:100%;opacity:0;scale:1}
  8%{opacity:1}
  78%{inset-inline-start:12px;opacity:1;scale:1}
  92%,100%{inset-inline-start:2px;opacity:0;scale:.55}
}

@media (max-width:1200px){.odk-copy small{display:none}}
@media (max-width:1024px){.odk-stage{display:none}.odk{flex:0 0 auto;max-width:none}}
@media (prefers-reduced-motion:reduce){
  .odk-file{animation:none;inset-inline-start:auto;inset-inline-end:8px;opacity:1}
  .odk,.odk:hover{transition:none;transform:none}
}
`;

export function ImportDock({ isRTL, onImport }: ImportDockProps) {
  const [fmt, setFmt] = useState(0);
  const nextFormat = useCallback(() => setFmt(f => (f + 1) % FORMATS.length), []);

  const title = isRTL ? 'ייבוא אוניברסלי' : 'Universal Import';
  const sub = isRTL
    ? 'גררו כל דוח — אורקה קוראת הכל'
    : 'Drop any statement — ORCA reads it all';

  return (
    <>
      <style>{DOCK_CSS}</style>
      <button type="button" className="odk" onClick={onImport} aria-label={title}>
        <span className="odk-well">
          <span className="odk-slot" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
              <path d="m7 9 5-5 5 5" />
              <path d="M12 4v12" />
            </svg>
          </span>
          <span className="odk-copy">
            <b>{title}</b>
            <small>{sub}</small>
          </span>
          <span className="odk-stage" aria-hidden="true">
            <span className="odk-file" onAnimationIteration={nextFormat}>
              <span className="odk-file-tag">{FORMATS[fmt]}</span>
            </span>
          </span>
        </span>
      </button>
    </>
  );
}
