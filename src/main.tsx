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
}

createRoot(document.getElementById("root")!).render(<App />);
