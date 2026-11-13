
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Ellipsis,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  RefreshCw,
  Funnel,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { can } from "@/lib/permissions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import UnitAddDialog from "./unit-add-dialog";
import UnitEditDialog from "./unit-edit-dialog";
import UnitViewDialog from "./unit-view-dialog";
import UnitDeleteDialog from "./unit-delete-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";

// =======================================================
// NOTIFICATION HELPER
// =======================================================

const createUnitNotification = async ({
  action,
  title,
  message,
  unitid = null,
  unitName = null,
}) => {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        module: "inventory",
        action,
        title,
        message,
        entityId: unitid != null ? String(unitid) : null,
        entityType: "unit",
        entityName: unitName || "Unit",
        url: "/inventory/unit",
      }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Notification failed");
    }

    window.dispatchEvent(new CustomEvent("notifications-refresh"));
    return result;
  } catch (error) {
    console.error("UNIT NOTIFICATION ERROR:", error);
    return null;
  }
};

// =======================================================
// COMPONENT
// =======================================================

const UnitList = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const userPermissions = session?.user?.permissions || [];

  const canView = can("unit.view", userPermissions);
  const canManage = can("unit.manage", userPermissions);
  const canEdit = can("unit.edit", userPermissions);
  const canDelete = can("unit.delete", userPermissions);

  // =======================================================
  // TABLE STATE
  // =======================================================

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

  // =======================================================
  // FILTER STATE
  // =======================================================

  const [statusFilter, setStatusFilter] = useState("all");

  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");

  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [updatedByFilter, setUpdatedByFilter] = useState("");
  // =======================================================
  // NETWORK STATE
  // =======================================================

  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
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
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedUnit, setSelectedUnit] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // =======================================================
  // SYNC FUNCTION
  // =======================================================

  const syncInventoryUnit = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      return null;
    }

    if (syncingRef.current) return null;

    try {
      syncingRef.current = true;
      setSyncing(true);

      const response = await fetch("/api/sync/inventory-local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Inventory sync failed");
      }

      window.dispatchEvent(new CustomEvent("notifications-refresh"));

      return result;
    } catch (error) {
      console.error("UNIT SYNC ERROR:", error);
      toast.error("Inventory sync failed");
      return null;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  // =======================================================
  // DATABASE STATUS
  // =======================================================

  const checkDbStatus = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setDbStatus((prev) => ({
        ...prev,
        online: false,
        loading: false,
      }));
      return;
    }

    try {
      setCheckingDb(true);

      const response = await fetch("/api/settings/toggle", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("DB check failed");
      }

      const result = await response.json();

      setDbStatus({
        env: result?.activeEnv || "local",
        online: true,
        loading: false,
      });
    } catch (error) {
      console.error("DATABASE STATUS ERROR:", error);

      setDbStatus((prev) => ({
        ...prev,
        online: false,
        loading: false,
      }));
    } finally {
      setCheckingDb(false);
    }
  }, []);

  // =======================================================
  // FETCH API
  // =======================================================

  const fetchUnit = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(pagination.pageIndex + 1),
      limit: String(pagination.pageSize),
      query: searchQuery,
      sort: sorting?.[0]?.id || "createdAt",
      dir: sorting?.[0]?.desc ? "desc" : "asc",
      status: statusFilter,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
    });
    if (createdByFilter) {
      params.set("createdBy", createdByFilter);
    }

    if (updatedByFilter) {
      params.set("updatedBy", updatedByFilter);
    }
    const response = await apiFetch(
      `/api/inventory/unit?${params.toString()}`
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed loading units");
    }

    return result;
  }, [
    pagination,
    sorting,
    searchQuery,
    statusFilter,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    createdByFilter,
    updatedByFilter,
  ]);

  // =======================================================
  // QUERY
  // =======================================================

  const {
    data,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      "unit",
      pagination,
      sorting,
      searchQuery,
      statusFilter,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      createdByFilter,
      updatedByFilter,
    ],
    queryFn: fetchUnit,
    staleTime: 0,
  });

  // =======================================================
  // DELETE
  // =======================================================

  const handleDelete = (item) => {
    setSelectedUnit(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedUnit?.id) return;

    try {
      setDeleteLoading(true);

      const response = await apiFetch("/api/inventory/unit", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedUnit.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Delete failed");
      }

      toast.success("Unit deleted successfully");

      await createUnitNotification({
        action: "deleted",
        title: "Unit Deleted",
        message: `${selectedUnit.unitName} has been deleted.`,
        unitid: selectedUnit.id,
        unitName: selectedUnit.unitName,
      });

      await queryClient.invalidateQueries({
        queryKey: ["unit"],
      });

      await syncInventoryUnit();

      setDeleteDialogOpen(false);
      setSelectedUnit(null);
    } catch (error) {
      console.error("UNIT DELETE ERROR:", error);
      toast.error(error.message || "Unable to delete unit");
    } finally {
      setDeleteLoading(false);
    }
  };

  // =======================================================
  // ONLINE / OFFLINE LISTENER
  // =======================================================

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);

      await checkDbStatus();
      await syncInventoryUnit();

      queryClient.invalidateQueries({
        queryKey: ["unit"],
      });
    };

    const handleOffline = () => {
      setIsOnline(false);

      setDbStatus((prev) => ({
        ...prev,
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
  }, [checkDbStatus, syncInventoryUnit, queryClient]);

  // =======================================================
  // DB STATUS AUTO CHECK
  // =======================================================

  useEffect(() => {
    checkDbStatus();

    const interval = setInterval(checkDbStatus, 30000);

    return () => clearInterval(interval);
  }, [checkDbStatus]);

  // =======================================================
  // TABLE COLUMNS
  // =======================================================

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        id: "id",
        header: ({ column }) => (
          <DataGridColumnHeader title="#" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span>#{String(row.original.id).substring(0, 8)}</span>
        ),
        size: 120,
      },
      {
        accessorKey: "unitName",
        id: "unitName",
        header: ({ column }) => (
          <DataGridColumnHeader title="Unit Name" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.unitName}</span>
        ),
      },
      {
        accessorKey: "abbreviation",
        id: "abbreviation",
        header: ({ column }) => (
          <DataGridColumnHeader title="Abbreviation" column={column} visibility />
        ),
        cell: ({ row }) => <span>{row.original.abbreviation || "-"}</span>,
      },
      {
        accessorKey: "status",
        id: "status",
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span
            className={
              row.original.status
                ? "text-green-600"
                : "text-red-600"
            }
          >
            {row.original.status ? "Active" : "Inactive"}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        id: "createdAt",
        header: ({ column }) => (
          <DataGridColumnHeader title="Created" column={column} visibility />
        ),
        cell: ({ row }) => {
          const value = row.original?.createdAt;
          if (!value) return "-";

          const date = new Date(value);

          return Number.isNaN(date.getTime())
            ? "-"
            : date.toLocaleDateString();
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
          if (!value) return "-";

          const date = new Date(value);

          return Number.isNaN(date.getTime())
            ? "-"
            : date.toLocaleDateString();
        },
        size: 175,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Updated",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },
      {
        accessorKey: "createby",
        header: "Created By",
        cell: ({ row }) => (
          <span>{row.original.createdByName || "-"}</span>
        ),
      },
      {
        accessorKey: "updateby",
        header: "Updated By",
        cell: ({ row }) => (
          <span>{row.original.updatedByName || "-"}</span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const item = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button mode="icon" variant="ghost">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {canView && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedUnit(item);
                      setViewDialogOpen(true);
                    }}
                  >
                    <Eye className="mr-2 size-4" />
                    View
                  </DropdownMenuItem>
                )}

                {canEdit && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedUnit(item);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                )}

                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [canView, canEdit, canDelete]
  );

  // =======================================================
  // REACT TABLE
  // =======================================================

  const table = useReactTable({
    columns,
    data: data?.data || [],
    pageCount: Math.ceil(
      (data?.pagination?.total || 0) / pagination.pageSize
    ),
    state: {
      pagination,
      sorting,
    },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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

    useEffect(() => {
      setInputValue(searchQuery);
    }, [searchQuery]);

    const applySearch = () => {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      setSearchQuery(inputValue.trim());
    };

    const clearFilters = () => {
      setStatusFilter("all");
      setCreatedFrom("");
      setCreatedTo("");
      setUpdatedFrom("");
      setUpdatedTo("");
      setSearchQuery("");
      setInputValue("");
      setCreatedByFilter("");
      setUpdatedByFilter("");
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    const hasFilters =
      statusFilter !== "all" ||
      createdFrom ||
      createdTo ||
      updatedFrom ||
      updatedTo ||
      createdByFilter ||
      updatedByFilter ||
      searchQuery;

    return (
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-[250px] sm:flex-none">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search unit..."
              value={inputValue}
              className="w-full pl-10 pr-9"
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySearch();
              }}
            />

            {inputValue && (
              <Button
                type="button"
                mode="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
                onClick={() => {
                  setInputValue("");
                  setSearchQuery("");
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Info className="size-4" />
              </button>
            </TooltipTrigger>

            <TooltipContent>
              <p>Search by unit name, abbreviation.</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* DATABASE STATUS */}

          <div className="flex items-center gap-2 rounded-lg border px-3 py-1">
            <span
              className={`h-2.5 w-2.5 rounded-full ${dbStatus.online && isOnline
                ? "bg-green-500"
                : "bg-red-500"
                }`}
            />

            <span className="text-xs">
              {dbStatus.loading
                ? "Checking..."
                : dbStatus.online && isOnline
                  ? String(dbStatus.env).toUpperCase()
                  : "Offline"}
            </span>

            <Button
              type="button"
              mode="icon"
              variant="ghost"
              className="size-7"
              disabled={checkingDb || syncing}
              onClick={checkDbStatus}
              title="Refresh database status"
            >
              <RefreshCw
                className={checkingDb ? "animate-spin" : ""}
              />
            </Button>
          </div>

          {/* ADD UNIT */}

          {canManage && (
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add Unit
            </Button>
          )}
          {/* FILTER */}


          <StoreClientFiltersSheet
            trigger={
              <Button type="button" variant="outline">
                <Funnel className="mr-2 size-4" />
                Filter
              </Button>
            }
            statusFilter={statusFilter}
            setStatusFilter={(value) => {
              setStatusFilter(value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            createdFrom={createdFrom}
            setCreatedFrom={(value) => {
              setCreatedFrom(value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            createdTo={createdTo}
            setCreatedTo={(value) => {
              setCreatedTo(value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            updatedFrom={updatedFrom}
            setUpdatedFrom={(value) => {
              setUpdatedFrom(value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            updatedTo={updatedTo}
            setUpdatedTo={(value) => {
              setUpdatedTo(value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            createdByFilter={createdByFilter}
            setCreatedByFilter={(value) => {
              setCreatedByFilter(value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            updatedByFilter={updatedByFilter}
            setUpdatedByFilter={(value) => {
              setUpdatedByFilter(value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
          />
        </div>
      </CardHeader>
    );
  };

  // =======================================================
  // ACCESS CHECK
  // =======================================================

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Access Denied</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view units.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // =======================================================
  // RETURN
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

      {/* ADD UNIT */}

      <UnitAddDialog
        open={addDialogOpen}
        closeDialog={() => setAddDialogOpen(false)}
        onSuccess={async (newUnit) => {
          setAddDialogOpen(false);

          await createUnitNotification({
            action: "created",
            title: "New Unit Created",
            message: `${newUnit?.unitName || "Unit"} has been created.`,
            unitid: newUnit?.id,
            unitName: newUnit?.unitName,
          });

          queryClient.invalidateQueries({ queryKey: ["unit"] });
          await syncInventoryUnit();
        }}
      />

      {/* VIEW UNIT */}

      <UnitViewDialog
        open={viewDialogOpen}
        Unit={selectedUnit}
        closeDialog={() => {
          setViewDialogOpen(false);
          setSelectedUnit(null);
        }}
      />

      {/* EDIT UNIT */}

      <UnitEditDialog
        open={editDialogOpen}
        Unit={selectedUnit}
        closeDialog={() => {
          setEditDialogOpen(false);
          setSelectedUnit(null);
        }}
        onSuccess={async (updatedUnit) => {
          setEditDialogOpen(false);

          await createUnitNotification({
            action: "updated",
            title: "Unit Updated",
            message: `${updatedUnit?.unitName || selectedUnit?.unitName || "Unit"} has been updated.`,
            unitid: updatedUnit?.id || selectedUnit?.id,
            unitName: updatedUnit?.unitName || selectedUnit?.unitName,
          });

          queryClient.invalidateQueries({ queryKey: ["unit"] });
          await syncInventoryUnit();
        }}
      />

      {/* DELETE UNIT */}

      <UnitDeleteDialog
        open={deleteDialogOpen}
        Unit={selectedUnit}
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        closeDialog={() => {
          setDeleteDialogOpen(false);
          setSelectedUnit(null);
        }}
      />
    </>
  );
};

export default UnitList;