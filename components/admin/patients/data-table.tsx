"use client";

import * as React from "react";
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
} from "@/lib/actions/patient-actions";
import type {
  PatientAccountStatus,
  PatientDirectoryRow,
} from "@/lib/patients/types";
import { PatientFormDialog } from "@/components/admin/patients/patient-form-dialog";
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

function formatPatientName(row: PatientDirectoryRow): string {
  const parts = [row.first_name, row.middle_name, row.last_name].filter(
    (p): p is string => Boolean(p && String(p).trim()),
  );
  return parts.length ? parts.join(" ") : "—";
}

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

function patientColumns(
  handlers: {
    onEdit: (row: PatientDirectoryRow) => void;
    onDeactivate: (row: PatientDirectoryRow) => void;
    onReactivate: (row: PatientDirectoryRow) => void;
  },
  allowAccountMutations: boolean,
) {
  const cols: ColumnDef<PatientDirectoryRow>[] = [
    {
      id: "name",
      accessorFn: (row) => formatPatientName(row),
      header: ({ column }) => (
        <PatientColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{formatPatientName(row.original)}</span>
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
    {
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
    },
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
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
  return cols;
}

type AccountFilterValue = "all" | PatientAccountStatus;

export function DataTable({
  data: initialData,
  variant = "admin",
}: {
  data: PatientDirectoryRow[];
  variant?: "admin" | "branch";
}) {
  const allowAccountMutations = variant === "admin";
  const router = useRouter();
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

  const handleReactivate = React.useCallback(
    (row: PatientDirectoryRow) => {
      if (!row.user_id) return;
      startReactivate(async () => {
        const result = await activatePatientUser(row.user_id);
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
    setData(initialData);
  }, [initialData]);

  const filteredData = React.useMemo(() => {
    if (accountFilter === "all") return data;
    return data.filter((r) => r.account_status === accountFilter);
  }, [data, accountFilter]);

  const columns = React.useMemo(
    () =>
      patientColumns(
        {
          onEdit: openEdit,
          onDeactivate: openDeactivate,
          onReactivate: handleReactivate,
        },
        allowAccountMutations,
      ),
    [openEdit, openDeactivate, handleReactivate, allowAccountMutations],
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
    globalFilterFn: patientGlobalFilter,
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
  }, [accountFilter, globalFilter]);

  const accountFilterLabel = React.useMemo(() => {
    if (accountFilter === "all") return "All statuses";
    return statusLabel(accountFilter);
  }, [accountFilter]);

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
          <Button variant="outline" size="sm" type="button" onClick={openCreate}>
            <PlusIcon />
            <span className="hidden lg:inline">Add patient</span>
          </Button>
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
            {accountFilter !== "all" || globalFilter.trim()
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
