import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execFileSync } from 'node:child_process';

const envPort = Number(process.env.PORT);

// A short build stamp (git hash + date) injected at build time, surfaced in the
// UI so you can tell at a glance whether a device is on the latest deploy vs a
// stale cached bundle. Falls back gracefully if git isn't available. Uses
// execFileSync with static args (no shell, no interpolation).
function buildStamp(): string {
  try {
    const git = (args: string[]) => execFileSync('git', args).toString().trim();
    const hash = git(['rev-parse', '--short', 'HEAD']);
    const date = git(['show', '-s', '--format=%cd', '--date=format:%Y-%m-%d', 'HEAD']);
    return `${hash} · ${date}`;
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_STAMP__: JSON.stringify(buildStamp()),
  },
  server: {
    port: Number.isFinite(envPort) && envPort > 0 ? envPort : 3003,
    strictPort: false,
    host: true,
  },
});
