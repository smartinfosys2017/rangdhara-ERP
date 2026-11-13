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

import EstimatesAddDialog from "./estimates-add-dialog";
import EstimatesEditDialog from "./estimates-edit-dialog";
import EstimatesViewDialog from "./estimates-view-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "estimates.view",
  "estimates.manage",
  "estimates.edit",
  "estimates.delete",
];

const canView = can("estimates.view", permissions);

const canManage = can("estimates.manage", permissions);

const canEdit = can("estimates.edit", permissions);

const canDelete = can("estimates.delete", permissions);

// =======================================================
// STATIC ESTIMATES DATA
// =======================================================

const STATIC_ESTIMATES = [
  {
    id: 3,

    estimateNumber: "EST-0003",
    estimateNo: "EST-0003",

    amount: "$5,750.00",
    total: 5750,

    totalTax: "$690.00",
    totalTaxAmount: 690,

    subtotal: 5750,

    customerId: "1",
    customer: "Acme Corporation",

    projectId: "",
    project: "E-Commerce Development",

    tags: ["E-Commerce", "Website"],

    estimateDate: "2026-09-02",
    date: "2026-09-02",

    expiryDate: "2026-09-16",

    referenceNo: "REF-2026-003",

    status: "Sent",

    currency: "1",
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

    shipping: null,

    includeShipping: false,
    showShippingOnEstimate: true,

    showQuantityAs: "1",

    items: [
      {
        id: "1",
        description: "Website Development",
        longDescription: "Professional website development services.",
        quantity: 1,
        unit: "project",
        rate: 5750,
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

    adminNote: "",
    clientNote: "",
    terms: "",
  },

  {
    id: 2,

    estimateNumber: "EST-0002",
    estimateNo: "EST-0002",

    amount: "$2,500.00",
    total: 2500,

    totalTax: "$300.00",
    totalTaxAmount: 300,

    subtotal: 2500,

    customerId: "2",
    customer: "John Smith",

    projectId: "",
    project: "Marketing Campaign",

    tags: ["Marketing", "SEO"],

    estimateDate: "2026-09-01",
    date: "2026-09-01",

    expiryDate: "2026-09-15",

    referenceNo: "REF-2026-002",

    status: "Accepted",

    currency: "1",
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
    showShippingOnEstimate: true,

    showQuantityAs: "1",

    items: [
      {
        id: "2",
        description: "UI/UX Design",
        longDescription: "UI and UX design services.",
        quantity: 1,
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
    ],

    adminNote: "",
    clientNote: "",
    terms: "",
  },

  {
    id: 1,

    estimateNumber: "EST-0001",
    estimateNo: "EST-0001",

    amount: "$1,800.00",
    total: 1800,

    totalTax: "$216.00",
    totalTaxAmount: 216,

    subtotal: 1800,

    customerId: "3",
    customer: "Creative Studio",

    projectId: "",
    project: "UI/UX Redesign",

    tags: ["Design", "UI/UX"],

    estimateDate: "2026-08-28",
    date: "2026-08-28",

    expiryDate: "2026-09-10",

    referenceNo: "REF-2026-001",

    status: "Draft",

    currency: "1",
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
    showShippingOnEstimate: true,

    showQuantityAs: "1",

    items: [
      {
        id: "3",
        description: "UI/UX Design",
        longDescription: "UI and UX design services.",
        quantity: 1,
        unit: "project",
        rate: 1800,
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

    adminNote: "",
    clientNote: "",
    terms: "",
  },
];

// =======================================================
// STATUS BADGE
// =======================================================

const StatusBadge = ({ status }) => {
  const statusClasses = {
    Draft: "bg-muted text-muted-foreground",

    Sent: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",

    Open: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",

    Revised:
      "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",

    Declined: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",

    Accepted:
      "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",

    Expired:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  };

  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
        statusClasses[status] || "bg-muted text-muted-foreground"
      }`}
    >
      {status || "-"}
    </span>
  );
};

// =======================================================
// ESTIMATES LIST
// =======================================================

const EstimatesList = () => {
  // =======================================================
  // TABLE STATE
  // =======================================================

  const [data, setData] = useState(STATIC_ESTIMATES);

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
  // DIALOG STATE
  // =======================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // =======================================================
  // SELECTED ESTIMATE
  // =======================================================

  const [selectedEstimate, setSelectedEstimate] = useState(null);

  const [estimateToDelete, setEstimateToDelete] = useState(null);

  // =======================================================
  // ADD
  // =======================================================

  const handleAdd = () => {
    setAddDialogOpen(true);
  };

  const handleAddSuccess = (newEstimate) => {
    const generatedId =
      Math.max(0, ...data.map((item) => Number(item.id) || 0)) + 1;

    const estimateNumber =
      newEstimate.estimateNumber ||
      `EST-${String(generatedId).padStart(4, "0")}`;

    const normalizedEstimate = {
      ...newEstimate,

      id: generatedId,

      estimateNumber,

      estimateNo: estimateNumber,

      customer: newEstimate.customer || "-",

      project: newEstimate.project || "-",

      date: newEstimate.estimateDate || newEstimate.date || "",

      amount: `$${Number(newEstimate.total || 0).toFixed(2)}`,

      totalTax: `$${Number(newEstimate.totalTax || 0).toFixed(2)}`,

      tags: Array.isArray(newEstimate.tags)
        ? newEstimate.tags
        : String(newEstimate.tags || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
    };

    setData((previous) => [normalizedEstimate, ...previous]);

    setAddDialogOpen(false);

    setPagination((previous) => ({
      ...previous,
      pageIndex: 0,
    }));

    toast.success("Estimate added successfully.");
  };

  // =======================================================
  // VIEW
  // =======================================================

  const handleView = (estimate) => {
    setSelectedEstimate(estimate);

    setViewDialogOpen(true);
  };

  // =======================================================
  // EDIT
  // =======================================================

  const handleEdit = (estimate) => {
    if (!estimate?.id) {
      toast.error("Estimate ID is missing.");

      return;
    }

    setSelectedEstimate(estimate);

    setEditDialogOpen(true);
  };

  const handleEditSuccess = (updatedEstimate) => {
    if (!updatedEstimate?.id) {
      toast.error("Updated estimate ID is missing.");

      return;
    }

    const estimateNumber =
      updatedEstimate.estimateNumber || `EST-${updatedEstimate.id}`;

    const normalizedEstimate = {
      ...updatedEstimate,

      estimateNumber,

      estimateNo: estimateNumber,

      customer: updatedEstimate.customer || "-",

      project: updatedEstimate.project || "-",

      date: updatedEstimate.estimateDate || updatedEstimate.date || "",

      amount: `$${Number(updatedEstimate.total || 0).toFixed(2)}`,

      totalTax: `$${Number(updatedEstimate.totalTax || 0).toFixed(2)}`,

      tags: Array.isArray(updatedEstimate.tags)
        ? updatedEstimate.tags
        : String(updatedEstimate.tags || "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
    };

    setData((previous) =>
      previous.map((item) =>
        String(item.id) === String(updatedEstimate.id)
          ? {
              ...item,
              ...normalizedEstimate,
            }
          : item,
      ),
    );

    setEditDialogOpen(false);

    setSelectedEstimate(null);

    toast.success("Estimate updated successfully.");
  };

  // =======================================================
  // DELETE
  // =======================================================

  const handleDeleteClick = (estimate) => {
    if (!estimate?.id) {
      toast.error("Estimate ID is missing.");

      return;
    }

    setEstimateToDelete(estimate);

    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!estimateToDelete?.id) {
      return;
    }

    const deletedId = estimateToDelete.id;

    setData((previous) =>
      previous.filter((item) => String(item.id) !== String(deletedId)),
    );

    setDeleteDialogOpen(false);

    setEstimateToDelete(null);

    setSelectedEstimate(null);

    toast.success("Estimate deleted successfully.");

    setPagination((previous) => ({
      ...previous,
      pageIndex: 0,
    }));
  };

  // =======================================================
  // SEARCH DATA
  // =======================================================

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return data;
    }

    const search = searchQuery.toLowerCase().trim();

    return data.filter((estimate) => {
      const tags = Array.isArray(estimate.tags)
        ? estimate.tags.join(" ")
        : String(estimate.tags || "");

      return (
        String(estimate.id || "")
          .toLowerCase()
          .includes(search) ||
        String(estimate.estimateNo || estimate.estimateNumber || "")
          .toLowerCase()
          .includes(search) ||
        String(estimate.amount || "")
          .toLowerCase()
          .includes(search) ||
        String(estimate.totalTax || "")
          .toLowerCase()
          .includes(search) ||
        String(estimate.customer || "")
          .toLowerCase()
          .includes(search) ||
        String(estimate.project || "")
          .toLowerCase()
          .includes(search) ||
        tags.toLowerCase().includes(search) ||
        String(estimate.date || estimate.estimateDate || "")
          .toLowerCase()
          .includes(search) ||
        String(estimate.expiryDate || "")
          .toLowerCase()
          .includes(search) ||
        String(estimate.referenceNo || "")
          .toLowerCase()
          .includes(search) ||
        String(estimate.status || "")
          .toLowerCase()
          .includes(search)
      );
    });
  }, [data, searchQuery]);

  // =======================================================
  // COLUMNS
  // =======================================================

  const columns = useMemo(
    () => [
      // ===================================================
      // ESTIMATE #
      // ===================================================

      {
        accessorKey: "estimateNo",

        id: "estimateNo",

        header: ({ column }) => (
          <DataGridColumnHeader title="Estimate #" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.estimateNo || row.original.estimateNumber || "-"}
          </span>
        ),

        size: 140,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Estimate #",

          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },

      // ===================================================
      // AMOUNT
      // ===================================================

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

      // ===================================================
      // TOTAL TAX
      // ===================================================

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

      // ===================================================
      // CUSTOMER
      // ===================================================

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

      // ===================================================
      // PROJECT
      // ===================================================

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

      // ===================================================
      // TAGS
      // ===================================================

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

      // ===================================================
      // DATE
      // ===================================================

      {
        accessorKey: "date",

        id: "date",

        header: ({ column }) => (
          <DataGridColumnHeader title="Date" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span>{row.original.date || row.original.estimateDate || "-"}</span>
        ),

        size: 140,

        enableSorting: true,

        meta: {
          headerTitle: "Date",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // ===================================================
      // EXPIRY DATE
      // ===================================================

      {
        accessorKey: "expiryDate",

        id: "expiryDate",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Expiry Date"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => <span>{row.original.expiryDate || "-"}</span>,

        size: 140,

        enableSorting: true,

        meta: {
          headerTitle: "Expiry Date",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // ===================================================
      // REFERENCE #
      // ===================================================

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

          skeleton: <Skeleton className="h-7 w-28" />,
        },
      },

      // ===================================================
      // STATUS
      // ===================================================

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

      // ===================================================
      // ACTIONS
      // ===================================================

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
              {/* VIEW */}
              {canView && (
                <DropdownMenuItem onClick={() => handleView(row.original)}>
                  View Estimate
                </DropdownMenuItem>
              )}

              {/* EDIT */}
              {canEdit && (
                <DropdownMenuItem onClick={() => handleEdit(row.original)}>
                  Edit Estimate
                </DropdownMenuItem>
              )}

              {/* SEPARATOR */}
              {(canView || canEdit) && canDelete && <DropdownMenuSeparator />}

              {/* DELETE */}
              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDeleteClick(row.original)}
                >
                  Delete Estimate
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
    [canView, canEdit, canDelete],
  );

  // =======================================================
  // TABLE
  // =======================================================

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

  // =======================================================
  // TOOLBAR
  // =======================================================

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
              placeholder="Search estimates"
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

        {/* ADD ESTIMATE */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button onClick={handleAdd}>
              <Plus />
              Add Estimate
            </Button>
          </div>
        )}
      </CardHeader>
    );
  };

  // =======================================================
  // ACCESS DENIED
  // =======================================================

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Access Denied</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view estimates.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }
   // =======================================================
  // ESTIMATE STATUS SUMMARY
  // =======================================================

  const totalEstimates = data.length;

  const draftEstimates = data.filter(
    (estimate) => estimate.status === "Draft",
  ).length;

  const sentEstimates = data.filter(
    (estimate) => estimate.status === "Sent",
  ).length;

  const expiredEstimates = data.filter(
    (estimate) => estimate.status === "Expired",
  ).length;

  const declinedEstimates = data.filter(
    (estimate) => estimate.status === "Declined",
  ).length;

  const acceptedEstimates = data.filter(
    (estimate) => estimate.status === "Accepted",
  ).length;

  const getPercentage = (count) => {
    if (!totalEstimates) {
      return "0.00";
    }

    return ((count / totalEstimates) * 100).toFixed(2);
  };
  // =======================================================
  // RENDER
  // =======================================================

  return (
    <>
       {/* ===================================================
          QUICK TOP STATS
      =================================================== */}

      <div className="mb-6">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">

          {/* =================================================
              DRAFT
          ================================================= */}

          <button
            type="button"
            onClick={() => setSearchQuery("Draft")}
            className="
              rounded-lg
              border
              border-border
              bg-white
              px-3.5
              py-2
              text-left
              text-sm
              text-muted-foreground
              shadow-sm
              transition-colors
              hover:bg-muted/50
              focus:outline-none
              focus:ring-2
              focus:ring-primary/20
            "
          >
            <div className="flex items-center">
              <span className="inline-flex items-center text-base font-normal text-foreground">
                Draft
              </span>

              <span className="ml-2 mt-px text-xs text-muted-foreground">
                ({getPercentage(draftEstimates)}%)
              </span>
            </div>

            <div className="mt-0.5">
              <div className="text-muted-foreground">
                <span className="font-semibold">
                  {draftEstimates} / {totalEstimates}
                </span>
              </div>
            </div>
          </button>

          {/* =================================================
              SENT
          ================================================= */}

          <button
            type="button"
            onClick={() => setSearchQuery("Sent")}
            className="
              rounded-lg
              border
              border-border
              bg-white
              px-3.5
              py-2
              text-left
              text-sm
              text-muted-foreground
              shadow-sm
              transition-colors
              hover:bg-muted/50
              focus:outline-none
              focus:ring-2
              focus:ring-primary/20
            "
          >
            <div className="flex items-center">
              <span className="inline-flex items-center text-base font-normal text-blue-600">
                Sent
              </span>

              <span className="ml-2 mt-px text-xs text-muted-foreground">
                ({getPercentage(sentEstimates)}%)
              </span>
            </div>

            <div className="mt-0.5">
              <div className="text-muted-foreground">
                <span className="font-semibold">
                  {sentEstimates} / {totalEstimates}
                </span>
              </div>
            </div>
          </button>

          {/* =================================================
              EXPIRED
          ================================================= */}

          <button
            type="button"
            onClick={() => setSearchQuery("Expired")}
            className="
              rounded-lg
              border
              border-border
              bg-white
              px-3.5
              py-2
              text-left
              text-sm
              text-muted-foreground
              shadow-sm
              transition-colors
              hover:bg-muted/50
              focus:outline-none
              focus:ring-2
              focus:ring-primary/20
            "
          >
            <div className="flex items-center">
              <span className="inline-flex items-center text-base font-normal text-yellow-600">
                Expired
              </span>

              <span className="ml-2 mt-px text-xs text-muted-foreground">
                ({getPercentage(expiredEstimates)}%)
              </span>
            </div>

            <div className="mt-0.5">
              <div className="text-muted-foreground">
                <span className="font-semibold">
                  {expiredEstimates} / {totalEstimates}
                </span>
              </div>
            </div>
          </button>

          {/* =================================================
              DECLINED
          ================================================= */}

          <button
            type="button"
            onClick={() => setSearchQuery("Declined")}
            className="
              rounded-lg
              border
              border-border
              bg-white
              px-3.5
              py-2
              text-left
              text-sm
              text-muted-foreground
              shadow-sm
              transition-colors
              hover:bg-muted/50
              focus:outline-none
              focus:ring-2
              focus:ring-primary/20
            "
          >
            <div className="flex items-center">
              <span className="inline-flex items-center text-base font-normal text-red-600">
                Declined
              </span>

              <span className="ml-2 mt-px text-xs text-muted-foreground">
                ({getPercentage(declinedEstimates)}%)
              </span>
            </div>

            <div className="mt-0.5">
              <div className="text-muted-foreground">
                <span className="font-semibold">
                  {declinedEstimates} / {totalEstimates}
                </span>
              </div>
            </div>
          </button>

          {/* =================================================
              ACCEPTED
          ================================================= */}

          <button
            type="button"
            onClick={() => setSearchQuery("Accepted")}
            className="
              rounded-lg
              border
              border-border
              bg-white
              px-3.5
              py-2
              text-left
              text-sm
              text-muted-foreground
              shadow-sm
              transition-colors
              hover:bg-muted/50
              focus:outline-none
              focus:ring-2
              focus:ring-primary/20
            "
          >
            <div className="flex items-center">
              <span className="inline-flex items-center text-base font-normal text-green-600">
                Accepted
              </span>

              <span className="ml-2 mt-px text-xs text-muted-foreground">
                ({getPercentage(acceptedEstimates)}%)
              </span>
            </div>

            <div className="mt-0.5">
              <div className="text-muted-foreground">
                <span className="font-semibold">
                  {acceptedEstimates} / {totalEstimates}
                </span>
              </div>
            </div>
          </button>

        </div>
      </div>
      {/* ===================================================
          ESTIMATES DATA GRID
      =================================================== */}

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
          ADD ESTIMATE
      ================================================= */}

      <EstimatesAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={handleAddSuccess}
      />

      {/* =================================================
          EDIT ESTIMATE
      ================================================= */}

      <EstimatesEditDialog
        open={editDialogOpen}
        closeDialog={() => {
          setEditDialogOpen(false);
          setSelectedEstimate(null);
        }}
        estimate={selectedEstimate}
        onSuccess={handleEditSuccess}
      />

      {/* =================================================
          VIEW ESTIMATE
      ================================================= */}

      <EstimatesViewDialog
        open={viewDialogOpen}
        closeDialog={() => {
          setViewDialogOpen(false);
          setSelectedEstimate(null);
        }}
        estimate={selectedEstimate}
      />

      {/* =================================================
          DELETE CONFIRMATION
      ================================================= */}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Estimate?</AlertDialogTitle>

            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {estimateToDelete?.estimateNo ||
                  estimateToDelete?.estimateNumber ||
                  "this estimate"}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setEstimateToDelete(null);
              }}
            >
              Cancel
            </AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EstimatesList;
