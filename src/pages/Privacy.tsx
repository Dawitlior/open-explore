import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLang } from '@/hooks/use-lang';
import {
  PRIVACY_TITLE_HE,
  PRIVACY_TITLE_EN,
  PRIVACY_SECTIONS_HE,
  PRIVACY_SECTIONS_EN,
  LEGAL_VERSION,
  LEGAL_VERSION_DATE,
} from '@/lib/legal-text';

const Privacy = () => {
  const { isRTL, t } = useLang();
  useEffect(() => {
    window.scrollTo(0, 0);
    const prev = document.title;
    document.title = isRTL ? `${PRIVACY_TITLE_HE} — APEX OS` : `${PRIVACY_TITLE_EN} — APEX OS`;
    return () => { document.title = prev; };
  }, [isRTL]);

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
          {t(PRIVACY_TITLE_HE, PRIVACY_TITLE_EN)}
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
            <strong style={{ color: '#f0d78c' }}>Notice.</strong> The legally binding text of this policy is the Hebrew version. The English text below is provided for accessibility.
          </div>
        )}

        <div dir={isRTL ? 'rtl' : 'ltr'} lang={isRTL ? 'he' : 'en'} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {(isRTL ? PRIVACY_SECTIONS_HE : PRIVACY_SECTIONS_EN).map((s) => (
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
      </article>
    </main>
  );
};

export default Privacy;
