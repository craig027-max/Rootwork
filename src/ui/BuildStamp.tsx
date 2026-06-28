/** Tiny build-stamp footer (git hash · date), injected at build time. Lets you
 *  tell at a glance whether a device is on the latest deploy vs a stale bundle. */
export function BuildStamp() {
  return <footer className="ww-footer">Wondral Words · build {__BUILD_STAMP__}</footer>;
}
