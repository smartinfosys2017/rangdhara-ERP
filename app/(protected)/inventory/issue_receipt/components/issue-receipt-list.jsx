"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";

import * as XLSX from "xlsx";
import {
  CalendarDays,
  CheckCircle,
  Ellipsis,
  Eye,
  Mail,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  ChevronDown,
  Funnel,
  X,
  FileSpreadsheet,
  XCircle,
} from "lucide-react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";
import { Card, CardFooter, CardHeader, CardTable } from "@/components/ui/card";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogFooter,
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


import IssueReceiptAddDialog from "./issue-receipt-add-dialog";
import IssueReceiptEditDialog from "./issue-receipt-edit-dialog";
import IssueReceiptViewDialog from "./issue-receipt-view-dialog";
import IssueReceiptDeleteDialog from "./issue-receipt-delete-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";
import IssueReceiptsDeleteDialog from "./issue-receipts-delete-dialog";

const createIssueReceiptNotification = async ({
  action,
  title,
  message,
  issueReceiptId = null,
  issueReceiptName = null,
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
          issueReceiptId !== null && issueReceiptId !== undefined
            ? String(issueReceiptId)
            : null,
        entityType: "issue_receipt",
        entityName: issueReceiptName || "Issue/Receipt",
        url: "/inventory/issue_receipt",
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
    console.error("Issue/Receipt NOTIFICATION ERROR", error);
    return null;
  }
};

const getDisplayValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatPrice = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  const number = Number(value);

  if (Number.isNaN(number)) return String(value);

  return `₹${number.toFixed(2)}`;
};

// Short label used in notifications and messages.
const getReceiptLabel = (item) => {
  if (item?.ReciptChallanNo) {
    return `Issue/Receipt ${String(item.ReciptChallanNo).substring(0, 18)}`;
  }

  if (item?.id) return `Issue/Receipt #${String(item.id).substring(0, 8)}`;

  return "Issue/Receipt";
};

const reportDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
};

// One definition drives both the Excel export and the print report.
const REPORT_COLUMNS = [
  { label: "ID", width: 14, get: (r) => r.id },
  { label: "Challan No", width: 20, get: (r) => r.ReciptChallanNo },
  { label: "Item Group", width: 22, get: (r) => r.ItemGroupName },
  { label: "Item Master", width: 28, get: (r) => r.ItemMasterName },
  { label: "Item Type", width: 18, get: (r) => r.ItemTypeName },
  { label: "Transaction Type", width: 20, get: (r) => r.TransactionTypeName },
  { label: "Issue Date", width: 14, get: (r) => reportDate(r.IssueDate) },
  { label: "Previous Balance", width: 16, get: (r) => r.PreviousBalance },
  { label: "Qty", width: 10, get: (r) => r.Qty },
  { label: "Price", width: 12, get: (r) => r.Price },
  { label: "Balance", width: 12, get: (r) => r.Balance },
  { label: "Issue By", width: 18, get: (r) => r.IssueByName },
  { label: "Gate Pass No", width: 16, get: (r) => r.GetPassNo },
  {
    label: "Date Of Receive",
    width: 16,
    get: (r) => reportDate(r.DateOfRecive),
  },
  { label: "Received By", width: 18, get: (r) => r.ReceivedByName },
  { label: "Particulars", width: 30, get: (r) => r.Particuler },
  { label: "Comment", width: 30, get: (r) => r.Comment },
  { label: "Created Date", width: 14, get: (r) => reportDate(r.createdAt) },
  { label: "Updated Date", width: 14, get: (r) => reportDate(r.updatedAt) },
];

// Builds a sortable, hideable column from a small definition.
const makeColumn = ({ id, title, size, render, skeleton = "w-24" }) => ({
  accessorKey: id,
  id,
  header: ({ column }) => (
    <DataGridColumnHeader title={title} column={column} visibility />
  ),
  cell: ({ row }) => render(row.original),
  size,
  enableSorting: true,
  enableHiding: true,
  meta: {
    headerTitle: title,
    skeleton: <Skeleton className={`h-7 ${skeleton}`} />,
  },
});

