import { useCallback, useRef, useState, type ComponentType } from 'react';

/**
 * The only part of the natural-language feature in every page's bundle.
 *
 * Issue #936 asks for the assistant to be reachable from anywhere, which means
 * this component is mounted once in the shared shell and therefore loaded on
 * every route. So it is a button and nothing else: the panel, the contract
 * validation and the statistics components it renders are a separate chunk,
 * imported when a visitor first reaches for it — on focus as well as click, so a
 * keyboard visitor does not wait for the import after pressing Enter. That
 * follows what `AskQuestionPrompt` did for the home page before this issue
 * replaced it.
 */

type PanelComponent = ComponentType<{ onClose: () => void }>;

export function ChatLauncher() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [Panel, setPanel] = useState<PanelComponent | null>(null);
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
    void import('./ChatPanel')
      .then(({ ChatPanel }) => setPanel(() => ChatPanel))
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
    <>
      <button
        aria-expanded={open}
        aria-label="Ask a stats question"
        className="chat-launcher"
        onClick={() => {
          load();
          setOpen(true);
        }}
        onFocus={load}
        ref={triggerRef}
        type="button"
      >
        <svg aria-hidden="true" className="chat-launcher__icon" viewBox="0 0 24 24">
          <path
            d="M4 5.5h16v10H9l-5 4v-14z"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.75"
          />
        </svg>
        <span className="chat-launcher__label">Ask</span>
      </button>
      {open && Panel ? <Panel onClose={handleClose} /> : null}
    </>
  );
}
