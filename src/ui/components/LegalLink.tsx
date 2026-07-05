import { useWondralStore } from '../../app/store';

const LABELS = { privacy: 'Privacy Policy', terms: 'Terms of Service' } as const;

/**
 * Link to a legal page. Renders a real <a href> (so open-in-new-tab, copy link,
 * and crawlers all work against the static /privacy and /terms URLs) but a plain
 * left-click switches the view in-app, keeping store state and avoiding a reload.
 */
export function LegalLink({
  page,
  children,
  className,
}: {
  page: 'privacy' | 'terms';
  children?: React.ReactNode;
  className?: string;
}) {
  const setView = useWondralStore((s) => s.setView);
  return (
    <a
      className={className}
      href={`/${page}`}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        setView(page);
      }}
    >
      {children ?? LABELS[page]}
    </a>
  );
}
