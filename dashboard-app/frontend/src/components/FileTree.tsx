import type { ReactNode } from 'react';
import type { FileNode } from '../types';

/**
 * `/api/files` が返すツリーを再帰的にレンダリングするコンポーネント。
 *
 * 1 ファイル 1 コンポーネント (FL-005)。再帰は return 内の IIFE で閉じる。
 * スタイリングは Tailwind CSS ユーティリティクラスのみ。
 */

/** ISO 8601 日時文字列をローカルタイムゾーンの YYYY/MM/DD HH:mm 形式に変換する */
function formatModifiedAt(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}/${m}/${day} ${h}:${min}`;
}

type FileTreeProps = {
  nodes: FileNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
};

export function FileTree({ nodes, selectedPath, onSelect }: FileTreeProps) {
  return (
    <nav aria-label="Content tree">
      {(function render(list: FileNode[]): ReactNode {
        return (
          <ul className="list-none pl-3.5 my-1 first:pl-0">
            {list.map((node) => {
              if (node.type === 'directory') {
                return (
                  <li key={node.path}>
                    <div className="px-2 pt-2 pb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {node.name}
                    </div>
                    {render(node.children)}
                  </li>
                );
              }

              if (node.type === 'file') {
                const isSelected = node.path === selectedPath;
                const formattedDate = formatModifiedAt(node.modifiedAt);
                return (
                  <li key={node.path}>
                    <button
                      type="button"
                      className={`block w-full text-left px-2 py-1 rounded text-sm cursor-pointer border-none font-sans ${
                        isSelected
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : 'bg-transparent text-gray-800 hover:bg-gray-100'
                      }`}
                      aria-current={isSelected ? 'page' : undefined}
                      onClick={() => onSelect(node.path)}
                    >
                      {node.name}
                    </button>
                    <span
                      data-testid="file-modified-at"
                      className="block px-2 text-xs text-gray-400 leading-tight"
                    >
                      {formattedDate}
                    </span>
                  </li>
                );
              }

              const _exhaustive: never = node;
              return _exhaustive;
            })}
          </ul>
        );
      })(nodes)}
    </nav>
  );
}
