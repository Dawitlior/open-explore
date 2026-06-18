import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLang } from '@/hooks/use-lang';
import {
  LEGAL_TITLE_HE,
  LEGAL_TITLE_EN,
  LEGAL_SECTIONS_HE,
  LEGAL_FOOTER_HE,
  LEGAL_VERSION,
  LEGAL_VERSION_DATE,
} from '@/lib/legal-text';

const Terms = () => {
  const { isRTL, t } = useLang();
  useEffect(() => {
    window.scrollTo(0, 0);
    const prevTitle = document.title;
    document.title = isRTL ? `${LEGAL_TITLE_HE} — APEX OS` : `${LEGAL_TITLE_EN} — APEX OS`;
    const upsertMeta = (selector: string, create: () => HTMLElement) => {
      let el = document.head.querySelector(selector) as HTMLElement | null;
      if (!el) { el = create(); document.head.appendChild(el); }
      return el;
    };
    const desc = upsertMeta('meta[name="description"]', () => {
      const m = document.createElement('meta'); m.setAttribute('name', 'description'); return m;
    });
    const prevDesc = desc.getAttribute('content');
    desc.setAttribute('content', 'תנאי השימוש של Orca — מדיניות, אחריות משפטית ושימוש בפלטפורמת המסחר.');

    const canonical = upsertMeta('link[rel="canonical"]', () => {
      const l = document.createElement('link'); l.setAttribute('rel', 'canonical'); return l;
    });
    const prevCanonical = canonical.getAttribute('href');
    canonical.setAttribute('href', '/terms');

    const ogUrl = upsertMeta('meta[property="og:url"]', () => {
      const m = document.createElement('meta'); m.setAttribute('property', 'og:url'); return m;
    });
    const prevOgUrl = ogUrl.getAttribute('content');
    ogUrl.setAttribute('content', '/terms');

    const ogTitle = upsertMeta('meta[property="og:title"]', () => {
      const m = document.createElement('meta'); m.setAttribute('property', 'og:title'); return m;
    });
    const prevOgTitle = ogTitle.getAttribute('content');
    ogTitle.setAttribute('content', 'תנאי שימוש — Orca');

    return () => {
      document.title = prevTitle;
      if (prevDesc !== null) desc.setAttribute('content', prevDesc);
      if (prevCanonical !== null) canonical.setAttribute('href', prevCanonical);
      if (prevOgUrl !== null) ogUrl.setAttribute('content', prevOgUrl);
      if (prevOgTitle !== null) ogTitle.setAttribute('content', prevOgTitle);
    };
  }, []);

  return (
    <main
      dir={isRTL ? 'rtl' : 'ltr'}
      lang={isRTL ? 'he' : 'en'}
      style={{
        minHeight: '100dvh',
        background:
          'radial-gradient(1200px 600px at 50% -10%, rgba(0,242,255,0.08), transparent 60%), #061326',
        color: '#e6f4ff',
        fontFamily: "'Poppins', sans-serif",
        padding: '48px 20px',
      }}
    >
      <article
        style={{
          maxWidth: 880,
          margin: '0 auto',
          background: 'rgba(8,22,46,0.85)',
          border: '1px solid rgba(0,242,255,0.18)',
          borderRadius: 16,
          padding: '36px clamp(20px, 4vw, 48px)',
          boxShadow: '0 0 0 1px rgba(0,242,255,0.05), 0 20px 80px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#7fe6ff',
            fontSize: 13,
            textDecoration: 'none',
            marginBottom: 24,
            opacity: 0.9,
          }}
        >
          {isRTL ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
          {t('חזרה לאפליקציה', 'Back to the app')}
        </Link>

        <h1
          style={{
            fontSize: 'clamp(20px, 2.6vw, 28px)',
            fontWeight: 800,
            lineHeight: 1.4,
            margin: '0 0 8px',
            background: 'linear-gradient(90deg, #00f2ff, #7fe6ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {t(LEGAL_TITLE_HE, LEGAL_TITLE_EN)}
        </h1>
        <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 28px' }}>
          {t('גרסה', 'Version')} {LEGAL_VERSION} · {t('עדכון אחרון:', 'Last updated:')} {LEGAL_VERSION_DATE}
        </p>

        {!isRTL && (
          <div
            dir="ltr"
            style={{
              marginBottom: 24,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid rgba(0,242,255,0.18)',
              background: 'rgba(0,242,255,0.06)',
              fontSize: 12.5,
              lineHeight: 1.6,
              color: 'rgba(230,244,255,0.85)',
            }}
          >
            <strong style={{ color: '#7fe6ff' }}>Notice.</strong> The legally
            binding text of this agreement is the Hebrew version below, in
            accordance with the exclusive jurisdiction of the courts of
            Tel Aviv-Yafo (section 6). An English summary is available on
            request at <a href="mailto:innovationai@mail.com" style={{ color: '#7fe6ff' }}>innovationai@mail.com</a>.
          </div>
        )}

        <div dir="rtl" lang="he" style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {LEGAL_SECTIONS_HE.map((s) => (
            <section key={s.heading}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  margin: '0 0 8px',
                  color: '#00f2ff',
                }}
              >
                {s.heading}
              </h2>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.85,
                  color: 'rgba(230,244,255,0.88)',
                  whiteSpace: 'pre-line',
                  margin: 0,
                }}
              >
                {s.body}
              </p>
            </section>
          ))}
        </div>

        <p
          style={{
            marginTop: 32,
            paddingTop: 18,
            borderTop: '1px solid rgba(0,242,255,0.12)',
            fontSize: 13,
            fontWeight: 600,
            color: '#7fe6ff',
            textAlign: 'center',
          }}
        >
          {LEGAL_FOOTER_HE}
        </p>
      </article>
    </main>
  );
};

export default Terms;
