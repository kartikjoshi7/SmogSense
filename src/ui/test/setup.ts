import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// The chat and community dialogs load lazily; under coverage on a busy machine the first load can
// take longer than Testing Library's default one-second wait for `findBy…` queries.
configure({ asyncUtilTimeout: 5_000 });

afterEach(() => {
  cleanup();
});
