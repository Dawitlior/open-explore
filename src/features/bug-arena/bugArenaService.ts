// =====================================================================
//  ORCA · BUG ARENA — Service layer
// =====================================================================
//  This is the ONLY file that talks to the backend. If you ever move off
//  Supabase, reimplement this same interface and nothing else changes.
//
//  Identity / display names are DECOUPLED from your schema: this layer
//  never embeds your `profiles` table. It hydrates reporter / comment
//  display info via the `bug_arena_people` RPC (see the SQL file), so it
//  works regardless of how your profiles table is shaped.
//
//  Usage:
//      import { createClient } from '@supabase/supabase-js';
//      const supabase = createClient(URL, ANON_KEY);
//      const api = createBugArenaService(supabase);
//
//  In a Lovable project you already have a client at
//      '@/integrations/supabase/client'  -> pass that in.
// =====================================================================

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BugAttachment,
  BugComment,
  BugReport,
  BugReporter,
  BugWithMeta,
  BoardFilter,
  CreateBugInput,
  SimilarBugQuery,
  AttachmentKind,
  BugStatus,
  ProfileLite,
} from './bugArenaTypes';

const BUCKET = 'bug-attachments';
const SIGNED_TTL = 60 * 60; // 1h

export interface BugArenaService {
  isAdmin(userId: string): Promise<boolean>;

  listBoard(filter: BoardFilter, currentUserId: string): Promise<BugWithMeta[]>;
  getBug(bugId: string, currentUserId: string): Promise<BugWithMeta | null>;
  findSimilarBugs(q: SimilarBugQuery): Promise<BugWithMeta[]>;

  createBugReport(input: CreateBugInput): Promise<BugReport>;
  deleteBug(bug: BugWithMeta): Promise<void>;
  setStatus(bugId: string, status: BugStatus): Promise<void>;

  joinBug(bugId: string, note?: string): Promise<void>;
  leaveBug(bugId: string, userId: string): Promise<void>;
  updateMyNote(bugId: string, userId: string, note: string): Promise<void>;

  uploadAttachment(
    bugId: string,
    userId: string,
    blob: Blob,
    kind: AttachmentKind,
    size?: { width: number; height: number }
  ): Promise<BugAttachment>;
  removeAttachment(att: BugAttachment): Promise<void>;

  listComments(bugId: string): Promise<BugComment[]>;
  addComment(bugId: string, body: string): Promise<BugComment>;
  deleteComment(commentId: string): Promise<void>;

  signUrls<T extends { storage_path: string }>(rows: T[]): Promise<(T & { url: string | null })[]>;
}

// No profile embedding here — display info is hydrated via bug_arena_people.
const SELECT_BUG = `
  *,
  reporters:bug_reporters(bug_id, user_id, note, created_at),
  attachments:bug_attachments(id, bug_id, user_id, storage_path, kind, width, height, created_at)
`;

