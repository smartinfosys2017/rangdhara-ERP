
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
import {
    Card,
    CardFooter,
    CardHeader,
    CardTable,
} from "@/components/ui/card";
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

import QuestionAddDialog from "./question-add-dialog";
import QuestionEditDialog from "./question-edit-dialog";
import QuestionViewDialog from "./question-view-dialog";
import QuestionDeleteDialog from "./question-delete-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";
import QuestionActiveDialog from "./questions-active-dialog";
import QuestionInactiveDialog from "./questions-inactive-dialog";
import QuestionsDeleteDialog from "./questions-delete-dialog";

// =======================================================
// NOTIFICATION
// =======================================================

const createQuestionNotification = async ({
    action,
    title,
    message,
    questionId = null,
    questionName = null,
}) => {
    try {
        const response = await fetch("/api/notifications", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                module: "hr",
                action,
                title,
                message,
                entityId: questionId != null ? String(questionId) : null,
                entityType: "question",
                entityName: questionName || "Question",
                url: "/hr/questionnaire/question",
            }),
            cache: "no-store",
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result?.success) {
            throw new Error(result?.message || "Notification failed");
        }

        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("notifications-refresh")
            );

            window.dispatchEvent(
                new CustomEvent("notifications-received", {
                    detail: result.notification
                        ? [result.notification]
                        : [],
                })
            );
        }

        return result;
    } catch (error) {
        console.error("QUESTION NOTIFICATION ERROR", error);
        return null;
    }
};

// =======================================================
// COMPONENT
// =======================================================

