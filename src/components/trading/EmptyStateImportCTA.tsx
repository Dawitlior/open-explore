/**
 * EmptyStateImportCTA — first-run onboarding card.
 * Replaces the "Add Trade" button in the center of an empty dashboard/journal.
 *
 * UX flow:
 *   1. Animated "Import File" tile (paper drifting into a slot) is the hero CTA.
 *   2. Clicking it opens a small popup with THREE options:
 *        • Import File  → runs the same handler as the header ImportDock.
 *        • Connect API  → jumps to the Exchanges settings panel.
 *        • Manual Trade → opens the trade form.
 *   3. All three options remain accessible; the tile is only the primary path.
 */

import { useEffect, useState } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  onImportFile: () => void;
  onConnectAPI: () => void;
  onManualTrade: () => void;
}

const CSS = `
@keyframes escFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes escFile {
  0%   { transform: translate(-58%, 0)   rotate(-4deg); opacity: 0; }
  15%  { opacity: 1; }
  55%  { transform: translate(-4%, -8%)  rotate(-2deg); opacity: 1; }
  85%  { transform: translate(38%, -2%)  rotate(3deg);  opacity: 1; }
  100% { transform: translate(52%, 0)    rotate(2deg);  opacity: 0; }
}
@keyframes escGlow {
  0%,100% { opacity: .35; }
  50%     { opacity: .8; }
}
@keyframes escSweep {
  0%   { transform: translateX(-110%); }
  100% { transform: translateX(120%); }
}
.esc-tile{position:relative;width:100%;max-width:520px;margin:0 auto;padding:0;
  border-radius:20px;overflow:hidden;cursor:pointer;
  background:linear-gradient(160deg, hsl(var(--trading-bg-secondary)/.9), hsl(var(--trading-bg-primary)/.95));
  border:1px solid hsl(var(--border));
  box-shadow:0 22px 60px -24px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.03);
  transition:transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s ease, border-color .25s ease;
  animation:escFadeIn .5s cubic-bezier(.2,.8,.2,1) both;
}
.esc-tile:hover{transform:translateY(-3px);
  border-color:hsl(var(--trading-cyan)/.5);
  box-shadow:0 26px 60px -20px rgba(0,0,0,.75), 0 0 40px -14px hsl(var(--trading-cyan)/.5)}
.esc-tile:focus-visible{outline:2px solid hsl(var(--ring));outline-offset:3px}
.esc-stage{position:relative;height:140px;overflow:hidden;
  background:radial-gradient(ellipse at 50% 120%, hsl(var(--trading-cyan)/.18), transparent 65%);
  border-bottom:1px solid hsl(var(--border))}
.esc-slot{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
  width:120px;height:70px;border-radius:12px;
  border:1.5px dashed hsl(var(--trading-cyan)/.55);
  background:linear-gradient(180deg, hsl(var(--trading-bg-primary)/.4), hsl(var(--trading-bg-secondary)/.6));
  box-shadow:inset 0 0 24px hsl(var(--trading-cyan)/.12)}
.esc-slot::after{content:'';position:absolute;inset:0;border-radius:11px;
  background:linear-gradient(90deg, transparent, hsl(var(--trading-cyan)/.25), transparent);
  animation:escGlow 2.4s ease-in-out infinite}
.esc-file{position:absolute;top:50%;left:50%;width:56px;height:70px;
  border-radius:6px;background:linear-gradient(160deg,#f5f6f8,#dfe3ea);
  box-shadow:0 8px 22px -6px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.6);
  animation:escFile 3.4s cubic-bezier(.5,.1,.3,1) infinite;
  transform-origin:center;
}
.esc-file::before{content:'';position:absolute;top:0;right:0;width:16px;height:16px;
  background:linear-gradient(225deg, #cbd0d9 50%, transparent 50%);border-radius:0 6px 0 6px}
.esc-file::after{content:'';position:absolute;left:8px;right:8px;top:22px;height:2px;
  background:#9aa4b2;border-radius:2px;
  box-shadow:0 6px 0 #9aa4b2, 0 12px 0 #9aa4b2, 0 18px 0 #b6bec9, 0 24px 0 #b6bec9, 0 30px 0 #c7cdd6}
.esc-sweep{position:absolute;top:0;bottom:0;width:35%;pointer-events:none;
  background:linear-gradient(100deg, transparent, hsl(var(--trading-cyan)/.16), transparent);
  animation:escSweep 3.4s ease-in-out infinite}
.esc-body{padding:18px 22px 20px;text-align:center}
.esc-title{font-family:'Inter',system-ui,sans-serif;font-size:16px;font-weight:700;
  color:hsl(var(--foreground));margin:0 0 4px;letter-spacing:-0.01em}
.esc-sub{font-family:'Inter',system-ui,sans-serif;font-size:12.5px;color:hsl(var(--muted-foreground));
  margin:0;line-height:1.5}

.esc-pop-backdrop{position:fixed;inset:0;z-index:9500;
  background:radial-gradient(ellipse at center, rgba(6,10,22,.72), rgba(0,0,0,.9));
  backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
  display:flex;align-items:center;justify-content:center;padding:20px;
  animation:escFadeIn .22s ease}
.esc-pop{width:min(520px,100%);border-radius:20px;padding:22px 18px 18px;
  background:linear-gradient(165deg, hsl(var(--trading-bg-secondary)/.98), hsl(var(--trading-bg-primary)/.98));
  border:1px solid hsl(var(--border));
  box-shadow:0 40px 100px -20px rgba(0,0,0,.85), 0 0 0 1px hsl(var(--border));
  animation:escFadeIn .28s cubic-bezier(.2,.8,.2,1) both}
.esc-pop-title{margin:0 0 4px;font-size:15px;font-weight:700;text-align:center;
  color:hsl(var(--foreground));font-family:'Inter',system-ui,sans-serif;letter-spacing:-.01em}
.esc-pop-sub{margin:0 0 16px;font-size:12px;text-align:center;color:hsl(var(--muted-foreground));
  font-family:'Inter',system-ui,sans-serif}
.esc-opts{display:grid;grid-template-columns:1fr;gap:8px}
@media (min-width:640px){.esc-opts{grid-template-columns:repeat(3,1fr)}}
.esc-opt{display:flex;flex-direction:column;align-items:flex-start;gap:6px;
  padding:14px 14px 12px;border-radius:12px;cursor:pointer;text-align:start;
  background:hsl(var(--trading-bg-surface)/.5);border:1px solid hsl(var(--border));
  color:hsl(var(--foreground));font-family:'Inter',system-ui,sans-serif;
  transition:transform .15s ease, border-color .15s ease, background .15s ease}
.esc-opt:hover{transform:translateY(-2px);border-color:hsl(var(--trading-cyan)/.55);
  background:hsl(var(--trading-bg-surface))}
.esc-opt:focus-visible{outline:2px solid hsl(var(--ring));outline-offset:2px}
.esc-opt-icon{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;
  background:hsl(var(--trading-cyan)/.12);color:hsl(var(--trading-cyan));border:1px solid hsl(var(--trading-cyan)/.28)}
.esc-opt-title{font-size:13px;font-weight:700;letter-spacing:-.005em}
.esc-opt-desc{font-size:11px;color:hsl(var(--muted-foreground));line-height:1.4}
.esc-close{position:absolute;top:10px;inset-inline-end:12px;width:28px;height:28px;border-radius:8px;
  background:transparent;border:1px solid hsl(var(--border));color:hsl(var(--muted-foreground));
  display:grid;place-items:center;cursor:pointer}
@media (prefers-reduced-motion:reduce){
  .esc-file,.esc-slot::after,.esc-sweep,.esc-tile,.esc-pop,.esc-pop-backdrop,.esc-opt{animation:none;transition:none}
  .esc-tile:hover,.esc-opt:hover{transform:none}
}
`;

