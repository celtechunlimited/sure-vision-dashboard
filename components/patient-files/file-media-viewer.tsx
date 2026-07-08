"use client";

import * as React from "react";
import { ExternalLinkIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { getPatientFileSignedUrl } from "@/lib/actions/patient-file-actions";
import { Button } from "@/components/ui/button";
import type { PatientFileRow } from "@/lib/patient-files/types";
import { isPreviewableMime } from "@/lib/patient-files/utils";

type FileMediaViewerProps = {
  file: Pick<PatientFileRow, "id" | "file_name" | "mime_type">;
  showOpenFullView?: boolean;
};

export function FileMediaViewer({
  file,
  showOpenFullView = false,
}: FileMediaViewerProps) {
  const [signedUrl, setSignedUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getPatientFileSignedUrl({
      fileId: file.id,
      disposition: "inline",
    }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok || !result.signedUrl) {
        toast.error(!result.ok ? result.message : "Could not load preview.");
        return;
      }
      setSignedUrl(result.signedUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [file.id]);

  const previewable = isPreviewableMime(file.mime_type);

  return (
    <div className="flex flex-col gap-3">
      {showOpenFullView && signedUrl && previewable ? (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" asChild>
            <a href={signedUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="size-4" />
              Open full view
            </a>
          </Button>
        </div>
      ) : null}
      <div className="min-h-[420px] flex-1 overflow-auto rounded-md border bg-muted/20">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : signedUrl && previewable ? (
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
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Preview not available for this file type.
          </div>
        )}
      </div>
    </div>
  );
}
