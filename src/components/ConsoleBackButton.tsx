// =====================================================================
//  ConsoleBackButton — floating "back to app" pill on /console.
//  Placed top-start so it never collides with the console's own header.
//  Pure presentation; no business logic.
// =====================================================================
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const ConsoleBackButton = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/")}
      title="Back to Orca"
      aria-label="Back to Orca"
      style={{
        position: "fixed",
        bottom: "calc(16px + env(safe-area-inset-bottom))",
        insetInlineStart: 16,
        zIndex: 100000,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px 8px 10px",
        borderRadius: 999,
        background: "rgba(15, 27, 45, 0.92)",
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.18)",
        boxShadow: "0 6px 22px rgba(0,0,0,0.35)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        fontFamily: "'Poppins', system-ui, sans-serif",
        fontSize: 12.5,
        fontWeight: 700,
        letterSpacing: 0.2,
        cursor: "pointer",
      }}
    >
      <ArrowLeft size={14} strokeWidth={2.4} />
      <span>חזרה ל-Orca · Back</span>
    </button>
  );
};
