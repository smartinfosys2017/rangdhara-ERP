"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as XLSX from "xlsx";
import {
  CalendarDays,
  CheckCircle,
  Funnel,
  FileSpreadsheet,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { can } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from '@/components/ui/textarea';
import { Input } from "@/components/ui/input";
import { Card, CardFooter, CardHeader, CardTable } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { DataGrid } from "@/components/ui/data-grid";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";

import InventoryRregisterAddDialog from "./inventory-register-add-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";

const REGISTER_API = "/api/inventory/invnetory-register";

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

const reportDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString();
};
const hasValue = (value) =>
  value !== null && value !== undefined && value !== "";

// True when the balance is at or below the restock level.
const isLowStock = (row) => {
  if (!hasValue(row?.Balance) || !hasValue(row?.RestockLevel)) return false;

  const balance = Number(row.Balance);
  const level = Number(row.RestockLevel);

  return Number.isFinite(balance) && Number.isFinite(level) && balance <= level;
};

// Works with the common API response shapes.
const getRows = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.results)) return result.results;
  return [];
};

// One definition drives both the Excel export and the print report.
const REPORT_COLUMNS = [
  { label: "ID", width: 14, get: (r) => r.id },
  { label: "Group Name", width: 24, get: (r) => r.GroupName },
  { label: "Item Name", width: 32, get: (r) => r.ItemName },
  { label: "Unit Measure", width: 16, get: (r) => r.UnitMeasure },
  { label: "Balance", width: 12, get: (r) => r.Balance },
  { label: "Restock Level", width: 14, get: (r) => r.RestockLevel },
  { label: "Added Date", width: 14, get: (r) => reportDate(r.AddedDate) },
  {
    label: "Last Update Date",
    width: 16,
    get: (r) => reportDate(r.LastUpdateDate),
  },
  { label: "Added By", width: 20, get: (r) => r.AddedBy },
  { label: "Last Updated By", width: 20, get: (r) => r.LastUpdatedBy },
];

// Builds a sortable, hideable column from a small definition.
const makeColumn = ({
  id,
  title,
  size,
  render,
  skeleton = "w-24",
  hidden = false,
}) => ({
  accessorKey: id,
  id,
  header: ({ column }) => (
    <DataGridColumnHeader title={title} column={column} visibility />
  ),
  cell: ({ row }) => render(row.original),
  size,
  enableSorting: true,
  enableHiding: !hidden,
  meta: {
    headerTitle: title,
    skeleton: <Skeleton className={`h-7 ${skeleton}`} />,
  },
});

