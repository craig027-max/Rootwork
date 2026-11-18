import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { useWondralStore } from '../app/store';
import { grownupSumPrompt, makeGrownupSum, type GrownupSum } from '../core/parentGate';
import { Button } from './components/Button';

/**
 * Adult check in front of account, plan, and purchase screens.
 * A labeled sum is keyboard and screen-reader usable. A wrong answer stays
 * on this screen and swaps in a new sum.
 */
export function ParentGate() {
  const passParentGate = useWondralStore((s) => s.passParentGate);
  const setView = useWondralStore((s) => s.setView);
  const [sum, setSum] = useState<GrownupSum>(() => makeGrownupSum());
  const [value, setValue] = useState('');
  const [miss, setMiss] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const helpId = useId();
  const missId = useId();
  const prompt = grownupSumPrompt(sum);

  useEffect(() => {
    inputRef.current?.focus();
  }, [sum]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const typed = value.trim();
    const n = Number(typed);
    if (typed !== '' && Number.isInteger(n) && n === sum.answer) {
      passParentGate();
      return;
    }
    setMiss(true);
    setValue('');
    setSum(makeGrownupSum());
  }

  return (
    <form className="ww-form ww-gate" onSubmit={submit} data-screen="parent-gate">
      <p className="ww-eyebrow">For grown-ups</p>
      <h1 className="text-gradient-hero" id="ww-gate-title">
        Grown-ups only
      </h1>
      <p className="ww-muted" id={helpId}>
        Answer this to continue. It keeps account and payment screens for a grown-up.
      </p>
      <label className="ww-gate-label" htmlFor="ww-gate-answer">
        {prompt}
      </label>
      <input
        id="ww-gate-answer"
        ref={inputRef}
        className="ww-input"
        inputMode="numeric"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        aria-invalid={miss}
        aria-describedby={miss ? `${helpId} ${missId}` : helpId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {miss ? (
        <p className="ww-notice is-error" id={missId} role="alert">
          That isn’t it. Try this new question.
        </p>
      ) : null}
      <Button type="submit" block>
        Continue
      </Button>
      <Button type="button" variant="ghost" onClick={() => setView('home')}>
        Back to learning
      </Button>
    </form>
  );
}
