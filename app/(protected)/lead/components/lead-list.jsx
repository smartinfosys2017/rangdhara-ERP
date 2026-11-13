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

import LeadAddDialog from "./lead-add-dialog";
import LeadEditDialog from "./lead-edit-dialog";
import LeadDeleteDialog from "./lead-delete-dialog";
import LeadViewDialog from "./lead-view-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = ["Lead.view", "Lead.manage", "Lead.edit", "Lead.delete"];

const canView = can("Lead.view", permissions);

const canManage = can("Lead.manage", permissions);

const canEdit = can("Lead.edit", permissions);

const canDelete = can("Lead.delete", permissions);

// =======================================================
// STATIC LEAD DATA
// =======================================================

const STATIC_Lead = [
  {
    id: 1,

    name: "John Smith",
    company: "Acme Corporation",
    email: "john@acme.com",
    phone: "+1 555 123456",
    value: "$5,000",
    tags: "Hot, Website",
    assigned: "David",
    status: "New",
    source: "Website",
    lastContact: "2026-09-03",
    created: "2026-09-04",
  },
  {
    id: 2,
    name: "Sarah Wilson",
    company: "Globex Corporation",
    email: "sarah@globex.com",
    phone: "+1 555 987654",
    value: "$2,500",
    tags: "Cold, SEO",
    assigned: "John",
    status: "Contacted",
    source: "Referral",
    lastContact: "2026-09-01",
    created: "2026-09-02",
  },
];

// =======================================================
// COMPONENT
// =======================================================

