
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import {
    CheckCircle,
    Copy,
    Ellipsis,
    Eye,
    Funnel,
    Mail,
    Pencil,
    Plus,
    Info,
    RefreshCw,
    Search,
    Trash2,
    X,
    FileSpreadsheet,
    XCircle,
    Settings2,
    CalendarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardFooter, CardHeader, CardTable } from "@/components/ui/card";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { Calendar } from "@/components/ui/calendar";

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogBody,
    DialogTitle,
} from "@/components/ui/dialog";

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuCheckboxItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import ProductionAddDialog from "./production-add-dialog";
import ProductionEditDialog from "./production-edit-dialog";
import ProductionViewDialog from "./production-view-dialog";
import ProductionDeleteDialog from "./production-delete-dialog";
import { ProductionClientFiltersSheet } from "./sheet/filters-sheet";

import ProductionActiveDialog from "./production-active-dialog";
import ProductionInactiveDialog from "./production-inactive-dialog";
import ProductionDeleteBulkDialog from "./productions-delete-dialog";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

// =======================================================
// TOAST HELPERS
// =======================================================

const showSuccess = (message, id) => {
    toast.custom(
        () => (
            <Alert variant="mono" icon="success" close={false}>
                <AlertIcon>
                    <RiCheckboxCircleFill />
                </AlertIcon>
                <AlertTitle>{message}</AlertTitle>
            </Alert>
        ),
        { id, position: "top-center" },
    );
};

const showError = (message, id) => {
    toast.custom(
        () => (
            <Alert variant="mono" icon="destructive" close={false}>
                <AlertIcon>
                    <RiErrorWarningFill />
                </AlertIcon>
                <AlertTitle>{message}</AlertTitle>
            </Alert>
        ),
        { id, position: "top-center" },
    );
};

// =======================================================
// HELPERS
// =======================================================

const escapeHtml = (value) =>
    String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[char],
    );

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

const getToday = () => format(new Date(), "yyyy-MM-dd");

const getCopyProductionDate = (value) => {
    if (!value) return getToday();

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? getToday()
        : format(date, "yyyy-MM-dd");
};

