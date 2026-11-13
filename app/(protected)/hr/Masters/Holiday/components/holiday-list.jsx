"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import * as XLSX from "xlsx";
import {
  CheckCircle,
  Copy,
  Ellipsis,
  Eye,
  Funnel,
  FileSpreadsheet,
  Mail,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
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

import HolidayAddDialog from "./holiday-add-dialog";
import HolidayEditDialog from "./holiday-edit-dialog";
import HolidayDeleteDialog from "./holiday-delete-dialog";
import HolidayViewDialog from "./holiday-view-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";
import HolidaysActiveDialog from "./holidays-active-dialog";
import HolidaysInactiveDialog from "./holidays-inactive-dialog";
import HolidaysDeleteDialog from "./holidays-delete-dialog";

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString();
};

const isHolidayActive = (status) =>
  status === true ||
  status === 1 ||
  ["true", "1", "active"].includes(
    String(status ?? "").trim().toLowerCase(),
  );

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);

const createHolidayNotification = async ({
  action,
  title,
  message,
  holidayId = null,
  holidayName = null,
}) => {
  try {
    const response = await apiFetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        module: "settings",
        action,
        title,
        message,
        entityId:
          holidayId !== null && holidayId !== undefined
            ? String(holidayId)
            : null,
        entityType: "holiday",
        entityName: holidayName || "Holiday",
        url: "/settings/holiday",
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result?.success) {
      throw new Error(result?.message || "Notification failed");
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notifications-refresh"));
    }

    return result;
  } catch (error) {
    console.error("HOLIDAY NOTIFICATION ERROR", error);
    return null;
  }
};

