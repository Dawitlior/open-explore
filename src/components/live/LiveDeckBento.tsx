/**
 * LiveDeckBento — Premium Bento grid for the live Money-Mode deck.
 * Connection status + aggregate PnL on top row, dense position grid below.
 */

import { useMemo } from 'react';
import { OrcaBento } from '@/components/ui-orca/OrcaBento';
import { OrcaCard, OrcaCardBody, OrcaCardHeader, OrcaCardTitle } from '@/components/ui-orca/OrcaCard';
import { OrcaMetric } from '@/components/ui-orca/OrcaMetric';
import { useBybitLive } from '@/providers/BybitLiveProvider';
import { ConnectionPulse } from './ConnectionPulse';
import { LivePositionCard } from './LivePositionCard';
import { useFlashOnChange } from './useFlashOnChange';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

function AggregatePnlCard({ pnl, count }: { pnl: number; count: number }) {
  const flash = useFlashOnChange(pnl);
  const tone: 'win' | 'loss' | 'neutral' =
    pnl > 0 ? 'win' : pnl < 0 ? 'loss' : 'neutral';
  return (
    <OrcaCard span={8}>
      <AnimatePresence>
        {flash && (
          <motion.div
            key={`agg-${flash}-${pnl.toFixed(2)}`}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className={cn(
              'absolute inset-0 pointer-events-none',
              flash === 'up' ? 'bg-emerald-500/8' : 'bg-rose-500/8',
            )}
          />
        )}
      </AnimatePresence>
      <OrcaCardHeader>
        <OrcaCardTitle>Aggregate Unrealized</OrcaCardTitle>
        <span className="text-[10px] font-mono text-muted-foreground/70">
          {count} OPEN
        </span>
      </OrcaCardHeader>
      <OrcaCardBody className="grid grid-cols-2 gap-3">
        <OrcaMetric
          label="Total PnL"
          tone={tone}
          value={`${pnl >= 0 ? '+' : ''}${pnl.toLocaleString(undefined, {
            minimumFractionDigits: 2, maximumFractionDigits: 2,
          })}`}
        />
        <OrcaMetric
          dense
          label="Avg per pos"
          value={count > 0
            ? `${(pnl / count).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : '—'}
        />
      </OrcaCardBody>
    </OrcaCard>
  );
}

function EmptyDeckCard() {
  return (
    <OrcaCard span={12} static>
      <OrcaCardBody className="py-10 text-center">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70 font-mono">
          No open positions
        </div>
        <div className="text-xs text-muted-foreground/50 mt-1 font-mono">
          Live positions will appear here the moment Bybit reports them.
        </div>
      </OrcaCardBody>
    </OrcaCard>
  );
}

export function LiveDeckBento() {
  const { positions } = useBybitLive();
  const totalPnl = useMemo(
    () => positions.reduce((s, p) => s + (p.unrealizedPnl || 0), 0),
    [positions],
  );

  return (
    <OrcaBento className="grid grid-cols-12 gap-3 mb-4">
      <ConnectionPulse symbolsTracked={positions.length} />
      <AggregatePnlCard pnl={totalPnl} count={positions.length} />
      {positions.length === 0
        ? <EmptyDeckCard />
        : positions.map(p => (
            <LivePositionCard key={`${p.symbol}:${p.positionIdx ?? 0}`} p={p} />
          ))}
    </OrcaBento>
  );
}
