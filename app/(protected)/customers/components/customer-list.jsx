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

import CustomerAddDialog from "./customer-add-dialog";
import CustomerEditDialog from "./customer-edit-dialog";
import CustomerDeleteDialog from "./customer-delete-dialog";
import CustomerViewDialog from "./customer-view-dialog";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "customer.view",
  "customer.manage",
  "customer.edit",
  "customer.delete",
];

const canView = can("customer.view", permissions);

const canManage = can("customer.manage", permissions);

const canEdit = can("customer.edit", permissions);

const canDelete = can("customer.delete", permissions);

// =======================================================
// CUSTOMER NOTIFICATION
// =======================================================

const createCustomerNotification = async ({
  action,
  title,
  message,
  customerId = null,
  customerName = null,
}) => {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        module: "customer",

        action,

        title,

        message,

        entityId:
          customerId !== null && customerId !== undefined
            ? String(customerId)
            : null,

        entityType: "customer",

        entityName: customerName || "Customer",

        url:
          customerId !== null && customerId !== undefined
            ? `/customers/${customerId}`
            : "/customers",
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
    console.error("[CUSTOMER NOTIFICATION ERROR]", error);

    // Notification failure should not
    // break customer CRUD operations.
    return null;
  }
};

// =======================================================
// CUSTOMER LIST
// =======================================================

