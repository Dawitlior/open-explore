/**
 * LivePositionCard — Single live position tile, strict Money-Mode.
 * No stopLoss, no R-Multiple, no risk badge — by design.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { OrcaCard, OrcaCardBody, OrcaCardHeader, OrcaCardTitle } from '@/components/ui-orca/OrcaCard';
import { OrcaMetric } from '@/components/ui-orca/OrcaMetric';
import { useFlashOnChange } from './useFlashOnChange';
import type { LiveMoneyPosition } from '@/lib/bybit-sanitize';
import { cn } from '@/lib/utils';

interface Props { p: LiveMoneyPosition }

const fmt = (n: number, d = 2) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }) : '—';

export function LivePositionCard({ p }: Props) {
  const flash = useFlashOnChange(p.unrealizedPnl);
  const isLong = String(p.side).toLowerCase() === 'buy';
  const pnlTone: 'win' | 'loss' | 'neutral' =
    p.unrealizedPnl > 0 ? 'win' : p.unrealizedPnl < 0 ? 'loss' : 'neutral';

  return (
    <OrcaCard span={4} tilt>
      {/* PnL flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            key={`flash-${flash}-${p.updatedAt}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
              'absolute inset-0 pointer-events-none',
              flash === 'up' ? 'bg-emerald-500/10' : 'bg-rose-500/10',
            )}
          />
        )}
      </AnimatePresence>

      <OrcaCardHeader>
        <div className="flex items-center gap-2">
          <OrcaCardTitle>{p.symbol}</OrcaCardTitle>
          <span className={cn(
            'text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded',
            isLong
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30',
          )}>
            {isLong ? 'LONG' : 'SHORT'}
          </span>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/70">
          ×{p.leverage || 1}
        </span>
      </OrcaCardHeader>

      <OrcaCardBody className="grid grid-cols-2 gap-x-3 gap-y-1">
        <OrcaMetric dense label="Mark" value={fmt(p.markPrice, 4)} />
        <OrcaMetric dense label="Entry" value={fmt(p.entryPrice, 4)} />
        <OrcaMetric dense label="Size" value={fmt(p.size, 4)} />
        <OrcaMetric dense label="Notional" value={fmt(p.size * p.entryPrice, 2)} />
        <div className="col-span-2 mt-1 border-t border-white/5 pt-2">
          <OrcaMetric
            label="Unrealized PnL"
            tone={pnlTone}
            value={`${p.unrealizedPnl >= 0 ? '+' : ''}${fmt(p.unrealizedPnl, 2)}`}
          />
        </div>
      </OrcaCardBody>
    </OrcaCard>
  );
}
