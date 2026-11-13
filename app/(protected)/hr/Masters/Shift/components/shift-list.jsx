"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";
import * as XLSX from "xlsx";
import {
  Ellipsis,
  CheckCircle,
  Copy,
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

import ShiftAddDialog from "./shift-add-dialog";
import ShiftEditDialog from "./shift-edit-dialog";
import ShiftDeleteDialog from "./shift-delete-dialog";
import ShiftViewDialog from "./shift-view-dialog";
import { StoreClientFiltersSheet } from "./sheet/filters-sheet";
import ShiftsActiveDialog from "./shifts-active-dialog";
import ShiftsInactiveDialog from "./shifts-inactive-dialog";
import ShiftsDeleteDialog from "./shifts-delete-dialog";

/* -------------------------------------------------------
   HELPERS
------------------------------------------------------- */

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleDateString();
};

const formatTime = (value) => {
  if (!value) return "-";

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(
    String(value),
  );

  if (!match) return String(value);

  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;

  return `${displayHour}:${minutes} ${suffix}`;
};

const isShiftActive = (status) =>
  status === true ||
  status === 1 ||
  ["true", "1", "active"].includes(
    String(status ?? "").trim().toLowerCase(),
  );

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[char];
  });

const createShiftNotification = async ({
  action,
  title,
  message,
  shiftId,
  shiftName,
}) => {
  try {
    const response = await apiFetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        module: "hr",
        action,
        title,
        message,
        entityId:
          shiftId !== null && shiftId !== undefined
            ? String(shiftId)
            : null,
        entityType: "shift",
        entityName: shiftName || "Shift",
        url: "/hr/Shift",
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.success === false) {
      throw new Error(
        result?.message || "Notification failed",
      );
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("notifications-refresh"),
      );
    }

    return result;
  } catch (error) {
    // Notification failures should not interrupt CRUD operations.
    console.error("SHIFT NOTIFICATION ERROR:", error);
    return null;
  }
};

/* -------------------------------------------------------
   MAIN COMPONENT
------------------------------------------------------- */

