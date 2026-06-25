// Wave-0 schema-driven renderer.
//
// Renders a `WeeklyReviewSchema` against the existing widgets (TriState,
// SectionTitle) and Wave-0 styling primitives, producing DOM that is
// structurally equivalent to WeeklyTab.tsx. System blocks (trades-table,
// stat-chips, risk-gauges, grade, ai-insights) are delivered by the host
// as `systemSlots` so the renderer never owns trade/grade/AI logic.
//
// Persistence: the renderer is value-agnostic — caller passes in
// `ReviewValues` (already translated via `legacy-adapter.readDraft`) and
// receives slug-keyed updates via `onChange(blockId, value)`. The caller
// then funnels the change back through `legacy-adapter.writeBlock(...)`.
//
// Flagged off by default (`WR_SCHEMA_RENDERER_ENABLED`); zero UX change
// until the side-by-side parity gate is green.

import { useMemo } from 'react';
import { TriState } from '../widgets/TriState';
import { SectionTitle } from '../widgets/SectionTitle';
import { themeBgs } from '../lib/theme-bg';
import type {
  WeeklyReviewSchema,
  Section,
  Block,
  ReviewValues,
  ChecklistState,
  Loc,
} from '../lib/wr-schema';
import { resolveLoc } from '../lib/wr-schema';
import type { ActionRegistry } from './action-registry';
import { invokeAction } from './action-registry';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Theme = any;

export type SystemSlotId =
  | 'system-trades-table'
  | 'system-stat-chips'
  | 'system-risk-gauges'
  | 'system-grade'
  | 'system-ai-insights';

export interface WeeklyReviewRendererProps {
  schema: WeeklyReviewSchema;
  values: ReviewValues;
  onChange: (blockId: string, value: ReviewValues[string]) => void;
  T: Theme;
  isRTL: boolean;
  locale: 'he' | 'en';
  /** Host-supplied renderers for system blocks. */
  systemSlots: Partial<Record<SystemSlotId, (block: Block) => React.ReactNode>>;
  /** Host-supplied deep-link handlers (Wave-2 Item 5). Optional — missing entries hide the affordance. */
  actionRegistry?: ActionRegistry;
}

const STATE_TO_LEGACY_NUM: Record<ChecklistState, 0 | 1 | 2> = { neutral: 0, done: 1, missed: 2 };

export function WeeklyReviewRenderer(props: WeeklyReviewRendererProps) {
  const { schema, T, isRTL } = props;
  const isLight = (T as { id?: string })?.id === 'platinum';
  const panel = T?.bg?.surface || (isLight ? '#ffffff' : 'rgba(255,255,255,0.04)');
  const border = T?.border?.subtle || (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)');

  const card: React.CSSProperties = {
    padding: 'clamp(14px, 2vw, 20px)',
    background: panel,
    border: `1px solid ${border}`,
    borderRadius: 14,
    boxSizing: 'border-box',
  };

  const sections = useMemo(
    () => [...schema.sections].filter(s => !s.hidden).sort((a, b) => a.order - b.order),
    [schema.sections],
  );

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'grid', gap: 18, paddingBottom: 48 }}>
      {sections.map(section => (
        <SectionShell key={section.id} section={section} card={card} {...props}>
          {[...section.blocks]
            .filter(b => !b.hidden)
            .sort((a, b) => a.order - b.order)
            .map(block => (
              <BlockSwitch key={block.id} block={block} {...props} />
            ))}
        </SectionShell>
      ))}
    </div>
  );
}

// ── Section shell ──────────────────────────────────────────────────────────

interface SectionShellProps extends WeeklyReviewRendererProps {
  section: Section;
  card: React.CSSProperties;
  children: React.ReactNode;
}

function SectionShell({ section, card, T, isRTL, locale, children }: SectionShellProps) {
  if (section.chromeless) {
    return <div style={{ display: 'grid', gap: 12 }}>{children}</div>;
  }
  const title = resolveLoc(section.title, locale);
  return (
    <section style={card}>
      {title && <SectionTitle title={title} emoji={section.icon} T={T} isRTL={isRTL} />}
      <div style={{ display: 'grid', gap: 12 }}>{children}</div>
    </section>
  );
}

// ── Block switch ───────────────────────────────────────────────────────────

interface BlockProps extends WeeklyReviewRendererProps {
  block: Block;
}

