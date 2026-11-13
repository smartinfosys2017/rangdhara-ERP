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

import { Skeleton } from "@/components/ui/skeleton";

import { can } from "@/lib/permissions";

import CreditNoteAddDialog from "./credit-note-add-dialog";
import CreditNoteEditDialog from "./credit-note-edit-dialog";
import CreditNoteViewDialog from "./credit-note-view-dialog";
import CreditNoteDeleteDialog from "./credit-note-delete-dialog";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "creditnote.view",
  "creditnote.manage",
  "creditnote.edit",
  "creditnote.delete",
];

const canView = can("creditnote.view", permissions);

const canManage = can("creditnote.manage", permissions);

const canEdit = can("creditnote.edit", permissions);

const canDelete = can("creditnote.delete", permissions);

// =======================================================
// STATIC CREDIT NOTE DATA
// =======================================================

const STATIC_CREDIT_NOTES = [
  {
    id: 3,
    creditNoteNo: "CN-0003",
    amount: "$1,250.00",
    totalTax: "$150.00",
    date: "2026-09-02",
    customer: "Acme Corporation",
    project: "E-Commerce Development",
    referenceNo: "REF-003",
    status: "Open",
  },
  {
    id: 2,
    creditNoteNo: "CN-0002",
    amount: "$750.00",
    totalTax: "$90.00",
    date: "2026-09-01",
    customer: "John Smith",
    project: "Marketing Campaign",
    referenceNo: "REF-002",
    status: "Applied",
  },
  {
    id: 1,
    creditNoteNo: "CN-0001",
    amount: "$500.00",
    totalTax: "$60.00",
    date: "2026-08-28",
    customer: "Creative Studio",
    project: "UI/UX Redesign",
    referenceNo: "",
    status: "Draft",
  },
];

// =======================================================
// STATUS BADGE
// =======================================================

const StatusBadge = ({ status }) => {
  const statusClasses = {
    Draft: "bg-muted text-muted-foreground",

    Open: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",

    Applied:
      "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",

    PartiallyApplied:
      "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",

    Cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300",

    Refunded: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  };

  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
        statusClasses[status] || "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
};

// =======================================================
// CREDIT NOTE LIST
// =======================================================

