
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import * as XLSX from "xlsx";
import {
    CheckCircle,
    Ellipsis,
    Eye,
    Funnel,
    Info,
    Plus,
    RefreshCw,
    Search,
    Pencil,
    Trash2,
    X,
    XCircle,
    FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Checkbox } from "@/components/ui/checkbox";
import { apiFetch } from "@/lib/api";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import {
    Alert,
    AlertIcon,
    AlertTitle,
} from "@/components/ui/alert";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { RiCheckboxCircleFill } from "@remixicon/react";

// Keep these existing dialog imports until their individual files are renamed.
import MachineMasterAddDialog from "./machine-master-add-dialog";
import MachineMasterEditDialog from "./machine-master-edit-dialog";
import MachineMasterViewDialog from "./machine-master-view-dialog";
import MachineMasterDeleteDialog from "./machine-master-delete-dialog";

import { StoreClientFiltersSheet } from "./sheet/filters-sheet";

import MachineMastersActiveDialog from "./machine-masters-active-dialog";
import MachineMastersInactiveDialog from "./machine-masters-inactive-dialog";
import MachineMastersDeleteDialog from "./machine-masters-delete-dialog";

// ======================================================
// CONFIG
// ======================================================

const API_URL = "/api/inventory/machine-master";
const QUERY_KEY = "machine-masters";
const MODULE_NAME = "machine-master";

// ======================================================
// NOTIFICATION
// ======================================================

const createMachineMasterNotification = async ({
    action,
    title,
    message,
    machineMasterId = null,
    machineMasterName = null,
}) => {
    try {
        const response = await fetch("/api/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                module: "inventory",
                action,
                title,
                message,
                entityId:
                    machineMasterId !== null &&
                        machineMasterId !== undefined
                        ? String(machineMasterId)
                        : null,
                entityType: "machine_master",
                entityName: machineMasterName || "Machine Master",
                url: "/inventory/machine-master",
            }),
            cache: "no-store",
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result?.success) {
            throw new Error(result?.message || "Notification failed");
        }

        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("notifications-refresh"),
            );

            window.dispatchEvent(
                new CustomEvent("notifications-received", {
                    detail: result.notification
                        ? [result.notification]
                        : [],
                }),
            );
        }

        return result;
    } catch (error) {
        console.error("MACHINE MASTER NOTIFICATION ERROR", error);
        return null;
    }
};

// ======================================================
// HELPERS
// ======================================================

const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "-"
        : date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
};

const formatDateTime = (value) => {
    if (!value) return "";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleString();
};

const getOperatorName = (item) => {
    return (
        item?.operatorName ||
        item?.OperateName ||
        item?.operateName ||
        item?.operator?.name ||
        item?.OperateId ||
        "-"
    );
};

const getCreatedByName = (item) => {
    return (
        item?.createdByName ||
        item?.createbyName ||
        item?.createdBy?.name ||
        item?.createby ||
        "-"
    );
};

const getUpdatedByName = (item) => {
    return (
        item?.updatedByName ||
        item?.updatebyName ||
        item?.updatedBy?.name ||
        item?.updateby ||
        "-"
    );
};

const getItemDetailsSummary = (item) => {
    const details = Array.isArray(item?.itemDetails)
        ? item.itemDetails
        : [];

    if (details.length > 0) {
        return details
            .filter((detail) => !detail.deletedAt)
            .map((detail) => {
                const name = detail.Selecteditem || "Item";
                const quantity = detail.itemQty || "-";
                const unit = detail.itemUnit
                    ? ` ${detail.itemUnit}`
                    : "";
                const description = detail.itemdescription
                    ? `, Description: ${detail.itemdescription}`
                    : "";

                return `${name}: Quantity - ${quantity}${unit}${description}`;
            })
            .join("; ");
    }

    return item?.Specification || "-";
};

const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[char]);

// ======================================================
// COMPONENT
// ======================================================

