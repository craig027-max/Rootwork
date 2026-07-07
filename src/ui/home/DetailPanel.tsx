import type { ReactNode } from 'react';
import { PALETTES } from '../../data/roots';
import { paletteVars, type CSSVars } from '../components/styleVars';
import { Button } from '../components/Button';

export interface DetailVM {
  /** PALETTES key driving the panel theme. */
  jewel: string;
  /** Stable key so the entrance animation replays when the selection changes. */
  animKey: string;
  eyebrow: string;
  big: string;
  /** Locked tier — renders the design's .locked-state (🔒 glyph, no ring). */
  locked?: boolean;
  lead: ReactNode;
  ring?: { pct: number; label: string };
  pmA?: string;
  pmB?: ReactNode;
  samples: { root: string; mean: string }[];
  moreCount: number;
  primary: { label: string; disabled?: boolean };
  secondary?: { label: string };
}

/**
 * The detail panel (detail column). Re-themes to the selected row's jewel and
 * shows live progress (conic ring), sample roots, and the row's CTAs. Custom
 * properties set on the panel cascade into the spark Button so it picks up the
 * same jewel gradient.
 */
export function DetailPanel({
  vm,
  onPrimary,
  onSecondary,
}: {
  vm: DetailVM;
  onPrimary: () => void;
  onSecondary: () => void;
}) {
  const p = PALETTES[vm.jewel] ?? PALETTES.green!;
  return (
    <div className="ww-detail" style={paletteVars(p.c1rgb, p.grad)}>
      <div className={`ww-detail-anim${vm.locked ? ' ww-locked-state' : ''}`} key={vm.animKey}>
        <span className="ww-detail-eyebrow">
          <span className="dot" aria-hidden="true" />
          {vm.eyebrow}
        </span>
        {vm.locked ? (
          <span className="lk" aria-hidden="true">
            🔒
          </span>
        ) : null}
        <div className="ww-big">{vm.big}</div>
        <p className="lead">{vm.lead}</p>

        {vm.ring ? (
          <div className="ww-prog">
            <div className="ww-ring" style={{ '--p': vm.ring.pct } as CSSVars}>
              <i>{vm.ring.label}</i>
            </div>
            <div className="ww-pmeta">
              {vm.pmA ? <div className="pm-a">{vm.pmA}</div> : null}
              {vm.pmB ? <div className="pm-b">{vm.pmB}</div> : null}
            </div>
          </div>
        ) : null}

        <div className="ww-samples">
          {vm.samples.map((s) => (
            <div className="ww-schip" key={s.root}>
              {s.root}
              <span>{s.mean}</span>
            </div>
          ))}
          {vm.moreCount > 0 ? <div className="ww-more">+ {vm.moreCount} more</div> : null}
        </div>

        <div className="ww-detail-cta">
          <Button onClick={onPrimary} disabled={vm.primary.disabled}>
            {vm.primary.label}
          </Button>
          {vm.secondary ? (
            <Button variant="ghost" onClick={onSecondary}>
              {vm.secondary.label}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
