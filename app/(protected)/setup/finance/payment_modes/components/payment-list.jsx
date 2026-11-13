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

import PaymentAddDialog from './payment-add-dialog';
import PaymentEditDialog from './payment-edit-dialog';
import PaymentDeleteDialog from './payment-delete-dialog';
import PaymentViewDialog from './payment-view-dialog';

import { can } from '@/lib/permissions';

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  'payment_modes.view',
  'payment_modes.manage',
  'payment_modes.edit',
  'payment_modes.delete',
];

const canView = can('payment_modes.view',permissions);

const canManage = can('payment_modes.manage',permissions);

const canEdit = can('payment_modes.edit',permissions);

const canDelete = can('payment_modes.delete',permissions);

// =======================================================
// PAYMENT METHOD NOTIFICATION
// =======================================================

const createPaymentMethodNotification = async ({
  action,
  title,
  message,
  paymentId = null,
  paymentName = null,
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
            paymentId !== null &&
            paymentId !== undefined
              ? String(paymentId)
              : null,

          entityType: 'payment_method',

          entityName:
            paymentName ||
            'Payment Method',

          url: '/setup/finance/payment_modes',
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
          'Failed to create payment method notification.'
      );
    }

    // ===================================================
    // LIVE NOTIFICATION EVENT
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
      '[PAYMENT METHOD NOTIFICATION ERROR]',
      error
    );

    return null;
  }
};

// =======================================================
// PAYMENT METHOD LIST
// =======================================================

