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
  Info,
  X,
  FileSpreadsheet,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
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
} from '@/components/ui/tooltip';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";


import ItemMasterAddDialog from "./item-master-add-dialog";
import ItemMasterEditDialog from "./item-master-edit-dialog";
import ItemMasterViewDialog from "./item-master-view-dialog";
import ItemMasterDeleteDialog from "./item-master-delete-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";
import ItemMastersActiveDialog from "./item-masters-active-dialog";
import ItemMastersInactiveDialog from "./item-masters-inactive-dialog";
import ItemMastersDeleteDialog from "./item-masters-delete-dialog";

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
    { position: "top-center" },
  );
};

const showErrorToast = (message) => {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close={true}
        onClose={() => toast.dismiss(t)}
      >
        <AlertIcon>
          <RiErrorWarningFill />
        </AlertIcon>
        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    { position: "top-center" },
  );
};

const createItemMasterNotification = async ({
  action,
  title,
  message,
  itemMasterId = null,
  itemMasterName = null,
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
          itemMasterId !== null && itemMasterId !== undefined
            ? String(itemMasterId)
            : null,
        entityType: "item_master",
        entityName: itemMasterName || "Item",
        url: "/inventory/item_master",
      }),
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Failed to create notification.");
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
    console.error("ITEM MASTER NOTIFICATION ERROR", error);
    return null;
  }
};

