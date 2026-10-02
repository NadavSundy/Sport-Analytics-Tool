import { useCallback, useId, useRef, useState, type ComponentType } from 'react';

/**
 * The only part of the natural-language feature in the home page's bundle.
 *
 * The home page is gated on performance, so this is a heading and a button and
 * nothing else. The dialog, the contract validation and the statistics components
 * it renders are a separate chunk, imported when the visitor first reaches for the
 * button — on focus as well as click, so a keyboard visitor does not wait. That
 * follows `HomeHero`, which loads the Three.js scene the same way.
 *
 * The section reserves its height, so arriving with the rest of the lazy home
 * content shifts nothing below it, and the dialog is an overlay, so opening it
 * shifts nothing either.
 */

type DialogComponent = ComponentType<{ onClose: () => void }>;

export function AskQuestionPrompt() {
  const headingId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [Dialog, setDialog] = useState<DialogComponent | null>(null);
  const [open, setOpen] = useState(false);

  // A ref rather than state: the import must be started at most once, and reading
  // that from state would need a functional update, which cannot be typed
  // unambiguously when the state itself is a component (a callable value).
  const requested = useRef(false);

  const load = useCallback(() => {
    if (requested.current) {
      return;
    }
    requested.current = true;
    void import('./AskQuestionDialog')
      .then(({ AskQuestionDialog }) => setDialog(() => AskQuestionDialog))
      .catch(() => {
        // A failed chunk load leaves the trigger in place, so a retry can fetch it.
        requested.current = false;
      });
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Focus returns to the trigger, so closing leaves a keyboard visitor where
    // they were rather than at the top of the document.
    triggerRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby={headingId} className="ask-question">
      <div className="content-boundary ask-question__layout">
        <div>
          <p className="eyebrow">Published statistics, in your words</p>
          <h2 id={headingId}>Ask a stats question</h2>
          <p className="ask-question__summary">
            Ask about runs, wickets, a player&rsquo;s record or two players side by side. Each
            question is answered on its own from the statistics already published here.
          </p>
        </div>
        <button
          className="button button--primary"
          onClick={() => {
            load();
            setOpen(true);
          }}
          onFocus={load}
          ref={triggerRef}
          type="button"
        >
          Ask a stats question
        </button>
      </div>
      {open && Dialog ? <Dialog onClose={handleClose} /> : null}
    </section>
  );
}
