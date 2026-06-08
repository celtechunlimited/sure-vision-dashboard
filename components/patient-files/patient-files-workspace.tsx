"use client";

import * as React from "react";
import {
  FolderPlusIcon,
  HistoryIcon,
  Trash2Icon,
} from "lucide-react";

import { ActivityDrawer } from "@/components/patient-files/activity-drawer";
import { PatientFolderBreadcrumbs } from "@/components/patient-files/breadcrumbs";
import { FileGrid } from "@/components/patient-files/file-grid";
import { FilePreviewDialog } from "@/components/patient-files/file-preview-dialog";
import { FolderTree } from "@/components/patient-files/folder-tree";
import { MoveDialog } from "@/components/patient-files/move-dialog";
import { NewFolderDialog } from "@/components/patient-files/new-folder-dialog";
import { RenameDialog } from "@/components/patient-files/rename-dialog";
import { ReplaceFileDialog } from "@/components/patient-files/replace-file-dialog";
import { UploadDropzone } from "@/components/patient-files/upload-dropzone";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type {
  PatientFileActivityRow,
  PatientFileRow,
  PatientFolderRow,
} from "@/lib/patient-files/types";

type PatientFilesWorkspaceProps = {
  patientId: string;
  folders: PatientFolderRow[];
  files: PatientFileRow[];
  activities: PatientFileActivityRow[];
  performerNames: Record<string, string>;
};

type RenameTarget =
  | { type: "folder"; id: string; name: string }
  | { type: "file"; id: string; name: string };

type MoveTarget =
  | { type: "folder"; id: string }
  | { type: "file"; id: string };

export function PatientFilesWorkspace({
  patientId,
  folders,
  files,
  activities,
  performerNames,
}: PatientFilesWorkspaceProps) {
  const [currentFolderId, setCurrentFolderId] = React.useState<string | null>(
    null,
  );
  const [showTrash, setShowTrash] = React.useState(false);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [activityOpen, setActivityOpen] = React.useState(false);
  const [renameTarget, setRenameTarget] = React.useState<RenameTarget | null>(
    null,
  );
  const [moveTarget, setMoveTarget] = React.useState<MoveTarget | null>(null);
  const [replaceFile, setReplaceFile] = React.useState<PatientFileRow | null>(
    null,
  );
  const [previewFile, setPreviewFile] = React.useState<PatientFileRow | null>(
    null,
  );

  const aliveFolders = folders.filter((f) => !f.deleted_at);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <PatientFolderBreadcrumbs
          folders={folders}
          currentFolderId={showTrash ? null : currentFolderId}
          onNavigate={(folderId) => {
            setShowTrash(false);
            setCurrentFolderId(folderId);
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          {!showTrash ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setNewFolderOpen(true)}
            >
              <FolderPlusIcon className="size-4" />
              New folder
            </Button>
          ) : null}
          <Button
            type="button"
            variant={showTrash ? "default" : "outline"}
            size="sm"
            onClick={() => setShowTrash((v) => !v)}
          >
            <Trash2Icon className="size-4" />
            {showTrash ? "Back to files" : "Trash"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActivityOpen(true)}
          >
            <HistoryIcon className="size-4" />
            Activity
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="rounded-lg border p-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Folders
          </p>
          <FolderTree
            folders={folders}
            currentFolderId={currentFolderId}
            onSelect={(folderId) => {
              setShowTrash(false);
              setCurrentFolderId(folderId);
            }}
            trash={showTrash}
          />
        </aside>

        <div className="min-w-0 space-y-4">
          {!showTrash ? (
            <UploadDropzone patientId={patientId} folderId={currentFolderId} />
          ) : null}
          <Separator />
          <FileGrid
            folders={folders}
            files={files}
            currentFolderId={currentFolderId}
            trash={showTrash}
            onOpenFolder={setCurrentFolderId}
            onRenameFolder={(folder) =>
              setRenameTarget({
                type: "folder",
                id: folder.id,
                name: folder.name,
              })
            }
            onMoveFolder={(folder) =>
              setMoveTarget({ type: "folder", id: folder.id })
            }
            onRenameFile={(file) =>
              setRenameTarget({
                type: "file",
                id: file.id,
                name: file.file_name,
              })
            }
            onMoveFile={(file) => setMoveTarget({ type: "file", id: file.id })}
            onReplaceFile={setReplaceFile}
            onPreviewFile={setPreviewFile}
          />
        </div>
      </div>

      <NewFolderDialog
        open={newFolderOpen}
        onOpenChange={setNewFolderOpen}
        patientId={patientId}
        parentFolderId={currentFolderId}
      />

      {renameTarget ? (
        <RenameDialog
          open
          onOpenChange={(open) => {
            if (!open) setRenameTarget(null);
          }}
          targetType={renameTarget.type}
          targetId={renameTarget.id}
          currentName={renameTarget.name}
        />
      ) : null}

      {moveTarget ? (
        <MoveDialog
          open
          onOpenChange={(open) => {
            if (!open) setMoveTarget(null);
          }}
          targetType={moveTarget.type}
          targetId={moveTarget.id}
          folders={aliveFolders}
        />
      ) : null}

      {replaceFile ? (
        <ReplaceFileDialog
          open
          onOpenChange={(open) => {
            if (!open) setReplaceFile(null);
          }}
          fileId={replaceFile.id}
          fileName={replaceFile.file_name}
          storagePath={replaceFile.storage_path}
          patientId={patientId}
        />
      ) : null}

      <FilePreviewDialog
        open={previewFile != null}
        onOpenChange={(open) => {
          if (!open) setPreviewFile(null);
        }}
        file={previewFile}
      />

      <ActivityDrawer
        open={activityOpen}
        onOpenChange={setActivityOpen}
        activities={activities}
        performerNames={performerNames}
      />
    </div>
  );
}
