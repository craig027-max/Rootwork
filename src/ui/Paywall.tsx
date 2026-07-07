import { useState } from 'react';
import { useWondralStore } from '../app/store';
import { startCheckout, type CheckoutTier } from '../core/checkout';
import { getEntitlement } from '../core/entitlement';
import { useOnline, hasSupabaseConfig } from '../app/hooks';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { LegalLink } from './components/LegalLink';

// PRICE SOURCE OF TRUTH: the amounts actually charged come from the Stripe price
// objects behind STRIPE_PRICE_SINGLE / STRIPE_PRICE_MULTI (Cloudflare Pages env —
// see DEPLOYMENT.md §2). The strings below are display copy only; if a price
// changes in the Stripe Dashboard, update them together or buyers will see one
// number here and another on the Stripe Checkout page.
const TIERS: Array<{ id: CheckoutTier; name: string; price: string; blurb: string; jewel: string }> = [
  {
    id: 'single',
    name: 'Single Scholar',
    price: '$49 / year',
    blurb: 'One learner. All 152 roots across every tier, plus the full Root Rush quiz.',
    jewel: 'jade',
  },
  {
    id: 'multi',
    name: 'Family',
    price: '$79 / year',
    blurb: 'Up to 10 student profiles under one parent account — track each child separately.',
    jewel: 'violet',
  },
];

function messageFor(code: string): string {
  switch (code) {
    case 'network':
      return "Couldn't reach checkout. Check your connection and try again.";
    case 'no_url':
      return 'Checkout is temporarily unavailable. Please try again shortly.';
    case 'price_not_configured':
    case 'stripe_error':
      return 'Payments are being set up. Please try again later.';
    default:
      return 'Something went wrong starting checkout. Please try again.';
  }
}

/**
 * The paywall (tier picker → Stripe Checkout). Reachable from a locked root or
 * "Go Premium". CRUCIAL: it NEVER dead-ends. When the backend is unconfigured or
 * the device is offline, the CTAs are disabled and a calm notice explains why —
 * never a broken redirect or an error screen (the PianoSurge App Store lesson).
 */
export function Paywall() {
  const setView = useWondralStore((s) => s.setView);
  const online = useOnline();
  const [busy, setBusy] = useState<CheckoutTier | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const unavailable = !hasSupabaseConfig || !online;

  async function buy(tier: CheckoutTier) {
    setError(null);
    setInfo(null);
    setBusy(tier);
    const res = await startCheckout(tier);
    setBusy(null);
    if (res && 'error' in res) {
      // The purchase IS the COPPA consent — an anonymous user must sign up first.
      if (res.error === 'account_required') {
        setView('auth');
        return;
      }
      // 409 from the double-purchase guard: this account already paid (stale tab
      // or a second tab). Good news, not an error — refresh the entitlement into
      // the store so the app unlocks right here.
      if (res.error === 'already_entitled') {
        setInfo('Good news — this account is already unlocked! Everything is open.');
        const store = useWondralStore.getState();
        const parentId = store.authUser?.id;
        if (parentId) {
          try {
            store.setEntitlement(await getEntitlement(parentId));
          } catch {
            // non-fatal — the notice + "Back to learning" still work
          }
        }
        return;
      }
      setError(messageFor(res.error));
    }
    // success → the browser navigates to Stripe; nothing more to do here.
  }

  return (
    <div className="ww-stack" style={{ maxWidth: 760, margin: '0 auto' }}>
      <div>
        <p className="ww-eyebrow">Unlock everything</p>
        <h1 className="text-gradient-hero">Go Premium</h1>
        <p className="ww-muted">
          Tier 1 (Starter) is always free. A one-time annual unlock opens every tier and the
          full quiz. Your purchase is also the verified parental consent for your child's account.
        </p>
      </div>

      {unavailable ? (
        <div className="ww-notice" role="status">
          {online
            ? 'Purchasing isn’t available in this preview build (no payment backend configured). Everything in the free tier still works.'
            : 'You’re offline. Reconnect to upgrade — the free Tier 1 roots keep working in the meantime.'}
        </div>
      ) : null}

      {info ? (
        <div className="ww-notice" role="status">
          {info}
        </div>
      ) : null}

      {error ? (
        <div className="ww-notice is-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="ww-paywall-tiers">
        {TIERS.map((t) => (
          <Card key={t.id} jewel={t.jewel} className="ww-stack" interactive>
            <p className="ww-eyebrow">{t.name}</p>
            <h2 className="text-gradient">{t.price}</h2>
            <p className="ww-muted" style={{ minHeight: 60 }}>
              {t.blurb}
            </p>
            <Button
              jewel={t.jewel}
              block
              disabled={unavailable || busy !== null}
              onClick={() => void buy(t.id)}
            >
              {busy === t.id ? 'Starting checkout…' : `Choose ${t.name}`}
            </Button>
          </Card>
        ))}
      </div>

      {/* Stripe requires the refund policy to be stated where the purchase starts. */}
      <p className="ww-muted ww-legal-links">
        <strong>30-day money-back guarantee.</strong> One-time purchase — no auto-renewal, nothing
        to cancel; access simply ends after a year unless you buy again. Not right for your family?
        Email <a href="mailto:support@wondral.app">support@wondral.app</a> within 30 days for a
        full refund, no questions asked. By purchasing you agree to the <LegalLink page="terms" />{' '}
        and <LegalLink page="privacy" />.
      </p>

      <div className="ww-row">
        <Button variant="ghost" onClick={() => setView('home')}>
          Back to learning
        </Button>
      </div>
    </div>
  );
}
