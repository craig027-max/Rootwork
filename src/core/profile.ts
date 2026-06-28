import { supabase, hasSupabaseConfig, type Profile, type StudentProfile } from './supabase';

/**
 * Fetch a single profile row by user id. Returns null if the row doesn't exist
 * yet (the auto-create trigger can lag a fresh sign-up) or the backend is
 * unconfigured. RLS restricts reads to the user's own profile.
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  if (!hasSupabaseConfig) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

/**
 * Update writable fields on a parent profile (role, display_name, consent_at,
 * consent_method). Uses UPSERT so it works even if the auto-create trigger
 * hasn't fired yet.
 *
 * Note: `vpc_payment_ref` is deliberately NOT writable here — the Stripe charge
 * id is set server-side by the webhook (service role). The checkbox path may set
 * consent_method='checkbox'; the Stripe path is webhook-only.
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'role' | 'display_name' | 'consent_at' | 'consent_method'>>,
): Promise<void> {
  if (!hasSupabaseConfig) return;
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates }, { onConflict: 'id' });
  if (error) throw error;
}

/** Create a student profile under the current parent. */
export async function addStudentProfile(
  parentId: string,
  data: { nickname: string; avatar: string },
): Promise<StudentProfile> {
  if (!hasSupabaseConfig) throw new Error('Supabase not configured');
  const { data: row, error } = await supabase
    .from('student_profiles')
    .insert({ parent_id: parentId, nickname: data.nickname, avatar: data.avatar })
    .select()
    .single();
  if (error) throw error;
  return row as StudentProfile;
}

/**
 * Rename a student. RLS (`student_profiles_parent_update`) scopes the update to
 * the calling parent's own rows. Returns the refreshed row.
 */
export async function renameStudentProfile(
  studentId: string,
  nickname: string,
): Promise<StudentProfile> {
  if (!hasSupabaseConfig) throw new Error('Supabase not configured');
  const { data: row, error } = await supabase
    .from('student_profiles')
    .update({ nickname })
    .eq('id', studentId)
    .select()
    .single();
  if (error) throw error;
  return row as StudentProfile;
}

/**
 * Delete a student. RLS scopes the delete to the calling parent. The student's
 * progress rows cascade-delete server side, so there's no separate remote wipe.
 */
export async function deleteStudentProfile(studentId: string): Promise<void> {
  if (!hasSupabaseConfig) throw new Error('Supabase not configured');
  const { error } = await supabase.from('student_profiles').delete().eq('id', studentId);
  if (error) throw error;
}

/** Fetch all student profiles linked to the current parent. */
export async function getStudentProfiles(parentId: string): Promise<StudentProfile[]> {
  if (!hasSupabaseConfig) return [];
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('parent_id', parentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as StudentProfile[]) ?? [];
}
