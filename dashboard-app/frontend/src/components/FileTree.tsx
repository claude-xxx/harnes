import type { ReactNode } from 'react';
import type { FileNode } from '../types';

/**
 * `/api/files` が返すツリーを再帰的にレンダリングするコンポーネント。
 *
 * - ディレクトリは常に展開（3-B では折りたたみを入れない、非スコープ）
 * - ファイルクリックで `onSelect(path)` を呼ぶ
 * - 選択中のファイルは `.selected` クラスでハイライト
 * - アイコンフォントや絵文字は使わない（依存を増やさない）
 *
 * 方針: 1 ファイル 1 コンポーネント。再帰は return 内の IIFE
 * (名前付き関数式 `render`) で閉じる。サブコンポーネントにも外部ヘルパーにも
 * 切り出さない。コード量がこの程度なら十分読める。
 */

type FileTreeProps = {
  nodes: FileNode[];
  selectedPath: string;
  onSelect: (path: string) => void;
};

export function FileTree({ nodes, selectedPath, onSelect }: FileTreeProps) {
  return (
    <nav className="file-tree" aria-label="Content tree">
      {(function render(list: FileNode[]): ReactNode {
        return (
          <ul>
            {list.map((node) => {
              if (node.type === 'directory') {
                return (
                  <li key={node.path} className="node-directory">
                    <div className="node-label">{node.name}</div>
                    {render(node.children)}
                  </li>
                );
              }

              if (node.type === 'file') {
                const isSelected = node.path === selectedPath;
                return (
                  <li key={node.path} className="node-file">
                    <button
                      type="button"
                      className={`node-label ${isSelected ? 'selected' : ''}`}
                      aria-current={isSelected ? 'page' : undefined}
                      onClick={() => onSelect(node.path)}
                    >
                      {node.name}
                    </button>
                  </li>
                );
              }

              // Exhaustive check: BE の FileNode に新しい `type` が増えたら
              // ここでコンパイルエラーになる。黙って fallthrough しない。
              const _exhaustive: never = node;
              return _exhaustive;
            })}
          </ul>
        );
      })(nodes)}
    </nav>
  );
}
