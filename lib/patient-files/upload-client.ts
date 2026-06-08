"use client";

import { createClient } from "@/lib/supabase/client";
import { PATIENT_FILES_BUCKET } from "@/lib/patient-files/types";
import { buildStoragePath, getFileExtension } from "@/lib/patient-files/utils";

export type UploadToPatientStorageInput = {
  patientId: string;
  file: File;
  onProgress?: (percent: number) => void;
  fileId?: string;
  storagePath?: string;
  upsert?: boolean;
};

export type UploadToPatientStorageResult = {
  storagePath: string;
  fileId: string;
};

function putFileWithProgress(
  signedUrl: string,
  file: File,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(`Upload failed with status ${xhr.status}.`));
    };

    xhr.onerror = () => reject(new Error("Upload failed due to a network error."));
    xhr.onabort = () => reject(new Error("Upload was cancelled."));
    xhr.send(file);
  });
}

export async function uploadToPatientStorage(
  input: UploadToPatientStorageInput,
): Promise<UploadToPatientStorageResult> {
  const fileId = input.fileId ?? crypto.randomUUID();
  const storagePath =
    input.storagePath ??
    buildStoragePath(input.patientId, fileId, getFileExtension(input.file.name));

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(PATIENT_FILES_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: input.upsert ?? false });

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not create upload URL.");
  }

  await putFileWithProgress(data.signedUrl, input.file, input.onProgress);
  return { storagePath, fileId };
}
