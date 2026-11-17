/** @vitest-environment happy-dom */
import { act } from 'react';
import { createRoot, type Root as ReactRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useWondralStore } from '../app/store';
import { buildRecall } from '../core/recall';
import { ROOTS, isRootOpenable, rootId, type Root } from '../data/roots';
import { Deck } from './Deck';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const bio = ROOTS.find((r) => r.root === 'Bio') as Root;
const sal = ROOTS.find((r) => r.root === 'Sal') as Root;
const vest = ROOTS.find((r) => r.root === 'Vest') as Root;
const tex = ROOTS.find((r) => r.root === 'Tex') as Root;

function bodyText(): string {
  return (document.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function showQuestions(): HTMLButtonElement | undefined {
  return [...document.querySelectorAll('button')].find((button) =>
    button.textContent?.includes('Show the questions'),
  );
}

describe('what the kid sees on a new card', () => {
  let reactRoot: ReactRoot | null = null;
  let host: HTMLDivElement | null = null;
  const snapshot = useWondralStore.getState();

  beforeEach(() => {
    HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
    useWondralStore.setState({
      authStatus: 'signed-out',
      entitlement: null,
      entitlementLoaded: true,
      currentRootId: null,
      deckEntry: 'teach',
      deckFocusWord: null,
      completedRoots: new Set(),
      correctAdvance: null,
      queuedStudyRecall: null,
      view: 'deck',
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    reactRoot = createRoot(host);
  });

  afterEach(() => {
    act(() => {
      reactRoot?.unmount();
    });
    host?.remove();
    reactRoot = null;
    host = null;
    useWondralStore.setState({
      authStatus: snapshot.authStatus,
      entitlement: snapshot.entitlement,
      entitlementLoaded: snapshot.entitlementLoaded,
      currentRootId: snapshot.currentRootId,
      deckEntry: snapshot.deckEntry,
      deckFocusWord: snapshot.deckFocusWord,
      completedRoots: snapshot.completedRoots,
      correctAdvance: snapshot.correctAdvance,
      queuedStudyRecall: snapshot.queuedStudyRecall,
      view: snapshot.view,
      progress: snapshot.progress,
    });
  });

  async function show() {
    await act(async () => {
      reactRoot?.render(<Deck />);
    });
  }

  it('shows the Salary intro first, then the question, and keeps SAL', async () => {
    useWondralStore.setState({
      currentRootId: rootId(sal),
      deckEntry: 'find',
      deckFocusWord: 'Salary',
    });
    await show();

    const intro = bodyText();
    expect(intro).toContain('Salary means pay for work.');
    expect(intro).toContain('It comes from Latin, from Sal — salt.');
    expect(intro).toContain('SAL');
    expect(intro).toContain('Show the questions');
    expect(intro).not.toContain('What does Salary mean?');
    expect(intro).not.toContain('Roman');
    expect(document.querySelector('.ww-recall-opt')).toBeNull();
    expect(intro).not.toContain('I know this word');

    const button = showQuestions();
    expect(button).toBeTruthy();
    expect(button?.className).toContain('ww-intro-go');
    await act(async () => {
      button?.click();
    });

    const quiz = bodyText();
    expect(quiz).toContain('What does Salary mean?');
    expect(quiz).toContain('Pay for work');
    expect(document.querySelectorAll('.ww-recall-opt').length).toBeGreaterThan(1);
    expect(quiz).not.toContain('Salary means pay for work.');
    expect(quiz).not.toContain('Show the questions');
    expect(quiz).toContain('SAL');
    expect(quiz).toContain('Latin sāl');
  });

  it('shows the Invest intro first, then the question, and keeps VEST', async () => {
    useWondralStore.setState({
      currentRootId: rootId(vest),
      deckEntry: 'find',
      deckFocusWord: 'Invest',
    });
    await show();

    const intro = bodyText();
    expect(intro).toContain('Invest means money committed so it can grow.');
    expect(intro).toContain('It comes from Latin, from Vest — clothing.');
    expect(intro).toContain('VEST');
    expect(intro).toContain('Show the questions');
    expect(intro).not.toContain('What does Invest mean?');
    expect(intro).not.toContain('clothing on');
    expect(document.querySelector('.ww-recall-opt')).toBeNull();

    const button = showQuestions();
    expect(button).toBeTruthy();
    await act(async () => {
      button?.click();
    });

    const quiz = bodyText();
    expect(quiz).toContain('What does Invest mean?');
    expect(quiz).toContain('Money committed so it can grow');
    expect(document.querySelectorAll('.ww-recall-opt').length).toBeGreaterThan(1);
    expect(quiz).not.toContain('Invest means money committed so it can grow.');
    expect(quiz).not.toContain('Show the questions');
    expect(quiz).toContain('VEST');
    expect(quiz).toContain('Latin vestis');
  });

  it('shows a new Tex intro before any question', async () => {
    useWondralStore.setState({ currentRootId: rootId(tex), deckEntry: 'teach' });
    await show();

    const intro = bodyText();
    expect(intro).toContain('Tex means weave.');
    expect(intro).toContain('It comes from Latin. Like Textile.');
    expect(intro).toContain('TEKS');
    expect(intro).not.toContain('What does');
    expect(document.querySelector('.ww-recall-opt')).toBeNull();

    await act(async () => {
      showQuestions()?.click();
    });
    expect(document.querySelector('.ww-recall-opt')).not.toBeNull();
    expect(bodyText()).not.toContain('Show the questions');
    expect(bodyText()).not.toContain('Tex means weave.');
  });

  it('shows a new root intro before any question and keeps BY-oh', async () => {
    useWondralStore.setState({ currentRootId: rootId(bio), deckEntry: 'teach' });
    await show();

    const intro = bodyText();
    expect(intro).toContain('Bio means life.');
    expect(intro).toContain('It comes from Greek. Like Biology.');
    expect(intro).toContain('BY-oh');
    expect(intro).not.toContain('What does');
    expect(document.querySelector('.ww-recall-opt')).toBeNull();
    expect(intro).not.toContain('The science of living things');

    await act(async () => {
      showQuestions()?.click();
    });
    expect(document.querySelector('.ww-recall-opt')).not.toBeNull();
    expect(bodyText()).not.toContain('Show the questions');
    expect(bodyText()).not.toContain('Bio means life.');
  });

  it('leaves a learned card on its examples and a Remember visit on its question', async () => {
    useWondralStore.setState({
      currentRootId: rootId(sal),
      deckEntry: 'teach',
      completedRoots: new Set([rootId(sal)]),
    });
    await show();
    expect(bodyText()).toContain('Learned');
    expect(bodyText()).toContain('Salad');
    expect(bodyText()).not.toContain('Show the questions');
    expect(document.querySelector('.ww-recall-opt')).toBeNull();

    useWondralStore.setState({
      currentRootId: rootId(bio),
      deckEntry: 'remember',
      deckFocusWord: null,
      completedRoots: new Set([rootId(bio)]),
    });
    await show();
    expect(bodyText()).not.toContain('Show the questions');
    expect(document.querySelector('.ww-recall-opt')).not.toBeNull();
    expect(bodyText()).toContain('Bio');
  });

  it('reveals the recall question Next already named, without a new deal', async () => {
    const pool = ROOTS.filter((r) => isRootOpenable(rootId(r), false));
    const beat = buildRecall({ root: sal, pool, choices: 3, rng: () => 0 });
    useWondralStore.setState({
      currentRootId: rootId(sal),
      deckEntry: 'recall',
      queuedStudyRecall: { rootId: rootId(sal), beat },
    });
    await show();
    expect(bodyText()).toContain('Sal means salt.');
    expect(bodyText()).not.toContain(beat.ask);
    expect(document.querySelector('.ww-recall-opt')).toBeNull();

    await act(async () => {
      showQuestions()?.click();
    });
    const quiz = bodyText();
    expect(quiz).toContain(beat.ask);
    for (const opt of beat.opts) expect(quiz).toContain(opt.label);
    expect(document.querySelectorAll('.ww-recall-opt')).toHaveLength(beat.opts.length);
  });

  it('restores a Yes line instead of an intro with no question', async () => {
    useWondralStore.setState({
      currentRootId: rootId(sal),
      deckEntry: 'find',
      deckFocusWord: 'Salary',
      correctAdvance: {
        fromId: rootId(sal),
        dest: { kind: 'home', line: 'Yes — Salary. Pay for work' },
      },
    });
    await show();
    expect(bodyText()).toContain('Yes — Salary. Pay for work');
    expect(bodyText()).not.toContain('Show the questions');
    expect(bodyText()).not.toContain('Salary means pay for work.');
    expect(document.querySelector('.ww-recall-opt')).toBeNull();
  });
});
