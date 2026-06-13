import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import {
  LEGAL_TITLE_HE,
  LEGAL_SECTIONS_HE,
  LEGAL_FOOTER_HE,
} from '@/lib/legal-text';

const Terms = () => {
  return (
    <>
    <Helmet>
      <title>תנאי שימוש · Orca Investment</title>
      <meta name="description" content="תנאי השימוש ומדיניות הפלטפורמה של Orca Investment — יומן מסחר וניהול סיכונים." />
      <link rel="canonical" href="/terms" />
      <meta property="og:title" content="תנאי שימוש · Orca Investment" />
      <meta property="og:url" content="/terms" />
    </Helmet>
    <main
      dir="rtl"
      lang="he"
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
          <ArrowLeft size={14} />
          חזרה לאפליקציה
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
          {LEGAL_TITLE_HE}
        </h1>
        <p style={{ fontSize: 12, opacity: 0.55, margin: '0 0 28px' }}>
          עדכון אחרון: {new Date().toLocaleDateString('he-IL')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
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
    </>
  );
};

export default Terms;
