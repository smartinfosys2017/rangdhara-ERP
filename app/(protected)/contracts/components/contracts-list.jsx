"use client";

import { useMemo, useState } from "react";

import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Eye, Pencil, Plus, Search, Trash2, X } from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { Card, CardFooter, CardHeader, CardTable } from "@/components/ui/card";

import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Input } from "@/components/ui/input";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import ContractAddDialog from "./contracts-add-dialog";
import ContractEditDialog from "./contracts-edit-dialog";
import ContractViewDialog from "./contracts-view-dialog";
import ContractDeleteDialog from "./contracts-delete-dialog";

import { can } from "@/lib/permissions";

// =======================================================
// PERMISSIONS
// =======================================================

const permissions = [
  "Contract.view",
  "Contract.manage",
  "Contract.edit",
  "Contract.delete",
];

const canView = can("Contract.view", permissions);
const canManage = can("Contract.manage", permissions);
const canEdit = can("Contract.edit", permissions);
const canDelete = can("Contract.delete", permissions);

// =======================================================
// STATIC CONTRACT DATA
// =======================================================

const STATIC_Contract = [
  {
    id: 3,
    subject: "Website Development Agreement",
    customer: "Acme Corporation",
    contractType: "Service Agreement",
    contractValue: "$5,750.00",
    startDate: "2026-09-01",
    endDate: "2027-09-01",
    project: "E-Commerce Website",
    signature: "Signed",
  },

  {
    id: 2,
    subject: "SEO Maintenance Contract",
    customer: "XYZ Pvt Ltd",
    contractType: "Monthly Contract",
    contractValue: "$2,500.00",
    startDate: "2026-08-15",
    endDate: "2027-08-15",
    project: "SEO Campaign",
    signature: "Pending",
  },

  {
    id: 1,
    subject: "UI/UX Design Contract",
    customer: "Creative Studio",
    contractType: "Design Agreement",
    contractValue: "$1,800.00",
    startDate: "2026-08-01",
    endDate: "2026-12-31",
    project: "Mobile App Design",
    signature: "Signed",
  },

  {
    id: 4,
    subject: "Hosting Support Agreement",
    customer: "Demo Client",
    contractType: "Support Contract",
    contractValue: "$900.00",
    startDate: "2026-09-05",
    endDate: "2027-09-05",
    project: "Server Hosting",
    signature: "Not Signed",
  },

  {
    id: 5,
    subject: "Digital Marketing Contract",
    customer: "Global Tech",
    contractType: "Marketing Agreement",
    contractValue: "$4,200.00",
    startDate: "2026-10-01",
    endDate: "2027-03-31",
    project: "Marketing Campaign",
    signature: "Signed",
  },
];

// =======================================================
// COMPONENT
// =======================================================

