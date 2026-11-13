"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Plus, Search, X, RefreshCw } from "lucide-react";

import { apiFetch } from "@/lib/api";

import { formatDate, formatDateTime } from "@/lib/helpers";

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

import CustomerSyncAddDialog from "./customer-sync-add-dialog";
import CustomerSyncEditDialog from "./customer-sync-edit-dialog";
import CustomerSyncDeleteDialog from "./customer-sync-delete-dialog";
import CustomerSyncViewDialog from "./customer-sync-view-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "CustomerSync.view",
  "CustomerSync.manage",
  "CustomerSync.edit",
  "CustomerSync.delete",
];

const canView = can("CustomerSync.view", permissions);

const canManage = can("CustomerSync.manage", permissions);

const canEdit = can("CustomerSync.edit", permissions);

const canDelete = can("CustomerSync.delete", permissions);

// =======================================================
// CustomerSync LIST
// =======================================================

const CustomerSyncList = () => {
  const queryClient = useQueryClient();

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
  // NETWORK STATE
  // =====================================================

  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  // =====================================================
  // DB STATUS STATE
  // =====================================================

  const [dbStatus, setDbStatus] = useState({
    env: "local",
    online: false,
    loading: true,
  });

  const [checkingDb, setCheckingDb] = useState(false);

  // =====================================================
  // SYNC STATE
  // =====================================================

  const [syncing, setSyncing] = useState(false);

  const syncingRef = useRef(false);

  // =====================================================
  // DIALOG STATE
  // =====================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // =====================================================
  // SELECTED CustomerSync
  // =====================================================

  const [viewCustomerSync, setViewCustomerSync] = useState(null);

  const [editCustomerSync, setEditCustomerSync] = useState(null);

  const [deleteCustomerSync, setDeleteCustomerSync] = useState(null);

  // =====================================================
  // FETCH CustomerSync
  // =====================================================

  const fetchCustomerSyncs = useCallback(
    async ({ pageIndex, pageSize, sorting, searchQuery }) => {
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

      const response = await apiFetch(`/api/CustomerSync?${params.toString()}`);

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));

        throw new Error(
          result?.message ||
            result?.error ||
            "Failed to fetch CustomerSync records.",
        );
      }

      return response.json();
    },
    [],
  );

  // =====================================================
  // QUERY
  // =====================================================

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["CustomerSyncs", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchCustomerSyncs({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sorting,
        searchQuery,
      }),

    staleTime: 0,

    gcTime: 1000 * 60 * 60,

    refetchOnWindowFocus: true,

    refetchOnReconnect: true,

    retry: 1,

    refetchInterval: isOnline ? 30000 : false,

    refetchIntervalInBackground: true,

    networkMode: "online",
  });

  // =====================================================
  // CHECK DATABASE STATUS
  // =====================================================

  const checkDbStatus = useCallback(async () => {
    if (!navigator.onLine) {
      console.log("[DB STATUS] Browser is offline");

      setDbStatus((previous) => ({
        ...previous,
        online: false,
        loading: false,
      }));

      return;
    }

    try {
      setCheckingDb(true);

      console.log("[DB STATUS] Checking database...");

      const response = await fetch("/api/settings/toggle", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Database status check failed");
      }

      const result = await response.json();

      const activeEnv = result?.activeEnv || "local";

      setDbStatus({
        env: activeEnv,
        online: true,
        loading: false,
      });

      console.log("[DB STATUS]", activeEnv, "ONLINE");
    } catch (error) {
      console.error("[DB STATUS ERROR]", error);

      setDbStatus((previous) => ({
        ...previous,
        online: false,
        loading: false,
      }));
    } finally {
      setCheckingDb(false);
    }
  }, []);

  // =====================================================
  // LOCAL → LIVE SYNC
  // =====================================================

  const runSync = useCallback(async () => {
    if (!navigator.onLine) {
      console.log("[SYNC] Offline - API not called");

      setIsOnline(false);

      setDbStatus((previous) => ({
        ...previous,
        online: false,
        loading: false,
      }));

      return false;
    }

    if (syncingRef.current) {
      console.log("[SYNC] Already running - skipped");

      return false;
    }

    syncingRef.current = true;
    setSyncing(true);

    try {
      console.log("[SYNC] Internet connected");

      console.log("[SYNC] Starting Local → Live sync...");

      const response = await fetch("/api/sync/export-local", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        cache: "no-store",
      });

      const text = await response.text();

      console.log("[SYNC] STATUS:", response.status);

      console.log("[SYNC] RESPONSE:", text);

      let result = {};

      if (text) {
        try {
          result = JSON.parse(text);
        } catch (error) {
          console.error("[SYNC] Invalid JSON:", text);
        }
      }

      if (!response.ok) {
        throw new Error(
          result?.error || result?.message || `Sync failed: ${response.status}`,
        );
      }

      if (!result?.success) {
        throw new Error(
          result?.error || result?.message || "Synchronization failed.",
        );
      }

      console.log("[SYNC] Local → Live completed successfully");

      console.log("[SYNC] Summary:", result?.summary);

      setDbStatus((previous) => ({
        ...previous,
        online: true,
        loading: false,
      }));

      return true;
    } catch (error) {
      console.error("[SYNC ERROR]", error);

      if (!navigator.onLine) {
        setIsOnline(false);

        setDbStatus((previous) => ({
          ...previous,
          online: false,
          loading: false,
        }));

        console.log("[SYNC] Internet connection lost");

        return false;
      }

      console.error("[SYNC] Server/API error:", error?.message);

      return false;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  // =====================================================
  // REFRESH CUSTOMER LIST
  // =====================================================

  const refreshCustomerSyncs = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["CustomerSyncs"],
    });

    await refetch();
  }, [queryClient, refetch]);

  // =====================================================
  // SYNC + REFRESH
  // =====================================================

  const syncAndRefresh = useCallback(async () => {
    // -----------------------------------------------
    // OFFLINE
    // -----------------------------------------------

    if (!navigator.onLine) {
      console.log("[SYNC REFRESH] Offline - refreshing only");

      await refreshCustomerSyncs();

      return;
    }

    try {
      console.log("[SYNC REFRESH] Starting synchronization...");

      // ---------------------------------------------
      // LOCAL → LIVE
      // ---------------------------------------------

      const syncSuccess = await runSync();

      // ---------------------------------------------
      // REFRESH CURRENT TABLE
      // ---------------------------------------------

      await refreshCustomerSyncs();

      if (syncSuccess) {
        console.log("[SYNC REFRESH] Sync + refresh completed");
      } else {
        console.log("[SYNC REFRESH] Sync failed - table refreshed");
      }
    } catch (error) {
      console.error("[SYNC REFRESH ERROR]", error);

      await refreshCustomerSyncs();
    }
  }, [runSync, refreshCustomerSyncs]);

  // =====================================================
  // NETWORK ONLINE / OFFLINE LISTENERS
  // =====================================================

  useEffect(() => {
    const handleOnline = async () => {
      console.log("[NETWORK] Internet connected");

      setIsOnline(true);

      setDbStatus((previous) => ({
        ...previous,
        online: true,
        loading: false,
      }));

      // -----------------------------------------------
      // CHECK DATABASE
      // -----------------------------------------------

      await checkDbStatus();

      // -----------------------------------------------
      // AUTOMATIC LOCAL → LIVE SYNC
      // -----------------------------------------------

      console.log("[NETWORK] Starting automatic sync...");

      await runSync();

      // -----------------------------------------------
      // REFRESH TABLE
      // -----------------------------------------------

      await refreshCustomerSyncs();
    };

    const handleOffline = () => {
      console.log("[NETWORK] Internet disconnected");

      setIsOnline(false);

      setDbStatus((previous) => ({
        ...previous,
        online: false,
        loading: false,
      }));

      console.log("[NETWORK] Auto refresh disabled while offline");
    };

    window.addEventListener("online", handleOnline);

    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);

      window.removeEventListener("offline", handleOffline);
    };
  }, [checkDbStatus, runSync, refreshCustomerSyncs]);

  // =====================================================
  // INITIAL DB STATUS + PERIODIC DB CHECK
  // =====================================================

  useEffect(() => {
    checkDbStatus();

    const dbInterval = setInterval(() => {
      checkDbStatus();
    }, 3600000);

    return () => {
      clearInterval(dbInterval);
    };
  }, [checkDbStatus]);

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
          <span
            className="font-medium truncate max-w-[180px] block"
            title={row.original.id}
          >
            {row.original.id || "-"}
          </span>
        ),

        size: 200,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "ID",

          skeleton: <Skeleton className="h-7 w-32" />,
        },
      },

      // =================================================
      // NAME
      // =================================================

      {
        accessorKey: "name",

        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader title="Name" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "-"}</span>
        ),

        size: 220,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Name",

          skeleton: <Skeleton className="h-7 w-36" />,
        },
      },

      // =================================================
      // EMAIL
      // =================================================

      {
        accessorKey: "email",

        id: "email",

        header: ({ column }) => (
          <DataGridColumnHeader title="Email" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span
            className="truncate max-w-[260px] block"
            title={row.original.email}
          >
            {row.original.email || "-"}
          </span>
        ),

        size: 280,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Email",

          skeleton: <Skeleton className="h-7 w-44" />,
        },
      },

      // =================================================
      // PHONE
      // =================================================

      {
        accessorKey: "phone",

        id: "phone",

        header: ({ column }) => (
          <DataGridColumnHeader title="Phone" column={column} visibility />
        ),

        cell: ({ row }) => <span>{row.original.phone || "-"}</span>,

        size: 160,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Phone",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // =================================================
      // LAST SYNCED
      // =================================================

      {
        accessorKey: "lastSyncedAt",

        id: "lastSyncedAt",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Last Synced"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          row.original.lastSyncedAt
            ? formatDateTime(new Date(row.original.lastSyncedAt))
            : "-",

        size: 175,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Last Synced",

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
                    setViewCustomerSync(row.original);

                    setViewDialogOpen(true);
                  }}
                >
                  View CustomerSync
                </DropdownMenuItem>
              )}

              {/* EDIT */}

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditCustomerSync(row.original);

                    setEditDialogOpen(true);
                  }}
                >
                  Edit CustomerSync
                </DropdownMenuItem>
              )}

              {(canView || canEdit) && canDelete && <DropdownMenuSeparator />}

              {/* DELETE */}

              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setDeleteCustomerSync(row.original);

                    setDeleteDialogOpen(true);
                  }}
                >
                  Delete CustomerSync
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
              placeholder="Search customers"
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

        <div className="flex items-center gap-3">
          {/* =================================================
              DATABASE STATUS
          ================================================= */}

          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            {dbStatus.loading ? (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-gray-400 animate-pulse" />

                <span className="text-xs font-medium text-gray-500">
                  Checking...
                </span>
              </>
            ) : dbStatus.online ? (
              <>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    dbStatus.env === "live" ? "bg-emerald-500" : "bg-blue-500"
                  }`}
                />

                <span
                  className={`text-xs font-semibold ${
                    dbStatus.env === "live"
                      ? "text-emerald-600"
                      : "text-blue-600"
                  }`}
                >
                  {dbStatus.env === "live" ? "LIVE — Online" : "LOCAL — Online"}
                </span>
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />

                <span className="text-xs font-semibold text-red-600">
                  {dbStatus.env.toUpperCase()} — Offline
                </span>
              </>
            )}

            {/* Manual Refresh */}

            <Button
              type="button"
              mode="icon"
              variant="ghost"
              className="h-6 w-6"
              disabled={checkingDb || !isOnline}
              onClick={checkDbStatus}
              title="Check database status"
            >
              <RefreshCw
                className={`size-3.5 ${checkingDb ? "animate-spin" : ""}`}
              />
            </Button>
          </div>

          {/* =================================================
              ADD CUSTOMER
          ================================================= */}

          {canManage && (
            <Button
              disabled={isLoading || syncing}
              onClick={() => setAddDialogOpen(true)}
            >
              <Plus />
              Add Customer
            </Button>
          )}
        </div>
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
              You do not have permission to view CustomerSyncs.
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
          ADD CustomerSync
      ================================================= */}

      {addDialogOpen && (
        <CustomerSyncAddDialog
          open={addDialogOpen}

          closeDialog={() => {
            setAddDialogOpen(false);
          }}

          onSuccess={async () => {
            setAddDialogOpen(false);

            await syncAndRefresh();
          }}
        />
      )}

      {/* =================================================
          VIEW CustomerSync
      ================================================= */}

      {viewCustomerSync && (
        <CustomerSyncViewDialog
          open={viewDialogOpen}

          closeDialog={() => {
            setViewDialogOpen(false);
            setViewCustomerSync(null);
          }}

          CustomerSync={viewCustomerSync}
        />
      )}

      {/* =================================================
          EDIT CustomerSync
      ================================================= */}

      {editCustomerSync && (
        <CustomerSyncEditDialog
          open={editDialogOpen}

          closeDialog={() => {
            setEditDialogOpen(false);
            setEditCustomerSync(null);
          }}

          CustomerSync={editCustomerSync}

          onSuccess={async () => {
            setEditDialogOpen(false);
            setEditCustomerSync(null);

            await syncAndRefresh();
          }}
        />
      )}

      {/* =================================================
          DELETE CustomerSync
      ================================================= */}

      {deleteCustomerSync && (
        <CustomerSyncDeleteDialog
          open={deleteDialogOpen}

          closeDialog={() => {
            setDeleteDialogOpen(false);
            setDeleteCustomerSync(null);
          }}

          CustomerSync={deleteCustomerSync}

          onSuccess={async () => {
            setDeleteDialogOpen(false);
            setDeleteCustomerSync(null);

            await syncAndRefresh();
          }}
        />
      )}
    </>
  );
};

export default CustomerSyncList;
