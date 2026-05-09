"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Columns3Icon,
  EllipsisVerticalIcon,
  PlusIcon,
} from "lucide-react";

import { AppointmentFormDialog } from "@/components/appointments/appointment-form-dialog";
import { PatientCombobox } from "@/components/appointments/patient-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
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
import type {
  AppointmentRow,
  AppointmentStatus,
  DispensedItemRow,
} from "@/lib/appointments/types";
import {
  APPOINTMENT_STATUSES,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_TYPE_LABELS,
} from "@/lib/appointments/types";
import type { PatientDirectoryRow } from "@/lib/patients/types";
import type { ProductInventoryRow } from "@/lib/products/types";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function statusLabel(s: string | null): string {
  if (!s) return "—";
  const k = s as AppointmentStatus;
  return APPOINTMENT_STATUS_LABELS[k] ?? s;
}

function typeLabel(s: string | null): string {
  if (!s) return "—";
  return APPOINTMENT_TYPE_LABELS[s as keyof typeof APPOINTMENT_TYPE_LABELS] ?? s;
}

const statusEquals: FilterFn<AppointmentRow> = (row, columnId, filterValue) => {
  const v = filterValue as string | undefined;
  if (!v || v === "__all__") return true;
  return row.getValue(columnId) === v;
};

const patientIdEquals: FilterFn<AppointmentRow> = (row, columnId, filterValue) => {
  const v = filterValue as string | undefined;
  if (!v || v === "__all__") return true;
  return row.getValue(columnId) === v;
};

const appointmentGlobalFilter: FilterFn<AppointmentRow> = (
  row,
  _columnId,
  value,
) => {
  const q = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!q) return true;
  const r = row.original;
  const haystack = [
    r.id,
    r.branch_id,
    r.patient_id,
    r.patient_name,
    r.patient_contact_number,
    r.patient_email,
    r.status,
    statusLabel(r.status),
    r.appointment_type,
    typeLabel(r.appointment_type),
    r.notes,
    r.created_by,
    formatDate(r.created_at),
    formatDate(r.start_time),
    formatDate(r.end_time),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
};

const baseColumns: ColumnDef<AppointmentRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs" title={row.original.id}>
        {`${row.original.id.slice(0, 8)}…`}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    accessorKey: "branch_id",
    header: "Branch",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.branch_id
          ? `${row.original.branch_id.slice(0, 8)}…`
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "patient_id",
    id: "patient_id",
    header: "Patient ID",
    filterFn: patientIdEquals,
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.patient_id
          ? `${row.original.patient_id.slice(0, 8)}…`
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "patient_name",
    header: "Patient name",
    cell: ({ row }) => (
      <span className="max-w-[180px] truncate font-medium">
        {row.original.patient_name?.trim() ? row.original.patient_name : "—"}
      </span>
    ),
  },
  {
    accessorKey: "patient_contact_number",
    header: "Contact",
    cell: ({ row }) => row.original.patient_contact_number ?? "—",
  },
  {
    accessorKey: "patient_email",
    header: "Email",
    cell: ({ row }) => (
      <span className="max-w-[160px] truncate">
        {row.original.patient_email?.trim() ? row.original.patient_email : "—"}
      </span>
    ),
  },
  {
    accessorKey: "start_time",
    header: "Start",
    cell: ({ row }) => formatDate(row.original.start_time),
  },
  {
    accessorKey: "end_time",
    header: "End",
    cell: ({ row }) => formatDate(row.original.end_time),
  },
  {
    accessorKey: "status",
    id: "status",
    header: "Status",
    filterFn: statusEquals,
    cell: ({ row }) => {
      const s = String(row.original.status ?? "");
      return (
        <Badge variant="outline" className="font-normal">
          {statusLabel(s)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "appointment_type",
    header: "Type",
    cell: ({ row }) => typeLabel(row.original.appointment_type as string | null),
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => (
      <span
        className="max-w-[160px] truncate text-muted-foreground text-sm"
        title={row.original.notes ?? ""}
      >
        {row.original.notes?.trim() ? row.original.notes : "—"}
      </span>
    ),
  },
  {
    accessorKey: "created_by",
    header: "Created by",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.created_by
          ? `${row.original.created_by.slice(0, 8)}…`
          : "—"}
      </span>
    ),
  },
];