const InventoryRegisterList = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const userPermissions = useMemo(
    () => session?.user?.permissions || [],
    [session],
  );

  const canView = can("issue_receipt.view", userPermissions);
  const canManage = can("issue_receipt.manage", userPermissions);
  const canDelete = can("issue_receipt.delete", userPermissions);

  // TABLE STATE
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([{ id: "AddedDate", desc: true }]);

  const [columnVisibility, setColumnVisibility] = useState({
    id: false,
    GroupName: true,
    ItemName: true,
    UnitMeasure: true,
    Balance: true,
    RestockLevel: true,
    AddedDate: true,
    LastUpdateDate: true,
    AddedBy: true,
    LastUpdatedBy: true,
  });

  // SEARCH AND FILTERS
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [addedFrom, setAddedFrom] = useState("");
  const [addedTo, setAddedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");

  // Restock level: balance <= level, balance > level (check one, or none for all)
  const [restockLte, setRestockLte] = useState(false);
  const [restockGt, setRestockGt] = useState(false);

  // Multi-select filters hold arrays of string IDs.
  const [groupFilter, setGroupFilter] = useState([]);
  const [itemFilter, setItemFilter] = useState([]);
  const [itemTypeFilter, setItemTypeFilter] = useState([]);

  // Filter options
  const [groupOptions, setGroupOptions] = useState([]);
  const [itemOptions, setItemOptions] = useState([]);
  const [itemTypeOptions, setItemTypeOptions] = useState([]);

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

  // DIALOGS
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  // EMAIL DIALOG
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState([]);
  const [attachExcel, setAttachExcel] = useState(true);
  const [emailSending, setEmailSending] = useState(false);

  // The restock filter value sent to the API: "lte", "gt", or "" for all.
  const restockLevelFilter =
    restockLte && !restockGt ? "lte" : restockGt && !restockLte ? "gt" : "";

  const refreshRegister = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["inventory-register"] });
  }, [queryClient]);

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

  useEffect(() => {
    let cancelled = false;

    const loadFilterOptions = async () => {
      const load = async (url) => {
        const response = await apiFetch(url);
        const json = await response.json();

        if (!response.ok || json?.success === false) {
          throw new Error(json?.message || "Failed to load filter options");
        }

        return getRows(json);
      };

      const [groups, items, types] = await Promise.allSettled([
        load("/api/inventory/item-groups?limit=10000"),
        load("/api/inventory/item-master?limit=10000"),
        load("/api/inventory/product-type?limit=10000"),
      ]);

      if (cancelled) return;

      if (groups.status === "fulfilled") setGroupOptions(groups.value);
      if (items.status === "fulfilled") setItemOptions(items.value);
      if (types.status === "fulfilled") setItemTypeOptions(types.value);

      if ([groups, items, types].some((r) => r.status === "rejected")) {
        toast.error("Some filter options could not be loaded");
      }
    };

    loadFilterOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const buildListParams = useCallback(
    ({ page, limit }) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        query: searchQuery,
        addedFrom,
        addedTo,
        updatedFrom,
        updatedTo,
        sort: sorting?.[0]?.id || "AddedDate",
        dir: sorting?.[0]?.desc ? "desc" : "asc",
      });

      if (restockLevelFilter) {
        params.set("restockLevel", restockLevelFilter);
      }

      // Multi-select filters are sent as repeated params: groupId=1&groupId=2
      groupFilter.forEach((id) => params.append("groupId", id));
      itemFilter.forEach((id) => params.append("itemId", id));
      itemTypeFilter.forEach((id) => params.append("itemTypeId", id));

      return params;
    },
    [
      searchQuery,
      addedFrom,
      addedTo,
      updatedFrom,
      updatedTo,
      sorting,
      restockLevelFilter,
      groupFilter,
      itemFilter,
      itemTypeFilter,
    ],
  );

  const fetchRegister = useCallback(async () => {
    const params = buildListParams({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
    });

    const response = await apiFetch(`${REGISTER_API}?${params.toString()}`);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed loading Inventory Register");
    }

    return result;
  }, [buildListParams, pagination.pageIndex, pagination.pageSize]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "inventory-register",
      pagination,
      sorting,
      searchQuery,
      addedFrom,
      addedTo,
      updatedFrom,
      updatedTo,
      restockLevelFilter,
      groupFilter,
      itemFilter,
      itemTypeFilter,
    ],
    queryFn: fetchRegister,
    staleTime: 0,
    placeholderData: keepPreviousData,
  });

  const registerRows = useMemo(() => data?.data || [], [data]);
  const totalRecords = Number(data?.pagination?.total || registerRows.length);

  const currentPageIds = useMemo(
    () => registerRows.map((item) => String(item.id)),
    [registerRows],
  );

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.includes(id));

  const getReportRows = useCallback(async () => {
    // Use selected rows when any are selected.
    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds.map(String));
      return registerRows.filter((item) => selectedSet.has(String(item.id)));
    }

    // Otherwise fetch all records matching the current filters.
    const params = buildListParams({ page: 1, limit: 10000 });

    const response = await apiFetch(`${REGISTER_API}?${params.toString()}`);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load Inventory Register");
    }

    return result.data || [];
  }, [selectedIds, registerRows, buildListParams]);

  const handleExportExcel = useCallback(async () => {
    try {
      toast.loading("Preparing Excel export...", {
        id: "inventory-register-export",
      });

      const items = await getReportRows();

      if (!items.length) {
        toast.error("No register records to export", {
          id: "inventory-register-export",
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Register");
      XLSX.writeFile(workbook, "inventory-register.xlsx");

      toast.success(`${items.length} register record(s) exported`, {
        id: "inventory-register-export",
      });
    } catch (error) {
      console.error("INVENTORY REGISTER EXPORT ERROR", error);
      toast.error(error.message || "Excel export failed", {
        id: "inventory-register-export",
      });
    }
  }, [getReportRows]);

  const handlePrintRegister = useCallback(async () => {
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
      const items = await getReportRows();

      if (!items.length) {
        printWindow.close();
        toast.error("No register records to print");
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
          <title>Inventory Register Report</title>
          <meta charset="utf-8">
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; padding: 16px; color: #222; }
            h1 { font-size: 20px; margin-bottom: 6px; }
            p { color: #555; font-size: 12px; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; font-size: 10px; }
            th { background: #f2f2f2; }
            tr { break-inside: avoid; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Inventory Register Report</h1>
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
      console.error("INVENTORY REGISTER PRINT ERROR", error);
      toast.error(error.message || "Unable to prepare print report");
    }
  }, [getReportRows]);

  // Clear selected rows when the result set or page changes.
  useEffect(() => {
    setSelectedIds([]);
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    searchQuery,
    addedFrom,
    addedTo,
    updatedFrom,
    updatedTo,
    restockLevelFilter,
    groupFilter,
    itemFilter,
    itemTypeFilter,
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

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");
    setAddedFrom("");
    setAddedTo("");
    setUpdatedFrom("");
    setUpdatedTo("");
    setRestockLte(false);
    setRestockGt(false);
    setGroupFilter([]);
    setItemFilter([]);
    setItemTypeFilter([]);
    setSelectedIds([]);
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

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
      toast.error("Select at least one register record");
      return;
    }

    if (!canDelete) {
      toast.error("You do not have permission to delete register records");
      return;
    }

    setShowDeleteDialog(true);
  }, [selectedIds, canDelete]);

  const handleConfirmBulkDelete = useCallback(async () => {
    if (!selectedIds.length || bulkLoading) return;

    const idsToDelete = [...selectedIds];

    try {
      setBulkLoading(true);

      const response = await apiFetch(REGISTER_API, {
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
        `${result.count ?? idsToDelete.length} register record(s) deleted`,
      );

      setShowDeleteDialog(false);
      setSelectedIds([]);

      await refreshRegister();
    } catch (error) {
      console.error("BULK DELETE ERROR", error);
      toast.error(error.message || "Bulk delete failed");
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, bulkLoading, refreshRegister]);

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
    setEmailSubject("Inventory Register Report");

    setEmailMessage(
      [
        "Dear Team,",
        "",
        "Please find the Inventory Register report for your review.",
        "",
        "The report includes the group name, item name, unit of measure, balance, restock level, and who added and last updated each record.",
        "",
        "Please review the information and let us know if any corrections are required.",
        "",
      ].join("\n"),
    );

    setEmailDialogOpen(true);
  }, []);
  // Support the existing shared header buttons by ID.

  // Handle shared header buttons by ID: Print, Export, Email
  useEffect(() => {
    const handleReportButtonClick = (event) => {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest("#Print, #Export, #Email");

      if (!button) return;

      // Prevent the header button's default action.
      event.preventDefault();
      event.stopPropagation();

      switch (button.id) {
        case "Print":
          void handlePrintRegister();
          break;

        case "Export":
          void handleExportExcel();
          break;

        case "Email":
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
  }, [handlePrintRegister, handleExportExcel, handleOpenEmailDialog,]);

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

      const response = await fetch(`${REGISTER_API}/email-report`, {
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
            addedFrom,
            addedTo,
            updatedFrom,
            updatedTo,
            restockLevel: restockLevelFilter,
            groupId: groupFilter,
            itemId: itemFilter,
            itemTypeId: itemTypeFilter,
          },
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || result.error || "Failed to send email.",
        );
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
      await refreshRegister();
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
  }, [checkDbStatus, refreshRegister]);

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
            disabled={!registerRows.length || bulkLoading}
          />
        ),
        cell: ({ row }) => {
          const item = row.original;
          const id = String(item.id);

          return (
            <Checkbox
              aria-label={`Select ${item.ItemName || id}`}
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
        id: "GroupName",
        title: "Group Name",
        size: 200,
        skeleton: "w-32",
        render: (r) => (
          <span className="font-medium">{getDisplayValue(r?.GroupName)}</span>
        ),
      }),
      makeColumn({
        id: "ItemName",
        title: "Item Name",
        size: 280,
        skeleton: "w-40",
        render: (r) => (
          <span className="font-medium">{getDisplayValue(r?.ItemName)}</span>
        ),
      }),
      makeColumn({
        id: "UnitMeasure",
        title: "Unit Measure",
        size: 160,
        render: (r) => <span>{getDisplayValue(r?.UnitMeasure)}</span>,
      }),
      makeColumn({
        id: "Balance",
        title: "Balance",
        size: 130,
        skeleton: "w-20",
        render: (r) => (
          <span
            className={
              isLowStock(r) ? "font-medium text-red-600" : "font-medium"
            }
            title={isLowStock(r) ? "At or below the restock level" : undefined}
          >
            {getDisplayValue(r?.Balance)}
          </span>
        ),
      }),
      makeColumn({
        id: "RestockLevel",
        title: "Restock Level",
        size: 150,
        render: (r) => <span>{getDisplayValue(r?.RestockLevel)}</span>,
      }),
      makeColumn({
        id: "AddedDate",
        title: "Added Date",
        size: 175,
        render: (r) => <span>{formatDate(r?.AddedDate)}</span>,
      }),
      makeColumn({
        id: "LastUpdateDate",
        title: "Last Update Date",
        size: 185,
        skeleton: "w-28",
        render: (r) => <span>{formatDate(r?.LastUpdateDate)}</span>,
      }),
      makeColumn({
        id: "AddedBy",
        title: "Added By",
        size: 180,
        skeleton: "w-28",
        render: (r) => (
          <span className="font-medium">{getDisplayValue(r?.AddedBy)}</span>
        ),
      }),
      makeColumn({
        id: "LastUpdatedBy",
        title: "Last Updated By",
        size: 190,
        skeleton: "w-28",
        render: (r) => (
          <span className="font-medium">
            {getDisplayValue(r?.LastUpdatedBy)}
          </span>
        ),
      }),
    ],
    [
      allCurrentPageSelected,
      registerRows.length,
      selectedIds,
      bulkLoading,
      toggleCurrentPageSelection,
      toggleRowSelection,
    ],
  );

  const table = useReactTable({
    columns,
    data: registerRows,
    pageCount: Math.ceil(totalRecords / pagination.pageSize),
    getRowId: (row) => String(row.id),
    state: { pagination, sorting, columnVisibility },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  const renderToolbar = () => {
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
                placeholder="Search inventory register..."
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
              disabled={checkingDb}
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
            setPagination={setPagination}

            restockFilter={restockLevelFilter}
            setRestockFilter={(value) => {
              setRestockLte(value === "lte");
              setRestockGt(value === "gt");
            }}

            selectedGroupIds={groupFilter}
            setSelectedGroupIds={setGroupFilter}
            groups={groupOptions}

            itemNameFilter={itemFilter}
            setItemNameFilter={setItemFilter}
            itemMasterList={itemOptions}

            itemTypeFilter={itemTypeFilter}
            setItemTypeFilter={setItemTypeFilter}
            productTypes={itemTypeOptions}

            addedFrom={addedFrom}
            setAddedFrom={setAddedFrom}
            addedTo={addedTo}
            setAddedTo={setAddedTo}

            updatedFrom={updatedFrom}
            setUpdatedFrom={setUpdatedFrom}
            updatedTo={updatedTo}
            setUpdatedTo={setUpdatedTo}
          />
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
              You do not have permission to view the Inventory Register.
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

      {/* ADD ENTRY */}
      <InventoryRregisterAddDialog
        open={addDialogOpen}
        closeDialog={() => setAddDialogOpen(false)}
        onSuccess={async () => {
          setAddDialogOpen(false);

          toast.success("Entry added successfully");

          await refreshRegister();
          await queryClient.invalidateQueries({ queryKey: ["issue-receipt"] });
        }}
      />

      {/* EMAIL DIALOG */}
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
              <DialogTitle>Email Inventory Register</DialogTitle>
              <DialogDescription>
                Select recipients and send the inventory register report.
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

      {/* BULK DELETE CONFIRMATION DIALOG */}
      <Dialog
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
                {selectedIds.length} selected register record
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
      </Dialog>
    </>
  );
};

export default InventoryRegisterList;