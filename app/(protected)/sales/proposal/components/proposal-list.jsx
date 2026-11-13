"use client";

import { useMemo, useState } from "react";

import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Plus, Search, X } from "lucide-react";

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

import ProposalAddDialog from "./proposal-add-dialog";
import ProposalEditDialog from "./proposal-edit-dialog";
import ProposalViewDialog from "./proposal-view-dialog";
import ProposalDeleteDialog from './proposal-delete-dialog';

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "proposal.view",
  "proposal.manage",
  "proposal.edit",
  "proposal.delete",
];

const canView = can("proposal.view", permissions);

const canManage = can("proposal.manage", permissions);

const canEdit = can("proposal.edit", permissions);

const canDelete = can("proposal.delete", permissions);

// =======================================================
// STATIC PROPOSALS DATA
// =======================================================

const STATIC_PROPOSALS = [
  {
    id: 4,
    subject: "E-Commerce Website Proposal",
    to: "Acme Corporation",
    total: "$5,750.00",
    date: "2026-08-30",
    openTill: "2026-09-10",
    project: "E-Commerce Development",
    tags: ["E-Commerce"],
    dateCreated: "2026-08-30 11:15",
    status: "Open",

    proposalTo: "Acme Corporation",
    currency: "1",
    discountType: "percent",
    discount: 0,
    allowComments: true,
    relType: "Customer",
    relId: "",
    projectId: "",
    address: "",
    city: "",
    state: "",
    country: "77",
    zip: "",
    email: "",
    phone: "",
    assigned: "",
    showQuantityAs: "Qty",
    adjustment: 0,
    subtotal: 5000,
    taxTotal: 750,
    discountTotal: 0,

    items: [
      {
        id: 1,
        description: "Website Design & Development",
        long_description: "Complete e-commerce website design and development.",
        quantity: 1,
        unit: "Project",
        rate: 5000,
        taxname: ["IGST|12.00"],
        optional: false,
      },
    ],
  },

  {
    id: 3,
    subject: "WordPress Maintenance Proposal",
    to: "Michael Brown",
    total: "$850.00",
    date: "2026-08-28",
    openTill: "2026-09-05",
    project: "Maintenance",
    tags: ["WordPress", "Maintenance"],
    dateCreated: "2026-08-28 16:45",
    status: "Accepted",

    proposalTo: "Michael Brown",
    currency: "1",
    discountType: "percent",
    discount: 0,
    allowComments: true,
    relType: "Customer",
    relId: "",
    projectId: "",
    address: "",
    city: "",
    state: "",
    country: "77",
    zip: "",
    email: "",
    phone: "",
    assigned: "",
    showQuantityAs: "Qty",
    adjustment: 0,
    subtotal: 850,
    taxTotal: 0,
    discountTotal: 0,

    items: [
      {
        id: 1,
        description: "WordPress Maintenance",
        long_description: "Monthly WordPress maintenance and support.",
        quantity: 1,
        unit: "Month",
        rate: 850,
        taxname: [],
        optional: false,
      },
    ],
  },

  {
    id: 2,
    subject: "UI/UX Design Proposal",
    to: "Creative Studio",
    total: "$1,800.00",
    date: "2026-08-25",
    openTill: "2026-09-03",
    project: "UI/UX Redesign",
    tags: ["Design", "UI/UX"],
    dateCreated: "2026-08-25 10:10",
    status: "Revised",

    proposalTo: "Creative Studio",
    currency: "1",
    discountType: "percent",
    discount: 0,
    allowComments: true,
    relType: "Customer",
    relId: "",
    projectId: "",
    address: "",
    city: "",
    state: "",
    country: "77",
    zip: "",
    email: "",
    phone: "",
    assigned: "",
    showQuantityAs: "Qty",
    adjustment: 0,
    subtotal: 1800,
    taxTotal: 0,
    discountTotal: 0,

    items: [
      {
        id: 1,
        description: "UI/UX Design",
        long_description: "Complete UI/UX redesign for the website.",
        quantity: 1,
        unit: "Project",
        rate: 1800,
        taxname: [],
        optional: false,
      },
    ],
  },

  {
    id: 1,
    subject: "SEO Services Proposal",
    to: "Global Solutions",
    total: "$1,200.00",
    date: "2026-08-20",
    openTill: "2026-08-30",
    project: "SEO",
    tags: ["SEO"],
    dateCreated: "2026-08-20 13:35",
    status: "Declined",

    proposalTo: "Global Solutions",
    currency: "1",
    discountType: "percent",
    discount: 0,
    allowComments: true,
    relType: "Customer",
    relId: "",
    projectId: "",
    address: "",
    city: "",
    state: "",
    country: "77",
    zip: "",
    email: "",
    phone: "",
    assigned: "",
    showQuantityAs: "Qty",
    adjustment: 0,
    subtotal: 1200,
    taxTotal: 0,
    discountTotal: 0,

    items: [
      {
        id: 1,
        description: "SEO Services",
        long_description: "Monthly SEO optimization and reporting.",
        quantity: 1,
        unit: "Month",
        rate: 1200,
        taxname: [],
        optional: false,
      },
    ],
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
// PROPOSALS LIST
// =======================================================

const ProposalList = () => {
  // =====================================================
  // TABLE STATE
  // =====================================================

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState([
    {
      id: "dateCreated",
      desc: true,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");

  // =====================================================
  // PROPOSALS STATE
  // =====================================================

  const [proposals, setProposals] = useState(STATIC_PROPOSALS);

  // =====================================================
  // DIALOG STATE
  // =====================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [selectedProposal, setSelectedProposal] = useState(null);
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // =====================================================
  // VIEW PROPOSAL
  // =====================================================

  const handleViewProposal = (proposal) => {
    setSelectedProposal(proposal);
    setViewDialogOpen(true);
  };

  // =====================================================
  // EDIT PROPOSAL
  // =====================================================

  const handleEditProposal = (proposal) => {
    setSelectedProposal(proposal);
    setEditDialogOpen(true);
  };

  // =====================================================
  // DELETE PROPOSAL
  // =====================================================

  const handleDeleteProposal = (proposal) => {
    setSelectedProposal(proposal);
    setDeleteDialogOpen(true);
  };

  // =====================================================
  // SEARCH DATA
  // =====================================================

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return proposals;
    }

    const search = searchQuery.toLowerCase().trim();

    return proposals.filter(
      (proposal) =>
        String(proposal.id).toLowerCase().includes(search) ||
        String(proposal.subject || "")
          .toLowerCase()
          .includes(search) ||
        String(proposal.to || "")
          .toLowerCase()
          .includes(search) ||
        String(proposal.total || "")
          .toLowerCase()
          .includes(search) ||
        String(proposal.date || "")
          .toLowerCase()
          .includes(search) ||
        String(proposal.openTill || "")
          .toLowerCase()
          .includes(search) ||
        String(proposal.project || "")
          .toLowerCase()
          .includes(search) ||
        (proposal.tags || []).join(" ").toLowerCase().includes(search) ||
        String(proposal.status || "")
          .toLowerCase()
          .includes(search),
    );
  }, [proposals, searchQuery]);

  // =====================================================
  // COLUMNS
  // =====================================================

  const columns = useMemo(
    () => [
      // =================================================
      // PROPOSAL #
      // =================================================

      {
        accessorKey: "id",

        id: "id",

        header: ({ column }) => (
          <DataGridColumnHeader title="Proposal #" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">#{row.original.id}</span>
        ),

        size: 120,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Proposal #",

          skeleton: <Skeleton className="h-7 w-14" />,
        },
      },

      // =================================================
      // SUBJECT
      // =================================================

      {
        accessorKey: "subject",

        id: "subject",

        header: ({ column }) => (
          <DataGridColumnHeader title="Subject" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.subject || "-"}</span>
        ),

        size: 280,

        enableSorting: true,

        meta: {
          headerTitle: "Subject",

          skeleton: <Skeleton className="h-7 w-44" />,
        },
      },

      // =================================================
      // TO
      // =================================================

      {
        accessorKey: "to",

        id: "to",

        header: ({ column }) => (
          <DataGridColumnHeader title="To" column={column} visibility />
        ),

        cell: ({ row }) => <span>{row.original.to || "-"}</span>,

        size: 200,

        enableSorting: true,

        meta: {
          headerTitle: "To",

          skeleton: <Skeleton className="h-7 w-32" />,
        },
      },

      // =================================================
      // TOTAL
      // =================================================

      {
        accessorKey: "total",

        id: "total",

        header: ({ column }) => (
          <DataGridColumnHeader title="Total" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.total || "$0.00"}</span>
        ),

        size: 140,

        enableSorting: true,

        meta: {
          headerTitle: "Total",

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

        cell: ({ row }) => <span>{row.original.date || "-"}</span>,

        size: 140,

        enableSorting: true,

        meta: {
          headerTitle: "Date",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // =================================================
      // OPEN TILL
      // =================================================

      {
        accessorKey: "openTill",

        id: "openTill",

        header: ({ column }) => (
          <DataGridColumnHeader title="Open Till" column={column} visibility />
        ),

        cell: ({ row }) => <span>{row.original.openTill || "-"}</span>,

        size: 140,

        enableSorting: true,

        meta: {
          headerTitle: "Open Till",

          skeleton: <Skeleton className="h-7 w-24" />,
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
      // DATE CREATED
      // =================================================

      {
        accessorKey: "dateCreated",

        id: "dateCreated",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Date Created"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => <span>{row.original.dateCreated || "-"}</span>,

        size: 180,

        enableSorting: true,

        meta: {
          headerTitle: "Date Created",

          skeleton: <Skeleton className="h-7 w-32" />,
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
          const proposal = row.original;

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
                  <DropdownMenuItem
                    onClick={() => handleViewProposal(proposal)}
                  >
                    View Proposal
                  </DropdownMenuItem>
                )}

                {/* EDIT */}

                {canEdit && (
                  <DropdownMenuItem
                    onClick={() => handleEditProposal(proposal)}
                  >
                    Edit Proposal
                  </DropdownMenuItem>
                )}

                {/* DELETE SEPARATOR */}

                {(canView || canEdit) && canDelete && <DropdownMenuSeparator />}

                {/* DELETE */}

                {canDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleDeleteProposal(proposal)}
                  >
                    Delete Proposal
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
  // ADD SUCCESS
  // =====================================================

  const handleAddSuccess = (newProposal) => {
    setAddDialogOpen(false);

    if (newProposal) {
      setProposals((previous) => [newProposal, ...previous]);
    }
  };

  // =====================================================
  // EDIT SUCCESS
  // =====================================================

  const handleEditSuccess = (updatedProposal) => {
    setEditDialogOpen(false);

    if (!updatedProposal) {
      setSelectedProposal(null);
      return;
    }

    setProposals((previous) =>
      previous.map((proposal) =>
        String(proposal.id) === String(updatedProposal.id)
          ? {
              ...proposal,
              ...updatedProposal,
            }
          : proposal,
      ),
    );

    setSelectedProposal(null);
  };

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
              placeholder="Search proposals"
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

        {/* ADD */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setSelectedProposal(null);
                setAddDialogOpen(true);
              }}
            >
              <Plus />
              Add Proposal
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
              You do not have permission to view proposals.
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
          ADD PROPOSAL
      ================================================= */}

      <ProposalAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={handleAddSuccess}
      />

      {/* =================================================
          EDIT PROPOSAL
      ================================================= */}

      <ProposalEditDialog
        open={editDialogOpen}
        closeDialog={() => {
          setEditDialogOpen(false);
          setSelectedProposal(null);
        }}
        proposal={selectedProposal}
        onSuccess={handleEditSuccess}
      />

      {/* =================================================
          VIEW PROPOSAL
      ================================================= */}

      <ProposalViewDialog
        open={viewDialogOpen}
        closeDialog={() => {
          setViewDialogOpen(false);
          setSelectedProposal(null);
        }}
        proposal={selectedProposal}
      />
      <ProposalDeleteDialog
        open={deleteDialogOpen}
        closeDialog={() => {
          setDeleteDialogOpen(false);
          setSelectedProposal(null);
        }}
        proposal={selectedProposal}
        onSuccess={(deletedProposal) => {
          setProposals((previous) =>
            previous.filter(
              (item) =>
                String(item.id) !==
                String(deletedProposal?.id ?? selectedProposal?.id)
            )
          );

          setDeleteDialogOpen(false);
          setSelectedProposal(null);
        }}
      />
    </>
  );
};

export default ProposalList;
