/**
 * DualModeChip — per-chart R / $ toggle pill for Advanced-tier charts.
 * Disabled (with tooltip) when R-coverage of the dataset is < 80%.
 */
import { DollarSign, Activity } from 'lucide-react';
import type { DualSeriesState } from '@/lib/use-dual-series';
import { useLang } from '@/hooks/use-lang';

interface Props {
  state: DualSeriesState;
  className?: string;
}

export function DualModeChip({ state, className = '' }: Props) {
  const { lang } = useLang();
  const { mode, setMode, canToggle, coverage } = state;
  const isR = mode === 'R_MULTIPLE';

  const tip = !canToggle
    ? lang === 'he'
      ? `כיסוי R נמוך מדי (${Math.round(coverage * 100)}%) — נדרש ≥80%`
      : `R-coverage too low (${Math.round(coverage * 100)}%) — needs ≥80%`
    : lang === 'he'
      ? 'החלף בין $ ל-R'
      : 'Toggle $ / R';

  return (
    <div
      className={`inline-flex items-center rounded-md border border-border bg-muted/40 p-0.5 text-[10px] font-medium ${!canToggle ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      title={tip}
      role="group"
      aria-label={tip}
    >
      <button
        type="button"
        disabled={!canToggle}
        onClick={() => setMode('MONEY')}
        className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${!isR ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <DollarSign className="h-3 w-3" />
        $
      </button>
      <button
        type="button"
        disabled={!canToggle}
        onClick={() => setMode('R_MULTIPLE')}
        className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${isR ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
      >
        <Activity className="h-3 w-3" />
        R
      </button>
    </div>
  );
}
