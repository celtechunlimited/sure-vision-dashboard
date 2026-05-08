"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createBranch, updateBranch } from "@/lib/actions/branch-actions";
import type { BranchAdminRow } from "@/lib/branches/types";
import { normalizeHhmm } from "@/lib/branch-form-utils";
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

type FormState = {
  long_name: string;
  short_name: string;
  address: string;
  contact_number: string;
  contact_email: string;
  startTimeUi: string;
  endTimeUi: string;
  appointment_slot_duration: number;
};

function emptyFormState(): FormState {
  return {
    long_name: "",
    short_name: "",
    address: "",
    contact_number: "",
    contact_email: "",
    startTimeUi: "09:00",
    endTimeUi: "17:00",
    appointment_slot_duration: 60,
  };
}

function hhmmToHtmlTime(hhmm: string): string {
  const n = normalizeHhmm(hhmm).padStart(4, "0").slice(-4);
  return `${n.slice(0, 2)}:${n.slice(2, 4)}`;
}

function timeUiToHhmm(htmlTime: string): string {
  const [h, m] = htmlTime.split(":");
  return `${(h ?? "0").padStart(2, "0")}${(m ?? "00").padStart(2, "0")}`;
}

function branchToFormState(branch: BranchAdminRow): FormState {
  const oh =
    branch.operating_hours &&
    typeof branch.operating_hours === "object" &&
    !Array.isArray(branch.operating_hours)
      ? (branch.operating_hours as Record<string, unknown>)
      : {};
  const st =
    typeof oh.start_time === "string"
      ? normalizeHhmm(String(oh.start_time))
      : "0900";
  const et =
    typeof oh.end_time === "string"
      ? normalizeHhmm(String(oh.end_time))
      : "1700";

  return {
    long_name: branch.long_name,
    short_name: branch.short_name,
    address: branch.address,
    contact_number: branch.contact_number,
    contact_email: branch.contact_email,
    startTimeUi: hhmmToHtmlTime(st),
    endTimeUi: hhmmToHtmlTime(et),
    appointment_slot_duration: Number(branch.appointment_slot_duration),
  };
}

export type BranchFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  branch: BranchAdminRow | null;
};

export function BranchFormDialog({
  open,
  onOpenChange,
  mode,
  branch,
}: BranchFormDialogProps) {
  const router = useRouter();
  const [form, setForm] = React.useState<FormState>(emptyFormState);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && branch) {
      setForm(branchToFormState(branch));
    } else {
      setForm(emptyFormState());
    }
  }, [open, mode, branch]);

  function handleCancel() {
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      long_name: form.long_name,
      short_name: form.short_name,
      address: form.address,
      contact_number: form.contact_number,
      contact_email: form.contact_email,
      start_time: timeUiToHhmm(form.startTimeUi),
      end_time: timeUiToHhmm(form.endTimeUi),
      appointment_slot_duration: form.appointment_slot_duration,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createBranch(payload)
          : branch
            ? await updateBranch(branch.id, payload)
            : { ok: false as const, message: "No branch selected" };

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(
        mode === "create" ? "Branch created" : "Branch updated",
      );
      onOpenChange(false);
      router.refresh();
    });
  }

  const title = mode === "create" ? "Add branch" : "Edit branch";
  const description =
    mode === "create"
      ? "Enter details for the new branch. Status defaults to active."
      : "Update branch details.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
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
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="branch-long-name">Long name</Label>
            <Input
              id="branch-long-name"
              value={form.long_name}
              onChange={(e) =>
                setForm((s) => ({ ...s, long_name: e.target.value }))
              }
              required
              autoComplete="organization"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="branch-short-name">Short name</Label>
            <Input
              id="branch-short-name"
              value={form.short_name}
              onChange={(e) =>
                setForm((s) => ({ ...s, short_name: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="branch-address">Address</Label>
            <Input
              id="branch-address"
              value={form.address}
              onChange={(e) =>
                setForm((s) => ({ ...s, address: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="branch-phone">Contact number</Label>
              <Input
                id="branch-phone"
                value={form.contact_number}
                onChange={(e) =>
                  setForm((s) => ({ ...s, contact_number: e.target.value }))
                }
                required
                inputMode="tel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="branch-email">Contact email</Label>
              <Input
                id="branch-email"
                type="email"
                value={form.contact_email}
                onChange={(e) =>
                  setForm((s) => ({ ...s, contact_email: e.target.value }))
                }
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-2">
              <Label htmlFor="branch-start">Opens</Label>
              <Input
                id="branch-start"
                type="time"
                value={form.startTimeUi}
                onChange={(e) =>
                  setForm((s) => ({ ...s, startTimeUi: e.target.value }))
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="branch-end">Closes</Label>
              <Input
                id="branch-end"
                type="time"
                value={form.endTimeUi}
                onChange={(e) =>
                  setForm((s) => ({ ...s, endTimeUi: e.target.value }))
                }
                required
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="branch-slot">Appointment slot (minutes)</Label>
            <Input
              id="branch-slot"
              type="number"
              min={1}
              max={1440}
              step={1}
              value={form.appointment_slot_duration || ""}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  appointment_slot_duration: Number(e.target.value),
                }))
              }
              required
            />
          </div>
          <DialogFooter className="space-x-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
