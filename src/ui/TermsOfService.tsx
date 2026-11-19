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
          <li>A parent or guardian (18+) creates the account; kids learn under a student profile.</li>
          <li>Premium is a one-time payment for one year of access for one student. It ends automatically. There is no renewal.</li>
          <li>Try the free starter set first. Paid plans are nonrefundable.</li>
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
          The free starter set works with or without an account. Premium is a <strong>one-time
          annual purchase</strong>: Single Scholar ($49/year, one student). The price is shown
          before you pay and may change for future purchases, never for one you've already made.
          Access lasts one year from purchase and then ends automatically. There is no renewal.
          Payments are processed by Stripe on Stripe's own site. Your purchase also serves as
          verifiable parental consent under COPPA (see the <LegalLink page="privacy" />).
        </p>
      </section>

      <section>
        <h2>Refunds</h2>
        <ul>
          <li>
            <strong>Try the free starter set first. Paid plans are nonrefundable.</strong>
          </li>
          <li>
            <strong>One year, then it ends.</strong> A purchase is a one-time payment for one year
            of access for one student. Access runs through the end of that year and then ends
            automatically. There is no renewal.
          </li>
          <li>
            <strong>Questions.</strong> Email{' '}
            <a href="mailto:support@wondral.app">support@wondral.app</a>. To delete your account
            and the data that goes with it, use the parent dashboard or that same address.
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
          change removes something you were counting on, email{' '}
          <a href="mailto:support@wondral.app">support@wondral.app</a>.
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
          may suspend or terminate accounts that violate these terms. Paid plans are nonrefundable.
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
