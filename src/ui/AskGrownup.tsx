import { useEffect, useRef } from 'react';
import { Button } from './components/Button';

/**
 * What a kid sees after tapping something locked. One short note and a way
 * back. No price, no purchase, no account form, no outbound link.
 */
export function AskGrownup({ onBack }: { onBack: () => void }) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cardRef.current?.querySelector('button')?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBack]);

  return (
    <div
      className="ww-ask"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ww-ask-title"
      data-screen="ask-grownup"
    >
      <div className="ww-ask-card" ref={cardRef}>
        <h1 id="ww-ask-title">Ask a grown-up</h1>
        <p>This one is locked. A grown-up can open it for you.</p>
        <Button type="button" onClick={onBack}>
          Keep playing
        </Button>
      </div>
    </div>
  );
}
