"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
  CardTitle,
  CardToolbar,
} from "@/components/ui/card";

import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";

import {
  DataGridTable,
  DataGridTableRowSelect,
  DataGridTableRowSelectAll,
} from "@/components/ui/data-grid-table";

import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

/* -------------------------------------------------------
   Fetch customers
------------------------------------------------------- */

export function useDashboardCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCustomers() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/dashboard/customers", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load customers.");
        }

        setCustomers(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Failed to load customers.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadCustomers();

    return () => controller.abort();
  }, []);

  return { customers, loading, error };
}

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

function formatDate(date) {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name, email) {
  return (name || email || "Customer")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function getStatusClass(status) {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "badge badge-sm badge-success badge-outline";
    case "inactive":
      return "badge badge-sm badge-warning badge-outline";
    case "suspended":
      return "badge badge-sm badge-danger badge-outline";
    default:
      return "badge badge-sm badge-secondary badge-outline";
  }
}

/* -------------------------------------------------------
   Table columns
------------------------------------------------------- */

const columns = [
  {
    id: "select",
    header: () => <DataGridTableRowSelectAll />,
    cell: ({ row }) => <DataGridTableRowSelect row={row} />,
    enableSorting: false,
    enableHiding: false,
    enablePinning: false,
    enableResizing: false,
    size: 40,
    meta: {
      headerClassName: "w-10",
      cellClassName: "w-10",
    },
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataGridColumnHeader title="Customer" column={column} />
    ),
    cell: ({ row }) => {
      const customer = row.original;

      return (
        <div className="flex items-center gap-3.5">
          {customer.avatar ? (
            <img
              src={customer.avatar}
              alt={customer.name || "Customer"}
              className="size-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-light font-semibold text-primary">
              {getInitials(customer.name, customer.email)}
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-semibold text-gray-900">
              {customer.name || "Unnamed customer"}
            </span>
          </div>
        </div>
      );
    },
    enableSorting: true,
    enablePinning: true,
    enableHiding: true,
    size: 240,
    meta: {
      headerClassName: "min-w-[220px]",
      cellClassName: "min-w-[220px]",
    },
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <DataGridColumnHeader title="Email" column={column} />
    ),
    cell: ({ row }) => (
      <span className="text-gray-700">{row.original.email || "—"}</span>
    ),
    enableSorting: true,
    enablePinning: true,
    enableHiding: true,
    size: 240,
    meta: {
      headerClassName: "min-w-[220px]",
    },
  },
  {
    accessorKey: "country",
    header: ({ column }) => (
      <DataGridColumnHeader title="Country" column={column} />
    ),
    cell: ({ row }) => (
      <span className="text-gray-700">{row.original.country || "India"}</span>
    ),
    enableSorting: true,
    enablePinning: true,
    enableHiding: true,
    size: 140,
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <DataGridColumnHeader title="Status" column={column} />
    ),
    cell: ({ row }) => (
      <span className={getStatusClass(row.original.status)}>
        {row.original.status || "Unknown"}
      </span>
    ),
    enableSorting: true,
    enablePinning: true,
    enableHiding: true,
    size: 120,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <DataGridColumnHeader title="Joined Date" column={column} />
    ),
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-gray-700">
        {formatDate(row.original.createdAt)}
      </span>
    ),
    enableSorting: true,
    enablePinning: true,
    enableHiding: true,
    size: 160,
  },
];

/* -------------------------------------------------------
   Teams / Customers
------------------------------------------------------- */

export function Teams() {
  const { customers, loading, error } = useDashboardCustomers();

  const [search, setSearch] = useState("");

  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [rowSelection, setRowSelection] = useState({});
  const [columnPinning, setColumnPinning] = useState({
    left: [],
    right: [],
  });
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) =>
      [customer.name, customer.email, customer.country, customer.status].some(
        (value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(query),
      ),
    );
  }, [customers, search]);

  useEffect(() => {
    setPagination((previous) => ({
      ...previous,
      pageIndex: 0,
    }));
  }, [search]);

  useEffect(() => {
    setRowSelection({});
  }, [search, customers]);

  const table = useReactTable({
    data: filteredCustomers,
    columns,
    getRowId: (row) => String(row.id),

    state: {
      sorting,
      pagination,
      rowSelection,
      columnPinning,
      columnVisibility,
      columnOrder,
    },

    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onColumnPinningChange: setColumnPinning,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,

    enableSorting: true,
    enableColumnPinning: true,
    enableColumnResizing: true,
    enableRowSelection: true,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <DataGrid
      table={table}
      recordCount={filteredCustomers.length}
      isLoading={loading}
      emptyMessage="No customers found."
      tableLayout={{
        columnsPinnable: true,
        columnsMovable: true,
        columnsVisibility: true,
        cellBorder: true,
      }}
    >
      <Card className="w-full">
        <CardHeader className="flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>Customers</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage and view registered customer accounts.
            </p>
          </div>

          <CardToolbar className="flex items-center gap-2">
            <span className="badge badge-sm badge-primary badge-outline">
              {loading ? "Loading..." : `${filteredCustomers.length} customers`}
            </span>
          </CardToolbar>
        </CardHeader>

        {/* Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="relative w-full sm:max-w-80">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={16}
            />

            <Input
              type="search"
              placeholder="Search customers..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9 pr-9"
              aria-label="Search customers"
            />

            {search && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </Button>
            )}
          </div>
        </div>

        {/* Error state */}
        {error ? (
          <div className="flex flex-col items-center gap-3 px-5 py-12">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <>
            <CardTable>
              <ScrollArea className="w-full">
                <DataGridTable />
              </ScrollArea>
            </CardTable>

            {!loading && filteredCustomers.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-5 py-10">
                <p className="font-medium text-gray-800">No customers found</p>
                <p className="text-sm text-muted-foreground">
                  {search
                    ? "Try another search term."
                    : "Customer records will appear here."}
                </p>
              </div>
            )}

            <CardFooter className="flex-wrap justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                {loading
                  ? "Loading customer records..."
                  : `${filteredCustomers.length} customer${
                      filteredCustomers.length === 1 ? "" : "s"
                    }${search ? " (filtered)" : ""}`}
              </div>

              {!loading && filteredCustomers.length > 0 && (
                <DataGridPagination />
              )}
            </CardFooter>
          </>
        )}
      </Card>
    </DataGrid>
  );
}