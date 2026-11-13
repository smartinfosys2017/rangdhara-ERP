"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Plus, Search, X , Eye, Pencil,Trash2} from "lucide-react";

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

import DepartmentEditDialog from "./department-edit-dialog";

import DepartmentDeleteDialog from "./department-delete-dialog";

import DepartmentViewDialog from "./department-view-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

// Replace this with actual logged-in user permissions.
const permissions = [
  "department.view",
  "department.manage",
  "department.edit",
  "department.delete",
];

const canView = can("department.view", permissions);

const canManage = can("department.manage", permissions);

const canEdit = can("department.edit", permissions);

const canDelete = can("department.delete", permissions);

// =======================================================
// DEPARTMENT LIST
// =======================================================

const DepartmentList = () => {
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  //console.log("User Permissions:", session?.user?.permissions);
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("department.view", userPermissions);
  const canManage = can("department.manage", userPermissions);
  const canEdit = can("department.edit", userPermissions);
  const canDelete = can("department.delete", userPermissions);
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

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [editDepartment, setEditDepartment] = useState(null);

  const [deleteDepartment, setDeleteDepartment] = useState(null);

  const [viewDepartment, setViewDepartment] = useState(null);

  // =====================================================
  // DEPARTMENT NOTIFICATION
  // =====================================================

  const createDepartmentNotification = useCallback(
    async ({
      action,
      title,
      message,
      departmentId = null,
      departmentName = null,
    }) => {
      try {
        const response = await fetch("/api/notifications", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            module: "department",

            action,

            title,

            message,

            entityId:
              departmentId !== null && departmentId !== undefined
                ? String(departmentId)
                : null,

            entityType: "department",

            entityName: departmentName || null,

            url: "/setup/settings/support/department",
          }),

          cache: "no-store",
        });

        const text = await response.text();

        let result = {};

        if (text) {
          try {
            result = JSON.parse(text);
          } catch (error) {
            console.error("[DEPARTMENT NOTIFICATION] Invalid JSON:", text);

            throw new Error("Invalid notification response.");
          }
        }

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error ||
              result?.message ||
              "Failed to create notification.",
          );
        }

        console.log("[DEPARTMENT NOTIFICATION] Created:", result.notification);

        // -------------------------------------------------
        // Refresh notification list/count
        // -------------------------------------------------

        window.dispatchEvent(
          new CustomEvent("notifications-refresh", {
            detail: result.notification,
          }),
        );

        // -------------------------------------------------
        // Notify notification listener
        // -------------------------------------------------

        window.dispatchEvent(
          new CustomEvent("notifications-received", {
            detail: result.notification,
          }),
        );

        return result.notification;
      } catch (error) {
        /*
         * Notification failure must NOT
         * break the successful CRUD operation.
         */

        console.error("[DEPARTMENT NOTIFICATION ERROR]", error);

        return null;
      }
    },
    [],
  );

  // =====================================================
  // FETCH DEPARTMENTS
  // =====================================================

  const fetchDepartments = async ({
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
      `/api/settings/support/department?${params.toString()}`,
    );

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));

      throw new Error(result?.message || "Failed to fetch departments.");
    }

    return response.json();
  };

  // =====================================================
  // QUERY
  // =====================================================

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["support-departments", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchDepartments({
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
  // REFRESH DEPARTMENT LIST
  // =====================================================

  useEffect(() => {
    const handleDepartmentRefresh = () => {
      refetch();
    };

    window.addEventListener("departments-refresh", handleDepartmentRefresh);

    return () => {
      window.removeEventListener(
        "departments-refresh",
        handleDepartmentRefresh,
      );
    };
  }, [refetch]);

  // =====================================================
  // COLUMNS
  // =====================================================

  const columns = useMemo(
    () => [
      // -------------------------------------------------
      // ID
      // -------------------------------------------------

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

      // -------------------------------------------------
      // DEPARTMENT
      // -------------------------------------------------

      {
        accessorKey: "name",

        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader title="Department" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "-"}</span>
        ),

        size: 300,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Department",

          skeleton: <Skeleton className="h-7 w-40" />,
        },
      },

      // -------------------------------------------------
      // CREATED
      // -------------------------------------------------

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

      // -------------------------------------------------
      // UPDATED
      // -------------------------------------------------

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

      // -------------------------------------------------
      // ACTIONS
      // -------------------------------------------------

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
                    setViewDepartment(row.original);

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
                    setEditDepartment(row.original);

                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
              )}

              {/* DELETE */}

              {canDelete && (
                <>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setDeleteDepartment(row.original);

                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
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
              placeholder="Search departments"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
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
            <Button
              disabled={isLoading}
              onClick={() => {
                setEditDepartment(null);

                setEditDialogOpen(true);
              }}
            >
              <Plus />
              Add Department
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
              You do not have permission to view departments.
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
          ADD / EDIT DIALOG
      ================================================= */}

      <DepartmentEditDialog
        open={editDialogOpen}
        closeDialog={() => setEditDialogOpen(false)}
        department={editDepartment}
        onSuccess={async (savedDepartment) => {
          const isEdit = !!editDepartment;

          const departmentName =
            savedDepartment?.name || editDepartment?.name || "Department";

          const departmentId =
            savedDepartment?.id || editDepartment?.id || null;

          await createDepartmentNotification({
            action: isEdit ? "updated" : "created",

            title: isEdit ? "Department Updated" : "Department Created",

            message: isEdit
              ? `${departmentName} has been updated.`
              : `${departmentName} has been created.`,

            departmentId,

            departmentName,
          });

          // Refresh department table
          window.dispatchEvent(new CustomEvent("departments-refresh"));
        }}
      />

      {/* =================================================
          VIEW DIALOG
      ================================================= */}

      {viewDepartment && (
        <DepartmentViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);

            setViewDepartment(null);
          }}
          department={viewDepartment}
        />
      )}

      {/* =================================================
          DELETE DIALOG
      ================================================= */}

      {deleteDepartment && (
        <DepartmentDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => setDeleteDialogOpen(false)}
          department={deleteDepartment}
          onSuccess={async (deletedDepartment) => {
            const departmentName =
              deletedDepartment?.name || deleteDepartment?.name || "Department";

            const departmentId =
              deletedDepartment?.id || deleteDepartment?.id || null;

            await createDepartmentNotification({
              action: "deleted",

              title: "Department Deleted",

              message: `${departmentName} has been deleted.`,

              departmentId,

              departmentName,
            });

            // Refresh department table
            window.dispatchEvent(new CustomEvent("departments-refresh"));

            // Refresh notification UI
            window.dispatchEvent(new CustomEvent("notifications-refresh"));
          }}
        />
      )}
    </>
  );
};

export default DepartmentList;
