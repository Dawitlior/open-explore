/**
 * ConnectionPulse — Glass status tile for the live WS feed.
 */

import { motion } from 'framer-motion';
import { OrcaCard, OrcaCardBody, OrcaCardHeader, OrcaCardTitle } from '@/components/ui-orca/OrcaCard';
import { OrcaMetric } from '@/components/ui-orca/OrcaMetric';
import { useBybitLive, type LiveStatus } from '@/providers/BybitLiveProvider';
import { cn } from '@/lib/utils';

const labelFor = (s: LiveStatus, isStale: boolean): string => {
  if (isStale) return 'STALE';
  switch (s) {
    case 'subscribed': return 'LIVE';
    case 'connecting': return 'CONNECTING';
    case 'authenticating': return 'AUTH';
    case 'loading_creds': return 'LOADING';
    case 'reconnecting': return 'RECONNECTING';
    case 'no_creds': return 'NO KEYS';
    case 'auth_invalid': return 'AUTH FAILED';
    case 'error': return 'ERROR';
    case 'closed': return 'CLOSED';
    default: return 'IDLE';
  }
};

const toneFor = (s: LiveStatus, isStale: boolean): { dot: string; ring: string; text: string } => {
  if (s === 'subscribed' && !isStale)
    return { dot: 'bg-emerald-400', ring: 'shadow-[0_0_12px_rgba(52,211,153,0.7)]', text: 'text-emerald-300' };
  if (isStale)
    return { dot: 'bg-amber-400', ring: 'shadow-[0_0_10px_rgba(251,191,36,0.5)]', text: 'text-amber-300' };
  if (s === 'no_creds' || s === 'auth_invalid' || s === 'error')
    return { dot: 'bg-rose-500', ring: 'shadow-[0_0_10px_rgba(244,63,94,0.5)]', text: 'text-rose-300' };
  return { dot: 'bg-cyan-400', ring: 'shadow-[0_0_10px_rgba(34,211,238,0.5)]', text: 'text-cyan-300' };
};

export function ConnectionPulse({ symbolsTracked }: { symbolsTracked: number }) {
  const { status, lastFrameAt, isStale, lastError } = useBybitLive();
  const tone = toneFor(status, isStale);
  const label = labelFor(status, isStale);
  const lastFrameStr = lastFrameAt
    ? `${Math.max(0, Math.round((Date.now() - lastFrameAt) / 1000))}s ago`
    : '—';

  return (
    <OrcaCard span={4}>
      <OrcaCardHeader>
        <OrcaCardTitle>Live Feed</OrcaCardTitle>
        <div className="flex items-center gap-2">
          <motion.span
            animate={{ scale: status === 'subscribed' && !isStale ? [1, 1.25, 1] : 1 }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className={cn('w-2 h-2 rounded-full', tone.dot, tone.ring)}
          />
          <span className={cn('text-[10px] font-mono tracking-[0.18em] font-bold', tone.text)}>
            {label}
          </span>
        </div>
      </OrcaCardHeader>
      <OrcaCardBody className="grid grid-cols-2 gap-3">
        <OrcaMetric dense label="Symbols" value={symbolsTracked} />
        <OrcaMetric dense label="Last frame" value={lastFrameStr} />
        {(status === 'no_creds' || status === 'auth_invalid') && (
          <div className="col-span-2 text-[11px] text-muted-foreground/80 font-mono">
            {status === 'no_creds'
              ? 'Connect your Bybit API keys in Settings → Exchanges.'
              : 'Authentication failed. Rotate your API keys in Settings → Exchanges.'}
          </div>
        )}
        {lastError && status === 'error' && (
          <div className="col-span-2 text-[10px] text-rose-300/70 font-mono truncate">
            {lastError}
          </div>
        )}
      </OrcaCardBody>
    </OrcaCard>
  );
}
