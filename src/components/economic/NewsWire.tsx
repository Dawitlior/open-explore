import { useMemo, useState } from 'react';
import { Radio, Inbox, X } from 'lucide-react';
import { useNewsWire, type NewsWireItem } from '@/hooks/use-news-wire';

/* ─────────────────────────────────────────────────────────────
 * News Wire — live vertical feed rail
 *   • Reads `news_feed` (auto-pruned: 3 days / 30 latest reports)
 *   • Sits to the side of the session map + economic calendar
 *   • Theme-aware (T palette), bilingual, RTL-safe
 * ───────────────────────────────────────────────────────────── */

const COPY = {
  he: {
    title: 'זרם חדשות',
    subtitle: 'עדכונים חיים · 72 שעות אחרונות',
    live: 'חי',
    empty: 'אין דיווחים כרגע',
    emptyHint: 'העדכונים יופיעו כאן ברגע שהזרם האוטומטי יתחיל לשדר.',
    today: 'היום',
    yesterday: 'אתמול',
  },
  en: {
    title: 'News Wire',
    subtitle: 'Live updates · last 72 hours',
    live: 'LIVE',
    empty: 'No reports yet',
    emptyHint: 'Updates will stream in here as soon as the automation starts publishing.',
    today: 'Today',
    yesterday: 'Yesterday',
  },
} as const;

type WireCopy = (typeof COPY)['en'] | (typeof COPY)['he'];

