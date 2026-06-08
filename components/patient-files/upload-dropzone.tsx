"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { recordPatientFileUpload } from "@/lib/actions/patient-file-actions";
import { uploadToPatientStorage } from "@/lib/patient-files/upload-client";
import { ALLOWED_MIME, MAX_FILE_SIZE } from "@/lib/patient-files/types";
import { cn } from "@/lib/utils";

type UploadDropzoneProps = {
  patientId: string;
  folderId: string | null;
  className?: string;
};

type UploadItemStatus = "uploading" | "saving" | "done" | "error";

type UploadItem = {
  id: string;
  name: string;
  percent: number;
  status: UploadItemStatus;
  error?: string;
};

export function UploadDropzone({
  patientId,
  folderId,
  className,
}: UploadDropzoneProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [uploadItems, setUploadItems] = React.useState<UploadItem[]>([]);

  const pending = uploadItems.some(
    (item) => item.status === "uploading" || item.status === "saving",
  );

  function validateFile(file: File): string | null {
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return `${file.name}: exceeds 50 MB limit.`;
    }
    if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
      return `${file.name}: file type not allowed.`;
    }
    return null;
  }

  function updateUploadItem(id: string, patch: Partial<UploadItem>) {
    setUploadItems((items) =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;

    for (const file of list) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
    }

    const items: UploadItem[] = list.map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      percent: 0,
      status: "uploading",
    }));
    setUploadItems(items);

    let successCount = 0;

    for (let index = 0; index < list.length; index += 1) {
      const file = list[index];
      const item = items[index];

      try {
        const { storagePath, fileId } = await uploadToPatientStorage({
          patientId,
          file,
          onProgress: (percent) => {
            updateUploadItem(item.id, { percent, status: "uploading" });
          },
        });

        updateUploadItem(item.id, { percent: 100, status: "saving" });

        const result = await recordPatientFileUpload({
          patientId,
          folderId,
          fileId,
          storagePath,
          originalName: file.name,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        });

        if (!result.ok) {
          updateUploadItem(item.id, {
            status: "error",
            error: result.message,
          });
          toast.error(`${file.name}: ${result.message}`);
          continue;
        }

        updateUploadItem(item.id, { percent: 100, status: "done" });
        successCount += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Upload failed.";
        updateUploadItem(item.id, { status: "error", error: message });
        toast.error(`${file.name}: ${message}`);
      }
    }

    if (successCount > 0) {
      toast.success(
        successCount === 1
          ? "File uploaded"
          : `${successCount} files uploaded`,
      );
      router.refresh();
    }

    window.setTimeout(() => {
      setUploadItems((current) =>
        current.filter((item) => item.status !== "done"),
      );
    }, 2000);
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative rounded-lg border border-dashed p-4 transition-colors",
          dragOver && "border-primary bg-primary/5",
          pending && "opacity-70",
          className,
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          uploadFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept={ALLOWED_MIME.join(",")}
          onChange={(e) => {
            if (e.target.files) uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <UploadIcon className="size-8 text-muted-foreground" />
          <div className="text-sm">
            <button
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
            >
              Click to upload
            </button>{" "}
            or drag and drop
          </div>
          <p className="text-xs text-muted-foreground">
            PDF, images, video, Word, DICOM up to 50 MB
          </p>
        </div>
      </div>

      {uploadItems.length > 0 ? (
        <ul className="space-y-2">
          {uploadItems.map((item) => (
            <li
              key={item.id}
              className="rounded-md border bg-muted/30 px-3 py-2 text-sm"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate font-medium">{item.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {item.status === "uploading"
                    ? `${item.percent}%`
                    : item.status === "saving"
                      ? "Saving..."
                      : item.status === "done"
                        ? "Done"
                        : "Failed"}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    item.status === "error"
                      ? "bg-destructive"
                      : "bg-primary",
                  )}
                  style={{
                    width: `${item.status === "saving" ? 100 : item.percent}%`,
                  }}
                />
              </div>
              {item.error ? (
                <p className="mt-1 text-xs text-destructive">{item.error}</p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
