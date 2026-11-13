"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
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

import SourceAddDialog from "./source-add-dialog";
import SourceEditDialog from "./source-edit-dialog";
import SourceDeleteDialog from "./source-delete-dialog";
import SourceViewDialog from "./source-view-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

// Replace with:
// const permissions = user?.permissions || [];

const permissions = [
  "source.view",
  "source.manage",
  "source.edit",
  "source.delete",
];

const canView = can("source.view", permissions);

const canManage = can("source.manage", permissions);

const canEdit = can("source.edit", permissions);

const canDelete = can("source.delete", permissions);

// =======================================================
// CREATE SOURCE NOTIFICATION
// =======================================================

const createSourceNotification = async ({
  action,
  title,
  message,
  sourceId = null,
  sourceName = null,
}) => {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        module: "lead",
        action,

        title,
        message,

        entityId:
          sourceId !== null && sourceId !== undefined ? String(sourceId) : null,

        entityType: "source",

        entityName: sourceName || "Source",

        url:
          sourceId !== null && sourceId !== undefined
            ? `/setup/leads/sources/${sourceId}`
            : "/setup/leads/sources",
      }),

      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(
        result?.message || "Failed to create source notification.",
      );
    }

    // ===================================================
    // IMPORTANT:
    // Tell NotificationsSheet that a new notification
    // has arrived. It will increase the unread count.
    // ===================================================

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notifications-refresh"));

      if (result.notification) {
        window.dispatchEvent(
          new CustomEvent("notifications-received", {
            detail: [result.notification],
          }),
        );
      }
    }

    return result;
  } catch (error) {
    console.error("[SOURCE NOTIFICATION ERROR]", error);

    return null;
  }
};

// =======================================================
// SOURCE LIST
// =======================================================

