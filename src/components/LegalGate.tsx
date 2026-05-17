import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import {
  LEGAL_TITLE_HE,
  LEGAL_SECTIONS_HE,
  LEGAL_FOOTER_HE,
  LEGAL_ACCEPT_LABEL_HE,
} from '@/lib/legal-text';

/**
 * Iron-clad legal gatekeeper.
 * Mounts after auth. Blocks the entire app until the user scrolls,
 * ticks the consent checkbox, and presses Continue.
 * Persists to public.user_preferences.legal_accepted.
 */
export const LegalGate = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'needs_accept' | 'accepted'>('loading');
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!user?.id) { setStatus('loading'); return; }
    (async () => {
      const { data } = await supabase
        .from('user_preferences')
        .select('legal_accepted')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!alive) return;
      setStatus(data?.legal_accepted ? 'accepted' : 'needs_accept');
    })();
    return () => { alive = false; };
  }, [user?.id]);

  if (status !== 'needs_accept' || !user?.id) return null;

  const handleAccept = async () => {
    if (!agreed || saving) return;
    setSaving(true);
    const { error } = await supabase
      .from('user_preferences')
      .upsert(
        { user_id: user.id, legal_accepted: true, legal_accepted_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
    setSaving(false);
    if (!error) setStatus('accepted');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-gate-title"
      dir="rtl"
      lang="he"
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(2,8,20,0.92)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div
        style={{
          width: 'min(720px, 100%)',
          background: 'linear-gradient(180deg, #08182f, #061326)',
          border: '1px solid rgba(0,242,255,0.25)',
          borderRadius: 16,
          boxShadow: '0 0 0 1px rgba(0,242,255,0.08), 0 30px 100px rgba(0,0,0,0.7), 0 0 60px rgba(0,242,255,0.15)',
          color: '#e6f4ff',
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'hidden',
        }}
      >
        <header style={{ padding: '20px 24px 14px', borderBottom: '1px solid rgba(0,242,255,0.12)' }}>
          <h2
            id="legal-gate-title"
            style={{
              margin: 0, fontSize: 16, fontWeight: 800, lineHeight: 1.45,
              background: 'linear-gradient(90deg, #00f2ff, #7fe6ff)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}
          >
            {LEGAL_TITLE_HE}
          </h2>
        </header>

        <div
          style={{
            maxHeight: 400,
            overflowY: 'auto',
            padding: '18px 24px',
            background: 'rgba(0,0,0,0.18)',
            borderBottom: '1px solid rgba(0,242,255,0.1)',
            scrollbarColor: '#00f2ff66 transparent',
            scrollbarWidth: 'thin',
          }}
        >
          {LEGAL_SECTIONS_HE.map((s) => (
            <section key={s.heading} style={{ marginBottom: 18 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#00f2ff', margin: '0 0 6px' }}>
                {s.heading}
              </h3>
              <p style={{
                fontSize: 13, lineHeight: 1.8, margin: 0,
                color: 'rgba(230,244,255,0.85)', whiteSpace: 'pre-line',
              }}>
                {s.body}
              </p>
            </section>
          ))}
          <p style={{
            marginTop: 10, paddingTop: 12,
            borderTop: '1px solid rgba(0,242,255,0.1)',
            fontSize: 12, fontWeight: 600, color: '#7fe6ff', textAlign: 'center',
          }}>
            {LEGAL_FOOTER_HE}
          </p>
        </div>

        <label
          style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            padding: '16px 24px', cursor: 'pointer', userSelect: 'none',
            background: agreed ? 'rgba(0,242,255,0.06)' : 'transparent',
            transition: 'background 0.2s',
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{
              width: 18, height: 18, accentColor: '#00f2ff',
              marginTop: 2, flexShrink: 0, cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.55, color: '#e6f4ff' }}>
            {LEGAL_ACCEPT_LABEL_HE}
          </span>
        </label>

        <footer style={{
          padding: '14px 24px 20px', display: 'flex', justifyContent: 'flex-start',
          borderTop: '1px solid rgba(0,242,255,0.1)',
        }}>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!agreed || saving}
            style={{
              padding: '12px 28px', borderRadius: 10, border: 'none',
              fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14,
              cursor: agreed && !saving ? 'pointer' : 'not-allowed',
              background: agreed
                ? 'linear-gradient(90deg, #00f2ff, #06d6a0)'
                : 'rgba(255,255,255,0.08)',
              color: agreed ? '#061326' : 'rgba(230,244,255,0.4)',
              boxShadow: agreed ? '0 0 24px rgba(0,242,255,0.4)' : 'none',
              transition: 'all 0.2s',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'שומר…' : 'אישור והמשך'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LegalGate;
