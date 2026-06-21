import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LiquidSweep } from "@/components/ui-orca";
// OrcaUXLayer bundles framer-motion + 20 ambient-UX effects that aren't
// needed for the first paint. Lazy-loaded so it never blocks LCP.
const OrcaUXLayer = lazy(() => import("@/components/ui-orca/OrcaUXLayer").then(m => ({ default: m.OrcaUXLayer })));
import { AuthProvider } from "@/hooks/use-auth";
import { ActivePortfolioProvider } from "@/hooks/use-active-portfolio";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StorageErrorListener } from "@/components/StorageErrorListener";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Landing from "./pages/Landing";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Accessibility from "./pages/Accessibility";
import NotFound from "./pages/NotFound";
import { LegalGate } from "@/components/LegalGate";
import { EconomicAlertBanner } from "@/components/economic/EconomicAlertBanner";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { CookieConsentRoot } from "@/components/privacy/CookieConsentRoot";
import { OrcaConfirmRoot } from "@/lib/orca-confirm";
import { ImportPreflightRoot } from "@/components/trading/ImportPreflightModal";
// Side-effect import: registers every BrokerAdapter into BrokerRegistry at boot.
import "@/lib/brokers";
import { assertRegistryIntegrity } from "@/lib/chart-registry";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BugArenaProvider, BugReportFab, mapRouteToHebrewArea } from "@/features/bug-arena";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

const BugBoardPage = lazy(() => import("./pages/BugBoardPage"));
const OrcaConsolePage = lazy(() => import("./pages/OrcaConsole"));
const OrcaDiagnosticsPage = lazy(() => import("./pages/OrcaDiagnostics"));
import { RequireAdmin } from "@/components/RequireAdmin";
import { ConsoleBackButton } from "@/components/ConsoleBackButton";

/**
 * Mounts BugArenaProvider only when the user is signed in.
 * The FAB is suppressed on /welcome, /auth, /reset-password, /terms, /privacy.
 */
const BugArenaMount = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const location = useLocation();
  const suppressedRoutes = ['/welcome', '/auth', '/reset-password', '/terms', '/privacy', '/accessibility', '/console'];
  const suppressed = suppressedRoutes.some((p) => location.pathname.startsWith(p));

  if (!user) return <>{children}</>;

  return (
    <BugArenaProvider
      supabase={supabase}
      user={{
        id: user.id,
        display_name: (user.user_metadata?.display_name as string | undefined) ?? user.email ?? null,
        avatar_url: (user.user_metadata?.avatar_url as string | undefined) ?? null,
      }}
      accent="#f5c542"
      sectionResolver={mapRouteToHebrewArea}
      onReported={() => toast.success('הדיווח נשלח, תודה!')}
    >
      {children}
      {/* FAB removed — bug report is now in the sidebar navigation */}
    </BugArenaProvider>
  );
};

// Dev-only registry/matrix audit panel — lazy so it never ships in normal flow.
const RegistryAuditPanel = lazy(() => import("@/components/trading/dev/RegistryAuditPanel"));

// Bootstrap-time invariant check (no-op in production unless issues exist).
if (typeof window !== 'undefined') {
  try { assertRegistryIntegrity(); } catch { /* ignore */ }
}


const queryClient = new QueryClient();

/**
 * Global client-side protection layer.
 * Blocks right-click and common DevTools keyboard shortcuts across every route.
 * Form/input typing is unaffected — only inspection/source-view keys are intercepted.
 */
const SourceProtection = () => {
  useEffect(() => {
    const onCtx = (e: MouseEvent) => { e.preventDefault(); };
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key;
      const K = k.toUpperCase();
      // F12 — DevTools
      if (k === 'F12') { e.preventDefault(); e.stopPropagation(); return; }
      // Ctrl/Cmd+Shift+I/J/C — Inspect / Console / Element selector
      if (mod && e.shiftKey && (K === 'I' || K === 'J' || K === 'C')) { e.preventDefault(); e.stopPropagation(); return; }
      // macOS: Cmd+Option (Alt) + I/J/C
      if (e.metaKey && e.altKey && (K === 'I' || K === 'J' || K === 'C')) { e.preventDefault(); e.stopPropagation(); return; }
      // Ctrl+U / Cmd+Option+U — View source
      if ((mod && K === 'U') || (e.metaKey && e.altKey && K === 'U')) { e.preventDefault(); e.stopPropagation(); return; }
    };
    document.addEventListener('contextmenu', onCtx);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('contextmenu', onCtx);
      document.removeEventListener('keydown', onKey, true);
    };
  }, []);
  return null;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <ActivePortfolioProvider>
            <a href="#main" className="orca-skip-link">דלג לתוכן · Skip to content</a>
            <SourceProtection />
            <StorageErrorListener />
            {/* Ambient UX layer is non-critical; isolate so a chunk-load error
                here can never tank the entire tab on first paint. */}
            <ErrorBoundary>
              <Suspense fallback={null}><OrcaUXLayer /></Suspense>
            </ErrorBoundary>
            <LiquidSweep />

            <LegalGate />
            <EconomicAlertBanner />
            <UpgradeModal />
            <CookieConsentRoot />
            <OrcaConfirmRoot />
            <ImportPreflightRoot />
            <BugArenaMount>
            <Routes>
              <Route path="/welcome" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/accessibility" element={<Accessibility />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <Index />
                  </RequireAuth>
                }
              />
              <Route
                path="/bugs"
                element={
                  <RequireAuth>
                    <Suspense fallback={<div style={{ padding: 24, color: '#94a3b8', fontFamily: 'monospace' }}>טוען…</div>}>
                      <BugBoardPage />
                    </Suspense>
                  </RequireAuth>
                }
              />
              {/* Hidden dev-only audit surface — not linked in any menu. */}
              <Route
                path="/dev/audit"
                element={
                  <RequireAuth>
                    <Suspense fallback={<div style={{ padding: 24, color: '#94a3b8', fontFamily: 'monospace' }}>Loading audit…</div>}>
                      <RegistryAuditPanel />
                    </Suspense>
                  </RequireAuth>
                }
              />
              <Route
                path="/console"
                element={
                  <RequireAuth>
                    <RequireAdmin>
                      <Suspense fallback={<div style={{ padding: 24, color: '#94a3b8', fontFamily: 'monospace' }}>Loading console…</div>}>
                        <OrcaConsolePage />
                        <ConsoleBackButton />
                      </Suspense>
                    </RequireAdmin>
                  </RequireAuth>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BugArenaMount>
            </ActivePortfolioProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
