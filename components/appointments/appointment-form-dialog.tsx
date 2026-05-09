"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { PatientCombobox } from "@/components/appointments/patient-combobox";
import { ProductCombobox } from "@/components/appointments/product-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { upsertAppointmentWithDispensed } from "@/lib/actions/appointment-actions";
import { patientDirectoryFullName } from "@/lib/appointments/patient-display";
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
import type { PatientDirectoryRow } from "@/lib/patients/types";
import type { ProductInventoryRow } from "@/lib/products/types";

type DispensedLine = {
  key: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: string;
  unit_price: string;
};

function newLine(): DispensedLine {
  return {
    key: crypto.randomUUID(),
    product_id: "",
    product_name: "",
    product_sku: "",
    quantity: "1",
    unit_price: "",
  };
}

function dispensedRowToLine(r: DispensedItemRow): DispensedLine {
  return {
    key: r.id,
    product_id: r.product_id ?? "",
    product_name: r.product_name ?? "",
    product_sku: r.product_sku ?? "",
    quantity: r.quantity != null ? String(r.quantity) : "1",
    unit_price:
      r.unit_price != null && r.unit_price !== ""
        ? String(r.unit_price)
        : "",
  };
}

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(s: string): string | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export type AppointmentFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  branchId: string | null;
  appointment: AppointmentRow | null;
  initialDispensed: DispensedItemRow[];
  patients: PatientDirectoryRow[];
  products: ProductInventoryRow[];
};

