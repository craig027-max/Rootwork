import { useState } from 'react';
import { useWondralStore } from '../app/store';
import { getProfile, updateProfile } from '../core/profile';
import { Button } from './components/Button';
import { LegalLink } from './components/LegalLink';

/**
 * Parent consent / onboarding (COPPA verifiable parental consent). The MVP path
 * is an explicit checkbox acknowledgment that records consent on the parent's
 * profile and assigns the 'parent' role; the stronger VPC path is the Stripe
 * charge, handled webhook-side. Reached only for an authenticated account whose
 * role isn't set yet.
 */
export function Consent() {
  const authUser = useWondralStore((s) => s.authUser);
  const setProfile = useWondralStore((s) => s.setProfile);
  const setView = useWondralStore((s) => s.setView);

  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!authUser || !agreed) return;
    setBusy(true);
    setError(null);
    try {
      await updateProfile(authUser.id, {
        role: 'parent',
        consent_method: 'checkbox',
        consent_at: new Date().toISOString(),
      });
      const refreshed = await getProfile(authUser.id);
      setProfile(refreshed);
      setView('dashboard');
    } catch (err) {
      setError((err as Error).message || 'Could not record consent. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ww-form">
      <p className="ww-eyebrow">One quick step</p>
      <h1 className="text-gradient-hero">Parental consent</h1>
      <p className="ww-muted">
        Wondral Words is designed for children. As the parent or guardian on this account, your
        consent covers the student profiles you create. We store only what’s needed to save learning
        progress.
      </p>

      {/* COPPA direct notice — shown at the moment of consent, per the amended
          COPPA Rule. Keep in lockstep with the Privacy Policy's student section. */}
      <div className="ww-notice ww-consent-notice">
        Here’s exactly what we save about your student: a nickname and avatar you choose, and which
        word roots and quizzes they’ve completed — never their real name, email, photo, or location.
        We don’t show ads or use tracking, and we never sell or share your family’s information.
        Completing a purchase through Stripe is how we verify that consent comes from you, the
        parent (the payment record is kept as consent evidence). You can review or delete your
        student’s information, or revoke consent, anytime from the parent dashboard or by emailing{' '}
        <a href="mailto:support@wondral.app">support@wondral.app</a>.
      </div>

      {error ? (
        <div className="ww-notice is-error" role="alert">
          {error}
        </div>
      ) : null}

      <label className="ww-row" style={{ alignItems: 'flex-start', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          style={{ marginTop: 4 }}
        />
        <span className="ww-muted ww-consent-notice">
          I am the parent or legal guardian, I consent to my child using Wondral Words under my
          account, and I agree to the <LegalLink page="terms" /> and <LegalLink page="privacy" />.
        </span>
      </label>

      <Button block disabled={!agreed || busy} onClick={() => void confirm()}>
        {busy ? 'Saving…' : 'I consent — continue'}
      </Button>
    </div>
  );
}