export default function ItemMasterList() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const userPermissions = useMemo(
    () => session?.user?.permissions || [],
    [session],
  );

  const canView = can("item_master.view", userPermissions);
  const canManage = can("item_master.manage", userPermissions);
  const canEdit = can("item_master.edit", userPermissions);
  const canDelete = can("item_master.delete", userPermissions);

  // TABLE STATE
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = useState([{ id: "createdAt", desc: true }]);

  // SEARCH AND FILTERS
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");

  const [createdBy, setCreatedBy] = useState("");
  const [updatedBy, setUpdatedBy] = useState("");

  const [restockLevelMin, setRestockLevelMin] = useState("");
  const [restockLevelMax, setRestockLevelMax] = useState("");

  const [closingBalanceFrom, setClosingBalanceFrom] = useState("");
  const [closingBalanceTo, setClosingBalanceTo] = useState("");
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
  const [selectedItemMaster, setSelectedItemMaster] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // COPY DIALOG
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceItem, setCopySourceItem] = useState(null);
  const [copyItemName, setCopyItemName] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);

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
  const [activeDialogOpen, setActiveDialogOpen] = useState(false);
  const [inactiveDialogOpen, setInactiveDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const [selectedGroupNames, setSelectedGroupNames] = useState([]);
  const [groupNames, setGroupNames] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [restockFilter, setRestockFilter] = useState("all");
  const [groupFilterOpen, setGroupFilterOpen] = useState(false);

  const refreshItemMasters = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["item-master"] });
  }, [queryClient]);

  const syncInventoryItemMasters = useCallback(async () => {
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

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Inventory sync failed");
      }

      window.dispatchEvent(new CustomEvent("notifications-refresh"));
      return result;
    } catch (error) {
      console.error("ITEM MASTER SYNC ERROR", error);
      showErrorToast(error?.message || "Inventory sync failed");
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

  // Build the same filter params for the table and reports so both use
  // the currently selected filters.
  const buildListParams = useCallback(
    ({ page, limit }) => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        query: searchQuery,
        status: statusFilter,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        sort: sorting?.[0]?.id || "createdAt",
        dir: sorting?.[0]?.desc ? "desc" : "asc",
        applicableForRestockLevel: restockFilter,
      });

      if (selectedGroupIds.length > 0) {
        params.set("groupIds", selectedGroupIds.join(","));
      }

      // Created By / Updated By
      if (createdBy.trim()) {
        params.set("createdBy", createdBy.trim());
      }

      if (updatedBy.trim()) {
        params.set("updatedBy", updatedBy.trim());
      }

      // Restock Level Range
      if (restockLevelMin !== "") {
        params.set("restockLevelMin", restockLevelMin);
      }

      if (restockLevelMax !== "") {
        params.set("restockLevelMax", restockLevelMax);
      }

      // Closing Balance Range
      if (closingBalanceFrom !== "") {
        params.set("closingBalanceFrom", closingBalanceFrom);
      }

      if (closingBalanceTo !== "") {
        params.set("closingBalanceTo", closingBalanceTo);
      }

      return params;
    },
    [
      searchQuery,
      statusFilter,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      sorting,
      selectedGroupIds,
      restockFilter,
      createdBy,
      updatedBy,
      restockLevelMin,
      restockLevelMax,
      closingBalanceFrom,
      closingBalanceTo,
    ],
  );

  const fetchItemMasters = useCallback(async () => {
    const params = buildListParams({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
    });

    const response = await apiFetch(
      `/api/inventory/item-master?${params.toString()}`,
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(result?.message || "Failed to load Item Master.");
    }

    return result;
  }, [buildListParams, pagination]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "item-master",
      pagination,
      sorting,
      searchQuery,
      statusFilter,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      selectedGroupIds,
      restockFilter,
      createdBy,
      updatedBy,
      restockLevelMin,
      restockLevelMax,
      closingBalanceFrom,
      closingBalanceTo,
    ],
    queryFn: fetchItemMasters,
    staleTime: 0,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
    placeholderData: keepPreviousData,
  });

  const itemMasters = useMemo(() => data?.data || [], [data]);
  const totalRecords = Number(data?.pagination?.total || 0);

  const currentPageIds = useMemo(
    () => itemMasters.map((item) => String(item.id)),
    [itemMasters],
  );

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.includes(id));

  const getItemMasterReportRows = useCallback(async () => {
    // Use selected rows when any are selected.
    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds.map(String));
      return itemMasters.filter((item) => selectedSet.has(String(item.id)));
    }

    // Otherwise fetch all records matching the current filters.
    const params = buildListParams({ page: 1, limit: 10000 });

    const response = await apiFetch(
      `/api/inventory/item-master?${params.toString()}`,
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(result?.message || "Failed to load items");
    }

    return result.data || [];
  }, [selectedIds, itemMasters, buildListParams]);

  const buildItemMasterExcel = useCallback((items) => {
    const rows = items.map((item) => ({
      ID: item.id,
      "Item Name": item.ItemName || "",
      Description: item.Description || "",
      Rate: item.rather ?? "",
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
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Item Master");

    return workbook;
  }, []);

  const handleExportExcel = useCallback(async () => {
    try {
      toast.loading("Preparing Excel export...", { id: "item-master-export" });

      const items = await getItemMasterReportRows();

      if (!items.length) {
        toast.dismiss("item-master-export");
        showErrorToast("No items to export");
        return;
      }

      XLSX.writeFile(buildItemMasterExcel(items), "item-master.xlsx");

      toast.dismiss("item-master-export");
      showSuccessToast(`${items.length} item(s) exported`);
    } catch (error) {
      console.error("ITEM MASTER EXPORT ERROR", error);
      toast.dismiss("item-master-export");
      showErrorToast(error.message || "Excel export failed");
    }
  }, [getItemMasterReportRows, buildItemMasterExcel]);

  const handlePrintItemMasters = useCallback(async () => {
    // Open the window first so the browser does not block it as a pop-up.
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      showErrorToast("Please allow pop-ups to print the report");
      return;
    }

    printWindow.document.write(
      "<p style='font-family:Arial;padding:24px'>Preparing report...</p>",
    );

    try {
      const items = await getItemMasterReportRows();

      if (!items.length) {
        printWindow.close();
        showErrorToast("No items to print");
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
        <td>${escapeHtml(item.ItemName)}</td>
        <td>${escapeHtml(item.Description || "-")}</td>
        <td>${escapeHtml(item.rather ?? "-")}</td>
        <td>${item.status ? "Active" : "Inactive"}</td>
        <td>${item.isDefault ? "Yes" : "No"}</td>
        <td>${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-")}</td>
        <td>${escapeHtml(item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "-")}</td>
      </tr>`,
        )
        .join("");

      printWindow.document.open();
      printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Item Master Report</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
            h1 { font-size: 22px; margin-bottom: 6px; }
            p { color: #555; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 11px; }
            th { background: #f2f2f2; }
            tr { break-inside: avoid; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>Item Master Report</h1>
          <p>Generated: ${escapeHtml(new Date().toLocaleString())}</p>
          <p>Total records: ${items.length}</p>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Item Name</th><th>Description</th><th>Rate</th>
                <th>Status</th><th>Default</th><th>Added Date</th><th>Updated Date</th>
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
      console.error("ITEM MASTER PRINT ERROR", error);
      showErrorToast(error.message || "Unable to prepare print report");
    }
  }, [getItemMasterReportRows]);

  // Clear selected rows when the result set or page changes.
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
    selectedGroupNames,
    restockFilter,
    createdBy,
    updatedBy,
    restockLevelMin,
    restockLevelMax,
    closingBalanceFrom,
    closingBalanceTo,
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
    setStatusFilter("all");
    setCreatedFrom("");
    setCreatedTo("");
    setUpdatedFrom("");
    setUpdatedTo("");
    setSelectedGroupNames([]);
    setRestockFilter("all");
    setGroupFilterOpen(false);
    setSelectedIds([]);
    setCreatedBy("");
    setUpdatedBy("");
    setRestockLevelMin("");
    setRestockLevelMax("");
    setClosingBalanceFrom("");
    setClosingBalanceTo("");
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  const handleDelete = useCallback((item) => {
    setSelectedItemMaster(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedItemMaster?.id) return;

    const itemToDelete = selectedItemMaster;

    try {
      setDeleteLoading(true);

      const response = await apiFetch("/api/inventory/item-master", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemToDelete.id }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Delete failed");
      }

      await createItemMasterNotification({
        action: "deleted",
        title: "Item Deleted",
        message: itemToDelete?.ItemName
          ? `Item "${itemToDelete.ItemName}" was deleted successfully.`
          : "An item was deleted successfully.",
        itemMasterId: itemToDelete.id,
        itemMasterName: itemToDelete.ItemName || "Item",
      });

      showSuccessToast(
        itemToDelete?.ItemName
          ? `Item "${itemToDelete.ItemName}" deleted successfully`
          : "Item deleted successfully",
      );

      setDeleteDialogOpen(false);
      setSelectedIds((prev) => prev.filter((id) => id !== String(itemToDelete.id)));
      setSelectedItemMaster(null);

      await refreshItemMasters();
      await syncInventoryItemMasters();
    } catch (error) {
      console.error("DELETE ITEM MASTER ERROR", error);
      showErrorToast(
        error?.message || "Something went wrong while deleting the item.",
      );
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedItemMaster, refreshItemMasters, syncInventoryItemMasters]);

  const loadGroupNames = useCallback(async () => {
    try {
      const response = await apiFetch(
        "/api/inventory/item-groups?limit=10000",
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Failed to load item groups");
      }

      const groupList = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result.data?.groups)
          ? result.data.groups
          : [];

      const uniqueGroups = [
        ...new Map(
          groupList
            .filter((group) => group.id && group.groupName?.trim())
            .map((group) => [
              group.id,
              {
                id: group.id,
                groupName: group.groupName.trim(),
              },
            ]),
        ).values(),
      ].sort((a, b) => a.groupName.localeCompare(b.groupName));

      setGroups(uniqueGroups);
    } catch (error) {
      console.error("LOAD GROUP NAMES ERROR:", error);
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    loadGroupNames();
  }, [loadGroupNames]);

  const getExistingItemNames = useCallback(async () => {
    const params = new URLSearchParams({
      page: "1",
      limit: "10000",
      sort: "createdAt",
      dir: "desc",
    });

    const response = await apiFetch(
      `/api/inventory/item-master?${params.toString()}`,
    );
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(result?.message || "Unable to check existing item names.");
    }

    return new Set(
      (result.data || []).map((item) =>
        String(item.ItemName || "").trim().toLowerCase(),
      ),
    );
  }, []);

  const handleCopyItemMaster = useCallback(
    async (item) => {
      try {
        const originalName = String(item.ItemName || "").trim();

        if (!originalName) {
          showErrorToast("The original item name is empty.");
          return;
        }

        const existingNames = await getExistingItemNames();

        let copiedName = `${originalName} (Copy)`;
        let counter = 2;

        while (existingNames.has(copiedName.toLowerCase())) {
          copiedName = `${originalName} (Copy ${counter})`;
          counter += 1;
        }

        setCopySourceItem(item);
        setCopyItemName(copiedName);
        setCopyDialogOpen(true);
      } catch (error) {
        console.error("OPEN COPY DIALOG ERROR", error);
        showErrorToast(error.message || "Unable to open copy dialog.");
      }
    },
    [getExistingItemNames],
  );

  const handleConfirmCopyItemMaster = useCallback(async () => {
    if (!copySourceItem?.id) {
      showErrorToast("Please select an item to copy.");
      return;
    }

    const finalName = copyItemName.trim();

    if (!finalName) {
      showErrorToast("Please enter an item name.");
      return;
    }

    try {
      setCopyLoading(true);

      // Recheck for duplicates before submitting.
      const existingNames = await getExistingItemNames();

      if (existingNames.has(finalName.toLowerCase())) {
        showErrorToast("This item name already exists. Please use another name.");
        return;
      }

      // Copy every field except identity and audit fields.
      // eslint-disable-next-line no-unused-vars
      const { id, createdAt, updatedAt, ...fieldsToCopy } = copySourceItem;

      const response = await apiFetch("/api/inventory/item-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fieldsToCopy,
          ItemName: finalName,
          status: Boolean(copySourceItem.status),
          isDefault: false,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Failed to copy item.");
      }

      showSuccessToast(`Item "${finalName}" copied successfully`);

      await createItemMasterNotification({
        action: "created",
        title: "Item Copied",
        message: `${finalName} was copied from ${copySourceItem.ItemName}.`,
        itemMasterId: result.data?.id,
        itemMasterName: finalName,
      });

      setCopyDialogOpen(false);
      setCopySourceItem(null);
      setCopyItemName("");

      await refreshItemMasters();
      await syncInventoryItemMasters();
    } catch (error) {
      console.error("ITEM MASTER COPY ERROR", error);
      showErrorToast(error.message || "Copy failed.");
    } finally {
      setCopyLoading(false);
    }
  }, [
    copySourceItem,
    copyItemName,
    getExistingItemNames,
    refreshItemMasters,
    syncInventoryItemMasters,
  ]);

  const handleToggleItemMasterStatus = useCallback(
    async (item) => {
      const nextStatus = !Boolean(item.status);

      try {
        const response = await apiFetch("/api/inventory/item-master", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, status: nextStatus }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(result?.message || "Status update failed");
        }

        showSuccessToast(
          `${item.ItemName} marked ${nextStatus ? "active" : "inactive"}`,
        );
        await refreshItemMasters();
        await syncInventoryItemMasters();
      } catch (error) {
        console.error("ITEM MASTER STATUS ERROR", error);
        showErrorToast(error.message || "Status update failed");
      }
    },
    [refreshItemMasters, syncInventoryItemMasters],
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
        showErrorToast("Select at least one item");
        return;
      }

      if (!(canManage || canEdit)) {
        showErrorToast("You do not have permission to change item status");
        return;
      }

      const idsToUpdate = [...selectedIds];

      try {
        setBulkLoading(true);

        const response = await apiFetch("/api/inventory/item-master", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: idsToUpdate, status }),
        });

        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result.success) {
          throw new Error(
            result?.message ||
            "Bulk status update failed. Your API route must support ids.",
          );
        }

        showSuccessToast(
          `${result.count ?? idsToUpdate.length} item(s) marked ${status ? "active" : "inactive"
          }`,
        );
        setActiveDialogOpen(false);
        setInactiveDialogOpen(false);
        setSelectedIds([]);
        await refreshItemMasters();
        await syncInventoryItemMasters();
      } catch (error) {
        console.error("BULK STATUS ERROR", error);
        showErrorToast(error.message || "Bulk status update failed");
      } finally {
        setBulkLoading(false);
      }
    },
    [
      selectedIds,
      canManage,
      canEdit,
      refreshItemMasters,
      syncInventoryItemMasters,
    ],
  );

  const handleBulkDelete = useCallback(() => {
    if (!selectedIds.length) {
      showErrorToast("Select at least one item");
      return;
    }

    if (!canDelete) {
      showErrorToast("You do not have permission to delete items");
      return;
    }

    setShowDeleteDialog(true);
  }, [selectedIds, canDelete]);

  const handleConfirmBulkDelete = useCallback(async () => {
    if (!selectedIds.length || bulkLoading) return;

    const idsToDelete = [...selectedIds];

    try {
      setBulkLoading(true);

      const response = await apiFetch("/api/inventory/item-master", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message ||
          "Bulk delete failed. Your API route must support ids.",
        );
      }

      showSuccessToast(`${result.count ?? idsToDelete.length} item(s) deleted`);

      setShowDeleteDialog(false);
      setBulkDeleteDialogOpen(false);
      setSelectedIds([]);

      await refreshItemMasters();
      await syncInventoryItemMasters();
    } catch (error) {
      console.error("BULK DELETE ERROR", error);
      showErrorToast(error.message || "Bulk delete failed");
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, bulkLoading, refreshItemMasters, syncInventoryItemMasters]);

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
          showErrorToast(error.message || "Unable to load staff recipients");
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
    setEmailSubject("Item Master Report");

    setEmailMessage(
      [
        "Dear Team,",
        "",
        "Please find the Item Master report for your review.",
        "",
        "The report includes the item name, description, rate, status, default setting, and creation and update dates.",
        "",
        "Please review the information and let us know if any corrections are required.",
        "",
      ].join("\n"),
    );

    setEmailDialogOpen(true);
  }, []);
  useEffect(() => {
    const handleHeaderButtonClick = (event) => {
      const button = event.target.closest("#Print, #Email, #Export");

      if (!button) return;

      event.preventDefault();

      switch (button.id) {
        case "Print":
          handlePrintItemMasters();
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
  }, [handlePrintItemMasters, handleOpenEmailDialog, handleExportExcel]);
  const handleSendEmail = async () => {
    if (selectedRecipientEmails.length === 0) {
      showErrorToast("Please select at least one recipient.");
      return;
    }

    if (!emailSubject.trim() || !emailMessage.trim()) {
      showErrorToast("Please enter the email subject and message.");
      return;
    }

    try {
      setEmailSending(true);

      const response = await fetch("/api/inventory/item-master/email-report", {
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

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Failed to send email.");
      }

      showSuccessToast(
        attachExcel
          ? "Email sent successfully with the Excel attachment."
          : "Email sent successfully.",
      );

      setEmailDialogOpen(false);
    } catch (error) {
      console.error("Email report error:", error);
      showErrorToast(
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
      await syncInventoryItemMasters();
      await refreshItemMasters();
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
  }, [checkDbStatus, syncInventoryItemMasters, refreshItemMasters]);

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
            disabled={!itemMasters.length || bulkLoading}
          />
        ),
        cell: ({ row }) => {
          const item = row.original;
          const id = String(item.id);

          return (
            <Checkbox
              aria-label={`Select ${item.ItemName}`}
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
        cell: ({ row }) => {
          const id = row.original.id;
          const displayId = id !== null && id !== undefined ? String(id) : "-";

          return (
            <span className="font-medium">
              #{displayId.length > 8 ? displayId.substring(0, 8) : displayId}
            </span>
          );
        },
        size: 100,
        enableSorting: true,
        enableHiding: false,
        meta: {
          headerTitle: "ID",
          skeleton: <Skeleton className="h-7 w-12" />,
        },
      },
      {
        accessorKey: "ItemName",
        id: "ItemName",
        header: ({ column }) => (
          <DataGridColumnHeader title="Item Name" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.ItemName || "-"}</span>
        ),
        size: 240,
        enableSorting: true,
        enableHiding: false,
        meta: {
          headerTitle: "Item Name",
          skeleton: <Skeleton className="h-7 w-40" />,
        },
      },
      {
        accessorKey: "Unitid",
        id: "Unitid",
        header: ({ column }) => (
          <DataGridColumnHeader title="Unit Measure" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span>{row.original?.UnitName || row.original?.unitName || "-"}</span>
        ),
        size: 150,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Unit Measure",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },
      {
        accessorKey: "groupName",
        id: "groupName",
        header: ({ column }) => (
          <DataGridColumnHeader title="Group Name" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span>{row.original.GroupName || row.original?.GroupName || "-"}</span>
        ),
        size: 160,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Group Name",
          skeleton: <Skeleton className="h-7 w-28" />,
        },
      },
      {
        accessorKey: "openingBalance",
        id: "openingBalance",
        header: ({ column }) => (
          <DataGridColumnHeader title="Opening Balance" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span>{row.original.openingBalance ?? 0}</span>
        ),
        size: 150,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Opening Balance",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },
      {
        accessorKey: "ApplicableForRelocateLevel",
        id: "ApplicableForRelocateLevel",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Applicable for Restock"
            column={column}
            visibility
          />
        ),
        cell: ({ row }) => (
          <span>
            {row.original.ApplicableForRelocateLevel ? "Yes" : "No"}
          </span>
        ),
        size: 180,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Applicable for Restock",
          skeleton: <Skeleton className="h-7 w-20" />,
        },
      },
      {
        accessorKey: "RelocateLevel",
        id: "RelocateLevel",
        header: ({ column }) => (
          <DataGridColumnHeader title="Restock Level" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span>
            {row.original.ApplicableForRelocateLevel
              ? row.original.RelocateLevel ?? "-"
              : "-"}
          </span>
        ),
        size: 140,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Restock Level",
          skeleton: <Skeleton className="h-7 w-20" />,
        },
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
            {row.original.Description || "-"}
          </span>
        ),
        size: 300,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Description",
          skeleton: <Skeleton className="h-7 w-48" />,
        },
      },
      {
        accessorKey: "rather",
        id: "rather",
        header: ({ column }) => (
          <DataGridColumnHeader title="Rate" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.rather ?? "-"}</span>
        ),
        size: 120,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Rate (₹)",
          skeleton: <Skeleton className="h-7 w-16" />,
        },
      },
      {
        accessorKey: "isDefault",
        id: "isDefault",
        header: ({ column }) => (
          <DataGridColumnHeader title="Default" column={column} visibility />
        ),
        cell: ({ row }) => <span>{row.original.isDefault ? "Yes" : "No"}</span>,
        size: 100,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Default",
          skeleton: <Skeleton className="h-7 w-16" />,
        },
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
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Status",
          skeleton: <Skeleton className="h-7 w-20" />,
        },
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
        enableHiding: true,
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
        enableHiding: true,
        meta: {
          headerTitle: "Updated Date",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },
      {
        accessorKey: "createdBy",
        id: "createdBy",
        header: ({ column }) => (
          <DataGridColumnHeader title="Created By" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span>{row.original.CreatedByName || row.original.createdBy?.username || row.original.createdBy || "-"}</span>
        ),
        size: 160,
        enableSorting: true,
        enableHiding: true,
        meta: {
          headerTitle: "Created By",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },
      {
        accessorKey: "updatedBy",
        id: "updatedBy",
        header: ({ column }) => (
          <DataGridColumnHeader title="Updated By" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span>{row.original.UpdatedByName || row.original.updatedBy?.username || row.original.updatedBy || "-"}</span>
        ),
        size: 160,
        enableSorting: true,
        enableHiding: true,
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
                  className="h-7 w-7"
                  aria-label={`Actions for ${item.ItemName}`}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="bottom" align="end">
                {canView && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedItemMaster(item);
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
                      setSelectedItemMaster(item);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                )}

                {(canManage || canEdit) && (
                  <DropdownMenuItem onClick={() => handleCopyItemMaster(item)}>
                    <Copy className="mr-2 size-4" />
                    Copy
                  </DropdownMenuItem>
                )}

                {(canManage || canEdit) && (
                  <DropdownMenuItem
                    onClick={() => handleToggleItemMasterStatus(item)}
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
        enableResizing: false,
        enableHiding: false,
        meta: {
          skeleton: <Skeleton className="size-5" />,
        },
      },
    ],
    [
      allCurrentPageSelected,
      itemMasters.length,
      selectedIds,
      bulkLoading,
      toggleCurrentPageSelection,
      toggleRowSelection,
      canView,
      canEdit,
      canManage,
      canDelete,
      handleDelete,
      handleCopyItemMaster,
      handleToggleItemMasterStatus,
    ],
  );
  const table = useReactTable({
    columns,
    data: itemMasters,
    pageCount: Math.ceil(totalRecords / pagination.pageSize),
    getRowId: (row) => String(row.id),
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
      !!searchInput ||
      !!searchQuery ||
      statusFilter !== "all" ||
      !!createdFrom ||
      !!createdTo ||
      !!updatedFrom ||
      !!updatedTo ||
      !!createdBy ||
      !!updatedBy ||
      restockLevelMin !== "" ||
      restockLevelMax !== "" ||
      closingBalanceFrom !== "" ||
      closingBalanceTo !== ""
    selectedGroupIds.length > 0 ||
      restockFilter !== "all";

    return (
      <CardHeader className="flex-col flex-wrap items-stretch gap-3 py-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="relative flex-1 sm:w-[250px] sm:flex-none">
              <form
              onSubmit={handleSearch}
              className="flex w-full flex-col gap-2 sm:flex-row xl:max-w-2xl"
            >
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="text"
                placeholder="Search item master"
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
                <p>Search by item name, group name, description, unit of measure.</p>
              </TooltipContent>
            </Tooltip>
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
              Add Item
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
            selectedGroupIds={selectedGroupIds}
            setSelectedGroupIds={setSelectedGroupIds}
            restockFilter={restockFilter}
            setRestockFilter={setRestockFilter}
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

            restockLevelMin={restockLevelMin}
            setRestockLevelMin={setRestockLevelMin}
            restockLevelMax={restockLevelMax}
            setRestockLevelMax={setRestockLevelMax}

            closingBalanceFrom={closingBalanceFrom}
            setClosingBalanceFrom={setClosingBalanceFrom}
            closingBalanceTo={closingBalanceTo}
            setClosingBalanceTo={setClosingBalanceTo}

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
              You do not have permission to view Item Master.
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

      {/* ADD ITEM */}
      <ItemMasterAddDialog
        open={addDialogOpen}
        closeDialog={() => setAddDialogOpen(false)}
        onSuccess={async (item) => {
          setAddDialogOpen(false);

          await createItemMasterNotification({
            action: "created",
            title: "Item Created",
            message: item?.ItemName
              ? `Item "${item.ItemName}" was created successfully.`
              : "A new item was created successfully.",
            itemMasterId: item?.id || null,
            itemMasterName: item?.ItemName || "Item",
          });

          showSuccessToast(
            item?.ItemName
              ? `Item "${item.ItemName}" created successfully`
              : "Item created successfully",
          );

          await refreshItemMasters();
          await syncInventoryItemMasters();
        }}
      />

      {/* EDIT ITEM */}
      {selectedItemMaster && editDialogOpen && (
        <ItemMasterEditDialog
          open={editDialogOpen}
          ItemMaster={selectedItemMaster}
          closeDialog={() => {
            setEditDialogOpen(false);
            setSelectedItemMaster(null);
          }}
          onSuccess={async (item) => {
            const itemForNotification = item || selectedItemMaster;

            setEditDialogOpen(false);
            setSelectedItemMaster(null);

            await createItemMasterNotification({
              action: "updated",
              title: "Item Updated",
              message: itemForNotification?.ItemName
                ? `Item "${itemForNotification.ItemName}" was updated successfully.`
                : "An item was updated successfully.",
              itemMasterId: itemForNotification?.id || null,
              itemMasterName: itemForNotification?.ItemName || "Item",
            });

            showSuccessToast(
              itemForNotification?.ItemName
                ? `Item "${itemForNotification.ItemName}" updated successfully`
                : "Item updated successfully",
            );

            await refreshItemMasters();
            await syncInventoryItemMasters();
          }}
        />
      )}

      {/* VIEW ITEM */}
      {selectedItemMaster && viewDialogOpen && (
        <ItemMasterViewDialog
          open={viewDialogOpen}
          ItemMaster={selectedItemMaster}
          closeDialog={() => {
            setViewDialogOpen(false);
            setSelectedItemMaster(null);
          }}
        />
      )}

      {/* DELETE ITEM */}
      {selectedItemMaster && deleteDialogOpen && (
        <ItemMasterDeleteDialog
          open={deleteDialogOpen}
          ItemMaster={selectedItemMaster}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          closeDialog={() => {
            setDeleteDialogOpen(false);
            setSelectedItemMaster(null);
          }}
        />
      )}

      {/* EMAIL DIALOG */}
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
              <DialogTitle>Email Item Master</DialogTitle>
              <DialogDescription>
                Select recipients and send the item master report.
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

      {/* COPY ITEM DIALOG */}
      <Dialog
        open={copyDialogOpen}
        onOpenChange={(open) => {
          if (copyLoading) return;

          setCopyDialogOpen(open);

          if (!open) {
            setCopySourceItem(null);
            setCopyItemName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Item</DialogTitle>
            <DialogDescription>
              Enter a unique name for the copied item. The suggested name can be
              changed before saving.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleConfirmCopyItemMaster();
            }}
          >
            <div className="space-y-2">
              <label htmlFor="copy-item-name" className="text-sm font-medium">
                Item Name <span className="text-destructive">*</span>
              </label>

              <Input
                id="copy-item-name"
                value={copyItemName}
                onChange={(event) => setCopyItemName(event.target.value)}
                placeholder="Enter item name"
                maxLength={150}
                required
                autoFocus
                disabled={copyLoading}
              />

              {copySourceItem && (
                <p className="text-xs text-muted-foreground">
                  Copying from: {copySourceItem.ItemName}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2">
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
                disabled={copyLoading || !copyItemName.trim()}
              >
                <Copy className="mr-2 size-4" />
                {copyLoading ? "Copying..." : "Copy Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                {selectedIds.length} selected item
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
      <ItemMastersActiveDialog
        open={activeDialogOpen}
        onOpenChange={setActiveDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={() => handleBulkStatus(true)}
      />

      <ItemMastersInactiveDialog
        open={inactiveDialogOpen}
        onOpenChange={setInactiveDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={() => handleBulkStatus(false)}
      />

      <ItemMastersDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={handleConfirmBulkDelete}
      />
    </>
  );
}