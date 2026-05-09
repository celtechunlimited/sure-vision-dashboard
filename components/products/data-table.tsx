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
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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
import type { ProductInventoryRow } from "@/lib/products/types";
import {
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_CATEGORIES,
} from "@/lib/products/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function formatMoney(value: string | null): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return String(value);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(n);
}

const categoryEquals: FilterFn<ProductInventoryRow> = (
  row,
  columnId,
  filterValue,
) => {
  const v = filterValue as string | undefined;
  if (!v || v === "__all__") return true;
  return row.getValue(columnId) === v;
};

const productGlobalFilter: FilterFn<ProductInventoryRow> = (
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
    r.short_name,
    r.long_name,
    r.sku,
    r.description,
    r.category,
    r.category ? PRODUCT_CATEGORY_LABELS[r.category] : "",
    r.stock_status,
    String(r.current_stock),
    r.low_stock_threshold != null ? String(r.low_stock_threshold) : "",
    formatMoney(r.unit_price),
    r.is_active ? "active" : "inactive",
    formatDate(r.created_at),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
};

const productColumns: ColumnDef<ProductInventoryRow>[] = [
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
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <span
        className="max-w-[240px] truncate text-muted-foreground text-sm"
        title={row.original.description ?? ""}
      >
        {row.original.description ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => formatDate(row.original.created_at),
  },
  {
    accessorKey: "sku",
    header: "SKU",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.sku ?? "—"}</span>
    ),
  },
  {
    accessorKey: "long_name",
    header: "Name",
    cell: ({ row }) => (
      <span
        className="max-w-[220px] truncate font-medium"
        title={row.original.long_name ?? ""}
      >
        {row.original.long_name ?? row.original.short_name ?? "—"}
      </span>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "short_name",
    header: "Short name",
    cell: ({ row }) => (
      <span className="max-w-[140px] truncate" title={row.original.short_name ?? ""}>
        {row.original.short_name ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "category",
    id: "category",
    header: "Category",
    filterFn: categoryEquals,
    cell: ({ row }) => {
      const c = row.original.category;
      if (!c) return "—";
      return (
        <Badge variant="outline" className="font-normal">
          {PRODUCT_CATEGORY_LABELS[c]}
        </Badge>
      );
    },
  },
  {
    accessorKey: "unit_price",
    header: () => <div className="text-right">Unit price</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {formatMoney(row.original.unit_price)}
      </div>
    ),
  },
  {
    accessorKey: "current_stock",
    header: () => <div className="text-right">Stock</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.current_stock}</div>
    ),
  },
  {
    accessorKey: "low_stock_threshold",
    header: () => <div className="text-right">Low at</div>,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">
        {row.original.low_stock_threshold ?? "—"}
      </div>
    ),
  },
  {
    accessorKey: "stock_status",
    header: "Stock status",
    cell: ({ row }) => {
      const s = row.original.stock_status;
      return (
        <Badge variant="outline" className="gap-1.5 font-normal">
          <span
            className={cn(
              "size-1.5 rounded-full",
              s === "in_stock" && "bg-emerald-500",
              s === "low_stock" && "bg-amber-500",
              s === "out_of_stock" && "bg-red-500",
            )}
          />
          {s === "in_stock"
            ? "In stock"
            : s === "low_stock"
              ? "Low stock"
              : "Out of stock"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "is_active",
    header: "Active",
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
];

export function DataTable({ data }: { data: ProductInventoryRow[] }) {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({
      branch_id: false,
      description: false,
    });
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns = React.useMemo(() => productColumns, []);

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
    globalFilterFn: productGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const categoryFilter = (table.getColumn("category")?.getFilterValue() as
    | string
    | undefined) ?? "__all__";

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4 px-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:px-6">
        <Input
          placeholder="Filter products…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={categoryFilter}
            onValueChange={(v) => {
              table.getColumn("category")?.setFilterValue(v === "__all__" ? undefined : v);
            }}
          >
            <SelectTrigger className="w-[200px]" size="sm" aria-label="Category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__all__">All categories</SelectItem>
                {PRODUCT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {PRODUCT_CATEGORY_LABELS[c]}
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
                    colSpan={productColumns.length}
                    className="h-24 text-center"
                  >
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} product
            {table.getFilteredRowModel().rows.length === 1 ? "" : "s"}
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
