// =====================================================================
//  ORCA · BUG ARENA — Reference components  (functional scaffolding)
// =====================================================================
//  These are WORKING but intentionally lightly styled. They prove the
//  full data flow end-to-end. Lovable will reskin them to match ORCA
//  (see LOVABLE_INTEGRATION_BRIEF.md). Rules for the reskin:
//    • Keep every data-bug-* hook and the logic/props contracts.
//    • Restyle freely: classes, layout, motion, fonts, colors.
//    • Don't move logic into the markup.
// =====================================================================
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useBugCapture, type UseBugCapture, type SubmitArgs } from './useBugCapture';
import { useBugReports } from './useBugReports';
import { createBugArenaService } from './bugArenaService';
import type { AnnoStroke, AnnoTool } from './bugCaptureEngine';
import {
  BUG_TYPE_LABEL,
  SEVERITY_LABEL,
  STATUS_LABEL,
  bugTypeLabel,
  severityLabel,
  statusLabel,
  type BugComment,
  type BugReporter,
  type BugSeverity,
  type BugStatus,
  type BugType,
  type BugWithMeta,
} from './bugArenaTypes';
import { useLang } from '@/hooks/use-lang';

const ACCENT = '#f5c542'; // ORCA gold
const CYAN = '#37e0c6';

