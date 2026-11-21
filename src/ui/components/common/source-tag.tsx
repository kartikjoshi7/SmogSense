import type { TextSource } from '../../../shared/api.js';
import { useMessages } from '../../state/app-context.js';

/** Says honestly whether text was written by the AI (and checked) or is standard guidance. */
export function SourceTag({ source }: { readonly source: TextSource }) {
  const t = useMessages();
  return (
    <span className={source === 'ai' ? 'tag tag-ai' : 'tag'}>
      <span aria-hidden="true">{source === 'ai' ? '✦ ' : '• '}</span>
      {t.plan.source[source]}
    </span>
  );
}
