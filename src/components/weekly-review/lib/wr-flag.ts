// CWR rollout flags.
//
// Wave-0: schema renderer toggle (one-line revert during bake).
// Wave-1: persistence floor (snapshot + values + version on WeekRecord).
// Wave-2: edit-mode customization (drag/reorder, demote, delete, add).

export const WR_SCHEMA_RENDERER_ENABLED = true as const;

// Wave-2 customization surface (Edit-template toolbar, item add/delete, etc).
export const WR_EDIT_MODE_ENABLED = true as const;

// Item-3 contract guard. When TRUE (default), version mismatches between the
// stored user template and ORCA_DEFAULT_TEMPLATE are NOT auto-applied. Instead
// the hook surfaces a pending-merge preview and keeps the stored template
// untouched until the user explicitly accepts. Setting this to FALSE restores
// silent additive auto-merge (the prior behavior) — useful only for tests.
export const WR_MERGE_REQUIRES_CONSENT = true as const;
