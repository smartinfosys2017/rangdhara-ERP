"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Plus, Search, X } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/helpers";

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

import SupportAddDialog from "./support-add-dialog";
import SupportEditDialog from "./support-edit-dialog";
import SupportDeleteDialog from "./support-delete-dialog";
import SupportViewDialog from "./support-view-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "support.view",
  "support.manage",
  "support.edit",
  "support.delete",
];

const canView = can("support.view", permissions);

const canManage = can("support.manage", permissions);

const canEdit = can("support.edit", permissions);

const canDelete = can("support.delete", permissions);

// =======================================================
// SUPPORT LIST
// =======================================================

const SupportList = () => {
  const queryClient = useQueryClient();
    // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("support.view", userPermissions);
  const canManage = can("support.manage", userPermissions);
  const canEdit = can("support.edit", userPermissions);
  const canDelete = can("support.delete", userPermissions);
  // =====================================================
  // TABLE STATE
  // =====================================================

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState([
    {
      id: "createdAt",
      desc: true,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");

  // =====================================================
  // DIALOG STATE
  // =====================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // =====================================================
  // SELECTED SUPPORT
  // =====================================================

  const [viewSupport, setViewSupport] = useState(null);

  const [editSupport, setEditSupport] = useState(null);

  const [deleteSupport, setDeleteSupport] = useState(null);

  // =====================================================
  // FETCH SUPPORT TICKETS
  // =====================================================

  const fetchSupport = async ({
    pageIndex,
    pageSize,
    sorting,
    searchQuery,
  }) => {
    const sortField = sorting?.[0]?.id || "createdAt";

    const sortDirection = sorting?.[0]?.desc ? "desc" : "asc";

    const params = new URLSearchParams({
      page: String(pageIndex + 1),
      limit: String(pageSize),
      sort: sortField,
      dir: sortDirection,

      ...(searchQuery
        ? {
            query: searchQuery,
          }
        : {}),
    });

    const response = await apiFetch(`/api/support?${params.toString()}`);

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));

      throw new Error(result?.message || "Failed to fetch support tickets.");
    }

    return response.json();
  };

  // =====================================================
  // QUERY
  // =====================================================

  const { data, isLoading } = useQuery({
    queryKey: ["support", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchSupport({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sorting,
        searchQuery,
      }),

    staleTime: Infinity,

    gcTime: 1000 * 60 * 60,

    refetchOnWindowFocus: false,

    refetchOnReconnect: false,

    retry: 1,
  });

  // =====================================================
  // SUPPORT TICKETS
  // =====================================================

  const supportTickets = data?.data?.tickets || [];

  // =====================================================
  // SUPPORT STATS
  // =====================================================

  const supportStats = useMemo(() => {
    const counts = {
      open: 0,
      inProgress: 0,
      answered: 0,
      onHold: 0,
      closed: 0,
    };

    supportTickets.forEach((item) => {
      const status = String(item?.status || "")
        .toLowerCase()
        .trim();

      switch (status) {
        case "open":
          counts.open++;
          break;

        case "in progress":
          counts.inProgress++;
          break;

        case "answered":
          counts.answered++;
          break;

        case "on hold":
          counts.onHold++;
          break;

        case "closed":
          counts.closed++;
          break;

        default:
          break;
      }
    });

    return counts;
  }, [supportTickets]);

  // =====================================================
  // REFRESH
  // =====================================================

  const refreshSupport = () => {
    queryClient.invalidateQueries({
      queryKey: ["support"],
    });
  };

  // =====================================================
  // COLUMNS
  // =====================================================

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",

        id: "id",

        header: ({ column }) => (
          <DataGridColumnHeader title="#" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">#{row.original.id}</span>
        ),

        size: 80,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "#",

          skeleton: <Skeleton className="h-7 w-10" />,
        },
      },

      {
        accessorKey: "subject",

        id: "subject",

        header: ({ column }) => (
          <DataGridColumnHeader title="Subject" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium max-w-[300px] truncate block">
            {row.original.subject || "-"}
          </span>
        ),

        size: 300,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Subject",

          skeleton: <Skeleton className="h-7 w-48" />,
        },
      },

      {
        accessorKey: "tags",

        id: "tags",

        header: ({ column }) => (
          <DataGridColumnHeader title="Tags" column={column} visibility />
        ),

        cell: ({ row }) => {
          const tags = row.original.tags;

          if (Array.isArray(tags)) {
            return (
              <div className="flex flex-wrap gap-1">
                {tags.length > 0
                  ? tags.map((tag, index) => (
                      <span
                        key={index}
                        className="rounded-md bg-muted px-2 py-1 text-xs"
                      >
                        {typeof tag === "object" ? tag?.name : tag}
                      </span>
                    ))
                  : "-"}
              </div>
            );
          }

          return <span>{tags || "-"}</span>;
        },

        size: 220,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Tags",

          skeleton: <Skeleton className="h-7 w-28" />,
        },
      },

      {
        accessorKey: "status",

        id: "status",

        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.status || "-"}</span>
        ),

        size: 140,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Status",

          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },

      {
        accessorKey: "priority",

        id: "priority",

        header: ({ column }) => (
          <DataGridColumnHeader title="Priority" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.priority || "-"}</span>
        ),

        size: 130,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Priority",

          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },

      {
        accessorKey: "createdAt",

        id: "createdAt",

        header: ({ column }) => (
          <DataGridColumnHeader title="Created" column={column} visibility />
        ),

        cell: ({ row }) =>
          row.original.createdAt
            ? formatDate(new Date(row.original.createdAt))
            : "-",

        size: 175,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Created",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

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
                <DropdownMenuItem
                  onClick={() => {
                    setViewSupport(row.original);

                    setViewDialogOpen(true);
                  }}
                >
                  View ticket
                </DropdownMenuItem>
              )}

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditSupport(row.original);

                    setEditDialogOpen(true);
                  }}
                >
                  Edit ticket
                </DropdownMenuItem>
              )}

              {(canView || canEdit) && canDelete && <DropdownMenuSeparator />}

              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setDeleteSupport(row.original);

                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete ticket
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

    data: supportTickets,

    pageCount: Math.ceil((data?.pagination?.total || 0) / pagination.pageSize),

    getRowId: (row) => String(row.id),

    state: {
      pagination,
      sorting,
    },

    onPaginationChange: setPagination,

    onSortingChange: setSorting,

    getCoreRowModel: getCoreRowModel(),

    getFilteredRowModel: getFilteredRowModel(),

    getPaginationRowModel: getPaginationRowModel(),

    manualPagination: true,

    manualSorting: true,

    manualFiltering: true,

    enableRowSelection: true,
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
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search tickets"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              disabled={isLoading}
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

        {canManage && (
          <div className="flex items-center gap-3">
            <Button disabled={isLoading} onClick={() => setAddDialogOpen(true)}>
              <Plus />
              Add Ticket
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
              You do not have permission to view support tickets.
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
          SUPPORT STATUS CARDS
      ================================================= */}

      <Card className="mb-2">
        <div className="flex flex-wrap items-center gap-2 p-4">
          {[
            {
              label: "Open",
              count: supportStats.open,
              color: "text-destructive",
            },

            {
              label: "In Progress",
              count: supportStats.inProgress,
              color: "text-success",
            },

            {
              label: "Answered",
              count: supportStats.answered,
              color: "text-primary",
            },

            {
              label: "On Hold",
              count: supportStats.onHold,
              color: "text-muted-foreground",
            },

            {
              label: "Closed",
              count: supportStats.closed,
              color: "text-info",
            },
          ].map((stat) => (
            <button
              key={stat.label}
              type="button"
              className="bg-transparent border border-border shadow-sm py-1.5 px-3 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              <span className="font-semibold me-1">{stat.count}</span>

              <span className={stat.color}>{stat.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* =================================================
          DATA GRID
      ================================================= */}

      <DataGrid
        table={table}
        recordCount={data?.pagination?.total || 0}
        isLoading={isLoading}
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
          ADD SUPPORT
      ================================================= */}

      {addDialogOpen && (
        <SupportAddDialog
          open={addDialogOpen}
          closeDialog={() => {
            setAddDialogOpen(false);
          }}
          onSuccess={() => {
            setAddDialogOpen(false);
            refreshSupport();
          }}
        />
      )}

      {/* =================================================
          VIEW SUPPORT
      ================================================= */}

      {viewSupport && (
        <SupportViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);
            setViewSupport(null);
          }}
          support={viewSupport}
        />
      )}

      {/* =================================================
          EDIT SUPPORT
      ================================================= */}

      {editSupport && (
        <SupportEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);
            setEditSupport(null);
          }}
          support={editSupport}
          onSuccess={() => {
            setEditDialogOpen(false);
            setEditSupport(null);
            refreshSupport();
          }}
        />
      )}

      {/* =================================================
          DELETE SUPPORT
      ================================================= */}

      {deleteSupport && (
        <SupportDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);
            setDeleteSupport(null);
          }}
          support={deleteSupport}
          onSuccess={() => {
            setDeleteDialogOpen(false);
            setDeleteSupport(null);
            refreshSupport();
          }}
        />
      )}
    </>
  );
};

export default SupportList;
