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
    now: 'עכשיו',
    min: 'ד׳',
    hour: 'ש׳',
    day: 'י׳',
    read: 'למקור',
  },
  en: {
    title: 'News Wire',
    subtitle: 'Live updates · last 72 hours',
    live: 'LIVE',
    empty: 'No reports yet',
    emptyHint: 'Updates will stream in here as soon as the automation starts publishing.',
    now: 'now',
    min: 'm',
    hour: 'h',
    day: 'd',
    read: 'Source',
  },
} as const;

type WireCopy = (typeof COPY)['en'] | (typeof COPY)['he'];

function relTime(iso: string, t: WireCopy): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return t.now;
  if (m < 60) return `${m}${t.min}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}${t.hour}`;
  return `${Math.floor(h / 24)}${t.day}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function NewsWire({ T, lang = 'en' }: { T?: any; lang?: 'he' | 'en' }) {
  const isRTL = lang === 'he';
  const t = COPY[lang];
  const { items, loading } = useNewsWire(30);

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
              className="group relative px-4 py-3.5 transition-colors"
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

              {(item.symbols?.length > 0 || item.url) && (
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {item.symbols?.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="text-[9.5px] font-medium px-1.5 py-0.5 rounded"
                      style={{ color: ACCENT, background: 'rgba(0,242,255,0.08)', border: `1px solid ${BORDER_SOFT}` }}
                    >
                      {s}
                    </span>
                  ))}
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] ms-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: ACCENT }}
                    >
                      {t.read}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

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
