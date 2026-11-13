"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Plus, Search, X, Eye, Pencil,Trash2 } from "lucide-react";

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

import ProjectAddDialog from "./project-add-dialog";
import ProjectEditDialog from "./project-edit-dialog";
import ProjectDeleteDialog from "./project-delete-dialog";
import ProjectViewDialog from "./project-view-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

// Replace with:
// const permissions = user?.permissions || [];

const permissions = [
  "project.view",
  "project.manage",
  "project.edit",
  "project.delete",
];

const canView = can("project.view", permissions);

const canManage = can("project.manage", permissions);

const canEdit = can("project.edit", permissions);

const canDelete = can("project.delete", permissions);

// =======================================================
// PROJECT NOTIFICATION
// =======================================================

const createProjectNotification = async ({
  action,
  title,
  message,
  projectId = null,
  projectName = null,
}) => {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        module: "support",

        action,

        title,

        message,

        entityId:
          projectId !== null && projectId !== undefined
            ? String(projectId)
            : null,

        entityType: "project",

        entityName: projectName || "Project",

        url:
          projectId !== null && projectId !== undefined
            ? `/setup/settings/support/project/${projectId}`
            : "/setup/settings/support/project",
      }),

      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(
        result?.message ||
          result?.error ||
          "Failed to create project notification.",
      );
    }

    // Refresh global notification list
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notifications-refresh"));

      window.dispatchEvent(
        new CustomEvent("notifications-received", {
          detail: result.notification ? [result.notification] : [],
        }),
      );
    }

    return result;
  } catch (error) {
    console.error("[PROJECT NOTIFICATION ERROR]", error);

    // Notification failure must NOT
    // break the project CRUD operation.
    return null;
  }
};

// =======================================================
// PROJECT LIST
// =======================================================

const ProjectList = () => {
  const queryClient = useQueryClient();
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("project.view", userPermissions);
  const canManage = can("project.manage", userPermissions);
  const canEdit = can("project.edit", userPermissions);
  const canDelete = can("project.delete", userPermissions);
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
  // DIALOG STATE
  // =======================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  // =======================================================
  // SELECTED PROJECT
  // =======================================================

  const [editProject, setEditProject] = useState(null);

  const [deleteProject, setDeleteProject] = useState(null);

  const [viewProject, setViewProject] = useState(null);

  // =======================================================
  // FETCH PROJECTS
  // =======================================================

  const fetchProjects = async ({
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
      `/api/settings/support/project?${params.toString()}`,
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(result?.message || "Failed to fetch projects.");
    }

    return result;
  };

  // =======================================================
  // QUERY
  // =======================================================

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["support-projects", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchProjects({
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
  // REFRESH PROJECT LIST
  // =======================================================

  const refreshProjects = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["support-projects"],
    });

    await queryClient.refetchQueries({
      queryKey: ["support-projects"],
    });
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
      // PROJECT NAME
      // ===================================================

      {
        accessorKey: "name",

        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader title="Project" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "-"}</span>
        ),

        size: 300,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Project",

          skeleton: <Skeleton className="h-7 w-40" />,
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
                    setViewProject(row.original);

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
                    setEditProject(row.original);

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
                  onClick={() => {
                    setDeleteProject(row.original);

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

        meta: {
          skeleton: <Skeleton className="size-5" />,
        },
      },
    ],
    [],
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
        {/* SEARCH */}

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search projects"
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

        {/* ADD PROJECT */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              disabled={isLoading || isFetching}
              onClick={() => {
                setEditProject(null);

                setAddDialogOpen(true);
              }}
            >
              <Plus />
              Add Project
            </Button>
          </div>
        )}
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
              You do not have permission to view projects.
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
          ADD PROJECT
      ================================================= */}

      <ProjectAddDialog
        open={addDialogOpen}

        closeDialog={() => {
          setAddDialogOpen(false);
        }}

        onSuccess={async (createdProject) => {
          setAddDialogOpen(false);

          await refreshProjects();

          await createProjectNotification({
            action: "created",

            title: "Project Created",

            message: createdProject?.name
              ? `Project "${createdProject.name}" was created successfully.`
              : "A new project was created successfully.",

            projectId: createdProject?.id || null,

            projectName: createdProject?.name || "Project",
          });
        }}
      />

      {/* =================================================
          EDIT PROJECT
      ================================================= */}

      {editProject && (
        <ProjectEditDialog
          open={editDialogOpen}

          closeDialog={() => {
            setEditDialogOpen(false);

            setEditProject(null);
          }}

          project={editProject}

          onSuccess={async (updatedProject) => {
            const projectForNotification = updatedProject || editProject;

            setEditDialogOpen(false);

            setEditProject(null);

            await refreshProjects();

            await createProjectNotification({
              action: "updated",

              title: "Project Updated",

              message: projectForNotification?.name
                ? `Project "${projectForNotification.name}" was updated successfully.`
                : "A project was updated successfully.",

              projectId: projectForNotification?.id || null,

              projectName: projectForNotification?.name || "Project",
            });
          }}
        />
      )}

      {/* =================================================
          VIEW PROJECT
      ================================================= */}

      {viewProject && (
        <ProjectViewDialog
          open={viewDialogOpen}

          closeDialog={() => {
            setViewDialogOpen(false);

            setViewProject(null);
          }}

          project={viewProject}
        />
      )}

      {/* =================================================
          DELETE PROJECT
      ================================================= */}

      {deleteProject && (
        <ProjectDeleteDialog
          open={deleteDialogOpen}

          closeDialog={() => {
            setDeleteDialogOpen(false);

            setDeleteProject(null);
          }}

          project={deleteProject}

          onSuccess={async () => {
            // Save project information BEFORE
            // clearing deleteProject state.
            const deletedProject = deleteProject;

            setDeleteDialogOpen(false);

            setDeleteProject(null);

            await refreshProjects();

            await createProjectNotification({
              action: "deleted",

              title: "Project Deleted",

              message: deletedProject?.name
                ? `Project "${deletedProject.name}" was deleted successfully.`
                : "A project was deleted successfully.",

              projectId: deletedProject?.id || null,

              projectName: deletedProject?.name || "Project",
            });
          }}
        />
      )}
    </>
  );
};

export default ProjectList;
