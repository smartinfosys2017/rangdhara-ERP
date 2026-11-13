'use client';

import { useMemo, useState } from 'react';

import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Ellipsis,
  Search,
  X,
} from 'lucide-react';

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

import { can } from '@/lib/permissions';

import PaymentViewDialog from './payments-view-dialog';

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  'payments.view',
  'payments.manage',
  'payments.edit',
  'payments.delete',
];

const canView = can(
  'payments.view',
  permissions
);

const canManage = can(
  'payments.manage',
  permissions
);

const canEdit = can(
  'payments.edit',
  permissions
);

const canDelete = can(
  'payments.delete',
  permissions
);

// =======================================================
// STATIC PAYMENTS DATA
// =======================================================

const STATIC_Payments = [
  {
    id: 3,

    paymentNo: 'PAY-0003',

    invoiceNo: 'INV-0003',

    invoiceDate: '2026-09-11',

    invoiceAmount: 5750,

    paymentAmount: 5750,

    paymentMode: 'Bank Transfer',

    transactionId: 'TXN-8F4K29L',

    paymentMethod: '',

    customer: 'Acme Corporation',

    customerAddress: {
      street: '111 W 7th St',
      cityState: 'Los Angeles CA',
      countryZip: 'GB 90014',
    },

    amount: '$5,750.00',

    date: '2026-09-02',

    note: '',

    currencySymbol: '$',
  },

  {
    id: 2,

    paymentNo: 'PAY-0002',

    invoiceNo: 'INV-0002',

    invoiceDate: '2026-09-10',

    invoiceAmount: 2500,

    paymentAmount: 2500,

    paymentMode: 'Credit Card',

    transactionId: 'TXN-4B7M12P',

    paymentMethod: '',

    customer: 'John Smith',

    customerAddress: {
      street: '',
      cityState: '',
      countryZip: '',
    },

    amount: '$2,500.00',

    date: '2026-09-01',

    note: '',

    currencySymbol: '$',
  },

  {
    id: 1,

    paymentNo: 'PAY-0001',

    invoiceNo: 'INV-0001',

    invoiceDate: '2026-08-28',

    invoiceAmount: 1800,

    paymentAmount: 1800,

    paymentMode: 'Cash',

    transactionId: 'TXN-1A5C73D',

    paymentMethod: '',

    customer: 'Creative Studio',

    customerAddress: {
      street: '',
      cityState: '',
      countryZip: '',
    },

    amount: '$1,800.00',

    date: '2026-08-28',

    note: '',

    currencySymbol: '$',
  },
];

// =======================================================
// PAYMENTS LIST
// =======================================================

