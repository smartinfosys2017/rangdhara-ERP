
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import * as XLSX from "xlsx";
import {
  CheckCircle,
  Ellipsis,
  Eye,
  FileSpreadsheet,
  Funnel,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Info,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { apiFetch } from "@/lib/api";
import { can } from "@/lib/permissions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import ItemRateAddDialog from "./item-rate-add-dialog";
import ItemRateEditDialog from "./item-rate-edit-dialog";
import ItemRateViewDialog from "./item-rate-view-dialog";
import ItemRateDeleteDialog from "./item-rate-delete-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";

/* -------------------------------------------------------------------------- */
/*                                  HELPERS                                   */
/* -------------------------------------------------------------------------- */

const showSuccessToast = (message) => {
  toast.custom(
    () => (
      <Alert variant="mono" icon="success">
        <AlertIcon>
          <RiCheckboxCircleFill />
        </AlertIcon>
        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    { position: "top-center" }
  );
};

const showErrorToast = (message) => {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close
        onClose={() => toast.dismiss(t)}
      >
        <AlertIcon>
          <RiErrorWarningFill />
        </AlertIcon>
        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    { position: "top-center" }
  );
};

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString("en-IN");
};

const formatRate = (value) => {
  if (value === null || value === undefined || value === "") return "-";

  return `₹${Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

/*
 * Item Name is not a direct field in ItemRates.
 * It is obtained from the related ItemMaster record when available.
 */
const getItemRateName = (item) => {
  return (
    item?.ItemMaster?.ItemName ||
    item?.ItemName ||
    "Item Rate"
  );
};

const getGroupName = (item) => {
  return (
    item?.ItemGroup?.groupName ||
    item?.GroupName ||
    "-"
  );
};

const getUnitName = (item) => {
  const unit = item?.Unit;

  if (!unit) return item?.UnitName || "-";

  if (unit.unitName && unit.abbreviation) {
    return `${unit.unitName} (${unit.abbreviation})`;
  }

  return unit.unitName || unit.abbreviation || item?.UnitName || "-";
};

const getCreatedBy = (item) => {
  return (
    item?.createdByName ||
    item?.createby?.name ||
    item?.createby ||
    "-"
  );
};

const getUpdatedBy = (item) => {
  return (
    item?.updatedByName ||
    item?.updateby?.name ||
    item?.updateby ||
    "-"
  );
};

/* -------------------------------------------------------------------------- */
/*                              NOTIFICATIONS                                 */
/* -------------------------------------------------------------------------- */

const createItemRateNotification = async ({
  action,
  title,
  message,
  itemRateId = null,
  itemRateName = null,
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
          itemRateId !== null && itemRateId !== undefined
            ? String(itemRateId)
            : null,
        entityType: "item_rate",
        entityName: itemRateName || "Item Rate",
        url: "/inventory/item-rate",
      }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(
        result?.message || "Failed to create notification."
      );
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
    console.error("ITEM RATE NOTIFICATION ERROR:", error);
    return null;
  }
};

/* -------------------------------------------------------------------------- */
/*                               MAIN COMPONENT                               */
/* -------------------------------------------------------------------------- */

export default function ItemRateList() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const userPermissions = useMemo(
    () => session?.user?.permissions || [],
    [session?.user?.permissions]
  );

  const canView = can("item_rate.view", userPermissions);
  const canManage = can("item_rate.manage", userPermissions);
  const canEdit = can("item_rate.edit", userPermissions);
  const canDelete = can("item_rate.delete", userPermissions);

  /* ------------------------------- TABLE -------------------------------- */

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState([
    { id: "createdAt", desc: true },
  ]);

  /* -------------------------- SEARCH / FILTERS -------------------------- */

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");

  const [createdBy, setCreatedBy] = useState("");
  const [updatedBy, setUpdatedBy] = useState("");

  const [selectedGroupIds, setSelectedGroupIds] = useState([]);

  /* ---------------------------- SELECTION ------------------------------- */

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  /* ------------------------- CONNECTION STATUS -------------------------- */

  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const [dbStatus, setDbStatus] = useState({
    env: "local",
    online: false,
    loading: true,
  });

  const [checkingDb, setCheckingDb] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  /* ----------------------------- CRUD ----------------------------------- */

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedItemRate, setSelectedItemRate] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* ------------------------------ EMAIL --------------------------------- */

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedRecipientEmails, setSelectedRecipientEmails] =
    useState([]);

  const [attachExcel, setAttachExcel] = useState(true);
  const [emailSending, setEmailSending] = useState(false);

  /* ---------------------------------------------------------------------- */
  /*                              REFRESH DATA                              */
  /* ---------------------------------------------------------------------- */

  const refreshItemRates = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["item-rate"],
    });
  }, [queryClient]);

  /* ---------------------------------------------------------------------- */
  /*                              INVENTORY SYNC                            */
  /* ---------------------------------------------------------------------- */

  const syncInventoryItemRates = useCallback(async () => {
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

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message || "Inventory sync failed"
        );
      }

      window.dispatchEvent(
        new CustomEvent("notifications-refresh")
      );

      return result;
    } catch (error) {
      console.error("ITEM RATE SYNC ERROR:", error);
      showErrorToast(error?.message || "Inventory sync failed");
      return null;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /*                             DATABASE STATUS                            */
  /* ---------------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------------- */
  /*                              QUERY PARAMS                               */
  /* ---------------------------------------------------------------------- */

  const buildListParams = useCallback(
    ({ page, limit }) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        query: searchQuery,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        sort: sorting?.[0]?.id || "createdAt",
        dir: sorting?.[0]?.desc ? "desc" : "asc",
      });

      if (selectedGroupIds.length > 0) {
        params.set(
          "groupIds",
          selectedGroupIds.join(",")
        );
      }

      if (createdBy.trim()) {
        params.set("createdBy", createdBy.trim());
      }

      if (updatedBy.trim()) {
        params.set("updatedBy", updatedBy.trim());
      }

      return params;
    },
    [
      searchQuery,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      sorting,
      selectedGroupIds,
      createdBy,
      updatedBy,
    ]
  );

  /* ---------------------------------------------------------------------- */
  /*                              FETCH ITEM RATES                           */
  /* ---------------------------------------------------------------------- */

  const fetchItemRates = useCallback(async () => {
    const params = buildListParams({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
    });

    const response = await apiFetch(
      `/api/inventory/item-rate?${params.toString()}`
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(
        result?.message || "Failed to load Item Rates."
      );
    }

    return result;
  }, [buildListParams, pagination]);

  const {
    data,
    isLoading,
  } = useQuery({
    queryKey: [
      "item-rate",
      pagination,
      sorting,
      searchQuery,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      selectedGroupIds,
      createdBy,
      updatedBy,
    ],
    queryFn: fetchItemRates,
    staleTime: 0,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    placeholderData: keepPreviousData,
  });

  const itemRates = useMemo(
    () => data?.data || [],
    [data]
  );

  const totalRecords = Number(
    data?.pagination?.total || 0
  );

  /* ---------------------------------------------------------------------- */
  /*                              ROW SELECTION                              */
  /* ---------------------------------------------------------------------- */

  const currentPageIds = useMemo(
    () => itemRates.map((item) => String(item.id)),
    [itemRates]
  );

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) =>
      selectedIds.includes(id)
    );

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
  }, [allCurrentPageSelected, currentPageIds]);

  /* ---------------------------------------------------------------------- */
  /*                              REPORT ROWS                                */
  /* ---------------------------------------------------------------------- */

  const getItemRateReportRows = useCallback(async () => {
    if (selectedIds.length > 0) {
      const selectedSet = new Set(
        selectedIds.map(String)
      );

      return itemRates.filter((item) =>
        selectedSet.has(String(item.id))
      );
    }

    const params = buildListParams({
      page: 1,
      limit: 10000,
    });

    const response = await apiFetch(
      `/api/inventory/item-rate?${params.toString()}`
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(
        result?.message || "Failed to load Item Rates."
      );
    }

    return result.data || [];
  }, [
    selectedIds,
    itemRates,
    buildListParams,
  ]);

  /* ---------------------------------------------------------------------- */
  /*                              EXCEL EXPORT                               */
  /* ---------------------------------------------------------------------- */

  const buildItemRateExcel = useCallback((items) => {
    const rows = items.map((item) => ({
      ID: item.id || "",
      "Item Group": getGroupName(item),
      "Item Name": getItemRateName(item),
      "Brand / Manufacturer": item.BrandManufacturerName,
      "Item Condition": item.ItemConditionName,
      "Applicable From": formatDate(
        item.ApplicableFromDate
      ),
      "Applicable To": formatDate(
        item.ApplicableToDate
      ),
      Rate: item.Rate ?? "",
      Unit: getUnitName(item),
      Comments: item.Comments || "",
      "Created Date": formatDate(item.createdAt),
      "Created By": getCreatedBy(item),
      "Updated Date": formatDate(item.updatedAt),
      "Updated By": getUpdatedBy(item),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 38 },
      { wch: 25 },
      { wch: 30 },
      { wch: 25 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 22 },
      { wch: 35 },
      { wch: 20 },
      { wch: 25 },
      { wch: 20 },
      { wch: 25 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Item Rates"
    );

    return workbook;
  }, []);

  const handleExportExcel = useCallback(async () => {
    try {
      toast.loading("Preparing Excel export...", {
        id: "item-rate-export",
      });

      const items = await getItemRateReportRows();

      if (!items.length) {
        toast.dismiss("item-rate-export");
        showErrorToast("No Item Rates to export.");
        return;
      }

      XLSX.writeFile(
        buildItemRateExcel(items),
        "item-rates.xlsx"
      );

      toast.dismiss("item-rate-export");

      showSuccessToast(
        `${items.length} Item Rate(s) exported successfully.`
      );
    } catch (error) {
      console.error("ITEM RATE EXPORT ERROR:", error);

      toast.dismiss("item-rate-export");

      showErrorToast(
        error.message || "Excel export failed."
      );
    }
  }, [
    getItemRateReportRows,
    buildItemRateExcel,
  ]);

  /* ---------------------------------------------------------------------- */
  /*                               PRINT REPORT                              */
  /* ---------------------------------------------------------------------- */

  const handlePrintItemRates = useCallback(async () => {
    const printWindow = window.open(
      "",
      "_blank",
      "width=1200,height=800"
    );

    if (!printWindow) {
      showErrorToast(
        "Please allow pop-ups to print the report."
      );
      return;
    }

    printWindow.document.write(
      "<p style='font-family:Arial;padding:24px'>Preparing report...</p>"
    );

    try {
      const items = await getItemRateReportRows();

      if (!items.length) {
        printWindow.close();
        showErrorToast("No Item Rates to print.");
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
              <td>${escapeHtml(getGroupName(item))}</td>
              <td>${escapeHtml(getItemRateName(item))}</td>
              <td>${escapeHtml(item.BrandManufacturerName)}</td>
              <td>${escapeHtml(item.ItemConditionName)}</td>
              <td>${escapeHtml(formatDate(item.ApplicableFromDate))}</td>
              <td>${escapeHtml(formatDate(item.ApplicableToDate))}</td>
              <td>${escapeHtml(formatRate(item.Rate))}</td>
              <td>${escapeHtml(getUnitName(item))}</td>
              <td>${escapeHtml(item.Comments || "-")}</td>
              <td>${escapeHtml(formatDate(item.createdAt))}</td>
              <td>${escapeHtml(getCreatedBy(item))}</td>
              <td>${escapeHtml(formatDate(item.updatedAt))}</td>
              <td>${escapeHtml(getUpdatedBy(item))}</td>
            </tr>
          `
        )
        .join("");

      printWindow.document.open();

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Item Rate Report</title>
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
                padding: 7px;
                text-align: left;
                font-size: 10px;
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
            <h1>Item Rate Report</h1>

            <p>
              Generated: ${escapeHtml(
        new Date().toLocaleString()
      )}
            </p>

            <p>Total records: ${items.length}</p>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Item Group</th>
                  <th>Item Name</th>
                  <th>Brand / Manufacturer</th>
                  <th>Item Condition</th>
                  <th>Applicable From</th>
                  <th>Applicable To</th>
                  <th>Rate</th>
                  <th>Unit</th>
                  <th>Comments</th>
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
      printWindow.close();

      console.error("ITEM RATE PRINT ERROR:", error);

      showErrorToast(
        error.message || "Unable to prepare print report."
      );
    }
  }, [getItemRateReportRows]);

  /* ---------------------------------------------------------------------- */
  /*                             SEARCH HANDLERS                             */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    setSelectedIds([]);
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    searchQuery,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    selectedGroupIds,
    createdBy,
    updatedBy,
  ]);

  useEffect(() => {
    if (searchInput === "" && searchQuery !== "") {
      setSearchQuery("");
      setPagination((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
    }
  }, [searchInput, searchQuery]);

  const handleSearch = useCallback(
    (event) => {
      event?.preventDefault();

      setPagination((prev) => ({
        ...prev,
        pageIndex: 0,
      }));

      setSearchQuery(searchInput.trim());
    },
    [searchInput]
  );

  /* ---------------------------------------------------------------------- */
  /*                              CLEAR FILTERS                              */
  /* ---------------------------------------------------------------------- */

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");

    setCreatedFrom("");
    setCreatedTo("");
    setUpdatedFrom("");
    setUpdatedTo("");

    setSelectedGroupIds([]);

    setCreatedBy("");
    setUpdatedBy("");

    setSelectedIds([]);

    setPagination((prev) => ({
      ...prev,
      pageIndex: 0,
    }));
  }, []);

  /* ---------------------------------------------------------------------- */
  /*                              DELETE SINGLE                              */
  /* ---------------------------------------------------------------------- */

  const handleDelete = useCallback((item) => {
    setSelectedItemRate(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedItemRate?.id) return;

    const itemToDelete = selectedItemRate;
    const itemName = getItemRateName(itemToDelete);

    try {
      setDeleteLoading(true);

      const response = await apiFetch(
        "/api/inventory/item-rate",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: itemToDelete.id,
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message || "Item Rate delete failed."
        );
      }

      await createItemRateNotification({
        action: "deleted",
        title: "Item Rate Deleted",
        message: `${itemName} rate was deleted successfully.`,
        itemRateId: itemToDelete.id,
        itemRateName: itemName,
      });

      showSuccessToast(
        `${itemName} rate deleted successfully.`
      );

      setDeleteDialogOpen(false);

      setSelectedIds((prev) =>
        prev.filter(
          (id) => id !== String(itemToDelete.id)
        )
      );

      setSelectedItemRate(null);

      await refreshItemRates();
      await syncInventoryItemRates();
    } catch (error) {
      console.error("DELETE ITEM RATE ERROR:", error);

      showErrorToast(
        error?.message ||
        "Something went wrong while deleting the Item Rate."
      );
    } finally {
      setDeleteLoading(false);
    }
  }, [
    selectedItemRate,
    refreshItemRates,
    syncInventoryItemRates,
  ]);

  /* ---------------------------------------------------------------------- */
  /*                              BULK DELETE                                */
  /* ---------------------------------------------------------------------- */

  const handleBulkDelete = useCallback(() => {
    if (!selectedIds.length) {
      showErrorToast("Select at least one Item Rate.");
      return;
    }

    if (!canDelete) {
      showErrorToast(
        "You do not have permission to delete Item Rates."
      );
      return;
    }

    setShowDeleteDialog(true);
  }, [selectedIds, canDelete]);

  const handleConfirmBulkDelete = useCallback(async () => {
    if (!selectedIds.length || bulkLoading) return;

    const idsToDelete = [...selectedIds];

    try {
      setBulkLoading(true);

      const response = await apiFetch(
        "/api/inventory/item-rate",
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

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message ||
          "Bulk delete failed. Check whether your API supports deleting multiple IDs."
        );
      }

      const deletedCount =
        result.count ?? idsToDelete.length;

      showSuccessToast(
        `${deletedCount} Item Rate(s) deleted successfully.`
      );

      setShowDeleteDialog(false);
      setSelectedIds([]);

      await refreshItemRates();
      await syncInventoryItemRates();
    } catch (error) {
      console.error("BULK ITEM RATE DELETE ERROR:", error);

      showErrorToast(
        error.message || "Bulk delete failed."
      );
    } finally {
      setBulkLoading(false);
    }
  }, [
    selectedIds,
    bulkLoading,
    refreshItemRates,
    syncInventoryItemRates,
  ]);

  /* ---------------------------------------------------------------------- */
  /*                             STAFF RECIPIENTS                            */
  /* ---------------------------------------------------------------------- */

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
            result.message || "Failed to load staff."
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
          "STAFF RECIPIENT LOAD ERROR:",
          error
        );

        if (!cancelled) {
          setStaffList([]);

          showErrorToast(
            error.message ||
            "Unable to load staff recipients."
          );
        }
      } finally {
        if (!cancelled) {
          setStaffLoading(false);
        }
      }
    };

    loadStaff();

    return () => {
      cancelled = true;
    };
  }, [emailDialogOpen]);

  /* ---------------------------------------------------------------------- */
  /*                              EMAIL DIALOG                               */
  /* ---------------------------------------------------------------------- */

  const handleOpenEmailDialog = useCallback(() => {
    setSelectedRecipientEmails([]);
    setAttachExcel(true);

    setEmailSubject("Item Rate Report");

    setEmailMessage(
      [
        "Dear Team,",
        "",
        "Please find the Item Rate report for your review.",
        "",
        "The report includes item group, item name, brand/manufacturer, item condition, applicable dates, rate, unit, comments, and creation and update details.",
        "",
        "Please review the information and let us know if any corrections are required.",
        "",
      ].join("\n")
    );

    setEmailDialogOpen(true);
  }, []);

  const handleSendEmail = async () => {
    if (selectedRecipientEmails.length === 0) {
      showErrorToast(
        "Please select at least one recipient."
      );
      return;
    }

    if (!emailSubject.trim() || !emailMessage.trim()) {
      showErrorToast(
        "Please enter the email subject and message."
      );
      return;
    }

    try {
      setEmailSending(true);

      const response = await fetch(
        "/api/inventory/item-rate/email-report",
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
              createdFrom,
              createdTo,
              updatedFrom,
              updatedTo,
              groupIds: selectedGroupIds,
              createdBy,
              updatedBy,
            },
          }),
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(
          result.error ||
          result.message ||
          "Failed to send email."
        );
      }

      showSuccessToast(
        attachExcel
          ? "Email sent successfully with the Excel attachment."
          : "Email sent successfully."
      );

      setEmailDialogOpen(false);
    } catch (error) {
      console.error("ITEM RATE EMAIL ERROR:", error);

      showErrorToast(
        error instanceof Error
          ? error.message
          : "Unable to send email."
      );
    } finally {
      setEmailSending(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /*                         HEADER BUTTON EVENTS                            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const handleHeaderButtonClick = (event) => {
      const button = event.target.closest(
        "#Print, #Email, #Export"
      );

      if (!button) return;

      event.preventDefault();

      switch (button.id) {
        case "Print":
          handlePrintItemRates();
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

    document.addEventListener(
      "click",
      handleHeaderButtonClick
    );

    return () => {
      document.removeEventListener(
        "click",
        handleHeaderButtonClick
      );
    };
  }, [
    handlePrintItemRates,
    handleOpenEmailDialog,
    handleExportExcel,
  ]);

  /* ---------------------------------------------------------------------- */
  /*                            ONLINE / OFFLINE                             */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);

      await checkDbStatus();
      await syncInventoryItemRates();
      await refreshItemRates();
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
    syncInventoryItemRates,
    refreshItemRates,
  ]);

  useEffect(() => {
    checkDbStatus();

    const interval = setInterval(
      checkDbStatus,
      30000
    );

    return () => clearInterval(interval);
  }, [checkDbStatus]);

  /* ---------------------------------------------------------------------- */
  /*                                COLUMNS                                  */
  /* ---------------------------------------------------------------------- */

  const columns = useMemo(
    () => [
      {
        id: "select",

        header: () => (
          <Checkbox
            aria-label="Select all Item Rates"
            checked={allCurrentPageSelected}
            onCheckedChange={toggleCurrentPageSelection}
            disabled={
              !itemRates.length || bulkLoading
            }
          />
        ),

        cell: ({ row }) => {
          const item = row.original;
          const id = String(item.id);

          return (
            <Checkbox
              aria-label={`Select Item Rate ${id}`}
              checked={selectedIds.includes(id)}
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

        cell: ({ row }) => {
          const id = String(row.original.id || "-");

          return (
            <span>
              #{id.length > 8 ? id.substring(0, 8) : id}
            </span>
          );
        },

        size: 100,
        enableHiding: false,
      },

      {
        accessorKey: "ItemGroupid",
        id: "ItemGroupid",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Item Group"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span>{getGroupName(row.original)}</span>
        ),

        size: 170,
      },

      {
        accessorKey: "ItemMasterid",
        id: "ItemMasterid",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Item Name"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.ItemMasterName}
          </span>
        ),

        size: 200,
      },

      {
        accessorKey: "BrandManufacturerid",
        id: "BrandManufacturerid",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Brand / Manufacturer"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span>{row.original.BrandManufacturerName}</span>
        ),

        size: 200,
      },

      {
        accessorKey: "ItemConditionid",
        id: "ItemConditionid",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Item Condition"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span>{row.original.ItemConditionName}</span>
        ),

        size: 170,
      },

      {
        accessorKey: "ApplicableFromDate",
        id: "ApplicableFromDate",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Applicable From"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          formatDate(row.original.ApplicableFromDate),

        size: 150,
      },

      {
        accessorKey: "ApplicableToDate",
        id: "ApplicableToDate",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Applicable To"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          formatDate(row.original.ApplicableToDate),

        size: 150,
      },

      {
        accessorKey: "Rate",
        id: "Rate",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Rate (₹)"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {formatRate(row.original.Rate)}
          </span>
        ),

        size: 130,
      },

      {
        accessorKey: "Unitid",
        id: "Unitid",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Unit"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span>{getUnitName(row.original)}</span>
        ),

        size: 150,
      },

      {
        accessorKey: "Comments",
        id: "Comments",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Comments"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="block max-w-[300px] truncate">
            {row.original.Comments || "-"}
          </span>
        ),

        size: 250,
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
          formatDate(row.original.createdAt),

        size: 150,
      },

      {
        accessorKey: "createby",
        id: "createby",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Created By"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span>{getCreatedBy(row.original)}</span>
        ),

        size: 160,
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
          formatDate(row.original.updatedAt),

        size: 150,
      },

      {
        accessorKey: "updateby",
        id: "updateby",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Updated By"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span>{getUpdatedBy(row.original)}</span>
        ),

        size: 160,
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
                  className="h-7 w-7"
                  aria-label={`Actions for Item Rate ${item.id}`}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side="bottom"
                align="end"
              >
                {canView && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedItemRate(item);
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
                      setSelectedItemRate(item);
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
                      variant="destructive"
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
        enableHiding: false,
      },
    ],
    [
      allCurrentPageSelected,
      itemRates.length,
      selectedIds,
      bulkLoading,
      toggleCurrentPageSelection,
      toggleRowSelection,
      canView,
      canEdit,
      canDelete,
      handleDelete,
    ]
  );

  /* ---------------------------------------------------------------------- */
  /*                              TABLE INSTANCE                             */
  /* ---------------------------------------------------------------------- */

  const table = useReactTable({
    columns,
    data: itemRates,

    pageCount: Math.ceil(
      totalRecords / pagination.pageSize
    ),

    getRowId: (row) => String(row.id),

    state: {
      pagination,
      sorting,
    },
    columnResizeMode: 'onChange',
    onPaginationChange: setPagination,
    onSortingChange: setSorting,

    getCoreRowModel: getCoreRowModel(),

    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  /* ---------------------------------------------------------------------- */
  /*                                TOOLBAR                                  */
  /* ---------------------------------------------------------------------- */

  const renderToolbar = () => {
    const hasActiveFilters =
      !!searchInput ||
      !!searchQuery ||
      !!createdFrom ||
      !!createdTo ||
      !!updatedFrom ||
      !!updatedTo ||
      !!createdBy ||
      !!updatedBy ||
      selectedGroupIds.length > 0;

    return (
      <CardHeader className="flex-col flex-wrap items-stretch gap-3 py-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-[250px] sm:flex-none">
              <form
                onSubmit={handleSearch}
                className="flex w-full"
              >
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  type="text"
                  placeholder="Search Item Rate"
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
                    aria-label="Clear search"
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
                <p>Search by item name, item group, brand,manufacturer, condition, unit, or comments.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {selectedIds.length > 0 && canDelete && (
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
                      char.toUpperCase()
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
              Add Item Rate
            </Button>
          )}

          <StoreClientFiltersSheet
            trigger={
              <Button type="button" variant="outline">
                <Funnel className="mr-2 size-4" />
                Filter
              </Button>
            }
            selectedGroupIds={selectedGroupIds}
            setSelectedGroupIds={setSelectedGroupIds}
            createdFrom={createdFrom}
            setCreatedFrom={setCreatedFrom}
            createdTo={createdTo}
            setCreatedTo={setCreatedTo}
            updatedFrom={updatedFrom}
            setUpdatedFrom={setUpdatedFrom}
            updatedTo={updatedTo}
            setUpdatedTo={setUpdatedTo}
            createdBy={createdBy}
            setCreatedBy={setCreatedBy}
            updatedBy={updatedBy}
            setUpdatedBy={setUpdatedBy}
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            handleSearch={handleSearch}
            setPagination={setPagination}
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
  };

  /* ---------------------------------------------------------------------- */
  /*                              ACCESS DENIED                              */
  /* ---------------------------------------------------------------------- */

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">
              Access Denied
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view Item Rates.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  /* ---------------------------------------------------------------------- */
  /*                                  RENDER                                 */
  /* ---------------------------------------------------------------------- */

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

      {/* ADD ITEM RATE */}
      <ItemRateAddDialog
        open={addDialogOpen}
        closeDialog={() => setAddDialogOpen(false)}
        onSuccess={async (item) => {
          setAddDialogOpen(false);

          const itemName = getItemRateName(item);

          await createItemRateNotification({
            action: "created",
            title: "Item Rate Created",
            message: `${itemName} rate was created successfully.`,
            itemRateId: item?.id || null,
            itemRateName: itemName,
          });

          showSuccessToast(
            `${itemName} rate created successfully.`
          );

          await refreshItemRates();
          await syncInventoryItemRates();
        }}
      />

      {/* EDIT ITEM RATE */}
      {selectedItemRate && editDialogOpen && (
        <ItemRateEditDialog
          open={editDialogOpen}
          ItemRate={selectedItemRate}
          closeDialog={() => {
            setEditDialogOpen(false);
            setSelectedItemRate(null);
          }}
          onSuccess={async (item) => {
            const itemForNotification =
              item || selectedItemRate;

            const itemName =
              getItemRateName(itemForNotification);

            setEditDialogOpen(false);
            setSelectedItemRate(null);

            await createItemRateNotification({
              action: "updated",
              title: "Item Rate Updated",
              message: `${itemName} rate was updated successfully.`,
              itemRateId:
                itemForNotification?.id || null,
              itemRateName: itemName,
            });

            showSuccessToast(
              `${itemName} rate updated successfully.`
            );

            await refreshItemRates();
            await syncInventoryItemRates();
          }}
        />
      )}

      {/* VIEW ITEM RATE */}
      {selectedItemRate && viewDialogOpen && (
        <ItemRateViewDialog
          open={viewDialogOpen}
          ItemRate={selectedItemRate}
          closeDialog={() => {
            setViewDialogOpen(false);
            setSelectedItemRate(null);
          }}
        />
      )}

      {/* DELETE ITEM RATE */}
      {selectedItemRate && deleteDialogOpen && (
        <ItemRateDeleteDialog
          open={deleteDialogOpen}
          ItemRate={selectedItemRate}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          closeDialog={() => {
            setDeleteDialogOpen(false);
            setSelectedItemRate(null);
          }}
        />
      )}

      {/* EMAIL ITEM RATE REPORT */}
      <Dialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
      >
        <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:w-[90vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px]">
          <form
            className="flex h-full max-h-[90vh] flex-col overflow-hidden"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSendEmail();
            }}
          >
            <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
              <DialogTitle>
                Email Item Rate Report
              </DialogTitle>

              <DialogDescription>
                Select recipients and send the Item Rate report.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex h-full max-h-[90vh] min-h-0 flex-col overflow-hidden">
              <DialogBody className="min-h-0 space-y-6 px-6">
                {/* RECIPIENT COUNT */}
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium">
                    Recipient Email
                  </label>

                  <span className="text-xs text-muted-foreground">
                    {selectedRecipientEmails.length} of{" "}
                    {staffList.length} selected
                  </span>
                </div>

                {/* SELECTED RECIPIENTS */}
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
                                setSelectedRecipientEmails(
                                  (previous) =>
                                    previous.filter(
                                      (item) => item !== email
                                    )
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

                {/* STAFF SELECTION */}
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
                                      (person) => person.email
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

                  <ScrollArea className="flex max-h-[250px] flex-col overflow-hidden">
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

                {/* SUBJECT */}
                <div className="space-y-2">
                  <label
                    htmlFor="item-rate-email-subject"
                    className="text-sm font-medium"
                  >
                    Subject
                  </label>

                  <Input
                    id="item-rate-email-subject"
                    required
                    value={emailSubject}
                    onChange={(event) =>
                      setEmailSubject(event.target.value)
                    }
                    placeholder="Item Rate Report"
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
                        Attach the Item Rate report as an Excel file (.xlsx).
                      </span>
                    </span>

                    <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                  </label>
                </div>

                {/* MESSAGE */}
                <div className="space-y-2">
                  <label
                    htmlFor="item-rate-email-message"
                    className="text-sm font-medium"
                  >
                    Message
                  </label>

                  <Textarea
                    id="item-rate-email-message"
                    required
                    rows={6}
                    value={emailMessage}
                    onChange={(event) =>
                      setEmailMessage(event.target.value)
                    }
                    placeholder="Enter your email message..."
                    className="min-h-[150px] resize-y"
                  />

                  <p className="text-xs text-muted-foreground">
                    Enter the message to include in the email.
                  </p>
                </div>
              </DialogBody>

              <DialogFooter className="gap-2 px-6 pb-4 pt-2">
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

      {/* BULK DELETE CONFIRMATION */}
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
                {selectedIds.length} selected Item Rate
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
              disabled={
                bulkLoading || selectedIds.length === 0
              }
              onClick={handleConfirmBulkDelete}
            >
              <Trash2 className="mr-2 size-4" />

              {bulkLoading
                ? "Deleting..."
                : "Delete Selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}