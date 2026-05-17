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

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <StorageErrorListener />
            <OrcaUXLayer />
            <LiquidSweep />
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <Index />
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