export function EmptyStateImportCTA({ T, isRTL, onImportFile, onConnectAPI, onManualTrade }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const t = (he: string, en: string) => (isRTL ? he : en);

  return (
    <div style={{ padding: '40px 12px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }} dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{CSS}</style>

      <div style={{ fontSize: 40, opacity: 0.9 }}>🐋</div>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.text.primary, marginBottom: 6, fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '-0.01em' }}>
          {t('בואו נעלה את המסחר שלך', "Let's get your trading in")}
        </div>
        <div style={{ fontSize: 13, color: T.text.muted, lineHeight: 1.55 }}>
          {t('בחר את הדרך הכי מהירה להתחיל — קובץ קיים, חיבור לבורסה, או עסקה ידנית.',
             'Pick the fastest path — an existing file, a live exchange, or a manual trade.')}
        </div>
      </div>

      <button
        type="button"
        className="esc-tile"
        onClick={() => setOpen(true)}
        aria-label={t('התחל — בחר דרך להעלות נתונים', 'Start — pick a way to bring in data')}
      >
        <div className="esc-stage">
          <div className="esc-slot" aria-hidden />
          <div className="esc-file" aria-hidden />
          <div className="esc-sweep" aria-hidden />
        </div>
        <div className="esc-body">
          <div className="esc-title">
            {t('ייבא קובץ מסחר', 'Import a trading file')}
          </div>
          <div className="esc-sub">
            {t('XLSX · CSV · JSON — או בחר דרך אחרת להתחיל.', 'XLSX · CSV · JSON — or pick another way to start.')}
          </div>
        </div>
      </button>

      {open && (
        <div className="esc-pop-backdrop" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label={t('בחר דרך להתחיל', 'Choose a way to start')}>
          <div className="esc-pop" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="esc-close"
              onClick={() => setOpen(false)}
              aria-label={t('סגור', 'Close')}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M6 18L18 6"/></svg>
            </button>
            <div className="esc-pop-title">{t('איך תרצה להתחיל?', 'How would you like to start?')}</div>
            <div className="esc-pop-sub">{t('אפשר לשנות בכל שלב — הכל נשמר תחת אותו תיק פעיל.',
              'You can change this anytime — everything lives under the same active portfolio.')}</div>

            <div className="esc-opts">
              <button
                type="button"
                className="esc-opt"
                onClick={() => { setOpen(false); onImportFile(); }}
              >
                <span className="esc-opt-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                    <path d="M14 3v6h6"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/>
                  </svg>
                </span>
                <span className="esc-opt-title">{t('ייבא קובץ', 'Import File')}</span>
                <span className="esc-opt-desc">{t('XLSX · CSV · JSON — זיהוי אוטומטי.', 'XLSX · CSV · JSON — auto-detected.')}</span>
              </button>

              <button
                type="button"
                className="esc-opt"
                onClick={() => { setOpen(false); onConnectAPI(); }}
              >
                <span className="esc-opt-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 14a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1.5 1.5"/>
                    <path d="M14 10a5 5 0 0 0-7.07 0l-3 3a5 5 0 1 0 7.07 7.07l1.5-1.5"/>
                  </svg>
                </span>
                <span className="esc-opt-title">{t('חיבור API', 'Connect API')}</span>
                <span className="esc-opt-desc">{t('סנכרון חי מ-Bybit · Binance · ועוד.', 'Live sync from Bybit · Binance · more.')}</span>
              </button>

              <button
                type="button"
                className="esc-opt"
                onClick={() => { setOpen(false); onManualTrade(); }}
              >
                <span className="esc-opt-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </span>
                <span className="esc-opt-title">{t('עסקה ידנית', 'Manual Trade')}</span>
                <span className="esc-opt-desc">{t('הזן עסקה בודדת בטופס מלא.', 'Enter a single trade with the full form.')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmptyStateImportCTA;
