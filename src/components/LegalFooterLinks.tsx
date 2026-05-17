import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import {
  LEGAL_TITLE_HE,
  LEGAL_SECTIONS_HE,
  LEGAL_FOOTER_HE,
} from '@/lib/legal-text';

/**
 * Compact, high-contrast legal links pinned to the bottom of the layout.
 * "תנאי שימוש" navigates to the dedicated /terms page;
 * "פרטיות" and "נגישות" open a slide-out drawer with the relevant clause(s).
 */
export const LegalFooterLinks = () => {
  const [open, setOpen] = useState<null | 'privacy' | 'a11y'>(null);

  const linkStyle: React.CSSProperties = {
    color: 'rgba(127,230,255,0.85)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 0.3,
    textDecoration: 'none',
    padding: '4px 8px',
    borderRadius: 6,
    transition: 'all 0.15s',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    fontFamily: "'Poppins', sans-serif",
  };

  const sep: React.CSSProperties = {
    color: 'rgba(127,230,255,0.25)', fontSize: 10, userSelect: 'none',
  };

  const privacyClause = LEGAL_SECTIONS_HE.find(s => s.heading.startsWith('7.'));
  const a11yClause = LEGAL_SECTIONS_HE.find(s => s.heading.startsWith('8.'));

  return (
    <>
      <div
        dir="rtl"
        style={{
          position: 'fixed',
          bottom: 8,
          insetInlineStart: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          background: 'rgba(6,19,38,0.7)',
          border: '1px solid rgba(0,242,255,0.12)',
          borderRadius: 999,
          backdropFilter: 'blur(8px)',
          zIndex: 40,
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <Link to="/terms" style={linkStyle}>תנאי שימוש</Link>
        <span style={sep}>•</span>
        <button type="button" style={linkStyle} onClick={() => setOpen('privacy')}>פרטיות</button>
        <span style={sep}>•</span>
        <button type="button" style={linkStyle} onClick={() => setOpen('a11y')}>נגישות</button>
      </div>

      <Sheet open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent
          side="right"
          dir="rtl"
          style={{
            width: 'min(520px, 92vw)',
            maxWidth: 520,
            background: 'linear-gradient(180deg, #08182f, #061326)',
            borderLeft: '1px solid rgba(0,242,255,0.2)',
            color: '#e6f4ff',
            fontFamily: "'Poppins', sans-serif",
            overflowY: 'auto',
          }}
        >
          <SheetHeader>
            <SheetTitle style={{ color: '#00f2ff', fontSize: 16 }}>
              {open === 'privacy' ? 'פרטיות והגנת נתונים' : 'הצהרת נגישות'}
            </SheetTitle>
          </SheetHeader>
          <div style={{ marginTop: 18 }}>
            {(open === 'privacy' ? privacyClause : a11yClause) && (
              <section>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#7fe6ff', margin: '0 0 8px' }}>
                  {(open === 'privacy' ? privacyClause! : a11yClause!).heading}
                </h3>
                <p style={{
                  fontSize: 13, lineHeight: 1.85,
                  color: 'rgba(230,244,255,0.85)', whiteSpace: 'pre-line', margin: 0,
                }}>
                  {(open === 'privacy' ? privacyClause! : a11yClause!).body}
                </p>
              </section>
            )}
            <p style={{
              marginTop: 24, paddingTop: 14, borderTop: '1px solid rgba(0,242,255,0.12)',
              fontSize: 11, color: 'rgba(127,230,255,0.7)', textAlign: 'center',
            }}>
              <Link to="/terms" style={{ color: '#00f2ff', textDecoration: 'underline' }}>
                למסמך המלא של {LEGAL_TITLE_HE.split('–')[0].trim()}
              </Link>
            </p>
            <p style={{ fontSize: 11, color: 'rgba(127,230,255,0.5)', textAlign: 'center', marginTop: 8 }}>
              {LEGAL_FOOTER_HE}
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default LegalFooterLinks;
