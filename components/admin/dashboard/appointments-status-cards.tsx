import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AppointmentStatus } from "@/lib/appointments/types";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/appointments/types";
import { appointmentStatusChipClass } from "@/lib/dashboard/appointment-status-styles";

export type AdminAppointmentTodayRow = {
  id: string;
  branch_id: string | null;
  status: string | null;
};

function isStatus(s: string | null): s is AppointmentStatus {
  return s != null && APPOINTMENT_STATUSES.includes(s as AppointmentStatus);
}

export function AppointmentsStatusCards({
  appointments,
}: {
  appointments: AdminAppointmentTodayRow[];
}) {
  const counts: Record<string, number> = {};
  for (const s of APPOINTMENT_STATUSES) counts[s] = 0;
  let unknown = 0;
  for (const a of appointments) {
    if (isStatus(a.status)) counts[a.status] += 1;
    else unknown += 1;
  }
  const total = appointments.length;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <CardTitle>Appointments today</CardTitle>
        <CardDescription>
          All branches · {total} total · by status
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-2xl font-semibold tabular-nums">{total}</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {APPOINTMENT_STATUSES.map((status) => (
            <div
              key={status}
              className="flex flex-col gap-1 rounded-lg border bg-muted/30 px-3 py-2"
            >
              <Badge
                variant="outline"
                className={`w-fit border font-normal ${appointmentStatusChipClass(status)}`}
              >
                {APPOINTMENT_STATUS_LABELS[status]}
              </Badge>
              <span className="text-xl font-semibold tabular-nums">
                {counts[status]}
              </span>
            </div>
          ))}
        </div>
        {unknown > 0 ? (
          <p className="text-xs text-muted-foreground">
            {unknown} row(s) with unknown status omitted from chips.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
