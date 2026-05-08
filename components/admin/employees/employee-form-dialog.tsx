"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createEmployeeUser,
  updateEmployeeRecord,
} from "@/lib/actions/employee-actions";
import type {
  EmployeeBranchOption,
  EmployeeDirectoryRow,
} from "@/lib/employees/types";
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
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const UNASSIGNED_BRANCH = "__none__";

type EmployeeRole = "manager" | "staff";

type CreateFormState = {
  email: string;
  password: string;
  branch_id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  prefix: string;
  employee_role: EmployeeRole;
};

type EditFormState = {
  first_name: string;
  middle_name: string;
  last_name: string;
  prefix: string;
  employee_role: EmployeeRole;
};

function emptyCreateForm(): CreateFormState {
  return {
    email: "",
    password: "",
    branch_id: UNASSIGNED_BRANCH,
    first_name: "",
    middle_name: "",
    last_name: "",
    prefix: "",
    employee_role: "staff",
  };
}

function rowToEditForm(row: EmployeeDirectoryRow): EditFormState {
  return {
    first_name: row.first_name?.trim() ?? "",
    middle_name: row.middle_name?.trim() ?? "",
    last_name: row.last_name?.trim() ?? "",
    prefix: row.prefix?.trim() ?? "",
    employee_role:
      row.employee_role === "manager" || row.employee_role === "staff"
        ? row.employee_role
        : "staff",
  };
}

export type EmployeeFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  row: EmployeeDirectoryRow | null;
  branches: EmployeeBranchOption[];
  variant?: "admin" | "branch";
  viewerUserId?: string | null;
  viewerIsManager?: boolean;
};

export function EmployeeFormDialog({
  open,
  onOpenChange,
  mode,
  row,
  branches,
  variant = "admin",
  viewerUserId = null,
  viewerIsManager = false,
}: EmployeeFormDialogProps) {
  const router = useRouter();
  const [createForm, setCreateForm] = React.useState<CreateFormState>(
    emptyCreateForm,
  );
  const [editForm, setEditForm] = React.useState<EditFormState>({
    first_name: "",
    middle_name: "",
    last_name: "",
    prefix: "",
    employee_role: "staff",
  });
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && row) {
      setEditForm(rowToEditForm(row));
    } else if (mode === "create") {
      setCreateForm(emptyCreateForm());
    }
  }, [open, mode, row]);

  function handleCancel() {
    onOpenChange(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (variant === "branch" && mode === "create") {
      toast.error("Creating employees is not available here.");
      return;
    }
    if (mode === "edit") {
      if (!row) {
        toast.error("No employee selected");
        return;
      }
      startTransition(async () => {
        const result = await updateEmployeeRecord({
          employeeId: row.employee_id,
          first_name: editForm.first_name,
          middle_name: editForm.middle_name.trim() || null,
          last_name: editForm.last_name,
          prefix: editForm.prefix,
          employee_role: editForm.employee_role,
        });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success("Employee updated");
        onOpenChange(false);
        router.refresh();
      });
      return;
    }

    startTransition(async () => {
      const branchId =
        createForm.branch_id === UNASSIGNED_BRANCH
          ? null
          : createForm.branch_id;
      const result = await createEmployeeUser({
        email: createForm.email.trim(),
        password: createForm.password,
        first_name: createForm.first_name.trim(),
        middle_name: createForm.middle_name.trim() || undefined,
        last_name: createForm.last_name.trim(),
        prefix: createForm.prefix.trim(),
        employee_role: createForm.employee_role,
        branch_id: branchId,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Employee created");
      onOpenChange(false);
      router.refresh();
    });
  }

  const title = mode === "create" ? "Add employee" : "Edit employee";
  const description =
    mode === "create"
      ? "Creates a sign-in for this employee via the server. Initial branch is optional."
      : "Update name, prefix, and role on the employee record.";

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
          {variant === "admin" && mode === "create" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="emp-email">Email</Label>
                  <Input
                    id="emp-email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, email: e.target.value }))
                    }
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-password">Temporary password</Label>
                  <Input
                    id="emp-password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, password: e.target.value }))
                    }
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-branch">Initial branch</Label>
                  <Select
                    value={createForm.branch_id}
                    onValueChange={(value) =>
                      setCreateForm((s) => ({ ...s, branch_id: value }))
                    }
                  >
                    <SelectTrigger id="emp-branch" size="default">
                      <SelectValue placeholder="Branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value={UNASSIGNED_BRANCH}>
                          Unassigned
                        </SelectItem>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.long_name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="emp-fn">First name</Label>
                    <Input
                      id="emp-fn"
                      value={createForm.first_name}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          first_name: e.target.value,
                        }))
                      }
                      required
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emp-mn">Middle name</Label>
                    <Input
                      id="emp-mn"
                      value={createForm.middle_name}
                      onChange={(e) =>
                        setCreateForm((s) => ({
                          ...s,
                          middle_name: e.target.value,
                        }))
                      }
                      autoComplete="additional-name"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="emp-ln">Last name</Label>
                  <Input
                    id="emp-ln"
                    value={createForm.last_name}
                    onChange={(e) =>
                      setCreateForm((s) => ({ ...s, last_name: e.target.value }))
                    }
                    required
                    autoComplete="family-name"
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="emp-prefix">Prefix</Label>
                    <Input
                      id="emp-prefix"
                      value={createForm.prefix}
                      onChange={(e) =>
                        setCreateForm((s) => ({ ...s, prefix: e.target.value }))
                      }
                      required
                      placeholder="e.g. Dr."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="emp-role">Role</Label>
                    <Select
                      value={createForm.employee_role}
                      onValueChange={(value: EmployeeRole) =>
                        setCreateForm((s) => ({
                          ...s,
                          employee_role: value,
                        }))
                      }
                    >
                      <SelectTrigger id="emp-role" size="default">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : row ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Account:{" "}
                  <span className="font-medium text-foreground">{row.email}</span>
                </p>
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-fn">First name</Label>
                    <Input
                      id="edit-fn"
                      value={editForm.first_name}
                      onChange={(e) =>
                        setEditForm((s) => ({ ...s, first_name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-mn">Middle name</Label>
                    <Input
                      id="edit-mn"
                      value={editForm.middle_name}
                      onChange={(e) =>
                        setEditForm((s) => ({
                          ...s,
                          middle_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-ln">Last name</Label>
                  <Input
                    id="edit-ln"
                    value={editForm.last_name}
                    onChange={(e) =>
                      setEditForm((s) => ({ ...s, last_name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-prefix">Prefix</Label>
                    <Input
                      id="edit-prefix"
                      value={editForm.prefix}
                      onChange={(e) =>
                        setEditForm((s) => ({ ...s, prefix: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-role">Role</Label>
                    {variant === "branch" &&
                    row.user_id === viewerUserId &&
                    !viewerIsManager ? (
                      <Input
                        id="edit-role"
                        readOnly
                        className="bg-muted capitalize"
                        value={editForm.employee_role}
                      />
                    ) : (
                      <Select
                        value={editForm.employee_role}
                        onValueChange={(value: EmployeeRole) =>
                          setEditForm((s) => ({ ...s, employee_role: value }))
                        }
                      >
                        <SelectTrigger id="edit-role" size="default">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          <DialogFooter className="space-x-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || (mode === "edit" && !row)}>
              {pending
                ? "Saving…"
                : mode === "create" && variant === "admin"
                  ? "Create"
                  : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
