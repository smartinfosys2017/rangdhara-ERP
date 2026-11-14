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
    X,
    FileSpreadsheet,
    XCircle,
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

import LocationAddDialog from "./location-add-dialog";
import LocationEditDialog from "./location-edit-dialog";
import LocationViewDialog from "./location-view-dialog";
import LocationDeleteDialog from "./location-delete-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";

import LocationsActiveDialog from "./locations-active-dialog";
import LocationsInactiveDialog from "./locations-inactive-dialog";
import LocationsDeleteDialog from "./locations-delete-dialog";

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
        {
            id,
            position: "top-center",
        },
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
        {
            id,
            position: "top-center",
        },
    );
};

// =======================================================
// NOTIFICATION
// =======================================================

const createLocationNotification = async ({
    action,
    title,
    message,
    locationId = null,
    locationName = null,
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
                    locationId !== null && locationId !== undefined
                        ? String(locationId)
                        : null,
                entityType: "location",
                entityName: locationName || "Location",
                url: "/inventory/location",
            }),
            cache: "no-store",
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result?.success) {
            throw new Error(result?.message || "Notification failed");
        }

        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("notifications-refresh"));

            window.dispatchEvent(
                new CustomEvent("notifications-received", {
                    detail: result.notification ? [result.notification] : [],
                }),
            );
        }

        return result;
    } catch (error) {
        console.error("LOCATION NOTIFICATION ERROR:", error);
        return null;
    }
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

    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

