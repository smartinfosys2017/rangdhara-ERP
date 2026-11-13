"use client";

import { useMemo, useState } from "react";

import {
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    useReactTable,
} from "@tanstack/react-table";

import { Ellipsis, Plus, Search, X } from "lucide-react";

import { formatDate } from "@/lib/helpers";

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

import { Skeleton } from "@/components/ui/skeleton";

import SubscriptionAddDialog from "./subscription-add-dialog";
import SubscriptionEditDialog from "./subscription-edit-dialog";
import SubscriptionViewDialog from "./subscription-view-dialog";
import SubscriptionDeleteDialog from "./subscription-delete-dialog";

// =====================================================
// STATIC DATA
// =====================================================

const STATIC_SUBSCRIPTIONS = [
    {
        id: 1,
        subscriptionName: "Website Maintenance",
        customer: "ABC Company",
        project: "Corporate Website",
        status: "Active",
        nextBillingCycle: "2026-10-01",
        dateSubscribed: "2026-01-15",
        dateLastNotified: "2026-09-01",
    },
    {
        id: 2,
        subscriptionName: "SEO Package",
        customer: "XYZ Pvt Ltd",
        project: "SEO Campaign",
        status: "Pending",
        nextBillingCycle: "2026-10-15",
        dateSubscribed: "2026-03-10",
        dateLastNotified: "2026-08-25",
    },
    {
        id: 3,
        subscriptionName: "Hosting Service",
        customer: "Demo Client",
        project: "Server Hosting",
        status: "Cancelled",
        nextBillingCycle: "2026-09-30",
        dateSubscribed: "2025-12-01",
        dateLastNotified: "2026-07-20",
    },
];

// =====================================================
// COMPONENT
// =====================================================

