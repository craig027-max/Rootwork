import { useWondralStore } from '../app/store';
import { Button } from './components/Button';
import { LegalLink } from './components/LegalLink';

/**
 * Privacy Policy — static, URL-addressable at /privacy. Plain-language and
 * honest to the actual data footprint (see the data inventory in the Orbital
 * LEGAL_REVIEW_PACKET this was forked from). Keep this page in lockstep with
 * what the code really collects: if a field is added to profiles or
 * student_profiles, it must be added here in the same PR.
 */
export function PrivacyPolicy() {
  const setView = useWondralStore((s) => s.setView);

  return (
    <article className="ww-legal">
      <p className="ww-eyebrow">Wondral Words · Legal</p>
      <h1 className="text-gradient-hero">Privacy Policy</h1>
      <p className="ww-legal-date">Effective July 3, 2026</p>

      <section>
        <h2>The short version</h2>
        <ul>
          <li>We collect the minimum needed to run the lessons: a parent email, a student nickname and avatar, and learning progress.</li>
          <li>Children cannot create accounts — only a parent or guardian can.</li>
          <li>No ads, no third-party trackers or analytics, and we never sell or share your family's information.</li>
          <li>Payments are handled entirely by Stripe — your card details never touch our servers.</li>
          <li>You can review or delete everything, anytime, from the parent dashboard or by emailing <a href="mailto:support@wondral.app">support@wondral.app</a>.</li>
        </ul>
      </section>

      <section>
        <h2>Who we are</h2>
        <p>
          Wondral Words (words.wondral.app) is made by Thompson Education Apps LLC, the company
          behind the Wondral family of learning apps. Questions about this policy or your data:{' '}
          <a href="mailto:support@wondral.app">support@wondral.app</a>.
        </p>
      </section>

      <section>
        <h2>What we collect from the parent</h2>
        <ul>
          <li><strong>Email and password</strong> — to sign in. Passwords are stored hashed by our authentication provider (Supabase); we never see them in plain text.</li>
          <li><strong>Consent records</strong> — when and how you gave parental consent, including a Stripe payment reference kept as evidence of verified consent.</li>
          <li><strong>Purchase status</strong> — which plan you bought, how many student profiles it covers, and when access ends. Payment itself happens on Stripe's site; we never receive or store card numbers.</li>
        </ul>
      </section>

      <section>
        <h2>What we collect about the student</h2>
        <p>Exactly three things, all chosen by the parent or child together:</p>
        <ul>
          <li><strong>A nickname</strong> — we ask you to use a nickname, not a real name.</li>
          <li><strong>An avatar</strong> — picked from our built-in set (not a photo).</li>
          <li><strong>Learning progress</strong> — which word roots they've completed and their quiz results, so the app can pick up where they left off.</li>
        </ul>
        <p>
          That is the whole list. We do <strong>not</strong> collect a child's real name, email,
          photo, location, date of birth, or contacts. There is no chat, no social feature, and no
          way for a child to publish anything.
        </p>
      </section>

      <section>
        <h2>Trying it without an account</h2>
        <p>
          The free tier works with no account at all. Progress is saved in your browser and, when
          online, under a random anonymous ID so it can survive a page reload — with no email, name,
          or anything else that identifies you attached to it.
        </p>
      </section>

      <section>
        <h2>What we don't do</h2>
        <ul>
          <li>No advertising, and no third-party ad or analytics trackers.</li>
          <li>No selling, renting, or sharing of your family's information — with anyone, ever.</li>
          <li>All fonts and assets are served from our own site, so pages don't call out to third-party content networks.</li>
        </ul>
      </section>

      <section>
        <h2>Children's privacy (COPPA)</h2>
        <p>
          Wondral Words is designed for children, including children under 13, so the Children's
          Online Privacy Protection Act (COPPA) applies. A child cannot create an account: a parent
          or guardian creates it, sees a direct notice of exactly what we store about the student
          (the list above), and gives consent. Completing your purchase through Stripe is our
          verifiable parental consent method — the payment record is kept as consent evidence.
        </p>
        <p>
          As the parent, you can review your student's information, correct it, delete it, or revoke
          consent at any time from the parent dashboard or by emailing{' '}
          <a href="mailto:support@wondral.app">support@wondral.app</a>. Revoking consent or deleting
          the account removes the student profiles and their progress.
        </p>
      </section>

      <section>
        <h2>Service providers</h2>
        <p>Three companies process data on our behalf, each seeing only what it needs:</p>
        <ul>
          <li><strong>Supabase</strong> — hosts our accounts database and authentication (<a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">privacy policy</a>).</li>
          <li><strong>Stripe</strong> — processes payments on their own site (<a href="https://stripe.com/privacy" target="_blank" rel="noreferrer">privacy policy</a>).</li>
          <li><strong>Cloudflare</strong> — serves the app itself (<a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">privacy policy</a>).</li>
        </ul>
      </section>

      <section>
        <h2>Retention and deletion</h2>
        <p>
          We keep account data while your account is active. When you delete your account or ask us
          to, we delete it within 30 days, except the minimal payment records we're legally required
          to retain (held by Stripe). Anonymous free-play progress lives in your own browser and is
          yours to clear.
        </p>
      </section>

      <section>
        <h2>Security</h2>
        <p>
          Everything travels over HTTPS. Passwords are hashed, card data is handled solely by
          Stripe, and our database uses row-level security so each family's records can only be read
          by that family's account.
        </p>
      </section>

      <section>
        <h2>Changes to this policy</h2>
        <p>
          If we change this policy, we'll update this page and its effective date. For material
          changes to how we handle children's data, we'll email parents first.
        </p>
      </section>

      <section>
        <h2>Contact</h2>
        <p>
          Privacy questions or COPPA concerns: <a href="mailto:support@wondral.app">support@wondral.app</a>.
          See also our <LegalLink page="terms" />.
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
