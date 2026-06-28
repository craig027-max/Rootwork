import { supabase, hasSupabaseConfig, type LessonProgressRow } from './supabase';
import { getCurrentUser } from './auth';

/**
 * localStorage keys used by the zustand store (see src/app/store.ts).
 * Progress is namespaced per active student so two children sharing one device
 * (and one parent account) each keep their own offline map. The map is an object
 * keyed by completed root id.
 */
const PROGRESS_KEY_BASE = 'wondral:progress:v1';

/**
 * localStorage key for a given student's completed-root map. A null studentId
 * (anonymous / free-play, no student selected) uses the bare base key.
 */
export function localProgressKey(studentId: string | null): string {
  return studentId ? `${PROGRESS_KEY_BASE}:${studentId}` : PROGRESS_KEY_BASE;
}

/**
 * Root ids whose remote upsert failed and need to be retried. Persisted so a
 * failed write during one session is replayed on the next boot or when the
 * connection returns. Each entry carries its own studentId so the queue can mix
 * children; each is removed once the row lands on the server.
 */
const PENDING_PUSH_KEY = 'wondral:progress:pending:v1';

/** Default module (tier) id used when a root can't be classified more specifically. */
const DEFAULT_MODULE_ID = 'tier-1';

interface PendingEntry {
  lessonId: string;
  moduleId: string;
  completedAt: string;
  /** Which student the completion belongs to; null = free-play / no student. */
  studentId: string | null;
}

export interface SaveProgressInput {
  moduleId: string;
  /** Which student this completion belongs to; null = free-play / no student. */
  studentId?: string | null;
  completed?: boolean;
  score?: number | null;
  timeSpentSeconds?: number | null;
}

export type ModuleResolver = (lessonId: string) => string;

/** Unique-constraint columns for the progress upsert (see migration). */
const ON_CONFLICT = 'user_id,student_id,module_id,lesson_id';

/** Stable key for de-duping a (student, root) pair in the pending queue. */
function pendingKey(studentId: string | null, lessonId: string): string {
  return `${studentId ?? ''}::${lessonId}`;
}

/**
 * Upsert a single progress row for the current user, attributed to a student
 * (or null for free-play). Throws if no user is signed in.
 */
export async function saveProgress(
  lessonId: string,
  data: SaveProgressInput,
): Promise<LessonProgressRow | null> {
  if (!hasSupabaseConfig) return null;
  const user = await getCurrentUser();
  if (!user) throw new Error('saveProgress: no authenticated user');

  const completed = data.completed ?? true;
  const row = {
    user_id: user.id,
    student_id: data.studentId ?? null,
    lesson_id: lessonId,
    module_id: data.moduleId,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
    score: data.score ?? null,
    time_spent_seconds: data.timeSpentSeconds ?? null,
  };

  const { data: saved, error } = await supabase
    .from('lesson_progress')
    .upsert(row, { onConflict: ON_CONFLICT })
    .select()
    .single();

  if (error) throw error;
  return saved as LessonProgressRow;
}

/**
 * Fetch progress rows for one student under a user (defaults to current user).
 * Pass studentId=null for the free-play rows. RLS restricts results to the
 * authenticated parent's own rows regardless.
 */
export async function getProgress(
  studentId: string | null,
  userId?: string,
): Promise<LessonProgressRow[]> {
  if (!hasSupabaseConfig) return [];
  const targetId = userId ?? (await getCurrentUser())?.id;
  if (!targetId) return [];

  let query = supabase.from('lesson_progress').select('*').eq('user_id', targetId);
  // PostgREST needs `is` for NULL comparisons; `eq(null)` doesn't match.
  query = studentId === null ? query.is('student_id', null) : query.eq('student_id', studentId);

  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LessonProgressRow[];
}

/**
 * Fetch every progress row owned by a parent across all their students (defaults
 * to current user). Used by the parent dashboard, which groups the rows by
 * student_id client-side. RLS scopes the result to the parent's rows.
 */
export async function getAllStudentProgress(userId?: string): Promise<LessonProgressRow[]> {
  if (!hasSupabaseConfig) return [];
  const targetId = userId ?? (await getCurrentUser())?.id;
  if (!targetId) return [];

  const { data, error } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', targetId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as LessonProgressRow[];
}

/**
 * Push locally-stored progress for a student into Supabase. Used when an
 * anonymous or first-time user signs up, or when switching to a student whose
 * device-local completions haven't synced. Existing rows are left untouched.
 * Returns the number of new rows written.
 */
