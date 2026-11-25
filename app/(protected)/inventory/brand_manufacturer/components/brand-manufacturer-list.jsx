
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import * as XLSX from "xlsx";
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
    Settings2,
    X,
    FileSpreadsheet,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RiCheckboxCircleFill } from "@remixicon/react";

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
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
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
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import BrandManufacturerAddDialog from "./brand-manufacturer-add-dialog";
import BrandManufacturerEditDialog from "./brand-manufacturer-edit-dialog";
import BrandManufacturerViewDialog from "./brand-manufacturer-view-dialog";
import BrandManufacturerDeleteDialog from "./brand-manufacturer-delete-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";
import BrandManufacturersActiveDialog from "./brand-manufacturers-active-dialog";
import BrandManufacturersInactiveDialog from "./brand-manufacturers-inactive-dialog";
import BrandManufacturersDeleteDialog from "./brand-manufacturers-delete-dialog";

const API_URL = "/api/inventory/brand_manufacturer";
const QUERY_KEY = "brand-manufacturer";

const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "-"
        : date.toLocaleDateString();
};

const getBrandManufacturerName = (item) => {
    if (!item) return "Brand/Manufacturer";

    return [item.brandName, item.manufacturerName]
        .filter(Boolean)
        .join(" / ") || "Brand/Manufacturer";
};

const showSuccessToast = (message, id) => {
    toast.custom(
        () => (
            <Alert variant="mono" icon="success" close={false}>
                <AlertIcon>
                    <RiCheckboxCircleFill />
                </AlertIcon>
                <AlertTitle>{message}</AlertTitle>
            </Alert>
        ),
        {
            id,
            position: "top-center",
        },
    );
};

const showErrorToast = (message, id) => {
    toast.custom(
        () => (
            <Alert variant="mono" icon="error" close={false}>
                <AlertIcon>
                    <RiCheckboxCircleFill />
                </AlertIcon>
                <AlertTitle>{message}</AlertTitle>
            </Alert>
        ),
        {
            id,
            position: "top-center",
        },
    );
};

const createBrandManufacturerNotification = async ({
    action,
    title,
    message,
    brandManufacturerId = null,
    brandManufacturerName = null,
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
                    brandManufacturerId !== null &&
                        brandManufacturerId !== undefined
                        ? String(brandManufacturerId)
                        : null,
                entityType: "brand_manufacturer",
                entityName:
                    brandManufacturerName || "Brand/Manufacturer",
                url: "/inventory/brand_manufacturer",
            }),
            cache: "no-store",
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result?.success) {
            throw new Error(
                result?.message || "Notification failed",
            );
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
        console.error(
            "BRAND/MANUFACTURER NOTIFICATION ERROR",
            error,
        );

        return null;
    }
};

