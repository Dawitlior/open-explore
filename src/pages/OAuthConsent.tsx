import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Typed wrapper — supabase.auth.oauth is currently a beta namespace not yet in
// the generated types. Cast once, use everywhere else via this shim.
type OAuthNs = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: { message: string } | null }>;
};
const oauth = () => ((supabase.auth as unknown as { oauth: OAuthNs }).oauth);

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const res = await oauth().getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (res.error) return setError(res.error.message);
        const immediate = res.data?.redirect_url ?? res.data?.redirect_to;
        if (immediate && !res.data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(res.data);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load authorization");
      }
    })();
    return () => { active = false; };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const res = approve
        ? await oauth().approveAuthorization(authorizationId)
        : await oauth().denyAuthorization(authorizationId);
      if (res.error) { setBusy(false); return setError(res.error.message); }
      const target = res.data?.redirect_url ?? res.data?.redirect_to;
      if (!target) { setBusy(false); return setError("No redirect returned by the authorization server."); }
      window.location.href = target;
    } catch (e: any) {
      setBusy(false);
      setError(e?.message ?? "Failed to submit decision");
    }
  }

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    background: "#061326",
    color: "#e7ecf5",
    fontFamily: "'Poppins', system-ui, sans-serif",
    display: "grid",
    placeItems: "center",
    padding: 24,
  };
  const card: React.CSSProperties = {
    maxWidth: 480,
    width: "100%",
    background: "rgba(15,25,45,0.9)",
    border: "1px solid rgba(212,175,90,0.25)",
    borderRadius: 16,
    padding: 32,
    boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
  };
  const btn = (primary: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "12px 16px",
    borderRadius: 10,
    border: primary ? "1px solid #d4af5a" : "1px solid rgba(255,255,255,0.15)",
    background: primary ? "linear-gradient(135deg,#d4af5a,#a8862d)" : "transparent",
    color: primary ? "#0b0f1a" : "#e7ecf5",
    fontWeight: 600,
    cursor: busy ? "wait" : "pointer",
    opacity: busy ? 0.6 : 1,
  });

  if (error) {
    return (
      <div style={shell}>
        <div style={card}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Authorization error</h1>
          <p style={{ color: "#9a9381", lineHeight: 1.55 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!details) {
    return (
      <div style={shell}>
        <div style={card}>
          <p style={{ color: "#9a9381" }}>Loading authorization…</p>
        </div>
      </div>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "an external app";

  return (
    <div style={shell}>
      <div style={card}>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>Connect <span style={{ color: "#d4af5a" }}>{clientName}</span></h1>
        <p style={{ color: "#9a9381", lineHeight: 1.55, marginBottom: 24 }}>
          This will let <strong>{clientName}</strong> read your ORCA trades, portfolios, and macro radar
          on your behalf through the agent integration.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button disabled={busy} onClick={() => decide(false)} style={btn(false)}>Deny</button>
          <button disabled={busy} onClick={() => decide(true)} style={btn(true)}>Approve</button>
        </div>
      </div>
    </div>
  );
}
