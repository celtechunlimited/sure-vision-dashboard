import { notFound, redirect } from "next/navigation";

import { PatientDetailShell } from "@/components/patient-files/patient-detail-shell";
import type {
  PatientDetailPatient,
  PatientFileActivityMetadata,
  PatientFileActivityRow,
  PatientFileRow,
  PatientFolderRow,
} from "@/lib/patient-files/types";
import { createClient } from "@/lib/supabase/server";
import { formatEmployeeDisplayName } from "@/lib/patient-files/utils";

type PageProps = {
  params: Promise<{ id: string }>;
};

function normalizeActivity(raw: Record<string, unknown>): PatientFileActivityRow {
  return {
    ...(raw as PatientFileActivityRow),
    metadata: (raw.metadata as PatientFileActivityMetadata | null) ?? {},
  };
}

export default async function PatientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: patientRow, error: patientError } = await supabase
    .from("patients")
    .select(
      `
      id,
      first_name,
      middle_name,
      last_name,
      contact_number,
      date_of_birth,
      address,
      created_at,
      patient_branches (
        branches ( short_name )
      )
    `,
    )
    .eq("id", id)
    .maybeSingle();

  if (patientError || !patientRow) {
    notFound();
  }

  type BranchJoinRow = {
    branches: { short_name: string } | { short_name: string }[] | null;
  };

  const branchShortNames = (
    (patientRow.patient_branches as BranchJoinRow[] | null) ?? []
  )
    .flatMap((row) => {
      if (!row.branches) return [];
      return Array.isArray(row.branches) ? row.branches : [row.branches];
    })
    .map((branch) => branch.short_name)
    .filter((name): name is string => Boolean(name));

  const patient: PatientDetailPatient = {
    id: patientRow.id,
    first_name: patientRow.first_name,
    middle_name: patientRow.middle_name,
    last_name: patientRow.last_name,
    contact_number: patientRow.contact_number,
    date_of_birth: patientRow.date_of_birth,
    address: patientRow.address,
    created_at: patientRow.created_at,
    branch_short_names: branchShortNames,
  };

  const [{ data: folders }, { data: files }, { data: activities }] =
    await Promise.all([
      supabase
        .from("patient_folders")
        .select("*")
        .eq("patient_id", id)
        .order("name", { ascending: true }),
      supabase
        .from("patient_files")
        .select("*")
        .eq("patient_id", id)
        .order("file_name", { ascending: true }),
      supabase
        .from("patient_file_activity_logs")
        .select("*")
        .eq("patient_id", id)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  const performerIds = Array.from(
    new Set((activities ?? []).map((row) => row.performed_by)),
  );

  let performerNames: Record<string, string> = {};
  if (performerIds.length > 0) {
    const [{ data: employees }, { data: users }] = await Promise.all([
      supabase
        .from("employees")
        .select("user_id, prefix, first_name, middle_name, last_name")
        .in("user_id", performerIds),
      supabase
        .from("users")
        .select("id, email, user_type")
        .in("id", performerIds),
    ]);

    const employeeByUserId = new Map(
      (employees ?? []).map((employee) => [employee.user_id, employee]),
    );

    performerNames = Object.fromEntries(
      (users ?? []).map((user) => {
        if (user.user_type === "super_admin") {
          return [user.id, "Admin"];
        }

        const employee = employeeByUserId.get(user.id);
        if (employee) {
          const name = formatEmployeeDisplayName(employee);
          if (name) return [user.id, name];
        }

        return [user.id, user.email ?? "Staff"];
      }),
    );
  }

  return (
    <PatientDetailShell
      patient={patient}
      folders={(folders ?? []) as PatientFolderRow[]}
      files={(files ?? []) as PatientFileRow[]}
      activities={(activities ?? []).map((row) =>
        normalizeActivity(row as Record<string, unknown>),
      )}
      performerNames={performerNames}
    />
  );
}
