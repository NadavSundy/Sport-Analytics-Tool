import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NameCombobox, type NameComboboxOption, fuzzyRankOptions } from './NameCombobox';

const options: NameComboboxOption[] = [
  { label: "Women's Premier League", value: 'competition-2' },
  { label: 'Premier Cricket League', value: 'competition-1' },
  { label: 'Super League', value: 'competition-3' },
];

function Harness({
  loadOptions = vi.fn().mockResolvedValue(options),
}: {
  loadOptions?: (signal: AbortSignal) => Promise<NameComboboxOption[]>;
}) {
  const [inputValue, setInputValue] = useState('');
  const [selectedValue, setSelectedValue] = useState('');

  return (
    <>
      <NameCombobox
        dependencyKey=""
        entityName="competition"
        inputValue={inputValue}
        label="Competition"
        loadOptions={loadOptions}
        onInputChange={(value) => {
          setInputValue(value);
          setSelectedValue('');
        }}
        onSelectionChange={(option) => {
          setInputValue(option?.label ?? '');
          setSelectedValue(option?.value ?? '');
        }}
        onSelectionResolved={() => undefined}
        placeholder="Type a competition name"
        selectedValue={selectedValue}
      />
      <div data-testid="selected-value">{selectedValue}</div>
    </>
  );
}

describe('NameCombobox', () => {
  it('fuzzy-ranks readable option names', () => {
    expect(fuzzyRankOptions(options, 'prem').map(({ label }) => label)).toEqual([
      'Premier Cricket League',
      "Women's Premier League",
    ]);
    expect(fuzzyRankOptions(options, 'spr')[0]?.label).toBe('Super League');
  });

  it('opens without typing, reports loading and selects an option directly', async () => {
    let resolveOptions!: (value: NameComboboxOption[]) => void;
    const loadOptions = vi.fn(
      () =>
        new Promise<NameComboboxOption[]>((resolve) => {
          resolveOptions = resolve;
        }),
    );
    render(<Harness loadOptions={loadOptions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show competition options' }));
    expect(screen.getByRole('status')).toHaveTextContent('Loading competition options');

    await act(async () => resolveOptions(options));
    const listbox = await screen.findByRole('listbox', { name: 'Competition options' });
    fireEvent.click(within(listbox).getByRole('option', { name: 'Premier Cricket League' }));

    expect(screen.getByRole('combobox', { name: 'Competition' })).toHaveValue(
      'Premier Cricket League',
    );
    expect(screen.getByTestId('selected-value')).toHaveTextContent('competition-1');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear competition' }));
    expect(screen.getByRole('combobox', { name: 'Competition' })).toHaveValue('');
  });

  it('supports fuzzy typing, keyboard selection and dismissal', async () => {
    render(<Harness />);
    const combobox = screen.getByRole('combobox', { name: 'Competition' });

    fireEvent.change(combobox, { target: { value: 'prem' } });
    const ranked = await screen.findAllByRole('option');
    expect(ranked.map((option) => option.textContent)).toEqual([
      'Premier Cricket League',
      "Women's Premier League",
    ]);

    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    expect(combobox).toHaveAttribute('aria-activedescendant');
    fireEvent.keyDown(combobox, { key: 'Enter' });
    expect(combobox).toHaveValue('Premier Cricket League');

    act(() => combobox.focus());
    fireEvent.keyDown(combobox, { key: 'ArrowDown' });
    fireEvent.keyDown(combobox, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(combobox).toHaveFocus();
  });

  it('reports no matches and retries an option request failure', async () => {
    const loadOptions = vi
      .fn<(signal: AbortSignal) => Promise<NameComboboxOption[]>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(options);
    render(<Harness loadOptions={loadOptions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show competition options' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Competition options could not be loaded.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry competition options' }));
    await screen.findByRole('listbox');
    expect(loadOptions).toHaveBeenCalledTimes(2);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'unknown' } });
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('No matching competition options.'),
    );
  });
});
