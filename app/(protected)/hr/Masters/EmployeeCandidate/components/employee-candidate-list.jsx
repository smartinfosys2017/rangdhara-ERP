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
    Printer,
    PauseCircle,
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import EmployeeCandidateAddDialog from "./employee-candidate-add-dialog";
import EmployeeCandidateEditDialog from "./employee-candidate-edit-dialog";
import EmployeeCandidateViewDialog from "./employee-candidate-view-dialog";
import EmployeeCandidateDeleteDialog from "./employee-candidate-delete-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";
import EmployeeCandidateActiveDialog from "./employee-candidates-active-dialog";
import EmployeeCandidateInactiveDialog from "./employee-candidates-inactive-dialog";
import EmployeeCandidatesDeleteDialog from "./employee-candidates-delete-dialog";

const createEmployeeCandidateNotification = async ({
    action,
    title,
    message,
    EmployeeCandidateId = null,
    StatusName = null,
}) => {
    try {
        const response = await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                module: "hr",
                action,
                title,
                message,
                entityId:
                    EmployeeCandidateId !== null && EmployeeCandidateId !== undefined
                        ? String(EmployeeCandidateId)
                        : null,
                entityType: "EmployeeCandidate",
                entityName: StatusName || "EmployeeCandidate",
                url: "/hr/EmployeeCandidate",
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
        console.error("EmployeeCandidate NOTIFICATION ERROR", error);
        return null;
    }
};