/** Date only — the wire never exposes a publish time. */
function dateLabel(iso: string, t: WireCopy, isRTL: boolean): string {
  const d = new Date(iso);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((day(new Date()) - day(d)) / 86_400_000);
  if (diffDays <= 0) return t.today;
  if (diffDays === 1) return t.yesterday;
  return new Intl.DateTimeFormat(isRTL ? 'he-IL' : 'en-GB', { day: 'numeric', month: 'short' }).format(d);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function NewsWire({ T, lang = 'en' }: { T?: any; lang?: 'he' | 'en' }) {
  const isRTL = lang === 'he';
  const t = COPY[lang];
  const { items, loading } = useNewsWire(30);
  const [active, setActive] = useState<NewsWireItem | null>(null);

  const PANEL = T?.bg?.card ?? '#0a0a0a';
  const BG = T?.bg?.primary ?? '#020202';
  const BORDER = T?.border?.medium ?? 'rgba(255,255,255,0.10)';
  const BORDER_SOFT = T?.border?.subtle ?? 'rgba(255,255,255,0.05)';
  const TEXT = T?.text?.primary ?? '#f1f5f9';
  const TEXT_MUTED = T?.text?.secondary ?? '#94a3b8';
  const TEXT_DIM = T?.text?.muted ?? '#64748b';
  const ACCENT = T?.accent?.cyan ?? '#00f2ff';
  const GREEN = T?.accent?.green ?? '#10b981';
  const RED = T?.accent?.red ?? '#f43f5e';
  const AMBER = T?.accent?.gold ?? T?.accent?.amber ?? '#f5b301';

  const impactColor = useMemo(
    () => ({ high: RED, medium: AMBER, low: TEXT_DIM }) as Record<string, string>,
    [RED, AMBER, TEXT_DIM],
  );

  return (
    <aside
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={t.title}
      className="flex flex-col rounded-xl overflow-hidden w-full lg:w-[330px] xl:w-[360px] shrink-0"
      style={{
        background: BG,
        border: `1px solid ${BORDER}`,
        fontFamily: "'Poppins', sans-serif",
        maxHeight: 'calc(100vh - 140px)',
      }}
    >
      {/* Header */}
      <header
        className="flex items-center gap-2.5 px-4 py-3.5 border-b shrink-0"
        style={{ borderColor: BORDER, background: PANEL }}
      >
        <Radio className="w-4 h-4" style={{ color: ACCENT }} />
        <div className="min-w-0 flex-1">
          <h2 className="text-[13px] font-semibold leading-tight" style={{ color: TEXT }}>
            {t.title}
          </h2>
          <div className="text-[10px] mt-0.5 truncate" style={{ color: TEXT_DIM }}>
            {t.subtitle}
          </div>
        </div>
        <span
          className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md"
          style={{ color: GREEN, background: 'rgba(16,185,129,0.10)', border: `1px solid rgba(16,185,129,0.22)` }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: GREEN, boxShadow: `0 0 6px ${GREEN}` }}
          />
          {t.live}
        </span>
      </header>

      {/* Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto orca-wire-scroll">
        {loading && (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg p-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="h-2 w-16 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-2.5 w-full rounded mt-2.5" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="h-2.5 w-2/3 rounded mt-1.5" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16 gap-2">
            <Inbox className="w-6 h-6" style={{ color: TEXT_DIM }} />
            <div className="text-[12px] font-medium" style={{ color: TEXT_MUTED }}>{t.empty}</div>
            <div className="text-[10.5px] leading-relaxed" style={{ color: TEXT_DIM }}>{t.emptyHint}</div>
          </div>
        )}

        {!loading && items.map((item: NewsWireItem) => {
          const bar = impactColor[item.impact] ?? TEXT_DIM;
          return (
            <article
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => setActive(item)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(item); } }}
              className="group relative px-4 py-3.5 transition-colors cursor-pointer"
              style={{ borderBottom: `1px solid ${BORDER_SOFT}` }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span
                className="absolute top-3.5 bottom-3.5 w-[2px] rounded-full"
                style={{ background: bar, opacity: 0.85, insetInlineStart: 0 }}
              />

              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[9.5px] uppercase tracking-wider font-semibold" style={{ color: bar }}>
                  {item.category}
                </span>
                <span className="w-[3px] h-[3px] rounded-full" style={{ background: TEXT_DIM }} />
                <span className="text-[10px] tabular-nums" style={{ color: TEXT_DIM }}>
                  {relTime(item.published_at, t)}
                </span>
                {item.source && (
                  <span className="text-[10px] truncate ms-auto" style={{ color: TEXT_DIM }}>
                    {item.source}
                  </span>
                )}
              </div>

              <h3 className="text-[12.5px] font-medium leading-snug" style={{ color: TEXT }}>
                {item.headline}
              </h3>

              {item.summary && (
                <p className="text-[11px] leading-relaxed mt-1.5 line-clamp-3" style={{ color: TEXT_MUTED }}>
                  {item.summary}
                </p>
              )}

              {item.symbols?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {item.symbols.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="text-[9.5px] font-medium px-1.5 py-0.5 rounded"
                      style={{ color: ACCENT, background: 'rgba(0,242,255,0.08)', border: `1px solid ${BORDER_SOFT}` }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* Full report modal */}
      {active && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={() => setActive(null)}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={active.headline}
            className="w-full max-w-[560px] max-h-[80vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: PANEL, border: `1px solid ${BORDER}` }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-5 py-4 border-b shrink-0" style={{ borderColor: BORDER }}>
              <span
                className="text-[9.5px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded"
                style={{
                  color: impactColor[active.impact] ?? TEXT_DIM,
                  background: `${impactColor[active.impact] ?? TEXT_DIM}1a`,
                }}
              >
                {active.category}
              </span>
              <span className="text-[10.5px] tabular-nums" style={{ color: TEXT_DIM }}>
                {new Date(active.published_at).toLocaleString(isRTL ? 'he-IL' : 'en-GB', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                })}
              </span>
              {active.source && (
                <span className="text-[10.5px] truncate" style={{ color: TEXT_DIM }}>· {active.source}</span>
              )}
              <button
                onClick={() => setActive(null)}
                aria-label="Close"
                className="ms-auto p-1.5 rounded-lg transition-opacity hover:opacity-70"
                style={{ color: TEXT_MUTED, background: 'rgba(255,255,255,0.05)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 orca-wire-scroll">
              <h2 className="text-[17px] font-semibold leading-snug" style={{ color: TEXT }}>
                {active.headline}
              </h2>
              {active.summary && (
                <p className="text-[13px] leading-relaxed mt-3 whitespace-pre-line" style={{ color: TEXT_MUTED }}>
                  {active.summary}
                </p>
              )}
              {active.symbols?.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap mt-4">
                  {active.symbols.map((s) => (
                    <span
                      key={s}
                      className="text-[10.5px] font-medium px-2 py-1 rounded"
                      style={{ color: ACCENT, background: 'rgba(0,242,255,0.08)', border: `1px solid ${BORDER_SOFT}` }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .orca-wire-scroll::-webkit-scrollbar { width: 5px; }
        .orca-wire-scroll::-webkit-scrollbar-track { background: transparent; }
        .orca-wire-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.10); border-radius: 999px;
        }
        .orca-wire-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }
      `}</style>
    </aside>
  );
}