const PaymentList = () => {
  const queryClient = useQueryClient();
   // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("payment_modes.view", userPermissions);
  const canManage = can("payment_modes.manage", userPermissions);
  const canEdit = can("payment_modes.edit", userPermissions);
  const canDelete = can("payment_modes.delete", userPermissions);
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

  const [searchQuery, setSearchQuery] =
    useState('');

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
  // SELECTED PAYMENT METHOD
  // =======================================================

  const [editPayment, setEditPayment] =
    useState(null);

  const [deletePayment, setDeletePayment] =
    useState(null);

  const [viewPayment, setViewPayment] =
    useState(null);

  // =======================================================
  // FETCH PAYMENT METHODS
  // =======================================================

  const fetchPaymentMethods = async ({
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
      `/api/finance/payment_modes?${params.toString()}`
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
          'Failed to fetch payment methods.'
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
      'finance-payment-methods',
      pagination,
      sorting,
      searchQuery,
    ],

    queryFn: () =>
      fetchPaymentMethods({
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
  // REFRESH PAYMENT METHODS
  // =======================================================

  const refreshPaymentMethods =
    async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          'finance-payment-methods',
        ],
      });

      await queryClient.refetchQueries({
        queryKey: [
          'finance-payment-methods',
        ],
      });
    };

  // =======================================================
  // BOOLEAN BADGE
  // =======================================================

  const BooleanBadge = ({
    value,
  }) => {
    return (
      <span
        className={
          value
            ? 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-green-100 text-green-700'
            : 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-muted text-muted-foreground'
        }
      >
        {value
          ? 'Yes'
          : 'No'}
      </span>
    );
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
      // PAYMENT METHOD NAME
      // ===================================================

      {
        accessorKey: 'name',

        id: 'name',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Payment Method"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.name || '-'}
          </span>
        ),

        size: 250,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: 'Payment Method',

          skeleton: (
            <Skeleton className="h-7 w-40" />
          ),
        },
      },

      // ===================================================
      // ACTIVE
      // ===================================================

      {
        accessorKey: 'active',

        id: 'active',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Active"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <BooleanBadge
            value={
              row.original.active
            }
          />
        ),

        size: 120,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: 'Active',

          skeleton: (
            <Skeleton className="h-7 w-16" />
          ),
        },
      },

      // ===================================================
      // SHOW ON PDF
      // ===================================================

      {
        accessorKey: 'show_on_pdf',

        id: 'show_on_pdf',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Show on PDF"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <BooleanBadge
            value={
              row.original.show_on_pdf
            }
          />
        ),

        size: 140,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: 'Show on PDF',

          skeleton: (
            <Skeleton className="h-7 w-16" />
          ),
        },
      },

      // ===================================================
      // DEFAULT
      // ===================================================

      {
        accessorKey:
          'selected_by_default',

        id: 'selected_by_default',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Default"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <BooleanBadge
            value={
              row.original
                .selected_by_default
            }
          />
        ),

        size: 120,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: 'Default',

          skeleton: (
            <Skeleton className="h-7 w-16" />
          ),
        },
      },

      // ===================================================
      // INVOICES ONLY
      // ===================================================

      {
        accessorKey: 'invoices_only',

        id: 'invoices_only',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Invoices Only"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <BooleanBadge
            value={
              row.original
                .invoices_only
            }
          />
        ),

        size: 140,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: 'Invoices Only',

          skeleton: (
            <Skeleton className="h-7 w-16" />
          ),
        },
      },

      // ===================================================
      // EXPENSES ONLY
      // ===================================================

      {
        accessorKey: 'expenses_only',

        id: 'expenses_only',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Expenses Only"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <BooleanBadge
            value={
              row.original
                .expenses_only
            }
          />
        ),

        size: 140,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: 'Expenses Only',

          skeleton: (
            <Skeleton className="h-7 w-16" />
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
                    setViewPayment(
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
                    setEditPayment(
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
                    setDeletePayment(
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
              placeholder="Search payment methods"
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

        {/* ADD PAYMENT METHOD */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              disabled={
                isLoading ||
                isFetching
              }
              onClick={() => {
                setEditPayment(null);

                setAddDialogOpen(true);
              }}
            >
              <Plus />

              Add Payment Method
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
              to view payment methods.
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
          ADD PAYMENT METHOD
      ================================================= */}

      <PaymentAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={async (createdPayment) => {
          setAddDialogOpen(false);

          await refreshPaymentMethods();

          await createPaymentMethodNotification({
            action: 'created',

            title: 'Payment Method Created',

            message:
              createdPayment?.name
                ? `Payment method "${createdPayment.name}" was created successfully.`
                : 'A new payment method was created successfully.',

            paymentId:
              createdPayment?.id ||
              null,

            paymentName:
              createdPayment?.name ||
              'Payment Method',
          });
        }}
      />

      {/* =================================================
          EDIT PAYMENT METHOD
      ================================================= */}

      {editPayment && (
        <PaymentEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);
            setEditPayment(null);
          }}
          payment={editPayment}
          onSuccess={async (updatedPayment) => {
            const paymentForNotification =
              updatedPayment ||
              editPayment;

            setEditDialogOpen(false);
            setEditPayment(null);

            await refreshPaymentMethods();

            await createPaymentMethodNotification({
              action: 'updated',

              title: 'Payment Method Updated',

              message:
                paymentForNotification?.name
                  ? `Payment method "${paymentForNotification.name}" was updated successfully.`
                  : 'A payment method was updated successfully.',

              paymentId:
                paymentForNotification?.id ||
                null,

              paymentName:
                paymentForNotification?.name ||
                'Payment Method',
            });
          }}
        />
      )}

      {/* =================================================
          VIEW PAYMENT METHOD
      ================================================= */}

      {viewPayment && (
        <PaymentViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);
            setViewPayment(null);
          }}
          payment={viewPayment}
        />
      )}

      {/* =================================================
          DELETE PAYMENT METHOD
      ================================================= */}

      {deletePayment && (
        <PaymentDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);
            setDeletePayment(null);
          }}
          payment={deletePayment}
          onSuccess={async () => {
            const deletedPayment =
              deletePayment;

            setDeleteDialogOpen(false);
            setDeletePayment(null);

            await refreshPaymentMethods();

            await createPaymentMethodNotification({
              action: 'deleted',

              title: 'Payment Method Deleted',

              message:
                deletedPayment?.name
                  ? `Payment method "${deletedPayment.name}" was deleted successfully.`
                  : 'A payment method was deleted successfully.',

              paymentId:
                deletedPayment?.id ||
                null,

              paymentName:
                deletedPayment?.name ||
                'Payment Method',
            });
          }}
        />
      )}
    </>
  );
};

export default PaymentList;