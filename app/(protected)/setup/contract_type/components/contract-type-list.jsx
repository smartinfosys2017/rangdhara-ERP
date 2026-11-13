'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  X, Eye,Pencil, Trash2,
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

import ContractTypeAddDialog from './contract-type-add-dialog';
import ContractTypeEditDialog from './contract-type-edit-dialog';
import ContractTypeDeleteDialog from './contract-type-delete-dialog';
import ContractTypeViewDialog from './contract-type-view-dialog';

import { can } from '@/lib/permissions';

// =======================================================
// PERMISSIONS
// =======================================================

// Replace with:
// const permissions = user?.permissions || [];

const permissions = [
  'contract_type.view',
  'contract_type.manage',
  'contract_type.edit',
  'contract_type.delete',
];

const canView = can(
  'contract_type.view',
  permissions
);

const canManage = can(
  'contract_type.manage',
  permissions
);

const canEdit = can(
  'contract_type.edit',
  permissions
);

const canDelete = can(
  'contract_type.delete',
  permissions
);

// =======================================================
// contract_type LIST
// =======================================================

const ContractTypeList = () => {
  const queryClient = useQueryClient();

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
  // SELECTED contract_type
  // =======================================================

  const [editcontract_type, setEditcontract_type] =
    useState(null);

  const [deletecontract_type, setDeletecontract_type] =
    useState(null);

  const [viewcontract_type, setViewcontract_type] =
    useState(null);

  // =======================================================
  // FETCH contract_typeS
  // =======================================================

  const fetchcontract_types = async ({
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
      `/api/contract_type?${params.toString()}`
    );

    const result =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(
        result?.message ||
          'Failed to fetch contract_types.'
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
      'support-contract_types',
      pagination,
      sorting,
      searchQuery,
    ],

    queryFn: () =>
      fetchcontract_types({
        pageIndex:
          pagination.pageIndex,

        pageSize:
          pagination.pageSize,

        sorting,

        searchQuery,
      }),

    staleTime: 0,

    gcTime: 1000 * 60 * 60,

    refetchOnWindowFocus: false,

    refetchOnReconnect: false,

    retry: 1,
  });

  // =======================================================
  // REFRESH contract_type LIST
  // =======================================================

  const refreshcontract_types = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['support-contract_types'],
    });

    await queryClient.refetchQueries({
      queryKey: ['support-contract_types'],
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
      // contract_type NAME
      // ===================================================

      {
        accessorKey: 'name',

        id: 'name',

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Contract Type"
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
          headerTitle: 'contract_type',

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
                    setViewcontract_type(
                      row.original
                    );

                    setViewDialogOpen(
                      true
                    );
                  }}
                >
                  <Eye className="mr-2 size-4" />
                  View
                </DropdownMenuItem>
              )}

              {/* EDIT */}

              {canEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setEditcontract_type(
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
                    setDeletecontract_type(
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
        {/* SEARCH */}

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search contract types"
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

        {/* ADD contract type */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              disabled={
                isLoading ||
                isFetching
              }
              onClick={() => {
                setEditcontract_type(null);

                setAddDialogOpen(true);
              }}
            >
              <Plus />

              Add Contract Type
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
              to view contract_types.
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
          ADD contract_type
      ================================================= */}

      <ContractTypeAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={async () => {
          setAddDialogOpen(false);

          /*
           * Important:
           * Refresh the same React Query cache
           * used by this table.
           */
          await refreshcontract_types();
        }}
      />

      {/* =================================================
          EDIT contract_type
      ================================================= */}

      {editcontract_type && (
        <ContractTypeEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);
            setEditcontract_type(null);
          }}
          contract_type={editcontract_type}
          onSuccess={async () => {
            setEditDialogOpen(false);
            setEditcontract_type(null);

            await refreshcontract_types();
          }}
        />
      )}

      {/* =================================================
          VIEW contract_type
      ================================================= */}

      {viewcontract_type && (
        <ContractTypeViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);
            setViewcontract_type(null);
          }}
          contract_type={viewcontract_type}
        />
      )}

      {/* =================================================
          DELETE contract_type
      ================================================= */}

      {deletecontract_type && (
        <ContractTypeDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);
            setDeletecontract_type(null);
          }}
          contract_type={deletecontract_type}
          onSuccess={async () => {
            setDeleteDialogOpen(false);
            setDeletecontract_type(null);

            await refreshcontract_types();
          }}
        />
      )}
    </>
  );
};

export default ContractTypeList;