"use client";

import { useMemo, useState } from "react";

import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Plus, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { Card, CardFooter, CardHeader, CardTable } from "@/components/ui/card";

import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { useRouter } from 'next/navigation';
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

import ProjectAddDialog from "./project-add-dialog";
import ProjectEditDialog from "./project-edit-dialog";
import ProjectViewDialog from "./project-view-dialog";
import ProjectDeleteDialog from "./project-delete-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "Project.view",
  "Project.manage",
  "Project.edit",
  "Project.delete",
];

const canView = can("Project.view", permissions);

const canManage = can("Project.manage", permissions);

const canEdit = can("Project.edit", permissions);

const canDelete = can("Project.delete", permissions);

// =======================================================
// STATIC PROJECT DATA
// =======================================================

const STATIC_Project = [
  {
    id: 1,
    projectName: "Website Development",
    customer: "Acme Corporation",
    tags: "Web, Development, React",
    startDate: "2026-09-01",
    deadline: "2027-01-15",
    members: "John, David, Sarah",
    status: "Accepted",
  },

  {
    id: 2,
    projectName: "SEO Optimization",
    customer: "XYZ Pvt Ltd",
    tags: "SEO, Marketing",
    startDate: "2026-08-15",
    deadline: "2026-12-30",
    members: "Alex, Mike",
    status: "Open",
  },

  {
    id: 3,
    projectName: "Mobile App Design",
    customer: "Creative Studio",
    tags: "UI/UX, Figma",
    startDate: "2026-08-01",
    deadline: "2026-11-30",
    members: "Emma, Robert",
    status: "Sent",
  },

  {
    id: 4,
    projectName: "Server Migration",
    customer: "Demo Client",
    tags: "Hosting, Server",
    startDate: "2026-09-05",
    deadline: "2026-10-25",
    members: "Chris, Daniel",
    status: "Revised",
  },

  {
    id: 5,
    projectName: "Digital Marketing Campaign",
    customer: "Global Tech",
    tags: "Google Ads, Social Media",
    startDate: "2026-10-01",
    deadline: "2027-03-31",
    members: "James, Olivia",
    status: "Draft",
  },
];

// =======================================================
// STATUS BADGE
// =======================================================

