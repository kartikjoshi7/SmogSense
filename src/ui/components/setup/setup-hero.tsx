import { type RefObject } from 'react';
import { useMessages } from '../../state/app-context.js';

interface SetupHeroProps {
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly onDemo: () => void;
}

/** The top of the setup screen: what SmogSense does, and the one-click example family. */
export function SetupHero({ headingRef, onDemo }: SetupHeroProps) {
  const t = useMessages().setup;
  return (
    <div className="hero grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-center">
      <div className="grid gap-3">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold sm:text-4xl">
          {t.title}
        </h1>
        <p className="muted text-lg">{t.intro}</p>
      </div>
      <div className="grid gap-4">
        <ul className="flex flex-wrap gap-2">
          {t.features.map((feature) => (
            <li key={feature} className="feature">
              <span aria-hidden="true">✓</span>
              {feature}
            </li>
          ))}
        </ul>
        <button type="button" className="btn-primary justify-self-start" onClick={onDemo}>
          {t.demo}
        </button>
      </div>
    </div>
  );
}
