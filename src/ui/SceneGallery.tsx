import { PALETTES, ROOTS } from '../data/roots';
import { paletteVars } from './components/styleVars';
import { Scene } from './Scene';
import { SCENE_EMOJI, SCENES } from './scenes';

/** Hero roots kids will show a parent — plus one card per scene type. */
const HEROES = ['Bio', 'Aqua', 'Photo', 'Astro', 'Therm', 'Pyr'] as const;

/**
 * Opt-in visual review (`/?gallery=1`). Not linked from the app chrome, so it
 * cannot change keyboard nav, COPPA, or paywall flows.
 */
export function SceneGallery() {
  const heroRoots = HEROES.map((name) => ROOTS.find((r) => r.root === name)).filter(
    (r): r is NonNullable<typeof r> => !!r,
  );
  const seen = new Set(heroRoots.map((r) => r.scene));
  const rest = Object.keys(SCENES)
    .filter((k) => !seen.has(k))
    .map((key) => {
      const sample = ROOTS.find((r) => r.scene === key);
      return { key, sample };
    });

  return (
    <div className="ww-gallery rw-ambient">
      <header className="ww-gallery-head">
        <p className="ww-eyebrow">Wondral Words · scene gallery</p>
        <h1 className="text-gradient-hero">Does it give you chills?</h1>
        <p>Hero cards first. Then every scene type. This page is a review tool — close the tab to go back.</p>
      </header>

      <h2>Hero roots</h2>
      <div className="ww-gallery-grid">
        {heroRoots.map((r) => {
          const p = PALETTES[r.pal] ?? PALETTES.green!;
          return (
            <article key={r.root} className="ww-gallery-card" style={paletteVars(p.c1rgb, p.grad)}>
              <div className="ww-gallery-stage">
                <Scene scene={r.scene} pal={p.pal} />
              </div>
              <div className="ww-gallery-meta">
                <strong>{r.root}</strong>
                <span>
                  {SCENE_EMOJI[r.scene] ?? ''} {r.mean}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <h2>Every scene type</h2>
      <div className="ww-gallery-grid">
        {rest.map(({ key, sample }) => {
          const palKey = sample?.pal ?? 'violet';
          const p = PALETTES[palKey] ?? PALETTES.green!;
          return (
            <article key={key} className="ww-gallery-card" style={paletteVars(p.c1rgb, p.grad)}>
              <div className="ww-gallery-stage">
                <Scene scene={key} pal={p.pal} />
              </div>
              <div className="ww-gallery-meta">
                <strong>{key}</strong>
                <span>
                  {SCENE_EMOJI[key] ?? ''} {sample ? `${sample.root} · ${sample.mean}` : 'unwired'}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
