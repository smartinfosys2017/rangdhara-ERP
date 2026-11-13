'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from "next-auth/react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Ellipsis,
  Plus,
  Search,
  X,
} from 'lucide-react';

import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/helpers';

import { Button } from '@/components/ui/button';

import {
  Card,
  CardFooter,
  CardHeader,
  CardTable,
} from '@/components/ui/card';

import { DataGrid } from '@/components/ui/data-grid';
import { DataGridColumnHeader } from '@/components/ui/data-grid-column-header';
import { DataGridPagination } from '@/components/ui/data-grid-pagination';
import { DataGridTable } from '@/components/ui/data-grid-table';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Input } from '@/components/ui/input';

import {
  ScrollArea,
  ScrollBar,
} from '@/components/ui/scroll-area';

import { Skeleton } from '@/components/ui/skeleton';

import StatusesAddDialog from './Statuses-add-dialog';
import StatusesEditDialog from './Statuses-edit-dialog';
import StatusesDeleteDialog from './Statuses-delete-dialog';
import StatusesViewDialog from './Statuses-view-dialog';

import { can } from '@/lib/permissions';

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  'Statuses.view',
  'Statuses.manage',
  'Statuses.edit',
  'Statuses.delete',
];

const canView = can('Statuses.view',permissions);
const canManage = can('Statuses.manage',permissions);
const canEdit = can('Statuses.edit',permissions);
const canDelete = can('Statuses.delete',permissions);

// =======================================================
// STATUSES LIST
// =======================================================

