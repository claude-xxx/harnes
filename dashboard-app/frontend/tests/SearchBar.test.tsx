import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../src/components/SearchBar';

// Mock the api module
vi.mock('../src/api', () => ({
  searchContent: vi.fn(),
}));

import { searchContent } from '../src/api';
const mockSearchContent = vi.mocked(searchContent);

describe('SearchBar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders a search input with accessible label', () => {
    render(<SearchBar onSelect={() => {}} onQueryChange={() => {}} />);
    expect(screen.getByRole('searchbox', { name: 'Search content' })).toBeInTheDocument();
  });

  it('calls onQueryChange when input value changes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onQueryChange = vi.fn();
    render(<SearchBar onSelect={() => {}} onQueryChange={onQueryChange} />);

    await user.type(screen.getByRole('searchbox'), 'help');
    expect(onQueryChange).toHaveBeenLastCalledWith('help');
  });

  it('shows search results after debounce and calls onSelect on click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onSelect = vi.fn();

    mockSearchContent.mockResolvedValueOnce({
      query: 'help',
      hits: [
        {
          path: 'commands/help.md',
          title: '/help — ヘルプを表示する',
          matches: ['Claude Code の /help は…'],
        },
      ],
    });

    render(<SearchBar onSelect={onSelect} onQueryChange={() => {}} />);

    await user.type(screen.getByRole('searchbox'), 'help');
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('/help — ヘルプを表示する')).toBeInTheDocument();
    });

    await user.click(screen.getByText('/help — ヘルプを表示する'));
    expect(onSelect).toHaveBeenCalledWith('commands/help.md');
  });

  it('shows "No results" when search returns empty hits', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });

    mockSearchContent.mockResolvedValueOnce({
      query: 'xyz',
      hits: [],
    });

    render(<SearchBar onSelect={() => {}} onQueryChange={() => {}} />);

    await user.type(screen.getByRole('searchbox'), 'xyz');
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(screen.getByText('No results')).toBeInTheDocument();
    });
  });
});
