// =====================================================================
//  ORCA · BUG ARENA — useBugReports hook (the board)
// =====================================================================
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createBugArenaService,
  type BugArenaService,
} from './bugArenaService';
import type {
  BugWithMeta,
  BoardFilter,
  BugStatus,
  ResolutionVerdict,
} from './bugArenaTypes';

export interface UseBugReports {
  loading: boolean;
  error: string | null;
  bugs: BugWithMeta[];
  /** bugs grouped by section, sections sorted by activity */
  grouped: { section: string; bugs: BugWithMeta[] }[];
  filter: BoardFilter;
  setFilter: (patch: Partial<BoardFilter>) => void;
  refresh: () => void;

  isAdmin: boolean;

  join: (bug: BugWithMeta) => Promise<void>;
  /** leaves if others remain, otherwise deletes — matches the spec rule */
  leaveOrDelete: (bug: BugWithMeta) => Promise<void>;
  remove: (bug: BugWithMeta) => Promise<void>;
  setStatus: (bug: BugWithMeta, status: BugStatus) => Promise<void>;

  setVerdict: (
    bug: BugWithMeta,
    verdict: ResolutionVerdict,
    note?: string | null
  ) => Promise<void>;
  clearVerdict: (bug: BugWithMeta) => Promise<void>;

  /** whether the action button for this bug should read delete vs leave */
  canHardDelete: (bug: BugWithMeta) => boolean;
}

export function useBugReports(
  supabase: SupabaseClient,
  currentUserId: string,
  opts?: { adminOverride?: boolean }
): UseBugReports {
  const api: BugArenaService = useMemo(
    () => createBugArenaService(supabase),
    [supabase]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bugs, setBugs] = useState<BugWithMeta[]>([]);
  const [isAdmin, setIsAdmin] = useState(!!opts?.adminOverride);
  const [filter, setFilterState] = useState<BoardFilter>({
    section: 'all',
    status: 'all',
    onlyMine: false,
    search: '',
  });

  const filterRef = useRef(filter);
  filterRef.current = filter;

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.listBoard(filterRef.current, currentUserId);
      setBugs(data);
    } catch (e: any) {
      setError(e?.message || 'שגיאה בטעינת הדיווחים');
    } finally {
      setLoading(false);
    }
  }, [api, currentUserId]);

  // admin check once
  useEffect(() => {
    if (opts?.adminOverride) return;
    let alive = true;
    api.isAdmin(currentUserId).then((v) => alive && setIsAdmin(v));
    return () => {
      alive = false;
    };
  }, [api, currentUserId, opts?.adminOverride]);

  // (re)load on filter change
  useEffect(() => {
    setLoading(true);
    load();
  }, [load, filter]);

  // realtime — debounced refresh on any change
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    const bump = () => {
      if (t) clearTimeout(t);
      t = setTimeout(load, 250);
    };
    const channel = supabase
      .channel('orca-bug-arena')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bug_reports' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bug_reporters' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bug_attachments' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bug_resolution_feedback' }, bump)
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  const setFilter = useCallback((patch: Partial<BoardFilter>) => {
    setFilterState((f) => ({ ...f, ...patch }));
  }, []);

  const canHardDelete = useCallback(
    (bug: BugWithMeta) => isAdmin || (bug.isMine && bug.reporterCount === 1),
    [isAdmin]
  );

  // optimistic-ish actions (realtime will reconcile)
  const join = useCallback(
    async (bug: BugWithMeta) => {
      await api.joinBug(bug.id);
      load();
    },
    [api, load]
  );

  const remove = useCallback(
    async (bug: BugWithMeta) => {
      await api.deleteBug(bug);
      setBugs((b) => b.filter((x) => x.id !== bug.id));
    },
    [api]
  );

  const leaveOrDelete = useCallback(
    async (bug: BugWithMeta) => {
      if (bug.reporterCount <= 1) {
        await remove(bug);
      } else {
        await api.leaveBug(bug.id, currentUserId);
        load();
      }
    },
    [api, currentUserId, remove, load]
  );

  const setStatus = useCallback(
    async (bug: BugWithMeta, status: BugStatus) => {
      await api.setStatus(bug.id, status);
      load();
    },
    [api, load]
  );

  const setVerdict = useCallback(
    async (bug: BugWithMeta, verdict: ResolutionVerdict, note?: string | null) => {
      await api.setResolutionVerdict(bug.id, currentUserId, verdict, note ?? null);
      load();
    },
    [api, currentUserId, load]
  );

  const clearVerdict = useCallback(
    async (bug: BugWithMeta) => {
      await api.clearResolutionVerdict(bug.id, currentUserId);
      load();
    },
    [api, currentUserId, load]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, BugWithMeta[]>();
    for (const b of bugs) {
      const arr = map.get(b.section) || [];
      arr.push(b);
      map.set(b.section, arr);
    }
    return Array.from(map.entries())
      .map(([section, list]) => ({ section, bugs: list }))
      .sort((a, b) => b.bugs.length - a.bugs.length);
  }, [bugs]);

  return {
    loading,
    error,
    bugs,
    grouped,
    filter,
    setFilter,
    refresh: load,
    isAdmin,
    join,
    leaveOrDelete,
    remove,
    setStatus,
    setVerdict,
    clearVerdict,
    canHardDelete,
  };
}
