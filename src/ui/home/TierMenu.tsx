import { useEffect, useRef, type KeyboardEvent } from 'react';
import { PALETTES } from '../../data/roots';
import { paletteVars } from '../components/styleVars';
import { tuckedSummary, type MenuItem, type TierItem } from './menu';

function jewelVarsOf(jewel: string) {
  const p = PALETTES[jewel] ?? PALETTES.green!;
  return paletteVars(p.c1rgb, p.grad);
}

/**
 * The signature selectable menu (master column). A real listbox: tap/click a
 * row to preview it in the detail panel; tap the already-selected row (or
 * press Enter) to start. Arrow keys still move the selection on desktop.
 * Locked / later tiers render inside a collapsed disclosure so they don't
 * dominate the next-Play board.
 */
export function TierMenu({
  items,
  tucked = [],
  selectedIndex,
  nextPlay = false,
  onSelect,
  onActivate,
}: {
  items: MenuItem[];
  tucked?: TierItem[];
  selectedIndex: number;
  /** Next-Play board: one fat Play row, PLAY pill, no progress bar. */
  nextPlay?: boolean;
  onSelect: (index: number) => void;
  onActivate: (item: MenuItem) => void;
}) {
  const rowRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const moreRef = useRef<HTMLDetailsElement | null>(null);
  const allItems: MenuItem[] = [...items, ...tucked];

  useEffect(() => {
    if (selectedIndex >= items.length && moreRef.current) {
      moreRef.current.open = true;
    }
  }, [selectedIndex, items.length]);

  function move(delta: number) {
    const next = (selectedIndex + delta + allItems.length) % allItems.length;
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
      onActivate(allItems[selectedIndex]!);
    }
  }

  function renderRow(it: MenuItem, i: number) {
    const sel = i === selectedIndex;
    const locked = it.kind === 'tier' && it.locked;
    const playNow = nextPlay && it.kind === 'tier' && it.current;
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
        className={`ww-menu-row${sel ? ' sel' : ''}${playNow ? ' play' : ''}${
          it.kind === 'mode' && it.preview && it.preview.length > 0 ? ' has-preview' : ''
        }`}
        style={jewelVarsOf(it.jewel)}
        onClick={() => {
          if (sel) onActivate(it);
          else onSelect(i);
        }}
      >
        <span className={`ww-menu-chip${locked ? ' lock' : ''}`} aria-hidden="true">
          {it.icon}
        </span>
        <span className="ww-menu-body">
          <span className="t">
            {it.title}
            {it.kind === 'mode' && it.badge ? <span className="ww-tag">{it.badge}</span> : null}
            {it.kind === 'tier' && it.t === 1 ? <span className="ww-tag">FREE</span> : null}
            {playNow ? <span className="ww-tag here">PLAY</span> : null}
            {it.kind === 'tier' && it.current && !playNow ? (
              <span className="ww-tag here">HERE</span>
            ) : null}
          </span>
          <span className="sub">
            {it.kind === 'tier' && it.resumeName && !playNow
              ? `Next · ${it.resumeName}`
              : it.sub}
          </span>
          {it.kind === 'mode' && it.preview && it.preview.length > 0 ? (
            <span className={`ww-daily-lines${it.previewDone ? ' is-done' : ''}`}>
              {it.preview.map((p) => (
                <span
                  className={`ww-daily-line${it.previewDone ? ' is-done' : ''}`}
                  key={p.root}
                >
                  {it.previewDone ? (
                    <span className="ww-daily-mark" aria-hidden="true">
                      ✓
                    </span>
                  ) : null}
                  <b>{p.root}</b>
                  <span>{p.mean}</span>
                </span>
              ))}
            </span>
          ) : null}
          {it.kind === 'tier' && !it.locked && !playNow ? (
            <span className="ww-menu-bar">
              <i style={{ width: `${it.pct}%` }} />
            </span>
          ) : null}
        </span>
        <span className="ww-menu-meta">
          {it.kind === 'tier' ? (
            it.locked ? (
              <span className="locklbl">🔒 Locked</span>
            ) : playNow ? (
              <span className="pct">Play ›</span>
            ) : it.pct === 100 ? (
              <>
                <span className="pct">✓</span>
                <span className="stars" aria-label={`${it.stars} of 5 stars`}>
                  {'★'.repeat(it.stars)}
                  {'☆'.repeat(5 - it.stars)}
                </span>
              </>
            ) : it.resumeName ? (
              <>
                <span className="pct">{it.resumeName} ›</span>
                <span className="stars" aria-label={`${it.pct} percent owned`}>
                  {it.pct}%
                </span>
              </>
            ) : it.done === 0 ? (
              <span className="pct">Play ›</span>
            ) : (
              <>
                <span className="pct">{it.pct}%</span>
                <span className="stars" aria-label={`${it.stars} of 5 stars`}>
                  {'★'.repeat(it.stars)}
                  {'☆'.repeat(5 - it.stars)}
                </span>
              </>
            )
          ) : it.disabled ? (
            <span className="locklbl">Soon</span>
          ) : it.best ? (
            <>
              <span className="pct">{it.best}</span>
              <span className="stars">best</span>
            </>
          ) : (
            <span className="pct" aria-hidden="true">
              ›
            </span>
          )}
        </span>
      </button>
    );
  }

  return (
    <div className="ww-menu" role="listbox" aria-label="Choose what to play" onKeyDown={onKeyDown}>
      {items.map((it, i) => renderRow(it, i))}
      {tucked.length > 0 ? (
        <details className="ww-menu-more" ref={moreRef}>
          <summary>{tuckedSummary(tucked)}</summary>
          <div className="ww-menu-more-list">
            {tucked.map((it, j) => renderRow(it, items.length + j))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
