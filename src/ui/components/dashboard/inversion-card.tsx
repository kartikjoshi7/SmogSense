import { clock } from '../../../core/explain/format.js';
import type { Inversion } from '../../../shared/plan.js';
import { useMessages } from '../../state/app-context.js';

/** Explains the winter inversion: why pollution sits low in the morning and when it should lift. */
export function InversionCard({ inversion }: { readonly inversion: Inversion }) {
  const t = useMessages().inversion;
  let text = inversion.basis === 'none' ? t.unknown : t.clear;
  if (inversion.trappedNow) {
    text =
      inversion.clearsAtHour === null ? t.trappedAllDay : t.trapped(clock(inversion.clearsAtHour));
  }
  return (
    <section aria-labelledby="inversion-heading" className="card">
      <h2 id="inversion-heading" className="text-xl font-semibold">
        {t.title}
      </h2>
      <p className="mt-2">{text}</p>
      {inversion.basis === 'wind_only' ? <p className="muted mt-1 text-sm">{t.windOnly}</p> : null}
    </section>
  );
}
