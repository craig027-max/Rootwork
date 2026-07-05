import { useWondralStore } from '../app/store';
import { Button } from './components/Button';
import { LegalLink } from './components/LegalLink';

/**
 * Terms of Service — static, URL-addressable at /terms. Includes the refund
 * policy Stripe requires us to publish. Forked from the draft in Orbital's
 * LEGAL_REVIEW_PACKET (§7–8); keep pricing and plan names in lockstep with
 * Paywall.tsx.
 */
export function TermsOfService() {
  const setView = useWondralStore((s) => s.setView);

  return (
    <article className="ww-legal">
      <p className="ww-eyebrow">Wondral Words · Legal</p>
      <h1 className="text-gradient-hero">Terms of Service</h1>
      <p className="ww-legal-date">Effective July 3, 2026</p>

      <section>
        <h2>The short version</h2>
        <ul>
          <li>A parent or guardian (18+) creates the account; kids learn under student profiles.</li>
          <li>Premium is a one-time annual purchase — <strong>no auto-renewing subscription</strong>, so you'll never be surprised by a charge.</li>
          <li>30-day full refund, no questions asked.</li>
        </ul>
      </section>

      <section>
        <h2>The service</h2>
        <p>
          Wondral Words (words.wondral.app) is an interactive word-roots learning app made by
          Thompson Education Apps LLC. By creating an account or making a purchase you agree to
          these terms and to our <LegalLink page="privacy" />.
        </p>
      </section>

      <section>
        <h2>Accounts and eligibility</h2>
        <p>
          Accounts are created by a parent or legal guardian who is at least 18 years old. Children
          use the app under student profiles inside the parent's account; a child cannot create an
          account. You're responsible for keeping your sign-in credentials safe and for activity
          under your account.
        </p>
      </section>

      <section>
        <h2>Free tier and Premium</h2>
        <p>
          Tier 1 (Starter) is free, with or without an account. Premium is a <strong>one-time
          annual purchase</strong>: Single Scholar ($49/year, one learner) or Family ($79/year, up
          to 10 student profiles). Prices are shown at checkout and may change for future
          purchases, never for one you've already made. Access lasts one year from purchase and
          then simply ends unless you choose to buy again — there is no auto-renewal and nothing to
          cancel. Payments are processed by Stripe on Stripe's own site. Your purchase also serves
          as verifiable parental consent under COPPA (see the <LegalLink page="privacy" />).
        </p>
      </section>

      <section>
        <h2>Refund &amp; cancellation policy</h2>
        <ul>
          <li>
            <strong>30-day full refund, no questions asked.</strong> If Wondral Words isn't right
            for your family, email <a href="mailto:support@wondral.app">support@wondral.app</a>{' '}
            within 30 days of purchase for a full refund.
          </li>
          <li>
            <strong>Early-access honesty.</strong> Wondral Words is actively being built and we add
            content over time. If something you were counting on isn't there yet, tell us — we'll
            either help, or refund you.
          </li>
          <li>
            <strong>How to cancel.</strong> There's nothing to cancel: access ends automatically at
            the end of the year. To delete your account and all associated data at any time, use
            the parent dashboard or email <a href="mailto:support@wondral.app">support@wondral.app</a>.
          </li>
          <li>
            <strong>Refund method &amp; timing.</strong> Refunds go back to your original payment
            method, typically within 5–10 business days.
          </li>
        </ul>
      </section>

      <section>
        <h2>Acceptable use</h2>
        <p>
          Your purchase covers personal, non-commercial use by your own family or homeschool.
          Please don't resell access, share accounts beyond your household, copy the content for
          redistribution, or attempt to break, probe, or overload the service.
        </p>
      </section>

      <section>
        <h2>Our content</h2>
        <p>
          The lessons, animations, artwork, and everything else in Wondral Words belong to Thompson
          Education Apps LLC and are licensed to you for personal use while you use the app.
        </p>
      </section>

      <section>
        <h2>Service changes</h2>
        <p>
          We're actively building: lessons and features are added and improved over time. If a
          change removes something you bought Premium for, the refund policy above applies.
        </p>
      </section>

      <section>
        <h2>Disclaimers and liability</h2>
        <p>
          Wondral Words is provided "as is." To the fullest extent permitted by law, we disclaim
          implied warranties and our total liability for any claim related to the service is
          limited to the amount you paid us in the 12 months before the claim. Nothing in these
          terms limits rights that consumer-protection law says can't be limited.
        </p>
      </section>

      <section>
        <h2>Termination</h2>
        <p>
          You can delete your account at any time from the parent dashboard or by emailing us. We
          may suspend or terminate accounts that violate these terms; if we ever discontinue the
          service or terminate your account for any other reason, we'll refund the unused portion
          of your purchase.
        </p>
      </section>

      <section>
        <h2>Governing law and changes</h2>
        <p>
          These terms are governed by the laws of the State of Florida, USA. If we change them,
          we'll update this page and its effective date; material changes will be announced by
          email to account holders. Questions:{' '}
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
