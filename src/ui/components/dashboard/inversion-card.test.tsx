import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Inversion } from '../../../shared/plan.js';
import { checkA11y } from '../../test/axe.js';
import { renderInApp } from '../../test/render.js';
import { InversionCard } from './inversion-card.js';

const TRAPPED: Inversion = {
  trappedNow: true,
  clearsAtHour: 11,
  minBlhM: 15,
  maxBlhM: 640,
  basis: 'boundary_layer',
};

describe('InversionCard', () => {
  it('says when a trapping inversion should clear', async () => {
    const view = renderInApp(<InversionCard inversion={TRAPPED} />);

    expect(
      screen.getByRole('region', { name: 'Why the air is worse in the morning' }),
    ).toHaveTextContent('Daytime mixing should clear it around 11:00.');
    expect(screen.queryByText(/Based on wind speed only/)).not.toBeInTheDocument();
    expect(await checkA11y(view.container)).toEqual([]);
  });

  it('warns when the inversion may last all day', () => {
    renderInApp(<InversionCard inversion={{ ...TRAPPED, clearsAtHour: null }} />);

    expect(screen.getByText(/it may not clear today/)).toBeInTheDocument();
  });

  it('says the air is mixing, and admits when only wind data was available', () => {
    renderInApp(
      <InversionCard
        inversion={{
          ...TRAPPED,
          trappedNow: false,
          minBlhM: null,
          maxBlhM: null,
          basis: 'wind_only',
        }}
      />,
    );

    expect(screen.getByText(/Air is mixing normally/)).toBeInTheDocument();
    expect(screen.getByText(/Based on wind speed only/)).toBeInTheDocument();
  });

  it('says it cannot tell when there is no weather data', () => {
    renderInApp(
      <InversionCard
        inversion={{ ...TRAPPED, trappedNow: false, minBlhM: null, maxBlhM: null, basis: 'none' }}
      />,
    );

    expect(screen.getByText(/Weather data is unavailable/)).toBeInTheDocument();
    expect(screen.queryByText(/Air is mixing normally/)).not.toBeInTheDocument();
  });
});
