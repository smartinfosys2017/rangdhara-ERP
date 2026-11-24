"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar as CalendarIcon, ArrowRight, ArrowLeftRight } from "lucide-react";
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

const getToday = () => format(new Date(), "yyyy-MM-dd");

const getInitialForm = () => ({
  ItemGroupid: "",
  GroupName: [],
  ItemMasterid: "",
  BrandManufacturerid: "",
  ItemTypeid: "",
  TransactionTypeid: "",
  IssueDate: `${getToday()}T10:00`,

  Qty: "",
  PreviousBalance: 0,
  Balance: 0,
  Issue_by: "",
  RecivedBy: "",

  // Internal Transfer
  GetPassNo: "",
  IssueFromType: "",
  IssueFromId: "",
  ReceiveToType: "",
  ReceiveToId: "",

  // Inward receipt details
  ReciptChallanNo: "",
  ReceiptDate: "",
  RequisitionSupplyNo: "",
  RequisitionSupplyDate: "",
  PurchaseNo: "",
  PurchaseDate: "",

  DateOfRecive: "",
  Comment: "",
  Price: "",
  Particuler: "",

  // Existing inward destination fields
  DestinationType: "",
  DestinationId: "",
});

const getArray = (data) => (Array.isArray(data) ? data : []);

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

const getBalanceFromResponse = (data) => {
  return {
    PreviousBalance: Number(
      data?.PreviousBalance ??
      data?.previousBalance ??
      data?.Balance ??
      data?.balance ??
      0,
    ),
    Rate: Number(data?.Rate ?? data?.rate ?? 0),
    Balance: Number(data?.Balance ?? data?.balance ?? 0),
  };
};

