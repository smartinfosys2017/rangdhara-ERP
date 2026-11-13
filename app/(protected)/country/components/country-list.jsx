"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Plus, RefreshCw, Search, X, Eye, Pencil,Trash2 } from "lucide-react";

import { toast } from "sonner";

import { apiFetch } from "@/lib/api";

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

import CountryAddDialog from "./country-add-dialog";
import CountryEditDialog from "./country-edit-dialog";
import CountryDeleteDialog from "./country-delete-dialog";
import CountryViewDialog from "./country-view-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "Country.view",
  "Country.manage",
  "Country.edit",
  "Country.delete",
];

const canView = can("Country.view", permissions);
const canManage = can("Country.manage", permissions);
const canEdit = can("Country.edit", permissions);
const canDelete = can("Country.delete", permissions);

// =======================================================
// COUNTRY LIST
// =======================================================

const CountryList = () => {
  const queryClient = useQueryClient();
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  //console.log("User Permissions:", session?.user?.permissions);
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("Country.view", userPermissions);
  const canManage = can("Country.manage", userPermissions);
  const canEdit = can("Country.edit", userPermissions);
  const canDelete = can("Country.delete", userPermissions);
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
  // ONLINE / DATABASE STATUS
  // =======================================================

  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // =======================================================
  // SELECTED COUNTRY
  // =======================================================

  const [editCountry, setEditCountry] = useState(null);

  const [deleteCountry, setDeleteCountry] = useState(null);

  const [viewCountry, setViewCountry] = useState(null);

  // =======================================================
  // TOAST HELPERS
  // =======================================================

  const showSuccessToast = useCallback((message) => {
    toast.success(message, {
      position: "top-center",
    });
  }, []);

  const showErrorToast = useCallback((message) => {
    toast.error(message, {
      position: "top-center",
    });
  }, []);

  // =======================================================
  // DATABASE STATUS
  // GET /api/settings/toggle
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

      const response = await apiFetch("/api/settings/toggle", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || "Failed to check database status.");
      }

      const activeEnv = result?.activeEnv || result?.env || "local";

      setDbStatus({
        env: activeEnv,
        online: true,
        loading: false,
      });
    } catch (error) {
      console.error("[COUNTRY DB STATUS ERROR]", error);

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
  // INITIAL DB STATUS + EVERY 30 SECONDS
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
  // ONLINE / OFFLINE HANDLERS
  // =======================================================

  const runSyncRef = useRef(null);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);

      await checkDbStatus();

      if (typeof runSyncRef.current === "function") {
        await runSyncRef.current();
      }

      await queryClient.invalidateQueries({
        queryKey: ["lead-countries"],
      });
    };

    const handleOffline = () => {
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
  // CREATE COUNTRY NOTIFICATION
  // =======================================================

  const createCountryNotification = async ({
    action,
    title,
    message,
    CountryId = null,
    CountryName = null,
  }) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          module: "country",

          action,

          title,

          message,

          entityId:
            CountryId !== null && CountryId !== undefined
              ? String(CountryId)
              : null,

          entityType: "Country",

          entityName: CountryName || "Country",

          url: "/country",
        }),

        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "Failed to create Country notification.",
        );
      }

      // ===================================================
      // UPDATE NOTIFICATION COUNT / ALERT
      // ===================================================

      if (typeof window !== "undefined" && result.notification) {
        window.dispatchEvent(
          new CustomEvent("notifications-received", {
            detail: [result.notification],
          }),
        );
      }

      return result;
    } catch (error) {
      console.error("[COUNTRY NOTIFICATION ERROR]", error);

      return null;
    }
  };

  // =======================================================
  // FETCH COUNTRIES
  // =======================================================

  const fetchCountry = async ({
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
    });

    if (searchQuery) {
      params.set("query", searchQuery);
    }

    const response = await apiFetch(`/api/countries?${params.toString()}`);

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(result?.message || "Failed to fetch Countries.");
    }

    return result;
  };

  // =======================================================
  // REACT QUERY
  // =======================================================

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["lead-countries", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchCountry({
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
  // REFRESH COUNTRY LIST
  // =======================================================

  const refreshCountry = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["lead-countries"],
    });

    await queryClient.refetchQueries({
      queryKey: ["lead-countries"],
    });
  };

  // =======================================================
  // SYNC LOCAL ↔ LIVE
  // =======================================================

  const runSync = useCallback(async () => {
    if (syncingRef.current) {
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      showErrorToast("You are offline. Please check your internet connection.");

      return;
    }

    try {
      syncingRef.current = true;

      setSyncing(true);

      console.log("[COUNTRY SYNC] Starting Local ↔ Live synchronization...");

      // =================================================
      // CHECK DATABASE STATUS BEFORE SYNC
      // =================================================

      await checkDbStatus();

      // =================================================
      // SYNC API
      // =================================================

      const response = await apiFetch("/api/sync/export-local", {
        method: "POST",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error || result?.message || "Country synchronization failed.",
        );
      }

      // =================================================
      // REFRESH COUNTRY LIST
      // =================================================

      await refreshCountry();

      // =================================================
      // COUNTRY SYNC RESULT
      // =================================================

      const localToLive = result?.localToLive?.countries || {};

      const liveToLocal = result?.liveToLocal?.countries || {};

      const totalCreated =
        (localToLive.created || 0) + (liveToLocal.created || 0);

      const totalUpdated =
        (localToLive.updated || 0) + (liveToLocal.updated || 0);

      const totalDeleted =
        (localToLive.deleted || 0) + (liveToLocal.deleted || 0);

      const totalSkipped =
        (localToLive.skipped || 0) + (liveToLocal.skipped || 0);

      const totalFailed = (localToLive.failed || 0) + (liveToLocal.failed || 0);

      console.log("[COUNTRY SYNC] Completed", {
        localToLive,
        liveToLocal,
      });

      // =================================================
      // SYNC RESULT TOAST
      // =================================================

      if (totalFailed > 0) {
        showErrorToast(
          `Country sync completed with ${totalFailed} failed record(s). Created: ${totalCreated}, Updated: ${totalUpdated}, Deleted: ${totalDeleted}.`,
        );
      } else {
        showSuccessToast(
          `Country sync completed. Created: ${totalCreated}, Updated: ${totalUpdated}, Deleted: ${totalDeleted}, Skipped: ${totalSkipped}.`,
        );
      }

      // =================================================
      // CHECK DB STATUS AGAIN
      // =================================================

      await checkDbStatus();
    } catch (error) {
      console.error("[COUNTRY SYNC ERROR]", error);

      showErrorToast(error?.message || "Country synchronization failed.");
    } finally {
      syncingRef.current = false;

      setSyncing(false);
    }
  }, [checkDbStatus, showErrorToast, showSuccessToast]);

  // Keep reconnect handler updated with latest runSync.
  useEffect(() => {
    runSyncRef.current = runSync;
  }, [runSync]);

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
      // COUNTRY
      // ===================================================

      {
        accessorKey: "name",

        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader title="Country" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "-"}</span>
        ),

        size: 300,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Country",

          skeleton: <Skeleton className="h-7 w-40" />,
        },
      },
      {
        accessorKey: "createdAt",

        id: "createdAt",

        header: ({ column }) => (
          <DataGridColumnHeader title="Created" column={column} visibility />
        ),

        cell: ({ row }) => {
          const value = row.original?.createdAt;

          if (!value) {
            return "-";
          }

          const date = new Date(value);

          return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
        },

        size: 175,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Created",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },
      {
        accessorKey: "updatedAt",

        id: "updatedAt",

        header: ({ column }) => (
          <DataGridColumnHeader title="Updated" column={column} visibility />
        ),

        cell: ({ row }) => {
          const value = row.original?.updatedAt;

          if (!value) {
            return "-";
          }

          const date = new Date(value);

          return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
        },

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
              <Button
                className="h-7 w-7"
                mode="icon"
                variant="ghost"
                disabled={syncing}
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent side="bottom" align="start">
              {/* VIEW */}

              {canView && (
                <DropdownMenuItem
                  disabled={syncing}
                  onClick={() => {
                    setViewCountry(row.original);

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
                  disabled={syncing}
                  onClick={() => {
                    setEditCountry(row.original);

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
                  disabled={syncing}
                  onClick={() => {
                    setDeleteCountry(row.original);

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

        enableHiding: false,

        meta: {
          skeleton: <Skeleton className="size-5" />,
        },
      },
    ],
    [syncing],
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

    // =====================================================
    // SEARCH
    // =====================================================

    const handleSearch = () => {
      setSearchQuery(inputValue.trim());

      setPagination((previous) => ({
        ...previous,

        pageIndex: 0,
      }));
    };

    // =====================================================
    // CLEAR SEARCH
    // =====================================================

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
        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search country"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              disabled={isLoading || isFetching || syncing}
              className="w-full ps-9 md:w-64"
            />

            {inputValue.length > 0 && (
              <Button
                type="button"
                mode="icon"
                variant="dim"
                className="absolute end-1.5 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={handleClearSearch}
                disabled={syncing}
              >
                <X />
              </Button>
            )}
          </div>
        </div>

        {/* =================================================
            DATABASE STATUS + SYNC + ADD
        ================================================= */}

        <div className="flex items-center gap-3">
          {/* =================================================
              DATABASE STATUS
          ================================================= */}

          <div className="flex items-center gap-2 rounded-lg border px-3 py-1">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                dbStatus.online && isOnline ? "bg-green-500" : "bg-red-500"
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

          {/* =================================================
              ADD COUNTRY
          ================================================= */}

          {canManage && (
            <Button
              type="button"
              disabled={syncing || isLoading || isFetching}
              onClick={() => {
                setEditCountry(null);

                setAddDialogOpen(true);
              }}
            >
              <Plus />
              Add Country
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
              You do not have permission to view Countries.
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
        isLoading={isLoading || isFetching}
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
          ADD COUNTRY
      ================================================= */}

      <CountryAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={async (createdCountry) => {
          setAddDialogOpen(false);

          // Refresh list first
          await refreshCountry();

          // Notification
          await createCountryNotification({
            action: "created",

            title: "Country Created",

            message: createdCountry?.name
              ? `Country "${createdCountry.name}" was created successfully.`
              : "A new Country was created successfully.",

            CountryId: createdCountry?.id || null,

            CountryName: createdCountry?.name || "Country",
          });

          // Sync Local ↔ Live
          await runSync();

          // Final refresh
          await refreshCountry();

          showSuccessToast(
            createdCountry?.name
              ? `Country "${createdCountry.name}" was created successfully.`
              : "Country created successfully.",
          );
        }}
      />

      {/* =================================================
          EDIT COUNTRY
      ================================================= */}

      {editCountry && (
        <CountryEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);

            setEditCountry(null);
          }}
          Country={editCountry}
          onSuccess={async (updatedCountry) => {
            const CountryForNotification = updatedCountry || editCountry;

            setEditDialogOpen(false);

            setEditCountry(null);

            // Refresh list
            await refreshCountry();

            // Notification
            await createCountryNotification({
              action: "updated",

              title: "Country Updated",

              message: CountryForNotification?.name
                ? `Country "${CountryForNotification.name}" was updated successfully.`
                : "A Country was updated successfully.",

              CountryId: CountryForNotification?.id || null,

              CountryName: CountryForNotification?.name || "Country",
            });

            // Sync Local ↔ Live
            await runSync();

            // Final refresh
            await refreshCountry();

            showSuccessToast(
              CountryForNotification?.name
                ? `Country "${CountryForNotification.name}" was updated successfully.`
                : "Country updated successfully.",
            );
          }}
        />
      )}

      {/* =================================================
          VIEW COUNTRY
      ================================================= */}

      {viewCountry && (
        <CountryViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);

            setViewCountry(null);
          }}
          Country={viewCountry}
        />
      )}

      {/* =================================================
          DELETE COUNTRY
      ================================================= */}

      {deleteCountry && (
        <CountryDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);

            setDeleteCountry(null);
          }}
          countries={deleteCountry}
          onSuccess={async () => {
            const deletedCountry = deleteCountry;

            setDeleteDialogOpen(false);

            setDeleteCountry(null);

            // Refresh after delete
            await refreshCountry();

            // Notification
            await createCountryNotification({
              action: "deleted",

              title: "Country Deleted",

              message: deletedCountry?.name
                ? `Country "${deletedCountry.name}" was deleted successfully.`
                : "A Country was deleted successfully.",

              CountryId: deletedCountry?.id || null,

              CountryName: deletedCountry?.name || "Country",
            });

            // Sync Local ↔ Live
            await runSync();

            // Final refresh
            await refreshCountry();

            showSuccessToast(
              deletedCountry?.name
                ? `Country "${deletedCountry.name}" was deleted successfully.`
                : "Country deleted successfully.",
            );
          }}
        />
      )}
    </>
  );
};

export default CountryList;
