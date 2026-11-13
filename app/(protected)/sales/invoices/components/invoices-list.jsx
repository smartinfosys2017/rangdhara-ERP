"use client";

import { useMemo, useState } from "react";

import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Plus, Search, X, Trash2 } from "lucide-react";

import { toast } from "sonner";

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

import { can } from "@/lib/permissions";

import InvoicesAddDialog from "./invoices-add-dialog";
import InvoicesEditDialog from "./invoices-edit-dialog";
import InvoicesViewDialog from "./invoices-view-dialog";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "invoices.view",
  "invoices.manage",
  "invoices.edit",
  "invoices.delete",
];

const canView = can("invoices.view", permissions);

const canManage = can("invoices.manage", permissions);

const canEdit = can("invoices.edit", permissions);

const canDelete = can("invoices.delete", permissions);

// =======================================================
// STATIC INVOICES DATA
// =======================================================

const INITIAL_INVOICES = [
  {
    id: 3,

    invoiceNumber: "INV-0003",
    invoiceNo: "INV-0003",

    amount: "$5,750.00",
    subtotal: 5750,

    totalTax: "$690.00",
    totalTaxAmount: 690,

    date: "2026-09-02",
    invoiceDate: "2026-09-02",

    customerId: "1",
    customer: "Acme Corporation",

    projectId: "1",
    project: "E-Commerce Development",

    tags: ["E-Commerce", "Website"],

    dueDate: "2026-09-16",

    status: "Sent",

    currencyId: "1",
    currency: "USD",

    referenceNo: "REF-0003",

    saleAgent: "1",

    discountType: "",
    discountMode: "percent",
    discountPercent: 0,
    discountFixed: 0,

    adjustment: 0,

    billing: {
      street: "123 Business Avenue",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "United States",
    },

    shipping: {
      street: "123 Business Avenue",
      city: "New York",
      state: "NY",
      zip: "10001",
      country: "United States",
      showOnInvoice: true,
    },

    includeShipping: true,
    showShippingOnInvoice: true,

    showQuantityAs: "1",

    items: [
      {
        id: "1",
        description: "Website Development",
        longDescription: "Professional website development services.",
        quantity: 2,
        unit: "project",
        rate: 2500,
        taxes: [
          {
            id: "igst",
            name: "IGST",
            rate: 12,
          },
        ],
        optional: false,
      },

      {
        id: "2",
        description: "UI/UX Design",
        longDescription: "UI and UX design services.",
        quantity: 1,
        unit: "project",
        rate: 750,
        taxes: [
          {
            id: "igst",
            name: "IGST",
            rate: 12,
          },
        ],
        optional: false,
      },
    ],

    discountAmount: 0,

    total: 6440,

    adminNote: "Internal invoice note.",

    clientNote: "Thank you for your business.",

    terms: "Payment is due within 14 days.",
  },

  {
    id: 2,

    invoiceNumber: "INV-0002",
    invoiceNo: "INV-0002",

    amount: "$2,500.00",
    subtotal: 2500,

    totalTax: "$300.00",
    totalTaxAmount: 300,

    date: "2026-09-01",
    invoiceDate: "2026-09-01",

    customerId: "2",
    customer: "John Smith",

    projectId: "3",
    project: "Marketing Campaign",

    tags: ["Marketing", "SEO"],

    dueDate: "2026-09-15",

    status: "Paid",

    currencyId: "1",
    currency: "USD",

    referenceNo: "REF-0002",

    saleAgent: "1",

    discountType: "",
    discountMode: "percent",
    discountPercent: 0,
    discountFixed: 0,

    adjustment: 0,

    billing: {
      street: "456 Market Street",
      city: "San Francisco",
      state: "CA",
      zip: "94105",
      country: "United States",
    },

    shipping: null,

    includeShipping: false,
    showShippingOnInvoice: true,

    showQuantityAs: "1",

    items: [
      {
        id: "1",
        description: "SEO Optimization",
        longDescription: "Search engine optimization services.",
        quantity: 5,
        unit: "month",
        rate: 500,
        taxes: [
          {
            id: "igst",
            name: "IGST",
            rate: 12,
          },
        ],
        optional: false,
      },
    ],

    discountAmount: 0,

    total: 2800,

    adminNote: "",

    clientNote: "Payment received. Thank you.",

    terms: "Payment has been received in full.",
  },

  {
    id: 1,

    invoiceNumber: "INV-0001",
    invoiceNo: "INV-0001",

    amount: "$1,800.00",
    subtotal: 1800,

    totalTax: "$216.00",
    totalTaxAmount: 216,

    date: "2026-08-28",
    invoiceDate: "2026-08-28",

    customerId: "3",
    customer: "Creative Studio",

    projectId: "4",
    project: "UI/UX Redesign",

    tags: ["Design", "UI/UX"],

    dueDate: "2026-09-10",

    status: "Draft",

    currencyId: "1",
    currency: "USD",

    referenceNo: "REF-0001",

    saleAgent: "1",

    discountType: "",
    discountMode: "percent",
    discountPercent: 0,
    discountFixed: 0,

    adjustment: 0,

    billing: {
      street: "1007 Mountain Drive",
      city: "Gotham",
      state: "NJ",
      zip: "07001",
      country: "United States",
    },

    shipping: null,

    includeShipping: false,
    showShippingOnInvoice: true,

    showQuantityAs: "1",

    items: [
      {
        id: "1",
        description: "UI/UX Design",
        longDescription: "UI and UX design services.",
        quantity: 2,
        unit: "project",
        rate: 750,
        taxes: [
          {
            id: "igst",
            name: "IGST",
            rate: 12,
          },
        ],
        optional: false,
      },

      {
        id: "2",
        description: "Consulting Services",
        longDescription: "Professional consulting services.",
        quantity: 1,
        unit: "hour",
        rate: 300,
        taxes: [],
        optional: false,
      },
    ],

    discountAmount: 0,

    total: 2316,

    adminNote: "Draft invoice for review.",

    clientNote: "",

    terms: "Payment due within 7 days.",
  },
];

