import { useState, useEffect, useCallback } from 'react';
import type { TradingTheme } from '@/lib/trading-theme';
import { GlassCard } from './TradingUI';
import { scopedStorage } from '@/lib/scoped-storage';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface Props {
  T: TradingTheme;
  isRTL: boolean;
  compact?: boolean;
}

export const InstallPrompt = ({ T, isRTL, compact }: Props) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    void scopedStorage.getItem('orca-install-dismissed').then(v => { if (v === '1') setDismissed(true); });
  }, []);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => setInstalled(true));

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem('orca-install-dismissed', '1');
  }, []);

  // Don't show if installed, dismissed, or no prompt available
  if (installed || dismissed || !deferredPrompt) return null;

  if (compact) {
    return (
      <button
        onClick={handleInstall}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '7px 10px',
          background: `linear-gradient(135deg, ${T.accent.cyan}10, ${T.accent.teal}10)`,
          border: `1px solid ${T.accent.cyan}25`,
          borderRadius: T.radius.md,
          color: T.accent.cyan, cursor: 'pointer', fontSize: 12, fontWeight: 600,
          transition: 'all 0.2s',
        }}
      >
        <span>📥</span>
        <span>{isRTL ? 'התקן על שולחן העבודה' : 'Install to Desktop'}</span>
      </button>
    );
  }

  return (
    <GlassCard T={T} glow={`${T.accent.cyan}08`} style={{ margin: '12px 0', padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 22 }}>📥</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text.primary, marginBottom: 2 }}>
            {isRTL ? 'התקן את Orca על שולחן העבודה' : 'Install Orca to Desktop'}
          </div>
          <div style={{ fontSize: 10, color: T.text.muted }}>
            {isRTL ? 'גישה מהירה מהמסך הראשי' : 'Quick access from your home screen'}
          </div>
        </div>
        <button onClick={handleInstall} style={{
          padding: '6px 16px', background: `linear-gradient(135deg, ${T.accent.cyan}, ${T.accent.teal})`,
          border: 'none', borderRadius: T.radius.md, color: T.bg.primary, fontWeight: 700,
          cursor: 'pointer', fontSize: 11, transition: 'all 0.2s',
        }}>
          {isRTL ? 'התקן' : 'Install'}
        </button>
        <button onClick={handleDismiss} style={{
          background: 'none', border: 'none', color: T.text.muted, cursor: 'pointer', fontSize: 14, padding: 4,
        }}>×</button>
      </div>
    </GlassCard>
  );
};
