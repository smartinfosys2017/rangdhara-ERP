"use client";

import { useMemo, useState } from "react";

import { useSession } from "next-auth/react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/helpers";
import { can } from "@/lib/permissions";

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

import EmailTemplateCreate from "./email-template-create";
import EmailTemplateUpdate from "./email-template-update";
import EmailTemplatePreview from "./email-template-preview";
import EmailTemplateDelete from "./email-template-delete";
const EmailTemplateList = () => {
  const queryClient = useQueryClient();

  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();

  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("email_templates.view", userPermissions);

  const canManage = can("email_templates.manage", userPermissions);

  const canEdit = can("email_templates.edit", userPermissions);

  const canDelete = can("email_templates.delete", userPermissions);

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

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // =======================================================
  // SELECTED TEMPLATE
  // =======================================================

  const [viewEmailTemplate, setViewEmailTemplate] = useState(null);

  const [editEmailTemplate, setEditEmailTemplate] = useState(null);

  const [deleteEmailTemplate, setDeleteEmailTemplate] = useState(null);

  // =======================================================
  // FETCH EMAIL TEMPLATES
  // =======================================================

  const fetchEmailTemplates = async ({
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
      `/api/email-templates?${params.toString()}`,
    );

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));

      throw new Error(result?.message || "Failed to fetch email templates.");
    }

    return response.json();
  };

  // =======================================================
  // QUERY
  // =======================================================

  const { data, isLoading } = useQuery({
    queryKey: ["email-templates", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchEmailTemplates({
        pageIndex: pagination.pageIndex,

        pageSize: pagination.pageSize,

        sorting,

        searchQuery,
      }),

    staleTime: Infinity,

    gcTime: 1000 * 60 * 60,

    refetchOnWindowFocus: false,

    refetchOnReconnect: false,

    retry: 1,
  });

  // =======================================================
  // REFRESH
  // =======================================================

  const refreshEmailTemplates = () => {
    queryClient.invalidateQueries({
      queryKey: ["email-templates"],
    });
  };
  const handleDeleteItem = (item) => {
    if (!canDelete) {
      return;
    }

    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };
  const confirmDeleteItem = async () => {
    if (!selectedItem?.id || deleteLoading) {
      return;
    }

    try {
      setDeleteLoading(true);

      const response = await apiFetch("/api/email-templates", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedItem.id,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to delete email template.");
      }

      setDeleteDialogOpen(false);
      setSelectedItem(null);

      refreshEmailTemplates();
    } catch (error) {
      console.error("Delete Email Template Error:", error);

      window.alert(error.message || "Failed to delete email template.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // =======================================================
  // TOGGLE TEMPLATE STATUS
  // =======================================================

  const handleToggleStatus = async (template) => {
    if (!template?.id) {
      return;
    }

    try {
      const response = await apiFetch("/api/email-templates", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          action: "toggle-status",
          id: template.id,
          disabled: !Boolean(template.disabled),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "Failed to update email template status.",
        );
      }

      refreshEmailTemplates();
    } catch (error) {
      console.error("Toggle Email Template Error:", error);

      window.alert(error.message || "Failed to update email template status.");
    }
  };

  // =======================================================
  // COLUMNS
  // =======================================================

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
          <span className="font-medium">{row.original.id || "-"}</span>
        ),

        size: 280,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "ID",

          skeleton: <Skeleton className="h-7 w-48" />,
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
          <div className="flex flex-col">
            <span className="font-medium">{row.original.name || "-"}</span>

            {row.original.slug && (
              <span className="text-xs text-muted-foreground">
                {row.original.slug}
              </span>
            )}
          </div>
        ),

        size: 300,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Name",

          skeleton: <Skeleton className="h-7 w-40" />,
        },
      },

      // =================================================
      // SUBJECT
      // =================================================

      {
        accessorKey: "subject",

        id: "subject",

        header: ({ column }) => (
          <DataGridColumnHeader title="Subject" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="text-sm">{row.original.subject || "-"}</span>
        ),

        size: 300,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Subject",

          skeleton: <Skeleton className="h-7 w-40" />,
        },
      },

      // =================================================
      // STATUS
      // =================================================

      {
        accessorKey: "disabled",

        id: "disabled",

        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),

        cell: ({ row }) => {
          const disabled = Boolean(row.original.disabled);

          return (
            <span
              className={
                disabled ? "text-sm text-destructive" : "text-sm text-green-600"
              }
            >
              {disabled ? "Disabled" : "Enabled"}
            </span>
          );
        },

        size: 120,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Status",

          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },

      // =================================================
      // CREATED
      // =================================================

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

        size: 180,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Created",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // =================================================
      // UPDATED
      // =================================================

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

        size: 180,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Updated",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      // =================================================
      // ACTIONS
      // =================================================

      {
        id: "actions",

        header: "Actions",

        cell: ({ row }) => {
          const template = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-7 w-7" mode="icon" variant="ghost">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="bottom" align="start">
                {/* PREVIEW */}

                {canView && (
                  <DropdownMenuItem
                    onClick={() => {
                      setViewEmailTemplate(template);

                      setViewDialogOpen(true);
                    }}
                  >
                    <Eye className="me-2 size-4" />
                    Preview
                  </DropdownMenuItem>
                )}

                {/* EDIT */}

                {canEdit && (
                  <DropdownMenuItem
                    onClick={() => {
                      setEditEmailTemplate(template);

                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="me-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                )}

                {/* DELETE */}

                {canDelete && (
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => handleDeleteItem(template)}
                  >
                    <Trash2 className="me-2 size-4" />
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

        meta: {
          skeleton: <Skeleton className="size-5" />,
        },
      },
    ],
    [canView, canManage, canEdit, canDelete],
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
              placeholder="Search email templates"
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

        {canManage && (
          <div className="flex items-center gap-3">
            <Button disabled={isLoading} onClick={() => setAddDialogOpen(true)}>
              <Plus />
              Add Email Template
            </Button>
          </div>
        )}
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
              You do not have permission to view email templates.
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
                ADD EMAIL TEMPLATE
            ================================================= */}

      {addDialogOpen && (
        <EmailTemplateCreate
          onClose={() => setAddDialogOpen(false)}
          onCreated={() => {
            setAddDialogOpen(false);

            refreshEmailTemplates();
          }}
        />
      )}

      {/* =================================================
                PREVIEW EMAIL TEMPLATE
            ================================================= */}

      {viewEmailTemplate && (
        <EmailTemplatePreview
          template={viewEmailTemplate}
          open={viewDialogOpen}
          onClose={() => {
            setViewDialogOpen(false);
            setViewEmailTemplate(null);
          }}
        />
      )}

      {/* =================================================
                EDIT EMAIL TEMPLATE
            ================================================= */}

      {editEmailTemplate && (
        <EmailTemplateUpdate
          open={editDialogOpen}
          template={editEmailTemplate}
          onClose={() => {
            setEditDialogOpen(false);
            setEditEmailTemplate(null);
          }}
          onUpdated={(updatedTemplate) => {
            setEditDialogOpen(false);
            setEditEmailTemplate(null);

            refreshEmailTemplates();
          }}
        />
      )}
      {selectedItem && (
        <EmailTemplateDelete
          open={deleteDialogOpen}
          item={selectedItem}
          loading={deleteLoading}
          closeDialog={() => {
            setDeleteDialogOpen(false);
            setSelectedItem(null);
          }}
          onConfirm={confirmDeleteItem}
        />
      )}
    </>
  );
};

export default EmailTemplateList;