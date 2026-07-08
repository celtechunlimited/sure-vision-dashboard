export const PATIENT_FILES_BUCKET = "patient-files" as const;

export const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const ALLOWED_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/dicom",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type AllowedMime = (typeof ALLOWED_MIME)[number];

export type PatientFileActionType =
  | "FOLDER_CREATE"
  | "FOLDER_RENAME"
  | "FOLDER_MOVE"
  | "FOLDER_DELETE"
  | "FOLDER_RESTORE"
  | "FILE_UPLOAD"
  | "FILE_RENAME"
  | "FILE_MOVE"
  | "FILE_REPLACE"
  | "FILE_DELETE"
  | "FILE_RESTORE"
  | "FILE_DOWNLOAD";

export type PatientFileTargetType = "folder" | "file";

export type PatientFolderRow = {
  id: string;
  patient_id: string;
  parent_folder_id: string | null;
  name: string;
  sort_order: number | null;
  created_by: string;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PatientFileRow = {
  id: string;
  patient_id: string;
  folder_id: string | null;
  storage_path: string;
  original_name: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  sort_order: number | null;
  uploaded_by: string;
  updated_by: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type PatientFileActivityMetadata = {
  previous_value?: string | null;
  new_value?: string | null;
  target_name?: string | null;
  folder_id?: string | null;
  parent_folder_id?: string | null;
};

export type PatientFileActivityRow = {
  id: string;
  patient_id: string;
  action_type: PatientFileActionType;
  target_type: PatientFileTargetType;
  target_id: string;
  performed_by: string;
  metadata: PatientFileActivityMetadata;
  created_at: string;
};

export type PatientFileExplorerItem =
  | { kind: "folder"; folder: PatientFolderRow }
  | { kind: "file"; file: PatientFileRow };

export type PatientDetailPatient = {
  id: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  contact_number: string | null;
  date_of_birth: string | null;
  address: string | null;
  is_minor: boolean;
  guardian_name: string | null;
  guardian_mobile: string | null;
  guardian_email: string | null;
  guardian_relationship: string | null;
  created_at: string;
  branch_short_names: string[];
};

export type PatientFileUploadMetadata = {
  patientId: string;
  folderId: string | null;
  fileId: string;
  storagePath: string;
  originalName: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
};

export type PatientFileReplaceMetadata = {
  fileId: string;
  mimeType: string;
  fileSize: number;
  originalName: string;
};
