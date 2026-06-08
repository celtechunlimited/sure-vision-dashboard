"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { recordPatientFileReplacement } from "@/lib/actions/patient-file-actions";
import { uploadToPatientStorage } from "@/lib/patient-files/upload-client";
import { ALLOWED_MIME, MAX_FILE_SIZE } from "@/lib/patient-files/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ReplaceFileDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  fileName: string;
  storagePath: string;
  patientId: string;
};

export function ReplaceFileDialog({
  open,
  onOpenChange,
  fileId,
  fileName,
  storagePath,
  patientId,
}: ReplaceFileDialogProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState<"uploading" | "saving" | null>(
    null,
  );
  const inputRef = React.useRef<HTMLInputElement>(null);

  function resetState() {
    setPending(false);
    setProgress(0);
    setStatus(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      toast.error("Choose a file to upload.");
      return;
    }
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      toast.error("File exceeds the 50 MB limit.");
      return;
    }
    if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
      toast.error("File type is not allowed.");
      return;
    }

    setPending(true);
    setProgress(0);
    setStatus("uploading");

    try {
      await uploadToPatientStorage({
        patientId,
        file,
        fileId,
        storagePath,
        upsert: true,
        onProgress: (percent) => setProgress(percent),
      });

      setProgress(100);
      setStatus("saving");

      const result = await recordPatientFileReplacement({
        fileId,
        mimeType: file.type,
        fileSize: file.size,
        originalName: file.name,
      });

      if (!result.ok) {
        toast.error(result.message);
        resetState();
        return;
      }

      toast.success("File replaced");
      onOpenChange(false);
      resetState();
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed.";
      toast.error(message);
      resetState();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetState();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Replace file</DialogTitle>
            <DialogDescription>
              Upload a new version for &ldquo;{fileName}&rdquo;. The previous
              blob will be overwritten.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="replace-file">New file</Label>
              <Input
                id="replace-file"
                ref={inputRef}
                type="file"
                accept={ALLOWED_MIME.join(",")}
                required
                disabled={pending}
              />
            </div>
            {pending ? (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {status === "saving" ? "Saving..." : "Uploading..."}
                  </span>
                  <span>{status === "saving" ? "100%" : `${progress}%`}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary transition-all",
                    )}
                    style={{
                      width: `${status === "saving" ? 100 : progress}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
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
            <Button type="submit" disabled={pending}>
              Replace
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
