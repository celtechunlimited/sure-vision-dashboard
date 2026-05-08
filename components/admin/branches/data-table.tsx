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

import type { BranchAdminRow } from "@/lib/actions/branch-actions";
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

function formatJsonPreview(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Parses values like `"0900"` / `"1900"` (24h HHmm). */
function parseHhmm(raw: unknown): { hour: number; minute: number } | null {
  if (raw === null || raw === undefined) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 0) return null;
  const padded =
    digits.length > 4 ? digits.slice(-4) : digits.padStart(4, "0");
  const hour = Number.parseInt(padded.slice(0, 2), 10);
  const minute = Number.parseInt(padded.slice(2, 4), 10);
  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }
  return { hour, minute };
}

function formatTime12(hour24: number, minute: number): string {
  const period = hour24 >= 12 ? "PM" : "AM";
  let h12 = hour24 % 12;
  if (h12 === 0) h12 = 12;
  if (minute === 0) return `${h12} ${period}`;
  return `${h12}:${minute.toString().padStart(2, "0")} ${period}`;
}

/** e.g. `{"start_time":"0900","end_time":"1900"}` → `9 AM - 7 PM` */
function formatOperatingHoursDisplay(oh: unknown): string {
  if (!oh || typeof oh !== "object" || Array.isArray(oh)) {
    return formatJsonPreview(oh);
  }
  const o = oh as Record<string, unknown>;
  const start = parseHhmm(o.start_time);
  const end = parseHhmm(o.end_time);
  if (!start || !end) return formatJsonPreview(oh);
  return `${formatTime12(start.hour, start.minute)} - ${formatTime12(end.hour, end.minute)}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

const branchGlobalFilter: FilterFn<BranchAdminRow> = (row, _columnId, value) => {
  const q = String(value ?? "").trim().toLowerCase();
  if (!q) return true;
  const v = row.original;
  const haystack = [
    v.id,
    v.long_name,
    v.short_name,
    v.address,
    v.contact_number,
    v.contact_email,
    formatOperatingHoursDisplay(v.operating_hours),
    formatJsonPreview(v.operating_hours),
    String(v.appointment_slot_duration),
    v.is_active ? "active" : "inactive",
    formatDate(v.created_at),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
};

const columns: ColumnDef<BranchAdminRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => (
      <span
        className="font-mono text-xs"
        title={row.original.id}
      >
        {row.original.id.slice(0, 8)}…
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    accessorKey: "long_name",
    header: "Long name",
    cell: ({ row }) => (
      <span className="max-w-[220px] truncate" title={row.original.long_name}>
        {row.original.long_name}
      </span>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "short_name",
    header: "Short name",
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => (
      <span className="max-w-[200px] truncate" title={row.original.address}>
        {row.original.address}
      </span>
    ),
  },
  {
    accessorKey: "contact_number",
    header: "Contact #",
  },
  {
    accessorKey: "contact_email",
    header: "Email",
    cell: ({ row }) => (
      <span className="max-w-[180px] truncate">
        {row.original.contact_email}
      </span>
    ),
  },
  {
    accessorKey: "operating_hours",
    header: "Operating hours",
    cell: ({ row }) => {
      const oh = row.original.operating_hours;
      const label = formatOperatingHoursDisplay(oh);
      const fallback = formatJsonPreview(oh);
      return (
        <span className="max-w-[220px] truncate text-sm" title={fallback}>
          {label}
        </span>
      );
    },
  },
  {
    accessorKey: "appointment_slot_duration",
    header: () => <div className="text-right">Slot (min)</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.appointment_slot_duration}
      </div>
    ),
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const active = row.original.is_active;
      return (
        <Badge variant="outline" className="gap-1.5 font-normal">
          <span
            className={cn(
              "size-1.5 rounded-full",
              active ? "bg-emerald-500" : "bg-red-500",
            )}
          />
          {active ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    cell: () => (
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
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];

export function DataTable({ data }: { data: BranchAdminRow[] }) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({ id: false });
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = React.useState("");

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
    globalFilterFn: branchGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <Input
          placeholder="Filter branches…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
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
          <Button variant="outline" size="sm" type="button">
            <PlusIcon />
            <span className="hidden lg:inline">Add branch</span>
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
                    No branches found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} branch
            {table.getFilteredRowModel().rows.length === 1 ? "" : "es"}
          </div>
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:gap-8">
            <div className="flex items-center gap-2">
              <Label htmlFor="rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="rows-per-page">
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
