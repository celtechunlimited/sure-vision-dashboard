"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  ALLOWED_MIME,
  MAX_FILE_SIZE,
  PATIENT_FILES_BUCKET,
  type PatientFileActionType,
  type PatientFileTargetType,
  type PatientFolderRow,
} from "@/lib/patient-files/types";
import {
  buildStoragePath,
  getFileExtension,
  isDescendantFolder,
} from "@/lib/patient-files/utils";
import { createClient } from "@/lib/supabase/server";

export type PatientFileMutationResult =
  | { ok: true; fileId?: string; signedUrl?: string }
  | { ok: false; message: string };

type StaffAuthResult =
  | { ok: true; userId: string }
  | { ok: false; message: string };

const uuid = z.string().uuid();
const folderName = z.string().trim().min(1, "Name is required").max(255);
const fileName = z.string().trim().min(1, "Name is required").max(255);

const createFolderSchema = z.object({
  patientId: uuid,
  parentFolderId: uuid.nullable(),
  name: folderName,
});

const folderIdSchema = z.object({
  folderId: uuid,
});

const renameFolderSchema = folderIdSchema.extend({
  name: folderName,
});

const moveFolderSchema = folderIdSchema.extend({
  newParentFolderId: uuid.nullable(),
});

const renameFileSchema = z.object({
  fileId: uuid,
  fileName: fileName,
});

const moveFileSchema = z.object({
  fileId: uuid,
  newFolderId: uuid.nullable(),
});

const signedUrlSchema = z.object({
  fileId: uuid,
  disposition: z.enum(["inline", "attachment"]),
});

function revalidatePatientPaths(patientId: string) {
  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/patients");
  revalidatePath("/admin/users/patients");
}

async function requireStaffUser(): Promise<StaffAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Not authenticated." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profile?.user_type !== "super_admin" &&
    profile?.user_type !== "employee"
  ) {
    return { ok: false, message: "Not authorized." };
  }

  return { ok: true, userId: user.id };
}

async function logActivity(input: {
  patientId: string;
  actionType: PatientFileActionType;
  targetType: PatientFileTargetType;
  targetId: string;
  performedBy: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  await supabase.from("patient_file_activity_logs").insert({
    patient_id: input.patientId,
    action_type: input.actionType,
    target_type: input.targetType,
    target_id: input.targetId,
    performed_by: input.performedBy,
    metadata: input.metadata ?? {},
  });
}

function isAllowedMime(mime: string): boolean {
  return (ALLOWED_MIME as readonly string[]).includes(mime);
}

async function validateFolderParent(
  patientId: string,
  parentFolderId: string | null,
): Promise<PatientFileMutationResult | { ok: true }> {
  if (!parentFolderId) return { ok: true };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_folders")
    .select("id, patient_id, deleted_at")
    .eq("id", parentFolderId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Parent folder not found." };
  }
  if (data.patient_id !== patientId) {
    return { ok: false, message: "Parent folder belongs to another patient." };
  }
  if (data.deleted_at) {
    return { ok: false, message: "Cannot use a deleted folder as parent." };
  }
  return { ok: true };
}

export async function createPatientFolder(input: {
  patientId: string;
  parentFolderId: string | null;
  name: string;
}): Promise<PatientFileMutationResult> {
  const parsed = createFolderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const parentCheck = await validateFolderParent(
    parsed.data.patientId,
    parsed.data.parentFolderId,
  );
  if (!parentCheck.ok) return parentCheck;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_folders")
    .insert({
      patient_id: parsed.data.patientId,
      parent_folder_id: parsed.data.parentFolderId,
      name: parsed.data.name,
      created_by: auth.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "A folder with this name already exists here." };
    }
    return { ok: false, message: error.message };
  }

  await logActivity({
    patientId: parsed.data.patientId,
    actionType: "FOLDER_CREATE",
    targetType: "folder",
    targetId: data.id,
    performedBy: auth.userId,
    metadata: {
      target_name: parsed.data.name,
      parent_folder_id: parsed.data.parentFolderId,
    },
  });

  revalidatePatientPaths(parsed.data.patientId);
  return { ok: true };
}

