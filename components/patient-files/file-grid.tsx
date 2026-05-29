"use client";

import * as React from "react";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  FileIcon,
  FolderIcon,
  LayoutGridIcon,
  ListIcon,
} from "lucide-react";

import { FileRowActions } from "@/components/patient-files/file-row-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type {
  PatientFileExplorerItem,
  PatientFileRow,
  PatientFolderRow,
} from "@/lib/patient-files/types";
import {
  formatDateTime,
  formatFileSize,
  getChildFolders,
  getFilesInFolder,
} from "@/lib/patient-files/utils";

type SortKey = "name" | "type" | "size" | "updated";
type SortDir = "asc" | "desc";
type ViewMode = "list" | "grid";

type FileGridProps = {
  folders: PatientFolderRow[];
  files: PatientFileRow[];
  currentFolderId: string | null;
  trash?: boolean;
  onOpenFolder: (folderId: string) => void;
  onRenameFolder: (folder: PatientFolderRow) => void;
  onMoveFolder: (folder: PatientFolderRow) => void;
  onRenameFile: (file: PatientFileRow) => void;
  onMoveFile: (file: PatientFileRow) => void;
  onReplaceFile: (file: PatientFileRow) => void;
  onPreviewFile: (file: PatientFileRow) => void;
};

function sortItems(
  items: PatientFileExplorerItem[],
  sortKey: SortKey,
  sortDir: SortDir,
): PatientFileExplorerItem[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const aFolder = a.kind === "folder";
    const bFolder = b.kind === "folder";
    if (aFolder !== bFolder) return aFolder ? -1 : 1;

    if (sortKey === "name") {
      const aName = a.kind === "folder" ? a.folder.name : a.file.file_name;
      const bName = b.kind === "folder" ? b.folder.name : b.file.file_name;
      return aName.localeCompare(bName) * dir;
    }
    if (sortKey === "type") {
      const aType = a.kind === "folder" ? "folder" : a.file.mime_type;
      const bType = b.kind === "folder" ? "folder" : b.file.mime_type;
      return aType.localeCompare(bType) * dir;
    }
    if (sortKey === "size") {
      const aSize = a.kind === "folder" ? 0 : a.file.file_size;
      const bSize = b.kind === "folder" ? 0 : b.file.file_size;
      return (aSize - bSize) * dir;
    }
    const aDate =
      a.kind === "folder" ? a.folder.updated_at : a.file.updated_at;
    const bDate =
      b.kind === "folder" ? b.folder.updated_at : b.file.updated_at;
    return aDate.localeCompare(bDate) * dir;
  });
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium"
      onClick={onClick}
    >
      {label}
      {active ? (
        dir === "asc" ? (
          <ArrowUpIcon className="size-3.5" />
        ) : (
          <ArrowDownIcon className="size-3.5" />
        )
      ) : (
        <ArrowUpDownIcon className="size-3.5 opacity-50" />
      )}
    </button>
  );
}

