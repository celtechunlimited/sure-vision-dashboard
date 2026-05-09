import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AppointmentRow, AppointmentStatus } from "@/lib/appointments/types";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
} from "@/lib/appointments/types";
import { appointmentStatusChipClass } from "@/lib/dashboard/appointment-status-styles";

function isStatus(s: string | null): s is AppointmentStatus {
  return s != null && APPOINTMENT_STATUSES.includes(s as AppointmentStatus);
}

export function QueueStatCounters({ appointments }: { appointments: AppointmentRow[] }) {
  const counts: Record<string, number> = {};
  for (const s of APPOINTMENT_STATUSES) counts[s] = 0;
  for (const a of appointments) {
    if (isStatus(a.status)) counts[a.status] += 1;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {APPOINTMENT_STATUSES.map((status) => (
        <Card key={status} size="sm" className="shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">
              <Badge
                variant="outline"
                className={`border font-normal ${appointmentStatusChipClass(status)}`}
              >
                {APPOINTMENT_STATUS_LABELS[status]}
              </Badge>
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {counts[status]}
            </CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
