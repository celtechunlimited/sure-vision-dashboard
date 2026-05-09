"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { confirmAppointmentBooking } from "@/lib/actions/appointment-actions";
import type {
  AppointmentRow,
  AppointmentStatus,
  AppointmentType,
  DispensedItemRow,
} from "@/lib/appointments/types";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPES,
  APPOINTMENT_TYPE_LABELS,
} from "@/lib/appointments/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export type AppointmentViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: AppointmentRow | null;
  dispensedItems: DispensedItemRow[];
};

export function AppointmentViewDialog({
  open,
  onOpenChange,
  appointment,
  dispensedItems,
}: AppointmentViewDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const status = appointment?.status ?? null;
  const canConfirm = status === "pending";

  function handleConfirm() {
    if (!appointment?.id || !canConfirm) return;
    startTransition(async () => {
      const result = await confirmAppointmentBooking(appointment.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Booking confirmed");
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90vh,900px)] flex-col gap-0 overflow-hidden sm:max-w-3xl"
        showCloseButton={!pending}
        onPointerDownOutside={(e) => {
          if (pending) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (pending) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Appointment details</DialogTitle>
          <DialogDescription>
            View-only · confirm pending bookings from here
          </DialogDescription>
        </DialogHeader>

        {!appointment ? (
          <p className="text-sm text-muted-foreground">No appointment selected.</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-0">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-1 pr-1">
              <div className="rounded-lg border bg-muted/40 px-4 py-3">
                <p className="mb-3 text-sm font-medium">Patient</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1 sm:col-span-2">
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="text-sm font-medium">
                      {appointment.patient_name?.trim() || "—"}
                    </p>
                  </div>
                  <div className="grid gap-1">
                    <Label className="text-muted-foreground">Contact</Label>
                    <p className="text-sm">
                      {appointment.patient_contact_number?.trim() || "—"}
                    </p>
                  </div>
                  <div className="grid gap-1 sm:col-span-2">
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="text-sm break-all">
                      {appointment.patient_email?.trim() || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label className="text-muted-foreground">Start</Label>
                  <p className="text-sm">{formatDateTime(appointment.start_time)}</p>
                </div>
                <div className="grid gap-1">
                  <Label className="text-muted-foreground">End</Label>
                  <p className="text-sm">{formatDateTime(appointment.end_time)}</p>
                </div>
                <div className="grid gap-1">
                  <Label className="text-muted-foreground">Status</Label>
                  <div>
                    <Badge
                      variant="outline"
                      className={`font-normal ${appointmentStatusChipClass(appointment.status)}`}
                    >
                      {isStatus(appointment.status)
                        ? APPOINTMENT_STATUS_LABELS[appointment.status]
                        : appointment.status ?? "—"}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-1">
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="text-sm">
                    {typeLabel(appointment.appointment_type as string | null)}
                  </p>
                </div>
                <div className="grid gap-1 sm:col-span-2">
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="whitespace-pre-wrap text-sm text-foreground">
                    {appointment.notes?.trim() ? appointment.notes : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/40 px-4 py-3">
                <p className="mb-3 text-sm font-medium">Dispensed items</p>
                {dispensedItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None recorded.</p>
                ) : (
                  <div className="overflow-x-auto rounded-md border bg-background">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="w-24">SKU</TableHead>
                          <TableHead className="w-20 text-right">Qty</TableHead>
                          <TableHead className="w-28 text-right">Unit price</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dispensedItems.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="max-w-[200px] truncate">
                              {d.product_name ?? "—"}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {d.product_sku ?? "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {d.quantity ?? "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {d.unit_price ?? "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="mt-0 shrink-0 border-t bg-background pt-4 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Close
              </Button>
              {canConfirm ? (
                <Button
                  type="button"
                  onClick={handleConfirm}
                  disabled={pending}
                >
                  {pending ? "Confirming…" : "Confirm booking"}
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
