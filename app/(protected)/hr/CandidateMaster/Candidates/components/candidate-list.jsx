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

import CandidateAddDialog from "./candidate-add-dialog";
import CandidateEditDialog from "./candidate-edit-dialog";
import CandidateDeleteDialog from "./candidate-delete-dialog";
// import CandidateViewDialog from "./candidate-view-dialog";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "candidate.view",
  "candidate.manage",
  "candidate.edit",
  "candidate.delete",
];

const canView = can("candidate.view", permissions);

const canManage = can("candidate.manage", permissions);

const canEdit = can("candidate.edit", permissions);

const canDelete = can("candidate.delete", permissions);

// =======================================================
// candidate NOTIFICATION
// =======================================================

const createCandidateNotification = async ({
  action,
  title,
  message,
  candidateId = null,
  candidateName = null,
}) => {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        module: "candidate",

        action,

        title,

        message,

        entityType: "candidate",

        entityName: candidateName || "candidate",

        url:
          candidateId !== null && candidateId !== undefined
            ? `/candidate/${candidateId}`
            : "/candidate",
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
    console.error("[candidate NOTIFICATION ERROR]", error);

    // Notification failure should not
    // break candidate CRUD operations.
    return null;
  }
};

// =======================================================
// candidate LIST
// =======================================================