const ContractList = () => {
  // =====================================================
  // TABLE STATE
  // =====================================================

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

  // =====================================================
  // DIALOG STATE
  // =====================================================

  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const [selectedContract, setSelectedContract] = useState(null);

  // =====================================================
  // DELETE STATE
  // =====================================================

  const [deleteLoading, setDeleteLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) {
      return STATIC_Contract;
    }

    const search = searchQuery.toLowerCase().trim();

    return STATIC_Contract.filter(
      (contract) =>
        String(contract.id).includes(search) ||
        contract.subject.toLowerCase().includes(search) ||
        contract.customer.toLowerCase().includes(search) ||
        contract.contractType.toLowerCase().includes(search) ||
        contract.contractValue.toLowerCase().includes(search) ||
        contract.startDate.toLowerCase().includes(search) ||
        contract.endDate.toLowerCase().includes(search) ||
        contract.project.toLowerCase().includes(search) ||
        contract.signature.toLowerCase().includes(search),
    );
  }, [searchQuery]);

  // =====================================================
  // CONTRACT COUNTS
  // =====================================================

  const contractCounts = useMemo(() => {
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const thirtyDaysFromNow = new Date(today);

    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const thirtyDaysAgo = new Date(today);

    thirtyDaysAgo.setDate(today.getDate() - 30);

    // ACTIVE
    const active = STATIC_Contract.filter((contract) => {
      const startDate = new Date(contract.startDate);
      const endDate = new Date(contract.endDate);

      return startDate <= today && endDate >= today;
    }).length;

    // EXPIRED
    const expired = STATIC_Contract.filter((contract) => {
      const endDate = new Date(contract.endDate);

      return endDate < today;
    }).length;

    // ABOUT TO EXPIRE
    const aboutToExpire = STATIC_Contract.filter((contract) => {
      const endDate = new Date(contract.endDate);

      return endDate >= today && endDate <= thirtyDaysFromNow;
    }).length;

    // RECENTLY ADDED
    // Using startDate because the current static data
    // does not have a createdAt field.
    const recentlyAdded = STATIC_Contract.filter((contract) => {
      const startDate = new Date(contract.startDate);

      return startDate >= thirtyDaysAgo && startDate <= today;
    }).length;

    // TRASH
    // Current static data does not have a status field,
    // so this will remain 0 until status is added.
    const trash = STATIC_Contract.filter(
      (contract) => contract.status === "trash",
    ).length;

    return {
      active,
      expired,
      aboutToExpire,
      recentlyAdded,
      trash,
    };
  }, []);

  // =====================================================
  // VIEW
  // =====================================================

  const handleView = (contract) => {
    setSelectedContract(contract);

    setViewDialogOpen(true);
  };

  // =====================================================
  // EDIT
  // =====================================================

  const handleEdit = (contract) => {
    setSelectedContract(contract);

    setEditDialogOpen(true);
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = (contract) => {
    if (!contract?.id) {
      toast.error("Invalid Contract.");
      return;
    }

    setSelectedContract(contract);

    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedContract?.id) {
      toast.error("Invalid Contract.");
      return;
    }

    try {
      setDeleteLoading(true);

      /*
       * Replace this section with your actual DELETE API.
       */

      console.log("Delete Contract:", selectedContract.id);

      /*
      const response = await apiFetch(
        "/api/contracts",
        {
          method: "DELETE",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            id: selectedContract.id,
          }),
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
          "Failed to delete Contract."
        );
      }
      */

      toast.success("Contract deleted successfully.");

      setDeleteDialogOpen(false);

      setSelectedContract(null);
    } catch (error) {
      console.error("DELETE Contract ERROR:", error);

      toast.error(error?.message || "Failed to delete Contract.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // =====================================================
  // COLUMNS
  // =====================================================

  const columns = useMemo(
    () => [
      // =================================================
      // CONTRACT #
      // =================================================

      {
        accessorKey: "id",

        id: "id",

        header: ({ column }) => (
          <DataGridColumnHeader title="#" column={column} visibility />
        ),

        cell: ({ row }) => <span>#{row.original.id}</span>,

        size: 80,
      },

      // =================================================
      // SUBJECT
      // =================================================

      {
        accessorKey: "subject",

        id: "subject",

        header: ({ column }) => (
          <DataGridColumnHeader title="Subject" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.subject}</span>
        ),

        size: 220,
      },

      // =================================================
      // CUSTOMER
      // =================================================

      {
        accessorKey: "customer",

        id: "customer",

        header: ({ column }) => (
          <DataGridColumnHeader title="Customer" column={column} visibility />
        ),

        cell: ({ row }) => row.original.customer,

        size: 180,
      },

      // =================================================
      // CONTRACT TYPE
      // =================================================

      {
        accessorKey: "contractType",

        id: "contractType",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Contract Type"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => row.original.contractType,

        size: 180,
      },

      // =================================================
      // CONTRACT VALUE
      // =================================================

      {
        accessorKey: "contractValue",

        id: "contractValue",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Contract Value"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => row.original.contractValue,

        size: 150,
      },

      // =================================================
      // START DATE
      // =================================================

      {
        accessorKey: "startDate",

        id: "startDate",

        header: ({ column }) => (
          <DataGridColumnHeader title="Start Date" column={column} visibility />
        ),

        cell: ({ row }) => row.original.startDate,

        size: 140,
      },

      // =================================================
      // END DATE
      // =================================================

      {
        accessorKey: "endDate",

        id: "endDate",

        header: ({ column }) => (
          <DataGridColumnHeader title="End Date" column={column} visibility />
        ),

        cell: ({ row }) => row.original.endDate,

        size: 140,
      },

      // =================================================
      // PROJECT
      // =================================================

      {
        accessorKey: "project",

        id: "project",

        header: ({ column }) => (
          <DataGridColumnHeader title="Project" column={column} visibility />
        ),

        cell: ({ row }) => row.original.project,

        size: 200,
      },

      // =================================================
      // SIGNATURE
      // =================================================

      {
        accessorKey: "signature",

        id: "signature",

        header: ({ column }) => (
          <DataGridColumnHeader title="Signature" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="rounded bg-muted px-2 py-1 text-xs">
            {row.original.signature}
          </span>
        ),

        size: 120,
      },

      // =================================================
      // ACTIONS
      // =================================================

      {
        id: "actions",

        header: () => <div className="text-right">Actions</div>,

        cell: ({ row }) => {
          const contract = row.original;

          const hasActions = canView || canEdit || canDelete;

          if (!hasActions) {
            return null;
          }

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    mode="icon"
                    variant="ghost"
                    size="sm"
                    disabled={deleteLoading}
                  >
                    <Ellipsis className="size-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-44">
                  {/* VIEW */}

                  {canView && (
                    <DropdownMenuItem onClick={() => handleView(contract)}>
                      <Eye className="mr-2 size-4" />
                      View
                    </DropdownMenuItem>
                  )}

                  {/* EDIT */}

                  {canEdit && (
                    <DropdownMenuItem onClick={() => handleEdit(contract)}>
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                  )}

                  {canView && (canEdit || canDelete) && (
                    <DropdownMenuSeparator />
                  )}

                  {/* DELETE */}

                  {canDelete && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(contract)}
                    >
                      <Trash2 className="mr-2 size-4" />
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },

        size: 80,
      },
    ],
    [canView, canEdit, canDelete, deleteLoading],
  );

  // =====================================================
  // TABLE
  // =====================================================

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

  // =====================================================
  // TOOLBAR
  // =====================================================

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
              placeholder="Search contract"
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

        {/* ADD CONTRACT */}

        {canManage && (
          <div className="flex items-center gap-3">
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus />
              Add Contract
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
            <h3 className="text-lg font-semibold">Access Denied</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view Contract.
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
      {/* ================================================= */}
      {/* CONTRACT STATUS CARDS */}
      {/* ================================================= */}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        {/* ACTIVE */}

        <div className="bg-white border-neutral-300/80 shadow-sm text-sm border border-solid rounded-lg px-4 py-3 flex items-center">
          <span className="font-semibold mr-1">
            {contractCounts.active}
          </span>

          <span className="text-info">Active</span>
        </div>

        {/* EXPIRED */}

        <div className="bg-white border-neutral-300/80 shadow-sm text-sm border border-solid rounded-lg px-4 py-3 flex items-center">
          <span className="font-semibold mr-1">
            {contractCounts.expired}
          </span>

          <span className="text-danger">Expired</span>
        </div>

        {/* ABOUT TO EXPIRE */}

        <div className="bg-white border-neutral-300/80 shadow-sm text-sm border border-solid rounded-lg px-4 py-3 flex items-center">
          <span className="font-semibold mr-1">
            {contractCounts.aboutToExpire}
          </span>

          <span className="text-warning">About to Expire</span>
        </div>

        {/* RECENTLY ADDED */}

        <div className="bg-white border-neutral-300/80 shadow-sm text-sm border border-solid rounded-lg px-4 py-3 flex items-center">
          <span className="font-semibold mr-1">
            {contractCounts.recentlyAdded}
          </span>

          <span className="text-success">Recently Added</span>
        </div>

        {/* TRASH */}

        <div className="bg-white border-neutral-300/80 shadow-sm text-sm border border-solid rounded-lg px-4 py-3 flex items-center">
          <span className="font-semibold mr-1">
            {contractCounts.trash}
          </span>

          <span className="text-muted-foreground">Trash</span>
        </div>
      </div>

      {/* ================================================= */}
      {/* CONTRACT TABLE */}
      {/* ================================================= */}

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

      {/* ================================================= */}
      {/* ADD */}
      {/* ================================================= */}

      <ContractAddDialog
        open={addDialogOpen}
        closeDialog={() => {
          setAddDialogOpen(false);
        }}
        onSuccess={() => {
          setAddDialogOpen(false);
        }}
      />

      {/* ================================================= */}
      {/* VIEW */}
      {/* ================================================= */}

      <ContractViewDialog
        open={viewDialogOpen}
        closeDialog={() => {
          setViewDialogOpen(false);

          setSelectedContract(null);
        }}
        Contract={selectedContract}
      />

      {/* ================================================= */}
      {/* EDIT */}
      {/* ================================================= */}

      <ContractEditDialog
        open={editDialogOpen}
        closeDialog={() => {
          setEditDialogOpen(false);

          setSelectedContract(null);
        }}
        Contract={selectedContract}
        onSuccess={() => {
          setEditDialogOpen(false);

          setSelectedContract(null);
        }}
      />

      {/* ================================================= */}
      {/* DELETE */}
      {/* ================================================= */}

      <ContractDeleteDialog
        open={deleteDialogOpen}
        closeDialog={() => {
          if (deleteLoading) {
            return;
          }

          setDeleteDialogOpen(false);

          setSelectedContract(null);
        }}
        Contract={selectedContract}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </>
  );
};

export default ContractList;