const EmployeeCandidateList = () => {
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    const userPermissions = useMemo(
        () => session?.user?.permissions || [],
        [session?.user?.permissions],
    );

    const canView = can("candidate.view", userPermissions);
    const canManage = can("candidate.manage", userPermissions);
    const canEdit = can("candidate.edit", userPermissions);
    const canDelete = can("candidate.delete", userPermissions);

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
    const [selectedEmployeeCandidate, setSelectedEmployeeCandidate] =
        useState(null);
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

    // Copy  dialog
    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [copySourceItem, setCopySourceItem] = useState(null);
    const [copyStatusName, setCopyStatusName] = useState("");
    const [copyDescription, setCopyDescription] = useState("");
    const [copyLoading, setCopyLoading] = useState(false);

    const refreshEmployeeCandidate = useCallback(async () => {
        await queryClient.invalidateQueries({
            queryKey: ["categories"],
        });
    }, [queryClient]);

    const syncHrEmployeeCandidate = useCallback(async () => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            setIsOnline(false);
            return null;
        }

        if (syncingRef.current) return null;

        try {
            syncingRef.current = true;
            setSyncing(true);

            const response = await fetch("/api/sync/hr-local", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result?.message || "Hr sync failed");
            }

            window.dispatchEvent(new CustomEvent("notifications-refresh"));
            return result;
        } catch (error) {
            console.error("employee candidate SYNC ERROR", error);
            toast.error(error.message || "Hr sync failed");
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

    const fetchEmployeeCandidate = useCallback(async () => {
        const params = new URLSearchParams({
            page: String(pagination.pageIndex + 1),
            limit: String(pagination.pageSize),
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
            `/api/hr/EmployeeCandidate?${params.toString()}`,
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed loading Status");
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
            "categories",
            pagination.pageIndex,
            pagination.pageSize,
            sorting,
            searchQuery,
            statusFilter,
            createdFrom,
            createdTo,
            updatedFrom,
            updatedTo,
        ],
        queryFn: fetchEmployeeCandidate,
        staleTime: 0,
    });

    const Category = data?.data || [];
    const totalRecords = Number(data?.pagination?.total || 0);

    const currentPageIds = useMemo(
        () => Category.map((item) => String(item.id)),
        [Category],
    );

    const allCurrentPageSelected =
        currentPageIds.length > 0 &&
        currentPageIds.every((id) => selectedIds.includes(id));

    // Report rows: selected rows on the current page, or all matching records.
    const getEmployeeCandidateReportRows = useCallback(async () => {
        if (selectedIds.length > 0) {
            const selectedSet = new Set(selectedIds.map(String));
            return Category.filter((item) => selectedSet.has(String(item.id)));
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
            `/api/hr/EmployeeCandidate?${params.toString()}`,
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to load Category");
        }

        return result.data || [];
    }, [
        selectedIds,
        Category,
        searchQuery,
        statusFilter,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        sorting,
    ]);

    const buildEmployeeCandidateExcel = useCallback((items) => {
        const rows = items.map((item) => ({
            ID: item.id,
            "Status Name": item.StatusName || "",
            Description: item.description || "",
            Mode: item.mode || "",
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
        XLSX.utils.book_append_sheet(workbook, worksheet, "EmployeeCandidate");
        return workbook;
    }, []);

    const downloadEmployeeCandidateExcel = useCallback(
        (items, filename = "EmployeeCandidate.xlsx") => {
            if (!items.length) {
                toast.error("No EmployeeCandidate to export");
                return false;
            }

            XLSX.writeFile(buildEmployeeCandidateExcel(items), filename);
            return true;
        },
        [buildEmployeeCandidateExcel],
    );

    const handleExportExcel = useCallback(async () => {
        const toastId = "EmployeeCandidate-export";

        try {
            toast.loading("Preparing Excel export...", {
                id: toastId,
            });

            const items = await getEmployeeCandidateReportRows();

            if (!items.length) {
                toast.error("No employee candidate to export", {
                    id: toastId,
                });
                return;
            }

            const exported = downloadEmployeeCandidateExcel(items);

            if (!exported) {
                toast.error("Excel export failed", {
                    id: toastId,
                });
                return;
            }

            toast.success(
                `${items.length} employee/candidate status exported successfully`,
                {
                    id: toastId,
                },
            );
        } catch (error) {
            console.error("EmployeeCandidate EXPORT ERROR", error);

            toast.error(error.message || "Excel export failed", {
                id: toastId,
            });
        }
    }, [getEmployeeCandidateReportRows, downloadEmployeeCandidateExcel]);

    const handlePrintEmployeeCandidate = useCallback(async () => {
        try {
            const items = await getEmployeeCandidateReportRows();

            if (!items.length) {
                toast.error("No employee candidate to print");
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
              <td>${escapeHtml(item.StatusName)}</td>
              <td>${escapeHtml(item.description || "-")}</td>
               <td>${escapeHtml(item.mode || "-")}</td>
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
            <title>Employee/Candidate Status Report</title>
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
            <h1>Employee/Candidate Status Report</h1>
            <p>Generated: ${escapeHtml(new Date().toLocaleString())}</p>
            <p>Total records: ${items.length}</p>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status Name</th>
                  <th>Description</th>
                  <th>Mode</th>
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
            console.error("EmployeeCandidate PRINT ERROR", error);
            toast.error(error.message || "Unable to prepare print report");
        }
    }, [getEmployeeCandidateReportRows]);
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
        [searchInput],
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
    ]);
    const handleDelete = useCallback((item) => {
        setSelectedEmployeeCandidate(item);
        setDeleteDialogOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!selectedEmployeeCandidate?.id) return;

        try {
            setDeleteLoading(true);

            const response = await apiFetch("/api/hr/EmployeeCandidate", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selectedEmployeeCandidate.id }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Delete failed");
            }

            toast.success("EmployeeCandidate deleted successfully");

            await createEmployeeCandidateNotification({
                action: "deleted",
                title: "EmployeeCandidate Deleted",
                message: `${selectedEmployeeCandidate.StatusName} Category has been deleted.`,
                EmployeeCandidateId: selectedEmployeeCandidate.id,
                StatusName: selectedEmployeeCandidate.StatusName,
            });

            setDeleteDialogOpen(false);
            setSelectedIds((prev) =>
                prev.filter((id) => id !== String(selectedEmployeeCandidate.id)),
            );
            setSelectedEmployeeCandidate(null);

            await refreshEmployeeCandidate();
            await syncHrEmployeeCandidate();
        } catch (error) {
            console.error("EmployeeCandidate DELETE ERROR", error);
            toast.error(error.message || "Delete failed");
        } finally {
            setDeleteLoading(false);
        }
    }, [
        selectedEmployeeCandidate,
        refreshEmployeeCandidate,
        syncHrEmployeeCandidate,
    ]);

    const getExistingStatusNames = useCallback(async () => {
        const params = new URLSearchParams({
            page: "1",
            limit: "10000",
            sort: "createdAt",
            dir: "desc",
        });

        const response = await apiFetch(
            `/api/hr/EmployeeCandidate?${params.toString()}`,
        );
        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Unable to check existing Status Names.",
            );
        }

        return new Set(
            (result.data || []).map((EmployeeCandidate) =>
                String(EmployeeCandidate.StatusName || "")
                    .trim()
                    .toLowerCase(),
            ),
        );
    }, []);

    const handleCopyEmployeeCandidate = useCallback(
        async (item) => {
            try {
                const originalName = String(item.StatusName || "").trim();

                if (!originalName) {
                    toast.error("The original Status Name is empty.");
                    return;
                }

                const existingNames = await getExistingStatusNames();
                let copiedName = `${originalName} (Copy)`;
                let counter = 2;

                while (existingNames.has(copiedName.toLowerCase())) {
                    copiedName = `${originalName} (Copy ${counter})`;
                    counter += 1;
                }

                setCopySourceItem(item);
                setCopyStatusName(copiedName);
                setCopyDescription(item.description || "");
                setCopyDialogOpen(true);
            } catch (error) {
                console.error("OPEN COPY DIALOG ERROR", error);
                toast.error(error.message || "Unable to open copy dialog.");
            }
        },
        [getExistingStatusNames],
    );

    const handleConfirmCopyEmployeeCandidate = useCallback(async () => {
        if (!copySourceItem?.id) {
            toast.error("Please select an EmployeeCandidate to copy.");
            return;
        }

        const finalName = copyStatusName.trim();

        if (!finalName) {
            toast.error("Please enter a Status Name.");
            return;
        }

        try {
            setCopyLoading(true);

            const existingNames = await getExistingStatusNames();

            if (existingNames.has(finalName.toLowerCase())) {
                toast.error(
                    "This Status Name already exists. Please use another name.",
                );
                return;
            }

            const response = await apiFetch("/api/hr/EmployeeCandidate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    StatusName: finalName,
                    description: copySourceItem.description || "",
                    status: Boolean(copySourceItem.status),
                    isDefault: false,
                }),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to copy EmployeeCandidate.");
            }

            toast.success("Employee/Candidate Status copied successfully.");

            await createEmployeeCandidateNotification({
                action: "created",
                title: "EmployeeCandidate Copied",
                message: `${finalName} was copied from ${copySourceItem.StatusName}.`,
                EmployeeCandidateId: result.data?.id,
                StatusName: finalName,
            });

            setCopyDialogOpen(false);
            setCopySourceItem(null);
            setCopyStatusName("");
            setCopyDescription("");
            await refreshEmployeeCandidate();
            await syncHrEmployeeCandidate();
        } catch (error) {
            console.error("EmployeeCandidate COPY ERROR", error);
            toast.error(error.message || "Copy failed.");
        } finally {
            setCopyLoading(false);
        }
    }, [
        copySourceItem,
        copyStatusName,
        getExistingStatusNames,
        refreshEmployeeCandidate,
        syncHrEmployeeCandidate,
    ]);

    const handleToggleEmployeeCandidateStatus = useCallback(
        async (item, nextStatus) => {
            try {
                const response = await apiFetch("/api/hr/EmployeeCandidate", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: item.id,
                        mode: nextStatus, // Active, Inactive, Hold
                    }),
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(result.message || "Status update failed");
                }

                toast.success(`${item.StatusName} marked as ${nextStatus}`);

                await refreshEmployeeCandidate();
                await syncHrEmployeeCandidate();
            } catch (error) {
                console.error("EmployeeCandidate STATUS ERROR", error);
                toast.error(error.message || "Status update failed");
            }
        },
        [refreshEmployeeCandidate, syncHrEmployeeCandidate],
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
                toast.error("Select at least one EmployeeCandidate");
                return;
            }

            if (!(canManage || canEdit)) {
                toast.error(
                    "You do not have permission to change EmployeeCandidate status",
                );
                return;
            }

            const idsToUpdate = [...selectedIds];

            try {
                setBulkLoading(true);

                const response = await apiFetch("/api/hr/EmployeeCandidate", {
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

                toast.success(
                    `${result.count ?? idsToUpdate.length} EmployeeCandidate(s) marked ${status ? "active" : "inactive"
                    }`,
                );

                setActiveDialogOpen(false);
                setInactiveDialogOpen(false);
                setSelectedIds([]);

                await refreshEmployeeCandidate();
                await syncHrEmployeeCandidate();
            } catch (error) {
                console.error("BULK STATUS ERROR", error);
                toast.error(error.message || "Bulk status update failed");
            } finally {
                setBulkLoading(false);
            }
        },
        [
            selectedIds,
            canManage,
            canEdit,
            refreshEmployeeCandidate,
            syncHrEmployeeCandidate,
        ],
    );

    const handleBulkDelete = useCallback(() => {
        if (!selectedIds.length) {
            toast.error("Select at least one EmployeeCandidate");
            return;
        }

        if (!canDelete) {
            toast.error("You do not have permission to delete EmployeeCandidate");
            return;
        }

        setBulkDeleteDialogOpen(true);
    }, [selectedIds, canDelete]);

    const handleConfirmBulkDelete = useCallback(async () => {
        if (!selectedIds.length || bulkLoading) return;

        const idsToDelete = [...selectedIds];

        try {
            setBulkLoading(true);

            const response = await apiFetch("/api/hr/EmployeeCandidate", {
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

            toast.success(
                `${result.count ?? idsToDelete.length} EmployeeCandidate(s) deleted`,
            );

            setBulkDeleteDialogOpen(false);
            setSelectedIds([]);

            await refreshEmployeeCandidate();
            await syncHrEmployeeCandidate();
        } catch (error) {
            console.error("BULK DELETE ERROR", error);
            toast.error(error.message || "Bulk delete failed");
        } finally {
            setBulkLoading(false);
        }
    }, [
        selectedIds,
        bulkLoading,
        refreshEmployeeCandidate,
        syncHrEmployeeCandidate,
    ]);

    const handleOpenEmailDialog = useCallback(() => {
        setSelectedRecipientEmails([]);
        setAttachExcel(true);
        setEmailSubject("Employee/Candidate Status Report");
        setEmailMessage(
            [
                "Dear Team,",
                "",
                "Please find the Employee/Candidate Status report for your review.",
                "",
                "The report includes the Status Name, description, status, default setting, and creation and update dates.",
                "",
                "Please review the information and let us know if any corrections are required.",
                "",
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
            if (!window.location.pathname.includes("/EmployeeCandidate")) return;

            switch (button.id) {
                case "Print":
                    event.preventDefault();
                    void handlePrintEmployeeCandidate();
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
    }, [handlePrintEmployeeCandidate, handleExportExcel, handleOpenEmailDialog]);

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

            const response = await fetch("/api/hr/EmployeeCandidate/email-report", {
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

            toast.success(
                attachExcel
                    ? "Email sent successfully with the Excel attachment."
                    : "Email sent successfully.",
            );
            setEmailDialogOpen(false);
        } catch (error) {
            console.error("EMAIL REPORT ERROR", error);
            toast.error(error.message || "Unable to send email.");
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
                    toast.error(error.message || "Unable to load staff recipients");
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
            await syncHrEmployeeCandidate();
            await refreshEmployeeCandidate();
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
    }, [checkDbStatus, syncHrEmployeeCandidate, refreshEmployeeCandidate]);

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
                        disabled={!Category.length || bulkLoading}
                    />
                ),
                cell: ({ row }) => {
                    const item = row.original;
                    const id = String(item.id);

                    return (
                        <Checkbox
                            aria-label={`Select ${item.StatusName}`}
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
                accessorKey: "StatusName",
                id: "StatusName",
                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Status Name"
                        column={column}
                        visibility
                    />
                ),
                cell: ({ row }) => (
                    <span className="font-medium">{row.original.StatusName}</span>
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
                accessorKey: "mode",
                id: "mode",
                header: ({ column }) => (
                    <DataGridColumnHeader title="Status" column={column} visibility />
                ),
                cell: ({ row }) => {
                    const mode = row.original.mode;

                    const statusStyles = {
                        Active: "font-medium text-green-600",
                        Inactive: "font-medium text-red-600",
                        Hold: "font-medium text-amber-600",
                    };

                    return (
                        <span className={statusStyles[mode] || "font-medium text-muted-foreground"}>
                            {mode || "N/A"}
                        </span>
                    );
                },
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
                                    aria-label={`Actions for ${item.StatusName}`}
                                >
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                                {canView && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedEmployeeCandidate(item);
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
                                            setSelectedEmployeeCandidate(item);
                                            setEditDialogOpen(true);
                                        }}
                                    >
                                        <Pencil className="mr-2 size-4" />
                                        Edit
                                    </DropdownMenuItem>
                                )}

                                {(canManage || canEdit) && (
                                    <DropdownMenuItem
                                        onClick={() => void handleCopyEmployeeCandidate(item)}
                                    >
                                        <Copy className="mr-2 size-4" />
                                        Copy
                                    </DropdownMenuItem>
                                )}

                                {(canManage || canEdit) && (
                                    <>
                                        <DropdownMenuItem
                                            disabled={item.mode === "Active"}
                                            onClick={() =>
                                                void handleToggleEmployeeCandidateStatus(item, "Active")
                                            }
                                        >
                                            <CheckCircle className="mr-2 size-4" />
                                            Mark Active
                                            {item.mode === "Active" && " (Current)"}
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            disabled={item.mode === "Inactive"}
                                            onClick={() =>
                                                void handleToggleEmployeeCandidateStatus(item, "Inactive")
                                            }
                                        >
                                            <XCircle className="mr-2 size-4" />
                                            Mark Inactive
                                            {item.mode === "Inactive" && " (Current)"}
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                            disabled={item.mode === "Hold"}
                                            onClick={() =>
                                                void handleToggleEmployeeCandidateStatus(item, "Hold")
                                            }
                                        >
                                            <PauseCircle className="mr-2 size-4" />
                                            Mark Hold
                                            {item.mode === "Hold" && " (Current)"}
                                        </DropdownMenuItem>
                                    </>
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
            Category,
            selectedIds,
            bulkLoading,
            toggleCurrentPageSelection,
            toggleRowSelection,
            canView,
            canEdit,
            canManage,
            canDelete,
            handleDelete,
            handleCopyEmployeeCandidate,
            handleToggleEmployeeCandidateStatus,
        ],
    );

    const table = useReactTable({
        columns,
        data: Category,
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
                <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">
                    <div className="relative">
                        <form onSubmit={handleSearch} className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                            <Input
                                type="text"
                                placeholder="Search status..."
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
                        </form>
                    </div>
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

                    {/* <Button
                        type="button"
                        variant="outline"
                        disabled={syncing || !isOnline}
                        onClick={async () => {
                            const result = await syncHrEmployeeCandidate();

                            if (result) {
                                await refreshEmployeeCandidate();
                                toast.success("Hr synchronized successfully.");
                            }
                        }}
                    >
                        <RefreshCw
                            className={`mr-2 size-4 ${syncing ? "animate-spin" : ""}`}
                        />
                        {syncing ? "Synchronizing..." : "Sync"}
                    </Button> */}

                    {canManage && (
                        <Button type="button" onClick={() => setAddDialogOpen(true)}>
                            <Plus className="mr-2 size-4" />
                            Add Status
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
                            You do not have permission to view EmployeeCandidate.
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

            <EmployeeCandidateAddDialog
                open={addDialogOpen}
                closeDialog={() => setAddDialogOpen(false)}
                onSuccess={async (newEmployeeCandidate) => {
                    setAddDialogOpen(false);

                    await createEmployeeCandidateNotification({
                        action: "created",
                        title: "New EmployeeCandidate Created",
                        message: `${newEmployeeCandidate?.StatusName} has been created.`,
                        EmployeeCandidateId: newEmployeeCandidate?.id,
                        StatusName: newEmployeeCandidate?.StatusName,
                    });

                    await refreshEmployeeCandidate();
                    await syncHrEmployeeCandidate();
                }}
            />

            <EmployeeCandidateViewDialog
                open={viewDialogOpen}
                EmployeeCandidate={selectedEmployeeCandidate}
                closeDialog={() => {
                    setViewDialogOpen(false);
                    setSelectedEmployeeCandidate(null);
                }}
            />

            <EmployeeCandidateEditDialog
                open={editDialogOpen}
                EmployeeCandidate={selectedEmployeeCandidate}
                closeDialog={() => {
                    setEditDialogOpen(false);
                    setSelectedEmployeeCandidate(null);
                }}
                onSuccess={async (updatedEmployeeCandidate) => {
                    await createEmployeeCandidateNotification({
                        action: "updated",
                        title: "EmployeeCandidate Updated",
                        message: `${updatedEmployeeCandidate?.StatusName ||
                            selectedEmployeeCandidate?.StatusName
                            } has been updated.`,
                        EmployeeCandidateId:
                            updatedEmployeeCandidate?.id || selectedEmployeeCandidate?.id,
                        StatusName:
                            updatedEmployeeCandidate?.StatusName ||
                            selectedEmployeeCandidate?.StatusName,
                    });

                    await refreshEmployeeCandidate();
                    await syncHrEmployeeCandidate();
                }}
            />

            <EmployeeCandidateDeleteDialog
                open={deleteDialogOpen}
                EmployeeCandidate={selectedEmployeeCandidate}
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                closeDialog={() => {
                    setDeleteDialogOpen(false);
                    setSelectedEmployeeCandidate(null);
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
                            <DialogTitle>Email EmployeeCandidate</DialogTitle>
                            <DialogDescription>
                                Select recipients and send the EmployeeCandidate report.
                            </DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
                            {/* Recipient Selection */}
                            <DialogBody className="space-y-6 px-6 min-h-0">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="text-sm font-medium">Recipient Email</label>

                                    <span className="text-xs text-muted-foreground">
                                        {selectedRecipientEmails.length} of {staffList.length}{" "}
                                        selected
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

                                {/* Staff Selection */}
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
                                        htmlFor="EmployeeCandidate-subject"
                                        className="text-sm font-medium"
                                    >
                                        Subject
                                    </label>
                                    <Input
                                        id="EmployeeCandidate-subject"
                                        required
                                        value={emailSubject}
                                        onChange={(event) => setEmailSubject(event.target.value)}
                                        placeholder="EmployeeCandidate Report"
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
                                                Attach the EmployeeCandidate report as an Excel file
                                                (.xlsx) to the email.
                                            </span>
                                        </span>
                                        <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                                    </label>
                                </div>
                                {/* Email Message */}
                                <div className="space-y-2">
                                    <label
                                        htmlFor="EmployeeCandidate-message"
                                        className="text-sm font-medium"
                                    >
                                        Message
                                    </label>
                                    <ScrollArea className="h-[150px] w-full">
                                        <Textarea
                                            id="EmployeeCandidate-message"
                                            required
                                            rows={5}
                                            value={emailMessage}
                                            onChange={(event) => setEmailMessage(event.target.value)}
                                            placeholder="Enter your email message..."
                                            className="min-h-[150px] resize-none"
                                        />
                                    </ScrollArea>

                                    <p className="text-xs text-muted-foreground">
                                        Enter the message to include in the email sent to the
                                        selected staff.
                                    </p>
                                </div>
                            </DialogBody>
                            {/* Footer Actions */}
                            <DialogFooter className="gap-2 px-6 pb-2">
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

            {/* Copy EmployeeCandidate dialog */}
            <Dialog
                open={copyDialogOpen}
                onOpenChange={(open) => {
                    if (copyLoading) return;

                    setCopyDialogOpen(open);

                    if (!open) {
                        setCopySourceItem(null);
                        setCopyStatusName("");
                        setCopyDescription("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Copy EmployeeCandidate</DialogTitle>
                        <DialogDescription>
                            Enter a unique name for the copied EmployeeCandidate. You can
                            change the suggested name before saving.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleConfirmCopyEmployeeCandidate();
                        }}
                    >
                        <div className="space-y-2">
                            <label
                                htmlFor="copy-EmployeeCandidate-name"
                                className="text-sm font-medium"
                            >
                                Status Name <span className="text-destructive">*</span>
                            </label>

                            <Input
                                id="copy-EmployeeCandidate-name"
                                value={copyStatusName}
                                onChange={(event) => setCopyStatusName(event.target.value)}
                                placeholder="Enter Status Name"
                                maxLength={150}
                                required
                                autoFocus
                                disabled={copyLoading}
                            />

                            {copySourceItem && (
                                <p className="text-xs text-muted-foreground">
                                    Copying from: {copySourceItem.StatusName}
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
                        {/* Footer Actions */}
                        <DialogFooter className="gap-2 px-6 pb-2">
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
                                disabled={copyLoading || !copyStatusName.trim()}
                            >
                                <Copy className="mr-2 size-4" />
                                {copyLoading ? "Copying..." : "Copy EmployeeCandidate"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <EmployeeCandidateActiveDialog
                open={activeDialogOpen}
                onOpenChange={setActiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() => handleBulkStatus(true)}
            />

            <EmployeeCandidateInactiveDialog
                open={inactiveDialogOpen}
                onOpenChange={setInactiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() => handleBulkStatus(false)}
            />

            <EmployeeCandidatesDeleteDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={setBulkDeleteDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={handleConfirmBulkDelete}
            />
        </>
    );
};

export default EmployeeCandidateList;
