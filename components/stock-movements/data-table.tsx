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
} from "lucide-react";

import { StockMovementDetailDialog } from "@/components/stock-movements/stock-movement-detail-dialog";
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
import { PRODUCT_CATEGORY_LABELS } from "@/lib/products/types";
import type { StockMovementLineRow } from "@/lib/stock-movements/types";
import {
  MOVEMENT_TYPE_LABELS,
  MOVEMENT_TYPES,
} from "@/lib/stock-movements/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function movementLabel(t: string): string {
  return MOVEMENT_TYPE_LABELS[t] ?? t;
}

const movementTypeEquals: FilterFn<StockMovementLineRow> = (
  row,
  columnId,
  filterValue,
) => {
  const v = filterValue as string | undefined;
  if (!v || v === "__all__") return true;
  return row.getValue(columnId) === v;
};

const stockMovementGlobalFilter: FilterFn<StockMovementLineRow> = (
  row,
  _columnId,
  value,
) => {
  const q = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!q) return true;
  const r = row.original;
  const cat =
    r.product_category &&
    r.product_category in PRODUCT_CATEGORY_LABELS
      ? PRODUCT_CATEGORY_LABELS[
          r.product_category as keyof typeof PRODUCT_CATEGORY_LABELS
        ]
      : String(r.product_category ?? "");
  const haystack = [
    r.id,
    r.branch_id,
    r.product_id,
    r.appointment_id,
    r.performed_by,
    r.movement_type,
    movementLabel(String(r.movement_type)),
    r.notes,
    r.product_long_name,
    r.product_short_name,
    r.product_sku,
    r.product_description,
    r.product_category,
    cat,
    r.quantity != null ? String(r.quantity) : "",
    r.product_unit_price,
    r.product_is_active != null ? (r.product_is_active ? "active" : "inactive") : "",
    formatDate(r.created_at),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
};

const baseColumns: ColumnDef<StockMovementLineRow>[] = [
  {
    accessorKey: "branch_id",
    header: "Branch ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs" title={row.original.branch_id ?? ""}>
        {row.original.branch_id
          ? `${row.original.branch_id.slice(0, 8)}…`
          : "—"}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    accessorKey: "movement_type",
    id: "movement_type",
    header: "Type",
    filterFn: movementTypeEquals,
    cell: ({ row }) => {
      const t = String(row.original.movement_type);
      return (
        <Badge variant="outline" className="font-normal">
          {movementLabel(t)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "quantity",
    header: () => <div className="text-right">Qty</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.quantity ?? "—"}
      </div>
    ),
  },
  {
    id: "product_name",
    accessorFn: (r) => r.product_long_name ?? r.product_short_name ?? "",
    header: "Product",
    cell: ({ row }) => (
      <span
        className="max-w-[220px] truncate font-medium"
        title={
          row.original.product_long_name ??
          row.original.product_short_name ??
          ""
        }
      >
        {row.original.product_long_name ??
          row.original.product_short_name ??
          "—"}
      </span>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "product_sku",
    header: "SKU",
    cell: ({ row }) => (
      <span className="font-mono text-xs">
        {row.original.product_sku ?? "—"}
      </span>
    ),
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
];

function actionsColumn(handlers: {
  onView: (row: StockMovementLineRow) => void;
}): ColumnDef<StockMovementLineRow> {
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
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => handlers.onView(row.original)}>
            View details
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  };
}

export function DataTable({ data }: { data: StockMovementLineRow[] }) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      branch_id: false,
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

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailRow, setDetailRow] = React.useState<StockMovementLineRow | null>(
    null,
  );

  const openDetail = React.useCallback((row: StockMovementLineRow) => {
    setDetailRow(row);
    setDetailOpen(true);
  }, []);

  const columns = React.useMemo(
    () => [...baseColumns, actionsColumn({ onView: openDetail })],
    [openDetail],
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
    globalFilterFn: stockMovementGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const typeFilter =
    (table.getColumn("movement_type")?.getFilterValue() as string | undefined) ??
    "__all__";

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 px-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:px-6">
        <Input
          placeholder="Filter movements…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              table
                .getColumn("movement_type")
                ?.setFilterValue(v === "__all__" ? undefined : v);
            }}
          >
            <SelectTrigger className="w-[200px]" size="sm" aria-label="Movement type">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__all__">All types</SelectItem>
                {MOVEMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {MOVEMENT_TYPE_LABELS[t]}
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
        </div>
      </div>

      <StockMovementDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        row={detailRow}
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
                    No stock movements found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} movement
            {table.getFilteredRowModel().rows.length === 1 ? "" : "s"}
          </div>
          <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row sm:items-center sm:gap-8">
            <div className="flex items-center gap-2">
              <Label htmlFor="sm-rows-per-page" className="text-sm font-medium">
                Rows per page
              </Label>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => {
                  table.setPageSize(Number(value));
                }}
              >
                <SelectTrigger size="sm" className="w-20" id="sm-rows-per-page">
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
