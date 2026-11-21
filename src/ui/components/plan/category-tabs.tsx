import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  readonly key: string;
  readonly label: string;
  readonly content: ReactNode;
}

/** Arrow keys move between tabs; Home and End jump to the ends (WAI-ARIA tabs pattern). */
function nextIndex(key: string, current: number, count: number): number | null {
  const moves: Record<string, number> = {
    ArrowRight: (current + 1) % count,
    ArrowLeft: (current - 1 + count) % count,
    Home: 0,
    End: count - 1,
  };
  return moves[key] ?? null;
}

/** Accessible tabs: one tab stop for the list, arrow-key navigation, labelled panels. */
export function CategoryTabs({
  label,
  items,
}: {
  readonly label: string;
  readonly items: readonly TabItem[];
}) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const next = nextIndex(event.key, active, items.length);
    if (next !== null) {
      event.preventDefault();
      setActive(next);
      tabs.current[next]?.focus();
    }
  };

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <button
            key={item.key}
            ref={(el) => {
              tabs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${item.key}`}
            aria-selected={i === active}
            aria-controls={`${baseId}-panel-${item.key}`}
            tabIndex={i === active ? 0 : -1}
            className="tab"
            onClick={() => {
              setActive(i);
            }}
            onKeyDown={onKeyDown}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item, i) => (
        <div
          key={item.key}
          role="tabpanel"
          id={`${baseId}-panel-${item.key}`}
          aria-labelledby={`${baseId}-tab-${item.key}`}
          hidden={i !== active}
          className="mt-4"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}
