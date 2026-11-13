"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Ellipsis,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { toast } from "sonner";

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

import { can } from "@/lib/permissions";

import EmployeeAddDialog from "./employee-add-dialog";
import EmployeeEditDialog from "./employee-edit-dialog";
import EmployeeDeleteDialog from "./employee-delete-dialog";
import EmployeeViewDialog from "./employee-view-dialog";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "employee.view",
  "employee.manage",
  "employee.edit",
  "employee.delete",
];

const canView = can("employee.view", permissions);

const canManage = can("employee.manage", permissions);

const canEdit = can("employee.edit", permissions);

const canDelete = can("employee.delete", permissions);

// =======================================================
// employee NOTIFICATION
// =======================================================

const createEmployeeNotification = async ({
  action,
  title,
  message,
  employeeId = null,
  employeeName = null,
}) => {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        module: "employee",

        action,

        title,

        message,

        entityId:
          employeeId !== null && employeeId !== undefined
            ? String(employeeId)
            : null,

        entityType: "employee",

        entityName: employeeName || "Employee",

        url:
          employeeId !== null && employeeId !== undefined
            ? `/employee/${employeeId}`
            : "/employee",
      }),

      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Notification failed.");
    }

    if (typeof window !== "undefined" && result.notification) {
      window.dispatchEvent(
        new CustomEvent("notifications-received", {
          detail: [result.notification],
        }),
      );
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notifications-refresh"));
    }

    return result;
  } catch (error) {
    console.error("[employee NOTIFICATION ERROR]", error);

    // Notification failure should not
    // break employee CRUD operations.
    return null;
  }
};

// =======================================================
// employee LIST
// =======================================================

