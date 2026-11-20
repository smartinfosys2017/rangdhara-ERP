
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
  FileSpreadsheet,
  Funnel,
  Info,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
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
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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

import UnitAddDialog from "./unit-add-dialog";
import UnitEditDialog from "./unit-edit-dialog";
import UnitViewDialog from "./unit-view-dialog";
import UnitDeleteDialog from "./unit-delete-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";

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

const createUnitNotification = async ({
  action,
  title,
  message,
  unitid = null,
  unitName = null,
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
        entityId: unitid != null ? String(unitid) : null,
        entityType: "unit",
        entityName: unitName || "Unit",
        url: "/inventory/unit",
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
    console.error("UNIT NOTIFICATION ERROR:", error);
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

  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString();
};

// =======================================================
// COMPONENT
// =======================================================

const UnitList = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  // ===================================================
  // PERMISSIONS
  // ===================================================

  const userPermissions = useMemo(
    () => session?.user?.permissions || [],
    [session?.user?.permissions],
  );

  const canView = can("unit.view", userPermissions);
  const canManage = can("unit.manage", userPermissions);
  const canEdit = can("unit.edit", userPermissions);
  const canDelete = can("unit.delete", userPermissions);

  // ===================================================
  // TABLE STATE
  // ===================================================

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

  const [selectedUnit, setSelectedUnit] = useState(null);
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

  const [copyUnitName, setCopyUnitName] = useState("");
  const [copyAbbreviation, setCopyAbbreviation] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);

  // ===================================================
  // REFRESH
  // ===================================================

  const refreshUnits = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["unit"],
      exact: false,
    });

    await queryClient.refetchQueries({
      queryKey: ["unit"],
      exact: false,
      type: "active",
    });
  }, [queryClient]);

  // ===================================================
  // INVENTORY SYNC
  // ===================================================

  const syncInventoryUnit = useCallback(async () => {
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
      console.error("UNIT SYNC ERROR:", error);
      showError(error.message || "Inventory sync failed");
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
  // FETCH UNITS
  // ===================================================

  const fetchUnits = useCallback(async () => {
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
      `/api/inventory/unit?${params.toString()}`,
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed loading units");
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

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "unit",
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
    queryFn: fetchUnits,
    staleTime: 0,
  });

  const units = data?.data || [];
  const totalRecords = Number(data?.pagination?.total || 0);

  // ===================================================
  // SELECTION HELPERS
  // ===================================================

  const currentPageIds = useMemo(
    () => units.map((item) => String(item.id)),
    [units],
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

  const getUnitReportRows = useCallback(async () => {
    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds.map(String));

      return units.filter((item) => selectedSet.has(String(item.id)));
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
      `/api/inventory/unit?${params.toString()}`,
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load units");
    }

    return result.data || [];
  }, [
    selectedIds,
    units,
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


  // =======================================================
  // EXCEL
  // =======================================================

  const buildUnitExcel = useCallback((items = []) => {
    const rows = items.map((item) => ({
      ID: item.id || "",
      "Unit Name": item.unitName || "",
      Abbreviation: item.abbreviation || "",
      Status: item.status ? "Active" : "Inactive",
      "Created Date": formatDate(item.createdAt),
      "Created By": item.createdByName || "-",
      "Updated Date": formatDate(item.updatedAt),
      "Updated By": item.updatedByName || "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 15 },
      { wch: 30 },
      { wch: 20 },
      { wch: 14 },
      { wch: 22 },
      { wch: 25 },
      { wch: 22 },
      { wch: 25 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Units");

    return workbook;
  }, []);


  const downloadUnitExcel = useCallback(
    (items, filename = "units.xlsx") => {
      if (!items.length) {
        showError("No units to export");
        return false;
      }

      XLSX.writeFile(buildUnitExcel(items), filename);

      return true;
    },
    [buildUnitExcel],
  );

  const handleExportExcel = useCallback(async () => {
    try {
      toast.loading("Preparing Excel export...", {
        id: "unit-export",
      });

      const items = await getUnitReportRows();

      if (!items.length) {
        showError("No units to export", {
          id: "unit-export",
        });

        return;
      }

      downloadUnitExcel(items);

      showSuccess(`${items.length} unit(s) exported.`, "unit-export");
    } catch (error) {
      console.error("UNIT EXPORT ERROR:", error);
      showError(error.message);
    }
  }, [getUnitReportRows, downloadUnitExcel]);

  // ===================================================
  // PRINT
  // ===================================================

  const handlePrintUnits = useCallback(async () => {
    try {
      const items = await getUnitReportRows();

      if (!items.length) {
        showError("No units to print");
        return;
      }

      const rows = items
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.id)}</td>
              <td>${escapeHtml(item.unitName)}</td>
              <td>${escapeHtml(item.abbreviation)}</td>
              <td>${item.status ? "Active" : "Inactive"}</td>
              <td>${escapeHtml(formatDate(item.createdAt))}</td>
              <td>${escapeHtml(item.createdByName || "-")}</td>
              <td>${escapeHtml(formatDate(item.updatedAt))}</td>              
              <td>${escapeHtml(item.updatedByName || "-")}</td>
            </tr>
          `,
        )
        .join("");

      const printWindow = window.open("", "_blank", "width=1200,height=800");

      if (!printWindow) {
        showError("Please allow pop-ups to print the report");
        return;
      }

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Units Report</title>
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
            <h1>Units Report</h1>
            <p>Generated: ${escapeHtml(new Date().toLocaleString())}</p>
            <p>Total records: ${items.length}</p>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Unit Name</th>
                  <th>Abbreviation</th>
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
      console.error("UNIT PRINT ERROR:", error);
      showError(error.message);
    }
  }, [getUnitReportRows]);

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
  // FILTER AND SELECTION RESET
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
  // DELETE UNIT
  // ===================================================

  const handleDelete = useCallback((item) => {
    setSelectedUnit(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedUnit?.id) return;

    try {
      setDeleteLoading(true);

      const response = await apiFetch("/api/inventory/unit", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedUnit.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Delete failed");
      }

      showSuccess("Unit deleted successfully.");

      await createUnitNotification({
        action: "deleted",
        title: "Unit Deleted",
        message: `${selectedUnit.unitName} has been deleted.`,
        unitid: selectedUnit.id,
        unitName: selectedUnit.unitName,
      });

      setDeleteDialogOpen(false);

      setSelectedIds((prev) =>
        prev.filter((id) => id !== String(selectedUnit.id)),
      );

      setSelectedUnit(null);
      // move to the previous page.
      if (units.length === 1 && pagination.pageIndex > 0) {
        setPagination((prev) => ({
          ...prev,
          pageIndex: prev.pageIndex - 1,
        }));
      }
      await refreshUnits();
      await syncInventoryUnit();
      await refreshUnits();
    } catch (error) {
      console.error("UNIT DELETE ERROR:", error);
      showError(error.message || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedUnit, units.length, pagination.pageIndex, refreshUnits, syncInventoryUnit,]);

  // ===================================================
  // EXISTING UNIT NAMES AND ABBREVIATIONS
  // ===================================================

  const getExistingUnits = useCallback(async () => {
    const params = new URLSearchParams({
      page: "1",
      limit: "10000",
      sort: "createdAt",
      dir: "desc",
    });

    const response = await apiFetch(
      `/api/inventory/unit?${params.toString()}`,
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to check existing units.");
    }

    return result.data || [];
  }, []);

  // ===================================================
  // COPY UNIT
  // ===================================================

  const handleCopyUnit = useCallback(
    async (item) => {
      try {
        const originalName = String(item.unitName || "").trim();
        const originalAbbreviation = String(item.abbreviation || "").trim();

        if (!originalName) {
          showError("Unit name is missing.");
          return;
        }

        const existingUnits = await getExistingUnits();

        const existingNames = new Set(
          existingUnits.map((unit) =>
            String(unit.unitName || "").trim().toLowerCase(),
          ),
        );

        const existingAbbreviations = new Set(
          existingUnits.map((unit) =>
            String(unit.abbreviation || "").trim().toLowerCase(),
          ),
        );

        // Generate unique copied unit name
        let copiedName = `${originalName} (Copy)`;
        let counter = 2;

        while (existingNames.has(copiedName.toLowerCase())) {
          copiedName = `${originalName} (Copy ${counter})`;
          counter++;
        }

        // Generate unique copied abbreviation
        let copiedAbbreviation = originalAbbreviation
          ? `${originalAbbreviation} (Copy)`
          : "";

        let abbreviationCounter = 2;

        while (
          copiedAbbreviation &&
          existingAbbreviations.has(copiedAbbreviation.toLowerCase())
        ) {
          copiedAbbreviation = `${originalAbbreviation} (Copy ${abbreviationCounter})`;
          abbreviationCounter++;
        }

        setCopySourceItem(item);
        setCopyUnitName(copiedName);
        setCopyAbbreviation(copiedAbbreviation);
        setCopyDialogOpen(true);
      } catch (error) {
        console.error("OPEN UNIT COPY ERROR:", error);
        showError(error.message);
      }
    },
    [getExistingUnits],
  );

  const handleConfirmCopyUnit = useCallback(async () => {
    if (!copySourceItem?.id) {
      showError("Please select a unit to copy.");
      return;
    }

    const finalName = copyUnitName.trim();
    const finalAbbreviation = copyAbbreviation.trim();

    if (!finalName || !finalAbbreviation) {
      showError("Unit name and abbreviation are required.");
      return;
    }

    if (finalName.length > 255 || finalAbbreviation.length > 25) {
      showError("Unit name or abbreviation exceeds the allowed character limit.");
      return;
    }

    try {
      setCopyLoading(true);

      const existingUnits = await getExistingUnits();

      const nameExists = existingUnits.some(
        (unit) =>
          String(unit.unitName || "").trim().toLowerCase() ===
          finalName.toLowerCase(),
      );

      const abbreviationExists = existingUnits.some(
        (unit) =>
          String(unit.abbreviation || "").trim().toLowerCase() ===
          finalAbbreviation.toLowerCase(),
      );

      if (nameExists) {
        throw new Error("This unit name already exists.");
      }

      if (abbreviationExists) {
        throw new Error("This abbreviation already exists.");
      }

      const response = await apiFetch("/api/inventory/unit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          unitName: finalName,
          abbreviation: finalAbbreviation,
          status: Boolean(copySourceItem.status),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to copy unit.");
      }

      showSuccess("Unit copied successfully.");

      await createUnitNotification({
        action: "created",
        title: "Unit Copied",
        message: `${finalName} was copied from ${copySourceItem.unitName}.`,
        unitid: result.data?.id,
        unitName: finalName,
      });

      setCopyDialogOpen(false);
      setCopySourceItem(null);
      setCopyUnitName("");
      setCopyAbbreviation("");

      await refreshUnits();
      await syncInventoryUnit();
    } catch (error) {
      console.error("UNIT COPY ERROR:", error);
      showError(error.message);
    } finally {
      setCopyLoading(false);
    }
  }, [
    copySourceItem,
    copyUnitName,
    copyAbbreviation,
    getExistingUnits,
    refreshUnits,
    syncInventoryUnit,
  ]);

  // ===================================================
  // SINGLE UNIT STATUS
  // ===================================================

  const handleToggleUnitStatus = useCallback(
    async (item) => {
      if (!(canManage || canEdit)) {
        showError("You do not have permission to change unit status");
        return;
      }

      const nextStatus = !Boolean(item.status);

      try {
        const response = await apiFetch("/api/inventory/unit", {
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
          `${item.unitName} marked ${nextStatus ? "active" : "inactive"}`,
          "unit-status",
        );

        await refreshUnits();
        await syncInventoryUnit();
      } catch (error) {
        console.error("UNIT STATUS ERROR:", error);
        showError(error.message);
      }
    },
    [canManage, canEdit, refreshUnits, syncInventoryUnit],
  );

  // ===================================================
  // BULK STATUS
  // ===================================================

  const handleBulkStatus = useCallback(
    async (status) => {
      if (!selectedIds.length) {
        showError("Select at least one unit");
        return;
      }

      if (!(canManage || canEdit)) {
        showError("You do not have permission to change unit status");
        return;
      }

      const idsToUpdate = [...selectedIds];

      try {
        setBulkLoading(true);

        const response = await apiFetch("/api/inventory/unit", {
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
          `${result.count ?? idsToUpdate.length} unit(s) marked ${status ? "active" : "inactive"}`,
          "unit-status-update",
        );

        setActiveDialogOpen(false);
        setInactiveDialogOpen(false);
        setSelectedIds([]);

        await refreshUnits();
        await syncInventoryUnit();
      } catch (error) {
        console.error("BULK UNIT STATUS ERROR:", error);
        showError(error.message);
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, canManage, canEdit, refreshUnits, syncInventoryUnit],
  );

  // ===================================================
  // BULK DELETE
  // ===================================================

  const handleBulkDelete = useCallback(() => {
    if (!selectedIds.length) {
      showError("Select at least one unit");
      return;
    }

    if (!canDelete) {
      showError("You do not have permission to delete units");
      return;
    }

    setBulkDeleteDialogOpen(true);
  }, [selectedIds, canDelete]);

  const handleConfirmBulkDelete = useCallback(async () => {
    if (!selectedIds.length || bulkLoading) return;

    const idsToDelete = [...selectedIds];

    try {
      setBulkLoading(true);

      const response = await apiFetch("/api/inventory/unit", {
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
        `${result.count ?? idsToDelete.length} unit(s) deleted`,
        "unit-delete",
      );

      setBulkDeleteDialogOpen(false);
      setSelectedIds([]);

      await refreshUnits();
      await syncInventoryUnit();
    } catch (error) {
      console.error("BULK UNIT DELETE ERROR:", error);
      showError(error.message);
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, bulkLoading, refreshUnits, syncInventoryUnit]);

  // ===================================================
  // EMAIL DIALOG
  // ===================================================

  const handleOpenEmailDialog = useCallback(() => {
    setSelectedRecipientEmails([]);
    setAttachExcel(true);

    setEmailSubject("Units Report");

    setEmailMessage(
      [
        "Dear Team,",
        "",
        "Please find the Units report for your review.",
        "",
        "The report includes the unit name, abbreviation, status, and creation and update dates.",
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

      if (!window.location.pathname.includes("/unit")) {
        return;
      }

      switch (button.id) {
        case "Print":
          event.preventDefault();
          void handlePrintUnits();
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
  }, [handlePrintUnits, handleExportExcel, handleOpenEmailDialog]);

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

      const response = await fetch("/api/inventory/unit/email-report", {
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
        "unit-email",
      );

      setEmailDialogOpen(false);
    } catch (error) {
      console.error("UNIT EMAIL ERROR:", error);
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
      await syncInventoryUnit();
      await refreshUnits();
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
  }, [checkDbStatus, syncInventoryUnit, refreshUnits]);

  // ===================================================
  // DB STATUS AUTO CHECK
  // ===================================================

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
            disabled={!units.length || bulkLoading}
          />
        ),

        cell: ({ row }) => {
          const item = row.original;
          const id = String(item.id);

          return (
            <Checkbox
              aria-label={`Select ${item.unitName}`}
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
          <DataGridColumnHeader title="ID" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span>#{String(row.original.id).substring(0, 8)}</span>
        ),

        size: 120,
      },

      {
        accessorKey: "unitName",
        id: "unitName",

        header: ({ column }) => (
          <DataGridColumnHeader title="Unit Name" column={column} visibility />
        ),

        cell: ({ row }) => (
          <span className="font-medium">{row.original.unitName}</span>
        ),

        size: 220,
      },

      {
        accessorKey: "abbreviation",
        id: "abbreviation",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Abbreviation"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span>{row.original.abbreviation || "-"}</span>
        ),

        size: 160,
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
          <DataGridColumnHeader title="Created Date" column={column} visibility />
        ),

        cell: ({ row }) => formatDate(row.original?.createdAt),

        size: 150,
        enableSorting: true,

        meta: {
          headerTitle: "Created Date",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },
      {
        accessorKey: "createby",
        id: "createby",

        header: ({ column }) => (
          <DataGridColumnHeader title="Created By" column={column} visibility />
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
        accessorKey: "updatedAt",
        id: "updatedAt",

        header: ({ column }) => (
          <DataGridColumnHeader title="Updated Date" column={column} visibility />
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
        accessorKey: "updateby",
        id: "updateby",

        header: ({ column }) => (
          <DataGridColumnHeader title="Updated By" column={column} visibility />
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
                  aria-label={`Actions for ${item.unitName}`}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {canView && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedUnit(item);
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
                      setSelectedUnit(item);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                )}

                {(canManage || canEdit) && (
                  <DropdownMenuItem
                    onClick={() => void handleCopyUnit(item)}
                  >
                    <Copy className="mr-2 size-4" />
                    Copy
                  </DropdownMenuItem>
                )}

                {(canManage || canEdit) && (
                  <DropdownMenuItem
                    onClick={() => void handleToggleUnitStatus(item)}
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
      units,
      selectedIds,
      bulkLoading,
      toggleCurrentPageSelection,
      toggleRowSelection,
      canView,
      canEdit,
      canManage,
      canDelete,
      handleCopyUnit,
      handleToggleUnitStatus,
      handleDelete,
    ],
  );

  // ===================================================
  // TABLE
  // ===================================================

  const table = useReactTable({
    columns,
    data: units,

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
            placeholder="Search unit"
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
            <p>Search by unit name or abbreviation.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {/* BULK ACTIONS */}

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

        {/* DATABASE STATUS */}

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
            aria-label="Refresh database connection status"
          >
            <RefreshCw
              className={`size-4 ${checkingDb ? "animate-spin" : ""}`}
            />
          </Button>
        </div>

        {/* ADD UNIT */}

        {canManage && (
          <Button
            type="button"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="mr-2 size-4" />
            Add Unit
          </Button>
        )}

        {/* FILTER */}

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
              You do not have permission to view units.
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
        isLoading={isLoading || isFetching}
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

      {/* ADD UNIT */}

      <UnitAddDialog
        open={addDialogOpen}
        closeDialog={() => setAddDialogOpen(false)}
        onSuccess={async (newUnit) => {
          setAddDialogOpen(false);

          await createUnitNotification({
            action: "created",
            title: "New Unit Created",
            message: `${newUnit?.unitName || "Unit"} has been created.`,
            unitid: newUnit?.id,
            unitName: newUnit?.unitName,
          });

          await refreshUnits();
          await syncInventoryUnit();
        }}
      />

      {/* VIEW UNIT */}

      <UnitViewDialog
        open={viewDialogOpen}
        Unit={selectedUnit}
        closeDialog={() => {
          setViewDialogOpen(false);
          setSelectedUnit(null);
        }}
      />

      {/* EDIT UNIT */}

      <UnitEditDialog
        open={editDialogOpen}
        Unit={selectedUnit}
        closeDialog={() => {
          setEditDialogOpen(false);
          setSelectedUnit(null);
        }}
        onSuccess={async (updatedUnit) => {
          const name =
            updatedUnit?.unitName || selectedUnit?.unitName || "Unit";

          await createUnitNotification({
            action: "updated",
            title: "Unit Updated",
            message: `${name} has been updated.`,
            unitid: updatedUnit?.id || selectedUnit?.id,
            unitName: name,
          });

          await refreshUnits();
          await syncInventoryUnit();
        }}
      />

      {/* DELETE UNIT */}

      <UnitDeleteDialog
        open={deleteDialogOpen}
        Unit={selectedUnit}
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        closeDialog={() => {
          setDeleteDialogOpen(false);
          setSelectedUnit(null);
        }}
      />

      {/* COPY UNIT */}

      <Dialog
        open={copyDialogOpen}
        onOpenChange={(open) => {
          if (copyLoading) return;

          setCopyDialogOpen(open);

          if (!open) {
            setCopySourceItem(null);
            setCopyUnitName("");
            setCopyAbbreviation("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Unit</DialogTitle>

            <DialogDescription>
              Enter a unique unit name and abbreviation for the copied unit.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleConfirmCopyUnit();
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="copy-unit-name"
                className="text-sm font-medium"
              >
                Unit Name <span className="text-destructive"> *</span>
              </label>

              <Input
                id="copy-unit-name"
                value={copyUnitName}
                onChange={(event) => setCopyUnitName(event.target.value)}
                placeholder="Enter unit name"
                maxLength={255}
                required
                disabled={copyLoading}
              />

              {copySourceItem && (
                <p className="text-xs text-muted-foreground">
                  Copying from: {copySourceItem.unitName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label
                htmlFor="copy-unit-abbreviation"
                className="text-sm font-medium"
              >
                Abbreviation <span className="text-destructive"> *</span>
              </label>

              <Input
                id="copy-unit-abbreviation"
                value={copyAbbreviation}
                onChange={(event) => setCopyAbbreviation(event.target.value)}
                placeholder="Enter abbreviation"
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
                  !copyUnitName.trim() ||
                  !copyAbbreviation.trim()
                }
              >
                <Copy className="mr-2 size-4" />
                {copyLoading ? "Copying..." : "Copy"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BULK ACTIVE */}

      <Dialog
        open={activeDialogOpen}
        onOpenChange={setActiveDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Units Active</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark {selectedIds.length} selected
              unit(s) as active?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveDialogOpen(false)}
              disabled={bulkLoading}
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={bulkLoading}
              onClick={() => void handleBulkStatus(true)}
            >
              {bulkLoading ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK INACTIVE */}

      <Dialog
        open={inactiveDialogOpen}
        onOpenChange={setInactiveDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Units Inactive</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark {selectedIds.length} selected
              unit(s) as inactive?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setInactiveDialogOpen(false)}
              disabled={bulkLoading}
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={bulkLoading}
              onClick={() => void handleBulkStatus(false)}
            >
              {bulkLoading ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK DELETE */}

      <Dialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Selected Units</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.length} selected
              unit(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setBulkDeleteDialogOpen(false)}
              disabled={bulkLoading}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={bulkLoading}
              onClick={() => void handleConfirmBulkDelete()}
            >
              {bulkLoading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EMAIL REPORT */}

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
              <DialogTitle>Email Units</DialogTitle>

              <DialogDescription>
                Select recipients and send the Units report.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
              <DialogBody className="space-y-6 px-6 min-h-0">
                {/* RECIPIENTS */}

                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium">
                    Recipient Email
                  </label>

                  <span className="text-xs text-muted-foreground">
                    {selectedRecipientEmails.length} of {staffList.length} selected
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
                    htmlFor="unit-subject"
                    className="text-sm font-medium"
                  >
                    Subject
                  </label>

                  <Input
                    id="unit-subject"
                    required
                    value={emailSubject}
                    onChange={(event) => setEmailSubject(event.target.value)}
                    placeholder="Units Report"
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
                        Attach the unit report as an Excel file (.xlsx).
                      </span>
                    </span>

                    <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                  </label>
                </div>

                {/* MESSAGE */}

                <div className="space-y-2">
                  <label
                    htmlFor="unit-message"
                    className="text-sm font-medium"
                  >
                    Message
                  </label>

                  <Textarea
                    id="unit-message"
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

export default UnitList;
