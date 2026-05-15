import { useEffect, useRef, useState, useCallback } from 'react';
import type { Trade } from '@/data/trades';
import { useAuth } from '@/hooks/use-auth';

// ═══════════════════════════════════════════════════
// WeeklyReviewPage — wraps the standalone Trading
// Journal HTML app (public/weekly-review/index.html)
// inside an isolated iframe and bridges Orca trades
// into it via postMessage. The iframe URL carries the
// authenticated user id so its localStorage is fully
// isolated per user (see top of /weekly-review/index.html).
// ═══════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrcaTheme = any;
type OrcaThemeId = 'midnight' | 'indigo' | 'platinum';

interface Props {
  T: OrcaTheme;
  isRTL: boolean;
  trades: Trade[];
  themeId?: OrcaThemeId;
  stats?: unknown;
  riskData?: unknown;
}

const THEME_MAP: Record<OrcaThemeId, 'night' | 'snow'> = {
  midnight: 'night',
  indigo: 'night',
  platinum: 'snow',
};

export const WeeklyReviewPage = ({ T, isRTL, trades, themeId }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { user } = useAuth();
  const uid = user?.id || 'anon';
  const iframeSrc = `/weekly-review/index.html?uid=${encodeURIComponent(uid)}`;

  const sendTrades = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try { win.postMessage({ type: 'ORCA_TRADES_SYNC', trades }, '*'); } catch { /* noop */ }
  }, [trades]);

  const sendTheme = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win || !themeId) return;
    const mapped = THEME_MAP[themeId] || 'night';
    try { win.postMessage({ type: 'ORCA_THEME_SYNC', theme: mapped }, '*'); } catch { /* noop */ }
  }, [themeId]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const d = ev.data;
      if (d && typeof d === 'object' && d.type === 'WEEKLY_REVIEW_READY') setReady(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    if (ready) { sendTrades(); sendTheme(); }
  }, [ready, sendTrades, sendTheme]);

  useEffect(() => {
    const t = setTimeout(() => { if (!ready) setLoadError(true); }, 6000);
    return () => clearTimeout(t);
  }, [ready]);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        position: 'relative',
        width: '100%',
        // Use 100dvh so iOS / mobile browser chrome doesn't crop the frame.
        height: 'calc(100dvh - 60px)',
        minHeight: 480,
        background: T?.bg?.primary || '#061326',
        overflow: 'hidden',
      }}
    >
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        title="Weekly Review"
        loading="eager"
        onLoad={() => { setTimeout(() => setReady(true), 50); setLoadError(false); }}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          border: 0,
          background: 'transparent',
          colorScheme: 'dark',
        }}
      />

      {!ready && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            background: T?.bg?.primary || '#061326',
            color: T?.text?.muted || '#7a8aa3',
            fontSize: 12,
            letterSpacing: 2,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          <div
            style={{
              width: 48, height: 48, borderRadius: '50%',
              border: `2px solid ${(T?.accent?.cyan || '#00f2ff') + '22'}`,
              borderTopColor: T?.accent?.cyan || '#00f2ff',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <div>{isRTL ? 'טוען סקירה שבועית…' : 'Loading Weekly Review…'}</div>
          {loadError && (
            <div style={{ fontSize: 11, color: T?.status?.warning || '#ffb84d' }}>
              {isRTL ? 'הסנכרון מתעכב — נסה לרענן' : 'Sync is slow — try refreshing'}
            </div>
          )}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
};

export default WeeklyReviewPage;
