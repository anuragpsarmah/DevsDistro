import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
} from "lucide-react";
import type { TreeNode } from "@/utils/types";

interface FileTreeNodeProps {
  node: TreeNode;
  depth: number;
}

function FileTreeNode({ node, depth }: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const paddingLeft = depth * 20;

  if (node.type === "file") {
    return (
      <div
        className="flex items-center gap-2 py-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        style={{ paddingLeft: `${paddingLeft + 6}px` }}
      >
        <FileText className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
        <span className="font-mono text-sm text-black dark:text-white truncate">
          {node.name}
        </span>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-2 py-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
        style={{ paddingLeft: `${paddingLeft + 6}px` }}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0 text-red-500" />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400" />
        )}
        {isOpen ? (
          <FolderOpen className="w-4 h-4 flex-shrink-0 text-red-500" />
        ) : (
          <Folder className="w-4 h-4 flex-shrink-0 text-black dark:text-white" />
        )}
        <span className="font-mono text-sm font-bold text-black dark:text-white truncate">
          {node.name}
        </span>
      </button>

      {isOpen && node.children && node.children.length > 0 && (
        <div
          className="border-l-2 border-black/20 dark:border-white/20"
          style={{ marginLeft: `${paddingLeft + 14}px` }}
        >
          {node.children.map((child, idx) => (
            <FileTreeNode key={`${child.name}-${idx}`} node={child} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}

interface FileTreeProps {
  node: TreeNode;
}

export default function FileTree({ node }: FileTreeProps) {
  const children = node.children ?? [];

  if (children.length === 0) {
    return (
      <p className="font-space text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        No files found in repository.
      </p>
    );
  }

  return (
    <div className="overflow-auto max-h-96">
      <div className="py-2">
        {children.map((child, idx) => (
          <FileTreeNode key={`${child.name}-${idx}`} node={child} depth={0} />
        ))}
      </div>
    </div>
  );
}
