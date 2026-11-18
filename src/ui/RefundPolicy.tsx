import { useWondralStore } from '../app/store';
import { Button } from './components/Button';
import { REFUND_POLICY } from './refundPolicyCopy';

/**
 * Draft refund and cancellation page for Craig to review.
 * Same kind of route as the privacy and terms pages.
 * Nothing in the live app links here. Do not merge until Craig accepts the wording.
 */

export function RefundPolicy() {
  const setView = useWondralStore((s) => s.setView);

  return (
    <article className="ww-legal" data-screen="refunds">
      <p className="ww-eyebrow">Draft for review — not linked from the app</p>
      <h1 className="text-gradient-hero">{REFUND_POLICY.title}</h1>

      <section>
        <p>{REFUND_POLICY.seller}</p>
      </section>

      <section>
        <h2>Prepaid annual plans</h2>
        <p>{REFUND_POLICY.prepaid}</p>
      </section>

      <section>
        <h2>Cancellation and renewal</h2>
        <p>{REFUND_POLICY.renewal}</p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Questions about a purchase:{' '}
          <a href="mailto:support@wondral.app">support@wondral.app</a>.
        </p>
      </section>

      <div className="ww-row">
        <Button variant="ghost" onClick={() => setView('home')}>
          Back to learning
        </Button>
      </div>
    </article>
  );
}
