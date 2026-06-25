// CWR rollout flag (Wave 0). Single switch for one-line revert during bake.
//
// Default OFF until the side-by-side parity gate is green. The legacy
// JSX path in WeeklyTab.tsx remains the source of truth until then.

export const WR_SCHEMA_RENDERER_ENABLED = false as const;