const PaymentsList = () => {
  // =======================================================
  // TABLE STATE
  // =======================================================

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState([
    {
      id: 'paymentNo',
      desc: true,
    },
  ]);

  // =======================================================
  // SEARCH STATE
  // =======================================================

  const [searchQuery, setSearchQuery] = useState('');

  // =======================================================
  // VIEW PAYMENT STATE
  // =======================================================

  const [viewDialogOpen, setViewDialogOpen] =
    useState(false);

  const [selectedPayment, setSelectedPayment] =
    useState(null);

  // =======================================================
  // SEARCH DATA
  // =======================================================

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return STATIC_Payments;
    }

    const search =
      searchQuery
        .toLowerCase()
        .trim();

    return STATIC_Payments.filter(
      (payment) =>
        String(payment.id)
          .toLowerCase()
          .includes(search) ||

        payment.paymentNo
          .toLowerCase()
          .includes(search) ||

        payment.invoiceNo
          .toLowerCase()
          .includes(search) ||

        payment.paymentMode
          .toLowerCase()
          .includes(search) ||

        payment.transactionId
          .toLowerCase()
          .includes(search) ||

        payment.customer
          .toLowerCase()
          .includes(search) ||

        payment.amount
          .toLowerCase()
          .includes(search) ||

        payment.date
          .toLowerCase()
          .includes(search)
    );
  }, [searchQuery]);

  // =======================================================
  // VIEW PAYMENT
  // =======================================================

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment);

    setViewDialogOpen(true);
  };

  // =======================================================
  // CLOSE VIEW PAYMENT
  // =======================================================

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);

    setSelectedPayment(null);
  };

  // =======================================================
  // DELETE PAYMENT
  // =======================================================

  const handleDeletePayment = (payment) => {
    if (!canDelete) {
      return;
    }

    const confirmed =
      window.confirm(
        `Are you sure you want to delete payment ${payment.paymentNo}?`
      );

    if (!confirmed) {
      return;
    }

    console.log(
      'Delete payment:',
      payment
    );

    /*
     * Add your API/delete request here.
     *
     * Example:
     *
     * await deletePayment(payment.id);
     */

    if (
      selectedPayment?.id ===
      payment.id
    ) {
      handleCloseViewDialog();
    }
  };

  // =======================================================
  // COLUMNS
  // =======================================================

  const columns = useMemo(
    () => [
      // ===================================================
      // PAYMENT #
      // ===================================================

      {
        accessorKey: 'paymentNo',

        id: 'paymentNo',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Payment #"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <button
            type="button"
            className="font-medium text-primary hover:underline"
            onClick={() =>
              handleViewPayment(
                row.original
              )
            }
          >
            {row.original.paymentNo}
          </button>
        ),

        size: 140,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: 'Payment #',

          skeleton: (
            <Skeleton className="h-7 w-20" />
          ),
        },
      },

      // ===================================================
      // INVOICE #
      // ===================================================

      {
        accessorKey: 'invoiceNo',

        id: 'invoiceNo',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Invoice #"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.invoiceNo}
          </span>
        ),

        size: 140,

        enableSorting: true,

        meta: {
          headerTitle: 'Invoice #',

          skeleton: (
            <Skeleton className="h-7 w-20" />
          ),
        },
      },

      // ===================================================
      // PAYMENT MODE
      // ===================================================

      {
        accessorKey: 'paymentMode',

        id: 'paymentMode',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Payment Mode"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span>
            {row.original.paymentMode ||
              '-'}
          </span>
        ),

        size: 170,

        enableSorting: true,

        meta: {
          headerTitle: 'Payment Mode',

          skeleton: (
            <Skeleton className="h-7 w-32" />
          ),
        },
      },

      // ===================================================
      // TRANSACTION ID
      // ===================================================

      {
        accessorKey: 'transactionId',

        id: 'transactionId',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Transaction ID"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.transactionId ||
              '-'}
          </span>
        ),

        size: 190,

        enableSorting: true,

        meta: {
          headerTitle: 'Transaction ID',

          skeleton: (
            <Skeleton className="h-7 w-36" />
          ),
        },
      },

      // ===================================================
      // CUSTOMER
      // ===================================================

      {
        accessorKey: 'customer',

        id: 'customer',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Customer"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.customer ||
              '-'}
          </span>
        ),

        size: 200,

        enableSorting: true,

        meta: {
          headerTitle: 'Customer',

          skeleton: (
            <Skeleton className="h-7 w-32" />
          ),
        },
      },

      // ===================================================
      // AMOUNT
      // ===================================================

      {
        accessorKey: 'amount',

        id: 'amount',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Amount"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.amount ||
              '$0.00'}
          </span>
        ),

        size: 140,

        enableSorting: true,

        meta: {
          headerTitle: 'Amount',

          skeleton: (
            <Skeleton className="h-7 w-20" />
          ),
        },
      },

      // ===================================================
      // DATE
      // ===================================================

      {
        accessorKey: 'date',

        id: 'date',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Date"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span>
            {row.original.date || '-'}
          </span>
        ),

        size: 140,

        enableSorting: true,

        meta: {
          headerTitle: 'Date',

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
                  onClick={() =>
                    handleViewPayment(
                      row.original
                    )
                  }
                >
                  View payment
                </DropdownMenuItem>
              )}

              {/* SEPARATOR */}

              {(canView || canEdit) &&
                canDelete && (
                  <DropdownMenuSeparator />
                )}

              {/* DELETE */}

              {canDelete && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    handleDeletePayment(
                      row.original
                    )
                  }
                >
                  Delete payment
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ),

        size: 75,

        enableSorting: false,

        enableResizing: false,

        meta: {
          skeleton: (
            <Skeleton className="size-5" />
          ),
        },
      },
    ],
    [
      canView,
      canEdit,
      canDelete,
      selectedPayment,
    ]
  );

  // =======================================================
  // TABLE
  // =======================================================

  const table = useReactTable({
    columns,

    data: filteredData,

    pageCount: Math.ceil(
      filteredData.length /
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

    getSortedRowModel:
      getSortedRowModel(),

    getPaginationRowModel:
      getPaginationRowModel(),

    manualPagination: false,

    manualSorting: false,
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
              placeholder="Search payments..."
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
              to view Payments.
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
          filteredData.length
        }
        isLoading={false}
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

      {/* ===================================================
          PAYMENT VIEW DIALOG
          =================================================== */}

      {selectedPayment && (
        <PaymentViewDialog
          open={viewDialogOpen}
          closeDialog={
            handleCloseViewDialog
          }
          payment={selectedPayment}
          onDelete={
            handleDeletePayment
          }
        />
      )}
    </>
  );
};

export default PaymentsList;