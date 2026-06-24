import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installGlobalErrorTelemetry } from "./lib/telemetry";

installGlobalErrorTelemetry();

// Capture beforeinstallprompt globally so the SettingsHub "Install Now"
// button can trigger the native PWA install dialog at any time.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).deferredInstallPrompt = e;
  });

  // Manifest-only installability: do not register an app-shell service worker.
  // Existing /sw.js registrations are removed so dev/preview and published tabs
  // cannot be silently refreshed by stale workers when users switch tabs.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          registrations.forEach((registration) => {
            const urls = [
              registration.active?.scriptURL,
              registration.installing?.scriptURL,
              registration.waiting?.scriptURL,
            ].filter(Boolean) as string[];
            const isOrcaShellWorker = urls.some((url) => {
              try { return new URL(url).pathname === '/sw.js'; }
              catch { return false; }
            });
            if (isOrcaShellWorker) registration.unregister().catch(() => {});
          });
        })
        .catch(() => {});
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
