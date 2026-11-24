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
  FileSpreadsheet,
  Funnel,
  Info,
  Mail,
  RefreshCw,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { DataGrid } from "@/components/ui/data-grid";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridColumnVisibility } from '@/components/ui/data-grid-column-visibility';
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from "@remixicon/react";

import { StoreClientFiltersSheet } from "./sheet/filters-sheet";

// =====================================================
// CONSTANTS
// =====================================================

const CHANGE_LOG_API = "/api/inventory/inventroy-change-log";
const STAFF_API = "/api/staff?limit=10000";
const EMAIL_API = `${CHANGE_LOG_API}/email-report`;

const PAGE_SIZE = 10;

// =====================================================
// TOAST HELPERS
// =====================================================

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
        close={true}
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

// =====================================================
// HELPERS
// =====================================================

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getRows = (result) => {
  if (Array.isArray(result)) return result;
  if (Array.isArray(result?.data)) return result.data;
  if (Array.isArray(result?.data?.items)) return result.data.items;
  if (Array.isArray(result?.items)) return result.items;
  if (Array.isArray(result?.data?.staff)) return result.data.staff;

  return [];
};

const getErrorMessage = (error, fallback) =>
  error instanceof Error ? error.message : fallback;

const getStaffName = (person) =>
  person.name ||
  person.fullName ||
  [person.firstName, person.lastName].filter(Boolean).join(" ") ||
  person.username ||
  person.email ||
  "Staff member";

const getStaffRows = (result) =>
  getRows(result)
    .map((person) => ({
      id: person.id,
      name: getStaffName(person),
      email: person.email || person.workEmail || "",
    }))
    .filter((person) => person.email);

// =====================================================
// COMPONENT
// =====================================================

