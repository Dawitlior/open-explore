import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Activity, Grid3x3, ShieldAlert, MoreHorizontal, X, ArrowLeft,
  SlidersHorizontal, Download, Sun, Moon, Globe, FileText, Database, ChevronLeft,
  Repeat, GitMerge, CreditCard, Brain, TrendingUp, Layers, FileCheck, Server, Terminal,
  RefreshCw,
} from "lucide-react";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { PullToRefreshIndicator } from "@/components/trading/PullToRefreshIndicator";

const SANS = "'Poppins', 'Heebo', system-ui, -apple-system, sans-serif";
const MONO = "ui-monospace, 'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace";

/* The 4 primary mobile tabs (everything else lives in More). */
const PRIMARY = [
  { id: "overview", labelKey: "navOverview", icon: LayoutDashboard },
  { id: "activity", labelKey: "navActivity", icon: Activity },
  { id: "matrix",   labelKey: "navMatrix",   icon: Grid3x3 },
  { id: "risk",     labelKey: "navRisk",     icon: ShieldAlert },
];

/* ────────────────────────────────────────────────────────────────────
   Bottom Sheet — iOS-style. Grabber + slide-up + tap-out to dismiss.
   Drag-to-dismiss on the grabber for that native feel.
   ──────────────────────────────────────────────────────────────────── */
