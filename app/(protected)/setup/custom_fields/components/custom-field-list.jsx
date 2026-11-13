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

import { Ellipsis, Plus, RefreshCw, Search, X, Pencil,Trash2} from "lucide-react";

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

import { can } from "@/lib/permissions";

import CustomFieldAddDialog from "./custom-field-add-dialog";
import CustomFieldEditDialog from "./custom-field-edit-dialog";
import CustomFieldDeleteDialog from "./custom-field-delete-dialog";
import CustomFieldViewDialog from "./custom-field-view-dialog";

/* =========================================================
   FIELD OPTIONS
========================================================= */

const FIELD_TO_OPTIONS = [
  { value: "company", label: "Company" },
  { value: "leads", label: "Leads" },
  { value: "customers", label: "Customers" },
  { value: "tasks", label: "Tasks" },
  { value: "tickets", label: "Tickets" },
  { value: "contacts", label: "Contacts" },
  { value: "staff", label: "Staff" },
  { value: "contracts", label: "Contracts" },
  { value: "expenses", label: "Expenses" },
  { value: "invoice", label: "Invoice" },
  { value: "items", label: "Items" },
  { value: "credit_note", label: "Credit Note" },
  { value: "estimate", label: "Estimate" },
  { value: "proposal", label: "Proposal" },
  { value: "projects", label: "Projects" },
  { value: "transaction", label: "Transaction" },
];

