/**
 * TraderMindSession — full-screen modal that hosts the bundled "תודעת הסוחר"
 * diagnostic (public/trader-mind/index.html) inside a sandboxed iframe.
 *
 * Bridge contract (postMessage):
 *   parent → iframe : { source: 'trader-mind-host', type: 'init',
 *                       payload: { tradeData, userName } }
 *   iframe → parent : { source: 'trader-mind', type: 'ready' | 'answer' | 'complete', payload }
 *
 * On 'complete' the result is persisted into public.trader_mind_sessions.
 */
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTrades } from '@/hooks/use-trades';
import { scopedStorage } from '@/lib/scoped-storage';

type Props = {
  open: boolean;
  onClose: () => void;
  lang?: 'he' | 'en';
};

const NAME_KEY = 'orca-user-name';

export function TraderMindSession({ open, onClose }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { trades } = useTrades();

  useEffect(() => {
    if (!open) return;

    const sendInit = async () => {
      const iframe = iframeRef.current;
      if (!iframe || !iframe.contentWindow) return;
      let userName: string | undefined;
      try {
        userName = (await scopedStorage.getItem(NAME_KEY)) ?? undefined;
      } catch {
        /* ignore */
      }
      // Aggregate trades into the shape the bundle expects (sample summary).
      const closed = trades.filter((t) => t.date);
      const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
      const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0;
      const tradeData = {
        sampleSize: closed.length,
        winRate,
      };
      iframe.contentWindow.postMessage(
        { source: 'trader-mind-host', type: 'init', payload: { tradeData, userName } },
        '*',
      );
    };

    const onMessage = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || data.source !== 'trader-mind') return;
      if (data.type === 'ready') {
        void sendInit();
        return;
      }
      if (data.type === 'complete') {
        void persistComplete(data.payload);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('message', onMessage);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, trades, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(4, 10, 22, 0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex', flexDirection: 'column',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', background: 'rgba(4,10,22,0.85)',
        borderBottom: '1px solid rgba(201,168,76,0.25)',
        color: '#f5f3ee', fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600,
        letterSpacing: 1,
      }}>
        <span style={{ color: '#c9a84c' }}>◈ תודעת הסוחר · Trader Mind</span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: '1px solid rgba(201,168,76,0.4)',
            color: '#f5f3ee', borderRadius: 8, padding: '6px 14px',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, letterSpacing: 1,
          }}
        >
          סגור · Close
        </button>
      </div>
      <iframe
        ref={iframeRef}
        src="/trader-mind/index.html"
        title="Trader Mind"
        style={{ flex: 1, width: '100%', border: 'none', background: '#FBFAF6' }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

async function persistComplete(payload: unknown) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return;
    const archetype =
      (payload && typeof payload === 'object'
        ? ((payload as Record<string, unknown>).persona as { name?: string } | undefined)?.name ??
          ((payload as Record<string, unknown>).archetype as string | undefined) ??
          ((payload as Record<string, unknown>).type as string | undefined)
        : null) ?? null;
    await supabase.from('trader_mind_sessions').insert({
      user_id: u.user.id,
      archetype,
      version: 'v1',
      payload: (payload ?? {}) as never,
    });
    try { window.dispatchEvent(new CustomEvent('orca:trader-mind-complete')); } catch { /* noop */ }
  } catch (e) {
    console.warn('[trader-mind] failed to persist session', e);
  }
}
