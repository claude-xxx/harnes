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
    children: [
      {
        type: 'file',
        name: 'help.md',
        path: 'commands/help.md',
        modifiedAt: '2026-04-10T14:30:00.000Z',
      },
    ],
  },
  {
    type: 'file',
    name: 'welcome.md',
    path: 'welcome.md',
    modifiedAt: '2026-04-09T08:00:00.000Z',
  },
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

  // AC-1: welcome.md の近傍に日時テキストが存在する
  it('displays a date string (YYYY/MM/DD) near file nodes', () => {
    render(<FileTree nodes={sampleTree} selectedPath="" onSelect={() => {}} />);
    // welcome.md の modifiedAt: 2026-04-09T08:00:00.000Z → ローカル表示で 2026/04/09 を含む
    expect(screen.getByText(/2026\/04\/09/)).toBeInTheDocument();
    // AC-2: commands/help.md の modifiedAt: 2026-04-10T14:30:00.000Z → 2026/04/10 を含む
    expect(screen.getByText(/2026\/04\/10/)).toBeInTheDocument();
  });

  // AC-4: ディレクトリ名の近傍には日時テキストが存在しない
  it('does NOT display a date string near directory names', () => {
    render(
      <FileTree nodes={sampleTree} selectedPath="" onSelect={() => {}} />,
    );
    // ディレクトリ「commands」を表示している要素の親要素内に日時テキストが無い
    const dirLabel = screen.getByText('commands');
    // dirLabel の直接の親 (div) には日時テキストが含まれない
    const dirContainer = dirLabel.closest('div')!;
    expect(dirContainer.textContent).not.toMatch(/\d{4}\/\d{2}\/\d{2}/);
  });

  // AC-5: 日時テキストのフォントサイズがファイル名より小さい
  it('renders date text with a smaller font size class than the file name', () => {
    const { container } = render(
      <FileTree nodes={sampleTree} selectedPath="" onSelect={() => {}} />,
    );
    // ファイルボタンは text-sm、日時は text-xs であることを確認
    const dateElements = container.querySelectorAll('[data-testid="file-modified-at"]');
    expect(dateElements.length).toBeGreaterThan(0);
    for (const el of dateElements) {
      expect(el.className).toContain('text-xs');
    }
    // ファイルボタンは text-sm を使用
    const fileButton = screen.getByRole('button', { name: 'welcome.md' });
    expect(fileButton.className).toContain('text-sm');
  });

  // AC-7: ファイル選択後もサイドバーの日時表示が正しく表示される
  it('still displays timestamps after a file is selected', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<FileTree nodes={sampleTree} selectedPath="" onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'help.md' }));

    // 日時テキストは依然として表示される
    expect(screen.getByText(/2026\/04\/09/)).toBeInTheDocument();
    expect(screen.getByText(/2026\/04\/10/)).toBeInTheDocument();
  });
});
