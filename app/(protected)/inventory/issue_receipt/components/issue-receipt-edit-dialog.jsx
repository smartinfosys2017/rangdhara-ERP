"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  ArrowRight,
  ArrowLeftRight,
} from "lucide-react";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { apiFetch } from "@/lib/api";
import { useRoleSelectQuery } from "../../../user-management/roles/hooks/use-role-select-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const getArray = (data) => (Array.isArray(data) ? data : []);

const toDateTimeInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return format(localDate, "yyyy-MM-dd'T'HH:mm");
};

const normalizeType = (value) => {
  const type = String(value || "").toLowerCase();

  if (["machine", "machinery"].includes(type)) return "machinery";
  if (type === "location") return "location";

  return "";
};

const getMovementType = (record) => {
  const movement = String(record?.MovementType || "").toUpperCase();

  if (movement === "INTERNAL_TRANSFER") return "internal-transfer";

  if (
    record?.IssueFromType ||
    record?.IssueFromId ||
    record?.FromType ||
    record?.FromId ||
    record?.ReceiveToType ||
    record?.ReceiveToId
  ) {
    return "internal-transfer";
  }

  return "inward";
};

const getItemGroupId = (item) =>
  String(
    item?.ItemGroupid ??
      item?.itemGroupId ??
      item?.ItemGroupId ??
      item?.groupId ??
      "",
  );

const getItemConditionId = (item) =>
  String(item?.ItemConditionid ?? item?.itemConditionId ?? "");

const getItemUnitId = (item) =>
  String(item?.Unitid ?? item?.unitId ?? item?.UnitId ?? item?.unitid ?? "");

const getStaffName = (staff) =>
  staff?.name ||
  [staff?.firstName, staff?.lastName].filter(Boolean).join(" ") ||
  staff?.username ||
  staff?.email ||
  `User #${staff?.id}`;

const getDestinationName = (item, type) => {
  if (type === "location") {
    return (
      item.locationName ||
      item.LocationName ||
      item.name ||
      `Warehouse #${item.id}`
    );
  }

  return (
    item.machineName ||
    item.MachineName ||
    item.machineNumber ||
    item.MachineNumber ||
    `Machine #${item.id}`
  );
};

const getInitialForm = (record) => {
  const movementType = getMovementType(record);

  const issueFromType = normalizeType(
    record?.IssueFromType || record?.FromType,
  );

  const receiveToType = normalizeType(record?.ReceiveToType || record?.ToType);

  const destinationType = normalizeType(
    record?.DestinationType || record?.ToType,
  );

  return {
    ItemGroupid: String(record?.ItemGroupid || ""),
    GroupName: getArray(record?.GroupName),
    ItemMasterid: String(record?.ItemMasterid || ""),
    BrandManufacturerid: String(record?.BrandManufacturerid || ""),
    ItemTypeid: String(record?.ItemTypeid || ""),
    TransactionTypeid: String(record?.TransactionTypeid || ""),
    IssueDate: toDateTimeInput(record?.IssueDate),

    Qty: record?.Qty == null ? "" : String(record.Qty),
    PreviousBalance: Number(record?.PreviousBalance || 0),
    Balance: Number(record?.Balance || 0),
    Issue_by: String(record?.Issue_by || ""),
    RecivedBy: String(record?.RecivedBy || ""),

    GetPassNo: record?.GetPassNo || "",

    IssueFromType: issueFromType,
    IssueFromId: String(record?.IssueFromId || record?.FromId || ""),
    ReceiveToType: receiveToType,
    ReceiveToId: String(record?.ReceiveToId || record?.ToId || ""),

    ReciptChallanNo: record?.ReciptChallanNo || "",
    ReceiptDate: toDateTimeInput(record?.ReceiptDate),
    RequisitionSupplyNo: record?.RequisitionSupplyNo || "",
    RequisitionSupplyDate: toDateTimeInput(record?.RequisitionSupplyDate),
    PurchaseNo: record?.PurchaseNo || "",
    PurchaseDate: toDateTimeInput(record?.PurchaseDate),

    DateOfRecive: toDateTimeInput(record?.DateOfRecive),
    Comment: record?.Comment || "",
    Price: record?.Price == null ? "" : String(record.Price),
    Particuler: record?.Particuler || "",

    DestinationType: destinationType,
    DestinationId: String(record?.DestinationId || record?.ToId || ""),

    MovementType:
      movementType === "internal-transfer" ? "INTERNAL_TRANSFER" : "INWARD",
  };
};

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
        close
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

// --------------------------------------------------
// DATE TIME PICKER
// --------------------------------------------------

function DateTimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Pick a date and time",
  disableFuture = false,
}) {
  const today = new Date();

  const selectedDate = value
    ? new Date(`${value.slice(0, 10)}T00:00:00`)
    : undefined;

  const selectedTime = value?.includes("T") ? value.slice(11, 16) : undefined;

  const timeSlots = Array.from({ length: 30 }, (_, index) => {
    const hour = 9 + Math.floor(index / 2);
    const minute = index % 2 === 0 ? "00" : "30";

    return `${String(hour).padStart(2, "0")}:${minute}`;
  });

  const handleDateChange = (date) => {
    if (!date) return;

    onChange(`${format(date, "yyyy-MM-dd")}T${selectedTime || "10:00"}`);
  };

  const handleTimeChange = (time) => {
    if (!selectedDate) return;

    onChange(`${format(selectedDate, "yyyy-MM-dd")}T${time}`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-start text-left font-normal"
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 size-4" />
          {value
            ? `${format(
                new Date(`${value.slice(0, 10)}T00:00:00`),
                "PPP",
              )} - ${selectedTime || "Select time"}`
            : placeholder}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex max-sm:flex-col">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateChange}
            disabled={disableFuture ? [{ after: today }] : undefined}
            className="p-2"
          />

          <div className="relative w-full sm:w-40 max-sm:h-48">
            <div className="absolute inset-0 py-4 max-sm:border-t">
              <ScrollArea className="h-full sm:border-s">
                <div className="space-y-3">
                  <div className="px-5 text-sm font-medium">
                    {selectedDate
                      ? format(selectedDate, "EEEE, d")
                      : "Pick a date"}
                  </div>

                  <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                    {timeSlots.map((time) => {
                      const isPast =
                        disableFuture &&
                        selectedDate &&
                        format(selectedDate, "yyyy-MM-dd") ===
                          format(today, "yyyy-MM-dd") &&
                        time >
                          `${String(today.getHours()).padStart(
                            2,
                            "0",
                          )}:${String(today.getMinutes()).padStart(2, "0")}`;

                      return (
                        <Button
                          key={time}
                          type="button"
                          variant={
                            selectedTime === time ? "primary" : "outline"
                          }
                          size="sm"
                          disabled={!selectedDate || isPast}
                          onClick={() => handleTimeChange(time)}
                        >
                          {time}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --------------------------------------------------
// PAGINATED SEARCH SELECT
// --------------------------------------------------

function PaginatedSearchSelect({
  endpoint,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  getLabel,
  disabled = false,
  onOptionsChange,
  selectedRecord,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const fetchOptions = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams({
          page: "1",
          limit: "100",
          query: debouncedQuery,
          status: "all",
        });

        const response = await apiFetch(`${endpoint}?${params.toString()}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to load options.");
        }

        if (cancelled) return;

        let records = getArray(result.data);

        if (
          selectedRecord?.id &&
          !records.some((item) => String(item.id) === String(selectedRecord.id))
        ) {
          records = [selectedRecord, ...records];
        }

        setOptions(records);
        setPage(Number(result.pagination?.page) || 1);
        setTotalPages(Number(result.pagination?.totalPages) || 1);
        onOptionsChange?.(records);
      } catch (error) {
        if (!cancelled) {
          setOptions([]);
          setTotalPages(1);
          showErrorToast(error.message || "Failed to load options.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchOptions();

    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery, endpoint]);

  const loadMore = async () => {
    if (loading || loadingMore || page >= totalPages) return;

    try {
      setLoadingMore(true);

      const nextPage = page + 1;
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: "100",
        query: debouncedQuery,
        status: "all",
      });

      const response = await apiFetch(`${endpoint}?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load more options.");
      }

      const records = getArray(result.data);

      setOptions((previous) => {
        const ids = new Set(previous.map((item) => String(item.id)));
        const merged = [
          ...previous,
          ...records.filter((item) => !ids.has(String(item.id))),
        ];

        onOptionsChange?.(merged);
        return merged;
      });

      setPage(Number(result.pagination?.page) || nextPage);
      setTotalPages(Number(result.pagination?.totalPages) || totalPages);
    } catch (error) {
      showErrorToast(error.message || "Failed to load more options.");
    } finally {
      setLoadingMore(false);
    }
  };

  const selectedOption =
    options.find((item) => String(item.id) === String(value)) ||
    (String(selectedRecord?.id || "") === String(value)
      ? selectedRecord
      : null);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">
            {selectedOption ? getLabel(selectedOption) : placeholder}
          </span>
          <span className="ml-2">⌄</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-2"
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2"
        />

        <div
          className="max-h-56 overflow-y-auto"
          onScroll={(event) => {
            const element = event.currentTarget;

            if (
              element.scrollTop + element.clientHeight >=
              element.scrollHeight - 30
            ) {
              loadMore();
            }
          }}
        >
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Loading...
            </p>
          ) : options.length ? (
            <>
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-muted ${
                    String(value) === String(option.id) ? "bg-muted" : ""
                  }`}
                  onClick={() => {
                    onChange(String(option.id), option);
                    setOpen(false);
                  }}
                >
                  {getLabel(option)}
                </button>
              ))}

              {loadingMore && (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  Loading more...
                </p>
              )}
            </>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No records found.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --------------------------------------------------
// EDIT DIALOG
// --------------------------------------------------

export default function IssueReceiptEditDialog({
  open,
  closeDialog,
  IssueReceipt,
  onSuccess,
}) {
  const { data: session, status } = useSession();

  const userName = session?.user?.name || "admin";
  const userId = session?.user?.id || null;

  const { data: roleList = [], isLoading: rolesLoading } = useRoleSelectQuery();

  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);

  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [units, setUnits] = useState([]);

  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedRole, setSelectedRole] = useState("all");
  const [activeTab, setActiveTab] = useState("inward");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(getInitialForm(IssueReceipt));

  const [destinationList, setDestinationList] = useState([]);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [receivePreviousQty, setReceivePreviousQty] = useState(0);

  const [issueFromList, setIssueFromList] = useState([]);
  const [issueFromLoading, setIssueFromLoading] = useState(false);
  const [issueFromPreviousQty, setIssueFromPreviousQty] = useState(0);

  const [transferReceiveList, setTransferReceiveList] = useState([]);
  const [transferReceiveLoading, setTransferReceiveLoading] = useState(false);
  const [transferReceivePreviousQty, setTransferReceivePreviousQty] =
    useState(0);

  const isInward = activeTab === "inward";

  const updateField = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: "" }));
  };

  const calculateInwardBalance = (previous, qty) =>
    (Number(previous) || 0) + (Number(qty) || 0);

  const calculateIssueFromBalance = (previous, qty) =>
    (Number(previous) || 0) - (Number(qty) || 0);

  const calculateReceiveToBalance = (previous, qty) =>
    (Number(previous) || 0) + (Number(qty) || 0);

  const filteredItems = useMemo(() => {
    if (!selectedGroups.length) return [];

    return items.filter((item) =>
      selectedGroups.includes(getItemGroupId(item)),
    );
  }, [items, selectedGroups]);

  // --------------------------------------------------
  // LOAD DROPDOWNS
  // --------------------------------------------------

  const loadDropdowns = async () => {
    try {
      setDropdownLoading(true);

      const responses = await Promise.all([
        apiFetch("/api/inventory/item-groups?limit=100&status=active"),
        apiFetch("/api/inventory/item-master?limit=100&status=active"),
        apiFetch("/api/inventory/transaction-type?limit=100&status=active"),
        apiFetch("/api/inventory/product-type?limit=100&status=active"),
        apiFetch("/api/inventory/unit?limit=100&status=active"),
        apiFetch("/api/inventory/brand_manufacturer?limit=100&status=active"),
      ]);

      const results = await Promise.all(
        responses.map((response) => response.json()),
      );

      responses.forEach((response, index) => {
        if (!response.ok || !results[index].success) {
          throw new Error(
            results[index].message || "Failed to load dropdown data.",
          );
        }
      });

      const [
        groupResult,
        itemResult,
        transactionResult,
        productTypeResult,
        unitResult,
        brandResult,
      ] = results;

      const groupList = getArray(groupResult.data);
      const itemList = getArray(itemResult.data);
      const transactionList = getArray(transactionResult.data);
      const productTypeList = getArray(productTypeResult.data);
      const unitList = getArray(unitResult.data);
      const brandList = getArray(brandResult.data);

      // Keep the currently edited item available even when it is not
      // included in the first page of active items.
      const currentItem = IssueReceipt?.ItemMaster;
      const mergedItems = [...itemList];

      if (
        currentItem?.id &&
        !mergedItems.some((item) => String(item.id) === String(currentItem.id))
      ) {
        mergedItems.unshift(currentItem);
      }

      setGroups(groupList);
      setItems(mergedItems);
      setTransactions(transactionList);
      setProductTypes(productTypeList);
      setUnits(unitList);
      setBrands(brandList);

      const currentGroupId = String(IssueReceipt?.ItemGroupid || "");
      const recordGroupNames = getArray(IssueReceipt?.GroupName);

      const initialGroupIds = currentGroupId
        ? [currentGroupId]
        : groupList
            .filter((group) =>
              recordGroupNames.includes(group.groupName || group.GroupName),
            )
            .map((group) => String(group.id));

      setSelectedGroups(initialGroupIds);

      setForm((previous) => ({
        ...previous,
        GroupName:
          recordGroupNames.length > 0
            ? recordGroupNames
            : groupList
                .filter((group) => initialGroupIds.includes(String(group.id)))
                .map((group) => group.groupName || group.GroupName),
      }));
    } catch (error) {
      console.error("STOCK MOVEMENT EDIT DROPDOWN ERROR:", error);
      showErrorToast(error.message || "Failed to load dropdown data.");
    } finally {
      setDropdownLoading(false);
    }
  };

  // --------------------------------------------------
  // FETCH USERS
  // --------------------------------------------------

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    const fetchStaffUsers = async () => {
      try {
        setStaffLoading(true);

        const params = new URLSearchParams({ limit: "100" });

        if (selectedRole !== "all") {
          params.set("roleId", selectedRole);
        }

        const response = await apiFetch(
          `/api/user-management/users?${params.toString()}`,
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Failed to load users.");
        }

        if (!ignore) {
          setStaffUsers(getArray(result.data));
        }
      } catch (error) {
        if (!ignore) {
          setStaffUsers([]);
          showErrorToast(error.message || "Failed to load users.");
        }
      } finally {
        if (!ignore) setStaffLoading(false);
      }
    };

    fetchStaffUsers();

    return () => {
      ignore = true;
    };
  }, [open, selectedRole]);

  // --------------------------------------------------
  // RESET AND PREFILL
  // --------------------------------------------------

  useEffect(() => {
    if (!open || !IssueReceipt?.id) return;

    const initial = getInitialForm(IssueReceipt);

    setForm(initial);
    setErrors({});
    setSelectedGroups(initial.ItemGroupid ? [initial.ItemGroupid] : []);
    setSelectedRole("all");
    setActiveTab(
      initial.MovementType === "INTERNAL_TRANSFER"
        ? "internal-transfer"
        : "inward",
    );
    setGroupDropdownOpen(false);

    setDestinationList([]);
    setIssueFromList([]);
    setTransferReceiveList([]);

    // Use the saved balances as the initial edit values. This avoids
    // accidentally treating the current movement as a new movement.
    setReceivePreviousQty(
      Number(
        IssueReceipt?.ReceiveToPreviousQty ??
          IssueReceipt?.PreviousBalance ??
          0,
      ),
    );

    setIssueFromPreviousQty(
      Number(
        IssueReceipt?.IssueFromPreviousQty ??
          IssueReceipt?.PreviousBalance ??
          0,
      ),
    );

    setTransferReceivePreviousQty(
      Number(IssueReceipt?.ReceiveToPreviousQty || 0),
    );

    setDestinationList([]);
    setIssueFromList([]);
    setTransferReceiveList([]);

    loadDropdowns();
  }, [open, IssueReceipt?.id]);

  // --------------------------------------------------
  // DESTINATION OPTION FETCHING
  // --------------------------------------------------

  const fetchDestinationOptions = async (type, setter, loadingSetter) => {
    if (!type) {
      setter([]);
      return;
    }

    try {
      loadingSetter(true);

      const endpoint =
        type === "location"
          ? "/api/inventory/location?limit=100&status=active"
          : "/api/inventory/machine-master?limit=100&status=active";

      const response = await apiFetch(endpoint);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load destination options.",
        );
      }

      setter(getArray(result.data));
    } catch (error) {
      setter([]);
      showErrorToast(error.message || "Failed to load destinations.");
    } finally {
      loadingSetter(false);
    }
  };

  useEffect(() => {
    if (!open || !form.DestinationType) return;

    fetchDestinationOptions(
      form.DestinationType,
      setDestinationList,
      setDestinationLoading,
    );
  }, [open, form.DestinationType]);

  useEffect(() => {
    if (!open || !form.IssueFromType) return;

    fetchDestinationOptions(
      form.IssueFromType,
      setIssueFromList,
      setIssueFromLoading,
    );
  }, [open, form.IssueFromType]);

  useEffect(() => {
    if (!open || !form.ReceiveToType) return;

    fetchDestinationOptions(
      form.ReceiveToType,
      setTransferReceiveList,
      setTransferReceiveLoading,
    );
  }, [open, form.ReceiveToType]);

  // --------------------------------------------------
  // BALANCE FETCH
  // --------------------------------------------------

  const fetchDestinationBalance = async (
    itemMasterId,
    itemTypeId,
    locationType,
    locationId,
  ) => {
    if (!itemMasterId || !itemTypeId || !locationType || !locationId) {
      return { PreviousBalance: 0, Rate: 0, Balance: 0 };
    }

    const normalizedType =
      String(locationType).toUpperCase() === "MACHINERY"
        ? "MACHINE"
        : String(locationType).toUpperCase();

    const params = new URLSearchParams({
      itemTypeId: String(itemTypeId),
      locationType: normalizedType,
      locationId: String(locationId),
    });

    const response = await apiFetch(
      `/api/inventory/issue-receipt/previous-balance/${itemMasterId}?${params.toString()}`,
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch stock balance.");
    }

    return {
      PreviousBalance: Number(
        result.data?.PreviousBalance ??
          result.data?.previousBalance ??
          result.data?.Balance ??
          result.data?.balance ??
          0,
      ),
      Rate: Number(result.data?.Rate ?? result.data?.rate ?? 0),
      Balance: Number(result.data?.Balance ?? result.data?.balance ?? 0),
    };
  };

  // --------------------------------------------------
  // GROUP AND ITEM SELECTION
  // --------------------------------------------------

  const resetStockValues = () => {
    setReceivePreviousQty(0);
    setIssueFromPreviousQty(0);
    setTransferReceivePreviousQty(0);
  };

  const handleGroupToggle = (groupId) => {
    const updated = selectedGroups.includes(groupId)
      ? selectedGroups.filter((id) => id !== groupId)
      : [...selectedGroups, groupId];

    setSelectedGroups(updated);

    const names = groups
      .filter((group) => updated.includes(String(group.id)))
      .map((group) => group.groupName || group.GroupName)
      .filter(Boolean);

    setForm((previous) => ({
      ...previous,
      GroupName: names,
      ItemGroupid: "",
      ItemMasterid: "",
      ItemTypeid: "",
      PreviousBalance: 0,
      Balance: 0,
      Price: "",
    }));

    resetStockValues();
    setErrors((previous) => ({
      ...previous,
      ItemGroupid: updated.length ? "" : "Item Group is required.",
      ItemMasterid: "",
      ItemTypeid: "",
    }));
  };

  const handleSelectAllGroups = () => {
    const ids = groups.map((group) => String(group.id));

    setSelectedGroups(ids);
    setForm((previous) => ({
      ...previous,
      GroupName: groups
        .map((group) => group.groupName || group.GroupName)
        .filter(Boolean),
      ItemGroupid: "",
      ItemMasterid: "",
      ItemTypeid: "",
      PreviousBalance: 0,
      Balance: 0,
      Price: "",
    }));

    resetStockValues();
  };

  const handleClearAllGroups = () => {
    setSelectedGroups([]);
    setForm((previous) => ({
      ...previous,
      GroupName: [],
      ItemGroupid: "",
      ItemMasterid: "",
      ItemTypeid: "",
      PreviousBalance: 0,
      Balance: 0,
      Price: "",
    }));

    resetStockValues();
  };

  const handleItemChange = async (value, selectedItem) => {
    const item =
      selectedItem || items.find((entry) => String(entry.id) === String(value));

    if (!item) return;

    const groupId = getItemGroupId(item);
    const conditionId = getItemConditionId(item);

    setForm((previous) => ({
      ...previous,
      ItemMasterid: String(value),
      ItemGroupid: groupId,
      ItemTypeid: conditionId,
      PreviousBalance: 0,
      Balance: 0,
      Price: item.rather != null ? String(item.rather) : previous.Price,
    }));

    resetStockValues();

    setErrors((previous) => ({
      ...previous,
      ItemMasterid: "",
      ItemTypeid: conditionId
        ? ""
        : "Item condition is missing in Item Master.",
    }));

    // For a changed item, load current stock for the selected endpoint(s).
    try {
      if (
        activeTab === "inward" &&
        form.DestinationType &&
        form.DestinationId
      ) {
        const balance = await fetchDestinationBalance(
          value,
          conditionId,
          form.DestinationType,
          form.DestinationId,
        );
        setReceivePreviousQty(balance.PreviousBalance);
      }

      if (
        activeTab === "internal-transfer" &&
        form.IssueFromType &&
        form.IssueFromId
      ) {
        const balance = await fetchDestinationBalance(
          value,
          conditionId,
          form.IssueFromType,
          form.IssueFromId,
        );
        setIssueFromPreviousQty(balance.PreviousBalance);
      }

      if (
        activeTab === "internal-transfer" &&
        form.ReceiveToType &&
        form.ReceiveToId
      ) {
        const balance = await fetchDestinationBalance(
          value,
          conditionId,
          form.ReceiveToType,
          form.ReceiveToId,
        );
        setTransferReceivePreviousQty(balance.PreviousBalance);
      }
    } catch (error) {
      showErrorToast(error.message || "Failed to fetch item balance.");
    }
  };

  // --------------------------------------------------
  // LOCATION SELECTION
  // --------------------------------------------------

  const handleDestinationTypeChange = (value) => {
    setForm((previous) => ({
      ...previous,
      DestinationType: value,
      DestinationId: "",
    }));

    setDestinationList([]);
    setReceivePreviousQty(0);
    setErrors((previous) => ({
      ...previous,
      DestinationType: "",
      DestinationId: "",
    }));
  };

  const handleIssueFromTypeChange = (value) => {
    setForm((previous) => ({
      ...previous,
      IssueFromType: value,
      IssueFromId: "",
    }));

    setIssueFromList([]);
    setIssueFromPreviousQty(0);
    setErrors((previous) => ({
      ...previous,
      IssueFromType: "",
      IssueFromId: "",
    }));
  };

  const handleTransferReceiveTypeChange = (value) => {
    setForm((previous) => ({
      ...previous,
      ReceiveToType: value,
      ReceiveToId: "",
    }));

    setTransferReceiveList([]);
    setTransferReceivePreviousQty(0);
    setErrors((previous) => ({
      ...previous,
      ReceiveToType: "",
      ReceiveToId: "",
    }));
  };

  const handleDestinationIdChange = async (value) => {
    updateField("DestinationId", value);

    if (!form.ItemMasterid || !form.ItemTypeid || !form.DestinationType) {
      return;
    }

    try {
      const balance = await fetchDestinationBalance(
        form.ItemMasterid,
        form.ItemTypeid,
        form.DestinationType,
        value,
      );

      setReceivePreviousQty(balance.PreviousBalance);
    } catch (error) {
      showErrorToast(error.message);
    }
  };

  const handleIssueFromIdChange = async (value) => {
    updateField("IssueFromId", value);

    if (!form.ItemMasterid || !form.ItemTypeid || !form.IssueFromType) {
      return;
    }

    try {
      const balance = await fetchDestinationBalance(
        form.ItemMasterid,
        form.ItemTypeid,
        form.IssueFromType,
        value,
      );

      setIssueFromPreviousQty(balance.PreviousBalance);
    } catch (error) {
      showErrorToast(error.message);
    }
  };

  const handleReceiveToIdChange = async (value) => {
    updateField("ReceiveToId", value);

    if (!form.ItemMasterid || !form.ItemTypeid || !form.ReceiveToType) {
      return;
    }

    try {
      const balance = await fetchDestinationBalance(
        form.ItemMasterid,
        form.ItemTypeid,
        form.ReceiveToType,
        value,
      );

      setTransferReceivePreviousQty(balance.PreviousBalance);
    } catch (error) {
      showErrorToast(error.message);
    }
  };

  // --------------------------------------------------
  // AUTO BALANCE
  // --------------------------------------------------

  useEffect(() => {
    if (!open) return;

    const qty = Number(form.Qty) || 0;

    if (activeTab === "inward") {
      const previous = Number(receivePreviousQty) || 0;

      setForm((current) => ({
        ...current,
        PreviousBalance: previous,
        Balance: calculateInwardBalance(previous, qty),
      }));
    } else {
      const previous = Number(issueFromPreviousQty) || 0;

      setForm((current) => ({
        ...current,
        PreviousBalance: previous,
        Balance: calculateIssueFromBalance(previous, qty),
      }));
    }
  }, [open, activeTab, form.Qty, receivePreviousQty, issueFromPreviousQty]);

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const validateCommonFields = (newErrors) => {
    if (!selectedGroups.length && !form.ItemGroupid) {
      newErrors.ItemGroupid = "Item Group is required.";
    }

    if (!form.ItemMasterid) {
      newErrors.ItemMasterid = "Item is required.";
    }

    if (!form.ItemTypeid) {
      newErrors.ItemTypeid = "Item Condition is required.";
    }

    if (!form.TransactionTypeid) {
      newErrors.TransactionTypeid = "Transaction Type is required.";
    }

    if (!form.IssueDate) {
      newErrors.IssueDate = "Date and time is required.";
    } else if (new Date(form.IssueDate) > new Date()) {
      newErrors.IssueDate = "Date and time cannot be in the future.";
    }

    if (!String(form.Qty).trim()) {
      newErrors.Qty = "Quantity is required.";
    } else if (!Number.isFinite(Number(form.Qty)) || Number(form.Qty) <= 0) {
      newErrors.Qty = "Quantity must be greater than 0.";
    } else if (!Number.isInteger(Number(form.Qty))) {
      newErrors.Qty = "Quantity must be a whole number.";
    }

    if (
      form.Price !== "" &&
      (!Number.isFinite(Number(form.Price)) || Number(form.Price) < 0)
    ) {
      newErrors.Price = "Rate must be a valid non-negative number.";
    }

    if (String(form.Comment || "").length > 1000) {
      newErrors.Comment = "Comment cannot exceed 1000 characters.";
    }
  };

  const validateForm = () => {
    const newErrors = {};

    validateCommonFields(newErrors);

    if (activeTab === "inward") {
      if (!form.Issue_by) {
        newErrors.Issue_by = "User is required.";
      }

      if (!form.DestinationType) {
        newErrors.DestinationType =
          "Please select Receive To Warehouse or Machine.";
      }

      if (!form.DestinationId) {
        newErrors.DestinationId = "Please select a destination.";
      }

      if (String(form.ReciptChallanNo || "").length > 100) {
        newErrors.ReciptChallanNo =
          "Challan/Bill Number cannot exceed 100 characters.";
      }
    } else {
      if (!form.IssueFromType) {
        newErrors.IssueFromType = "Please select Issue From type.";
      }

      if (!form.IssueFromId) {
        newErrors.IssueFromId = "Please select Issue From.";
      }

      if (!form.ReceiveToType) {
        newErrors.ReceiveToType = "Please select Receive To type.";
      }

      if (!form.ReceiveToId) {
        newErrors.ReceiveToId = "Please select Receive To.";
      }

      if (
        form.IssueFromType &&
        form.IssueFromId &&
        form.ReceiveToType &&
        form.ReceiveToId &&
        form.IssueFromType === form.ReceiveToType &&
        String(form.IssueFromId) === String(form.ReceiveToId)
      ) {
        newErrors.ReceiveToId =
          "Issue From and Receive To cannot be the same destination.";
      }

      if (
        Number(form.Qty) >
        Number(issueFromPreviousQty) +
          (String(IssueReceipt?.id) ? Number(IssueReceipt?.Qty || 0) : 0)
      ) {
        newErrors.Qty =
          "Transfer quantity cannot exceed the available Issue From quantity.";
      }

      if (String(form.GetPassNo || "").length > 100) {
        newErrors.GetPassNo =
          "Issue Slip/Gate Pass cannot exceed 100 characters.";
      }
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      showErrorToast("Please correct the highlighted fields.");
      return false;
    }

    return true;
  };

  // --------------------------------------------------
  // ROLE CHANGE
  // --------------------------------------------------

  const handleRoleChange = (value) => {
    setSelectedRole(value);

    // Keep the currently selected user when changing role.
    // The list will reload with the new role filter.
    setErrors((previous) => ({
      ...previous,
      Issue_by: "",
    }));
  };

  // --------------------------------------------------
  // SUBMIT
  // --------------------------------------------------

  const handleSubmit = async () => {
    if (!IssueReceipt?.id) {
      showErrorToast("Stock Movement ID is missing.");
      return;
    }

    if (!validateForm()) return;

    if (status === "loading") {
      showErrorToast("Please wait while your session loads.");
      return;
    }

    const inward = activeTab === "inward";
    const issueBy = inward ? form.Issue_by : userId;

    if (!issueBy) {
      showErrorToast(
        inward
          ? "Please select Issue By."
          : "Unable to identify the logged-in user. Please log in again.",
      );
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...form,

        MovementType: inward ? "INWARD" : "INTERNAL_TRANSFER",

        ItemGroupid: String(form.ItemGroupid),
        ItemMasterid: String(form.ItemMasterid),
        ItemTypeid: String(form.ItemTypeid),
        TransactionTypeid: String(form.TransactionTypeid),

        IssueDate: form.IssueDate,
        Qty: Number(form.Qty),
        PreviousBalance: Number(form.PreviousBalance) || 0,
        Balance: Number(form.Balance) || 0,
        Price:
          form.Price === "" || form.Price == null ? null : Number(form.Price),

        Issue_by: String(issueBy),
        RecivedBy: form.RecivedBy ? String(form.RecivedBy) : null,

        ReciptChallanNo: form.ReciptChallanNo || null,
        ReceiptDate: form.ReceiptDate || null,
        RequisitionSupplyNo: form.RequisitionSupplyNo || null,
        RequisitionSupplyDate: form.RequisitionSupplyDate || null,
        PurchaseNo: form.PurchaseNo || null,
        PurchaseDate: form.PurchaseDate || null,
        GetPassNo: form.GetPassNo || null,
        DateOfRecive: form.DateOfRecive || null,
        Particuler: form.Particuler || null,
        Comment: form.Comment || null,

        ...(inward
          ? {
              DestinationType: form.DestinationType,
              DestinationId: String(form.DestinationId),
              ToType: form.DestinationType,
              ToId: String(form.DestinationId),
            }
          : {
              IssueFromType: form.IssueFromType,
              IssueFromId: String(form.IssueFromId),

              ReceiveToType: form.ReceiveToType,
              ReceiveToId: String(form.ReceiveToId),

              FromType: form.IssueFromType,
              FromId: String(form.IssueFromId),

              ToType: form.ReceiveToType,
              ToId: String(form.ReceiveToId),

              DestinationType: form.ReceiveToType,
              DestinationId: String(form.ReceiveToId),

              IssueFromPreviousQty: Number(issueFromPreviousQty) || 0,

              ReceiveToPreviousQty: Number(transferReceivePreviousQty) || 0,
            }),

        UserName: userName,
        UserId: userId,
      };

      const response = await apiFetch(
        `/api/inventory/issue-receipt?id=${encodeURIComponent(
          IssueReceipt.id,
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update Stock Movement.");
      }

      showSuccessToast(
        inward
          ? "Inward entry updated successfully."
          : "Internal Transfer updated successfully.",
      );

      onSuccess?.(result.data);
      closeDialog?.();
    } catch (error) {
      console.error("UPDATE STOCK MOVEMENT ERROR:", error);
      showErrorToast(error.message || "Failed to update stock movement.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // CLOSE
  // --------------------------------------------------

  const handleClose = () => {
    if (loading) return;

    setErrors({});
    setGroupDropdownOpen(false);
    closeDialog?.();
  };

  // --------------------------------------------------
  // SELECTED ITEM / UNIT
  // --------------------------------------------------

  const selectedItem = items.find(
    (item) => String(item.id) === String(form.ItemMasterid),
  );

  const selectedUnitId = getItemUnitId(selectedItem);

  const selectedUnit = units.find(
    (unit) => String(unit.id) === String(selectedUnitId),
  );

  const unitName = selectedUnit?.unitName || selectedUnit?.UnitName || "";

  const unitAbbreviation =
    selectedUnit?.abbreviation || selectedUnit?.Abbreviation || "";

  const unitLabel = unitAbbreviation
    ? `${unitName} (${unitAbbreviation})`
    : unitName;

  const total = (Number(form.Price || 0) * Number(form.Qty || 0)).toFixed(2);

  const transferReceiveFinalBalance = calculateReceiveToBalance(
    transferReceivePreviousQty,
    form.Qty,
  );

  // --------------------------------------------------
  // REUSABLE FIELDS
  // --------------------------------------------------

  const renderItemGroupField = () => (
    <div className="space-y-2">
      <Label>
        Item Group <span className="text-destructive">*</span>
      </Label>

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          disabled={dropdownLoading || loading}
          onClick={() => setGroupDropdownOpen((previous) => !previous)}
        >
          <span className="truncate">
            {dropdownLoading
              ? "Loading groups..."
              : selectedGroups.length
                ? `${selectedGroups.length} group(s) selected`
                : "Select Item Groups"}
          </span>
          <span>▼</span>
        </Button>

        {groupDropdownOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-background p-3 shadow-lg">
            <div className="flex justify-between border-b pb-2">
              <span className="text-sm font-medium">Select Item Groups</span>

              <div className="flex gap-3">
                <button
                  type="button"
                  className="text-xs text-primary"
                  onClick={handleSelectAllGroups}
                >
                  Select All
                </button>

                <button
                  type="button"
                  className="text-xs text-destructive"
                  onClick={handleClearAllGroups}
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="max-h-[200px] overflow-y-auto py-2">
              {groups.map((group) => {
                const groupId = String(group.id);

                return (
                  <label
                    key={group.id}
                    className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selectedGroups.includes(groupId)}
                      onChange={() => handleGroupToggle(groupId)}
                      disabled={loading}
                    />
                    {group.groupName || group.GroupName}
                  </label>
                );
              })}
            </div>

            <div className="flex justify-end border-t pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => setGroupDropdownOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedGroups.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {groups
            .filter((group) => selectedGroups.includes(String(group.id)))
            .map((group) => (
              <span
                key={group.id}
                className="rounded bg-primary/10 px-2 py-1 text-xs text-primary"
              >
                {group.groupName || group.GroupName}
              </span>
            ))}
        </div>
      )}

      {errors.ItemGroupid && (
        <p className="text-sm text-destructive">{errors.ItemGroupid}</p>
      )}
    </div>
  );

  const renderItemField = () => (
    <div className="space-y-2">
      <Label>
        Item Name <span className="text-destructive">*</span>
      </Label>

      <PaginatedSearchSelect
        endpoint="/api/inventory/item-master"
        value={form.ItemMasterid}
        onChange={handleItemChange}
        placeholder="Select Item"
        searchPlaceholder="Search items..."
        disabled={loading || !selectedGroups.length}
        onOptionsChange={setItems}
        selectedRecord={selectedItem}
        getLabel={(item) =>
          item.ItemName || item.itemName || item.name || `Item #${item.id}`
        }
      />

      {errors.ItemMasterid && (
        <p className="text-sm text-destructive">{errors.ItemMasterid}</p>
      )}
    </div>
  );

  const renderItemConditionField = () => (
    <div className="space-y-2">
      <Label>
        Item Condition <span className="text-destructive">*</span>
      </Label>

      <Select value={String(form.ItemTypeid || "")} disabled>
        <SelectTrigger className="w-full bg-muted">
          <SelectValue placeholder="Automatically selected from Item Master" />
        </SelectTrigger>

        <SelectContent>
          {productTypes.map((type) => (
            <SelectItem key={type.id} value={String(type.id)}>
              {type.ProductType}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {errors.ItemTypeid && (
        <p className="text-sm text-destructive">{errors.ItemTypeid}</p>
      )}
    </div>
  );

  const renderBrandField = () => (
    <div className="space-y-2">
      <Label>Brand / Manufacturer</Label>

      <PaginatedSearchSelect
        endpoint="/api/inventory/brand_manufacturer"
        value={form.BrandManufacturerid}
        onChange={(value) => updateField("BrandManufacturerid", value)}
        placeholder="Select Brand / Manufacturer"
        searchPlaceholder="Search brand or manufacturer..."
        disabled={loading}
        onOptionsChange={setBrands}
        selectedRecord={brands.find(
          (brand) => String(brand.id) === String(form.BrandManufacturerid),
        )}
        getLabel={(brand) => {
          const brandName = brand.brandName || "";
          const manufacturerName = brand.manufacturerName || "";

          if (
            brandName &&
            manufacturerName &&
            brandName.toLowerCase() !== manufacturerName.toLowerCase()
          ) {
            return `${brandName} - ${manufacturerName}`;
          }

          return brandName || manufacturerName || `Brand #${brand.id}`;
        }}
      />
    </div>
  );

  const renderTransactionField = () => (
    <div className="space-y-2">
      <Label>
        Transaction Type <span className="text-destructive">*</span>
      </Label>

      <Select
        value={String(form.TransactionTypeid || "")}
        onValueChange={(value) => updateField("TransactionTypeid", value)}
        disabled={dropdownLoading || loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select Transaction Type" />
        </SelectTrigger>

        <SelectContent>
          {transactions.map((item) => (
            <SelectItem key={item.id} value={String(item.id)}>
              {item.TransactionType ||
                item.transactionType ||
                item.name ||
                `Transaction #${item.id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {errors.TransactionTypeid && (
        <p className="text-sm text-destructive">{errors.TransactionTypeid}</p>
      )}
    </div>
  );

  const renderIssueDateField = () => (
    <div className="space-y-2">
      <Label>
        Date & Time <span className="text-destructive">*</span>
      </Label>

      <DateTimePicker
        value={form.IssueDate}
        onChange={(value) => updateField("IssueDate", value)}
        disabled={loading}
        placeholder="Select Date & Time"
        disableFuture
      />

      {errors.IssueDate && (
        <p className="text-sm text-destructive">{errors.IssueDate}</p>
      )}
    </div>
  );

  const renderDestinationSelector = ({
    title,
    typeValue,
    idValue,
    onTypeChange,
    onIdChange,
    list,
    isLoading,
    typeError,
    idError,
    radioPrefix,
  }) => (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-3">
        <Label className="font-semibold">{title}</Label>

        <RadioGroup
          value={typeValue}
          onValueChange={onTypeChange}
          disabled={loading}
          className="flex flex-wrap gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="location" id={`${radioPrefix}-location`} />
            <Label
              htmlFor={`${radioPrefix}-location`}
              className="cursor-pointer font-normal"
            >
              Warehouse
            </Label>
          </div>

          <div className="flex items-center gap-2">
            <RadioGroupItem value="machinery" id={`${radioPrefix}-machinery`} />
            <Label
              htmlFor={`${radioPrefix}-machinery`}
              className="cursor-pointer font-normal"
            >
              Machine
            </Label>
          </div>
        </RadioGroup>

        {typeError && <p className="text-sm text-destructive">{typeError}</p>}
      </div>

      {typeValue && (
        <div className="space-y-2">
          <Label>
            {typeValue === "location" ? "Select Warehouse" : "Select Machine"}
            <span className="text-destructive"> *</span>
          </Label>

          <Select
            value={String(idValue || "")}
            onValueChange={onIdChange}
            disabled={isLoading || loading || list.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={
                  isLoading
                    ? "Loading..."
                    : list.length
                      ? typeValue === "location"
                        ? "Select Warehouse"
                        : "Select Machine"
                      : "No records found"
                }
              />
            </SelectTrigger>

            <SelectContent>
              {list.map((item) => (
                <SelectItem key={item.id} value={String(item.id)}>
                  {getDestinationName(item, typeValue)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {idError && <p className="text-sm text-destructive">{idError}</p>}
        </div>
      )}
    </div>
  );

  const renderPreviousQty = (label, quantity) => (
    <div className="space-y-2">
      <Label>{label}</Label>

      <div className="relative">
        <Input
          type="number"
          value={Number(quantity) || 0}
          readOnly
          className={unitLabel ? "bg-muted pr-36" : "bg-muted"}
        />

        {unitLabel && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {unitLabel}
          </span>
        )}
      </div>
    </div>
  );

  const renderQuantityRateFields = () => (
    <>
      <div className="space-y-2">
        <Label>
          Quantity <span className="text-destructive">*</span>
        </Label>

        <div className="relative">
          <Input
            type="number"
            min="1"
            step="1"
            placeholder="Enter quantity"
            value={form.Qty}
            onChange={(event) => updateField("Qty", event.target.value)}
            disabled={loading}
            className={unitLabel ? "pr-36" : ""}
          />

          {unitLabel && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              {unitLabel}
            </span>
          )}
        </div>

        {errors.Qty && <p className="text-sm text-destructive">{errors.Qty}</p>}
      </div>

      <div className="space-y-2">
        <Label>
          Rate (₹) <span className="text-destructive">*</span>
        </Label>

        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Enter rate"
          value={form.Price}
          onChange={(event) => updateField("Price", event.target.value)}
          disabled={loading}
        />

        {errors.Price && (
          <p className="text-sm text-destructive">{errors.Price}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Total Amount (Rate × Quantity)</Label>
        <Input
          type="number"
          value={total}
          readOnly
          className="bg-muted font-medium"
        />
      </div>
    </>
  );

  const renderCommentField = () => (
    <div className="space-y-2">
      <Label>Comment</Label>

      <Textarea
        placeholder="Enter additional comments..."
        value={form.Comment}
        onChange={(event) => updateField("Comment", event.target.value)}
        maxLength={1000}
        rows={4}
        disabled={loading}
        className="resize-none"
      />

      <div className="flex justify-between">
        {errors.Comment ? (
          <p className="text-sm text-destructive">{errors.Comment}</p>
        ) : (
          <span />
        )}

        <p className="text-xs text-muted-foreground">
          {form.Comment.length}/1000
        </p>
      </div>
    </div>
  );

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) handleClose();
      }}
    >
       <DialogContent className="max-w-4xl max-h-[95vh]">
        <DialogHeader>
          <DialogTitle>Edit Stock Movement</DialogTitle>
          <DialogDescription>
            Update the inward or internal transfer stock movement details.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setErrors({});
            setGroupDropdownOpen(false);
          }}
          className="w-full space-y-5"
        >
          <TabsList variant="line">
            <TabsTrigger value="inward" className="justify-start">
              <ArrowRight className="h-4 w-4" />
              Inward
            </TabsTrigger>

            <TabsTrigger
              value="internal-transfer"
              className="justify-start"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Internal Transfer
            </TabsTrigger>
          </TabsList>

           <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[70vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-4 px-0 min-h-0">
              {/* INWARD */}

              <TabsContent value="inward" className="mt-0 space-y-6">
                {renderItemGroupField()}
                {renderItemField()}
                {renderItemConditionField()}
                {renderBrandField()}
                {renderTransactionField()}
                {renderIssueDateField()}

                <div className="space-y-2">
                  <Label>
                    User Role <span className="text-destructive">*</span>
                  </Label>

                  <Select
                    value={selectedRole}
                    onValueChange={handleRoleChange}
                    disabled={rolesLoading || loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select User Role" />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {roleList.map((role) => (
                        <SelectItem key={role.id} value={String(role.id)}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>
                    User <span className="text-destructive">*</span>
                  </Label>

                  <Select
                    value={String(form.Issue_by || "")}
                    onValueChange={(value) => updateField("Issue_by", value)}
                    disabled={staffLoading || loading}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          staffLoading ? "Loading users..." : "Select User"
                        }
                      />
                    </SelectTrigger>

                    <SelectContent>
                      {staffUsers.map((staff) => (
                        <SelectItem key={staff.id} value={String(staff.id)}>
                          {getStaffName(staff)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {errors.Issue_by && (
                    <p className="text-sm text-destructive">
                      {errors.Issue_by}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Challan/Bill Number</Label>
                  <Input
                    placeholder="Enter Challan/Bill Number"
                    value={form.ReciptChallanNo}
                    onChange={(event) =>
                      updateField("ReciptChallanNo", event.target.value)
                    }
                    disabled={loading}
                    maxLength={100}
                  />
                  {errors.ReciptChallanNo && (
                    <p className="text-sm text-destructive">
                      {errors.ReciptChallanNo}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Challan/Bill Date & Time</Label>
                  <DateTimePicker
                    value={form.ReceiptDate}
                    onChange={(value) => updateField("ReceiptDate", value)}
                    disabled={loading}
                    placeholder="Select Challan/Bill Date & Time"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Requisition Slip Number</Label>
                  <Input
                    placeholder="Enter Requisition Slip Number"
                    value={form.RequisitionSupplyNo}
                    onChange={(event) =>
                      updateField("RequisitionSupplyNo", event.target.value)
                    }
                    disabled={loading}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Requisition Slip Date & Time</Label>
                  <DateTimePicker
                    value={form.RequisitionSupplyDate}
                    onChange={(value) =>
                      updateField("RequisitionSupplyDate", value)
                    }
                    disabled={loading}
                    placeholder="Select Requisition Date & Time"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Purchase Order Number</Label>
                  <Input
                    placeholder="Enter Purchase Order Number"
                    value={form.PurchaseNo}
                    onChange={(event) =>
                      updateField("PurchaseNo", event.target.value)
                    }
                    disabled={loading}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Purchase Order Date & Time</Label>
                  <DateTimePicker
                    value={form.PurchaseDate}
                    onChange={(value) => updateField("PurchaseDate", value)}
                    disabled={loading}
                    placeholder="Select Purchase Order Date & Time"
                  />
                </div>

                {renderQuantityRateFields()}

                {renderDestinationSelector({
                  title: "Receipt To",
                  typeValue: form.DestinationType,
                  idValue: form.DestinationId,
                  onTypeChange: handleDestinationTypeChange,
                  onIdChange: handleDestinationIdChange,
                  list: destinationList,
                  isLoading: destinationLoading,
                  typeError: errors.DestinationType,
                  idError: errors.DestinationId,
                  radioPrefix: "edit-inward-receive",
                })}

                {renderPreviousQty(
                  "Receipt To Previous Quantity",
                  receivePreviousQty,
                )}

                <div className="space-y-2">
                  <Label>Final Balance (Receive To)</Label>
                  <Input
                    type="number"
                    value={form.Balance}
                    readOnly
                    className="bg-muted font-medium"
                  />
                </div>

                {renderCommentField()}
              </TabsContent>

              {/* INTERNAL TRANSFER */}

              <TabsContent value="internal-transfer" className="mt-0 space-y-6">
                {renderItemGroupField()}
                {renderItemField()}
                {renderItemConditionField()}
                {renderBrandField()}
                {renderTransactionField()}
                {renderIssueDateField()}

                {renderDestinationSelector({
                  title: "Issue From",
                  typeValue: form.IssueFromType,
                  idValue: form.IssueFromId,
                  onTypeChange: handleIssueFromTypeChange,
                  onIdChange: handleIssueFromIdChange,
                  list: issueFromList,
                  isLoading: issueFromLoading,
                  typeError: errors.IssueFromType,
                  idError: errors.IssueFromId,
                  radioPrefix: "edit-transfer-issue-from",
                })}

                {renderPreviousQty(
                  "Issue From Previous Quantity",
                  issueFromPreviousQty,
                )}

                <div className="space-y-2">
                  <Label>Issue Slip/Gate Pass</Label>
                  <Input
                    placeholder="Enter Issue Slip/Gate Pass"
                    value={form.GetPassNo}
                    onChange={(event) =>
                      updateField("GetPassNo", event.target.value)
                    }
                    disabled={loading}
                    maxLength={100}
                  />
                  {errors.GetPassNo && (
                    <p className="text-sm text-destructive">
                      {errors.GetPassNo}
                    </p>
                  )}
                </div>

                {renderQuantityRateFields()}

                {renderDestinationSelector({
                  title: "Receipt To",
                  typeValue: form.ReceiveToType,
                  idValue: form.ReceiveToId,
                  onTypeChange: handleTransferReceiveTypeChange,
                  onIdChange: handleReceiveToIdChange,
                  list: transferReceiveList,
                  isLoading: transferReceiveLoading,
                  typeError: errors.ReceiveToType,
                  idError: errors.ReceiveToId,
                  radioPrefix: "edit-transfer-receive-to",
                })}

                {renderPreviousQty(
                  "Receipt To Previous Quantity",
                  transferReceivePreviousQty,
                )}

                <div className="space-y-2">
                  <Label>Issue From Final Balance</Label>
                  <Input
                    type="number"
                    value={form.Balance}
                    readOnly
                    className="bg-muted font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Receipt To Final Balance</Label>
                  <Input
                    type="number"
                    value={transferReceiveFinalBalance}
                    readOnly
                    className="bg-muted font-medium"
                  />
                </div>

                {renderCommentField()}
              </TabsContent>
            </DialogBody>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || dropdownLoading || status === "loading"}
          >
            {loading ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}