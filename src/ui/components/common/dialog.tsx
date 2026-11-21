import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/** Keep Tab and Shift+Tab cycling inside the dialog, pulling focus back in if it escaped. */
function trapTab(event: KeyboardEvent, root: HTMLElement): void {
  const items = focusable(root);
  const first = items[0];
  const last = items.at(-1);
  const active = document.activeElement;
  const outside = !(active instanceof Node) || !root.contains(active);
  if (outside || (event.shiftKey && active === first)) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first?.focus();
  }
}

/** Move focus in on open, trap Tab, close on Esc, and restore focus on close. */
function useModalFocus(ref: RefObject<HTMLDivElement | null>, onClose: () => void): void {
  const latestOnClose = useRef(onClose);

  useEffect(() => {
    latestOnClose.current = onClose;
  });

  useEffect(() => {
    const root = ref.current;
    const opener = document.activeElement;
    if (root === null) {
      return undefined;
    }
    focusable(root)[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        latestOnClose.current();
      } else if (event.key === 'Tab') {
        trapTab(event, root);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (opener instanceof HTMLElement) {
        opener.focus();
      }
    };
  }, [ref]);
}

/**
 * A modal dialog: focus moves inside on open, Tab is trapped, Esc closes it, and focus returns
 * to the element that opened it.
 */
export function Dialog({
  title,
  closeLabel,
  onClose,
  children,
}: {
  readonly title: string;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useModalFocus(ref, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-2 sm:items-center">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="surface max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl p-5 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold">
            {title}
          </h2>
          <button type="button" className="btn-secondary" onClick={onClose}>
            {closeLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