const CreditNoteList = () => {
  // =====================================================
  // TABLE STATE
  // =====================================================

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

  // =====================================================
  // DIALOG STATE
  // =====================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedCreditNote, setSelectedCreditNote] = useState(null);

  // =====================================================
  // SEARCH STATE
  // =====================================================

  const [searchQuery, setSearchQuery] = useState("");

  // =====================================================
  // VIEW
  // =====================================================

  const handleView = (creditNote) => {
    if (!creditNote?.id) {
      return;
    }

    setSelectedCreditNote(creditNote);
    setViewDialogOpen(true);
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (creditNote) => {
    if (!creditNote?.id) {
      return;
    }

    setSelectedCreditNote(creditNote);
    setEditDialogOpen(true);
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = (creditNote) => {
    if (!creditNote?.id) {
      return;
    }

    setSelectedCreditNote(creditNote);
    setDeleteDialogOpen(true);
  };

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = () => {
    // Static data is already loaded.
    // When API integration is added, call your API
    // function here.

    setEditDialogOpen(false);
    setAddDialogOpen(false);
    setDeleteDialogOpen(false);

    setSelectedCreditNote(null);
  };

  // =====================================================
  // SEARCH DATA
  // =====================================================

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return STATIC_CREDIT_NOTES;
    }

    const search = searchQuery.toLowerCase().trim();

    return STATIC_CREDIT_NOTES.filter(
      (creditNote) =>
        String(creditNote.id).toLowerCase().includes(search) ||
        creditNote.creditNoteNo.toLowerCase().includes(search) ||
        creditNote.amount.toLowerCase().includes(search) ||
        creditNote.totalTax.toLowerCase().includes(search) ||
        creditNote.date.toLowerCase().includes(search) ||
        creditNote.customer.toLowerCase().includes(search) ||
        creditNote.project.toLowerCase().includes(search) ||
        creditNote.referenceNo.toLowerCase().includes(search) ||
        creditNote.status.toLowerCase().includes(search),
    );
  }, [searchQuery]);

  // =====================================================
  // COLUMNS
  // =====================================================

  const columns = useMemo(
    () => [
      {
        accessorKey: "creditNoteNo",
        id: "creditNoteNo",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Credit Note #"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.creditNoteNo}</span>
        ),

        size: 160,
        enableSorting: true,
        enableHiding: false,

        meta: {
          headerTitle: "Credit Note #",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      {
        accessorKey: "amount",
        id: "amount",

        header: ({ column }) => (
          <DataGridColumnHeader title="Amount" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.amount || "$0.00"}</span>
        ),

        size: 140,
        enableSorting: true,

        meta: {
          headerTitle: "Amount",
          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },

      {
        accessorKey: "totalTax",
        id: "totalTax",

        header: ({ column }) => (
          <DataGridColumnHeader title="Total Tax" column={column} visibility />
        ),

        cell: ({ row }) => <span>{row.original.totalTax || "$0.00"}</span>,

        size: 140,
        enableSorting: true,

        meta: {
          headerTitle: "Total Tax",
          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },

      {
        accessorKey: "date",
        id: "date",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Credit Note Date"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => <span>{row.original.date || "-"}</span>,

        size: 160,
        enableSorting: true,

        meta: {
          headerTitle: "Credit Note Date",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      {
        accessorKey: "customer",
        id: "customer",

        header: ({ column }) => (
          <DataGridColumnHeader title="Customer" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.customer || "-"}</span>
        ),

        size: 200,
        enableSorting: true,

        meta: {
          headerTitle: "Customer",
          skeleton: <Skeleton className="h-7 w-32" />,
        },
      },

      {
        accessorKey: "project",
        id: "project",

        header: ({ column }) => (
          <DataGridColumnHeader title="Project" column={column} visibility />
        ),

        cell: ({ row }) => <span>{row.original.project || "-"}</span>,

        size: 220,
        enableSorting: true,

        meta: {
          headerTitle: "Project",
          skeleton: <Skeleton className="h-7 w-36" />,
        },
      },

      {
        accessorKey: "referenceNo",
        id: "referenceNo",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Reference #"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => <span>{row.original.referenceNo || "-"}</span>,

        size: 160,
        enableSorting: true,

        meta: {
          headerTitle: "Reference #",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      {
        accessorKey: "status",
        id: "status",

        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),

        cell: ({ row }) => <StatusBadge status={row.original.status} />,

        size: 140,
        enableSorting: true,

        meta: {
          headerTitle: "Status",
          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },

      // =================================================
      // ACTIONS
      // =================================================

      {
        id: "actions",

        header: "Actions",

        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-7 w-7" mode="icon" variant="ghost">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="bottom" align="start">
              {canView && (
                <DropdownMenuItem onClick={() => handleView(row.original)}>
                  View Credit Note
                </DropdownMenuItem>
              )}

              {canEdit && (
                <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                  Edit Credit Note
                </DropdownMenuItem>
              )}

              {(canView || canEdit) && canDelete && <DropdownMenuSeparator />}

              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDelete(row.original)}
                >
                  Delete Credit Note
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),

        size: 75,

        enableSorting: false,
        enableResizing: false,

        meta: {
          skeleton: <Skeleton className="size-5" />,
        },
      },
    ],
    [],
  );

  // =====================================================
  // TABLE
  // =====================================================

  const table = useReactTable({
    columns,

    data: filteredData,

    pageCount: Math.ceil(filteredData.length / pagination.pageSize),

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

    manualPagination: false,
    manualSorting: false,
  });

  // =====================================================
  // TOOLBAR
  // =====================================================

  const DataGridToolbar = () => {
    const [inputValue, setInputValue] = useState(searchQuery);

    const handleSearch = () => {
      setSearchQuery(inputValue.trim());

      setPagination((previous) => ({
        ...previous,
        pageIndex: 0,
      }));
    };

    const handleClearSearch = () => {
      setInputValue("");

      setSearchQuery("");

      setPagination((previous) => ({
        ...previous,
        pageIndex: 0,
      }));
    };

    return (
      <CardHeader className="py-5">
        {/* SEARCH */}

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search credit notes"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              className="ps-9 w-full md:w-64"
            />

            {inputValue.length > 0 && (
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
        </div>

        {/* ADD CREDIT NOTE */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus />
              Add Credit Note
            </Button>
          </div>
        )}
      </CardHeader>
    );
  };

  // =====================================================
  // ACCESS DENIED
  // =====================================================

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Access Denied</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view credit notes.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================

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
        tableClassNames={{
          edgeCell: "px-5",
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

      {/* =================================================
          ADD
      ================================================= */}

      <CreditNoteAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={handleRefresh}
      />

      {/* =================================================
          EDIT
      ================================================= */}

      <CreditNoteEditDialog
        open={editDialogOpen}
        closeDialog={() => {
          setEditDialogOpen(false);
          setSelectedCreditNote(null);
        }}
        creditNote={selectedCreditNote}
        onSuccess={handleRefresh}
      />

      {/* =================================================
          VIEW
      ================================================= */}

      <CreditNoteViewDialog
        open={viewDialogOpen}
        closeDialog={() => {
          setViewDialogOpen(false);
          setSelectedCreditNote(null);
        }}
        creditNote={selectedCreditNote}
      />

      {/* =================================================
          DELETE
      ================================================= */}

      <CreditNoteDeleteDialog
        open={deleteDialogOpen}
        closeDialog={() => {
          setDeleteDialogOpen(false);
          setSelectedCreditNote(null);
        }}
        creditNote={selectedCreditNote}
        onSuccess={handleRefresh}
      />
    </>
  );
};

export default CreditNoteList;
