import { useRef, type KeyboardEvent } from 'react';
import { PALETTES } from '../../data/roots';
import { paletteVars } from '../components/styleVars';
import type { MenuItem } from './menu';

function jewelVarsOf(jewel: string) {
  const p = PALETTES[jewel] ?? PALETTES.green!;
  return paletteVars(p.c1rgb, p.grad);
}

/**
 * The signature selectable menu (master column). A real listbox: click a row or
 * use ↑/↓ to move the selection (wraps), Enter fires the selected row's detail
 * CTA. Selecting re-themes the detail panel to the row's jewel.
 */
export function TierMenu({
  items,
  selectedIndex,
  onSelect,
  onActivate,
}: {
  items: MenuItem[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onActivate: (item: MenuItem) => void;
}) {
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function move(delta: number) {
    const next = (selectedIndex + delta + items.length) % items.length;
    onSelect(next);
    rowRefs.current[next]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate(items[selectedIndex]!);
    }
  }

  return (
    <div className="ww-menu" role="listbox" aria-label="Choose what to play" onKeyDown={onKeyDown}>
      {items.map((it, i) => {
        const sel = i === selectedIndex;
        const locked = it.kind === 'tier' && it.locked;
        return (
          <button
            key={it.key}
            ref={(el) => {
              rowRefs.current[i] = el;
            }}
            type="button"
            role="option"
            aria-selected={sel}
            tabIndex={sel ? 0 : -1}
            className={`ww-menu-row${sel ? ' sel' : ''}`}
            style={jewelVarsOf(it.jewel)}
            onClick={() => onSelect(i)}
          >
            <span className={`ww-menu-chip${locked ? ' lock' : ''}`} aria-hidden="true">
              {it.icon}
            </span>
            <span className="ww-menu-body">
              <span className="t">
                {it.title}
                {it.kind === 'mode' && it.badge ? <span className="ww-tag">{it.badge}</span> : null}
                {it.kind === 'tier' && it.t === 1 ? <span className="ww-tag">FREE</span> : null}
              </span>
              <span className="sub">{it.sub}</span>
              {it.kind === 'tier' && !it.locked ? (
                <span className="ww-menu-bar">
                  <i style={{ width: `${it.pct}%` }} />
                </span>
              ) : null}
            </span>
            <span className="ww-menu-meta">
              {it.kind === 'tier' ? (
                it.locked ? (
                  <span className="locklbl">🔒 Locked</span>
                ) : (
                  <span className="pct">{it.pct}%</span>
                )
              ) : it.disabled ? (
                <span className="locklbl">Soon</span>
              ) : (
                <span className="pct" aria-hidden="true">
                  ›
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
