"use client";

import * as React from "react";
import { ChevronDownIcon, ChevronRightIcon, FolderIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PatientFolderRow } from "@/lib/patient-files/types";
import { getChildFolders } from "@/lib/patient-files/utils";

type FolderTreeProps = {
  folders: PatientFolderRow[];
  currentFolderId: string | null;
  selectedFolderId?: string | null;
  onSelect: (folderId: string | null) => void;
  mode?: "navigate" | "select";
  excludeFolderId?: string | null;
  trash?: boolean;
};

function FolderTreeNode({
  folder,
  folders,
  currentFolderId,
  selectedFolderId,
  onSelect,
  mode,
  excludeFolderId,
  trash,
  depth,
}: {
  folder: PatientFolderRow;
  folders: PatientFolderRow[];
  currentFolderId: string | null;
  selectedFolderId?: string | null;
  onSelect: (folderId: string | null) => void;
  mode: "navigate" | "select";
  excludeFolderId?: string | null;
  trash?: boolean;
  depth: number;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const children = getChildFolders(folders, folder.id, { trash }).filter(
    (child) => child.id !== excludeFolderId,
  );
  const hasChildren = children.length > 0;
  const isActive =
    mode === "select"
      ? selectedFolderId === folder.id
      : currentFolderId === folder.id;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-0.5 rounded-md pr-1",
          isActive && "bg-muted",
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
          </Button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1.5 text-left text-sm hover:bg-muted/80"
          onClick={() => onSelect(folder.id)}
        >
          <FolderIcon className="size-4 shrink-0 text-amber-500" />
          <span className="truncate">{folder.name}</span>
        </button>
      </div>
      {hasChildren && expanded
        ? children.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              folders={folders}
              currentFolderId={currentFolderId}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              mode={mode}
              excludeFolderId={excludeFolderId}
              trash={trash}
              depth={depth + 1}
            />
          ))
        : null}
    </div>
  );
}

export function FolderTree({
  folders,
  currentFolderId,
  selectedFolderId,
  onSelect,
  mode = "navigate",
  excludeFolderId,
  trash = false,
}: FolderTreeProps) {
  const roots = getChildFolders(folders, null, { trash }).filter(
    (folder) => folder.id !== excludeFolderId,
  );

  return (
    <div className="space-y-1">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted",
          (mode === "select" ? selectedFolderId === null : currentFolderId === null) &&
            "bg-muted",
        )}
        onClick={() => onSelect(null)}
      >
        <FolderIcon className="size-4 text-muted-foreground" />
        {trash ? "Archive root" : "All files"}
      </button>
      {roots.map((folder) => (
        <FolderTreeNode
          key={folder.id}
          folder={folder}
          folders={folders}
          currentFolderId={currentFolderId}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
          mode={mode}
          excludeFolderId={excludeFolderId}
          trash={trash}
          depth={0}
        />
      ))}
    </div>
  );
}
