import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AppointmentRow,
  AppointmentStatus,
  AppointmentType,
} from "@/lib/appointments/types";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPES,
} from "@/lib/appointments/types";
import { appointmentStatusChipClass } from "@/lib/dashboard/appointment-status-styles";

function isStatus(s: string | null): s is AppointmentStatus {
  return s != null && APPOINTMENT_STATUSES.includes(s as AppointmentStatus);
}

function typeLabel(t: string | null): string {
  if (!t) return "—";
  if (APPOINTMENT_TYPES.includes(t as AppointmentType)) {
    return APPOINTMENT_TYPE_LABELS[t as AppointmentType];
  }
  return t.replace(/_/g, " ");
}

function formatTimeSlot(start: string | null, end: string | null): string {
  const fmt = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  };
  const a = fmt(start);
  const b = fmt(end);
  if (!a && !b) return "—";
  if (!b) return a;
  if (!a) return b;
  return `${a} – ${b}`;
}

export function TodaysQueue({ appointments }: { appointments: AppointmentRow[] }) {
  return (
    <Card className="min-h-0">
      <CardHeader>
        <CardTitle>Today&apos;s queue</CardTitle>
        <CardDescription>
          Patient, time, type, and status · sorted by start time
        </CardDescription>
      </CardHeader>
      <CardContent className="max-h-[32rem] overflow-auto px-2 sm:px-4">
        {appointments.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No appointments today.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="max-w-[10rem] truncate font-medium">
                    {a.patient_name?.trim() || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                    {formatTimeSlot(a.start_time, a.end_time)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {typeLabel(a.appointment_type as string | null)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={`font-normal ${appointmentStatusChipClass(a.status)}`}
                    >
                      {isStatus(a.status)
                        ? APPOINTMENT_STATUS_LABELS[a.status]
                        : a.status ?? "—"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
