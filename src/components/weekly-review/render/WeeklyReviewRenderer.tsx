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

import { useMemo, useState } from 'react';
import {
  DndContext, PointerSensor, KeyboardSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TriState } from '../widgets/TriState';
import { SectionTitle } from '../widgets/SectionTitle';
import { themeBgs } from '../lib/theme-bg';
import { BlockSection } from './blocks/BlockSection';
import { BlockScoreRing } from './blocks/BlockScoreRing';
import { ReflectionBoard } from './layout/ReflectionBoard';
import { ReflectionCard } from './layout/ReflectionCard';
import { groupSectionsByBand, resolveBand } from './layout/card-slots';
import { useStepNumbers } from './layout/useStepNumbers';
import { resolveSectionLayoutSpan } from './layout/layout-span';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
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
import {
  reorderBlock, reorderBlockTo, reorderSection, reorderSectionTo,
  demoteToChecklist, softDeleteBlock, addChecklistItem,
  softDeleteChecklistItem, hideBlock, showBlock, hideSection, showSection,
} from './customization';

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
  systemSlots: Partial<Record<SystemSlotId, (block: Block) => React.ReactNode>>;
  actionRegistry?: ActionRegistry;
  /** Wave-2 — edit mode shows reorder / hide / demote / delete / add controls. */
  editMode?: boolean;
  /** Required when editMode is true. */
  onTemplateChange?: (next: WeeklyReviewSchema) => void;
  /**
   * Wave-2 §E — non-destructive delete intercept. Caller inspects the archive
   * for usage of `slug` and returns true to proceed with deletion, false to
   * abort. If omitted, deletion proceeds immediately (legacy behavior).
   */
  onConfirmDelete?: (slug: string, kind: 'block' | 'item') => boolean | Promise<boolean>;
}

const STATE_TO_LEGACY_NUM: Record<ChecklistState, 0 | 1 | 2> = { neutral: 0, done: 1, missed: 2 };

export function WeeklyReviewRenderer(props: WeeklyReviewRendererProps) {
  const { schema, T, isRTL, locale, editMode, onTemplateChange } = props;
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

  // In fill mode, hidden items are filtered out (legacy). In edit mode, they
  // render greyed-out with a "show" toggle so users can restore them.
  const sections = useMemo(() => {
    const sorted = [...schema.sections].sort((a, b) => a.order - b.order);
    return editMode ? sorted : sorted.filter(s => !s.hidden);
  }, [schema.sections, editMode]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleSectionDragEnd = (e: DragEndEvent) => {
    if (!onTemplateChange) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = sections.map(s => s.id);
    const to = ids.indexOf(String(over.id));
    if (to < 0) return;
    onTemplateChange(reorderSectionTo(schema, String(active.id), to));
  };

  const renderedSections = sections.map((section, sIdx) => {
    const blocks = editMode
      ? [...section.blocks].sort((a, b) => a.order - b.order)
      : [...section.blocks].filter(b => !b.hidden).sort((a, b) => a.order - b.order);
    return (
      <SectionShell
        key={section.id}
        section={section}
        card={card}
        isFirst={sIdx === 0}
        isLast={sIdx === sections.length - 1}
        {...props}
      >
        <BlocksList section={section} blocks={blocks} {...props} />
      </SectionShell>
    );
  });

  // Step numbers for the main band only — risk/footer cards aren't numbered.
  const stepNumbers = useStepNumbers(sections);

  // Fill mode: 3-band ReflectionBoard. Customize mode keeps the legacy
  // vertical stack with dnd-kit so drag-reorder UX is unchanged.
  if (!editMode || !onTemplateChange) {
    const bands = groupSectionsByBand(sections);
    const toItem = (section: Section) => {
      const sIdx = sections.indexOf(section);
      const blocks = [...section.blocks].filter(b => !b.hidden).sort((a, b) => a.order - b.order);
      const span = resolveSectionLayoutSpan(section);
      const title = resolveLoc(section.title, locale);
      const band = resolveBand(section);
      const node = section.chromeless ? (
        <ReflectionCard isRTL={isRTL} chromeless>
          <BlocksList section={section} blocks={blocks} {...props} />
        </ReflectionCard>
      ) : (
        <ReflectionCard
          isRTL={isRTL}
          title={title}
          emoji={section.icon}
          step={band === 'main' ? stepNumbers[section.id] : undefined}
        >
          <BlocksList section={section} blocks={blocks} {...props} />
        </ReflectionCard>
      );
      // Silence unused-var warning while keeping the signature stable.
      void sIdx;
      return { id: section.id, span, node };
    };
    return (
      <ReflectionBoard
        isRTL={isRTL}
        risk={bands.risk.map(toItem)}
        main={bands.main.map(toItem)}
        footer={bands.footer.map(toItem)}
      />
    );
  }
  void renderedSections;

  const body = (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ display: 'grid', gap: 18, paddingBottom: 48 }}>
      {renderedSections}
    </div>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
      <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {body}
      </SortableContext>
    </DndContext>
  );
}

