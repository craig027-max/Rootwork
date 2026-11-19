/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CHECKOUT_ENABLED?: string;
}

/** Short build stamp (git hash · date) injected by vite.config.ts at build time. */
declare const __BUILD_STAMP__: string;
