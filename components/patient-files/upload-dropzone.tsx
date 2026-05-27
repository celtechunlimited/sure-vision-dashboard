"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UploadIcon } from "lucide-react";
import { toast } from "sonner";

import { uploadPatientFile } from "@/lib/actions/patient-file-actions";
import { ALLOWED_MIME, MAX_FILE_SIZE } from "@/lib/patient-files/types";
import { cn } from "@/lib/utils";

type UploadDropzoneProps = {
  patientId: string;
  folderId: string | null;
  className?: string;
};

export function UploadDropzone({
  patientId,
  folderId,
  className,
}: UploadDropzoneProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function validateFile(file: File): string | null {
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
      return `${file.name}: exceeds 50 MB limit.`;
    }
    if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) {
      return `${file.name}: file type not allowed.`;
    }
    return null;
  }

  function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;

    for (const file of list) {
      const error = validateFile(file);
      if (error) {
        toast.error(error);
        return;
      }
    }

    startTransition(async () => {
      let successCount = 0;
      for (const file of list) {
        const formData = new FormData();
        formData.set("patientId", patientId);
        if (folderId) formData.set("folderId", folderId);
        formData.set("file", file);
        const result = await uploadPatientFile(formData);
        if (!result.ok) {
          toast.error(`${file.name}: ${result.message}`);
          continue;
        }
        successCount += 1;
      }
      if (successCount > 0) {
        toast.success(
          successCount === 1
            ? "File uploaded"
            : `${successCount} files uploaded`,
        );
        router.refresh();
      }
    });
  }

  return (
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
          PDF, images, Word, DICOM up to 50 MB
        </p>
      </div>
    </div>
  );
}
