"use client";

import * as React from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { getPatientFileSignedUrl } from "@/lib/actions/patient-file-actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PatientFileRow } from "@/lib/patient-files/types";
import { isPreviewableMime } from "@/lib/patient-files/utils";

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
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !file) {
      setSignedUrl(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getPatientFileSignedUrl({
      fileId: file.id,
      disposition: "inline",
    }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok || !result.signedUrl) {
        toast.error(
          !result.ok ? result.message : "Could not load preview.",
        );
        return;
      }
      setSignedUrl(result.signedUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [open, file]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle>{file?.file_name ?? "Preview"}</DialogTitle>
        </DialogHeader>
        <div className="min-h-[420px] flex-1 overflow-auto rounded-md border bg-muted/20">
          {loading ? (
            <div className="flex h-[420px] items-center justify-center">
              <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : signedUrl && file && isPreviewableMime(file.mime_type) ? (
            file.mime_type === "application/pdf" ? (
              <iframe
                src={signedUrl}
                title={file.file_name}
                className="h-[70vh] w-full"
              />
            ) : file.mime_type.startsWith("video/") ? (
              <video
                src={signedUrl}
                controls
                className="mx-auto max-h-[70vh] w-full"
              >
                <track kind="captions" />
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={signedUrl}
                alt={file.file_name}
                className="mx-auto max-h-[70vh] object-contain"
              />
            )
          ) : (
            <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
              Preview not available for this file type.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
