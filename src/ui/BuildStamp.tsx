import { LegalLink } from './components/LegalLink';

/** Tiny build-stamp footer (git hash · date), injected at build time. Lets you
 *  tell at a glance whether a device is on the latest deploy vs a stale bundle.
 *  Also the always-visible home of the legal links. */
export function BuildStamp() {
  return (
    <footer className="ww-footer">
      <span className="ww-legal-links">
        <LegalLink page="privacy">Privacy</LegalLink> · <LegalLink page="terms">Terms</LegalLink>
      </span>{' '}
      · Wondral Words · build {__BUILD_STAMP__}
    </footer>
  );
}