// ── Sortable wrappers ──────────────────────────────────────────────────────

function SortableSection({ id, children, editMode }: { id: string; children: (handleProps: React.HTMLAttributes<HTMLButtonElement>) => React.ReactNode; editMode?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editMode });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const handleProps = { ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>;
  return <div ref={setNodeRef} style={style}>{children(handleProps)}</div>;
}

function SortableBlock({ id, children, editMode }: { id: string; children: (handleProps: React.HTMLAttributes<HTMLButtonElement>) => React.ReactNode; editMode?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !editMode });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  const handleProps = { ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>;
  return <div ref={setNodeRef} style={style}>{children(handleProps)}</div>;
}

function GripButton({ disabled, handleProps, color, border }: { disabled?: boolean; handleProps?: React.HTMLAttributes<HTMLButtonElement>; color: string; border: string }) {
  return (
    <button
      type="button"
      {...handleProps}
      disabled={disabled}
      aria-label="drag to reorder"
      title="drag"
      style={{
        width: 26, height: 26, padding: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 6, border: `1px solid ${border}`,
        background: 'transparent', color, cursor: disabled ? 'not-allowed' : 'grab',
        fontSize: 14, lineHeight: 1, touchAction: 'none',
      }}
    >⋮⋮</button>
  );
}

// ── Section shell ──────────────────────────────────────────────────────────

interface SectionShellProps extends WeeklyReviewRendererProps {
  section: Section;
  card: React.CSSProperties;
  children: React.ReactNode;
  isFirst: boolean;
  isLast: boolean;
}

