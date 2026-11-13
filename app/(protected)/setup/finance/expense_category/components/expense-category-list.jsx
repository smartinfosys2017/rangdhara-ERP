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

import ExpenseCategoryAddDialog from './expense-category-add-dialog';
import ExpenseCategoryEditDialog from './expense-category-edit-dialog';
import ExpenseCategoryDeleteDialog from './expense-category-delete-dialog';
import ExpenseCategoryViewDialog from './expense-category-view-dialog';

import { can } from '@/lib/permissions';

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  'expense_category.view',
  'expense_category.manage',
  'expense_category.edit',
  'expense_category.delete',
];

const canView = can('expense_category.view',permissions);

const canManage = can('expense_category.manage',permissions);

const canEdit = can('expense_category.edit',permissions);

const canDelete = can('expense_category.delete',permissions);

// =======================================================
// EXPENSE CATEGORY NOTIFICATION
// =======================================================

const createExpenseCategoryNotification = async ({
  action,
  title,
  message,
  expenseCategoryId = null,
  expenseCategoryName = null,
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
            expenseCategoryId !== null &&
            expenseCategoryId !== undefined
              ? String(expenseCategoryId)
              : null,

          entityType: 'expense_category',

          entityName:
            expenseCategoryName ||
            'Expense Category',

          url: '/setup/finance/expense_category',
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
          'Failed to create expense category notification.'
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
      '[EXPENSE CATEGORY NOTIFICATION ERROR]',
      error
    );

    return null;
  }
};

// =======================================================
// EXPENSE CATEGORY LIST
// =======================================================

const ExpenseCategoryList = () => {
  const queryClient = useQueryClient();
   // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("expense_category.view", userPermissions);
  const canManage = can("expense_category.manage", userPermissions);
  const canEdit = can("expense_category.edit", userPermissions);
  const canDelete = can("expense_category.delete", userPermissions);
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
  // SELECTED EXPENSE CATEGORY
  // =======================================================

  const [
    editExpenseCategory,
    setEditExpenseCategory,
  ] = useState(null);

  const [
    deleteExpenseCategory,
    setDeleteExpenseCategory,
  ] = useState(null);

  const [
    viewExpenseCategory,
    setViewExpenseCategory,
  ] = useState(null);

  // =======================================================
  // FETCH EXPENSE CATEGORIES
  // =======================================================

  const fetchExpenseCategories = async ({
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
      `/api/finance/expense_category?${params.toString()}`
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
          'Failed to fetch expense categories.'
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
      'finance-expense-categories',
      pagination,
      sorting,
      searchQuery,
    ],

    queryFn: () =>
      fetchExpenseCategories({
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
  // REFRESH EXPENSE CATEGORIES
  // =======================================================

  const refreshExpenseCategories =
    async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          'finance-expense-categories',
        ],
      });

      await queryClient.refetchQueries({
        queryKey: [
          'finance-expense-categories',
        ],
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
      // NAME
      // ===================================================

      {
        accessorKey: 'name',

        id: 'name',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Expense Category"
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
          headerTitle: 'Expense Category',

          skeleton: (
            <Skeleton className="h-7 w-40" />
          ),
        },
      },

      // ===================================================
      // DESCRIPTION
      // ===================================================

      {
        accessorKey: 'description',

        id: 'description',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Description"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.description || '-'}
          </span>
        ),

        size: 350,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: 'Description',

          skeleton: (
            <Skeleton className="h-7 w-52" />
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
                    setViewExpenseCategory(
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
                    setEditExpenseCategory(
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
                    setDeleteExpenseCategory(
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
              placeholder="Search expense categories"
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

        {/* ADD EXPENSE CATEGORY */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              disabled={
                isLoading ||
                isFetching
              }
              onClick={() => {
                setEditExpenseCategory(
                  null
                );

                setAddDialogOpen(true);
              }}
            >
              <Plus />

              Add Expense Category
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
              to view expense categories.
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
          ADD EXPENSE CATEGORY
      ================================================= */}

      <ExpenseCategoryAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={async (
          createdExpenseCategory
        ) => {
          setAddDialogOpen(false);

          await refreshExpenseCategories();

          await createExpenseCategoryNotification({
            action: 'created',

            title:
              'Expense Category Created',

            message:
              createdExpenseCategory?.name
                ? `Expense category "${createdExpenseCategory.name}" was created successfully.`
                : 'A new expense category was created successfully.',

            expenseCategoryId:
              createdExpenseCategory?.id ||
              null,

            expenseCategoryName:
              createdExpenseCategory?.name ||
              'Expense Category',
          });
        }}
      />

      {/* =================================================
          EDIT EXPENSE CATEGORY
      ================================================= */}

      {editExpenseCategory && (
        <ExpenseCategoryEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);
            setEditExpenseCategory(null);
          }}
          expenseCategory={
            editExpenseCategory
          }
          onSuccess={async (
            updatedExpenseCategory
          ) => {
            const expenseCategoryForNotification =
              updatedExpenseCategory ||
              editExpenseCategory;

            setEditDialogOpen(false);
            setEditExpenseCategory(null);

            await refreshExpenseCategories();

            await createExpenseCategoryNotification({
              action: 'updated',

              title:
                'Expense Category Updated',

              message:
                expenseCategoryForNotification?.name
                  ? `Expense category "${expenseCategoryForNotification.name}" was updated successfully.`
                  : 'An expense category was updated successfully.',

              expenseCategoryId:
                expenseCategoryForNotification?.id ||
                null,

              expenseCategoryName:
                expenseCategoryForNotification?.name ||
                'Expense Category',
            });
          }}
        />
      )}

      {/* =================================================
          VIEW EXPENSE CATEGORY
      ================================================= */}

      {viewExpenseCategory && (
        <ExpenseCategoryViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);
            setViewExpenseCategory(null);
          }}
          expenseCategory={
            viewExpenseCategory
          }
        />
      )}

      {/* =================================================
          DELETE EXPENSE CATEGORY
      ================================================= */}

      {deleteExpenseCategory && (
        <ExpenseCategoryDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);
            setDeleteExpenseCategory(null);
          }}
          expenseCategory={
            deleteExpenseCategory
          }
          onSuccess={async () => {
            const deletedExpenseCategory =
              deleteExpenseCategory;

            setDeleteDialogOpen(false);
            setDeleteExpenseCategory(null);

            await refreshExpenseCategories();

            await createExpenseCategoryNotification({
              action: 'deleted',

              title:
                'Expense Category Deleted',

              message:
                deletedExpenseCategory?.name
                  ? `Expense category "${deletedExpenseCategory.name}" was deleted successfully.`
                  : 'An expense category was deleted successfully.',

              expenseCategoryId:
                deletedExpenseCategory?.id ||
                null,

              expenseCategoryName:
                deletedExpenseCategory?.name ||
                'Expense Category',
            });
          }}
        />
      )}
    </>
  );
};

export default ExpenseCategoryList;