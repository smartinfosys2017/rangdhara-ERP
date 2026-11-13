"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Ellipsis,
  Eye,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

import { Badge } from "@/components/ui/badge";
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { can } from "@/lib/permissions";
import { Skeleton } from "@/components/ui/skeleton";

import AddStaffDialog from "./add-staff-dialog";
import ViewStaffDialog from "./view-staff-dialog";

/* =========================================================
   STAFF LIST
========================================================= */

export default function StaffList() {
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("staff.view", userPermissions);
  const canManage = can("staff.manage", userPermissions);
  const canEdit = can("staff.edit", userPermissions);
  const canDelete = can("staff.delete", userPermissions);
  /* =========================================================
     PAGINATION
  ========================================================= */

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  /* =========================================================
     SORTING
  ========================================================= */

  const [sorting, setSorting] = useState([
    {
      id: "createdAt",
      desc: true,
    },
  ]);

  /* =========================================================
     SEARCH
  ========================================================= */

  const [searchQuery, setSearchQuery] = useState("");

  /* =========================================================
     STATUS FILTER
  ========================================================= */

  const [status, setStatus] = useState("all");

  /* =========================================================
     DIALOG STATE
  ========================================================= */

  const [addOpen, setAddOpen] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);

  const [editingStaff, setEditingStaff] = useState(null);

  const [selectedStaff, setSelectedStaff] = useState(null);

  /* =========================================================
     FETCH STAFF
  ========================================================= */

  const fetchStaff = async ({
    pageIndex,
    pageSize,
    sorting,
    searchQuery,
    status,
  }) => {
    const sortField = sorting?.[0]?.id || "createdAt";

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

    if (status && status !== "all") {
      params.set("status", status);
    }

    const response = await apiFetch(`/api/staff?${params.toString()}`);

    if (!response.ok) {
      let message = "Failed to load staff";

      try {
        const errorData = await response.json();

        message = errorData.error || errorData.message || message;
      } catch {
        // Ignore JSON parsing error
      }

      throw new Error(message);
    }

    return response.json();
  };

  /* =========================================================
     REACT QUERY
  ========================================================= */

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["staff", pagination, sorting, searchQuery, status],

    queryFn: () =>
      fetchStaff({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sorting,
        searchQuery,
        status,
      }),

    staleTime: 0,

    gcTime: 1000 * 60 * 60,

    refetchOnWindowFocus: false,

    refetchOnReconnect: false,

    retry: 1,
  });

  /* =========================================================
     STAFF DATA
  ========================================================= */

  const staff = data?.staff || data?.data || [];

  const total = data?.pagination?.total || 0;

  /* =========================================================
     ROLE NAME
  ========================================================= */

  const getRoleName = (item) => {
    if (!item?.roles || !item.roles.length) {
      return "";
    }

    return item.roles
      .map((role) => role?.name || "")
      .filter(Boolean)
      .join(", ");
  };

  /* =========================================================
     VIEW STAFF
  ========================================================= */

  const handleView = (staffItem) => {
    setSelectedStaff(staffItem);

    setViewOpen(true);
  };

  /* =========================================================
     EDIT STAFF
  ========================================================= */

  const handleEdit = (staffItem) => {
    setEditingStaff(staffItem);

    setAddOpen(true);
  };

  /* =========================================================
     DELETE STAFF
  ========================================================= */

  const handleDelete = async (staffItem) => {
    const fullName = `${staffItem.firstName || ""} ${
      staffItem.lastName || ""
    }`.trim();

    const confirmed = window.confirm(
      `Are you sure you want to delete ${fullName}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await apiFetch(`/api/staff?id=${staffItem.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Failed to delete staff",
        );
      }

      await refetch();
    } catch (error) {
      console.error("Delete staff error:", error);

      alert(error.message || "Failed to delete staff");
    }
  };

  /* =========================================================
     COLUMNS
  ========================================================= */

  const columns = useMemo(
    () => [
      /* -----------------------------------------------------
         STAFF
      ----------------------------------------------------- */

      {
        id: "name",

        accessorFn: (row) =>
          `${row.firstName || ""} ${row.lastName || ""}`.trim(),

        header: ({ column }) => (
          <DataGridColumnHeader title="Staff" column={column} visibility />
        ),

        cell: ({ row, getValue }) => {
          const item = row.original;

          const fullName = getValue();

          const initials = `${item.firstName?.[0] || ""}${
            item.lastName?.[0] || ""
          }`.toUpperCase();

          return (
            <div className="flex items-center gap-3">
              {item.profileImage ? (
                <img
                  src={item.profileImage}
                  alt={fullName}
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                  {initials || <UserRound className="size-4" />}
                </div>
              )}

              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{fullName || "-"}</span>

                {item.isAdministrator && (
                  <span className="flex items-center gap-1 text-xs text-primary">
                    <ShieldCheck className="size-3" />
                    Administrator
                  </span>
                )}
              </div>
            </div>
          );
        },

        size: 220,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Staff",

          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />

              <Skeleton className="h-5 w-28" />
            </div>
          ),
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

      /* -----------------------------------------------------
         PHONE
      ----------------------------------------------------- */

      {
        accessorKey: "phone",

        id: "phone",

        header: ({ column }) => (
          <DataGridColumnHeader title="Phone" column={column} visibility />
        ),

        cell: ({ getValue }) => <span>{getValue() || "-"}</span>,

        size: 160,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Phone",

          skeleton: <Skeleton className="h-5 w-24" />,
        },
      },

      /* -----------------------------------------------------
         ROLE
      ----------------------------------------------------- */

      {
        id: "role",

        accessorFn: (row) => getRoleName(row),

        header: ({ column }) => (
          <DataGridColumnHeader title="Role" column={column} visibility />
        ),

        cell: ({ row }) => {
          const roles = row.original?.roles || [];

          if (roles.length === 0) {
            return <span className="text-muted-foreground">No role</span>;
          }

          return (
            <div className="flex flex-wrap gap-1">
              {roles.map((role) => (
                <Badge key={role.id} variant="outline">
                  {role.name}
                </Badge>
              ))}
            </div>
          );
        },

        size: 200,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Role",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      /* -----------------------------------------------------
         HOURLY RATE
      ----------------------------------------------------- */

      {
        accessorKey: "hourlyRate",

        id: "hourlyRate",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Hourly Rate"
            column={column}
            visibility
          />
        ),

        cell: ({ getValue }) => {
          const value = Number(getValue() || 0);

          return <span>${value.toFixed(2)}</span>;
        },

        size: 140,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Hourly Rate",

          skeleton: <Skeleton className="h-5 w-20" />,
        },
      },

      /* -----------------------------------------------------
         STATUS
      ----------------------------------------------------- */

      {
        accessorKey: "isActive",

        id: "status",

        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),

        cell: ({ getValue }) => {
          const active = Boolean(getValue());

          return active ? (
            <Badge variant="success">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          );
        },

        size: 110,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Status",

          skeleton: <Skeleton className="h-7 w-16" />,
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
      /* -----------------------------------------------------
         ACTIONS
      ----------------------------------------------------- */

      {
        id: "actions",

        header: "Actions",

        cell: ({ row }) => {
          const item = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="size-7" mode="icon" variant="ghost">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="bottom" align="end">
                {canView && (
                  <DropdownMenuItem onClick={() => handleView(item)}>
                    <Eye />
                    View
                  </DropdownMenuItem>
                )}

                {canEdit && (
                  <DropdownMenuItem onClick={() => handleEdit(item)}>
                    <Pencil />
                    Edit
                  </DropdownMenuItem>
                )}

                {(canView || canEdit) && canDelete && <DropdownMenuSeparator />}

                {canDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },

        size: 75,

        enableSorting: false,

        enableResizing: false,

        enableHiding: false,

        meta: {
          skeleton: <Skeleton className="size-5" />,
        },
      },
    ],
    [],
  );

  /* =========================================================
     TABLE
  ========================================================= */

  const table = useReactTable({
    columns,

    data: staff,

    pageCount: Math.ceil(total / pagination.pageSize),

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

  /* =========================================================
     TOOLBAR
  ========================================================= */

  const DataGridToolbar = () => {
    const [inputValue, setInputValue] = useState(searchQuery);

    const handleSearch = () => {
      setSearchQuery(inputValue);

      setPagination((current) => ({
        ...current,
        pageIndex: 0,
      }));
    };

    const clearSearch = () => {
      setInputValue("");
      setSearchQuery("");

      setPagination((current) => ({
        ...current,
        pageIndex: 0,
      }));
    };

    return (
      <CardHeader className="py-5">
        <div className="flex flex-wrap items-center gap-3">
          {/* SEARCH */}

          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search staff"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              disabled={isLoading}
              className="w-full ps-9 pe-9 md:w-64"
            />

            {inputValue && (
              <Button
                mode="icon"
                variant="dim"
                className="absolute end-1.5 top-1/2 size-6 -translate-y-1/2"
                onClick={clearSearch}
              >
                <X />
              </Button>
            )}
          </div>

          {/* STATUS */}

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);

              setPagination((current) => ({
                ...current,
                pageIndex: 0,
              }));
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>

              <SelectItem value="active">Active</SelectItem>

              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ADD */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              disabled={isLoading || isFetching}
              onClick={() => {
                setEditingStaff(null);
                setAddOpen(true);
              }}
            >
              <Plus />
              Add Staff
            </Button>
          </div>
        )}
      </CardHeader>
    );
  };
  /* =========================================================
   SESSION LOADING
========================================================= */

  if (sessionStatus === "loading") {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Loading...</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              Checking your permissions.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  /* =========================================================
   NOT AUTHENTICATED
========================================================= */

  if (sessionStatus !== "authenticated") {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Authentication Required</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You must be logged in to access staff.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  /* =========================================================
   ACCESS DENIED
========================================================= */

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Access Denied</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view staff.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }
  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <>
      <DataGrid
        table={table}
        recordCount={total}
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

      {/* =====================================================
          ADD / EDIT STAFF
      ===================================================== */}

      <AddStaffDialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);

          if (!open) {
            setEditingStaff(null);
          }
        }}
        staff={editingStaff}
        roles={data?.roles || []}
        onSuccess={() => {
          setAddOpen(false);
          setEditingStaff(null);
          refetch();
        }}
      />

      {/* =====================================================
          VIEW STAFF
      ===================================================== */}

      <ViewStaffDialog
        open={viewOpen}
        onOpenChange={setViewOpen}
        staff={selectedStaff}
      />
    </>
  );
}
