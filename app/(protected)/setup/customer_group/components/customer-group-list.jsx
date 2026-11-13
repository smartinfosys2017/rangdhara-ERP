'use client';

import { useMemo, useState } from 'react';
import { useSession } from "next-auth/react";
import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

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

import CustomerGroupAddDialog from './customer-group-add-dialog';
import CustomerGroupEditDialog from './customer-group-edit-dialog';
import CustomerGroupDeleteDialog from './customer-group-delete-dialog';

import { can } from '@/lib/permissions';

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  'customer_group.view',
  'customer_group.manage',
  'customer_group.edit',
  'customer_group.delete',
];

const canView = can('customer_group.view',permissions);

const canManage = can('customer_group.manage',permissions);

const canEdit = can('customer_group.edit', permissions);

const canDelete = can('customer_group.delete',permissions);

// =======================================================
// CUSTOMER GROUP LIST
// =======================================================

const CustomerGroupList = () => {
  const queryClient = useQueryClient();
   // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();
  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("customer_group.view", userPermissions);
  const canManage = can("customer_group.manage", userPermissions);
  const canEdit = can("customer_group.edit", userPermissions);
  const canDelete = can("customer_group.delete", userPermissions);
  // =====================================================
  // TABLE STATE
  // =====================================================

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

  // =====================================================
  // DIALOG STATE
  // =====================================================

  const [addDialogOpen, setAddDialogOpen] =
    useState(false);

  const [viewDialogOpen, setViewDialogOpen] =
    useState(false);

  const [editDialogOpen, setEditDialogOpen] =
    useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  // =====================================================
  // SELECTED CUSTOMER GROUP
  // =====================================================

  const [viewCustomerGroup, setViewCustomerGroup] =
    useState(null);

  const [editCustomerGroup, setEditCustomerGroup] =
    useState(null);

  const [deleteCustomerGroup, setDeleteCustomerGroup] =
    useState(null);

  // =====================================================
  // FETCH CUSTOMER GROUPS
  // =====================================================

  const fetchCustomerGroups = async ({
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
      `/api/customer_group?${params.toString()}`
    );

    if (!response.ok) {
      const result =
        await response
          .json()
          .catch(() => ({}));

      throw new Error(
        result?.message ||
          'Failed to fetch customer groups.'
      );
    }

    return response.json();
  };

  // =====================================================
  // QUERY
  // =====================================================

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: [
      'customer-groups',
      pagination,
      sorting,
      searchQuery,
    ],

    queryFn: () =>
      fetchCustomerGroups({
        pageIndex:
          pagination.pageIndex,

        pageSize:
          pagination.pageSize,

        sorting,

        searchQuery,
      }),

    staleTime: Infinity,

    gcTime:
      1000 * 60 * 60,

    refetchOnWindowFocus: false,

    refetchOnReconnect: false,

    retry: 1,
  });

  // =====================================================
  // REFRESH
  // =====================================================

  const refreshCustomerGroups = () => {
    queryClient.invalidateQueries({
      queryKey: ['customer-groups'],
    });
  };

  // =====================================================
  // COLUMNS
  // =====================================================

  const columns = useMemo(
    () => [
      // =================================================
      // ID
      // =================================================

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
            {row.original.id || '-'}
          </span>
        ),

        size: 280,

        enableSorting: true,

        enableHiding: false,

        meta: {
          headerTitle: 'ID',

          skeleton: (
            <Skeleton className="h-7 w-48" />
          ),
        },
      },

      // =================================================
      // NAME
      // =================================================

      {
        accessorKey: 'name',

        id: 'name',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Name"
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
          headerTitle: 'Name',

          skeleton: (
            <Skeleton className="h-7 w-40" />
          ),
        },
      },

      // =================================================
      // CREATED
      // =================================================

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

        size: 180,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: 'Created',

          skeleton: (
            <Skeleton className="h-7 w-24" />
          ),
        },
      },

      // =================================================
      // UPDATED
      // =================================================

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

        size: 180,

        enableSorting: true,

        enableHiding: true,

        meta: {
          headerTitle: 'Updated',

          skeleton: (
            <Skeleton className="h-7 w-24" />
          ),
        },
      },

      // =================================================
      // ACTIONS
      // =================================================

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

              {/* EDIT */}

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditCustomerGroup(
                      row.original
                    );

                    setEditDialogOpen(true);
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
                    setDeleteCustomerGroup(
                      row.original
                    );

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
          skeleton: (
            <Skeleton className="size-5" />
          ),
        },
      },
    ],
    []
  );

  // =====================================================
  // TABLE
  // =====================================================

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

  // =====================================================
  // TOOLBAR
  // =====================================================

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
              placeholder="Search customer groups"
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
              disabled={isLoading}
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

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              disabled={isLoading}
              onClick={() =>
                setAddDialogOpen(true)
              }
            >
              <Plus />
              Add Customer Group
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
            <h3 className="text-lg font-semibold">
              Access Denied
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission
              to view customer groups.
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
          ADD CUSTOMER GROUP
      ================================================= */}

      {addDialogOpen && (
        <CustomerGroupAddDialog
          open={addDialogOpen}
          closeDialog={() => {
            setAddDialogOpen(false);
          }}
          onSuccess={() => {
            setAddDialogOpen(false);
            refreshCustomerGroups();
          }}
        />
      )}

      {/* =================================================
          VIEW CUSTOMER GROUP
      ================================================= */}

      {viewCustomerGroup && (
        <CustomerGroupViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);
            setViewCustomerGroup(null);
          }}
          customerGroup={viewCustomerGroup}
        />
      )}

      {/* =================================================
          EDIT CUSTOMER GROUP
      ================================================= */}

      {editCustomerGroup && (
        <CustomerGroupEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);
            setEditCustomerGroup(null);
          }}
          customerGroup={editCustomerGroup}
          onSuccess={() => {
            setEditDialogOpen(false);
            setEditCustomerGroup(null);
            refreshCustomerGroups();
          }}
        />
      )}

      {/* =================================================
          DELETE CUSTOMER GROUP
      ================================================= */}

      {deleteCustomerGroup && (
        <CustomerGroupDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);
            setDeleteCustomerGroup(null);
          }}
          customerGroup={deleteCustomerGroup}
          onSuccess={() => {
            setDeleteDialogOpen(false);
            setDeleteCustomerGroup(null);
            refreshCustomerGroups();
          }}
        />
      )}
    </>
  );
};

export default CustomerGroupList;