export async function renamePatientFolder(input: {
  folderId: string;
  name: string;
}): Promise<PatientFileMutationResult> {
  const parsed = renameFolderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: folder, error: fetchError } = await supabase
    .from("patient_folders")
    .select("id, patient_id, name, deleted_at")
    .eq("id", parsed.data.folderId)
    .maybeSingle();

  if (fetchError || !folder) {
    return { ok: false, message: "Folder not found." };
  }
  if (folder.deleted_at) {
    return { ok: false, message: "Cannot rename a deleted folder." };
  }

  const { error } = await supabase
    .from("patient_folders")
    .update({
      name: parsed.data.name,
      updated_by: auth.userId,
    })
    .eq("id", parsed.data.folderId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "A folder with this name already exists here." };
    }
    return { ok: false, message: error.message };
  }

  await logActivity({
    patientId: folder.patient_id,
    actionType: "FOLDER_RENAME",
    targetType: "folder",
    targetId: folder.id,
    performedBy: auth.userId,
    metadata: {
      previous_value: folder.name,
      new_value: parsed.data.name,
      target_name: parsed.data.name,
    },
  });

  revalidatePatientPaths(folder.patient_id);
  return { ok: true };
}

export async function movePatientFolder(input: {
  folderId: string;
  newParentFolderId: string | null;
}): Promise<PatientFileMutationResult> {
  const parsed = moveFolderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  if (parsed.data.folderId === parsed.data.newParentFolderId) {
    return { ok: false, message: "A folder cannot be moved into itself." };
  }

  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: folder, error: fetchError } = await supabase
    .from("patient_folders")
    .select("id, patient_id, parent_folder_id, name, deleted_at")
    .eq("id", parsed.data.folderId)
    .maybeSingle();

  if (fetchError || !folder) {
    return { ok: false, message: "Folder not found." };
  }
  if (folder.deleted_at) {
    return { ok: false, message: "Cannot move a deleted folder." };
  }

  const parentCheck = await validateFolderParent(
    folder.patient_id,
    parsed.data.newParentFolderId,
  );
  if (!parentCheck.ok) return parentCheck;

  if (parsed.data.newParentFolderId) {
    const { data: allFolders } = await supabase
      .from("patient_folders")
      .select("id, parent_folder_id, patient_id, name, created_by, updated_by, deleted_by, created_at, updated_at, deleted_at")
      .eq("patient_id", folder.patient_id);

    if (
      isDescendantFolder(
        parsed.data.newParentFolderId,
        parsed.data.folderId,
        new Map((allFolders ?? []).map((f) => [f.id, f as PatientFolderRow])),
      )
    ) {
      return { ok: false, message: "Cannot move a folder into its own subfolder." };
    }
  }

  const { error } = await supabase
    .from("patient_folders")
    .update({
      parent_folder_id: parsed.data.newParentFolderId,
      updated_by: auth.userId,
    })
    .eq("id", parsed.data.folderId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "A folder with this name already exists here." };
    }
    return { ok: false, message: error.message };
  }

  await logActivity({
    patientId: folder.patient_id,
    actionType: "FOLDER_MOVE",
    targetType: "folder",
    targetId: folder.id,
    performedBy: auth.userId,
    metadata: {
      previous_value: folder.parent_folder_id,
      new_value: parsed.data.newParentFolderId,
      target_name: folder.name,
    },
  });

  revalidatePatientPaths(folder.patient_id);
  return { ok: true };
}

export async function softDeletePatientFolder(input: {
  folderId: string;
}): Promise<PatientFileMutationResult> {
  const parsed = folderIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid folder." };
  }

  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: folder, error: fetchError } = await supabase
    .from("patient_folders")
    .select("id, patient_id, name, deleted_at")
    .eq("id", parsed.data.folderId)
    .maybeSingle();

  if (fetchError || !folder) {
    return { ok: false, message: "Folder not found." };
  }
  if (folder.deleted_at) {
    return { ok: false, message: "Folder is already deleted." };
  }

  const { error } = await supabase
    .from("patient_folders")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: auth.userId,
      updated_by: auth.userId,
    })
    .eq("id", parsed.data.folderId);

  if (error) {
    return { ok: false, message: error.message };
  }

  await logActivity({
    patientId: folder.patient_id,
    actionType: "FOLDER_DELETE",
    targetType: "folder",
    targetId: folder.id,
    performedBy: auth.userId,
    metadata: { target_name: folder.name },
  });

  revalidatePatientPaths(folder.patient_id);
  return { ok: true };
}