function Sheet({ open, onClose, title, children, C }) {
  const startY = useRef(0);
  const dy = useRef(0);
  const panelRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  const onPointerDown = (e) => { startY.current = e.clientY; dy.current = 0; };
  const onPointerMove = (e) => {
    if (!startY.current) return;
    const d = e.clientY - startY.current;
    if (d > 0 && panelRef.current) { dy.current = d; panelRef.current.style.transform = `translateY(${d}px)`; }
  };
  const onPointerUp = () => {
    if (panelRef.current) {
      if (dy.current > 90) onClose();
      else panelRef.current.style.transform = "translateY(0)";
    }
    startY.current = 0; dy.current = 0;
  };

  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 90000, background: "rgba(2,6,15,0.55)",
      backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-end",
      animation: "sheetFade .22s ease",
    }}>
      <div ref={panelRef} onClick={(e) => e.stopPropagation()} style={{
        width: "100%", background: C.panel,
        borderTopLeftRadius: 22, borderTopRightRadius: 22,
        maxHeight: "86vh", display: "flex", flexDirection: "column",
        boxShadow: "0 -10px 40px rgba(0,0,0,0.35)",
        animation: "sheetUp .28s cubic-bezier(.2,.8,.2,1)",
        paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
      }}>
        <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
          style={{ padding: "10px 0 6px", display: "flex", justifyContent: "center", touchAction: "none", cursor: "grab" }}>
          <span style={{ width: 38, height: 4, borderRadius: 99, background: C.borderStrong }} />
        </div>
        {title && (
          <div style={{ padding: "4px 18px 12px", fontFamily: SANS, fontWeight: 700, fontSize: 17, color: C.ink }}>
            {title}
          </div>
        )}
        <div className="m-scroll" style={{ overflowY: "auto", padding: "0 18px 8px", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────── */
export default function MobileConsoleShell({
  C, theme, setTheme, lang, setLang, rtl, t,
  active, setActive, GROUPS,
  F, setF, rangeOpts, assetOpts, tierOpts,
  SECTION, activeLabel, doExport, doPrint,
  filteredCount, live, nf,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pageKey, setPageKey] = useState(active);
  const [fading, setFading] = useState(false);

  // Lock horizontal scrolling at the shell level — nothing should overflow.
  useEffect(() => {
    const prev = document.documentElement.style.overflowX;
    document.documentElement.style.overflowX = "hidden";
    return () => { document.documentElement.style.overflowX = prev; };
  }, []);

  // Smooth fade between sections (respects reduced-motion).
  useEffect(() => {
    if (pageKey === active) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setPageKey(active); return; }
    setFading(true);
    const t1 = setTimeout(() => { setPageKey(active); setFading(false); window.scrollTo({ top: 0, behavior: "auto" }); }, 140);
    return () => clearTimeout(t1);
  }, [active, pageKey]);

  // Pull-to-refresh: re-fetch live data by reloading the route's data sources.
  // useAdminLive polls; trigger a hard refresh of the page-level data via a
  // bump key. We just resolve after a short delay so the indicator animates,
  // and let the existing 30s poll pick up new data.
  const ptr = usePullToRefresh({
    enabled: true,
    threshold: 64,
    onRefresh: () => new Promise((r) => setTimeout(r, 700)),
  });

  const navigate = useNavigate();
  const allPages = GROUPS.flatMap((g) => g.pages.map(([id, label, Icon]) => ({
    id, label: t(label), groupId: g.id, groupLabel: t(g.label), Icon,
  })));
  const primaryIds = new Set(PRIMARY.map((p) => p.id));
  const activeIsPrimary = primaryIds.has(active);
  const moreActive = !activeIsPrimary;

  // Title for the top bar — short label of current section.
  const currentLabel = allPages.find((p) => p.id === active)?.label || t(activeLabel || "navOverview");

  const filtersDirty = F.range !== "all" || F.asset !== "all" || F.tier !== "all";

  return (
    <div dir={rtl ? "rtl" : "ltr"} lang={lang} style={{
      direction: rtl ? "rtl" : "ltr", minHeight: "100vh",
      background: C.appBg, color: C.ink, fontFamily: SANS,
      paddingTop: "env(safe-area-inset-top)",
      paddingInlineStart: "env(safe-area-inset-left)",
      paddingInlineEnd: "env(safe-area-inset-right)",
      WebkitTapHighlightColor: "transparent",
    }}>
      <style>{`
        @keyframes sheetUp { from { transform: translateY(100%);} to { transform: translateY(0);} }
        @keyframes sheetFade { from { opacity:0;} to { opacity:1;} }
        @keyframes mcFadeIn { from { opacity:0; transform: translateY(6px);} to { opacity:1; transform: translateY(0);} }
        @keyframes mcShimmer { 0% { background-position: -200px 0;} 100% { background-position: 200px 0;} }
        @keyframes orca-spin { from { transform: rotate(0);} to { transform: rotate(360deg);} }
        .mconsole-tap { transition: background .15s ease, transform .12s ease; }
        .mconsole-tap:active { transform: scale(.97); }
        @media (prefers-reduced-motion: reduce) {
          .mconsole-tap, .mconsole-content * { animation: none !important; transition: none !important; }
        }
        .mconsole-content input, .mconsole-content select, .mconsole-content textarea { font-size: 16px !important; }
        @media (max-width: 768px) {
          .mconsole-content { font-size: 14px; }
          .mconsole-content [style*="grid-template-columns: repeat(4"],
          .mconsole-content [style*="grid-template-columns: repeat(3"] { grid-template-columns: repeat(2, minmax(0,1fr)) !important; }
          .mconsole-content [style*="grid-template-columns: repeat(2"] { grid-template-columns: 1fr !important; }
          .mconsole-content table { font-size: 12px; width: 100%; }
          /* Wide tables → horizontal-scroll containers, not page-overflow */
          .mconsole-content .table-wrap, .mconsole-content [class*="overflow"] { -webkit-overflow-scrolling: touch; }
          .mconsole-content table th, .mconsole-content table td { white-space: nowrap; padding: 8px 10px !important; }
          .mconsole-content .recharts-wrapper { font-size: 10px; }
          .mconsole-content .recharts-responsive-container { max-width: 100% !important; }
        }
      `}</style>

      {/* ─── Top App Bar ─── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: C.panel + "ee", backdropFilter: "saturate(180%) blur(14px)",
        WebkitBackdropFilter: "saturate(180%) blur(14px)",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", gap: 8,
        padding: "10px 14px", minHeight: 52,
      }}>
        <button
          onClick={() => navigate("/")}
          aria-label={rtl ? "חזרה לאורקה" : "Back to Orca"}
          title={rtl ? "חזרה לאורקה" : "Back to Orca"}
          className="mconsole-tap"
          style={{
            width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`,
            background: "transparent", color: C.ink2, display: "grid", placeItems: "center",
            cursor: "pointer", flexShrink: 0,
          }}
        >
          {rtl ? <ArrowLeft size={18} style={{ transform: "scaleX(-1)" }} /> : <ArrowLeft size={18} />}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: C.blueSoft, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <Grid3x3 size={16} color={C.accent} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.ink, letterSpacing: -0.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentLabel}</div>
            <div style={{ fontSize: 10, color: C.ink3, fontFamily: MONO }}>
              {live.loading ? "LIVE…" : `LIVE · ${nf.format(filteredCount)} traders`}
            </div>
          </div>
        </div>
        <button onClick={() => setFiltersOpen(true)} aria-label="Filters" className="mconsole-tap" style={{
          width: 38, height: 38, borderRadius: 10, border: `1px solid ${filtersDirty ? C.accent : C.border}`,
          background: filtersDirty ? C.blueSoft : "transparent", color: filtersDirty ? C.accent : C.ink2,
          display: "grid", placeItems: "center", cursor: "pointer", position: "relative",
        }}>
          <SlidersHorizontal size={16} />
          {filtersDirty && <span style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: 99, background: C.accent }} />}
        </button>
        <button onClick={() => setExportOpen(true)} aria-label="Actions" className="mconsole-tap" style={{
          width: 38, height: 38, borderRadius: 10, border: `1px solid ${C.border}`, background: "transparent",
          color: C.ink2, display: "grid", placeItems: "center", cursor: "pointer",
        }}>
          <MoreHorizontal size={18} />
        </button>
      </header>

      {/* ─── Content (with pull-to-refresh) ─── */}
      <main
        ref={ptr.ref}
        className="mconsole-content"
        style={{
          padding: "16px 14px",
          paddingBottom: "calc(72px + env(safe-area-inset-bottom) + 16px)",
          maxWidth: "100%", overflowX: "hidden", overflowY: "auto",
          WebkitOverflowScrolling: "touch", overscrollBehavior: "contain",
          position: "relative", minHeight: "calc(100vh - 110px)",
        }}
      >
        <PullToRefreshIndicator pull={ptr.pull} progress={ptr.progress} refreshing={ptr.refreshing} color={C.accent} />
        <div
          key={pageKey}
          style={{
            transform: ptr.pull ? `translate3d(0, ${ptr.pull}px, 0)` : undefined,
            transition: ptr.refreshing ? "transform .28s cubic-bezier(.16,1,.3,1)" : "none",
            opacity: fading ? 0 : 1,
            animation: fading ? undefined : "mcFadeIn .22s ease-out",
          }}
        >
          {live.loading && !live.lastUpdated ? <ConsoleSkeleton C={C} /> : SECTION}
        </div>
      </main>

      {/* ─── Bottom Tab Bar ─── */}
      <nav style={{
        position: "fixed", insetInlineStart: 0, insetInlineEnd: 0, bottom: 0, zIndex: 60,
        background: C.panel + "f2", backdropFilter: "saturate(180%) blur(18px)",
        WebkitBackdropFilter: "saturate(180%) blur(18px)",
        borderTop: `1px solid ${C.border}`,
        paddingBottom: "env(safe-area-inset-bottom)",
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
      }}>
        {PRIMARY.map((it) => {
          const on = active === it.id;
          const Icon = it.icon;
          return (
            <button key={it.id} onClick={() => setActive(it.id)} className="mconsole-tap" style={{
              background: "none", border: "none", cursor: "pointer",
              minHeight: 56, padding: "8px 0 6px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
              color: on ? C.accent : C.ink3, userSelect: "none",
            }}>
              <Icon size={20} strokeWidth={on ? 2.4 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: on ? 700 : 500, letterSpacing: 0.1 }}>{t(it.labelKey)}</span>
            </button>
          );
        })}
        <button onClick={() => setMoreOpen(true)} className="mconsole-tap" style={{
          background: "none", border: "none", cursor: "pointer",
          minHeight: 56, padding: "8px 0 6px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
          color: moreActive ? C.accent : C.ink3, userSelect: "none",
        }}>
          <MoreHorizontal size={20} strokeWidth={moreActive ? 2.4 : 1.8} />
          <span style={{ fontSize: 10, fontWeight: moreActive ? 700 : 500 }}>{rtl ? "עוד" : "More"}</span>
        </button>
      </nav>

      {/* ─── More Sheet (all 16 sections grouped) ─── */}
      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={rtl ? "כל המסכים" : "All sections"} C={C}>
        {GROUPS.map((g) => (
          <div key={g.id} style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.ink3, letterSpacing: 0.7, textTransform: "uppercase", padding: "4px 4px 8px" }}>
              {t(g.label)}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {g.pages.map(([id, label, Icon]) => {
                const on = active === id;
                return (
                  <button key={id} onClick={() => { setActive(id); setMoreOpen(false); }} className="mconsole-tap" style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%",
                    padding: "12px 12px", borderRadius: 12, border: "none",
                    background: on ? C.blueSoft : C.panelAlt, color: on ? C.accent : C.ink,
                    cursor: "pointer", textAlign: "start", fontSize: 14, fontWeight: on ? 650 : 500,
                  }}>
                    <Icon size={17} color={on ? C.accent : C.ink2} />
                    <span style={{ flex: 1 }}>{t(label)}</span>
                    {on && <span style={{ fontSize: 18, color: C.accent }}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Sheet>

      {/* ─── Filters Sheet ─── */}
      <Sheet open={filtersOpen} onClose={() => setFiltersOpen(false)} title={rtl ? "סינון" : "Filters"} C={C}>
        <FilterGroup C={C} label={rtl ? "תקופה" : "Period"} value={F.range} options={rangeOpts} onChange={(v) => setF({ ...F, range: v })} />
        <FilterGroup C={C} label={rtl ? "נכס" : "Asset"} value={F.asset} options={assetOpts} onChange={(v) => setF({ ...F, asset: v })} />
        <FilterGroup C={C} label={rtl ? "מסלול" : "Tier"} value={F.tier} options={tierOpts} onChange={(v) => setF({ ...F, tier: v })} />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => setF({ range: "all", asset: "all", tier: "all" })} style={{
            flex: 1, padding: "14px", borderRadius: 12, border: `1px solid ${C.border}`,
            background: "transparent", color: C.ink2, cursor: "pointer", fontSize: 14, fontWeight: 600,
          }}>{rtl ? "איפוס" : "Reset"}</button>
          <button onClick={() => setFiltersOpen(false)} style={{
            flex: 2, padding: "14px", borderRadius: 12, border: "none",
            background: C.accent, color: C.appBg, cursor: "pointer", fontSize: 14, fontWeight: 700,
          }}>{rtl ? "החל" : "Apply"}</button>
        </div>
      </Sheet>

      {/* ─── Actions Sheet (theme/lang/export) ─── */}
      <Sheet open={exportOpen} onClose={() => setExportOpen(false)} title={rtl ? "פעולות" : "Actions"} C={C}>
        <ActionRow C={C} icon={theme === "dark" ? Sun : Moon} label={rtl ? (theme === "dark" ? "מצב בהיר" : "מצב כהה") : (theme === "dark" ? "Light mode" : "Dark mode")}
          onClick={() => { setTheme(theme === "dark" ? "light" : "dark"); setExportOpen(false); }} />
        <ActionRow C={C} icon={Globe} label={rtl ? "English" : "עברית"}
          onClick={() => { setLang(rtl ? "en" : "he"); setExportOpen(false); }} />
        <div style={{ height: 1, background: C.border, margin: "12px 0" }} />
        <ActionRow C={C} icon={FileText} label={rtl ? "הדפסה / שמירת PDF" : "Print / Save PDF"}
          onClick={() => { doPrint(); setExportOpen(false); }} />
        <ActionRow C={C} icon={Database} label={rtl ? "ייצוא JSON" : "Export JSON"}
          onClick={() => { doExport(); setExportOpen(false); }} />
      </Sheet>
    </div>
  );
}

function FilterGroup({ C, label, value, options, onChange }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.ink3, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {options.map((o) => {
          const on = value === o.v;
          return (
            <button key={o.v} onClick={() => onChange(o.v)} className="mconsole-tap" style={{
              padding: "10px 14px", borderRadius: 99, border: `1px solid ${on ? C.accent : C.border}`,
              background: on ? C.blueSoft : C.panelAlt, color: on ? C.accent : C.ink2,
              fontSize: 13, fontWeight: on ? 650 : 500, cursor: "pointer", minHeight: 40,
            }}>{o.l}</button>
          );
        })}
      </div>
    </div>
  );
}

function ActionRow({ C, icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick} className="mconsole-tap" style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%",
      padding: "14px 12px", borderRadius: 12, border: "none",
      background: C.panelAlt, color: C.ink, cursor: "pointer", textAlign: "start",
      fontSize: 14.5, fontWeight: 550, marginBottom: 6,
    }}>
      <Icon size={18} color={C.ink2} />
      <span style={{ flex: 1 }}>{label}</span>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────
   Skeleton — shown only on first load (before any data has arrived).
   Mirrors the typical ORCA Console layout: KPI strip + 2 chart cards.
   ──────────────────────────────────────────────────────────────────── */
function ConsoleSkeleton({ C }) {
  const block = (h, w = "100%") => (
    <div style={{
      height: h, width: w, borderRadius: 10,
      background: `linear-gradient(90deg, ${C.panelAlt} 0%, ${C.border} 50%, ${C.panelAlt} 100%)`,
      backgroundSize: "400px 100%",
      animation: "mcShimmer 1.4s ease-in-out infinite",
    }} />
  );
  const card = (children) => (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, display: "grid", gap: 10 }}>
      {children}
    </div>
  );
  return (
    <div style={{ display: "grid", gap: 12 }} aria-busy="true" aria-label="Loading">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14, display: "grid", gap: 10 }}>
            {block(10, "50%")}
            {block(24, "70%")}
            {block(8, "40%")}
          </div>
        ))}
      </div>
      {card(<>{block(12, "40%")}{block(160)}</>)}
      {card(<>{block(12, "55%")}{block(120)}</>)}
    </div>
  );
}