export default function SubscriptionList() {
    const [data, setData] = useState(STATIC_SUBSCRIPTIONS);

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const [sorting, setSorting] = useState([]);

    const [searchQuery, setSearchQuery] = useState("");

    // Dialog states

    const [addOpen, setAddOpen] = useState(false);

    const [editOpen, setEditOpen] = useState(false);

    const [viewOpen, setViewOpen] = useState(false);

    const [deleteOpen, setDeleteOpen] = useState(false);

    const [selected, setSelected] = useState(null);

    // =====================================================
    // FILTER DATA
    // =====================================================

    const filteredData = useMemo(() => {
        if (!searchQuery) {
            return data;
        }

        return data.filter((item) =>
            Object.values(item)
                .join(" ")
                .toLowerCase()
                .includes(searchQuery.toLowerCase()),
        );
    }, [data, searchQuery]);

    // =====================================================
    // COLUMNS
    // =====================================================

    const columns = useMemo(
        () => [
            {
                accessorKey: "id",

                header: ({ column }) => (
                    <DataGridColumnHeader title="#" column={column} />
                ),

                cell: ({ row }) => <span>#{row.original.id}</span>,

                meta: {
                    skeleton: <Skeleton className="h-7 w-10" />,
                },
            },

            {
                accessorKey: "subscriptionName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Subscription Name"
                        column={column}
                    />
                ),

                cell: ({ row }) => (
                    <span className="font-medium">
                        {row.original.subscriptionName}
                    </span>
                ),
            },

            {
                accessorKey: "customer",

                header: ({ column }) => (
                    <DataGridColumnHeader title="Customer" column={column} />
                ),

                cell: ({ row }) => row.original.customer,
            },

            {
                accessorKey: "project",

                header: ({ column }) => (
                    <DataGridColumnHeader title="Project" column={column} />
                ),

                cell: ({ row }) => row.original.project,
            },

            {
                accessorKey: "status",

                header: ({ column }) => (
                    <DataGridColumnHeader title="Status" column={column} />
                ),

                cell: ({ row }) => (
                    <span className="rounded bg-muted px-2 py-1 text-xs">
                        {row.original.status}
                    </span>
                ),
            },

            {
                accessorKey: "nextBillingCycle",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Next Billing Cycle"
                        column={column}
                    />
                ),

                cell: ({ row }) =>
                    formatDate(new Date(row.original.nextBillingCycle)),
            },

            {
                accessorKey: "dateSubscribed",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Date Subscribed"
                        column={column}
                    />
                ),

                cell: ({ row }) =>
                    formatDate(new Date(row.original.dateSubscribed)),
            },

            {
                accessorKey: "dateLastNotified",

                header: ({ column }) => (
                    <DataGridColumnHeader title="Last Sent" column={column} />
                ),

                cell: ({ row }) =>
                    formatDate(new Date(row.original.dateLastNotified)),
            },

            {
                id: "actions",

                header: "Actions",

                cell: ({ row }) => (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                mode="icon"
                                variant="ghost"
                                className="h-7 w-7"
                            >
                                <Ellipsis />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent>
                            <DropdownMenuItem
                                onClick={() => {
                                    setSelected(row.original);
                                    setViewOpen(true);
                                }}
                            >
                                View Subscription
                            </DropdownMenuItem>

                            <DropdownMenuItem
                                onClick={() => {
                                    setSelected(row.original);
                                    setEditOpen(true);
                                }}
                            >
                                Edit Subscription
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                                variant="destructive"
                                onClick={() => {
                                    setSelected(row.original);
                                    setDeleteOpen(true);
                                }}
                            >
                                Delete Subscription
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                ),
            },
        ],
        [],
    );

    // =====================================================
    // TABLE
    // =====================================================

    const table = useReactTable({
        data: filteredData,

        columns,

        state: {
            pagination,
            sorting,
        },

        onPaginationChange: setPagination,

        onSortingChange: setSorting,

        getCoreRowModel: getCoreRowModel(),

        getFilteredRowModel: getFilteredRowModel(),

        getPaginationRowModel: getPaginationRowModel(),
    });

    return (
        <>
           
            <Card className="mb-2">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 p-4">
                    {[
                        {
                            label: "Not Subscribed",
                            count: data.filter(
                                (item) => item.status === "Not Subscribed",
                            ).length,
                            color: "text-info",
                        },
                        {
                            label: "Active",
                            count: data.filter(
                                (item) => item.status === "Active",
                            ).length,
                            color: "text-success",
                        },
                        {
                            label: "Future",
                            count: data.filter(
                                (item) => item.status === "Future",
                            ).length,
                            color: "text-success",
                        },
                        {
                            label: "Past Due",
                            count: data.filter(
                                (item) => item.status === "Past Due",
                            ).length,
                            color: "text-warning",
                        },
                        {
                            label: "Unpaid",
                            count: data.filter(
                                (item) => item.status === "Unpaid",
                            ).length,
                            color: "text-destructive",
                        },
                        {
                            label: "Incomplete",
                            count: data.filter(
                                (item) => item.status === "Incomplete",
                            ).length,
                            color: "text-warning",
                        },
                        {
                            label: "Canceled",
                            count: data.filter(
                                (item) =>
                                    item.status === "Canceled" ||
                                    item.status === "Cancelled",
                            ).length,
                            color: "text-muted-foreground",
                        },
                        {
                            label: "Incomplete Expired",
                            count: data.filter(
                                (item) => item.status === "Incomplete Expired",
                            ).length,
                            color: "text-muted-foreground",
                        },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="flex items-center px-4 py-3 border border-border rounded-lg bg-background"
                        >
                            <span className="text-lg font-semibold me-3">
                                {stat.count}
                            </span>

                            <span className={`text-sm font-medium ${stat.color}`}>
                                {stat.label}
                            </span>
                        </div>
                    ))}
                </div>
            </Card>

            <DataGrid table={table} recordCount={filteredData.length}>
                <Card>
                    <CardHeader className="py-5">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4" />

                            <Input
                                placeholder="Search subscriptions"
                                className="pl-9 w-64"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />

                            {searchQuery && (
                                <Button
                                    mode="icon"
                                    variant="ghost"
                                    className="absolute right-1 top-1/2 -translate-y-1/2"
                                    onClick={() => setSearchQuery("")}
                                >
                                    <X />
                                </Button>
                            )}
                        </div>

                        <Button onClick={() => setAddOpen(true)}>
                            <Plus />
                            Add Subscription
                        </Button>
                    </CardHeader>

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

            <SubscriptionAddDialog
                open={addOpen}
                closeDialog={() => setAddOpen(false)}
                onSuccess={(item) => {
                    setData([...data, item]);

                    setAddOpen(false);
                }}
            />

            {selected && (
                <SubscriptionEditDialog
                    open={editOpen}
                    subscription={selected}
                    closeDialog={() => setEditOpen(false)}
                    onSuccess={(updated) => {
                        setData(
                            data.map((item) =>
                                item.id === updated.id ? updated : item,
                            ),
                        );

                        setEditOpen(false);
                    }}
                />
            )}

            {selected && (
                <SubscriptionViewDialog
                    open={viewOpen}
                    subscription={selected}
                    closeDialog={() => setViewOpen(false)}
                />
            )}

            {selected && (
                <SubscriptionDeleteDialog
                    open={deleteOpen}
                    subscription={selected}
                    closeDialog={() => setDeleteOpen(false)}
                    onSuccess={() => {
                        setData(data.filter((item) => item.id !== selected.id));

                        setDeleteOpen(false);
                    }}
                />
            )}
        </>
    );
}
