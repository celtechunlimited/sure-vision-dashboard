/** Row shape for `public.employee_directory` (users ⟕ employees ⟕ branches). */
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
  branch_id: string | null;
  user_type: string | null;
  user_created_at: string;
  branch_short_name: string | null;
  branch_long_name: string | null;
  is_active: boolean;
};

export type EmployeeBranchOption = {
  id: string;
  short_name: string;
  long_name: string;
};
