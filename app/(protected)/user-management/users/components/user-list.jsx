"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Plus, RefreshCw, Search, X, ChevronRight } from "lucide-react";

import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { formatDate, formatDateTime, getInitials } from "@/lib/helpers";

import { can } from "@/lib/permissions";

import { getUserStatusProps, UserStatusProps } from "../constants/status";

import { useRoleSelectQuery } from "../../roles/hooks/use-role-select-query";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge, BadgeDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Card, CardFooter, CardHeader, CardTable } from "@/components/ui/card";

import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import UserInviteDialog from "./user-add-dialog";

// =======================================================
// USER LIST
// =======================================================

const UserList = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // =====================================================
  // SESSION / PERMISSIONS
  // =====================================================

  const { data: session, status: sessionStatus } = useSession();

  const userPermissions = useMemo(
    () => session?.user?.permissions || [],
    [session],
  );

  const canViewUsers = can("user.view", userPermissions);
  const canManageUsers = can("user.manage", userPermissions);

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
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // =====================================================
  // NETWORK STATE
  // =====================================================

  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  // =====================================================
  // DATABASE STATUS
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
  // ADD USER DIALOG
  // =====================================================

  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  // =====================================================
  // ROLE OPTIONS
  // =====================================================

  const { data: roleList } = useRoleSelectQuery();

  // =====================================================
  // DATABASE STATUS CHECK
  // =====================================================

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
        throw new Error("Database status check failed.");
      }

      const result = await response.json();

      setDbStatus({
        env: result?.activeEnv || "local",
        online: true,
        loading: false,
      });
    } catch (error) {
      console.error("[USER DB STATUS ERROR]", error);

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
  // REFRESH USERS
  // =====================================================

  const refreshUsers = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["user-users"],
    });

    await queryClient.refetchQueries({
      queryKey: ["user-users"],
      type: "active",
    });
  }, [queryClient]);

  // =====================================================
  // SYNC USERS LOCAL -> LIVE
  // =====================================================

  const syncUsers = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      toast.error("You are offline. User synchronization cannot start.");
      return null;
    }

    if (syncingRef.current) {
      return null;
    }

    try {
      syncingRef.current = true;
      setSyncing(true);

      toast.loading("Synchronizing users...", {
        id: "user-sync",
      });

      const response = await apiFetch("/api/sync/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || "User synchronization failed.");
      }

      console.log("[USER SYNC SUCCESS]", result);

      await refreshUsers();

      await queryClient.invalidateQueries({
        queryKey: ["user-sync"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["sync"],
      });

      await checkDbStatus();

      const stats = result?.stats;

      const statsMessage = stats
        ? ` Created: ${stats.created ?? 0}, updated: ${stats.updated ?? 0
        }, skipped: ${stats.skipped ?? 0}, failed: ${stats.failed ?? 0}.`
        : "";

      if ((stats?.failed ?? 0) > 0) {
        toast.warning(
          `${result?.message || "User sync completed with errors."}${statsMessage}`,
          { id: "user-sync", duration: 6000 },
        );
      } else {
        toast.success(
          `${result?.message || "Users synchronized successfully."}${statsMessage}`,
          { id: "user-sync", duration: 6000 },
        );
      }

      return result;
    } catch (error) {
      console.error("[USER SYNC ERROR]", error);

      toast.error(error?.message || "User synchronization failed.", {
        id: "user-sync",
      });

      return null;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [checkDbStatus, queryClient, refreshUsers]);

  // =====================================================
  // FETCH USERS
  // =====================================================

  const fetchUsers = useCallback(
    async ({
      pageIndex,
      pageSize,
      sorting,
      searchQuery,
      selectedRole,
      selectedStatus,
    }) => {
      const sortField = sorting?.[0]?.id || "createdAt";
      const sortDirection = sorting?.[0]?.desc ? "desc" : "asc";

      const params = new URLSearchParams({
        page: String(pageIndex + 1),
        limit: String(pageSize),
        sort: sortField,
        dir: sortDirection,
        ...(searchQuery.trim() ? { query: searchQuery.trim() } : {}),
        ...(selectedRole !== "all" ? { roleId: selectedRole } : {}),
        ...(selectedStatus !== "all" ? { status: selectedStatus } : {}),
      });

      const response = await apiFetch(
        `/api/user-management/users?${params.toString()}`,
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || "Failed to fetch users.");
      }

      return result;
    },
    [],
  );

  // =====================================================
  // USERS QUERY
  // =====================================================

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: [
      "user-users",
      pagination,
      sorting,
      searchQuery,
      selectedRole,
      selectedStatus,
    ],

    queryFn: () =>
      fetchUsers({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sorting,
        searchQuery,
        selectedRole,
        selectedStatus,
      }),

    staleTime: 0,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // =====================================================
  // FILTER HANDLERS
  // =====================================================

  const handleRoleSelection = useCallback((roleId) => {
    setSelectedRole(roleId);

    setPagination((previous) => ({
      ...previous,
      pageIndex: 0,
    }));
  }, []);

  const handleStatusSelection = useCallback((status) => {
    setSelectedStatus(status);

    setPagination((previous) => ({
      ...previous,
      pageIndex: 0,
    }));
  }, []);

  // =====================================================
  // ROW CLICK
  // =====================================================

  const handleRowClick = useCallback(
    (row) => {
      if (!row?.id) {
        return;
      }

      router.push(`/user-management/users/${encodeURIComponent(row.id)}`);
    },
    [router],
  );

  // =====================================================
  // ONLINE / OFFLINE LISTENERS
  // =====================================================

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);

      await checkDbStatus();

      await queryClient.invalidateQueries({
        queryKey: ["user-users"],
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

  // =====================================================
  // AUTOMATIC DATABASE STATUS CHECK
  // =====================================================

  useEffect(() => {
    checkDbStatus();

    const interval = setInterval(() => {
      checkDbStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [checkDbStatus]);

  // =====================================================
  // TABLE COLUMNS
  // =====================================================

  const columns = useMemo(
    () => [
      // USER

      {
        accessorKey: "name",
        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader title="User" visibility column={column} />
        ),

        cell: ({ row }) => {
          const user = row.original;
          const avatarUrl =
            user.avatar ||
            user.UserDetails?.profilePhoto ||
            user.userDetails?.profilePhoto ||
            null;

          const initials = getInitials(user.name || user.email || "User");

          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8 shrink-0">
                {avatarUrl && (
                  <AvatarImage src={avatarUrl} alt={user.name || "User"} />
                )}

                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>

              <div className="min-w-0 space-y-px">
                <div className="truncate text-sm font-medium">
                  {user.name || "-"}
                </div>

                <div className="truncate text-xs text-muted-foreground">
                  {user.email || "-"}
                </div>
              </div>
            </div>
          );
        },

        size: 300,
        enableSorting: true,
        enableHiding: false,

        meta: {
          headerTitle: "Name",

          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full" />

              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ),
        },
      },

      // ROLE

      {
        accessorKey: "role",
        id: "role",

        header: ({ column }) => (
          <DataGridColumnHeader title="Role" visibility column={column} />
        ),

        cell: ({ row }) => {
          const role = row.original.role;

          return role?.name ? (
            <Badge variant="secondary">{role.name}</Badge>
          ) : (
            "-"
          );
        },

        size: 150,
        enableSorting: false,
        enableHiding: true,

        meta: {
          headerTitle: "Role",
          skeleton: <Skeleton className="h-7 w-28" />,
        },
      },

      // STATUS

      {
        accessorKey: "status",
        id: "status",

        header: ({ column }) => (
          <DataGridColumnHeader title="Status" visibility column={column} />
        ),

        cell: ({ row }) => {
          const statusProps = getUserStatusProps(row.original.status);

          return (
            <div className="inline-flex gap-2.5">
              <Badge variant={statusProps.variant} appearance="ghost">
                <BadgeDot />
                {statusProps.label}
              </Badge>

              {row.original.isTrashed && (
                <Badge variant="destructive" appearance="light">
                  Trashed
                </Badge>
              )}
            </div>
          );
        },

        size: 125,
        enableSorting: true,
        enableHiding: true,

        meta: {
          headerTitle: "Status",
          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },

      // JOINED

      {
        accessorKey: "createdAt",
        id: "createdAt",

        header: ({ column }) => (
          <DataGridColumnHeader title="Joined" visibility column={column} />
        ),

        cell: ({ row }) =>
          row.original.createdAt
            ? formatDate(new Date(row.original.createdAt))
            : "-",

        size: 150,
        enableSorting: true,
        enableHiding: true,

        meta: {
          headerTitle: "Joined",
          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },

      // LAST SIGN IN

      {
        accessorKey: "lastSignInAt",
        id: "lastSignInAt",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Last Sign In"
            visibility
            column={column}
          />
        ),

        cell: ({ row }) =>
          row.original.lastSignInAt
            ? formatDateTime(new Date(row.original.lastSignInAt))
            : "-",

        size: 175,
        enableSorting: true,
        enableHiding: true,

        meta: {
          headerTitle: "Last Sign In",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // OPEN USER

      {
        id: "actions",
        header: "",

        cell: () => (
          <ChevronRight className="size-3.5 text-muted-foreground/70" />
        ),

        size: 40,
        enableSorting: false,
        enableHiding: false,
        enableResizing: false,

        meta: {
          skeleton: <Skeleton className="size-4" />,
        },
      },
    ],
    [],
  );

  // =====================================================
  // TABLE INSTANCE
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
      <CardHeader className="flex-col flex-wrap items-stretch gap-3 py-5 sm:flex-row sm:items-center">
        {/* LEFT SIDE */}

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          {/* SEARCH */}

          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search users"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              disabled={isLoading || isFetching}
              className="w-full ps-9 sm:w-64"
            />

            {inputValue.length > 0 && (
              <Button
                type="button"
                mode="icon"
                variant="dim"
                className="absolute end-1.5 top-1/2 size-6 -translate-y-1/2"
                onClick={handleClearSearch}
              >
                <X />
              </Button>
            )}
          </div>

          {/* ROLE FILTER */}

          <Select
            value={selectedRole}
            onValueChange={handleRoleSelection}
            disabled={isLoading || isFetching}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>

              {roleList?.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* STATUS FILTER */}

          <Select
            value={selectedStatus}
            onValueChange={handleStatusSelection}
            disabled={isLoading || isFetching}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All users</SelectItem>

              {Object.entries(UserStatusProps).map(([status, { label }]) => (
                <SelectItem key={status} value={status}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* RIGHT SIDE */}

        <div className="flex flex-wrap items-center justify-end gap-3">
          {/* DATABASE STATUS */}

          <div className="flex items-center gap-2 rounded-lg border px-3 py-1">
            <span
              className={`size-2.5 rounded-full ${dbStatus.online && isOnline ? "bg-green-500" : "bg-red-500"
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
              className="size-7"
              disabled={checkingDb || syncing}
              onClick={checkDbStatus}
              title="Refresh database status"
            >
              <RefreshCw className={checkingDb ? "animate-spin" : ""} />
            </Button>
          </div>

          {/* SYNC USERS */}

          {/* <Button
            type="button"
            variant="outline"
            disabled={syncing || !isOnline}
            onClick={syncUsers}
          >
            <RefreshCw className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync Users"}
          </Button> */}

          {/* ADD USER */}

          {canManageUsers && (
            <Button
              type="button"
              disabled={isLoading || isFetching}
              onClick={() => setInviteDialogOpen(true)}
            >
              <Plus />
              Add User
            </Button>
          )}
        </div>
      </CardHeader>
    );
  };

  // =====================================================
  // ACCESS DENIED
  // =====================================================

  if (sessionStatus === "authenticated" && !canViewUsers) {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Access Denied</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view users.
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
        onRowClick={handleRowClick}
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

      {/* FETCH ERROR */}

      {error && !isLoading && (
        <p className="mt-3 text-sm text-destructive">
          {error.message || "Unable to load users."}
        </p>
      )}

      {/* ADD USER DIALOG */}
      <UserInviteDialog
        open={inviteDialogOpen}
        closeDialog={() => setInviteDialogOpen(false)}
        onSuccess={async () => {
          setInviteDialogOpen(false);
          await syncUsers();
          await refreshUsers();
        }}
      />
    </>
  );
};

export default UserList;
