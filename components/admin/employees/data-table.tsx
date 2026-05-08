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
  activateEmployeeUser,
  assignEmployeeBranch,
  deactivateEmployeeUser,
} from "@/lib/actions/employee-actions";
import type {
  EmployeeBranchOption,
  EmployeeDirectoryRow,
} from "@/lib/employees/types";
import { EmployeeFormDialog } from "@/components/admin/employees/employee-form-dialog";
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

const UNASSIGNED_BRANCH_VALUE = "__none__";

function formatEmployeeName(row: EmployeeDirectoryRow): string {
  const parts = [
    row.prefix,
    row.first_name,
    row.middle_name,
    row.last_name,
  ].filter((p): p is string => Boolean(p && String(p).trim()));
  return parts.length ? parts.join(" ") : "—";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

function EmployeeColumnHeader<TData, TValue>({
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

function BranchAssignCell({
  row,
  branches,
}: {
  row: Row<EmployeeDirectoryRow>;
  branches: EmployeeBranchOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const original = row.original;

  return (
    <>
      <span className="sr-only">Branch assignment</span>
      <Select
        disabled={pending}
        value={original.branch_id ?? UNASSIGNED_BRANCH_VALUE}
        onValueChange={(value) => {
          const nextId = value === UNASSIGNED_BRANCH_VALUE ? null : value;
          startTransition(async () => {
            const res = await assignEmployeeBranch({
              userId: original.user_id,
              branchId: nextId,
            });
            if (!res.ok) {
              toast.error(res.message);
              return;
            }
            toast.success("Branch updated");
            router.refresh();
          });
        }}
      >
        <SelectTrigger
          size="sm"
          className="w-[180px] **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate"
          id={`${original.user_id}-branch`}
        >
          <SelectValue placeholder="Assign branch" />
        </SelectTrigger>
        <SelectContent align="end">
          <SelectGroup>
            <SelectItem value={UNASSIGNED_BRANCH_VALUE}>Unassigned</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.long_name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </>
  );
}

function employeeColumns(
  branches: EmployeeBranchOption[],
  handlers: {
    onEdit: (row: EmployeeDirectoryRow) => void;
    onDeactivate: (row: EmployeeDirectoryRow) => void;
    onActivate: (row: EmployeeDirectoryRow) => void;
  },
): ColumnDef<EmployeeDirectoryRow>[] {
  return [
    {
      id: "name",
      accessorFn: (row) => formatEmployeeName(row),
      header: ({ column }) => (
        <EmployeeColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{formatEmployeeName(row.original)}</span>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <EmployeeColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="max-w-[220px] truncate" title={row.original.email}>
          {row.original.email}
        </span>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "employee_role",
      header: ({ column }) => (
        <EmployeeColumnHeader column={column} title="Role" />
      ),
      cell: ({ row }) => {
        const role = row.original.employee_role;
        if (!role) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <Badge variant="outline" className="font-normal capitalize">
            {role.replace("_", " ")}
          </Badge>
        );
      },
    },
    {
      id: "branch",
      accessorKey: "branch_short_name",
      header: ({ column }) => (
        <EmployeeColumnHeader column={column} title="Branch" />
      ),
      cell: ({ row }) => (
        <BranchAssignCell row={row} branches={branches} />
      ),
    },
    {
      accessorKey: "employee_created_at",
      header: ({ column }) => (
        <EmployeeColumnHeader column={column} title="Joined" />
      ),
      cell: ({ row }) => formatDate(row.original.employee_created_at),
    },
    {
      accessorKey: "is_active",
      header: ({ column }) => (
        <EmployeeColumnHeader column={column} title="Status" />
      ),
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
      enableSorting: false,
      enableHiding: false,
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
            <DropdownMenuSeparator />
            {row.original.is_active ? (
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => handlers.onDeactivate(row.original)}
              >
                Deactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onSelect={() => handlers.onActivate(row.original)}
              >
                Activate
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}

type BranchFilterValue = "all" | "unassigned" | string;

export function DataTable({
  data: initialData,
  branches,
}: {
  data: EmployeeDirectoryRow[];
  branches: EmployeeBranchOption[];
}) {
  const router = useRouter();
  const [data, setData] = React.useState(initialData);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [branchFilter, setBranchFilter] =
    React.useState<BranchFilterValue>("all");

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] =
    React.useState<EmployeeDirectoryRow | null>(null);

  const [deactivateOpen, setDeactivateOpen] = React.useState(false);
  const [deactivateTarget, setDeactivateTarget] =
    React.useState<EmployeeDirectoryRow | null>(null);
  const [deactivatePending, startDeactivate] = React.useTransition();

  const openCreate = React.useCallback(() => {
    setFormMode("create");
    setEditingRow(null);
    setFormOpen(true);
  }, []);

  const openEdit = React.useCallback((row: EmployeeDirectoryRow) => {
    setFormMode("edit");
    setEditingRow(row);
    setFormOpen(true);
  }, []);

  const openDeactivate = React.useCallback((row: EmployeeDirectoryRow) => {
    setDeactivateTarget(row);
    setDeactivateOpen(true);
  }, []);

  const [, startActivate] = React.useTransition();

  const handleActivate = React.useCallback(
    (row: EmployeeDirectoryRow) => {
      startActivate(async () => {
        const result = await activateEmployeeUser(row.user_id);
        if (!result.ok) {
          toast.error(result.message);
          return;
        }
        toast.success("Employee activated");
        router.refresh();
      });
    },
    [router],
  );

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const filteredData = React.useMemo(() => {
    if (branchFilter === "all") return data;
    if (branchFilter === "unassigned") {
      return data.filter((r) => r.branch_id == null);
    }
    return data.filter((r) => r.branch_id === branchFilter);
  }, [data, branchFilter]);

  const columns = React.useMemo(
    () =>
      employeeColumns(branches, {
        onEdit: openEdit,
        onDeactivate: openDeactivate,
        onActivate: handleActivate,
      }),
    [branches, openEdit, openDeactivate, handleActivate],
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getRowId: (row) => row.employee_id,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  React.useEffect(() => {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, [branchFilter]);

  const branchFilterLabel = React.useMemo(() => {
    if (branchFilter === "all") return "All branches";
    if (branchFilter === "unassigned") return "Unassigned";
    const b = branches.find((x) => x.id === branchFilter);
    return b?.short_name ?? "Branch";
  }, [branchFilter, branches]);

  return (
    <div className="flex w-full flex-col gap-6">
      <EmployeeFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        row={formMode === "edit" ? editingRow : null}
        branches={branches}
      />

      <AlertDialog
        open={deactivateOpen}
        onOpenChange={(next) => {
          if (!deactivatePending) setDeactivateOpen(next);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate employee?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateTarget
                ? `“${formatEmployeeName(deactivateTarget)}” (${deactivateTarget.email}) will be marked inactive.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deactivatePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deactivatePending || !deactivateTarget}
              onClick={(e) => {
                e.preventDefault();
                if (!deactivateTarget) return;
                startDeactivate(async () => {
                  const result = await deactivateEmployeeUser(
                    deactivateTarget.user_id,
                  );
                  if (!result.ok) {
                    toast.error(result.message);
                    return;
                  }
                  toast.success("Employee deactivated");
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

      <div className="flex items-center justify-end px-4 lg:px-6">
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
                {branchFilterLabel}
                <ChevronDownIcon data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onSelect={() => setBranchFilter("all")}>
                All branches
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setBranchFilter("unassigned")}>
                Unassigned
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {branches.map((b) => (
                <DropdownMenuItem
                  key={b.id}
                  onSelect={() => setBranchFilter(b.id)}
                >
                  {b.short_name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" type="button" onClick={openCreate}>
            <PlusIcon />
            <span className="hidden lg:inline">Add employee</span>
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
                      !row.original.is_active && "text-muted-foreground",
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
            {filteredData.length} employee
            {filteredData.length === 1 ? "" : "s"}
            {branchFilter !== "all" ? " (filtered)" : ""}
          </div>
          <div className="flex w-full items-center gap-8 lg:w-fit">
            <div className="hidden items-center gap-2 lg:flex">
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