const QuestionList = () => {
    const queryClient = useQueryClient();
    const { data: session } = useSession();

    // =======================================================
    // PERMISSIONS
    // =======================================================

    const userPermissions = useMemo(
        () => session?.user?.permissions || [],
        [session?.user?.permissions]
    );

    const canView = can("question.view", userPermissions);
    const canManage = can("question.manage", userPermissions);
    const canEdit = can("question.edit", userPermissions);
    const canDelete = can("question.delete", userPermissions);

    // =======================================================
    // TABLE STATE
    // =======================================================

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

    // =======================================================
    // SEARCH AND FILTERS
    // =======================================================

    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const [statusFilter, setStatusFilter] = useState("all");

    const [createdFrom, setCreatedFrom] = useState("");
    const [createdTo, setCreatedTo] = useState("");

    const [updatedFrom, setUpdatedFrom] = useState("");
    const [updatedTo, setUpdatedTo] = useState("");

    // =======================================================
    // SELECTION AND BULK ACTIONS
    // =======================================================

    const [selectedIds, setSelectedIds] = useState([]);
    const [bulkLoading, setBulkLoading] = useState(false);

    // =======================================================
    // CONNECTION STATE
    // =======================================================

    const [isOnline, setIsOnline] = useState(
        typeof navigator === "undefined"
            ? true
            : navigator.onLine
    );

    const [dbStatus, setDbStatus] = useState({
        env: "local",
        online: false,
        loading: true,
    });

    const [checkingDb, setCheckingDb] = useState(false);
    const [syncing, setSyncing] = useState(false);

    const syncingRef = useRef(false);

    // =======================================================
    // CRUD DIALOGS
    // =======================================================

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const [
        selectedQuestion,
        setSelectedQuestion,
    ] = useState(null);

    const [deleteLoading, setDeleteLoading] = useState(false);

    // =======================================================
    // EMAIL REPORT STATE
    // =======================================================

    const [emailDialogOpen, setEmailDialogOpen] = useState(false);
    const [emailSubject, setEmailSubject] = useState("");
    const [emailMessage, setEmailMessage] = useState("");

    const [staffList, setStaffList] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);

    const [selectedRecipientEmails, setSelectedRecipientEmails] =
        useState([]);

    const [attachExcel, setAttachExcel] = useState(true);
    const [emailSending, setEmailSending] = useState(false);

    // =======================================================
    // BULK CONFIRMATION DIALOGS
    // =======================================================

    const [activeDialogOpen, setActiveDialogOpen] = useState(false);
    const [inactiveDialogOpen, setInactiveDialogOpen] = useState(false);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] =
        useState(false);

    // =======================================================
    // COPY DIALOG STATE
    // =======================================================

    const [copyDialogOpen, setCopyDialogOpen] = useState(false);
    const [copySourceItem, setCopySourceItem] = useState(null);

    const [copyQuestionName, setCopyQuestionName] =
        useState("");

    const [copyQuestion, setCopyQuestion] = useState("");
    const [copyLoading, setCopyLoading] = useState(false);

    // =======================================================
    // REFRESH DATA
    // =======================================================

    const refreshQuestion = useCallback(async () => {
        await queryClient.invalidateQueries({
            queryKey: ["questions"],
        });
    }, [queryClient]);

    // =======================================================
    // HR SYNC
    // =======================================================

    const syncHrQuestion = useCallback(async () => {
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
                headers: {
                    "Content-Type": "application/json",
                },
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result?.message || "HR sync failed");
            }

            window.dispatchEvent(
                new CustomEvent("notifications-refresh")
            );

            return result;
        } catch (error) {
            console.error("QUESTION SYNC ERROR", error);
            toast.error(error.message || "HR sync failed");
            return null;
        } finally {
            syncingRef.current = false;
            setSyncing(false);
        }
    }, []);

    // =======================================================
    // DATABASE STATUS
    // =======================================================

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

    // =======================================================
    // FETCH QUESTIONNAIRE TYPES
    // =======================================================

    const fetchQuestion = useCallback(async () => {
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
            `/api/hr/Question?${params.toString()}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Failed loading questions"
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
        sorting,
    ]);

    const {
        data,
        isLoading,
    } = useQuery({
        queryKey: [
            "questions",
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
        queryFn: fetchQuestion,
        staleTime: 0,
    });

    const questions = data?.data || [];

    const totalRecords = Number(
        data?.pagination?.total || 0
    );

    // =======================================================
    // CURRENT PAGE SELECTION
    // =======================================================

    const currentPageIds = useMemo(
        () => questions.map((item) => String(item.id)),
        [questions]
    );

    const allCurrentPageSelected =
        currentPageIds.length > 0 &&
        currentPageIds.every((id) => selectedIds.includes(id));

    // =======================================================
    // REPORT DATA
    // =======================================================

    const getQuestionReportRows = useCallback(async () => {
        if (selectedIds.length > 0) {
            const selectedSet = new Set(
                selectedIds.map(String)
            );

            return questions.filter((item) =>
                selectedSet.has(String(item.id))
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
            sort: sorting?.[0]?.id || "createdAt",
            dir: sorting?.[0]?.desc ? "desc" : "asc",
        });

        const response = await apiFetch(
            `/api/hr/Question?${params.toString()}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Failed to load questions"
            );
        }

        return result.data || [];
    }, [
        selectedIds,
        questions,
        searchQuery,
        statusFilter,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        sorting,
    ]);

    // =======================================================
    // EXCEL EXPORT
    // =======================================================

    const buildQuestionExcel = useCallback((items) => {
        const rows = items.map((item) => ({
            ID: item.id,
            "Question Name": item.questionName || "",
            "Questionnaire Type":
                item.questionnaireType?.typeName || "",
            Question: item.question || "",
            Status: item.status ? "Active" : "Inactive",
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
            { wch: 35 },
            { wch: 30 },
            { wch: 60 },
            { wch: 12 },
            { wch: 22 },
            { wch: 22 },
        ];

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Questions"
        );

        return workbook;
    }, []);

    const downloadQuestionExcel = useCallback(
        (items, filename = "questions.xlsx") => {
            if (!items.length) {
                toast.error("No questions to export");
                return false;
            }

            XLSX.writeFile(
                buildQuestionExcel(items),
                filename
            );

            return true;
        },
        [buildQuestionExcel]
    );

    const handleExportExcel = useCallback(async () => {
        try {
            toast.loading("Preparing Excel export...", {
                id: "question-export",
            });

            const items = await getQuestionReportRows();

            if (!items.length) {
                toast.error("No questions to export", {
                    id: "question-export",
                });

                return;
            }

            downloadQuestionExcel(items);

            toast.success(
                `${items.length} question(s) exported`,
                {
                    id: "question-export",
                }
            );
        } catch (error) {
            console.error("QUESTIONNAIRE TYPE EXPORT ERROR", error);

            toast.error(error.message || "Excel export failed", {
                id: "question-export",
            });
        }
    }, [
        getQuestionReportRows,
        downloadQuestionExcel,
    ]);

    // =======================================================
    // PRINT REPORT
    // =======================================================

    const handlePrintQuestion = useCallback(async () => {
        try {
            const items = await getQuestionReportRows();

            if (!items.length) {
                toast.error("No questions to print");
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
                        })[char]
                );

            const rows = items
                .map(
                    (item) => `
                        <tr>
                            <td>${escapeHtml(item.id)}</td>
                            <td>${escapeHtml(item.questionName)}</td>
                            <td>${escapeHtml(item.questionnaireType?.typeName || "-")}</td>
                            <td>${escapeHtml(item.question || "-")}</td>
                            <td>${item.status ? "Active" : "Inactive"}</td>
                            <td>${escapeHtml(
                                item.createdAt
                                    ? new Date(item.createdAt).toLocaleDateString()
                                    : "-"
                            )}</td>
                            <td>${escapeHtml(
                                item.updatedAt
                                    ? new Date(item.updatedAt).toLocaleDateString()
                                    : "-"
                            )}</td>
                        </tr>
                    `
                )
                .join("");

            const printWindow = window.open(
                "",
                "_blank",
                "width=1200,height=800"
            );

            if (!printWindow) {
                toast.error("Please allow pop-ups to print the report");
                return;
            }

            printWindow.document.write(`
                <!doctype html>
                <html>
                    <head>
                        <title>Question Report</title>
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
                                body {
                                    padding: 0;
                                }
                            }
                        </style>
                    </head>

                    <body>
                        <h1>Question Report</h1>

                        <p>
                            Generated:
                            ${escapeHtml(new Date().toLocaleString())}
                        </p>

                        <p>Total records: ${items.length}</p>

                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Question Name</th>
                                    <th>Questionnaire Type</th>
                                    <th>Question</th>
                                    <th>Status</th>
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
            console.error("QUESTIONNAIRE TYPE PRINT ERROR", error);
            toast.error(error.message || "Unable to prepare print report");
        }
    }, [getQuestionReportRows]);

    // =======================================================
    // SEARCH
    // =======================================================

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

    // =======================================================
    // RESET PAGINATION ON FILTER CHANGE
    // =======================================================

    useEffect(() => {
        setPagination((prev) =>
            prev.pageIndex === 0
                ? prev
                : {
                    ...prev,
                    pageIndex: 0,
                }
        );
    }, [
        statusFilter,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        searchQuery,
    ]);

    // =======================================================
    // RESET SELECTION ON FILTER/PAGE CHANGE
    // =======================================================

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

    // =======================================================
    // SINGLE DELETE
    // =======================================================

    const handleDelete = useCallback((item) => {
        setSelectedQuestion(item);
        setDeleteDialogOpen(true);
    }, []);

    const handleDeleteConfirm = useCallback(async () => {
        if (!selectedQuestion?.id) return;

        try {
            setDeleteLoading(true);

            const response = await apiFetch(
                "/api/hr/Question",
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        id: selectedQuestion.id,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Delete failed");
            }

            toast.success(
                "Question deleted successfully"
            );

            await createQuestionNotification({
                action: "deleted",
                title: "Question Deleted",
                message: `${selectedQuestion.questionName} question has been deleted.`,
                questionId: selectedQuestion.id,
                questionName: selectedQuestion.questionName,
            });

            setDeleteDialogOpen(false);

            setSelectedIds((prev) =>
                prev.filter(
                    (id) =>
                        id !== String(selectedQuestion.id)
                )
            );

            setSelectedQuestion(null);

            await refreshQuestion();
            await syncHrQuestion();
        } catch (error) {
            console.error("QUESTION DELETE ERROR", error);
            toast.error(error.message || "Delete failed");
        } finally {
            setDeleteLoading(false);
        }
    }, [
        selectedQuestion,
        refreshQuestion,
        syncHrQuestion,
    ]);

    // =======================================================
    // EXISTING QUESTION NAMES
    // =======================================================

    const getExistingQuestionNames = useCallback(async () => {
        const params = new URLSearchParams({
            page: "1",
            limit: "10000",
            sort: "createdAt",
            dir: "desc",
        });

        const response = await apiFetch(
            `/api/hr/Question?${params.toString()}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message ||
                "Unable to check existing question names."
            );
        }

        return new Set(
            (result.data || []).map((item) =>
                String(item.questionName || "")
                    .trim()
                    .toLowerCase()
            )
        );
    }, []);

    // =======================================================
    // OPEN COPY DIALOG
    // =======================================================

    const handleCopyQuestion = useCallback(
        async (item) => {
            try {
                const originalName = String(
                    item.questionName || ""
                ).trim();

                if (!originalName) {
                    toast.error(
                        "The original question name is empty."
                    );
                    return;
                }

                if (!item.questionnaireTypeId) {
                    toast.error("Questionnaire type is missing for this question.");
                    return;
                }

                const existingNames =
                    await getExistingQuestionNames();

                let copiedName = `${originalName} (Copy)`;
                let counter = 2;

                while (existingNames.has(copiedName.toLowerCase())) {
                    copiedName = `${originalName} (Copy ${counter})`;
                    counter += 1;
                }

                setCopySourceItem(item);
                setCopyQuestionName(copiedName);
                setCopyQuestion(item.question || "");
                setCopyDialogOpen(true);
            } catch (error) {
                console.error("OPEN COPY DIALOG ERROR", error);

                toast.error(
                    error.message || "Unable to open copy dialog."
                );
            }
        },
        [getExistingQuestionNames]
    );

    // =======================================================
    // CONFIRM COPY
    // =======================================================

    const handleConfirmCopyQuestion = useCallback(async () => {
        if (!copySourceItem?.id) {
            toast.error(
                "Please select a question to copy."
            );
            return;
        }

        const finalName = copyQuestionName.trim();

        if (!finalName) {
            toast.error("Please enter a question name.");
            return;
        }

        if (!copySourceItem.questionnaireTypeId) {
            toast.error("Questionnaire type is missing.");
            return;
        }

        try {
            setCopyLoading(true);

            const existingNames =
                await getExistingQuestionNames();

            if (existingNames.has(finalName.toLowerCase())) {
                toast.error(
                    "This question name already exists. Please use another name."
                );
                return;
            }

            const response = await apiFetch(
                "/api/hr/Question",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        questionName: finalName,
                        questionnaireTypeId:
                            copySourceItem.questionnaireTypeId,
                        question: copyQuestion.trim() || null,
                        status: Boolean(copySourceItem.status),
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Failed to copy question."
                );
            }

            toast.success(
                "Question copied successfully."
            );

            await createQuestionNotification({
                action: "created",
                title: "Question Copied",
                message: `${finalName} was copied from ${copySourceItem.questionName}.`,
                questionId: result.data?.id,
                questionName: finalName,
            });

            setCopyDialogOpen(false);
            setCopySourceItem(null);
            setCopyQuestionName("");
            setCopyQuestion("");

            await refreshQuestion();
            await syncHrQuestion();
        } catch (error) {
            console.error("QUESTION COPY ERROR", error);

            toast.error(error.message || "Copy failed.");
        } finally {
            setCopyLoading(false);
        }
    }, [
        copySourceItem,
        copyQuestionName,
        copyQuestion,
        getExistingQuestionNames,
        refreshQuestion,
        syncHrQuestion,
    ]);

    // =======================================================
    // SINGLE STATUS TOGGLE
    // =======================================================

    const handleToggleQuestionStatus = useCallback(
        async (item) => {
            const nextStatus = !Boolean(item.status);

            try {
                const response = await apiFetch(
                    "/api/hr/Question",
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            id: item.id,
                            status: nextStatus,
                        }),
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Status update failed"
                    );
                }

                toast.success(
                    `${item.questionName} marked ${nextStatus ? "active" : "inactive"}`
                );

                await refreshQuestion();
                await syncHrQuestion();
            } catch (error) {
                console.error(
                    "QUESTION STATUS ERROR",
                    error
                );

                toast.error(
                    error.message || "Status update failed"
                );
            }
        },
        [
            refreshQuestion,
            syncHrQuestion,
        ]
    );

    // =======================================================
    // ROW SELECTION
    // =======================================================

    const toggleRowSelection = useCallback((id) => {
        const normalizedId = String(id);

        setSelectedIds((prev) =>
            prev.includes(normalizedId)
                ? prev.filter((value) => value !== normalizedId)
                : [...prev, normalizedId]
        );
    }, []);

    const toggleCurrentPageSelection = useCallback(() => {
        setSelectedIds((prev) => {
            if (allCurrentPageSelected) {
                return prev.filter(
                    (id) => !currentPageIds.includes(id)
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

    // =======================================================
    // BULK STATUS
    // =======================================================

    const handleBulkStatus = useCallback(
        async (status) => {
            if (!selectedIds.length) {
                toast.error(
                    "Select at least one question"
                );
                return;
            }

            if (!(canManage || canEdit)) {
                toast.error(
                    "You do not have permission to change question status"
                );
                return;
            }

            const idsToUpdate = [...selectedIds];

            try {
                setBulkLoading(true);

                const response = await apiFetch(
                    "/api/hr/Question",
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            ids: idsToUpdate,
                            status,
                        }),
                    }
                );

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message ||
                        "Bulk status update failed."
                    );
                }

                toast.success(
                    `${result.count ?? idsToUpdate.length} question(s) marked ${status ? "active" : "inactive"}`
                );

                setActiveDialogOpen(false);
                setInactiveDialogOpen(false);
                setSelectedIds([]);

                await refreshQuestion();
                await syncHrQuestion();
            } catch (error) {
                console.error("BULK STATUS ERROR", error);

                toast.error(
                    error.message || "Bulk status update failed"
                );
            } finally {
                setBulkLoading(false);
            }
        },
        [
            selectedIds,
            canManage,
            canEdit,
            refreshQuestion,
            syncHrQuestion,
        ]
    );

    // =======================================================
    // OPEN BULK DELETE
    // =======================================================

    const handleBulkDelete = useCallback(() => {
        if (!selectedIds.length) {
            toast.error(
                "Select at least one question"
            );
            return;
        }

        if (!canDelete) {
            toast.error(
                "You do not have permission to delete questions"
            );
            return;
        }

        setBulkDeleteDialogOpen(true);
    }, [selectedIds, canDelete]);

    // =======================================================
    // CONFIRM BULK DELETE
    // =======================================================

    const handleConfirmBulkDelete = useCallback(async () => {
        if (!selectedIds.length || bulkLoading) return;

        const idsToDelete = [...selectedIds];

        try {
            setBulkLoading(true);

            const response = await apiFetch(
                "/api/hr/Question",
                {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ids: idsToDelete,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Bulk delete failed. Your API route must support ids."
                );
            }

            toast.success(
                `${result.count ?? idsToDelete.length} question(s) deleted`
            );

            setBulkDeleteDialogOpen(false);
            setSelectedIds([]);

            await refreshQuestion();
            await syncHrQuestion();
        } catch (error) {
            console.error("BULK DELETE ERROR", error);

            toast.error(error.message || "Bulk delete failed");
        } finally {
            setBulkLoading(false);
        }
    }, [
        selectedIds,
        bulkLoading,
        refreshQuestion,
        syncHrQuestion,
    ]);

    // =======================================================
    // OPEN EMAIL DIALOG
    // =======================================================

    const handleOpenEmailDialog = useCallback(() => {
        setSelectedRecipientEmails([]);
        setAttachExcel(true);

        setEmailSubject("Question Report");

        setEmailMessage(
            [
                "Dear Team,",
                "",
                "Please find the question report for your review.",
                "",
                "The report includes the question name, question, and question, status, and creation and update dates.",
                "",
                "Please review the information and let us know if any corrections are required.",
                "",
                "Regards,",
                "HR Management Team",
            ].join("\n")
        );

        setEmailDialogOpen(true);
    }, []);

    // =======================================================
    // SHARED HEADER REPORT BUTTONS
    // =======================================================

    useEffect(() => {
        const handleReportButtonClick = (event) => {
            if (!(event.target instanceof Element)) return;

            const button = event.target.closest(
                "#Print, #Export, #Email"
            );

            if (!button) return;

            if (
                !window.location.pathname.includes(
                    "/Question"
                )
            ) {
                return;
            }

            switch (button.id) {
                case "Print":
                    event.preventDefault();
                    void handlePrintQuestion();
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
            handleReportButtonClick
        );

        return () => {
            document.removeEventListener(
                "click",
                handleReportButtonClick
            );
        };
    }, [
        handlePrintQuestion,
        handleExportExcel,
        handleOpenEmailDialog,
    ]);

    // =======================================================
    // SEND EMAIL REPORT
    // =======================================================

    const handleSendEmail = useCallback(async () => {
        if (selectedRecipientEmails.length === 0) {
            toast.error(
                "Please select at least one recipient."
            );
            return;
        }

        if (!emailSubject.trim() || !emailMessage.trim()) {
            toast.error(
                "Please enter the email subject and message."
            );
            return;
        }

        try {
            setEmailSending(true);

            const response = await fetch(
                "/api/hr/Question/email-report",
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
                        },
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.error ||
                    result.message ||
                    "Failed to send email."
                );
            }

            toast.success(
                attachExcel
                    ? "Email sent successfully with the Excel attachment."
                    : "Email sent successfully."
            );

            setEmailDialogOpen(false);
        } catch (error) {
            console.error("EMAIL REPORT ERROR", error);

            toast.error(
                error.message || "Unable to send email."
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

    // =======================================================
    // LOAD STAFF RECIPIENTS
    // =======================================================

    useEffect(() => {
        if (!emailDialogOpen) return;

        let cancelled = false;

        const loadStaff = async () => {
            try {
                setStaffLoading(true);

                const response = await apiFetch(
                    "/api/staff?limit=10000"
                );

                const result = await response.json();

                if (!response.ok || result.success === false) {
                    throw new Error(
                        result.message || "Failed to load staff"
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
                            .filter((person) => person.email)
                    );
                }
            } catch (error) {
                console.error(
                    "STAFF RECIPIENT LOAD ERROR",
                    error
                );

                if (!cancelled) {
                    setStaffList([]);

                    toast.error(
                        error.message ||
                        "Unable to load staff recipients"
                    );
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

    // =======================================================
    // ONLINE / OFFLINE EVENTS
    // =======================================================

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);

            await checkDbStatus();
            await syncHrQuestion();
            await refreshQuestion();
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
        syncHrQuestion,
        refreshQuestion,
    ]);

    // =======================================================
    // DATABASE STATUS INTERVAL
    // =======================================================

    useEffect(() => {
        void checkDbStatus();

        const interval = setInterval(
            () => void checkDbStatus(),
            30000
        );

        return () => clearInterval(interval);
    }, [checkDbStatus]);

    // =======================================================
    // TABLE COLUMNS
    // =======================================================

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
                            !questions.length ||
                            bulkLoading
                        }
                    />
                ),

                cell: ({ row }) => {
                    const item = row.original;
                    const id = String(item.id);

                    return (
                        <Checkbox
                            aria-label={`Select ${item.questionName}`}
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
                        title="#"
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
                accessorKey: "questionName",
                id: "questionName",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Question Name"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span className="font-medium">
                        {row.original.questionName || "-"}
                    </span>
                ),

                size: 220,
            },

            {
                accessorKey: "questionnaireType.typeName",
                id: "questionnaireType",

                header: "Questionnaire Type",

                cell: ({ row }) => (
                    <span className="font-medium">
                        {row.original.questionnaireType?.typeName || "-"}
                    </span>
                ),

                size: 220,
                enableSorting: false,
            },

            {
                accessorKey: "question",
                id: "question",

                header: ({ column }) => (
                    <DataGridColumnHeader
                        title="Question"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => (
                    <span className="block max-w-[350px] truncate">
                        {row.original.question || "-"}
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
                        title="Added Date"
                        column={column}
                        visibility
                    />
                ),

                cell: ({ row }) => {
                    const value = row.original?.createdAt;

                    if (!value) return "-";

                    const date = new Date(value);

                    return Number.isNaN(date.getTime())
                        ? "-"
                        : date.toLocaleDateString();
                },

                size: 150,
                enableSorting: true,

                meta: {
                    headerTitle: "Added Date",
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

                cell: ({ row }) => {
                    const value = row.original?.updatedAt;

                    if (!value) return "-";

                    const date = new Date(value);

                    return Number.isNaN(date.getTime())
                        ? "-"
                        : date.toLocaleDateString();
                },

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
                                    aria-label={`Actions for ${item.questionName}`}
                                >
                                    <Ellipsis />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end">
                                {canView && (
                                    <DropdownMenuItem
                                        onClick={() => {
                                            setSelectedQuestion(item);
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
                                            setSelectedQuestion(item);
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
                                            void handleCopyQuestion(item)
                                        }
                                    >
                                        <Copy className="mr-2 size-4" />
                                        Copy
                                    </DropdownMenuItem>
                                )}

                                {(canManage || canEdit) && (
                                    <DropdownMenuItem
                                        onClick={() =>
                                            void handleToggleQuestionStatus(item)
                                        }
                                    >
                                        {item.status ? (
                                            <XCircle className="mr-2 size-4" />
                                        ) : (
                                            <CheckCircle className="mr-2 size-4" />
                                        )}

                                        Mark {item.status
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
            questions,
            selectedIds,
            bulkLoading,
            toggleCurrentPageSelection,
            toggleRowSelection,
            canView,
            canEdit,
            canManage,
            canDelete,
            handleCopyQuestion,
            handleToggleQuestionStatus,
            handleDelete,
        ]
    );

    // =======================================================
    // REACT TABLE
    // =======================================================

    const table = useReactTable({
        columns,
        data: questions,
        pageCount: Math.ceil(
            totalRecords / pagination.pageSize
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

    // =======================================================
    // TOOLBAR
    // =======================================================

    const renderToolbar = () => {
        return (
            <CardHeader className="flex-col flex-wrap items-stretch gap-3 py-5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">
                    <div className="relative">
                        <form
                            onSubmit={handleSearch}
                            className="relative w-full sm:w-64"
                        >
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                            <Input
                                type="text"
                                placeholder="Search questions..."
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
                        </form>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                    {selectedIds.length > 0 && (
                        <div>
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
                        </div>
                    )}

                    {/* Database Status */}

                    <div
                        className="flex h-9 items-center gap-2 rounded-md border bg-background px-3"
                        role="status"
                        aria-live="polite"
                    >
                        <span
                            className={`size-2.5 shrink-0 rounded-full ${
                                dbStatus.loading
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
                                        dbStatus.env || "Database"
                                    ).toUpperCase()
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
                                className={`size-4 ${
                                    checkingDb ? "animate-spin" : ""
                                }`}
                            />
                        </Button>
                    </div>

                    {/* Add Question */}

                    {canManage && (
                        <Button
                            type="button"
                            onClick={() => setAddDialogOpen(true)}
                        >
                            <Plus className="mr-2 size-4" />
                            Add Question
                        </Button>
                    )}

                    {/* Filters */}

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
                    />
                </div>
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
                        <h3 className="text-lg font-semibold">
                            Access Denied
                        </h3>

                        <p className="mt-1 text-sm text-muted-foreground">
                            You do not have permission to view questions.
                        </p>
                    </div>
                </CardHeader>
            </Card>
        );
    }

    // =======================================================
    // MAIN UI
    // =======================================================

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

            {/* =======================================================
                ADD DIALOG
            ======================================================= */}

            <QuestionAddDialog
                open={addDialogOpen}
                closeDialog={() => setAddDialogOpen(false)}
                onSuccess={async (newQuestion) => {
                    setAddDialogOpen(false);

                    await createQuestionNotification({
                        action: "created",
                        title: "New Question Created",
                        message: `${newQuestion?.questionName} has been created.`,
                        questionId: newQuestion?.id,
                        questionName: newQuestion?.questionName,
                    });

                    await refreshQuestion();
                    await syncHrQuestion();
                }}
            />

            {/* =======================================================
                VIEW DIALOG
            ======================================================= */}

            <QuestionViewDialog
                open={viewDialogOpen}
                question={selectedQuestion}
                closeDialog={() => {
                    setViewDialogOpen(false);
                    setSelectedQuestion(null);
                }}
            />

            {/* =======================================================
                EDIT DIALOG
            ======================================================= */}

            <QuestionEditDialog
                open={editDialogOpen}
                question={selectedQuestion}
                closeDialog={() => {
                    setEditDialogOpen(false);
                    setSelectedQuestion(null);
                }}
                onSuccess={async (updatedQuestion) => {
                    await createQuestionNotification({
                        action: "updated",
                        title: "Question Updated",
                        message: `${
                            updatedQuestion?.questionName ||
                            selectedQuestion?.questionName
                        } has been updated.`,
                        questionId:
                            updatedQuestion?.id ||
                            selectedQuestion?.id,
                        questionName:
                            updatedQuestion?.questionName ||
                            selectedQuestion?.questionName,
                    });

                    await refreshQuestion();
                    await syncHrQuestion();
                }}
            />

            {/* =======================================================
                DELETE DIALOG
            ======================================================= */}

            <QuestionDeleteDialog
                open={deleteDialogOpen}
                question={selectedQuestion}
                loading={deleteLoading}
                onConfirm={handleDeleteConfirm}
                closeDialog={() => {
                    if (deleteLoading) return;

                    setDeleteDialogOpen(false);
                    setSelectedQuestion(null);
                }}
            />

            {/* =======================================================
                EMAIL REPORT DIALOG
            ======================================================= */}

            <Dialog
                open={emailDialogOpen}
                onOpenChange={(open) => {
                    if (!emailSending) {
                        setEmailDialogOpen(open);
                    }
                }}
            >
                <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] flex flex-col gap-0 overflow-hidden sm:w-[90vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px] p-0">
                    <form
                        className="flex flex-col h-full max-h-[90vh] overflow-hidden"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleSendEmail();
                        }}
                    >
                        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
                            <DialogTitle>
                                Email Question
                            </DialogTitle>

                            <DialogDescription>
                                Select recipients and send the question report.
                            </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
                            <DialogBody className="space-y-6 px-6 min-h-0">
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
                                                    setSelectedRecipientEmails([])
                                                }
                                            >
                                                Clear all
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {selectedRecipientEmails.map(
                                                (email) => {
                                                    const person = staffList.find(
                                                        (staff) =>
                                                            staff.email === email
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
                                                                                (item) =>
                                                                                    item !== email
                                                                            )
                                                                    )
                                                                }
                                                            >
                                                                <X className="size-3.5" />
                                                            </button>
                                                        </span>
                                                    );
                                                }
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
                                                    staffList.every((person) =>
                                                        selectedRecipientEmails.includes(
                                                            person.email
                                                        )
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
                                                                                person.email
                                                                        ),
                                                                    ]),
                                                                ]
                                                                : previous.filter(
                                                                    (email) =>
                                                                        !staffList.some(
                                                                            (person) =>
                                                                                person.email === email
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
                                                            selectedRecipientEmails.includes(
                                                                person.email
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

                                {!staffLoading &&
                                    selectedRecipientEmails.length === 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            Select at least one recipient to send the report.
                                        </p>
                                    )}

                                {/* Subject */}

                                <div className="space-y-2">
                                    <label
                                        htmlFor="question-subject"
                                        className="text-sm font-medium"
                                    >
                                        Subject
                                    </label>

                                    <Input
                                        id="question-subject"
                                        required
                                        value={emailSubject}
                                        onChange={(event) =>
                                            setEmailSubject(event.target.value)
                                        }
                                        placeholder="Question Report"
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
                                                    checked === true
                                                )
                                            }
                                        />

                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium">
                                                Add Excel attachment
                                            </span>

                                            <span className="mt-1 block text-xs text-muted-foreground">
                                                Attach the question report as an Excel file (.xlsx) to the email.
                                            </span>
                                        </span>

                                        <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                                    </label>
                                </div>

                                {/* Message */}

                                <div className="space-y-2">
                                    <label
                                        htmlFor="question-message"
                                        className="text-sm font-medium"
                                    >
                                        Message
                                    </label>

                                    <ScrollArea className="h-[150px] w-full">
                                        <Textarea
                                            id="question-message"
                                            required
                                            rows={5}
                                            value={emailMessage}
                                            onChange={(event) =>
                                                setEmailMessage(event.target.value)
                                            }
                                            placeholder="Enter your email message..."
                                            className="resize-none"
                                        />
                                    </ScrollArea>

                                    <p className="text-xs text-muted-foreground">
                                        Enter the message to include in the email sent to the selected staff.
                                    </p>
                                </div>
                            </DialogBody>

                            {/* Footer */}

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

            {/* =======================================================
                COPY QUESTION DIALOG
            ======================================================= */}

            <Dialog
                open={copyDialogOpen}
                onOpenChange={(open) => {
                    if (copyLoading) return;

                    setCopyDialogOpen(open);

                    if (!open) {
                        setCopySourceItem(null);
                        setCopyQuestionName("");
                        setCopyQuestion("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Copy Question
                        </DialogTitle>

                        <DialogDescription>
                            Enter a unique name for the copied question. You can change the suggested name before saving.
                        </DialogDescription>
                    </DialogHeader>

                    <form
                        className="space-y-4"
                        onSubmit={(event) => {
                            event.preventDefault();
                            void handleConfirmCopyQuestion();
                        }}
                    >
                        <div className="space-y-2">
                            <label
                                htmlFor="copy-question-name"
                                className="text-sm font-medium"
                            >
                                Question Name{" "}
                                <span className="text-destructive">*</span>
                            </label>

                            <Input
                                id="copy-question-name"
                                value={copyQuestionName}
                                onChange={(event) =>
                                    setCopyQuestionName(
                                        event.target.value
                                    )
                                }
                                placeholder="Enter question name"
                                maxLength={255}
                                required
                                autoFocus
                                disabled={copyLoading}
                            />

                            {copySourceItem && (
                                <p className="text-xs text-muted-foreground">
                                    Copying from: {copySourceItem.questionName}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="copy-question-category"
                                className="text-sm font-medium"
                            >
                                Questionnaire Type
                            </label>

                            <Input
                                id="copy-question-category"
                                value={
                                    copySourceItem?.questionnaireType
                                        ?.typeName || ""
                                }
                                disabled
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="copy-question-description"
                                className="text-sm font-medium"
                            >
                                Question
                            </label>

                            <Textarea
                                id="copy-question-description"
                                rows={4}
                                value={copyQuestion}
                                onChange={(event) =>
                                    setCopyQuestion(event.target.value)
                                }
                                placeholder="Enter question text"
                                disabled={copyLoading}
                            />
                        </div>

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
                                    !copyQuestionName.trim()
                                }
                            >
                                <Copy className="mr-2 size-4" />

                                {copyLoading
                                    ? "Copying..."
                                    : "Copy Question"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* =======================================================
                BULK ACTIVE DIALOG
            ======================================================= */}

            <QuestionActiveDialog
                open={activeDialogOpen}
                onOpenChange={setActiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() => handleBulkStatus(true)}
            />

            {/* =======================================================
                BULK INACTIVE DIALOG
            ======================================================= */}

            <QuestionInactiveDialog
                open={inactiveDialogOpen}
                onOpenChange={setInactiveDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={() => handleBulkStatus(false)}
            />

            {/* =======================================================
                BULK DELETE DIALOG
            ======================================================= */}

            <QuestionsDeleteDialog
                open={bulkDeleteDialogOpen}
                onOpenChange={setBulkDeleteDialogOpen}
                selectedCount={selectedIds.length}
                loading={bulkLoading}
                onConfirm={handleConfirmBulkDelete}
            />
        </>
    );
};

export default QuestionList;