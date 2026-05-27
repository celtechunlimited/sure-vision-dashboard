export type PatientAccountStatus = "active" | "inactive" | "no_account";

export type PatientDirectoryRow = {
  patient_id: string;
  patient_created_at: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  contact_number: string | null;
  date_of_birth: string | null;
  address: string | null;
  user_id: string | null;
  email: string | null;
  user_type: string | null;
  user_created_at: string | null;
  user_is_active: boolean | null;
  account_status: PatientAccountStatus;
  branch_ids: string[];
  branch_short_names: string[];
  branch_long_names: string[];
};
