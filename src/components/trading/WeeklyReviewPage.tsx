import { useEffect, useRef, useState, useCallback } from 'react';
import type { Trade } from '@/data/trades';

// ═══════════════════════════════════════════════════
// WeeklyReviewPage — wraps the standalone Trading
// Journal HTML app (public/weekly-review/index.html)
// inside an isolated iframe and bridges Orca trades
// into it via postMessage. The internal design and
// logic of the embedded app are kept 100% intact.
// ═══════════════════════════════════════════════════

// Loose theme — accept anything with the few tokens we touch.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrcaTheme = any;

interface Props {
  T: OrcaTheme;
  isRTL: boolean;
  trades: Trade[];
  // legacy props kept for call-site compatibility
  stats?: unknown;
  riskData?: unknown;
}

const IFRAME_SRC = '/weekly-review/index.html';

export const WeeklyReviewPage = ({ T, isRTL, trades }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const sendTrades = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage({ type: 'ORCA_TRADES_SYNC', trades }, '*');
    } catch {
      /* noop */
    }
  }, [trades]);

  // Listen for "ready" handshake from the embedded app
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const d = ev.data;
      if (d && typeof d === 'object' && d.type === 'WEEKLY_REVIEW_READY') {
        setReady(true);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Push trades whenever they change OR when the iframe signals it's ready
  useEffect(() => {
    if (ready) sendTrades();
  }, [ready, sendTrades]);

  // Failsafe: if no handshake within 4s, surface a graceful fallback message
  useEffect(() => {
    const t = setTimeout(() => {
      if (!ready) setLoadError(true);
    }, 4000);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: 'calc(100vh - 120px)',
        background: T.bg.primary,
        borderRadius: T.radius.lg,
        overflow: 'hidden',
        border: `1px solid ${T.border.subtle}`,
      }}
    >
      <iframe
        ref={iframeRef}
        src={IFRAME_SRC}
        title="Weekly Review"
        loading="eager"
        onLoad={() => {
          // Handshake fallback: even if the inner script didn't fire READY,
          // mark as ready after onLoad so we still push data.
          setTimeout(() => setReady(true), 50);
          setLoadError(false);
        }}
        style={{
          display: 'block',
          width: '100%',
          height: 'calc(100vh - 140px)',
          minHeight: 720,
          border: 0,
          background: '#0a0a0f',
          colorScheme: 'dark',
        }}
        // sandbox is intentionally NOT set — the embedded app needs
        // localStorage and same-origin features to function.
      />

      {!ready && !loadError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: T.bg.primary,
            color: T.text.muted,
            fontSize: 12,
            letterSpacing: 2,
            pointerEvents: 'none',
          }}
        >
          טוען סקירה שבועית…
        </div>
      )}

      {loadError && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            insetInlineEnd: 12,
            padding: '6px 10px',
            background: T.status.warning + '22',
            border: `1px solid ${T.status.warning}55`,
            color: T.status.warning,
            fontSize: 11,
            borderRadius: T.radius.sm,
          }}
        >
          הסנכרון מתעכב — נסה לרענן
        </div>
      )}
    </div>
  );
};

export default WeeklyReviewPage;
