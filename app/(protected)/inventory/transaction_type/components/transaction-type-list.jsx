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
  RefreshCw,
  Search,
  Trash2,
  X,
  FileSpreadsheet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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

import TransactionTypeAddDialog from "./transaction-type-add-dialog";
import TransactionTypeEditDialog from "./transaction-type-edit-dialog";
import TransactionTypeViewDialog from "./transaction-type-view-dialog";
import TransactionTypeDeleteDialog from "./transaction-type-delete-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";
import TransactionTypesActiveDialog from "./transaction-types-active-dialog";
import TransactionTypesInactiveDialog from "./transaction-types-inactive-dialog";
import TransactionTypesDeleteDialog from "./transaction-types-delete-dialog";

const createTransactionTypeNotification = async ({
  action,
  title,
  message,
  transactionTypeId = null,
  transactionTypeName = null,
}) => {
  try {
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json", },
      body: JSON.stringify({
        module: "inventory",
        action,
        title,
        message,
        entityId:
          transactionTypeId !== null && transactionTypeId !== undefined
            ? String(transactionTypeId)
            : null,
        entityType: "transaction_type",
        entityName: transactionTypeName || "Transaction Type",
        url: "/inventory/transaction_type",
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
    console.error("TRANSACTION TYPE NOTIFICATION ERROR", error);
    return null;
  }
};
const TransactionTypeList = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const userPermissions = useMemo(
    () => session?.user?.permissions || [],
    [session],
  );

  const canView = can("transaction_type.view", userPermissions);
  const canManage = can("transaction_type.manage", userPermissions);
  const canEdit = can("transaction_type.edit", userPermissions);
  const canDelete = can("transaction_type.delete", userPermissions);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("Transaction Types");
  const [emailMessage, setEmailMessage] = useState("Please find the transaction type details below.");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedTransactionType, setSelectedTransactionType] = useState(null);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState([]);
  const [attachExcel, setAttachExcel] = useState(true);
  const [emailSending, setEmailSending] = useState(false);
  // Bulk confirmation dialogs
  const [activeDialogOpen, setActiveDialogOpen] = useState(false);
  const [inactiveDialogOpen, setInactiveDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceItem, setCopySourceItem] = useState(null);
  const [copyProductType, setCopyProductType] = useState("");
  const [copyDescription, setCopyDescription] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");

  const refreshTransactionTypes = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["transaction-type"],
    });
  }, [queryClient]);

  const syncInventoryTransactionType = useCallback(async () => {
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
        headers: { "Content-Type": "application/json", },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Transaction Type sync failed");
      }

      window.dispatchEvent(new CustomEvent("notifications-refresh"));

      return result;
    } catch (error) {
      console.error("TRANSACTION TYPE SYNC ERROR", error);

      toast.error(error.message || "Transaction Type sync failed");

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

  const fetchTransactionTypes = useCallback(async () => {
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
      `/api/inventory/transaction-type?${params.toString()}`,
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed loading Transaction Types");
    }

    return result;
  }, [pagination.pageIndex,
  pagination.pageSize, searchQuery, sorting, statusFilter, createdFrom, createdTo, updatedFrom, updatedTo]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["transaction-type", pagination.pageIndex,
      pagination.pageSize, sorting, searchQuery, statusFilter, createdFrom, createdTo, updatedFrom, updatedTo],
    queryFn: fetchTransactionTypes,
    staleTime: 0,
  });

  const transactionTypes = data?.data || [];
  const totalRecords = Number(data?.pagination?.total || 0);
  const currentPageIds = useMemo(
    () => transactionTypes.map((item) => String(item.id)),
    [transactionTypes],
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
        return previous.filter((id) => !currentPageIds.includes(id));
      }

      return [...new Set([...previous, ...currentPageIds])];
    });
  }, [allCurrentPageSelected, currentPageIds]);
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
                  [person.firstName, person.lastName].filter(Boolean).join(" ") ||
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

    loadStaff();

    return () => {
      cancelled = true;
    };
  }, [emailDialogOpen]);

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

  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");

    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");
    setStatusFilter("all");
    setCreatedFrom("");
    setCreatedTo("");
    setUpdatedFrom("");
    setUpdatedTo("");
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const toggleSelected = useCallback((id, checked) => {
    setSelectedIds((current) => checked
      ? (current.includes(String(id)) ? current : [...current, String(id)])
      : current.filter((value) => value !== String(id)));
  }, []);

  const togglePageSelection = useCallback((checked) => {
    const pageIds = transactionTypes.map((item) => String(item.id));
    setSelectedIds((current) => checked
      ? [...new Set([...current, ...pageIds])]
      : current.filter((id) => !pageIds.includes(id)));
  }, [transactionTypes]);

  const updateSelectedStatus = useCallback(async (status) => {
    if (!selectedIds.length) return;
    try {
      setBulkLoading(true);
      const response = await apiFetch("/api/inventory/transaction-type", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds, status }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Status update failed");
      toast.success(result.message || "Status updated successfully");
      setSelectedIds([]);
      await refreshTransactionTypes();
      await syncInventoryTransactionType();
    } catch (error) {
      toast.error(error.message || "Status update failed");
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, refreshTransactionTypes, syncInventoryTransactionType]);

  const deleteSelected = useCallback(async () => {
    if (!selectedIds.length || !window.confirm(`Delete ${selectedIds.length} selected transaction type(s)?`)) return;
    try {
      setBulkLoading(true);
      const response = await apiFetch("/api/inventory/transaction-type", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Bulk delete failed");
      toast.success(result.message || "Selected transaction types deleted");
      setSelectedIds([]);
      await refreshTransactionTypes();
      await syncInventoryTransactionType();
    } catch (error) {
      toast.error(error.message || "Bulk delete failed");
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, refreshTransactionTypes, syncInventoryTransactionType]);


  const openCopyDialog = useCallback((item) => {
    setCopySourceItem(item);
    setCopyProductType(`${item.TransactionType || "Transaction Type"} (Copy)`);
    setCopyDescription(item.Description || "");
    setCopyDialogOpen(true);
  }, []);

  const handleConfirmCopy = useCallback(async () => {
    if (!copySourceItem || !copyProductType.trim()) {
      toast.error("Please enter a transaction type name.");
      return;
    }

    try {
      setCopyLoading(true);

      const response = await apiFetch("/api/inventory/transaction-type", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          TransactionType: copyProductType.trim(),
          Description: copyDescription.trim(),
          EffectOnTransaction:
            copySourceItem.EffectOnTransaction || "addition",
          status: copySourceItem.status ?? true,
          isDefault: false,
          customFields: copySourceItem.customFields || {},
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to copy transaction type");
      }

      toast.success("Transaction Type copied successfully");
      setCopyDialogOpen(false);
      setCopySourceItem(null);

      await refreshTransactionTypes();
      await syncInventoryTransactionType();
    } catch (error) {
      console.error("COPY TRANSACTION TYPE ERROR", error);
      toast.error(error.message || "Copy failed");
    } finally {
      setCopyLoading(false);
    }
  }, [
    copySourceItem,
    copyProductType,
    copyDescription,
    refreshTransactionTypes,
    syncInventoryTransactionType,
  ]);

  const exportToExcel = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        query: searchQuery, status: statusFilter, createdFrom, createdTo, updatedFrom, updatedTo,
        sort: sorting?.[0]?.id || "createdAt", dir: sorting?.[0]?.desc ? "desc" : "asc", export: "1",
      });
      const response = await apiFetch(`/api/inventory/transaction-type?${params.toString()}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Export failed");
      const rows = result.data || [];
      const headers = ["ID", "Transaction Type", "Description", "Effect", "Status", "Default", "Added Date", "Updated Date"];
      const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
      const csv = [headers, ...rows.map((item) => [item.id, item.TransactionType, item.Description, item.EffectOnTransaction, item.status ? "Active" : "Inactive", item.isDefault ? "Yes" : "No", item.createdAt, item.updatedAt])].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "transaction-types.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${rows.length} transaction type(s)`);
    } catch (error) {
      toast.error(error.message || "Export failed");
    }
  }, [searchQuery, statusFilter, createdFrom, createdTo, updatedFrom, updatedTo, sorting]);


  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");
    setStatusFilter("all");
    setCreatedFrom("");
    setCreatedTo("");
    setUpdatedFrom("");
    setUpdatedTo("");
    setSelectedIds([]);

    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, []);

  const handleDelete = useCallback((item) => {
    setSelectedTransactionType(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedTransactionType?.id) {
      return;
    }

    try {
      setDeleteLoading(true);

      const response = await apiFetch("/api/inventory/transaction-type", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedTransactionType.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Delete failed");
      }

      toast.success("Transaction Type deleted successfully");

      await createTransactionTypeNotification({
        action: "deleted",
        title: "Transaction Type Deleted",
        message: `${selectedTransactionType.TransactionType} has been deleted.`,
        transactionTypeId: selectedTransactionType.id,
        transactionTypeName: selectedTransactionType.TransactionType,
      });

      setDeleteDialogOpen(false);
      setSelectedTransactionType(null);

      await refreshTransactionTypes();
      await syncInventoryTransactionType();
    } catch (error) {
      console.error("TRANSACTION TYPE DELETE ERROR", error);

      toast.error(error.message || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }, [
    selectedTransactionType,
    refreshTransactionTypes,
    syncInventoryTransactionType,
  ]);
  const handleBulkStatus = useCallback(
    async (status) => {
      if (!selectedIds.length) {
        toast.error("Select at least one transaction type");
        return;
      }

      if (!(canManage || canEdit)) {
        toast.error("You do not have permission to change transaction type status");
        return;
      }

      const idsToUpdate = [...selectedIds];

      try {
        setBulkLoading(true);

        const response = await apiFetch("/api/inventory/transaction-type", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ids: idsToUpdate,
            status,
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message ||
            "Bulk status update failed. Your API route must support ids.",
          );
        }

        toast.success(
          `${result.count ?? idsToUpdate.length} transaction type(s) marked ${status ? "active" : "inactive"
          }`,
        );

        setActiveDialogOpen(false);
        setInactiveDialogOpen(false);
        setSelectedIds([]);
        await refreshTransactionTypes();
        await syncInventoryTransactionType();
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
      refreshTransactionTypes,
      syncInventoryTransactionType,
    ],
  );
  const handleBulkDelete = useCallback(() => {
    if (!selectedIds.length) {
      toast.error("Select at least one transaction types");
      return;
    }

    if (!canDelete) {
      toast.error("You do not have permission to delete transaction types");
      return;
    }

    setShowDeleteDialog(true);
  }, [selectedIds, canDelete]);
  const handleConfirmBulkDelete = useCallback(async () => {
    if (!selectedIds.length || bulkLoading) {
      return;
    }

    const idsToDelete = [...selectedIds];

    try {
      setBulkLoading(true);

      const response = await apiFetch("/api/inventory/transaction-type", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          "Bulk delete failed. Your API route must support ids."
        );
      }

      toast.success(
        `${result.count ?? idsToDelete.length} transaction type(s) deleted`
      );

      setShowDeleteDialog(false);
      setSelectedIds([]);

      await refreshTransactionTypes();
      await syncInventoryTransactionType();
    } catch (error) {
      console.error("BULK DELETE ERROR", error);
      toast.error(error.message || "Bulk delete failed");
    } finally {
      setBulkLoading(false);
    }
  }, [
    selectedIds,
    bulkLoading,
    refreshTransactionTypes,
    syncInventoryTransactionType,
  ]);


  const handleOpenEmailDialog = useCallback(() => {
    setSelectedRecipientEmails([]);
    setAttachExcel(true);
    setEmailSubject("Transaction Types Report");

    setEmailMessage(
      [
        "Dear Team,",
        "",
        "Please find the Transaction Types report for your review.",
        "",
        "The report includes the Transaction Types name, description, status, default setting, and creation and update dates.",
        "",
        "Please review the information and let us know if any corrections are required.",
        "",
      ].join("\n"),
    );

    setEmailDialogOpen(true);
  }, []);
  // Handle shared header buttons by ID
  useEffect(() => {
    const handleReportButtonClick = (event) => {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest("#Print, #Export, #Email");
      if (!button) return;

      if (!window.location.pathname.includes("/transaction_type")) return;

      switch (button.id) {
        case "Export":
          event.preventDefault();
          void exportToExcel();
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
  }, [exportToExcel, handleOpenEmailDialog]);
  const handleSendEmail = async () => {
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

      const response = await fetch("/api/inventory/transaction-type/email-report", {
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
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send email.");
      }

      toast.success(
        attachExcel
          ? "Email sent successfully with the Excel attachment."
          : "Email sent successfully.",
      );

      setEmailDialogOpen(false);
    } catch (error) {
      console.error("Email report error:", error);

      toast.error(
        error instanceof Error ? error.message : "Unable to send email.",
      );
    } finally {
      setEmailSending(false);
    }
  };

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);

      await checkDbStatus();
      await syncInventoryTransactionType();
      await refreshTransactionTypes();
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
  }, [checkDbStatus, syncInventoryTransactionType, refreshTransactionTypes]);

  useEffect(() => {
    checkDbStatus();

    const interval = setInterval(checkDbStatus, 30000);

    return () => clearInterval(interval);
  }, [checkDbStatus]);

  const updateSingleStatus = useCallback(async (item, status) => {
    try {
      const response = await apiFetch("/api/inventory/transaction-type", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Status update failed");
      toast.success(result.message || "Status updated successfully");
      await refreshTransactionTypes();
      await syncInventoryTransactionType();
    } catch (error) {
      toast.error(error.message || "Status update failed");
    }
  }, [refreshTransactionTypes, syncInventoryTransactionType]);

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
            disabled={!transactionTypes.length || bulkLoading}
          />
        ),
        cell: ({ row }) => {
          const item = row.original;
          const id = String(item.id);

          return (
            <Checkbox
              aria-label={`Select ${item.TransactionType}`}
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
        enableSorting: true,
        enableHiding: false,
        meta: {
          headerTitle: "ID",
          skeleton: <Skeleton className="h-7 w-12" />,
        },
      },
      {
        accessorKey: "TransactionType",
        id: "TransactionType",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Transaction Type"
            column={column}
            visibility
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.TransactionType || "-"}
          </span>
        ),
        size: 220,
        enableSorting: true,
        enableHiding: false,
        meta: {
          headerTitle: "Transaction Type",
          skeleton: <Skeleton className="h-7 w-36" />,
        },
      },
      {
        accessorKey: "Description",
        id: "Description",
        header: ({ column }) => <DataGridColumnHeader title="Description" column={column} visibility />,
        cell: ({ row }) => <span className="max-w-[280px] truncate block">{row.original.Description || "-"}</span>,
        size: 260,
        enableSorting: true,
        enableHiding: true,
        meta: { headerTitle: "Description", skeleton: <Skeleton className="h-7 w-40" /> },
      },
      {
        accessorKey: "EffectOnTransaction",
        id: "EffectOnTransaction",
        header: ({ column }) => (
          <DataGridColumnHeader title="Effect" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span className="capitalize">
            {row.original.EffectOnTransaction || "-"}
          </span>
        ),
        size: 180,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Effect",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },
      {
        accessorKey: "status",
        id: "status",
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),
        cell: ({ row }) => {
          const status =
            row.original?.status === true ||
            row.original?.status === 1 ||
            row.original?.status === "1" ||
            row.original?.status === "true";

          return (
            <span
              className={
                status
                  ? "font-medium text-green-600"
                  : "font-medium text-red-600"
              }
            >
              {status ? "Active" : "Inactive"}
            </span>
          );
        },
        size: 130,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Status",
          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },
      {
        accessorKey: "isDefault",
        id: "isDefault",
        header: ({ column }) => (
          <DataGridColumnHeader title="Default" column={column} visibility />
        ),
        cell: ({ row }) => <span>{row.original.isDefault ? "Yes" : "No"}</span>,
        size: 120,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Default",
          skeleton: <Skeleton className="h-7 w-16" />,
        },
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
        cell: ({ row }) => {
          const value = row.original?.createdAt;

          if (!value) return "-";

          const date = new Date(value);

          return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
        },
        size: 150,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Created Date",
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
        enableHiding: true,
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
                  aria-label={`Actions for ${item.TransactionType}`}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {canView && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedTransactionType(item);
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
                      setSelectedTransactionType(item);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                )}

                {canManage && (
                  <>
                    <DropdownMenuItem onClick={() => openCopyDialog(item)}>
                      <Copy className="mr-2 size-4" />
                      Copy
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => updateSingleStatus(item, !(item.status === true || item.status === 1 || item.status === "1" || item.status === "true"))}>
                      <CheckCircle className="mr-2 size-4" /> Mark {item.status === true || item.status === 1 || item.status === "1" || item.status === "true" ? "Inactive" : "Active"}
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
      canView,
      canEdit,
      canDelete,
      canManage,
      handleDelete,
      selectedIds,
      toggleCurrentPageSelection,
      toggleRowSelection,
      openCopyDialog,
      updateSingleStatus,
      transactionTypes,
      bulkLoading,
      setSelectedTransactionType,
      setViewDialogOpen,
      setEditDialogOpen,
    ]
  );

  const table = useReactTable({
    columns,
    data: transactionTypes,
    pageCount: Math.ceil(totalRecords / pagination.pageSize),
    getRowId: (row) => String(row.id),
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

  const renderToolbar = () => {
    const hasActiveFilters =
      !!searchInput ||
      !!searchQuery ||
      statusFilter !== "all" ||
      !!createdFrom ||
      !!createdTo ||
      !!updatedFrom ||
      !!updatedTo;

    const resetPage = () => {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    };

    return (
      <CardHeader className="flex-col flex-wrap items-stretch gap-3 py-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative">
            <form onSubmit={handleSearch} className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="text"
                placeholder="Search transaction type"
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

          {canManage && (
            <Button type="button" onClick={() => setAddDialogOpen(true)} className="w-full shrink-0 sm:w-auto" >
              <Plus className="mr-2 size-4" />
              Add Transaction Type
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
              You do not have permission to view Transaction Type.
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
          {/* Direct invocation keeps the search input mounted. */}
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

      {/* ADD TRANSACTION TYPE */}

      <TransactionTypeAddDialog
        open={addDialogOpen}
        closeDialog={() => setAddDialogOpen(false)}
        onSuccess={async (newData) => {
          setAddDialogOpen(false);

          await createTransactionTypeNotification({
            action: "created",
            title: "New Transaction Type Created",
            message: `${newData?.TransactionType} has been created.`,
            transactionTypeId: newData?.id,
            transactionTypeName: newData?.TransactionType,
          });

          await refreshTransactionTypes();
          await syncInventoryTransactionType();
        }}
      />

      {/* VIEW TRANSACTION TYPE */}

      <TransactionTypeViewDialog
        open={viewDialogOpen}
        TransactionType={selectedTransactionType}
        closeDialog={() => {
          setViewDialogOpen(false);
          setSelectedTransactionType(null);
        }}
      />

      {/* EDIT TRANSACTION TYPE */}

      <TransactionTypeEditDialog
        open={editDialogOpen}
        TransactionType={selectedTransactionType}
        closeDialog={() => {
          setEditDialogOpen(false);
          setSelectedTransactionType(null);
        }}
        onSuccess={async (updatedData) => {
          await createTransactionTypeNotification({
            action: "updated",
            title: "Transaction Type Updated",
            message: `${updatedData?.TransactionType ||
              selectedTransactionType?.TransactionType
              } has been updated.`,
            transactionTypeId: updatedData?.id || selectedTransactionType?.id,
            transactionTypeName:
              updatedData?.TransactionType ||
              selectedTransactionType?.TransactionType,
          });

          await refreshTransactionTypes();
          await syncInventoryTransactionType();
        }}
      />

      {/* DELETE TRANSACTION TYPE */}

      <TransactionTypeDeleteDialog
        open={deleteDialogOpen}
        TransactionType={selectedTransactionType}
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        closeDialog={() => {
          if (deleteLoading) return;
          setDeleteDialogOpen(false);
          setSelectedTransactionType(null);
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
              <DialogTitle>Email Transaction Type</DialogTitle>
              <DialogDescription>
                Select recipients and send the Transaction Type report.
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
                    placeholder="Transaction Type Report"
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
                  <Textarea
                    id="item-group-message"
                    required
                    rows={5}
                    value={emailMessage}
                    onChange={(event) => setEmailMessage(event.target.value)}
                    placeholder="Enter your email message..."
                    className="min-h-[150px] resize-none"
                  />

                  <p className="text-xs text-muted-foreground">
                    Enter the message to include in the email sent to the selected staff.
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
      </Dialog >

      {/* BULK DELETE CONFIRMATION DIALOG */}

      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (isDeleting) return;
          setShowDeleteDialog(open);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="size-5 text-destructive" />
              </span>
              Confirm Delete
            </DialogTitle>

            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {selectedIds.length} selected tramsaction type
                {selectedIds.length !== 1 ? "s" : ""}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting || selectedIds.length === 0}
              onClick={handleConfirmBulkDelete}
            >
              <Trash2 className="mr-2 size-4" />
              {isDeleting ? "Deleting..." : "Delete Selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COPY TRANSACTION TYPE DIALOG */}
      <Dialog
        open={copyDialogOpen}
        onOpenChange={(open) => {
          if (copyLoading) return;
          setCopyDialogOpen(open);

          if (!open) {
            setCopySourceItem(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Copy Transaction Type</DialogTitle>
            <DialogDescription>
              Create a new transaction type using the selected item as a starting point.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Transaction Type Name
              </label>
              <Input
                value={copyProductType}
                onChange={(event) => setCopyProductType(event.target.value)}
                placeholder="Enter transaction type name"
                disabled={copyLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={copyDescription}
                onChange={(event) => setCopyDescription(event.target.value)}
                placeholder="Enter description"
                disabled={copyLoading}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={copyLoading}
              onClick={() => setCopyDialogOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={copyLoading || !copyProductType.trim()}
              onClick={handleConfirmCopy}
            >
              <Copy className="mr-2 size-4" />
              {copyLoading ? "Copying..." : "Create Copy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TransactionTypesActiveDialog
        open={activeDialogOpen}
        onOpenChange={setActiveDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={() => handleBulkStatus(true)}
      />

      <TransactionTypesInactiveDialog
        open={inactiveDialogOpen}
        onOpenChange={setInactiveDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={() => handleBulkStatus(false)}
      />

      <TransactionTypesDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={handleConfirmBulkDelete}
      />
    </>
  );
};

export default TransactionTypeList;