export default function InventoryChangeLogList() {
  const queryClient = useQueryClient();

  // =================================================
  // TABLE STATE
  // =================================================

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const [sorting, setSorting] = useState([
    {
      id: "createdAt",
      desc: true,
    },
  ]);

  const [rowSelection, setRowSelection] = useState({});

  // =================================================
  // SEARCH AND FILTER STATE
  // =================================================

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [itemIds, setItemIds] = useState([]);

  // These states are retained for the existing filter sheet.
  // The current GET route does not process these filters.
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [groupFilter, setGroupFilter] = useState([]);
  const [itemTypeFilter, setItemTypeFilter] = useState([]);
  const [actionFilter, setActionFilter] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // =================================================
  // DIALOG AND EMAIL STATE
  // =================================================

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedRecipientEmails, setSelectedRecipientEmails] = useState([]);
  const [recipientSearch, setRecipientSearch] = useState("");

  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [attachExcel, setAttachExcel] = useState(true);
  const [emailSending, setEmailSending] = useState(false);

  // =================================================
  // REPORT STATE
  // =================================================

  const [reportLoading, setReportLoading] = useState(false);

  // =================================================
  // CONNECTION STATE
  // =================================================

  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  const [dbStatus, setDbStatus] = useState({
    env: "local",
    online: false,
    loading: true,
  });

  const [checkingDb, setCheckingDb] = useState(false);

  // =================================================
  // DETAILS DIALOG STATE
  // =================================================

  const [selectedDetails, setSelectedDetails] = useState("");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // =================================================
  // FILTER HELPERS
  // =================================================

  const hasFilters =
    Boolean(searchInput.trim()) ||
    Boolean(searchQuery) ||
    itemIds.length > 0 ||
    Boolean(dateFrom) ||
    Boolean(dateTo);

  const resetPageAndSelection = useCallback(() => {
    setPagination((previous) => ({
      ...previous,
      pageIndex: 0,
    }));

    setRowSelection({});
  }, []);

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams();

    if (searchQuery) {
      params.set("search", searchQuery);
    }

    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    itemIds.forEach((id) => {
      params.append("itemId", String(id));
    });

    return params;
  }, [searchQuery, dateFrom, dateTo, itemIds]);

  // =================================================
  // SEARCH
  // =================================================

  const handleSearch = (event) => {
    event?.preventDefault();

    setSearchQuery(searchInput.trim());
    resetPageAndSelection();
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    resetPageAndSelection();
  };

  // =================================================
  // CLEAR FILTERS
  // =================================================

  const clearFilters = () => {
    setSearchInput("");
    setSearchQuery("");

    setItemIds([]);
    setSelectedUserIds([]);
    setGroupFilter([]);
    setItemTypeFilter([]);
    setActionFilter("");

    setDateFrom("");
    setDateTo("");

    setRowSelection({});

    setPagination((previous) => ({
      ...previous,
      pageIndex: 0,
    }));
  };

  // =================================================
  // FILTER OPTIONS QUERY
  // =================================================

  const {
    data: filterOptions = {},
    isLoading: optionsLoading,
  } = useQuery({
    queryKey: ["inventory-change-log-filter-options"],

    queryFn: async () => {
      const loadOptions = async (url, label) => {
        const response = await apiFetch(url);
        const result = await response.json();

        if (!response.ok || result?.success === false) {
          throw new Error(
            result?.message || `Failed to load ${label}`
          );
        }

        return getRows(result);
      };

      const [items, groups, types, users] = await Promise.all([
        loadOptions(
          "/api/inventory/item-master?limit=10000&sort=ItemName&dir=asc",
          "items"
        ),
        loadOptions(
          "/api/inventory/item-groups?limit=10000",
          "item groups"
        ),
        loadOptions(
          "/api/inventory/product-type?limit=10000",
          "item types"
        ),
        loadOptions(STAFF_API, "staff"),
      ]);

      return {
        items,
        groups,
        types,
        users,
      };
    },

    staleTime: 5 * 60 * 1000,
  });

  const itemOptions = filterOptions.items || [];
  const groupOptions = filterOptions.groups || [];
  const itemTypeOptions = filterOptions.types || [];
  const userOptions = filterOptions.users || [];

  // =================================================
  // CHANGE LOG QUERY KEY
  // =================================================

  const changeLogQueryKey = useMemo(
    () => [
      "inventory-change-log",
      {
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        sorting,
        searchQuery,
        dateFrom,
        dateTo,
        itemIds,
      },
    ],
    [
      pagination.pageIndex,
      pagination.pageSize,
      sorting,
      searchQuery,
      dateFrom,
      dateTo,
      itemIds,
    ]
  );

  // =================================================
  // CHANGE LOG QUERY
  // =================================================

  const {
    data: changeLogData,
    isLoading,
    isFetching,
    error: changeLogError,
    refetch: refetchChangeLogs,
  } = useQuery({
    queryKey: changeLogQueryKey,

    queryFn: async () => {
      const params = buildFilterParams();

      params.set("page", String(pagination.pageIndex + 1));
      params.set("limit", String(pagination.pageSize));

      if (sorting.length > 0) {
        params.set("sort", sorting[0].id);
        params.set("dir", sorting[0].desc ? "desc" : "asc");
      } else {
        params.set("sort", "createdAt");
        params.set("dir", "desc");
      }

      const response = await fetch(
        `${CHANGE_LOG_API}?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || "Failed to fetch change logs"
        );
      }

      const rows = getRows(result);

      return {
        rows,
        pagination: result?.pagination || {
          total: rows.length,
          totalPages: 1,
        },
      };
    },

    placeholderData: keepPreviousData,
  });

  const logs = changeLogData?.rows || [];

  const totalRecords = Number(
    changeLogData?.pagination?.total || 0
  );

  const totalPages = Number(
    changeLogData?.pagination?.totalPages || 0
  );

  // =================================================
  // CHANGE LOG ERROR
  // =================================================

  useEffect(() => {
    if (!changeLogError) return;

    console.error(
      "STOCK CHANGE LOG QUERY ERROR:",
      changeLogError
    );

    showErrorToast(
      getErrorMessage(
        changeLogError,
        "Failed to fetch change logs"
      )
    );
  }, [changeLogError]);

  // =================================================
  // STAFF QUERY FOR EMAIL
  // =================================================

  const {
    data: staffList = [],
    isLoading: staffLoading,
    error: staffError,
  } = useQuery({
    queryKey: ["inventory-change-log-email-staff"],

    queryFn: async () => {
      const response = await apiFetch(STAFF_API);
      const result = await response.json();

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || "Failed to load staff"
        );
      }

      return getStaffRows(result);
    },

    enabled: emailDialogOpen,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (staffError && emailDialogOpen) {
      showErrorToast(
        getErrorMessage(
          staffError,
          "Unable to load staff recipients"
        )
      );
    }
  }, [staffError, emailDialogOpen]);

  // =================================================
  // TABLE COLUMNS
  // =================================================

  const columns = useMemo(
    () => [
      // ---------------------------------------------
      // ROW SELECTION
      // ---------------------------------------------

      {
        id: "select",

        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomePageRowsSelected()
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all rows"
          />
        ),

        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) =>
              row.toggleSelected(!!value)
            }
            aria-label="Select row"
          />
        ),

        enableSorting: false,
        enableHiding: false,
        size: 40,
      },

      // ---------------------------------------------
      // DATE
      // ---------------------------------------------

      {
        accessorKey: "createdAt",
        id: "createdAt",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Date"
            column={column}
          />
        ),

        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {formatDate(row.original.createdAt)}
          </span>
        ),

        enableSorting: true,
        size: 130,
      },

      // ---------------------------------------------
      // USER NAME
      // ---------------------------------------------

      {
        accessorKey: "UserName",
        id: "UserName",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="User Name"
            column={column}
          />
        ),

        cell: ({ row }) => (
          <span className="block max-w-[180px] whitespace-normal break-words font-medium">
            {row.original.UserName || "-"}
          </span>
        ),

        enableSorting: true,
        size: 180,
      },

      // ---------------------------------------------
      // ACTION
      // ---------------------------------------------

      {
        accessorKey: "Action",
        id: "Action",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Action"
            column={column}
          />
        ),

        cell: ({ row }) => (
          <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {row.original.Action || "-"}
          </span>
        ),

        enableSorting: true,
        size: 130,
      },

      // ---------------------------------------------
      // ITEM NAME
      // ---------------------------------------------

      {
        accessorKey: "ItemName",
        id: "ItemName",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Item Name"
            column={column}
          />
        ),

        cell: ({ row }) => (
          <span className="block max-w-[220px] whitespace-normal break-words font-medium">
            {row.original.ItemName || "-"}
          </span>
        ),

        enableSorting: true,
        size: 220,
      },

      // ---------------------------------------------
      // ITEM TYPE
      // ---------------------------------------------

      {
        accessorKey: "ItemType",
        id: "ItemType",

        header: ({ column }) => (
          <DataGridColumnHeader
            title="Item Type"
            column={column}
          />
        ),

        cell: ({ row }) => (
          <span className="block max-w-[180px] whitespace-normal break-words text-sm text-muted-foreground">
            {row.original.ItemType || "-"}
          </span>
        ),

        enableSorting: true,
        size: 180,
      },

      // ---------------------------------------------
      // DETAILS
      // ---------------------------------------------

      {
        accessorKey: "Details",
        id: "Details",

        header: () => <span>Details</span>,

        cell: ({ row }) => {
          const details = String(row.original.Details || "");
          const isLong = details.length > 500;

          return (
            <div className="flex min-w-[250px] max-w-[450px] items-start gap-2">
              <span className="min-w-0 flex-1 whitespace-normal break-words text-sm leading-relaxed text-muted-foreground">
                {isLong
                  ? `${details.slice(0, 500)}...`
                  : details || "-"}
              </span>

              {isLong && (
                <button
                  type="button"
                  title="View complete details"
                  aria-label="View complete details"
                  className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-primary"
                  onClick={() => {
                    setSelectedDetails(details);
                    setDetailsDialogOpen(true);
                  }}
                >
                  <Info className="size-4" />
                </button>
              )}
            </div>
          );
        },

        enableSorting: false,
        size: 450,
      },
    ],
    []
  );

  // =================================================
  // TANSTACK TABLE
  // =================================================

  const table = useReactTable({
    data: logs,
    columns,

    pageCount: totalPages,

    getRowId: (row, index) =>
      String(
        row.id ??
        row.changeLogId ??
        `${row.createdAt}-${index}`
      ),

    state: {
      pagination,
      sorting,
      rowSelection,
    },

    onPaginationChange: setPagination,

    onSortingChange: (updater) => {
      setSorting(updater);

      setRowSelection({});

      setPagination((previous) => ({
        ...previous,
        pageIndex: 0,
      }));
    },

    onRowSelectionChange: setRowSelection,

    enableRowSelection: true,

    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,

    getCoreRowModel: getCoreRowModel(),
  });

  const selectedRows = table
    .getSelectedRowModel()
    .rows
    .map((row) => row.original);

  const selectedCount = selectedRows.length;

  // =================================================
  // REPORT DATA
  // =================================================

  const getReportRows = useCallback(async () => {
    const params = buildFilterParams();

    params.set("page", "1");
    params.set("limit", "10000");

    if (sorting.length > 0) {
      params.set("sort", sorting[0].id);
      params.set("dir", sorting[0].desc ? "desc" : "asc");
    } else {
      params.set("sort", "createdAt");
      params.set("dir", "desc");
    }

    const response = await fetch(
      `${CHANGE_LOG_API}?${params.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const result = await response.json();

    if (!response.ok || result?.success === false) {
      throw new Error(
        result?.message || "Failed to load Stock Change Log"
      );
    }

    return getRows(result);
  }, [buildFilterParams, sorting]);

  // =================================================
  // EXCEL EXPORT
  // =================================================

  const handleExportExcel = useCallback(async () => {
    try {
      setReportLoading(true);

      toast.loading("Preparing Excel export...", {
        id: "change-log-export",
      });

      // Selected rows from the current page.
      // If none are selected, export all filtered records.
      const items =
        selectedRows.length > 0
          ? selectedRows
          : await getReportRows();

      if (!items.length) {
        toast.dismiss("change-log-export");

        showErrorToast("No change log records to export.");
        return;
      }

      const exportColumns = [
        {
          label: "Date",
          get: (item) => formatDate(item.createdAt),
          width: 18,
        },
        {
          label: "User Name",
          get: (item) => item.UserName || "",
          width: 25,
        },
        {
          label: "Action",
          get: (item) => item.Action || "",
          width: 20,
        },
        {
          label: "Item Name",
          get: (item) => item.ItemName || "",
          width: 30,
        },
        {
          label: "Item Type",
          get: (item) => item.ItemType || "",
          width: 25,
        },
        {
          label: "Details",
          get: (item) => item.Details || "",
          width: 60,
        },
      ];

      const rows = items.map((item) =>
        Object.fromEntries(
          exportColumns.map((column) => [
            column.label,
            column.get(item) ?? "",
          ])
        )
      );

      const worksheet = XLSX.utils.json_to_sheet(rows);

      worksheet["!cols"] = exportColumns.map((column) => ({
        wch: column.width,
      }));

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Stock Change Log"
      );

      XLSX.writeFile(
        workbook,
        "stock-change-log.xlsx"
      );

      toast.dismiss("change-log-export");

      showSuccessToast(
        `${items.length} change log record(s) exported.`
      );
    } catch (error) {
      console.error(
        "CHANGE LOG EXCEL EXPORT ERROR:",
        error
      );

      toast.dismiss("change-log-export");

      showErrorToast(
        getErrorMessage(error, "Excel export failed.")
      );
    } finally {
      setReportLoading(false);
    }
  }, [selectedRows, getReportRows]);

  // =================================================
  // EMAIL DIALOG
  // =================================================

  const handleOpenEmailDialog = useCallback(() => {
    setSelectedRecipientEmails([]);
    setRecipientSearch("");
    setAttachExcel(true);

    setEmailSubject("Stock Change Log");

    setEmailMessage(
      [
        "Dear Team,",
        "",
        "Please find the Stock Change Log for your review.",
        "",
        "The report includes the date, user name, action, item name, item type, and details.",
        "",
        "Please review the information and let us know if any corrections are required.",
        "",
      ].join("\n")
    );

    setEmailDialogOpen(true);
  }, []);

  const filteredStaff = useMemo(() => {
    const query = recipientSearch.trim().toLowerCase();

    if (!query) return staffList;

    return staffList.filter(
      (person) =>
        person.name.toLowerCase().includes(query) ||
        person.email.toLowerCase().includes(query)
    );
  }, [staffList, recipientSearch]);

  const allVisibleRecipientsSelected =
    filteredStaff.length > 0 &&
    filteredStaff.every((person) =>
      selectedRecipientEmails.includes(person.email)
    );

  const toggleRecipient = (email, checked) => {
    setSelectedRecipientEmails((previous) =>
      checked
        ? previous.includes(email)
          ? previous
          : [...previous, email]
        : previous.filter((value) => value !== email)
    );
  };

  const toggleAllVisibleRecipients = (checked) => {
    const visibleEmails = filteredStaff.map(
      (person) => person.email
    );

    setSelectedRecipientEmails((previous) =>
      checked
        ? [...new Set([...previous, ...visibleEmails])]
        : previous.filter(
          (email) => !visibleEmails.includes(email)
        )
    );
  };

  // =================================================
  // SEND EMAIL
  // =================================================

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

      const response = await fetch(EMAIL_API, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          recipients: selectedRecipientEmails,
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
          attachExcel,

          filters: {
            search: searchQuery,
            itemIds,
            dateFrom,
            dateTo,
          },
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message ||
          result?.error ||
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
      console.error(
        "CHANGE LOG EMAIL ERROR:",
        error
      );

      showErrorToast(
        getErrorMessage(error, "Unable to send email.")
      );
    } finally {
      setEmailSending(false);
    }
  };

  // =================================================
  // DATABASE STATUS
  // =================================================

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

      const response = await fetch(
        "/api/settings/toggle",
        {
          cache: "no-store",
        }
      );

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
      console.error(
        "DATABASE STATUS ERROR:",
        error
      );

      setDbStatus((previous) => ({
        ...previous,
        online: false,
        loading: false,
      }));
    } finally {
      setCheckingDb(false);
    }
  }, []);

  // =================================================
  // REFRESH
  // =================================================

  const refreshRegister = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["inventory-register"],
    });

    await queryClient.invalidateQueries({
      queryKey: ["inventory-change-log"],
    });
  }, [queryClient]);

  const handleRefresh = useCallback(async () => {
    await refetchChangeLogs();
  }, [refetchChangeLogs]);

  // =================================================
  // ONLINE / OFFLINE EVENTS
  // =================================================

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);

      await checkDbStatus();
      await refreshRegister();
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
  }, [checkDbStatus, refreshRegister]);

  // =================================================
  // DATABASE STATUS INTERVAL
  // =================================================

  useEffect(() => {
    checkDbStatus();

    const interval = setInterval(
      checkDbStatus,
      30000
    );

    return () => clearInterval(interval);
  }, [checkDbStatus]);

  // =================================================
  // SHARED EXPORT AND EMAIL BUTTONS
  // =================================================

  useEffect(() => {
    const handleReportButtonClick = (event) => {
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest(
        "#Export, #Email"
      );

      if (!button) return;

      event.preventDefault();
      event.stopPropagation();

      if (button.id === "Export") {
        void handleExportExcel();
      }

      if (button.id === "Email") {
        handleOpenEmailDialog();
      }
    };

    document.addEventListener(
      "click",
      handleReportButtonClick
    );

    return () => {
      document.removeEventListener(
        "click",
        handleReportButtonClick
      );
    };
  }, [handleExportExcel, handleOpenEmailDialog]);

  // =================================================
  // DATE FIELD
  // =================================================

  const renderDateField = ({
    id,
    label,
    value,
    onChange,
    min,
    max,
  }) => (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>

      <div className="relative w-full min-w-0">
        <Input
          id={id}
          type="date"
          className="date-input w-full min-w-0 pr-10"
          value={value}
          min={min || undefined}
          max={max || undefined}
          onChange={(event) => {
            onChange(event.target.value);
            resetPageAndSelection();
          }}
        />

        <CalendarDays className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );

  // =================================================
  // RENDER
  // =================================================

  return (
    <>
      <DataGrid
        table={table}
        recordCount={totalRecords}
        isLoading={isLoading || isFetching}
      >
        <Card className="w-full min-w-0 overflow-hidden">

          {/* =========================================
              TOOLBAR
          ========================================= */}

          <CardHeader className="flex min-w-0 flex-col items-stretch gap-3 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:py-5">

            <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center">

              <form
                onSubmit={handleSearch}
                className="relative w-full sm:w-64"
              >
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  type="text"
                  placeholder="Search stock change log"
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
                    aria-label="Clear search input"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    onClick={handleClearSearch}
                  >
                    <X className="size-4" />
                  </button>
                )}
              </form>

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
                  <p>
                    Search by username, action, item name,
                    item type, or details.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">

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
                  disabled={checkingDb}
                  onClick={() => void checkDbStatus()}
                  aria-label="Refresh database connection status"
                >
                  <RefreshCw
                    className={`size-4 ${checkingDb ? "animate-spin" : ""
                      }`}
                  />
                </Button>
              </div>

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

                setPagination={(updater) => {
                  setPagination((previous) => {
                    if (typeof updater === "function") {
                      return updater({
                        ...previous,
                        pageIndex: 0,
                      });
                    }

                    return {
                      ...previous,
                      ...updater,
                      pageIndex: 0,
                    };
                  });

                  setRowSelection({});
                }}

                setPage={(value) => {
                  setPagination((previous) => ({
                    ...previous,
                    pageIndex:
                      typeof value === "function"
                        ? value(previous.pageIndex)
                        : value - 1,
                  }));

                  setRowSelection({});
                }}

                users={userOptions}
                selectedUserIds={selectedUserIds}
                setSelectedUserIds={(value) => {
                  setSelectedUserIds(value);
                  resetPageAndSelection();
                }}

                groups={groupOptions}
                selectedGroupIds={groupFilter}
                setSelectedGroupIds={(value) => {
                  setGroupFilter(value);
                  resetPageAndSelection();
                }}

                itemMasterList={itemOptions}
                itemNameFilter={itemIds}
                setItemNameFilter={(value) => {
                  setItemIds(value);
                  resetPageAndSelection();
                }}

                productTypes={itemTypeOptions}
                itemTypeFilter={itemTypeFilter}
                setItemTypeFilter={(value) => {
                  setItemTypeFilter(value);
                  resetPageAndSelection();
                }}

                actionFilter={actionFilter}
                setActionFilter={(value) => {
                  setActionFilter(value);
                  resetPageAndSelection();
                }}
              />
              <DataGridColumnVisibility
                table={table}
                trigger={
                  <Button variant="outline">
                    <Settings2 />
                    Columns
                  </Button>
                } />
              {/* REFRESH */}

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isFetching}
                title="Refresh change logs"
              >
                <RefreshCw
                  className={`size-4 ${isFetching ? "animate-spin" : ""
                    }`}
                />
              </Button>
            </div>
          </CardHeader>

          {/* =========================================
              TABLE CONTENT
          ========================================= */}

          <CardContent className="space-y-4">

            {/* TABLE */}

            <div className="w-full min-w-0 overflow-hidden rounded-lg border border-border">
              <ScrollArea className="w-full max-w-full">
                <div className="min-w-[900px]">
                  <DataGridTable />
                </div>

                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>

            {/* PAGINATION */}

            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Total Records: {totalRecords}

                {selectedCount > 0 && (
                  <span className="ml-2">
                    | Selected: {selectedCount}
                  </span>
                )}
              </div>

              <DataGridPagination />
            </div>
          </CardContent>
        </Card>
      </DataGrid>

      {/* =============================================
          EMAIL REPORT DIALOG
      ============================================= */}

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
                Email Stock Change Log
              </DialogTitle>

              <DialogDescription>
                Select recipients and send the Inventory
                Stock Change Log report.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="max-h-[calc(90vh-140px)]">
              <DialogBody className="min-h-0 space-y-6 px-6">

                {/* RECIPIENT HEADER */}

                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium">
                    Recipient Email
                  </label>

                  <span className="text-xs text-muted-foreground">
                    {selectedRecipientEmails.length} of {staffList.length} selected
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
                          allVisibleRecipientsSelected
                        }
                        disabled={
                          staffLoading ||
                          filteredStaff.length === 0
                        }
                        onCheckedChange={(checked) =>
                          toggleAllVisibleRecipients(
                            checked === true
                          )
                        }
                      />

                      <span className="text-sm font-medium">
                        Select all visible staff
                      </span>
                    </label>
                  </div>

                  <div className="border-b p-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                      <Input
                        placeholder="Search staff or email..."
                        value={recipientSearch}
                        onChange={(event) =>
                          setRecipientSearch(event.target.value)
                        }
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <ScrollArea className="max-h-60">
                    <div className="p-2">
                      {staffLoading ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          Loading staff...
                        </p>
                      ) : filteredStaff.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">
                          No staff email addresses found.
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {filteredStaff.map((person) => {
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
                                  onCheckedChange={(checked) =>
                                    toggleRecipient(
                                      person.email,
                                      checked === true
                                    )
                                  }
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
                    htmlFor="change-log-email-subject"
                    className="text-sm font-medium"
                  >
                    Subject
                  </label>

                  <Input
                    id="change-log-email-subject"
                    required
                    value={emailSubject}
                    onChange={(event) =>
                      setEmailSubject(event.target.value)
                    }
                    placeholder="Stock Change Log"
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
                        Attach the Stock Change Log report as an Excel file (.xlsx).
                      </span>
                    </span>

                    <FileSpreadsheet className="size-5 shrink-0 text-muted-foreground" />
                  </label>
                </div>

                {/* MESSAGE */}

                <div className="space-y-2">
                  <label
                    htmlFor="change-log-email-message"
                    className="text-sm font-medium"
                  >
                    Message
                  </label>

                  <Textarea
                    id="change-log-email-message"
                    required
                    rows={5}
                    value={emailMessage}
                    onChange={(event) =>
                      setEmailMessage(event.target.value)
                    }
                    placeholder="Enter your email message..."
                    className="min-h-[150px] resize-y"
                  />

                  <p className="text-xs text-muted-foreground">
                    Enter the message to include in the email sent to the selected staff.
                  </p>
                </div>
              </DialogBody>
            </ScrollArea>

            {/* EMAIL FOOTER */}

            <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4">
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
          </form>
        </DialogContent>
      </Dialog>

      {/* =============================================
          COMPLETE DETAILS DIALOG
      ============================================= */}

      <Dialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      >
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Complete Details
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
            {selectedDetails}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}