import { describe, expect, it } from 'vitest';
import { pathForView, viewForPath } from './routes';
import type { AppView } from './store';

describe('viewForPath', () => {
  it('maps the legal deep links', () => {
    expect(viewForPath('/privacy')).toBe('privacy');
    expect(viewForPath('/terms')).toBe('terms');
  });

  it('tolerates trailing slashes (Cloudflare Pages can serve either)', () => {
    expect(viewForPath('/privacy/')).toBe('privacy');
    expect(viewForPath('/terms/')).toBe('terms');
  });

  it('returns null for everything else', () => {
    expect(viewForPath('/')).toBeNull();
    expect(viewForPath('')).toBeNull();
    expect(viewForPath('/deck')).toBeNull();
    expect(viewForPath('/privacy-x')).toBeNull();
  });
});

describe('pathForView', () => {
  it('is the inverse of viewForPath for routed views', () => {
    for (const view of ['privacy', 'terms'] as AppView[]) {
      expect(viewForPath(pathForView(view)!)).toBe(view);
    }
  });

  it('returns null for in-app views so their URLs stay at /', () => {
    for (const view of ['home', 'deck', 'quiz', 'auth', 'consent', 'dashboard', 'paywall'] as AppView[]) {
      expect(pathForView(view)).toBeNull();
    }
  });
});
