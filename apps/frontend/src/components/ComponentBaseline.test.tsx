import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './Button';
import { Card } from './Card';
import { DataTable } from './DataTable';
import { Message } from './Message';
import { PageLayout } from './PageLayout';
import { TextField } from './TextField';

describe('frontend component baseline', () => {
  it('exposes labels, help, validation and an actionable error to assistive technology', () => {
    render(
      <TextField
        id="team"
        label="Team"
        helpText="Choose the batting team."
        error="A team is required."
        required
      />,
    );

    const input = screen.getByLabelText(/team/i);
    expect(input).toBeRequired();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'team-help team-error');
    expect(screen.getByText('A team is required.')).toHaveAttribute('id', 'team-error');
  });

  it('uses semantic controls, regions and table captions', () => {
    render(
      <PageLayout heading="Fixtures" description="Published T20 cricket fixtures.">
        <Card heading="Latest fixtures">
          <Button>Open fixture</Button>
        </Card>
        <Message variant="error" heading="Could not load fixtures">
          <p>Try again.</p>
        </Message>
        <DataTable caption="Latest fixtures">
          <thead>
            <tr>
              <th scope="col">Fixture</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>South Africa v India</td>
            </tr>
          </tbody>
        </DataTable>
      </PageLayout>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Fixtures' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open fixture' })).toHaveClass('ui-button--primary');
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load fixtures');
    expect(screen.getByRole('table', { name: 'Latest fixtures' })).toBeInTheDocument();
  });
});
