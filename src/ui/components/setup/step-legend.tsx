/** A setup step's numbered title. */
import type { ReactNode } from 'react';

interface StepLegendProps {
  readonly step: number;
  readonly children: ReactNode;
}

/** A setup step's title with its number; the number is decorative, the title names the group. */
export function StepLegend({ step, children }: StepLegendProps) {
  return (
    <legend className="text-lg font-semibold">
      <span aria-hidden="true" className="step-badge">
        {step}
      </span>
      {children}
    </legend>
  );
}