export default function HolidayList() {
  const queryClient = useQueryClient();
  const { data: session, status: sessionStatus } = useSession();

  const userPermissions = useMemo(
    () => session?.user?.permissions || [],
    [session],
  );

  const canView = can("holiday.view", userPermissions);
  const canManage = can("holiday.manage", userPermissions);
  const canEdit = can("holiday.edit", userPermissions);
  const canDelete = can("holiday.delete", userPermissions);

  // TABLE
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState([
    { id: "createdAt", desc: true },
  ]);

  // SEARCH AND FILTERS - SAME STRUCTURE AS Holiday
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");

  // MULTIPLE SELECTION
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [activeDialogOpen, setActiveDialogOpen] = useState(false);
  const [inactiveDialogOpen, setInactiveDialogOpen] = useState(false);

  // DATABASE STATUS
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
  const [selectedHoliday, setSelectedHoliday] = useState(null);

  // COPY HOLIDAY DIALOG
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceHoliday, setCopySourceHoliday] = useState(null);
  const [copyHolidayName, setCopyHolidayName] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);

  // EMAIL
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("Holiday Report");
  const [emailMessage, setEmailMessage] = useState(
    "Dear Team,\n\nPlease find the Holiday report attached for your review.\n\n",
  );

  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState([]);
  const [attachExcel, setAttachExcel] = useState(true);
  const [emailSending, setEmailSending] = useState(false);
  const syncHrHoliday = useCallback(async () => {
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
      console.error("Holiday SYNC ERROR", error);
      toast.error(error.message || "Hr sync failed");
      return null;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);
  const checkDbStatus = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setDbStatus((previous) => ({
        ...previous,
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
      console.error("HOLIDAY DATABASE CHECK ERROR", error);

      setDbStatus((previous) => ({
        ...previous,
        online: false,
        loading: false,
      }));
    } finally {
      setCheckingDb(false);
    }
  }, []);

  useEffect(() => {
    checkDbStatus();

    const interval = setInterval(checkDbStatus, 30000);

    return () => clearInterval(interval);
  }, [checkDbStatus]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      await checkDbStatus();
      await queryClient.invalidateQueries({
        queryKey: ["holiday-holidays"],
      });
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
  }, [checkDbStatus, queryClient]);

  const buildListParams = useCallback(
    ({ page, limit }) =>
      new URLSearchParams({
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
      }),
    [
      searchQuery,
      statusFilter,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      sorting,
    ],
  );

  const fetchHolidays = useCallback(async () => {
    const params = buildListParams({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
    });

    const response = await apiFetch(
      `/api/hr/Holiday?${params.toString()}`,
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || "Failed to load holidays.");
    }

    return result;
  }, [buildListParams, pagination]);

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: [
      "holiday-holidays",
      pagination,
      sorting,
      searchQuery,
      statusFilter,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
    ],
    queryFn: fetchHolidays,
    enabled: sessionStatus === "authenticated" && canView,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const holidays = useMemo(() => data?.data || [], [data]);
  const totalRecords = Number(data?.pagination?.total || 0);

  const refreshHolidays = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["holiday-holidays"],
    });
  }, [queryClient]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load holidays.");
    }
  }, [error]);

  const currentPageIds = useMemo(
    () => holidays.map((holiday) => String(holiday.id)),
    [holidays],
  );

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.includes(id));

  const toggleRowSelection = useCallback((id) => {
    const normalizedId = String(id);

    setSelectedIds((previous) =>
      previous.includes(normalizedId)
        ? previous.filter((item) => item !== normalizedId)
        : [...previous, normalizedId],
    );
  }, []);

  const toggleCurrentPageSelection = useCallback(() => {
    setSelectedIds((previous) =>
      allCurrentPageSelected
        ? previous.filter((id) => !currentPageIds.includes(id))
        : [...new Set([...previous, ...currentPageIds])],
    );
  }, [allCurrentPageSelected, currentPageIds]);

  const getHolidayReportRows = useCallback(async () => {
    if (selectedIds.length > 0) {
      const selectedSet = new Set(selectedIds.map(String));

      // Fetch selected records across pages.
      const params = buildListParams({ page: 1, limit: 10000 });
      params.set("query", "");
      params.set("status", "all");
      params.set("createdFrom", "");
      params.set("createdTo", "");
      params.set("updatedFrom", "");
      params.set("updatedTo", "");

      const response = await apiFetch(
        `/api/hr/Holiday?${params.toString()}`,
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Failed to load holidays.");
      }

      return (result.data || []).filter((holiday) =>
        selectedSet.has(String(holiday.id)),
      );
    }

    const params = buildListParams({ page: 1, limit: 10000 });

    const response = await apiFetch(
      `/api/hr/Holiday?${params.toString()}`,
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || "Failed to load holidays.");
    }

    return result.data || [];
  }, [selectedIds, buildListParams]);

  const buildHolidayExcel = useCallback((items) => {
    const rows = items.map((holiday) => ({
      ID: holiday.id,
      "Holiday Name": holiday.name || "",
      "From Date": holiday.fromDate
        ? String(holiday.fromDate).slice(0, 10)
        : "",
      "To Date": holiday.toDate
        ? String(holiday.toDate).slice(0, 10)
        : "",
      Description: holiday.description || "",
      Status: isHolidayActive(holiday.status) ? "Active" : "Inactive",
      "Created Date": holiday.createdAt
        ? new Date(holiday.createdAt).toLocaleString()
        : "",
      "Updated Date": holiday.updatedAt
        ? new Date(holiday.updatedAt).toLocaleString()
        : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Holidays");

    return workbook;
  }, []);

  const handleExportExcel = useCallback(async () => {
    try {
      const items = await getHolidayReportRows();

      if (!items.length) {
        toast.error("No holidays to export.");
        return;
      }

      XLSX.writeFile(buildHolidayExcel(items), "holidays.xlsx");
      toast.success(`${items.length} holiday(s) exported.`);
    } catch (error) {
      toast.error(error.message || "Excel export failed.");
    }
  }, [getHolidayReportRows, buildHolidayExcel]);

  const handlePrintHolidays = useCallback(async () => {
    try {
      const items = await getHolidayReportRows();

      if (!items.length) {
        toast.error("No holidays to print.");
        return;
      }

      const rows = items.map((holiday) => `
        <tr>
          <td>${escapeHtml(holiday.id)}</td>
          <td>${escapeHtml(holiday.name || "-")}</td>
          <td>${escapeHtml(formatDate(holiday.fromDate))}</td>
          <td>${escapeHtml(formatDate(holiday.toDate))}</td>
          <td>${escapeHtml(holiday.description || "-")}</td>
          <td>${isHolidayActive(holiday.status) ? "Active" : "Inactive"}</td>
        </tr>
      `).join("");

      const printWindow = window.open("", "_blank", "width=1200,height=800");

      if (!printWindow) {
        toast.error("Please allow pop-ups to print the report.");
        return;
      }

      printWindow.document.write(`
        <!doctype html>
        <html>
          <head>
            <title>Holiday Report</title>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #ccc; padding: 8px; text-align: left; font-size: 12px; }
              th { background: #f2f2f2; }
              tr { break-inside: avoid; }
              @media print { body { padding: 0; } }
            </style>
          </head>
          <body>
            <h1>Holiday Report</h1>
            <p>Generated: ${escapeHtml(new Date().toLocaleString())}</p>
            <p>Total records: ${items.length}</p>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Holiday Name</th>
                  <th>From Date</th>
                  <th>To Date</th>
                  <th>Description</th>
                  <th>Status</th>
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
      toast.error(error.message || "Unable to print holidays.");
    }
  }, [getHolidayReportRows]);

  const handleBulkStatus = useCallback(async (status) => {
    if (!selectedIds.length) {
      toast.error("Please select at least one holiday.");
      return;
    }

    try {
      setBulkLoading(true);

      const results = await Promise.all(
        selectedIds.map(async (id) => {
          const response = await apiFetch(
            `/api/hr/Holiday/${encodeURIComponent(id)}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status }),
            },
          );

          const result = await response.json().catch(() => ({}));

          if (!response.ok || result.success === false) {
            throw new Error(
              result.message || `Failed to update holiday ${id}.`,
            );
          }

          return result;
        }),
      );

      setSelectedIds([]);
      setActiveDialogOpen(false);
      setInactiveDialogOpen(false);

      await refreshHolidays();
      await syncHrHoliday();
      toast.success(
        `${results.length} holiday(s) marked ${status ? "Active" : "Inactive"}.`,
      );
    } catch (error) {
      toast.error(error.message || "Unable to update selected holidays.");
      await refreshHolidays();
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, refreshHolidays, syncHrHoliday]);

  const handleBulkDelete = useCallback(async () => {
    if (!selectedIds.length) {
      toast.error("Please select at least one holiday.");
      return;
    }

    try {
      setBulkLoading(true);

      const results = await Promise.all(
        selectedIds.map(async (id) => {
          const response = await apiFetch(
            `/api/hr/Holiday/${encodeURIComponent(id)}`,
            { method: "DELETE" },
          );

          const result = await response.json().catch(() => ({}));

          if (!response.ok || result.success === false) {
            throw new Error(
              result.message || `Failed to delete holiday ${id}.`,
            );
          }

          return result;
        }),
      );

      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);

      await refreshHolidays();
      await syncHrHoliday();
      toast.success(`${results.length} holiday(s) deleted.`);
    } catch (error) {
      toast.error(error.message || "Unable to delete selected holidays.");
      await refreshHolidays();
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, refreshHolidays, syncHrHoliday]);

  const openCopyDialog = useCallback((holiday) => {
    setCopySourceHoliday(holiday);
    setCopyHolidayName(`${holiday.name || "Holiday"} Copy`);
    setCopyDialogOpen(true);
  }, []);

  const handleConfirmCopyHoliday = useCallback(async (event) => {
    event?.preventDefault();

    if (!copySourceHoliday || !copyHolidayName.trim()) {
      toast.error("Please enter a holiday name.");
      return;
    }

    try {
      setCopyLoading(true);

      const response = await apiFetch("/api/hr/Holiday", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: copyHolidayName.trim(),
          fromDate: copySourceHoliday.fromDate,
          toDate: copySourceHoliday.toDate,
          description: copySourceHoliday.description || "",
          status: copySourceHoliday.status,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Failed to copy holiday.");
      }

      await createHolidayNotification({
        action: "created",
        title: "Holiday Copied",
        message: `${copyHolidayName.trim()} has been created from a copy.`,
        holidayId: result.data?.id,
        holidayName: copyHolidayName.trim(),
      });

      setCopyDialogOpen(false);
      setCopySourceHoliday(null);
      setCopyHolidayName("");

      await refreshHolidays();
      await syncHrHoliday();
      toast.success("Holiday copied successfully.");
    } catch (error) {
      toast.error(error.message || "Unable to copy holiday.");
    } finally {
      setCopyLoading(false);
    }
  }, [copySourceHoliday, copyHolidayName, refreshHolidays, syncHrHoliday]);

  const loadStaffForEmail = useCallback(async () => {
    // Open the dialog when the Email action is clicked.
    setEmailDialogOpen(true);

    try {
      setStaffLoading(true);

      const response = await apiFetch("/api/staff?limit=10000");
      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Failed to load staff emails.");
      }

      const staff = Array.isArray(result)
        ? result
        : Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.data?.staff)
            ? result.data.staff
            : Array.isArray(result.staff)
              ? result.staff
              : [];

      const recipients = staff
        .map((person) => ({
          id: person.id,
          name:
            person.name ||
            person.fullName ||
            [person.firstName, person.lastName].filter(Boolean).join(" ") ||
            person.username ||
            person.email ||
            "Staff member",
          email: String(person.email || person.workEmail || "")
            .trim(),
        }))
        .filter((person) => person.email);

      setStaffList(recipients);

      if (recipients.length === 0) {
        toast.error("No staff email addresses found.");
      }
    } catch (error) {
      console.error("STAFF RECIPIENT LOAD ERROR:", error);

      setStaffList([]);
      toast.error(error.message || "Unable to load staff emails.");
    } finally {
      setStaffLoading(false);
    }
  }, []);

  const handleSendEmail = useCallback(async (event) => {

    if (!selectedRecipientEmails.length) {
      toast.error("Please select at least one recipient.");
      return;
    }

    if (!emailSubject.trim()) {
      toast.error("Please enter an email subject.");
      return;
    }

    try {
      setEmailSending(true);

      const items = await getHolidayReportRows();

      if (!items.length) {
        toast.error("No holidays available to email.");
        return;
      }

      const excelBase64 = attachExcel
        ? XLSX.write(buildHolidayExcel(items), {
          bookType: "xlsx",
          type: "base64",
        })
        : undefined;

      const response = await apiFetch("/api/hr/Holiday/email-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: selectedRecipientEmails,
          subject: emailSubject.trim(),
          message: emailMessage,
          attachExcel,
          excelBase64,
          fileName: "holidays.xlsx",
          filters: {
            query: searchQuery,
            status: statusFilter,
            createdFrom,
            createdTo,
            updatedFrom,
            updatedTo,
          },
          selectedIds,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Failed to send holiday report.");
      }

      toast.success("Holiday report emailed successfully.");
      setEmailDialogOpen(false);
      setSelectedRecipientEmails([]);
    } catch (error) {
      toast.error(error.message || "Unable to email holiday report.");
    } finally {
      setEmailSending(false);
    }
  }, [
    selectedRecipientEmails,
    emailSubject,
    emailMessage,
    attachExcel,
    getHolidayReportRows,
    buildHolidayExcel,
    searchQuery,
    statusFilter,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    selectedIds,
  ]);

  useEffect(() => {
    const printButton = document.querySelector("#Print");
    const exportButton = document.querySelector("#Export");
    const emailButton = document.querySelector("#Email");

    const onPrint = (event) => {
      event.preventDefault();
      handlePrintHolidays();
    };

    const onExport = (event) => {
      event.preventDefault();
      handleExportExcel();
    };

    const onEmail = (event) => {
      event.preventDefault();
      loadStaffForEmail();
    };

    printButton?.addEventListener("click", onPrint);
    exportButton?.addEventListener("click", onExport);
    emailButton?.addEventListener("click", onEmail);

    return () => {
      printButton?.removeEventListener("click", onPrint);
      exportButton?.removeEventListener("click", onExport);
      emailButton?.removeEventListener("click", onEmail);
    };
  }, [handlePrintHolidays, handleExportExcel, loadStaffForEmail]);

  const columns = useMemo(() => [
    {
      id: "select",
      header: () => (
        <Checkbox
          aria-label="Select all holidays on this page"
          checked={allCurrentPageSelected}
          onCheckedChange={toggleCurrentPageSelection}
          disabled={holidays.length === 0 || bulkLoading}
        />
      ),
      cell: ({ row }) => {
        const holiday = row.original;
        const id = String(holiday.id);

        return (
          <Checkbox
            aria-label={`Select ${holiday.name || "holiday"}`}
            checked={selectedIds.includes(id)}
            disabled={bulkLoading}
            onCheckedChange={() => toggleRowSelection(id)}
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
      size: 110,
    },
    {
      accessorKey: "name",
      id: "name",
      header: ({ column }) => (
        <DataGridColumnHeader title="Holiday Name" column={column} visibility />
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name || "-"}</span>
      ),
    },
    {
      accessorKey: "fromDate",
      id: "fromDate",
      header: ({ column }) => (
        <DataGridColumnHeader title="From Date" column={column} visibility />
      ),
      cell: ({ row }) => formatDate(row.original.fromDate),
      size: 140,
    },
    {
      accessorKey: "toDate",
      id: "toDate",
      header: ({ column }) => (
        <DataGridColumnHeader title="To Date" column={column} visibility />
      ),
      cell: ({ row }) => formatDate(row.original.toDate),
      size: 140,
    },
    {
      accessorKey: "description",
      id: "description",
      header: ({ column }) => (
        <DataGridColumnHeader title="Description" column={column} visibility />
      ),
      cell: ({ row }) => {
        const description = row.original.description || "-";

        return (
          <span title={description}>
            {description.length > 60
              ? `${description.slice(0, 60)}...`
              : description}
          </span>
        );
      },
      enableSorting: false,
      size: 250,
    },
    {
      accessorKey: "status",
      id: "status",
      header: ({ column }) => (
        <DataGridColumnHeader title="Status" column={column} visibility />
      ),
      cell: ({ row }) => {
        const active = isHolidayActive(row.original.status);

        return (
          <span className={active ? "text-green-600" : "text-red-600"}>
            {active ? "Active" : "Inactive"}
          </span>
        );
      },
      size: 110,
    },
    {
      accessorKey: "createdAt",
      id: "createdAt",
      header: ({ column }) => (
        <DataGridColumnHeader title="Created" column={column} visibility />
      ),
      cell: ({ row }) => formatDate(row.original.createdAt),
      size: 140,
    },
    {
      accessorKey: "updatedAt",
      id: "updatedAt",
      header: ({ column }) => (
        <DataGridColumnHeader title="Updated" column={column} visibility />
      ),
      cell: ({ row }) => formatDate(row.original.updatedAt),
      size: 140,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const holiday = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button mode="icon" variant="ghost" aria-label="Holiday actions">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              {canView && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedHoliday(holiday);
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
                    setSelectedHoliday(holiday);
                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
              )}

              {(canManage || canEdit) && (
                <>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => openCopyDialog(holiday)}>
                    <Copy className="mr-2 size-4" />
                    Copy
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    disabled={bulkLoading}
                    onClick={() => {
                      setSelectedIds([String(holiday.id)]);
                      setActiveDialogOpen(true);
                    }}
                  >
                    <CheckCircle className="mr-2 size-4" />
                    Mark as Active
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    disabled={bulkLoading}
                    onClick={() => {
                      setSelectedIds([String(holiday.id)]);
                      setInactiveDialogOpen(true);
                    }}
                  >
                    <XCircle className="mr-2 size-4" />
                    Mark as Inactive
                  </DropdownMenuItem>
                </>
              )}

              {canDelete && (
                <>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      setSelectedHoliday(holiday);
                      setDeleteDialogOpen(true);
                    }}
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
  ], [
    allCurrentPageSelected,
    holidays.length,
    selectedIds,
    bulkLoading,
    canView,
    canEdit,
    canManage,
    canDelete,
    toggleCurrentPageSelection,
    toggleRowSelection,
    openCopyDialog,
  ]);

  const table = useReactTable({
    data: holidays,
    columns,
    pageCount: Math.ceil(totalRecords / pagination.pageSize),
    state: { pagination, sorting },
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  if (sessionStatus === "loading") {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardTable>
          <div className="space-y-3 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardTable>
      </Card>
    );
  }

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">Access Denied</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view holidays.
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
        isLoading={isLoading || isFetching}
        tableLayout={{
          columnsResizable: true,
          columnsPinnable: true,
          columnsMovable: true,
          columnsVisibility: true,
        }}
        tableClassNames={{ edgeCell: "px-5" }}
      >
        <Card>
          <CardHeader className="flex-col flex-wrap items-stretch gap-3 py-5 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">
              {/* SEARCH */}
              <form
                className="relative flex w-full sm:w-64"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearchQuery(searchInput.trim());
                  setPagination((previous) => ({
                    ...previous,
                    pageIndex: 0,
                  }));
                }}
              >
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search holidays..."
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
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
                      setPagination((previous) => ({
                        ...previous,
                        pageIndex: 0,
                      }));
                    }}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </form>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {(canManage || canEdit) && selectedIds.length > 0 && (
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

              {canDelete && selectedIds.length > 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={bulkLoading}
                  onClick={() => setBulkDeleteDialogOpen(true)}
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
                      ? String(dbStatus.env || "Database").toUpperCase()
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
                  aria-label="Refresh database status"
                >
                  <RefreshCw
                    className={`size-4 ${checkingDb ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>

              {canManage && (
                <Button
                  type="button"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="mr-2 size-4" />
                  Add Holiday
                </Button>
              )}

              {/* SAME FILTER SHEET STRUCTURE AS Holiday */}
              <StoreClientFiltersSheet
                trigger={
                  <Button type="button" variant="outline">
                    <Funnel className="mr-2 size-4" />
                    Filter
                  </Button>
                }
                statusFilter={statusFilter}
                setStatusFilter={(value) => {
                  setStatusFilter(value);
                  setPagination((previous) => ({
                    ...previous,
                    pageIndex: 0,
                  }));
                }}
                createdFrom={createdFrom}
                setCreatedFrom={(value) => {
                  setCreatedFrom(value);
                  setPagination((previous) => ({
                    ...previous,
                    pageIndex: 0,
                  }));
                }}
                createdTo={createdTo}
                setCreatedTo={(value) => {
                  setCreatedTo(value);
                  setPagination((previous) => ({
                    ...previous,
                    pageIndex: 0,
                  }));
                }}
                updatedFrom={updatedFrom}
                setUpdatedFrom={(value) => {
                  setUpdatedFrom(value);
                  setPagination((previous) => ({
                    ...previous,
                    pageIndex: 0,
                  }));
                }}
                updatedTo={updatedTo}
                setUpdatedTo={(value) => {
                  setUpdatedTo(value);
                  setPagination((previous) => ({
                    ...previous,
                    pageIndex: 0,
                  }));
                }}
              />
            </div>
          </CardHeader>

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

      {/* ADD */}
      <HolidayAddDialog
        open={addDialogOpen}
        closeDialog={() => setAddDialogOpen(false)}
        onSuccess={async (newHoliday) => {
          setAddDialogOpen(false);

          await createHolidayNotification({
            action: "created",
            title: "Holiday Created",
            message: `${newHoliday?.name || "A holiday"} has been created.`,
            holidayId: newHoliday?.id,
            holidayName: newHoliday?.name,
          });

          await refreshHolidays();
          await syncHrHoliday();
        }}
      />

      {/* VIEW */}
      {selectedHoliday && viewDialogOpen && (
        <HolidayViewDialog
          open={viewDialogOpen}
          Holiday={selectedHoliday}
          closeDialog={() => {
            setViewDialogOpen(false);
            setSelectedHoliday(null);
          }}
        />
      )}

      {/* EDIT */}
      {selectedHoliday && editDialogOpen && (
        <HolidayEditDialog
          open={editDialogOpen}
          Holiday={selectedHoliday}
          closeDialog={() => {
            setEditDialogOpen(false);
            setSelectedHoliday(null);
          }}
          onSuccess={async (updatedHoliday) => {
            await createHolidayNotification({
              action: "updated",
              title: "Holiday Updated",
              message: `${updatedHoliday?.name || selectedHoliday?.name || "Holiday"} has been updated.`,
              holidayId: updatedHoliday?.id || selectedHoliday?.id,
              holidayName: updatedHoliday?.name || selectedHoliday?.name,
            });

            setEditDialogOpen(false);
            setSelectedHoliday(null);

            await refreshHolidays();
            await syncHrHoliday();
          }}
        />
      )}

      {/* SINGLE DELETE */}
      {selectedHoliday && deleteDialogOpen && (
        <HolidayDeleteDialog
          open={deleteDialogOpen}
          Holiday={selectedHoliday}
          closeDialog={() => {
            setDeleteDialogOpen(false);
            setSelectedHoliday(null);
          }}
          onSuccess={async () => {
            await createHolidayNotification({
              action: "deleted",
              title: "Holiday Deleted",
              message: `${selectedHoliday?.name || "Holiday"} has been deleted.`,
              holidayId: selectedHoliday?.id,
              holidayName: selectedHoliday?.name,
            });

            setDeleteDialogOpen(false);
            setSelectedHoliday(null);

            await refreshHolidays();
            await syncHrHoliday();
          }}
        />
      )}

      {/* COPY HOLIDAY */}
      <Dialog
        open={copyDialogOpen}
        onOpenChange={(open) => {
          if (copyLoading) return;

          setCopyDialogOpen(open);

          if (!open) {
            setCopySourceHoliday(null);
            setCopyHolidayName("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Holiday</DialogTitle>
            <DialogDescription>
              Enter a new name for the copied holiday.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={handleConfirmCopyHoliday}
          >
            <div className="space-y-2">
              <label htmlFor="copy-holiday-name" className="text-sm font-medium">
                Holiday Name <span className="text-destructive">*</span>
              </label>

              <Input
                id="copy-holiday-name"
                value={copyHolidayName}
                onChange={(event) => setCopyHolidayName(event.target.value)}
                placeholder="Enter holiday name"
                maxLength={150}
                required
                disabled={copyLoading}
              />

              {copySourceHoliday && (
                <p className="text-xs text-muted-foreground">
                  Copying from: {copySourceHoliday.name}
                </p>
              )}
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
                type="submit"
                disabled={copyLoading || !copyHolidayName.trim()}
              >
                <Copy className="mr-2 size-4" />
                {copyLoading ? "Copying..." : "Copy Holiday"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BULK ACTIVE DIALOG - SAME PATTERN AS Holiday */}
      <HolidaysActiveDialog
        open={activeDialogOpen}
        onOpenChange={setActiveDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={() => handleBulkStatus(true)}
      />

      {/* BULK INACTIVE DIALOG */}
      <HolidaysInactiveDialog
        open={inactiveDialogOpen}
        onOpenChange={setInactiveDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={() => handleBulkStatus(false)}
      />

      {/* BULK DELETE DIALOG */}
      <HolidaysDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={handleBulkDelete}
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
            {/* Header remains visible outside of the scroll area */}
            <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
              <DialogTitle>Email Holidays</DialogTitle>
              <DialogDescription>
                Select recipients and send the holidays report.
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
                    htmlFor="holiday-subject"
                    className="text-sm font-medium"
                  >
                    Subject
                  </label>
                  <Input
                    id="holiday-subject"
                    required
                    value={emailSubject}
                    onChange={(event) => setEmailSubject(event.target.value)}
                    placeholder="Holidays Report"
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
                        Attach the holiday report as an Excel file (.xlsx)
                        to the email.
                      </span>
                    </span>
                    <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                  </label>
                </div>
                {/* Email Message */}
                <div className="space-y-2">
                  <label
                    htmlFor="holiday-message"
                    className="text-sm font-medium"
                  >
                    Message
                  </label>
                  <ScrollArea className="h-[150px] w-full">
                    <Textarea
                      id="holiday-message"
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
    </>
  );
}