function SectionShell({ section, card, T, isRTL, locale, children, isFirst, isLast, editMode, onTemplateChange, schema }: SectionShellProps) {
  const tk = useTokens(T);
  const sectionLocked = section.system === true || section.removable === false;
  const canHide = section.removable !== false; // even system-but-removable (risk, insights)

  const rail = editMode && onTemplateChange ? (
    <SectionRail
      section={section}
      isFirst={isFirst}
      isLast={isLast}
      sectionLocked={sectionLocked}
      canHide={canHide}
      tk={tk}
      onMove={(d) => onTemplateChange(reorderSection(schema, section.id, d))}
      onHide={() => onTemplateChange(hideSection(schema, section.id))}
      onShow={() => onTemplateChange(showSection(schema, section.id))}
    />
  ) : null;

  const greyedStyle: React.CSSProperties = section.hidden && editMode
    ? { opacity: 0.5, position: 'relative' }
    : {};

  const inner = (handleProps?: React.HTMLAttributes<HTMLButtonElement>) => {
    if (section.chromeless) {
      return (
        <div style={{ display: 'grid', gap: 12, ...greyedStyle }}>
          {rail && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              {!sectionLocked && handleProps && <GripButton handleProps={handleProps} color={tk.muted} border={tk.border} />}
              {rail}
              <span style={{ color: tk.muted, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {section.id}{section.hidden ? ' · hidden' : ''}
              </span>
            </div>
          )}
          {children}
        </div>
      );
    }
    const title = resolveLoc(section.title, locale);
    // Phase 1: fill-mode (no rail) → MUI Card via BlockSection. Edit-mode keeps
    // the inline-styled shell (Phase 3 owns customize-mode redesign).
    if (!editMode) {
      return (
        <BlockSection title={title} emoji={section.icon} isRTL={isRTL}>
          {children}
        </BlockSection>
      );
    }
    return (
      <section style={{ ...card, ...greyedStyle }}>
        {rail && (
          <div style={{
            display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}>
            {!sectionLocked && handleProps && <GripButton handleProps={handleProps} color={tk.muted} border={tk.border} />}
            {rail}
            {section.hidden && (
              <span style={{ color: tk.muted, fontSize: 11 }}>· hidden</span>
            )}
          </div>
        )}
        {title && <SectionTitle title={title} emoji={section.icon} T={T} isRTL={isRTL} />}
        <div style={{ display: 'grid', gap: 12 }}>{children}</div>
      </section>
    );
  };

  if (!editMode || !onTemplateChange) return inner();
  return <SortableSection id={section.id} editMode={editMode}>{inner}</SortableSection>;
}

interface RailProps {
  section: Section;
  isFirst: boolean;
  isLast: boolean;
  sectionLocked: boolean;
  canHide: boolean;
  tk: ReturnType<typeof useTokens>;
  onMove: (d: -1 | 1) => void;
  onHide: () => void;
  onShow: () => void;
}

function SectionRail({ section, isFirst, isLast, sectionLocked, canHide, tk, onMove, onHide, onShow }: RailProps) {
  const btn: React.CSSProperties = {
    width: 26, height: 26, padding: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, border: `1px solid ${tk.border}`,
    background: 'transparent', color: tk.muted, cursor: 'pointer',
    fontSize: 12, lineHeight: 1,
  };
  return (
    <div style={{ display: 'inline-flex', gap: 4 }}>
      <button type="button" style={btn} disabled={sectionLocked || isFirst} onClick={() => onMove(-1)} aria-label={`move ${section.id} up`} title="↑">↑</button>
      <button type="button" style={btn} disabled={sectionLocked || isLast}  onClick={() => onMove(1)}  aria-label={`move ${section.id} down`} title="↓">↓</button>
      {canHide && (
        section.hidden
          ? <button type="button" style={btn} onClick={onShow} aria-label={`show ${section.id}`} title="show">👁</button>
          : <button type="button" style={btn} onClick={onHide} aria-label={`hide ${section.id}`} title="hide">🚫</button>
      )}
    </div>
  );
}

// ── Blocks list (sortable inner context) ───────────────────────────────────

function BlocksList(p: WeeklyReviewRendererProps & { section: Section; blocks: Block[] }) {
  const { section, blocks, editMode, onTemplateChange, schema } = p;

  const handleDragEnd = (e: DragEndEvent) => {
    if (!onTemplateChange) return;
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = blocks.map(b => b.id);
    const to = ids.indexOf(String(over.id));
    if (to < 0) return;
    onTemplateChange(reorderBlockTo(schema, section.id, String(active.id), to));
  };

  const list = blocks.map((block, idx) => (
    <EditableBlock
      key={block.id}
      block={block}
      section={section}
      isFirst={idx === 0}
      isLast={idx === blocks.length - 1}
      {...p}
    />
  ));

  // Fill mode: blocks stack vertically inside their section card. The packing
  // grid lives ONE level up (section-level). Stacking blocks vertically here
  // is what guarantees a checklist always gets the full width of its parent
  // card — no nested half-width grid can starve it to 0px.
  if (!editMode || !onTemplateChange) {
    return <>{list}</>;
  }
  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
        {list}
      </SortableContext>
    </DndContext>
  );
}

// ── Editable block wrapper (Wave-2 Item 4) ─────────────────────────────────

interface EditableBlockProps extends WeeklyReviewRendererProps {
  block: Block;
  section: Section;
  isFirst: boolean;
  isLast: boolean;
}

function EditableBlock(p: EditableBlockProps) {
  const { block, section, isFirst, isLast, editMode, onTemplateChange, onConfirmDelete, schema, T, isRTL } = p;
  const tk = useTokens(T);
  if (!editMode || !onTemplateChange) {
    return <BlockSwitch {...p} />;
  }
  // Locked spine: trades_table, stat_chips, final_grade — no rail at all.
  const fullyLocked = block.locked === true || block.removable === false;
  // Hide-only blocks (e.g. risk_gauges, ai_insights): system + editable===false
  // but parent section is removable — allow hide, no delete/demote/reorder.
  const isSystem = block.type.startsWith('system-');
  const canDelete = !fullyLocked && !isSystem;
  const canDemote = canDelete && block.type !== 'checklist';
  const canReorder = !fullyLocked && !isSystem;
  const canHide = !fullyLocked; // system-but-not-locked may be hidden

  const btn: React.CSSProperties = {
    width: 26, height: 26, padding: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 6, border: `1px solid ${tk.border}`,
    background: 'transparent', color: tk.muted, cursor: 'pointer',
    fontSize: 12, lineHeight: 1,
  };
  const danger: React.CSSProperties = { ...btn, color: tk.loss };
  const move = (delta: -1 | 1) => onTemplateChange(reorderBlock(schema, section.id, block.id, delta));
  const demote = () => onTemplateChange(demoteToChecklist(schema, section.id, block.id));
  const del = async () => {
    const ok = onConfirmDelete ? await onConfirmDelete(block.id, 'block') : true;
    if (ok) onTemplateChange(softDeleteBlock(schema, section.id, block.id));
  };
  const greyed = block.hidden ? { opacity: 0.45 } : {};

  const inner = (handleProps?: React.HTMLAttributes<HTMLButtonElement>) => (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: isRTL ? 'row-reverse' : 'row', ...greyed }}>
      {canReorder && handleProps && <GripButton handleProps={handleProps} color={tk.muted} border={tk.border} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <BlockSwitch {...p} />
      </div>
      {!fullyLocked && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, paddingTop: 4 }}>
          {canReorder && (
            <>
              <button type="button" style={btn} disabled={isFirst} onClick={() => move(-1)} aria-label={`move ${block.id} up`} title="↑">↑</button>
              <button type="button" style={btn} disabled={isLast}  onClick={() => move(1)}  aria-label={`move ${block.id} down`} title="↓">↓</button>
            </>
          )}
          {canHide && (
            block.hidden
              ? <button type="button" style={btn} onClick={() => onTemplateChange(showBlock(schema, section.id, block.id))} aria-label={`show ${block.id}`} title="show">👁</button>
              : <button type="button" style={btn} onClick={() => onTemplateChange(hideBlock(schema, section.id, block.id))} aria-label={`hide ${block.id}`} title="hide">🚫</button>
          )}
          {canDemote && (
            <button type="button" style={btn} onClick={demote} aria-label={`demote ${block.id}`} title="demote">⇣</button>
          )}
          {canDelete && (
            <button type="button" style={danger} onClick={() => void del()} aria-label={`delete ${block.id}`} title="delete">×</button>
          )}
        </div>
      )}
    </div>
  );

  if (!canReorder) return inner();
  return <SortableBlock id={block.id} editMode={editMode}>{inner}</SortableBlock>;
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
    case 'score':     return <BlockScoreRing block={p.block} values={p.values} locale={p.locale} isRTL={p.isRTL} />;
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

