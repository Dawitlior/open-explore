/**
 * Renders the trader's Oracle DNA blueprint: archetype, narrative summary,
 * shadow patterns, top dimensional drivers. Glass-terminal aesthetic.
 */
import type { OracleBlueprint } from '@/hooks/use-oracle-vector';

interface Props {
  blueprint: OracleBlueprint;
  lang: 'he' | 'en';
  onRecalibrate?: () => void;
}

function topDimensions(vec: Record<string, number>, n = 8) {
  return Object.entries(vec)
    .map(([k, v]) => ({ k, v, abs: Math.abs(v) }))
    .sort((a, b) => b.abs - a.abs)
    .slice(0, n);
}

const DIM_LABELS_HE: Record<string, string> = {
  impulsivity: 'אימפולסיביות',
  loss_aversion: 'שנאת הפסד',
  narrative_bias: 'הטיית נרטיב',
  quant_anchor: 'עוגן כמותי',
  ego_attribution: 'ייחוס אגו',
  risk_reality_gap: 'פער סיכון-מציאות',
  discipline: 'משמעת',
  cognitive_load: 'עומס קוגניטיבי',
  shadow_revenge: 'נקמת שוק',
  shadow_fomo: 'FOMO',
};

export function OracleBlueprintReport({ blueprint, lang, onRecalibrate }: Props) {
  const isRTL = lang === 'he';
  const dims = topDimensions(blueprint.vector ?? {});
  const maxAbs = dims[0]?.abs || 1;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="w-full max-w-3xl mx-auto space-y-8 text-foreground">
      {/* Header */}
      <header className="border-b border-foreground/10 pb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/40">
          ◈ {isRTL ? 'הארכיטיפ שלך' : 'Your Archetype'}
        </div>
        <h1 className="mt-2 text-3xl md:text-4xl font-light tracking-tight">
          {blueprint.archetype ?? (isRTL ? 'לא מסונתז' : 'Unsynthesized')}
        </h1>
        <div className="mt-2 font-mono text-[10px] text-foreground/40">
          v{blueprint.version} · {new Date(blueprint.computed_at).toLocaleDateString(isRTL ? 'he-IL' : 'en-US')}
        </div>
      </header>

      {/* Narrative */}
      {blueprint.blueprint_md && (
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-3">
            {isRTL ? 'סינתזה' : 'Synthesis'}
          </div>
          <div className="text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
            {blueprint.blueprint_md}
          </div>
        </section>
      )}

      {/* Shadow patterns */}
      {blueprint.shadow_patterns?.length > 0 && (
        <section>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-3">
            {isRTL ? 'דפוסי צל' : 'Shadow Patterns'}
          </div>
          <ul className="space-y-2">
            {blueprint.shadow_patterns.map((p, i) => (
              <li key={i} className="border border-foreground/10 rounded-md p-3 bg-foreground/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="font-mono text-[10px] text-foreground/50">
                    {Math.round((p.weight ?? 0) * 100)}%
                  </span>
                </div>
                <div className="mt-1.5 h-px bg-foreground/10 overflow-hidden">
                  <div
                    className="h-full bg-foreground/60"
                    style={{ width: `${Math.min(100, Math.max(5, (p.weight ?? 0) * 100))}%` }}
                  />
                </div>
                {p.evidence && (
                  <div className="mt-2 text-[11px] text-foreground/50 italic">{p.evidence}</div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Dimensional drivers */}
      <section>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-foreground/40 mb-3">
          {isRTL ? 'מנועי DNA דומיננטיים' : 'Dominant DNA Drivers'}
        </div>
        <div className="space-y-1.5">
          {dims.map(({ k, v, abs }) => {
            const label = isRTL ? (DIM_LABELS_HE[k] ?? k) : k.replace(/_/g, ' ');
            const pct = (abs / maxAbs) * 100;
            const positive = v >= 0;
            return (
              <div key={k} className="flex items-center gap-3 font-mono text-[11px]">
                <span className="w-44 truncate text-foreground/70">{label}</span>
                <div className="flex-1 h-1 bg-foreground/5 rounded-full overflow-hidden">
                  <div
                    className={positive ? 'h-full bg-foreground/70' : 'h-full bg-foreground/30'}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-14 text-end text-foreground/50">
                  {v >= 0 ? '+' : ''}{v.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {onRecalibrate && (
        <div className="pt-4 border-t border-foreground/10 flex justify-center">
          <button
            onClick={onRecalibrate}
            className="px-6 py-2.5 rounded-md border border-foreground/20 text-foreground/80 font-mono text-[11px] uppercase tracking-[0.25em] hover:bg-foreground/5 transition"
          >
            {isRTL ? 'כייל מחדש' : 'Recalibrate'}
          </button>
        </div>
      )}
    </div>
  );
}