export async function restorePatientFolder(input: {
  folderId: string;
}): Promise<PatientFileMutationResult> {
  const parsed = folderIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid folder." };
  }

  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: folder, error: fetchError } = await supabase
    .from("patient_folders")
    .select("id, patient_id, name, deleted_at, parent_folder_id")
    .eq("id", parsed.data.folderId)
    .maybeSingle();

  if (fetchError || !folder) {
    return { ok: false, message: "Folder not found." };
  }
  if (!folder.deleted_at) {
    return { ok: false, message: "Folder is not deleted." };
  }

  if (folder.parent_folder_id) {
    const { data: parent } = await supabase
      .from("patient_folders")
      .select("deleted_at")
      .eq("id", folder.parent_folder_id)
      .maybeSingle();
    if (parent?.deleted_at) {
      return {
        ok: false,
        message: "Restore the parent folder first.",
      };
    }
  }

  const { error } = await supabase
    .from("patient_folders")
    .update({
      deleted_at: null,
      deleted_by: null,
      updated_by: auth.userId,
    })
    .eq("id", parsed.data.folderId);

  if (error) {
    return { ok: false, message: error.message };
  }

  await logActivity({
    patientId: folder.patient_id,
    actionType: "FOLDER_RESTORE",
    targetType: "folder",
    targetId: folder.id,
    performedBy: auth.userId,
    metadata: { target_name: folder.name },
  });

  revalidatePatientPaths(folder.patient_id);
  return { ok: true };
}

export async function uploadPatientFile(
  formData: FormData,
): Promise<PatientFileMutationResult> {
  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const patientId = String(formData.get("patientId") ?? "");
  const folderIdRaw = formData.get("folderId");
  const folderId =
    folderIdRaw == null || folderIdRaw === "" ? null : String(folderIdRaw);
  const file = formData.get("file");

  const patientParse = uuid.safeParse(patientId);
  if (!patientParse.success) {
    return { ok: false, message: "Invalid patient." };
  }
  if (folderId) {
    const folderParse = uuid.safeParse(folderId);
    if (!folderParse.success) {
      return { ok: false, message: "Invalid folder." };
    }
  }
  if (!(file instanceof File)) {
    return { ok: false, message: "No file provided." };
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return { ok: false, message: "File exceeds the 50 MB limit." };
  }
  if (!isAllowedMime(file.type)) {
    return { ok: false, message: "File type is not allowed." };
  }

  const parentCheck = await validateFolderParent(patientParse.data, folderId);
  if (!parentCheck.ok) return parentCheck;

  const fileId = randomUUID();
  const ext = getFileExtension(file.name);
  const storagePath = buildStoragePath(patientParse.data, fileId, ext);

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage
    .from(PATIENT_FILES_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const { data, error } = await supabase
    .from("patient_files")
    .insert({
      id: fileId,
      patient_id: patientParse.data,
      folder_id: folderId,
      storage_path: storagePath,
      original_name: file.name,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      uploaded_by: auth.userId,
    })
    .select("id")
    .single();

  if (error) {
    await supabase.storage.from(PATIENT_FILES_BUCKET).remove([storagePath]);
    return { ok: false, message: error.message };
  }

  await logActivity({
    patientId: patientParse.data,
    actionType: "FILE_UPLOAD",
    targetType: "file",
    targetId: data.id,
    performedBy: auth.userId,
    metadata: {
      target_name: file.name,
      folder_id: folderId,
    },
  });

  revalidatePatientPaths(patientParse.data);
  return { ok: true, fileId: data.id };
}

export async function renamePatientFile(input: {
  fileId: string;
  fileName: string;
}): Promise<PatientFileMutationResult> {
  const parsed = renameFileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: file, error: fetchError } = await supabase
    .from("patient_files")
    .select("id, patient_id, file_name, deleted_at")
    .eq("id", parsed.data.fileId)
    .maybeSingle();

  if (fetchError || !file) {
    return { ok: false, message: "File not found." };
  }
  if (file.deleted_at) {
    return { ok: false, message: "Cannot rename a deleted file." };
  }

  const { error } = await supabase
    .from("patient_files")
    .update({
      file_name: parsed.data.fileName,
      updated_by: auth.userId,
    })
    .eq("id", parsed.data.fileId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "A file with this name already exists here." };
    }
    return { ok: false, message: error.message };
  }

  await logActivity({
    patientId: file.patient_id,
    actionType: "FILE_RENAME",
    targetType: "file",
    targetId: file.id,
    performedBy: auth.userId,
    metadata: {
      previous_value: file.file_name,
      new_value: parsed.data.fileName,
      target_name: parsed.data.fileName,
    },
  });

  revalidatePatientPaths(file.patient_id);
  return { ok: true };
}

