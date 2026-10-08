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
  loadOptions?: (query: string, signal: AbortSignal) => Promise<NameComboboxOption[]>;
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

const manyOptions: NameComboboxOption[] = Array.from({ length: 30 }, (_, index) => ({
  label: `Competition ${String(index + 1).padStart(2, '0')}`,
  value: `competition-${index + 1}`,
}));

/**
 * Presses the primary mouse button on `target` the way a browser does.
 *
 * jsdom dispatches `mousedown` but never performs its default action, so a test
 * cannot otherwise see focus leave the input. In a browser, pressing on an
 * element that is not focusable — such as the scrollbar or padding of the
 * option list — moves focus to the nearest focusable ancestor, or to the body
 * when there is none, unless the `mousedown` default is prevented.
 */
function pressPrimaryButtonOn(target: Element) {
  const defaultAllowed = fireEvent.mouseDown(target, { button: 0 });
  if (!defaultAllowed) return;

  const focusable = target.closest<HTMLElement>(
    'input, button, select, textarea, a[href], [tabindex]',
  );
  act(() => {
    if (focusable) {
      focusable.focus();
    } else {
      (document.activeElement as HTMLElement | null)?.blur();
    }
  });
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
      (_query: string) =>
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
    const loadOptions = vi.fn().mockResolvedValue(options);
    render(<Harness loadOptions={loadOptions} />);
    const combobox = screen.getByRole('combobox', { name: 'Competition' });

    fireEvent.change(combobox, { target: { value: 'prem' } });
    const ranked = await screen.findAllByRole('option');
    expect(ranked.map((option) => option.textContent)).toEqual([
      'Premier Cricket League',
      "Women's Premier League",
    ]);
    expect(loadOptions).toHaveBeenCalledWith('prem', expect.any(AbortSignal));

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
    let resolveSearch!: (value: NameComboboxOption[]) => void;
    const loadOptions = vi
      .fn<(query: string, signal: AbortSignal) => Promise<NameComboboxOption[]>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(options)
      .mockImplementationOnce(
        () =>
          new Promise<NameComboboxOption[]>((resolve) => {
            resolveSearch = resolve;
          }),
      );
    render(<Harness loadOptions={loadOptions} />);

    fireEvent.click(screen.getByRole('button', { name: 'Show competition options' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Competition options could not be loaded.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry competition options' }));
    await screen.findByRole('listbox');
    expect(loadOptions).toHaveBeenCalledTimes(2);

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'unknown' } });
    expect(screen.getByRole('status')).toHaveTextContent(
      /Matching competition options are loading/,
    );
    await act(async () => resolveSearch([]));
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('No such competition was found.'),
    );
  });

  describe('scrolling the open option list (#907)', () => {
    async function openLongList() {
      render(<Harness loadOptions={vi.fn().mockResolvedValue(manyOptions)} />);
      const combobox = screen.getByRole('combobox', { name: 'Competition' });
      act(() => combobox.focus());
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      const listbox = await screen.findByRole('listbox', { name: 'Competition options' });
      return { combobox, listbox };
    }

    it('stays open and keeps focus when the list scrollbar is dragged', async () => {
      const { combobox, listbox } = await openLongList();

      // A press on the scrollbar targets the list element itself, not an option.
      pressPrimaryButtonOn(listbox);
      fireEvent.scroll(listbox, { target: { scrollTop: 240 } });
      fireEvent.mouseUp(listbox, { button: 0 });

      expect(screen.getByRole('listbox', { name: 'Competition options' })).toBe(listbox);
      expect(combobox).toHaveFocus();
      expect(combobox).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByTestId('selected-value')).toBeEmptyDOMElement();
      expect(combobox).toHaveValue('');
    });

    it('stays open when the popover surface around the list is pressed', async () => {
      const { combobox, listbox } = await openLongList();
      const popover = listbox.parentElement;
      expect(popover).not.toBeNull();

      pressPrimaryButtonOn(popover!);

      expect(screen.getByRole('listbox', { name: 'Competition options' })).toBeInTheDocument();
      expect(combobox).toHaveFocus();
    });

    it('stays open and changes nothing when scrolled with a wheel or trackpad', async () => {
      const { combobox, listbox } = await openLongList();
      const option = within(listbox).getByRole('option', { name: 'Competition 12' });

      fireEvent.wheel(option, { deltaY: 120 });
      fireEvent.scroll(listbox, { target: { scrollTop: 120 } });

      expect(screen.getByRole('listbox', { name: 'Competition options' })).toBe(listbox);
      expect(combobox).toHaveFocus();
      expect(screen.getByTestId('selected-value')).toBeEmptyDOMElement();
    });

    it('still selects an option after the list has been scrolled', async () => {
      const { combobox, listbox } = await openLongList();

      pressPrimaryButtonOn(listbox);
      fireEvent.scroll(listbox, { target: { scrollTop: 600 } });
      const option = within(listbox).getByRole('option', { name: 'Competition 25' });
      pressPrimaryButtonOn(option);
      fireEvent.click(option);

      expect(combobox).toHaveValue('Competition 25');
      expect(screen.getByTestId('selected-value')).toHaveTextContent('competition-25');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('closes when focus genuinely moves to another control', async () => {
      render(
        <>
          <Harness loadOptions={vi.fn().mockResolvedValue(manyOptions)} />
          <button type="button">Elsewhere</button>
        </>,
      );
      const combobox = screen.getByRole('combobox', { name: 'Competition' });
      act(() => combobox.focus());
      fireEvent.keyDown(combobox, { key: 'ArrowDown' });
      await screen.findByRole('listbox');

      pressPrimaryButtonOn(screen.getByRole('button', { name: 'Elsewhere' }));

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('scrolls the keyboard-active option into view', async () => {
      const scrollIntoView = vi.fn();
      const original = Element.prototype.scrollIntoView;
      Element.prototype.scrollIntoView = scrollIntoView;
      try {
        const { combobox } = await openLongList();

        fireEvent.keyDown(combobox, { key: 'End' });

        const active = screen.getByRole('option', { name: 'Competition 30' });
        expect(combobox).toHaveAttribute('aria-activedescendant', active.id);
        expect(scrollIntoView.mock.contexts).toContain(active);
        expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' });
      } finally {
        Element.prototype.scrollIntoView = original;
      }
    });
  });

  it('keeps the input and disclosure controls unavailable when disabled', () => {
    render(
      <NameCombobox
        dependencyKey="locked"
        disabled
        entityName="competition"
        inputValue="Premier Cricket League"
        label="Competition"
        loadOptions={vi.fn().mockResolvedValue(options)}
        onInputChange={() => undefined}
        onSelectionChange={() => undefined}
        onSelectionResolved={() => undefined}
        selectedValue="competition-1"
      />,
    );

    expect(screen.getByRole('combobox', { name: 'Competition' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Show competition options' })).toBeDisabled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