const IssueReceiptList = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const userPermissions = useMemo(
    () => session?.user?.permissions || [],
    [session],
  );

  const canView = can("issue_receipt.view", userPermissions);
  const canManage = can("issue_receipt.manage", userPermissions);
  const canEdit = can("issue_receipt.edit", userPermissions);
  const canDelete = can("issue_receipt.delete", userPermissions);

  // TABLE STATE
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);

  const [columnVisibility, setColumnVisibility] = useState({
    id: true,
    ItemGroupid: true,
    ItemMasterid: true,
    ItemTypeid: true,
    TransactionTypeid: true,
    IssueDate: true,
    PreviousBalance: true,
    Qty: true,
    Price: true,
    Balance: true,
    Issue_by: true,
    GetPassNo: true,
    DateOfRecive: true,
    ReciptChallanNo: true,
    RecivedBy: true,
    Particuler: true,
    Comment: true,
    createdAt: true,
    updatedAt: true,
  });

  // SEARCH AND FILTERS
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [issueFrom, setIssueFrom] = useState("");
  const [issueTo, setIssueTo] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");

  // MULTIPLE SELECTION
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // CONNECTION STATE
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

  // CRUD DIALOGS
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedIssueReceipt, setSelectedIssueReceipt] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // EMAIL DIALOG
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState([]);
  const [attachExcel, setAttachExcel] = useState(true);
  const [emailSending, setEmailSending] = useState(false);

  // Bulk confirmation dialogs
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const [quantityMin, setQuantityMin] = useState("");
  const [quantityMax, setQuantityMax] = useState("");

  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  const [itemGroups, setItemGroups] = useState([]);
  const [itemMasterList, setItemMasterList] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [transactionTypes, setTransactionTypes] = useState([]);
  const [staffFilterList, setStaffFilterList] = useState([]);

  const [issueByFilter, setIssueByFilter] = useState([]);
  const [receivedByFilter, setReceivedByFilter] = useState([]);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState([]);
  const [groupNameFilter, setGroupNameFilter] = useState([]);
  const [itemTypeFilter, setItemTypeFilter] = useState([]);
  const [itemNameFilter, setItemNameFilter] = useState([]);


  const refreshIssueReceipts = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["issue-receipt"] });
  }, [queryClient]);

  const syncInventoryIssueReceipts = useCallback(async () => {
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
      console.error("Issue/Receipt SYNC ERROR", error);
      toast.error(error.message || "Inventory sync failed");
      return null;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  const checkDbStatus = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setDbStatus((prev) => ({ ...prev, online: false, loading: false }));
      return;
    }

    try {
      setCheckingDb(true);

      const response = await fetch("/api/settings/toggle", {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Database check failed");

      const result = await response.json();

      setDbStatus({
        env: result?.activeEnv || "local",
        online: true,
        loading: false,
      });
    } catch (error) {
      console.error("DATABASE STATUS ERROR", error);
      setDbStatus((prev) => ({ ...prev, online: false, loading: false }));
    } finally {
      setCheckingDb(false);
    }
  }, []);

  const buildListParams = useCallback(
    ({ page = 1, limit = pagination.pageSize } = {}) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        query: searchQuery,
        issueFrom,
        issueTo,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        sort: sorting?.[0]?.id || "createdAt",
        dir: sorting?.[0]?.desc ? "desc" : "asc",
      });

      const filters = {
        quantityMin,
        quantityMax,
        priceMin,
        priceMax,
      };

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== "" && value !== null && value !== undefined) {
          params.set(key, String(value));
        }
      });
      const multiFilters = {
        issueById: issueByFilter,
        receivedById: receivedByFilter,
        transactionTypeId: transactionTypeFilter,
        groupId: groupNameFilter,
        itemTypeId: itemTypeFilter,
        itemId: itemNameFilter,
      };

      Object.entries(multiFilters).forEach(([key, value]) => {
        const ids = Array.isArray(value)
          ? value
          : value
            ? [value]
            : [];

        ids.forEach((id) => {
          if (id !== null && id !== undefined && id !== "") {
            params.append(key, String(id));
          }
        });
      });
      return params;
    },
    [
      pagination.pageSize,
      searchQuery,
      issueFrom,
      issueTo,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      sorting,
      quantityMin,
      quantityMax,
      priceMin,
      priceMax,
      issueByFilter,
      receivedByFilter,
      transactionTypeFilter,
      groupNameFilter,
      itemTypeFilter,
      itemNameFilter,
    ],
  );

  const fetchIssueReceipts = useCallback(async () => {
    const params = buildListParams({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
    });

    const response = await apiFetch(
      `/api/inventory/issue-receipt?${params.toString()}`,
    );
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed loading Issue/Receipts");
    }

    return result;
  }, [buildListParams, pagination.pageIndex, pagination.pageSize]);


  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "issue-receipt",
      pagination,
      sorting,
      searchQuery,
      issueFrom,
      issueTo,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      quantityMin,
      quantityMax,
      priceMin,
      priceMax,
      issueByFilter,
      receivedByFilter,
      transactionTypeFilter,
      groupNameFilter,
      itemTypeFilter,
      itemNameFilter,
    ],
    queryFn: fetchIssueReceipts,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const issueReceipts = useMemo(() => data?.data || [], [data]);
  const totalRecords = Number(data?.pagination?.total || 0);

  const currentPageIds = useMemo(
    () => issueReceipts.map((item) => String(item.id)),
    [issueReceipts],
  );

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.includes(id));

  const getIssueReceiptReportRows = useCallback(async () => {
    // Use selected rows when any are selected.
    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds.map(String));
      return issueReceipts.filter((item) => selectedSet.has(String(item.id)));
    }

    // Otherwise fetch all records matching the current filters.
    const params = buildListParams({ page: 1, limit: 10000 });

    const response = await apiFetch(
      `/api/inventory/issue-receipt?${params.toString()}`,
    );
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load Issue/Receipts");
    }

    return result.data || [];
  }, [selectedIds, issueReceipts, buildListParams]);

  const handleExportExcel = useCallback(async () => {
    try {
      toast.loading("Preparing Excel export...", {
        id: "issue-receipt-export",
      });

      const items = await getIssueReceiptReportRows();

      if (!items.length) {
        toast.error("No Issue/Receipts to export", {
          id: "issue-receipt-export",
        });
        return;
      }

      const rows = items.map((item) =>
        Object.fromEntries(
          REPORT_COLUMNS.map((col) => [col.label, col.get(item) ?? ""]),
        ),
      );

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = REPORT_COLUMNS.map((col) => ({ wch: col.width }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Issue-Receipt");
      XLSX.writeFile(workbook, "issue-receipts.xlsx");

      toast.success(`${items.length} Issue/Receipt(s) exported`, {
        id: "issue-receipt-export",
      });
    } catch (error) {
      console.error("Issue/Receipt EXPORT ERROR", error);
      toast.error(error.message || "Excel export failed", {
        id: "issue-receipt-export",
      });
    }
  }, [getIssueReceiptReportRows]);

  const handlePrintIssueReceipts = useCallback(async () => {
    // Open the window first so the browser does not block it as a pop-up.
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      toast.error("Please allow pop-ups to print the report");
      return;
    }

    printWindow.document.write(
      "<p style='font-family:Arial;padding:24px'>Preparing report...</p>",
    );

    try {
      const items = await getIssueReceiptReportRows();

      if (!items.length) {
        printWindow.close();
        toast.error("No Issue/Receipts to print");
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

      const head = REPORT_COLUMNS.map(
        (col) => `<th>${escapeHtml(col.label)}</th>`,
      ).join("");

      const rows = items
        .map(
          (item) =>
            `<tr>${REPORT_COLUMNS.map(
              (col) => `<td>${escapeHtml(col.get(item) ?? "-")}</td>`,
            ).join("")}</tr>`,
        )
        .join("");

      printWindow.document.open();
      printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Issue/Receipt Report</title>
          <meta charset="utf-8">
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; padding: 16px; color: #222; }
            h1 { font-size: 20px; margin-bottom: 6px; }
            p { color: #555; font-size: 12px; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ccc; padding: 5px; text-align: left; font-size: 9px; }
            th { background: #f2f2f2; }
            tr { break-inside: avoid; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Issue/Receipt Report</h1>
          <p>Generated: ${escapeHtml(new Date().toLocaleString())}</p>
          <p>Total records: ${items.length}</p>
          <table>
            <thead><tr>${head}</tr></thead>
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
      printWindow.close();
      console.error("Issue/Receipt PRINT ERROR", error);
      toast.error(error.message || "Unable to prepare print report");
    }
  }, [getIssueReceiptReportRows]);

  // Clear selected rows when the result set or page changes.
  useEffect(() => {
    setSelectedIds([]);
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    searchQuery,
    issueFrom,
    issueTo,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
  ]);
  useEffect(() => {
    let cancelled = false;

    const fetchFilterOptions = async () => {
      try {
        const endpoints = [
          "/api/inventory/item-groups?limit=100",
          "/api/inventory/item-master?limit=100",
          "/api/inventory/product-type?limit=100",
          "/api/inventory/transaction-type?limit=100",
          "/api/staff?limit=100",
        ];

        const responses = await Promise.all(
          endpoints.map((url) => apiFetch(url)),
        );

        const results = await Promise.all(
          responses.map(async (response) => {
            const json = await response.json();

            if (!response.ok || json?.success === false) {
              throw new Error(json?.message || "Failed to load filter options");
            }

            return json;
          }),
        );

        // Supports common API response formats.
        const getRows = (result) => {
          if (Array.isArray(result)) return result;
          if (Array.isArray(result?.data)) return result.data;
          if (Array.isArray(result?.data?.items)) return result.data.items;
          if (Array.isArray(result?.data?.staff)) return result.data.staff;
          if (Array.isArray(result?.items)) return result.items;
          if (Array.isArray(result?.results)) return result.results;
          return [];
        };

        if (cancelled) return;

        setItemGroups(getRows(results[0]));
        setItemMasterList(getRows(results[1]));
        setProductTypes(getRows(results[2]));
        setTransactionTypes(getRows(results[3]));

        setStaffFilterList(
          getRows(results[4]).map((staff) => ({
            ...staff,
            id: staff.id ?? staff.staffId ?? staff.StaffId,
            name:
              staff.name ||
              staff.fullName ||
              [staff.firstName, staff.lastName].filter(Boolean).join(" ") ||
              staff.username ||
              staff.email ||
              "Staff member",
          })),
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to load filter options:", error);
          toast.error(error.message || "Failed to load filter options");
        }
      }
    };

    fetchFilterOptions();

    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    setSelectedIds([]);
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    searchQuery,
    issueFrom,
    issueTo,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    quantityMin,
    quantityMax,
    priceMin,
    priceMax,
    issueByFilter,
    receivedByFilter,
    transactionTypeFilter,
    groupNameFilter,
    itemTypeFilter,
    itemNameFilter,
  ]);
  // Reset results when the search box is emptied (for example, the browser "x").
  useEffect(() => {
    if (searchInput === "" && searchQuery !== "") {
      setSearchQuery("");
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [searchInput, searchQuery]);

  const handleSearch = useCallback(
    (event) => {
      event?.preventDefault();
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
      setSearchQuery(searchInput.trim());
    },
    [searchInput],
  );

  const handleDelete = useCallback((item) => {
    setSelectedIssueReceipt(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedIssueReceipt?.id) return;

    const itemToDelete = selectedIssueReceipt;

    try {
      setDeleteLoading(true);

      const response = await apiFetch(
        `/api/inventory/issue-receipt?id=${itemToDelete.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Delete failed");
      }

      toast.success("Issue/Receipt deleted successfully");

      await createIssueReceiptNotification({
        action: "deleted",
        title: "Issue/Receipt Deleted",
        message: `${getReceiptLabel(itemToDelete)} has been deleted.`,
        issueReceiptId: itemToDelete.id,
        issueReceiptName: getReceiptLabel(itemToDelete),
      });

      setDeleteDialogOpen(false);
      setSelectedIds((prev) =>
        prev.filter((id) => id !== String(itemToDelete.id)),
      );
      setSelectedIssueReceipt(null);

      await refreshIssueReceipts();
      await syncInventoryIssueReceipts();
    } catch (error) {
      console.error("Issue/Receipt DELETE ERROR", error);
      toast.error(error.message || "Unable to delete Issue/Receipt");
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedIssueReceipt, refreshIssueReceipts, syncInventoryIssueReceipts]);

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

  const handleBulkDelete = useCallback(() => {
    if (!selectedIds.length) {
      toast.error("Select at least one Issue/Receipt");
      return;
    }

    if (!canDelete) {
      toast.error("You do not have permission to delete Issue/Receipts");
      return;
    }

    setShowDeleteDialog(true);
  }, [selectedIds, canDelete]);

  const handleConfirmBulkDelete = useCallback(async () => {
    if (!selectedIds.length || bulkLoading) return;

    const idsToDelete = [...selectedIds];

    try {
      setBulkLoading(true);

      const response = await apiFetch("/api/inventory/issue-receipt", {
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
        `${result.count ?? idsToDelete.length} Issue/Receipt(s) deleted`,
      );

      setShowDeleteDialog(false);
      setBulkDeleteDialogOpen(false);
      setSelectedIds([]);

      await refreshIssueReceipts();
      await syncInventoryIssueReceipts();
    } catch (error) {
      console.error("BULK DELETE ERROR", error);
      toast.error(error.message || "Bulk delete failed");
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, bulkLoading, refreshIssueReceipts, syncInventoryIssueReceipts]);

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

    loadStaff();

    return () => {
      cancelled = true;
    };
  }, [emailDialogOpen]);

  const handleOpenEmailDialog = useCallback(() => {
    setSelectedRecipientEmails([]);
    setAttachExcel(true);
    setEmailSubject("Issue/Receipt Report");

    setEmailMessage(
      [
        "Dear Team,",
        "",
        "Please find the Issue/Receipt report for your review.",
        "",
        "The report includes the item details, transaction type, issue and receive dates, quantity, price, balance, challan and gate pass numbers, and the people involved.",
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
    const handleHeaderButtonClick = (event) => {
      const button = event.target.closest("#Print, #Email, #Export");

      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      switch (button.id) {
        case "Print":
          handlePrintIssueReceipts();
          break;

        case "Email":
          handleOpenEmailDialog();
          break;

        case "Export":
          handleExportExcel();
          break;

        default:
          break;
      }
    };

    document.addEventListener("click", handleHeaderButtonClick);

    return () => {
      document.removeEventListener("click", handleHeaderButtonClick);
    };
  }, [handlePrintIssueReceipts, handleOpenEmailDialog, handleExportExcel,]);
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

      const response = await fetch("/api/inventory/issue-receipt/email-report", {
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
            issueFrom,
            issueTo,
            createdFrom,
            createdTo,
            updatedFrom,
            updatedTo,
          },
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.message || result.error || "Failed to send email.");
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
      await syncInventoryIssueReceipts();
      await refreshIssueReceipts();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setDbStatus((prev) => ({ ...prev, online: false, loading: false }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkDbStatus, syncInventoryIssueReceipts, refreshIssueReceipts]);

  useEffect(() => {
    checkDbStatus();

    const interval = setInterval(checkDbStatus, 30000);

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
            disabled={!issueReceipts.length || bulkLoading}
          />
        ),
        cell: ({ row }) => {
          const item = row.original;
          const id = String(item.id);

          return (
            <Checkbox
              aria-label={`Select ${getReceiptLabel(item)}`}
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
        enableResizing: false,
      },

      makeColumn({
        id: "id",
        title: "ID",
        size: 120,
        render: (r) => (
          <span className="font-mono text-xs">
            #{r?.id ? String(r.id).substring(0, 8) : "-"}
          </span>
        ),
      }),
      makeColumn({
        id: "ItemGroupid",
        title: "Item Group",
        size: 200,
        skeleton: "w-32",
        render: (r) => (
          <span className="font-medium">{r?.ItemGroupName || "-"}</span>
        ),
      }),
      makeColumn({
        id: "ItemMasterid",
        title: "Item Master",
        size: 300,
        skeleton: "w-40",
        render: (r) => (
          <span className="font-medium">{r?.ItemMasterName || "-"}</span>
        ),
      }),
      makeColumn({
        id: "ItemTypeid",
        title: "Item Type",
        size: 180,
        skeleton: "w-28",
        render: (r) => (
          <span className="font-medium">{r?.ItemTypeName || "-"}</span>
        ),
      }),
      makeColumn({
        id: "TransactionTypeid",
        title: "Transaction Type",
        size: 200,
        skeleton: "w-32",
        render: (r) => (
          <span className="font-medium">{r?.TransactionTypeName || "-"}</span>
        ),
      }),
      makeColumn({
        id: "IssueDate",
        title: "Issue Date",
        size: 175,
        render: (r) => <span>{formatDate(r?.IssueDate)}</span>,
      }),
      makeColumn({
        id: "PreviousBalance",
        title: "Previous Balance",
        size: 160,
        skeleton: "w-28",
        render: (r) => <span>{getDisplayValue(r?.PreviousBalance)}</span>,
      }),
      makeColumn({
        id: "Qty",
        title: "Qty",
        size: 100,
        skeleton: "w-16",
        render: (r) => <span>{getDisplayValue(r?.Qty)}</span>,
      }),
      makeColumn({
        id: "Price",
        title: "Price",
        size: 140,
        skeleton: "w-20",
        render: (r) => <span>{formatPrice(r?.Price)}</span>,
      }),
      makeColumn({
        id: "Balance",
        title: "Balance",
        size: 120,
        skeleton: "w-20",
        render: (r) => <span>{getDisplayValue(r?.Balance)}</span>,
      }),
      makeColumn({
        id: "Issue_by",
        title: "Issue By",
        size: 180,
        render: (r) => (
          <span className="font-medium">{r?.IssueByName || "-"}</span>
        ),
      }),
      makeColumn({
        id: "GetPassNo",
        title: "Gate Pass No",
        size: 160,
        skeleton: "w-28",
        render: (r) => <span>{getDisplayValue(r?.GetPassNo)}</span>,
      }),
      makeColumn({
        id: "DateOfRecive",
        title: "Date Of Receive",
        size: 175,
        render: (r) => <span>{formatDate(r?.DateOfRecive)}</span>,
      }),
      makeColumn({
        id: "ReciptChallanNo",
        title: "Challan No",
        size: 180,
        skeleton: "w-32",
        render: (r) => <span>{getDisplayValue(r?.ReciptChallanNo)}</span>,
      }),
      makeColumn({
        id: "RecivedBy",
        title: "Received By",
        size: 180,
        render: (r) => (
          <span className="font-medium">{r?.ReceivedByName || "-"}</span>
        ),
      }),
      makeColumn({
        id: "Particuler",
        title: "Particuler",
        size: 250,
        skeleton: "w-40",
        render: (r) => (
          <span className="block max-w-[300px] truncate">
            {getDisplayValue(r?.Particuler)}
          </span>
        ),
      }),
      makeColumn({
        id: "Comment",
        title: "Comment",
        size: 250,
        skeleton: "w-40",
        render: (r) => (
          <span className="block max-w-[300px] truncate">
            {getDisplayValue(r?.Comment)}
          </span>
        ),
      }),
      makeColumn({
        id: "createdAt",
        title: "Added Date",
        size: 175,
        render: (r) => <span>{formatDate(r?.createdAt)}</span>,
      }),
      makeColumn({
        id: "updatedAt",
        title: "Updated Date",
        size: 175,
        render: (r) => <span>{formatDate(r?.updatedAt)}</span>,
      }),

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
                  className="h-7 w-7"
                  aria-label={`Actions for ${getReceiptLabel(item)}`}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="bottom" align="end">
                {canView && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedIssueReceipt(item);
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
                      setSelectedIssueReceipt(item);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
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
        size: 75,
        enableSorting: false,
        enableResizing: false,
        enableHiding: false,
        meta: {
          skeleton: <Skeleton className="size-5" />,
        },
      },
    ],
    [
      allCurrentPageSelected,
      issueReceipts.length,
      selectedIds,
      bulkLoading,
      toggleCurrentPageSelection,
      toggleRowSelection,
      canView,
      canEdit,
      canDelete,
      handleDelete,
    ],
  );

  const table = useReactTable({
    columns,
    data: issueReceipts,
    pageCount: Math.ceil(totalRecords / pagination.pageSize),
    getRowId: (row) => String(row.id),
    state: { pagination, sorting, columnVisibility },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  const renderToolbar = () => {
    return (
      <CardHeader className="flex-col flex-wrap items-stretch gap-3 py-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative">
            <form
              onSubmit={handleSearch}
              className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-2xl"
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="text"
                placeholder="Search issue/receipts fields..."
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
          )}<div
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
              Add New Entry
            </Button>
          )}
          <StoreClientFiltersSheet
            trigger={
              <Button type="button" variant="outline">
                <Funnel className="mr-2 size-4" />
                Filter
              </Button>
            }

            // Quantity range
            quantityMin={quantityMin}
            setQuantityMin={setQuantityMin}
            quantityMax={quantityMax}
            setQuantityMax={setQuantityMax}

            // Price range
            priceMin={priceMin}
            setPriceMin={setPriceMin}
            priceMax={priceMax}
            setPriceMax={setPriceMax}

            // Issue By
            issueByFilter={issueByFilter}
            setIssueByFilter={setIssueByFilter}

            // Received By
            receivedByFilter={receivedByFilter}
            setReceivedByFilter={setReceivedByFilter}

            // Transaction Type
            transactionTypeFilter={transactionTypeFilter}
            setTransactionTypeFilter={setTransactionTypeFilter}

            // Group Name
            selectedGroupIds={groupNameFilter}
            setSelectedGroupIds={setGroupNameFilter}

            // Item Type
            itemTypeFilter={itemTypeFilter}
            setItemTypeFilter={setItemTypeFilter}

            // Item Name
            itemNameFilter={itemNameFilter}
            setItemNameFilter={setItemNameFilter}

            // Filter dropdown options
            staffFilterList={staffFilterList}
            transactionTypes={transactionTypes}
            groups={itemGroups}
            productTypes={productTypes}
            itemMasterList={itemMasterList}

            // Added Date — uses existing createdAt filter
            addedFrom={createdFrom}
            setAddedFrom={setCreatedFrom}
            addedTo={createdTo}
            setAddedTo={setCreatedTo}

            // Issue Date
            issueFrom={issueFrom}
            setIssueFrom={setIssueFrom}
            issueTo={issueTo}
            setIssueTo={setIssueTo}

            // Updated Date
            updatedFrom={updatedFrom}
            setUpdatedFrom={setUpdatedFrom}
            updatedTo={updatedTo}
            setUpdatedTo={setUpdatedTo}

            setPagination={setPagination}
          />
        </div>
      </CardHeader >

    );
  };

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Access Denied</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view Issue/Receipt.
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
          {/* Direct invocation prevents the search field from remounting. */}
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

      {/* ADD Issue/Receipt */}
      <IssueReceiptAddDialog
        open={addDialogOpen}
        closeDialog={() => setAddDialogOpen(false)}
        onSuccess={async (newIssueReceipt) => {
          setAddDialogOpen(false);

          await createIssueReceiptNotification({
            action: "created",
            title: "New Issue/Receipt Created",
            message: `${getReceiptLabel(newIssueReceipt)} has been created.`,
            issueReceiptId: newIssueReceipt?.id,
            issueReceiptName: getReceiptLabel(newIssueReceipt),
          });

          await refreshIssueReceipts();
          await syncInventoryIssueReceipts();
        }}
      />

      {/* VIEW Issue/Receipt */}
      <IssueReceiptViewDialog
        open={viewDialogOpen}
        IssueReceipt={selectedIssueReceipt}
        closeDialog={() => {
          setViewDialogOpen(false);
          setSelectedIssueReceipt(null);
        }}
      />

      {/* EDIT Issue/Receipt */}
      <IssueReceiptEditDialog
        open={editDialogOpen}
        IssueReceipt={selectedIssueReceipt}
        closeDialog={() => {
          setEditDialogOpen(false);
          setSelectedIssueReceipt(null);
        }}
        onSuccess={async (updatedIssueReceipt) => {
          const receipt = updatedIssueReceipt || selectedIssueReceipt;

          await createIssueReceiptNotification({
            action: "updated",
            title: "Issue/Receipt Updated",
            message: `${getReceiptLabel(receipt)} has been updated.`,
            issueReceiptId: receipt?.id,
            issueReceiptName: getReceiptLabel(receipt),
          });

          await refreshIssueReceipts();
          await syncInventoryIssueReceipts();
        }}
      />

      {/* DELETE Issue/Receipt */}
      <IssueReceiptDeleteDialog
        open={deleteDialogOpen}
        IssueReceipt={selectedIssueReceipt}
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        closeDialog={() => {
          setDeleteDialogOpen(false);
          setSelectedIssueReceipt(null);
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
              <DialogTitle>Email Issue/Receipt</DialogTitle>
              <DialogDescription>
                Select recipients and send the Inventory issue/receipt report.
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
      < Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          if (bulkLoading) return;
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
                {selectedIds.length} selected Issue/Receipt
                {selectedIds.length !== 1 ? "s" : ""}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={bulkLoading}
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={bulkLoading || selectedIds.length === 0}
              onClick={handleConfirmBulkDelete}
            >
              <Trash2 className="mr-2 size-4" />
              {bulkLoading ? "Deleting..." : "Delete Selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
      <IssueReceiptsDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={handleConfirmBulkDelete}
      />
    </>
  );
};

export default IssueReceiptList;