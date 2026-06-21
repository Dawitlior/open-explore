import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLang } from '@/hooks/use-lang';
import {
  LEGAL_TITLE_HE,
  LEGAL_TITLE_EN,
  LEGAL_SECTIONS_HE,
  LEGAL_SECTIONS_EN,
  LEGAL_FOOTER_HE,
  LEGAL_FOOTER_EN,
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
    desc.setAttribute('content', isRTL
      ? 'תנאי השימוש של Orca — מדיניות, אחריות משפטית ושימוש בפלטפורמת המסחר.'
      : 'Orca Terms of Service — policy, legal liability and use of the trading platform.');

    const canonical = upsertMeta('link[rel="canonical"]', () => {
      const l = document.createElement('link'); l.setAttribute('rel', 'canonical'); return l;
    });
    const prevCanonical = canonical.getAttribute('href');
    canonical.setAttribute('href', '/terms');

    return () => {
      document.title = prevTitle;
      if (prevDesc !== null) desc.setAttribute('content', prevDesc);
      if (prevCanonical !== null) canonical.setAttribute('href', prevCanonical);
    };
  }, [isRTL]);

  const sections = isRTL ? LEGAL_SECTIONS_HE : LEGAL_SECTIONS_EN;
  const footer = isRTL ? LEGAL_FOOTER_HE : LEGAL_FOOTER_EN;

  return (
    <main
      dir={isRTL ? 'rtl' : 'ltr'}
      lang={isRTL ? 'he' : 'en'}
      style={{
        minHeight: '100dvh',
        background: 'radial-gradient(1200px 600px at 50% -10%, rgba(212,175,90,0.08), transparent 60%), #000000',
        color: '#f5ecd6',
        fontFamily: "'Poppins', sans-serif",
        padding: '48px 20px',
      }}
    >
      <article
        style={{
          maxWidth: 880, margin: '0 auto',
          background: 'rgba(7,9,15,0.9)',
          border: '1px solid rgba(212,175,90,0.22)',
          borderRadius: 16,
          padding: '36px clamp(20px, 4vw, 48px)',
          boxShadow: '0 0 0 1px rgba(212,175,90,0.05), 0 20px 80px rgba(0,0,0,0.6)',
        }}
      >
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: '#f0d78c', fontSize: 13, textDecoration: 'none',
          marginBottom: 24, opacity: 0.9,
        }}>
          {isRTL ? <ArrowRight size={14} /> : <ArrowLeft size={14} />} {t('חזרה לאפליקציה', 'Back to the app')}
        </Link>

        <h1 style={{
          fontSize: 'clamp(20px, 2.6vw, 28px)', fontWeight: 800, lineHeight: 1.4,
          margin: '0 0 8px', color: '#f0d78c', letterSpacing: '-0.01em',
        }}>
          {t(LEGAL_TITLE_HE, LEGAL_TITLE_EN)}
        </h1>
        <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 28px' }}>
          {t('גרסה', 'Version')} {LEGAL_VERSION} · {t('עדכון אחרון:', 'Last updated:')} {LEGAL_VERSION_DATE}
        </p>

        {!isRTL && (
          <div dir="ltr" style={{
            marginBottom: 24, padding: '12px 14px', borderRadius: 10,
            border: '1px solid rgba(212,175,90,0.22)',
            background: 'rgba(212,175,90,0.06)',
            fontSize: 12.5, lineHeight: 1.6, color: 'rgba(245,236,214,0.85)',
          }}>
            <strong style={{ color: '#f0d78c' }}>Notice.</strong> The legally binding text of this agreement is the Hebrew version, in accordance with the exclusive jurisdiction of the courts of Tel Aviv-Yafo. The English text below is provided for accessibility.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {sections.map((s) => (
            <section key={s.heading}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px', color: '#f0d78c' }}>{s.heading}</h2>
              <p style={{
                fontSize: 14, lineHeight: 1.85,
                color: 'rgba(245,236,214,0.88)', whiteSpace: 'pre-line', margin: 0,
              }}>
                {s.body}
              </p>
            </section>
          ))}
        </div>

        <p
          style={{
            marginTop: 32, paddingTop: 18,
            borderTop: '1px solid rgba(212,175,90,0.22)',
            fontSize: 13, fontWeight: 600, color: '#f0d78c', textAlign: 'center',
          }}
        >
          {footer}
        </p>
      </article>
    </main>
  );
};

export default Terms;
