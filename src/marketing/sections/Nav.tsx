import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, Languages, Palette } from 'lucide-react';
import { useMarketingUI } from '../UIContext';
import { useStrings } from '../i18n';
import orcaLogoAsset from '@/assets/orca-logo.png.asset.json';

export function MktNav() {
  const { lang, toggleLang, theme, cycleTheme } = useMarketingUI();
  const t = useStrings(lang);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#features', label: t.nav.features },
    { href: '#platforms', label: t.nav.platforms },
    { href: '#pricing', label: t.nav.pricing },
    { href: '#faq', label: t.nav.faq },
  ];

  return (
    <header
      className="sticky top-0 z-50 transition-colors"
      style={{
        background: scrolled ? 'color-mix(in srgb, var(--mk-bg) 80%, transparent)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : undefined,
        borderBottom: scrolled ? '1px solid var(--mk-border)' : '1px solid transparent',
      }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="#top" className="flex items-center gap-2 shrink-0" aria-label="ORCA">
          <img src={orcaLogoAsset.url} alt="" width={28} height={28} style={{ borderRadius: 6 }} />
          <span className="mk-display text-lg" style={{ color: 'var(--mk-text)' }}>ORCA</span>
          <span aria-hidden>🐋</span>
        </a>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map(l => (
            <a key={l.href} href={l.href}
               className="text-sm transition-colors"
               style={{ color: 'var(--mk-muted)' }}
               onMouseEnter={e => (e.currentTarget.style.color = 'var(--mk-text)')}
               onMouseLeave={e => (e.currentTarget.style.color = 'var(--mk-muted)')}>
              {l.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-2">
          <button onClick={toggleLang} aria-label="Toggle language"
                  className="h-9 w-9 rounded-md flex items-center justify-center"
                  style={{ border: '1px solid var(--mk-border)', color: 'var(--mk-muted)' }}>
            <Languages size={16} />
          </button>
          <button onClick={cycleTheme} aria-label={`Theme: ${theme}`}
                  className="h-9 w-9 rounded-md flex items-center justify-center"
                  style={{ border: '1px solid var(--mk-border)', color: 'var(--mk-muted)' }}>
            <Palette size={16} />
          </button>
          <Link to="/auth?mode=login" className="text-sm" style={{ color: 'var(--mk-muted)' }}>
            {t.nav.login}
          </Link>
          <Link to="/auth?mode=register" className="mk-btn-primary text-sm" style={{ padding: '8px 16px' }}>
            {t.nav.cta}
          </Link>
        </div>

        {/* Mobile menu */}
        <button className="md:hidden h-10 w-10 flex items-center justify-center"
                onClick={() => setOpen(o => !o)} aria-label="Menu" aria-expanded={open}
                style={{ color: 'var(--mk-text)' }}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t" style={{ borderColor: 'var(--mk-border)', background: 'var(--mk-bg-elev)' }}>
          <div className="px-4 py-3 flex flex-col gap-3">
            {links.map(l => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)}
                 className="text-base py-2" style={{ color: 'var(--mk-text)' }}>{l.label}</a>
            ))}
            <div className="flex items-center gap-2 pt-2">
              <button onClick={toggleLang} className="flex-1 h-10 rounded-md flex items-center justify-center gap-2"
                      style={{ border: '1px solid var(--mk-border)', color: 'var(--mk-text)' }}>
                <Languages size={16} /> {lang === 'he' ? 'EN' : 'HE'}
              </button>
              <button onClick={cycleTheme} className="flex-1 h-10 rounded-md flex items-center justify-center gap-2"
                      style={{ border: '1px solid var(--mk-border)', color: 'var(--mk-text)' }}>
                <Palette size={16} /> {theme}
              </button>
            </div>
            <Link to="/auth?mode=login" className="text-center py-2" style={{ color: 'var(--mk-muted)' }}>
              {t.nav.login}
            </Link>
            <Link to="/auth?mode=register" className="mk-btn-primary text-center">
              {t.nav.cta}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
