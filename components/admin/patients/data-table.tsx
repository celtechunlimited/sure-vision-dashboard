"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type Row,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Columns3Icon,
  EllipsisVerticalIcon,
  FilterIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  activatePatientUser,
  deactivatePatientUser,
  permanentlyDeletePatientRecord,
  restorePatientRecord,
  setPatientBranches,
  softDeletePatientRecord,
} from "@/lib/actions/patient-actions";
import {
  formatPatientName,
  patientNameSortKey,
} from "@/lib/patients/format-name";
import type {
  PatientAccountStatus,
  PatientDirectoryRow,
} from "@/lib/patients/types";
import type { EmployeeBranchOption } from "@/lib/employees/types";
import { PatientFormDialog } from "@/components/admin/patients/patient-form-dialog";
import {
  BranchChips,
  BranchMultiSelect,
} from "@/components/branches/branch-multi-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function formatDateOnly(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(d);
}

function statusLabel(s: PatientAccountStatus): string {
  if (s === "no_account") return "No account";
  if (s === "inactive") return "Inactive";
  return "Active";
}

const patientGlobalFilter: FilterFn<PatientDirectoryRow> = (
  row,
  _columnId,
  value,
) => {
  const q = String(value ?? "").trim().toLowerCase();
  if (!q) return true;
  const v = row.original;
  const haystack = [
    v.patient_id,
    v.user_id,
    formatPatientName(v),
    v.first_name,
    v.middle_name,
    v.last_name,
    v.email,
    v.contact_number,
    v.date_of_birth,
    v.date_of_birth ? formatDateOnly(v.date_of_birth) : "",
    v.address,
    v.user_type,
    v.account_status,
    ...(v.branch_short_names ?? []),
    ...(v.branch_long_names ?? []),
    statusLabel(v.account_status),
    v.user_is_active == null ? "" : v.user_is_active ? "active" : "inactive",
    formatDateTime(v.patient_created_at),
    v.user_created_at ? formatDateTime(v.user_created_at) : "",
  ]
    .filter((x) => x != null && String(x).length > 0)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
};

const patientGlobalFilterBranch: FilterFn<PatientDirectoryRow> = (
  row,
  _columnId,
  value,
) => {
  const q = String(value ?? "").trim().toLowerCase();
  if (!q) return true;
  const v = row.original;
  const haystack = [
    v.patient_id,
    v.user_id,
    formatPatientName(v),
    v.first_name,
    v.middle_name,
    v.last_name,
    v.email,
    v.contact_number,
    v.date_of_birth,
    v.date_of_birth ? formatDateOnly(v.date_of_birth) : "",
    v.address,
    v.user_type,
    formatDateTime(v.patient_created_at),
    v.user_created_at ? formatDateTime(v.user_created_at) : "",
  ]
    .filter((x) => x != null && String(x).length > 0)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
};

function PatientColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}) {
  if (!column.getCanSort()) {
    return <span className={cn("text-sm font-medium", className)}>{title}</span>;
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("-ml-3 h-8 data-[state=open]:bg-accent", className)}
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      <span>{title}</span>
      {column.getIsSorted() === "desc" ? (
        <ArrowDownIcon className="ml-2 size-4 shrink-0" />
      ) : column.getIsSorted() === "asc" ? (
        <ArrowUpIcon className="ml-2 size-4 shrink-0" />
      ) : (
        <ArrowUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
      )}
    </Button>
  );
}

