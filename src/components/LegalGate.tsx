import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { useLang } from '@/hooks/use-lang';
import {
  LEGAL_TITLE_HE,
  LEGAL_TITLE_EN,
  LEGAL_SECTIONS_HE,
  LEGAL_SECTIONS_EN,
  LEGAL_ACCEPT_LABEL_HE,
  LEGAL_ACCEPT_LABEL_EN,
  PRIVACY_TITLE_HE,
  PRIVACY_TITLE_EN,
  PRIVACY_SECTIONS_HE,
  PRIVACY_SECTIONS_EN,
  PRIVACY_ACCEPT_LABEL_HE,
  PRIVACY_ACCEPT_LABEL_EN,
  LEGAL_VERSION,
  LEGAL_VERSION_DATE,
  LEGAL_FOOTER_HE,
  LEGAL_FOOTER_EN,
} from '@/lib/legal-text';

/**
 * Iron-clad two-step legal gatekeeper for APEX OS.
 * Mounts after auth. Blocks the entire app until the user:
 *   1) Reads & ticks Terms of Service → continues
 *   2) Reads & ticks Privacy Policy → continues
 * Persists separate signatures (legal_accepted_at, privacy_accepted_at)
 * plus the version string to public.user_preferences, and writes one
 * audit row per acceptance into public.consent_log.
 *
 * Formal black/gold styling — institutional, no neon.
 */

const GOLD = '#d4af5a';
const GOLD_BRIGHT = '#f0d78c';
const GOLD_DEEP = '#a8862d';
const INK = '#000000';
const INK_2 = '#07090f';
const INK_3 = '#0e131c';
const TEXT = '#f5ecd6';
const TEXT_MUTED = '#9a9381';
const BORDER = 'rgba(212,175,90,0.22)';
const BORDER_STRONG = 'rgba(212,175,90,0.45)';

const cacheKey = (uid: string, kind: 'legal' | 'privacy') =>
  `orca:${kind}-accepted:${uid}`;

type Stage = 'loading' | 'terms' | 'privacy' | 'done';

async function writeConsentRow(userId: string, kind: 'terms' | 'privacy') {
  try {
    await supabase.from('consent_log').insert({
      user_id: userId,
      version: LEGAL_VERSION,
      choices: { [kind]: true } as Record<string, boolean>,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 500) : null,
    });
  } catch { /* non-blocking */ }
}