const BrandManufacturerList = () => {
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user?.permissions || [],
        [session?.user?.permissions],
    );

    // Update these permission keys if your permission master uses different keys.
    const canView = can(
        "manufacturer.view",
        userPermissions,
    );

    const canManage = can(
        "manufacturer.manage",
        userPermissions,
    );

    const canEdit = can(
        "manufacturer.edit",
        userPermissions,
    );

    const canDelete = can(
        "manufacturer.delete",
        userPermissions,
    );

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

    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const [statusFilter, setStatusFilter] = useState("all");

    const [createdFrom, setCreatedFrom] = useState("");
    const [createdTo, setCreatedTo] = useState("");

    const [updatedFrom, setUpdatedFrom] = useState("");
    const [updatedTo, setUpdatedTo] = useState("");

    const [createdByFilter, setCreatedByFilter] = useState("");
    const [updatedByFilter, setUpdatedByFilter] = useState("");

    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);

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

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [
        selectedBrandManufacturers,
        setSelectedBrandManufacturers,
    ] = useState(null);

    const [deleteLoading, setDeleteLoading] = useState(false);

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");

    const [staffList, setStaffList] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);

    const [
        selectedRecipientEmails,
        setSelectedRecipientEmails,
    ] = useState([]);

    const [attachExcel, setAttachExcel] = useState(true);
    const [emailSending, setEmailSending] = useState(false);

    const [activeDialogOpen, setActiveDialogOpen] = useState(false);
    const [inactiveDialogOpen, setInactiveDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [copySourceItem, setCopySourceItem] = useState(null);

    const [copyBrandName, setCopyBrandName] = useState("");
    const [copyManufacturerName, setCopyManufacturerName] = useState("");
    const [copyWebsiteURL, setCopyWebsiteURL] = useState("");
    const [copyDescription, setCopyDescription] = useState("");

    const [copyLoading, setCopyLoading] = useState(false);

    const refreshBrandManufacturers = useCallback(async () => {
        await queryClient.invalidateQueries({
            queryKey: [QUERY_KEY],
        });
    }, [queryClient]);

    const syncInventoryBrandManufacturers = useCallback(async () => {
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
            console.error(
                "BRAND/MANUFACTURER SYNC ERROR",
                error,
            );

            showErrorToast(error.message);

            return null;
        } finally {
            syncingRef.current = false;
            setSyncing(false);
        }
    }, []);

    const checkDbStatus = useCallback(async () => {
        if (
            typeof navigator !== "undefined" &&
            !navigator.onLine
        ) {
            setDbStatus((prev) => ({
                ...prev,
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
            console.error(
                "DATABASE STATUS ERROR",
                error,
            );

            setDbStatus((prev) => ({
                ...prev,
                online: false,
                loading: false,
            }));
        } finally {
            setCheckingDb(false);
        }
    }, []);

    const fetchBrandManufacturers = useCallback(async () => {
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
                result.message ||
                "Failed loading brand/manufacturer",
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
        queryFn: fetchBrandManufacturers,
        staleTime: 0,
    });

    const BrandManufacturers = data?.data || [];

    const totalRecords = Number(
        data?.pagination?.total || 0,
    );

    const currentPageIds = useMemo(
        () =>
            BrandManufacturers.map((item) =>
                String(item.id),
            ),
        [BrandManufacturers],
    );

    const allCurrentPageSelected =
        currentPageIds.length > 0 &&
        currentPageIds.every((id) =>
            selectedIds.includes(id),
        );

    const getBrandManufacturerReportRows = useCallback(
        async () => {
            if (selectedIds.length > 0) {
                const selectedSet = new Set(
                    selectedIds.map(String),
                );

                return BrandManufacturers.filter((item) =>
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
                    result.message ||
                    "Failed to load brand/manufacturer",
                );
            }

            return result.data || [];
        },
        [
            selectedIds,
            BrandManufacturers,
            searchQuery,
            statusFilter,
            createdFrom,
            createdTo,
            updatedFrom,
            updatedTo,
            createdByFilter,
            updatedByFilter,
            sorting,
        ],
    );

    const buildBrandManufacturerExcel = useCallback(
        (items) => {
            const rows = items.map((item) => ({
                ID: item.id || "",

                "Brand Name": item.brandName || "",

                "Manufacturer Name":
                    item.manufacturerName || "",

                Website: item.websiteURL || "",

                Description: item.description || "",

                Status: item.status
                    ? "Active"
                    : "Inactive",

                "Created Date": formatDate(item.createdAt),

                "Created By": item.createdByName || "-",

                "Updated Date": formatDate(item.updatedAt),

                "Updated By": item.updatedByName || "-",
            }));

            const worksheet = XLSX.utils.json_to_sheet(rows);

            worksheet["!cols"] = [
                { wch: 15 },
                { wch: 28 },
                { wch: 30 },
                { wch: 35 },
                { wch: 45 },
                { wch: 14 },
                { wch: 20 },
                { wch: 25 },
                { wch: 20 },
                { wch: 25 },
            ];

            const workbook = XLSX.utils.book_new();

            XLSX.utils.book_append_sheet(
                workbook,
                worksheet,
                "Brand Manufacturer",
            );

            return workbook;
        },
        [],
    );

    const downloadBrandManufacturerExcel = useCallback(
        (
            items,
            filename = "brand-manufacturers.xlsx",
        ) => {
            if (!items.length) {
                toast.error(
                    "No brand/manufacturer records to export",
                );

                return false;
            }

            XLSX.writeFile(
                buildBrandManufacturerExcel(items),
                filename,
            );

            return true;
        },
        [buildBrandManufacturerExcel],
    );

    const handleExportExcel = useCallback(async () => {
        try {
            toast.loading("Preparing Excel export...", {
                id: "brand-manufacturer-export",
            });

            const items =
                await getBrandManufacturerReportRows();

            if (!items.length) {
                toast.error(
                    "No brand/manufacturer records to export",
                    {
                        id: "brand-manufacturer-export",
                    },
                );

                return;
            }

            downloadBrandManufacturerExcel(items);

            showSuccessToast(
                `${items.length} brand/manufacturer record(s) exported.`,
                "brand-manufacturer-export",
            );
        } catch (error) {
            console.error(
                "BRAND/MANUFACTURER EXPORT ERROR",
                error,
            );

            showErrorToast(
                error.message,
                "brand-manufacturer-export",
            );
        }
    }, [
        getBrandManufacturerReportRows,
        downloadBrandManufacturerExcel,
    ]);

    const handlePrintBrandManufacturers = useCallback(
        async () => {
            try {
                const items =
                    await getBrandManufacturerReportRows();

                if (!items.length) {
                    toast.error(
                        "No brand/manufacturer records to print",
                    );

                    return;
                }

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

                const rows = items
                    .map(
                        (item) => `
                            <tr>
                                <td>${escapeHtml(item.id)}</td>
                                <td>${escapeHtml(item.brandName)}</td>
                                <td>${escapeHtml(item.manufacturerName)}</td>
                                <td>${escapeHtml(item.websiteURL || "-")}</td>
                                <td>${escapeHtml(item.description || "-")}</td>
                                <td>${item.status ? "Active" : "Inactive"}</td>
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
                    toast.error(
                        "Please allow pop-ups to print the report",
                    );

                    return;
                }

                printWindow.document.write(`
                    <!doctype html>
                    <html>
                        <head>
                            <title>Brand/Manufacturer Report</title>
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
                                    font-size: 10px;
                                    overflow-wrap: anywhere;
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
                            <h1>Brand/Manufacturer Report</h1>

                            <p>
                                Generated:
                                ${escapeHtml(new Date().toLocaleString())}
                            </p>

                            <p>Total records: ${items.length}</p>

                            <table>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Brand Name</th>
                                        <th>Manufacturer Name</th>
                                        <th>Website</th>
                                        <th>Description</th>
                                        <th>Status</th>
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
                console.error(
                    "BRAND/MANUFACTURER PRINT ERROR",
                    error,
                );

                showErrorToast(error.message);
            }
        },
        [getBrandManufacturerReportRows],
    );

    const handleSearch = useCallback((value) => {
        setSearchInput(value);
        setSearchQuery(value.trim());

        setPagination((prev) => ({
            ...prev,
            pageIndex: 0,
        }));
    }, []);

    useEffect(() => {
        setPagination((prev) =>
            prev.pageIndex === 0
                ? prev
                : {
                    ...prev,
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

    const handleDelete = useCallback((item) => {
        setSelectedBrandManufacturers(item);
        setDeleteDialogOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!selectedBrandManufacturers?.id) return;

        try {
            setDeleteLoading(true);

            const response = await apiFetch(API_URL, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: selectedBrandManufacturers.id,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Delete failed",
                );
            }

            showSuccessToast(
                "Brand/Manufacturer deleted successfully",
            );

            await createBrandManufacturerNotification({
                action: "deleted",
                title: "Brand/Manufacturer Deleted",
                message: `${getBrandManufacturerName(selectedBrandManufacturers)} has been deleted.`,
                brandManufacturerId:
                    selectedBrandManufacturers.id,
                brandManufacturerName:
                    getBrandManufacturerName(selectedBrandManufacturers),
            });

            setDeleteDialogOpen(false);

            setSelectedIds((prev) =>
                prev.filter(
                    (id) =>
                        id !==
                        String(selectedBrandManufacturers.id),
                ),
            );

            setSelectedBrandManufacturers(null);

            await refreshBrandManufacturers();
            await syncInventoryBrandManufacturers();
        } catch (error) {
            console.error(
                "BRAND/MANUFACTURER DELETE ERROR",
                error,
            );

            toast.error(error.message || "Delete failed");
        } finally {
            setDeleteLoading(false);
        }
    }, [
        selectedBrandManufacturers,
        refreshBrandManufacturers,
        syncInventoryBrandManufacturers,
    ]);

    const handleCopyBrandManufacturer = useCallback(
        async (item) => {
            const brandName = String(
                item.brandName || "",
            ).trim();

            const manufacturerName = String(
                item.manufacturerName || "",
            ).trim();

            if (!brandName || !manufacturerName) {
                toast.error(
                    "Brand name and manufacturer name are required to copy this record.",
                );

                return;
            }

            setCopySourceItem(item);

            setCopyBrandName(`${brandName} (Copy)`);
            setCopyManufacturerName(manufacturerName);
            setCopyWebsiteURL(item.websiteURL || "");
            setCopyDescription(item.description || "");

            setCopyDialogOpen(true);
        },
        [],
    );

    const handleConfirmCopyBrandManufacturer =
        useCallback(async () => {
            if (!copySourceItem?.id) {
                toast.error(
                    "Please select a brand/manufacturer to copy.",
                );

                return;
            }

            const finalBrandName = copyBrandName.trim();
            const finalManufacturerName =
                copyManufacturerName.trim();
            const finalWebsiteURL = copyWebsiteURL.trim();

            if (!finalBrandName) {
                toast.error("Please enter a brand name.");
                return;
            }

            if (!finalManufacturerName) {
                toast.error(
                    "Please enter a manufacturer name.",
                );

                return;
            }

            // Website URL is optional.
            if (finalWebsiteURL) {
                if (finalWebsiteURL.length > 255) {
                    toast.error(
                        "Website URL cannot exceed 255 characters.",
                    );

                    return;
                }

                try {
                    const normalizedURL =
                        /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(
                            finalWebsiteURL,
                        )
                            ? finalWebsiteURL
                            : `https://${finalWebsiteURL}`;

                    const parsedURL = new URL(normalizedURL);

                    if (
                        !["http:", "https:"].includes(
                            parsedURL.protocol,
                        ) ||
                        !parsedURL.hostname.includes(".")
                    ) {
                        throw new Error();
                    }
                } catch {
                    toast.error(
                        "Please enter a valid website URL.",
                    );

                    return;
                }
            }

            try {
                setCopyLoading(true);

                const response = await apiFetch(API_URL, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        brandName: finalBrandName,
                        manufacturerName:
                            finalManufacturerName,
                        websiteURL: finalWebsiteURL || null,
                        description: copyDescription.trim(),
                        status: Boolean(copySourceItem.status),
                    }),
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        "Failed to copy brand/manufacturer.",
                    );
                }

                showSuccessToast(
                    "Brand/Manufacturer copied successfully.",
                );

                const copiedItem = result.data || {};

                await createBrandManufacturerNotification({
                    action: "created",
                    title: "Brand/Manufacturer Copied",
                    message: `${finalBrandName} / ${finalManufacturerName} was copied from ${getBrandManufacturerName(copySourceItem)}.`,
                    brandManufacturerId: copiedItem.id,
                    brandManufacturerName:
                        `${finalBrandName} / ${finalManufacturerName}`,
                });

                setCopyDialogOpen(false);
                setCopySourceItem(null);

                setCopyBrandName("");
                setCopyManufacturerName("");
                setCopyWebsiteURL("");
                setCopyDescription("");

                await refreshBrandManufacturers();
                await syncInventoryBrandManufacturers();
            } catch (error) {
                console.error(
                    "BRAND/MANUFACTURER COPY ERROR",
                    error,
                );

                showErrorToast(error.message);
            } finally {
                setCopyLoading(false);
            }
        }, [
            copySourceItem,
            copyBrandName,
            copyManufacturerName,
            copyWebsiteURL,
            copyDescription,
            refreshBrandManufacturers,
            syncInventoryBrandManufacturers,
        ]);
    const handleToggleBrandManufacturerStatus =
        useCallback(
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
                            result.message ||
                            "Status update failed",
                        );
                    }

                    showSuccessToast(
                        `${getBrandManufacturerName(item)} marked ${nextStatus ? "active" : "inactive"}`,
                        "brand-manufacturer-status",
                    );

                    await refreshBrandManufacturers();
                    await syncInventoryBrandManufacturers();
                } catch (error) {
                    console.error(
                        "BRAND/MANUFACTURER STATUS ERROR",
                        error,
                    );

                    showErrorToast(error.message);
                }
            },
            [
                refreshBrandManufacturers,
                syncInventoryBrandManufacturers,
            ],
        );

    const toggleRowSelection = useCallback((id) => {
        const normalizedId = String(id);

        setSelectedIds((prev) =>
            prev.includes(normalizedId)
                ? prev.filter(
                    (value) => value !== normalizedId,
                )
                : [...prev, normalizedId],
        );
    }, []);

    const toggleCurrentPageSelection = useCallback(() => {
        setSelectedIds((prev) => {
            if (allCurrentPageSelected) {
                return prev.filter(
                    (id) => !currentPageIds.includes(id),
                );
            }

            return [
                ...new Set([
                    ...prev,
                    ...currentPageIds,
                ]),
            ];
        });
    }, [
        allCurrentPageSelected,
        currentPageIds,
    ]);

    const handleBulkStatus = useCallback(
        async (status) => {
            if (!selectedIds.length) {
                toast.error(
                    "Select at least one brand/manufacturer",
                );

                return;
            }

            if (!(canManage || canEdit)) {
                toast.error(
                    "You do not have permission to change brand/manufacturer status",
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
                        result.message ||
                        "Bulk status update failed. Check your API route.",
                    );
                }

                showSuccessToast(
                    `${result.count ?? idsToUpdate.length} brand/manufacturer(s) marked ${status ? "active" : "inactive"}`,
                    "brand-manufacturer-status-update",
                );

                setActiveDialogOpen(false);
                setInactiveDialogOpen(false);
                setSelectedIds([]);

                await refreshBrandManufacturers();
                await syncInventoryBrandManufacturers();
            } catch (error) {
                console.error(
                    "BRAND/MANUFACTURER BULK STATUS ERROR",
                    error,
                );

                showErrorToast(error.message);
            } finally {
                setBulkLoading(false);
            }
        },
        [
            selectedIds,
            canManage,
            canEdit,
            refreshBrandManufacturers,
            syncInventoryBrandManufacturers,
        ],
    );

    const handleBulkDelete = useCallback(() => {
        if (!selectedIds.length) {
            toast.error(
                "Select at least one brand/manufacturer",
            );

            return;
        }

        if (!canDelete) {
            toast.error(
                "You do not have permission to delete brand/manufacturers",
            );

            return;
        }

        setBulkDeleteDialogOpen(true);
    }, [selectedIds, canDelete]);

    const handleConfirmBulkDelete = useCallback(
        async () => {
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
                        result.message ||
                        "Bulk delete failed. Your API route must support ids.",
                    );
                }

                showSuccessToast(
                    `${result.count ?? idsToDelete.length} brand/manufacturer(s) deleted`,
                    "brand-manufacturer-delete",
                );

                setBulkDeleteDialogOpen(false);
                setSelectedIds([]);

                await refreshBrandManufacturers();
                await syncInventoryBrandManufacturers();
            } catch (error) {
                console.error(
                    "BRAND/MANUFACTURER BULK DELETE ERROR",
                    error,
                );

                showErrorToast(error.message);
            } finally {
                setBulkLoading(false);
            }
        },
        [
            selectedIds,
            bulkLoading,
            refreshBrandManufacturers,
            syncInventoryBrandManufacturers,
        ],
    );

    const handleOpenEmailDialog = useCallback(() => {
        setSelectedRecipientEmails([]);
        setAttachExcel(true);

        setEmailSubject("Brand/Manufacturer Report");

        setEmailMessage(
            [
                "Dear Team,",
                "",
                "Please find the Brand/Manufacturer report for your review.",
                "",
                "The report includes brand name, manufacturer name, website URL, description, status, and creation and update details.",
                "",
                "Please review the information and let us know if any corrections are required.",
                "",
                "Regards,",
                "Inventory Management Team",
            ].join("\n"),
        );

        setEmailDialogOpen(true);
    }, []);

    useEffect(() => {
        const handleReportButtonClick = (event) => {
            if (!(event.target instanceof Element)) return;

            const button = event.target.closest(
                "#Print, #Export, #Email",
            );

            if (!button) return;

            if (
                !window.location.pathname.includes(
                    "/brand_manufacturer",
                )
            ) {
                return;
            }

            switch (button.id) {
                case "Print":
                    event.preventDefault();
                    void handlePrintBrandManufacturers();
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
        handlePrintBrandManufacturers,
        handleExportExcel,
        handleOpenEmailDialog,
    ]);

    const handleSendEmail = useCallback(async () => {
        if (selectedRecipientEmails.length === 0) {
            toast.error(
                "Please select at least one recipient.",
            );

            return;
        }

        if (
            !emailSubject.trim() ||
            !emailMessage.trim()
        ) {
            toast.error(
                "Please enter the email subject and message.",
            );

            return;
        }

        try {
            setEmailSending(true);

            const response = await fetch(
                `${API_URL}/email-report`,
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

            if (
                !response.ok ||
                result.success === false
            ) {
                throw new Error(
                    result.error ||
                    result.message ||
                    "Failed to send email.",
                );
            }

            showSuccessToast(
                attachExcel
                    ? "Email sent successfully with the Excel attachment."
                    : "Email sent successfully.",
                "brand-manufacturer-email",
            );

            setEmailDialogOpen(false);
        } catch (error) {
            console.error(
                "BRAND/MANUFACTURER EMAIL ERROR",
                error,
            );

            showErrorToast(error.message);
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

    useEffect(() => {
        if (!emailDialogOpen) return;

        let cancelled = false;

        const loadStaff = async () => {
            try {
                setStaffLoading(true);

                const response = await apiFetch(
                    "/api/staff?limit=10000",
                );

                const result = await response.json();

                if (
                    !response.ok ||
                    result.success === false
                ) {
                    throw new Error(
                        result.message ||
                        "Failed to load staff",
                    );
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
                                    [
                                        person.firstName,
                                        person.lastName,
                                    ]
                                        .filter(Boolean)
                                        .join(" ") ||
                                    person.username ||
                                    person.email ||
                                    "Staff member",

                                email:
                                    person.email ||
                                    person.workEmail ||
                                    "",
                            }))
                            .filter((person) => person.email),
                    );
                }
            } catch (error) {
                console.error(
                    "STAFF RECIPIENT LOAD ERROR",
                    error,
                );

                if (!cancelled) {
                    setStaffList([]);
                    showErrorToast(error.message);
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

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);

            await checkDbStatus();
            await syncInventoryBrandManufacturers();
            await refreshBrandManufacturers();
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
            window.removeEventListener(
                "online",
                handleOnline,
            );

            window.removeEventListener(
                "offline",
                handleOffline,
            );
        };
    }, [
        checkDbStatus,
        syncInventoryBrandManufacturers,
        refreshBrandManufacturers,
    ]);

    useEffect(() => {
        void checkDbStatus();

        const interval = setInterval(
            () => void checkDbStatus(),
            30000,
        );

        return () => clearInterval(interval);
    }, [checkDbStatus]);

    const columns = useMemo(
        () => [
            {
                id: "select",

                header: () => (
                    <Checkbox
                        aria-label="Select all rows on this page"
                        checked={allCurrentPageSelected}
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                        onCheckedChange={() =>
                            toggleCurrentPageSelection()
                        }
                        disabled={
                            !BrandManufacturers.length ||
                            bulkLoading
                        }
                    />
                ),

                cell: ({ row }) => {
                    const item = row.original;
                    const id = String(item.id);

                    return (
                        <Checkbox
                            aria-label={`Select ${getBrandManufacturerName(item)}`}
                            checked={selectedIds.includes(id)}
                            onClick={(event) =>
                                event.stopPropagation()
                            }
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
                enableHiding: false,
            },

            {
                accessorKey: "brandName",
                id: "brandName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Brand Name"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span className="font-medium">
                        {row.original.brandName || "-"}
                    </span>
                ),

                size: 200,
            },

            {
                accessorKey: "manufacturerName",
                id: "manufacturerName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Manufacturer Name"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span className="font-medium">
                        {row.original.manufacturerName || "-"}
                    </span>
                ),

                size: 220,
            },

            {
                accessorKey: "websiteURL",
                id: "websiteURL",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Website URL"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => {
                    const websiteURL =
                        row.original.websiteURL;

                    return websiteURL ? (
                        <a
                            href={websiteURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block max-w-[220px] truncate text-primary hover:underline"
                            onClick={(event) =>
                                event.stopPropagation()
                            }
                        >
                            {websiteURL}
                        </a>
                    ) : (
                        <span>-</span>
                    );
                },

                size: 220,
            },

            {
                accessorKey: "description",
                id: "description",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Description"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span className="block max-w-[300px] truncate">
                        {row.original.description || "-"}
                    </span>
                ),

                size: 300,
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
                        {row.original.status
                            ? "Active"
                            : "Inactive"}
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
                    skeleton: (
                        <Skeleton className="h-7 w-24" />
                    ),
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

                cell: ({ row }) => (
                    <span>
                        {row.original.createdByName || "-"}
                    </span>
                ),

                size: 180,
                enableSorting: false,

                meta: {
                    headerTitle: "Created By",
                    skeleton: (
                        <Skeleton className="h-7 w-24" />
                    ),
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
                    skeleton: (
                        <Skeleton className="h-7 w-24" />
                    ),
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

                cell: ({ row }) => (
                    <span>
                        {row.original.updatedByName || "-"}
                    </span>
                ),

                size: 180,
                enableSorting: false,

                meta: {
                    headerTitle: "Updated By",
                    skeleton: (
                        <Skeleton className="h-7 w-24" />
                    ),
                },
            },

            {
                id: "actions",
                header: "Actions",

                cell: ({ row }) => {
                    const item = row.original;
                    const itemName =
                        getBrandManufacturerName(item);

                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    mode="icon"
                                    variant="ghost"
                                    aria-label={`Actions for ${itemName}`}
                                >
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                                {canView && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedBrandManufacturers(
                                                item,
                                            );

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
                                            setSelectedBrandManufacturers(
                                                item,
                                            );

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
                                            void handleCopyBrandManufacturer(
                                                item,
                                            )
                                        }
                                    >
                                        <Copy className="mr-2 size-4" />
                                        Copy
                                    </DropdownMenuItem>
                                )}

                                {(canManage || canEdit) && (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            void handleToggleBrandManufacturerStatus(
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
                                            ? "Inactive"
                                            : "Active"}
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
            BrandManufacturers,
            selectedIds,
            bulkLoading,
            toggleCurrentPageSelection,
            toggleRowSelection,
            canView,
            canEdit,
            canManage,
            canDelete,
            handleDelete,
            handleCopyBrandManufacturer,
            handleToggleBrandManufacturerStatus,
        ],
    );

    const table = useReactTable({
        columns,
        data: BrandManufacturers,

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


    const renderToolbar = () => (
        <CardHeader className="flex-col flex-wrap items-stretch gap-3 py-5 sm:flex-row sm:items-center">
            <div className="flex w-full items-center gap-2 sm:w-auto">
                <div className="relative flex-1 sm:w-[250px] sm:flex-none">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                    <Input
                        type="text"
                        placeholder="Search brand/manufacturer"
                        value={searchInput}
                        onChange={(event) =>
                            handleSearch(event.target.value)
                        }
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
                            Search by brand name, manufacturer name,
                            website URL, or description.
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

                {/* Database Connection Status */}

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
                                ? String(
                                    dbStatus.env || "Database",
                                )
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
                        onClick={() =>
                            void checkDbStatus()
                        }
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
                        onClick={() =>
                            setAddDialogOpen(true)
                        }
                    >
                        <Plus className="mr-2 size-4" />
                        Add Brand/Manufacturer
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
                    searchInput={searchInput}
                    setSearchInput={setSearchInput}
                    handleSearch={handleSearch}
                />
                <DataGridColumnVisibility
                    table={table}
                    trigger={
                        <Button variant="outline">
                            <Settings2 />
                            Columns
                        </Button>
                    } />
            </div>
        </CardHeader>
    );

    if (!canView) {
        return (
            <Card>
                <CardHeader>
                    <div>
                        <h3 className="text-lg font-semibold">
                            Access Denied
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                            You do not have permission to view
                            Brand/Manufacturer.
                        </p>
                    </div>
                </CardHeader>
            </Card>
        );
    }

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

            {/* ---------------------------------------------------------------- */}
            {/* Add Dialog                                                       */}
            {/* ---------------------------------------------------------------- */}

            <BrandManufacturerAddDialog
                open={addDialogOpen}
                closeDialog={() =>
                    setAddDialogOpen(false)
                }
                onSuccess={async (newBrandManufacturer) => {
                    setAddDialogOpen(false);

                    const brandManufacturerName =
                        getBrandManufacturerName(
                            newBrandManufacturer,
                        );

                    await createBrandManufacturerNotification({
                        action: "created",
                        title: "New Brand/Manufacturer Created",
                        message: `${brandManufacturerName} has been created.`,
                        brandManufacturerId:
                            newBrandManufacturer?.id,
                        brandManufacturerName,
                    });

                    await refreshBrandManufacturers();
                    await syncInventoryBrandManufacturers();
                }}
            />

            {/* ---------------------------------------------------------------- */}
            {/* View Dialog                                                      */}
            {/* ---------------------------------------------------------------- */}

            <BrandManufacturerViewDialog
                open={viewDialogOpen}
                BrandManufacturer={selectedBrandManufacturers}
                closeDialog={() => {
                    setViewDialogOpen(false);
                    setSelectedBrandManufacturers(null);
                }}
            />

            {/* ---------------------------------------------------------------- */}
            {/* Edit Dialog                                                      */}
            {/* ---------------------------------------------------------------- */}

            <BrandManufacturerEditDialog
                open={editDialogOpen}
                BrandManufacturer={selectedBrandManufacturers}
                closeDialog={() => {
                    setEditDialogOpen(false);
                    setSelectedBrandManufacturers(null);
                }}
                onSuccess={async (updatedBrandManufacturer) => {
                    const updatedItem =
                        updatedBrandManufacturer ||
                        selectedBrandManufacturers;

                    const brandManufacturerName =
                        getBrandManufacturerName(updatedItem);

                    await createBrandManufacturerNotification({
                        action: "updated",
                        title: "Brand/Manufacturer Updated",
                        message: `${brandManufacturerName} has been updated.`,
                        brandManufacturerId: updatedItem?.id,
                        brandManufacturerName,
                    });

                    setEditDialogOpen(false);
                    setSelectedBrandManufacturers(null);

                    await refreshBrandManufacturers();
                    await syncInventoryBrandManufacturers();
                }}
            />

            {/* ---------------------------------------------------------------- */}
            {/* Delete Dialog                                                    */}
            {/* ---------------------------------------------------------------- */}

            <BrandManufacturerDeleteDialog
                open={deleteDialogOpen}
                BrandManufacturer={selectedBrandManufacturers}
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                closeDialog={() => {
                    setDeleteDialogOpen(false);
                    setSelectedBrandManufacturers(null);
                }}
            />

            {/* ---------------------------------------------------------------- */}
            {/* Email Report Dialog                                              */}
            {/* ---------------------------------------------------------------- */}

            <Dialog
                open={emailDialogOpen}
                onOpenChange={setEmailDialogOpen}
            >
                <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] flex flex-col gap-0 overflow-hidden p-0 sm:w-[90vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px]">
                    <form
                        className="flex h-full max-h-[90vh] flex-col overflow-hidden"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleSendEmail();
                        }}
                    >
                        <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
                            <DialogTitle>
                                Email Brand/Manufacturers
                            </DialogTitle>

                            <DialogDescription>
                                Select recipients and send the
                                brand/manufacturer report.
                            </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="flex h-full max-h-[90vh] min-h-0 grow flex-col overflow-hidden">
                            <DialogBody className="min-h-0 space-y-6 px-6">
                                {/* Recipient Selection */}

                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-sm font-medium">
                                        Recipient Email
                                    </label>

                                    <span className="text-xs text-muted-foreground">
                                        {selectedRecipientEmails.length} of{" "}
                                        {staffList.length} selected
                                    </span>
                                </div>

                                {/* Selected Recipients */}

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
                                                    setSelectedRecipientEmails(
                                                        [],
                                                    )
                                                }
                                            >
                                                Clear all
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {selectedRecipientEmails.map(
                                                (email) => {
                                                    const person =
                                                        staffList.find(
                                                            (staff) =>
                                                                staff.email ===
                                                                email,
                                                        );

                                                    return (
                                                        <span
                                                            key={email}
                                                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs"
                                                        >
                                                            <span className="max-w-[220px] truncate">
                                                                {person?.name ||
                                                                    email}
                                                            </span>

                                                            <button
                                                                type="button"
                                                                aria-label={`Remove ${email}`}
                                                                className="rounded-full text-muted-foreground hover:text-destructive"
                                                                onClick={() =>
                                                                    setSelectedRecipientEmails(
                                                                        (previous) =>
                                                                            previous.filter(
                                                                                (item) =>
                                                                                    item !==
                                                                                    email,
                                                                            ),
                                                                    )
                                                                }
                                                            >
                                                                <X className="size-3.5" />
                                                            </button>
                                                        </span>
                                                    );
                                                },
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Staff Selection */}

                                <div className="overflow-hidden rounded-lg border">
                                    <div className="border-b bg-muted/30 p-2">
                                        <label className="flex cursor-pointer items-center gap-2">
                                            <Checkbox
                                                checked={
                                                    staffList.length > 0 &&
                                                    staffList.every(
                                                        (person) =>
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
                                                                            (person) =>
                                                                                person.email,
                                                                        ),
                                                                    ]),
                                                                ]
                                                                : previous.filter(
                                                                    (email) =>
                                                                        !staffList.some(
                                                                            (person) =>
                                                                                person.email ===
                                                                                email,
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

                                    <ScrollArea className="flex h-full max-h-50 flex-col overflow-hidden">
                                        <div className="p-2">
                                            {staffLoading ? (
                                                <p className="p-3 text-sm text-muted-foreground">
                                                    Loading staff...
                                                </p>
                                            ) : staffList.length === 0 ? (
                                                <p className="p-3 text-sm text-muted-foreground">
                                                    No staff email addresses
                                                    found.
                                                </p>
                                            ) : (
                                                <div className="space-y-1">
                                                    {staffList.map(
                                                        (person) => {
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
                                                                        checked={
                                                                            isSelected
                                                                        }
                                                                        onCheckedChange={(
                                                                            checked,
                                                                        ) => {
                                                                            setSelectedRecipientEmails(
                                                                                (
                                                                                    previous,
                                                                                ) =>
                                                                                    checked ===
                                                                                        true
                                                                                        ? [
                                                                                            ...new Set(
                                                                                                [
                                                                                                    ...previous,
                                                                                                    person.email,
                                                                                                ],
                                                                                            ),
                                                                                        ]
                                                                                        : previous.filter(
                                                                                            (
                                                                                                email,
                                                                                            ) =>
                                                                                                email !==
                                                                                                person.email,
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

                                                                    {isSelected && (
                                                                        <CheckCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                                                                    )}
                                                                </label>
                                                            );
                                                        },
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>

                                {!staffLoading &&
                                    selectedRecipientEmails.length ===
                                    0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Select at least one recipient
                                            to send the report.
                                        </p>
                                    )}

                                {/* Subject */}

                                <div className="space-y-2">
                                    <label
                                        htmlFor="brand-manufacturer-subject"
                                        className="text-sm font-medium"
                                    >
                                        Subject
                                    </label>

                                    <Input
                                        id="brand-manufacturer-subject"
                                        required
                                        value={emailSubject}
                                        onChange={(event) =>
                                            setEmailSubject(
                                                event.target.value,
                                            )
                                        }
                                        placeholder="Brand/Manufacturers Report"
                                    />
                                </div>

                                {/* Excel Attachment */}

                                <div className="rounded-lg border p-3 transition-colors hover:bg-muted/30">
                                    <label className="flex cursor-pointer items-start gap-3">
                                        <Checkbox
                                            className="mt-0.5"
                                            checked={attachExcel}
                                            onCheckedChange={(checked) =>
                                                setAttachExcel(
                                                    checked === true,
                                                )
                                            }
                                        />

                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium">
                                                Add Excel attachment
                                            </span>

                                            <span className="mt-1 block text-xs text-muted-foreground">
                                                Attach the
                                                brand/manufacturer report
                                                as an Excel file (.xlsx)
                                                to the email.
                                            </span>
                                        </span>

                                        <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                                    </label>
                                </div>

                                {/* Message */}

                                <div className="space-y-2">
                                    <label
                                        htmlFor="brand-manufacturer-message"
                                        className="text-sm font-medium"
                                    >
                                        Message
                                    </label>

                                    <ScrollArea className="h-[150px] w-full">
                                        <Textarea
                                            id="brand-manufacturer-message"
                                            required
                                            rows={5}
                                            value={emailMessage}
                                            onChange={(event) =>
                                                setEmailMessage(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Enter your email message..."
                                            className="min-h-[150px] resize-none"
                                        />
                                    </ScrollArea>

                                    <p className="text-xs text-muted-foreground">
                                        Enter the message to include in
                                        the email sent to the selected
                                        staff.
                                    </p>
                                </div>
                            </DialogBody>

                            <DialogFooter className="gap-2 px-6 pb-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        setEmailDialogOpen(false)
                                    }
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

            {/* ---------------------------------------------------------------- */}
            {/* Copy Brand/Manufacturer Dialog                                   */}
            {/* ---------------------------------------------------------------- */}

            <Dialog
                open={copyDialogOpen}
                onOpenChange={(open) => {
                    if (copyLoading) return;

                    setCopyDialogOpen(open);

                    if (!open) {
                        setCopySourceItem(null);

                        setCopyBrandName("");
                        setCopyManufacturerName("");
                        setCopyWebsiteURL("");
                        setCopyDescription("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Copy Brand/Manufacturer
                        </DialogTitle>

                        <DialogDescription>
                            Review and edit the details for the copied
                            brand/manufacturer before saving.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();

                            void handleConfirmCopyBrandManufacturer();
                        }}
                    >
                        {/* Brand Name */}

                        <div className="space-y-2">
                            <label
                                htmlFor="copy-brand-name"
                                className="text-sm font-medium"
                            >
                                Brand Name{" "}
                                <span className="text-destructive">
                                    *
                                </span>
                            </label>

                            <Input
                                id="copy-brand-name"
                                value={copyBrandName}
                                onChange={(event) =>
                                    setCopyBrandName(
                                        event.target.value,
                                    )
                                }
                                placeholder="Enter brand name"
                                maxLength={255}
                                required
                                autoFocus
                                disabled={copyLoading}
                            />
                        </div>

                        {/* Manufacturer Name */}

                        <div className="space-y-2">
                            <label
                                htmlFor="copy-manufacturer-name"
                                className="text-sm font-medium"
                            >
                                Manufacturer Name{" "}
                                <span className="text-destructive">
                                    *
                                </span>
                            </label>

                            <Input
                                id="copy-manufacturer-name"
                                value={copyManufacturerName}
                                onChange={(event) =>
                                    setCopyManufacturerName(
                                        event.target.value,
                                    )
                                }
                                placeholder="Enter manufacturer name"
                                maxLength={255}
                                required
                                disabled={copyLoading}
                            />
                        </div>

                        {/* Website URL (Optional) */}

                        <div className="space-y-2">
                            <label
                                htmlFor="copy-website-url"
                                className="text-sm font-medium"
                            >
                                Website URL
                            </label>

                            <Input
                                id="copy-website-url"
                                type="url"
                                value={copyWebsiteURL}
                                onChange={(event) =>
                                    setCopyWebsiteURL(event.target.value)
                                }
                                placeholder="https://example.com"
                                maxLength={255}
                                disabled={copyLoading}
                            />
                        </div>
                        {/* Description */}

                        <div className="space-y-2">
                            <label
                                htmlFor="copy-brand-description"
                                className="text-sm font-medium"
                            >
                                Description
                            </label>

                            <Textarea
                                id="copy-brand-description"
                                rows={4}
                                value={copyDescription}
                                onChange={(event) =>
                                    setCopyDescription(
                                        event.target.value,
                                    )
                                }
                                placeholder="Enter description"
                                disabled={copyLoading}
                            />
                        </div>

                        {copySourceItem && (
                            <p className="text-xs text-muted-foreground">
                                Copying from:{" "}
                                {getBrandManufacturerName(
                                    copySourceItem,
                                )}
                            </p>
                        )}

                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    setCopyDialogOpen(false)
                                }
                                disabled={copyLoading}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={
                                    copyLoading ||
                                    !copyBrandName.trim() ||
                                    !copyManufacturerName.trim()
                                }
                            >
                                <Copy className="mr-2 size-4" />

                                {copyLoading
                                    ? "Copying..."
                                    : "Copy"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>


            <BrandManufacturersActiveDialog
                open={activeDialogOpen}
                onOpenChange={setActiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() =>
                    handleBulkStatus(true)
                }
            />


            <BrandManufacturersInactiveDialog
                open={inactiveDialogOpen}
                onOpenChange={setInactiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() =>
                    handleBulkStatus(false)
                }
            />

            <BrandManufacturersDeleteDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={setBulkDeleteDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={handleConfirmBulkDelete}
            />
        </>
    );
};

export default BrandManufacturerList;