export function AppointmentFormDialog({
  open,
  onOpenChange,
  mode,
  branchId,
  appointment,
  initialDispensed,
  patients,
  products,
}: AppointmentFormDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const [patientId, setPatientId] = React.useState<string | null>(null);
  const [patientName, setPatientName] = React.useState("");
  const [patientContact, setPatientContact] = React.useState("");
  const [patientEmail, setPatientEmail] = React.useState("");
  const [startLocal, setStartLocal] = React.useState("");
  const [endLocal, setEndLocal] = React.useState("");
  const [status, setStatus] = React.useState<AppointmentStatus>("pending");
  const [appointmentType, setAppointmentType] = React.useState<string>("");
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<DispensedLine[]>([]);

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && appointment) {
      setPatientId(appointment.patient_id);
      setPatientName(appointment.patient_name ?? "");
      setPatientContact(appointment.patient_contact_number ?? "");
      setPatientEmail(appointment.patient_email ?? "");
      setStartLocal(toDatetimeLocalValue(appointment.start_time));
      setEndLocal(toDatetimeLocalValue(appointment.end_time));
      const st = appointment.status as string | null;
      setStatus(
        st && APPOINTMENT_STATUSES.includes(st as AppointmentStatus)
          ? (st as AppointmentStatus)
          : "pending",
      );
      const at = appointment.appointment_type as string | null;
      setAppointmentType(
        at && APPOINTMENT_TYPES.includes(at as AppointmentType) ? at : "",
      );
      setNotes(appointment.notes ?? "");
      setLines(
        initialDispensed.length
          ? initialDispensed.map(dispensedRowToLine)
          : [],
      );
    } else {
      setPatientId(null);
      setPatientName("");
      setPatientContact("");
      setPatientEmail("");
      setStartLocal("");
      setEndLocal("");
      setStatus("pending");
      setAppointmentType("");
      setNotes("");
      setLines([]);
    }
  }, [open, mode, appointment, initialDispensed]);

  function handlePatientSelect(p: PatientDirectoryRow | null) {
    if (!p) {
      setPatientId(null);
      return;
    }
    setPatientId(p.patient_id);
    setPatientName(patientDirectoryFullName(p));
    setPatientContact(p.contact_number ?? "");
    setPatientEmail(p.email ?? "");
  }

  function updateLine(
    key: string,
    patch: Partial<Omit<DispensedLine, "key">>,
  ) {
    setLines((prev) =>
      prev.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function handleProductPick(key: string, product: ProductInventoryRow | null) {
    if (!product) {
      updateLine(key, {
        product_id: "",
        product_name: "",
        product_sku: "",
        unit_price: "",
      });
      return;
    }
    const price =
      product.unit_price != null && product.unit_price !== ""
        ? String(product.unit_price)
        : "";
    updateLine(key, {
      product_id: product.id,
      product_name: product.long_name ?? product.short_name ?? "",
      product_sku: product.sku ?? "",
      unit_price: price,
    });
  }

  function handleCancel() {
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!branchId) {
      toast.error("Select a branch first");
      return;
    }
    if (!patientName.trim()) {
      toast.error("Patient name is required");
      return;
    }

    const dispensedPayload = lines
      .filter((l) => l.product_id)
      .map((l) => ({
        product_id: l.product_id,
        quantity: l.quantity,
        unit_price: l.unit_price,
        product_name: l.product_name || "Product",
        product_sku: l.product_sku || null,
      }));

    startTransition(async () => {
      const result = await upsertAppointmentWithDispensed({
        id: mode === "edit" && appointment ? appointment.id : undefined,
        branch_id: branchId,
        patient_id: patientId,
        patient_name: patientName.trim(),
        patient_contact_number: patientContact,
        patient_email: patientEmail,
        start_time: fromDatetimeLocalValue(startLocal),
        end_time: fromDatetimeLocalValue(endLocal),
        status,
        appointment_type: appointmentType || null,
        notes,
        dispensed_items: dispensedPayload,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(
        mode === "create" ? "Appointment created" : "Appointment updated",
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  const title = mode === "create" ? "Add appointment" : "Edit appointment";
  const description =
    mode === "create"
      ? "Schedule an appointment and record dispensed items."
      : "Update appointment details and dispensed items.";

  const noBranch = !branchId;

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
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col gap-0"
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-1 pr-1">
          {noBranch ? (
            <p className="text-muted-foreground text-sm">
              Choose a branch in the sidebar to add or edit appointments.
            </p>
          ) : null}

          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <p className="mb-3 text-sm font-medium">Patient</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label>Client directory</Label>
                <PatientCombobox
                  patients={patients}
                  valuePatientId={patientId}
                  onSelectPatient={handlePatientSelect}
                  disabled={pending || noBranch}
                />
                <p className="text-muted-foreground text-xs">
                  Search and pick a client to fill the fields below, or enter
                  details manually.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="appt-patient-name">Patient name</Label>
                <Input
                  id="appt-patient-name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                  disabled={pending || noBranch}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="appt-patient-contact">Contact number</Label>
                <Input
                  id="appt-patient-contact"
                  value={patientContact}
                  onChange={(e) => setPatientContact(e.target.value)}
                  disabled={pending || noBranch}
                  inputMode="tel"
                />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="appt-patient-email">Email</Label>
                <Input
                  id="appt-patient-email"
                  type="email"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  disabled={pending || noBranch}
                  autoComplete="email"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="appt-start">Start</Label>
              <Input
                id="appt-start"
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                disabled={pending || noBranch}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="appt-end">End</Label>
              <Input
                id="appt-end"
                type="datetime-local"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
                disabled={pending || noBranch}
              />
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as AppointmentStatus)}
                disabled={pending || noBranch}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPOINTMENT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {APPOINTMENT_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select
                value={appointmentType || "__none__"}
                onValueChange={(v) =>
                  setAppointmentType(v === "__none__" ? "" : v)
                }
                disabled={pending || noBranch}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {APPOINTMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {APPOINTMENT_TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="appt-notes">Notes</Label>
              <Textarea
                id="appt-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={pending || noBranch}
                rows={3}
              />
            </div>
          </div>

          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Dispensed items</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending || noBranch}
                onClick={() => setLines((prev) => [...prev, newLine()])}
              >
                <PlusIcon className="size-4" />
                Add line
              </Button>
            </div>
            {lines.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No dispensed items. Use “Add line” to record products issued for
                this visit.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border bg-background">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Product</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="min-w-[100px]">Unit price</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.key}>
                        <TableCell className="align-top">
                          <ProductCombobox
                            products={products}
                            valueProductId={
                              line.product_id || null
                            }
                            onSelectProduct={(p) =>
                              handleProductPick(line.key, p)
                            }
                            disabled={pending || noBranch}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Input
                            className="h-8"
                            type="number"
                            min={1}
                            step={1}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(line.key, {
                                quantity: e.target.value,
                              })
                            }
                            disabled={pending || noBranch}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Input
                            className="h-8"
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.unit_price}
                            onChange={(e) =>
                              updateLine(line.key, {
                                unit_price: e.target.value,
                              })
                            }
                            disabled={pending || noBranch}
                          />
                        </TableCell>
                        <TableCell className="align-top">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label="Remove line"
                            disabled={pending || noBranch}
                            onClick={() =>
                              setLines((prev) =>
                                prev.filter((r) => r.key !== line.key),
                              )
                            }
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          </div>

          <DialogFooter className="mt-0 shrink-0 border-t bg-background pt-4 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || noBranch}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