function ChecklistBlock(p: BlockProps) {
  const { block, values, onChange, T, isRTL, locale, actionRegistry,
          editMode, onTemplateChange, onConfirmDelete, schema } = p;
  const cfg = block.config || {};
  const cycle: ChecklistState[] = cfg.cycle || ['neutral', 'done', 'missed'];
  const items = cfg.items || [];
  const tk = useTokens(T);
  const current = (values[block.id] as Record<string, ChecklistState> | undefined) || {};
  const label = resolveLabel(block.label, locale);
  const help = resolveLabel(block.helpText, locale);
  const canEdit = !!(editMode && onTemplateChange);
  const parentSection = canEdit ? schema.sections.find(s => s.blocks.some(b => b.id === block.id)) : undefined;
  const [adding, setAdding] = useState('');

  const cycleItem = (itemId: string) => {
    const cur = current[itemId] ?? 'neutral';
    const i = cycle.indexOf(cur);
    const next = cycle[(i + 1) % cycle.length];
    onChange(block.id, { ...current, [itemId]: next });
  };

  const deleteItem = async (itemId: string) => {
    if (!canEdit || !parentSection) return;
    const ok = onConfirmDelete ? await onConfirmDelete(itemId, 'item') : true;
    if (ok) onTemplateChange!(softDeleteChecklistItem(schema, parentSection.id, block.id, itemId));
  };
  const submitAdd = () => {
    if (!canEdit || !parentSection || !adding.trim()) return;
    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    onTemplateChange!(addChecklistItem(schema, parentSection.id, block.id, { he: adding, en: adding }, suffix));
    setAdding('');
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
          const hasAction = !!(item.action && actionRegistry && actionRegistry[item.action.target]);
          const tri = (
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
          if (!hasAction && !canEdit) return tri;
          return (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>{tri}</div>
              {hasAction && (
                <button
                  type="button"
                  aria-label={`open ${item.action!.target}`}
                  onClick={() => invokeAction(item.action, actionRegistry)}
                  title={resolveLabel(item.label, locale)}
                  style={{
                    flexShrink: 0, width: 32, height: 32,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 8, border: `1px solid ${tk.border}`,
                    background: 'transparent', color: tk.accent, cursor: 'pointer',
                    fontSize: 14, lineHeight: 1,
                  }}
                >
                  {isRTL ? '↖' : '↗'}
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  aria-label={`delete ${item.id}`}
                  onClick={() => void deleteItem(item.id)}
                  style={{
                    flexShrink: 0, width: 26, height: 26,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 6, border: `1px solid ${tk.border}`,
                    background: 'transparent', color: tk.loss, cursor: 'pointer',
                    fontSize: 12, lineHeight: 1,
                  }}
                >×</button>
              )}
            </div>
          );
        })}
        {canEdit && (
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <input
              type="text"
              value={adding}
              onChange={e => setAdding(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitAdd(); } }}
              placeholder={isRTL ? 'הוסף פריט מותאם…' : 'Add custom item…'}
              style={{
                flex: 1, minWidth: 0,
                background: 'transparent', color: tk.fg,
                border: `1px solid ${tk.border}`, borderRadius: 8,
                padding: '6px 10px', fontSize: 12, outline: 'none',
                textAlign: isRTL ? 'right' : 'left',
              }}
            />
            <button
              type="button"
              onClick={submitAdd}
              disabled={!adding.trim()}
              style={{
                padding: '6px 12px', fontSize: 12,
                borderRadius: 8, border: `1px solid ${tk.border}`,
                background: 'transparent', color: tk.accent,
                cursor: adding.trim() ? 'pointer' : 'not-allowed',
              }}
            >+</button>
          </div>
        )}
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

// Score block: now rendered by BlockScoreRing (Phase 1, restored SVG donut
// with locked 80/50 thresholds — see render/blocks/BlockScoreRing.tsx).

