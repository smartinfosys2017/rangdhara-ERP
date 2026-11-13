"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import * as XLSX from "xlsx";
import {
  CheckCircle,
  Clock3,
  Copy,
  Ellipsis,
  Eye,
  FileSpreadsheet,
  Funnel,
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
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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

import BreakTimeAddDialog from "./break-time-add-dialog";
import BreakTimeEditDialog from "./break-time-edit-dialog";
import BreakTimeDeleteDialog from "./break-time-delete-dialog";
import BreakTimeViewDialog from "./break-time-view-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";
import BreakTimesActiveDialog from "./break-times-active-dialog";
import BreakTimesInactiveDialog from "./break-times-inactive-dialog";
import BreakTimesDeleteDialog from "./break-times-delete-dialog";

// ------------------------------------------------------
// HELPERS
// ------------------------------------------------------

const API_URL = "/api/hr/BreakTime";

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

const formatDateTime = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-IN");
};

const formatTime = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const match = String(value).match(/(\d{2}):(\d{2})/);

  if (!match) return String(value);

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return String(value);

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const isActive = (status) =>
  status === true || status === "true" || status === 1;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const createBreakTimeNotification = async ({
  action,
  title,
  message,
  breaktimeId,
  breaktimeName,
}) => {
  try {
    const response = await apiFetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        module: "settings",
        action,
        title,
        message,
        entityId: breaktimeId ? String(breaktimeId) : null,
        entityType: "breaktime",
        entityName: breaktimeName || "Break Time",
        url: "/hr/BreakTime",
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || "Notification failed.");
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("notifications-refresh"));
    }

    return result;
  } catch (error) {
    console.error("BREAK TIME NOTIFICATION ERROR:", error);
    return null;
  }
};

function getBreakTimeName(item) {
  return item?.name || "Break Time";
}

// ------------------------------------------------------
// COMPONENT
// ------------------------------------------------------