function BlockSwitch(p: BlockProps) {
  const { block, systemSlots } = p;
  switch (block.type) {
    case 'system-trades-table':
    case 'system-stat-chips':
    case 'system-risk-gauges':
    case 'system-grade':
    case 'system-ai-insights': {
      const slot = systemSlots[block.type];
      return slot ? <>{slot(block)}</> : null;
    }
    case 'checklist': return <ChecklistBlock {...p} />;
    case 'binary':    return <BinaryBlock {...p} />;
    case 'number':    return <NumberBlock {...p} />;
    case 'text':
    case 'textarea': return <TextBlock {...p} />;
    case 'select':    return <SelectBlock {...p} />;
    case 'multiselect': return <MultiSelectBlock {...p} />;
    case 'scale':     return <ScaleBlock {...p} />;
    case 'score':     return <ScoreBlock {...p} />;
    default:          return null;
  }
}

// ── Shared helpers ─────────────────────────────────────────────────────────

function useTokens(T: Theme) {
  const isLight = (T as { id?: string })?.id === 'platinum';
  return {
    isLight,
    fg: T?.text?.primary || (isLight ? '#0a0e1a' : '#e9eef7'),
    muted: T?.text?.muted || (isLight ? '#4b5566' : '#7a8aa3'),
    accent: isLight ? '#1d4ed8' : (T?.accent?.cyan || '#39FF14'),
    border: T?.border?.subtle || (isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)'),
    win: isLight ? '#0a8a4a' : (T?.status?.success || '#39FF14'),
    loss: T?.status?.danger || '#ff3b3b',
    warn: T?.status?.warning || (isLight ? '#b86e00' : '#ffb830'),
  };
}