const CandidateList = () => {
  const queryClient = useQueryClient();
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("candidate.view", userPermissions);
  const canManage = can("candidate.manage", userPermissions);
  const canEdit = can("candidate.edit", userPermissions);
  const canDelete = can("candidate.delete", userPermissions);
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

  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [deleteLoading, setDeleteLoading] = useState(false);

  // =======================================================
  // Candidates NAME HELPER
  // =======================================================

  const getCandidateName = useCallback((candidate) => {
    if (!candidate) return "Candidate";

    return [
      candidate.firstName,
      candidate.middleName,
      candidate.lastName,
    ]
      .filter(Boolean)
      .join(" ") || `Candidate #${candidate.empcode || candidate.id || ""}`;
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

      console.log("[Candidate DB STATUS]", result?.activeEnv || "local");
    } catch (error) {
      console.error("[Candidate DB STATUS ERROR]", error);

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
  // SYNC Candidate
  // =======================================================

  const syncCandidate = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);

      toast.error("You are offline. Candidate sync cannot be started.");

      return null;
    }

    if (syncingRef.current) {
      return null;
    }

    try {
      syncingRef.current = true;

      setSyncing(true);

      toast.loading("Syncing candidate...", {
        id: "candidate-sync",
      });

      const response = await apiFetch("/api/sync/candidate", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result?.message || result?.error || "Candidate sync failed.",
        );
      }

      console.log("[Candidate SYNC SUCCESS]", result);

      await queryClient.invalidateQueries({
        queryKey: ["candidate"],
      });

      await queryClient.refetchQueries({
        queryKey: ["candidate"],
        type: "active",
      });

      await queryClient.invalidateQueries({
        queryKey: ["candidate-sync"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["sync"],
      });

      await checkDbStatus();

      toast.success(result?.message || "Candidates synchronized successfully.", {
        id: "candidate-sync",
      });

      await createCandidateNotification({
        action: "synced",

        title: "Candidates Synced",

        message: result?.message || "Candidate data has been synchronized.",

        candidateId: null,

        candidateName: "Candidates",
      });

      return result;
    } catch (error) {
      console.error("[Candidate SYNC ERROR]", error);

      toast.error(error?.message || "Candidate sync failed.", {
        id: "candidate-sync",
      });

      return null;
    } finally {
      syncingRef.current = false;

      setSyncing(false);
    }
  }, [checkDbStatus, queryClient]);

  // =======================================================
  // FETCH candidate
  // =======================================================

  const fetchCandidate = useCallback(
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

      const response = await apiFetch(`/api/candidate?${params.toString()}`);

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to fetch candidate.");
      }

      return result;
    },
    [],
  );

  // =======================================================
  // QUERY
  // =======================================================

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["candidate", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchCandidate({
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
  // REFRESH candidate
  // =======================================================

  const refreshCandidate = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["candidate"],
    });

    await queryClient.refetchQueries({
      queryKey: ["candidate"],
      type: "active",
    });
  }, [queryClient]);

  // =======================================================
  // ONLINE / OFFLINE
  // =======================================================

  useEffect(() => {
    const handleOnline = async () => {
      console.log("[candidate] Internet Connected");

      setIsOnline(true);

      await checkDbStatus();

      await queryClient.invalidateQueries({
        queryKey: ["candidate"],
      });
    };

    const handleOffline = () => {
      console.log("[Candidate] Internet Disconnected");

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

  const handleDelete = useCallback((candidate) => {
    setSelectedCandidate(candidate);

    setDeleteDialogOpen(true);
  }, []);

  // =======================================================
  // DELETE CONFIRM
  // =======================================================

  const handleDeleteConfirm = async () => {
    if (!selectedCandidate?.id) {
      return;
    }

    const candidateId = selectedCandidate.id;

    const candidateName = getCandidateName(selectedCandidate);

    try {
      setDeleteLoading(true);

      const response = await apiFetch("/api/candidate", {
        method: "DELETE",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: candidateId,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Candidate delete failed.");
      }

      toast.success("Candidate deleted successfully.");

      setDeleteDialogOpen(false);

      setSelectedCandidate(null);

      await refreshCandidate();

      await createCandidateNotification({
        action: "deleted",

        title: "Candidate Deleted",

        message: `${candidateName} has been deleted.`,

        candidateId,

        candidateName,
      });

      await syncCandidate();
    } catch (error) {
      console.error("[Candidate DELETE ERROR]", error);

      toast.error(error?.message || "Candidate delete failed.");
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
      // Candidate NAME
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
            title="Candidate Name"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">
              {getCandidateName(row.original)}
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
          headerTitle: "Candidate Name",
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
                    setSelectedCandidate(row.original);
                    setViewDialogOpen(true);
                  }}
                >
                  <Eye className="mr-2 size-4" />
                  View Candidate
                </DropdownMenuItem>
              )}

              {canEdit && (
                <DropdownMenuItem
                  onSelect={() => {
                    setSelectedCandidate({ ...row.original });
                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit Candidate
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
                  Delete Candidate
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
    [getCandidateName, handleDelete, canView, canEdit, canDelete]
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
              placeholder="Search Candidate"
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

          {/* ADD Candidate */}

          {canManage && (
            <Button
              disabled={isLoading || isFetching}
              onClick={() => {
                setSelectedCandidate(null);

                setAddDialogOpen(true);
              }}
            >
              <Plus />
              Add Candidate
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
              You do not have permission to view candidate.
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
          ADD Candidate
      ================================================= */}

      <CandidateAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={async (newCandidate) => {
          const candidateId = newCandidate?.id;

          const candidateName = getCandidateName(newCandidate);

          setAddDialogOpen(false);

          await refreshCandidate();

          await createCandidateNotification({
            action: "created",

            title: "Candidate Created",

            message: `${candidateName} has been created.`,

            candidateId,

            candidateName,
          });

          await syncCandidate();
        }}
      />

      {/* =================================================
          VIEW Candidate
      ================================================= */}

      {/* {selectedCandidate && (
        <CandidateViewDialog
          open={viewDialogOpen}
          candidate={selectedCandidate}
          closeDialog={() => {
            setViewDialogOpen(false);

            setSelectedCandidate(null);
          }}
        />
      )} */}

      {/* =================================================
          EDIT Candidate
      ================================================= */}

      {selectedCandidate && (

        <CandidateEditDialog
          open={editDialogOpen}
          onOpenChange={(nextOpen) => {
            setEditDialogOpen(nextOpen);

            if (!nextOpen) {
              setSelectedCandidate(null);
            }
          }}
          candidate={selectedCandidate}
          onSuccess={async (updatedCandidate) => {
            const candidateId = updatedCandidate?.id || selectedCandidate?.id;

            const candidateName = getCandidateName(
              updatedCandidate || selectedCandidate
            );

            setEditDialogOpen(false);
            setSelectedCandidate(null);

            await refreshCandidate();

            await createCandidateNotification({
              action: "updated",
              title: "Candidate Updated",
              message: `${candidateName} has been updated.`,
              candidateId,
              candidateName,
            });

            await syncCandidate();
          }}
        />
      )}

      {/* =================================================
          DELETE Candidate
      ================================================= */}

      {selectedCandidate && (
        <CandidateDeleteDialog
          open={deleteDialogOpen}
          candidate={selectedCandidate}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          closeDialog={() => {
            if (!deleteLoading) {
              setDeleteDialogOpen(false);

              setSelectedCandidate(null);
            }
          }}
        />
      )}
    </>
  );
};

export default CandidateList;