const StatusesList = () => {
  const queryClient = useQueryClient();
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("Statuses.view", userPermissions);
  const canManage = can("Statuses.manage", userPermissions);
  const canEdit = can("Statuses.edit", userPermissions);
  const canDelete = can("Statuses.delete", userPermissions);
  // =======================================================
  // TABLE STATE
  // =======================================================

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState([
    {
      id: 'id',
      desc: true,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  // =======================================================
  // DIALOG STATE
  // =======================================================

  const [addDialogOpen, setAddDialogOpen] =
    useState(false);

  const [editDialogOpen, setEditDialogOpen] =
    useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  const [viewDialogOpen, setViewDialogOpen] =
    useState(false);

  // =======================================================
  // SELECTED STATUS
  // =======================================================

  const [editStatus, setEditStatus] =
    useState(null);

  const [deleteStatus, setDeleteStatus] =
    useState(null);

  const [viewStatus, setViewStatus] =
    useState(null);

  // =======================================================
  // CREATE STATUS NOTIFICATION
  // =======================================================

  const createStatusNotification = async ({
    action,
    title,
    message,
    statusId = null,
    statusName = null,
  }) => {
    try {
      const response = await fetch(
        '/api/notifications',
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            module: 'lead',

            action,

            title,

            message,

            entityId:
              statusId !== null &&
              statusId !== undefined
                ? String(statusId)
                : null,

            entityType: 'status',

            entityName:
              statusName || 'Status',

            url: '/setup/leads/statuses',
          }),

          cache: 'no-store',
        }
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to create status notification.'
        );
      }

      // ===================================================
      // UPDATE NOTIFICATION COUNT / ALERT
      // ===================================================

      if (
        typeof window !== 'undefined' &&
        result.notification
      ) {
        window.dispatchEvent(
          new CustomEvent(
            'notifications-received',
            {
              detail: [
                result.notification,
              ],
            }
          )
        );
      }

      return result;
    } catch (error) {
      console.error(
        '[STATUS NOTIFICATION ERROR]',
        error
      );

      return null;
    }
  };

  // =======================================================
  // FETCH STATUSES
  // =======================================================

  const fetchStatuses = async ({
    pageIndex,
    pageSize,
    sorting,
    searchQuery,
  }) => {
    const sortField =
      sorting?.[0]?.id || 'id';

    const sortDirection =
      sorting?.[0]?.desc
        ? 'desc'
        : 'asc';

    const params = new URLSearchParams({
      page: String(pageIndex + 1),

      limit: String(pageSize),

      sort: sortField,

      dir: sortDirection,
    });

    if (searchQuery) {
      params.set(
        'query',
        searchQuery
      );
    }

    const response = await apiFetch(
      `/api/leads/statuses?${params.toString()}`
    );

    const result =
      await response
        .json()
        .catch(() => ({}));

    if (
      !response.ok ||
      !result.success
    ) {
      throw new Error(
        result?.message ||
          'Failed to fetch statuses.'
      );
    }

    return result;
  };

  // =======================================================
  // REACT QUERY
  // =======================================================

  const {
    data,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      'lead-statuses',

      pagination,

      sorting,

      searchQuery,
    ],

    queryFn: () =>
      fetchStatuses({
        pageIndex:
          pagination.pageIndex,

        pageSize:
          pagination.pageSize,

        sorting,

        searchQuery,
      }),

    staleTime: 0,

    gcTime:
      1000 * 60 * 60,

    refetchOnWindowFocus: false,

    refetchOnReconnect: false,

    retry: 1,
  });

  // =======================================================
  // REFRESH STATUS LIST
  // =======================================================

  const refreshStatuses = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['lead-statuses'],
    });

    await queryClient.refetchQueries({
      queryKey: ['lead-statuses'],
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
        accessorKey: 'id',

        id: 'id',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="ID"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            #{row.original.id}
          </span>
        ),

        size: 100,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: 'ID',

          skeleton: (
            <Skeleton className="h-7 w-12" />
          ),
        },
      },

      // ===================================================
      // STATUS NAME
      // ===================================================

      {
        accessorKey: 'name',

        id: 'name',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Status"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.name || '-'}
          </span>
        ),

        size: 300,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: 'Status',

          skeleton: (
            <Skeleton className="h-7 w-40" />
          ),
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
        id: 'actions',

        header: 'Actions',

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

            <DropdownMenuContent
              side="bottom"
              align="start"
            >
              {/* VIEW */}

              {canView && (
                <DropdownMenuItem
                  onClick={() => {
                    setViewStatus(
                      row.original
                    );

                    setViewDialogOpen(
                      true
                    );
                  }}
                >
                  View Status
                </DropdownMenuItem>
              )}

              {/* EDIT */}

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditStatus(
                      row.original
                    );

                    setEditDialogOpen(
                      true
                    );
                  }}
                >
                  Edit Status
                </DropdownMenuItem>
              )}

              {(canView || canEdit) &&
                canDelete && (
                  <DropdownMenuSeparator />
                )}

              {/* DELETE */}

              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setDeleteStatus(
                      row.original
                    );

                    setDeleteDialogOpen(
                      true
                    );
                  }}
                >
                  Delete Status
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
          skeleton: (
            <Skeleton className="size-5" />
          ),
        },
      },
    ],
    []
  );

  // =======================================================
  // TABLE
  // =======================================================

  const table = useReactTable({
    columns,

    data: data?.data || [],

    pageCount: Math.ceil(
      (data?.pagination?.total || 0) /
        pagination.pageSize
    ),

    getRowId: (row) =>
      String(row.id),

    state: {
      pagination,

      sorting,
    },

    onPaginationChange:
      setPagination,

    onSortingChange:
      setSorting,

    getCoreRowModel:
      getCoreRowModel(),

    getPaginationRowModel:
      getPaginationRowModel(),

    manualPagination: true,

    manualSorting: true,

    manualFiltering: true,
  });

  // =======================================================
  // TOOLBAR
  // =======================================================

  const DataGridToolbar = () => {
    const [
      inputValue,
      setInputValue,
    ] = useState(searchQuery);

    const handleSearch = () => {
      setSearchQuery(
        inputValue.trim()
      );

      setPagination(
        (previous) => ({
          ...previous,

          pageIndex: 0,
        })
      );
    };

    const handleClearSearch = () => {
      setInputValue('');

      setSearchQuery('');

      setPagination(
        (previous) => ({
          ...previous,

          pageIndex: 0,
        })
      );
    };

    return (
      <CardHeader className="py-5">
        {/* SEARCH */}

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search statuses"
              value={inputValue}
              onChange={(event) =>
                setInputValue(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter'
                ) {
                  handleSearch();
                }
              }}
              disabled={
                isLoading ||
                isFetching
              }
              className="w-full ps-9 md:w-64"
            />

            {inputValue.length > 0 && (
              <Button
                type="button"
                mode="icon"
                variant="dim"
                className="absolute end-1.5 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={
                  handleClearSearch
                }
              >
                <X />
              </Button>
            )}
          </div>
        </div>

        {/* ADD STATUS */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              disabled={
                isLoading ||
                isFetching
              }
              onClick={() => {
                setEditStatus(null);

                setAddDialogOpen(true);
              }}
            >
              <Plus />

              Add Status
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
            <h3 className="text-lg font-semibold">
              Access Denied
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission
              to view statuses.
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
        recordCount={
          data?.pagination?.total || 0
        }
        isLoading={
          isLoading || isFetching
        }
        tableLayout={{
          columnsResizable: true,

          columnsPinnable: true,

          columnsMovable: true,

          columnsVisibility: true,
        }}
        tableClassNames={{
          edgeCell: 'px-5',
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
          ADD STATUS
      ================================================= */}

      <StatusesAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={async (createdStatus) => {
          setAddDialogOpen(false);

          await refreshStatuses();

          await createStatusNotification({
            action: 'created',

            title: 'Status Created',

            message:
              createdStatus?.name
                ? `Status "${createdStatus.name}" was created successfully.`
                : 'A new status was created successfully.',

            statusId:
              createdStatus?.id || null,

            statusName:
              createdStatus?.name ||
              'Status',
          });
        }}
      />

      {/* =================================================
          EDIT STATUS
      ================================================= */}

      {editStatus && (
        <StatusesEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);

            setEditStatus(null);
          }}
          Statuses={editStatus}
          onSuccess={async (
            updatedStatus
          ) => {
            const statusForNotification =
              updatedStatus ||
              editStatus;

            setEditDialogOpen(false);

            setEditStatus(null);

            await refreshStatuses();

            await createStatusNotification({
              action: 'updated',

              title: 'Status Updated',

              message:
                statusForNotification?.name
                  ? `Status "${statusForNotification.name}" was updated successfully.`
                  : 'A status was updated successfully.',

              statusId:
                statusForNotification?.id ||
                null,

              statusName:
                statusForNotification?.name ||
                'Status',
            });
          }}
        />
      )}

      {/* =================================================
          VIEW STATUS
      ================================================= */}

      {viewStatus && (
        <StatusesViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);

            setViewStatus(null);
          }}
          Statuses={viewStatus}
        />
      )}

      {/* =================================================
          DELETE STATUS
      ================================================= */}

      {deleteStatus && (
        <StatusesDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);

            setDeleteStatus(null);
          }}
          statuses={deleteStatus}
          onSuccess={async () => {
            const deletedStatus =
              deleteStatus;

            setDeleteDialogOpen(false);

            setDeleteStatus(null);

            await refreshStatuses();

            await createStatusNotification({
              action: 'deleted',

              title: 'Status Deleted',

              message:
                deletedStatus?.name
                  ? `Status "${deletedStatus.name}" was deleted successfully.`
                  : 'A status was deleted successfully.',

              statusId:
                deletedStatus?.id || null,

              statusName:
                deletedStatus?.name ||
                'Status',
            });
          }}
        />
      )}
    </>
  );
};

export default StatusesList;