const MachineMasterList = () => {
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user?.permissions || [],
        [session?.user?.permissions],
    );

    // Update these permission keys if your permission records use
    // a different naming convention.
    const canView = can("machine-master.view", userPermissions);
    const canManage = can("machinemaster.manage", userPermissions);
    const canEdit = can("machinemaster.edit", userPermissions);
    const canDelete = can("machinemaster.delete", userPermissions);

    // ==================================================
    // TABLE STATE
    // ==================================================

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const [sorting, setSorting] = useState([
        {
            id: "createdAt",
            desc: true,
        },
    ]);

    // ==================================================
    // SEARCH AND FILTERS
    // ==================================================

    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const [statusFilter, setStatusFilter] = useState("all");

    const [createdFrom, setCreatedFrom] = useState("");
    const [createdTo, setCreatedTo] = useState("");

    const [updatedFrom, setUpdatedFrom] = useState("");
    const [updatedTo, setUpdatedTo] = useState("");

    const [createdByFilter, setCreatedByFilter] = useState("");
    const [updatedByFilter, setUpdatedByFilter] = useState("");

    // ==================================================
    // SELECTION AND BULK ACTIONS
    // ==================================================

    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);

    // ==================================================
    // CONNECTION STATE
    // ==================================================

    const [isOnline, setIsOnline] = useState(
        typeof navigator === "undefined"
            ? true
            : navigator.onLine,
    );

    const [dbStatus, setDbStatus] = useState({
        env: "local",
        online: false,
        loading: true,
    });

    const [checkingDb, setCheckingDb] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const syncingRef = useRef(false);

    // ==================================================
    // CRUD DIALOGS
    // ==================================================

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [selectedMachineMaster, setSelectedMachineMaster] =
        useState(null);

    const [deleteLoading, setDeleteLoading] = useState(false);

    // ==================================================
    // BULK DIALOGS
    // ==================================================

    const [activeDialogOpen, setActiveDialogOpen] = useState(false);
    const [inactiveDialogOpen, setInactiveDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] =
        useState(false);

    // ==================================================
    // REFRESH
    // ==================================================

    const refreshMachineMasters = useCallback(async () => {
        await queryClient.invalidateQueries({
            queryKey: [QUERY_KEY],
        });
    }, [queryClient]);

    // ==================================================
    // INVENTORY SYNC
    // ==================================================

    const syncInventoryMachineMasters = useCallback(async () => {
        if (
            typeof navigator !== "undefined" &&
            !navigator.onLine
        ) {
            setIsOnline(false);
            return null;
        }

        if (syncingRef.current) return null;

        try {
            syncingRef.current = true;
            setSyncing(true);

            const response = await fetch(
                "/api/sync/inventory-local",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    cache: "no-store",
                },
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result?.message || "Inventory sync failed",
                );
            }

            window.dispatchEvent(
                new CustomEvent("notifications-refresh"),
            );

            return result;
        } catch (error) {
            console.error("MACHINE MASTER SYNC ERROR", error);

            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>{error.message}</AlertTitle>
                    </Alert>
                ),
                {
                    position: "top-center",
                },
            );

            return null;
        } finally {
            syncingRef.current = false;
            setSyncing(false);
        }
    }, []);

    // ==================================================
    // DATABASE STATUS
    // ==================================================

    const checkDbStatus = useCallback(async () => {
        if (
            typeof navigator !== "undefined" &&
            !navigator.onLine
        ) {
            setDbStatus((previous) => ({
                ...previous,
                online: false,
                loading: false,
            }));

            return;
        }

        try {
            setCheckingDb(true);

            const response = await fetch(
                "/api/settings/toggle",
                {
                    cache: "no-store",
                },
            );

            if (!response.ok) {
                throw new Error("Database check failed");
            }

            const result = await response.json();

            setDbStatus({
                env: result?.activeEnv || "local",
                online: true,
                loading: false,
            });
        } catch (error) {
            console.error("DATABASE STATUS ERROR", error);

            setDbStatus((previous) => ({
                ...previous,
                online: false,
                loading: false,
            }));
        } finally {
            setCheckingDb(false);
        }
    }, []);

    // ==================================================
    // FETCH MACHINE MASTERS
    // ==================================================

    const fetchMachineMasters = useCallback(async () => {
        const params = new URLSearchParams({
            page: String(pagination.pageIndex + 1),
            limit: String(pagination.pageSize),

            query: searchQuery || "",
            status: statusFilter || "all",

            createdFrom: createdFrom || "",
            createdTo: createdTo || "",

            updatedFrom: updatedFrom || "",
            updatedTo: updatedTo || "",

            createdBy: createdByFilter || "",
            updatedBy: updatedByFilter || "",

            sort: sorting?.[0]?.id || "createdAt",
            dir: sorting?.[0]?.desc ? "desc" : "asc",
        });

        const response = await apiFetch(
            `${API_URL}?${params.toString()}`,
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Failed to load machine masters",
            );
        }

        return result;
    }, [
        pagination.pageIndex,
        pagination.pageSize,
        searchQuery,
        statusFilter,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        createdByFilter,
        updatedByFilter,
        sorting,
    ]);

    const {
        data,
        isLoading,
        error,
    } = useQuery({
        queryKey: [
            QUERY_KEY,
            pagination.pageIndex,
            pagination.pageSize,
            sorting,
            searchQuery,
            statusFilter,
            createdFrom,
            createdTo,
            updatedFrom,
            updatedTo,
            createdByFilter,
            updatedByFilter,
        ],
        queryFn: fetchMachineMasters,
        staleTime: 0,
    });

    const machineMasters = data?.data || [];

    const totalRecords = Number(
        data?.pagination?.total || 0,
    );

    // ==================================================
    // SELECTION
    // ==================================================

    const currentPageIds = useMemo(
        () => machineMasters.map((item) => String(item.id)),
        [machineMasters],
    );

    const allCurrentPageSelected =
        currentPageIds.length > 0 &&
        currentPageIds.every((id) => selectedIds.includes(id));

    const toggleRowSelection = useCallback((id) => {
        const normalizedId = String(id);

        setSelectedIds((previous) =>
            previous.includes(normalizedId)
                ? previous.filter((value) => value !== normalizedId)
                : [...previous, normalizedId],
        );
    }, []);

    const toggleCurrentPageSelection = useCallback(() => {
        setSelectedIds((previous) => {
            if (allCurrentPageSelected) {
                return previous.filter(
                    (id) => !currentPageIds.includes(id),
                );
            }

            return [
                ...new Set([
                    ...previous,
                    ...currentPageIds,
                ]),
            ];
        });
    }, [allCurrentPageSelected, currentPageIds]);

    // ==================================================
    // FILTER RESET
    // ==================================================

    useEffect(() => {
        setPagination((previous) =>
            previous.pageIndex === 0
                ? previous
                : {
                    ...previous,
                    pageIndex: 0,
                },
        );
    }, [
        statusFilter,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        createdByFilter,
        updatedByFilter,
        searchQuery,
    ]);

    useEffect(() => {
        setSelectedIds([]);
    }, [
        pagination.pageIndex,
        pagination.pageSize,
        searchQuery,
        statusFilter,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        createdByFilter,
        updatedByFilter,
    ]);

    // ==================================================
    // SEARCH
    // ==================================================

    const handleSearch = useCallback(
        (event) => {
            event?.preventDefault();

            setPagination((previous) => ({
                ...previous,
                pageIndex: 0,
            }));

            setSearchQuery(searchInput.trim());
        },
        [searchInput],
    );

    // ==================================================
    // EXPORT DATA
    // ==================================================

    const getMachineMasterReportRows = useCallback(async () => {
        if (selectedIds.length > 0) {
            const selectedSet = new Set(
                selectedIds.map(String),
            );

            return machineMasters.filter((item) =>
                selectedSet.has(String(item.id)),
            );
        }

        const params = new URLSearchParams({
            page: "1",
            limit: "10000",

            query: searchQuery || "",
            status: statusFilter || "all",

            createdFrom: createdFrom || "",
            createdTo: createdTo || "",

            updatedFrom: updatedFrom || "",
            updatedTo: updatedTo || "",

            createdBy: createdByFilter || "",
            updatedBy: updatedByFilter || "",

            sort: sorting?.[0]?.id || "createdAt",
            dir: sorting?.[0]?.desc ? "desc" : "asc",
        });

        const response = await apiFetch(
            `${API_URL}?${params.toString()}`,
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Failed to load machine masters",
            );
        }

        return result.data || [];
    }, [
        selectedIds,
        machineMasters,
        searchQuery,
        statusFilter,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        createdByFilter,
        updatedByFilter,
        sorting,
    ]);

    const buildMachineMasterExcel = useCallback((items) => {
        const rows = items.map((item) => ({
            "Machine Number": item.machineNumber || "",
            "Machine Name": item.machineName || "",
            "Machine Code": item.machineCode || "",
            "IP Address": item.ipAddress || "",
            Comment: item.comment || "",
            Specifications: getItemDetailsSummary(item),
            Operational: item.status ? "Yes" : "No",
            "Added Date": formatDateTime(item.createdAt),
            "Last Updated Date": formatDateTime(item.updatedAt),
            "Added By": getCreatedByName(item),
            "Last Updated By": getUpdatedByName(item),
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);

        worksheet["!cols"] = [
            { wch: 20 },
            { wch: 25 },
            { wch: 18 },
            { wch: 20 },
            { wch: 22 },
            { wch: 22 },
            { wch: 30 },
            { wch: 65 },
            { wch: 14 },
            { wch: 22 },
            { wch: 22 },
            { wch: 20 },
            { wch: 20 },
        ];

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Machine Master",
        );

        return workbook;
    }, []);

    const downloadMachineMasterExcel = useCallback(
        (items, filename = "machine-master.xlsx") => {
            if (!items.length) {
                toast.custom(
                    () => (
                        <Alert variant="mono" icon="error" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>No machine masters to export</AlertTitle>
                        </Alert>
                    ),
                    {
                        position: "top-center",
                    },
                );
                return false;
            }

            XLSX.writeFile(
                buildMachineMasterExcel(items),
                filename,
            );

            return true;
        },
        [buildMachineMasterExcel],
    );

    const handleExportExcel = useCallback(async () => {
        try {
            toast.loading("Preparing Excel export", {
                id: "machine-master-export",
            });

            const items = await getMachineMasterReportRows();

            if (!items.length) {
                toast.custom(
                    () => (
                        <Alert variant="mono" icon="error" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>No machine masters to export</AlertTitle>
                        </Alert>
                    ),
                    {
                        id: "machine-master-export",
                        position: "top-center",
                    },
                );

                return;
            }

            downloadMachineMasterExcel(items);

            toast.custom(
                () => (
                    <Alert variant="mono" icon="success" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {items.length} machine master(s) exported.
                        </AlertTitle>
                    </Alert>
                ),
                {
                    id: "machine-master-export",
                    position: "top-center",
                },
            );
        } catch (error) {
            console.error("MACHINE MASTER EXPORT ERROR", error);

            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {error.message || "Export failed"}
                        </AlertTitle>
                    </Alert>
                ),
                {
                    id: "machine-master-export",
                    position: "top-center",
                },
            );
        }
    }, [
        getMachineMasterReportRows,
        downloadMachineMasterExcel,
    ]);

    // ==================================================
    // PRINT
    // ==================================================

    const handlePrintMachineMasters = useCallback(async () => {
        try {
            const items = await getMachineMasterReportRows();

            if (!items.length) {
                toast.custom(
                    () => (
                        <Alert variant="mono" icon="error" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>No machine masters to print</AlertTitle>
                        </Alert>
                    ),
                    {
                        position: "top-center",
                    },
                );
                return;
            }

            const rows = items.map((item) => `
                <tr>
                    <td>${escapeHtml(item.machineNumber)}</td>
                    <td>${escapeHtml(item.machineName)}</td>
                    <td>${escapeHtml(item.machineCode)}</td>
                    <td>${escapeHtml(item.ipAddress || "-")}</td>
                    <td>${escapeHtml(item.comment || "-")}</td>
                    <td>${item.status ? "Yes" : "No"}</td>
                    <td>${escapeHtml(formatDate(item.createdAt))}</td>
                    <td>${escapeHtml(formatDate(item.updatedAt))}</td>
                    <td>${escapeHtml(getCreatedByName(item))}</td>
                    <td>${escapeHtml(getUpdatedByName(item))}</td>
                    <td>${escapeHtml(getItemDetailsSummary(item))}</td>
                </tr>
            `).join("");

            const printWindow = window.open(
                "",
                "_blank",
                "width=1400,height=850",
            );

            if (!printWindow) {
                toast.custom(
                    () => (
                        <Alert variant="mono" icon="error" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>
                                Please allow pop-ups to print the report
                            </AlertTitle>
                        </Alert>
                    ),
                    {
                        position: "top-center",
                    },
                );
                return;
            }

            printWindow.document.write(`
                <!doctype html>
                <html>
                    <head>
                        <title>Machine Master Report</title>
                        <meta charset="utf-8">
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                padding: 24px;
                                color: #222;
                            }

                            h1 {
                                font-size: 22px;
                                margin-bottom: 6px;
                            }

                            p {
                                color: #555;
                                font-size: 12px;
                            }

                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                            }

                            th, td {
                                border: 1px solid #ccc;
                                padding: 8px;
                                text-align: left;
                                vertical-align: top;
                                font-size: 10px;
                            }

                            th {
                                background: #f2f2f2;
                            }

                            tr {
                                break-inside: avoid;
                            }

                            @media print {
                                body {
                                    padding: 0;
                                }
                            }
                        </style>
                    </head>

                    <body>
                        <h1>Machine Master Report</h1>

                        <p>
                            Generated: ${escapeHtml(
                new Date().toLocaleString(),
            )}
                        </p>

                        <p>Total records: ${items.length}</p>

                        <table>
                            <thead>
                                <tr>
                                    <th>Machine Number</th>
                                    <th>Machine Name</th>
                                    <th>Machine Code</th>
                                    <th>IP Address</th>
                                    <th>Comment</th>
                                    <th>Operational</th>
                                    <th>Added Date</th>
                                    <th>Updated Date</th>
                                    <th>Added By</th>
                                    <th>Updated By</th>
                                    <th>Specifications</th>
                                </tr>
                            </thead>

                            <tbody>${rows}</tbody>
                        </table>

                        <script>
                            window.onload = function () {
                                window.focus();
                                window.print();
                            };
                        </script>
                    </body>
                </html>
            `);

            printWindow.document.close();
        } catch (error) {
            console.error("MACHINE MASTER PRINT ERROR", error);
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {error.message || "Print failed"}
                        </AlertTitle>
                    </Alert>
                ),
                {
                    position: "top-center",
                },
            );
        }
    }, [getMachineMasterReportRows]);

    // ==================================================
    // DELETE
    // ==================================================

    const handleDelete = useCallback((item) => {
        setSelectedMachineMaster(item);
        setDeleteDialogOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!selectedMachineMaster?.id) return;

        try {
            setDeleteLoading(true);

            const response = await apiFetch(API_URL, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: selectedMachineMaster.id,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Machine Master delete failed",
                );
            }

            toast.custom(
                () => (
                    <Alert variant="mono" icon="success" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>Machine Master deleted successfully</AlertTitle>
                    </Alert>
                ),
                {
                    position: "top-center",
                },
            );

            await createMachineMasterNotification({
                action: "deleted",
                title: "Machine Master Deleted",
                message: `${selectedMachineMaster.machineNumber} - ${selectedMachineMaster.machineName} has been deleted.`,
                machineMasterId: selectedMachineMaster.id,
                machineMasterName: selectedMachineMaster.machineName,
            });

            setDeleteDialogOpen(false);

            setSelectedIds((previous) =>
                previous.filter(
                    (id) => id !== String(selectedMachineMaster.id),
                ),
            );

            setSelectedMachineMaster(null);

            await refreshMachineMasters();
            await syncInventoryMachineMasters();
        } catch (error) {
            console.error("MACHINE MASTER DELETE ERROR", error);
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {error.message || "Delete failed"}
                        </AlertTitle>
                    </Alert>
                ),
                {
                    position: "top-center",
                },
            );
        } finally {
            setDeleteLoading(false);
        }
    }, [
        selectedMachineMaster,
        refreshMachineMasters,
        syncInventoryMachineMasters,
    ]);

    // ==================================================
    // STATUS UPDATE
    // ==================================================

    const handleToggleMachineMasterStatus = useCallback(
        async (item) => {
            const nextStatus = !Boolean(item.status);

            try {
                const response = await apiFetch(API_URL, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: item.id,
                        status: nextStatus,
                    }),
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Operational update failed",
                    );
                }

                toast.custom(
                    () => (
                        <Alert variant="mono" icon="success" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>
                                {`${item.machineNumber} marked ${nextStatus ? "yes" : "no"}`}
                            </AlertTitle>
                        </Alert>
                    ),
                    {
                        position: "top-center",
                    },
                );

                await refreshMachineMasters();
                await syncInventoryMachineMasters();
            } catch (error) {
                console.error("MACHINE MASTER Operational ERROR", error);
                toast.custom(
                    () => (
                        <Alert variant="mono" icon="error" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>
                                {error.message || "Operational update failed"}
                            </AlertTitle>
                        </Alert>
                    ),
                    {
                        position: "top-center",
                    },
                );
            }
        },
        [
            refreshMachineMasters,
            syncInventoryMachineMasters,
        ],
    );

    // ==================================================
    // BULK Operational
    // ==================================================

    const handleBulkStatus = useCallback(
        async (status) => {
            if (!selectedIds.length) {
                toast.custom(
                    () => (
                        <Alert variant="mono" icon="error" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>Select at least one machine master</AlertTitle>
                        </Alert>
                    ),
                    {
                        position: "top-center",
                    },
                );
                return;
            }

            if (!(canManage || canEdit)) {
                toast.custom(
                    () => (
                        <Alert variant="mono" icon="error" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>
                                You do not have permission to change machine master status
                            </AlertTitle>
                        </Alert>
                    ),
                    {
                        position: "top-center",
                    },
                );
                return;
            }

            const idsToUpdate = [...selectedIds];

            try {
                setBulkLoading(true);

                const response = await apiFetch(API_URL, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ids: idsToUpdate,
                        status,
                    }),
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Bulk status update failed",
                    );
                }

                toast.custom(
                    () => (
                        <Alert variant="mono" icon="success" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>
                                {`${result.count ?? idsToUpdate.length} machine master(s) marked ${status ? "yes" : "no"}`}
                            </AlertTitle>
                        </Alert>
                    ),
                    {
                        position: "top-center",
                    },
                );

                setActiveDialogOpen(false);
                setInactiveDialogOpen(false);
                setSelectedIds([]);

                await refreshMachineMasters();
                await syncInventoryMachineMasters();
            } catch (error) {
                console.error("MACHINE MASTER BULK Operational ERROR", error);
                toast.custom(
                    () => (
                        <Alert variant="mono" icon="error" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>
                                {error.message || "Bulk Operational update failed"}
                            </AlertTitle>
                        </Alert>
                    ),
                    {
                        position: "top-center",
                    },
                );
            } finally {
                setBulkLoading(false);
            }
        },
        [
            selectedIds,
            canManage,
            canEdit,
            refreshMachineMasters,
            syncInventoryMachineMasters,
        ],
    );

    // ==================================================
    // BULK DELETE
    // ==================================================

    const handleBulkDelete = useCallback(() => {
        if (!selectedIds.length) {
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>Select at least one machine master</AlertTitle>
                    </Alert>
                ),
                {
                    position: "top-center",
                },
            );
            return;
        }

        if (!canDelete) {
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            You do not have permission to delete machine masters
                        </AlertTitle>
                    </Alert>
                ),
                {
                    position: "top-center",
                },
            );
            return;
        }

        setBulkDeleteDialogOpen(true);
    }, [selectedIds, canDelete]);

    const handleConfirmBulkDelete = useCallback(async () => {
        if (!selectedIds.length || bulkLoading) return;

        const idsToDelete = [...selectedIds];

        try {
            setBulkLoading(true);

            const response = await apiFetch(API_URL, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ids: idsToDelete,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Bulk delete failed",
                );
            }

            toast.custom(
                () => (
                    <Alert variant="mono" icon="success" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {`${result.count ?? idsToDelete.length} machine master(s) deleted`}
                        </AlertTitle>
                    </Alert>
                ),
                {
                    position: "top-center",
                },
            );

            setBulkDeleteDialogOpen(false);
            setSelectedIds([]);

            await refreshMachineMasters();
            await syncInventoryMachineMasters();
        } catch (error) {
            console.error("MACHINE MASTER BULK DELETE ERROR", error);
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {error.message || "Bulk delete failed"}
                        </AlertTitle>
                    </Alert>
                ),
                {
                    position: "top-center",
                },
            );
        } finally {
            setBulkLoading(false);
        }
    }, [
        selectedIds,
        bulkLoading,
        refreshMachineMasters,
        syncInventoryMachineMasters,
    ]);

    // ==================================================
    // SHARED HEADER REPORT BUTTONS
    // ==================================================

    useEffect(() => {
        const handleReportButtonClick = (event) => {
            if (!(event.target instanceof Element)) return;

            const button = event.target.closest(
                "#Print, #Export",
            );

            if (!button) return;

            if (
                !window.location.pathname.includes(
                    "/machine-master",
                )
            ) {
                return;
            }

            if (button.id === "Print") {
                event.preventDefault();
                void handlePrintMachineMasters();
            }

            if (button.id === "Export") {
                event.preventDefault();
                void handleExportExcel();
            }
        };

        document.addEventListener(
            "click",
            handleReportButtonClick,
        );

        return () => {
            document.removeEventListener(
                "click",
                handleReportButtonClick,
            );
        };
    }, [
        handlePrintMachineMasters,
        handleExportExcel,
    ]);

    // ==================================================
    // ONLINE / OFFLINE
    // ==================================================

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);

            await checkDbStatus();
            await syncInventoryMachineMasters();
            await refreshMachineMasters();
        };

        const handleOffline = () => {
            setIsOnline(false);

            setDbStatus((previous) => ({
                ...previous,
                online: false,
                loading: false,
            }));
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
        };
    }, [
        checkDbStatus,
        syncInventoryMachineMasters,
        refreshMachineMasters,
    ]);

    useEffect(() => {
        void checkDbStatus();

        const interval = setInterval(
            () => void checkDbStatus(),
            30000,
        );

        return () => clearInterval(interval);
    }, [checkDbStatus]);

    // ==================================================
    // TABLE COLUMNS
    // ==================================================

    const columns = useMemo(
        () => [
            {
                id: "select",

                header: () => (
                    <Checkbox
                        aria-label="Select all rows on this page"
                        checked={allCurrentPageSelected}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={() =>
                            toggleCurrentPageSelection()
                        }
                        disabled={
                            !machineMasters.length || bulkLoading
                        }
                    />
                ),

                cell: ({ row }) => {
                    const item = row.original;
                    const id = String(item.id);

                    return (
                        <Checkbox
                            aria-label={`Select ${item.machineNumber}`}
                            checked={selectedIds.includes(id)}
                            onClick={(event) => event.stopPropagation()}
                            onCheckedChange={() =>
                                toggleRowSelection(id)
                            }
                            disabled={bulkLoading}
                        />
                    );
                },

                size: 48,
                enableSorting: false,
                enableHiding: false,
            },

            {
                accessorKey: "machineNumber",
                id: "machineNumber",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Machine Number"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span className="font-medium">
                        {row.original.machineNumber || "-"}
                    </span>
                ),

                size: 160,
            },

            {
                accessorKey: "machineName",
                id: "machineName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Machine Name"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span className="font-medium">
                        {row.original.machineName || "-"}
                    </span>
                ),

                size: 190,
            },

            {
                accessorKey: "machineCode",
                id: "machineCode",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Machine Code"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span>{row.original.machineCode || "-"}</span>
                ),

                size: 140,
            },

            {
                accessorKey: "ipAddress",
                id: "ipAddress",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="IP Address"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span>{row.original.ipAddress || "-"}</span>
                ),

                size: 150,
            },

            {
                accessorKey: "comment",
                id: "comment",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Comment"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span className="block max-w-[220px] truncate">
                        {row.original.comment || "-"}
                    </span>
                ),

                size: 200,
            },

            {
                id: "specifications",

                header: "Specifications",

                cell: ({ row }) => {
                    const summary = getItemDetailsSummary(
                        row.original,
                    );

                    return (
                        <span
                            className="block max-w-[350px] truncate"
                            title={summary}
                        >
                            {summary}
                        </span>
                    );
                },

                size: 350,
                enableSorting: false,
            },

            {
                accessorKey: "status",
                id: "status",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Operational"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span
                        className={
                            row.original.status
                                ? "font-medium text-green-600"
                                : "font-medium text-red-600"
                        }
                    >
                        {row.original.status
                            ? "Yes"
                            : "No"}
                    </span>
                ),

                size: 110,
            },

            {
                accessorKey: "createdAt",
                id: "createdAt",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Added Date"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span>
                        {formatDate(row.original.createdAt)}
                    </span>
                ),

                size: 140,
                enableSorting: true,

                meta: {
                    headerTitle: "Added Date",
                    skeleton: <Skeleton className="h-7 w-24" />,
                },
            },

            {
                accessorKey: "updatedAt",
                id: "updatedAt",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Last Updated Date"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span>
                        {formatDate(row.original.updatedAt)}
                    </span>
                ),

                size: 165,
                enableSorting: true,

                meta: {
                    headerTitle: "Last Updated Date",
                    skeleton: <Skeleton className="h-7 w-24" />,
                },
            },

            {
                accessorKey: "createdByName",
                id: "createdByName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Added By"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span>
                        {getCreatedByName(row.original)}
                    </span>
                ),

                size: 160,
                enableSorting: false,

                meta: {
                    headerTitle: "Added By",
                    skeleton: <Skeleton className="h-7 w-24" />,
                },
            },

            {
                accessorKey: "updatedByName",
                id: "updatedByName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Last Updated By"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span>
                        {getUpdatedByName(row.original)}
                    </span>
                ),

                size: 170,
                enableSorting: false,

                meta: {
                    headerTitle: "Last Updated By",
                    skeleton: <Skeleton className="h-7 w-24" />,
                },
            },

            {
                id: "actions",

                header: "Actions",

                cell: ({ row }) => {
                    const item = row.original;

                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    mode="icon"
                                    variant="ghost"
                                    aria-label={`Actions for ${item.machineName}`}
                                >
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                                {canView && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedMachineMaster(item);
                                            setViewDialogOpen(true);
                                        }}
                                    >
                                        <Eye className="mr-2 size-4" />
                                        View
                                    </DropdownMenuItem>
                                )}

                                {canEdit && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedMachineMaster(item);
                                            setEditDialogOpen(true);
                                        }}
                                    >
                                        <Pencil className="mr-2 size-4" />
                                        Edit
                                    </DropdownMenuItem>
                                )}

                                {(canManage || canEdit) && (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            void handleToggleMachineMasterStatus(
                                                item,
                                            )
                                        }
                                    >
                                        {item.status ? (
                                            <XCircle className="mr-2 size-4" />
                                        ) : (
                                            <CheckCircle className="mr-2 size-4" />
                                        )}

                                        Mark{" "}
                                        {item.status
                                            ? "No"
                                            : "Yes"}
                                    </DropdownMenuItem>
                                )}

                                {canDelete && (
                                    <>
                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() =>
                                                handleDelete(item)
                                            }
                                        >
                                            <Trash2 className="mr-2 size-4" />
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
        [
            allCurrentPageSelected,
            machineMasters,
            selectedIds,
            bulkLoading,
            toggleCurrentPageSelection,
            toggleRowSelection,
            canView,
            canEdit,
            canManage,
            canDelete,
            handleDelete,
            handleToggleMachineMasterStatus,
        ],
    );

    // ==================================================
    // TABLE
    // ==================================================

    const table = useReactTable({
        columns,
        data: machineMasters,

        pageCount: Math.ceil(
            totalRecords / pagination.pageSize,
        ),

        state: {
            pagination,
            sorting,
        },

        onPaginationChange: setPagination,
        onSortingChange: setSorting,

        getCoreRowModel: getCoreRowModel(),

        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
    });

    // ==================================================
    // TOOLBAR
    // ==================================================

    const renderToolbar = () => (
        <CardHeader className="flex-col flex-wrap items-stretch gap-3 py-5 sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-2 sm:w-auto">
                <form
                    className="relative flex-1 sm:w-[250px] sm:flex-none"
                    onSubmit={handleSearch}
                >
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                        type="text"
                        placeholder="Search machine master"
                        value={searchInput}
                        onChange={(event) =>
                            setSearchInput(event.target.value)
                        }
                        className="w-full pl-9 pr-9"
                        autoComplete="off"
                    />

                    {searchInput.length > 0 && (
                        <button
                            type="button"
                            aria-label="Clear search"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                                setSearchInput("");
                                setSearchQuery("");

                                setPagination((previous) => ({
                                    ...previous,
                                    pageIndex: 0,
                                }));
                            }}
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </form>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                            <Info className="size-4" />
                        </button>
                    </TooltipTrigger>

                    <TooltipContent>
                        <p>Search by machine number, machine name, machine code.</p>
                    </TooltipContent>
                </Tooltip>

            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
                {selectedIds.length > 0 && (
                    <>
                        {(canManage || canEdit) && (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={bulkLoading}
                                    onClick={() =>
                                        setActiveDialogOpen(true)
                                    }
                                >
                                    <CheckCircle className="mr-2 size-4" />
                                    {selectedIds.length} Mark Yes
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={bulkLoading}
                                    onClick={() =>
                                        setInactiveDialogOpen(true)
                                    }
                                >
                                    <XCircle className="mr-2 size-4" />
                                    {selectedIds.length} Mark No
                                </Button>
                            </>
                        )}

                        {canDelete && (
                            <Button
                                type="button"
                                variant="destructive"
                                disabled={bulkLoading}
                                onClick={handleBulkDelete}
                            >
                                <Trash2 className="mr-2 size-4" />
                                {selectedIds.length} Delete Selected
                            </Button>
                        )}
                    </>
                )}

                {/* Database connection status */}
                <div
                    className="flex h-9 items-center gap-2 rounded-md border bg-background px-3"
                    role="status"
                    aria-live="polite"
                >
                    <span
                        className={`size-2.5 shrink-0 rounded-full ${dbStatus.loading
                            ? "animate-pulse bg-yellow-500"
                            : dbStatus.online && isOnline
                                ? "bg-green-500"
                                : "bg-red-500"
                            }`}
                    />

                    <span className="text-xs font-medium">
                        {dbStatus.loading
                            ? "Checking..."
                            : dbStatus.online && isOnline
                                ? String(dbStatus.env || "Database")
                                    .toLowerCase()
                                    .replace(/\b\w/g, (char) => char.toUpperCase())
                                : "Offline"}
                    </span>

                    <Button
                        type="button"
                        mode="icon"
                        variant="ghost"
                        size="sm"
                        className="size-7"
                        disabled={checkingDb || syncing}
                        onClick={() => void checkDbStatus()}
                        aria-label="Refresh database status"
                    >
                        <RefreshCw
                            className={`size-4 ${checkingDb ? "animate-spin" : ""}`}
                        />
                    </Button>
                </div>

                {canManage && (
                    <Button
                        type="button"
                        onClick={() => setAddDialogOpen(true)}
                    >
                        <Plus className="mr-2 size-4" />
                        Add Machine Master
                    </Button>
                )}

                <StoreClientFiltersSheet
                    trigger={
                        <Button
                            type="button"
                            variant="outline"
                        >
                            <Funnel className="mr-2 size-4" />
                            Filter
                        </Button>
                    }
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    createdFrom={createdFrom}
                    setCreatedFrom={setCreatedFrom}
                    createdTo={createdTo}
                    setCreatedTo={setCreatedTo}
                    updatedFrom={updatedFrom}
                    setUpdatedFrom={setUpdatedFrom}
                    updatedTo={updatedTo}
                    setUpdatedTo={setUpdatedTo}
                    createdByFilter={createdByFilter}
                    setCreatedByFilter={setCreatedByFilter}
                    updatedByFilter={updatedByFilter}
                    setUpdatedByFilter={setUpdatedByFilter}
                />
            </div>
        </CardHeader>
    );

    // ==================================================
    // PERMISSION CHECK
    // ==================================================

    if (!canView) {
        return (
            <Card>
                <CardHeader>
                    <div>
                        <h3 className="text-lg font-semibold">
                            Access Denied
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                            You do not have permission to view Machine Master.
                        </p>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    // ==================================================
    // RENDER
    // ==================================================

    return (
        <>
            <DataGrid
                table={table}
                recordCount={totalRecords}
                isLoading={isLoading}
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
                    {renderToolbar()}

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

            {/* ==========================================
                ADD DIALOG
            ========================================== */}

            <MachineMasterAddDialog
                open={addDialogOpen}
                closeDialog={() => setAddDialogOpen(false)}
                onSuccess={async (newMachineMaster) => {
                    setAddDialogOpen(false);

                    await createMachineMasterNotification({
                        action: "created",
                        title: "New Machine Master Created",
                        message: `${newMachineMaster?.machineNumber || ""
                            } - ${newMachineMaster?.machineName || ""
                            } has been created.`,
                        machineMasterId: newMachineMaster?.id,
                        machineMasterName:
                            newMachineMaster?.machineName,
                    });

                    await refreshMachineMasters();
                    await syncInventoryMachineMasters();
                }}
            />

            {/* ==========================================
                VIEW DIALOG
            ========================================== */}

            <MachineMasterViewDialog
                open={viewDialogOpen}
                MachineMaster={selectedMachineMaster}
                closeDialog={() => {
                    setViewDialogOpen(false);
                    setSelectedMachineMaster(null);
                }}
            />

            {/* ==========================================
                EDIT DIALOG
            ========================================== */}

            <MachineMasterEditDialog
                open={editDialogOpen}
                MachineMaster={selectedMachineMaster}
                closeDialog={() => {
                    setEditDialogOpen(false);
                    setSelectedMachineMaster(null);
                }}
                onSuccess={async (updatedMachineMaster) => {
                    setEditDialogOpen(false);

                    await createMachineMasterNotification({
                        action: "updated",
                        title: "Machine Master Updated",
                        message: `${updatedMachineMaster?.machineNumber ||
                            selectedMachineMaster?.machineNumber ||
                            ""
                            } - ${updatedMachineMaster?.machineName ||
                            selectedMachineMaster?.machineName ||
                            ""
                            } has been updated.`,
                        machineMasterId:
                            updatedMachineMaster?.id ||
                            selectedMachineMaster?.id,
                        machineMasterName:
                            updatedMachineMaster?.machineName ||
                            selectedMachineMaster?.machineName,
                    });

                    setSelectedMachineMaster(null);

                    await refreshMachineMasters();
                    await syncInventoryMachineMasters();
                }}
            />

            {/* ==========================================
                DELETE DIALOG
            ========================================== */}

            <MachineMasterDeleteDialog
                open={deleteDialogOpen}
                MachineMaster={selectedMachineMaster}
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                closeDialog={() => {
                    setDeleteDialogOpen(false);
                    setSelectedMachineMaster(null);
                }}
            />

            {/* ==========================================
                BULK ACTIVE DIALOG
            ========================================== */}

            <MachineMastersActiveDialog
                open={activeDialogOpen}
                onOpenChange={setActiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() => handleBulkStatus(true)}
            />

            {/* ==========================================
                BULK INACTIVE DIALOG
            ========================================== */}

            <MachineMastersInactiveDialog
                open={inactiveDialogOpen}
                onOpenChange={setInactiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() => handleBulkStatus(false)}
            />

            {/* ==========================================
                BULK DELETE DIALOG
            ========================================== */}

            <MachineMastersDeleteDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={setBulkDeleteDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={handleConfirmBulkDelete}
            />
        </>
    );
};

export default MachineMasterList;