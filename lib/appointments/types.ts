export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "in_progress"
  | "cancelled";

export type AppointmentType =
  | "consultation"
  | "eye_examination"
  | "fitting"
  | "follow_up";

/** Row shape for `public.appointments`. */
export type AppointmentRow = {
  id: string;
  created_at: string;
  branch_id: string | null;
  patient_id: string | null;
  patient_name: string | null;
  patient_contact_number: string | null;
  patient_email: string | null;
  start_time: string | null;
  end_time: string | null;
  status: AppointmentStatus | string | null;
  notes: string | null;
  created_by: string | null;
  appointment_type: AppointmentType | string | null;
};

/** Row shape for `public.dispensed_items`. */
export type DispensedItemRow = {
  id: string;
  created_at: string;
  appointment_id: string | null;
  product_id: string | null;
  product_name: string | null;
  product_sku: string | null;
  quantity: number | null;
  unit_price: string | null;
  dispensed_by: string | null;
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  in_progress: "In progress",
  cancelled: "Cancelled",
};

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "completed",
  "in_progress",
  "cancelled",
];

export const APPOINTMENT_TYPE_LABELS: Record<AppointmentType, string> = {
  consultation: "Consultation",
  eye_examination: "Eye examination",
  fitting: "Fitting",
  follow_up: "Follow-up",
};

export const APPOINTMENT_TYPES: AppointmentType[] = [
  "consultation",
  "eye_examination",
  "fitting",
  "follow_up",
];
