'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from "next-auth/react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Ellipsis,
  Plus,
  Search,
  X, Pencil, Trash2, Eye
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

import TaxAddDialog from './tax-add-dialog';
import TaxEditDialog from './tax-edit-dialog';
import TaxDeleteDialog from './tax-delete-dialog';
import TaxViewDialog from './tax-view-dialog';

import { can } from '@/lib/permissions';

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  'tax_rates.view',
  'tax_rates.manage',
  'tax_rates.edit',
  'tax_rates.delete',
];

const canView = can('tax_rates.view', permissions);

const canManage = can('tax_rates.manage', permissions);

const canEdit = can('tax_rates.edit', permissions);

const canDelete = can('tax_rates.delete', permissions);

// =======================================================
// TAX LIST
// =======================================================

const TaxList = () => {
  const queryClient = useQueryClient();
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("tax_rates.view", userPermissions);
  const canManage = can("tax_rates.manage", userPermissions);
  const canEdit = can("tax_rates.edit", userPermissions);
  const canDelete = can("tax_rates.delete", userPermissions);
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
  // SELECTED TAX
  // =======================================================

  const [edittax, setEdittax] =
    useState(null);

  const [deletetax, setDeletetax] =
    useState(null);

  const [viewtax, setViewtax] =
    useState(null);

  // =======================================================
  // CREATE TAX NOTIFICATION
  // =======================================================

  const createTaxNotification = async ({
    action,
    title,
    message,
    taxId = null,
    taxName = null,
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
            module: 'finance',

            action,

            title,

            message,

            entityId:
              taxId !== null &&
                taxId !== undefined
                ? String(taxId)
                : null,

            entityType: 'tax',

            entityName:
              taxName || 'Tax',

            url: '/setup/finance/tax_rates',
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
          'Failed to create tax notification.'
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
        '[TAX NOTIFICATION ERROR]',
        error
      );

      return null;
    }
  };

  // =======================================================
  // FETCH TAXES
  // =======================================================

  const fetchtaxs = async ({
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

      ...(searchQuery
        ? {
          query: searchQuery,
        }
        : {}),
    });

    const response = await apiFetch(
      `/api/finance/tax_rates?${params.toString()}`
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
        'Failed to fetch taxes.'
      );
    }

    return result;
  };

  // =======================================================
  // QUERY
  // =======================================================

  const {
    data,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: [
      'support-taxs',
      pagination,
      sorting,
      searchQuery,
    ],

    queryFn: () =>
      fetchtaxs({
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
  // REFRESH TAX LIST
  // =======================================================

  const refreshtaxs = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['support-taxs'],
    });

    await queryClient.refetchQueries({
      queryKey: ['support-taxs'],
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
      // TAX NAME
      // ===================================================

      {
        accessorKey: 'name',

        id: 'name',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Tax"
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
          headerTitle: 'Tax',

          skeleton: (
            <Skeleton className="h-7 w-40" />
          ),
        },
      },

      // ===================================================
      // TAX RATE
      // ===================================================

      {
        accessorKey: 'taxrate',

        id: 'taxrate',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Tax Rate"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => {
          const taxRate =
            row.original.taxrate;

          return (
            <span className="font-medium">
              {taxRate !== null &&
                taxRate !== undefined
                ? `${taxRate}%`
                : '-'}
            </span>
          );
        },

        size: 150,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: 'Tax Rate',

          skeleton: (
            <Skeleton className="h-7 w-16" />
          ),
        },
      },

      // ===================================================
      // CREATED
      // ===================================================

      {
        accessorKey: 'createdAt',

        id: 'createdAt',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Created"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          row.original.createdAt
            ? formatDate(
              new Date(
                row.original.createdAt
              )
            )
            : '-',

        size: 175,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: 'Created',

          skeleton: (
            <Skeleton className="h-7 w-24" />
          ),
        },
      },

      // ===================================================
      // UPDATED
      // ===================================================

      {
        accessorKey: 'updatedAt',

        id: 'updatedAt',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Updated"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          row.original.updatedAt
            ? formatDate(
              new Date(
                row.original.updatedAt
              )
            )
            : '-',

        size: 175,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: 'Updated',

          skeleton: (
            <Skeleton className="h-7 w-24" />
          ),
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
            <DropdownMenuTrigger
              asChild
            >
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
                    setViewtax(
                      row.original
                    );

                    setViewDialogOpen(
                      true
                    );
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
                    setEdittax(
                      row.original
                    );

                    setEditDialogOpen(
                      true
                    );
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit
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
                    setDeletetax(
                      row.original
                    );

                    setDeleteDialogOpen(
                      true
                    );
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

    getFilteredRowModel:
      getFilteredRowModel(),

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
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search taxes"
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
              className="ps-9 w-full md:w-64"
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

        {/* ADD TAX */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              disabled={
                isLoading ||
                isFetching
              }
              onClick={() => {
                setEdittax(null);

                setAddDialogOpen(true);
              }}
            >
              <Plus />

              Add Tax
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
              to view taxes.
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
        isLoading={isLoading}
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
          ADD TAX
      ================================================= */}

      <TaxAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={async (createdTax) => {
          setAddDialogOpen(false);

          await refreshtaxs();

          await createTaxNotification({
            action: 'created',

            title: 'Tax Created',

            message:
              createdTax?.name
                ? `Tax "${createdTax.name}" was created successfully.`
                : 'A new tax was created successfully.',

            taxId:
              createdTax?.id || null,

            taxName:
              createdTax?.name || 'Tax',
          });
        }}
      />

      {/* =================================================
          EDIT TAX
      ================================================= */}

      {edittax && (
        <TaxEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);

            setEdittax(null);
          }}
          tax={edittax}
          onSuccess={async (
            updatedTax
          ) => {
            const taxForNotification =
              updatedTax || edittax;

            setEditDialogOpen(false);

            setEdittax(null);

            await refreshtaxs();

            await createTaxNotification({
              action: 'updated',

              title: 'Tax Updated',

              message:
                taxForNotification?.name
                  ? `Tax "${taxForNotification.name}" was updated successfully.`
                  : 'A tax was updated successfully.',

              taxId:
                taxForNotification?.id ||
                null,

              taxName:
                taxForNotification?.name ||
                'Tax',
            });
          }}
        />
      )}

      {/* =================================================
          VIEW TAX
      ================================================= */}

      {viewtax && (
        <TaxViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);

            setViewtax(null);
          }}
          tax={viewtax}
        />
      )}

      {/* =================================================
          DELETE TAX
      ================================================= */}

      {deletetax && (
        <TaxDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);

            setDeletetax(null);
          }}
          tax={deletetax}
          onSuccess={async () => {
            const deletedTax =
              deletetax;

            setDeleteDialogOpen(false);

            setDeletetax(null);

            await refreshtaxs();

            await createTaxNotification({
              action: 'deleted',

              title: 'Tax Deleted',

              message:
                deletedTax?.name
                  ? `Tax "${deletedTax.name}" was deleted successfully.`
                  : 'A tax was deleted successfully.',

              taxId:
                deletedTax?.id || null,

              taxName:
                deletedTax?.name ||
                'Tax',
            });
          }}
        />
      )}
    </>
  );
};

export default TaxList;