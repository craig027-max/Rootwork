import { useEffect } from 'react';
import '../styles/app.css';
import { useWondralStore } from './store';
import { pathForView, viewForPath } from './routes';
import { consumeCheckoutReturn } from '../core/checkout';
import { useShowUpgrade } from './hooks';
import { Home } from '../ui/Home';
import { Deck } from '../ui/Deck';
import { RootRush } from '../ui/RootRush';
import { AuthScreen } from '../ui/AuthScreen';
import { Consent } from '../ui/Consent';
import { Paywall } from '../ui/Paywall';
import { ParentDashboard } from '../ui/ParentDashboard';
import { PrivacyPolicy } from '../ui/PrivacyPolicy';
import { TermsOfService } from '../ui/TermsOfService';
import { Celebration } from '../ui/Celebration';
import { BuildStamp } from '../ui/BuildStamp';
import { Button } from '../ui/components/Button';
import type { AppView } from './store';

function Screen({ view }: { view: AppView }) {
  switch (view) {
    case 'deck':
      return <Deck />;
    case 'quiz':
      return <RootRush />;
    case 'auth':
      return <AuthScreen />;
    case 'consent':
      return <Consent />;
    case 'paywall':
      return <Paywall />;
    case 'dashboard':
      return <ParentDashboard />;
    case 'privacy':
      return <PrivacyPolicy />;
    case 'terms':
      return <TermsOfService />;
    case 'home':
    default:
      return <Home />;
  }
}

export function App() {
  const view = useWondralStore((s) => s.view);
  const setView = useWondralStore((s) => s.setView);
  const closeRoot = useWondralStore((s) => s.closeRoot);
  const authUser = useWondralStore((s) => s.authUser);
  const requestUpgrade = useWondralStore((s) => s.requestUpgrade);
  const signOut = useWondralStore((s) => s.signOut);
  const showUpgrade = useShowUpgrade();

  // Handle a return from Stripe Checkout (?checkout=success|cancel) on first load.
  useEffect(() => {
    void consumeCheckoutReturn();
  }, []);

  // The legal pages are the only URL-addressable views: keep the address bar in
  // sync as the view changes, and honor back/forward between them and the app.
  useEffect(() => {
    const path = pathForView(view);
    if (path && location.pathname !== path) history.pushState(null, '', path);
    else if (!path && viewForPath(location.pathname)) history.pushState(null, '', '/');
  }, [view]);

  useEffect(() => {
    const onPop = () => setView(viewForPath(location.pathname) ?? 'home');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setView]);

  const signedIn = authUser && !authUser.isAnonymous;

  return (
    <div className="ww-app rw-ambient">
      <header className="ww-topbar">
        <button className="ww-brand" onClick={() => closeRoot()} aria-label="Wondral Words home">
          <span className="ww-mark" aria-hidden="true">
            🌱
          </span>
          <span>
            Wondral <span className="text-gradient-hero">Words</span>
          </span>
        </button>
        <div className="ww-spacer" />
        {showUpgrade ? (
          <Button size="sm" onClick={requestUpgrade}>
            Go Premium
          </Button>
        ) : null}
        {signedIn ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => setView('dashboard')}>
              Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              Sign out
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setView('auth')}>
            Sign in
          </Button>
        )}
      </header>

      <main className="ww-main">
        <Screen view={view} />
      </main>

      <Celebration />
      <BuildStamp />
    </div>
  );
}
