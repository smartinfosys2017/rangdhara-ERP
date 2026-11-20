
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from "@remixicon/react";

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

import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";

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
  ItemTypeid: "",
  TransactionTypeid: "",
  IssueDate: `${getToday()}T10:00`,

  Qty: "",
  PreviousBalance: 0,
  Balance: 0,

  Issue_by: "",
  RecivedBy: "",

  ReciptChallanNo: "",
  ReceiptDate: "",

  RequisitionSupplyNo: "",
  RequisitionSupplyDate: "",

  PurchaseNo: "",
  PurchaseDate: "",

  GetPassNo: "",
  DateOfRecive: "",

  Comment: "",
  Price: "",
  Particuler: "",

  DestinationType: "",
  DestinationId: "",
});

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  return [];
};

const getItemGroupId = (item) =>
  String(
    item?.ItemGroupid ??
      item?.itemGroupId ??
      item?.ItemGroupId ??
      item?.groupId ??
      ""
  );

const getItemConditionId = (item) =>
  String(item?.ItemConditionid ?? item?.itemConditionId ?? "");

const getItemUnitId = (item) =>
  String(
    item?.Unitid ??
      item?.unitId ??
      item?.UnitId ??
      item?.unitid ??
      ""
  );

const getStaffName = (staff) =>
  staff?.name ||
  [staff?.firstName, staff?.lastName].filter(Boolean).join(" ") ||
  staff?.username ||
  staff?.email ||
  `User #${staff?.id}`;

const getGroupName = (group) =>
  group?.groupName || group?.GroupName || group?.name || "";