// ---------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------
export interface ArenaUser {
  id: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

function formatDateTime(iso: string, lang: 'he' | 'en' = 'he'): string {
  try {
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function timeAgo(iso: string, lang: 'he' | 'en' = 'he'): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (lang === 'en') {
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }
  if (s < 60) return 'הרגע';
  if (s < 3600) return `לפני ${Math.floor(s / 60)} ד׳`;
  if (s < 86400) return `לפני ${Math.floor(s / 3600)} ש׳`;
  return `לפני ${Math.floor(s / 86400)} י׳`;
}


function initials(name?: string | null): string {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return (p[0]?.[0] || '') + (p[1]?.[0] || '');
}

// =====================================================================
// Context / Provider
// =====================================================================
interface ArenaCtx {
  supabase: SupabaseClient;
  user: ArenaUser;
  accent: string;
  capture: UseBugCapture;
}
const Ctx = createContext<ArenaCtx | null>(null);
export function useArena(): ArenaCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('Wrap your app in <BugArenaProvider>');
  return v;
}

export function BugArenaProvider({
  supabase,
  user,
  accent = ACCENT,
  sectionResolver,
  onReported,
  children,
}: {
  supabase: SupabaseClient;
  user: ArenaUser;
  accent?: string;
  sectionResolver?: (route: string) => string;
  onReported?: (bugId: string) => void;
  children: React.ReactNode;
}) {
  const capture = useBugCapture(supabase, user.id, {
    accent,
    sectionResolver,
    onDone: onReported,
  });
  const value = useMemo(
    () => ({ supabase, user, accent, capture }),
    [supabase, user, accent, capture]
  );
  return (
    <Ctx.Provider value={value}>
      {children}
      <CaptureFlow />
    </Ctx.Provider>
  );
}

// =====================================================================
// FAB — the single entry point
// =====================================================================
export function BugReportFab() {
  const { capture, accent } = useArena();
  const { isRTL, t } = useLang();
  const open = capture.stage !== 'idle';
  const label = t('דווח על באג', 'Report a bug');
  return (
    <button
      data-bug-fab
      aria-label={label}
      onClick={() => !open && capture.beginCapture()}
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed z-[1000] bottom-5 left-5 flex items-center gap-2 rounded-full px-4 py-3 font-bold shadow-2xl transition active:scale-95"
      style={{ backgroundColor: accent, color: '#06121f' }}
    >
      <TargetIcon />
      <span className="text-sm">{label}</span>
    </button>
  );
}


// =====================================================================
// CaptureFlow — the report modal (rendered by the provider)
// =====================================================================
function CaptureFlow() {
  const { capture, user } = useArena();
  const { lang, isRTL, t } = useLang();
  const { stage, draft, similar, busy, error } = capture;

  const [description, setDescription] = useState('');
  const [bugType, setBugType] = useState<BugType>('visual');
  const [severity, setSeverity] = useState<BugSeverity>('medium');
  const [strokes, setStrokes] = useState<AnnoStroke[]>([]);
  const [tool, setTool] = useState<AnnoTool>('rect');
  const [color, setColor] = useState<string>(ACCENT);
  const [extra, setExtra] = useState<File | null>(null);

  // reset form whenever a new draft opens
  useEffect(() => {
    if (stage === 'draft' && draft) {
      setDescription('');
      setBugType('visual');
      setSeverity('medium');
      setStrokes([]);
      setExtra(null);
    }
  }, [stage, draft?.context.capturedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (stage !== 'draft' && stage !== 'submitting') return null;
  if (!draft) return null;

  const submit = () => {
    const args: SubmitArgs = {
      description,
      bug_type: bugType,
      severity,
      section: draft.section,
      annotations: strokes,
      extraImage: extra,
    };
    capture.submit(args);
  };

  return (
    <div
      data-bug-capture-modal
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[1001] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={capture.cancel}
    >
      <div
        className="relative w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[#0b111b] text-[#e8edf5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-[#0b111b]/95 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <TargetIcon />
            <h2 className="text-lg font-extrabold">{t('דיווח על באג', 'Report a bug')}</h2>
          </div>
          <button
            onClick={capture.cancel}
            className="rounded-full px-2 py-1 text-2xl leading-none text-white/50 hover:text-white"
            aria-label={t('סגור', 'Close')}
          >
            ×
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* context chips — section + picked element (auto, no clicks) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1 font-semibold">
              {t('אזור', 'Area')}: {draft.section}
            </span>
            {draft.pick?.label && (
              <span
                className="max-w-full truncate rounded-full px-3 py-1 font-mono"
                style={{ background: '#10202c', color: CYAN, direction: 'ltr' }}
                title={draft.pick.selector}
              >
                {draft.pick.label}
              </span>
            )}
            {!draft.pick && (
              <button
                onClick={capture.beginCapture}
                className="rounded-full border border-dashed border-white/25 px-3 py-1 hover:border-white/50"
              >
                {t('+ סמן את האלמנט הפגום', '+ Mark the broken element')}
              </button>
            )}
          </div>

          {/* dedup suggestions */}
          {similar.length > 0 && (
            <DedupSuggestions
              similar={similar}
              busy={busy}
              onJoin={(b) => capture.joinSimilar(b)}
            />
          )}

          {/* screenshot + annotation */}
          {draft.shot ? (
            <div data-bug-annotate>
              <AnnotationToolbar
                tool={tool}
                color={color}
                onTool={setTool}
                onColor={setColor}
                onUndo={() => setStrokes((s) => s.slice(0, -1))}
                onClear={() => setStrokes([])}
              />
              <AnnotationCanvas
                imageUrl={draft.shot.dataUrl}
                strokes={strokes}
                onChange={setStrokes}
                tool={tool}
                color={color}
              />
              <p className="mt-1 text-xs text-white/40">
                {t('סמן על הצילום מה שבור — חץ, מסגרת או קו חופשי.', 'Mark what is broken on the screenshot — arrow, box or freehand.')}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/50">
              {t('לוכד צילום מסך…', 'Capturing screenshot…')}
            </div>
          )}

          {/* description (the only required field) */}
          <div>
            <label className="mb-1 block text-sm font-semibold">
              {t('מה קרה?', 'What happened?')} <span style={{ color: ACCENT }}>*</span>
            </label>
            <textarea
              data-bug-description
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              autoFocus
              placeholder={t('תאר בקצרה את הבאג…', 'Briefly describe the bug…')}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-[var(--a)]"
              style={{ ['--a' as any]: ACCENT }}
            />
          </div>

          {/* type + severity — one tap each, sensible defaults */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Chips
              label={t('סוג', 'Type')}
              value={bugType}
              onChange={(v) => setBugType(v as BugType)}
              options={(Object.keys(BUG_TYPE_LABEL) as BugType[]).map((v) => ({ v, l: bugTypeLabel(v, lang) }))}
            />
            <Chips
              label={t('חומרה', 'Severity')}
              value={severity}
              onChange={(v) => setSeverity(v as BugSeverity)}
              options={(Object.keys(SEVERITY_LABEL) as BugSeverity[]).map((v) => ({ v, l: severityLabel(v, lang) }))}
            />
          </div>

          {/* optional extra image */}
          <div className="flex items-center gap-3">
            <label className="cursor-pointer rounded-xl border border-white/15 px-3 py-2 text-sm hover:border-white/40">
              {t('📎 צרף תמונה', '📎 Attach image')}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setExtra(e.target.files?.[0] || null)}
              />
            </label>
            {extra && <span className="truncate text-xs text-white/60">{extra.name}</span>}
          </div>

          {error && <div className="text-sm text-red-400">{error}</div>}
        </div>

        {/* footer */}
        <div className="sticky bottom-0 flex gap-3 border-t border-white/10 bg-[#0b111b]/95 px-5 py-4 backdrop-blur">
          <button
            data-bug-submit
            disabled={busy || !description.trim()}
            onClick={submit}
            className="flex-1 rounded-xl py-3 font-extrabold text-[#06121f] transition active:scale-[0.98] disabled:opacity-40"
            style={{ background: ACCENT }}
          >
            {stage === 'submitting' ? t('שולח…', 'Sending…') : t('שלח דיווח', 'Send report')}
          </button>
          <button
            onClick={capture.cancel}
            className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-white/70 hover:text-white"
          >
            {t('ביטול', 'Cancel')}
          </button>
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Dedup suggestions panel
// ---------------------------------------------------------------------
function DedupSuggestions({
  similar,
  busy,
  onJoin,
}: {
  similar: BugWithMeta[];
  busy: boolean;
  onJoin: (b: BugWithMeta) => void;
}) {
  const { lang, t } = useLang();
  return (
    <div
      data-bug-dedup
      className="rounded-xl border p-3"
      style={{ borderColor: `${CYAN}55`, background: '#0d1a20' }}
    >
      <div className="mb-2 text-sm font-bold" style={{ color: CYAN }}>
        {t('אולי זה אותו באג? הצטרף במקום לפתוח חדש:', 'Maybe it\u2019s the same bug? Join instead of opening a new one:')}
      </div>
      <div className="space-y-2">
        {similar.map((b) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="truncate text-sm">{b.title || b.description}</div>
              <div className="text-xs text-white/40">
                {b.reporterCount} {t('מדווחים', 'reporters')} · {timeAgo(b.created_at, lang)}
              </div>
            </div>
            <button
              disabled={busy}
              onClick={() => onJoin(b)}
              className="shrink-0 rounded-full px-3 py-1 text-sm font-bold text-[#06121f]"
              style={{ background: CYAN }}
            >
              {t('גם לי', 'Me too')}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------
// Annotation
// ---------------------------------------------------------------------
function AnnotationToolbar({
  tool,
  color,
  onTool,
  onColor,
  onUndo,
  onClear,
}: {
  tool: AnnoTool;
  color: string;
  onTool: (t: AnnoTool) => void;
  onColor: (c: string) => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  const { t } = useLang();
  const tools: { t: AnnoTool; label: string }[] = [
    { t: 'rect', label: '▭' },
    { t: 'arrow', label: '↗' },
    { t: 'pen', label: '✎' },
  ];
  const colors = [ACCENT, '#ff5470', CYAN, '#ffffff'];
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2">
      {tools.map((x) => (
        <button
          key={x.t}
          onClick={() => onTool(x.t)}
          className="h-8 w-8 rounded-lg text-lg"
          style={{
            background: tool === x.t ? ACCENT : 'rgba(255,255,255,0.08)',
            color: tool === x.t ? '#06121f' : '#e8edf5',
          }}
        >
          {x.label}
        </button>
      ))}
      <span className="mx-1 h-5 w-px bg-white/15" />
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onColor(c)}
          className="h-6 w-6 rounded-full ring-2 ring-offset-2 ring-offset-[#0b111b]"
          style={{ background: c, boxShadow: color === c ? `0 0 0 2px ${c}` : 'none' }}
          aria-label={`${t('צבע', 'Color')} ${c}`}
        />
      ))}
      <span className="mx-1 h-5 w-px bg-white/15" />
      <button onClick={onUndo} className="rounded-lg bg-white/8 px-2 py-1 text-xs">
        {t('בטל', 'Undo')}
      </button>
      <button onClick={onClear} className="rounded-lg bg-white/8 px-2 py-1 text-xs">
        {t('נקה', 'Clear')}
      </button>
    </div>
  );
}


function AnnotationCanvas({
  imageUrl,
  strokes,
  onChange,
  tool,
  color,
}: {
  imageUrl: string;
  strokes: AnnoStroke[];
  onChange: (s: AnnoStroke[]) => void;
  tool: AnnoTool;
  color: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const resize = () => {
    const c = canvasRef.current;
    const w = wrapRef.current;
    if (!c || !w) return;
    c.width = w.clientWidth;
    c.height = w.clientHeight;
    redraw();
  };

  const redraw = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    const lw = Math.max(3, c.width / 200);
    for (const s of strokes) {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = lw;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const pts = s.points.map((p) => ({ x: p.x * c.width, y: p.y * c.height }));
      if (s.tool === 'rect' && pts.length >= 2) {
        const a = pts[0];
        const b = pts[pts.length - 1];
        ctx.strokeRect(
          Math.min(a.x, b.x),
          Math.min(a.y, b.y),
          Math.abs(b.x - a.x),
          Math.abs(b.y - a.y)
        );
      } else if (s.tool === 'arrow' && pts.length >= 2) {
        const a = pts[0];
        const b = pts[pts.length - 1];
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        const head = Math.max(10, lw * 3);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x - head * Math.cos(ang - Math.PI / 6), b.y - head * Math.sin(ang - Math.PI / 6));
        ctx.lineTo(b.x - head * Math.cos(ang + Math.PI / 6), b.y - head * Math.sin(ang + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      } else if (s.tool === 'pen' && pts.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
    }
  };

  useEffect(() => {
    redraw();
  }); // redraw every render (strokes change)

  useEffect(() => {
    resize();
    const ro = new ResizeObserver(resize);
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const norm = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drawing.current = true;
    const p = norm(e);
    onChange([...strokes, { tool, color, points: [p] }]);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = norm(e);
    const next = strokes.slice();
    const cur = { ...next[next.length - 1] };
    if (tool === 'pen') cur.points = [...cur.points, p];
    else cur.points = [cur.points[0], p];
    next[next.length - 1] = cur;
    onChange(next);
  };
  const onUp = () => {
    drawing.current = false;
  };

  return (
    <div
      ref={wrapRef}
      className="relative w-full overflow-hidden rounded-xl border border-white/10"
      style={{ touchAction: 'none' }}
    >
      <img src={imageUrl} alt="screenshot" className="block w-full select-none" draggable={false} />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-crosshair"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      />
    </div>
  );
}

// ---------------------------------------------------------------------
// Generic chip group
// ---------------------------------------------------------------------
function Chips({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <div className="mb-1 text-sm font-semibold">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className="rounded-full px-3 py-1 text-sm transition"
            style={{
              background: value === o.v ? ACCENT : 'rgba(255,255,255,0.08)',
              color: value === o.v ? '#06121f' : '#cdd6e3',
              fontWeight: value === o.v ? 700 : 500,
            }}
          >
            {o.l}
          </button>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
// BOARD
// =====================================================================
export function BugBoard() {
  const { supabase, user, accent } = useArena();
  const { isRTL, t } = useLang();
  const board = useBugReports(supabase, user.id);
  const [openBug, setOpenBug] = useState<BugWithMeta | null>(null);

  const sections = useMemo(() => {
    const set = new Set(board.bugs.map((b) => b.section));
    return ['all', ...Array.from(set)];
  }, [board.bugs]);

  return (
    <div data-bug-board dir={isRTL ? 'rtl' : 'ltr'} className="mx-auto max-w-3xl p-4 text-[#e8edf5]">
      {/* filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={board.filter.search || ''}
          onChange={(e) => board.setFilter({ search: e.target.value })}
          placeholder={t('חיפוש…', 'Search…')}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={() => board.setFilter({ onlyMine: !board.filter.onlyMine })}
          className="rounded-xl px-3 py-2 text-sm font-semibold"
          style={{
            background: board.filter.onlyMine ? accent : 'rgba(255,255,255,0.08)',
            color: board.filter.onlyMine ? '#06121f' : '#cdd6e3',
          }}
        >
          {t('הדיווחים שלי', 'My reports')}
        </button>
      </div>

      {/* section tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => board.setFilter({ section: s })}
            className="shrink-0 rounded-full px-3 py-1 text-sm"
            style={{
              background: (board.filter.section || 'all') === s ? accent : 'rgba(255,255,255,0.08)',
              color: (board.filter.section || 'all') === s ? '#06121f' : '#cdd6e3',
            }}
          >
            {s === 'all' ? t('הכל', 'All') : s}
          </button>
        ))}
      </div>

      {board.loading && <div className="py-10 text-center text-white/40">{t('טוען…', 'Loading…')}</div>}
      {board.error && <div className="py-4 text-center text-red-400">{board.error}</div>}
      {!board.loading && board.bugs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50">
          {t('אין באגים פתוחים כרגע. מצאת אחד? לחץ על "דווח על באג".', 'No open bugs right now. Found one? Click "Report a bug".')}
        </div>
      )}


      {/* grouped cards */}
      <div className="space-y-6">
        {board.grouped.map((g) => (
          <section key={g.section}>
            <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-white/40">
              {g.section} · {g.bugs.length}
            </h3>
            <div className="space-y-3">
              {g.bugs.map((b) => (
                <BugCard
                  key={b.id}
                  bug={b}
                  isAdmin={board.isAdmin}
                  canHardDelete={board.canHardDelete(b)}
                  onJoin={() => board.join(b)}
                  onLeaveOrDelete={() => board.leaveOrDelete(b)}
                  onStatus={(s) => board.setStatus(b, s)}
                  onOpen={() => setOpenBug(b)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {openBug && <BugDetail bugId={openBug.id} onClose={() => setOpenBug(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------
const STATUS_COLOR: Record<BugStatus, string> = {
  open: '#ff5470',
  in_progress: '#f5c542',
  resolved: '#37e0c6',
  wont_fix: '#7c8aa0',
  duplicate: '#7c8aa0',
};

function BugCard({
  bug,
  isAdmin,
  canHardDelete,
  onJoin,
  onLeaveOrDelete,
  onStatus,
  onOpen,
}: {
  bug: BugWithMeta;
  isAdmin: boolean;
  canHardDelete: boolean;
  onJoin: () => void;
  onLeaveOrDelete: () => void;
  onStatus: (s: BugStatus) => void;
  onOpen: () => void;
}) {
  const { lang, isRTL, t } = useLang();
  const [reportersOpen, setReportersOpen] = useState(false);

  return (
    <article
      data-bug-card
      data-bug-id={bug.id}
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20"
    >
      <div className="flex items-start gap-3">
        {bug.coverUrl && (
          <img
            src={bug.coverUrl}
            alt=""
            onClick={onOpen}
            className="h-16 w-16 shrink-0 cursor-pointer rounded-lg object-cover ring-1 ring-white/10"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ background: `${STATUS_COLOR[bug.status]}22`, color: STATUS_COLOR[bug.status] }}
            >
              {statusLabel(bug.status, lang)}
            </span>
            <span className="text-[11px] text-white/40">{bugTypeLabel(bug.bug_type, lang)}</span>
          </div>
          <button onClick={onOpen} className={`mt-1 block ${isRTL ? 'text-right' : 'text-left'}`}>
            <p className="line-clamp-2 text-sm font-semibold">{bug.title || bug.description}</p>
          </button>
          <div className="mt-1 text-[11px] text-white/35" title={formatDateTime(bug.created_at, lang)}>
            {formatDateTime(bug.created_at, lang)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        {/* reporter cluster — the "little people" */}
        <button
          data-bug-reporters
          onClick={() => setReportersOpen((v) => !v)}
          className="relative flex items-center"
          aria-label={t('מי דיווח', 'Who reported')}
        >
          <div className={`flex -space-x-2 ${isRTL ? 'space-x-reverse' : ''}`}>
            {bug.reporters.slice(0, 3).map((r) => (
              <Avatar key={r.user_id} reporter={r} />
            ))}
          </div>
          {bug.reporterCount > 3 && (
            <span className={`${isRTL ? 'mr-1' : 'ml-1'} text-xs text-white/50`}>+{bug.reporterCount - 3}</span>
          )}
          <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-xs font-semibold text-white/60`}>
            {bug.reporterCount} {t('מדווחים', 'reporters')}
          </span>
        </button>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <select
              value={bug.status}
              onChange={(e) => onStatus(e.target.value as BugStatus)}
              onClick={(e) => e.stopPropagation()}
              className="rounded-lg border border-white/15 bg-[#0b111b] px-2 py-1 text-xs"
            >
              {(Object.keys(STATUS_LABEL) as BugStatus[]).map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s, lang)}
                </option>
              ))}
            </select>
          )}

          {!bug.isMine ? (
            <button
              onClick={onJoin}
              className="rounded-full px-3 py-1 text-sm font-bold"
              style={{ background: CYAN, color: '#06121f' }}
            >
              {t('גם לי קורה', 'Happens to me too')}
            </button>
          ) : (
            <button
              onClick={onLeaveOrDelete}
              className="rounded-full border px-3 py-1 text-sm font-semibold"
              style={{
                borderColor: canHardDelete ? '#ff547066' : 'rgba(255,255,255,0.2)',
                color: canHardDelete ? '#ff5470' : '#cdd6e3',
              }}
            >
              {canHardDelete ? t('מחק', 'Delete') : t('הסר אותי', 'Remove me')}
            </button>
          )}
        </div>
      </div>

      {reportersOpen && <ReportersPopover reporters={bug.reporters} />}
    </article>
  );
}


function Avatar({ reporter, size = 28 }: { reporter: BugReporter; size?: number }) {
  const url = reporter.profile?.avatar_url;
  return url ? (
    <img
      src={url}
      alt={reporter.profile?.display_name || ''}
      className="rounded-full ring-2 ring-[#0b111b]"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className="flex items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-[#0b111b]"
      style={{ width: size, height: size, background: '#23324a', color: '#cdd6e3' }}
    >
      {initials(reporter.profile?.display_name)}
    </span>
  );
}

function ReportersPopover({ reporters }: { reporters: BugReporter[] }) {
  return (
    <div
      data-bug-reporters-popover
      className="mt-3 rounded-xl border border-white/10 bg-[#0b111b] p-3"
    >
      <div className="mb-2 text-xs font-bold text-white/50">מי דיווח על הבאג</div>
      <ul className="space-y-2">
        {reporters.map((r) => (
          <li key={r.user_id} className="flex items-center gap-2">
            <Avatar reporter={r} size={24} />
            <div className="min-w-0">
              <div className="truncate text-sm">{r.profile?.display_name || 'משתמש'}</div>
              {r.note && <div className="truncate text-xs text-white/40">{r.note}</div>}
            </div>
            <span className="mr-auto text-[11px] text-white/30">{timeAgo(r.created_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// =====================================================================
// DETAIL  (full view + comments)
// =====================================================================
export function BugDetail({ bugId, onClose }: { bugId: string; onClose: () => void }) {
  const { supabase, user } = useArena();
  const api = useMemo(() => createBugArenaService(supabase), [supabase]);
  const [bug, setBug] = useState<BugWithMeta | null>(null);
  const [comments, setComments] = useState<BugComment[]>([]);
  const [body, setBody] = useState('');

  const reload = () => {
    api.getBug(bugId, user.id).then(setBug);
    api.listComments(bugId).then(setComments);
  };
  useEffect(reload, [bugId]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = async () => {
    if (!body.trim()) return;
    await api.addComment(bugId, body.trim());
    setBody('');
    api.listComments(bugId).then(setComments);
  };

  return (
    <div
      data-bug-detail
      dir="rtl"
      className="fixed inset-0 z-[1002] flex justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-y-auto bg-[#0b111b] text-[#e8edf5] sm:max-h-[92vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0b111b]/95 px-5 py-4 backdrop-blur">
          <h2 className="text-lg font-extrabold">פרטי באג</h2>
          <button onClick={onClose} className="text-2xl text-white/50 hover:text-white">
            ×
          </button>
        </div>

        {!bug ? (
          <div className="p-10 text-center text-white/40">טוען…</div>
        ) : (
          <div className="space-y-5 p-5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className="rounded-full px-2 py-0.5 font-bold"
                style={{ background: `${STATUS_COLOR[bug.status]}22`, color: STATUS_COLOR[bug.status] }}
              >
                {STATUS_LABEL[bug.status]}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-0.5">{bug.section}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5">{BUG_TYPE_LABEL[bug.bug_type]}</span>
              <span className="rounded-full bg-white/10 px-2 py-0.5">
                חומרה: {SEVERITY_LABEL[bug.severity]}
              </span>
              <span className="text-white/40">{formatDateTime(bug.created_at)}</span>
            </div>

            <p className="whitespace-pre-wrap text-sm">{bug.description}</p>

            {bug.element_label && (
              <div
                className="rounded-lg p-2 font-mono text-xs"
                style={{ background: '#10202c', color: CYAN, direction: 'ltr' }}
              >
                {bug.element_label}
                <div className="text-white/40">{bug.element_selector}</div>
              </div>
            )}

            {/* gallery */}
            {bug.attachments.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {bug.attachments.map(
                  (a) =>
                    a.url && (
                      <a key={a.id} href={a.url} target="_blank" rel="noreferrer">
                        <img
                          src={a.url}
                          alt={a.kind}
                          className="aspect-video w-full rounded-lg object-cover ring-1 ring-white/10"
                        />
                      </a>
                    )
                )}
              </div>
            )}

            <ReportersPopover reporters={bug.reporters} />

            {/* comments */}
            <div data-bug-comments>
              <div className="mb-2 text-sm font-bold text-white/60">
                דיון ({comments.length})
              </div>
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li key={c.id} className="flex gap-2">
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: '#23324a' }}
                    >
                      {initials(c.profile?.display_name)}
                    </span>
                    <div className="min-w-0 flex-1 rounded-xl bg-white/5 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">
                          {c.profile?.display_name || 'משתמש'}
                        </span>
                        <span className="text-[11px] text-white/30">{timeAgo(c.created_at)}</span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{c.body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex gap-2">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  placeholder="הוסף תגובה…"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
                />
                <button
                  onClick={send}
                  className="rounded-xl px-4 py-2 text-sm font-bold text-[#06121f]"
                  style={{ background: ACCENT }}
                >
                  שלח
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// tiny icon
// ---------------------------------------------------------------------
function TargetIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="1" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="1" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="23" y2="12" />
    </svg>
  );
}
