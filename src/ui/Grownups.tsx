import { useWondralStore } from '../app/store';
import { useShowUpgrade } from '../app/hooks';
import { Button } from './components/Button';
import { LegalLink } from './components/LegalLink';

/**
 * The only in-app door to account, plan, and purchase. Reached from Home’s
 * “For grown-ups” link after the parent gate. No store link — checkout stays
 * the existing in-app Stripe handoff, and a web purchase is the same account.
 */
export function Grownups() {
  const authUser = useWondralStore((s) => s.authUser);
  const setView = useWondralStore((s) => s.setView);
  const requestUpgrade = useWondralStore((s) => s.requestUpgrade);
  const signOut = useWondralStore((s) => s.signOut);
  const showUpgrade = useShowUpgrade();
  const signedIn = Boolean(authUser && !authUser.isAnonymous);

  return (
    <div className="ww-stack ww-grownups-panel" data-screen="grownups">
      <div>
        <p className="ww-eyebrow">For grown-ups</p>
        <h1 className="text-gradient-hero">Parent account</h1>
        <p className="ww-muted">
          Sign in with the account you bought on the web, or unlock the full set from here.
          Kids keep the free starter roots either way.
        </p>
      </div>
      <div className="ww-row" style={{ flexWrap: 'wrap' }}>
        {signedIn ? (
          <>
            <Button onClick={() => setView('dashboard')}>Dashboard</Button>
            <Button variant="ghost" onClick={() => void signOut()}>
              Sign out
            </Button>
          </>
        ) : (
          <Button onClick={() => setView('auth')}>Sign in</Button>
        )}
        {showUpgrade ? (
          <Button variant={signedIn ? 'spark' : 'ghost'} onClick={requestUpgrade}>
            Go Premium
          </Button>
        ) : null}
      </div>
      <p className="ww-muted ww-legal-links">
        <LegalLink page="privacy">Privacy</LegalLink>
        <LegalLink page="terms">Terms</LegalLink>
      </p>
      <div className="ww-row">
        <Button variant="ghost" onClick={() => setView('home')}>
          Back to learning
        </Button>
      </div>
    </div>
  );
}
