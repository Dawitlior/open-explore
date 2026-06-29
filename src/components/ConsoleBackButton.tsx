// =====================================================================
//  ConsoleBackButton — minimal icon-only "back to app" chip on /console.
//  Floats at the TOP-START corner, just below the safe-area inset, so it
//  no longer collides with the dashboard's top header nor with the mobile
//  bottom tab bar / footer content.
// =====================================================================
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const ConsoleBackButton = () => {
  const navigate = useNavigate();
  // On mobile the shell renders its own in-header back arrow, so hide this floater.
  if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
    return null;
  }
  return (
    <button
      onClick={() => navigate("/")}
      title="Back to Orca"
      aria-label="Back to Orca"
      style={{
        position: "fixed",
        top: "calc(10px + env(safe-area-inset-top))",
        insetInlineStart: "calc(10px + env(safe-area-inset-left))",
        zIndex: 100000,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        padding: 0,
        borderRadius: 10,
        background: "rgba(15, 27, 45, 0.78)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        cursor: "pointer",
        opacity: 0.85,
        transition: "opacity .15s ease, transform .12s ease",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.85"; }}
    >
      <ArrowLeft size={16} strokeWidth={2.4} />
    </button>
  );
};
