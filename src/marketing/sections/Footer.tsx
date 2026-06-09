import { Link } from 'react-router-dom';
import { Mail, MessageCircle } from 'lucide-react';
import { useMarketingUI } from '../UIContext';
import { useStrings } from '../i18n';

export function MktFooter() {
  const { lang } = useMarketingUI();
  const t = useStrings(lang);

  return (
    <footer className="pt-20 pb-10 border-t" style={{ borderColor: 'var(--mk-border)', background: 'var(--mk-bg-elev)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Quick */}
          <div>
            <h3 className="mk-display text-sm uppercase tracking-[0.18em]" style={{ color: 'var(--mk-muted)' }}>
              {t.footer.colQuick}
            </h3>
            <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--mk-text)' }}>
              <li><a href="#features">{t.nav.features}</a></li>
              <li><a href="#platforms">{t.nav.platforms}</a></li>
              <li><a href="#pricing">{t.nav.pricing}</a></li>
              <li><a href="#faq">{t.nav.faq}</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mk-display text-sm uppercase tracking-[0.18em]" style={{ color: 'var(--mk-muted)' }}>
              {t.footer.colLegal}
            </h3>
            <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--mk-text)' }}>
              <li><Link to="/terms">{t.footer.terms}</Link></li>
              <li><Link to="/terms#privacy">{t.footer.privacy}</Link></li>
              <li><a href="#risk-disclosure">{t.footer.risk}</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mk-display text-sm uppercase tracking-[0.18em]" style={{ color: 'var(--mk-muted)' }}>
              {t.footer.colContact}
            </h3>
            <ul className="mt-4 space-y-2 text-sm" style={{ color: 'var(--mk-text)' }}>
              <li className="flex items-center gap-2">
                <MessageCircle size={14} style={{ color: 'var(--mk-primary)' }} />
                <span data-placeholder="true">{t.ph.whatsapp}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail size={14} style={{ color: 'var(--mk-primary)' }} />
                <span data-placeholder="true">{t.ph.email}</span>
              </li>
              <li><span data-placeholder="true">{t.ph.domain}</span></li>
            </ul>
          </div>
        </div>

        {/* Risk Disclosure */}
        <div id="risk-disclosure" className="mt-12 pt-8 border-t" style={{ borderColor: 'var(--mk-border)' }}>
          <h4 className="mk-display text-sm uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--mk-muted)' }}>
            {t.footer.risk}
          </h4>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--mk-muted)' }}>
            {t.footer.riskDisclosure}
          </p>
        </div>

        <div className="mt-10 text-center text-xs" style={{ color: 'var(--mk-muted)' }}>
          {t.footer.rights}
        </div>
      </div>
    </footer>
  );
}
