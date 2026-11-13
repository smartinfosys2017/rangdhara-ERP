"use client";

import { useMemo, useState } from "react";

import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Card, CardFooter, CardHeader, CardTable } from "@/components/ui/card";

import { DataGrid } from "@/components/ui/data-grid";

import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";

import { DataGridPagination } from "@/components/ui/data-grid-pagination";

import { DataGridTable } from "@/components/ui/data-grid-table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Input } from "@/components/ui/input";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import ExpensesAddDialog from "./expenses-add-dialog";
import ExpensesViewDialog from "./expenses-view-dialog";
import ExpensesEditDialog from "./expenses-edit-dialog";
import ExpensesDeleteDialog from "./expenses-delete-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "Expenses.view",
  "Expenses.manage",
  "Expenses.edit",
  "Expenses.delete",
];

const canView = can("Expenses.view", permissions);

const canManage = can("Expenses.manage", permissions);

const canEdit = can("Expenses.edit", permissions);

const canDelete = can("Expenses.delete", permissions);

// =======================================================
// COMPONENT
// =======================================================

const ExpensesList = () => {
  // =======================================================
  // EXPENSE DATA STATE
  // =======================================================

  const [expenses, setExpenses] = useState([
    {
      id: 1,
      category: "Smart Test",
      amount: "$500.00",
      name: "Server Hosting",
      receipt: "receipt.pdf",
      date: "2026-09-04",
      project: "Website Redesign",
      customer: "Acme Corporation",
      invoice: "Created",
      reference: "EXP-001",
      paymentMode: "Bank",
    },

    {
      id: 2,
      category: "Office Expense",
      amount: "$250.00",
      name: "Office Supplies",
      receipt: "-",
      date: "2026-09-01",
      project: "CRM Development",
      customer: "Globex Corporation",
      invoice: "Not Created",
      reference: "EXP-002",
      paymentMode: "Cash",
    },
  ]);

  // =======================================================
  // TABLE STATE
  // =======================================================

  const [pagination, setPagination] = useState({
    pageIndex: 0,

    pageSize: 10,
  });

  const [sorting, setSorting] = useState([
    {
      id: "id",
      desc: true,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");

  // =======================================================
  // DIALOG STATES
  // =======================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [viewExpense, setViewExpense] = useState(null);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [editExpense, setEditExpense] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [deleteExpense, setDeleteExpense] = useState(null);

  // =======================================================
  // SEARCH FILTER
  // =======================================================

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return expenses;
    }

    const search = searchQuery.toLowerCase();

    return expenses.filter((item) =>
      Object.values(item).join(" ").toLowerCase().includes(search),
    );
  }, [expenses, searchQuery]);

  // =======================================================
  // COLUMNS START
  // =======================================================

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",

        id: "id",

        header: ({ column }) => (
          <DataGridColumnHeader title="#" column={column} visibility />
        ),

        cell: ({ row }) => <span>#{row.original.id}</span>,

        size: 80,
      },

      {
        accessorKey: "category",

        id: "category",

        header: ({ column }) => (
          <DataGridColumnHeader title="Category" column={column} visibility />
        ),

        cell: ({ row }) => row.original.category,

        size: 160,
      },

      {
        accessorKey: "amount",

        id: "amount",

        header: ({ column }) => (
          <DataGridColumnHeader title="Amount" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.amount}</span>
        ),

        size: 120,
      },

      {
        accessorKey: "name",

        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader title="Name" column={column} visibility />
        ),

        cell: ({ row }) => row.original.name,

        size: 180,
      },

      {
        accessorKey: "receipt",

        id: "receipt",

        header: ({ column }) => (
          <DataGridColumnHeader title="Receipt" column={column} visibility />
        ),

        cell: ({ row }) =>
          row.original.receipt !== "-" ? (
            <span className="text-primary underline cursor-pointer">
              {row.original.receipt}
            </span>
          ) : (
            "-"
          ),

        size: 150,
      },

      {
        accessorKey: "date",

        id: "date",

        header: ({ column }) => (
          <DataGridColumnHeader title="Date" column={column} visibility />
        ),

        cell: ({ row }) => row.original.date,

        size: 130,
      },

      {
        accessorKey: "project",

        id: "project",

        header: ({ column }) => (
          <DataGridColumnHeader title="Project" column={column} visibility />
        ),

        cell: ({ row }) => row.original.project,

        size: 180,
      },

      {
        accessorKey: "customer",

        id: "customer",

        header: ({ column }) => (
          <DataGridColumnHeader title="Customer" column={column} visibility />
        ),

        cell: ({ row }) => row.original.customer,

        size: 180,
      },

      {
        accessorKey: "invoice",

        id: "invoice",

        header: ({ column }) => (
          <DataGridColumnHeader title="Invoice" column={column} visibility />
        ),

        cell: ({ row }) => row.original.invoice,

        size: 140,
      },

      {
        accessorKey: "reference",

        id: "reference",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Reference #"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => row.original.reference,

        size: 140,
      },

      {
        accessorKey: "paymentMode",

        id: "paymentMode",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Payment Mode"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => row.original.paymentMode,

        size: 150,
      },

      // =================================================
      // ACTION COLUMN
      // =================================================

      {
        id: "actions",

        header: "Actions",

        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"

                mode="icon"

                variant="ghost"

                className="h-7 w-7"
              >
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {/* VIEW */}

              <DropdownMenuItem
                onClick={() => {
                  setViewExpense(row.original);

                  setViewDialogOpen(true);
                }}
              >
                View Expense
              </DropdownMenuItem>

              {/* EDIT */}

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditExpense(row.original);

                    setEditDialogOpen(true);
                  }}
                >
                  Edit Expense
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {/* DELETE */}

              {canDelete && (
                <DropdownMenuItem
                  className="text-red-600"

                  onClick={() => {
                    setDeleteExpense(row.original);

                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete Expense
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),

        size: 80,
      },
    ],
    [],
  );

  // =======================================================
  // TABLE
  // =======================================================

  const table = useReactTable({
    data: filteredData,

    columns,

    getRowId: (row) => String(row.id),

    state: {
      pagination,

      sorting,
    },

    onPaginationChange: setPagination,

    onSortingChange: setSorting,

    getCoreRowModel: getCoreRowModel(),

    getSortedRowModel: getSortedRowModel(),

    getPaginationRowModel: getPaginationRowModel(),
  });
  // =======================================================
  // TOOLBAR
  // =======================================================

  const DataGridToolbar = () => {
    const [inputValue, setInputValue] = useState(searchQuery);

    const handleSearch = () => {
      setSearchQuery(inputValue.trim());

      setPagination((prev) => ({
        ...prev,

        pageIndex: 0,
      }));
    };

    const clearSearch = () => {
      setInputValue("");

      setSearchQuery("");

      setPagination((prev) => ({
        ...prev,

        pageIndex: 0,
      }));
    };

    return (
      <CardHeader className="py-5">
        <div className="flex justify-between items-center w-full">
          {/* SEARCH */}

          <div className="relative">
            <Search
              className="
            absolute
            start-3
            top-1/2
            size-4
            -translate-y-1/2
            text-muted-foreground
            "
            />

            <Input
              placeholder="Search expenses"

              value={inputValue}

              onChange={(e) => setInputValue(e.target.value)}

              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}

              className="ps-9 w-64"
            />

            {inputValue && (
              <Button
                type="button"

                mode="icon"

                variant="dim"
                className="absolute end-1.5 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={handleClearSearch}
              >
                <X />
              </Button>
            )}
          </div>

          {/* ADD */}

          {canManage && (
            <Button
              onClick={() => {
                setAddDialogOpen(true);
              }}
            >
              <Plus />
              Add Expense
            </Button>
          )}
        </div>
      </CardHeader>
    );
  };

  // =======================================================
  // ACCESS CHECK
  // =======================================================

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">Access Denied</h3>

          <p className="text-sm text-muted-foreground">
            You do not have permission to view Expenses.
          </p>
        </CardHeader>
      </Card>
    );
  }

  // =======================================================
  // RETURN
  // =======================================================

  return (
    <>
      <DataGrid
        table={table}

        recordCount={filteredData.length}

        isLoading={false}

        tableLayout={{
          columnsResizable: true,

          columnsPinnable: true,

          columnsMovable: true,

          columnsVisibility: true,
        }}
      >
        <Card>
          <DataGridToolbar />

          <CardTable>
            <ScrollArea>
              <DataGridTable />

              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>

          <CardFooter>
            <DataGridPagination />
          </CardFooter>
        </Card>
      </DataGrid>

      {/* =========================
        ADD EXPENSE
        ========================= */}

      <ExpensesAddDialog
        open={addDialogOpen}

        closeDialog={() => {
          setAddDialogOpen(false);
        }}

        onSuccess={(newExpense) => {
          setExpenses((prev) => [
            ...prev,

            {
              ...newExpense,
              id: Date.now(),
            },
          ]);

          setAddDialogOpen(false);
        }}
      />

      {/* =========================
          VIEW EXPENSE
          ========================= */}

      <ExpensesViewDialog
        open={viewDialogOpen}

        Expense={viewExpense}

        closeDialog={() => {
          setViewDialogOpen(false);

          setViewExpense(null);
        }}
      />

      {/* =========================
        EDIT EXPENSE
        ========================= */}

      <ExpensesEditDialog
        open={editDialogOpen}

        Expense={editExpense}

        closeDialog={() => {
          setEditDialogOpen(false);

          setEditExpense(null);
        }}

        onSuccess={(updated) => {
          setExpenses((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item)),
          );

          setEditDialogOpen(false);

          setEditExpense(null);
        }}
      />

      {/* =========================
          DELETE EXPENSE
          ========================= */}

      <ExpensesDeleteDialog
        open={deleteDialogOpen}

        Expense={deleteExpense}

        closeDialog={() => {
          setDeleteDialogOpen(false);

          setDeleteExpense(null);
        }}

        onSuccess={(deleted) => {
          setExpenses((prev) => prev.filter((item) => item.id !== deleted.id));

          setDeleteDialogOpen(false);

          setDeleteExpense(null);
        }}
      />
    </>
  );
};

export default ExpensesList;
