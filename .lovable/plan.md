# ORCA Bug Arena — Integration Plan (v2, schema verified)

Integrate the supplied community bug-reporting board into ORCA: backend schema, drop-in modules, route + global FAB, and a full reskin of the reference UI to match the ORCA dark/gold/cyan instrument aesthetic. **No existing logic, prop contracts, or `data-bug-*` hooks will be changed.**

## Pre-flight checks (done)

- **`public.profiles` columns verified**: `id, email, display_name, avatar_url, created_at, updated_at`. The "BETTER DISPLAY NAMES" variant of `bug_arena_people` referencing `p.display_name` and `p.avatar_url` will compile cleanly.
- **Updated schema file `01_orca_bug_arena_schema-2.sql`**: the Realtime block is now wrapped per-table in `IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=…)`, so re-runs no longer fail on `ALTER PUBLICATION … ADD TABLE`. Genuinely idempotent.
- **No naming collision**: project has no existing `user_roles` table; the additive Bug-Arena `user_roles(user_id, role text)` is safe.

---

## 1. Backend migration

Run **`01_orca_bug_arena_schema-2.sql`** (the v2 file) as a single migration, with **one** modification: replace the default `bug_arena_people` function (lines ~426–444) with the "BETTER DISPLAY NAMES" variant, pointing at `public.profiles.display_name` / `public.profiles.avatar_url`:

```sql
create or replace function public.bug_arena_people(_ids uuid[])
returns table (id uuid, display_name text, avatar_url text)
language sql stable security definer set search_path = public, auth as $$
  select
    u.id,
    coalesce(p.display_name, nullif(u.raw_user_meta_data->>'name',''),
             nullif(u.raw_user_meta_data->>'full_name',''), 'משתמש') as display_name,
    coalesce(p.avatar_url, u.raw_user_meta_data->>'avatar_url',
             u.raw_user_meta_data->>'picture') as avatar_url
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = any(_ids);
$$;
grant execute on function public.bug_arena_people(uuid[]) to authenticated;
```

The migration creates: `bug_reports`, `bug_reporters`, `bug_attachments`, `bug_comments`, `user_roles`; trigger `bug_reports_before_update`; RPCs `create_bug_report`, `join_bug`, `set_bug_status`, `has_role`, `reporter_count`, `is_sole_reporter`, `bug_arena_people`; all RLS policies (read-all to authenticated, DB-enforced deletion rule); GRANTS on every function; private storage bucket `bug-attachments` + object policies; guarded Realtime publication for the four tables.

### Admin seeding (manual step after migration)

I will not insert an admin row blindly. After the migration succeeds I'll ask for the owner email and run a single insert via the data tool:

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = '<OWNER_EMAIL>'
ON CONFLICT DO NOTHING;
```

Without this step, status dropdowns (open/in_progress/resolved/wont_fix/duplicate) will not appear for anyone. This is the only post-migration manual action.

---

## 2. Drop-in modules (verbatim)

Copy the supplied files into `src/features/bug-arena/`:

- `bugArenaTypes.ts`, `bugCaptureEngine.ts`, `bugArenaService.ts`, `useBugCapture.ts`, `useBugReports.ts`, `BugArenaComponents.tsx`
- New barrel `index.ts` exporting `BugArenaProvider`, `BugReportFab`, `BugBoard`
- New `section-resolver.ts` mapping ORCA routes → Hebrew section names

Dependency: `bun add html2canvas` (optional; engine degrades gracefully without it).

---

## 3. Mount

In `src/App.tsx`, inside the authenticated tree:

```tsx
<BugArenaProvider
  supabase={supabase}
  user={{ id: user.id, display_name: profile?.display_name, avatar_url: profile?.avatar_url }}
  accent="#f5c542"
  sectionResolver={mapRouteToHebrewArea}
  onReported={() => toast.success('הדיווח נשלח, תודה!')}
