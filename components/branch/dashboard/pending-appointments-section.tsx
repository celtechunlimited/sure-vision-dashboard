"use client";

import * as React from "react";

import { AppointmentViewDialog } from "@/components/appointments/appointment-view-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { AppointmentRow, AppointmentType } from "@/lib/appointments/types";
import {
  APPOINTMENT_TYPE_LABELS,
  APPOINTMENT_TYPES,
} from "@/lib/appointments/types";
import type { DispensedItemRow } from "@/lib/appointments/types";
import { appointmentStatusChipClass } from "@/lib/dashboard/appointment-status-styles";

function typeLabel(t: string | null): string {
  if (!t) return "—";
  if (APPOINTMENT_TYPES.includes(t as AppointmentType)) {
    return APPOINTMENT_TYPE_LABELS[t as AppointmentType];
  }
  return t.replace(/_/g, " ");
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function PendingAppointmentsSection({
  appointments,
  dispensedByAppointment,
}: {
  appointments: AppointmentRow[];
  dispensedByAppointment: Record<string, DispensedItemRow[]>;
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<AppointmentRow | null>(null);

  function openView(a: AppointmentRow) {
    setSelected(a);
    setOpen(true);
  }

  const dispensedForSelected = selected?.id
    ? dispensedByAppointment[selected.id] ?? []
    : [];

  return (
    <>
      <Card className="min-h-0">
        <CardHeader>
          <CardTitle>Pending appointments</CardTitle>
          <CardDescription>
            All bookings awaiting confirmation · sorted by start time
          </CardDescription>
        </CardHeader>
        <CardContent className="max-h-128 overflow-auto px-2 sm:px-4">
          {appointments.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No pending appointments.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="max-w-40 truncate font-medium">
                      {a.patient_name?.trim() || "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(a.start_time)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {typeLabel(a.appointment_type as string | null)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`font-normal ${appointmentStatusChipClass("pending")}`}
                      >
                        Pending
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openView(a)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AppointmentViewDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setSelected(null);
        }}
        appointment={selected}
        dispensedItems={dispensedForSelected}
      />
    </>
  );
}
