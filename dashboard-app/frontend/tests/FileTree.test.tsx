import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileTree } from '../src/components/FileTree';
import type { FileNode } from '../src/types';

const sampleTree: FileNode[] = [
  {
    type: 'directory',
    name: 'commands',
    path: 'commands',
    children: [{ type: 'file', name: 'help.md', path: 'commands/help.md' }],
  },
  { type: 'file', name: 'welcome.md', path: 'welcome.md' },
];

describe('FileTree', () => {
  it('renders directory labels and file buttons', () => {
    render(<FileTree nodes={sampleTree} selectedPath="" onSelect={() => {}} />);

    expect(screen.getByText('commands')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'help.md' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'welcome.md' })).toBeInTheDocument();
  });

  it('highlights the selected file with aria-current="page"', () => {
    render(<FileTree nodes={sampleTree} selectedPath="welcome.md" onSelect={() => {}} />);

    const selected = screen.getByRole('button', { name: 'welcome.md' });
    expect(selected).toHaveAttribute('aria-current', 'page');

    const notSelected = screen.getByRole('button', { name: 'help.md' });
    expect(notSelected).not.toHaveAttribute('aria-current');
  });

  it('calls onSelect with the file path when a file button is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<FileTree nodes={sampleTree} selectedPath="" onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'help.md' }));
    expect(onSelect).toHaveBeenCalledWith('commands/help.md');
  });

  it('renders an accessible navigation landmark', () => {
    render(<FileTree nodes={sampleTree} selectedPath="" onSelect={() => {}} />);
    expect(screen.getByRole('navigation', { name: 'Content tree' })).toBeInTheDocument();
  });
});