function Label({ text, sub, T, isRTL }: { text?: string; sub?: string; T: Theme; isRTL: boolean }) {
  const tk = useTokens(T);
  if (!text && !sub) return null;
  return (
    <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
      {text && <div style={{ color: tk.fg, fontSize: 13, fontWeight: 600 }}>{text}</div>}
      {sub && <div style={{ color: tk.muted, fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function resolveLabel(loc: Loc | undefined, locale: 'he' | 'en') {
  return resolveLoc(loc, locale);
}

// ── Checklist ──────────────────────────────────────────────────────────────

function ChecklistBlock({ block, values, onChange, T, isRTL, locale }: BlockProps) {
  const cfg = block.config || {};
  const cycle: ChecklistState[] = cfg.cycle || ['neutral', 'done', 'missed'];
  const items = cfg.items || [];
  const tk = useTokens(T);
  const current = (values[block.id] as Record<string, ChecklistState> | undefined) || {};
  const label = resolveLabel(block.label, locale);
  const help = resolveLabel(block.helpText, locale);

  const cycleItem = (itemId: string) => {
    const cur = current[itemId] ?? 'neutral';
    const i = cycle.indexOf(cur);
    const next = cycle[(i + 1) % cycle.length];
    onChange(block.id, { ...current, [itemId]: next });
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {label && <Label text={label} T={T} isRTL={isRTL} />}
      {help && (
        <div style={{ color: tk.muted, fontSize: 11, textAlign: isRTL ? 'right' : 'left' }}>
          {help}
        </div>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map(item => {
          const state = current[item.id] ?? 'neutral';
          const polarity = item.goodIs ?? cfg.goodIs ?? 'done';
          const legacyGoodIs = STATE_TO_LEGACY_NUM[polarity] === 0 ? 1 : (STATE_TO_LEGACY_NUM[polarity] as 1 | 2);
          return (
            <TriState
              key={item.id}
              state={STATE_TO_LEGACY_NUM[state]}
              label={resolveLabel(item.label, locale)}
              tag={item.tag}
              goodIs={legacyGoodIs}
              T={T}
              isRTL={isRTL}
              onCycle={() => cycleItem(item.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Binary (Yes/No) ────────────────────────────────────────────────────────

function BinaryBlock({ block, values, onChange, T, isRTL, locale }: BlockProps) {
  const tk = useTokens(T);
  const cfg = block.config || {};
  const val = (values[block.id] as string | null | undefined) ?? '';
  const yesLbl = resolveLabel(cfg.valueMap?.yes, locale) || 'Yes';
  const noLbl = resolveLabel(cfg.valueMap?.no, locale) || 'No';
  const goodIsYes = cfg.goodValue === 'yes';

  function btn(active: boolean, color: string, label: string, onClick: () => void) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={{
          all: 'unset', cursor: 'pointer', padding: '10px 14px', borderRadius: 10,
          border: `1px solid ${active ? color : tk.border}`,
          background: active ? `${color}1c` : 'transparent',
          color: active ? color : tk.fg, fontSize: 13, fontWeight: 600, textAlign: 'center', flex: 1,
        }}
      >{label}</button>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <Label text={resolveLabel(block.label, locale)} sub={resolveLabel(block.helpText, locale)} T={T} isRTL={isRTL} />
      <div style={{ display: 'flex', gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        {btn(val === 'no', goodIsYes ? tk.loss : tk.win, noLbl, () => onChange(block.id, val === 'no' ? '' : 'no'))}
        {btn(val === 'yes', goodIsYes ? tk.win : tk.loss, yesLbl, () => onChange(block.id, val === 'yes' ? '' : 'yes'))}
      </div>
    </div>
  );
}

// ── Number ─────────────────────────────────────────────────────────────────

function NumberBlock({ block, values, onChange, T, isRTL, locale }: BlockProps) {
  const tk = useTokens(T);
  const cfg = block.config || {};
  const val = values[block.id];
  const display = val == null ? '' : String(val);
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <Label text={resolveLabel(block.label, locale)} sub={resolveLabel(block.helpText, locale)} T={T} isRTL={isRTL} />
      <input
        type="number"
        inputMode="numeric"
        value={display}
        min={cfg.min}
        max={cfg.max}
        step={cfg.step ?? 1}
        placeholder={resolveLabel(cfg.placeholder, locale)}
        onChange={e => onChange(block.id, e.target.value === '' ? null : Number(e.target.value))}
        style={{
          width: '100%', background: 'transparent', color: tk.fg, textAlign: isRTL ? 'right' : 'left',
          border: `1px solid ${tk.border}`, borderRadius: 10, padding: '12px 14px',
          fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box', minHeight: 44,
        }}
      />
    </div>
  );
}

// ── Text / Textarea ────────────────────────────────────────────────────────

function TextBlock({ block, values, onChange, T, isRTL, locale }: BlockProps) {
  const tk = useTokens(T);
  const cfg = block.config || {};
  const val = (values[block.id] as string | null | undefined) ?? '';
  const multiline = block.type === 'textarea' || cfg.multiline;
  const common: React.CSSProperties = {
    width: '100%', background: 'transparent', color: tk.fg, textAlign: isRTL ? 'right' : 'left',
    border: `1px solid ${tk.border}`, borderRadius: 10, padding: '12px 14px',
    fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <Label text={resolveLabel(block.label, locale)} sub={resolveLabel(block.helpText, locale)} T={T} isRTL={isRTL} />
      {multiline ? (
        <textarea
          value={val}
          maxLength={cfg.maxLength}
          placeholder={resolveLabel(cfg.placeholder, locale)}
          onChange={e => onChange(block.id, e.target.value)}
          style={{ ...common, minHeight: 120, resize: 'vertical' }}
        />
      ) : (
        <input
          type="text"
          value={val}
          maxLength={cfg.maxLength}
          placeholder={resolveLabel(cfg.placeholder, locale)}
          onChange={e => onChange(block.id, e.target.value)}
          style={{ ...common, minHeight: 44 }}
        />
      )}
    </div>
  );
}

// ── Select (pills or dropdown) ─────────────────────────────────────────────

function SelectBlock({ block, values, onChange, T, isRTL, locale }: BlockProps) {
  const tk = useTokens(T);
  const cfg = block.config || {};
  const opts = cfg.options || [];
  const val = (values[block.id] as string | null | undefined) ?? '';

  if (cfg.variant === 'dropdown') {
    return (
      <div style={{ display: 'grid', gap: 6 }}>
        <Label text={resolveLabel(block.label, locale)} sub={resolveLabel(block.helpText, locale)} T={T} isRTL={isRTL} />
        <select
          value={val}
          onChange={e => onChange(block.id, e.target.value)}
          style={{
            width: '100%', background: 'transparent', color: tk.fg, textAlign: isRTL ? 'right' : 'left',
            border: `1px solid ${tk.border}`, borderRadius: 10, padding: '12px 14px',
            fontFamily: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box', minHeight: 44,
          }}
        >
          <option value="">{resolveLabel(cfg.placeholder, locale) || '—'}</option>
          {opts.map(o => (
            <option key={o.id} value={o.id}>{resolveLabel(o.label, locale)}</option>
          ))}
        </select>
      </div>
    );
  }

  // Pills
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <Label text={resolveLabel(block.label, locale)} sub={resolveLabel(block.helpText, locale)} T={T} isRTL={isRTL} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        {opts.map(o => {
          const active = val === o.id;
          const sub = resolveLabel(o.sublabel, locale);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(block.id, active ? '' : o.id)}
              style={{
                all: 'unset', cursor: 'pointer', padding: '10px 14px', borderRadius: 999,
                border: `1px solid ${active ? tk.accent : tk.border}`,
                background: active ? `${tk.accent}1c` : 'transparent',
                color: active ? tk.accent : tk.fg, fontSize: 13, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              {o.emoji && <span>{o.emoji}</span>}
              <span>{resolveLabel(o.label, locale)}</span>
              {sub && <span style={{ color: tk.muted, fontSize: 11, marginInlineStart: 4 }}>· {sub}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Multiselect ────────────────────────────────────────────────────────────

function MultiSelectBlock({ block, values, onChange, T, isRTL, locale }: BlockProps) {
  const tk = useTokens(T);
  const cfg = block.config || {};
  const opts = cfg.options || [];
  const val = (values[block.id] as string[] | null | undefined) ?? [];
  const toggle = (id: string) => {
    const has = val.includes(id);
    onChange(block.id, has ? val.filter(v => v !== id) : [...val, id]);
  };
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <Label text={resolveLabel(block.label, locale)} sub={resolveLabel(block.helpText, locale)} T={T} isRTL={isRTL} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        {opts.map(o => {
          const active = val.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => toggle(o.id)}
              style={{
                all: 'unset', cursor: 'pointer', padding: '8px 12px', borderRadius: 999,
                border: `1px solid ${active ? tk.accent : tk.border}`,
                background: active ? `${tk.accent}1c` : 'transparent',
                color: active ? tk.accent : tk.fg, fontSize: 12, fontWeight: 600,
              }}
            >
              {resolveLabel(o.label, locale)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Scale (1..N) ───────────────────────────────────────────────────────────

function ScaleBlock({ block, values, onChange, T, isRTL, locale }: BlockProps) {
  const tk = useTokens(T);
  const cfg = block.config || {};
  const min = cfg.scaleMin ?? 1;
  const max = cfg.scaleMax ?? 5;
  const val = Number(values[block.id]) || 0;
  const buttons: number[] = [];
  for (let i = min; i <= max; i++) buttons.push(i);
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <Label text={resolveLabel(block.label, locale)} sub={resolveLabel(block.helpText, locale)} T={T} isRTL={isRTL} />
      <div style={{ display: 'flex', gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        {buttons.map(n => {
          const active = val === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(block.id, active ? 0 : n)}
              style={{
                all: 'unset', cursor: 'pointer', flex: 1, textAlign: 'center',
                padding: '12px 0', borderRadius: 10,
                border: `1px solid ${active ? tk.accent : tk.border}`,
                background: active ? `${tk.accent}1c` : 'transparent',
                color: active ? tk.accent : tk.fg, fontSize: 14, fontWeight: 700,
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            >{n}</button>
          );
        })}
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between', color: tk.muted, fontSize: 10,
        flexDirection: isRTL ? 'row-reverse' : 'row',
      }}>
        <span>{resolveLabel(cfg.minLabel, locale)}</span>
        <span>{resolveLabel(cfg.maxLabel, locale)}</span>
      </div>
    </div>
  );
}

// ── Score (computed display) ───────────────────────────────────────────────

function ScoreBlock({ block, values, T, isRTL, locale }: BlockProps) {
  const tk = useTokens(T);
  const cfg = block.config || {};
  const source = cfg.source;
  const max = cfg.scoreMax ?? 100;

  // Derive: checklist_percent over source block's items
  let score = 0;
  if (source && cfg.method === 'checklist_percent') {
    const items = (values[source] as Record<string, ChecklistState> | undefined) || {};
    const set = Object.values(items).filter(s => s !== 'neutral');
    const good = set.filter(s => s === 'done').length;
    score = set.length ? Math.round((good / set.length) * max) : 0;
  }
  const color = score >= 70 ? tk.win : score >= 40 ? tk.warn : tk.loss;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const bg = themeBgs(T).overlay;
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      <Label text={resolveLabel(block.label, locale)} sub={resolveLabel(block.helpText, locale)} T={T} isRTL={isRTL} />
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 28, fontWeight: 800, color,
        textAlign: isRTL ? 'right' : 'left',
      }}>{score}{max === 100 ? '%' : ` / ${max}`}</div>
    </div>
  );
}