const FIELD_TYPES = [
  { value: "input", label: "Input" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Textarea" },
  { value: "select", label: "Select" },
  { value: "multiselect", label: "Multi Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "date_picker", label: "Date Picker" },
  { value: "date_picker_time", label: "Datetime Picker" },
  { value: "colorpicker", label: "Color Picker" },
  { value: "link", label: "Hyperlink" },
  { value: "file", label: "Attachment" },
];

/* =========================================================
   PERMISSIONS
========================================================= */

const permissions = [
  "custom_fields.view",
  "custom_fields.manage",
  "custom_fields.edit",
  "custom_fields.delete",
];

const canView = can("custom_fields.view", permissions);
const canManage = can("custom_fields.manage", permissions);
const canEdit = can("custom_fields.edit", permissions);
const canDelete = can("custom_fields.delete", permissions);

/* =========================================================
   HELPERS
========================================================= */

function getFieldToLabel(value) {
  const item = FIELD_TO_OPTIONS.find((option) => option.value === value);

  return item?.label || value || "-";
}

function getTypeLabel(value) {
  const item = FIELD_TYPES.find((option) => option.value === value);

  return item?.label || value || "-";
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

const CustomFieldList = () => {
  const queryClient = useQueryClient();
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("custom_fields.view", userPermissions);
  const canManage = can("custom_fields.manage", userPermissions);
  const canEdit = can("custom_fields.edit", userPermissions);
  const canDelete = can("custom_fields.delete", userPermissions);
  /* =======================================================
     NETWORK / DATABASE / SYNC STATE
  ======================================================= */

  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  const [dbStatus, setDbStatus] = useState({
    env: "local",
    online: false,
    loading: true,
  });

  const [checkingDb, setCheckingDb] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const syncingRef = useRef(false);

  /* =======================================================
     TABLE STATE
  ======================================================= */

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

  /* =======================================================
     DIALOG STATE
  ======================================================= */

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedField, setSelectedField] = useState(null);
  const [editField, setEditField] = useState(null);
  const [deleteField, setDeleteField] = useState(null);
  const [viewField, setViewField] = useState(null);

  /* =======================================================
     FETCH CUSTOM FIELDS
  ======================================================= */

  const fetchCustomFields = useCallback(
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

      const response = await apiFetch(
        `/api/custom_fields?${params.toString()}`,
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message || result?.error || "Failed to fetch custom fields.",
        );
      }

      return result;
    },
    [],
  );

  /* =======================================================
     QUERY
  ======================================================= */

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["custom-fields", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchCustomFields({
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

  /* =======================================================
     REFRESH CUSTOM FIELDS
  ======================================================= */

  const refreshCustomFields = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["custom-fields"],
    });

    await queryClient.refetchQueries({
      queryKey: ["custom-fields"],
    });
  }, [queryClient]);

  /* =======================================================
     CHECK DATABASE STATUS
  ======================================================= */

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

  /* =======================================================
     RUN LOCAL <-> LIVE SYNC
  ======================================================= */

  const runSync = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsOnline(false);

      setDbStatus((previous) => ({
        ...previous,
        online: false,
        loading: false,
      }));

      return false;
    }

    if (syncingRef.current) {
      console.log("[CUSTOM FIELD SYNC] Already running");

      return false;
    }

    syncingRef.current = true;
    setSyncing(true);

    try {
      console.log("[CUSTOM FIELD SYNC] Starting...");

      const response = await fetch("/api/sync/export-local", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        cache: "no-store",
      });

      const text = await response.text();

      let result = {};

      if (text) {
        try {
          result = JSON.parse(text);
        } catch (error) {
          console.error("[CUSTOM FIELD SYNC] Invalid JSON:", text);

          throw new Error("Invalid synchronization response.");
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

      console.log("[CUSTOM FIELD SYNC] Completed");

      console.log(
        "[CUSTOM FIELD SYNC] Local → Live:",
        result?.localToLive?.customFields,
      );

      console.log(
        "[CUSTOM FIELD SYNC] Live → Local:",
        result?.liveToLocal?.customFields,
      );

      setDbStatus((previous) => ({
        ...previous,
        online: true,
        loading: false,
      }));

      return true;
    } catch (error) {
      console.error("[CUSTOM FIELD SYNC ERROR]", error);

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setIsOnline(false);

        setDbStatus((previous) => ({
          ...previous,
          online: false,
          loading: false,
        }));
      }

      return false;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  /* =======================================================
     CREATE NOTIFICATION
  ======================================================= */

  const createCustomFieldNotification = useCallback(
    async ({ action, title, message, fieldId = null, fieldName = null }) => {
      try {
        const response = await fetch("/api/notifications", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            module: "custom_field",
            action,
            title,
            message,

            entityId:
              fieldId !== null && fieldId !== undefined
                ? String(fieldId)
                : null,

            entityType: "custom_field",

            entityName: fieldName || null,

            url: "/setup/custom_fields",
          }),

          cache: "no-store",
        });

        const text = await response.text();

        let result = {};

        if (text) {
          try {
            result = JSON.parse(text);
          } catch (error) {
            console.error("[CUSTOM FIELD NOTIFICATION] Invalid JSON:", text);

            throw new Error("Invalid notification response.");
          }
        }

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error ||
              result?.message ||
              "Failed to create notification.",
          );
        }

        console.log(
          "[CUSTOM FIELD NOTIFICATION] Created:",
          result.notification,
        );

        /*
         * Refresh notification list in the
         * current browser tab.
         */
        window.dispatchEvent(
          new CustomEvent("notifications-refresh", {
            detail: result.notification,
          }),
        );

        /*
         * Notify other notification components.
         */
        window.dispatchEvent(
          new CustomEvent("notifications-received", {
            detail: result.notification,
          }),
        );

        return result.notification;
      } catch (error) {
        /*
         * Notification failure must NOT break
         * the successful CRUD operation.
         */
        console.error("[CUSTOM FIELD NOTIFICATION ERROR]", error);

        return null;
      }
    },
    [],
  );

  /* =======================================================
     NOTIFICATION SYNC
  ======================================================= */

  const syncNotifications = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      console.log("[NOTIFICATIONS] Browser offline - skipping sync");

      return false;
    }

    try {
      console.log("[NOTIFICATIONS] Starting notification sync...");

      const response = await fetch("/api/notifications/sync", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        cache: "no-store",
      });

      const text = await response.text();

      let result = {};

      if (text) {
        try {
          result = JSON.parse(text);
        } catch (error) {
          console.error("[NOTIFICATION SYNC] Invalid JSON:", text);

          throw new Error("Invalid notification synchronization response.");
        }
      }

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message ||
            result?.error ||
            `Notification sync failed: ${response.status}`,
        );
      }

      console.log("[NOTIFICATIONS] Sync completed", result);

      window.dispatchEvent(
        new CustomEvent("notifications-synced", {
          detail: result,
        }),
      );

      window.dispatchEvent(
        new CustomEvent("notifications-refresh", {
          detail: result,
        }),
      );

      return true;
    } catch (error) {
      console.error("[NOTIFICATION SYNC ERROR]", error);

      return false;
    }
  }, []);

  /* =======================================================
     SYNC + REFRESH
  ======================================================= */

  const syncAndRefresh = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await refreshCustomFields();

      return false;
    }

    const success = await runSync();

    await refreshCustomFields();

    return success;
  }, [runSync, refreshCustomFields]);

  /* =======================================================
     INITIAL SYNC ON PAGE LOAD
  ======================================================= */

  useEffect(() => {
    const initialSync = async () => {
      console.log("[CUSTOM FIELD SYNC] Page loaded - starting sync...");

      const success = await syncAndRefresh();

      if (success) {
        await syncNotifications();
      }
    };

    initialSync();
  }, [syncAndRefresh, syncNotifications]);

  /* =======================================================
     ONLINE / OFFLINE EVENTS
  ======================================================= */

  useEffect(() => {
    const handleOnline = async () => {
      console.log("[CUSTOM FIELD NETWORK] Online");

      setIsOnline(true);

      await checkDbStatus();

      await syncAndRefresh();

      await syncNotifications();

      console.log("[CUSTOM FIELD NETWORK] Online synchronization completed");
    };

    const handleOffline = () => {
      console.log("[CUSTOM FIELD NETWORK] Offline");

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
  }, [checkDbStatus, syncAndRefresh, syncNotifications]);

  /* =======================================================
     DATABASE STATUS POLLING
  ======================================================= */

  useEffect(() => {
    checkDbStatus();

    const interval = setInterval(() => {
      checkDbStatus();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [checkDbStatus]);

  /* =======================================================
     CREATE SUCCESS
  ======================================================= */

  const handleCreateSuccess = useCallback(
    async (createdField) => {
      /*
       * Dialogs that return the created field
       * are supported.
       */
      const field =
        createdField?.data || createdField?.customField || createdField || {};

      const fieldId = field?.id ?? null;

      const fieldName = field?.name || field?.label || "Custom Field";

      setAddDialogOpen(false);

      /*
       * Refresh application data first.
       */
      await syncAndRefresh();

      /*
       * Create the actual DB notification.
       */
      await createCustomFieldNotification({
        action: "created",

        title: "Custom Field Created",

        message: field?.name
          ? `Custom Field "${field.name}" was created successfully.`
          : "A new Custom Field was created successfully.",

        fieldId,

        fieldName,
      });

      /*
       * Sync pending notifications.
       */
      await syncNotifications();
    },
    [syncAndRefresh, createCustomFieldNotification, syncNotifications],
  );

  /* =======================================================
     UPDATE SUCCESS
  ======================================================= */

  const handleEditSuccess = useCallback(
    async (updatedField) => {
      /*
       * Usually the edit dialog can return
       * the updated field.
       *
       * If it does not, use the field that
       * was opened for editing.
       */
      const field =
        updatedField?.data ||
        updatedField?.customField ||
        updatedField ||
        editField ||
        {};

      const fieldId = field?.id ?? editField?.id ?? null;

      const fieldName = field?.name || editField?.name || "Custom Field";

      setEditDialogOpen(false);

      setEditField(null);

      /*
       * Refresh application data.
       */
      await syncAndRefresh();

      /*
       * Create notification.
       */
      await createCustomFieldNotification({
        action: "updated",

        title: "Custom Field Updated",

        message:
          fieldName !== "Custom Field"
            ? `Custom Field "${fieldName}" was updated successfully.`
            : "A Custom Field was updated successfully.",

        fieldId,

        fieldName,
      });

      /*
       * Sync notification.
       */
      await syncNotifications();
    },
    [
      editField,
      syncAndRefresh,
      createCustomFieldNotification,
      syncNotifications,
    ],
  );

  /* =======================================================
     DELETE SUCCESS
  ======================================================= */

  const handleDeleteSuccess = useCallback(
    async (deletedField) => {
      /*
       * IMPORTANT:
       * The deleted record may no longer exist
       * after the delete request.
       *
       * Therefore we use deleteField as the
       * fallback source for ID/name.
       */
      const field =
        deletedField?.data ||
        deletedField?.customField ||
        deletedField ||
        deleteField ||
        {};

      const fieldId = field?.id ?? deleteField?.id ?? null;

      const fieldName = field?.name || deleteField?.name || "Custom Field";

      setDeleteDialogOpen(false);

      setDeleteField(null);

      /*
       * Refresh application data.
       */
      await syncAndRefresh();

      /*
       * Create notification AFTER successful
       * deletion.
       */
      await createCustomFieldNotification({
        action: "deleted",

        title: "Custom Field Deleted",

        message:
          fieldName !== "Custom Field"
            ? `Custom Field "${fieldName}" was deleted successfully.`
            : "A Custom Field was deleted successfully.",

        fieldId,

        fieldName,
      });

      /*
       * Sync notification.
       */
      await syncNotifications();
    },
    [
      deleteField,
      syncAndRefresh,
      createCustomFieldNotification,
      syncNotifications,
    ],
  );

  /* =======================================================
     TABLE COLUMNS
  ======================================================= */

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",

        id: "id",

        header: ({ column }) => (
          <DataGridColumnHeader title="ID" column={column} visibility />
        ),

        cell: ({ row }) => {
          const id = String(row.original.id || "");

          return (
            <span className="font-mono text-xs" title={id}>
              {id ? `${id.substring(0, 8)}...` : "-"}
            </span>
          );
        },

        size: 150,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "ID",

          skeleton: <Skeleton className="h-7 w-28" />,
        },
      },

      {
        accessorKey: "name",

        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader title="Field Name" column={column} visibility />
        ),

        cell: ({ row }) => (
          <div>
            <span className="font-medium">{row.original.name || "-"}</span>

            {row.original.defaultValue && (
              <div className="mt-1 text-xs text-muted-foreground">
                Default: {row.original.defaultValue}
              </div>
            )}
          </div>
        ),

        size: 250,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Field Name",

          skeleton: <Skeleton className="h-7 w-40" />,
        },
      },

      {
        accessorKey: "slug",

        id: "slug",

        header: ({ column }) => (
          <DataGridColumnHeader title="Slug" column={column} visibility />
        ),

        cell: ({ row }) => (
          <code className="rounded bg-muted px-2 py-1 text-xs">
            {row.original.slug || "-"}
          </code>
        ),

        size: 220,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Slug",

          skeleton: <Skeleton className="h-7 w-32" />,
        },
      },

      {
        accessorKey: "fieldto",

        id: "fieldto",

        header: ({ column }) => (
          <DataGridColumnHeader title="Belongs To" column={column} visibility />
        ),

        cell: ({ row }) => <span>{getFieldToLabel(row.original.fieldto)}</span>,

        size: 180,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Belongs To",

          skeleton: <Skeleton className="h-7 w-28" />,
        },
      },

      {
        accessorKey: "type",

        id: "type",

        header: ({ column }) => (
          <DataGridColumnHeader title="Type" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="rounded-md bg-muted px-2 py-1 text-xs">
            {getTypeLabel(row.original.type)}
          </span>
        ),

        size: 170,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Type",

          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },

      {
        accessorKey: "fieldOrder",

        id: "fieldOrder",

        header: ({ column }) => (
          <DataGridColumnHeader title="Order" column={column} visibility />
        ),

        cell: ({ row }) => <span>{row.original.fieldOrder ?? 0}</span>,

        size: 100,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Order",

          skeleton: <Skeleton className="h-7 w-12" />,
        },
      },

      {
        accessorKey: "required",

        id: "required",

        header: ({ column }) => (
          <DataGridColumnHeader title="Required" column={column} visibility />
        ),

        cell: ({ row }) =>
          row.original.required ? (
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
              Yes
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No</span>
          ),

        size: 110,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Required",

          skeleton: <Skeleton className="h-7 w-12" />,
        },
      },

      {
        accessorKey: "disabled",

        id: "disabled",

        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),

        cell: ({ row }) =>
          row.original.disabled ? (
            <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
              Disabled
            </span>
          ) : (
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700 dark:bg-green-950 dark:text-green-300">
              Active
            </span>
          ),

        size: 120,

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
              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditField({
                      ...row.original,
                      id: String(row.original.id),
                    });

                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
              )}

              {canEdit && canDelete && <DropdownMenuSeparator />}

              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setDeleteField({
                      ...row.original,
                      id: String(row.original.id),
                    });

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

  /* =======================================================
     TABLE
  ======================================================= */

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

  /* =======================================================
     TOOLBAR
  ======================================================= */

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
              placeholder="Search custom fields"
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

          {/* ADD */}

          {canManage && (
            <Button
              disabled={isLoading || isFetching || syncing}
              onClick={() => {
                setEditField(null);

                setAddDialogOpen(true);
              }}
            >
              <Plus />
              Add Custom Field
            </Button>
          )}
        </div>
      </CardHeader>
    );
  };

  /* =======================================================
     ACCESS DENIED
  ======================================================= */

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Access Denied</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view custom fields.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

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

      {/* ===================================================
          ADD
      =================================================== */}

      <CustomFieldAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={handleCreateSuccess}
      />

      {/* ===================================================
          EDIT
      =================================================== */}

      {editField && (
        <CustomFieldEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);

            setEditField(null);
          }}
          field={editField}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* ===================================================
          VIEW
      =================================================== */}

      {viewField && (
        <CustomFieldViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);

            setViewField(null);
          }}
          field={viewField}
        />
      )}

      {/* ===================================================
          DELETE
      =================================================== */}

      {deleteField && (
        <CustomFieldDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          field={deleteField}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </>
  );
};

export default CustomFieldList;