const getDateTimeValue = (value, fallbackTime = "10:00") => {
  if (!value) return "";

  // Date-only database value
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T${fallbackTime}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  // Convert to local date/time for datetime-local and DateTimePicker.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getRecordGroupNames = (record) => {
  const value = record?.GroupName ?? record?.groupName;

  if (Array.isArray(value)) {
    return value.map(String);
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.map(String);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const getRecordDestinationType = (record) => {
  const value =
    record?.DestinationType ??
    record?.destinationType ??
    "";

  const normalized = String(value).toLowerCase();

  if (normalized.includes("location")) return "location";
  if (
    normalized.includes("machinery") ||
    normalized.includes("machine")
  ) {
    return "machinery";
  }

  return "";
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

  const selectedTime = value?.includes("T")
    ? value.slice(11, 16)
    : undefined;

  const timeSlots = Array.from({ length: 30 }, (_, index) => {
    const hour = 9 + Math.floor(index / 2);
    const minute = index % 2 === 0 ? "00" : "30";

    return `${String(hour).padStart(2, "0")}:${minute}`;
  });

  const handleDateChange = (newDate) => {
    if (!newDate) return;

    const dateString = format(newDate, "yyyy-MM-dd");
    const timeString = selectedTime || "10:00";

    onChange(`${dateString}T${timeString}`);
  };

  const handleTimeChange = (newTime) => {
    if (!selectedDate) return;

    onChange(
      `${format(selectedDate, "yyyy-MM-dd")}T${newTime}`
    );
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
              "PPP"
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
            disabled={
              disableFuture
                ? [{ after: today }]
                : undefined
            }
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
                          `${String(today.getHours()).padStart(2, "0")}:${String(
                            today.getMinutes()
                          ).padStart(2, "0")}`;

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

// --------------------------------------------------
// COMPONENT
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

  const { data: roleList = [], isLoading: rolesLoading } =
    useRoleSelectQuery();

  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [destinationLoading, setDestinationLoading] = useState(false);

  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [units, setUnits] = useState([]);
  const [destinationList, setDestinationList] = useState([]);

  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedRole, setSelectedRole] = useState("all");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(getInitialForm());

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

  const calculateBalance = (
    previousBalance,
    qty,
    transactionTypeId,
    transactionList = transactions
  ) => {
    const previous = Number(previousBalance) || 0;
    const quantity = Number(qty) || 0;

    const transaction = transactionList.find(
      (item) => String(item.id) === String(transactionTypeId)
    );

    if (!transaction) return previous;

    const effect = String(
      transaction.EffectOnTransaction ??
        transaction.effectOnTransaction ??
        ""
    )
      .trim()
      .toLowerCase();

    if (["addition", "add", "additions"].includes(effect)) {
      return previous + quantity;
    }

    if (
      [
        "deduction",
        "deductions",
        "deduct",
        "subtract",
        "subtraction",
      ].includes(effect)
    ) {
      return previous - quantity;
    }

    return previous;
  };

  // --------------------------------------------------
  // FILTER ITEMS BY SELECTED GROUPS
  // --------------------------------------------------

  const filteredItems = useMemo(() => {
    if (!selectedGroups.length) return [];

    return items.filter((item) =>
      selectedGroups.includes(getItemGroupId(item))
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
        throw new Error(
          groupResult.message || "Failed to load item groups."
        );
      }

      if (!itemResponse.ok || !itemResult.success) {
        throw new Error(itemResult.message || "Failed to load items.");
      }

      if (!transactionResponse.ok || !transactionResult.success) {
        throw new Error(
          transactionResult.message || "Failed to load transaction types."
        );
      }

      if (!productTypeResponse.ok || !productTypeResult.success) {
        throw new Error(
          productTypeResult.message || "Failed to load product types."
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

      // Keep the record's selected groups.
      const recordGroupNames = getRecordGroupNames(IssueReceipt);
      const recordItemGroupId = String(
        IssueReceipt?.ItemGroupid ??
          IssueReceipt?.ItemMaster?.ItemGroupid ??
          IssueReceipt?.ItemMaster?.itemGroupId ??
          ""
      );

      let selectedIds = groupList
        .filter((group) => {
          const groupId = String(group.id);
          const groupName = getGroupName(group);

          return (
            recordGroupNames.includes(groupName) ||
            groupId === recordItemGroupId
          );
        })
        .map((group) => String(group.id));

      if (!selectedIds.length && recordItemGroupId) {
        selectedIds = [recordItemGroupId];
      }

      // Fallback to the item's group when GroupName was not stored.
      if (!selectedIds.length && IssueReceipt?.ItemMasterid) {
        const selectedItem = itemList.find(
          (item) =>
            String(item.id) === String(IssueReceipt.ItemMasterid)
        );

        const itemGroupId = getItemGroupId(selectedItem);

        if (itemGroupId) {
          selectedIds = [itemGroupId];
        }
      }

      setSelectedGroups(selectedIds);

      setForm((prev) => ({
        ...prev,
        GroupName: groupList
          .filter((group) => selectedIds.includes(String(group.id)))
          .map(getGroupName)
          .filter(Boolean),
      }));
    } catch (error) {
      console.error("Stock Movement DROPDOWN ERROR:", error);
      showErrorToast(error.message || "Failed to load dropdown data.");
    } finally {
      setDropdownLoading(false);
    }
  };

  // --------------------------------------------------
  // FETCH PREVIOUS BALANCE AND RATE
  // --------------------------------------------------

  const fetchPreviousBalance = async (itemMasterId) => {
    if (!itemMasterId) {
      return {
        PreviousBalance: 0,
        Rate: 0,
        Balance: 0,
      };
    }

    const response = await apiFetch(
      `/api/inventory/issue-receipt/previous-balance/${itemMasterId}`
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to fetch previous balance and rate."
      );
    }

    return {
      PreviousBalance: Number(result.data?.PreviousBalance) || 0,
      Rate: Number(result.data?.Rate) || 0,
      Balance: Number(result.data?.Balance) || 0,
    };
  };

  // --------------------------------------------------
  // GROUP SELECTION
  // --------------------------------------------------

  const handleGroupToggle = (groupId) => {
    const updated = selectedGroups.includes(groupId)
      ? selectedGroups.filter((id) => id !== groupId)
      : [...selectedGroups, groupId];

    setSelectedGroups(updated);

    const selectedNames = groups
      .filter((group) => updated.includes(String(group.id)))
      .map(getGroupName)
      .filter(Boolean);

    const currentItem = items.find(
      (item) => String(item.id) === String(form.ItemMasterid)
    );

    const currentItemGroupId = getItemGroupId(currentItem);

    const shouldClearItem =
      form.ItemMasterid &&
      !updated.includes(currentItemGroupId);

    setForm((prev) => ({
      ...prev,
      GroupName: selectedNames,
      ItemMasterid: shouldClearItem ? "" : prev.ItemMasterid,
      ItemGroupid: shouldClearItem ? "" : prev.ItemGroupid,
      ItemTypeid: shouldClearItem ? "" : prev.ItemTypeid,
      PreviousBalance: shouldClearItem ? 0 : prev.PreviousBalance,
      Balance: shouldClearItem ? 0 : prev.Balance,
      Price: shouldClearItem ? "" : prev.Price,
    }));

    setErrors((prev) => ({
      ...prev,
      ItemGroupid: updated.length ? "" : "Item Group is required.",
      ItemMasterid: shouldClearItem ? "" : prev.ItemMasterid,
      ItemTypeid: shouldClearItem ? "" : prev.ItemTypeid,
    }));
  };

  const handleSelectAllGroups = () => {
    const allGroupIds = groups.map((group) => String(group.id));

    setSelectedGroups(allGroupIds);

    setForm((prev) => ({
      ...prev,
      GroupName: groups.map(getGroupName).filter(Boolean),
    }));

    setErrors((prev) => ({
      ...prev,
      ItemGroupid: "",
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

  const handleItemChange = async (value) => {
    const selectedItem = items.find(
      (item) => String(item.id) === String(value)
    );

    if (!selectedItem) return;

    const groupId = getItemGroupId(selectedItem);
    const conditionId = getItemConditionId(selectedItem);

    const matchedCondition = productTypes.find(
      (type) => String(type.id) === conditionId
    );

    setForm((prev) => ({
      ...prev,
      ItemMasterid: value,
      ItemGroupid: groupId,
      ItemTypeid: matchedCondition
        ? String(matchedCondition.id)
        : "",
      PreviousBalance: 0,
      Balance: 0,
      Price: "",
    }));

    setErrors((prev) => ({
      ...prev,
      ItemMasterid: "",
      ItemTypeid: matchedCondition
        ? ""
        : "Item condition is missing in Item Master.",
      Price: "",
    }));

    try {
      const itemData = await fetchPreviousBalance(value);

      setForm((prev) => {
        if (String(prev.ItemMasterid) !== String(value)) {
          return prev;
        }

        return {
          ...prev,
          PreviousBalance: itemData.PreviousBalance,
          Price: itemData.Rate.toString(),
          Balance: calculateBalance(
            itemData.PreviousBalance,
            prev.Qty,
            prev.TransactionTypeid
          ),
        };
      });
    } catch (error) {
      console.error("PREVIOUS BALANCE AND RATE ERROR:", error);
      showErrorToast(
        error.message || "Failed to fetch previous balance and rate."
      );
    }
  };

  // --------------------------------------------------
  // TRANSACTION TYPE CHANGE
  // --------------------------------------------------

  const handleTransactionChange = (value) => {
    setForm((prev) => ({
      ...prev,
      TransactionTypeid: value,
      Balance: calculateBalance(
        prev.PreviousBalance,
        prev.Qty,
        value
      ),
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
      Balance: calculateBalance(
        prev.PreviousBalance,
        value,
        prev.TransactionTypeid
      ),
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
    }));

    setErrors((prev) => ({
      ...prev,
      Issue_by: "",
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

    setErrors((prev) => ({
      ...prev,
      DestinationType: "",
      DestinationId: "",
    }));
  };

  // --------------------------------------------------
  // LOAD RECORD INTO FORM
  // --------------------------------------------------

  useEffect(() => {
    if (!open || !IssueReceipt) return;

    const destinationType = getRecordDestinationType(IssueReceipt);

    const recordForm = {
      ...getInitialForm(),

      ItemGroupid: String(IssueReceipt.ItemGroupid || ""),
      GroupName: getRecordGroupNames(IssueReceipt),

      ItemMasterid: String(IssueReceipt.ItemMasterid || ""),
      ItemTypeid: String(IssueReceipt.ItemTypeid || ""),
      TransactionTypeid: String(IssueReceipt.TransactionTypeid || ""),

      IssueDate: getDateTimeValue(IssueReceipt.IssueDate),

      Qty:
        IssueReceipt.Qty === null || IssueReceipt.Qty === undefined
          ? ""
          : String(IssueReceipt.Qty),

      PreviousBalance: Number(IssueReceipt.PreviousBalance) || 0,
      Balance: Number(IssueReceipt.Balance) || 0,

      Issue_by: String(
        IssueReceipt.Issue_by ??
          IssueReceipt.IssueBy?.id ??
          ""
      ),

      RecivedBy: String(
        IssueReceipt.RecivedBy ??
          IssueReceipt.ReceivedBy?.id ??
          ""
      ),

      ReciptChallanNo: IssueReceipt.ReciptChallanNo || "",
      ReceiptDate: getDateTimeValue(IssueReceipt.ReceiptDate),

      RequisitionSupplyNo:
        IssueReceipt.RequisitionSupplyNo || "",

      RequisitionSupplyDate: getDateTimeValue(
        IssueReceipt.RequisitionSupplyDate
      ),

      PurchaseNo: IssueReceipt.PurchaseNo || "",
      PurchaseDate: getDateTimeValue(IssueReceipt.PurchaseDate),

      GetPassNo: IssueReceipt.GetPassNo || "",
      DateOfRecive: getDateTimeValue(IssueReceipt.DateOfRecive),

      Comment: IssueReceipt.Comment || "",
      Price:
        IssueReceipt.Price === null ||
        IssueReceipt.Price === undefined
          ? ""
          : String(IssueReceipt.Price),

      Particuler: IssueReceipt.Particuler || "",

      DestinationType: destinationType,
      DestinationId: String(
        IssueReceipt.DestinationId ??
          IssueReceipt.Locationid ??
          IssueReceipt.Machineid ??
          ""
      ),
    };

    setForm(recordForm);
    setErrors({});
    setSelectedRole("all");
    setGroupDropdownOpen(false);
    setDestinationList([]);

    const recordGroupNames = getRecordGroupNames(IssueReceipt);
    const itemGroupId = String(
      IssueReceipt.ItemGroupid ??
        IssueReceipt.ItemMaster?.ItemGroupid ??
        IssueReceipt.ItemMaster?.itemGroupId ??
        ""
    );

    // Set an initial group selection before dropdowns finish loading.
    if (itemGroupId) {
      setSelectedGroups([itemGroupId]);
    } else {
      setSelectedGroups([]);
    }

    loadDropdowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, IssueReceipt?.id]);

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

        const params = new URLSearchParams({
          limit: "100",
        });

        if (selectedRole !== "all") {
          params.set("roleId", selectedRole);
        }

        const response = await apiFetch(
          `/api/user-management/users?${params.toString()}`
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
        if (!ignore) {
          setStaffLoading(false);
        }
      }
    };

    fetchStaffUsers();

    return () => {
      ignore = true;
    };
  }, [open, selectedRole]);

  // --------------------------------------------------
  // FETCH DESTINATIONS
  // --------------------------------------------------

  useEffect(() => {
    if (!open || !form.DestinationType) {
      setDestinationList([]);
      return;
    }

    let ignore = false;

    const fetchDestinationList = async () => {
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
            result.message || "Failed to load destination list."
          );
        }

        if (!ignore) {
          setDestinationList(getArray(result.data));
        }
      } catch (error) {
        console.error("DESTINATION FETCH ERROR:", error);

        if (!ignore) {
          setDestinationList([]);
          showErrorToast(
            error.message || "Failed to load destination list."
          );
        }
      } finally {
        if (!ignore) {
          setDestinationLoading(false);
        }
      }
    };

    fetchDestinationList();

    return () => {
      ignore = true;
    };
  }, [open, form.DestinationType]);

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const validateForm = () => {
    const newErrors = {};

    if (!selectedGroups.length) {
      newErrors.ItemGroupid = "Item Group is required.";
    }

    if (!form.ItemMasterid) {
      newErrors.ItemMasterid = "Item is required.";
    }

    if (!form.ItemTypeid) {
      newErrors.ItemTypeid =
        "Item condition is missing in Item Master.";
    }

    if (!form.TransactionTypeid) {
      newErrors.TransactionTypeid = "Transaction Type is required.";
    }

    if (!form.IssueDate) {
      newErrors.IssueDate = "Date is required.";
    }

    if (!selectedRole) {
      newErrors.UserRole = "User Role is required.";
    }

    if (!form.Issue_by) {
      newErrors.Issue_by = "User is required.";
    }

    if (!String(form.Qty).trim()) {
      newErrors.Qty = "Quantity is required.";
    } else if (
      !Number.isFinite(Number(form.Qty)) ||
      Number(form.Qty) <= 0
    ) {
      newErrors.Qty = "Quantity must be greater than 0.";
    } else if (!Number.isInteger(Number(form.Qty))) {
      newErrors.Qty = "Quantity must be a whole number.";
    }

    if (
      form.Price !== "" &&
      (!Number.isFinite(Number(form.Price)) ||
        Number(form.Price) < 0)
    ) {
      newErrors.Price =
        "Rate must be a valid non-negative number.";
    }

    if (form.IssueDate && new Date(form.IssueDate) > new Date()) {
      newErrors.IssueDate =
        "Date and time cannot be in the future.";
    }

    if (form.Comment.length > 1000) {
      newErrors.Comment = "Comment cannot exceed 1000 characters.";
    }

    if (form.ReciptChallanNo.length > 100) {
      newErrors.ReciptChallanNo =
        "Receipt Challan Number cannot exceed 100 characters.";
    }

    if (form.RequisitionSupplyNo.length > 100) {
      newErrors.RequisitionSupplyNo =
        "Requisition Supply Number cannot exceed 100 characters.";
    }

    if (form.PurchaseNo.length > 100) {
      newErrors.PurchaseNo =
        "Purchase Order Number cannot exceed 100 characters.";
    }

    if (!form.DestinationType) {
      newErrors.DestinationType =
        "Please select Location or Machinery.";
    }

    if (form.DestinationType && !form.DestinationId) {
      newErrors.DestinationId = "Please select a destination.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      showErrorToast("Please correct the highlighted fields.");
      return false;
    }

    return true;
  };

  // --------------------------------------------------
  // RESET
  // --------------------------------------------------

  const resetForm = () => {
    setForm(getInitialForm());
    setErrors({});
    setSelectedGroups([]);
    setSelectedRole("all");
    setGroupDropdownOpen(false);
    setDestinationList([]);
  };

  const handleClose = () => {
    if (loading) return;

    resetForm();
    closeDialog?.();
  };

  // --------------------------------------------------
  // UPDATE
  // --------------------------------------------------

  const handleSubmit = async () => {
    if (!IssueReceipt?.id) {
      showErrorToast("Stock Movement record ID is missing.");
      return;
    }

    if (!validateForm()) return;

    if (status === "loading") {
      showErrorToast("Please wait while your session loads.");
      return;
    }

    try {
      setLoading(true);

      const selectedGroupNames = groups
        .filter((group) =>
          selectedGroups.includes(String(group.id))
        )
        .map(getGroupName)
        .filter(Boolean);

      const payload = {
        ...form,

        // Keep the original record's ID.
        id: IssueReceipt.id,

        // Use the selected item's actual group ID.
        ItemGroupid: String(form.ItemGroupid || ""),

        // Keep group names in the same format as Add.
        GroupName: selectedGroupNames,

        Qty: Number(form.Qty),
        PreviousBalance: Number(form.PreviousBalance) || 0,
        Balance: Number(form.Balance) || 0,

        Price:
          form.Price === "" ? null : Number(form.Price),

        IssueDate: form.IssueDate || null,

        ReceiptDate: form.ReceiptDate || null,
        RequisitionSupplyNo:
          form.RequisitionSupplyNo.trim() || null,
        RequisitionSupplyDate:
          form.RequisitionSupplyDate || null,

        PurchaseNo: form.PurchaseNo.trim() || null,
        PurchaseDate: form.PurchaseDate || null,

        ReciptChallanNo:
          form.ReciptChallanNo.trim() || null,

        // These fields are retained even though they are not
        // displayed in the Add dialog.
        RecivedBy: form.RecivedBy || null,
        GetPassNo: form.GetPassNo || null,
        DateOfRecive: form.DateOfRecive || null,
        Particuler: form.Particuler || null,

        DestinationType: form.DestinationType || null,
        DestinationId: form.DestinationId || null,

        Comment: form.Comment.trim() || null,

        UserName: userName,
        UserId: userId,
      };

      const response = await apiFetch(
        `/api/inventory/issue-receipt?id=${encodeURIComponent(
          IssueReceipt.id
        )}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to update Stock Movement."
        );
      }

      showSuccessToast("Stock Movement updated successfully.");

      onSuccess?.(result.data);
      resetForm();
      closeDialog?.();
    } catch (error) {
      console.error("UPDATE Stock Movement ERROR:", error);
      showErrorToast(
        error.message || "Failed to update stock movement."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // TOTAL AND UNIT
  // --------------------------------------------------

  const total = (
    Number(form.Price || 0) * Number(form.Qty || 0)
  ).toFixed(2);

  const selectedItem = items.find(
    (item) => String(item.id) === String(form.ItemMasterid)
  );

  const selectedUnitId = getItemUnitId(selectedItem);

  const selectedUnit = units.find(
    (unit) => String(unit.id) === String(selectedUnitId)
  );

  const unitName =
    selectedUnit?.unitName ||
    selectedUnit?.UnitName ||
    "";

  const unitAbbreviation =
    selectedUnit?.abbreviation ||
    selectedUnit?.Abbreviation ||
    "";

  const unitLabel = unitAbbreviation
    ? `${unitName} (${unitAbbreviation})`
    : unitName;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  if (!IssueReceipt) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) handleClose();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Entry</DialogTitle>

          <DialogDescription>
            Update the item, transaction and stock details below.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogBody className="space-y-6 pt-0 px-0 min-h-0">

            {/* ITEM GROUP */}

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
                  onClick={() =>
                    setGroupDropdownOpen((prev) => !prev)
                  }
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
                      <span className="text-sm font-medium">
                        Select Item Groups
                      </span>

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
                      onWheel={(e) => e.stopPropagation()}
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

                                {getGroupName(group)}
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
                    .filter((group) =>
                      selectedGroups.includes(String(group.id))
                    )
                    .map((group) => (
                      <span
                        key={group.id}
                        className="rounded bg-primary/10 px-2 py-1 text-xs text-primary"
                      >
                        {getGroupName(group)}
                      </span>
                    ))}
                </div>
              )}

              {errors.ItemGroupid && (
                <p className="text-sm text-destructive">
                  {errors.ItemGroupid}
                </p>
              )}
            </div>

            {/* ITEM */}

            <div className="space-y-2">
              <Label>
                Item <span className="text-destructive">*</span>
              </Label>

              <Select
                value={String(form.ItemMasterid || "")}
                onValueChange={handleItemChange}
                disabled={
                  dropdownLoading ||
                  loading ||
                  !selectedGroups.length ||
                  filteredItems.length === 0
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      !selectedGroups.length
                        ? "Select Item Group first"
                        : filteredItems.length
                          ? "Select Item"
                          : "No items available"
                    }
                  />
                </SelectTrigger>

                <SelectContent>
                  {filteredItems.map((item) => (
                    <SelectItem
                      key={item.id}
                      value={String(item.id)}
                    >
                      {item.ItemName ||
                        item.itemName ||
                        item.name ||
                        `Item #${item.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {errors.ItemMasterid && (
                <p className="text-sm text-destructive">
                  {errors.ItemMasterid}
                </p>
              )}
            </div>

            {/* ITEM CONDITION */}

            <div className="space-y-2">
              <Label>
                Item Condition <span className="text-destructive">*</span>
              </Label>

              <Select
                value={String(form.ItemTypeid || "")}
                disabled
              >
                <SelectTrigger className="w-full bg-muted">
                  <SelectValue placeholder="Automatically selected from Item Master" />
                </SelectTrigger>

                <SelectContent>
                  {productTypes.map((type) => (
                    <SelectItem
                      key={type.id}
                      value={String(type.id)}
                    >
                      {type.ProductType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {errors.ItemTypeid && (
                <p className="text-sm text-destructive">
                  {errors.ItemTypeid}
                </p>
              )}
            </div>

            {/* TRANSACTION TYPE */}

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
                    <SelectItem
                      key={item.id}
                      value={String(item.id)}
                    >
                      {item.TransactionType ||
                        item.transactionType ||
                        item.name ||
                        `Transaction #${item.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {errors.TransactionTypeid && (
                <p className="text-sm text-destructive">
                  {errors.TransactionTypeid}
                </p>
              )}
            </div>

            {/* ISSUE DATE & TIME */}

            <div className="space-y-2">
              <Label>
                Date <span className="text-destructive">*</span>
              </Label>

              <DateTimePicker
                value={form.IssueDate}
                onChange={(value) => updateField("IssueDate", value)}
                disabled={loading}
                placeholder="Select Issue Date & Time"
                disableFuture
              />

              {errors.IssueDate && (
                <p className="text-sm text-destructive">
                  {errors.IssueDate}
                </p>
              )}
            </div>

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
                    <SelectItem
                      key={role.id}
                      value={String(role.id)}
                    >
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
                  staffLoading ||
                  loading ||
                  staffUsers.length === 0
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      staffLoading
                        ? "Loading users..."
                        : "Select User"
                    }
                  />
                </SelectTrigger>

                <SelectContent>
                  {staffUsers.map((staff) => (
                    <SelectItem
                      key={staff.id}
                      value={String(staff.id)}
                    >
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

            {/* RECEIPT CHALLAN NUMBER */}

            <div className="space-y-2">
              <Label>Receipt Challan Number</Label>

              <Input
                placeholder="Enter receipt challan number"
                value={form.ReciptChallanNo}
                onChange={(e) =>
                  updateField("ReciptChallanNo", e.target.value)
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

            {/* RECEIPT DATE */}

            <div className="space-y-2">
              <Label>Receipt Date & Time</Label>

              <DateTimePicker
                value={form.ReceiptDate}
                onChange={(value) =>
                  updateField("ReceiptDate", value)
                }
                disabled={loading}
                placeholder="Select Receipt Date & Time"
              />
            </div>

            {/* REQUISITION SUPPLY NUMBER */}

            <div className="space-y-2">
              <Label>Requisition Supply Number</Label>

              <Input
                placeholder="Enter requisition supply number"
                value={form.RequisitionSupplyNo}
                onChange={(e) =>
                  updateField("RequisitionSupplyNo", e.target.value)
                }
                disabled={loading}
                maxLength={100}
              />

              {errors.RequisitionSupplyNo && (
                <p className="text-sm text-destructive">
                  {errors.RequisitionSupplyNo}
                </p>
              )}
            </div>

            {/* REQUISITION SUPPLY DATE */}

            <div className="space-y-2">
              <Label>Requisition Supply Date & Time</Label>

              <DateTimePicker
                value={form.RequisitionSupplyDate}
                onChange={(value) =>
                  updateField("RequisitionSupplyDate", value)
                }
                disabled={loading}
                placeholder="Select Requisition Date & Time"
              />
            </div>

            {/* PURCHASE ORDER NUMBER */}

            <div className="space-y-2">
              <Label>Purchase Order Number</Label>

              <Input
                placeholder="Enter purchase order number"
                value={form.PurchaseNo}
                onChange={(e) =>
                  updateField("PurchaseNo", e.target.value)
                }
                disabled={loading}
                maxLength={100}
              />

              {errors.PurchaseNo && (
                <p className="text-sm text-destructive">
                  {errors.PurchaseNo}
                </p>
              )}
            </div>

            {/* PURCHASE ORDER DATE */}

            <div className="space-y-2">
              <Label>Purchase Order Date & Time</Label>

              <DateTimePicker
                value={form.PurchaseDate}
                onChange={(value) =>
                  updateField("PurchaseDate", value)
                }
                disabled={loading}
                placeholder="Select Purchase Order Date & Time"
              />
            </div>

            {/* PREVIOUS BALANCE */}

            <div className="space-y-2">
              <Label>Previous Balance</Label>

              <Input
                type="number"
                value={form.PreviousBalance}
                readOnly
                className="bg-muted"
              />
            </div>

            {/* QUANTITY */}

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
                  onChange={(e) => handleQtyChange(e.target.value)}
                  disabled={loading}
                  className={unitLabel ? "pr-36" : ""}
                />

                {unitLabel && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {unitLabel}
                  </span>
                )}
              </div>

              {errors.Qty && (
                <p className="text-sm text-destructive">
                  {errors.Qty}
                </p>
              )}
            </div>

            {/* RATE */}

            <div className="space-y-2">
              <Label>Rate (₹) <span className="text-destructive">*</span></Label>

              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter rate"
                value={form.Price}
                onChange={(e) => updateField("Price", e.target.value)}
                disabled={loading}
              />

              {errors.Price && (
                <p className="text-sm text-destructive">
                  {errors.Price}
                </p>
              )}
            </div>

            {/* TOTAL */}

            <div className="space-y-2">
              <Label>Total (Rate × Quantity)</Label>

              <Input
                type="number"
                value={total}
                readOnly
                className="bg-muted font-medium"
              />
            </div>

            {/* BALANCE */}

            <div className="space-y-2">
              <Label>Balance</Label>

              <Input
                type="number"
                value={form.Balance}
                readOnly
                className="bg-muted font-medium"
              />
            </div>

            {/* DESTINATION DETAILS */}

            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-3">
                <Label className="font-semibold">
                  Issue/Receive Details
                </Label>

                <RadioGroup
                  value={form.DestinationType}
                  onValueChange={handleDestinationTypeChange}
                  disabled={loading}
                  className="flex flex-wrap gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value="location"
                      id="destination-location-edit"
                    />

                    <Label
                      htmlFor="destination-location-edit"
                      className="cursor-pointer font-normal"
                    >
                      Location
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      value="machinery"
                      id="destination-machinery-edit"
                    />

                    <Label
                      htmlFor="destination-machinery-edit"
                      className="cursor-pointer font-normal"
                    >
                      Machinery
                    </Label>
                  </div>
                </RadioGroup>

                {errors.DestinationType && (
                  <p className="text-sm text-destructive">
                    {errors.DestinationType}
                  </p>
                )}
              </div>

              {form.DestinationType && (
                <div className="space-y-2">
                  <Label>
                    {form.DestinationType === "location"
                      ? "Select Location"
                      : "Select Machinery"}

                    <span className="text-destructive"> *</span>
                  </Label>

                  <Select
                    value={String(form.DestinationId || "")}
                    onValueChange={(value) =>
                      updateField("DestinationId", value)
                    }
                    disabled={
                      destinationLoading ||
                      loading ||
                      destinationList.length === 0
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue
                        placeholder={
                          destinationLoading
                            ? "Loading..."
                            : destinationList.length
                              ? form.DestinationType === "location"
                                ? "Select Location"
                                : "Select Machinery"
                              : "No records found"
                        }
                      />
                    </SelectTrigger>

                    <SelectContent>
                      {destinationList.map((item) => (
                        <SelectItem
                          key={item.id}
                          value={String(item.id)}
                        >
                          {form.DestinationType === "location"
                            ? item.locationName ||
                              item.LocationName ||
                              `Location #${item.id}`
                            : item.machineName ||
                              item.MachineName ||
                              item.machineNumber ||
                              item.MachineNumber ||
                              `Machine #${item.id}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {errors.DestinationId && (
                    <p className="text-sm text-destructive">
                      {errors.DestinationId}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* COMMENT */}

            <div className="space-y-2">
              <Label>Comment</Label>

              <Textarea
                placeholder="Enter additional comments..."
                value={form.Comment}
                onChange={(e) =>
                  updateField("Comment", e.target.value)
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

          </DialogBody>
        </ScrollArea>

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
            disabled={
              loading ||
              dropdownLoading ||
              status === "loading"
            }
          >
            {loading ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}