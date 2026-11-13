"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Download,
  Ellipsis,
  Package,
  Power,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

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

// =======================================================
// MODULE MANAGEMENT PAGE
// =======================================================

const ModuleManagementPage = () => {
  const queryClient = useQueryClient();

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

  const [uploading, setUploading] = useState(false);

  // =======================================================
  // FETCH MODULES
  // =======================================================

  const fetchModules = useCallback(async () => {
    const params = new URLSearchParams({
      page: String(pagination.pageIndex + 1),
      limit: String(pagination.pageSize),
      sort: sorting?.[0]?.id || "id",
      dir: sorting?.[0]?.desc ? "desc" : "asc",
      ...(searchQuery
        ? {
            query: searchQuery,
          }
        : {}),
    });

    const response = await fetch(`/api/modules?${params.toString()}`, {
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Failed to fetch modules.");
    }

    return result;
  }, [pagination, sorting, searchQuery]);

  // =======================================================
  // QUERY
  // =======================================================

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["modules", pagination, sorting, searchQuery],

    queryFn: fetchModules,

    staleTime: 0,

    gcTime: 1000 * 60 * 60,

    refetchOnWindowFocus: false,

    refetchOnReconnect: false,

    retry: 1,
  });

  // =======================================================
  // REFRESH
  // =======================================================

  const refreshModules = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["modules"],
    });

    await queryClient.refetchQueries({
      queryKey: ["modules"],
      type: "active",
    });
  }, [queryClient]);

  // =======================================================
  // ACTIVATE / DEACTIVATE
  // =======================================================

  const handleStatusToggle = useCallback(
    async (module) => {
      if (!module?.id) {
        return;
      }

      const action = module.status === "ACTIVE" ? "deactivate" : "activate";

      try {
        const response = await fetch("/api/modules", {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            id: module.id,
            action,
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || `Unable to ${action} module.`);
        }

        toast.success(
          result?.message ||
            `Module ${
              action === "activate" ? "activated" : "deactivated"
            } successfully.`,
        );

        await refreshModules();
      } catch (error) {
        console.error("[MODULE STATUS ERROR]", error);

        toast.error(error?.message || "Module status update failed.");
      }
    },
    [refreshModules],
  );

  // =======================================================
  // UNINSTALL
  // =======================================================

  const handleUninstall = useCallback(
    async (module) => {
      if (!module?.id) {
        return;
      }

      const confirmed = window.confirm(
        `Are you sure you want to completely uninstall "${module.name}"?`,
      );

      if (!confirmed) {
        return;
      }

      try {
        const response = await fetch("/api/modules", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            id: module.id,
            action: "uninstall",
          }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Module uninstall failed.");
        }

        toast.success(result?.message || "Module uninstalled successfully.");

        await refreshModules();
      } catch (error) {
        console.error("[MODULE UNINSTALL ERROR]", error);

        toast.error(error?.message || "Module uninstall failed.");
      }
    },
    [refreshModules],
  );

  // =======================================================
  // ZIP UPLOAD
  // =======================================================

  const handleZipUpload = useCallback(
    async (event) => {
      const file = event.target.files?.[0];

      // Reset file input so the same ZIP can be selected again.
      event.target.value = "";

      if (!file) {
        return;
      }

      if (!file.name.toLowerCase().endsWith(".zip")) {
        toast.error("Please select a ZIP file.");
        return;
      }

      try {
        setUploading(true);

        toast.loading("Installing module...", {
          id: "module-upload",
        });

        const formData = new FormData();

        formData.append("moduleZip", file);

        const response = await fetch("/api/modules/upload", {
          method: "POST",

          body: formData,

          cache: "no-store",
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result?.success) {
          throw new Error(result?.message || "Module installation failed.");
        }

        toast.success(result?.message || "Module installed successfully.", {
          id: "module-upload",
        });

        await refreshModules();
      } catch (error) {
        console.error("[MODULE UPLOAD ERROR]", error);

        toast.error(
          error?.message || "Module installation/extraction failed.",
          {
            id: "module-upload",
          },
        );
      } finally {
        setUploading(false);
      }
    },
    [refreshModules],
  );

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

        size: 80,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "ID",

          skeleton: <Skeleton className="h-7 w-12" />,
        },
      },

      // ===================================================
      // MODULE
      // ===================================================

      {
        accessorKey: "name",

        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader title="Module" column={column} visibility />
        ),

        cell: ({ row }) => {
          const module = row.original;

          return (
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                {module.icon ? (
                  <i
                    className={`ki-duotone ki-${module.icon} text-primary text-xl`}
                  />
                ) : (
                  <Package className="size-5 text-primary" />
                )}
              </div>

              <div className="flex min-w-0 flex-col">
                <span className="truncate font-semibold">
                  {module.name || "-"}
                </span>

                <span className="truncate text-xs text-muted-foreground">
                  {module.description || "No description"}
                </span>
              </div>
            </div>
          );
        },

        size: 350,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Module",

          skeleton: (
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-lg" />

              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />

                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ),
        },
      },

      // ===================================================
      // AUTHOR
      // ===================================================

      {
        accessorKey: "author",

        id: "author",

        header: ({ column }) => (
          <DataGridColumnHeader title="Author" column={column} visibility />
        ),

        cell: ({ row }) => <span>{row.original?.author || "System Core"}</span>,

        size: 180,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Author",

          skeleton: <Skeleton className="h-7 w-28" />,
        },
      },

      // ===================================================
      // VERSION
      // ===================================================

      {
        accessorKey: "version",

        id: "version",

        header: ({ column }) => (
          <DataGridColumnHeader title="Version" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="badge badge-light">
            {row.original?.version || "-"}
          </span>
        ),

        size: 130,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Version",

          skeleton: <Skeleton className="h-6 w-16" />,
        },
      },

      // ===================================================
      // STATUS
      // ===================================================

      {
        accessorKey: "status",

        id: "status",

        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),

        cell: ({ row }) => {
          const active = row.original?.status === "ACTIVE";

          return (
            <span
              className={`badge ${
                active ? "badge-light-success" : "badge-light-danger"
              }`}
            >
              {active ? "Active" : "Inactive"}
            </span>
          );
        },

        size: 130,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Status",

          skeleton: <Skeleton className="h-6 w-16" />,
        },
      },

      // ===================================================
      // ACTIONS
      // ===================================================

      {
        id: "actions",

        header: "Actions",

        cell: ({ row }) => {
          const module = row.original;

          const active = module?.status === "ACTIVE";

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-7 w-7" mode="icon" variant="ghost">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="bottom" align="end">
                {/* ACTIVATE / DEACTIVATE */}

                <DropdownMenuItem onClick={() => handleStatusToggle(module)}>
                  {active ? (
                    <>
                      <Power className="mr-2 size-4" />
                      Deactivate Module
                    </>
                  ) : (
                    <>
                      <Power className="mr-2 size-4" />
                      Activate Module
                    </>
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* UNINSTALL */}

                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => handleUninstall(module)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Uninstall Module
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },

        size: 80,

        enableSorting: false,

        enableResizing: false,

        enableHiding: false,

        meta: {
          skeleton: <Skeleton className="size-5" />,
        },
      },
    ],
    [handleStatusToggle, handleUninstall],
  );

  // =======================================================
  // TABLE
  // =======================================================

  const table = useReactTable({
    columns,

    data: data?.modules || data?.data || [],

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
        {/* LEFT */}

        <div className="flex items-center gap-2.5">
          {/* SEARCH */}

          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search modules"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              disabled={isLoading || isFetching}
              className="w-full ps-9 md:w-64"
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

          {/* REFRESH */}

          <Button
            type="button"
            mode="icon"
            variant="outline"
            disabled={isLoading || isFetching}
            onClick={refreshModules}
          >
            <RefreshCw className={isFetching ? "animate-spin" : ""} />
          </Button>
        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-3">
          {/* UPLOAD MODULE */}

          <label
            className={`inline-flex cursor-pointer items-center gap-2 ${
              uploading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            <Button type="button" asChild disabled={uploading}>
              <span>
                <Upload />

                {uploading ? "Installing..." : "Upload Module"}
              </span>
            </Button>

            <input
              type="file"
              accept=".zip"
              hidden
              disabled={uploading}
              onChange={handleZipUpload}
            />
          </label>
        </div>
      </CardHeader>
    );
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
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
  );
};

export default ModuleManagementPage;