function actionsColumn(handlers: {
  onEdit: (row: AppointmentRow) => void;
}): ColumnDef<AppointmentRow> {
  return {
    id: "actions",
    cell: ({ row }) => (
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
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => handlers.onEdit(row.original)}>
            Edit
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };
}

export type AppointmentsDataTableProps = {
  data: AppointmentRow[];
  dispensedByAppointment: Record<string, DispensedItemRow[]>;
  patients: PatientDirectoryRow[];
  products: ProductInventoryRow[];
  defaultBranchId: string | null;
};

export function DataTable({
  data,
  dispensedByAppointment,
  patients,
  products,
  defaultBranchId,
}: AppointmentsDataTableProps) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      id: false,
      branch_id: false,
      patient_id: false,
      created_by: false,
    });
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "created_at", desc: true },
  ]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = React.useState("");

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editingAppointment, setEditingAppointment] =
    React.useState<AppointmentRow | null>(null);

  const initialDispensed = React.useMemo(() => {
    if (!editingAppointment) return [];
    return dispensedByAppointment[editingAppointment.id] ?? [];
  }, [editingAppointment, dispensedByAppointment]);

  const openCreate = React.useCallback(() => {
    setFormMode("create");
    setEditingAppointment(null);
    setFormOpen(true);
  }, []);

  const openEdit = React.useCallback((row: AppointmentRow) => {
    setFormMode("edit");
    setEditingAppointment(row);
    setFormOpen(true);
  }, []);

  const columns = React.useMemo(
    () => [...baseColumns, actionsColumn({ onEdit: openEdit })],
    [openEdit],
  );

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
      globalFilter,
    },
    getRowId: (row) => row.id,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: appointmentGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const statusFilter =
    (table.getColumn("status")?.getFilterValue() as string | undefined) ??
    "__all__";

  const patientIdFilter = table.getColumn("patient_id")?.getFilterValue() as
    | string
    | undefined;

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <Input
          placeholder="Filter appointments…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          <PatientCombobox
            purpose="filter"
            patients={patients}
            valuePatientId={patientIdFilter ?? null}
            onSelectPatient={(p) =>
              table
                .getColumn("patient_id")
                ?.setFilterValue(p?.patient_id ?? undefined)
            }
            triggerClassName="w-[min(100%,280px)] shrink-0 sm:w-[240px]"
          />
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              table
                .getColumn("status")
                ?.setFilterValue(v === "__all__" ? undefined : v);
            }}
          >
            <SelectTrigger
              className="w-[200px]"
              size="sm"
              aria-label="Appointment status"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__all__">All statuses</SelectItem>
                {APPOINTMENT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {APPOINTMENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
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
                    {column.id.replace(/_/g, " ")}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={openCreate}
            disabled={!defaultBranchId}
            title={
              !defaultBranchId
                ? "Select a branch in the sidebar to add appointments"
                : undefined
            }
          >
            <PlusIcon />
            <span className="hidden lg:inline">Add appointment</span>
          </Button>
        </div>
      </div>

      <AppointmentFormDialog
        key={formMode === "edit" && editingAppointment ? editingAppointment.id : "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        branchId={defaultBranchId}
        appointment={editingAppointment}
        initialDispensed={initialDispensed}
        patients={patients}
        products={products}
      />

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
                  <TableRow key={row.id}>
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
                    No appointments found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} appointment
            {table.getFilteredRowModel().rows.length === 1 ? "" : "s"}
          </div>
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:gap-8">
            <div className="flex items-center gap-2">
              <Label htmlFor="appt-rows-per-page" className="text-sm font-medium">
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
                  id="appt-rows-per-page"
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
            <div className="flex items-center justify-center text-sm font-medium">
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {Math.max(1, table.getPageCount())}
            </div>
            <div className="flex items-center justify-center gap-2 sm:justify-end">
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