const getDateInputValue = (value) => {
    if (!value) return "";

    const rawValue = String(value);

    // Preserve the date portion if the API returns an ISO date/timestamp.
    if (/^\d{4}-\d{2}-\d{2}/.test(rawValue)) {
        return rawValue.slice(0, 10);
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getBooleanStatus = (value) =>
    value === true ||
    value === 1 ||
    String(value).toLowerCase() === "true";

const formatDateTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "-"
        : date.toLocaleString();
};

const getShiftName = (item) =>
    item?.shift?.name || item?.shiftName || "-";

const getMachineName = (item) =>
    item?.machine?.machineName || item?.machineName || "-";

const getMachineCode = (item) =>
    item?.machine?.machineCode || item?.machineCode || "-";

const getItemName = (item) =>
    item?.item?.ItemName || item?.itemName || "-";

const getItemSKU = (item) =>
    item?.item?.SKU || item?.itemSKU || "-";

const getUnitName = (item) =>
    item?.unit?.unitName || item?.unitName || "-";

const getUnitAbbreviation = (item) =>
    item?.unit?.abbreviation || item?.unitAbbreviation || "";

// =======================================================
// PRODUCTION NOTIFICATION
// =======================================================

const createProductionNotification = async ({
    action,
    title,
    message,
    productionId = null,
    entityName = null,
}) => {
    try {
        const response = await fetch("/api/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                module: "production",
                action,
                title,
                message,
                entityId:
                    productionId !== null && productionId !== undefined
                        ? String(productionId)
                        : null,
                entityType: "production",
                entityName: entityName || "Production",
                url: "/production",
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
        console.error("PRODUCTION NOTIFICATION ERROR:", error);
        return null;
    }
};

// =======================================================
// COMPONENT
// =======================================================

const ProductionList = () => {
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    // ===================================================
    // PERMISSIONS
    // ===================================================

    const userPermissions = useMemo(
        () => session?.user?.permissions || [],
        [session?.user?.permissions],
    );

    const canView = can("production.view", userPermissions);
    const canManage = can("production.manage", userPermissions);
    const canEdit = can("production.edit", userPermissions);
    const canDelete = can("production.delete", userPermissions);

    // ===================================================
    // TABLE STATE
    // ===================================================

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const [sorting, setSorting] = useState([
        { id: "createdAt", desc: true },
    ]);

    // ===================================================
    // SEARCH AND FILTERS
    // ===================================================

    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const [statusFilter, setStatusFilter] = useState("all");

    const [createdFrom, setCreatedFrom] = useState("");
    const [createdTo, setCreatedTo] = useState("");
    const [updatedFrom, setUpdatedFrom] = useState("");
    const [updatedTo, setUpdatedTo] = useState("");

    const [createdByFilter, setCreatedByFilter] = useState("");
    const [updatedByFilter, setUpdatedByFilter] = useState("");

    // ===================================================
    // SELECTION
    // ===================================================

    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);

    // ===================================================
    // CONNECTION
    // ===================================================

    const [isOnline, setIsOnline] = useState(
        typeof navigator === "undefined" ? true : navigator.onLine,
    );

    const [dbStatus, setDbStatus] = useState({
        env: "local",
        online: false,
        loading: true,
    });

    const [checkingDb, setCheckingDb] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const syncingRef = useRef(false);

    // ===================================================
    // CRUD DIALOGS
    // ===================================================

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [selectedProduction, setSelectedProduction] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // ===================================================
    // EMAIL REPORT
    // ===================================================

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");

    const [staffList, setStaffList] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [selectedRecipientEmails, setSelectedRecipientEmails] = useState([]);

    const [attachExcel, setAttachExcel] = useState(true);
    const [emailSending, setEmailSending] = useState(false);

    // ===================================================
    // BULK DIALOGS
    // ===================================================

    const [activeDialogOpen, setActiveDialogOpen] = useState(false);
    const [inactiveDialogOpen, setInactiveDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    // ===================================================
    // COPY DIALOG
    // ===================================================

    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [copySourceItem, setCopySourceItem] = useState(null);
    const [copyProductionDate, setCopyProductionDate] = useState("");
    const [copyLoading, setCopyLoading] = useState(false);

    // ===================================================
    // REFRESH
    // ===================================================

    const refreshProductions = useCallback(async () => {
        await queryClient.invalidateQueries({
            queryKey: ["production"],
        });
    }, [queryClient]);

    // ===================================================
    // DATABASE STATUS
    // ===================================================

    const checkDbStatus = useCallback(async () => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            setDbStatus((prev) => ({
                ...prev,
                online: false,
                loading: false,
            }));

            return;
        }

        try {
            setCheckingDb(true);

            const response = await fetch("/api/settings/toggle", {
                cache: "no-store",
            });

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
            console.error("DATABASE STATUS ERROR:", error);

            setDbStatus((prev) => ({
                ...prev,
                online: false,
                loading: false,
            }));
        } finally {
            setCheckingDb(false);
        }
    }, []);

    // ===================================================
    // FETCH PRODUCTION
    // ===================================================

    const fetchProductions = useCallback(async () => {
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
            `/api/production?${params.toString()}`,
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed loading production records");
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

    const { data, isLoading } = useQuery({
        queryKey: [
            "production",
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
        queryFn: fetchProductions,
        staleTime: 0,
    });

    const productions = data?.data || [];
    const totalRecords = Number(data?.pagination?.total || 0);

    // ===================================================
    // SELECTION HELPERS
    // ===================================================

    const currentPageIds = useMemo(
        () => productions.map((item) => String(item.id)),
        [productions],
    );

    const allCurrentPageSelected =
        currentPageIds.length > 0 &&
        currentPageIds.every((id) => selectedIds.includes(id));

    const toggleRowSelection = useCallback((id) => {
        const normalizedId = String(id);

        setSelectedIds((prev) =>
            prev.includes(normalizedId)
                ? prev.filter((value) => value !== normalizedId)
                : [...prev, normalizedId],
        );
    }, []);

    const toggleCurrentPageSelection = useCallback(() => {
        setSelectedIds((prev) => {
            if (allCurrentPageSelected) {
                return prev.filter((id) => !currentPageIds.includes(id));
            }

            return [...new Set([...prev, ...currentPageIds])];
        });
    }, [allCurrentPageSelected, currentPageIds]);

    // ===================================================
    // REPORT DATA
    // ===================================================

    const getProductionReportRows = useCallback(async () => {
        if (selectedIds.length > 0) {
            const selectedSet = new Set(selectedIds.map(String));

            return productions.filter((item) =>
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
            `/api/production?${params.toString()}`,
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to load production records");
        }

        return result.data || [];
    }, [
        selectedIds,
        productions,
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

    // ===================================================
    // EXCEL
    // ===================================================

    const buildProductionExcel = useCallback((items) => {
        const rows = items.map((item) => ({
            ID: item.id,
            "Production Date": formatDate(item.productionDate),
            Shift: getShiftName(item),
            "Machine Name": getMachineName(item),
            "Machine Code": getMachineCode(item),
            "Item Name": getItemName(item),
            "Production Quantity": item.productionQuantity ?? "",
            Remarks: item.remarks || "",
            "Created Date": formatDateTime(item.createdAt),
            "Created By": item.createdByName || "-",
            "Updated Date": formatDateTime(item.updatedAt),
            "Updated By": item.updatedByName || "-",
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);

        worksheet["!cols"] = [
            { wch: 15 },
            { wch: 20 },
            { wch: 28 },
            { wch: 18 },
            { wch: 18 },
            { wch: 24 },
            { wch: 20 },
            { wch: 28 },
            { wch: 18 },
            { wch: 18 },
            { wch: 15 },
            { wch: 20 },
            { wch: 35 },
            { wch: 14 },
            { wch: 22 },
            { wch: 22 },
            { wch: 22 },
            { wch: 22 },
        ];

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Production",
        );

        return workbook;
    }, []);

    const downloadProductionExcel = useCallback(
        (items, filename = "Production.xlsx") => {
            if (!items.length) {
                showError("No production records to export");
                return false;
            }

            XLSX.writeFile(buildProductionExcel(items), filename);

            return true;
        },
        [buildProductionExcel],
    );

    const handleExportExcel = useCallback(async () => {
        try {
            toast.loading("Preparing Excel export...", {
                id: "production-export",
            });

            const items = await getProductionReportRows();

            if (!items.length) {
                showError("No production records to export", "production-export");
                return;
            }

            downloadProductionExcel(items);

            showSuccess(
                `${items.length} production record(s) exported.`,
                "production-export",
            );
        } catch (error) {
            console.error("PRODUCTION EXPORT ERROR:", error);
            showError(error.message);
        }
    }, [getProductionReportRows, downloadProductionExcel]);

    // ===================================================
    // PRINT
    // ===================================================

    const handlePrintProductions = useCallback(async () => {
        try {
            const items = await getProductionReportRows();

            if (!items.length) {
                showError("No production records to print");
                return;
            }

            const rows = items
                .map(
                    (item) => `
                        <tr>
                            <td>${escapeHtml(formatDate(item.productionDate))}</td>
                            <td>${escapeHtml(getShiftName(item))}</td>
                            <td>${escapeHtml(getMachineName(item))}</td>
                            <td>${escapeHtml(getItemName(item))}</td>
                            <td>${escapeHtml(item.productionQuantity ?? "-")}</td>
                            <td>${escapeHtml(item.remarks || "-")}</td>
                            <td>${escapeHtml(formatDate(item.createdAt))}</td>
                            <td>${escapeHtml(item.createdByName || "-")}</td>
                            <td>${escapeHtml(formatDate(item.updatedAt))}</td>
                            <td>${escapeHtml(item.updatedByName || "-")}</td>
                        </tr>
                `,
                )
                .join("");

            const printWindow = window.open(
                "",
                "_blank",
                "width=1400,height=800",
            );

            if (!printWindow) {
                showError("Please allow pop-ups to print the report");
                return;
            }

            printWindow.document.write(`
                <!doctype html>
                <html>
                    <head>
                        <title>Production Report</title>
                        <meta charset="utf-8">
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                padding: 24px;
                                color: #222;
                            }
                            h1 { font-size: 22px; }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                            }
                            th, td {
                                border: 1px solid #ccc;
                                padding: 8px;
                                text-align: left;
                                font-size: 10px;
                            }
                            th { background: #f2f2f2; }
                            tr { break-inside: avoid; }
                            @media print {
                                body { padding: 0; }
                            }
                        </style>
                    </head>
                    <body>
                        <h1>Production Report</h1>
                        <p>Generated: ${escapeHtml(new Date().toLocaleString())}</p>
                        <p>Total records: ${items.length}</p>

                        <table>
                            <thead>
                                <tr>
                                    <th>Production Date</th>
                                    <th>Shift</th>
                                    <th>Machine</th>
                                    <th>Item</th>
                                    <th>Production Quantity</th>
                                    <th>Remark</th>
                                    <th>Created Date</th>
                                    <th>Created By</th>
                                    <th>Updated Date</th>
                                    <th>Updated By</th>
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
            console.error("PRODUCTION PRINT ERROR:", error);
            showError(error.message);
        }
    }, [getProductionReportRows]);

    // ===================================================
    // SEARCH
    // ===================================================

    const handleSearch = useCallback(
        (event) => {
            event?.preventDefault();

            setPagination((prev) => ({
                ...prev,
                pageIndex: 0,
            }));

            setSearchQuery(searchInput.trim());
        },
        [searchInput],
    );

    // ===================================================
    // FILTER RESET AND SELECTION RESET
    // ===================================================

    useEffect(() => {
        setPagination((prev) =>
            prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
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

    // ===================================================
    // SINGLE DELETE
    // ===================================================

    // ===================================================
    // SINGLE DELETE
    // ===================================================

    const handleDelete = useCallback(
        (item) => {
            if (!canDelete) {
                showError("You do not have permission to delete production records.");
                return;
            }

            if (!item?.id) {
                showError("Invalid production record.");
                return;
            }

            setSelectedProduction(item);
            setDeleteDialogOpen(true);
        },
        [canDelete],
    );

    const handleDeleteConfirm = useCallback(async () => {
        if (!selectedProduction?.id || deleteLoading) {
            return;
        }

        try {
            setDeleteLoading(true);

            const response = await apiFetch("/api/production", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: selectedProduction.id,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to delete production.");
            }

            showSuccess("Production record deleted successfully.");

            await createProductionNotification({
                action: "deleted",
                title: "Production Deleted",
                message: `Production record for ${getItemName(selectedProduction)} has been deleted.`,
                productionId: selectedProduction.id,
                entityName: getItemName(selectedProduction),
            });

            setSelectedIds((prev) =>
                prev.filter(
                    (id) => id !== String(selectedProduction.id),
                ),
            );

            setDeleteDialogOpen(false);
            setSelectedProduction(null);

            await refreshProductions();
        } catch (error) {
            console.error("PRODUCTION DELETE ERROR:", error);
            showError(error.message || "Failed to delete production.");
        } finally {
            setDeleteLoading(false);
        }
    }, [
        selectedProduction,
        deleteLoading,
        refreshProductions,
    ]);

    // =======================================================
    // COPY PRODUCTION
    // =======================================================

    const handleCopyProduction = useCallback((item) => {
        if (!item?.id) {
            showError("Invalid production record.");
            return;
        }

        setCopySourceItem(item);

        // Keep the original production date as the default,
        // using the same date format as ProductionAddDialog.
        setCopyProductionDate(
            getCopyProductionDate(item.productionDate)
        );

        setCopyDialogOpen(true);
    }, []);

    const handleConfirmCopyProduction = useCallback(async () => {
        if (!copySourceItem?.id || copyLoading) {
            return;
        }

        // Validate production date.
        if (!copyProductionDate) {
            showError("Please select a production date.");
            return;
        }

        // Validate source item.
        const itemId =
            copySourceItem.itemId ||
            copySourceItem.item?.id ||
            copySourceItem.ItemMasterid ||
            "";

        if (!itemId) {
            showError("Item is missing. Cannot copy this production record.");
            return;
        }

        if (!getItemName(copySourceItem) || getItemName(copySourceItem) === "-") {
            showError("Invalid item. Please check the original production record.");
            return;
        }

        // Validate machine.
        const machineId =
            copySourceItem.machineId ||
            copySourceItem.machine?.id ||
            "";

        if (!machineId) {
            showError("Machine is missing. Cannot copy this production record.");
            return;
        }

        // Validate shift.
        const shiftId =
            copySourceItem.shiftId ||
            copySourceItem.shift?.id ||
            "";

        if (!shiftId) {
            showError("Shift is missing. Cannot copy this production record.");
            return;
        }

        // Validate quantity.
        const quantity = Number(copySourceItem.productionQuantity ?? 0);

        if (!Number.isFinite(quantity) || quantity < 0) {
            showError("Invalid production quantity.");
            return;
        }

        // Validate date format.
        const parsedDate = new Date(`${copyProductionDate}T00:00:00`);

        if (
            Number.isNaN(parsedDate.getTime()) ||
            format(parsedDate, "yyyy-MM-dd") !== copyProductionDate
        ) {
            showError("Please select a valid production date.");
            return;
        }

        try {
            setCopyLoading(true);

            const payload = {
                productionDate: copyProductionDate,

                shiftId: String(shiftId),
                machineId: String(machineId),
                itemId: String(itemId),

                productionQuantity: quantity,

                remarks: copySourceItem.remarks || "",

                customFields: copySourceItem.customFields || {},

                status:
                    copySourceItem.status === true ||
                    copySourceItem.status === 1 ||
                    String(copySourceItem.status).toLowerCase() === "true",
            };

            const response = await apiFetch("/api/production", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to copy production."
                );
            }

            const copiedProduction = result.data;

            showSuccess("Production record copied successfully.");

            await createProductionNotification({
                action: "created",
                title: "Production Copied",
                message: `Production record for ${getItemName(copySourceItem)} has been copied successfully.`,
                productionId: copiedProduction?.id,
                entityName: getItemName(copySourceItem),
            });

            setCopyDialogOpen(false);
            setCopySourceItem(null);
            setCopyProductionDate("");

            await refreshProductions();

        } catch (error) {
            console.error("PRODUCTION COPY ERROR:", error);
            showError(error.message || "Failed to copy production.");
        } finally {
            setCopyLoading(false);
        }
    }, [
        copySourceItem,
        copyProductionDate,
        copyLoading,
        refreshProductions,
    ]);

    // ===================================================
    // SINGLE PRODUCTION STATUS
    // ===================================================

    const handleToggleProductionStatus = useCallback(
        async (item) => {
            const nextStatus = !Boolean(item.status);

            try {
                const response = await apiFetch("/api/production", {
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
                    throw new Error(result.message || "Status update failed");
                }

                showSuccess(
                    `${getItemName(item)} marked ${nextStatus ? "active" : "inactive"}`,
                    "production-status",
                );

                await refreshProductions();
            } catch (error) {
                console.error("PRODUCTION STATUS ERROR:", error);
                showError(error.message);
            }
        },
        [refreshProductions],
    );

    // ===================================================
    // BULK STATUS
    // ===================================================

    const handleBulkStatus = useCallback(
        async (status) => {
            if (!selectedIds.length) {
                showError("Select at least one production record");
                return;
            }

            if (!(canManage || canEdit)) {
                showError("You do not have permission to change production status");
                return;
            }

            const idsToUpdate = [...selectedIds];

            try {
                setBulkLoading(true);

                const response = await apiFetch("/api/production", {
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
                        result.message || "Bulk status update failed.",
                    );
                }

                showSuccess(
                    `${result.count ?? idsToUpdate.length} production record(s) marked ${status ? "active" : "inactive"}`,
                    "production-status-update",
                );

                setActiveDialogOpen(false);
                setInactiveDialogOpen(false);
                setSelectedIds([]);

                await refreshProductions();
            } catch (error) {
                console.error("BULK PRODUCTION STATUS ERROR:", error);
                showError(error.message);
            } finally {
                setBulkLoading(false);
            }
        },
        [
            selectedIds,
            canManage,
            canEdit,
            refreshProductions,
        ],
    );

    // ===================================================
    // BULK DELETE
    // ===================================================

    const handleBulkDelete = useCallback(() => {
        if (!selectedIds.length) {
            showError("Select at least one production record");
            return;
        }

        if (!canDelete) {
            showError("You do not have permission to delete production records");
            return;
        }

        setBulkDeleteDialogOpen(true);
    }, [selectedIds, canDelete]);

    const handleConfirmBulkDelete = useCallback(async () => {
        if (!selectedIds.length || bulkLoading) return;

        const idsToDelete = [...selectedIds];

        try {
            setBulkLoading(true);

            const response = await apiFetch("/api/production", {
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
                throw new Error(result.message || "Bulk delete failed.");
            }

            showSuccess(
                `${result.count ?? idsToDelete.length} production record(s) deleted`,
                "production-delete",
            );

            setBulkDeleteDialogOpen(false);
            setSelectedIds([]);

            await refreshProductions();
        } catch (error) {
            console.error("BULK PRODUCTION DELETE ERROR:", error);
            showError(error.message);
        } finally {
            setBulkLoading(false);
        }
    }, [
        selectedIds,
        bulkLoading,
        refreshProductions,
    ]);

    // ===================================================
    // EMAIL DIALOG
    // ===================================================

    const handleOpenEmailDialog = useCallback(() => {
        setSelectedRecipientEmails([]);
        setAttachExcel(true);

        setEmailSubject("Production Report");

        setEmailMessage(
            [
                "Dear Team,",
                "",
                "Please find the Production report for your review.",
                "",
                "The report includes production details, production date, shift, machine, item, unit, quantities, and status.",
                "",
                "Please review the information and let us know if any corrections are required.",
                "",
                "Regards,",
                "Production Management Team",
            ].join("\n"),
        );

        setEmailDialogOpen(true);
    }, []);

    // ===================================================
    // REPORT BUTTON EVENTS
    // ===================================================

    useEffect(() => {
        const handleReportButtonClick = (event) => {
            if (!(event.target instanceof Element)) return;

            const button = event.target.closest("#Print, #Export, #Email");

            if (!button) return;

            if (!window.location.pathname.includes("/production")) {
                return;
            }

            switch (button.id) {
                case "Print":
                    event.preventDefault();
                    void handlePrintProductions();
                    break;

                case "Export":
                    event.preventDefault();
                    void handleExportExcel();
                    break;

                case "Email":
                    event.preventDefault();
                    handleOpenEmailDialog();
                    break;

                default:
                    break;
            }
        };

        document.addEventListener("click", handleReportButtonClick);

        return () => {
            document.removeEventListener("click", handleReportButtonClick);
        };
    }, [
        handlePrintProductions,
        handleExportExcel,
        handleOpenEmailDialog,
    ]);

    // ===================================================
    // SEND EMAIL
    // ===================================================

    const handleSendEmail = useCallback(async () => {
        if (!selectedRecipientEmails.length) {
            showError("Please select at least one recipient.");
            return;
        }

        if (!emailSubject.trim() || !emailMessage.trim()) {
            showError("Please enter the email subject and message.");
            return;
        }

        try {
            setEmailSending(true);

            const response = await fetch(
                "/api/production/email-report",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        recipients: selectedRecipientEmails,
                        subject: emailSubject.trim(),
                        message: emailMessage.trim(),
                        attachExcel,
                        selectedIds,
                        filters: {
                            query: searchQuery,
                            status: statusFilter,
                            createdFrom,
                            createdTo,
                            updatedFrom,
                            updatedTo,
                            createdBy: createdByFilter,
                            updatedBy: updatedByFilter,
                        },
                    }),
                },
            );

            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.error || result.message || "Failed to send email.",
                );
            }

            showSuccess(
                attachExcel
                    ? "Email sent successfully with the Excel attachment."
                    : "Email sent successfully.",
                "production-email",
            );

            setEmailDialogOpen(false);
        } catch (error) {
            console.error("PRODUCTION EMAIL ERROR:", error);
            showError(error.message);
        } finally {
            setEmailSending(false);
        }
    }, [
        selectedRecipientEmails,
        emailSubject,
        emailMessage,
        attachExcel,
        selectedIds,
        searchQuery,
        statusFilter,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        createdByFilter,
        updatedByFilter,
    ]);

    // ===================================================
    // LOAD STAFF
    // ===================================================

    useEffect(() => {
        if (!emailDialogOpen) return;

        let cancelled = false;

        const loadStaff = async () => {
            try {
                setStaffLoading(true);

                const response = await apiFetch("/api/staff?limit=10000");
                const result = await response.json();

                if (!response.ok || result.success === false) {
                    throw new Error(result.message || "Failed to load staff");
                }

                const staff = Array.isArray(result)
                    ? result
                    : Array.isArray(result.data)
                        ? result.data
                        : Array.isArray(result.data?.staff)
                            ? result.data.staff
                            : [];

                if (!cancelled) {
                    setStaffList(
                        staff
                            .map((person) => ({
                                id: person.id,
                                name:
                                    person.name ||
                                    person.fullName ||
                                    [person.firstName, person.lastName]
                                        .filter(Boolean)
                                        .join(" ") ||
                                    person.username ||
                                    person.email ||
                                    "Staff member",
                                email: person.email || person.workEmail || "",
                            }))
                            .filter((person) => person.email),
                    );
                }
            } catch (error) {
                console.error("STAFF RECIPIENT LOAD ERROR:", error);

                if (!cancelled) {
                    setStaffList([]);
                    showError(error.message);
                }
            } finally {
                if (!cancelled) {
                    setStaffLoading(false);
                }
            }
        };

        void loadStaff();

        return () => {
            cancelled = true;
        };
    }, [emailDialogOpen]);

    // ===================================================
    // ONLINE / OFFLINE
    // ===================================================

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);

            await checkDbStatus();
            await refreshProductions();
        };

        const handleOffline = () => {
            setIsOnline(false);

            setDbStatus((prev) => ({
                ...prev,
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
        refreshProductions,
    ]);

    useEffect(() => {
        void checkDbStatus();

        const interval = setInterval(
            () => void checkDbStatus(),
            30000,
        );

        return () => clearInterval(interval);
    }, [checkDbStatus]);

    // ===================================================
    // TABLE COLUMNS
    // ===================================================

    const columns = useMemo(
        () => [
            {
                id: "select",

                header: () => (
                    <Checkbox
                        aria-label="Select all rows on this page"
                        checked={allCurrentPageSelected}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={toggleCurrentPageSelection}
                        disabled={!productions.length || bulkLoading}
                    />
                ),

                cell: ({ row }) => {
                    const item = row.original;
                    const id = String(item.id);

                    return (
                        <Checkbox
                            aria-label={`Select production ${item.id}`}
                            checked={selectedIds.includes(id)}
                            onClick={(event) => event.stopPropagation()}
                            onCheckedChange={() => toggleRowSelection(id)}
                            disabled={bulkLoading}
                        />
                    );
                },

                size: 48,
                enableSorting: false,
                enableHiding: false,
            },

            {
                accessorKey: "id",
                id: "id",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="ID"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span>
                        #{String(row.original.id).substring(0, 8)}
                    </span>
                ),

                size: 120,
            },

            {
                accessorKey: "productionDate",
                id: "productionDate",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Production Date"
                        column={column}
                        visibility
                    />
                ),
                meta: {
                    headerTitle: "Production Date",
                },

                cell: ({ row }) =>
                    formatDate(row.original.productionDate),

                size: 160,
            },

            {
                accessorKey: "shiftName",
                id: "shiftName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Shift"
                        column={column}
                        visibility
                    />
                ),
                meta: {
                    headerTitle: "Shift",
                },

                cell: ({ row }) => getShiftName(row.original),

                size: 140,
                // enableSorting: false,
            },

            {
                accessorKey: "machineName",
                id: "machineName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Machine"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <div>
                        <p>{getMachineName(row.original)}</p>
                    </div>
                ),
                meta: {
                    headerTitle: "Machine",
                },

                size: 180,
                // enableSorting: false,
            },

            {
                accessorKey: "itemName",
                id: "itemName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Item"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <div>
                        <p>{getItemName(row.original)}</p>
                    </div>
                ),
                meta: {
                    headerTitle: "Item",
                },

                size: 200,
                // enableSorting: false,
            },


            {
                accessorKey: "productionQuantity",
                id: "productionQuantity",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Production Quantity"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) =>
                    row.original.productionQuantity ?? "-",

                meta: {
                    headerTitle: "Production Quantity",
                },
                size: 180,
            },

            {
                accessorKey: "remarks",
                id: "remarks",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Remarks"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span>{row.original.remarks || "-"}</span>
                ),

                size: 220,
                // enableSorting: false,
            },

            {
                accessorKey: "status",
                id: "status",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Status"
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
                        {row.original.status ? "Active" : "Inactive"}
                    </span>
                ),

                size: 110,
            },

            {
                accessorKey: "createdAt",
                id: "createdAt",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Created Date"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) =>
                    formatDate(row.original?.createdAt),

                size: 150,
                enableSorting: true,

                meta: {
                    headerTitle: "Created Date",
                    skeleton: <Skeleton className="h-7 w-24" />,
                },
            },

            {
                accessorKey: "createdByName",
                id: "createdByName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Created By"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) =>
                    <span>{row.original.createdByName || "-"}</span>,

                size: 180,
                enableSorting: false,

                meta: {
                    headerTitle: "Created By",
                    skeleton: <Skeleton className="h-7 w-24" />,
                },
            },

            {
                accessorKey: "updatedAt",
                id: "updatedAt",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Updated Date"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) =>
                    formatDate(row.original?.updatedAt),

                size: 150,
                enableSorting: true,

                meta: {
                    headerTitle: "Updated Date",
                    skeleton: <Skeleton className="h-7 w-24" />,
                },
            },

            {
                accessorKey: "updatedByName",
                id: "updatedByName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Updated By"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) =>
                    <span>{row.original.updatedByName || "-"}</span>,

                size: 180,
                enableSorting: false,

                meta: {
                    headerTitle: "Updated By",
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
                                    aria-label={`Actions for production ${item.id}`}
                                >
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                                {canView && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedProduction(item);
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
                                            setSelectedProduction(item);
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
                                            void handleCopyProduction(item)
                                        }
                                    >
                                        <Copy className="mr-2 size-4" />
                                        Copy
                                    </DropdownMenuItem>
                                )}

                                {(canManage || canEdit) && (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            void handleToggleProductionStatus(item)
                                        }
                                    >
                                        {item.status ? (
                                            <XCircle className="mr-2 size-4" />
                                        ) : (
                                            <CheckCircle className="mr-2 size-4" />
                                        )}
                                        Mark {item.status ? "Inactive" : "Active"}
                                    </DropdownMenuItem>
                                )}

                                {canDelete && (
                                    <>
                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={() => handleDelete(item)}
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
            productions,
            selectedIds,
            bulkLoading,
            toggleCurrentPageSelection,
            toggleRowSelection,
            canView,
            canEdit,
            canManage,
            canDelete,
            handleCopyProduction,
            handleToggleProductionStatus,
            handleDelete,
        ],
    );

    // ===================================================
    // TABLE
    // ===================================================

    const table = useReactTable({
        columns,
        data: productions,

        pageCount: Math.ceil(totalRecords / pagination.pageSize),

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

    // ===================================================
    // TOOLBAR
    // ===================================================

    const renderToolbar = () => (
        <CardHeader className="flex-col flex-wrap items-stretch gap-3 py-5 sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative flex-1 sm:w-[250px] sm:flex-none">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                        type="text"
                        placeholder="Search production"
                        value={searchInput}
                        onChange={(event) =>
                            setSearchInput(event.target.value)
                        }
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                handleSearch(event);
                            }
                        }}
                        className="w-full pl-9 pr-9"
                        autoComplete="off"
                    />

                    {searchInput.length > 0 && (
                        <button
                            type="button"
                            aria-label="Clear search input"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                                setSearchInput("");
                                setSearchQuery("");

                                setPagination((prev) => ({
                                    ...prev,
                                    pageIndex: 0,
                                }));
                            }}
                        >
                            <X className="size-4" />
                        </button>
                    )}
                </div>

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
                        <p>
                            Search by item name, machine name, or remarks.
                        </p>
                    </TooltipContent>
                </Tooltip>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
                {selectedIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
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
                                    {selectedIds.length} Mark Active
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
                                    {selectedIds.length} Mark Inactive
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
                    </div>
                )}

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
                                    .replace(/\b\w/g, (char) =>
                                        char.toUpperCase(),
                                    )
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
                        aria-label="Refresh database connection status"
                    >
                        <RefreshCw
                            className={`size-4 ${checkingDb ? "animate-spin" : ""
                                }`}
                        />
                    </Button>
                </div>

                {canManage && (
                    <Button
                        type="button"
                        onClick={() => setAddDialogOpen(true)}
                    >
                        <Plus className="mr-2 size-4" />
                        Add Production
                    </Button>
                )}

                <ProductionClientFiltersSheet
                    trigger={
                        <Button type="button" variant="outline">
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
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    handleSearch={handleSearch}
                />
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Settings2 className="size-3.5!" />
                            Columns
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-[200px]">
                        {table.getAllLeafColumns()
                            .filter((column) => column.getCanHide())
                            .map((column) => (
                                <DropdownMenuCheckboxItem
                                    key={column.id}
                                    checked={column.getIsVisible()}
                                    onCheckedChange={(value) =>
                                        column.toggleVisibility(!!value)
                                    }
                                    onSelect={(event) => event.preventDefault()}
                                >
                                    {{
                                        id: "ID",
                                        productionDate: "Production Date",
                                        shiftName: "Shift",
                                        machineName: "Machine",
                                        itemName: "Item",
                                        productionQuantity: "Production Quantity",
                                        remarks: "Remarks",
                                        status: "Status",
                                        createdAt: "Created Date",
                                        createdByName: "Created By",
                                        updatedAt: "Updated Date",
                                        updatedByName: "Updated By",
                                        actions: "Actions",
                                    }[column.id] || column.id}
                                </DropdownMenuCheckboxItem>
                            ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
    );

    // ===================================================
    // ACCESS DENIED
    // ===================================================

    if (!canView) {
        return (
            <Card>
                <CardHeader>
                    <div>
                        <h3 className="text-lg font-semibold">
                            Access Denied
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                            You do not have permission to view Production.
                        </p>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    // ===================================================
    // RENDER
    // ===================================================

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

            {/* ADD PRODUCTION */}
            <ProductionAddDialog
                open={addDialogOpen}
                closeDialog={() => setAddDialogOpen(false)}
                onSuccess={async (newProduction) => {
                    setAddDialogOpen(false);

                    const itemName = getItemName(newProduction);

                    await createProductionNotification({
                        action: "created",
                        title: "New Production Created",
                        message: `Production record for ${itemName} has been created.`,
                        productionId: newProduction?.id,
                        entityName: itemName,
                    });

                    await refreshProductions();
                }}
            />

            {/* VIEW PRODUCTION */}
            <ProductionViewDialog
                open={viewDialogOpen}
                Production={selectedProduction}
                closeDialog={() => {
                    setViewDialogOpen(false);
                    setSelectedProduction(null);
                }}
            />

            {/* EDIT PRODUCTION */}
            <ProductionEditDialog
                open={editDialogOpen}
                Production={selectedProduction}
                closeDialog={() => {
                    setEditDialogOpen(false);
                    setSelectedProduction(null);
                }}
                onSuccess={async (updatedProduction) => {
                    const itemName = getItemName(
                        updatedProduction || selectedProduction,
                    );

                    await createProductionNotification({
                        action: "updated",
                        title: "Production Updated",
                        message: `Production record for ${itemName} has been updated.`,
                        productionId:
                            updatedProduction?.id || selectedProduction?.id,
                        entityName: itemName,
                    });

                    setEditDialogOpen(false);
                    setSelectedProduction(null);

                    await refreshProductions();
                }}
            />



            {/* SINGLE DELETE PRODUCTION */}
            <ProductionDeleteDialog
                open={deleteDialogOpen}
                Production={selectedProduction}
                selectedCount={selectedProduction ? 1 : 0}
                onOpenChange={(open) => {
                    if (deleteLoading) return;

                    setDeleteDialogOpen(open);

                    if (!open) {
                        setSelectedProduction(null);
                    }
                }}
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
            />


            {/* COPY PRODUCTION */}
            <Dialog
                open={copyDialogOpen}
                onOpenChange={(open) => {
                    if (copyLoading) return;

                    setCopyDialogOpen(open);

                    if (!open) {
                        setCopySourceItem(null);
                        setCopyProductionDate("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Copy Production</DialogTitle>

                        <DialogDescription>
                            Select a production date. All other details will be
                            copied from the original production record.
                        </DialogDescription>
                    </DialogHeader>

                    {copySourceItem && (
                        <div className="space-y-4">

                            {/* PRODUCTION DATE - SAME AS ADD DIALOG */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Select Date{" "}
                                    <span className="text-destructive">*</span>
                                </label>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            disabled={copyLoading}
                                            className="w-full justify-between font-normal"
                                        >
                                            {copyProductionDate
                                                ? format(
                                                    new Date(
                                                        `${copyProductionDate}T00:00:00`
                                                    ),
                                                    "MM/dd/yyyy"
                                                )
                                                : "MM/DD/YYYY"}

                                            <CalendarIcon className="size-4 text-muted-foreground" />
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={
                                                copyProductionDate
                                                    ? new Date(
                                                        `${copyProductionDate}T00:00:00`
                                                    )
                                                    : undefined
                                            }
                                            onSelect={(date) =>
                                                setCopyProductionDate(
                                                    date
                                                        ? format(date, "yyyy-MM-dd")
                                                        : ""
                                                )
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>

                                {!copyProductionDate && (
                                    <p className="mt-1 text-xs text-destructive">
                                        Production date is required.
                                    </p>
                                )}
                            </div>

                            {/* ORIGINAL PRODUCTION DETAILS */}

                            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">

                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-muted-foreground">
                                        Original Date
                                    </span>

                                    <span className="text-sm font-medium">
                                        {formatDate(copySourceItem.productionDate)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-muted-foreground">
                                        Shift
                                    </span>

                                    <span className="text-right text-sm font-medium">
                                        {getShiftName(copySourceItem)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-muted-foreground">
                                        Machine
                                    </span>

                                    <span className="text-right text-sm font-medium">
                                        {getMachineName(copySourceItem)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-muted-foreground">
                                        Item
                                    </span>

                                    <span className="text-right text-sm font-medium">
                                        {getItemName(copySourceItem)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-muted-foreground">
                                        Production Quantity
                                    </span>

                                    <span className="text-sm font-medium">
                                        {copySourceItem.productionQuantity ?? 0}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-muted-foreground">
                                        Status
                                    </span>

                                    <span className="text-sm font-medium">
                                        {copySourceItem.status === true ||
                                            copySourceItem.status === 1 ||
                                            String(copySourceItem.status).toLowerCase() === "true"
                                            ? "Active"
                                            : "Inactive"}
                                    </span>
                                </div>

                                {copySourceItem.remarks && (
                                    <div className="space-y-1 border-t pt-3">
                                        <span className="text-sm text-muted-foreground">
                                            Remarks
                                        </span>

                                        <p className="text-sm font-medium">
                                            {copySourceItem.remarks}
                                        </p>
                                    </div>
                                )}
                            </div>

                            <p className="text-xs text-muted-foreground">
                                Only the production date can be changed.
                                Shift, machine, item, quantity, remarks,
                                custom fields and status will remain the same.
                            </p>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                if (copyLoading) return;

                                setCopyDialogOpen(false);
                                setCopySourceItem(null);
                                setCopyProductionDate("");
                            }}
                            disabled={copyLoading}
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            onClick={handleConfirmCopyProduction}
                            disabled={
                                copyLoading ||
                                !copySourceItem ||
                                !copyProductionDate
                            }
                        >
                            <Copy className="mr-2 size-4" />

                            {copyLoading ? "Copying..." : "Copy Production"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* BULK ACTIVE */}
            <ProductionActiveDialog
                open={activeDialogOpen}
                onOpenChange={setActiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() => handleBulkStatus(true)}
            />

            {/* BULK INACTIVE */}
            <ProductionInactiveDialog
                open={inactiveDialogOpen}
                onOpenChange={setInactiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() => handleBulkStatus(false)}
            />

            {/* BULK DELETE */}
            <ProductionDeleteBulkDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={setBulkDeleteDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={handleConfirmBulkDelete}
            />

            {/* EMAIL REPORT */}
            <Dialog
                open={emailDialogOpen}
                onOpenChange={setEmailDialogOpen}
            >
                <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] flex flex-col gap-0 overflow-hidden sm:w-[90vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px] p-0">
                    <form
                        className="flex h-full max-h-[90vh] flex-col overflow-hidden"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleSendEmail();
                        }}
                    >
                        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
                            <DialogTitle>Email Production Report</DialogTitle>

                            <DialogDescription>
                                Select recipients and send the Production report.
                            </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
                            <DialogBody className="space-y-6 px-6 min-h-0">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-sm font-medium">
                                        Recipient Email
                                    </label>

                                    <span className="text-xs text-muted-foreground">
                                        {selectedRecipientEmails.length} of{" "}
                                        {staffList.length} selected
                                    </span>
                                </div>

                                {selectedRecipientEmails.length > 0 && (
                                    <div className="rounded-lg border bg-muted/30 p-3">
                                        <div className="mb-2 flex items-center justify-between">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Selected recipients
                                            </p>

                                            <button
                                                type="button"
                                                className="text-xs text-muted-foreground hover:text-foreground"
                                                onClick={() =>
                                                    setSelectedRecipientEmails([])
                                                }
                                            >
                                                Clear all
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {selectedRecipientEmails.map((email) => {
                                                const person = staffList.find(
                                                    (staff) => staff.email === email,
                                                );

                                                return (
                                                    <span
                                                        key={email}
                                                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs"
                                                    >
                                                        <span className="max-w-[220px] truncate">
                                                            {person?.name || email}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            aria-label={`Remove ${email}`}
                                                            className="rounded-full text-muted-foreground hover:text-destructive"
                                                            onClick={() =>
                                                                setSelectedRecipientEmails(
                                                                    (previous) =>
                                                                        previous.filter(
                                                                            (item) => item !== email,
                                                                        ),
                                                                )
                                                            }
                                                        >
                                                            <X className="size-3.5" />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                <div className="overflow-hidden rounded-lg border">
                                    <div className="border-b bg-muted/30 p-2">
                                        <label className="flex cursor-pointer items-center gap-2">
                                            <Checkbox
                                                checked={
                                                    staffList.length > 0 &&
                                                    staffList.every((person) =>
                                                        selectedRecipientEmails.includes(
                                                            person.email,
                                                        ),
                                                    )
                                                }
                                                disabled={
                                                    staffLoading ||
                                                    staffList.length === 0
                                                }
                                                onCheckedChange={(checked) => {
                                                    setSelectedRecipientEmails(
                                                        (previous) =>
                                                            checked === true
                                                                ? [
                                                                    ...new Set([
                                                                        ...previous,
                                                                        ...staffList.map(
                                                                            (person) => person.email,
                                                                        ),
                                                                    ]),
                                                                ]
                                                                : previous.filter(
                                                                    (email) =>
                                                                        !staffList.some(
                                                                            (person) =>
                                                                                person.email === email,
                                                                        ),
                                                                ),
                                                    );
                                                }}
                                            />

                                            <span className="text-sm font-medium">
                                                Select all staff
                                            </span>
                                        </label>
                                    </div>

                                    <ScrollArea className="max-h-52">
                                        <div className="p-2">
                                            {staffLoading ? (
                                                <p className="p-3 text-sm text-muted-foreground">
                                                    Loading staff...
                                                </p>
                                            ) : staffList.length === 0 ? (
                                                <p className="p-3 text-sm text-muted-foreground">
                                                    No staff email addresses found.
                                                </p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {staffList.map((person) => {
                                                        const isSelected =
                                                            selectedRecipientEmails.includes(
                                                                person.email,
                                                            );

                                                        return (
                                                            <label
                                                                key={`${person.id}-${person.email}`}
                                                                className="flex cursor-pointer items-start gap-3 rounded-md p-2.5 transition-colors hover:bg-muted/60"
                                                            >
                                                                <Checkbox
                                                                    className="mt-0.5"
                                                                    checked={isSelected}
                                                                    onCheckedChange={(checked) => {
                                                                        setSelectedRecipientEmails(
                                                                            (previous) =>
                                                                                checked === true
                                                                                    ? [
                                                                                        ...new Set([
                                                                                            ...previous,
                                                                                            person.email,
                                                                                        ]),
                                                                                    ]
                                                                                    : previous.filter(
                                                                                        (email) =>
                                                                                            email !== person.email,
                                                                                    ),
                                                                        );
                                                                    }}
                                                                />

                                                                <span className="min-w-0 flex-1">
                                                                    <span className="block truncate text-sm font-medium">
                                                                        {person.name}
                                                                    </span>

                                                                    <span className="block break-all text-xs text-muted-foreground">
                                                                        {person.email}
                                                                    </span>
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="production-subject"
                                        className="text-sm font-medium"
                                    >
                                        Subject
                                    </label>

                                    <Input
                                        id="production-subject"
                                        required
                                        value={emailSubject}
                                        onChange={(event) =>
                                            setEmailSubject(event.target.value)
                                        }
                                        placeholder="Production Report"
                                    />
                                </div>

                                <div className="rounded-lg border p-3 transition-colors hover:bg-muted/30">
                                    <label className="flex cursor-pointer items-start gap-3">
                                        <Checkbox
                                            className="mt-0.5"
                                            checked={attachExcel}
                                            onCheckedChange={(checked) =>
                                                setAttachExcel(checked === true)
                                            }
                                        />

                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium">
                                                Add Excel attachment
                                            </span>

                                            <span className="mt-1 block text-xs text-muted-foreground">
                                                Attach the production report as an Excel file (.xlsx).
                                            </span>
                                        </span>

                                        <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                                    </label>
                                </div>

                                <div className="space-y-2">
                                    <label
                                        htmlFor="production-message"
                                        className="text-sm font-medium"
                                    >
                                        Message
                                    </label>

                                    <Textarea
                                        id="production-message"
                                        required
                                        rows={5}
                                        value={emailMessage}
                                        onChange={(event) =>
                                            setEmailMessage(event.target.value)
                                        }
                                        placeholder="Enter your email message..."
                                    />
                                </div>
                            </DialogBody>

                            <DialogFooter className="gap-2 px-6 pb-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setEmailDialogOpen(false)}
                                    disabled={emailSending}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    disabled={
                                        emailSending ||
                                        staffLoading ||
                                        selectedRecipientEmails.length === 0
                                    }
                                >
                                    <Mail className="mr-2 size-4" />
                                    {emailSending
                                        ? "Sending Email..."
                                        : "Send Email"}
                                </Button>
                            </DialogFooter>
                        </ScrollArea>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default ProductionList;