// --------------------------------------------------
// TOAST
// --------------------------------------------------

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

  const handleDateChange = (newDate) => {
    if (!newDate) return;

    const dateString = format(newDate, "yyyy-MM-dd");
    onChange(`${dateString}T${selectedTime || "10:00"}`);
  };

  const handleTimeChange = (newTime) => {
    if (!selectedDate) return;

    onChange(`${format(selectedDate, "yyyy-MM-dd")}T${newTime}`);
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

          {value ? (
            `${format(
              new Date(`${value.slice(0, 10)}T00:00:00`),
              "PPP",
            )} - ${selectedTime || "Select time"}`
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex max-sm:flex-col">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateChange}
            disabled={disableFuture ? [{ after: today }] : undefined}
            className="p-2 sm:pe-5"
          />

          <div className="relative w-full sm:w-40 max-sm:h-48">
            <div className="absolute inset-0 py-4 max-sm:border-t">
              <ScrollArea className="h-full sm:border-s">
                <div className="space-y-3">
                  <div className="flex h-5 shrink-0 items-center px-5">
                    <p className="text-sm font-medium">
                      {selectedDate
                        ? format(selectedDate, "EEEE, d")
                        : "Pick a date"}
                    </p>
                  </div>

                  <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                    {timeSlots.map((timeSlot) => {
                      const isSelected = selectedTime === timeSlot;

                      const isPast =
                        disableFuture &&
                        selectedDate &&
                        format(selectedDate, "yyyy-MM-dd") ===
                        format(today, "yyyy-MM-dd") &&
                        timeSlot >
                        `${String(today.getHours()).padStart(
                          2,
                          "0",
                        )}:${String(today.getMinutes()).padStart(2, "0")}`;

                      return (
                        <Button
                          key={timeSlot}
                          type="button"
                          variant={isSelected ? "primary" : "outline"}
                          size="sm"
                          className="w-full"
                          disabled={!selectedDate || isPast}
                          onClick={() => handleTimeChange(timeSlot)}
                        >
                          {timeSlot}
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

function PaginatedSearchSelect({
  endpoint,
  value,
  onChange,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  getLabel,
  disabled = false,
  onOptionsChange,
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
        setPage(1);
        setOptions([]);

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

        const records = getArray(result.data);
        setOptions(records);
        setPage(Number(result.pagination?.page) || 1);
        setTotalPages(Number(result.pagination?.totalPages) || 1);
        onOptionsChange?.(records);
      } catch (error) {
        if (!cancelled) {
          setOptions([]);
          setTotalPages(1);
          console.error("DROPDOWN FETCH ERROR:", error);
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

    const nextPage = page + 1;

    try {
      setLoadingMore(true);

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
        const existingIds = new Set(previous.map((item) => String(item.id)));
        const merged = [
          ...previous,
          ...records.filter((item) => !existingIds.has(String(item.id))),
        ];

        onOptionsChange?.(merged);
        return merged;
      });

      setPage(Number(result.pagination?.page) || nextPage);
      setTotalPages(Number(result.pagination?.totalPages) || totalPages);
    } catch (error) {
      console.error("DROPDOWN LOAD MORE ERROR:", error);
      showErrorToast(error.message || "Failed to load more options.");
    } finally {
      setLoadingMore(false);
    }
  };

  const selectedOption = options.find(
    (item) => String(item.id) === String(value),
  );

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
            const nearBottom =
              element.scrollTop + element.clientHeight >=
              element.scrollHeight - 30;

            if (nearBottom) loadMore();
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
                  className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-muted ${String(value) === String(option.id) ? "bg-muted" : ""
                    }`}
                  onClick={() => {
                    onChange(String(option.id));
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

              {!loadingMore && page >= totalPages && (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  No more records
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
// COMPONENT
// --------------------------------------------------

export default function IssueReceiptAddDialog({
  open,
  closeDialog,
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
  const [form, setForm] = useState(getInitialForm());

  // Inward Receive To
  const [destinationList, setDestinationList] = useState([]);
  const [destinationLoading, setDestinationLoading] = useState(false);
  const [receivePreviousQty, setReceivePreviousQty] = useState(0);

  // Internal Transfer Issue From
  const [issueFromList, setIssueFromList] = useState([]);
  const [issueFromLoading, setIssueFromLoading] = useState(false);
  const [issueFromPreviousQty, setIssueFromPreviousQty] = useState(0);

  // Internal Transfer Receive To
  const [transferReceiveList, setTransferReceiveList] = useState([]);
  const [transferReceiveLoading, setTransferReceiveLoading] = useState(false);
  const [transferReceivePreviousQty, setTransferReceivePreviousQty] =
    useState(0);

  // --------------------------------------------------
  // FIELD UPDATE
  // --------------------------------------------------

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [key]: "",
    }));
  };

  // --------------------------------------------------
  // BALANCE CALCULATION
  // --------------------------------------------------

  // const calculateBalance = (
  //   previousBalance,
  //   qty,
  //   transactionTypeId,
  //   transactionList = transactions,
  // ) => {
  //   const previous = Number(previousBalance) || 0;
  //   const quantity = Number(qty) || 0;

  //   const transaction = transactionList.find(
  //     (item) => String(item.id) === String(transactionTypeId),
  //   );

  //   if (!transaction) return previous;

  //   const effect = String(
  //     transaction.EffectOnTransaction ?? transaction.effectOnTransaction ?? "",
  //   )
  //     .trim()
  //     .toLowerCase();

  //   if (["addition", "add", "additions"].includes(effect)) {
  //     return previous + quantity;
  //   }

  //   if (
  //     ["deduction", "deductions", "deduct", "subtract", "subtraction"].includes(
  //       effect,
  //     )
  //   ) {
  //     return previous - quantity;
  //   }

  //   return previous;
  // };
  // --------------------------------------------------
  // BALANCE CALCULATION
  // --------------------------------------------------

  const calculateInwardBalance = (previousBalance, qty) => {
    return (Number(previousBalance) || 0) + (Number(qty) || 0);
  };

  const calculateIssueFromBalance = (previousBalance, qty) => {
    return (Number(previousBalance) || 0) - (Number(qty) || 0);
  };

  const calculateReceiveToBalance = (previousBalance, qty) => {
    return (Number(previousBalance) || 0) + (Number(qty) || 0);
  };
  // --------------------------------------------------
  // FILTER ITEMS BY SELECTED GROUPS
  // --------------------------------------------------

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

      const [
        groupResponse,
        itemResponse,
        transactionResponse,
        productTypeResponse,
        unitResponse,
      ] = await Promise.all([
        apiFetch("/api/inventory/item-groups?limit=100&status=active"),
        apiFetch("/api/inventory/item-master?limit=100&status=active"),
        apiFetch("/api/inventory/transaction-type?limit=100&status=active"),
        apiFetch("/api/inventory/product-type?limit=100&status=active"),
        apiFetch("/api/inventory/unit?limit=100&status=active"),
      ]);

      const [
        groupResult,
        itemResult,
        transactionResult,
        productTypeResult,
        unitResult,
      ] = await Promise.all([
        groupResponse.json(),
        itemResponse.json(),
        transactionResponse.json(),
        productTypeResponse.json(),
        unitResponse.json(),
      ]);

      if (!groupResponse.ok || !groupResult.success) {
        throw new Error(groupResult.message || "Failed to load item groups.");
      }

      if (!itemResponse.ok || !itemResult.success) {
        throw new Error(itemResult.message || "Failed to load items.");
      }

      if (!transactionResponse.ok || !transactionResult.success) {
        throw new Error(
          transactionResult.message || "Failed to load transaction types.",
        );
      }

      if (!productTypeResponse.ok || !productTypeResult.success) {
        throw new Error(
          productTypeResult.message || "Failed to load product types.",
        );
      }

      if (!unitResponse.ok || !unitResult.success) {
        throw new Error(unitResult.message || "Failed to load units.");
      }

      const groupList = getArray(groupResult.data);
      const itemList = getArray(itemResult.data);
      const transactionList = getArray(transactionResult.data);
      const productTypeList = getArray(productTypeResult.data);
      const unitList = getArray(unitResult.data);

      setGroups(groupList);
      setItems(itemList);
      setTransactions(transactionList);
      setProductTypes(productTypeList);
      setUnits(unitList);

      const allGroupIds = groupList.map((group) => String(group.id));
      setSelectedGroups(allGroupIds);

      const defaultTransaction =
        transactionList.find((item) => item.isDefault === true) ||
        transactionList[0];

      setForm((prev) => ({
        ...prev,
        GroupName: groupList
          .map((group) => group.groupName || group.GroupName)
          .filter(Boolean),
        TransactionTypeid: defaultTransaction
          ? String(defaultTransaction.id)
          : "",
      }));
    } catch (error) {
      console.error("STOCK MOVEMENT DROPDOWN ERROR:", error);
      showErrorToast(error.message || "Failed to load dropdown data.");
    } finally {
      setDropdownLoading(false);
    }
  };

  // --------------------------------------------------
  // FETCH ITEM BALANCE
  // --------------------------------------------------

  const fetchPreviousBalance = async (
    itemMasterId,
    itemTypeId,
    locationType,
    locationId,
  ) => {
    if (!itemMasterId || !itemTypeId || !locationType || !locationId) {
      return {
        PreviousBalance: 0,
        Rate: 0,
        Balance: 0,
      };
    }

    const params = new URLSearchParams({
      itemTypeId: String(itemTypeId),
      locationType: String(locationType).toUpperCase(),
      locationId: String(locationId),
    });

    const response = await apiFetch(
      `/api/inventory/issue-receipt/previous-balance/${itemMasterId}?${params.toString()}`,
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to fetch previous balance and rate.",
      );
    }

    return getBalanceFromResponse(result.data);
  };

  // Fetch balance for a particular location or machine.
  const fetchDestinationBalance = async (
    itemMasterId,
    itemTypeId,
    destinationType,
    destinationId,
  ) => {
    if (
      !itemMasterId ||
      !itemTypeId ||
      !destinationType ||
      !destinationId
    ) {
      return {
        PreviousBalance: 0,
        Rate: 0,
        Balance: 0,
      };
    }

    const locationType =
      String(destinationType).toUpperCase() === "MACHINERY"
        ? "MACHINE"
        : String(destinationType).toUpperCase();

    const params = new URLSearchParams({
      itemTypeId: String(itemTypeId),
      locationType,
      locationId: String(destinationId),
    });

    const response = await apiFetch(
      `/api/inventory/issue-receipt/previous-balance/${itemMasterId}?${params.toString()}`,
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
        "Failed to fetch stock balance for the selected destination.",
      );
    }

    return getBalanceFromResponse(result.data);
  };

  // --------------------------------------------------
  // GROUP SELECTION
  // --------------------------------------------------

  const resetItemSelection = () => {
    setForm((prev) => ({
      ...prev,
      ItemMasterid: "",
      ItemGroupid: "",
      ItemTypeid: "",
      PreviousBalance: 0,
      Balance: 0,
      Price: "",
    }));

    setReceivePreviousQty(0);
    setIssueFromPreviousQty(0);
    setTransferReceivePreviousQty(0);
  };

  const handleGroupToggle = (groupId) => {
    const updated = selectedGroups.includes(groupId)
      ? selectedGroups.filter((id) => id !== groupId)
      : [...selectedGroups, groupId];

    setSelectedGroups(updated);

    const selectedNames = groups
      .filter((group) => updated.includes(String(group.id)))
      .map((group) => group.groupName || group.GroupName)
      .filter(Boolean);

    setForm((prev) => ({
      ...prev,
      GroupName: selectedNames,
      ItemMasterid: "",
      ItemGroupid: "",
      ItemTypeid: "",
      PreviousBalance: 0,
      Balance: 0,
      Price: "",
    }));

    setReceivePreviousQty(0);
    setIssueFromPreviousQty(0);
    setTransferReceivePreviousQty(0);

    setErrors((prev) => ({
      ...prev,
      ItemGroupid: updated.length ? "" : "Item Group is required.",
      ItemMasterid: "",
      ItemTypeid: "",
    }));
  };

  const handleSelectAllGroups = () => {
    const allGroupIds = groups.map((group) => String(group.id));

    setSelectedGroups(allGroupIds);

    setForm((prev) => ({
      ...prev,
      GroupName: groups
        .map((group) => group.groupName || group.GroupName)
        .filter(Boolean),
      ItemMasterid: "",
      ItemGroupid: "",
      ItemTypeid: "",
      PreviousBalance: 0,
      Balance: 0,
      Price: "",
    }));

    setReceivePreviousQty(0);
    setIssueFromPreviousQty(0);
    setTransferReceivePreviousQty(0);

    setErrors((prev) => ({
      ...prev,
      ItemGroupid: "",
      ItemMasterid: "",
      ItemTypeid: "",
    }));
  };

  const handleClearAllGroups = () => {
    setSelectedGroups([]);

    setForm((prev) => ({
      ...prev,
      GroupName: [],
      ItemGroupid: "",
      ItemMasterid: "",
      ItemTypeid: "",
      PreviousBalance: 0,
      Balance: 0,
      Price: "",
    }));

    setReceivePreviousQty(0);
    setIssueFromPreviousQty(0);
    setTransferReceivePreviousQty(0);

    setErrors((prev) => ({
      ...prev,
      ItemGroupid: "Item Group is required.",
      ItemMasterid: "",
      ItemTypeid: "",
    }));
  };

  // --------------------------------------------------
  // ITEM SELECTION
  // --------------------------------------------------

  const handleItemChange = (value) => {
    const selectedItem = items.find(
      (item) => String(item.id) === String(value),
    );

    if (!selectedItem) return;

    const groupId = getItemGroupId(selectedItem);
    const conditionId = getItemConditionId(selectedItem);

    const matchedCondition = productTypes.find(
      (type) => String(type.id) === String(conditionId),
    );

    const itemTypeId = matchedCondition
      ? String(matchedCondition.id)
      : "";

    setForm((prev) => ({
      ...prev,
      ItemMasterid: value,
      ItemGroupid: groupId,
      ItemTypeid: itemTypeId,
      PreviousBalance: 0,
      Balance: 0,
      Price: "",
    }));

    setReceivePreviousQty(0);
    setIssueFromPreviousQty(0);
    setTransferReceivePreviousQty(0);

    setErrors((prev) => ({
      ...prev,
      ItemMasterid: "",
      ItemTypeid: matchedCondition
        ? ""
        : "Item condition is missing in Item Master.",
      Price: "",
    }));
  };

  // --------------------------------------------------
  // TRANSACTION TYPE CHANGE
  // --------------------------------------------------

  const handleTransactionChange = (value) => {
    setForm((prev) => ({
      ...prev,
      TransactionTypeid: value,
    }));

    setErrors((prev) => ({
      ...prev,
      TransactionTypeid: "",
    }));
  };

  // --------------------------------------------------
  // QUANTITY CHANGE
  // --------------------------------------------------

  const handleQtyChange = (value) => {
    setForm((prev) => ({
      ...prev,
      Qty: value,
    }));

    setErrors((prev) => ({
      ...prev,
      Qty: "",
    }));
  };

  // --------------------------------------------------
  // ROLE CHANGE
  // --------------------------------------------------

  const handleRoleChange = (value) => {
    setSelectedRole(value);

    setForm((prev) => ({
      ...prev,
      Issue_by: "",
      RecivedBy: "",
    }));

    setErrors((prev) => ({
      ...prev,
      Issue_by: "",
      RecivedBy: "",
    }));
  };

  // --------------------------------------------------
  // DESTINATION TYPE CHANGE
  // --------------------------------------------------

  const handleDestinationTypeChange = (value) => {
    setForm((prev) => ({
      ...prev,
      DestinationType: value,
      DestinationId: "",
    }));

    setDestinationList([]);
    setReceivePreviousQty(0);

    setErrors((prev) => ({
      ...prev,
      DestinationType: "",
      DestinationId: "",
    }));
  };

  const handleIssueFromTypeChange = (value) => {
    setForm((prev) => ({
      ...prev,
      IssueFromType: value,
      IssueFromId: "",
    }));

    setIssueFromList([]);
    setIssueFromPreviousQty(0);

    setErrors((prev) => ({
      ...prev,
      IssueFromType: "",
      IssueFromId: "",
    }));
  };

  const handleTransferReceiveTypeChange = (value) => {
    setForm((prev) => ({
      ...prev,
      ReceiveToType: value,
      ReceiveToId: "",
    }));

    setTransferReceiveList([]);
    setTransferReceivePreviousQty(0);

    setErrors((prev) => ({
      ...prev,
      ReceiveToType: "",
      ReceiveToId: "",
    }));
  };

  // --------------------------------------------------
  // FETCH USERS BY ROLE
  // --------------------------------------------------

  useEffect(() => {
    if (!open) return;

    let ignore = false;

    const fetchStaffUsers = async () => {
      try {
        setStaffLoading(true);
        setStaffUsers([]);

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
        console.error("STAFF FETCH ERROR:", error);

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
  // RESET AND LOAD WHEN DIALOG OPENS
  // --------------------------------------------------

  useEffect(() => {
    if (!open) return;

    setForm(getInitialForm());
    setErrors({});
    setGroups([]);
    setItems([]);
    setTransactions([]);
    setProductTypes([]);
    setUnits([]);
    setStaffUsers([]);
    setSelectedGroups([]);
    setSelectedRole("all");
    setActiveTab("inward");
    setGroupDropdownOpen(false);

    setDestinationList([]);
    setIssueFromList([]);
    setTransferReceiveList([]);

    setReceivePreviousQty(0);
    setIssueFromPreviousQty(0);
    setTransferReceivePreviousQty(0);

    loadDropdowns();
  }, [open]);

  // --------------------------------------------------
  // FETCH INWARD RECEIVE TO OPTIONS
  // --------------------------------------------------

  useEffect(() => {
    if (!open || !form.DestinationType) {
      setDestinationList([]);
      return;
    }

    let ignore = false;

    const fetchDestinations = async () => {
      try {
        setDestinationLoading(true);

        const endpoint =
          form.DestinationType === "location"
            ? "/api/inventory/location?limit=100&status=active"
            : "/api/inventory/machine-master?limit=100&status=active";

        const response = await apiFetch(endpoint);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load Receive To options.",
          );
        }

        if (!ignore) setDestinationList(getArray(result.data));
      } catch (error) {
        console.error("INWARD DESTINATION ERROR:", error);

        if (!ignore) {
          setDestinationList([]);
          showErrorToast(error.message || "Failed to load destinations.");
        }
      } finally {
        if (!ignore) setDestinationLoading(false);
      }
    };

    fetchDestinations();

    return () => {
      ignore = true;
    };
  }, [open, form.DestinationType]);

  // --------------------------------------------------
  // FETCH INTERNAL TRANSFER ISSUE FROM OPTIONS
  // --------------------------------------------------

  useEffect(() => {
    if (!open || !form.IssueFromType) {
      setIssueFromList([]);
      return;
    }

    let ignore = false;

    const fetchIssueFromOptions = async () => {
      try {
        setIssueFromLoading(true);

        const endpoint =
          form.IssueFromType === "location"
            ? "/api/inventory/location?limit=100&status=active"
            : "/api/inventory/machine-master?limit=100&status=active";

        const response = await apiFetch(endpoint);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load Issue From options.",
          );
        }

        if (!ignore) setIssueFromList(getArray(result.data));
      } catch (error) {
        console.error("ISSUE FROM FETCH ERROR:", error);

        if (!ignore) {
          setIssueFromList([]);
          showErrorToast(error.message || "Failed to load Issue From options.");
        }
      } finally {
        if (!ignore) setIssueFromLoading(false);
      }
    };

    fetchIssueFromOptions();

    return () => {
      ignore = true;
    };
  }, [open, form.IssueFromType]);

  // --------------------------------------------------
  // FETCH INTERNAL TRANSFER RECEIVE TO OPTIONS
  // --------------------------------------------------

  useEffect(() => {
    if (!open || !form.ReceiveToType) {
      setTransferReceiveList([]);
      return;
    }

    let ignore = false;

    const fetchReceiveToOptions = async () => {
      try {
        setTransferReceiveLoading(true);

        const endpoint =
          form.ReceiveToType === "location"
            ? "/api/inventory/location?limit=100&status=active"
            : "/api/inventory/machine-master?limit=100&status=active";

        const response = await apiFetch(endpoint);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to load Receive To options.",
          );
        }

        if (!ignore) setTransferReceiveList(getArray(result.data));
      } catch (error) {
        console.error("TRANSFER RECEIVE TO FETCH ERROR:", error);

        if (!ignore) {
          setTransferReceiveList([]);
          showErrorToast(error.message || "Failed to load Receive To options.");
        }
      } finally {
        if (!ignore) setTransferReceiveLoading(false);
      }
    };

    fetchReceiveToOptions();

    return () => {
      ignore = true;
    };
  }, [open, form.ReceiveToType]);

  // --------------------------------------------------
  // FETCH INWARD RECEIVE TO PREVIOUS QUANTITY
  // --------------------------------------------------

  useEffect(() => {
    if (
      !open ||
      !form.ItemMasterid ||
      !form.ItemTypeid ||
      !form.DestinationType ||
      !form.DestinationId
    ) {
      setReceivePreviousQty(0);
      return;
    }

    let ignore = false;

    const fetchBalance = async () => {
      try {
        setReceivePreviousQty(0);

        const result = await fetchDestinationBalance(
          form.ItemMasterid,
          form.ItemTypeid,
          form.DestinationType,
          form.DestinationId,
        );

        if (!ignore) {
          setReceivePreviousQty(result.PreviousBalance);
        }
      } catch (error) {
        console.error("INWARD DESTINATION BALANCE ERROR:", error);

        if (!ignore) {
          setReceivePreviousQty(0);

          showErrorToast(
            error.message || "Failed to fetch Receive To previous quantity.",
          );
        }
      }
    };

    fetchBalance();

    return () => {
      ignore = true;
    };
  }, [
    open,
    form.ItemMasterid,
    form.ItemTypeid,
    form.DestinationType,
    form.DestinationId,
  ]);
  // --------------------------------------------------
  // FETCH INTERNAL TRANSFER ISSUE FROM PREVIOUS QUANTITY
  // --------------------------------------------------

  useEffect(() => {
    if (
      !open ||
      !form.ItemMasterid ||
      !form.ItemTypeid ||
      !form.IssueFromType ||
      !form.IssueFromId
    ) {
      setIssueFromPreviousQty(0);
      return;
    }

    let ignore = false;

    const fetchBalance = async () => {
      try {
        setIssueFromPreviousQty(0);

        const result = await fetchDestinationBalance(
          form.ItemMasterid,
          form.ItemTypeid,
          form.IssueFromType,
          form.IssueFromId,
        );

        if (!ignore) {
          setIssueFromPreviousQty(result.PreviousBalance);
        }
      } catch (error) {
        console.error("ISSUE FROM BALANCE ERROR:", error);

        if (!ignore) {
          setIssueFromPreviousQty(0);

          showErrorToast(
            error.message || "Failed to fetch Issue From previous quantity.",
          );
        }
      }
    };

    fetchBalance();

    return () => {
      ignore = true;
    };
  }, [
    open,
    form.ItemMasterid,
    form.ItemTypeid,
    form.IssueFromType,
    form.IssueFromId,
  ]);
  // --------------------------------------------------
  // FETCH INTERNAL TRANSFER RECEIVE TO PREVIOUS QUANTITY
  // --------------------------------------------------

  useEffect(() => {
    if (
      !open ||
      !form.ItemMasterid ||
      !form.ItemTypeid ||
      !form.ReceiveToType ||
      !form.ReceiveToId
    ) {
      setTransferReceivePreviousQty(0);
      return;
    }

    let ignore = false;

    const fetchBalance = async () => {
      try {
        setTransferReceivePreviousQty(0);

        const result = await fetchDestinationBalance(
          form.ItemMasterid,
          form.ItemTypeid,
          form.ReceiveToType,
          form.ReceiveToId,
        );

        if (!ignore) {
          setTransferReceivePreviousQty(result.PreviousBalance);
        }
      } catch (error) {
        console.error("TRANSFER RECEIVE BALANCE ERROR:", error);

        if (!ignore) {
          setTransferReceivePreviousQty(0);

          showErrorToast(
            error.message || "Failed to fetch Receive To previous quantity.",
          );
        }
      }
    };

    fetchBalance();

    return () => {
      ignore = true;
    };
  }, [
    open,
    form.ItemMasterid,
    form.ItemTypeid,
    form.ReceiveToType,
    form.ReceiveToId,
  ]);
  // --------------------------------------------------
  // AUTO UPDATE PREVIOUS BALANCE AND FINAL BALANCE
  // --------------------------------------------------

  useEffect(() => {
    if (!open) return;

    const qty = Number(form.Qty) || 0;

    if (activeTab === "inward") {
      const previousBalance = Number(receivePreviousQty) || 0;

      setForm((prev) => ({
        ...prev,
        PreviousBalance: previousBalance,
        Balance: calculateInwardBalance(previousBalance, qty),
      }));

      return;
    }

    // Internal Transfer: Balance represents remaining stock
    // at the Issue From location/machine.
    const previousBalance = Number(issueFromPreviousQty) || 0;

    setForm((prev) => ({
      ...prev,
      PreviousBalance: previousBalance,
      Balance: calculateIssueFromBalance(previousBalance, qty),
    }));
  }, [
    open,
    activeTab,
    form.Qty,
    receivePreviousQty,
    issueFromPreviousQty,
  ]);
  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const validateCommonFields = (newErrors) => {
    if (!selectedGroups.length) {
      newErrors.ItemGroupid = "Item Group is required.";
    }

    if (!form.ItemMasterid) {
      newErrors.ItemMasterid = "Item is required.";
    }

    if (!form.ItemTypeid) {
      newErrors.ItemTypeid = "Item Condition is required in Item Master.";
    }

    if (!form.TransactionTypeid) {
      newErrors.TransactionTypeid = "Transaction Type is required.";
    }

    if (!form.IssueDate) {
      newErrors.IssueDate = "Date and time is required.";
    }

    if (form.IssueDate && new Date(form.IssueDate) > new Date()) {
      newErrors.IssueDate = "Date and time cannot be in the future.";
    }
  };

  const validateInwardForm = () => {
    const newErrors = {};

    validateCommonFields(newErrors);

    if (!selectedRole) {
      newErrors.UserRole = "User Role is required.";
    }

    if (!form.Issue_by) {
      newErrors.Issue_by = "User is required.";
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

    if (form.Comment.length > 1000) {
      newErrors.Comment = "Comment cannot exceed 1000 characters.";
    }

    if (form.ReciptChallanNo.length > 100) {
      newErrors.ReciptChallanNo =
        "Challan/Bill Number cannot exceed 100 characters.";
    }

    if (!form.DestinationType) {
      newErrors.DestinationType =
        "Please select Receive To Warehouse or Machine.";
    }

    if (form.DestinationType && !form.DestinationId) {
      newErrors.DestinationId = "Please select a Receive To destination.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      showErrorToast("Please correct the highlighted fields.");
      return false;
    }

    return true;
  };

  const validateInternalTransferForm = () => {
    const newErrors = {};

    validateCommonFields(newErrors);

    if (!form.IssueFromType) {
      newErrors.IssueFromType = "Please select Issue From Warehouse or Machine.";
    }

    if (form.IssueFromType && !form.IssueFromId) {
      newErrors.IssueFromId = "Please select an Issue From destination.";
    }

    if (!form.ReceiveToType) {
      newErrors.ReceiveToType = "Please select Receive To Warehouse or Machine.";
    }

    if (form.ReceiveToType && !form.ReceiveToId) {
      newErrors.ReceiveToId = "Please select a Receive To destination.";
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

    if (!String(form.Qty).trim()) {
      newErrors.Qty = "Quantity is required.";
    } else if (!Number.isFinite(Number(form.Qty)) || Number(form.Qty) <= 0) {
      newErrors.Qty = "Quantity must be greater than 0.";
    } else if (!Number.isInteger(Number(form.Qty))) {
      newErrors.Qty = "Quantity must be a whole number.";
    }

    if (
      form.Price === "" ||
      !Number.isFinite(Number(form.Price)) ||
      Number(form.Price) < 0
    ) {
      newErrors.Price = "Please enter a valid non-negative rate.";
    }

    if (Number(form.Qty) > Number(issueFromPreviousQty)) {
      newErrors.Qty =
        "Transfer quantity cannot exceed the Issue From available quantity.";
    }

    if (form.GetPassNo.length > 100) {
      newErrors.GetPassNo =
        "Issue Slip/Gate Pass cannot exceed 100 characters.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      showErrorToast("Please correct the highlighted fields.");
      return false;
    }

    return true;
  };

  const validateForm = () => {
    return activeTab === "inward"
      ? validateInwardForm()
      : validateInternalTransferForm();
  };

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  const resetForm = () => {
    setForm(getInitialForm());
    setErrors({});
    setSelectedGroups([]);
    setSelectedRole("all");
    setActiveTab("inward");
    setGroupDropdownOpen(false);

    setDestinationList([]);
    setIssueFromList([]);
    setTransferReceiveList([]);

    setReceivePreviousQty(0);
    setIssueFromPreviousQty(0);
    setTransferReceivePreviousQty(0);
  };

  const handleClose = () => {
    if (loading) return;

    resetForm();
    closeDialog?.();
  };

  // --------------------------------------------------
  // SAVE
  // --------------------------------------------------


  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (status === "loading") {
      showErrorToast("Please wait while your session loads.");
      return;
    }

    const isInward = activeTab === "inward";

    // Internal transfer uses the logged-in user's ID.
    const issueBy = isInward
      ? form.Issue_by
      : userId;

    if (!issueBy) {
      showErrorToast(
        isInward
          ? "Please select Issue By."
          : "Unable to identify the logged-in user. Please log in again."
      );
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...form,

        // Movement type
        MovementType: isInward ? "INWARD" : "INTERNAL_TRANSFER",

        // Automatically assign current user for internal transfer
        Issue_by: String(issueBy),

        // Quantity and balance
        Qty: Number(form.Qty) || 0,
        PreviousBalance: Number(form.PreviousBalance) || 0,
        Balance: Number(form.Balance) || 0,
        Price:
          form.Price === "" || form.Price === null
            ? null
            : Number(form.Price),

        // Inward / Internal Transfer fields
        ...(isInward
          ? {
            DestinationType: form.DestinationType,
            DestinationId: form.DestinationId,

            ToType: form.DestinationType,
            ToId: form.DestinationId,
          }
          : {
            // Source
            IssueFromType: form.IssueFromType,
            IssueFromId: form.IssueFromId,

            // Destination
            ReceiveToType: form.ReceiveToType,
            ReceiveToId: form.ReceiveToId,

            // Backend-compatible field names
            FromType: form.IssueFromType,
            FromId: form.IssueFromId,

            ToType: form.ReceiveToType,
            ToId: form.ReceiveToId,

            DestinationType: form.ReceiveToType,
            DestinationId: form.ReceiveToId,

            // Previous balances
            IssueFromPreviousQty:
              Number(issueFromPreviousQty) || 0,

            ReceiveToPreviousQty:
              Number(transferReceivePreviousQty) || 0,
          }),

        UserName: userName,
        UserId: userId,
      };

      console.log("CREATE STOCK MOVEMENT PAYLOAD:", payload);

      const response = await apiFetch(
        "/api/inventory/issue-receipt",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to create Stock Movement."
        );
      }

      showSuccessToast(
        isInward
          ? "Inward entry created successfully."
          : "Internal Transfer created successfully."
      );

      onSuccess?.(result.data);
      resetForm();
      closeDialog?.();

    } catch (error) {
      console.error("CREATE STOCK MOVEMENT ERROR:", error);
      showErrorToast(
        error.message || "Failed to create stock movement."
      );
    } finally {
      setLoading(false);
    }
  };



  // --------------------------------------------------
  // SELECTED ITEM AND UNIT
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
  // REUSABLE ITEM GROUP FIELD
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
          onClick={() => setGroupDropdownOpen((prev) => !prev)}
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

            <div
              className="max-h-[200px] overflow-y-auto overscroll-contain py-2"
              onWheel={(event) => event.stopPropagation()}
            >
              <div className="space-y-2">
                {groups.length ? (
                  groups.map((group) => {
                    const id = String(group.id);

                    return (
                      <label
                        key={group.id}
                        className="flex cursor-pointer items-center gap-2 rounded p-2 text-sm hover:bg-muted"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroups.includes(id)}
                          onChange={() => handleGroupToggle(id)}
                          disabled={loading}
                        />
                        {group.groupName || group.GroupName}
                      </label>
                    );
                  })
                ) : (
                  <p className="py-3 text-center text-sm text-muted-foreground">
                    No groups found.
                  </p>
                )}
              </div>
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

  // --------------------------------------------------
  // REUSABLE ITEM FIELD
  // --------------------------------------------------

  const renderItemField = () => (
    <div className="space-y-2">
      <Label>
        Item Name <span className="text-destructive">*</span>
      </Label>

      <PaginatedSearchSelect
        endpoint="/api/inventory/item-master"
        value={form.ItemMasterid}
        onChange={handleItemChange}
        placeholder={
          !selectedGroups.length
            ? "Select Item Group first"
            : "Select Item"
        }
        searchPlaceholder="Search items..."
        disabled={loading || !selectedGroups.length}
        onOptionsChange={setItems}
        getLabel={(item) =>
          item.ItemName || item.itemName || item.name || `Item #${item.id}`
        }
      />

      {errors.ItemMasterid && (
        <p className="text-sm text-destructive">{errors.ItemMasterid}</p>
      )}
    </div>
  );

  // ------ --------------------------------------------
  // REUSABLE ITEM CONDITION FIELD
  // --------------------------------------------------

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

      {errors.BrandManufacturerid && (
        <p className="text-sm text-destructive">
          {errors.BrandManufacturerid}
        </p>
      )}
    </div>
  );
  // --------------------------------------------------
  // REUSABLE TRANSACTION TYPE FIELD
  // --------------------------------------------------

  const renderTransactionField = () => (
    <div className="space-y-2">
      <Label>
        Transaction Type <span className="text-destructive">*</span>
      </Label>

      <Select
        value={String(form.TransactionTypeid || "")}
        onValueChange={handleTransactionChange}
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

  // --------------------------------------------------
  // REUSABLE DATE FIELD
  // --------------------------------------------------

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

  // --------------------------------------------------
  // REUSABLE DESTINATION RADIO + DROPDOWN
  // --------------------------------------------------

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
    <div className="rounded-lg border p-4 space-y-4">
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

  // --------------------------------------------------
  // PREVIOUS QUANTITY DISPLAY
  // --------------------------------------------------

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
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            {unitLabel}
          </span>
        )}
      </div>
    </div>
  );

  // --------------------------------------------------
  // QUANTITY / RATE / TOTAL FIELDS
  // --------------------------------------------------

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
            onChange={(event) => handleQtyChange(event.target.value)}
            disabled={loading}
            className={unitLabel ? "pr-36" : ""}
          />

          {unitLabel && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
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
          <DialogTitle>Add New Entry</DialogTitle>
          <DialogDescription>
            Select Inward or Internal Transfer and enter the stock movement
            details.
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
              {/* ==========================================
                  INWARD
              ========================================== */}

              <TabsContent value="inward" className="mt-0 space-y-6">
                {renderItemGroupField()}
                {renderItemField()}
                {renderItemConditionField()}
                {renderBrandField()}
                {renderTransactionField()}
                {renderIssueDateField()}

                {/* USER ROLE */}

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

                  {errors.UserRole && (
                    <p className="text-sm text-destructive">
                      {errors.UserRole}
                    </p>
                  )}
                </div>

                {/* USER */}

                <div className="space-y-2">
                  <Label>
                    User <span className="text-destructive">*</span>
                  </Label>

                  <Select
                    value={String(form.Issue_by || "")}
                    onValueChange={(value) => updateField("Issue_by", value)}
                    disabled={
                      staffLoading || loading || staffUsers.length === 0
                    }
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

                  {!staffLoading && staffUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No users found for the selected role.
                    </p>
                  )}
                </div>

                {/* CHALLAN / BILL */}

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

                {/* REQUISITION */}

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

                {/* PURCHASE ORDER */}

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

                {/* QUANTITY */}

                {renderQuantityRateFields()}


                {/* RECEIVE TO */}

                {renderDestinationSelector({
                  title: "Receipt To",
                  typeValue: form.DestinationType,
                  idValue: form.DestinationId,
                  onTypeChange: handleDestinationTypeChange,
                  onIdChange: (value) => updateField("DestinationId", value),
                  list: destinationList,
                  isLoading: destinationLoading,
                  typeError: errors.DestinationType,
                  idError: errors.DestinationId,
                  radioPrefix: "inward-receive",
                })}

                {renderPreviousQty(
                  "Receipt To Previous Quantity",
                  receivePreviousQty,
                )}
                {/* PREVIOUS BALANCE / BALANCE */}

                {/* <div className="space-y-2">
                  <Label>Previous Balance</Label>

                  <Input
                    type="number"
                    value={form.PreviousBalance}
                    readOnly
                    className="bg-muted"
                  />
                </div> */}

                <div className="space-y-2">
                  <Label>Final Balance (Receive To)</Label>

                  <Input
                    type="number"
                    value={form.Balance}
                    readOnly
                    className="bg-muted font-medium"
                  />
                </div>
                {/* COMMENT */}

                <div className="space-y-2">
                  <Label>Comment</Label>

                  <Textarea
                    placeholder="Enter additional comments..."
                    value={form.Comment}
                    onChange={(event) =>
                      updateField("Comment", event.target.value)
                    }
                    maxLength={1000}
                    rows={4}
                    disabled={loading}
                    className="resize-none"
                  />

                  <div className="flex justify-between">
                    {errors.Comment ? (
                      <p className="text-sm text-destructive">
                        {errors.Comment}
                      </p>
                    ) : (
                      <span />
                    )}

                    <p className="text-xs text-muted-foreground">
                      {form.Comment.length}/1000
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* ==========================================
                  INTERNAL TRANSFER
              ========================================== */}

              <TabsContent value="internal-transfer" className="mt-0 space-y-6">
                {renderItemGroupField()}
                {renderItemField()}
                {renderItemConditionField()}
                {renderBrandField()}
                {renderTransactionField()}
                {renderIssueDateField()}

                {/* ISSUE FROM */}

                {renderDestinationSelector({
                  title: "Issue From",
                  typeValue: form.IssueFromType,
                  idValue: form.IssueFromId,
                  onTypeChange: handleIssueFromTypeChange,
                  onIdChange: (value) => updateField("IssueFromId", value),
                  list: issueFromList,
                  isLoading: issueFromLoading,
                  typeError: errors.IssueFromType,
                  idError: errors.IssueFromId,
                  radioPrefix: "transfer-issue-from",
                })}

                {renderPreviousQty(
                  "Issue From Previous Quantity",
                  issueFromPreviousQty,
                )}

                {/* ISSUE SLIP / GATE PASS */}

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

                {/* TRANSFER QUANTITY / RATE / TOTAL */}

                {renderQuantityRateFields()}

                {/* RECEIPT TO */}

                {renderDestinationSelector({
                  title: "Receipt To",
                  typeValue: form.ReceiveToType,
                  idValue: form.ReceiveToId,
                  onTypeChange: handleTransferReceiveTypeChange,
                  onIdChange: (value) => updateField("ReceiveToId", value),
                  list: transferReceiveList,
                  isLoading: transferReceiveLoading,
                  typeError: errors.ReceiveToType,
                  idError: errors.ReceiveToId,
                  radioPrefix: "transfer-receive-to",
                })}

                {renderPreviousQty(
                  "Receipt To Previous Quantity",
                  transferReceivePreviousQty,
                )}
                {/* ISSUE FROM FINAL BALANCE */}

                <div className="space-y-2">
                  <Label>Issue From Final Balance</Label>

                  <Input
                    type="number"
                    value={form.Balance}
                    readOnly
                    className="bg-muted font-medium"
                  />
                </div>

                {/* RECEIVE TO FINAL BALANCE */}

                <div className="space-y-2">
                  <Label>Receipt To Final Balance</Label>

                  <Input
                    type="number"
                    value={transferReceiveFinalBalance}
                    readOnly
                    className="bg-muted font-medium"
                  />
                </div>
                {/* COMMENT */}

                <div className="space-y-2">
                  <Label>Comment</Label>

                  <Textarea
                    placeholder="Enter additional comments..."
                    value={form.Comment}
                    onChange={(event) =>
                      updateField("Comment", event.target.value)
                    }
                    maxLength={1000}
                    rows={4}
                    disabled={loading}
                    className="resize-none"
                  />

                  <div className="flex justify-between">
                    {errors.Comment ? (
                      <p className="text-sm text-destructive">
                        {errors.Comment}
                      </p>
                    ) : (
                      <span />
                    )}

                    <p className="text-xs text-muted-foreground">
                      {form.Comment.length}/1000
                    </p>
                  </div>
                </div>
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
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}