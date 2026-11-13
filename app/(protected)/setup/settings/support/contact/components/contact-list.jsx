"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Eye, Plus, Search, X, Pencil,Trash2 } from "lucide-react";

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

import ContactEditDialog from "./contact-edit-dialog";
import ContactDeleteDialog from "./contact-delete-dialog";
import ContactViewDialog from "./contact-view-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

// Replace this with actual logged-in user permissions.
const permissions = [
  "contact.view",
  "contact.manage",
  "contact.edit",
  "contact.delete",
];

const canView = can("contact.view", permissions);

const canManage = can("contact.manage", permissions);

const canEdit = can("contact.edit", permissions);

const canDelete = can("contact.delete", permissions);

// =======================================================
// CONTACT LIST
// =======================================================

const ContactList = () => {
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("contact.view", userPermissions);
  const canManage = can("contact.manage", userPermissions);
  const canEdit = can("contact.edit", userPermissions);
  const canDelete = can("contact.delete", userPermissions);
  // =====================================================
  // TABLE STATE
  // =====================================================

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

  // =====================================================
  // DIALOG STATE
  // =====================================================

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [editContact, setEditContact] = useState(null);

  const [deleteContact, setDeleteContact] = useState(null);

  const [viewContact, setViewContact] = useState(null);

  // =====================================================
  // FETCH CONTACTS
  // =====================================================

  const fetchContacts = async ({
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
      `/api/settings/support/contact?${params.toString()}`,
    );

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));

      throw new Error(result?.message || "Failed to fetch contacts.");
    }

    return response.json();
  };

  // =====================================================
  // QUERY
  // =====================================================

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["support-contacts", pagination, sorting, searchQuery],

    queryFn: () =>
      fetchContacts({
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

  // =====================================================
  // CONTACT REFRESH EVENT
  // =====================================================

  useEffect(() => {
    const handleContactRefresh = () => {
      refetch();
    };

    window.addEventListener("contacts-refresh", handleContactRefresh);

    return () => {
      window.removeEventListener("contacts-refresh", handleContactRefresh);
    };
  }, [refetch]);

  // =====================================================
  // CREATE CONTACT NOTIFICATION
  // =====================================================

  const createContactNotification = useCallback(
    async ({
      action,
      title,
      message,
      contactId = null,
      contactName = null,
    }) => {
      try {
        console.log("[CONTACT NOTIFICATION] Creating:", {
          action,
          title,
          message,
          contactId,
          contactName,
        });

        const response = await fetch("/api/notifications", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            module: "contact",

            action,

            title,

            message,

            entityId:
              contactId !== null && contactId !== undefined
                ? String(contactId)
                : null,

            entityType: "contact",

            entityName: contactName || null,

            url: "/setup/settings/support/contact",
          }),

          cache: "no-store",
        });

        const text = await response.text();

        let result = {};

        if (text) {
          try {
            result = JSON.parse(text);
          } catch (error) {
            console.error("[CONTACT NOTIFICATION] Invalid JSON:", text);

            throw new Error("Invalid notification response.");
          }
        }

        console.log(
          "[CONTACT NOTIFICATION] API response:",
          response.status,
          result,
        );

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.error ||
              result?.message ||
              "Failed to create notification.",
          );
        }

        console.log("[CONTACT NOTIFICATION] Created:", result.notification);

        // Refresh notification list
        window.dispatchEvent(
          new CustomEvent("notifications-refresh", {
            detail: result.notification,
          }),
        );

        // Send notification to
        // online notification listener
        window.dispatchEvent(
          new CustomEvent("notifications-received", {
            detail: result.notification,
          }),
        );

        return result.notification;
      } catch (error) {
        console.error("[CONTACT NOTIFICATION ERROR]", error);

        return null;
      }
    },
    [],
  );

  // =====================================================
  // COLUMNS
  // =====================================================

  const columns = useMemo(
    () => [
      // -------------------------------------------------
      // ID
      // -------------------------------------------------

      {
        accessorKey: "id",

        id: "id",

        header: ({ column }) => (
          <DataGridColumnHeader title="ID" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">#{row.original.id}</span>
        ),

        size: 90,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "ID",

          skeleton: <Skeleton className="h-7 w-12" />,
        },
      },

      // -------------------------------------------------
      // CONTACT NAME
      // -------------------------------------------------

      {
        accessorKey: "name",

        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Contact Name"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "-"}</span>
        ),

        size: 250,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: "Contact Name",

          skeleton: <Skeleton className="h-7 w-40" />,
        },
      },

      // -------------------------------------------------
      // EMAIL
      // -------------------------------------------------

      {
        accessorKey: "email",

        id: "email",

        header: ({ column }) => (
          <DataGridColumnHeader title="Email" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.email || "-"}
          </span>
        ),

        size: 275,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Email",

          skeleton: <Skeleton className="h-7 w-52" />,
        },
      },

      // -------------------------------------------------
      // PHONE
      // -------------------------------------------------

      {
        accessorKey: "phone",

        id: "phone",

        header: ({ column }) => (
          <DataGridColumnHeader title="Phone" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.phone || "-"}
          </span>
        ),

        size: 180,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: "Phone",

          skeleton: <Skeleton className="h-7 w-32" />,
        },
      },

      // -------------------------------------------------
      // CREATED
      // -------------------------------------------------

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

      // -------------------------------------------------
      // UPDATED
      // -------------------------------------------------

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

      // -------------------------------------------------
      // ACTIONS
      // -------------------------------------------------

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
                    setViewContact(row.original);

                    setViewDialogOpen(true);
                  }}
                >
                  <Eye className="size-4" />
                  View
                </DropdownMenuItem>
              )}

              {/* EDIT */}

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditContact(row.original);

                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
              )}

              {/* DELETE */}

              {canDelete && (
                <>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      setDeleteContact(row.original);

                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Delete
                  </DropdownMenuItem>
                </>
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
              placeholder="Search contacts"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
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
            <Button
              disabled={isLoading}
              onClick={() => {
                setEditContact(null);

                setEditDialogOpen(true);
              }}
            >
              <Plus />
              Add Contact
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
              You do not have permission to view contacts.
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
          ADD / EDIT DIALOG
      ================================================= */}

      <ContactEditDialog
        open={editDialogOpen}
        closeDialog={() => setEditDialogOpen(false)}
        contact={editContact}
        onSuccess={async (savedContact) => {
          const isEdit = !!editContact;

          const contactName =
            savedContact?.name || editContact?.name || "Contact";

          const contactId = savedContact?.id || editContact?.id || null;

          await createContactNotification({
            action: isEdit ? "updated" : "created",

            title: isEdit ? "Contact Updated" : "Contact Created",

            message: isEdit
              ? `${contactName} has been updated.`
              : `${contactName} has been created.`,

            contactId,

            contactName,
          });

          window.dispatchEvent(new CustomEvent("contacts-refresh"));
        }}
      />

      {/* =================================================
          VIEW DIALOG
      ================================================= */}

      {viewContact && (
        <ContactViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);

            setViewContact(null);
          }}
          contact={viewContact}
        />
      )}

      {/* =================================================
          DELETE DIALOG
      ================================================= */}

      {deleteContact && (
        <ContactDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);
            setDeleteContact(null);
          }}
          contact={deleteContact}
          onSuccess={async (deletedContact) => {
            console.log(
              "[CONTACT LIST] Delete notification callback:",
              deletedContact,
            );

            const contactName =
              deletedContact?.name || deleteContact?.name || "Contact";

            const contactId = deletedContact?.id || deleteContact?.id || null;

            await createContactNotification({
              action: "deleted",
              title: "Contact Deleted",
              message: `${contactName} has been deleted.`,
              contactId,
              contactName,
            });

            window.dispatchEvent(new CustomEvent("contacts-refresh"));
          }}
        />
      )}
    </>
  );
};

export default ContactList;