// =======================================================
// COMPONENT
// =======================================================
const generateLocationCode = () => {
    const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();

    return `LOC-${randomPart}`;
};
const LocationList = () => {
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    // ===================================================
    // PERMISSIONS
    // ===================================================

    const userPermissions = useMemo(
        () => session?.user?.permissions || [],
        [session?.user?.permissions],
    );

    const canView = can("location.view", userPermissions);
    const canManage = can("location.manage", userPermissions);
    const canEdit = can("location.edit", userPermissions);
    const canDelete = can("location.delete", userPermissions);

    // ===================================================
    // TABLE STATE
    // ===================================================

    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });

    const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);

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

    const [selectedLocation, setSelectedLocation] = useState(null);
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

    const [copyLocationName, setCopyLocationName] = useState("");
    const [copyLocationCode, setCopyLocationCode] = useState("");

    const [copyLoading, setCopyLoading] = useState(false);

    // ===================================================
    // REFRESH
    // ===================================================

    const refreshLocations = useCallback(async () => {
        await queryClient.invalidateQueries({
            queryKey: ["location"],
        });
    }, [queryClient]);

    // ===================================================
    // INVENTORY SYNC
    // ===================================================

    const syncInventoryLocations = useCallback(async () => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            setIsOnline(false);
            return null;
        }

        if (syncingRef.current) return null;

        try {
            syncingRef.current = true;
            setSyncing(true);

            const response = await fetch("/api/sync/inventory-local", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result?.message || "Inventory sync failed");
            }

            window.dispatchEvent(new CustomEvent("notifications-refresh"));

            return result;
        } catch (error) {
            console.error("LOCATION SYNC ERROR:", error);
            showError(error.message);
            return null;
        } finally {
            syncingRef.current = false;
            setSyncing(false);
        }
    }, []);

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
    // FETCH LOCATIONS
    // ===================================================

    const fetchLocations = useCallback(async () => {
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
            `/api/inventory/location?${params.toString()}`,
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed loading locations");
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
            "location",
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
        queryFn: fetchLocations,
        staleTime: 0,
    });

    const locations = data?.data || [];
    const totalRecords = Number(data?.pagination?.total || 0);

    // ===================================================
    // SELECTION HELPERS
    // ===================================================

    const currentPageIds = useMemo(
        () => locations.map((item) => String(item.id)),
        [locations],
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

    const getLocationReportRows = useCallback(async () => {
        if (selectedIds.length > 0) {
            const selectedSet = new Set(selectedIds.map(String));

            return locations.filter((item) => selectedSet.has(String(item.id)));
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
            `/api/inventory/location?${params.toString()}`,
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to load locations");
        }

        return result.data || [];
    }, [
        selectedIds,
        locations,
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

    const buildLocationExcel = useCallback((items) => {
        const rows = items.map((item) => ({
            ID: item.id,
            "Location Name": item.locationName || "",
            "Location Code": item.locationCode || "",
            Status: item.status ? "Active" : "Inactive",

            "Created Date": item.createdAt
                ? new Date(item.createdAt).toLocaleString()
                : "",

            "Updated Date": item.updatedAt
                ? new Date(item.updatedAt).toLocaleString()
                : "",

            "Created By": item.createdByName || "",
            "Updated By": item.updatedByName || "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);

        worksheet["!cols"] = [
            { wch: 15 },
            { wch: 30 },
            { wch: 20 },
            { wch: 14 },
            { wch: 22 },
            { wch: 22 },
            { wch: 25 },
            { wch: 25 },
        ];

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(workbook, worksheet, "Locations");

        return workbook;
    }, []);

    const downloadLocationExcel = useCallback(
        (items, filename = "locations.xlsx") => {
            if (!items.length) {
                toast.error("No locations to export");
                return false;
            }

            XLSX.writeFile(buildLocationExcel(items), filename);

            return true;
        },
        [buildLocationExcel],
    );

    const handleExportExcel = useCallback(async () => {
        try {
            toast.loading("Preparing Excel export...", {
                id: "location-export",
            });

            const items = await getLocationReportRows();

            if (!items.length) {
                toast.error("No locations to export", {
                    id: "location-export",
                });

                return;
            }

            downloadLocationExcel(items);

            showSuccess(`${items.length} location(s) exported.`, "location-export");
        } catch (error) {
            console.error("LOCATION EXPORT ERROR:", error);
            showError(error.message);
        }
    }, [getLocationReportRows, downloadLocationExcel]);

    // ===================================================
    // PRINT
    // ===================================================

    const handlePrintLocations = useCallback(async () => {
        try {
            const items = await getLocationReportRows();

            if (!items.length) {
                toast.error("No locations to print");
                return;
            }

            const rows = items
                .map(
                    (item) => `
                <tr>
                    <td>${escapeHtml(item.id)}</td>
                    <td>${escapeHtml(item.locationName)}</td>
                    <td>${escapeHtml(item.locationCode)}</td>
                    <td>${item.status ? "Active" : "Inactive"}</td>
                    <td>${escapeHtml(formatDate(item.createdAt))}</td>
                    <td>${escapeHtml(formatDate(item.updatedAt))}</td>
                    <td>${escapeHtml(item.createdByName || "-")}</td>
                    <td>${escapeHtml(item.updatedByName || "-")}</td>
                </tr>
            `,
                )
                .join("");

            const printWindow = window.open("", "_blank", "width=1200,height=800");

            if (!printWindow) {
                toast.error("Please allow pop-ups to print the report");

                return;
            }

            printWindow.document.write(`
                <!doctype html>
                <html>
                    <head>
                        <title>Locations Report</title>
                        <meta charset="utf-8">
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                padding: 24px;
                                color: #222;
                            }
                            h1 {
                                font-size: 22px;
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
                                font-size: 11px;
                            }
                            th {
                                background: #f2f2f2;
                            }
                            tr {
                                break-inside: avoid;
                            }
                            @media print {
                                body { padding: 0; }
                            }
                        </style>
                    </head>
                    <body>
                        <h1>Locations Report</h1>
                        <p>Generated: ${escapeHtml(new Date().toLocaleString())}</p>
                        <p>Total records: ${items.length}</p>

                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Location Name</th>
                                    <th>Location Code</th>
                                    <th>Status</th>
                                    <th>Added Date</th>
                                    <th>Updated Date</th>
                                    <th>Created By</th>
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
            console.error("LOCATION PRINT ERROR:", error);
            showError(error.message);
        }
    }, [getLocationReportRows]);

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
    // DELETE LOCATION
    // ===================================================

    const handleDelete = useCallback((item) => {
        setSelectedLocation(item);
        setDeleteDialogOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!selectedLocation?.id) return;

        try {
            setDeleteLoading(true);

            const response = await apiFetch("/api/inventory/location", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: selectedLocation.id,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Delete failed");
            }

            showSuccess("Location deleted successfully.");

            await createLocationNotification({
                action: "deleted",
                title: "Location Deleted",
                message: `${selectedLocation.locationName} location has been deleted.`,
                locationId: selectedLocation.id,
                locationName: selectedLocation.locationName,
            });

            setDeleteDialogOpen(false);

            setSelectedIds((prev) =>
                prev.filter((id) => id !== String(selectedLocation.id)),
            );

            setSelectedLocation(null);

            await refreshLocations();
            await syncInventoryLocations();
        } catch (error) {
            console.error("LOCATION DELETE ERROR:", error);
            showError(error.message || "Delete failed");
        } finally {
            setDeleteLoading(false);
        }
    }, [selectedLocation, refreshLocations, syncInventoryLocations]);

    // ===================================================
    // EXISTING LOCATION CODES AND NAMES
    // ===================================================

    const getExistingLocations = useCallback(async () => {
        const params = new URLSearchParams({
            page: "1",
            limit: "10000",
            sort: "createdAt",
            dir: "desc",
        });

        const response = await apiFetch(
            `/api/inventory/location?${params.toString()}`,
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to check existing locations.");
        }

        return result.data || [];
    }, []);

    // ===================================================
    // COPY LOCATION
    // ===================================================

    const handleCopyLocation = useCallback(
        async (item) => {
            try {
                const originalName = String(item.locationName || "").trim();

                if (!originalName) {
                    toast.error("Location name is missing.");
                    return;
                }

                const existingLocations = await getExistingLocations();

                const existingNames = new Set(
                    existingLocations.map((location) =>
                        String(location.locationName || "")
                            .trim()
                            .toLowerCase(),
                    ),
                );

                const existingCodes = new Set(
                    existingLocations.map((location) =>
                        String(location.locationCode || "")
                            .trim()
                            .toLowerCase(),
                    ),
                );

                // Generate unique location name.
                let copiedName = `${originalName} (Copy)`;
                let counter = 2;

                while (existingNames.has(copiedName.toLowerCase())) {
                    copiedName = `${originalName} (Copy ${counter})`;
                    counter++;
                }

                // Generate a new unique random location code.
                let copiedCode = generateLocationCode();

                while (existingCodes.has(copiedCode.toLowerCase())) {
                    copiedCode = generateLocationCode();
                }

                setCopySourceItem(item);
                setCopyLocationName(copiedName);
                setCopyLocationCode(copiedCode);
                setCopyDialogOpen(true);
            } catch (error) {
                console.error("OPEN LOCATION COPY ERROR:", error);
                showError(error.message);
            }
        },
        [getExistingLocations],
    );

    const handleConfirmCopyLocation = useCallback(async () => {
        if (!copySourceItem?.id) {
            toast.error("Please select a location to copy.");
            return;
        }

        const finalName = copyLocationName.trim();
        const finalCode = copyLocationCode.trim();

        if (!finalName || !finalCode) {
            toast.error("Location name and location code are required.");

            return;
        }

        if (finalName.length > 255 || finalCode.length > 25) {
            toast.error("Location name or code exceeds the allowed character limit.");

            return;
        }

        try {
            setCopyLoading(true);

            const existingLocations = await getExistingLocations();

            const nameExists = existingLocations.some(
                (location) =>
                    String(location.locationName || "")
                        .trim()
                        .toLowerCase() === finalName.toLowerCase(),
            );

            const codeExists = existingLocations.some(
                (location) =>
                    String(location.locationCode || "")
                        .trim()
                        .toLowerCase() === finalCode.toLowerCase(),
            );

            if (nameExists) {
                throw new Error("This location name already exists.");
            }

            if (codeExists) {
                throw new Error("This location code already exists.");
            }

            const response = await apiFetch("/api/inventory/location", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    locationName: finalName,
                    locationCode: finalCode,
                    status: Boolean(copySourceItem.status),
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to copy location.");
            }

            showSuccess("Location copied successfully.");

            await createLocationNotification({
                action: "created",
                title: "Location Copied",
                message: `${finalName} was copied from ${copySourceItem.locationName}.`,
                locationId: result.data?.id,
                locationName: finalName,
            });

            setCopyDialogOpen(false);
            setCopySourceItem(null);
            setCopyLocationName("");
            setCopyLocationCode("");

            await refreshLocations();
            await syncInventoryLocations();
        } catch (error) {
            console.error("LOCATION COPY ERROR:", error);
            showError(error.message);
        } finally {
            setCopyLoading(false);
        }
    }, [
        copySourceItem,
        copyLocationName,
        copyLocationCode,
        getExistingLocations,
        refreshLocations,
        syncInventoryLocations,
    ]);

    // ===================================================
    // SINGLE LOCATION STATUS
    // ===================================================

    const handleToggleLocationStatus = useCallback(
        async (item) => {
            const nextStatus = !Boolean(item.status);

            try {
                const response = await apiFetch("/api/inventory/location", {
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
                    `${item.locationName} marked ${nextStatus ? "active" : "inactive"}`,
                    "location-status",
                );

                await refreshLocations();
                await syncInventoryLocations();
            } catch (error) {
                console.error("LOCATION STATUS ERROR:", error);
                showError(error.message);
            }
        },
        [refreshLocations, syncInventoryLocations],
    );

    // ===================================================
    // BULK STATUS
    // ===================================================

    const handleBulkStatus = useCallback(
        async (status) => {
            if (!selectedIds.length) {
                toast.error("Select at least one location");
                return;
            }

            if (!(canManage || canEdit)) {
                toast.error("You do not have permission to change location status");

                return;
            }

            const idsToUpdate = [...selectedIds];

            try {
                setBulkLoading(true);

                const response = await apiFetch("/api/inventory/location", {
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
                    throw new Error(result.message || "Bulk status update failed.");
                }

                showSuccess(
                    `${result.count ?? idsToUpdate.length} location(s) marked ${status ? "active" : "inactive"}`,
                    "location-status-update",
                );

                setActiveDialogOpen(false);
                setInactiveDialogOpen(false);
                setSelectedIds([]);

                await refreshLocations();
                await syncInventoryLocations();
            } catch (error) {
                console.error("BULK LOCATION STATUS ERROR:", error);
                showError(error.message);
            } finally {
                setBulkLoading(false);
            }
        },
        [selectedIds, canManage, canEdit, refreshLocations, syncInventoryLocations],
    );

    // ===================================================
    // BULK DELETE
    // ===================================================

    const handleBulkDelete = useCallback(() => {
        if (!selectedIds.length) {
            toast.error("Select at least one location");
            return;
        }

        if (!canDelete) {
            toast.error("You do not have permission to delete locations");

            return;
        }

        setBulkDeleteDialogOpen(true);
    }, [selectedIds, canDelete]);

    const handleConfirmBulkDelete = useCallback(async () => {
        if (!selectedIds.length || bulkLoading) return;

        const idsToDelete = [...selectedIds];

        try {
            setBulkLoading(true);

            const response = await apiFetch("/api/inventory/location", {
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
                `${result.count ?? idsToDelete.length} location(s) deleted`,
                "location-delete",
            );

            setBulkDeleteDialogOpen(false);
            setSelectedIds([]);

            await refreshLocations();
            await syncInventoryLocations();
        } catch (error) {
            console.error("BULK LOCATION DELETE ERROR:", error);
            showError(error.message);
        } finally {
            setBulkLoading(false);
        }
    }, [selectedIds, bulkLoading, refreshLocations, syncInventoryLocations]);

    // ===================================================
    // EMAIL DIALOG
    // ===================================================

    const handleOpenEmailDialog = useCallback(() => {
        setSelectedRecipientEmails([]);
        setAttachExcel(true);

        setEmailSubject("Locations Report");

        setEmailMessage(
            [
                "Dear Team,",
                "",
                "Please find the Locations report for your review.",
                "",
                "The report includes the location name, location code, status, and creation and update dates.",
                "",
                "Please review the information and let us know if any corrections are required.",
                "",
                "Regards,",
                "Inventory Management Team",
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

            if (!window.location.pathname.includes("/location")) {
                return;
            }

            switch (button.id) {
                case "Print":
                    event.preventDefault();
                    void handlePrintLocations();
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
    }, [handlePrintLocations, handleExportExcel, handleOpenEmailDialog]);

    // ===================================================
    // SEND EMAIL
    // ===================================================

    const handleSendEmail = useCallback(async () => {
        if (!selectedRecipientEmails.length) {
            toast.error("Please select at least one recipient.");
            return;
        }

        if (!emailSubject.trim() || !emailMessage.trim()) {
            toast.error("Please enter the email subject and message.");

            return;
        }

        try {
            setEmailSending(true);

            const response = await fetch("/api/inventory/location/email-report", {
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
            });

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
                "location-email",
            );

            setEmailDialogOpen(false);
        } catch (error) {
            console.error("LOCATION EMAIL ERROR:", error);
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
            await syncInventoryLocations();
            await refreshLocations();
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
    }, [checkDbStatus, syncInventoryLocations, refreshLocations]);

    useEffect(() => {
        void checkDbStatus();

        const interval = setInterval(() => void checkDbStatus(), 30000);

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
                        disabled={!locations.length || bulkLoading}
                    />
                ),

                cell: ({ row }) => {
                    const item = row.original;
                    const id = String(item.id);

                    return (
                        <Checkbox
                            aria-label={`Select ${item.locationName}`}
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
                    <DataGridColumnHeader title="#" column={column} visibility />
                ),

                cell: ({ row }) => (
                    <span>#{String(row.original.id).substring(0, 8)}</span>
                ),

                size: 120,
            },
            {
                accessorKey: "locationCode",
                id: "locationCode",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Location Code"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => <span>{row.original.locationCode || "-"}</span>,

                size: 180,
            },

            {
                accessorKey: "locationName",
                id: "locationName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Location Name"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span className="font-medium">{row.original.locationName}</span>
                ),

                size: 220,
            },

            {
                accessorKey: "status",
                id: "status",

                header: ({ column }) => (
                    <DataGridColumnHeader title="Status" column={column} visibility />
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
                    <DataGridColumnHeader title="Added Date" column={column} visibility />
                ),

                cell: ({ row }) => formatDate(row.original?.createdAt),

                size: 150,
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
                        title="Updated Date"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => formatDate(row.original?.updatedAt),

                size: 150,
                enableSorting: true,

                meta: {
                    headerTitle: "Updated Date",
                    skeleton: <Skeleton className="h-7 w-24" />,
                },
            },

            {
                accessorKey: "createdByName",
                id: "createdByName",

                header: ({ column }) => (
                    <DataGridColumnHeader title="Created By" column={column} visibility />
                ),

                cell: ({ row }) => <span>{row.original.createdByName || "-"}</span>,

                size: 180,
                enableSorting: false,

                meta: {
                    headerTitle: "Created By",
                    skeleton: <Skeleton className="h-7 w-24" />,
                },
            },

            {
                accessorKey: "updatedByName",
                id: "updatedByName",

                header: ({ column }) => (
                    <DataGridColumnHeader title="Updated By" column={column} visibility />
                ),

                cell: ({ row }) => <span>{row.original.updatedByName || "-"}</span>,

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
                                    aria-label={`Actions for ${item.locationName}`}
                                >
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                                {canView && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedLocation(item);
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
                                            setSelectedLocation(item);
                                            setEditDialogOpen(true);
                                        }}
                                    >
                                        <Pencil className="mr-2 size-4" />
                                        Edit
                                    </DropdownMenuItem>
                                )}

                                {(canManage || canEdit) && (
                                    <DropdownMenuItem
                                        onClick={() => void handleCopyLocation(item)}
                                    >
                                        <Copy className="mr-2 size-4" />
                                        Copy
                                    </DropdownMenuItem>
                                )}

                                {(canManage || canEdit) && (
                                    <DropdownMenuItem
                                        onClick={() => void handleToggleLocationStatus(item)}
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
            locations,
            selectedIds,
            bulkLoading,
            toggleCurrentPageSelection,
            toggleRowSelection,
            canView,
            canEdit,
            canManage,
            canDelete,
            handleCopyLocation,
            handleToggleLocationStatus,
        ],
    );

    // ===================================================
    // TABLE
    // ===================================================

    const table = useReactTable({
        columns,
        data: locations,

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
                        placeholder="Search location"
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
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

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSearch}
                >
                    Search
                </Button>

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
                        <p>Search by location name or location code.</p>
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
                                    onClick={() => setActiveDialogOpen(true)}
                                >
                                    <CheckCircle className="mr-2 size-4" />
                                    {selectedIds.length} Mark Active
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={bulkLoading}
                                    onClick={() => setInactiveDialogOpen(true)}
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
                                ? String(dbStatus.env || "Database").toUpperCase()
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
                            className={`size-4 ${checkingDb ? "animate-spin" : ""}`}
                        />
                    </Button>
                </div>

                {canManage && (
                    <Button type="button" onClick={() => setAddDialogOpen(true)}>
                        <Plus className="mr-2 size-4" />
                        Add Location
                    </Button>
                )}

                <StoreClientFiltersSheet
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
                />
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
                        <h3 className="text-lg font-semibold">Access Denied</h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                            You do not have permission to view Location.
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

            {/* ADD LOCATION */}
            <LocationAddDialog
                open={addDialogOpen}
                closeDialog={() => setAddDialogOpen(false)}
                onSuccess={async (newLocation) => {
                    setAddDialogOpen(false);

                    await createLocationNotification({
                        action: "created",
                        title: "New Location Created",
                        message: `${newLocation?.locationName} has been created.`,
                        locationId: newLocation?.id,
                        locationName: newLocation?.locationName,
                    });

                    await refreshLocations();
                    await syncInventoryLocations();
                }}
            />

            {/* VIEW LOCATION */}
            <LocationViewDialog
                open={viewDialogOpen}
                Location={selectedLocation}
                closeDialog={() => {
                    setViewDialogOpen(false);
                    setSelectedLocation(null);
                }}
            />

            {/* EDIT LOCATION */}
            <LocationEditDialog
                open={editDialogOpen}
                Location={selectedLocation}
                closeDialog={() => {
                    setEditDialogOpen(false);
                    setSelectedLocation(null);
                }}
                onSuccess={async (updatedLocation) => {
                    const name =
                        updatedLocation?.locationName || selectedLocation?.locationName;

                    await createLocationNotification({
                        action: "updated",
                        title: "Location Updated",
                        message: `${name} has been updated.`,
                        locationId: updatedLocation?.id || selectedLocation?.id,
                        locationName: name,
                    });

                    await refreshLocations();
                    await syncInventoryLocations();
                }}
            />

            {/* DELETE LOCATION */}
            <LocationDeleteDialog
                open={deleteDialogOpen}
                Location={selectedLocation}
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                closeDialog={() => {
                    setDeleteDialogOpen(false);
                    setSelectedLocation(null);
                }}
            />

            {/* COPY LOCATION */}
            <Dialog
                open={copyDialogOpen}
                onOpenChange={(open) => {
                    if (copyLoading) return;

                    setCopyDialogOpen(open);

                    if (!open) {
                        setCopySourceItem(null);
                        setCopyLocationName("");
                        setCopyLocationCode("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Copy Location</DialogTitle>

                        <DialogDescription>
                            Enter a unique location name and code for the copied location.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleConfirmCopyLocation();
                        }}
                    >
                        <div className="space-y-2">
                            <label
                                htmlFor="copy-location-name"
                                className="text-sm font-medium"
                            >
                                Location Name
                                <span className="text-destructive"> *</span>
                            </label>

                            <Input
                                id="copy-location-name"
                                value={copyLocationName}
                                onChange={(event) => setCopyLocationName(event.target.value)}
                                placeholder="Enter location name"
                                maxLength={255}
                                required
                                disabled={copyLoading}
                            />

                            {copySourceItem && (
                                <p className="text-xs text-muted-foreground">
                                    Copying from: {copySourceItem.locationName}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="copy-location-code"
                                className="text-sm font-medium"
                            >
                                Location Code
                                <span className="text-destructive"> *</span>
                            </label>

                            <Input
                                id="copy-location-code"
                                value={copyLocationCode}

                                readOnly
                                placeholder="Enter location code"
                                maxLength={25}
                                required
                                disabled={copyLoading}
                            />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setCopyDialogOpen(false)}
                                disabled={copyLoading}
                            >
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                disabled={
                                    copyLoading ||
                                    !copyLocationName.trim() ||
                                    !copyLocationCode.trim()
                                }
                            >
                                <Copy className="mr-2 size-4" />
                                {copyLoading ? "Copying..." : "Copy Location"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* BULK ACTIVE */}
            <LocationsActiveDialog
                open={activeDialogOpen}
                onOpenChange={setActiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() => handleBulkStatus(true)}
            />

            {/* BULK INACTIVE */}
            <LocationsInactiveDialog
                open={inactiveDialogOpen}
                onOpenChange={setInactiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() => handleBulkStatus(false)}
            />

            {/* BULK DELETE */}
            <LocationsDeleteDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={setBulkDeleteDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={handleConfirmBulkDelete}
            />

            {/* EMAIL REPORT  */}
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] flex flex-col gap-0 overflow-hidden sm:w-[90vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px] p-0">
                    <form
                        className="flex h-full max-h-[90vh] flex-col overflow-hidden"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleSendEmail();
                        }}
                    >
                        <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
                            <DialogTitle>Email Locations</DialogTitle>

                            <DialogDescription>
                                Select recipients and send the Locations report.
                            </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
                            {/* Recipient Selection */}
                            <DialogBody className="space-y-6 px-6 min-h-0">
                                {/* RECIPIENTS */}
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-sm font-medium">Recipient Email</label>

                                    <span className="text-xs text-muted-foreground">
                                        {selectedRecipientEmails.length} of {staffList.length}{" "}
                                        selected
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
                                                onClick={() => setSelectedRecipientEmails([])}
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
                                                                setSelectedRecipientEmails((previous) =>
                                                                    previous.filter((item) => item !== email),
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

                                {/* SELECT ALL STAFF */}
                                <div className="overflow-hidden rounded-lg border">
                                    <div className="border-b bg-muted/30 p-2">
                                        <label className="flex cursor-pointer items-center gap-2">
                                            <Checkbox
                                                checked={
                                                    staffList.length > 0 &&
                                                    staffList.every((person) =>
                                                        selectedRecipientEmails.includes(person.email),
                                                    )
                                                }
                                                disabled={staffLoading || staffList.length === 0}
                                                onCheckedChange={(checked) => {
                                                    setSelectedRecipientEmails((previous) =>
                                                        checked === true
                                                            ? [
                                                                ...new Set([
                                                                    ...previous,
                                                                    ...staffList.map((person) => person.email),
                                                                ]),
                                                            ]
                                                            : previous.filter(
                                                                (email) =>
                                                                    !staffList.some(
                                                                        (person) => person.email === email,
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
                                                        const isSelected = selectedRecipientEmails.includes(
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
                                                                        setSelectedRecipientEmails((previous) =>
                                                                            checked === true
                                                                                ? [
                                                                                    ...new Set([
                                                                                        ...previous,
                                                                                        person.email,
                                                                                    ]),
                                                                                ]
                                                                                : previous.filter(
                                                                                    (email) => email !== person.email,
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

                                {/* SUBJECT */}
                                <div className="space-y-2">
                                    <label
                                        htmlFor="location-subject"
                                        className="text-sm font-medium"
                                    >
                                        Subject
                                    </label>

                                    <Input
                                        id="location-subject"
                                        required
                                        value={emailSubject}
                                        onChange={(event) => setEmailSubject(event.target.value)}
                                        placeholder="Locations Report"
                                    />
                                </div>

                                {/* EXCEL ATTACHMENT */}
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
                                                Attach the location report as an Excel file (.xlsx).
                                            </span>
                                        </span>

                                        <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                                    </label>
                                </div>

                                {/* MESSAGE */}
                                <div className="space-y-2">
                                    <label
                                        htmlFor="location-message"
                                        className="text-sm font-medium"
                                    >
                                        Message
                                    </label>

                                    <Textarea
                                        id="location-message"
                                        required
                                        rows={5}
                                        value={emailMessage}
                                        onChange={(event) => setEmailMessage(event.target.value)}
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
                                    {emailSending ? "Sending Email..." : "Send Email"}
                                </Button>
                            </DialogFooter>
                        </ScrollArea>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default LocationList;