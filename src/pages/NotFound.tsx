import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { useLang } from "@/hooks/use-lang";

/**
 * ORCA 404 — cinematic "lost in the deep" page.
 * Pure CSS animations (no extra deps), bilingual, semantic tokens only.
 * Aesthetic: dark abyss, drifting sonar rings, glitching 404 glyph, drifting orca silhouette.
 */
const NotFound = () => {
  const location = useLocation();
  const { t, isRTL } = useLang();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-[#061326] text-foreground"
    >
      {/* deep ocean gradient backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(200_60%_15%/0.6),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent,#020812_90%)]" />

      {/* drifting particles / bubbles */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 18 }).map((_, i) => (
          <span
            key={i}
            className="orca-bubble"
            style={{
              left: `${(i * 53) % 100}%`,
              animationDelay: `${(i * 0.7) % 9}s`,
              animationDuration: `${10 + ((i * 1.3) % 10)}s`,
              width: `${4 + (i % 5) * 2}px`,
              height: `${4 + (i % 5) * 2}px`,
            }}
          />
        ))}
      </div>

      {/* sonar rings */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="orca-sonar" />
        <span className="orca-sonar" style={{ animationDelay: "1.2s" }} />
        <span className="orca-sonar" style={{ animationDelay: "2.4s" }} />
      </div>

      {/* main content */}
      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center px-6 text-center">
        {/* glitch 404 */}
        <h1
          className="orca-glitch select-none font-bold leading-none tracking-tight text-foreground"
          style={{ fontSize: "clamp(6rem, 18vw, 12rem)" }}
          data-text="404"
        >
          404
        </h1>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-primary">
            {t("אות אבד · SONAR LOST", "SIGNAL LOST · SONAR")}
          </span>
        </div>

        <h2 className="mt-6 text-2xl font-semibold text-foreground sm:text-3xl">
          {t("הדף הזה שט אל המעמקים", "This page drifted into the deep")}
        </h2>
        <p className="mt-3 max-w-md text-base text-muted-foreground">
          {t(
            "לא הצלחנו לאתר את היעד שביקשת. גם הסונאר שלנו מחפש — בינתיים נחזיר אותך הביתה.",
            "We couldn't locate the route you requested. Even our sonar is searching — let's bring you back to base.",
          )}
        </p>

        {/* route badge */}
        <code className="mt-4 max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-border/50 bg-background/40 px-3 py-1 font-mono text-xs text-muted-foreground">
          {location.pathname}
        </code>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] active:scale-100"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            <span className="relative">{t("חזרה הביתה", "Return to Home")}</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background/40 px-6 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-background/70"
          >
            {t("חזרה אחורה", "Go Back")}
          </button>
        </div>
      </div>

      {/* drifting orca silhouette */}
      <svg
        className="orca-drift pointer-events-none absolute bottom-10 opacity-30"
        viewBox="0 0 200 80"
        width="180"
        fill="currentColor"
        aria-hidden
      >
        <path d="M10,50 C30,20 70,10 110,25 C140,35 170,30 190,45 C175,55 150,55 130,52 C120,65 95,72 75,65 C55,72 25,68 10,50 Z" />
        <circle cx="150" cy="38" r="2.5" fill="#061326" />
      </svg>

      <style>{`
        .orca-sonar {
          position: absolute;
          left: 0; top: 0;
          width: 80px; height: 80px;
          margin: -40px 0 0 -40px;
          border: 1px solid hsl(var(--primary) / 0.5);
          border-radius: 9999px;
          animation: orca-sonar-pulse 3.6s cubic-bezier(.2,.6,.2,1) infinite;
          opacity: 0;
        }
        @keyframes orca-sonar-pulse {
          0%   { transform: scale(0.4); opacity: 0.9; }
          80%  { opacity: 0.05; }
          100% { transform: scale(6); opacity: 0; }
        }
        .orca-bubble {
          position: absolute;
          bottom: -20px;
          border-radius: 9999px;
          background: hsl(var(--primary) / 0.25);
          box-shadow: 0 0 8px hsl(var(--primary) / 0.35);
          animation: orca-rise linear infinite;
        }
        @keyframes orca-rise {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          15%  { opacity: 0.7; }
          100% { transform: translateY(-110vh) translateX(20px); opacity: 0; }
        }
        .orca-glitch {
          position: relative;
          color: hsl(var(--foreground));
          text-shadow: 0 0 40px hsl(var(--primary) / 0.4);
          animation: orca-float 6s ease-in-out infinite;
        }
        .orca-glitch::before,
        .orca-glitch::after {
          content: attr(data-text);
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .orca-glitch::before {
          color: hsl(var(--primary));
          mix-blend-mode: screen;
          transform: translate(2px, 0);
          animation: orca-glitch-x 3.4s infinite steps(2, end);
          clip-path: polygon(0 0, 100% 0, 100% 45%, 0 45%);
          opacity: 0.85;
        }
        .orca-glitch::after {
          color: hsl(190 90% 60%);
          mix-blend-mode: screen;
          transform: translate(-2px, 0);
          animation: orca-glitch-x 2.6s infinite reverse steps(2, end);
          clip-path: polygon(0 55%, 100% 55%, 100% 100%, 0 100%);
          opacity: 0.7;
        }
        @keyframes orca-glitch-x {
          0%, 92%, 100% { transform: translate(0, 0); }
          93% { transform: translate(3px, -1px); }
          95% { transform: translate(-3px, 1px); }
          97% { transform: translate(2px, 1px); }
        }
        @keyframes orca-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        .orca-drift {
          animation: orca-swim 22s linear infinite;
          color: hsl(var(--primary));
        }
        @keyframes orca-swim {
          0%   { transform: translateX(-30vw) translateY(0) scaleX(1); }
          49%  { transform: translateX(60vw) translateY(-10px) scaleX(1); }
          50%  { transform: translateX(60vw) translateY(-10px) scaleX(-1); }
          99%  { transform: translateX(-30vw) translateY(0) scaleX(-1); }
          100% { transform: translateX(-30vw) translateY(0) scaleX(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .orca-sonar, .orca-bubble, .orca-glitch, .orca-glitch::before, .orca-glitch::after, .orca-drift {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default NotFound;