function PatientBranchAssignCell({
  row,
  branches,
}: {
  row: Row<PatientDirectoryRow>;
  branches: EmployeeBranchOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const original = row.original;
  const [value, setValue] = React.useState(original.branch_ids ?? []);

  React.useEffect(() => {
    setValue(original.branch_ids ?? []);
  }, [original.branch_ids]);

  return (
    <BranchMultiSelect
      branches={branches}
      value={value}
      disabled={pending}
      placeholder="Assign branches"
      className="w-[220px]"
      onChange={(next) => {
        setValue(next);
        startTransition(async () => {
          const res = await setPatientBranches({
            patientId: original.patient_id,
            branchIds: next,
          });
          if (!res.ok) {
            toast.error(res.message);
            setValue(original.branch_ids ?? []);
            return;
          }
          toast.success("Branches updated");
          router.refresh();
        });
      }}
    />
  );
}

function patientColumns(
  handlers: {
    onEdit: (row: PatientDirectoryRow) => void;
    onDeactivate: (row: PatientDirectoryRow) => void;
    onReactivate: (row: PatientDirectoryRow) => void;
    onDelete: (row: PatientDirectoryRow) => void;
    onRestore: (row: PatientDirectoryRow) => void;
    onPermanentDelete: (row: PatientDirectoryRow) => void;
  },
  allowAccountMutations: boolean,
  showStatusColumn: boolean,
  showBranchColumn: boolean,
  branches: EmployeeBranchOption[],
  viewingDeleted: boolean,
  isSuperAdmin: boolean,
) {
  const statusColumn: ColumnDef<PatientDirectoryRow> = {
    accessorKey: "account_status",
    header: ({ column }) => (
      <PatientColumnHeader column={column} title="Status" />
    ),
    cell: ({ row }) => {
      const s = row.original.account_status;
      const dot =
        s === "active"
          ? "bg-emerald-500"
          : s === "inactive"
            ? "bg-red-500"
            : "bg-muted-foreground";
      return (
        <Badge variant="outline" className="gap-1.5 font-normal">
          <span className={cn("size-1.5 rounded-full", dot)} />
          {statusLabel(s)}
        </Badge>
      );
    },
  };

  const cols: ColumnDef<PatientDirectoryRow>[] = [
    {
      id: "name",
      accessorFn: (row) => patientNameSortKey(row),
      header: ({ column }) => (
        <PatientColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <Link
          href={`/patients/${row.original.patient_id}`}
          className="font-medium hover:underline"
        >
          {formatPatientName(row.original)}
        </Link>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <PatientColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => {
        const email = row.original.email;
        if (!email) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <span className="max-w-[220px] truncate" title={email}>
            {email}
          </span>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "contact_number",
      header: ({ column }) => (
        <PatientColumnHeader column={column} title="Contact" />
      ),
      cell: ({ row }) => row.original.contact_number ?? "—",
    },
    {
      accessorKey: "date_of_birth",
      header: ({ column }) => (
        <PatientColumnHeader column={column} title="Date of birth" />
      ),
      cell: ({ row }) => formatDateOnly(row.original.date_of_birth),
    },
    {
      accessorKey: "patient_created_at",
      header: ({ column }) => (
        <PatientColumnHeader column={column} title="Registered" />
      ),
      cell: ({ row }) => formatDateTime(row.original.patient_created_at),
    },
    ...(showBranchColumn
      ? [
          {
            id: "branches",
            accessorFn: (row: PatientDirectoryRow) =>
              (row.branch_short_names ?? []).join(", "),
            header: ({ column }: { column: Column<PatientDirectoryRow, unknown> }) => (
              <PatientColumnHeader column={column} title="Branches" />
            ),
            cell: ({ row }: { row: Row<PatientDirectoryRow> }) =>
              allowAccountMutations ? (
                <PatientBranchAssignCell row={row} branches={branches} />
              ) : (
                <BranchChips
                  shortNames={row.original.branch_short_names ?? []}
                  longNames={row.original.branch_long_names ?? []}
                />
              ),
          } satisfies ColumnDef<PatientDirectoryRow>,
        ]
      : []),
    ...(showStatusColumn ? [statusColumn] : []),
    {
      id: "actions",
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const r = row.original;
        const hasAccount = r.account_status !== "no_account";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex size-8 text-muted-foreground data-[state=open]:bg-muted"
                size="icon"
              >
                <EllipsisVerticalIcon />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {!viewingDeleted ? (
                <>
                  <DropdownMenuItem onSelect={() => handlers.onEdit(r)}>
                    Edit
                  </DropdownMenuItem>
                  {allowAccountMutations && hasAccount ? (
                    <>
                      <DropdownMenuSeparator />
                      {r.account_status === "active" ? (
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => handlers.onDeactivate(r)}
                        >
                          Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          onSelect={() => handlers.onReactivate(r)}
                        >
                          Reactivate
                        </DropdownMenuItem>
                      )}
                    </>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => handlers.onDelete(r)}
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  {isSuperAdmin ? (
                    <>
                      <DropdownMenuItem onSelect={() => handlers.onRestore(r)}>
                        Restore
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => handlers.onPermanentDelete(r)}
                      >
                        Delete permanently
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
  return cols;
}

type AccountFilterValue = "all" | PatientAccountStatus;
type BranchFilterValue = "all" | "unassigned" | string;

export function DataTable({
  data: initialData,
  deletedData = [],
  variant = "admin",
  branches = [],
  autoAssignBranchId = null,
  autoAssignBranchLabel = null,
  isSuperAdmin = false,
}: {
  data: PatientDirectoryRow[];
  deletedData?: PatientDirectoryRow[];
  variant?: "admin" | "branch";
  branches?: EmployeeBranchOption[];
  autoAssignBranchId?: string | null;
  autoAssignBranchLabel?: string | null;
  isSuperAdmin?: boolean;
}) {
  const allowAccountMutations = variant === "admin";
  const showStatusColumn = variant === "admin";
  const router = useRouter();
  const [showDeleted, setShowDeleted] = React.useState(false);
  const [data, setData] = React.useState(initialData);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [accountFilter, setAccountFilter] =
    React.useState<AccountFilterValue>("all");
  const [branchFilter, setBranchFilter] =
    React.useState<BranchFilterValue>("all");
  const [columnFilters, setColumnFilters] =
    React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] =
    React.useState<PatientDirectoryRow | null>(null);

  const openCreate = React.useCallback(() => {
    setFormMode("create");
    setEditingRow(null);
    setFormOpen(true);
  }, []);

  const openEdit = React.useCallback((row: PatientDirectoryRow) => {
    setFormMode("edit");
    setEditingRow(row);
    setFormOpen(true);
  }, []);

  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [deactivateTarget, setDeactivateTarget] =
    React.useState<PatientDirectoryRow | null>(null);
  const [deactivatePending, startDeactivate] = React.useTransition();

  const openDeactivate = React.useCallback((row: PatientDirectoryRow) => {
    setDeactivateTarget(row);
    setDeactivateOpen(true);
  }, []);

  const [, startReactivate] = React.useTransition();

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] =
    React.useState<PatientDirectoryRow | null>(null);
  const [deletePending, startDelete] = React.useTransition();

  const [permanentDeleteOpen, setPermanentDeleteOpen] = React.useState(false);
  const [permanentDeleteTarget, setPermanentDeleteTarget] =
    React.useState<PatientDirectoryRow | null>(null);
  const [permanentDeletePending, startPermanentDelete] = React.useTransition();

  const [, startRestore] = React.useTransition();

  const openDelete = React.useCallback((row: PatientDirectoryRow) => {
    setDeleteTarget(row);
    setDeleteOpen(true);
  }, []);

  const openPermanentDelete = React.useCallback((row: PatientDirectoryRow) => {
    setPermanentDeleteTarget(row);
    setPermanentDeleteOpen(true);
  }, []);

  const handleRestore = React.useCallback(
    (row: PatientDirectoryRow) => {
      startRestore(async () => {
        const result = await restorePatientRecord({
          patientId: row.patient_id,
        });
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success("Patient restored");
        router.refresh();
      });
    },
    [router],
  );

  const handleReactivate = React.useCallback(
    (row: PatientDirectoryRow) => {
      const userId = row.user_id;
      if (!userId) return;
      startReactivate(async () => {
        const result = await activatePatientUser(userId);
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success("Patient account reactivated");
        router.refresh();
      });
    },
    [router],
  );

  React.useEffect(() => {
    setData(showDeleted ? deletedData : initialData);
  }, [initialData, deletedData, showDeleted]);

  const filteredData = React.useMemo(() => {
    let rows = data;
    if (!showDeleted && showStatusColumn && accountFilter !== "all") {
      rows = rows.filter((r) => r.account_status === accountFilter);
    }
    if (!showDeleted && showStatusColumn) {
      if (branchFilter === "unassigned") {
        rows = rows.filter((r) => (r.branch_ids ?? []).length === 0);
      } else if (branchFilter !== "all") {
        rows = rows.filter((r) => (r.branch_ids ?? []).includes(branchFilter));
      }
    }
    return rows;
  }, [data, accountFilter, branchFilter, showStatusColumn, showDeleted]);

  const columns = React.useMemo(
    () =>
      patientColumns(
        {
          onEdit: openEdit,
          onDeactivate: openDeactivate,
          onReactivate: handleReactivate,
          onDelete: openDelete,
          onRestore: handleRestore,
          onPermanentDelete: openPermanentDelete,
        },
        allowAccountMutations,
        showStatusColumn,
        showStatusColumn,
        branches,
        showDeleted,
        isSuperAdmin,
      ),
    [
      openEdit,
      openDeactivate,
      handleReactivate,
      openDelete,
      handleRestore,
      openPermanentDelete,
      allowAccountMutations,
      showStatusColumn,
      branches,
      showDeleted,
      isSuperAdmin,
    ],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: showStatusColumn
      ? patientGlobalFilter
      : patientGlobalFilterBranch,
    getRowId: (row) => row.patient_id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  React.useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [accountFilter, branchFilter, globalFilter]);

  const accountFilterLabel = React.useMemo(() => {
    if (accountFilter === "all") return "All statuses";
    return statusLabel(accountFilter);
  }, [accountFilter]);

  const branchFilterLabel = React.useMemo(() => {
    if (branchFilter === "all") return "All branches";
    if (branchFilter === "unassigned") return "Unassigned";
    return (
      branches.find((b) => b.id === branchFilter)?.short_name ?? "Branch"
    );
  }, [branchFilter, branches]);

  return (
    <div className="flex w-full flex-col gap-6">
      <PatientFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingRow(null);
        }}
        mode={formMode}
        row={formMode === "edit" ? editingRow : null}
        variant={variant}
        branches={branches}
        autoAssignBranchId={autoAssignBranchId}
        autoAssignBranchLabel={autoAssignBranchLabel}
      />

      {allowAccountMutations ? (
        <AlertDialog
          open={deactivateOpen}
          onOpenChange={(next) => {
            if (!deactivatePending) setDeactivateOpen(next);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate patient account?</AlertDialogTitle>
              <AlertDialogDescription>
                {deactivateTarget
                  ? `“${formatPatientName(deactivateTarget)}”${
                      deactivateTarget.email
                        ? ` (${deactivateTarget.email})`
                        : ""
                    } will be marked inactive. They can be reactivated later.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deactivatePending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={deactivatePending || !deactivateTarget?.user_id}
                onClick={(e) => {
                  e.preventDefault();
                  const uid = deactivateTarget?.user_id;
                  if (!uid) return;
                  startDeactivate(async () => {
                    const result = await deactivatePatientUser(uid);
                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }
                    toast.success("Patient account deactivated");
                    setDeactivateOpen(false);
                    setDeactivateTarget(null);
                    router.refresh();
                  });
                }}
              >
                {deactivatePending ? "Deactivating…" : "Deactivate"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(next) => {
          if (!deletePending) setDeleteOpen(next);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete patient?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `"${formatPatientName(deleteTarget)}" will be removed from patient lists. A super admin can restore or permanently delete the record later.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletePending || !deleteTarget}
              onClick={(e) => {
                e.preventDefault();
                if (!deleteTarget) return;
                startDelete(async () => {
                  const result = await softDeletePatientRecord({
                    patientId: deleteTarget.patient_id,
                  });
                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Patient deleted");
                  setDeleteOpen(false);
                  setDeleteTarget(null);
                  router.refresh();
                });
              }}
            >
              {deletePending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isSuperAdmin ? (
        <AlertDialog
          open={permanentDeleteOpen}
          onOpenChange={(next) => {
            if (!permanentDeletePending) setPermanentDeleteOpen(next);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete patient?</AlertDialogTitle>
              <AlertDialogDescription>
                {permanentDeleteTarget
                  ? `"${formatPatientName(permanentDeleteTarget)}" and all associated files, folders, and activity logs will be permanently removed. Appointments will keep their snapshot data but lose the patient link. This cannot be undone.`
                  : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={permanentDeletePending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={permanentDeletePending || !permanentDeleteTarget}
                onClick={(e) => {
                  e.preventDefault();
                  if (!permanentDeleteTarget) return;
                  startPermanentDelete(async () => {
                    const result = await permanentlyDeletePatientRecord({
                      patientId: permanentDeleteTarget.patient_id,
                    });
                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }
                    toast.success("Patient permanently deleted");
                    setPermanentDeleteOpen(false);
                    setPermanentDeleteTarget(null);
                    router.refresh();
                  });
                }}
              >
                {permanentDeletePending ? "Deleting…" : "Delete permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <Input
          placeholder="Filter patients…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3Icon data-icon="inline-start" />
                Columns
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide(),
                )
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {String(column.id).replace(/_/g, " ")}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {showStatusColumn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FilterIcon data-icon="inline-start" />
                  {branchFilterLabel}
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => setBranchFilter("all")}>
                  All branches
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setBranchFilter("unassigned")}>
                  Unassigned
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {branches.map((b) => (
                  <DropdownMenuItem
                    key={b.id}
                    onSelect={() => setBranchFilter(b.id)}
                  >
                    {b.long_name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {showStatusColumn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <FilterIcon data-icon="inline-start" />
                  {accountFilterLabel}
                  <ChevronDownIcon data-icon="inline-end" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onSelect={() => setAccountFilter("all")}>
                  All statuses
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setAccountFilter("active")}>
                  Active
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setAccountFilter("inactive")}>
                  Inactive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setAccountFilter("no_account")}
                >
                  No account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
          {isSuperAdmin ? (
            <Button
              variant={showDeleted ? "default" : "outline"}
              size="sm"
              type="button"
              onClick={() => setShowDeleted((v) => !v)}
            >
              {showDeleted ? "Active patients" : "Deleted patients"}
            </Button>
          ) : null}
          {!showDeleted ? (
            <Button variant="outline" size="sm" type="button" onClick={openCreate}>
              <PlusIcon />
              <span className="hidden lg:inline">Add patient</span>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="relative flex flex-col gap-4 overflow-auto px-4 lg:px-6">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      showStatusColumn &&
                        row.original.account_status === "inactive" &&
                        "text-muted-foreground",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="hidden flex-1 text-sm text-muted-foreground lg:flex">
            {table.getFilteredRowModel().rows.length} patient
            {table.getFilteredRowModel().rows.length === 1 ? "" : "s"}
            {showStatusColumn && accountFilter !== "all"
              ? " (filtered)"
              : globalFilter.trim()
                ? " (filtered)"
                : ""}
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
              <Label htmlFor="patient-rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger
                  size="sm"
                  className="w-20"
                  id="patient-rows-per-page"
                >
                  <SelectValue
                    placeholder={table.getState().pagination.pageSize}
                  />
                </SelectTrigger>
                <SelectContent side="top">
                  <SelectGroup>
                    {[10, 20, 30, 40, 50].map((pageSize) => (
                      <SelectItem key={pageSize} value={`${pageSize}`}>
                        {pageSize}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount() || 1}
            </div>
            <div className="ml-auto flex items-center gap-2 lg:ml-0">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to first page</span>
                <ChevronsLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                <span className="sr-only">Go to previous page</span>
                <ChevronLeftIcon />
              </Button>
              <Button
                variant="outline"
                className="size-8"
                size="icon"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to next page</span>
                <ChevronRightIcon />
              </Button>
              <Button
                variant="outline"
                className="hidden size-8 lg:flex"
                size="icon"
                onClick={() =>
                  table.setPageIndex(Math.max(0, table.getPageCount() - 1))
                }
                disabled={!table.getCanNextPage()}
              >
                <span className="sr-only">Go to last page</span>
                <ChevronsRightIcon />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
