import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OrcaUXLayer, LiquidSweep } from "@/components/ui-orca";
import { AuthProvider } from "@/hooks/use-auth";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { StorageErrorListener } from "@/components/StorageErrorListener";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import { LegalGate } from "@/components/LegalGate";
import { BybitLiveProvider } from "@/providers/BybitLiveProvider";

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
            <SourceProtection />
            <StorageErrorListener />
            <OrcaUXLayer />
            <LiquidSweep />
            <LegalGate />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<Terms />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <BybitLiveProvider>
                      <Index />
                    </BybitLiveProvider>
                  </RequireAuth>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