>
  {/* existing app */}
  <BugReportFab />
</BugArenaProvider>
```

- Add route `/bugs` → `<BugBoardPage />` (lazy-loaded).
- Add "באג ארנה" entry in the main nav (authenticated routes only).
- FAB suppressed on `/auth`, `/welcome`, legal pages, and when not authenticated.
- `mapRouteToHebrewArea` mirrors real ORCA routes (דשבורד, יומן מסחר, גרפים, הגדרות, יומן שבועי, רדאר מאקרו, וכו').

---

## 4. Reskin

Restyle **markup + Tailwind classes only** in `BugArenaComponents.tsx`; the inline reticle/label styles in `bugCaptureEngine.ts` may be retouched visually but logic, props and all `data-bug-*` hooks stay byte-identical.

- Surfaces: `#070b12` page → `#0b111b` panel → `#0f1622` raised; hairline `border-white/8`.
- Accent gold `#f5c542` (FAB, reticle, primary submit, required marker).
- Cyan `#37e0c6` strictly for join / dedup ("גם לי") actions.
- Status colors: open `#ff5470`, in_progress `#f5c542`, resolved `#37e0c6`, wont_fix/duplicate `#7c8aa0`.
- Type: Heebo (Hebrew), Poppins (Latin), `ui-monospace` for selector chip (`dir="ltr"`).
- Motion: subtle gold breathing on FAB; slide-up sheet on mobile / fade-scale on desktop; dedup reveals via height/opacity; honor `prefers-reduced-motion`.

Component-level treatments per the integration brief: gold reticle FAB with breathing glow; reticle with corner ticks + navy scrim; report modal with screenshot hero + quiet metadata chips; analyst-style annotation toolbar; cyan-edged dedup panel; board with section tabs + search + "הדיווחים שלי" toggle; cards with cover/status/type/title/timestamp/reporter cluster/contextual action (`גם לי קורה` / `הסר אותי` / `מחק`) + admin-only status `<select>`; reporters popover; detail drawer with mono LTR selector block, gallery, and realtime comments thread.

Accessibility floor: ≥44px tap targets, visible focus, preserved `touch-action: none` on inspect mode, preserved `safe-area-inset-bottom`.

---

## 5. i18n & RTL

The Bug Arena ships Hebrew-only by spec. The Bug Arena root will force `dir="rtl"` regardless of app language. No changes to ORCA's bilingual system elsewhere.

---

## 6. Smoke tests (after build)

1. Migration applies cleanly; `supabase--linter` reports no new errors.
2. `/bugs` renders; FAB visible only when authenticated.
3. FAB → inspect → tap element → modal opens pre-filled with section, element chip, screenshot.
4. Second report on the same route+element surfaces dedup; "גם לי" attaches without a new row.
5. With two reporters, the owner's button flips from `מחק` to `הסר אותי`; last remaining reporter can delete (cascades attachments + comments).
6. Reporter cluster + popover render; counts update across two tabs (Realtime).
7. Seeded admin can change status; non-admin attempt fails at DB layer.
8. Image-only upload enforced (`accept="image/*"`).
9. Mobile bottom-sheet renders with safe-area padding.
10. Existing build + typecheck still pass.

---

## Files touched

**New:**
- Migration via `supabase--migration` (the v2 file with the profiles-based `bug_arena_people`).
- `src/features/bug-arena/{bugArenaTypes,bugCaptureEngine,bugArenaService,useBugCapture,useBugReports,BugArenaComponents,section-resolver,index}.ts(x)`
- `src/pages/BugBoardPage.tsx`

**Edited (mount + nav only):**
- `src/App.tsx` — wrap with `BugArenaProvider`, mount `<BugReportFab />`, add `/bugs` route.
- Main nav component — add "באג ארנה" link.
- `package.json` — add `html2canvas`.

No edits to trading, import, journal, calendar, weekly review, settings, or any other existing module.
