import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// supabase-js validates the URL/key synchronously at createClient time, so we
// need *some* well-formed value to avoid throwing at module load when env vars
// are missing (e.g. in CI or before .env.local is set). Calls will still fail
// at fetch time and the bootstrap path swallows those.
const PLACEHOLDER_URL = 'https://placeholder.supabase.co';
const PLACEHOLDER_KEY = 'placeholder-anon-key';

export const hasSupabaseConfig = Boolean(url && anonKey);

if (!hasSupabaseConfig) {
   
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
      'Backend calls will fail. Copy .env.example to .env.local and fill in values.',
  );
}

export const supabase: SupabaseClient = createClient(
  url ?? PLACEHOLDER_URL,
  anonKey ?? PLACEHOLDER_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export type ProfileRole = 'parent' | 'student';

export type Profile = {
  id: string;
  display_name: string | null;
  grade_level: number | null;
  /** Parent-rooted model: 'parent' | 'student'; null until onboarding assigns it. */
  role: ProfileRole | null;
  /** When the parent completed the VPC step (checkbox now; Stripe card later). */
  consent_at: string | null;
  /** Which VPC method was used: 'stripe' (card) or 'checkbox' (MVP/PEP). */
  consent_method: 'checkbox' | 'stripe' | null;
  /** Stripe charge/PaymentIntent id stored as VPC evidence (webhook-written). */
  vpc_payment_ref: string | null;
  created_at: string;
  updated_at: string;
};

export type EntitlementTier = 'single' | 'multi';
export type EntitlementStatus = 'active' | 'expired' | 'refunded';

/**
 * Parent-held purchase state. Written ONLY by the Stripe webhook (service role);
 * clients get SELECT-own via RLS and never write it. One active row per parent —
 * one-time annual model, so expires_at = granted_at + 1 year.
 */
export type Entitlement = {
  id: string;
  parent_id: string;
  tier: EntitlementTier;
  seats: number;
  status: EntitlementStatus;
  source: 'stripe' | 'pep' | 'manual';
  stripe_customer_id: string | null;
  stripe_payment_intent_id: string | null;
  granted_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Student profile managed by a parent; no separate auth credentials in MVP. */
export type StudentProfile = {
  id: string;
  parent_id: string;
  nickname: string;
  avatar: string;
  created_at: string;
  updated_at: string;
};

/**
 * One row per (parent, student, tier, root) completion. `lesson_id` holds the
 * root id and `module_id` the tier id — the table name + columns are kept
 * generic (and identical to the sibling chemistry app) so the spine stays
 * liftable into a shared package.
 */
export type LessonProgressRow = {
  id: string;
  user_id: string;
  /** Which parent-managed student this row belongs to; null = free-play/anon. */
  student_id: string | null;
  /** The root id (e.g. "bio"). */
  lesson_id: string;
  /** The tier id (e.g. "tier-1"). */
  module_id: string;
  completed: boolean;
  completed_at: string | null;
  score: number | null;
  time_spent_seconds: number | null;
  created_at: string;
};
