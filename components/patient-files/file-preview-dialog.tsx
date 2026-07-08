"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileMediaViewer } from "@/components/patient-files/file-media-viewer";
import type { PatientFileRow } from "@/lib/patient-files/types";

type FilePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: PatientFileRow | null;
};

export function FilePreviewDialog({
  open,
  onOpenChange,
  file,
}: FilePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>{file?.file_name ?? "Preview"}</DialogTitle>
        </DialogHeader>
        {file ? <FileMediaViewer file={file} showOpenFullView /> : null}
      </DialogContent>
    </Dialog>
  );
}