const LeadList = () => {
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
  // DIALOG STATE
  // =======================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editLead, setEditLead] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLead, setDeleteLead] = useState(null);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewLead, setViewLead] = useState(null);

  // =======================================================
  // SEARCH DATA
  // =======================================================

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return STATIC_Lead;
    }

    const search = searchQuery.toLowerCase();

    return STATIC_Lead.filter((item) =>
      Object.values(item).join(" ").toLowerCase().includes(search),
    );
  }, [searchQuery]);

  // =======================================================
  // LEADS OVERVIEW
  // =======================================================

  const leadOverview = useMemo(() => {
    const total = STATIC_Lead.length;

    const statusCounts = STATIC_Lead.reduce((acc, lead) => {
      const status = lead.status || "Unknown";

      acc[status] = (acc[status] || 0) + 1;

      return acc;
    }, {});

    const lostCount = statusCounts["Lost"] || 0;

    const lostPercentage =
      total > 0 ? ((lostCount / total) * 100).toFixed(2) : "0.00";

    return {
      total,
      statusCounts,
      lostCount,
      lostPercentage,
    };
  }, []);

  // =======================================================
  // STATUS COLOR
  // =======================================================

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "new":
        return "text-blue-500";

      case "contacted":
        return "text-cyan-500";

      case "qualified":
        return "text-yellow-500";

      case "proposal":
        return "text-purple-500";

      case "customer":
        return "text-green-500";

      case "won":
        return "text-green-600";

      case "lost":
        return "text-red-500";

      default:
        return "text-muted-foreground";
    }
  };

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
              placeholder="Search lead"
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
                className="
                  absolute
                  end-1.5
                  top-1/2
                  h-6
                  w-6
                  -translate-y-1/2
                "
                onClick={handleClearSearch}
              >
                <X />
              </Button>
            )}
          </div>
        </div>

        {/* ADD BUTTON */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setAddDialogOpen(true);
              }}
            >
              <Plus />
              Add Lead
            </Button>
          </div>
        )}
      </CardHeader>
    );
  };

  // =======================================================
  // COLUMNS
  // =======================================================

  const columns = useMemo(
    () => [
      // ID
      {
        accessorKey: "id",
        id: "id",

        header: ({ column }) => (
          <DataGridColumnHeader title="#" column={column} visibility />
        ),

        cell: ({ row }) => <span>#{row.original.id}</span>,

        size: 80,
      },

      // NAME
      {
        accessorKey: "name",
        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader title="Name" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.name}</span>
        ),

        size: 180,
      },

      // COMPANY
      {
        accessorKey: "company",
        id: "company",

        header: ({ column }) => (
          <DataGridColumnHeader title="Company" column={column} visibility />
        ),

        cell: ({ row }) => row.original.company,

        size: 180,
      },

      // EMAIL
      {
        accessorKey: "email",
        id: "email",

        header: ({ column }) => (
          <DataGridColumnHeader title="Email" column={column} visibility />
        ),

        cell: ({ row }) => row.original.email,

        size: 220,
      },

      // PHONE
      {
        accessorKey: "phone",
        id: "phone",

        header: ({ column }) => (
          <DataGridColumnHeader title="Phone" column={column} visibility />
        ),

        cell: ({ row }) => row.original.phone,

        size: 150,
      },

      // VALUE
      {
        accessorKey: "value",
        id: "value",

        header: ({ column }) => (
          <DataGridColumnHeader title="Value" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.value}</span>
        ),

        size: 120,
      },

      // TAGS
      {
        accessorKey: "tags",
        id: "tags",

        header: ({ column }) => (
          <DataGridColumnHeader title="Tags" column={column} visibility />
        ),

        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.split(",").map((tag, index) => (
              <span
                key={index}
                className="
                  rounded
                  bg-muted
                  px-2
                  py-1
                  text-xs
                "
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        ),

        size: 180,
      },

      // ASSIGNED
      {
        accessorKey: "assigned",
        id: "assigned",

        header: ({ column }) => (
          <DataGridColumnHeader title="Assigned" column={column} visibility />
        ),

        cell: ({ row }) => row.original.assigned,

        size: 150,
      },

      // STATUS
      {
        accessorKey: "status",
        id: "status",

        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span
            className="
              rounded-md
              bg-muted
              px-2.5
              py-1
              text-xs
            "
          >
            {row.original.status}
          </span>
        ),

        size: 120,
      },

      // SOURCE
      {
        accessorKey: "source",
        id: "source",

        header: ({ column }) => (
          <DataGridColumnHeader title="Source" column={column} visibility />
        ),

        cell: ({ row }) => row.original.source,

        size: 140,
      },

      // ACTIONS
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
                  setViewLead(row.original);
                  setViewDialogOpen(true);
                }}
              >
                View Lead
              </DropdownMenuItem>

              {/* EDIT */}

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditLead(row.original);
                    setEditDialogOpen(true);
                  }}
                >
                  Edit Lead
                </DropdownMenuItem>
              )}

              {/* DELETE */}

              {canDelete && (
                <>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setDeleteLead(row.original);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    Delete Lead
                  </DropdownMenuItem>
                </>
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
  // ACCESS DENIED
  // =======================================================

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Access Denied</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view Lead.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <>
      {/* =================================================
          LEADS OVERVIEW
      ================================================= */}

      <div className="mb-6">
        <h4 className="my-0 mb-2 text-xl font-bold">Leads</h4>

        <div className="grid gap-2 overflow-x-auto sm:grid-flow-col sm:auto-cols-max">
          {/* DYNAMIC STATUS CARDS */}

          {Object.entries(leadOverview.statusCounts).map(([status, count]) => (
            <button
              key={status}
              type="button"
              className="
                  bg-transparent
                  border
                  border-solid
                  border-neutral-300
                  shadow-sm
                  py-1
                  px-3
                  rounded-lg
                  text-sm
                  text-left
                  text-neutral-700
                  hover:bg-neutral-200/60
                  hover:text-neutral-600
                  focus:text-neutral-600
                "
            >
              <span className="font-semibold mr-1">{count}</span>

              <span className={getStatusColor(status)}>{status}</span>
            </button>
          ))}

          {/* LOST LEADS */}

          <span
            className="
              inline-flex
              items-center
              rounded-md
              bg-red-100
              px-3
              py-1
              text-sm
              text-red-600
            "
          >
            {leadOverview.lostCount} Lost Leads - {leadOverview.lostPercentage}%
          </span>
        </div>
      </div>

      {/* =================================================
          LEADS DATA GRID
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
          ADD LEAD
      ================================================= */}

      <LeadAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={() => {
          setAddDialogOpen(false);
        }}
      />

      {/* =================================================
          EDIT LEAD
      ================================================= */}

      {editLead && (
        <LeadEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);
            setEditLead(null);
          }}
          Lead={editLead}
          onSuccess={() => {
            setEditDialogOpen(false);
            setEditLead(null);
          }}
        />
      )}

      {/* =================================================
          VIEW LEAD
      ================================================= */}

      <LeadViewDialog
        open={viewDialogOpen}
        lead={viewLead}
        closeDialog={() => {
          setViewDialogOpen(false);
          setViewLead(null);
        }}
      />

      {/* =================================================
          DELETE LEAD
      ================================================= */}

      {deleteLead && (
        <LeadDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);
            setDeleteLead(null);
          }}
          Lead={deleteLead}
          onSuccess={() => {
            setDeleteDialogOpen(false);
            setDeleteLead(null);
          }}
        />
      )}
    </>
  );
};

export default LeadList;
