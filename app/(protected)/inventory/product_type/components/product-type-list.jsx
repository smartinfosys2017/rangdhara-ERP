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

import ProductTypeAddDialog from "./product-type-add-dialog";
import ProductTypeEditDialog from "./product-type-edit-dialog";
import ProductTypeViewDialog from "./product-type-view-dialog";
import ProductTypeDeleteDialog from "./product-type-delete-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";
import ProductTypesActiveDialog from "./product-types-active-dialog";
import ProductTypesInactiveDialog from "./product-types-inactive-dialog";
import ProductTypesDeleteDialog from "./product-types-delete-dialog";

const createProductTypeNotification = async ({
  action,
  title,
  message,
  ProductTypeId = null,
  ProductTypeName = null,
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
          ProductTypeId !== null && ProductTypeId !== undefined
            ? String(ProductTypeId)
            : null,
        entityType: "product_type",
        entityName: ProductTypeName || "Item Condition",
        url: "/inventory/product_type",
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
    console.error("Item Condition NOTIFICATION ERROR", error);
    return null;
  }
};

const getProductTypeName = (item) => item?.ProductType || "";

const isActiveStatus = (value) =>
  value === true || value === 1 || value === "1" || value === "true";

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

const ProductTypeList = () => {
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  const userPermissions = useMemo(
    () => session?.user?.permissions || [],
    [session],
  );

  const canView = can("product_type.view", userPermissions);
  const canManage = can("product_type.manage", userPermissions);
  const canEdit = can("product_type.edit", userPermissions);
  const canDelete = can("product_type.delete", userPermissions);

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

  const [selectedProductType, setSelectedProductType] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
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

  const refreshProductTypes = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["product-type"],
    });
  }, [queryClient]);

  const syncInventoryProductType = useCallback(async () => {
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
      console.error("Item Condition SYNC ERROR", error);
      toast.error(error.message || "Inventory sync failed");
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

  const fetchProductType = useCallback(async () => {
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
      `/api/inventory/product-type?${params.toString()}`,
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed loading Item Types");
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

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      "product-type",
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
    queryFn: fetchProductType,
    staleTime: 0,
  });

  const productTypes = data?.data || [];
  const totalRecords = Number(data?.pagination?.total || 0);

  const currentPageIds = useMemo(
    () => productTypes.map((item) => String(item.id)),
    [productTypes],
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
  ]);

  const handleSearch = useCallback(
    (event) => {
      event?.preventDefault();

      setPagination((previous) => ({
        ...previous,
        pageIndex: 0,
      }));

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
    setSelectedIds([]);

    setPagination((previous) => ({
      ...previous,
      pageIndex: 0,
    }));
  }, []);

  const getProductTypeReportRows = useCallback(async () => {
    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds.map(String));

      // The table contains only the current page. Fetch matching
      // records across all pages so selections on other pages work.
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
        `/api/inventory/product-type?${params.toString()}`,
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed loading report records");
      }

      return (result.data || []).filter((item) =>
        selectedSet.has(String(item.id)),
      );
    }

    const params = new URLSearchParams({
      page: "1",
      limit: "10000",
      query: searchQuery,
      status: statusFilter,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      sort: sorting?.[0]?.id || "createdAt",
      dir: sorting?.[0]?.desc ? "desc" : "asc",
    });

    const response = await apiFetch(
      `/api/inventory/product-type?${params.toString()}`,
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed loading report records");
    }

    return result.data || [];
  }, [
    selectedIds,
    searchQuery,
    statusFilter,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    sorting,
  ]);

  const buildProductTypeExcel = useCallback((items) => {
    const rows = items.map((item) => ({
      ID: item.id,
      "Item Condition": item.ProductType || "",
      Description: item.Description || "",
      Status: isActiveStatus(item.status) ? "Active" : "Inactive",
      "Created Date": item.createdAt
        ? new Date(item.createdAt).toLocaleString()
        : "",
      "Updated Date": item.updatedAt
        ? new Date(item.updatedAt).toLocaleString()
        : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 18 },
      { wch: 30 },
      { wch: 45 },
      { wch: 14 },
      { wch: 22 },
      { wch: 22 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Item Types");

    return workbook;
  }, []);

  const downloadProductTypeExcel = useCallback(
    (items, filename = "item-types.xlsx") => {
      if (!items.length) {
        toast.error("No item types to export");
        return false;
      }

      XLSX.writeFile(buildProductTypeExcel(items), filename);
      return true;
    },
    [buildProductTypeExcel],
  );

  const handleExportExcel = useCallback(async () => {
    try {
      toast.loading("Preparing Excel export...", {
        id: "product-type-export",
      });

      const items = await getProductTypeReportRows();

      if (!items.length) {
        toast.error("No item types to export", {
          id: "product-type-export",
        });
        return;
      }

      downloadProductTypeExcel(items);

      toast.success(`${items.length} item condition(s) exported`, {
        id: "product-type-export",
      });
    } catch (error) {
      console.error("Item Condition EXPORT ERROR", error);

      toast.error(error.message || "Excel export failed", {
        id: "product-type-export",
      });
    }
  }, [getProductTypeReportRows, downloadProductTypeExcel]);

  const handlePrintProductTypes = useCallback(async () => {
    try {
      const items = await getProductTypeReportRows();

      if (!items.length) {
        toast.error("No item types to print");
        return;
      }

      const rows = items
        .map(
          (item) => `
        <tr>
          <td>${escapeHtml(item.id)}</td>
          <td>${escapeHtml(item.ProductType)}</td>
          <td>${escapeHtml(item.Description || "-")}</td>
          <td>${isActiveStatus(item.status) ? "Active" : "Inactive"}</td>
          <td>${escapeHtml(item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "-")}</td>
          <td>${escapeHtml(item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : "-")}</td>
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
            <title>Item Types Report</title>
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
                overflow-wrap: anywhere;
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
            <h1>Item Types Report</h1>
            <p>Generated: ${escapeHtml(new Date().toLocaleString())}</p>
            <p>Total records: ${items.length}</p>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Item Condition</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created Date</th>
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
      console.error("Item Condition PRINT ERROR", error);
      toast.error(error.message || "Unable to prepare print report");
    }
  }, [getProductTypeReportRows]);

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
  const filteredStaffList = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase();

    if (!query) return staffList;

    return staffList.filter(
      (person) =>
        person.name.toLowerCase().includes(query) ||
        person.email.toLowerCase().includes(query),
    );
  }, [staffList, recipientSearch]);

  const allFilteredStaffSelected =
    filteredStaffList.length > 0 &&
    filteredStaffList.every((person) =>
      selectedRecipientEmails.includes(person.email),
    );

  const toggleAllFilteredStaff = useCallback(() => {
    setSelectedRecipientEmails((previous) => {
      if (allFilteredStaffSelected) {
        const filteredEmails = new Set(
          filteredStaffList.map((person) => person.email),
        );

        return previous.filter((email) => !filteredEmails.has(email));
      }

      return [
        ...new Set([
          ...previous,
          ...filteredStaffList.map((person) => person.email),
        ]),
      ];
    });
  }, [allFilteredStaffSelected, filteredStaffList]);

  const toggleRecipient = useCallback((email) => {
    setSelectedRecipientEmails((previous) =>
      previous.includes(email)
        ? previous.filter((item) => item !== email)
        : [...previous, email],
    );
  }, []);

  const removeRecipient = useCallback((email) => {
    setSelectedRecipientEmails((previous) =>
      previous.filter((item) => item !== email),
    );
  }, []);
  const handleOpenEmailDialog = useCallback(() => {
    setSelectedRecipientEmails([]);
    setRecipientSearch("");
    setAttachExcel(true);
    setEmailSubject("Item Types Report");

    setEmailMessage(
      [
        "Dear Team,",
        "",
        "Please find the Item Types report for your review.",
        "",
        "The report includes the item condition name, description, status, and creation and update dates.",
        "",
        "Please review the information and let us know if any corrections are required.",
        "",
      ].join("\n"),
    );

    setEmailDialogOpen(true);
  }, []);
  useEffect(() => {
    const handleReportButtonClick = (event) => {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest("#Print, #Export, #Email");
      if (!button) return;

      // Only handle clicks on the Product Type page
      if (!window.location.pathname.includes("/product_type")) return;

      switch (button.id) {
        case "Print":
          event.preventDefault();
          void handlePrintProductTypes();
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
    handlePrintProductTypes,
    handleExportExcel,
    handleOpenEmailDialog,
  ]);
  const handleSendEmail = async () => {
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

      const response = await fetch("/api/inventory/product-type/email-report", {
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
      console.error("Item Condition EMAIL ERROR", error);

      toast.error(error.message || "Unable to send email.");
    } finally {
      setEmailSending(false);
    }
  };

  // =======================================================
  // SINGLE DELETE
  // =======================================================

  const handleDelete = useCallback((item) => {
    setSelectedProductType(item);
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedProductType?.id) return;

    try {
      setDeleteLoading(true);

      const response = await apiFetch("/api/inventory/product-type", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProductType.id,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Delete failed");
      }

      toast.success("Item Condition deleted successfully");

      await createProductTypeNotification({
        action: "deleted",
        title: "Item Condition Deleted",
        message: `${getProductTypeName(selectedProductType)} Item Condition has been deleted.`,
        ProductTypeId: selectedProductType.id,
        ProductTypeName: getProductTypeName(selectedProductType),
      });

      setDeleteDialogOpen(false);
      setSelectedIds((previous) =>
        previous.filter((id) => id !== String(selectedProductType.id)),
      );
      setSelectedProductType(null);

      await refreshProductTypes();
      await syncInventoryProductType();
    } catch (error) {
      console.error("Item Condition  DELETE ERROR", error);
      toast.error(error.message || "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedProductType, refreshProductTypes, syncInventoryProductType]);

  const getExistingProductTypeNames = useCallback(async () => {
    const params = new URLSearchParams({
      page: "1",
      limit: "10000",
      sort: "createdAt",
      dir: "desc",
    });

    const response = await apiFetch(
      `/api/inventory/product-type?${params.toString()}`,
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to check existing item types.");
    }

    return new Set(
      (result.data || []).map((item) =>
        String(item.ProductType || "")
          .trim()
          .toLowerCase(),
      ),
    );
  }, []);

  const handleCopyProductType = useCallback(
    async (item) => {
      try {
        const originalName = String(item.ProductType || "").trim();

        if (!originalName) {
          toast.error("The original item condition name is empty.");
          return;
        }

        const existingNames = await getExistingProductTypeNames();

        let copiedName = `${originalName} (Copy)`;
        let counter = 2;

        while (existingNames.has(copiedName.toLowerCase())) {
          copiedName = `${originalName} (Copy ${counter})`;
          counter += 1;
        }

        setCopySourceItem(item);
        setCopyProductType(copiedName);
        setCopyDescription(item.Description || "");
        setCopyDialogOpen(true);
      } catch (error) {
        console.error("OPEN COPY DIALOG ERROR", error);
        toast.error(error.message || "Unable to open copy dialog.");
      }
    },
    [getExistingProductTypeNames],
  );

  const handleConfirmCopyProductType = useCallback(async () => {
    if (!copySourceItem?.id) {
      toast.error("Please select an item condition to copy.");
      return;
    }

    const finalName = copyProductType.trim();

    if (!finalName) {
      toast.error("Please enter an item condition name.");
      return;
    }

    try {
      setCopyLoading(true);

      const existingNames = await getExistingProductTypeNames();

      if (existingNames.has(finalName.toLowerCase())) {
        toast.error("This item condition already exists. Please use another name.");
        return;
      }

      const response = await apiFetch("/api/inventory/product-type", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ProductType: finalName,
          Description: copyDescription.trim(),
          status: isActiveStatus(copySourceItem.status),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to copy item condition.");
      }

      const createdItem = result.data || {};

      toast.success("Item Condition copied successfully.");

      await createProductTypeNotification({
        action: "created",
        title: "Item Condition Copied",
        message: `${finalName} was copied from ${getProductTypeName(copySourceItem)}.`,
        ProductTypeId: createdItem.id,
        ProductTypeName: finalName,
      });

      setCopyDialogOpen(false);
      setCopySourceItem(null);
      setCopyProductType("");
      setCopyDescription("");

      await refreshProductTypes();
      await syncInventoryProductType();
    } catch (error) {
      console.error("Item Condition COPY ERROR", error);
      toast.error(error.message || "Copy failed.");
    } finally {
      setCopyLoading(false);
    }
  }, [
    copySourceItem,
    copyProductType,
    copyDescription,
    getExistingProductTypeNames,
    refreshProductTypes,
    syncInventoryProductType,
  ]);

  const handleToggleProductTypeStatus = useCallback(
    async (item) => {
      const nextStatus = !isActiveStatus(item.status);

      try {
        const response = await apiFetch("/api/inventory/product-type", {
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

        toast.success(
          `${getProductTypeName(item)} marked ${nextStatus ? "active" : "inactive"}`,
        );

        await refreshProductTypes();
        await syncInventoryProductType();
      } catch (error) {
        console.error("Item Condition STATUS ERROR", error);
        toast.error(error.message || "Status update failed");
      }
    },
    [refreshProductTypes, syncInventoryProductType],
  );

  const handleBulkStatus = useCallback(
    async (status) => {
      if (!selectedIds.length) {
        toast.error("Select at least one item condition");
        return;
      }

      if (!(canManage || canEdit)) {
        toast.error("You do not have permission to change item condition status");
        return;
      }

      const idsToUpdate = [...selectedIds];

      try {
        setBulkLoading(true);

        const response = await apiFetch("/api/inventory/product-type", {
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
            "Bulk status update failed. Your API must support ids.",
          );
        }

        toast.success(
          `${result.count ?? idsToUpdate.length} item condition(s) marked ${status ? "active" : "inactive"}`,
        );

        setActiveDialogOpen(false);
        setInactiveDialogOpen(false);
        setSelectedIds([]);

        await refreshProductTypes();
        await syncInventoryProductType();
      } catch (error) {
        console.error("BULK Item Condition STATUS ERROR", error);
        toast.error(error.message || "Bulk status update failed");
      } finally {
        setBulkLoading(false);
      }
    },
    [
      selectedIds,
      canManage,
      canEdit,
      refreshProductTypes,
      syncInventoryProductType,
    ],
  );

  const handleBulkDelete = useCallback(() => {
    if (!selectedIds.length) {
      toast.error("Please select at least one item condition to delete.");
      return;
    }

    if (!canDelete) {
      toast.error("You do not have permission to delete item types.");
      return;
    }

    setShowDeleteDialog(true);
  }, [selectedIds, canDelete]);

  const handleConfirmBulkDelete = useCallback(async () => {
    if (isDeleting || !selectedIds.length) {
      return;
    }

    const idsToDelete = [...selectedIds];

    try {
      setIsDeleting(true);

      const response = await apiFetch("/api/inventory/product-type", {
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
        throw new Error(
          result.message || "Failed to delete selected item types.",
        );
      }

      toast.success(
        result.message ||
        `${idsToDelete.length} item condition(s) deleted successfully.`,
      );

      setShowDeleteDialog(false);
      setBulkDeleteDialogOpen(false);
      setSelectedIds([]);

      await refreshProductTypes();
      await syncInventoryProductType();
    } catch (error) {
      console.error("BULK Item Condition DELETE ERROR", error);

      toast.error(error.message || "Failed to delete selected item types.");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedIds, isDeleting, refreshProductTypes, syncInventoryProductType]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await checkDbStatus();
      await syncInventoryProductType();
      await refreshProductTypes();
    };

    const handleOffline = () => {
      setIsOnline(false);

      setDbStatus((previous) => ({
        ...previous,
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
  }, [checkDbStatus, syncInventoryProductType, refreshProductTypes]);

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
            disabled={!productTypes.length || bulkLoading}
          />
        ),
        cell: ({ row }) => {
          const item = row.original;
          const id = String(item.id);

          return (
            <Checkbox
              aria-label={`Select ${getProductTypeName(item)}`}
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
          <span className="font-medium">
            #{row.original?.id ? String(row.original.id).substring(0, 8) : "-"}
          </span>
        ),
        size: 120,
        enableSorting: false,
        meta: {
          headerTitle: "ID",
          skeleton: <Skeleton className="h-7 w-12" />,
        },
      },
      {
        accessorKey: "ProductType",
        id: "ProductType",
        header: ({ column }) => (
          <DataGridColumnHeader title="Item Condition" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original?.ProductType || "-"}
          </span>
        ),
        size: 250,
        enableSorting: true,
        meta: {
          headerTitle: "Item Condition",
          skeleton: <Skeleton className="h-7 w-40" />,
        },
      },
      {
        accessorKey: "Description",
        id: "Description",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Description"
            column={column}
            visibility
          />
        ),
        cell: ({ row }) => (
          <span className="block max-w-[350px] truncate">
            {row.original?.Description || "-"}
          </span>
        ),
        size: 300,
        enableSorting: true,
        meta: {
          headerTitle: "Description",
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
          const active = isActiveStatus(row.original?.status);

          return (
            <span
              className={
                active
                  ? "font-medium text-green-600"
                  : "font-medium text-red-600"
              }
            >
              {active ? "Active" : "Inactive"}
            </span>
          );
        },
        size: 120,
        enableSorting: true,
        meta: {
          headerTitle: "Status",
          skeleton: <Skeleton className="h-7 w-20" />,
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
        size: 160,
        enableSorting: true,
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
        size: 160,
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
                  aria-label={`Actions for ${getProductTypeName(item)}`}
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {canView && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedProductType(item);
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
                      setSelectedProductType(item);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    Edit
                  </DropdownMenuItem>
                )}

                {(canManage || canEdit) && (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleCopyProductType(item)}
                    >
                      <Copy className="mr-2 size-4" />
                      Copy
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleToggleProductTypeStatus(item)}
                    >
                      {isActiveStatus(item.status) ? (
                        <XCircle className="mr-2 size-4" />
                      ) : (
                        <CheckCircle className="mr-2 size-4" />
                      )}
                      Mark {isActiveStatus(item.status) ? "Inactive" : "Active"}
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
        size: 80,
        enableSorting: false,
        enableHiding: false,
        meta: {
          skeleton: <Skeleton className="size-5" />,
        },
      },
    ],
    [
      allCurrentPageSelected,
      productTypes.length,
      selectedIds,
      bulkLoading,
      toggleCurrentPageSelection,
      toggleRowSelection,
      canView,
      canEdit,
      canManage,
      canDelete,
      handleDelete,
      handleCopyProductType,
      handleToggleProductTypeStatus,
    ],
  );
  const table = useReactTable({
    columns,
    data: productTypes,
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
                placeholder="Search item condition"
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
            <Button type="button" onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Add Item Condition
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

  // =======================================================
  // ACCESS CHECK
  // =======================================================

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Access Denied</h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view Item Condition.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // =======================================================
  // RENDER
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
          {/* Direct invocation preserves toolbar input state. */}
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

      {/* ADD Item Condition */}

      <ProductTypeAddDialog
        open={addDialogOpen}
        closeDialog={() => setAddDialogOpen(false)}
        onSuccess={async (newProductType) => {
          setAddDialogOpen(false);

          await createProductTypeNotification({
            action: "created",
            title: "New Item Condition Created",
            message: `${getProductTypeName(newProductType) || "Item Condition"} has been created.`,
            ProductTypeId: newProductType?.id,
            ProductTypeName: getProductTypeName(newProductType),
          });

          await refreshProductTypes();
          await syncInventoryProductType();
        }}
      />

      {/* VIEW Item Condition */}

      <ProductTypeViewDialog
        open={viewDialogOpen}
        ProductType={selectedProductType}
        closeDialog={() => {
          setViewDialogOpen(false);
          setSelectedProductType(null);
        }}
      />

      {/* EDIT Item Condition */}

      <ProductTypeEditDialog
        open={editDialogOpen}
        ProductType={selectedProductType}
        closeDialog={() => {
          setEditDialogOpen(false);
          setSelectedProductType(null);
        }}
        onSuccess={async (updatedProductType) => {
          await createProductTypeNotification({
            action: "updated",
            title: "Item Condition Updated",
            message: `${getProductTypeName(updatedProductType) ||
              getProductTypeName(selectedProductType) ||
              "Item Condition"
              } has been updated.`,
            ProductTypeId: updatedProductType?.id || selectedProductType?.id,
            ProductTypeName:
              getProductTypeName(updatedProductType) ||
              getProductTypeName(selectedProductType),
          });

          await refreshProductTypes();
          await syncInventoryProductType();
        }}
      />

      {/* DELETE Item Condition */}

      <ProductTypeDeleteDialog
        open={deleteDialogOpen}
        ProductType={selectedProductType}
        loading={deleteLoading}
        onConfirm={handleDeleteConfirm}
        closeDialog={() => {
          setDeleteDialogOpen(false);
          setSelectedProductType(null);
        }}
      />

      {/* EMAIL REPORT DIALOG */}

      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] flex flex-col gap-0 overflow-hidden sm:w-[90vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px] p-0">

          <form className="flex flex-col h-full max-h-[90vh] overflow-hidden" onSubmit={(event) => { event.preventDefault(); handleSendEmail(); }} >
            <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
              <DialogTitle>Email Item Types</DialogTitle>
              <DialogDescription>
                Send the Item Types report to selected staff members.
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

                <div className="space-y-2">
                  <label
                    htmlFor="item-type-subject"
                    className="text-sm font-medium"
                  >
                    Subject
                  </label>

                  <Input
                    id="item-type-subject"
                    required
                    value={emailSubject}
                    onChange={(event) => setEmailSubject(event.target.value)}
                    placeholder="Item Types Report"
                  />
                </div>

                <div className="rounded-md border p-3">
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
                    selectedRecipientEmails.length === 0 ||
                    !emailSubject.trim() ||
                    !emailMessage.trim()
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

      {/* COPY Item Condition DIALOG */}

      <Dialog
        open={copyDialogOpen}
        onOpenChange={(open) => {
          if (copyLoading) return;

          setCopyDialogOpen(open);

          if (!open) {
            setCopySourceItem(null);
            setCopyProductType("");
            setCopyDescription("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Item Condition</DialogTitle>

            <DialogDescription>
              Enter a unique name for the copied Item Condition. The suggested name
              can be changed before saving.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleConfirmCopyProductType();
            }}
          >
            <div className="space-y-2">
              <label htmlFor="copy-item-type" className="text-sm font-medium">
                Item Condition Name <span className="text-destructive">*</span>
              </label>

              <Input
                id="copy-item-type"
                value={copyProductType}
                onChange={(event) => setCopyProductType(event.target.value)}
                placeholder="Enter item condition name"
                maxLength={150}
                required
                autoFocus
                disabled={copyLoading}
              />

              {copySourceItem && (
                <p className="text-xs text-muted-foreground">
                  Copying from: {getProductTypeName(copySourceItem)}
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
                disabled={copyLoading || !copyProductType.trim()}
              >
                <Copy className="mr-2 size-4" />
                {copyLoading ? "Copying..." : "Copy Item Condition"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
                {selectedIds.length} selected item condition
                {selectedIds.length !== 1 ? "s" : ""}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-2">
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
      <ProductTypesActiveDialog
        open={activeDialogOpen}
        onOpenChange={setActiveDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={() => handleBulkStatus(true)}
      />

      <ProductTypesInactiveDialog
        open={inactiveDialogOpen}
        onOpenChange={setInactiveDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={() => handleBulkStatus(false)}
      />

      <ProductTypesDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={handleConfirmBulkDelete}
      />
    </>
  );
};

export default ProductTypeList;