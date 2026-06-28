import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { moduleIdOfRoot } from '../data/roots';
import { signOut as libSignOut } from '../core/auth';
import { resolveEntryView } from '../core/consentGate';
import { isEntitlementActive } from '../core/entitlement';
import {
  clearRemoteProgress,
  localProgressKey,
  markPendingPush,
  removeLocalProgress,
  saveProgress as saveRemoteProgress,
} from '../core/progress';
import { addStudentProfile, deleteStudentProfile, renameStudentProfile } from '../core/profile';
import type { Entitlement, LessonProgressRow, Profile, StudentProfile } from '../core/supabase';

export type AppView = 'home' | 'deck' | 'quiz' | 'auth' | 'consent' | 'dashboard' | 'paywall';

// 'loading' until bootstrapProgress (src/core/hydrate.ts) settles the Supabase
// session, then one of: 'anonymous' (try-before-buy), 'authenticated' (a real
// parent/student account), or 'signed-out' (no session / no backend).
export type AuthStatus = 'loading' | 'anonymous' | 'authenticated' | 'signed-out';

/** Lean projection of the Supabase auth user kept in the store. */
export interface AuthUser {
  id: string;
  email: string | null;
  isAnonymous: boolean;
}

const ACTIVE_STUDENT_KEY = 'wondral:activeStudent:v1';

function loadActiveStudentId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_STUDENT_KEY) || null;
  } catch {
    return null;
  }
}

function saveActiveStudentId(id: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (id) localStorage.setItem(ACTIVE_STUDENT_KEY, id);
    else localStorage.removeItem(ACTIVE_STUDENT_KEY);
  } catch {
    // ignore quota / privacy errors
  }
}

export interface RootProgressRecord {
  completed: true;
  completedAt: number;
}

export type RootProgress = Record<string, RootProgressRecord>;

// Progress is namespaced per active student (a null studentId = anonymous /
// free-play). The shared key scheme lives in core/progress so local and remote
// sync agree.
function loadProgress(studentId: string | null): RootProgress {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(localProgressKey(studentId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as RootProgress;
    return {};
  } catch {
    return {};
  }
}

function saveProgress(p: RootProgress, studentId: string | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(localProgressKey(studentId), JSON.stringify(p));
  } catch {
    // ignore quota / privacy errors
  }
}