const StatusBadge = ({ status }) => {
  const statusClasses = {
    Draft: "bg-muted text-muted-foreground",

    Sent: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",

    Open: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",

    Revised:
      "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",

    Declined: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",

    Accepted:
      "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",

    Expired:
      "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  };

  return (
    <span
      className={`inline-flex rounded-md px-2.5 py-1 text-xs font-medium ${
        statusClasses[status] || "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
};

// =======================================================
// Project LIST
// =======================================================

const ProjectList = () => {
  // =======================================================
  // TABLE STATE
  // =======================================================

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

  // =======================================================
  // DIALOG STATE
  // =======================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedProject, setSelectedProject] = useState(null);
  // =======================================================
  // SEARCH DATA
  // =======================================================

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return STATIC_Project;
    }

    const search = searchQuery.toLowerCase().trim();

    return STATIC_Project.filter(
      (project) =>
        String(project.id).includes(search) ||
        project.projectName.toLowerCase().includes(search) ||
        project.customer.toLowerCase().includes(search) ||
        project.tags.toLowerCase().includes(search) ||
        project.startDate.toLowerCase().includes(search) ||
        project.deadline.toLowerCase().includes(search) ||
        project.members.toLowerCase().includes(search) ||
        project.status.toLowerCase().includes(search),
    );
  }, [searchQuery]);
  const router = useRouter();
  // =======================================================
  // COLUMNS
  // =======================================================

  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        id: "id",

        header: ({ column }) => (
          <DataGridColumnHeader title="#" column={column} visibility />
        ),

        cell: ({ row }) => <span>#{row.original.id}</span>,

        size: 80,
      },

      {
        accessorKey: "projectName",
        id: "projectName",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Project Name"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.projectName}</span>
        ),

        size: 220,
      },

      {
        accessorKey: "customer",
        id: "customer",

        header: ({ column }) => (
          <DataGridColumnHeader title="Customer" column={column} visibility />
        ),

        cell: ({ row }) => row.original.customer,

        size: 180,
      },

      {
        accessorKey: "tags",
        id: "tags",

        header: ({ column }) => (
          <DataGridColumnHeader title="Tags" column={column} visibility />
        ),

        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.tags.split(",").map((tag, index) => (
              <span key={index} className="rounded bg-muted px-2 py-1 text-xs">
                {tag.trim()}
              </span>
            ))}
          </div>
        ),

        size: 200,
      },

      {
        accessorKey: "startDate",
        id: "startDate",

        header: ({ column }) => (
          <DataGridColumnHeader title="Start Date" column={column} visibility />
        ),

        cell: ({ row }) => row.original.startDate,

        size: 140,
      },

      {
        accessorKey: "deadline",
        id: "deadline",

        header: ({ column }) => (
          <DataGridColumnHeader title="Deadline" column={column} visibility />
        ),

        cell: ({ row }) => row.original.deadline,

        size: 140,
      },

      {
        accessorKey: "members",
        id: "members",

        header: ({ column }) => (
          <DataGridColumnHeader title="Members" column={column} visibility />
        ),

        cell: ({ row }) => row.original.members,

        size: 200,
      },

      {
        accessorKey: "status",
        id: "status",

        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),

        cell: ({ row }) => <StatusBadge status={row.original.status} />,

        size: 120,
      },
      {
        id: "actions",

        header: "Actions",

        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                mode="icon"
                variant="ghost"
                className="h-7 w-7"
              >
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {/* <DropdownMenuItem
                onSelect={() => {
                  setSelectedProject(row.original);

                  setViewDialogOpen(true);
                }}
              >
                View Project
              </DropdownMenuItem> */}
              <Button  variant="ghost"  size="sm" onClick={() => router.push(`/project/${row.original.id}`)} > View </Button>

              <DropdownMenuItem
                onSelect={() => {
                  setSelectedProject(row.original);

                  setEditDialogOpen(true);
                }}
              >
                Edit Project
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive"

                onSelect={() => {
                  setSelectedProject(row.original);

                  setDeleteDialogOpen(true);
                }}
              >
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  // =======================================================
  // TABLE
  // =======================================================

  const table = useReactTable({
    columns,

    data: filteredData,

    pageCount: Math.ceil(filteredData.length / pagination.pageSize),

    getRowId: (row) => String(row.id),

    state: {
      pagination,
      sorting,
    },

    onPaginationChange: setPagination,

    onSortingChange: setSorting,

    getCoreRowModel: getCoreRowModel(),

    getSortedRowModel: getSortedRowModel(),

    getPaginationRowModel: getPaginationRowModel(),

    manualPagination: false,

    manualSorting: false,
  });

  // =======================================================
  // TOOLBAR
  // =======================================================

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
        {/* SEARCH */}

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              placeholder="Search project"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
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
                onClick={handleClearSearch}
              >
                <X />
              </Button>
            )}
          </div>
        </div>

        {/* ADD Project */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setAddDialogOpen(true);
              }}
            >
              <Plus />
              Add Project
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
            <h3 className="text-lg font-semibold">Access Denied</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view Project.
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
        recordCount={filteredData.length}
        isLoading={false}
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

      {/*   ADD Project */}

      <ProjectAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={() => {
          setAddDialogOpen(false);
        }}
      />
      <ProjectEditDialog
        open={editDialogOpen}

        project={selectedProject}

        closeDialog={() => {
          setEditDialogOpen(false);

          setSelectedProject(null);
        }}

        onSuccess={(updatedProject) => {
          console.log("Updated Project", updatedProject);

          setEditDialogOpen(false);
        }}
      />

      <ProjectViewDialog
        open={viewDialogOpen}

        project={selectedProject}

        closeDialog={() => {
          setViewDialogOpen(false);

          setSelectedProject(null);
        }}
      />

      <ProjectDeleteDialog
        open={deleteDialogOpen}

        project={selectedProject}

        closeDialog={() => {
          setDeleteDialogOpen(false);

          setSelectedProject(null);
        }}

        onSuccess={() => {
          console.log("Deleted", selectedProject);

          setDeleteDialogOpen(false);
        }}
      />
    </>
  );
};

export default ProjectList;