export async function syncLocalToRemote(
  studentId: string | null,
  opts?: { resolveModuleId?: ModuleResolver },
): Promise<number> {
  if (!hasSupabaseConfig) return 0;
  const user = await getCurrentUser();
  if (!user) return 0;

  const local = readLocalCompletedLessons(studentId);
  if (local.length === 0) return 0;

  const resolveModuleId = opts?.resolveModuleId ?? (() => DEFAULT_MODULE_ID);
  const now = new Date().toISOString();

  const rows = local.map((lessonId) => ({
    user_id: user.id,
    student_id: studentId,
    lesson_id: lessonId,
    module_id: resolveModuleId(lessonId),
    completed: true,
    completed_at: now,
  }));

  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert(rows, { onConflict: ON_CONFLICT, ignoreDuplicates: true })
    .select('id');

  if (error) throw error;
  return data?.length ?? 0;
}

/**
 * Delete every progress row for one student under the current user. Mirrors the
 * local `resetProgress` action — without this, a local wipe would be undone by
 * the next bootstrap pulling rows back from the server.
 */
export async function clearRemoteProgress(studentId: string | null): Promise<void> {
  if (!hasSupabaseConfig) return;
  const user = await getCurrentUser();
  if (!user) return;

  // Also discard this student's pending retries — we just wiped, nothing to push.
  clearPendingPushes(studentId);

  let query = supabase.from('lesson_progress').delete().eq('user_id', user.id);
  query = studentId === null ? query.is('student_id', null) : query.eq('student_id', studentId);

  const { error } = await query;
  if (error) throw error;
}

/**
 * Queue a progress write for later retry. Called when an in-session remote save
 * fails (network blip, offline, transient 5xx). Drained by `flushPendingPushes`
 * after the next successful auth/hydrate or when the browser fires `online`.
 */
export function markPendingPush(entry: PendingEntry): void {
  if (typeof localStorage === 'undefined') return;
  const current = readPendingPushes();
  const next = current.filter(
    (e) => pendingKey(e.studentId, e.lessonId) !== pendingKey(entry.studentId, entry.lessonId),
  );
  next.push(entry);
  try {
    localStorage.setItem(PENDING_PUSH_KEY, JSON.stringify(next));
  } catch {
    // ignore quota/privacy errors
  }
}

/**
 * Attempt to flush queued progress writes to Supabase. Each entry carries its
 * own studentId, so a mixed-child queue flushes correctly. Successful rows are
 * removed; failures stay queued. Safe to call frequently — it bails immediately
 * when offline, unconfigured, or signed out.
 */
export async function flushPendingPushes(): Promise<number> {
  if (!hasSupabaseConfig) return 0;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;

  const pending = readPendingPushes();
  if (pending.length === 0) return 0;

  const user = await getCurrentUser();
  if (!user) return 0;

  const rows = pending.map((p) => ({
    user_id: user.id,
    student_id: p.studentId,
    lesson_id: p.lessonId,
    module_id: p.moduleId,
    completed: true,
    completed_at: p.completedAt,
  }));

  const { data, error } = await supabase
    .from('lesson_progress')
    .upsert(rows, { onConflict: ON_CONFLICT, ignoreDuplicates: true })
    .select('lesson_id, student_id');

  if (error) {
    return 0;
  }

  const landed = new Set(
    (data ?? []).map((r) =>
      pendingKey((r.student_id as string | null) ?? null, r.lesson_id as string),
    ),
  );
  const remaining = pending.filter((p) => !landed.has(pendingKey(p.studentId, p.lessonId)));
  writePendingPushes(remaining);
  return landed.size;
}

/**
 * Drop a removed student's local footprint: their completed-root namespace and
 * any queued retries. The server rows cascade-delete with the student row, so
 * this only cleans up localStorage.
 */
export function removeLocalProgress(studentId: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(localProgressKey(studentId));
  } catch {
    // ignore quota/privacy errors
  }
  clearPendingPushes(studentId);
}

/** Remove one student's entries from the pending queue (null = free-play). */
function clearPendingPushes(studentId: string | null): void {
  if (typeof localStorage === 'undefined') return;
  const remaining = readPendingPushes().filter((e) => e.studentId !== studentId);
  writePendingPushes(remaining);
}

function readPendingPushes(): PendingEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_PUSH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is Record<string, unknown> =>
          e &&
          typeof e === 'object' &&
          typeof e.lessonId === 'string' &&
          typeof e.moduleId === 'string' &&
          typeof e.completedAt === 'string',
      )
      .map((e) => ({
        lessonId: e.lessonId as string,
        moduleId: e.moduleId as string,
        completedAt: e.completedAt as string,
        studentId: typeof e.studentId === 'string' ? e.studentId : null,
      }));
  } catch {
    return [];
  }
}

function writePendingPushes(entries: PendingEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (entries.length === 0) {
      localStorage.removeItem(PENDING_PUSH_KEY);
    } else {
      localStorage.setItem(PENDING_PUSH_KEY, JSON.stringify(entries));
    }
  } catch {
    // ignore
  }
}

function readLocalCompletedLessons(studentId: string | null): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(localProgressKey(studentId));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.keys(parsed);
      }
    }
  } catch {
    // ignore
  }
  return [];
}
