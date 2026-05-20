/**
 * OracleNodeCard — a single high-pressure scenario.
 * Captures latency, hover count, and selection flips ("changed_mind").
 */
import { useEffect, useRef, useState } from 'react';
import type { OracleNode } from '@/lib/oracle/types';
import { haptics } from '@/lib/haptics';
import { OracleTelemetryStrip } from './OracleTelemetryStrip';

interface Props {
  node: OracleNode;
  lang: 'he' | 'en';
  onAnswer: (optionId: string, telemetry: { latency_ms: number; hover_count: number; changed_mind: number }) => void;
  onSkip: (telemetry: { latency_ms: number; hover_count: number }) => void;
}

export function OracleNodeCard({ node, lang, onAnswer, onSkip }: Props) {
  const isRTL = lang === 'he';
  const startedAt = useRef<number>(Date.now());
  const [selected, setSelected] = useState<string | null>(null);
  const [hoverCount, setHoverCount] = useState(0);
  const [flips, setFlips] = useState(0);
  const [tick, setTick] = useState(0);

  // Reset on node change
  useEffect(() => {
    startedAt.current = Date.now();
    setSelected(null);
    setHoverCount(0);
    setFlips(0);
  }, [node.code]);

  // Live latency tick
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 100);
    return () => window.clearInterval(id);
  }, [node.code]);

  const latency = Date.now() - startedAt.current;

  const pick = (id: string) => {
    if (selected && selected !== id) setFlips((f) => f + 1);
    setSelected(id);
    haptics.selection();
  };

  const confirm = () => {
    if (!selected) return;
    haptics.medium();
    onAnswer(selected, { latency_ms: latency, hover_count: hoverCount, changed_mind: flips });
  };

  const skip = () => {
    haptics.light();
    onSkip({ latency_ms: latency, hover_count: hoverCount });
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full max-w-2xl mx-auto px-6 py-8 animate-in fade-in-0 slide-in-from-bottom-2 duration-500"
      key={node.code}
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/40 mb-3 flex items-center gap-2">
        <span className="inline-block w-1 h-1 rounded-full bg-foreground/40" />
        {node.category.replace('_', ' ')} · tier {node.tier}{node.trap ? ' · trap' : ''}
      </div>

      <h2 className="text-2xl md:text-3xl font-medium leading-snug text-foreground mb-8 text-balance">
        {lang === 'he' ? node.prompt_he : node.prompt_en}
      </h2>

      <div className="space-y-2 mb-6">
        {node.options.map((opt) => {
          const isSel = selected === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => pick(opt.id)}
              onMouseEnter={() => setHoverCount((n) => n + 1)}
              className={`group w-full text-start px-4 py-3.5 rounded-lg border transition-all duration-200
                ${isSel
                  ? 'border-foreground/60 bg-foreground/5 text-foreground'
                  : 'border-foreground/10 bg-foreground/[0.02] text-foreground/80 hover:border-foreground/30 hover:bg-foreground/[0.04]'}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-4 h-4 rounded-full border flex-shrink-0 transition-all ${isSel ? 'border-foreground bg-foreground' : 'border-foreground/30'}`} />
                <span className="text-[15px]">{lang === 'he' ? opt.label_he : opt.label_en}</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <button
          onClick={skip}
          className="font-mono text-[11px] uppercase tracking-[0.2em] text-foreground/40 hover:text-foreground/70 transition-colors"
        >
          {lang === 'he' ? 'דלג' : 'Skip'} ›
        </button>
        <button
          onClick={confirm}
          disabled={!selected}
          className={`px-6 py-2.5 rounded-md font-mono text-[11px] uppercase tracking-[0.22em] transition-all
            ${selected
              ? 'bg-foreground text-background hover:opacity-90'
              : 'bg-foreground/10 text-foreground/30 cursor-not-allowed'}`}
        >
          {lang === 'he' ? 'אישור' : 'Commit'}
        </button>
      </div>

      <OracleTelemetryStrip
        latencyMs={latency}
        hoverCount={hoverCount}
        changedMind={flips}
        isRTL={isRTL}
      />
    </div>
  );
}
