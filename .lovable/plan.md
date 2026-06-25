# Plan — Wave 2 (CWR: Customization + Template Upgrades + Action Deep-Links)

Wave 0 status: schema renderer LIVE behind `WR_SCHEMA_RENDERER_ENABLED=true`. Parity gate green (92 tests). Legacy JSX path retained as one-line revert.

Wave 2 lands the three items deferred from the Wave-0 sign-off, in dependency order. Item 3 (merge) is the gating dependency for Items 4 and 5.

---

## Item 3 — Template Merge/Upgrade Mechanism (GATING)

**Goal**: A user who was seeded with template vN can receive vN+1 default-template improvements (new sections, new blocks, deep-link metadata) without losing their answers, customizations, or order.

**Contract (non-negotiable)**:
- **Additive only.** Merge may ADD sections/blocks. It may never RENAME slugs, never DELETE a user-touched block, never reorder user-customized sequences.
- **Slug is identity.** Every section/block has a stable `slug`. Merge keys on slug, never on label or index.
- **User edits win.** If a block exists in both vN-user and vN+1-default and the user has touched it (custom label, demoted, reordered, deleted), keep user version. Default-only metadata fields (e.g. new `action` deep-link on an untouched item) are layered onto the user copy.
- **Deletions are tombstoned, not erased.** A user "delete" sets `deleted: true` on the block; merge respects the tombstone and will not re-introduce the slug.

**Files**:
- `src/components/weekly-review/lib/wr-schema.ts` — extend `Block` with optional `deleted?: true`, `customized?: true`, `action?: ActionRef`. Add `TEMPLATE_VERSION` constant.
- `src/components/weekly-review/lib/wr-default-template.ts` — bump version; export `DEFAULT_TEMPLATE_VERSION`.
- `src/components/weekly-review/lib/wr-merge.ts` *(new)* — `mergeTemplate(userTpl, defaultTpl)` pure function. Sibling tests: `__tests__/wr-merge.test.ts` covering:
  - add new section / add new block to existing section
  - layer new `action` onto untouched block (kept) vs touched block (skipped)
  - tombstoned slug not reintroduced
  - reordering preserved
  - rename attempt in default rejected (assert via slug-collision check)
- `src/components/weekly-review/hooks/use-week-draft.ts` — on load, if `draft.templateVersion < DEFAULT_TEMPLATE_VERSION`, run `mergeTemplate`, persist result, bump version.

**QA gate**: 12+ unit cases on `mergeTemplate`; one integration test that seeds a v1 draft, bumps default to v2 with a new block + new action, loads draft, asserts merged shape and that user answers survive.

---

## Item 4 — Customization Surface (drag/reorder, demote, delete, add)

**Depends on**: Item 3 (needs `customized`/`deleted` flags + slug identity).

**Goal**: Users can reorder blocks, demote rich blocks (binary/select/scale) to plain checkbox, delete blocks, and add new custom checklist items — all within a section, persisted per-user, surviving template upgrades.

**Files**:
- `src/components/weekly-review/render/WeeklyReviewRenderer.tsx` — add `editMode` prop. When true, wrap each block in a drag handle (dnd-kit) and show per-block kebab menu (Demote / Delete / Rename label).
- `src/components/weekly-review/render/EditModeToolbar.tsx` *(new)* — section-scoped "Add item" + "Done editing" controls.
- `src/components/weekly-review/render/customization.ts` *(new)* — pure helpers: `reorder(section, fromSlug, toIndex)`, `demoteToChecklist(block)`, `softDelete(block)`, `addChecklistItem(section, label)`. All return new template; all set `customized: true` on touched nodes.
- `src/components/weekly-review/tabs/WeeklyTab.tsx` — add `Edit` button in header that toggles `editMode`.
- Dependency: `bun add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`.

**QA gate**: Smoke test that reorders 3 items, demotes a binary, soft-deletes a checklist row, reloads, asserts persistence + tombstone survives a v+1 merge (cross-test with Item 3).

---

## Item 5 — Action Deep-Links on Prep Items

**Depends on**: Item 3 (action metadata must be additive on the default template so already-seeded users receive it via merge).

**Goal**: Specific prep items carry an `action` that opens the relevant module (Statistical Trade Log / Weekly Calendar / Market Journal) in a side-panel or new route, without leaving the review.

**Files**:
- `src/components/weekly-review/lib/wr-schema.ts` — define `ActionRef = { id: 'open-trade-log' | 'open-calendar' | 'open-journal'; params?: Record<string, string> }`.
- `src/components/weekly-review/render/action-registry.ts` *(new)* — `Record<ActionRef['id'], (params, ctx) => void>`. Registered by host in `WeeklyTab.tsx` so the renderer stays host-agnostic (mirrors the `systemSlots` pattern).
- `src/components/weekly-review/render/WeeklyReviewRenderer.tsx` — when a checklist item has `action`, render a small arrow/launch affordance next to its label; click invokes the registry.
- `src/components/weekly-review/lib/wr-default-template.ts` — annotate the three target prep items with their `action`. Bump `DEFAULT_TEMPLATE_VERSION`; Item-3 merge delivers it to existing users.

**QA gate**: Renderer test asserts (a) action affordance appears only when `action` present, (b) click invokes the right registry handler with params, (c) absence of registry entry degrades to plain checkbox (no crash).

---

## Sequencing & Exit Criteria

1. **Item 3** lands first behind no flag (pure data-layer, idempotent on already-up-to-date drafts). Exit: merge tests green + one integration test green.
2. **Item 5** lands next (small, leverages Item 3 to ship to existing users). Exit: 3 deep-links functional, registry fallback safe.
3. **Item 4** lands last (largest UI surface). Gated behind `WR_EDIT_MODE_ENABLED` for staged bake. Exit: customization round-trips through Item-3 merge in cross-test.

No changes to legacy JSX path. No changes to grading/metrics. Adapter contract unchanged.
