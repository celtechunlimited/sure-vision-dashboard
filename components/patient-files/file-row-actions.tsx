"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  DownloadIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  FolderInputIcon,
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react";
import { toast } from "sonner";

import {
  getPatientFileSignedUrl,
  permanentlyDeletePatientFile,
  permanentlyDeletePatientFolder,
  restorePatientFile,
  restorePatientFolder,
  softDeletePatientFile,
  softDeletePatientFolder,
} from "@/lib/actions/patient-file-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  PatientFileRow,
  PatientFolderRow,
} from "@/lib/patient-files/types";

type FileRowActionsProps = {
  targetType: "folder" | "file";
  folder?: PatientFolderRow;
  file?: PatientFileRow;
  archive?: boolean;
  isSuperAdmin?: boolean;
  onRename: () => void;
  onMove: () => void;
  onReplace?: () => void;
  onPreview?: () => void;
};

export function FileRowActions({
  targetType,
  folder,
  file,
  archive = false,
  isSuperAdmin = false,
  onRename,
  onMove,
  onReplace,
  onPreview,
}: FileRowActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function handleArchive() {
    startTransition(async () => {
      const result =
        targetType === "folder" && folder
          ? await softDeletePatientFolder({ folderId: folder.id })
          : file
            ? await softDeletePatientFile({ fileId: file.id })
            : { ok: false as const, message: "Invalid target." };
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Moved to archive");
      router.refresh();
    });
  }

  function handleRestore() {
    startTransition(async () => {
      const result =
        targetType === "folder" && folder
          ? await restorePatientFolder({ folderId: folder.id })
          : file
            ? await restorePatientFile({ fileId: file.id })
            : { ok: false as const, message: "Invalid target." };
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Restored");
      router.refresh();
    });
  }

  function handlePermanentDelete() {
    startTransition(async () => {
      const result =
        targetType === "folder" && folder
          ? await permanentlyDeletePatientFolder({ folderId: folder.id })
          : file
            ? await permanentlyDeletePatientFile({ fileId: file.id })
            : { ok: false as const, message: "Invalid target." };
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Permanently deleted");
      router.refresh();
    });
  }

  function handleDownload() {
    if (!file) return;
    startTransition(async () => {
      const result = await getPatientFileSignedUrl({
        fileId: file.id,
        disposition: "attachment",
      });
      if (!result.ok || !result.signedUrl) {
        toast.error(!result.ok ? result.message : "Download failed.");
        return;
      }
      window.open(result.signedUrl, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" disabled={pending}>
          <EllipsisVerticalIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {archive ? (
          <>
            <DropdownMenuItem onClick={handleRestore}>
              <Undo2Icon className="size-4" />
              Restore
            </DropdownMenuItem>
            {isSuperAdmin ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={handlePermanentDelete}>
                  <Trash2Icon className="size-4" />
                  Delete permanently
                </DropdownMenuItem>
              </>
            ) : null}
          </>
        ) : (
          <>
            {targetType === "file" && onPreview ? (
              <DropdownMenuItem onClick={onPreview}>
                <EyeIcon className="size-4" />
                View
              </DropdownMenuItem>
            ) : null}
            {targetType === "file" ? (
              <DropdownMenuItem onClick={handleDownload}>
                <DownloadIcon className="size-4" />
                Download
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={onRename}>
              <PencilIcon className="size-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMove}>
              <FolderInputIcon className="size-4" />
              Move
            </DropdownMenuItem>
            {targetType === "file" && onReplace ? (
              <DropdownMenuItem onClick={onReplace}>
                <RefreshCwIcon className="size-4" />
                Replace
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleArchive}>
              <ArchiveIcon className="size-4" />
              Archive
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
