"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  movePatientFile,
  movePatientFolder,
} from "@/lib/actions/patient-file-actions";
import { FolderTree } from "@/components/patient-files/folder-tree";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PatientFolderRow } from "@/lib/patient-files/types";

type MoveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetType: "folder" | "file";
  targetId: string;
  folders: PatientFolderRow[];
};

export function MoveDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
  folders,
}: MoveDialogProps) {
  const router = useRouter();
  const [selectedFolderId, setSelectedFolderId] = React.useState<string | null>(
    null,
  );
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (open) setSelectedFolderId(null);
  }, [open]);

  function handleMove() {
    startTransition(async () => {
      const result =
        targetType === "folder"
          ? await movePatientFolder({
              folderId: targetId,
              newParentFolderId: selectedFolderId,
            })
          : await movePatientFile({
              fileId: targetId,
              newFolderId: selectedFolderId,
            });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Moved");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move {targetType}</DialogTitle>
          <DialogDescription>Select a destination folder.</DialogDescription>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto rounded-md border p-2">
          <FolderTree
            folders={folders}
            currentFolderId={null}
            selectedFolderId={selectedFolderId}
            onSelect={setSelectedFolderId}
            mode="select"
            excludeFolderId={targetType === "folder" ? targetId : null}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleMove} disabled={pending}>
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
