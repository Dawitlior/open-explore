import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Capture beforeinstallprompt globally so the SettingsHub "Install Now"
// button can trigger the native PWA install dialog at any time.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).deferredInstallPrompt = e;
  });

  // Register service worker (required for PWA install prompt).
  // Skip in Lovable preview iframes to avoid caching the dev shell.
  const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
  const isPreviewHost =
    location.hostname.includes('id-preview--') ||
    location.hostname.includes('lovableproject.com');

  if ('serviceWorker' in navigator) {
    if (inIframe || isPreviewHost) {
      navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
    } else {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }
  }
}

createRoot(document.getElementById("root")!).render(<App />);
