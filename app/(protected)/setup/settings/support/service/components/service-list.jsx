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

import { Ellipsis, Plus, Search, X, Eye, Pencil,Trash2 } from "lucide-react";

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

import ServiceAddDialog from "./service-add-dialog";
import ServiceEditDialog from "./service-edit-dialog";
import ServiceDeleteDialog from "./service-delete-dialog";
import ServiceViewDialog from "./service-view-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "service.view",
  "service.manage",
  "service.edit",
  "service.delete",
];

const canView = can("service.view", permissions);

const canManage = can("service.manage", permissions);

const canEdit = can("service.edit", permissions);

const canDelete = can("service.delete", permissions);

// =======================================================
// SERVICE NOTIFICATION
// =======================================================

const createServiceNotification = async ({
  action,
  title,
  message,
  serviceId = null,
  serviceName = null,
}) => {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        module: "support",

        action,

        title,

        message,

        entityId:
          serviceId !== null && serviceId !== undefined
            ? String(serviceId)
            : null,

        entityType: "service",

        entityName: serviceName || "Service",

        url:
          serviceId !== null && serviceId !== undefined
            ? `/setup/settings/support/service`
            : "/setup/settings/support/service",
      }),

      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(
        result?.message ||
          result?.error ||
          "Failed to create service notification.",
      );
    }

    // Refresh global notifications
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notifications-refresh"));

      window.dispatchEvent(
        new CustomEvent("notifications-received", {
          detail: result.notification ? [result.notification] : [],
        }),
      );
    }

    return result;
  } catch (error) {
    console.error("[SERVICE NOTIFICATION ERROR]", error);

    // Notification failure should never
    // break the CRUD operation.
    return null;
  }
};

// =======================================================
// SERVICE LIST
// =======================================================

const ServiceList = () => {
  const queryClient = useQueryClient();
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  //console.log("User Permissions:", session?.user?.permissions);
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("service.view", userPermissions);
  const canManage = can("service.manage", userPermissions);
  const canEdit = can("service.edit", userPermissions);
  const canDelete = can("service.delete", userPermissions);
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

  const [searchQuery, setSearchQuery] = useState("");

  // =====================================================
  // DIALOG STATE
  // =====================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // =====================================================
  // SELECTED SERVICE
  // =====================================================

  const [viewService, setViewService] = useState(null);

  const [editService, setEditService] = useState(null);

  const [deleteService, setDeleteService] = useState(null);

  // =====================================================
  // FETCH SERVICES
  // =====================================================

  const fetchServices = async ({
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

    const response = await apiFetch(
      `/api/settings/support/service?${params.toString()}`,
    );

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));

      throw new Error(result?.message || "Failed to fetch services.");
    }

    return response.json();
  };

  // =====================================================
  // QUERY
  // =====================================================

  const { data, isLoading } = useQuery({
    queryKey: ["support-services", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchServices({
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
  // REFRESH
  // =====================================================

  const refreshServices = () => {
    queryClient.invalidateQueries({
      queryKey: ["support-services"],
    });
  };

  // =====================================================
  // COLUMNS
  // =====================================================

  const columns = useMemo(
    () => [
      // =================================================
      // ID
      // =================================================

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

      // =================================================
      // SERVICE NAME
      // =================================================

      {
        accessorKey: "name",

        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader title="Service" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "-"}</span>
        ),

        size: 300,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Service",

          skeleton: <Skeleton className="h-7 w-40" />,
        },
      },

      // =================================================
      // CREATED
      // =================================================

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

      // =================================================
      // UPDATED
      // =================================================

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
              {/* VIEW */}

              {canView && (
                <DropdownMenuItem
                  onClick={() => {
                    setViewService(row.original);

                    setViewDialogOpen(true);
                  }}
                >
                  <Eye className="mr-2 size-4" />
                  View
                </DropdownMenuItem>
              )}

              {/* EDIT */}

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditService(row.original);

                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
              )}

              {(canView || canEdit) && canDelete && <DropdownMenuSeparator />}

              {/* DELETE */}

              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setDeleteService(row.original);

                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
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
              placeholder="Search services"
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
              Add Service
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
              You do not have permission to view services.
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
          ADD SERVICE
      ================================================= */}

      {addDialogOpen && (
        <ServiceAddDialog
          open={addDialogOpen}

          closeDialog={() => {
            setAddDialogOpen(false);
          }}

          onSuccess={async (createdService) => {
            setAddDialogOpen(false);

            refreshServices();

            await createServiceNotification({
              action: "created",

              title: "Service Created",

              message: createdService?.name
                ? `Service "${createdService.name}" was created successfully.`
                : "A new service was created successfully.",

              serviceId: createdService?.id || null,

              serviceName: createdService?.name || "Service",
            });
          }}
        />
      )}

      {/* =================================================
          VIEW SERVICE
      ================================================= */}

      {viewService && (
        <ServiceViewDialog
          open={viewDialogOpen}

          closeDialog={() => {
            setViewDialogOpen(false);

            setViewService(null);
          }}

          service={viewService}
        />
      )}

      {/* =================================================
          EDIT SERVICE
      ================================================= */}

      {editService && (
        <ServiceEditDialog
          open={editDialogOpen}

          closeDialog={() => {
            setEditDialogOpen(false);

            setEditService(null);
          }}

          service={editService}

          onSuccess={async (updatedService) => {
            const serviceForNotification = updatedService || editService;

            setEditDialogOpen(false);

            setEditService(null);

            refreshServices();

            await createServiceNotification({
              action: "updated",

              title: "Service Updated",

              message: serviceForNotification?.name
                ? `Service "${serviceForNotification.name}" was updated successfully.`
                : "A service was updated successfully.",

              serviceId: serviceForNotification?.id || null,

              serviceName: serviceForNotification?.name || "Service",
            });
          }}
        />
      )}

      {/* =================================================
          DELETE SERVICE
      ================================================= */}

      {deleteService && (
        <ServiceDeleteDialog
          open={deleteDialogOpen}

          closeDialog={() => {
            setDeleteDialogOpen(false);

            setDeleteService(null);
          }}

          service={deleteService}

          onSuccess={async () => {
            // Save before clearing state
            const deletedService = deleteService;

            setDeleteDialogOpen(false);

            setDeleteService(null);

            refreshServices();

            await createServiceNotification({
              action: "deleted",

              title: "Service Deleted",

              message: deletedService?.name
                ? `Service "${deletedService.name}" was deleted successfully.`
                : "A service was deleted successfully.",

              serviceId: deletedService?.id || null,

              serviceName: deletedService?.name || "Service",
            });
          }}
        />
      )}
    </>
  );
};

export default ServiceList;