export async function movePatientFile(input: {
  fileId: string;
  newFolderId: string | null;
}): Promise<PatientFileMutationResult> {
  const parsed = moveFileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: file, error: fetchError } = await supabase
    .from("patient_files")
    .select("id, patient_id, folder_id, file_name, deleted_at")
    .eq("id", parsed.data.fileId)
    .maybeSingle();

  if (fetchError || !file) {
    return { ok: false, message: "File not found." };
  }
  if (file.deleted_at) {
    return { ok: false, message: "Cannot move a deleted file." };
  }

  const parentCheck = await validateFolderParent(
    file.patient_id,
    parsed.data.newFolderId,
  );
  if (!parentCheck.ok) return parentCheck;

  const { error } = await supabase
    .from("patient_files")
    .update({
      folder_id: parsed.data.newFolderId,
      updated_by: auth.userId,
    })
    .eq("id", parsed.data.fileId);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "A file with this name already exists here." };
    }
    return { ok: false, message: error.message };
  }

  await logActivity({
    patientId: file.patient_id,
    actionType: "FILE_MOVE",
    targetType: "file",
    targetId: file.id,
    performedBy: auth.userId,
    metadata: {
      previous_value: file.folder_id,
      new_value: parsed.data.newFolderId,
      target_name: file.file_name,
    },
  });

  revalidatePatientPaths(file.patient_id);
  return { ok: true };
}

export async function replacePatientFile(
  formData: FormData,
): Promise<PatientFileMutationResult> {
  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const fileId = String(formData.get("fileId") ?? "");
  const file = formData.get("file");
  const fileParse = uuid.safeParse(fileId);
  if (!fileParse.success) {
    return { ok: false, message: "Invalid file." };
  }
  if (!(file instanceof File)) {
    return { ok: false, message: "No file provided." };
  }
  if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return { ok: false, message: "File exceeds the 50 MB limit." };
  }
  if (!isAllowedMime(file.type)) {
    return { ok: false, message: "File type is not allowed." };
  }

  const supabase = await createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("patient_files")
    .select("id, patient_id, storage_path, file_name, mime_type, file_size, deleted_at")
    .eq("id", fileParse.data)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, message: "File not found." };
  }
  if (existing.deleted_at) {
    return { ok: false, message: "Cannot replace a deleted file." };
  }

  const { error: uploadError } = await supabase.storage
    .from(PATIENT_FILES_BUCKET)
    .upload(existing.storage_path, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { ok: false, message: uploadError.message };
  }

  const { error } = await supabase
    .from("patient_files")
    .update({
      mime_type: file.type,
      file_size: file.size,
      original_name: file.name,
      updated_by: auth.userId,
    })
    .eq("id", existing.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  await logActivity({
    patientId: existing.patient_id,
    actionType: "FILE_REPLACE",
    targetType: "file",
    targetId: existing.id,
    performedBy: auth.userId,
    metadata: {
      previous_value: existing.file_name,
      new_value: file.name,
      target_name: existing.file_name,
    },
  });

  revalidatePatientPaths(existing.patient_id);
  return { ok: true, fileId: existing.id };
}

