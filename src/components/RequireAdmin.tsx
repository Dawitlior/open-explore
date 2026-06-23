// =====================================================================
//  RequireAdmin — gates a route to admin users only.
//  Uses the existing public.has_role(_user_id, 'admin') RPC.
//  Non-admins get a clean 404-style block; unauthenticated users are sent
//  through RequireAuth (compose: <RequireAuth><RequireAdmin>...).
// =====================================================================
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { OrcaBootLoader } from "@/components/OrcaBootLoader";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

export const RequireAdmin = ({ children, fallback }: Props) => {
  const { user } = useAuth();
  const [state, setState] = useState<"checking" | "allow" | "deny">("checking");

  useEffect(() => {
    let alive = true;
    if (!user) {
      setState("deny");
      return;
    }
    supabase
      .rpc("has_role", { _user_id: user.id, _role: "admin" })
      .then(({ data, error }) => {
        if (!alive) return;
        setState(!error && data === true ? "allow" : "deny");
      });
    return () => {
      alive = false;
    };
  }, [user]);

  if (state === "checking") {
    return <OrcaBootLoader label="Verifying access" />;
  }
  if (state === "deny") {
    return (
      fallback ?? (
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            background: "#061326",
            color: "#94a3b8",
            fontFamily: "monospace",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 18, color: "#f5c542", marginBottom: 8 }}>
              403 · Restricted
            </div>
            <div>אין לך הרשאת גישה למסוף הניהול.</div>
          </div>
        </div>
      )
    );
  }
  return <>{children}</>;
};
