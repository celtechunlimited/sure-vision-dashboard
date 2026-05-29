/** Row shape for `public.employee_directory` (users ⟕ employees ⟕ branch arrays). */
export type EmployeeDirectoryRow = {
  employee_id: string;
  employee_created_at: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  prefix: string | null;
  employee_role: "manager" | "staff" | null;
  user_id: string;
  email: string;
  user_type: string | null;
  user_created_at: string;
  is_active: boolean;
  branch_ids: string[];
  branch_short_names: string[];
  branch_long_names: string[];
};

export type EmployeeBranchOption = {
  id: string;
  short_name: string;
  long_name: string;
};