const SourceList = () => {
  const queryClient = useQueryClient();
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("source.view", userPermissions);
  const canManage = can("source.manage", userPermissions);
  const canEdit = can("source.edit", userPermissions);
  const canDelete = can("source.delete", userPermissions);
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // =======================================================
  // SELECTED SOURCE
  // =======================================================

  const [editSource, setEditSource] = useState(null);

  const [deleteSource, setDeleteSource] = useState(null);

  const [viewSource, setViewSource] = useState(null);

  // =======================================================
  // FETCH SOURCES
  // =======================================================

  const fetchSources = async ({
    pageIndex,
    pageSize,
    sorting,
    searchQuery,
  }) => {
    const sortField = sorting?.[0]?.id || "id";

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

    const response = await apiFetch(`/api/leads/sources?${params.toString()}`);

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(result?.message || "Failed to fetch Sources.");
    }

    return result;
  };

  // =======================================================
  // QUERY
  // =======================================================

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["support-Sources", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchSources({
        pageIndex: pagination.pageIndex,

        pageSize: pagination.pageSize,

        sorting,

        searchQuery,
      }),

    staleTime: 0,

    gcTime: 1000 * 60 * 60,

    refetchOnWindowFocus: false,

    refetchOnReconnect: false,

    retry: 1,
  });

  // =======================================================
  // REFRESH SOURCE LIST
  // =======================================================

  const refreshSources = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["support-Sources"],
    });

    await queryClient.refetchQueries({
      queryKey: ["support-Sources"],
    });
  };

  // =======================================================
  // COLUMNS
  // =======================================================

  const columns = useMemo(
    () => [
      // ===================================================
      // ID
      // ===================================================

      {
        accessorKey: "id",

        id: "id",

        header: ({ column }) => (
          <DataGridColumnHeader title="ID" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">#{row.original.id}</span>
        ),

        size: 100,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "ID",

          skeleton: <Skeleton className="h-7 w-12" />,
        },
      },

      // ===================================================
      // SOURCE NAME
      // ===================================================

      {
        accessorKey: "name",

        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader title="Source" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "-"}</span>
        ),

        size: 300,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Source",

          skeleton: <Skeleton className="h-7 w-40" />,
        },
      },

      // ===================================================
      // CREATED
      // ===================================================

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

      // ===================================================
      // UPDATED
      // ===================================================

      {
        accessorKey: "updatedAt",

        id: "updatedAt",

        header: ({ column }) => (
          <DataGridColumnHeader title="Updated" column={column} visibility />
        ),

        cell: ({ row }) =>
          row.original.updatedAt
            ? formatDate(new Date(row.original.updatedAt))
            : "-",

        size: 175,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Updated",

          skeleton: <Skeleton className="h-7 w-24" />,
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
                <DropdownMenuItem
                  onClick={() => {
                    setViewSource(row.original);

                    setViewDialogOpen(true);
                  }}
                >
                  View Source
                </DropdownMenuItem>
              )}

              {/* EDIT */}

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditSource(row.original);

                    setEditDialogOpen(true);
                  }}
                >
                  Edit Source
                </DropdownMenuItem>
              )}

              {(canView || canEdit) && canDelete && <DropdownMenuSeparator />}

              {/* DELETE */}

              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setDeleteSource(row.original);

                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete Source
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

  // =======================================================
  // TABLE
  // =======================================================

  const table = useReactTable({
    columns,

    data: data?.data || [],

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
              placeholder="Search sources"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              disabled={isLoading || isFetching}
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

        {/* ADD SOURCE */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              disabled={isLoading || isFetching}
              onClick={() => {
                setEditSource(null);

                setAddDialogOpen(true);
              }}
            >
              <Plus />
              Add Source
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
              You do not have permission to view Sources.
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
          ADD SOURCE
      ================================================= */}

      <SourceAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={async (createdSource) => {
          setAddDialogOpen(false);

          await refreshSources();

          // -----------------------------------------------
          // CREATE NOTIFICATION
          // -----------------------------------------------

          await createSourceNotification({
            action: "created",

            title: "Source Created",

            message: createdSource?.name
              ? `Source "${createdSource.name}" was created successfully.`
              : "A new source was created successfully.",

            sourceId: createdSource?.id || null,

            sourceName: createdSource?.name || "Source",
          });
        }}
      />

      {/* =================================================
          EDIT SOURCE
      ================================================= */}

      {editSource && (
        <SourceEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);

            setEditSource(null);
          }}
          Source={editSource}
          onSuccess={async (updatedSource) => {
            const sourceForNotification = updatedSource || editSource;

            setEditDialogOpen(false);

            setEditSource(null);

            await refreshSources();

            // ---------------------------------------------
            // CREATE NOTIFICATION
            // ---------------------------------------------

            await createSourceNotification({
              action: "updated",

              title: "Source Updated",

              message: sourceForNotification?.name
                ? `Source "${sourceForNotification.name}" was updated successfully.`
                : "A source was updated successfully.",

              sourceId: sourceForNotification?.id || null,

              sourceName: sourceForNotification?.name || "Source",
            });
          }}
        />
      )}

      {/* =================================================
          VIEW SOURCE
      ================================================= */}

      {viewSource && (
        <SourceViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);

            setViewSource(null);
          }}
          Source={viewSource}
        />
      )}

      {/* =================================================
          DELETE SOURCE
      ================================================= */}

      {deleteSource && (
        <SourceDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);

            setDeleteSource(null);
          }}
          source={deleteSource}
          onSuccess={async () => {
            // Keep the source before clearing state
            const deletedSource = deleteSource;

            setDeleteDialogOpen(false);

            setDeleteSource(null);

            await refreshSources();

            // ---------------------------------------------
            // CREATE NOTIFICATION
            // ---------------------------------------------

            await createSourceNotification({
              action: "deleted",

              title: "Source Deleted",

              message: deletedSource?.name
                ? `Source "${deletedSource.name}" was deleted successfully.`
                : "A source was deleted successfully.",

              sourceId: deletedSource?.id || null,

              sourceName: deletedSource?.name || "Source",
            });
          }}
        />
      )}
    </>
  );
};

export default SourceList;
