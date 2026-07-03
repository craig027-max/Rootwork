import { useWondralStore } from '../app/store';
import { moduleIdOfRoot, resumeRootId } from '../data/roots';
import { getCurrentUser, getSession, onAuthStateChange, signInAnonymously } from './auth';
import { flushPendingPushes, getProgress, syncLocalToRemote } from './progress';
import { getProfile, getStudentProfiles } from './profile';
import { gateEntitled, getEntitlement, isEntitlementActive } from './entitlement';
import { resolveParentLanding } from './parentLanding';
import { hasSupabaseConfig, type StudentProfile } from './supabase';

/** Resolve the module (tier) id a root belongs to — for the progress unique key. */
export function resolveModuleId(rootId: string): string {
  return moduleIdOfRoot(rootId);
}

let bootstrapped = false;

/**
 * Boot server-backed progress. Ensures a Supabase session (anonymous if none),
 * pushes local-only completions up, then pulls the merged row set down and folds
 * it into the store. Server timestamps win on conflict.
 *
 * Safe to call from any environment — if Supabase is misconfigured or the network
 * is down, this logs and bails; localStorage continues working as the offline
 * fallback.
 */
export async function bootstrapProgress(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  if (!hasSupabaseConfig) {
    // No backend — resolve the auth slice to 'signed-out' so gating UI doesn't
    // hang on 'loading'. Free play continues against localStorage.
    useWondralStore.getState().applyAuthUser(null);
    routeResume();
    return;
  }

  try {
    await ensureSession();
    await syncAuthState();
    await hydrateOnce();
    routeResume();
  } catch (err) {
     
    console.warn('[progress] initial sync failed', err);
  }

  onAuthStateChange((event, session) => {
    useWondralStore.getState().applyAuthUser(session?.user ?? null);

    if (event === 'PASSWORD_RECOVERY') {
      useWondralStore.getState().beginPasswordRecovery();
    }

    if (event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
      void loadProfileIntoStore();
    }

    if (event === 'SIGNED_IN') {
      void loadProfileIntoStore()
        .then(() => hydrateOnce())
        .catch((err) => {
           
          console.warn('[progress] resync after sign-in failed', err);
        });
    }
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      flushPendingPushes().catch((err) => {
         
        console.warn('[progress] online flush failed', err);
      });
    });
  }
}

async function ensureSession(): Promise<void> {
  const session = await getSession();
  if (session) return;
  await signInAnonymously();
}

/** Push the current Supabase user + profile into the store's auth slice. */
async function syncAuthState(): Promise<void> {
  const user = await getCurrentUser();
  useWondralStore.getState().applyAuthUser(user);
  if (user) await loadProfileIntoStore(user.id);
}

/** Load the profile row (and, for parents, the student roster) into the store. */
async function loadProfileIntoStore(userId?: string): Promise<void> {
  try {
    const id = userId ?? (await getCurrentUser())?.id;
    if (!id) return;
    const profile = await getProfile(id);
    const store = useWondralStore.getState();
    store.setProfile(profile);

    if (profile?.role === 'parent') {
      const students = await getStudentProfiles(id);
      store.setStudents(students);
      try {
        store.setEntitlement(await getEntitlement(id));
      } catch (err) {
         
        console.warn('[entitlement] load failed (treating as none)', err);
      }
      routeParentLanding(students);
      return;
    }

    store.setEntitlement(null);

    // A real (non-anonymous) account that hasn't completed onboarding needs to be
    // routed to consent. We surface the screen; the consent flow assigns the role.
    // Legal pages are exempt: reading the privacy policy BEFORE consenting is
    // exactly what the consent screen invites the parent to do.
    const authUser = store.authUser;
    const currentView = store.view;
    if (
      authUser &&
      !authUser.isAnonymous &&
      profile &&
      !profile.role &&
      currentView !== 'auth' &&
      currentView !== 'consent' &&
      currentView !== 'privacy' &&
      currentView !== 'terms'
    ) {
      store.setView('consent');
    }
  } catch (err) {
     
    console.warn('[profile] load failed', err);
  }
}

/**
 * Decide where a parent lands once their roster is known. The routing decision is
 * the pure, unit-tested `resolveParentLanding` — including the ghost case where
 * the persisted active id is no longer in the roster.
 */
function routeParentLanding(students: StudentProfile[]): void {
  const store = useWondralStore.getState();
  if (
    store.view === 'auth' ||
    store.view === 'consent' ||
    store.view === 'deck' ||
    store.view === 'quiz' ||
    store.view === 'privacy' ||
    store.view === 'terms'
  )
    return;

  const landing = resolveParentLanding(
    store.activeStudentId,
    students.map((s) => s.id),
  );
  if (landing.action === 'keep') return;
  if (landing.action === 'select') {
    store.setActiveStudent(landing.studentId);
    return;
  }
  if (landing.clearGhost) store.setActiveStudent(null);
  store.setView('dashboard');
}

/**
 * Boot-time resume: drop a returning learner straight back into the root they'd
 * "Continue" with. Only fires when the app would otherwise land on home, and uses
 * the same `entitled` rule the UIs use so resume never opens a locked root.
 */
function routeResume(): void {
  const store = useWondralStore.getState();
  if (store.view !== 'home') return;
  const entitled = gateEntitled({
    active: isEntitlementActive(store.entitlement),
    authStatus: store.authStatus,
    entitlementLoaded: store.entitlementLoaded,
  });
  const target = resumeRootId(store.completedRoots, entitled);
  if (target) store.openRoot(target);
}

async function hydrateOnce(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const studentId = useWondralStore.getState().activeStudentId;

  await syncLocalToRemote(studentId, { resolveModuleId });
  await flushPendingPushes();

  const rows = await getProgress(studentId, user.id);
  useWondralStore.getState().hydrateFromServer(rows, studentId);
}

/**
 * Re-run sync + pull for whichever student is now active. Called after the parent
 * switches students from the dashboard so the new child's progress folds in.
 */
export async function hydrateActiveStudent(): Promise<void> {
  try {
    await hydrateOnce();
  } catch (err) {
     
    console.warn('[progress] active-student hydrate failed', err);
  }
}
