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
  X, Pencil,Trash2, Eye
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

import CurrencyAddDialog from './currency-add-dialog';
import CurrencyEditDialog from './currency-edit-dialog';
import CurrencyDeleteDialog from './currency-delete-dialog';
import CurrencyViewDialog from './currency-view-dialog';

import { can } from '@/lib/permissions';

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  'currency.view',
  'currency.manage',
  'currency.edit',
  'currency.delete',
];

const canView = can('currency.view',permissions);

const canManage = can('currency.manage',permissions);

const canEdit = can('currency.edit',permissions);

const canDelete = can('currency.delete',permissions);

// =======================================================
// CURRENCY LIST
// =======================================================

const CurrencyList = () => {
  const queryClient = useQueryClient();
   // =======================================================
    // USER SESSION / PERMISSIONS
    // =======================================================
  
    const { data: session, status: sessionStatus } = useSession();
    const userPermissions = useMemo(() => {
      return session?.user?.permissions || [];
    }, [session]);
  
    const canView = can("currency.view", userPermissions);
    const canManage = can("currency.manage", userPermissions);
    const canEdit = can("currency.edit", userPermissions);
    const canDelete = can("currency.delete", userPermissions);
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
  // SELECTED CURRENCY
  // =======================================================

  const [editCurrency, setEditCurrency] =
    useState(null);

  const [deleteCurrency, setDeleteCurrency] =
    useState(null);

  const [viewCurrency, setViewCurrency] =
    useState(null);

  // =======================================================
  // CREATE CURRENCY NOTIFICATION
  // =======================================================

  const createCurrencyNotification = async ({
    action,
    title,
    message,
    currencyId = null,
    currencyName = null,
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
              currencyId !== null &&
              currencyId !== undefined
                ? String(currencyId)
                : null,

            entityType: 'currency',

            entityName:
              currencyName || 'Currency',

            url: '/setup/finance/currency',
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
            'Failed to create currency notification.'
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
        '[CURRENCY NOTIFICATION ERROR]',
        error
      );

      return null;
    }
  };

  // =======================================================
  // FETCH CURRENCIES
  // =======================================================

  const fetchCurrencies = async ({
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
      `/api/finance/currencies?${params.toString()}`
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
          'Failed to fetch currencies.'
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
      'lead-currency',
      pagination,
      sorting,
      searchQuery,
    ],

    queryFn: () =>
      fetchCurrencies({
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
  // REFRESH CURRENCY LIST
  // =======================================================

  const refreshCurrencies = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['lead-currency'],
    });

    await queryClient.refetchQueries({
      queryKey: ['lead-currency'],
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

        size: 90,

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
      // CURRENCY CODE
      // ===================================================

      {
        accessorKey: 'name',

        id: 'name',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Currency Code"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium uppercase">
            {row.original.name || '-'}
          </span>
        ),

        size: 180,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: 'Currency Code',

          skeleton: (
            <Skeleton className="h-7 w-24" />
          ),
        },
      },

      // ===================================================
      // SYMBOL
      // ===================================================

      {
        accessorKey: 'symbol',

        id: 'symbol',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Symbol"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.symbol || '-'}
          </span>
        ),

        size: 120,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: 'Symbol',

          skeleton: (
            <Skeleton className="h-7 w-12" />
          ),
        },
      },

      // ===================================================
      // DECIMAL SEPARATOR
      // ===================================================

      {
        accessorKey: 'decimalSeparator',

        id: 'decimalSeparator',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Decimal Separator"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.decimal_separator === ''
              ? 'None'
              : row.original.decimal_separator || '-'}
          </span>
        ),

        size: 180,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: 'Decimal Separator',

          skeleton: (
            <Skeleton className="h-7 w-24" />
          ),
        },
      },

      // ===================================================
      // THOUSAND SEPARATOR
      // ===================================================

      {
        accessorKey: 'thousandSeparator',

        id: 'thousandSeparator',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Thousand Separator"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.thousand_separator === ''
              ? 'None'
              : row.original.thousand_separator === ' '
                ? 'Space'
                : row.original.thousand_separator || '-'}
          </span>
        ),

        size: 190,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: 'Thousand Separator',

          skeleton: (
            <Skeleton className="h-7 w-28" />
          ),
        },
      },

      // ===================================================
      // PLACEMENT
      // ===================================================

      {
        accessorKey: 'placement',

        id: 'placement',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Currency Placement"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => {
          const placement =
            row.original.placement;

          if (!placement) {
            return '-';
          }

          return (
            <span className="font-medium capitalize">
              {placement === 'before'
                ? 'Before Amount'
                : placement === 'after'
                  ? 'After Amount'
                  : placement}
            </span>
          );
        },

        size: 190,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: 'Currency Placement',

          skeleton: (
            <Skeleton className="h-7 w-32" />
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
                    setViewCurrency(
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
                    setEditCurrency(
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
                    setDeleteCurrency(
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
              placeholder="Search currencies"
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

        {/* ADD CURRENCY */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              disabled={
                isLoading ||
                isFetching
              }
              onClick={() => {
                setEditCurrency(null);

                setAddDialogOpen(true);
              }}
            >
              <Plus />

              Add Currency
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
              to view currencies.
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
          ADD CURRENCY
      ================================================= */}

      <CurrencyAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={async (createdCurrency) => {
          setAddDialogOpen(false);

          await refreshCurrencies();

          await createCurrencyNotification({
            action: 'created',

            title: 'Currency Created',

            message:
              createdCurrency?.name
                ? `Currency "${createdCurrency.name}" was created successfully.`
                : 'A new currency was created successfully.',

            currencyId:
              createdCurrency?.id || null,

            currencyName:
              createdCurrency?.name ||
              'Currency',
          });
        }}
      />

      {/* =================================================
          EDIT CURRENCY
      ================================================= */}

      {editCurrency && (
        <CurrencyEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);

            setEditCurrency(null);
          }}
          currency={editCurrency}
          onSuccess={async (
            updatedCurrency
          ) => {
            const currencyForNotification =
              updatedCurrency ||
              editCurrency;

            setEditDialogOpen(false);

            setEditCurrency(null);

            await refreshCurrencies();

            await createCurrencyNotification({
              action: 'updated',

              title: 'Currency Updated',

              message:
                currencyForNotification?.name
                  ? `Currency "${currencyForNotification.name}" was updated successfully.`
                  : 'A currency was updated successfully.',

              currencyId:
                currencyForNotification?.id ||
                null,

              currencyName:
                currencyForNotification?.name ||
                'Currency',
            });
          }}
        />
      )}

      {/* =================================================
          VIEW CURRENCY
      ================================================= */}

      {viewCurrency && (
        <CurrencyViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);

            setViewCurrency(null);
          }}
          currency={viewCurrency}
        />
      )}

      {/* =================================================
          DELETE CURRENCY
      ================================================= */}

      {deleteCurrency && (
        <CurrencyDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);

            setDeleteCurrency(null);
          }}
          currency={deleteCurrency}
          onSuccess={async () => {
            const deletedCurrency =
              deleteCurrency;

            setDeleteDialogOpen(false);

            setDeleteCurrency(null);

            await refreshCurrencies();

            await createCurrencyNotification({
              action: 'deleted',

              title: 'Currency Deleted',

              message:
                deletedCurrency?.name
                  ? `Currency "${deletedCurrency.name}" was deleted successfully.`
                  : 'A currency was deleted successfully.',

              currencyId:
                deletedCurrency?.id ||
                null,

              currencyName:
                deletedCurrency?.name ||
                'Currency',
            });
          }}
        />
      )}
    </>
  );
};

export default CurrencyList;