// =======================================================
// QUICK TOP STATS
// =======================================================

const InvoiceQuickStats = () => {
  const stats = [
    {
      label: "Unpaid",
      percentage: "0.00%",
      count: "0 / 1",
      color: "text-danger",
    },

    {
      label: "Paid",
      percentage: "100.00%",
      count: "1 / 1",
      color: "text-success",
    },

    {
      label: "Partially Paid",
      percentage: "0.00%",
      count: "0 / 1",
      color: "text-warning",
    },

    {
      label: "Overdue",
      percentage: "0.00%",
      count: "0 / 1",
      color: "text-warning",
    },

    {
      label: "Draft",
      percentage: "0.00%",
      count: "0 / 1",
      color: "text-default",
    },
  ];

  return (
    <div className="quick-top-stats mb-6">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            className="
              bg-white
              border
              border-solid
              border-neutral-300/80
              shadow-sm
              py-2
              px-3.5
              rounded-lg
              text-sm
              hover:bg-neutral-100
              text-neutral-600
              hover:text-neutral-600
              focus:text-neutral-600
              text-left
            "
          >
            <div className="flex items-center">
              <span
                className={`font-normal text-base inline-flex items-center ${stat.color}`}
              >
                {stat.label}
              </span>

              <span className="ml-2 text-xs text-neutral-500 mt-px">
                ({stat.percentage})
              </span>
            </div>

            <div className="mt-0.5">
              <div className="text-neutral-600">
                <span className="font-semibold">
                  {stat.count}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// =======================================================
// STATUS BADGE
// =======================================================

const StatusBadge = ({ status }) => {
  const statusClasses = {
    Draft: "bg-muted text-muted-foreground",

    Sent: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",

    Open: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",

    Paid: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",

    PartiallyPaid:
      "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",

    Overdue: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",

    Cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-300",

    Unpaid:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
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
// INVOICES LIST
// =======================================================

const InvoicesList = () => {
  // =====================================================
  // DATA STATE
  // =====================================================

  const [invoices, setInvoices] = useState(INITIAL_INVOICES);

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
  // SEARCH STATE
  // =====================================================

  const [searchQuery, setSearchQuery] = useState("");

  // =====================================================
  // DIALOG STATE
  // =====================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // =====================================================
  // SELECTED INVOICE
  // =====================================================

  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // =====================================================
  // SEARCH DATA
  // =====================================================

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return invoices;
    }

    const search = searchQuery.toLowerCase().trim();

    return invoices.filter(
      (invoice) =>
        String(invoice.id).toLowerCase().includes(search) ||
        String(invoice.invoiceNo || invoice.invoiceNumber || "")
          .toLowerCase()
          .includes(search) ||
        String(invoice.amount || "")
          .toLowerCase()
          .includes(search) ||
        String(invoice.totalTax || "")
          .toLowerCase()
          .includes(search) ||
        String(invoice.date || invoice.invoiceDate || "")
          .toLowerCase()
          .includes(search) ||
        String(invoice.customer || "")
          .toLowerCase()
          .includes(search) ||
        String(invoice.project || "")
          .toLowerCase()
          .includes(search) ||
        (Array.isArray(invoice.tags)
          ? invoice.tags.join(" ").toLowerCase()
          : String(invoice.tags || "").toLowerCase()
        ).includes(search) ||
        String(invoice.dueDate || "")
          .toLowerCase()
          .includes(search) ||
        String(invoice.status || "")
          .toLowerCase()
          .includes(search),
    );
  }, [searchQuery, invoices]);

  // =====================================================
  // VIEW INVOICE
  // =====================================================

  const handleView = (invoice) => {
    if (!invoice?.id) return;

    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  // =====================================================
  // EDIT INVOICE
  // =====================================================

  const handleEdit = (invoice) => {
    if (!invoice?.id) return;

    setSelectedInvoice(invoice);
    setEditDialogOpen(true);
  };

  // =====================================================
  // DELETE INVOICE
  // =====================================================

  const handleDelete = (invoice) => {
    if (!invoice?.id) return;

    setSelectedInvoice(invoice);
    setDeleteDialogOpen(true);
  };

  // =====================================================
  // CONFIRM DELETE
  // =====================================================

  const confirmDelete = () => {
    if (!selectedInvoice?.id) {
      return;
    }

    setInvoices((previous) =>
      previous.filter((invoice) => invoice.id !== selectedInvoice.id),
    );

    toast.success(
      `Invoice ${
        selectedInvoice.invoiceNo || selectedInvoice.invoiceNumber || ""
      } deleted successfully.`,
    );

    setDeleteDialogOpen(false);
    setSelectedInvoice(null);
  };

  // =====================================================
  // ADD SUCCESS
  // =====================================================

  const handleAddSuccess = (newInvoice) => {
    if (!newInvoice) {
      setAddDialogOpen(false);
      return;
    }

    const invoiceToAdd = {
      ...newInvoice,

      id: newInvoice.id || Date.now(),

      invoiceNo:
        newInvoice.invoiceNo ||
        newInvoice.invoiceNumber ||
        `INV-${String(Date.now()).slice(-6)}`,

      invoiceNumber:
        newInvoice.invoiceNumber ||
        newInvoice.invoiceNo ||
        `INV-${String(Date.now()).slice(-6)}`,

      amount:
        newInvoice.amount || `$${Number(newInvoice.total || 0).toFixed(2)}`,

      totalTax:
        newInvoice.totalTaxFormatted ||
        `$${Number(newInvoice.totalTax || 0).toFixed(2)}`,

      totalTaxAmount: Number(newInvoice.totalTax || 0),

      date: newInvoice.date || newInvoice.invoiceDate || "",

      invoiceDate: newInvoice.invoiceDate || newInvoice.date || "",

      customer: newInvoice.customer || "",

      project: newInvoice.project || "",

      dueDate: newInvoice.dueDate || "",

      status: newInvoice.statusName || newInvoice.status || "Draft",

      tags: Array.isArray(newInvoice.tags)
        ? newInvoice.tags
        : String(newInvoice.tags || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
    };

    setInvoices((previous) => [invoiceToAdd, ...previous]);

    setAddDialogOpen(false);

    toast.success("Invoice added successfully.");
  };

  // =====================================================
  // UPDATE SUCCESS
  // =====================================================

  const handleUpdateSuccess = (updatedInvoice) => {
    if (!updatedInvoice?.id) {
      setEditDialogOpen(false);
      return;
    }

    const invoiceToUpdate = {
      ...updatedInvoice,

      invoiceNo: updatedInvoice.invoiceNo || updatedInvoice.invoiceNumber,

      invoiceNumber: updatedInvoice.invoiceNumber || updatedInvoice.invoiceNo,

      date: updatedInvoice.date || updatedInvoice.invoiceDate,

      invoiceDate: updatedInvoice.invoiceDate || updatedInvoice.date,

      customer: updatedInvoice.customer || "",

      project: updatedInvoice.project || "",

      tags: Array.isArray(updatedInvoice.tags)
        ? updatedInvoice.tags
        : String(updatedInvoice.tags || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),

      amount:
        updatedInvoice.amount ||
        `$${Number(updatedInvoice.total || 0).toFixed(2)}`,

      totalTax:
        updatedInvoice.totalTaxFormatted ||
        `$${Number(updatedInvoice.totalTax || 0).toFixed(2)}`,

      totalTaxAmount: Number(updatedInvoice.totalTax || 0),
    };

    setInvoices((previous) =>
      previous.map((invoice) =>
        invoice.id === updatedInvoice.id
          ? {
              ...invoice,
              ...invoiceToUpdate,
            }
          : invoice,
      ),
    );

    setEditDialogOpen(false);
    setSelectedInvoice(null);

    toast.success("Invoice updated successfully.");
  };

  // =====================================================
  // COLUMNS
  // =====================================================

  const columns = useMemo(
    () => [
      // =================================================
      // INVOICE #
      // =================================================

      {
        accessorKey: "invoiceNo",

        id: "invoiceNo",

        header: ({ column }) => (
          <DataGridColumnHeader title="Invoice #" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.invoiceNo || row.original.invoiceNumber || "-"}
          </span>
        ),

        size: 140,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Invoice #",

          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },

      // =================================================
      // AMOUNT
      // =================================================

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

      // =================================================
      // TOTAL TAX
      // =================================================

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

      // =================================================
      // DATE
      // =================================================

      {
        accessorKey: "date",

        id: "date",

        header: ({ column }) => (
          <DataGridColumnHeader title="Date" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span>{row.original.date || row.original.invoiceDate || "-"}</span>
        ),

        size: 140,

        enableSorting: true,

        meta: {
          headerTitle: "Date",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // =================================================
      // CUSTOMER
      // =================================================

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

      // =================================================
      // PROJECT
      // =================================================

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

      // =================================================
      // TAGS
      // =================================================

      {
        accessorKey: "tags",

        id: "tags",

        header: ({ column }) => (
          <DataGridColumnHeader title="Tags" column={column} visibility />
        ),

        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.tags?.length ? (
              row.original.tags.map((tag, index) => (
                <span
                  key={`${tag}-${index}`}
                  className="inline-flex rounded-md bg-muted px-2 py-1 text-xs"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span>-</span>
            )}
          </div>
        ),

        size: 200,

        enableSorting: false,

        meta: {
          headerTitle: "Tags",

          skeleton: <Skeleton className="h-7 w-28" />,
        },
      },

      // =================================================
      // DUE DATE
      // =================================================

      {
        accessorKey: "dueDate",

        id: "dueDate",

        header: ({ column }) => (
          <DataGridColumnHeader title="Due Date" column={column} visibility />
        ),

        cell: ({ row }) => <span>{row.original.dueDate || "-"}</span>,

        size: 140,

        enableSorting: true,

        meta: {
          headerTitle: "Due Date",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // =================================================
      // STATUS
      // =================================================

      {
        accessorKey: "status",

        id: "status",

        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),

        cell: ({ row }) => <StatusBadge status={row.original.status} />,

        size: 130,

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

        cell: ({ row }) => {
          const invoice = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-7 w-7" mode="icon" variant="ghost">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="bottom" align="start">
                {/* VIEW */}

                {canView && (
                  <DropdownMenuItem onClick={() => handleView(invoice)}>
                    View Invoice
                  </DropdownMenuItem>
                )}

                {/* EDIT */}

                {canEdit && (
                  <DropdownMenuItem onClick={() => handleEdit(invoice)}>
                    Edit Invoice
                  </DropdownMenuItem>
                )}

                {/* DELETE SEPARATOR */}

                {(canView || canEdit) && canDelete && <DropdownMenuSeparator />}

                {/* DELETE */}

                {canDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleDelete(invoice)}
                  >
                    Delete Invoice
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },

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
              placeholder="Search invoices"
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

        {/* ADD INVOICE */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus />
              Add Invoice
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
              You do not have permission to view invoices.
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
      {/* =================================================
          STATIC QUICK TOP STATS
      ================================================= */}

      <InvoiceQuickStats />

      {/* =================================================
          INVOICES DATA GRID
      ================================================= */}

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
          ADD INVOICE
      ================================================= */}

      <InvoicesAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={handleAddSuccess}
      />

      {/* =================================================
          VIEW INVOICE
      ================================================= */}

      <InvoicesViewDialog
        open={viewDialogOpen}
        closeDialog={() => {
          setViewDialogOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />

      {/* =================================================
          EDIT INVOICE
      ================================================= */}

      <InvoicesEditDialog
        open={editDialogOpen}
        closeDialog={() => {
          setEditDialogOpen(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        onSuccess={handleUpdateSuccess}
      />

      {/* =================================================
          DELETE CONFIRMATION
      ================================================= */}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to delete invoice{" "}
              <strong>
                {selectedInvoice?.invoiceNo ||
                  selectedInvoice?.invoiceNumber ||
                  ""}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setSelectedInvoice(null);
              }}
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InvoicesList;
