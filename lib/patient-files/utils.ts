import type {
  PatientFileRow,
  PatientFolderRow,
} from "@/lib/patient-files/types";
import { formatPatientName } from "@/lib/patients/format-name";

export function formatPatientDisplayName(patient: {
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
}): string {
  return formatPatientName(patient, "Patient");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function getFileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  if (idx <= 0) return "";
  return name.slice(idx);
}

export function buildStoragePath(patientId: string, fileId: string, ext: string): string {
  const normalizedExt = ext.startsWith(".") ? ext : ext ? `.${ext}` : "";
  return `patients/${patientId}/${fileId}${normalizedExt}`;
}

export function buildFolderMap(folders: PatientFolderRow[]): Map<string, PatientFolderRow> {
  return new Map(folders.map((f) => [f.id, f]));
}

export function isFolderDeleted(
  folderId: string | null,
  folderMap: Map<string, PatientFolderRow>,
): boolean {
  if (!folderId) return false;
  let current = folderMap.get(folderId);
  while (current) {
    if (current.deleted_at) return true;
    current = current.parent_folder_id
      ? folderMap.get(current.parent_folder_id)
      : undefined;
  }
  return false;
}

export function isDescendantFolder(
  folderId: string,
  potentialAncestorId: string,
  folderMap: Map<string, PatientFolderRow>,
): boolean {
  let current = folderMap.get(folderId);
  while (current?.parent_folder_id) {
    if (current.parent_folder_id === potentialAncestorId) return true;
    current = folderMap.get(current.parent_folder_id);
  }
  return false;
}

export function getVisibleFolders(
  folders: PatientFolderRow[],
  options: { trash?: boolean } = {},
): PatientFolderRow[] {
  const folderMap = buildFolderMap(folders);
  if (options.trash) {
    return folders.filter((folder) => {
      if (!folder.deleted_at) return false;
      if (!folder.parent_folder_id) return true;
      const parent = folderMap.get(folder.parent_folder_id);
      return !parent?.deleted_at;
    });
  }

  return folders.filter(
    (folder) => !folder.deleted_at && !isFolderDeleted(folder.parent_folder_id, folderMap),
  );
}

export function getVisibleFiles(
  files: PatientFileRow[],
  folders: PatientFolderRow[],
  options: { trash?: boolean } = {},
): PatientFileRow[] {
  const folderMap = buildFolderMap(folders);
  if (options.trash) {
    return files.filter((file) => {
      if (!file.deleted_at) return false;
      if (!file.folder_id) return true;
      const folder = folderMap.get(file.folder_id);
      return !folder?.deleted_at;
    });
  }

  return files.filter(
    (file) =>
      !file.deleted_at &&
      !isFolderDeleted(file.folder_id, folderMap) &&
      !file.deleted_at,
  );
}

export function getChildFolders(
  folders: PatientFolderRow[],
  parentFolderId: string | null,
  options: { trash?: boolean } = {},
): PatientFolderRow[] {
  return getVisibleFolders(folders, options).filter(
    (folder) => folder.parent_folder_id === parentFolderId,
  );
}

export function getFilesInFolder(
  files: PatientFileRow[],
  folders: PatientFolderRow[],
  folderId: string | null,
  options: { trash?: boolean } = {},
): PatientFileRow[] {
  return getVisibleFiles(files, folders, options).filter(
    (file) => file.folder_id === folderId,
  );
}

export function buildBreadcrumb(
  folderId: string | null,
  folders: PatientFolderRow[],
): PatientFolderRow[] {
  if (!folderId) return [];
  const folderMap = buildFolderMap(folders);
  const trail: PatientFolderRow[] = [];
  let current = folderMap.get(folderId);
  while (current) {
    trail.unshift(current);
    current = current.parent_folder_id
      ? folderMap.get(current.parent_folder_id)
      : undefined;
  }
  return trail;
}

export function formatEmployeeDisplayName(employee: {
  prefix?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
}): string | null {
  const parts = [
    employee.prefix,
    employee.first_name,
    employee.middle_name,
    employee.last_name,
  ].filter((p): p is string => Boolean(p && String(p).trim()));
  return parts.length ? parts.join(" ") : null;
}

export function isPreviewableMime(mime: string): boolean {
  return (
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime === "application/pdf"
  );
}
