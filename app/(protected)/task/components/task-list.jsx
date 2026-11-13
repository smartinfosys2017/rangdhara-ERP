'use client';

import { useMemo, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ClipboardList,
  Ellipsis,
  Plus,
  Search,
  X,
} from 'lucide-react';

import { useRouter } from 'next/navigation';

import {
  getCoreRowModel,
  getFilteredRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { apiFetch } from '@/lib/api';
import { formatDate } from '@/lib/helpers';

import { Button } from '@/components/ui/button';

import {
  Card,
  CardFooter,
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

import TaskAddDialog from './task-add-dialog';
import TaskEditDialog from './task-edit-dialog';
import TaskDeleteDialog from './task-delete-dialog';
import TaskViewDialog from './task-view-dialog';

import { can } from '@/lib/permissions';

const permissions = [
  'task.view',
  'task.manage',
  'task.edit',
  'task.delete',
];

export default function TaskList() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const canView = can('task.view', permissions);
  const canManage = can('task.manage', permissions);
  const canEdit = can('task.edit', permissions);
  const canDelete = can('task.delete', permissions);

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
  const [statusFilter, setStatusFilter] = useState('');

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [viewTask, setViewTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);

  const fetchTasks = async ({
    pageIndex,
    pageSize,
    sorting,
    searchQuery,
    statusFilter,
  }) => {
    const sortField = sorting?.[0]?.id || 'id';
    const sortDirection = sorting?.[0]?.desc
      ? 'desc'
      : 'asc';

    const params = new URLSearchParams({
      page: String(pageIndex + 1),
      limit: String(pageSize),
      sort: sortField,
      dir: sortDirection,
    });

    if (searchQuery) {
      params.set('query', searchQuery);
    }

    if (statusFilter) {
      params.set('status', statusFilter);
    }

    const response = await apiFetch(
      `/api/task?${params.toString()}`
    );

    if (!response.ok) {
      const result = await response
        .json()
        .catch(() => ({}));

      throw new Error(
        result?.message || 'Failed to fetch tasks.'
      );
    }

    return response.json();
  };

  const { data, isLoading } = useQuery({
    queryKey: [
      'tasks',
      pagination,
      sorting,
      searchQuery,
      statusFilter,
    ],

    queryFn: () =>
      fetchTasks({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sorting,
        searchQuery,
        statusFilter,
      }),

    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  const refreshTasks = () => {
    queryClient.invalidateQueries({
      queryKey: ['tasks'],
    });
  };

  /*
   * STATUS COUNTS
   *
   * Counts are calculated from the currently loaded
   * table data.
   */
  const taskStatusCards = useMemo(() => {
    const tasks = data?.data || [];

    const statuses = [
      {
        key: 'not_started',
        label: 'Not Started',
        color: '#64748b',
      },
      {
        key: 'in_progress',
        label: 'In Progress',
        color: '#3b82f6',
      },
      {
        key: 'testing',
        label: 'Testing',
        color: '#0284c7',
      },
      {
        key: 'awaiting_feedback',
        label: 'Awaiting Feedback',
        color: '#84cc16',
      },
      {
        key: 'complete',
        label: 'Complete',
        color: '#22c55e',
      },
    ];

    return statuses.map((status) => {
      const count = tasks.filter(
        (task) => task.status === status.key
      ).length;

      return {
        ...status,
        count,
        myTasks: count,
      };
    });
  }, [data]);

  /*
   * TABLE COLUMNS
   *
   * Keep your existing column definitions here.
   */
  const columns = useMemo(
    () => [
      {
        accessorKey: 'id',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="ID"
            column={column}
          />
        ),
        cell: ({ row }) => row.original.id,
      },

      {
        accessorKey: 'name',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Name"
            column={column}
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.name || '-'}
          </span>
        ),
      },

      {
        accessorKey: 'description',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Description"
            column={column}
          />
        ),
        cell: ({ row }) =>
          row.original.description || '-',
      },

      {
        accessorKey: 'status',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Status"
            column={column}
          />
        ),
        cell: ({ row }) =>
          row.original.status || '-',
      },

      {
        accessorKey: 'priority',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Priority"
            column={column}
          />
        ),
        cell: ({ row }) =>
          row.original.priority || '-',
      },

      {
        accessorKey: 'assignedTo',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Assigned To"
            column={column}
          />
        ),
        cell: ({ row }) =>
          row.original.assignedTo || '-',
      },

      {
        accessorKey: 'dueDate',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Due Date"
            column={column}
          />
        ),
        cell: ({ row }) =>
          row.original.dueDate
            ? formatDate(row.original.dueDate)
            : '-',
      },

      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Created"
            column={column}
          />
        ),
        cell: ({ row }) =>
          row.original.createdAt
            ? formatDate(row.original.createdAt)
            : '-',
      },

      {
        accessorKey: 'updatedAt',
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Updated"
            column={column}
          />
        ),
        cell: ({ row }) =>
          row.original.updatedAt
            ? formatDate(row.original.updatedAt)
            : '-',
      },

      {
        id: 'actions',

        header: 'Actions',

        cell: ({ row }) => {
          const task = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                >
                  <Ellipsis className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setViewTask(task);
                    setViewDialogOpen(true);
                  }}
                >
                  View
                </DropdownMenuItem>

                {canEdit && (
                  <DropdownMenuItem
                    onClick={() => {
                      setEditTask(task);
                      setEditDialogOpen(true);
                    }}
                  >
                    Edit
                  </DropdownMenuItem>
                )}

                {canDelete && (
                  <>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setDeleteTask(task);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [canEdit, canDelete]
  );

  const table = useReactTable({
    columns,

    data: data?.data || [],

    pageCount: Math.ceil(
      (data?.pagination?.total || 0) /
        pagination.pageSize
    ),

    getRowId: (row) => String(row.id),

    state: {
      pagination,
      sorting,
    },

    onPaginationChange: setPagination,
    onSortingChange: setSorting,

    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),

    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  if (!canView) {
    return (
      <div className="p-6">
        You do not have permission to view tasks.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ================================================= */}
      {/* STATUS CARDS */}
      {/* ================================================= */}

      <div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          {taskStatusCards.map((status) => {
            const isActive =
              statusFilter === status.key;

            return (
              <button
                key={status.key}
                type="button"
                onClick={() => {
                  setStatusFilter(
                    isActive ? '' : status.key
                  );

                  setPagination((previous) => ({
                    ...previous,
                    pageIndex: 0,
                  }));
                }}
                className={[
                  'rounded-lg',
                  'border',
                  'border-solid',
                  'border-neutral-300/80',
                  'bg-white',
                  'px-3.5',
                  'py-2',
                  'text-left',
                  'text-sm',
                  'shadow-sm',
                  'transition-colors',
                  'hover:bg-neutral-100',
                  isActive
                    ? 'ring-2 ring-primary/30'
                    : '',
                ].join(' ')}
              >
                <span className="mr-1 font-semibold">
                  {status.count}
                </span>

                <span
                  style={{
                    color: status.color,
                  }}
                >
                  {status.label}
                </span>

                <span className="block text-sm text-neutral-800">
                  <span className="text-neutral-500">
                    My Tasks:
                  </span>{' '}
                  {status.myTasks}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================= */}
      {/* TASK TABLE */}
      {/* ================================================= */}

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
          {/* TOOLBAR */}

          <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
            <div className="flex items-center gap-2">
              {/* SEARCH */}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(
                      event.target.value
                    );

                    setPagination(
                      (previous) => ({
                        ...previous,
                        pageIndex: 0,
                      })
                    );
                  }}
                  placeholder="Search tasks..."
                  className="w-[250px] pl-9"
                />

                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* CLEAR STATUS */}

              {statusFilter && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('');

                    setPagination(
                      (previous) => ({
                        ...previous,
                        pageIndex: 0,
                      })
                    );
                  }}
                >
                  Clear Status
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* TASK OVERVIEW */}

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  router.push('/task/overview');
                }}
              >
                <ClipboardList className="mr-2 h-4 w-4" />
                Task Overview
              </Button>

              {/* ADD TASK */}

              {canManage && (
                <Button
                  type="button"
                  onClick={() =>
                    setAddDialogOpen(true)
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              )}
            </div>
          </div>

          {/* TABLE */}

          <CardTable>
            <ScrollArea>
              <DataGridTable />

              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>

          {/* PAGINATION */}

          <CardFooter>
            <DataGridPagination />
          </CardFooter>
        </Card>
      </DataGrid>

      {/* ================================================= */}
      {/* ADD */}
      {/* ================================================= */}

      {addDialogOpen && (
        <TaskAddDialog
          open={addDialogOpen}
          closeDialog={() =>
            setAddDialogOpen(false)
          }
          onSuccess={() => {
            setAddDialogOpen(false);
            refreshTasks();
          }}
        />
      )}

      {/* ================================================= */}
      {/* VIEW */}
      {/* ================================================= */}

      {viewTask && (
        <TaskViewDialog
          open={viewDialogOpen}
          closeDialog={() => {
            setViewDialogOpen(false);
            setViewTask(null);
          }}
          task={viewTask}
        />
      )}

      {/* ================================================= */}
      {/* EDIT */}
      {/* ================================================= */}

      {editTask && (
        <TaskEditDialog
          open={editDialogOpen}
          closeDialog={() => {
            setEditDialogOpen(false);
            setEditTask(null);
          }}
          task={editTask}
          onSuccess={() => {
            setEditDialogOpen(false);
            setEditTask(null);
            refreshTasks();
          }}
        />
      )}

      {/* ================================================= */}
      {/* DELETE */}
      {/* ================================================= */}

      {deleteTask && (
        <TaskDeleteDialog
          open={deleteDialogOpen}
          closeDialog={() => {
            setDeleteDialogOpen(false);
            setDeleteTask(null);
          }}
          task={deleteTask}
          onSuccess={() => {
            setDeleteDialogOpen(false);
            setDeleteTask(null);
            refreshTasks();
          }}
        />
      )}
    </div>
  );
}