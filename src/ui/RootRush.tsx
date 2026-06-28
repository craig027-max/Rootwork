import { useMemo, useState } from 'react';
import { useWondralStore } from '../app/store';
import { useEntitledForDisplay } from '../app/hooks';
import { ROOTS, rootId, isRootOpenable, type Root } from '../data/roots';
import { QuizTile, type QuizTileState } from './components/QuizTile';
import { Button } from './components/Button';
import { Badge } from './components/Badge';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

const QUESTION_COUNT = 8;

interface Question {
  root: Root;
  options: string[];
  answer: number;
}

/**
 * Root Rush — a quick timed-feel meaning-match quiz. Runs over the roots the
 * learner can actually access (Tier 1 for free users; everything once entitled),
 * so it never quizzes locked content. Pure UI; persistence/leaderboards are a
 * follow-on.
 */
export function RootRush() {
  const entitled = useEntitledForDisplay();
  const setView = useWondralStore((s) => s.setView);
  const requestUpgrade = useWondralStore((s) => s.requestUpgrade);

  // Quiz over the roots the learner can open (Tier 1 free; all once entitled) —
  // not the linear-unlock set, so a free learner gets a full Tier-1 quiz.
  const pool = useMemo(() => ROOTS.filter((r) => isRootOpenable(rootId(r), entitled)), [entitled]);

  const questions = useMemo<Question[]>(() => {
    const picks = shuffle(pool).slice(0, Math.min(QUESTION_COUNT, pool.length));
    return picks.map((root) => {
      const distractors = shuffle(ROOTS.filter((r) => r.mean !== root.mean))
        .slice(0, 3)
        .map((r) => r.mean);
      const options = shuffle([root.mean, ...distractors]);
      return { root, options, answer: options.indexOf(root.mean) };
    });
  }, [pool]);

  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);

  if (questions.length < 1) {
    return (
      <div className="ww-center ww-stack">
        <p className="ww-muted">Learn a few roots first, then come back for Root Rush.</p>
        <Button onClick={() => setView('home')}>Back to learning</Button>
      </div>
    );
  }

  if (i >= questions.length) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="ww-center ww-stack">
        <p className="ww-eyebrow">Root Rush complete</p>
        <h1 className="text-gradient-hero">
          {score} / {questions.length}
        </h1>
        <p className="ww-muted">{pct}% correct</p>
        <div className="ww-row">
          <Button
            onClick={() => {
              setI(0);
              setPicked(null);
              setScore(0);
              setCombo(0);
            }}
          >
            Play again
          </Button>
          <Button variant="ghost" onClick={() => setView('home')}>
            Done
          </Button>
          {!entitled ? (
            <Button variant="ghost" onClick={requestUpgrade}>
              Unlock all tiers
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const q = questions[i]!;

  function answer(idx: number) {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === q.answer) {
      setScore((s) => s + 1);
      setCombo((c) => c + 1);
    } else {
      setCombo(0);
    }
  }

  function tileState(idx: number): QuizTileState {
    if (picked === null) return 'idle';
    if (idx === q.answer) return 'correct';
    if (idx === picked) return 'wrong';
    return 'dim';
  }

  return (
    <div className="ww-stack" style={{ maxWidth: 560, margin: '0 auto' }}>
      <div className="ww-row" style={{ justifyContent: 'space-between' }}>
        <Badge variant="outline">
          Question {i + 1} / {questions.length}
        </Badge>
        <div className="ww-row">
          {combo > 1 ? <Badge variant="gold">🔥 {combo}× combo</Badge> : null}
          <Badge variant="solid" jewel="jade">
            {score} ★
          </Badge>
        </div>
      </div>

      <div className="ww-stack" style={{ textAlign: 'center' }}>
        <p className="ww-eyebrow">What does this root mean?</p>
        <h1 className="text-gradient-hero">{q.root.root}</h1>
        <p className="ww-muted">{q.root.say}</p>
      </div>

      <div className="ww-stack">
        {q.options.map((opt, idx) => (
          <QuizTile
            key={opt}
            label={opt}
            keyHint={idx + 1}
            state={tileState(idx)}
            onClick={() => answer(idx)}
          />
        ))}
      </div>

      {picked !== null ? (
        <Button
          block
          onClick={() => {
            setPicked(null);
            setI((x) => x + 1);
          }}
        >
          {i + 1 < questions.length ? 'Next →' : 'See results'}
        </Button>
      ) : null}
    </div>
  );
}