function completedIdSet(p: RootProgress): Set<string> {
  return new Set(Object.keys(p));
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

interface WondralStore {
  // Top-level view.
  view: AppView;
  setView: (v: AppView) => void;

  // Auth & account (parent-rooted model). `authStatus` resolves from 'loading'
  // once bootstrapProgress settles the session. Driven by the onAuthStateChange
  // subscription in src/core/hydrate.ts; components read it but shouldn't set it.
  authStatus: AuthStatus;
  authUser: AuthUser | null;
  profile: Profile | null;
  applyAuthUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;

  // Parent's purchase state (loaded by hydrate after a parent profile resolves).
  entitlement: Entitlement | null;
  entitlementLoaded: boolean;
  setEntitlement: (e: Entitlement | null) => void;
  /**
   * The single, safe entry to the upgrade flow. Routes through the COPPA entry
   * gate (resolveEntryView) so "Go Premium" can never dead-end: it lands on
   * auth / consent / paywall (or stays put) depending on state — never an error.
   */
  requestUpgrade: () => void;
  signOut: () => Promise<void>;

  // Students (parent-rooted). `students` is the parent's roster; `activeStudentId`
  // is the child currently learning — it namespaces local progress and stamps
  // every progress row. null = anonymous / free-play.
  students: StudentProfile[];
  activeStudentId: string | null;
  setStudents: (students: StudentProfile[]) => void;
  setActiveStudent: (id: string | null) => void;
  addStudent: (nickname: string, avatar: string) => Promise<StudentProfile | null>;
  renameStudent: (id: string, nickname: string) => Promise<void>;
  removeStudent: (id: string) => Promise<void>;

  // Password-recovery (set-new-password) flow.
  passwordRecovery: boolean;
  beginPasswordRecovery: () => void;
  endPasswordRecovery: () => void;

  // Which tier the home menu / deck is focused on (1..5), or null for "all".
  selectedTier: number | null;
  setSelectedTier: (t: number | null) => void;

  // Root (flashcard) tracking.
  currentRootId: string | null;
  openRoot: (id: string) => void;
  closeRoot: () => void;
  progress: RootProgress;
  completedRoots: Set<string>;
  completeRoot: (id: string) => void;
  celebration: { rootId: string } | null;
  dismissCelebration: () => void;
  resetProgress: () => void;
  hydrateFromServer: (rows: LessonProgressRow[], studentId: string | null) => void;
}

const INITIAL_ACTIVE_STUDENT = loadActiveStudentId();
const INITIAL_PROGRESS = loadProgress(INITIAL_ACTIVE_STUDENT);

export const useWondralStore = create<WondralStore>((set, get) => ({
  view: 'home',
  setView: (v) => set({ view: v }),

  authStatus: 'loading',
  authUser: null,
  profile: null,
  applyAuthUser: (user) =>
    set((s) => {
      if (!user)
        return {
          authStatus: 'signed-out',
          authUser: null,
          profile: null,
          entitlement: null,
          entitlementLoaded: true,
        };
      const isAnonymous = user.is_anonymous ?? false;
      const changedUser = s.authUser?.id !== user.id;
      return {
        authUser: { id: user.id, email: user.email ?? null, isAnonymous },
        authStatus: isAnonymous ? 'anonymous' : 'authenticated',
        profile: changedUser ? null : s.profile,
        entitlement: changedUser ? null : s.entitlement,
        entitlementLoaded: changedUser ? false : s.entitlementLoaded,
      };
    }),
  setProfile: (profile) => set({ profile }),

  entitlement: null,
  entitlementLoaded: false,
  setEntitlement: (e) => set({ entitlement: e, entitlementLoaded: true }),
  requestUpgrade: () => {
    const s = get();
    const view = resolveEntryView({
      authStatus: s.authStatus,
      role: s.profile?.role ?? null,
      consentAt: s.profile?.consent_at ?? null,
      entitled: isEntitlementActive(s.entitlement),
      offline: isOffline(),
      intent: 'upgrade',
    });
    if (view === 'loading') return;
    set({ view });
  },
  signOut: async () => {
    await libSignOut();
    saveActiveStudentId(null);
    const freePlay = loadProgress(null);
    set({
      authStatus: 'signed-out',
      authUser: null,
      profile: null,
      entitlement: null,
      entitlementLoaded: true,
      students: [],
      activeStudentId: null,
      progress: freePlay,
      completedRoots: completedIdSet(freePlay),
      view: 'home',
    });
  },

  students: [],
  activeStudentId: INITIAL_ACTIVE_STUDENT,
  setStudents: (students) => set({ students }),
  setActiveStudent: (id) => {
    saveActiveStudentId(id);
    const next = loadProgress(id);
    set({ activeStudentId: id, progress: next, completedRoots: completedIdSet(next) });
  },
  addStudent: async (nickname, avatar) => {
    const parentId = get().authUser?.id;
    if (!parentId) return null;
    const student = await addStudentProfile(parentId, { nickname, avatar });
    set((s) => ({ students: [...s.students, student] }));
    return student;
  },
  renameStudent: async (id, nickname) => {
    const updated = await renameStudentProfile(id, nickname);
    set((s) => ({ students: s.students.map((stu) => (stu.id === id ? updated : stu)) }));
  },
  removeStudent: async (id) => {
    await deleteStudentProfile(id);
    removeLocalProgress(id);
    set((s) => ({ students: s.students.filter((stu) => stu.id !== id) }));
    if (get().activeStudentId === id) get().setActiveStudent(null);
  },

  passwordRecovery: false,
  beginPasswordRecovery: () => set({ passwordRecovery: true, view: 'auth' }),
  endPasswordRecovery: () => set({ passwordRecovery: false }),

  selectedTier: null,
  setSelectedTier: (t) => set({ selectedTier: t }),

  currentRootId: null,
  openRoot: (id) => set({ currentRootId: id, view: 'deck' }),
  closeRoot: () => set({ currentRootId: null, view: 'home' }),
  progress: INITIAL_PROGRESS,
  completedRoots: completedIdSet(INITIAL_PROGRESS),
  completeRoot: (id) => {
    const cur = get().progress;
    if (cur[id]) return;
    const studentId = get().activeStudentId;
    const completedAt = Date.now();
    const next: RootProgress = { ...cur, [id]: { completed: true, completedAt } };
    saveProgress(next, studentId);
    set({
      progress: next,
      completedRoots: completedIdSet(next),
      celebration: { rootId: id },
    });

    const moduleId = moduleIdOfRoot(id);
    void saveRemoteProgress(id, { moduleId, completed: true, studentId }).catch((err) => {
      markPendingPush({
        lessonId: id,
        moduleId,
        completedAt: new Date(completedAt).toISOString(),
        studentId,
      });
       
      console.warn('[progress] remote save failed for', id, '— queued for retry', err);
    });
  },
  celebration: null,
  dismissCelebration: () => set({ celebration: null }),
  resetProgress: () => {
    const studentId = get().activeStudentId;
    saveProgress({}, studentId);
    set({ progress: {}, completedRoots: new Set() });
    void clearRemoteProgress(studentId).catch((err) => {
       
      console.warn('[progress] remote clear failed', err);
    });
  },
  hydrateFromServer: (rows, studentId) => {
    // If the active student changed while the fetch was in flight, drop the stale
    // write — merging now would write one child's progress into another's map.
    if (get().activeStudentId !== studentId) return;
    const cur = get().progress;
    const merged: RootProgress = { ...cur };
    for (const row of rows) {
      if (!row.completed) continue;
      const sourceIso = row.completed_at ?? row.created_at;
      const ts = sourceIso ? new Date(sourceIso).getTime() : Date.now();
      merged[row.lesson_id] = { completed: true, completedAt: ts };
    }
    saveProgress(merged, studentId);
    set({ progress: merged, completedRoots: completedIdSet(merged) });
  },
}));

// Dev-only handle so the preview harness + console debugging can drive the store.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__wondralStore = useWondralStore;
}