const CustomerList = () => {
  const queryClient = useQueryClient();
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("customer.view", userPermissions);
  const canManage = can("customer.manage", userPermissions);
  const canEdit = can("customer.edit", userPermissions);
  const canDelete = can("customer.delete", userPermissions);
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

  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [deleteLoading, setDeleteLoading] = useState(false);

  // =======================================================
  // CUSTOMER NAME HELPER
  // =======================================================

  const getCustomerName = useCallback((customer) => {
    if (!customer) {
      return "Customer";
    }

    return (
      customer.company ||
      customer.name ||
      customer.customerName ||
      customer.fullName ||
      customer.email ||
      `Customer #${customer.id || ""}`
    );
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

      console.log("[CUSTOMER DB STATUS]", result?.activeEnv || "local");
    } catch (error) {
      console.error("[CUSTOMER DB STATUS ERROR]", error);

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
  // SYNC CUSTOMERS
  // =======================================================

  const syncCustomers = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);

      toast.error("You are offline. Customer sync cannot be started.");

      return null;
    }

    if (syncingRef.current) {
      return null;
    }

    try {
      syncingRef.current = true;

      setSyncing(true);

      toast.loading("Syncing customers...", {
        id: "customer-sync",
      });

      const response = await apiFetch("/api/sync/customers", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "Customer sync failed.",
        );
      }

      console.log("[CUSTOMER SYNC SUCCESS]", result);

      await queryClient.invalidateQueries({
        queryKey: ["customers"],
      });

      await queryClient.refetchQueries({
        queryKey: ["customers"],
        type: "active",
      });

      await queryClient.invalidateQueries({
        queryKey: ["customer-sync"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["sync"],
      });

      await checkDbStatus();

      toast.success(result?.message || "Customers synchronized successfully.", {
        id: "customer-sync",
      });

      await createCustomerNotification({
        action: "synced",

        title: "Customers Synced",

        message: result?.message || "Customer data has been synchronized.",

        customerId: null,

        customerName: "Customers",
      });

      return result;
    } catch (error) {
      console.error("[CUSTOMER SYNC ERROR]", error);

      toast.error(error?.message || "Customer sync failed.", {
        id: "customer-sync",
      });

      return null;
    } finally {
      syncingRef.current = false;

      setSyncing(false);
    }
  }, [checkDbStatus, queryClient]);

  // =======================================================
  // FETCH CUSTOMERS
  // =======================================================

  const fetchCustomers = useCallback(
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

      const response = await apiFetch(`/api/customers?${params.toString()}`);

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to fetch customers.");
      }

      return result;
    },
    [],
  );

  // =======================================================
  // QUERY
  // =======================================================

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["customers", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchCustomers({
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
  // REFRESH CUSTOMERS
  // =======================================================

  const refreshCustomers = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["customers"],
    });

    await queryClient.refetchQueries({
      queryKey: ["customers"],
      type: "active",
    });
  }, [queryClient]);

  // =======================================================
  // ONLINE / OFFLINE
  // =======================================================

  useEffect(() => {
    const handleOnline = async () => {
      console.log("[CUSTOMER] Internet Connected");

      setIsOnline(true);

      await checkDbStatus();

      await queryClient.invalidateQueries({
        queryKey: ["customers"],
      });
    };

    const handleOffline = () => {
      console.log("[CUSTOMER] Internet Disconnected");

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

  const handleDelete = useCallback((customer) => {
    setSelectedCustomer(customer);

    setDeleteDialogOpen(true);
  }, []);

  // =======================================================
  // DELETE CONFIRM
  // =======================================================

  const handleDeleteConfirm = async () => {
    if (!selectedCustomer?.id) {
      return;
    }

    const customerId = selectedCustomer.id;

    const customerName = getCustomerName(selectedCustomer);

    try {
      setDeleteLoading(true);

      const response = await apiFetch("/api/customers", {
        method: "DELETE",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: customerId,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Customer delete failed.");
      }

      toast.success("Customer deleted successfully.");

      setDeleteDialogOpen(false);

      setSelectedCustomer(null);

      await refreshCustomers();

      await createCustomerNotification({
        action: "deleted",

        title: "Customer Deleted",

        message: `${customerName} has been deleted.`,

        customerId,

        customerName,
      });

      await syncCustomers();
    } catch (error) {
      console.error("[CUSTOMER DELETE ERROR]", error);

      toast.error(error?.message || "Customer delete failed.");
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
      // ID
      // ===================================================

      {
        accessorKey: "id",

        id: "id",

        header: ({ column }) => (
          <DataGridColumnHeader title="ID" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">#{row.original?.id || "-"}</span>
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
      // CUSTOMER
      // ===================================================

      {
        accessorKey: "company",

        id: "company",

        header: ({ column }) => (
          <DataGridColumnHeader title="Customer" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{getCustomerName(row.original)}</span>
        ),

        size: 300,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Customer",

          skeleton: <Skeleton className="h-7 w-40" />,
        },
      },
      /* -----------------------------------------------------
               EMAIL
            ----------------------------------------------------- */

      {
        accessorKey: "email",

        id: "email",

        header: ({ column }) => (
          <DataGridColumnHeader title="Email" column={column} visibility />
        ),

        cell: ({ getValue }) => (
          <span className="truncate">{getValue() || "-"}</span>
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
      // PHONE
      // ===================================================

      {
        accessorKey: "phone",

        id: "phone",

        header: ({ column }) => (
          <DataGridColumnHeader title="Phone" column={column} visibility />
        ),

        cell: ({ row }) => <span>{row.original?.phone || "-"}</span>,

        size: 180,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Phone",

          skeleton: <Skeleton className="h-7 w-28" />,
        },
      },

      // ===================================================
      // CITY
      // ===================================================

      {
        accessorKey: "city",

        id: "city",

        header: ({ column }) => (
          <DataGridColumnHeader title="City" column={column} visibility />
        ),

        cell: ({ row }) => <span>{row.original?.city || "-"}</span>,

        size: 180,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "City",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // ===================================================
      // COUNTRY
      // ===================================================

      {
        accessorKey: "country",

        id: "country",

        header: ({ column }) => (
          <DataGridColumnHeader title="Country" column={column} visibility />
        ),

        cell: ({ row }) => <span>{row.original?.countryName || "-"}</span>,

        size: 180,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Country",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // ===================================================
      // STATUS
      // ===================================================

      {
        accessorKey: "active",

        id: "active",

        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),

        cell: ({ row }) => {
          const active =
            row.original?.active === true ||
            row.original?.active === 1 ||
            row.original?.active === "1" ||
            row.original?.active === "true";

          return (
            <span className={active ? "text-green-600" : "text-red-600"}>
              {active ? "Active" : "Inactive"}
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
      // CREATED
      // ===================================================

      {
        accessorKey: "createdAt",

        id: "createdAt",

        header: ({ column }) => (
          <DataGridColumnHeader title="Created" column={column} visibility />
        ),

        cell: ({ row }) =>
          row.original?.createdAt
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
          row.original?.updatedAt
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
                    setSelectedCustomer(row.original);

                    setViewDialogOpen(true);
                  }}
                >
                  <Eye className="mr-2 size-4" />
                  View Customer
                </DropdownMenuItem>
              )}

              {/* EDIT */}

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedCustomer(row.original);

                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit Customer
                </DropdownMenuItem>
              )}

              {(canView || canEdit) && canDelete && <DropdownMenuSeparator />}

              {/* DELETE */}

              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    handleDelete(row.original);
                  }}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete Customer
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
    [getCustomerName, handleDelete],
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
              placeholder="Search customers"
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

          {/* ADD CUSTOMER */}

          {canManage && (
            <Button
              disabled={isLoading || isFetching}
              onClick={() => {
                setSelectedCustomer(null);

                setAddDialogOpen(true);
              }}
            >
              <Plus />
              Add Customer
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
              You do not have permission to view customers.
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
          ADD CUSTOMER
      ================================================= */}

      <CustomerAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={async (newCustomer) => {
          const customerId = newCustomer?.id;

          const customerName = getCustomerName(newCustomer);

          setAddDialogOpen(false);

          await refreshCustomers();

          await createCustomerNotification({
            action: "created",

            title: "Customer Created",

            message: `${customerName} has been created.`,

            customerId,

            customerName,
          });

          await syncCustomers();
        }}
      />

      {/* =================================================
          VIEW CUSTOMER
      ================================================= */}

      {selectedCustomer && (
        <CustomerViewDialog
          open={viewDialogOpen}
          customer={selectedCustomer}
          closeDialog={() => {
            setViewDialogOpen(false);

            setSelectedCustomer(null);
          }}
        />
      )}

      {/* =================================================
          EDIT CUSTOMER
      ================================================= */}

      {selectedCustomer && (
        <CustomerEditDialog
          open={editDialogOpen}
          customer={selectedCustomer}
          closeDialog={() => {
            setEditDialogOpen(false);

            setSelectedCustomer(null);
          }}
          onSuccess={async (updatedCustomer) => {
            const customerId = updatedCustomer?.id || selectedCustomer?.id;

            const customerName = getCustomerName(
              updatedCustomer || selectedCustomer,
            );

            setEditDialogOpen(false);

            setSelectedCustomer(null);

            await refreshCustomers();

            await createCustomerNotification({
              action: "updated",

              title: "Customer Updated",

              message: `${customerName} has been updated.`,

              customerId,

              customerName,
            });

            await syncCustomers();
          }}
        />
      )}

      {/* =================================================
          DELETE CUSTOMER
      ================================================= */}

      {selectedCustomer && (
        <CustomerDeleteDialog
          open={deleteDialogOpen}
          customer={selectedCustomer}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          closeDialog={() => {
            if (!deleteLoading) {
              setDeleteDialogOpen(false);

              setSelectedCustomer(null);
            }
          }}
        />
      )}
    </>
  );
};

export default CustomerList;
