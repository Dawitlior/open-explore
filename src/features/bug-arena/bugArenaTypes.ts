// =====================================================================
//  ORCA · BUG ARENA — Shared types (the contract)
// =====================================================================
//  These mirror the SQL schema 1:1. Every other file imports from here.
//  If you change a column in the schema, change it here too.
// =====================================================================

export type BugType = 'visual' | 'crash' | 'data' | 'performance' | 'other';
export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'wont_fix'
  | 'duplicate';
export type AttachmentKind = 'screenshot' | 'annotation' | 'illustration';

export interface ElementRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
  dpr: number;
}

/** Lightweight, free context captured at the moment the element is picked.
 *  This is NOT a heavy diagnostics feature — just the few values that come
 *  for free and help you locate the bug. */
export interface CaptureContext {
  capturedAt: string; // ISO
  route: string | null; // location.pathname + hash
  url: string | null;
  userAgent: string;
  language: string;
  viewport: Viewport;
}

export interface ProfileLite {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface BugReporter {
  bug_id: string;
  user_id: string;
  note: string | null;
  created_at: string;
  profile?: ProfileLite | null;
}

export interface BugAttachment {
  id: string;
  bug_id: string;
  user_id: string;
  storage_path: string;
  kind: AttachmentKind;
  width: number | null;
  height: number | null;
  created_at: string;
  /** populated client-side via a signed URL */
  url?: string | null;
}

export interface BugComment {
  id: string;
  bug_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profile?: ProfileLite | null;
}

export type ResolutionVerdict = 'fixed' | 'not_fixed';

export interface BugResolutionFeedback {
  bug_id: string;
  user_id: string;
  verdict: ResolutionVerdict;
  /** optional reason, mainly when verdict is 'not_fixed' */
  note: string | null;
  created_at: string;
  updated_at: string;
  profile?: ProfileLite | null;
}

export interface BugReport {
  id: string;
  title: string | null;
  description: string;
  section: string;
  route: string | null;
  bug_type: BugType;
  severity: BugSeverity;
  status: BugStatus;
  element_selector: string | null;
  element_label: string | null;
  element_rect: ElementRect | null;
  viewport: Viewport | null;
  diagnostics: CaptureContext | null;
  dedup_key: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** A bug row enriched for the board UI. */
export interface BugWithMeta extends BugReport {
  reporters: BugReporter[];
  attachments: BugAttachment[];
  reporterCount: number;
  isMine: boolean;
  coverUrl: string | null;
}

export interface CreateBugInput {
  description: string;
  section?: string;
  route?: string | null;
  bug_type?: BugType;
  severity?: BugSeverity;
  title?: string | null;
  element_selector?: string | null;
  element_label?: string | null;
  element_rect?: ElementRect | null;
  viewport?: Viewport | null;
  diagnostics?: CaptureContext | null;
}

export interface SimilarBugQuery {
  route: string | null;
  selector: string | null;
  section: string;
}

export interface BoardFilter {
  section?: string | null;
  status?: BugStatus | 'all' | null;
  onlyMine?: boolean;
  search?: string | null;
}

// ---------------------------------------------------------------------
// Display dictionaries (Hebrew). Keep UI strings here, not scattered.
// ---------------------------------------------------------------------
export const BUG_TYPE_LABEL: Record<BugType, string> = {
  visual: 'תקלה ויזואלית',
  crash: 'קריסה',
  data: 'נתון שגוי',
  performance: 'איטיות / ביצועים',
  other: 'אחר',
};

export const SEVERITY_LABEL: Record<BugSeverity, string> = {
  low: 'נמוכה',
  medium: 'בינונית',
  high: 'גבוהה',
  critical: 'קריטית',
};

export const STATUS_LABEL: Record<BugStatus, string> = {
  open: 'פתוח',
  in_progress: 'בטיפול',
  resolved: 'נפתר',
  wont_fix: 'לא יטופל',
  duplicate: 'כפילות',
};

// English mirrors
export const BUG_TYPE_LABEL_EN: Record<BugType, string> = {
  visual: 'Visual glitch',
  crash: 'Crash',
  data: 'Wrong data',
  performance: 'Slow / Performance',
  other: 'Other',
};

export const SEVERITY_LABEL_EN: Record<BugSeverity, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const STATUS_LABEL_EN: Record<BugStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  wont_fix: 'Won\u2019t fix',
  duplicate: 'Duplicate',
};

export const bugTypeLabel = (v: BugType, lang: 'he' | 'en' = 'he') =>
  (lang === 'en' ? BUG_TYPE_LABEL_EN : BUG_TYPE_LABEL)[v];
export const severityLabel = (v: BugSeverity, lang: 'he' | 'en' = 'he') =>
  (lang === 'en' ? SEVERITY_LABEL_EN : SEVERITY_LABEL)[v];
export const statusLabel = (v: BugStatus, lang: 'he' | 'en' = 'he') =>
  (lang === 'en' ? STATUS_LABEL_EN : STATUS_LABEL)[v];

