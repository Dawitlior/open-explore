/**
 * orcaConfirm — Promise-based, branded confirmation dialog used in place of
 * the browser's native `window.confirm()`. Dispatches a global event that
 * `<OrcaConfirmRoot />` (mounted in App.tsx) listens for and renders.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export interface OrcaConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  isRTL?: boolean;
}

interface InternalRequest extends OrcaConfirmOptions {
  resolve: (v: boolean) => void;
}

const EVT = 'orca:confirm-request';

export function orcaConfirm(opts: OrcaConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') return resolve(false);
    window.dispatchEvent(new CustomEvent<InternalRequest>(EVT, { detail: { ...opts, resolve } }));
  });
}

export function OrcaConfirmRoot() {
  const [req, setReq] = useState<InternalRequest | null>(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const h = (e: Event) => {
      const detail = (e as CustomEvent<InternalRequest>).detail;
      setClosing(false);
      setReq(detail);
    };
    window.addEventListener(EVT, h as EventListener);
    return () => window.removeEventListener(EVT, h as EventListener);
  }, []);

  useEffect(() => {
    if (!req) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter') finish(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req]);

  function finish(value: boolean) {
    if (!req) return;
    setClosing(true);
    const r = req;
    setTimeout(() => {
      r.resolve(value);
      setReq(null);
      setClosing(false);
    }, 180);
  }

  if (!req) return null;

  const isRTL = !!req.isRTL;
  const danger = req.tone !== 'default';
  const accent = danger ? '#ff3b3b' : '#00f2ff';
  const accentGlow = danger ? 'rgba(255,59,59,0.35)' : 'rgba(0,242,255,0.30)';
  const confirmLabel = req.confirmLabel ?? (isRTL ? 'אישור' : 'Confirm');
  const cancelLabel = req.cancelLabel ?? (isRTL ? 'ביטול' : 'Cancel');

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={() => finish(false)}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed', inset: 0, zIndex: 9700,
        background: 'rgba(3,8,18,0.78)', backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'grid', placeItems: 'center', padding: 16,
        opacity: closing ? 0 : 1,
        transition: 'opacity 180ms ease',
        fontFamily: "'Poppins', system-ui, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 440,
          background: 'linear-gradient(160deg, #0a1628 0%, #061326 100%)',
          border: `1px solid ${accent}55`,
          borderRadius: 18,
          padding: '28px 26px 22px',
          boxShadow: `0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px ${accent}22, 0 0 50px ${accentGlow}`,
          transform: closing ? 'scale(0.94) translateY(8px)' : 'scale(1) translateY(0)',
          transition: 'transform 180ms cubic-bezier(0.16,1,0.3,1)',
          color: '#e8eef8',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute', inset: 0,
            background: `radial-gradient(120% 80% at 50% 0%, ${accent}18 0%, transparent 60%)`,
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            display: 'grid', placeItems: 'center',
            background: `${accent}14`, border: `1px solid ${accent}55`,
            color: accent,
          }}>
            <AlertTriangle size={20} />
          </div>
          <div style={{
            fontSize: 10, letterSpacing: '0.3em', color: accent, fontWeight: 700,
            fontFamily: "'IBM Plex Mono', monospace",
          }}>
            {danger ? (isRTL ? 'אישור פעולה' : 'CONFIRM ACTION') : (isRTL ? 'אישור' : 'CONFIRM')}
          </div>
        </div>
        <h2 style={{
          position: 'relative',
          margin: 0, fontSize: 18, fontWeight: 700, color: '#fff',
          lineHeight: 1.4,
        }}>
          {req.title}
        </h2>
        {req.description && (
          <p style={{
            position: 'relative',
            margin: '10px 0 0', fontSize: 13.5, color: '#90a3c0', lineHeight: 1.55,
          }}>
            {req.description}
          </p>
        )}
        <div style={{
          position: 'relative',
          marginTop: 24, display: 'flex', gap: 10,
          flexDirection: isRTL ? 'row-reverse' : 'row',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => finish(false)}
            style={{
              padding: '10px 20px', borderRadius: 10,
              background: 'transparent',
              border: '1px solid #2a3a55',
              color: '#cdd6e6',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
              letterSpacing: '0.05em', cursor: 'pointer',
              transition: 'all 160ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#4a5a75'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a3a55'; e.currentTarget.style.color = '#cdd6e6'; }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => finish(true)}
            autoFocus
            style={{
              padding: '10px 22px', borderRadius: 10,
              background: danger
                ? `linear-gradient(135deg, ${accent}, #c41e1e)`
                : `linear-gradient(135deg, ${accent}, #0a8aa8)`,
              border: `1px solid ${accent}`,
              color: danger ? '#fff' : '#03121f',
              fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800,
              letterSpacing: '0.05em', cursor: 'pointer',
              boxShadow: `0 6px 20px ${accentGlow}`,
              transition: 'transform 160ms ease, box-shadow 160ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 10px 28px ${accentGlow}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 6px 20px ${accentGlow}`; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default OrcaConfirmRoot;
