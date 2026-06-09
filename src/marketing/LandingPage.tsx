import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { MarketingUIProvider, useMarketingUI } from './UIContext';
import { MktNav } from './sections/Nav';
import { MktHero } from './sections/Hero';
import { MktModules } from './sections/Modules';
import { MktLiveDemo } from './sections/LiveDemo';
import { MktBrokers } from './sections/Brokers';
import { MktFeatures } from './sections/Features';
import { MktPricing } from './sections/Pricing';
import { MktFAQ } from './sections/FAQ';
import { MktFooter } from './sections/Footer';
import './marketing.css';

function Shell() {
  const { theme, lang } = useMarketingUI();
  return (
    <div
      className={`marketing-root theme-${theme}`}
      dir={lang === 'he' ? 'rtl' : 'ltr'}
      style={{ minHeight: '100dvh', overflowX: 'clip', maxWidth: '100vw' }}
    >
      <MktNav />
      <main id="main">
        <MktHero />
        <MktModules />
        <MktLiveDemo />
        <MktBrokers />
        <MktFeatures />
        <MktPricing />
        <MktFAQ />
      </main>
      <MktFooter />
    </div>
  );
}

export default function LandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  // Authenticated users skip the landing.
  useEffect(() => {
    if (!loading && session) navigate('/', { replace: true });
  }, [loading, session, navigate]);

  return (
    <MarketingUIProvider>
      <Shell />
    </MarketingUIProvider>
  );
}