const EmployeeList = () => {
  const queryClient = useQueryClient();
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("employee.view", userPermissions);
  const canManage = can("employee.manage", userPermissions);
  const canEdit = can("employee.edit", userPermissions);
  const canDelete = can("employee.delete", userPermissions);
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
  // NETWORK STATE
  // =======================================================

  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  // =======================================================
  // DATABASE STATUS
  // =======================================================

  const [dbStatus, setDbStatus] = useState({
    env: "local",
    online: false,
    loading: true,
  });

  const [checkingDb, setCheckingDb] = useState(false);

  // =======================================================
  // SYNC STATE
  // =======================================================

  const [syncing, setSyncing] = useState(false);

  const syncingRef = useRef(false);

  // =======================================================
  // DIALOG STATE
  // =======================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [deleteLoading, setDeleteLoading] = useState(false);

  // =======================================================
  // Employee NAME HELPER
  // =======================================================

  const getEmployeeName = useCallback((employee) => {
    if (!employee) return "Employee";

    return [
      employee.firstName,
      employee.middleName,
      employee.lastName,
    ]
      .filter(Boolean)
      .join(" ") || `Employee #${employee.empcode || employee.id || ""}`;
  }, []);

  // =======================================================
  // DATABASE CHECK
  // =======================================================

  const checkDbStatus = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setDbStatus((previous) => ({
        ...previous,
        online: false,
        loading: false,
      }));

      return;
    }

    try {
      setCheckingDb(true);

      setDbStatus((previous) => ({
        ...previous,
        loading: true,
      }));

      const response = await fetch("/api/settings/toggle", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("DB check failed.");
      }

      const result = await response.json();

      setDbStatus({
        env: result?.activeEnv || "local",

        online: true,

        loading: false,
      });

      console.log("[Employee DB STATUS]", result?.activeEnv || "local");
    } catch (error) {
      console.error("[Employee DB STATUS ERROR]", error);

      setDbStatus((previous) => ({
        ...previous,
        online: false,
        loading: false,
      }));
    } finally {
      setCheckingDb(false);
    }
  }, []);

  // =======================================================
  // SYNC employee
  // =======================================================

  const syncEmployee = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);

      toast.error("You are offline. Employee sync cannot be started.");

      return null;
    }

    if (syncingRef.current) {
      return null;
    }

    try {
      syncingRef.current = true;

      setSyncing(true);

      toast.loading("Syncing employee...", {
        id: "employee-sync",
      });

      const response = await apiFetch("/api/sync/employee", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "Employee sync failed.",
        );
      }

      console.log("[Employee SYNC SUCCESS]", result);

      await queryClient.invalidateQueries({
        queryKey: ["employee"],
      });

      await queryClient.refetchQueries({
        queryKey: ["employee"],
        type: "active",
      });

      await queryClient.invalidateQueries({
        queryKey: ["employee-sync"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["sync"],
      });

      await checkDbStatus();

      toast.success(result?.message || "Employees synchronized successfully.", {
        id: "employee-sync",
      });

      await createEmployeeNotification({
        action: "synced",

        title: "Employees Synced",

        message: result?.message || "Employee data has been synchronized.",

        employeeId: null,

        employeeName: "Employees",
      });

      return result;
    } catch (error) {
      console.error("[Employee SYNC ERROR]", error);

      toast.error(error?.message || "Employee sync failed.", {
        id: "employee-sync",
      });

      return null;
    } finally {
      syncingRef.current = false;

      setSyncing(false);
    }
  }, [checkDbStatus, queryClient]);

  // =======================================================
  // FETCH employee
  // =======================================================

  const fetchEmployee = useCallback(
    async ({ pageIndex, pageSize, sorting, searchQuery }) => {
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

      const response = await apiFetch(`/api/employee?${params.toString()}`);

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to fetch employee.");
      }

      return result;
    },
    [],
  );

  // =======================================================
  // QUERY
  // =======================================================

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["employee", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchEmployee({
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
  // REFRESH employee
  // =======================================================

  const refreshEmployee = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["employee"],
    });

    await queryClient.refetchQueries({
      queryKey: ["employee"],
      type: "active",
    });
  }, [queryClient]);

  // =======================================================
  // ONLINE / OFFLINE
  // =======================================================

  useEffect(() => {
    const handleOnline = async () => {
      console.log("[Employee] Internet Connected");

      setIsOnline(true);

      await checkDbStatus();

      await queryClient.invalidateQueries({
        queryKey: ["employee"],
      });
    };

    const handleOffline = () => {
      console.log("[Employee] Internet Disconnected");

      setIsOnline(false);

      setDbStatus((previous) => ({
        ...previous,
        online: false,
        loading: false,
      }));
    };

    window.addEventListener("online", handleOnline);

    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);

      window.removeEventListener("offline", handleOffline);
    };
  }, [checkDbStatus, queryClient]);

  // =======================================================
  // DB AUTO CHECK
  // =======================================================

  useEffect(() => {
    checkDbStatus();

    const interval = setInterval(() => {
      checkDbStatus();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [checkDbStatus]);

  // =======================================================
  // DELETE HANDLER
  // =======================================================

  const handleDelete = useCallback((employee) => {
    setSelectedEmployee(employee);

    setDeleteDialogOpen(true);
  }, []);

  // =======================================================
  // DELETE CONFIRM
  // =======================================================

  const handleDeleteConfirm = async () => {
    if (!selectedEmployee?.id) {
      return;
    }

    const employeeId = selectedEmployee.id;

    const employeeName = getEmployeeName(selectedEmployee);

    try {
      setDeleteLoading(true);

      const response = await apiFetch("/api/employee", {
        method: "DELETE",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: employeeId,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Employee delete failed.");
      }

      toast.success("Employee deleted successfully.");

      setDeleteDialogOpen(false);

      setSelectedEmployee(null);

      await refreshEmployee();

      await createEmployeeNotification({
        action: "deleted",

        title: "Employee Deleted",

        message: `${employeeName} has been deleted.`,

        employeeId,

        employeeName,
      });

      await syncEmployee();
    } catch (error) {
      console.error("[Employee DELETE ERROR]", error);

      toast.error(error?.message || "Employee delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // =======================================================
  // COLUMNS
  // =======================================================


  const columns = useMemo(
    () => [
      // ===================================================
      // EMPLOYEE CODE
      // ===================================================

      {
        accessorKey: "empcode",
        id: "empcode",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Employee Code"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-semibold text-primary">
            {row.original?.empcode || "-"}
          </span>
        ),

        size: 140,
        enableSorting: true,
        enableHiding: false,

        meta: {
          headerTitle: "Employee Code",
          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },

      // ===================================================
      // EMPLOYEE NAME
      // ===================================================

      {
        accessorFn: (row) =>
          [
            row.firstName,
            row.middleName,
            row.lastName,
          ]
            .filter(Boolean)
            .join(" "),

        id: "firstName",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Employee Name"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">
              {getEmployeeName(row.original)}
            </span>

            <span className="text-xs text-muted-foreground">
              {row.original?.gender || "-"}
            </span>
          </div>
        ),

        size: 220,
        enableSorting: true,
        enableHiding: false,

        meta: {
          headerTitle: "Employee Name",
          skeleton: <Skeleton className="h-7 w-36" />,
        },
      },

      // ===================================================
      // EMAIL
      // ===================================================

      {
        accessorKey: "emailId",
        id: "emailId",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Email"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="truncate">
            {row.original?.emailId || "-"}
          </span>
        ),

        size: 230,
        enableSorting: true,
        enableHiding: true,

        meta: {
          headerTitle: "Email",
          skeleton: <Skeleton className="h-5 w-40" />,
        },
      },

      // ===================================================
      // MOBILE
      // ===================================================

      {
        accessorKey: "mobile",
        id: "mobile",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Mobile"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span>{row.original?.mobile || "-"}</span>
        ),

        size: 150,
        enableSorting: true,
        enableHiding: true,

        meta: {
          headerTitle: "Mobile",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // ===================================================
      // CITY
      // ===================================================

      {
        accessorKey: "correspondenceCity",
        id: "correspondenceCity",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="City"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span>
            {row.original?.correspondenceCity || "-"}
          </span>
        ),

        size: 150,
        enableSorting: true,
        enableHiding: true,

        meta: {
          headerTitle: "City",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // ===================================================
      // STATUS
      // ===================================================

      {
        accessorKey: "status",
        id: "status",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Status"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => {
          const status = String(
            row.original?.status || ""
          ).toUpperCase();

          const isActive = status === "ACTIVE";

          return (
            <span
              className={
                isActive
                  ? "inline-flex items-center rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
              }
            >
              {status || "-"}
            </span>
          );
        },

        size: 120,
        enableSorting: true,
        enableHiding: true,

        meta: {
          headerTitle: "Status",
          skeleton: <Skeleton className="h-7 w-16" />,
        },
      },

      // ===================================================
      // CREATED DATE
      // ===================================================

      {
        accessorKey: "createdAt",
        id: "createdAt",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Created Date"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          row.original?.createdAt
            ? formatDate(new Date(row.original.createdAt))
            : "-",

        size: 150,
        enableSorting: true,
        enableHiding: true,

        meta: {
          headerTitle: "Created Date",
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
              <Button
                className="h-7 w-7"
                mode="icon"
                variant="ghost"
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="bottom" align="start">
              {canView && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedEmployee(row.original);
                    setViewDialogOpen(true);
                  }}
                >
                  <Eye className="mr-2 size-4" />
                  View Employee
                </DropdownMenuItem>
              )}

              {canEdit && (
                <DropdownMenuItem
                  onSelect={() => {
                    setSelectedEmployee({ ...row.original });
                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit Employee
                </DropdownMenuItem>
              )}

              {(canView || canEdit) && canDelete && (
                <DropdownMenuSeparator />
              )}

              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleDelete(row.original)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete Employee
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),

        size: 75,
        enableSorting: false,
        enableResizing: false,
        enableHiding: false,

        meta: {
          skeleton: <Skeleton className="size-5" />,
        },
      },
    ],
    [getEmployeeName, handleDelete, canView, canEdit, canDelete]
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
        <div className="flex items-center gap-2.5">
          {/* SEARCH */}

          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search employee"
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

        {/* RIGHT SIDE */}

        <div className="flex items-center gap-3">
          {/* DB STATUS */}

          <div className="flex items-center gap-2 rounded-lg border px-3 py-1">
            <span
              className={`h-2.5 w-2.5 rounded-full ${dbStatus.online && isOnline ? "bg-green-500" : "bg-red-500"
                }`}
            />

            <span className="text-xs">
              {dbStatus.loading
                ? "Checking..."
                : dbStatus.online && isOnline
                  ? `${String(dbStatus.env).toUpperCase()} Online`
                  : "Offline"}
            </span>

            <Button
              type="button"
              mode="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={checkingDb || syncing}
              onClick={checkDbStatus}
            >
              <RefreshCw className={checkingDb ? "animate-spin" : ""} />
            </Button>
          </div>

          {/* ADD Employee */}

          {canManage && (
            <Button
              disabled={isLoading || isFetching}
              onClick={() => {
                setSelectedEmployee(null);

                setAddDialogOpen(true);
              }}
            >
              <Plus />
              Add Employee
            </Button>
          )}
        </div>
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
              You do not have permission to view employee.
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
          ADD Employee
      ================================================= */}

      <EmployeeAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={async (newEmployee) => {
          const employeeId = newEmployee?.id;

          const employeeName = getEmployeeName(newEmployee);

          setAddDialogOpen(false);

          await refreshEmployee();

          await createEmployeeNotification({
            action: "created",

            title: "Employee Created",

            message: `${employeeName} has been created.`,

            employeeId,

            employeeName,
          });

          await syncEmployee();
        }}
      />

      {/* =================================================
          VIEW Employee
      ================================================= */}

      {selectedEmployee && (
        <EmployeeViewDialog
          open={viewDialogOpen}
          employee={selectedEmployee}
          closeDialog={() => {
            setViewDialogOpen(false);

            setSelectedEmployee(null);
          }}
        />
      )}

      {/* =================================================
          EDIT Employee
      ================================================= */}

      {selectedEmployee && (

        < EmployeeEditDialog
          open={editDialogOpen}
          onOpenChange={(nextOpen) => {
            setEditDialogOpen(nextOpen);

            if (!nextOpen) {
              setSelectedEmployee(null);
            }
          }}
          employee={selectedEmployee}
          onSuccess={async (updatedEmployee) => {
            const employeeId = updatedEmployee?.id || selectedEmployee?.id;

            const employeeName = getEmployeeName(
              updatedEmployee || selectedEmployee
            );

            setEditDialogOpen(false);
            setSelectedEmployee(null);

            await refreshEmployee();

            await createEmployeeNotification({
              action: "updated",
              title: "Employee Updated",
              message: `${employeeName} has been updated.`,
              employeeId,
              employeeName,
            });

            await syncEmployee();
          }}
        />
      )}

      {/* =================================================
          DELETE employee
      ================================================= */}

      {selectedEmployee && (
        <EmployeeDeleteDialog
          open={deleteDialogOpen}
          employee={selectedEmployee}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          closeDialog={() => {
            if (!deleteLoading) {
              setDeleteDialogOpen(false);

              setSelectedEmployee(null);
            }
          }}
        />
      )}
    </>
  );
};

export default EmployeeList;
