import type { AppView } from './store';

/**
 * Minimal URL <-> view mapping for the static legal pages. The app is otherwise
 * a pure view-switching SPA. /privacy and /terms are linked from the grown-up
 * area. /refunds is the same kind of route and is not linked from anywhere
 * (public/_redirects serves index.html for every path).
 */
const PATH_TO_VIEW: Record<string, AppView> = {
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/refunds': 'refunds',
};

/** The view a given pathname deep-links to, or null for "not a routed path". */
export function viewForPath(pathname: string): AppView | null {
  return PATH_TO_VIEW[pathname.replace(/\/+$/, '') || '/'] ?? null;
}

/** The canonical pathname for a view, or null for views that live at "/". */
export function pathForView(view: AppView): string | null {
  if (view === 'privacy') return '/privacy';
  if (view === 'terms') return '/terms';
  if (view === 'refunds') return '/refunds';
  return null;
}

/** Boot-time view: honor a legal-page deep link, else land on home. */
export function initialView(): AppView {
  if (typeof location === 'undefined') return 'home';
  return viewForPath(location.pathname) ?? 'home';
}
