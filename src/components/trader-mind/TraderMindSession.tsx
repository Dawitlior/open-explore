/**
 * TraderMindSession — full-screen modal that hosts the bundled "תודעת הסוחר"
 * diagnostic (public/trader-mind/index.html) inside a sandboxed iframe.
 *
 * Bridge contract (postMessage):
 *   parent → iframe : { source: 'trader-mind-host', type: 'init',
 *                       payload: { tradeData, userName } }
 *   iframe → parent : { source: 'trader-mind', type: 'ready' | 'answer' | 'complete', payload }
 *
 * On 'complete' the result is persisted into public.trader_mind_sessions, and
 * an in-app success screen is shown with a prominent "Return to platform"
 * button (per UX requirement — never leave the user stranded in the iframe).
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTrades } from '@/hooks/use-trades';
import { scopedStorage } from '@/lib/scoped-storage';

type Props = {
  open: boolean;
  onClose: () => void;
  lang?: 'he' | 'en';
};

const NAME_KEY = 'orca-user-name';

type DoneState = 'idle' | 'saving' | 'saved' | 'error';

export function TraderMindSession({ open, onClose, lang = 'he' }: Props) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const { trades } = useTrades();
  const [done, setDone] = useState<DoneState>('idle');
  const [archetype, setArchetype] = useState<string | null>(null);

  // Reset state every time the modal opens
  useEffect(() => {
    if (open) { setDone('idle'); setArchetype(null); }
  }, [open]);

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
      const closed = trades.filter((t) => t.date);
      const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
      const winRate = closed.length ? Math.round((wins / closed.length) * 100) : 0;
      const tradeData = { sampleSize: closed.length, winRate };
      iframe.contentWindow.postMessage(
        { source: 'trader-mind-host', type: 'init', payload: { tradeData, userName } },
        '*',
      );
    };

    const onMessage = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || data.source !== 'trader-mind') return;
      if (data.type === 'ready') { void sendInit(); return; }
      if (data.type === 'complete') {
        setDone('saving');
        void persistComplete(data.payload).then((res) => {
          setArchetype(res.archetype);
          setDone(res.ok ? 'saved' : 'error');
        });
      }
    };

    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('message', onMessage);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, trades, onClose]);

  if (!open) return null;

  const he = lang === 'he';
  const showOverlay = done !== 'idle';

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
        <span style={{ color: '#c9a84c' }}>◈ {he ? 'תודעת הסוחר' : 'Trader Mind'}</span>
        <button
          onClick={onClose}
          style={{
            background: 'transparent', border: '1px solid rgba(201,168,76,0.4)',
            color: '#f5f3ee', borderRadius: 8, padding: '6px 14px',
            cursor: 'pointer', fontSize: 12, fontWeight: 600, letterSpacing: 1,
          }}
        >
          {he ? 'סגור' : 'Close'}
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <iframe
          ref={iframeRef}
          src="/trader-mind/index.html"
          title="Trader Mind"
          style={{ width: '100%', height: '100%', border: 'none', background: '#FBFAF6' }}
          sandbox="allow-scripts allow-same-origin"
        />

        {showOverlay && (
          <div
            dir={he ? 'rtl' : 'ltr'}
            style={{
              position: 'absolute', inset: 0,
              background: 'rgba(4,10,22,0.94)',
              backdropFilter: 'blur(10px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: 24, textAlign: 'center',
              fontFamily: "'Poppins', sans-serif", color: '#f5f3ee',
            }}
          >
            <div style={{ fontSize: 48, color: '#c9a84c', marginBottom: 12 }}>◈</div>
            <div style={{ fontSize: 11, letterSpacing: 3, color: '#c9a84c', textTransform: 'uppercase', marginBottom: 6 }}>
              {done === 'saving'
                ? (he ? 'שומר תוצאות' : 'Saving results')
                : done === 'error'
                  ? (he ? 'שגיאה בשמירה' : 'Save error')
                  : (he ? 'האבחון הושלם' : 'Diagnostic complete')}
            </div>
            <h2 style={{ fontSize: 26, fontWeight: 700, margin: '6px 0 10px' }}>
              {archetype ?? (he ? 'הפרופיל שלך נשמר' : 'Your profile is saved')}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(245,243,238,0.7)', maxWidth: 420, lineHeight: 1.6 }}>
              {done === 'error'
                ? (he
                    ? 'לא הצלחנו לשמור את התוצאה. נסה שוב או חזור לפלטפורמה.'
                    : 'We could not save the result. Try again or return to the platform.')
                : (he
                    ? 'תוצאות האבחון זמינות עכשיו תחת הגדרות → תודעת הסוחר, וה-AI Coach יתכייל בהתאם.'
                    : 'Your diagnostic is now available under Settings → Trader Mind, and the AI Coach will be calibrated accordingly.')}
            </p>
            <button
              onClick={onClose}
              disabled={done === 'saving'}
              style={{
                marginTop: 26, padding: '14px 34px', borderRadius: 12,
                background: done === 'saving' ? 'rgba(201,168,76,0.3)' : '#c9a84c',
                color: '#0a0e1a', border: 'none',
                fontWeight: 800, fontSize: 13, letterSpacing: 2, textTransform: 'uppercase',
                cursor: done === 'saving' ? 'wait' : 'pointer',
                boxShadow: '0 10px 30px -10px rgba(201,168,76,0.6)',
              }}
            >
              {done === 'saving'
                ? (he ? 'שומר…' : 'Saving…')
                : (he ? 'סיום · חזרה לפלטפורמה' : 'Finish · Return to platform')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

async function persistComplete(payload: unknown): Promise<{ ok: boolean; archetype: string | null }> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return { ok: false, archetype: null };
    const obj = (payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}) ?? {};
    const archetype =
      ((obj.persona as { name?: string } | undefined)?.name ??
        (obj.archetype as string | undefined) ??
        (obj.type as string | undefined) ??
        null) as string | null;
    const { error } = await supabase.from('trader_mind_sessions').insert({
      user_id: u.user.id,
      archetype,
      version: 'v1',
      payload: (payload ?? {}) as never,
    });
    if (error) {
      console.warn('[trader-mind] insert error', error);
      return { ok: false, archetype };
    }
    try { window.dispatchEvent(new CustomEvent('orca:trader-mind-complete')); } catch { /* noop */ }
    return { ok: true, archetype };
  } catch (e) {
    console.warn('[trader-mind] failed to persist session', e);
    return { ok: false, archetype: null };
  }
}
