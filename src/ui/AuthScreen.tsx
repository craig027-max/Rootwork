import { useState } from 'react';
import { useWondralStore } from '../app/store';
import {
  signIn,
  signUp,
  resetPasswordForEmail,
  updateUserPassword,
} from '../core/auth';
import { hasSupabaseConfig } from '../app/hooks';
import { Button } from './components/Button';
import { LegalLink } from './components/LegalLink';

type Mode = 'sign-in' | 'sign-up' | 'forgot';

/**
 * Sign-in / sign-up / password-recovery. The parent is the account root (COPPA):
 * accounts are created by a parent. After a successful auth the onAuthStateChange
 * subscription in hydrate.ts loads the profile and routes to consent or the
 * dashboard, so this screen just settles the session and steps out of the way.
 */
export function AuthScreen() {
  const setView = useWondralStore((s) => s.setView);
  const passwordRecovery = useWondralStore((s) => s.passwordRecovery);
  const endPasswordRecovery = useWondralStore((s) => s.endPasswordRecovery);

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (passwordRecovery) {
        await updateUserPassword(password);
        endPasswordRecovery();
        setView('home');
        return;
      }
      if (mode === 'forgot') {
        await resetPasswordForEmail(email);
        setInfo('Check your email for a password-reset link.');
        return;
      }
      if (mode === 'sign-up') {
        const { session } = await signUp({ email, password });
        if (!session) {
          setInfo('Account created — check your email to confirm, then sign in.');
          return;
        }
        // Session present (e.g. confirmations off): hydrate routes to consent.
        setView('home');
        return;
      }
      await signIn({ email, password });
      setView('home');
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (!hasSupabaseConfig) {
    return (
      <div className="ww-center ww-stack">
        <h1 className="text-gradient-hero">Accounts coming soon</h1>
        <p className="ww-muted" style={{ maxWidth: 420 }}>
          This preview build has no auth backend configured. The free Tier 1 roots work without an
          account. Connect Supabase to enable parent accounts and progress saving.
        </p>
        <Button variant="ghost" onClick={() => setView('home')}>
          Back to learning
        </Button>
      </div>
    );
  }

  const title = passwordRecovery
    ? 'Set a new password'
    : mode === 'sign-up'
      ? 'Create a parent account'
      : mode === 'forgot'
        ? 'Reset your password'
        : 'Welcome back';

  return (
    <form className="ww-form" onSubmit={(e) => void submit(e)}>
      <p className="ww-eyebrow">Parent account</p>
      <h1 className="text-gradient-hero">{title}</h1>

      {!passwordRecovery && mode !== 'forgot' ? (
        <p className="ww-muted">
          Wondral Words is a kids’ product. A parent creates the account and gives consent; children
          learn under student profiles. By {mode === 'sign-up' ? 'creating an account' : 'signing in'}{' '}
          you agree to the <LegalLink page="terms" /> and <LegalLink page="privacy" />.
        </p>
      ) : null}

      {error ? (
        <div className="ww-notice is-error" role="alert">
          {error}
        </div>
      ) : null}
      {info ? (
        <div className="ww-notice" role="status">
          {info}
        </div>
      ) : null}

      {!passwordRecovery && (
        <input
          className="ww-input"
          type="email"
          placeholder="Parent email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      )}

      {mode !== 'forgot' && (
        <input
          className="ww-input"
          type="password"
          placeholder={passwordRecovery ? 'New password' : 'Password'}
          autoComplete={mode === 'sign-up' || passwordRecovery ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />
      )}

      <Button type="submit" block disabled={busy}>
        {busy
          ? 'Working…'
          : passwordRecovery
            ? 'Save password'
            : mode === 'sign-up'
              ? 'Create account'
              : mode === 'forgot'
                ? 'Send reset link'
                : 'Sign in'}
      </Button>

      {!passwordRecovery && (
        <div className="ww-row" style={{ justifyContent: 'space-between' }}>
          {mode === 'sign-in' ? (
            <>
              <Button variant="ghost" size="sm" type="button" onClick={() => setMode('sign-up')}>
                Create an account
              </Button>
              <Button variant="ghost" size="sm" type="button" onClick={() => setMode('forgot')}>
                Forgot password?
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" type="button" onClick={() => setMode('sign-in')}>
              Back to sign in
            </Button>
          )}
        </div>
      )}

      <Button variant="ghost" size="sm" type="button" onClick={() => setView('home')}>
        Back to learning
      </Button>
    </form>
  );
}
