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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/tooltip';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import ItemGroupAddDialog from "./item-group-add-dialog";
import ItemGroupEditDialog from "./item-group-edit-dialog";
import ItemGroupViewDialog from "./item-group-view-dialog";
import ItemGroupDeleteDialog from "./item-group-delete-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";
import ItemGroupsActiveDialog from "./items-groups-active-dialog";
import ItemGroupsInactiveDialog from "./items-groups-inactive-dialog";
import ItemGroupsDeleteDialog from "./items-groups-delete-dialog";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
const createItemGroupNotification = async ({
    action,
    title,
    message,
    itemGroupId = null,
    itemGroupName = null,
}) => {
    try {
        const response = await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                module: "inventory",
                action,
                title,
                message,
                entityId:
                    itemGroupId !== null && itemGroupId !== undefined
                        ? String(itemGroupId)
                        : null,
                entityType: "item_group",
                entityName: itemGroupName || "Item Group",
                url: "/inventory/item_group",
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
        console.error("ITEM GROUP NOTIFICATION ERROR", error);
        return null;
    }
};

const ItemGroupList = () => {
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user?.permissions || [],
        [session?.user?.permissions],
    );

    const canView = can("item_group.view", userPermissions);
    const canManage = can("item_group.manage", userPermissions);
    const canEdit = can("item_group.edit", userPermissions);
    const canDelete = can("item_group.delete", userPermissions);

    // Table state
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);

    // Search and filters
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const [statusFilter, setStatusFilter] = useState("all");
    const [createdFrom, setCreatedFrom] = useState("");
    const [createdTo, setCreatedTo] = useState("");
    const [updatedFrom, setUpdatedFrom] = useState("");
    const [updatedTo, setUpdatedTo] = useState("");
    const [createdByFilter, setCreatedByFilter] = useState("");
    const [updatedByFilter, setUpdatedByFilter] = useState("");
    // Selection and bulk actions
    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);

    // Connection state
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

    // CRUD dialogs
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedItemGroup, setSelectedItemGroup] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Email report
    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [staffList, setStaffList] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [selectedRecipientEmails, setSelectedRecipientEmails] = useState([]);
    const [attachExcel, setAttachExcel] = useState(true);
    const [emailSending, setEmailSending] = useState(false);

    // Bulk confirmation dialogs
    const [activeDialogOpen, setActiveDialogOpen] = useState(false);
    const [inactiveDialogOpen, setInactiveDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    // Copy dialog
    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [copySourceItem, setCopySourceItem] = useState(null);
    const [copyGroupName, setCopyGroupName] = useState("");
    const [copyDescription, setCopyDescription] = useState("");
    const [copyLoading, setCopyLoading] = useState(false);

    const refreshItemGroups = useCallback(async () => {
        await queryClient.invalidateQueries({
            queryKey: ["item-groups"],
        });
    }, [queryClient]);

    const syncInventoryItemGroups = useCallback(async () => {
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
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result?.message || "Inventory sync failed");
            }

            window.dispatchEvent(new CustomEvent("notifications-refresh"));
            return result;
        } catch (error) {
            console.error("ITEM GROUP SYNC ERROR", error);
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {error.message}
                        </AlertTitle>
                    </Alert>
                ),
                { position: "top-center" },
            );
            return null;
        } finally {
            syncingRef.current = false;
            setSyncing(false);
        }
    }, []);

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
            console.error("DATABASE STATUS ERROR", error);
            setDbStatus((prev) => ({
                ...prev,
                online: false,
                loading: false,
            }));
        } finally {
            setCheckingDb(false);
        }
    }, []);

    const fetchItemGroups = useCallback(async () => {
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
            `/api/inventory/item-groups?${params.toString()}`,
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed loading item groups");
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
        sorting,
    ]);

    const { data, isLoading, isFetching, error } = useQuery({
        queryKey: [
            "item-groups",
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
        queryFn: fetchItemGroups,
        staleTime: 0,
    });

    const itemGroups = data?.data || [];
    const totalRecords = Number(data?.pagination?.total || 0);

    const currentPageIds = useMemo(
        () => itemGroups.map((item) => String(item.id)),
        [itemGroups],
    );

    const allCurrentPageSelected =
        currentPageIds.length > 0 &&
        currentPageIds.every((id) => selectedIds.includes(id));

    // Report rows: selected rows on the current page, or all matching records.
    const getItemGroupReportRows = useCallback(async () => {
        if (selectedIds.length > 0) {
            const selectedSet = new Set(selectedIds.map(String));
            return itemGroups.filter((item) => selectedSet.has(String(item.id)));
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
            sort: sorting?.[0]?.id || "createdAt",
            dir: sorting?.[0]?.desc ? "desc" : "asc",
        });

        const response = await apiFetch(
            `/api/inventory/item-groups?${params.toString()}`,
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to load item groups");
        }

        return result.data || [];
    }, [
        selectedIds,
        itemGroups,
        searchQuery,
        statusFilter,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        sorting,
    ]);

    const buildItemGroupExcel = useCallback((items) => {
        const rows = items.map((item) => ({
            ID: item.id,
            "Group Name": item.groupName || "",
            Description: item.description || "",
            Status: item.status ? "Active" : "Inactive",
            Default: item.isDefault ? "Yes" : "No",
            "Created Date": item.createdAt
                ? new Date(item.createdAt).toLocaleString()
                : "",
            "Updated Date": item.updatedAt
                ? new Date(item.updatedAt).toLocaleString()
                : "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = [
            { wch: 15 },
            { wch: 30 },
            { wch: 45 },
            { wch: 14 },
            { wch: 12 },
            { wch: 22 },
            { wch: 22 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Item Groups");
        return workbook;
    }, []);

    const downloadItemGroupExcel = useCallback(
        (items, filename = "item-groups.xlsx") => {
            if (!items.length) {
                toast.error("No item groups to export");
                return false;
            }

            XLSX.writeFile(buildItemGroupExcel(items), filename);
            return true;
        },
        [buildItemGroupExcel],
    );

    const handleExportExcel = useCallback(async () => {
        try {
            toast.loading("Preparing Excel export...", {
                id: "item-group-export",
            });

            const items = await getItemGroupReportRows();

            if (!items.length) {
                toast.error("No item groups to export", {
                    id: "item-group-export",
                });
                return;
            }

            downloadItemGroupExcel(items);

            toast.custom(
                () => (
                    <Alert variant="mono" icon="success" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {items.length} item group(s) exported.
                        </AlertTitle>
                    </Alert>
                ),
                {
                    id: "item-group-export",
                    position: "top-center",
                },
            );
        } catch (error) {
            console.error("ITEM GROUP EXPORT ERROR", error);
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {error.message}
                        </AlertTitle>
                    </Alert>
                ),
                { position: "top-center" },
            );
        }
    }, [getItemGroupReportRows, downloadItemGroupExcel]);

    const handlePrintItemGroups = useCallback(async () => {
        try {
            const items = await getItemGroupReportRows();

            if (!items.length) {
                toast.error("No item groups to print");
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
              <td>${escapeHtml(item.groupName)}</td>
              <td>${escapeHtml(item.description || "-")}</td>
              <td>${item.status ? "Active" : "Inactive"}</td>
              <td>${item.isDefault ? "Yes" : "No"}</td>
              <td>${escapeHtml(
                        item.createdAt
                            ? new Date(item.createdAt).toLocaleDateString()
                            : "-",
                    )}</td>
              <td>${escapeHtml(
                        item.updatedAt
                            ? new Date(item.updatedAt).toLocaleDateString()
                            : "-",
                    )}</td>
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
            <title>Item Groups Report</title>
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
            <h1>Item Groups Report</h1>
            <p>Generated: ${escapeHtml(new Date().toLocaleString())}</p>
            <p>Total records: ${items.length}</p>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Group Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Default</th>
                  <th>Added Date</th>
                  <th>Updated Date</th>
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
            console.error("ITEM GROUP PRINT ERROR", error);
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {error.message}
                        </AlertTitle>
                    </Alert>
                ),
                { position: "top-center" },
            );
        }
    }, [getItemGroupReportRows]);
    const handleSearch = useCallback(
        (event) => {
            event?.preventDefault();

            const keyword = searchInput.trim();

            setPagination((prev) => ({
                ...prev,
                pageIndex: 0,
            }));

            setSearchQuery(keyword);
        },
        [searchInput]
    );

    // const clearFilters = useCallback(() => {
    //     setSearchInput("");
    //     setSearchQuery("");
    //     setStatusFilter("all");
    //     setCreatedFrom("");
    //     setCreatedTo("");
    //     setUpdatedFrom("");
    //     setUpdatedTo("");
    //     setSelectedIds([]);
    //     setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    // }, []);

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
    const handleDelete = useCallback((item) => {
        setSelectedItemGroup(item);
        setDeleteDialogOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!selectedItemGroup?.id) return;

        try {
            setDeleteLoading(true);

            const response = await apiFetch("/api/inventory/item-groups", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selectedItemGroup.id }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Delete failed");
            }
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            Item group deleted successfully
                        </AlertTitle>
                    </Alert>
                ),
                { position: "top-center" },
            );


            await createItemGroupNotification({
                action: "deleted",
                title: "Item Group Deleted",
                message: `${selectedItemGroup.groupName} item group has been deleted.`,
                itemGroupId: selectedItemGroup.id,
                itemGroupName: selectedItemGroup.groupName,
            });

            setDeleteDialogOpen(false);
            setSelectedIds((prev) =>
                prev.filter((id) => id !== String(selectedItemGroup.id)),
            );
            setSelectedItemGroup(null);

            await refreshItemGroups();
            await syncInventoryItemGroups();
        } catch (error) {
            console.error("ITEM GROUP DELETE ERROR", error);
            toast.error(error.message || "Delete failed");
        } finally {
            setDeleteLoading(false);
        }
    }, [selectedItemGroup, refreshItemGroups, syncInventoryItemGroups]);

    const getExistingGroupNames = useCallback(async () => {
        const params = new URLSearchParams({
            page: "1",
            limit: "10000",
            sort: "createdAt",
            dir: "desc",
        });

        const response = await apiFetch(
            `/api/inventory/item-groups?${params.toString()}`,
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Unable to check existing group names.",
            );
        }

        return new Set(
            (result.data || []).map((group) =>
                String(group.groupName || "")
                    .trim()
                    .toLowerCase(),
            ),
        );
    }, []);

    const handleCopyItemGroup = useCallback(
        async (item) => {
            try {
                const originalName = String(item.groupName || "").trim();

                if (!originalName) {
                    toast.error("The original group name is empty.");
                    return;
                }

                const existingNames = await getExistingGroupNames();
                let copiedName = `${originalName} (Copy)`;
                let counter = 2;

                while (existingNames.has(copiedName.toLowerCase())) {
                    copiedName = `${originalName} (Copy ${counter})`;
                    counter += 1;
                }

                setCopySourceItem(item);
                setCopyGroupName(copiedName);
                setCopyDescription(item.description || "");
                setCopyDialogOpen(true);
            } catch (error) {
                console.error("OPEN COPY DIALOG ERROR", error);
                toast.custom(
                    () => (
                        <Alert variant="mono" icon="error" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>
                                {error.message}
                            </AlertTitle>
                        </Alert>
                    ),
                    { position: "top-center" },
                );
            }
        },
        [getExistingGroupNames],
    );

    const handleConfirmCopyItemGroup = useCallback(async () => {
        if (!copySourceItem?.id) {
            toast.error("Please select an item group to copy.");
            return;
        }

        const finalName = copyGroupName.trim();

        if (!finalName) {
            toast.error("Please enter a group name.");
            return;
        }

        try {
            setCopyLoading(true);

            const existingNames = await getExistingGroupNames();

            if (existingNames.has(finalName.toLowerCase())) {
                toast.error("This group name already exists. Please use another name.");
                return;
            }

            const response = await apiFetch("/api/inventory/item-groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    groupName: finalName,
                    description: copySourceItem.description || "",
                    status: Boolean(copySourceItem.status),
                    isDefault: false,
                }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to copy item group.");
            }
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            Item group copied successfully.
                        </AlertTitle>
                    </Alert>
                ),
                { position: "top-center" },
            );


            await createItemGroupNotification({
                action: "created",
                title: "Item Group Copied",
                message: `${finalName} was copied from ${copySourceItem.groupName}.`,
                itemGroupId: result.data?.id,
                itemGroupName: finalName,
            });

            setCopyDialogOpen(false);
            setCopySourceItem(null);
            setCopyGroupName("");
            setCopyDescription("");
            await refreshItemGroups();
            await syncInventoryItemGroups();
        } catch (error) {
            console.error("ITEM GROUP COPY ERROR", error);
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {error.message}
                        </AlertTitle>
                    </Alert>
                ),
                { position: "top-center" },
            );
        } finally {
            setCopyLoading(false);
        }
    }, [
        copySourceItem,
        copyGroupName,
        getExistingGroupNames,
        refreshItemGroups,
        syncInventoryItemGroups,
    ]);

    const handleToggleItemGroupStatus = useCallback(
        async (item) => {
            const nextStatus = !Boolean(item.status);

            try {
                const response = await apiFetch("/api/inventory/item-groups", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: item.id,
                        status: nextStatus,
                    }),
                });
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.message || "Status update failed");
                }

                toast.custom(
                    () => (
                        <Alert variant="mono" icon="success" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>
                                {`${item.groupName} marked ${nextStatus ? "active" : "inactive"}`}
                            </AlertTitle>
                        </Alert>
                    ),
                    {
                        id: "item-group-status",
                        position: "top-center",
                    },
                );

                await refreshItemGroups();
                await syncInventoryItemGroups();
            } catch (error) {
                console.error("ITEM GROUP STATUS ERROR", error);
                toast.custom(
                    () => (
                        <Alert variant="mono" icon="error" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>
                                {error.message}
                            </AlertTitle>
                        </Alert>
                    ),
                    { position: "top-center" },
                );
            }
        },
        [refreshItemGroups, syncInventoryItemGroups],
    );

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

    const handleBulkStatus = useCallback(
        async (status) => {
            if (!selectedIds.length) {
                toast.error("Select at least one item group");
                return;
            }

            if (!(canManage || canEdit)) {
                toast.error("You do not have permission to change item group status");
                return;
            }

            const idsToUpdate = [...selectedIds];

            try {
                setBulkLoading(true);

                const response = await apiFetch("/api/inventory/item-groups", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: idsToUpdate, status }),
                });
                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        "Bulk status update failed. Check your API route.",
                    );
                }

                toast.custom(
                    () => (
                        <Alert variant="mono" icon="success" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>
                                {`${result.count ?? idsToUpdate.length} item group(s) marked ${status ? "active" : "inactive"}`}
                            </AlertTitle>
                        </Alert>
                    ),
                    {
                        id: "item-group-status-update",
                        position: "top-center",
                    },
                );

                setActiveDialogOpen(false);
                setInactiveDialogOpen(false);
                setSelectedIds([]);

                await refreshItemGroups();
                await syncInventoryItemGroups();
            } catch (error) {
                console.error("BULK STATUS ERROR", error);
                toast.custom(
                    () => (
                        <Alert variant="mono" icon="error" close={false}>
                            <AlertIcon>
                                <RiCheckboxCircleFill />
                            </AlertIcon>
                            <AlertTitle>
                                {error.message}
                            </AlertTitle>
                        </Alert>
                    ),
                    { position: "top-center" },
                );
            } finally {
                setBulkLoading(false);
            }
        },
        [
            selectedIds,
            canManage,
            canEdit,
            refreshItemGroups,
            syncInventoryItemGroups,
        ],
    );

    const handleBulkDelete = useCallback(() => {
        if (!selectedIds.length) {
            toast.error("Select at least one item group");
            return;
        }

        if (!canDelete) {
            toast.error("You do not have permission to delete item groups");
            return;
        }

        setBulkDeleteDialogOpen(true);
    }, [selectedIds, canDelete]);

    const handleConfirmBulkDelete = useCallback(async () => {
        if (!selectedIds.length || bulkLoading) return;

        const idsToDelete = [...selectedIds];

        try {
            setBulkLoading(true);

            const response = await apiFetch("/api/inventory/item-groups", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: idsToDelete }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Bulk delete failed. Your API route must support ids.",
                );
            }

            toast.custom(
                () => (
                    <Alert variant="mono" icon="success" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {`${result.count ?? idsToDelete.length} item group(s) deleted`}
                        </AlertTitle>
                    </Alert>
                ),
                {
                    id: "item-group-delete",
                    position: "top-center",
                },
            );

            setBulkDeleteDialogOpen(false);
            setSelectedIds([]);

            await refreshItemGroups();
            await syncInventoryItemGroups();
        } catch (error) {
            console.error("BULK DELETE ERROR", error);
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {error.message}
                        </AlertTitle>
                    </Alert>
                ),
                { position: "top-center" },
            );
        } finally {
            setBulkLoading(false);
        }
    }, [selectedIds, bulkLoading, refreshItemGroups, syncInventoryItemGroups]);

    const handleOpenEmailDialog = useCallback(() => {
        setSelectedRecipientEmails([]);
        setAttachExcel(true);
        setEmailSubject("Item Groups Report");
        setEmailMessage(
            [
                "Dear Team,",
                "",
                "Please find the Item Groups report for your review.",
                "",
                "The report includes the item group name, description, status, default setting, and creation and update dates.",
                "",
                "Please review the information and let us know if any corrections are required.",
                "",
                "Regards,",
                "Inventory Management Team",
            ].join("\n"),
        );
        setEmailDialogOpen(true);
    }, []);


    // Support the existing shared header buttons by ID.
    useEffect(() => {
        const handleReportButtonClick = (event) => {
            if (!(event.target instanceof Element)) return;

            const button = event.target.closest("#Print, #Export, #Email");

            if (!button) return;

            // Prevent these handlers from running on unrelated pages.
            if (!window.location.pathname.includes("/item_group")) return;

            switch (button.id) {
                case "Print":
                    event.preventDefault();
                    void handlePrintItemGroups();
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
        handlePrintItemGroups,
        handleExportExcel,
        handleOpenEmailDialog,
    ]);


    const handleSendEmail = useCallback(async () => {
        if (selectedRecipientEmails.length === 0) {
            toast.error("Please select at least one recipient.");
            return;
        }

        if (!emailSubject.trim() || !emailMessage.trim()) {
            toast.error("Please enter the email subject and message.");
            return;
        }

        try {
            setEmailSending(true);

            const response = await fetch("/api/inventory/item-groups/email-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
                    },
                }),
            });
            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.error || result.message || "Failed to send email.",
                );
            }

            toast.custom(
                () => (
                    <Alert variant="mono" icon="success" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {attachExcel
                                ? "Email sent successfully with the Excel attachment."
                                : "Email sent successfully."}
                        </AlertTitle>
                    </Alert>
                ),
                {
                    id: "item-group-email",
                    position: "top-center",
                },
            );
            setEmailDialogOpen(false);
        } catch (error) {
            console.error("EMAIL REPORT ERROR", error);
            toast.custom(
                () => (
                    <Alert variant="mono" icon="error" close={false}>
                        <AlertIcon>
                            <RiCheckboxCircleFill />
                        </AlertIcon>
                        <AlertTitle>
                            {error.message}
                        </AlertTitle>
                    </Alert>
                ),
                { position: "top-center" },
            );
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
    ]);

    // Load staff recipients only while the email dialog is open.
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
                console.error("STAFF RECIPIENT LOAD ERROR", error);

                if (!cancelled) {
                    setStaffList([]);
                    toast.custom(
                        () => (
                            <Alert variant="mono" icon="error" close={false}>
                                <AlertIcon>
                                    <RiCheckboxCircleFill />
                                </AlertIcon>
                                <AlertTitle>
                                    {error.message}
                                </AlertTitle>
                            </Alert>
                        ),
                        { position: "top-center" },
                    );
                }
            } finally {
                if (!cancelled) setStaffLoading(false);
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
            await syncInventoryItemGroups();
            await refreshItemGroups();
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
    }, [checkDbStatus, syncInventoryItemGroups, refreshItemGroups]);

    useEffect(() => {
        void checkDbStatus();
        const interval = setInterval(() => void checkDbStatus(), 30000);

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
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={(checked) => {
                            if (checked === true) {
                                toggleCurrentPageSelection();
                            } else {
                                toggleCurrentPageSelection();
                            }
                        }}
                        disabled={!itemGroups.length || bulkLoading}
                    />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    const id = String(item.id);

                    return (
                        <Checkbox
                            aria-label={`Select ${item.groupName}`}
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
                accessorKey: "groupName",
                id: "groupName",
                header: ({ column }) => (
                    <DataGridColumnHeader title="Group Name" column={column} visibility />
                ),
                cell: ({ row }) => (
                    <span className="font-medium">{row.original.groupName}</span>
                ),
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
                    <span className="block max-w-[350px] truncate">
                        {row.original.description || "-"}
                    </span>
                ),
                size: 300,
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
                accessorKey: "isDefault",
                id: "isDefault",
                header: "Default",
                cell: ({ row }) => <span>{row.original.isDefault ? "Yes" : "No"}</span>,
                size: 100,
            },
            {
                accessorKey: "createdAt",
                id: "createdAt",
                header: ({ column }) => (
                    <DataGridColumnHeader title="Added Date" column={column} visibility />
                ),
                cell: ({ row }) => {
                    const value = row.original?.createdAt;
                    if (!value) return "-";

                    const date = new Date(value);
                    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
                },
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
                cell: ({ row }) => {
                    const value = row.original?.updatedAt;
                    if (!value) return "-";

                    const date = new Date(value);
                    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
                },
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
                    <DataGridColumnHeader
                        title="Created By"
                        column={column}
                        visibility
                    />
                ),
                cell: ({ row }) => (
                    <span>{row.original.createdByName || "-"}</span>
                ),
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
                    <DataGridColumnHeader
                        title="Updated By"
                        column={column}
                        visibility
                    />
                ),
                cell: ({ row }) => (
                    <span>{row.original.updatedByName || "-"}</span>
                ),
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
                                    aria-label={`Actions for ${item.groupName}`}
                                >
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                                {canView && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedItemGroup(item);
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
                                            setSelectedItemGroup(item);
                                            setEditDialogOpen(true);
                                        }}
                                    >
                                        <Pencil className="mr-2 size-4" />
                                        Edit
                                    </DropdownMenuItem>
                                )}

                                {(canManage || canEdit) && (
                                    <DropdownMenuItem
                                        onClick={() => void handleCopyItemGroup(item)}
                                    >
                                        <Copy className="mr-2 size-4" />
                                        Copy
                                    </DropdownMenuItem>
                                )}

                                {(canManage || canEdit) && (
                                    <DropdownMenuItem
                                        onClick={() => void handleToggleItemGroupStatus(item)}
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
            itemGroups,
            selectedIds,
            bulkLoading,
            toggleCurrentPageSelection,
            toggleRowSelection,
            canView,
            canEdit,
            canManage,
            canDelete,
            handleDelete,
            handleCopyItemGroup,
            handleToggleItemGroupStatus,
        ],
    );

    const table = useReactTable({
        columns,
        data: itemGroups,
        pageCount: Math.ceil(totalRecords / pagination.pageSize),
        state: { pagination, sorting },
        onPaginationChange: setPagination,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        manualPagination: true,
        manualSorting: true,
        manualFiltering: true,
    });

    const renderToolbar = () => {
        const hasActiveFilters =
            Boolean(searchInput.trim()) ||
            Boolean(searchQuery) ||
            statusFilter !== "all" ||
            Boolean(createdFrom) ||
            Boolean(createdTo) ||
            Boolean(updatedFrom) ||
            Boolean(updatedTo);

        return (
            <CardHeader className="flex-col flex-wrap items-stretch gap-3 py-5 sm:flex-row sm:items-center">
                <div className="flex w-full items-center gap-2 sm:w-auto">
                    <div className="relative flex-1 sm:w-[250px] sm:flex-none">
                        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                            type="text"
                            placeholder="Search item group..."
                            value={searchInput}
                            onChange={(event) => setSearchInput(event.target.value)}
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
                                    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
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
                            <p>Search by group name, description.</p>
                        </TooltipContent>
                    </Tooltip>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    {selectedIds.length > 0 && (
                        <div className="">
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
                                    ? `${String(dbStatus.env || "Database").toUpperCase()}`
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
                            Add Item Group
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

                    {/* {hasActiveFilters && (
                        <Button type="button" variant="ghost" onClick={clearFilters}>
                            <X className="mr-2 size-4" />
                            Clear Filters
                        </Button>
                    )} */}
                </div>
            </CardHeader>
        );
    };

    if (!canView) {
        return (
            <Card>
                <CardHeader>
                    <div>
                        <h3 className="text-lg font-semibold">Access Denied</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            You do not have permission to view Item Group.
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
                tableClassNames={{ edgeCell: "px-5" }}
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

            <ItemGroupAddDialog
                open={addDialogOpen}
                closeDialog={() => setAddDialogOpen(false)}
                onSuccess={async (newItemGroup) => {
                    setAddDialogOpen(false);

                    await createItemGroupNotification({
                        action: "created",
                        title: "New Item Group Created",
                        message: `${newItemGroup?.groupName} has been created.`,
                        itemGroupId: newItemGroup?.id,
                        itemGroupName: newItemGroup?.groupName,
                    });

                    await refreshItemGroups();
                    await syncInventoryItemGroups();
                }}
            />

            <ItemGroupViewDialog
                open={viewDialogOpen}
                ItemGroup={selectedItemGroup}
                closeDialog={() => {
                    setViewDialogOpen(false);
                    setSelectedItemGroup(null);
                }}
            />

            <ItemGroupEditDialog
                open={editDialogOpen}
                ItemGroup={selectedItemGroup}
                closeDialog={() => {
                    setEditDialogOpen(false);
                    setSelectedItemGroup(null);
                }}
                onSuccess={async (updatedItemGroup) => {
                    await createItemGroupNotification({
                        action: "updated",
                        title: "Item Group Updated",
                        message: `${updatedItemGroup?.groupName || selectedItemGroup?.groupName
                            } has been updated.`,
                        itemGroupId: updatedItemGroup?.id || selectedItemGroup?.id,
                        itemGroupName:
                            updatedItemGroup?.groupName || selectedItemGroup?.groupName,
                    });

                    await refreshItemGroups();
                    await syncInventoryItemGroups();
                }}
            />

            <ItemGroupDeleteDialog
                open={deleteDialogOpen}
                ItemGroup={selectedItemGroup}
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                closeDialog={() => {
                    setDeleteDialogOpen(false);
                    setSelectedItemGroup(null);
                }}
            />

            {/* Email report dialog */}
            <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] flex flex-col gap-0 overflow-hidden sm:w-[90vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px] p-0">
                    <form
                        className="flex flex-col h-full max-h-[90vh] overflow-hidden"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleSendEmail();
                        }}
                    >
                        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
                            <DialogTitle>Email Item Groups</DialogTitle>
                            <DialogDescription>
                                Select recipients and send the item groups report.
                            </DialogDescription>
                        </DialogHeader>


                        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
                            {/* Recipient Selection */}
                            <DialogBody className="space-y-6 px-6 min-h-0">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-sm font-medium">
                                        Recipient Email
                                    </label>

                                    <span className="text-xs text-muted-foreground">
                                        {selectedRecipientEmails.length} of {staffList.length} selected
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
                                                onClick={() => setSelectedRecipientEmails([])}
                                            >
                                                Clear all
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {selectedRecipientEmails.map((email) => {
                                                const person = staffList.find(
                                                    (staff) => staff.email === email
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
                                                                    previous.filter((item) => item !== email)
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

                                {/* Staff Selection */}
                                <div className="overflow-hidden rounded-lg border">
                                    <div className="border-b bg-muted/30 p-2">
                                        <label className="flex cursor-pointer items-center gap-2">
                                            <Checkbox
                                                checked={
                                                    staffList.length > 0 &&
                                                    staffList.every((person) =>
                                                        selectedRecipientEmails.includes(person.email)
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
                                                                        (person) => person.email === email
                                                                    )
                                                            )
                                                    );
                                                }}
                                            />

                                            <span className="text-sm font-medium">
                                                Select all staff
                                            </span>
                                        </label>
                                    </div>

                                    <ScrollArea className="grow max-h-50 flex flex-col h-full overflow-hidden">
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
                                                            selectedRecipientEmails.includes(person.email);

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
                                                                                    (email) =>
                                                                                        email !== person.email
                                                                                )
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
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </div>
                                {!staffLoading && selectedRecipientEmails.length === 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        Select at least one recipient to send the report.
                                    </p>
                                )}
                                {/* Email Subject */}
                                <div className="space-y-2">
                                    <label
                                        htmlFor="item-group-subject"
                                        className="text-sm font-medium"
                                    >
                                        Subject
                                    </label>
                                    <Input
                                        id="item-group-subject"
                                        required
                                        value={emailSubject}
                                        onChange={(event) => setEmailSubject(event.target.value)}
                                        placeholder="Item Groups Report"
                                    />
                                </div>
                                {/* Excel Attachment */}
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
                                                Attach the item group report as an Excel file (.xlsx)
                                                to the email.
                                            </span>
                                        </span>
                                        <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                                    </label>
                                </div>
                                {/* Email Message */}
                                <div className="space-y-2">
                                    <label
                                        htmlFor="item-group-message"
                                        className="text-sm font-medium"
                                    >
                                        Message
                                    </label>
                                    <ScrollArea className="h-[150px] w-full">
                                        <Textarea
                                            id="item-group-message"
                                            required
                                            rows={5}
                                            value={emailMessage}
                                            onChange={(event) => setEmailMessage(event.target.value)}
                                            placeholder="Enter your email message..."
                                            className="min-h-[150px] resize-none"
                                        />
                                    </ScrollArea>

                                    <p className="text-xs text-muted-foreground">
                                        Enter the message to include in the email sent to the selected staff.
                                    </p>
                                </div>
                            </DialogBody>
                            {/* Footer Actions */}
                            <DialogFooter className="gap-2 px-6 pb-2">
                                <Button type="button" variant="outline" onClick={() => setEmailDialogOpen(false)} disabled={emailSending} >
                                    Cancel
                                </Button>

                                <Button type="submit" disabled={emailSending || staffLoading || selectedRecipientEmails.length === 0} >
                                    <Mail className="mr-2 size-4" />
                                    {emailSending ? "Sending Email..." : "Send Email"}
                                </Button>
                            </DialogFooter>
                        </ScrollArea>
                    </form>
                </DialogContent>
            </Dialog >

            {/* Copy item group dialog */}
            < Dialog
                open={copyDialogOpen}
                onOpenChange={(open) => {
                    if (copyLoading) return;

                    setCopyDialogOpen(open);

                    if (!open) {
                        setCopySourceItem(null);
                        setCopyGroupName("");
                        setCopyDescription("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Copy Item Group</DialogTitle>
                        <DialogDescription>
                            Enter a unique name for the copied item group. You can change the
                            suggested name before saving.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleConfirmCopyItemGroup();
                        }}
                    >
                        <div className="space-y-2">
                            <label htmlFor="copy-group-name" className="text-sm font-medium">
                                Group Name <span className="text-destructive">*</span>
                            </label>

                            <Input
                                id="copy-group-name"
                                value={copyGroupName}
                                onChange={(event) => setCopyGroupName(event.target.value)}
                                placeholder="Enter group name"
                                maxLength={150}
                                required
                                autoFocus
                                disabled={copyLoading}
                            />

                            {copySourceItem && (
                                <p className="text-xs text-muted-foreground">
                                    Copying from: {copySourceItem.groupName}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label
                                htmlFor="copy-item-type-description"
                                className="text-sm font-medium"
                            >
                                Description
                            </label>

                            <textarea
                                id="copy-item-type-description"
                                rows={4}
                                className="w-full rounded-md border border-input bg-background p-3 text-sm"
                                value={copyDescription}
                                onChange={(event) => setCopyDescription(event.target.value)}
                                placeholder="Enter description"
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
                                disabled={copyLoading || !copyGroupName.trim()}
                            >
                                <Copy className="mr-2 size-4" />
                                {copyLoading ? "Copying..." : "Copy Group"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >

            <ItemGroupsActiveDialog
                open={activeDialogOpen}
                onOpenChange={setActiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() => handleBulkStatus(true)}
            />

            <ItemGroupsInactiveDialog
                open={inactiveDialogOpen}
                onOpenChange={setInactiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() => handleBulkStatus(false)}
            />

            <ItemGroupsDeleteDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={setBulkDeleteDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={handleConfirmBulkDelete}
            />
        </>
    );
};

export default ItemGroupList;