export function FileGrid({
  folders,
  files,
  currentFolderId,
  trash = false,
  onOpenFolder,
  onRenameFolder,
  onMoveFolder,
  onRenameFile,
  onMoveFile,
  onReplaceFile,
  onPreviewFile,
}: FileGridProps) {
  const [search, setSearch] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("name");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");

  const visibleFolders = getChildFolders(folders, currentFolderId, { trash });
  const visibleFiles = getFilesInFolder(files, folders, currentFolderId, {
    trash,
  });

  const items = React.useMemo(() => {
    const combined: PatientFileExplorerItem[] = [
      ...visibleFolders.map((folder) => ({ kind: "folder" as const, folder })),
      ...visibleFiles.map((file) => ({ kind: "file" as const, file })),
    ];
    const filtered = search.trim()
      ? combined.filter((item) => {
          const name =
            item.kind === "folder" ? item.folder.name : item.file.file_name;
          return name.toLowerCase().includes(search.trim().toLowerCase());
        })
      : combined;
    return sortItems(filtered, sortKey, sortDir);
  }, [visibleFolders, visibleFiles, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search files and folders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => {
            if (value) setViewMode(value as ViewMode);
          }}
        >
          <ToggleGroupItem value="list" aria-label="List view">
            <ListIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <LayoutGridIcon className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {trash ? "Trash is empty." : "No files or folders here yet."}
        </div>
      ) : viewMode === "list" ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortButton
                    label="Name"
                    active={sortKey === "name"}
                    dir={sortDir}
                    onClick={() => toggleSort("name")}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    label="Type"
                    active={sortKey === "type"}
                    dir={sortDir}
                    onClick={() => toggleSort("type")}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    label="Size"
                    active={sortKey === "size"}
                    dir={sortDir}
                    onClick={() => toggleSort("size")}
                  />
                </TableHead>
                <TableHead>
                  <SortButton
                    label="Modified"
                    active={sortKey === "updated"}
                    dir={sortDir}
                    onClick={() => toggleSort("updated")}
                  />
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) =>
                item.kind === "folder" ? (
                  <TableRow
                    key={`folder-${item.folder.id}`}
                    className="cursor-pointer"
                    onDoubleClick={() => !trash && onOpenFolder(item.folder.id)}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <TableCell>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-left"
                        onClick={() => !trash && onOpenFolder(item.folder.id)}
                      >
                        <FolderIcon className="size-4 text-amber-500" />
                        {item.folder.name}
                      </button>
                    </TableCell>
                    <TableCell>Folder</TableCell>
                    <TableCell>—</TableCell>
                    <TableCell>{formatDateTime(item.folder.updated_at)}</TableCell>
                    <TableCell>
                      <FileRowActions
                        targetType="folder"
                        folder={item.folder}
                        trash={trash}
                        onRename={() => onRenameFolder(item.folder)}
                        onMove={() => onMoveFolder(item.folder)}
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow
                    key={`file-${item.file.id}`}
                    onDoubleClick={() => !trash && onPreviewFile(item.file)}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <TableCell>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 text-left"
                        onClick={() => !trash && onPreviewFile(item.file)}
                      >
                        <FileIcon className="size-4 text-blue-500" />
                        {item.file.file_name}
                      </button>
                    </TableCell>
                    <TableCell>{item.file.mime_type}</TableCell>
                    <TableCell>{formatFileSize(item.file.file_size)}</TableCell>
                    <TableCell>{formatDateTime(item.file.updated_at)}</TableCell>
                    <TableCell>
                      <FileRowActions
                        targetType="file"
                        file={item.file}
                        trash={trash}
                        onRename={() => onRenameFile(item.file)}
                        onMove={() => onMoveFile(item.file)}
                        onReplace={() => onReplaceFile(item.file)}
                        onPreview={() => onPreviewFile(item.file)}
                      />
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) =>
            item.kind === "folder" ? (
              <div
                key={`folder-${item.folder.id}`}
                className="group relative rounded-lg border p-4 hover:bg-muted/40"
              >
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-3 text-left"
                  onClick={() => !trash && onOpenFolder(item.folder.id)}
                >
                  <FolderIcon className="size-8 text-amber-500" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.folder.name}</p>
                    <p className="text-xs text-muted-foreground">Folder</p>
                  </div>
                </button>
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <FileRowActions
                    targetType="folder"
                    folder={item.folder}
                    trash={trash}
                    onRename={() => onRenameFolder(item.folder)}
                    onMove={() => onMoveFolder(item.folder)}
                  />
                </div>
              </div>
            ) : (
              <div
                key={`file-${item.file.id}`}
                className="group relative rounded-lg border p-4 hover:bg-muted/40"
              >
                <button
                  type="button"
                  className="flex w-full flex-col items-start gap-3 text-left"
                  onClick={() => !trash && onPreviewFile(item.file)}
                >
                  <FileIcon className="size-8 text-blue-500" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(item.file.file_size)}
                    </p>
                  </div>
                </button>
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <FileRowActions
                    targetType="file"
                    file={item.file}
                    trash={trash}
                    onRename={() => onRenameFile(item.file)}
                    onMove={() => onMoveFile(item.file)}
                    onReplace={() => onReplaceFile(item.file)}
                    onPreview={() => onPreviewFile(item.file)}
                  />
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
