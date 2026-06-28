import type { AuthChangeEvent, Session, Subscription, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type AuthListener = (event: AuthChangeEvent, session: Session | null) => void;

/**
 * Where Supabase email links (confirmation, password recovery) should return
 * the user — the live origin, so prod and local dev both work without
 * hardcoding. NOTE: Supabase only honours a redirect whose origin is on the
 * project's allowlist (words.wondral.app/** + localhost/** + *.pages.dev/**);
 * from any other origin it silently falls back to the Site URL. Add such
 * origins to the Supabase Redirect URLs list if email auth needs to work
 * from them.
 */
export function getSiteUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://words.wondral.app';
}

export interface SignUpArgs {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInArgs {
  email: string;
  password: string;
}

/**
 * Email/password sign-up. If the user is currently anonymous, this links the
 * new credentials to the existing anonymous user instead of creating a new
 * account — that preserves any progress already recorded against the
 * anonymous user.
 */
export async function signUp({
  email,
  password,
  displayName,
}: SignUpArgs): Promise<{ user: User | null; session: Session | null }> {
  const current = await supabase.auth.getUser();
  const isAnon = current.data.user?.is_anonymous ?? false;

  if (isAnon) {
    const { data: updateData, error: updateError } = await supabase.auth.updateUser(
      {
        email,
        password,
        data: displayName ? { display_name: displayName } : undefined,
      },
      { emailRedirectTo: getSiteUrl() },
    );
    if (updateError) throw updateError;
    return { user: updateData.user, session: (await supabase.auth.getSession()).data.session };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: getSiteUrl(),
      ...(displayName ? { data: { display_name: displayName } } : {}),
    },
  });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signIn({
  email,
  password,
}: SignInArgs): Promise<{ user: User | null; session: Session | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: data.user, session: data.session };
}

/**
 * Create an anonymous user. Used for the try-before-signup flow so progress
 * can be saved server-side before the family commits to an account.
 */
export async function signInAnonymously(): Promise<{
  user: User | null;
  session: Session | null;
}> {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return { user: data.user, session: data.session };
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

export function onAuthStateChange(listener: AuthListener): Subscription {
  const { data } = supabase.auth.onAuthStateChange(listener);
  return data.subscription;
}

/**
 * Send a password-reset email. The link returns to the app, where
 * detectSessionInUrl exchanges the token and fires PASSWORD_RECOVERY — see the
 * recovery handling in hydrate.ts + AuthScreen's set-new-password step.
 */
export async function resetPasswordForEmail(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getSiteUrl(),
  });
  if (error) throw error;
}

/** Set a new password for the currently-signed-in user (completes recovery). */
export async function updateUserPassword(password: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}