export const LegalGate = () => {
  const { user } = useAuth();
  const { isRTL } = useLang();
  const [stage, setStage] = useState<Stage>('loading');
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Resolve initial stage from cache + DB
  useEffect(() => {
    let alive = true;
    if (!user?.id) { setStage('loading'); return; }

    const seedFromCache = (): Stage | null => {
      try {
        const t = localStorage.getItem(cacheKey(user.id, 'legal')) === '1';
        const p = localStorage.getItem(cacheKey(user.id, 'privacy')) === '1';
        if (t && p) return 'done';
        if (t && !p) return 'privacy';
      } catch {}
      return null;
    };
    const cached = seedFromCache();
    if (cached) setStage(cached);

    (async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('legal_accepted, privacy_accepted')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!alive) return;
      if (error) return; // do not downgrade
      const termsOk = !!data?.legal_accepted;
      const privOk = !!data?.privacy_accepted;
      try {
        if (termsOk) localStorage.setItem(cacheKey(user.id, 'legal'), '1');
        if (privOk) localStorage.setItem(cacheKey(user.id, 'privacy'), '1');
      } catch {}
      if (termsOk && privOk) setStage('done');
      else if (termsOk && !privOk) setStage('privacy');
      else setStage('terms');
    })();
    return () => { alive = false; };
  }, [user?.id]);

  // Reset checkbox between stages
  useEffect(() => { setAgreed(false); }, [stage]);

  if (stage === 'loading' || stage === 'done' || !user?.id) return null;

  const isTerms = stage === 'terms';
  const sections = isTerms
    ? (isRTL ? LEGAL_SECTIONS_HE : LEGAL_SECTIONS_EN)
    : (isRTL ? PRIVACY_SECTIONS_HE : PRIVACY_SECTIONS_EN);
  const title = isTerms
    ? (isRTL ? LEGAL_TITLE_HE : LEGAL_TITLE_EN)
    : (isRTL ? PRIVACY_TITLE_HE : PRIVACY_TITLE_EN);
  const acceptLabel = isTerms
    ? (isRTL ? LEGAL_ACCEPT_LABEL_HE : LEGAL_ACCEPT_LABEL_EN)
    : (isRTL ? PRIVACY_ACCEPT_LABEL_HE : PRIVACY_ACCEPT_LABEL_EN);
  const stepNum = isTerms ? 1 : 2;
  const t = (he: string, en: string) => (isRTL ? he : en);

  const handleAccept = async () => {
    if (!agreed || saving) return;
    setSaving(true);
    const nowIso = new Date().toISOString();
    const patch: Record<string, unknown> = { user_id: user.id };
    if (isTerms) {
      patch.legal_accepted = true;
      patch.legal_accepted_at = nowIso;
      patch.legal_version = LEGAL_VERSION;
    } else {
      patch.privacy_accepted = true;
      patch.privacy_accepted_at = nowIso;
      patch.privacy_version = LEGAL_VERSION;
    }
    const { error } = await supabase
      .from('user_preferences')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .upsert(patch as any, { onConflict: 'user_id' });
    setSaving(false);
    if (!error) {
      try { localStorage.setItem(cacheKey(user.id, isTerms ? 'legal' : 'privacy'), '1'); } catch {}
      void writeConsentRow(user.id, isTerms ? 'terms' : 'privacy');
      setStage(isTerms ? 'privacy' : 'done');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-gate-title"
      dir={isRTL ? 'rtl' : 'ltr'}
      lang={isRTL ? 'he' : 'en'}
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        background: 'rgba(0,0,0,0.94)',
        backdropFilter: 'blur(14px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        fontFamily: "'Poppins', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: 'min(760px, 100%)',
          background: `linear-gradient(180deg, ${INK_2} 0%, ${INK} 100%)`,
          border: `1px solid ${BORDER}`,
          borderRadius: 18,
          boxShadow: '0 30px 100px rgba(0,0,0,0.85), inset 0 1px 0 rgba(240,215,140,0.08)',
          color: TEXT,
          display: 'flex', flexDirection: 'column',
          maxHeight: 'calc(100vh - 32px)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* Top gold hairline */}
        <div style={{
          position: 'absolute', top: 0, insetInlineStart: 40, insetInlineEnd: 40, height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
        }} />

        {/* Step indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 28px 0',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              fontSize: 10, color: GOLD, fontWeight: 700,
              letterSpacing: '0.28em', textTransform: 'uppercase',
            }}>APEX OS · Legal</span>
            <span style={{ color: TEXT_MUTED, fontSize: 10, letterSpacing: '0.18em' }}>
              · {LEGAL_VERSION}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2].map(n => (
              <span key={n} style={{
                width: 28, height: 4, borderRadius: 2,
                background: n <= stepNum ? GOLD_BRIGHT : 'rgba(212,175,90,0.18)',
                transition: 'background .25s',
              }} />
            ))}
          </div>
        </div>

        <header style={{ padding: '14px 28px 16px', borderBottom: `1px solid ${BORDER}` }}>
          <div style={{
            fontSize: 10, color: TEXT_MUTED, letterSpacing: '0.22em',
            textTransform: 'uppercase', marginBottom: 6, fontWeight: 600,
          }}>
            שלב {stepNum} מתוך 2 · {isTerms ? 'תנאי שימוש' : 'מדיניות פרטיות'}
          </div>
          <h2
            id="legal-gate-title"
            style={{
              margin: 0, fontSize: 18, fontWeight: 700, lineHeight: 1.4,
              color: TEXT, letterSpacing: '-0.005em',
            }}
          >
            {title}
          </h2>
        </header>

        <div
          style={{
            maxHeight: 440, overflowY: 'auto',
            padding: '20px 28px',
            background: 'rgba(0,0,0,0.4)',
            borderBottom: `1px solid ${BORDER}`,
            scrollbarColor: `${GOLD_DEEP} transparent`,
            scrollbarWidth: 'thin',
          }}
        >
          {sections.map((s) => (
            <section key={s.heading} style={{ marginBottom: 20 }}>
              <h3 style={{
                fontSize: 13, fontWeight: 700, color: GOLD_BRIGHT,
                margin: '0 0 8px', letterSpacing: '0.01em',
              }}>
                {s.heading}
              </h3>
              <p style={{
                fontSize: 13, lineHeight: 1.85, margin: 0,
                color: 'rgba(245,236,214,0.86)', whiteSpace: 'pre-line',
              }}>
                {s.body}
              </p>
            </section>
          ))}
          <p style={{
            marginTop: 16, paddingTop: 14,
            borderTop: `1px solid ${BORDER}`,
            fontSize: 11, fontWeight: 600, color: TEXT_MUTED, textAlign: 'center',
            letterSpacing: '0.04em',
          }}>
            {LEGAL_FOOTER_HE}
          </p>
        </div>

        <label
          style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '18px 28px', cursor: 'pointer', userSelect: 'none',
            background: agreed ? 'rgba(212,175,90,0.06)' : 'transparent',
            transition: 'background 0.2s',
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{
              width: 18, height: 18, accentColor: GOLD,
              marginTop: 2, flexShrink: 0, cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: 13, lineHeight: 1.6, color: TEXT }}>
            {acceptLabel}
          </span>
        </label>

        <footer style={{
          padding: '16px 28px 22px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 11, color: TEXT_MUTED, letterSpacing: '0.04em' }}>
            חתימה אלקטרונית · {new Date().toLocaleDateString('he-IL')}
          </span>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!agreed || saving}
            style={{
              padding: '12px 28px', borderRadius: 10, border: 'none',
              fontFamily: "'Poppins', system-ui, sans-serif", fontWeight: 700, fontSize: 13,
              letterSpacing: '0.04em',
              cursor: agreed && !saving ? 'pointer' : 'not-allowed',
              background: agreed
                ? `linear-gradient(135deg, ${GOLD_BRIGHT} 0%, ${GOLD} 100%)`
                : 'rgba(255,255,255,0.04)',
              color: agreed ? '#1a1300' : 'rgba(245,236,214,0.35)',
              boxShadow: agreed ? '0 12px 30px rgba(212,175,90,0.32)' : 'none',
              transition: 'all 0.2s',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'שומר…' : (isTerms ? 'אישור והמשך למדיניות פרטיות' : 'אישור והכניסה לפלטפורמה')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default LegalGate;
