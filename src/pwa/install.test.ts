import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function pngSize(path: string): { width: number; height: number } {
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(bytes.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe('home-screen install', () => {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const manifest = JSON.parse(readFileSync(join(root, 'public/manifest.webmanifest'), 'utf8')) as {
    id: string;
    name: string;
    short_name: string;
    start_url: string;
    scope: string;
    display: string;
    orientation: string;
    background_color: string;
    theme_color: string;
    description: string;
    icons: { src: string; sizes: string; purpose: string }[];
  };

  it('names the installed app Wondral Words and launches standalone from /', () => {
    expect(manifest).toMatchObject({
      id: '/',
      name: 'Wondral Words',
      short_name: 'Wondral',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'any',
      background_color: '#08070f',
      theme_color: '#08070f',
    });
    expect(manifest.description.length).toBeGreaterThan(10);
    expect(html).toContain('rel="manifest" href="/manifest.webmanifest"');
    expect(html).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(html).toContain('name="apple-mobile-web-app-title" content="Wondral Words"');
    expect(html).toContain('name="apple-mobile-web-app-status-bar-style" content="black-translucent"');
    expect(html).toContain('name="theme-color" content="#08070f"');
    expect(html).toContain('viewport-fit=cover');
  });

  it('ships 192 and 512 icons, maskable twins, a 180 apple touch icon, and a favicon', () => {
    expect(pngSize(join(root, 'public/icons/icon-192.png'))).toEqual({ width: 192, height: 192 });
    expect(pngSize(join(root, 'public/icons/icon-512.png'))).toEqual({ width: 512, height: 512 });
    expect(pngSize(join(root, 'public/icons/icon-maskable-192.png'))).toEqual({
      width: 192,
      height: 192,
    });
    expect(pngSize(join(root, 'public/icons/icon-maskable-512.png'))).toEqual({
      width: 512,
      height: 512,
    });
    expect(pngSize(join(root, 'public/apple-touch-icon.png'))).toEqual({ width: 180, height: 180 });
    expect(pngSize(join(root, 'public/favicon-32.png'))).toEqual({ width: 32, height: 32 });
    expect(readFileSync(join(root, 'public/favicon.svg'), 'utf8')).toContain('<svg');
    const purposes = manifest.icons.map((icon) => `${icon.sizes}:${icon.purpose}`);
    expect(purposes).toEqual([
      '192x192:any',
      '512x512:any',
      '192x192:maskable',
      '512x512:maskable',
    ]);
  });

  it('does not register a service worker', () => {
    expect(html).not.toContain('serviceWorker');
    expect(() => readFileSync(join(root, 'public/sw.js'))).toThrow();
  });
});