export default function ShiftList() {
  const queryClient = useQueryClient();

  const {
    data: session,
    status: sessionStatus,
  } = useSession();

  /* -----------------------------------------------------
     PERMISSIONS
  ----------------------------------------------------- */

  const userPermissions = useMemo(
    () => session?.user?.permissions || [],
    [session],
  );

  const canView = can("shift.view", userPermissions);
  const canManage = can("shift.manage", userPermissions);
  const canEdit = can("shift.edit", userPermissions);
  const canDelete = can("shift.delete", userPermissions);

  /* -----------------------------------------------------
     TABLE STATE
  ----------------------------------------------------- */

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

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");

  /* -----------------------------------------------------
     MULTIPLE SELECTION
  ----------------------------------------------------- */

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] =
    useState(false);

  const [activeDialogOpen, setActiveDialogOpen] =
    useState(false);

  const [inactiveDialogOpen, setInactiveDialogOpen] =
    useState(false);

  /* -----------------------------------------------------
     CONNECTION STATUS
  ----------------------------------------------------- */

  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined"
      ? true
      : navigator.onLine,
  );

  const [dbStatus, setDbStatus] = useState({
    env: "local",
    online: false,
    loading: true,
  });

  const [checkingDb, setCheckingDb] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);
  /* -----------------------------------------------------
     CRUD DIALOG STATE
  ----------------------------------------------------- */

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] =
    useState(false);

  const [selectedShift, setSelectedShift] = useState(null);

  /* -----------------------------------------------------
     COPY SHIFT STATE
  ----------------------------------------------------- */

  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copySourceShift, setCopySourceShift] = useState(null);
  const [copyShiftName, setCopyShiftName] = useState("");
  const [copyLoading, setCopyLoading] = useState(false);

  /* -----------------------------------------------------
     EMAIL REPORT STATE
  ----------------------------------------------------- */

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] =
    useState("Shift Report");

  const [emailMessage, setEmailMessage] = useState(
    "Dear Team,\n\nPlease find the Shift report attached for your review.\n\n",
  );

  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const [selectedRecipientEmails, setSelectedRecipientEmails] =
    useState([]);

  const [attachExcel, setAttachExcel] = useState(true);
  const [emailSending, setEmailSending] = useState(false);
  const syncHrShift = useCallback(async () => {
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
      console.error("Shift SYNC ERROR", error);
      toast.error(error.message || "Hr sync failed");
      return null;
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);
  /* -----------------------------------------------------
     DATABASE STATUS CHECK
  ----------------------------------------------------- */

  const checkDbStatus = useCallback(async () => {
    if (
      typeof navigator !== "undefined" &&
      !navigator.onLine
    ) {
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

  /* -----------------------------------------------------
     QUERY PARAMETERS
  ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     FETCH SHIFTS
  ----------------------------------------------------- */

  const fetchShifts = useCallback(async () => {
    const params = buildListParams({
      page: pagination.pageIndex + 1,
      limit: pagination.pageSize,
    });

    const response = await apiFetch(
      `/api/hr/Shift?${params.toString()}`,
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || "Failed to load shifts.",
      );
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
      "shift-shifts",
      pagination,
      sorting,
      searchQuery,
      statusFilter,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
    ],
    queryFn: fetchShifts,
    enabled:
      sessionStatus === "authenticated" && canView,
    staleTime: 0,
  });

  useEffect(() => {
    if (error) {
      toast.error(
        error.message || "Failed to load shifts.",
      );
    }
  }, [error]);

  const shifts = useMemo(
    () => (Array.isArray(data?.data) ? data.data : []),
    [data],
  );

  /* -----------------------------------------------------
     ROW SELECTION
  ----------------------------------------------------- */

  const currentPageIds = useMemo(
    () => shifts.map((shift) => String(shift.id)),
    [shifts],
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
        ? previous.filter(
          (id) => !currentPageIds.includes(id),
        )
        : [
          ...new Set([
            ...previous,
            ...currentPageIds,
          ]),
        ],
    );
  }, [allCurrentPageSelected, currentPageIds]);

  /* -----------------------------------------------------
     REFRESH SHIFTS
  ----------------------------------------------------- */

  const refreshShifts = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["shift-shifts"],
    });
  }, [queryClient]);

  /* -----------------------------------------------------
     REPORT DATA
  ----------------------------------------------------- */

  const getShiftReportRows = useCallback(async () => {
    const params = buildListParams({
      page: 1,
      limit: 10000,
    });

    if (selectedIds.length > 0) {
      params.set("query", "");
      params.set("status", "all");
      params.set("createdFrom", "");
      params.set("createdTo", "");
      params.set("updatedFrom", "");
      params.set("updatedTo", "");
    }

    const response = await apiFetch(
      `/api/hr/Shift?${params.toString()}`,
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result.success === false) {
      throw new Error(
        result.message || "Failed to load shifts.",
      );
    }

    const items = Array.isArray(result.data)
      ? result.data
      : [];

    if (selectedIds.length === 0) {
      return items;
    }

    const selectedSet = new Set(selectedIds.map(String));

    return items.filter((shift) =>
      selectedSet.has(String(shift.id)),
    );
  }, [selectedIds, buildListParams]);

  /* -----------------------------------------------------
     BUILD EXCEL WORKBOOK
  ----------------------------------------------------- */

  const buildShiftExcel = useCallback((items) => {
    const rows = items.map((shift) => ({
      ID: shift.id,
      "Shift Name": shift.name || "",
      "In Time": formatTime(shift.inTime),
      "Out Time": formatTime(shift.outTime),
      Overnight: shift.crossesMidnight ? "Yes" : "No",
      "Grace Time (min)": shift.graceTime ?? 0,
      "Early In (min)": shift.earlyInMinutes ?? 0,
      "Late Out (min)": shift.lateOutMinutes ?? 0,
      "Half Day (min)": shift.halfDayMinutes ?? 240,
      "Full Day (min)": shift.fullDayMinutes ?? 480,
      Description: shift.description || "",
      Status: isShiftActive(shift.status)
        ? "Active"
        : "Inactive",
      "Created Date": shift.createdAt
        ? new Date(shift.createdAt).toLocaleString()
        : "",
      "Updated Date": shift.updatedAt
        ? new Date(shift.updatedAt).toLocaleString()
        : "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Shifts",
    );

    return workbook;
  }, []);

  /* -----------------------------------------------------
     EXPORT EXCEL
  ----------------------------------------------------- */

  const handleExportExcel = useCallback(async () => {
    try {
      const items = await getShiftReportRows();

      if (!items.length) {
        toast.error("No shifts to export.");
        return;
      }

      XLSX.writeFile(
        buildShiftExcel(items),
        "shifts.xlsx",
      );

      toast.success(`${items.length} shift(s) exported.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Excel export failed.",
      );
    }
  }, [getShiftReportRows, buildShiftExcel]);

  /* -----------------------------------------------------
     PRINT SHIFTS
  ----------------------------------------------------- */

  const handlePrintShifts = useCallback(async () => {

    try {
      const items = await getShiftReportRows();

      if (!items.length) {
        printWindow.close();
        toast.error("No shifts to print.");
        return;
      }
      const rows = items
        .map(
          (shift) => `
            <tr>
              <td>${escapeHtml(shift.id)}</td>
              <td>${escapeHtml(shift.name || "-")}</td>
              <td>${escapeHtml(formatTime(shift.inTime))}</td>
              <td>${escapeHtml(formatTime(shift.outTime))}</td>
              <td>${shift.crossesMidnight ? "Yes" : "No"}</td>
              <td>${Number(shift.graceTime ?? 0)} min</td>
              <td>${isShiftActive(shift.status) ? "Active" : "Inactive"}</td>
            </tr>
          `,
        )
        .join("");

      const printWindow = window.open(
        "",
        "_blank",
        "width=1200,height=800",
      );

      if (!printWindow) {
        toast.error(
          "Please allow pop-ups to print the report.",
        );
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Shift Report</title>
            <meta charset="UTF-8" />
            <style>
              body {
                font-family: Arial, sans-serif;
                padding: 24px;
                color: #222;
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
                font-size: 12px;
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
            <h1>Shift Report</h1>
            <p>Generated: ${escapeHtml(
        new Date().toLocaleString(),
      )}</p>
            <p>Total records: ${items.length}</p>

            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Shift Name</th>
                  <th>In Time</th>
                  <th>Out Time</th>
                  <th>Overnight</th>
                  <th>Grace</th>
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
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to print shifts.",
      );
    }
  }, [getShiftReportRows]);

  /* -----------------------------------------------------
     BULK ACTIVE / INACTIVE
  ----------------------------------------------------- */

  const handleBulkStatus = useCallback(
    async (status) => {
      if (!selectedIds.length) {
        toast.error("Please select at least one shift.");
        return;
      }

      try {
        setBulkLoading(true);

        const results = await Promise.all(
          selectedIds.map(async (id) => {
            const response = await apiFetch(
              `/api/hr/Shift/${encodeURIComponent(id)}`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ status }),
              },
            );

            const result = await response
              .json()
              .catch(() => ({}));

            if (
              !response.ok ||
              result.success === false
            ) {
              throw new Error(
                result.message ||
                `Failed to update shift ${id}.`,
              );
            }

            return result;
          }),
        );

        setSelectedIds([]);
        setActiveDialogOpen(false);
        setInactiveDialogOpen(false);

        await refreshShifts();
        await syncHrShift();
        toast.success(
          `${results.length} shift(s) marked ${status ? "Active" : "Inactive"
          }.`,
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to update selected shifts.",
        );

        await refreshShifts();
      } finally {
        setBulkLoading(false);
      }
    },
    [selectedIds, refreshShifts, syncHrShift],
  );

  /* -----------------------------------------------------
     BULK DELETE
  ----------------------------------------------------- */

  const handleBulkDelete = useCallback(async () => {
    if (!selectedIds.length) {
      toast.error("Please select at least one shift.");
      return;
    }

    try {
      setBulkLoading(true);

      const results = await Promise.all(
        selectedIds.map(async (id) => {
          const response = await apiFetch(
            `/api/hr/Shift/${encodeURIComponent(id)}`,
            { method: "DELETE" },
          );

          const result = await response
            .json()
            .catch(() => ({}));

          if (
            !response.ok ||
            result.success === false
          ) {
            throw new Error(
              result.message ||
              `Failed to delete shift ${id}.`,
            );
          }

          return result;
        }),
      );

      setSelectedIds([]);
      setBulkDeleteDialogOpen(false);

      await refreshShifts();
      await syncHrShift();
      toast.success(`${results.length} shift(s) deleted.`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to delete selected shifts.",
      );

      await refreshShifts();
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, refreshShifts, syncHrShift]);

  /* -----------------------------------------------------
     COPY SHIFT
  ----------------------------------------------------- */

  const openCopyDialog = useCallback((shift) => {
    setCopySourceShift(shift);
    setCopyShiftName(`${shift.name || "Shift"} Copy`);
    setCopyDialogOpen(true);
  }, []);

  const handleConfirmCopyShift = useCallback(async () => {
    if (!copySourceShift) {
      toast.error("Please select a shift to copy.");
      return;
    }

    const name = copyShiftName.trim();

    if (!name) {
      toast.error("Please enter a shift name.");
      return;
    }

    try {
      setCopyLoading(true);

      const {
        id,
        createdAt,
        updatedAt,
        ...shiftData
      } = copySourceShift;

      const response = await apiFetch("/api/hr/Shift", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...shiftData,
          name,
        }),
      });

      const result = await response
        .json()
        .catch(() => ({}));

      if (
        !response.ok ||
        result.success === false
      ) {
        throw new Error(
          result.message || "Failed to copy shift.",
        );
      }

      const newShift =
        result.data ?? result.shift ?? result;

      await createShiftNotification({
        action: "created",
        title: "Shift Copied",
        message: `${name} has been created from a copied shift.`,
        shiftId: newShift?.id,
        shiftName: name,
      });

      setCopyDialogOpen(false);
      setCopySourceShift(null);
      setCopyShiftName("");

      await refreshShifts();
      await syncHrShift();
      toast.success("Shift copied successfully.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to copy shift.",
      );
    } finally {
      setCopyLoading(false);
    }
  }, [
    copySourceShift,
    copyShiftName,
    refreshShifts,
    syncHrShift,
  ]);

  /* -----------------------------------------------------
     LOAD STAFF FOR EMAIL REPORT
  ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     SEND EMAIL REPORT
  ----------------------------------------------------- */

  const handleSendEmail = useCallback(
    async (event) => {

      if (!selectedRecipientEmails.length) {
        toast.error(
          "Please select at least one recipient.",
        );
        return;
      }

      if (!emailSubject.trim()) {
        toast.error("Please enter an email subject.");
        return;
      }

      try {
        setEmailSending(true);

        const shiftsForReport =
          await getShiftReportRows();

        if (!shiftsForReport.length) {
          toast.error("No shifts found for the report.");
          return;
        }

        let attachment = null;

        if (attachExcel) {
          const workbook =
            buildShiftExcel(shiftsForReport);

          const arrayBuffer = XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array",
          });

          const bytes = new Uint8Array(arrayBuffer);
          let binary = "";

          for (
            let offset = 0;
            offset < bytes.length;
            offset += 8192
          ) {
            binary += String.fromCharCode(
              ...bytes.subarray(offset, offset + 8192),
            );
          }

          attachment = {
            filename: "shifts.xlsx",
            content: btoa(binary),
            contentType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          };
        }

        const response = await apiFetch(
          "/api/hr/Shift/email-report",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              recipients: selectedRecipientEmails,
              subject: emailSubject.trim(),
              message: emailMessage,
              shifts: shiftsForReport,
              attachment,
            }),
          },
        );

        const result = await response
          .json()
          .catch(() => ({}));

        if (
          !response.ok ||
          result.success === false
        ) {
          throw new Error(
            result.message ||
            "Failed to send shift report.",
          );
        }

        toast.success(
          "Shift report email sent successfully.",
        );

        setEmailDialogOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to send shift report.",
        );
      } finally {
        setEmailSending(false);
      }
    },
    [
      selectedRecipientEmails,
      emailSubject,
      emailMessage,
      getShiftReportRows,
      attachExcel,
      buildShiftExcel,
    ],
  );

  /* -----------------------------------------------------
     ONLINE / OFFLINE EVENTS
  ----------------------------------------------------- */

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);

      await checkDbStatus();

      queryClient.invalidateQueries({
        queryKey: ["shift-shifts"],
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

    setIsOnline(
      typeof navigator === "undefined"
        ? true
        : navigator.onLine,
    );

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener(
        "online",
        handleOnline,
      );

      window.removeEventListener(
        "offline",
        handleOffline,
      );
    };
  }, [checkDbStatus, queryClient]);
  /* -------------------------------------------------------
   OPEN EMAIL REPORT DIALOG
------------------------------------------------------- */

  const handleOpenEmailDialog = useCallback(() => {
    setSelectedRecipientEmails([]);
    setEmailDialogOpen(true);
  }, []);
  useEffect(() => {
    checkDbStatus();

    const interval = setInterval(
      checkDbStatus,
      30000,
    );

    return () => clearInterval(interval);
  }, [checkDbStatus]);

  // Support the existing shared header buttons by ID.

  useEffect(() => {
    const handleReportButtonClick = (event) => {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest(
        "#Print, #Export, #Email"
      );

      if (!button) return;

      // Run these actions only on the Shift page.
      const pathname = window.location.pathname.toLowerCase();

      if (!pathname.includes("/hr/shift")) return;

      event.preventDefault();
      event.stopPropagation();

      switch (button.id) {
        case "Print":
          void handlePrintShifts();
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
      document.removeEventListener(
        "click",
        handleReportButtonClick
      );
    };
  }, [
    handlePrintShifts,
    handleExportExcel,
    handleOpenEmailDialog,
  ]);


  const columns = useMemo(
    () => [
      {
        id: "select",

        header: () => (
          <Checkbox
            aria-label="Select all shifts on this page"
            checked={allCurrentPageSelected}
            onCheckedChange={toggleCurrentPageSelection}
            disabled={
              shifts.length === 0 || bulkLoading
            }
          />
        ),

        cell: ({ row }) => {
          const item = row.original;
          const id = String(item.id);

          return (
            <Checkbox
              aria-label={`Select ${item.name || "Shift"}`}
              checked={selectedIds.includes(id)}
              disabled={bulkLoading}
              onCheckedChange={() =>
                toggleRowSelection(id)
              }
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

        size: 110,
      },

      {
        accessorKey: "name",
        id: "name",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Shift Name"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.name}
          </span>
        ),

        size: 180,
      },

      {
        accessorKey: "inTime",
        id: "inTime",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="In Time"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          formatTime(row.original.inTime),

        size: 120,
      },

      {
        accessorKey: "outTime",
        id: "outTime",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Out Time"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          formatTime(row.original.outTime),

        size: 120,
      },

      {
        accessorKey: "crossesMidnight",
        id: "crossesMidnight",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Overnight"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) => (
          <span>
            {row.original.crossesMidnight
              ? "Yes"
              : "No"}
          </span>
        ),

        size: 110,
      },

      {
        accessorKey: "graceTime",
        id: "graceTime",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Grace (min)"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          `${row.original.graceTime ?? 0} min`,

        size: 120,
      },

      {
        accessorKey: "earlyInMinutes",
        id: "earlyInMinutes",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Early In (min)"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          `${row.original.earlyInMinutes ?? 0} min`,

        size: 130,
      },

      {
        accessorKey: "lateOutMinutes",
        id: "lateOutMinutes",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Late Out (min)"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          `${row.original.lateOutMinutes ?? 0} min`,

        size: 130,
      },

      {
        accessorKey: "halfDayMinutes",
        id: "halfDayMinutes",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Half Day (min)"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          `${row.original.halfDayMinutes ?? 240} min`,

        size: 130,
      },

      {
        accessorKey: "fullDayMinutes",
        id: "fullDayMinutes",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Full Day (min)"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          `${row.original.fullDayMinutes ?? 480} min`,

        size: 130,
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

        cell: ({ row }) => {
          const description =
            row.original.description || "-";

          return (
            <span title={description}>
              {description.length > 60
                ? `${description.slice(0, 60)}...`
                : description}
            </span>
          );
        },

        enableSorting: false,
        size: 240,
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

        cell: ({ row }) => {
          const active = isShiftActive(
            row.original.status,
          );

          return (
            <span
              className={
                active
                  ? "text-green-600"
                  : "text-red-600"
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
          <DataGridColumnHeader
            title="Created"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          formatDate(row.original.createdAt),

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
          <DataGridColumnHeader
            title="Updated"
            column={column}
            visibility
          />
        ),

        cell: ({ row }) =>
          formatDate(row.original.updatedAt),

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
                <Button
                  type="button"
                  mode="icon"
                  variant="ghost"
                  aria-label="Shift actions"
                >
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {canView && (
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedShift(item);
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
                      setSelectedShift(item);
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

                    <DropdownMenuItem
                      onClick={() =>
                        openCopyDialog(item)
                      }
                    >
                      <Copy className="mr-2 size-4" />
                      Copy
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      disabled={bulkLoading}
                      onClick={() => {
                        setSelectedIds([
                          String(item.id),
                        ]);

                        setActiveDialogOpen(true);
                      }}
                    >
                      <CheckCircle className="mr-2 size-4" />
                      Mark as Active
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      disabled={bulkLoading}
                      onClick={() => {
                        setSelectedIds([
                          String(item.id),
                        ]);

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
                        setSelectedShift(item);
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
      canView,
      canManage,
      canEdit,
      canDelete,
      bulkLoading,
      selectedIds,
      shifts.length,
      allCurrentPageSelected,
      toggleCurrentPageSelection,
      toggleRowSelection,
      openCopyDialog,
    ],
  );

  /* -----------------------------------------------------
     TABLE INSTANCE
  ----------------------------------------------------- */

  const table = useReactTable({
    data: shifts,
    columns,

    pageCount: Math.ceil(
      (data?.pagination?.total || 0) /
      pagination.pageSize,
    ),

    state: {
      pagination,
      sorting,
    },

    onPaginationChange: setPagination,

    onSortingChange: (updater) => {
      setSorting((previous) =>
        typeof updater === "function"
          ? updater(previous)
          : updater,
      );

      setPagination((previous) => ({
        ...previous,
        pageIndex: 0,
      }));
    },

    getCoreRowModel: getCoreRowModel(),

    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  /* -----------------------------------------------------
     LOADING STATE
  ----------------------------------------------------- */

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

  /* -----------------------------------------------------
     PERMISSION CHECK
  ----------------------------------------------------- */

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <div>
            <h3 className="text-lg font-semibold">
              Access Denied
            </h3>

            <p className="mt-1 text-sm text-muted-foreground">
              You do not have permission to view shifts.
            </p>
          </div>
        </CardHeader>
      </Card>
    );
  }

  /* -----------------------------------------------------
     MAIN UI
  ----------------------------------------------------- */

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
            {/* SEARCH */}
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2" />

              <Input
                placeholder="Search shifts"
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
              {/* BULK ACTIONS */}
              {(canManage || canEdit) &&
                selectedIds.length > 0 && (
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

              {canDelete && selectedIds.length > 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={bulkLoading}
                  onClick={() =>
                    setBulkDeleteDialogOpen(true)
                  }
                >
                  <Trash2 className="mr-2 size-4" />
                  {selectedIds.length} Delete Selected
                </Button>
              )}

              {/* DATABASE STATUS */}
              <div className="flex items-center gap-2 rounded-lg border px-3 py-1">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${dbStatus.online && isOnline
                    ? "bg-green-500"
                    : "bg-red-500"
                    }`}
                />

                <span className="text-xs">
                  {dbStatus.loading
                    ? "Checking..."
                    : dbStatus.online && isOnline
                      ? String(
                        dbStatus.env,
                      ).toUpperCase()
                      : "Offline"}
                </span>

                <Button
                  type="button"
                  mode="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  disabled={checkingDb}
                  onClick={checkDbStatus}
                  aria-label="Refresh connection status"
                >
                  <RefreshCw
                    className={
                      checkingDb ? "animate-spin" : ""
                    }
                  />
                </Button>
              </div>

              {/* ADD SHIFT */}
              {canManage && (
                <Button
                  type="button"
                  onClick={() =>
                    setAddDialogOpen(true)
                  }
                >
                  <Plus className="mr-1 size-4" />
                  Add Shift
                </Button>
              )}

              {/* FILTERS */}
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

          {/* TABLE */}
          <CardTable>
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardTable>

          {/* PAGINATION */}
          <CardFooter>
            <DataGridPagination />
          </CardFooter>
        </Card>
      </DataGrid>

      {/* -------------------------------------------------
          ADD SHIFT DIALOG
      ------------------------------------------------- */}

      <ShiftAddDialog
        open={addDialogOpen}
        closeDialog={() => setAddDialogOpen(false)}
        onSuccess={async (newShift) => {
          setAddDialogOpen(false);

          await createShiftNotification({
            action: "created",
            title: "Shift Created",
            message: `${newShift?.name || "A shift"
              } has been created.`,
            shiftId: newShift?.id,
            shiftName: newShift?.name,
          });

          await refreshShifts();
          await syncHrShift();
        }}
      />

      {/* -------------------------------------------------
          VIEW SHIFT DIALOG
      ------------------------------------------------- */}

      <ShiftViewDialog
        open={viewDialogOpen}
        Shift={selectedShift}
        closeDialog={() => {
          setViewDialogOpen(false);
          setSelectedShift(null);
        }}
      />

      {/* -------------------------------------------------
          EDIT SHIFT DIALOG
      ------------------------------------------------- */}

      <ShiftEditDialog
        open={editDialogOpen}
        Shift={selectedShift}
        closeDialog={() => {
          setEditDialogOpen(false);
          setSelectedShift(null);
        }}
        onSuccess={async (updatedShift) => {
          setEditDialogOpen(false);

          await createShiftNotification({
            action: "updated",
            title: "Shift Updated",
            message: `${updatedShift?.name ||
              selectedShift?.name ||
              "Shift"
              } has been updated.`,
            shiftId:
              updatedShift?.id ??
              selectedShift?.id,
            shiftName:
              updatedShift?.name ||
              selectedShift?.name,
          });

          setSelectedShift(null);

          await refreshShifts();
          await syncHrShift();
        }}
      />

      {/* -------------------------------------------------
          DELETE SHIFT DIALOG
      ------------------------------------------------- */}

      <ShiftDeleteDialog
        open={deleteDialogOpen}
        Shift={selectedShift}
        closeDialog={() => {
          setDeleteDialogOpen(false);
          setSelectedShift(null);
        }}
        onSuccess={async () => {
          await createShiftNotification({
            action: "deleted",
            title: "Shift Deleted",
            message: `${selectedShift?.name || "Shift"
              } has been deleted.`,
            shiftId: selectedShift?.id,
            shiftName: selectedShift?.name,
          });

          await refreshShifts();
          await syncHrShift();
          setDeleteDialogOpen(false);
          setSelectedShift(null);
        }}
      />

      {/* -------------------------------------------------
          COPY SHIFT DIALOG
      ------------------------------------------------- */}

      <Dialog
        open={copyDialogOpen}
        onOpenChange={(open) => {
          if (!copyLoading) {
            setCopyDialogOpen(open);

            if (!open) {
              setCopySourceShift(null);
              setCopyShiftName("");
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Copy Shift</DialogTitle>

            <DialogDescription>
              Create a new shift using the selected
              shift&apos;s settings.
            </DialogDescription>
          </DialogHeader>

          <DialogBody>
            <div className="space-y-2">
              <label
                htmlFor="copy-shift-name"
                className="text-sm font-medium"
              >
                New Shift Name
              </label>

              <Input
                id="copy-shift-name"
                value={copyShiftName}
                onChange={(event) =>
                  setCopyShiftName(event.target.value)
                }
                placeholder="Enter shift name"
              />
            </div>
          </DialogBody>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={copyLoading}
              onClick={() => {
                setCopyDialogOpen(false);
                setCopySourceShift(null);
                setCopyShiftName("");
              }}
            >
              Cancel
            </Button>

            <Button
              type="button"
              disabled={
                copyLoading ||
                !copyShiftName.trim()
              }
              onClick={handleConfirmCopyShift}
            >
              {copyLoading
                ? "Copying..."
                : "Copy Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------
          BULK ACTIVE DIALOG
      ------------------------------------------------- */}

      <ShiftsActiveDialog
        open={activeDialogOpen}
        onOpenChange={setActiveDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={() => handleBulkStatus(true)}
      />

      {/* -------------------------------------------------
          BULK INACTIVE DIALOG
      ------------------------------------------------- */}

      <ShiftsInactiveDialog
        open={inactiveDialogOpen}
        onOpenChange={setInactiveDialogOpen}
        selectedCount={selectedIds.length}
        loading={bulkLoading}
        onConfirm={() => handleBulkStatus(false)}
      />

      {/* -------------------------------------------------
          BULK DELETE DIALOG
      ------------------------------------------------- */}

      <ShiftsDeleteDialog
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
            <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
              <DialogTitle>Email Shifts</DialogTitle>
              <DialogDescription>
                Select recipients and send the shifts report.
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
                    htmlFor="shift-subject"
                    className="text-sm font-medium"
                  >
                    Subject
                  </label>
                  <Input
                    id="shift-subject"
                    required
                    value={emailSubject}
                    onChange={(event) => setEmailSubject(event.target.value)}
                    placeholder="Shifts Report"
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
                        Attach the shift report as an Excel file (.xlsx)
                        to the email.
                      </span>
                    </span>
                    <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                  </label>
                </div>
                {/* Email Message */}
                <div className="space-y-2">
                  <label
                    htmlFor="shift-message"
                    className="text-sm font-medium"
                  >
                    Message
                  </label>
                  <ScrollArea className="h-[150px] w-full">
                    <Textarea
                      id="shift-message"
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