export default function BreakTimeList() {
  const queryClient = useQueryClient();
  const { data: session, status: sessionStatus } = useSession();

  const userPermissions = useMemo(
    () => session?.user?.permissions || [],
    [session]
  );

  const canView = can("breaktime.view", userPermissions);
  const canManage = can("breaktime.manage", userPermissions);
  const canEdit = can("breaktime.edit", userPermissions);
  const canDelete = can("breaktime.delete", userPermissions);

  // TABLE
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const [sorting, setSorting] = useState([
    { id: "createdAt", desc: true },
  ]);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // FILTERS
  const [statusFilter, setStatusFilter] = useState("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");

  // SELECTION AND BULK ACTIONS
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [activeDialogOpen, setActiveDialogOpen] = useState(false);
  const [inactiveDialogOpen, setInactiveDialogOpen] = useState(false);

  // DATABASE STATUS
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
  const [selectedBreakTime, setSelectedBreakTime] = useState(null);

  // COPY
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceBreakTime, setCopySourceBreakTime] = useState(null);
  const [copyBreakTimeName, setCopyBreakTimeName] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);

  // EMAIL
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("Break Time Report");
  const [emailMessage, setEmailMessage] = useState(
    "Dear Team,\n\nPlease find the Break Time report attached for your review.\n\n"
  );
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState([]);
  const [attachExcel, setAttachExcel] = useState(true);
  const [emailSending, setEmailSending] = useState(false);
  const syncHrBreakTime = useCallback(async () => {
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
      console.error("BreakTime SYNC ERROR", error);
      toast.error(error.message || "Hr sync failed");
      return null;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);
  // ------------------------------------------------------
  // DATABASE STATUS
  // ------------------------------------------------------

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
        throw new Error("Database status check failed.");
      }

      const result = await response.json();

      setDbStatus({
        env: result?.activeEnv || "local",
        online: true,
        loading: false,
      });
    } catch (error) {
      console.error("DATABASE STATUS ERROR:", error);

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

    const handleOnline = () => {
      checkDbStatus();
      queryClient.invalidateQueries({
        queryKey: ["break-time-break-times"],
      });
    };

    const handleOffline = () => {
      setDbStatus((previous) => ({
        ...previous,
        online: false,
        loading: false,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkDbStatus, queryClient]);

  // ------------------------------------------------------
  // BUILD LIST PARAMETERS
  // ------------------------------------------------------

  const buildListParams = useCallback(
    ({ page, limit } = {}) => {
      const sort = sorting?.[0]?.id || "createdAt";
      const dir = sorting?.[0]?.desc ? "desc" : "asc";

      return new URLSearchParams({
        page: String(page ?? pagination.pageIndex + 1),
        limit: String(limit ?? pagination.pageSize),
        query: searchQuery,
        status: statusFilter,
        createdFrom,
        createdTo,
        updatedFrom,
        updatedTo,
        sort,
        dir,
      });
    },
    [
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
      searchQuery,
      statusFilter,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
    ]
  );

  // ------------------------------------------------------
  // FETCH BREAK TIMES
  // ------------------------------------------------------

  const fetchBreakTimes = useCallback(async () => {
    const params = buildListParams();

    const response = await apiFetch(`${API_URL}?${params.toString()}`);
    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(result.message || "Failed to load break times.");
    }

    return result;
  }, [buildListParams]);

  const {
    data,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: [
      "break-time-break-times",
      pagination,
      sorting,
      searchQuery,
      statusFilter,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
    ],
    queryFn: fetchBreakTimes,
    enabled: sessionStatus === "authenticated" && canView,
    staleTime: 0,
  });

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to load break times.");
    }
  }, [error]);

  const breakTimes = useMemo(
    () => (Array.isArray(data?.data) ? data.data : []),
    [data]
  );

  const refreshBreakTimes = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["break-time-break-times"],
    });
  }, [queryClient]);

  // ------------------------------------------------------
  // SELECTION
  // ------------------------------------------------------

  const currentPageIds = useMemo(
    () => breakTimes.map((item) => String(item.id)),
    [breakTimes]
  );

  const allCurrentPageSelected =
    currentPageIds.length > 0 &&
    currentPageIds.every((id) => selectedIds.includes(id));

  const someCurrentPageSelected =
    currentPageIds.some((id) => selectedIds.includes(id));

  const toggleCurrentPageSelection = useCallback(
    (checked) => {
      setSelectedIds((previous) => {
        if (checked) {
          return [
            ...new Set([...previous, ...currentPageIds]),
          ];
        }

        return previous.filter((id) => !currentPageIds.includes(id));
      });
    },
    [currentPageIds]
  );

  const toggleRowSelection = useCallback((id) => {
    setSelectedIds((previous) =>
      previous.includes(String(id))
        ? previous.filter((item) => item !== String(id))
        : [...previous, String(id)]
    );
  }, []);

  // ------------------------------------------------------
  // REPORT DATA
  // ------------------------------------------------------

  const getBreakTimeReportRows = useCallback(async () => {
    const params = buildListParams({
      page: 1,
      limit: 10000,
    });

    const response = await apiFetch(
      `${API_URL}?${params.toString()}`
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || "Failed to load the Break Time report."
      );
    }

    const items = Array.isArray(result.data) ? result.data : [];

    if (selectedIds.length === 0) {
      return items;
    }

    const selectedSet = new Set(selectedIds.map(String));

    return items.filter((item) => selectedSet.has(String(item.id)));
  }, [buildListParams, selectedIds]);

  // ------------------------------------------------------
  // EXCEL
  // ------------------------------------------------------

  const buildBreakTimeExcel = useCallback((items) => {
    const rows = items.map((item) => ({
      ID: item.id,
      "Break Time Name": item.name || "",
      "From Time": formatTime(item.fromTime),
      "To Time": formatTime(item.toTime),
      "Break Type": item.breakType || "",
      "Duration (Minutes)": item.durationMinutes ?? "",
      Flexible: item.isFlexible ? "Yes" : "No",
      Status: isActive(item.status) ? "Active" : "Inactive",
      "Created At": formatDateTime(item.createdAt),
      "Updated At": formatDateTime(item.updatedAt),
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet["!cols"] = [
      { wch: 24 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 14 },
      { wch: 40 },
      { wch: 14 },
      { wch: 24 },
      { wch: 24 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Break Times"
    );

    return workbook;
  }, []);

  const handleExportExcel = useCallback(async () => {
    try {
      const items = await getBreakTimeReportRows();

      if (!items.length) {
        toast.error("No break times to export.");
        return;
      }

      XLSX.writeFile(
        buildBreakTimeExcel(items),
        "break-times.xlsx"
      );

      toast.success(`${items.length} break time(s) exported.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Excel export failed."
      );
    }
  }, [getBreakTimeReportRows, buildBreakTimeExcel]);

  // ------------------------------------------------------
  // PRINT
  // Open the popup before awaiting data to avoid popup blocking.
  // ------------------------------------------------------

  const handlePrintBreakTimes = useCallback(async () => {
    const printWindow = window.open(
      "",
      "_blank",
      "width=1200,height=800"
    );

    if (!printWindow) {
      toast.error("Please allow pop-ups to print the report.");
      return;
    }

    printWindow.document.write(
      "<!DOCTYPE html><html><head><title>Break Time Report</title></head><body><p>Preparing report...</p></body></html>"
    );
    printWindow.document.close();

    try {
      const items = await getBreakTimeReportRows();

      if (!items.length) {
        printWindow.close();
        toast.error("No break times to print.");
        return;
      }

      const rows = items
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.id)}</td>
              <td>${escapeHtml(item.name || "-")}</td>
              <td>${escapeHtml(formatTime(item.fromTime))}</td>
              <td>${escapeHtml(formatTime(item.toTime))}</td>
              <td>${escapeHtml(item.breakType || "-")}</td>
              <td>${escapeHtml(item.durationMinutes ?? "-")}</td>
              <td>${item.isFlexible ? "Yes" : "No"}</td>
              <td>${isActive(item.status) ? "Active" : "Inactive"}</td>
            </tr>
          `
        )
        .join("");

      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>Break Time Report</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 24px;
                color: #222;
              }
              h1 { margin-bottom: 8px; }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
              }
              th, td {
                border: 1px solid #ccc;
                padding: 8px;
                text-align: left;
                font-size: 12px;
              }
              th { background: #f2f2f2; }
              tr { break-inside: avoid; }
              @media print {
                body { padding: 0; }
              }
            </style>
          </head>
          <body>
            <h1>Break Time Report</h1>
            <p>Generated: ${escapeHtml(new Date().toLocaleString())}</p>
            <p>Total records: ${items.length}</p>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>From Time</th>
                  <th>To Time</th>
                  <th>Break Type</th>
                  <th>Duration</th>
                  <th>Flexible</th>
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
      printWindow.close();

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to print break times."
      );
    }
  }, [getBreakTimeReportRows]);

  // ------------------------------------------------------
  // BULK STATUS
  // ------------------------------------------------------

  const handleBulkStatus = useCallback(
    async (status) => {
      if (!selectedIds.length) {
        toast.error("Please select at least one break time.");
        return;
      }

      try {
        setBulkLoading(true);

        const results = await Promise.all(
          selectedIds.map(async (id) => {
            const response = await apiFetch(
              `${API_URL}/${encodeURIComponent(id)}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
              }
            );

            const result = await response.json().catch(() => ({}));

            if (!response.ok || result.success === false) {
              throw new Error(
                result.message || `Failed to update break time ${id}.`
              );
            }

            return result;
          })
        );

        setSelectedIds([]);
        setActiveDialogOpen(false);
        setInactiveDialogOpen(false);

        await refreshBreakTimes();
        await syncHrBreakTime();
        await Promise.all(
          selectedIds.map((id) => {
            const item = breakTimes.find(
              (record) => String(record.id) === String(id)
            );

            return createBreakTimeNotification({
              action: "updated",
              title: status
                ? "Break Time Activated"
                : "Break Time Deactivated",
              message: `${getBreakTimeName(item)} marked ${status ? "active" : "inactive"
                }.`,
              breaktimeId: id,
              breaktimeName: item?.name,
            });
          })
        );

        toast.success(
          `${results.length} break time(s) marked ${status ? "Active" : "Inactive"
          }.`
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to update selected break times."
        );

        await refreshBreakTimes();
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, refreshBreakTimes, breakTimes, syncHrBreakTime]
  );

  // ------------------------------------------------------
  // BULK DELETE
  // ------------------------------------------------------

  const handleBulkDelete = useCallback(async () => {
    if (!selectedIds.length) {
      toast.error("Please select at least one break time.");
      return;
    }

    try {
      setBulkLoading(true);

      const idsToDelete = [...selectedIds];

      const results = await Promise.all(
        idsToDelete.map(async (id) => {
          const response = await apiFetch(
            `${API_URL}/${encodeURIComponent(id)}`,
            { method: "DELETE" }
          );

          const result = await response.json().catch(() => ({}));

          if (!response.ok || result.success === false) {
            throw new Error(
              result.message || `Failed to delete break time ${id}.`
            );
          }

          return result;
        })
      );

      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);

      await refreshBreakTimes();
      await syncHrBreakTime();
      await Promise.all(
        idsToDelete.map((id) => {
          const item = breakTimes.find(
            (record) => String(record.id) === String(id)
          );

          return createBreakTimeNotification({
            action: "deleted",
            title: "Break Time Deleted",
            message: `${getBreakTimeName(item)} has been deleted.`,
            breaktimeId: id,
            breaktimeName: item?.name,
          });
        })
      );

      toast.success(`${results.length} break time(s) deleted.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete selected break times."
      );

      await refreshBreakTimes();
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, refreshBreakTimes, breakTimes, syncHrBreakTime]);

  // ------------------------------------------------------
  // COPY
  // ------------------------------------------------------

  const openCopyDialog = useCallback((item) => {
    setCopySourceBreakTime(item);
    setCopyBreakTimeName(`${item.name || "Break Time"} Copy`);
    setCopyDialogOpen(true);
  }, []);

  const handleConfirmCopyBreakTime = useCallback(async () => {
    if (!copySourceBreakTime) {
      toast.error("Please select a break time to copy.");
      return;
    }

    const name = copyBreakTimeName.trim();

    if (!name) {
      toast.error("Please enter a break time name.");
      return;
    }

    try {
      setCopyLoading(true);

      const {
        id,
        createdAt,
        updatedAt,
        deletedAt,
        ...sourceData
      } = copySourceBreakTime;

      const response = await apiFetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...sourceData,
          name,
          status: isActive(sourceData.status),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to copy break time."
        );
      }

      const newItem = result.data ?? result.breakTime ?? result;

      await createBreakTimeNotification({
        action: "created",
        title: "Break Time Copied",
        message: `${name} has been created from a copied break time.`,
        breaktimeId: newItem?.id,
        breaktimeName: name,
      });

      setCopyDialogOpen(false);
      setCopySourceBreakTime(null);
      setCopyBreakTimeName("");

      await refreshBreakTimes();
      await syncHrBreakTime();
      toast.success("Break time copied successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to copy break time."
      );
    } finally {
      setCopyLoading(false);
    }
  }, [
    copySourceBreakTime,
    copyBreakTimeName,
    refreshBreakTimes,
    syncHrBreakTime,
  ]);

  // ------------------------------------------------------
  // STAFF FOR EMAIL
  // ------------------------------------------------------

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
    setEmailDialogOpen(true);
  }, []);
  // ------------------------------------------------------
  // SEND EMAIL REPORT
  // ------------------------------------------------------

  const handleSendEmail = useCallback(
    async (event) => {


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

        const params = buildListParams({
          page: 1,
          limit: 10000,
        });

        const filters = {
          query: searchQuery,
          status: statusFilter,
          createdFrom,
          createdTo,
          updatedFrom,
          updatedTo,
        };

        // Send report criteria to the server. The API creates the Excel
        // attachment and sends the email.
        const response = await apiFetch(
          `${API_URL}/email-report`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              recipients: selectedRecipientEmails,
              subject: emailSubject.trim(),
              message: emailMessage,
              attachExcel,
              selectedIds,
              filters,
            }),
          }
        );

        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message || "Failed to send Break Time report."
          );
        }

        toast.success(
          result.message || "Break Time report email sent successfully."
        );

        setEmailDialogOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to send Break Time report."
        );
      } finally {
        setEmailSending(false);
      }
    },
    [
      selectedRecipientEmails,
      emailSubject,
      emailMessage,
      attachExcel,
      selectedIds,
      buildListParams,
      searchQuery,
      statusFilter,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
    ]
  );
  // Support the existing shared header buttons by ID.


  // Support shared Print, Export, and Email header buttons.
  useEffect(() => {
    const handleReportButtonClick = (event) => {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest("#Print, #Export, #Email");

      if (!button) return;

      const pathname = window.location.pathname.toLowerCase();

      if (!pathname.includes("/hr/breaktime")) return;

      event.preventDefault();
      event.stopPropagation();

      switch (button.id) {
        case "Print":
          void handlePrintBreakTimes();
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

    document.addEventListener("click", handleReportButtonClick, true);

    return () => {
      document.removeEventListener(
        "click",
        handleReportButtonClick,
        true
      );
    };
  }, [
    handlePrintBreakTimes,
    handleExportExcel,
    handleOpenEmailDialog,
  ]);

  // ------------------------------------------------------
  // COLUMNS
  // ------------------------------------------------------

  const columns = useMemo(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            aria-label="Select all break times on this page"
            checked={
              allCurrentPageSelected
                ? true
                : someCurrentPageSelected
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={toggleCurrentPageSelection}
            disabled={breakTimes.length === 0 || bulkLoading}
          />
        ),
        cell: ({ row }) => {
          const item = row.original;
          const id = String(item.id);

          return (
            <Checkbox
              aria-label={`Select ${item.name || "Break Time"}`}
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
        size: 120,
      },
      {
        accessorKey: "name",
        id: "name",
        header: ({ column }) => (
          <DataGridColumnHeader
            title="Break Time Name"
            column={column}
            visibility
          />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.original.name || "-"}</span>
        ),
        size: 200,
      },
      {
        accessorKey: "fromTime",
        id: "fromTime",
        header: ({ column }) => (
          <DataGridColumnHeader title="From Time" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2">
            <Clock3 className="size-4 text-muted-foreground" />
            {formatTime(row.original.fromTime)}
          </span>
        ),
        size: 140,
      },
      {
        accessorKey: "toTime",
        id: "toTime",
        header: ({ column }) => (
          <DataGridColumnHeader title="To Time" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2">
            <Clock3 className="size-4 text-muted-foreground" />
            {formatTime(row.original.toTime)}
          </span>
        ),
        size: 140,
      },
      {
        accessorKey: "breakType",
        id: "breakType",
        header: ({ column }) => (
          <DataGridColumnHeader title="Break Type" column={column} visibility />
        ),
        cell: ({ row }) => {
          const breakType = String(
            row.original.breakType || ""
          ).toLowerCase();

          return (
            <span
              className={
                breakType === "paid"
                  ? "font-medium text-green-600"
                  : breakType === "unpaid"
                    ? "font-medium text-orange-600"
                    : "font-medium"
              }
            >
              {breakType
                ? breakType.charAt(0).toUpperCase() + breakType.slice(1)
                : "-"}
            </span>
          );
        },
        size: 130,
      },
      {
        accessorKey: "durationMinutes",
        id: "durationMinutes",
        header: ({ column }) => (
          <DataGridColumnHeader title="Duration" column={column} visibility />
        ),
        cell: ({ row }) => {
          const duration = row.original.durationMinutes;

          return (
            <span>
              {duration !== null &&
                duration !== undefined &&
                duration !== ""
                ? `${duration} min`
                : "-"}
            </span>
          );
        },
        size: 120,
      },
      {
        accessorKey: "isFlexible",
        id: "isFlexible",
        header: ({ column }) => (
          <DataGridColumnHeader title="Flexible" column={column} visibility />
        ),
        cell: ({ row }) => (
          <span
            className={
              row.original.isFlexible
                ? "font-medium text-green-600"
                : "font-medium text-muted-foreground"
            }
          >
            {row.original.isFlexible ? "Yes" : "No"}
          </span>
        ),
        size: 110,
      },
      {
        accessorKey: "status",
        id: "status",
        header: ({ column }) => (
          <DataGridColumnHeader title="Status" column={column} visibility />
        ),
        cell: ({ row }) => {
          const active = isActive(row.original.status);

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
        size: 110,
      },
      {
        accessorKey: "createdAt",
        id: "createdAt",
        header: ({ column }) => (
          <DataGridColumnHeader title="Created" column={column} visibility />
        ),
        cell: ({ row }) => formatDate(row.original.createdAt),
        size: 150,
        meta: {
          headerTitle: "Created",
          skeleton: <Skeleton className="h-7 w-24" />,
        },
      },
      {
        accessorKey: "updatedAt",
        id: "updatedAt",
        header: ({ column }) => (
          <DataGridColumnHeader title="Updated" column={column} visibility />
        ),
        cell: ({ row }) => formatDate(row.original.updatedAt),
        size: 150,
        meta: {
          headerTitle: "Updated",
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
                <Button type="button" mode="icon" variant="ghost">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {canView && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedBreakTime(item);
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
                      setSelectedBreakTime(item);
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

                    <DropdownMenuItem onClick={() => openCopyDialog(item)}>
                      <Copy className="mr-2 size-4" />
                      Copy
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      disabled={bulkLoading}
                      onClick={() => {
                        setSelectedIds([String(item.id)]);
                        setActiveDialogOpen(true);
                      }}
                    >
                      <CheckCircle className="mr-2 size-4" />
                      Mark as Active
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      disabled={bulkLoading}
                      onClick={() => {
                        setSelectedIds([String(item.id)]);
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
                        setSelectedBreakTime(item);
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
    ],
    [
      allCurrentPageSelected,
      someCurrentPageSelected,
      toggleCurrentPageSelection,
      toggleRowSelection,
      breakTimes.length,
      selectedIds,
      bulkLoading,
      canView,
      canEdit,
      canManage,
      canDelete,
      openCopyDialog,
    ]
  );

  // ------------------------------------------------------
  // TABLE
  // ------------------------------------------------------

  const table = useReactTable({
    data: breakTimes,
    columns,
    pageCount: Math.ceil(
      (data?.pagination?.total || 0) / pagination.pageSize
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

  // ------------------------------------------------------
  // LOADING AND PERMISSIONS
  // ------------------------------------------------------

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
              You do not have permission to view break times.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  // ------------------------------------------------------
  // RENDER
  // ------------------------------------------------------

  return (
    <>
      <DataGrid
        table={table}
        recordCount={data?.pagination?.total || 0}
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
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 py-5">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2" />

              <Input
                placeholder="Search break times"
                value={searchInput}
                className="w-full pl-10 sm:w-72"
                onChange={(event) => {
                  const value = event.target.value;

                  setSearchInput(value);

                  if (!value.trim()) {
                    setSearchQuery("");
                    setPagination((previous) => ({
                      ...previous,
                      pageIndex: 0,
                    }));
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setSearchQuery(searchInput.trim());
                    setPagination((previous) => ({
                      ...previous,
                      pageIndex: 0,
                    }));
                  }
                }}
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
            </div>

            <div className="flex flex-wrap items-center gap-2">
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

              {/* DATABASE STATUS */}
              <div className="flex items-center gap-2 rounded-lg border px-3 py-1">
                <span
                  className={`size-2.5 rounded-full ${dbStatus.online ? "bg-green-500" : "bg-red-500"
                    }`}
                />

                <span className="text-xs">
                  {dbStatus.loading
                    ? "Checking..."
                    : dbStatus.online
                      ? String(dbStatus.env).toUpperCase()
                      : "Offline"}
                </span>

                <Button
                  type="button"
                  mode="icon"
                  variant="ghost"
                  className="size-7"
                  disabled={checkingDb}
                  onClick={checkDbStatus}
                  aria-label="Refresh database status"
                >
                  <RefreshCw
                    className={checkingDb ? "animate-spin" : ""}
                  />
                </Button>
              </div>

              {canManage && (
                <Button
                  type="button"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="mr-2 size-4" />
                  Add Break Time
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
      <BreakTimeAddDialog
        open={addDialogOpen}
        closeDialog={() => setAddDialogOpen(false)}
        onSuccess={async (newItem) => {
          setAddDialogOpen(false);

          await createBreakTimeNotification({
            action: "created",
            title: "Break Time Created",
            message: `${newItem?.name || "A break time"} has been created.`,
            breaktimeId: newItem?.id,
            breaktimeName: newItem?.name,
          });

          await refreshBreakTimes();
          await syncHrBreakTime();
        }}
      />

      {/* VIEW */}
      <BreakTimeViewDialog
        open={viewDialogOpen}
        BreakTime={selectedBreakTime}
        closeDialog={() => {
          setViewDialogOpen(false);
          setSelectedBreakTime(null);
        }}
      />

      {/* EDIT */}
      <BreakTimeEditDialog
        open={editDialogOpen}
        BreakTime={selectedBreakTime}
        closeDialog={() => {
          setEditDialogOpen(false);
          setSelectedBreakTime(null);
        }}
        onSuccess={async (updatedItem) => {
          await createBreakTimeNotification({
            action: "updated",
            title: "Break Time Updated",
            message: `${updatedItem?.name ||
              selectedBreakTime?.name ||
              "Break Time"
              } has been updated.`,
            breaktimeId: updatedItem?.id || selectedBreakTime?.id,
            breaktimeName: updatedItem?.name || selectedBreakTime?.name,
          });

          setEditDialogOpen(false);
          setSelectedBreakTime(null);

          await refreshBreakTimes();
          await syncHrBreakTime();
        }}
      />

      {/* DELETE */}
      <BreakTimeDeleteDialog
        open={deleteDialogOpen}
        BreakTime={selectedBreakTime}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);

          if (!open) {
            setSelectedBreakTime(null);
          }
        }}
        onSuccess={async (deletedItem) => {
          setDeleteDialogOpen(false);
          setSelectedBreakTime(null);

          await createBreakTimeNotification({
            action: "deleted",
            title: "Break Time Deleted",
            message: `${deletedItem?.name || "Break Time"} has been deleted.`,
            breaktimeId: deletedItem?.id,
            breaktimeName: deletedItem?.name,
          });

          await refreshBreakTimes();
          await syncHrBreakTime();
        }}
      />

      {/* BULK ACTIVE */}
      <BreakTimesActiveDialog
        open={activeDialogOpen}
        onOpenChange={setActiveDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={() => handleBulkStatus(true)}
      />

      {/* BULK INACTIVE */}
      <BreakTimesInactiveDialog
        open={inactiveDialogOpen}
        onOpenChange={setInactiveDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={() => handleBulkStatus(false)}
      />

      {/* BULK DELETE */}
      <BreakTimesDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={handleBulkDelete}
      />

      {/* COPY */}
      <Dialog
        open={copyDialogOpen}
        onOpenChange={(open) => {
          if (!copyLoading) {
            setCopyDialogOpen(open);

            if (!open) {
              setCopySourceBreakTime(null);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Break Time</DialogTitle>
            <DialogDescription>
              Create a new break time using the selected record's settings.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <label
              htmlFor="copy-break-time-name"
              className="mb-2 block text-sm font-medium"
            >
              New Break Time Name
            </label>

            <Input
              id="copy-break-time-name"
              value={copyBreakTimeName}
              onChange={(event) => setCopyBreakTimeName(event.target.value)}
              placeholder="Enter break time name"
              maxLength={255}
            />
          </DialogBody>

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
              disabled={copyLoading}
              onClick={handleConfirmCopyBreakTime}
            >
              {copyLoading ? "Copying..." : "Copy Break Time"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <DialogTitle>Email Break Times</DialogTitle>
              <DialogDescription>
                Select recipients and send the break times report.
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
                    htmlFor="breaktime-subject"
                    className="text-sm font-medium"
                  >
                    Subject
                  </label>
                  <Input
                    id="breaktime-subject"
                    required
                    value={emailSubject}
                    onChange={(event) => setEmailSubject(event.target.value)}
                    placeholder="Break Times Report"
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
                        Attach the break time report as an Excel file (.xlsx)
                        to the email.
                      </span>
                    </span>
                    <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                  </label>
                </div>
                {/* Email Message */}

                <div className="space-y-2">
                  <label
                    htmlFor="breaktime-message"
                    className="text-sm font-medium"
                  >
                    Message
                  </label>
                  <ScrollArea className="h-[150px] w-full">
                    <Textarea
                      id="breaktime-message"
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