export async function softDeletePatientFile(input: {
  fileId: string;
}): Promise<PatientFileMutationResult> {
  const parsed = z.object({ fileId: uuid }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid file." };
  }

  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: file, error: fetchError } = await supabase
    .from("patient_files")
    .select("id, patient_id, file_name, deleted_at")
    .eq("id", parsed.data.fileId)
    .maybeSingle();

  if (fetchError || !file) {
    return { ok: false, message: "File not found." };
  }
  if (file.deleted_at) {
    return { ok: false, message: "File is already deleted." };
  }

  const { error } = await supabase
    .from("patient_files")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: auth.userId,
      updated_by: auth.userId,
    })
    .eq("id", parsed.data.fileId);

  if (error) {
    return { ok: false, message: error.message };
  }

  await logActivity({
    patientId: file.patient_id,
    actionType: "FILE_DELETE",
    targetType: "file",
    targetId: file.id,
    performedBy: auth.userId,
    metadata: { target_name: file.file_name },
  });

  revalidatePatientPaths(file.patient_id);
  return { ok: true };
}

export async function restorePatientFile(input: {
  fileId: string;
}): Promise<PatientFileMutationResult> {
  const parsed = z.object({ fileId: uuid }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid file." };
  }

  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: file, error: fetchError } = await supabase
    .from("patient_files")
    .select("id, patient_id, file_name, deleted_at, folder_id")
    .eq("id", parsed.data.fileId)
    .maybeSingle();

  if (fetchError || !file) {
    return { ok: false, message: "File not found." };
  }
  if (!file.deleted_at) {
    return { ok: false, message: "File is not deleted." };
  }

  if (file.folder_id) {
    const { data: folder } = await supabase
      .from("patient_folders")
      .select("deleted_at")
      .eq("id", file.folder_id)
      .maybeSingle();
    if (folder?.deleted_at) {
      return { ok: false, message: "Restore the folder first." };
    }
  }

  const { error } = await supabase
    .from("patient_files")
    .update({
      deleted_at: null,
      deleted_by: null,
      updated_by: auth.userId,
    })
    .eq("id", parsed.data.fileId);

  if (error) {
    return { ok: false, message: error.message };
  }

  await logActivity({
    patientId: file.patient_id,
    actionType: "FILE_RESTORE",
    targetType: "file",
    targetId: file.id,
    performedBy: auth.userId,
    metadata: { target_name: file.file_name },
  });

  revalidatePatientPaths(file.patient_id);
  return { ok: true };
}

export async function getPatientFileSignedUrl(input: {
  fileId: string;
  disposition: "inline" | "attachment";
}): Promise<PatientFileMutationResult> {
  const parsed = signedUrlSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Invalid request." };
  }

  const auth = await requireStaffUser();
  if (!auth.ok) return auth;

  const supabase = await createClient();
  const { data: file, error: fetchError } = await supabase
    .from("patient_files")
    .select("id, patient_id, storage_path, original_name, file_name, deleted_at")
    .eq("id", parsed.data.fileId)
    .maybeSingle();

  if (fetchError || !file) {
    return { ok: false, message: "File not found." };
  }
  if (file.deleted_at) {
    return { ok: false, message: "File is deleted." };
  }

  const { data, error } = await supabase.storage
    .from(PATIENT_FILES_BUCKET)
    .createSignedUrl(
      file.storage_path,
      60,
      parsed.data.disposition === "attachment"
        ? { download: file.original_name || file.file_name }
        : undefined,
    );

  if (error || !data?.signedUrl) {
    return { ok: false, message: error?.message ?? "Could not create signed URL." };
  }

  if (parsed.data.disposition === "attachment") {
    await logActivity({
      patientId: file.patient_id,
      actionType: "FILE_DOWNLOAD",
      targetType: "file",
      targetId: file.id,
      performedBy: auth.userId,
      metadata: { target_name: file.file_name },
    });
  }

  return { ok: true, signedUrl: data.signedUrl };
}
