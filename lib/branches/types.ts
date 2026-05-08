export type BranchRow = {
  id: string;
  short_name: string;
  long_name: string;
};

/** Full row from `public.branches` for admin listing. */
export type BranchAdminRow = {
  id: string;
  created_at: string;
  long_name: string;
  short_name: string;
  address: string;
  contact_number: string;
  contact_email: string;
  operating_hours: unknown;
  appointment_slot_duration: number;
  is_active: boolean;
};

export type BranchesForSwitcher = {
  branches: BranchRow[];
  userBranchId: string | null;
  /** Only `super_admin` may switch branches; employees use `users.branch_id`. */
  canSwitchBranches: boolean;
};
