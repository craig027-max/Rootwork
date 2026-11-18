/** Tiny build-stamp footer (git hash · date), injected at build time. Lets you
 *  tell at a glance whether a device is on the latest deploy vs a stale bundle.
 *  Privacy and Terms live in the grown-up area — this footer does not link out. */
export function BuildStamp() {
  return <footer className="ww-footer">Wondral Words · build {__BUILD_STAMP__}</footer>;
}
