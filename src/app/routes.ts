import type { AppView } from './store';

/**
 * Minimal URL <-> view mapping for the static legal pages. The app is otherwise
 * a pure view-switching SPA; only /privacy and /terms are URL-addressable so
 * they can be linked from Stripe, emails, and app-store listings and load
 * directly (public/_redirects serves index.html for every path).
 */
const PATH_TO_VIEW: Record<string, AppView> = {
  '/privacy': 'privacy',
  '/terms': 'terms',
};

/** The view a given pathname deep-links to, or null for "not a routed path". */
export function viewForPath(pathname: string): AppView | null {
  return PATH_TO_VIEW[pathname.replace(/\/+$/, '') || '/'] ?? null;
}

/** The canonical pathname for a view, or null for views that live at "/". */
export function pathForView(view: AppView): string | null {
  if (view === 'privacy') return '/privacy';
  if (view === 'terms') return '/terms';
  return null;
}

/** Boot-time view: honor a legal-page deep link, else land on home. */
export function initialView(): AppView {
  if (typeof location === 'undefined') return 'home';
  return viewForPath(location.pathname) ?? 'home';
}