export function createBugArenaService(supabase: SupabaseClient): BugArenaService {
  // -- display-name hydration (schema-agnostic) ---------------------
  async function hydratePeople(ids: string[]): Promise<Map<string, ProfileLite>> {
    const map = new Map<string, ProfileLite>();
    const unique = Array.from(new Set(ids)).filter(Boolean);
    if (unique.length === 0) return map;
    const { data, error } = await supabase.rpc('bug_arena_people', { _ids: unique });
    if (error || !data) return map;
    for (const p of data as ProfileLite[]) map.set(p.id, p);
    return map;
  }

  async function signedUrlMap(paths: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const unique = Array.from(new Set(paths)).filter(Boolean);
    if (unique.length === 0) return map;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(unique, SIGNED_TTL);
    if (error || !data) return map;
    for (const row of data) {
      if (row.signedUrl && (row as any).path) map.set((row as any).path, row.signedUrl);
    }
    return map;
  }

  // -- turn raw rows into board meta --------------------------------
  async function enrich(rows: any[], currentUserId: string): Promise<BugWithMeta[]> {
    const paths: string[] = [];
    const personIds: string[] = [];
    for (const r of rows) {
      for (const a of r.attachments || []) paths.push(a.storage_path);
      for (const rep of r.reporters || []) personIds.push(rep.user_id);
    }
    const [urlMap, people] = await Promise.all([
      signedUrlMap(paths),
      hydratePeople(personIds),
    ]);

    return rows.map((r: any): BugWithMeta => {
      const attachments: BugAttachment[] = (r.attachments || []).map((a: any) => ({
        ...a,
        url: urlMap.get(a.storage_path) ?? null,
      }));
      const reporters: BugReporter[] = (r.reporters || []).map((rep: any) => ({
        ...rep,
        profile: people.get(rep.user_id) ?? null,
      }));
      const cover =
        attachments.find((a) => a.kind === 'annotation') ||
        attachments.find((a) => a.kind === 'screenshot') ||
        attachments[0];
      return {
        ...r,
        reporters,
        attachments,
        reporterCount: reporters.length,
        isMine: reporters.some((x) => x.user_id === currentUserId),
        coverUrl: cover?.url ?? null,
      };
    });
  }

  return {
    async isAdmin(userId) {
      if (!userId) return false;
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'admin',
      });
      if (error) return false;
      return data === true;
    },

    async listBoard(filter, currentUserId) {
      // "only mine" => first resolve my bug ids, then fetch full rows
      let onlyMineIds: string[] | null = null;
      if (filter.onlyMine && currentUserId) {
        const { data: mine } = await supabase
          .from('bug_reporters')
          .select('bug_id')
          .eq('user_id', currentUserId);
        onlyMineIds = (mine || []).map((m: any) => m.bug_id);
        if (onlyMineIds.length === 0) return [];
      }

      let q = supabase
        .from('bug_reports')
        .select(SELECT_BUG)
        .order('created_at', { ascending: false });

      if (filter.section && filter.section !== 'all') q = q.eq('section', filter.section);
      if (filter.status && filter.status !== 'all') q = q.eq('status', filter.status);
      if (onlyMineIds) q = q.in('id', onlyMineIds);
      if (filter.search && filter.search.trim()) {
        const s = `%${filter.search.trim()}%`;
        q = q.or(`description.ilike.${s},title.ilike.${s},section.ilike.${s}`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return enrich(data || [], currentUserId);
    },

    async getBug(bugId, currentUserId) {
      const { data, error } = await supabase
        .from('bug_reports')
        .select(SELECT_BUG)
        .eq('id', bugId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [enriched] = await enrich([data], currentUserId);
      return enriched;
    },

    async findSimilarBugs(qy) {
      // Strong signal = same route. Then rank: exact selector match first.
      let q = supabase
        .from('bug_reports')
        .select(SELECT_BUG)
        .in('status', ['open', 'in_progress'])
        .limit(6);
      if (qy.route) q = q.eq('route', qy.route);
      else q = q.eq('section', qy.section);

      const { data, error } = await q;
      if (error) throw error;
      const rows = await enrich(data || [], '');
      const score = (b: BugWithMeta) =>
        (b.element_selector && b.element_selector === qy.selector ? 100 : 0) +
        b.reporterCount;
      return rows.sort((a, b) => score(b) - score(a)).slice(0, 4);
    },

    async createBugReport(input) {
      const { data, error } = await supabase.rpc('create_bug_report', {
        p_description: input.description,
        p_section: input.section ?? 'general',
        p_route: input.route ?? null,
        p_bug_type: input.bug_type ?? 'other',
        p_severity: input.severity ?? 'medium',
        p_title: input.title ?? null,
        p_element_selector: input.element_selector ?? null,
        p_element_label: input.element_label ?? null,
        p_element_rect: input.element_rect ?? null,
        p_viewport: input.viewport ?? null,
        p_diagnostics: input.diagnostics ?? null,
      });
      if (error) throw error;
      return data as BugReport;
    },

    async deleteBug(bug) {
      // Remove storage objects first (RLS lets you delete your own; admins
      // may also remove others'). Then delete the row (cascades children).
      const paths = (bug.attachments || []).map((a) => a.storage_path);
      if (paths.length) {
        await supabase.storage.from(BUCKET).remove(paths); // best-effort
      }
      const { error } = await supabase.from('bug_reports').delete().eq('id', bug.id);
      if (error) throw error; // RLS enforces "sole reporter or admin"
    },

    async setStatus(bugId, status) {
      const { error } = await supabase.rpc('set_bug_status', {
        p_bug_id: bugId,
        p_status: status,
      });
      if (error) throw error;
    },

    async joinBug(bugId, note) {
      const { error } = await supabase.rpc('join_bug', {
        p_bug_id: bugId,
        p_note: note ?? null,
      });
      if (error) throw error;
    },

    async leaveBug(bugId, userId) {
      // DB rejects this if you are the last reporter -> caller should
      // delete the bug instead in that case.
      const { error } = await supabase
        .from('bug_reporters')
        .delete()
        .eq('bug_id', bugId)
        .eq('user_id', userId);
      if (error) throw error;
    },

    async updateMyNote(bugId, userId, note) {
      const { error } = await supabase
        .from('bug_reporters')
        .update({ note })
        .eq('bug_id', bugId)
        .eq('user_id', userId);
      if (error) throw error;
    },

    async uploadAttachment(bugId, userId, blob, kind, size) {
      const ext = blob.type.includes('png') ? 'png' : 'jpg';
      const path = `${userId}/${bugId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, blob, {
        contentType: blob.type || 'image/png',
        upsert: false,
      });
      if (up.error) throw up.error;

      const { data, error } = await supabase
        .from('bug_attachments')
        .insert({
          bug_id: bugId,
          user_id: userId,
          storage_path: path,
          kind,
          width: size?.width ?? null,
          height: size?.height ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      const urlMap = await signedUrlMap([path]);
      return { ...(data as BugAttachment), url: urlMap.get(path) ?? null };
    },

    async removeAttachment(att) {
      await supabase.storage.from(BUCKET).remove([att.storage_path]);
      const { error } = await supabase.from('bug_attachments').delete().eq('id', att.id);
      if (error) throw error;
    },

    async listComments(bugId) {
      const { data, error } = await supabase
        .from('bug_comments')
        .select('*')
        .eq('bug_id', bugId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const rows = (data || []) as BugComment[];
      const people = await hydratePeople(rows.map((c) => c.user_id));
      return rows.map((c) => ({ ...c, profile: people.get(c.user_id) ?? null }));
    },

    async addComment(bugId, body) {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      const { data, error } = await supabase
        .from('bug_comments')
        .insert({ bug_id: bugId, user_id: uid, body })
        .select('*')
        .single();
      if (error) throw error;
      const c = data as BugComment;
      const people = await hydratePeople([c.user_id]);
      return { ...c, profile: people.get(c.user_id) ?? null };
    },

    async deleteComment(commentId) {
      const { error } = await supabase.from('bug_comments').delete().eq('id', commentId);
      if (error) throw error;
    },

    async signUrls(rows) {
      const map = await signedUrlMap(rows.map((r) => r.storage_path));
      return rows.map((r) => ({ ...r, url: map.get(r.storage_path) ?? null }));
    },
  };
}
