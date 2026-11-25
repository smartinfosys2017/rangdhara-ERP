"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import { SelectSearch } from "@/components/ui/select-search";
import IssueReceiptCustomFields, {
  validateRequiredCustomFields,
} from "../../custom-fields/import-custom-fields";
// --------------------------------------------------
// CONSTANTS & HELPERS 
// --------------------------------------------------

const TIME_SLOTS = Array.from({ length: 30 }, (_, i) => {
  const hour = 9 + Math.floor(i / 2);
  return `${String(hour).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`;
});

const ITEM_RESET = {
  ItemMasterid: "",
  ItemGroupid: "",
  ItemTypeid: "",
  Price: "",
};

const getInitialForm = () => ({
  ItemGroupid: "",
  GroupName: [],
  ItemMasterid: "",
  BrandManufacturerid: "",
  ItemTypeid: "",
  TransactionTypeid: "",
  IssueDate: `${format(new Date(), "yyyy-MM-dd")}T10:00`,

  Qty: "",
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

  // Inward destination
  DestinationType: "",
  DestinationId: "",
});

const getArray = (data) => (Array.isArray(data) ? data : []);

const getGroupName = (group) => group.groupName || group.GroupName;

const getItemGroupId = (item) =>
  String(item?.ItemGroupid ?? item?.itemGroupId ?? item?.ItemGroupId ?? item?.groupId ?? "");

const getItemConditionId = (item) =>
  String(item?.ItemConditionid ?? item?.itemConditionId ?? "");

const getItemUnitId = (item) =>
  String(item?.Unitid ?? item?.unitId ?? item?.UnitId ?? item?.unitid ?? "");

const getTransactionName = (t) =>
  String(t?.TransactionType || t?.transactionType || t?.name || "")
    .trim()
    .toLowerCase();

const getStaffName = (staff) =>
  staff?.name ||
  [staff?.firstName, staff?.lastName].filter(Boolean).join(" ") ||
  staff?.username ||
  staff?.email ||
  `User #${staff?.id}`;

const getDestinationName = (item, type) =>
  type === "location"
    ? item.locationName || item.LocationName || item.name || `Warehouse #${item.id}`
    : item.machineName ||
    item.MachineName ||
    item.machineNumber ||
    item.MachineNumber ||
    `Machine #${item.id}`;

const normalizeLocationType = (type) =>
  String(type).toUpperCase() === "MACHINERY" ? "MACHINE" : String(type).toUpperCase();

const destinationEndpoint = (type) =>
  type === "location"
    ? "/api/inventory/location?limit=100&status=active"
    : "/api/inventory/machine-master?limit=100&status=active";

/** GET helper: throws a readable error when the API reports failure. */
async function fetchJson(url, fallbackMessage) {
  const response = await apiFetch(url);
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || fallbackMessage);
  }

  return result;
}

export function calculateFifoIssue(receiptLayers, issueQty) {
  const requestedQty = Number(issueQty);

  if (!Number.isFinite(requestedQty) || requestedQty < 0) {
    throw new Error("Issue quantity must be zero or greater.");
  }

  const layers = (receiptLayers || [])
    .map((layer) => ({
      qty: Number(layer.qty) || 0,
      rate: Number(layer.rate) || 0,
      date: layer.date,
      id: layer.id,
    }))
    .filter((layer) => layer.qty > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (!layers.length) {
    throw new Error("No available Receipt stock found.");
  }

  // Quantity 0: preview the next FIFO layer's rate.
  if (requestedQty === 0) {
    return {
      totalQty: 0,
      totalCost: 0,
      issueRate: Number(layers[0].rate.toFixed(2)),
      remainingLayers: layers,
    };
  }

  let remainingQty = requestedQty;
  let totalCost = 0;

  for (const layer of layers) {
    if (remainingQty <= 0) break;

    const consumedQty = Math.min(layer.qty, remainingQty);
    totalCost += consumedQty * layer.rate;
    layer.qty -= consumedQty;
    remainingQty -= consumedQty;
  }

  if (remainingQty > 0) {
    throw new Error(
      `Insufficient stock. Available: ${(requestedQty - remainingQty).toFixed(2)}, Required: ${requestedQty.toFixed(2)}, Shortage: ${remainingQty.toFixed(2)}`,
    );
  }

  return {
    totalQty: requestedQty,
    totalCost: Number(totalCost.toFixed(2)),
    issueRate: Number((totalCost / requestedQty).toFixed(2)),
    remainingLayers: layers.filter((layer) => layer.qty > 0),
  };
}

// --------------------------------------------------
// API HELPERS
// --------------------------------------------------

async function fetchPreviousBalance(itemMasterId, itemTypeId, locationType, locationId) {
  if (!itemMasterId || !itemTypeId || !locationType || !locationId) return 0;

  const params = new URLSearchParams({
    itemTypeId: String(itemTypeId),
    locationType: normalizeLocationType(locationType),
    locationId: String(locationId),
  });

  const result = await fetchJson(
    `/api/inventory/issue-receipt/previous-balance/${itemMasterId}?${params}`,
    "Failed to fetch stock balance for the selected destination.",
  );

  const data = result.data;

  return Number(
    data?.PreviousBalance ?? data?.previousBalance ?? data?.Balance ?? data?.balance ?? 0,
  );
}

async function fetchRate({
  item,
  transactionType,
  brandManufacturerId,
  issueDate,
  issueQty,
  issueFromType,
  issueFromId,
}) {
  const itemMasterId = String(item.id);
  const itemConditionId = getItemConditionId(item);
  const itemGroupId = getItemGroupId(item);

  // ISSUE: FIFO rate
  if (transactionType === "issue") {
    const qty = Number(issueQty);

    if (!issueDate) throw new Error("Please select the transaction date.");

    if (
      issueQty === "" ||
      issueQty === null ||
      issueQty === undefined ||
      !Number.isFinite(qty) ||
      qty < 0
    ) {
      throw new Error("Please enter a valid Issue quantity.");
    }

    if (!itemConditionId || !itemGroupId) {
      throw new Error("Item condition or item group is missing.");
    }

    if (!issueFromType || !issueFromId) {
      throw new Error("Please select Issue From location.");
    }

    const params = new URLSearchParams({
      itemMasterId,
      itemTypeId: itemConditionId,
      itemGroupId,
      issueDate,
      locationType: normalizeLocationType(issueFromType),
      locationId: String(issueFromId),
    });

    if (brandManufacturerId) {
      params.set("brandManufacturerId", String(brandManufacturerId));
    }

    const result = await fetchJson(
      `/api/inventory/item-rate/fifo-layers?${params}`,
      "Unable to fetch FIFO stock.",
    );

    if (!result.data) {
      throw new Error("Unable to fetch FIFO stock.");
    }

    const receiptLayers = result.data.receiptLayers || [];

    if (!receiptLayers.length) {
      throw new Error("No available Receipt stock found.");
    }

    const { issueRate } = calculateFifoIssue(receiptLayers, qty);

    if (!Number.isFinite(issueRate) || issueRate < 0) {
      throw new Error("Unable to calculate FIFO issue rate.");
    }

    return issueRate;
  }

  // RECEIPT without brand: Item Master rate
  if (!brandManufacturerId) {
    const itemRate = Number(item.rather);

    if (!Number.isFinite(itemRate) || itemRate < 0) {
      throw new Error("Valid item rate not found in Item Master.");
    }

    return itemRate;
  }

  // RECEIPT with brand: brand-wise rate
  if (!issueDate) throw new Error("Please select the transaction date.");
  if (!itemConditionId || !itemGroupId) throw new Error("Item condition or item group is missing.");

  const params = new URLSearchParams({
    itemMasterId,
    brandManufacturerId: String(brandManufacturerId),
    itemConditionId,
    itemGroupId,
    date: issueDate.slice(0, 10),
  });

  const result = await fetchJson(
    `/api/inventory/item-rate/brand-rate?${params}`,
    "Brand-wise rate not found.",
  );

  if (!result.data) throw new Error("Brand-wise rate not found.");

  const rate = Number(result.data.Rate);
  if (!Number.isFinite(rate) || rate < 0) throw new Error("Invalid brand-wise rate.");

  return rate;
}

// --------------------------------------------------
// TOAST
// --------------------------------------------------

const showSuccessToast = (message) =>
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

const showErrorToast = (message) =>
  toast.custom(
    (t) => (
      <Alert variant="mono" icon="destructive" close onClose={() => toast.dismiss(t)}>
        <AlertIcon>
          <RiErrorWarningFill />
        </AlertIcon>
        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    { position: "top-center" },
  );

// --------------------------------------------------
// SMALL HOOKS
// --------------------------------------------------

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/** Loads warehouses or machines for the given type ("location" | "machinery"). */
function useDestinationOptions(open, type, errorMessage) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !type) {
      setList([]);
      return;
    }

    let ignore = false;

    (async () => {
      try {
        setLoading(true);
        const result = await fetchJson(destinationEndpoint(type), errorMessage);
        if (!ignore) setList(getArray(result.data));
      } catch (error) {
        console.error("DESTINATION FETCH ERROR:", error);
        if (!ignore) {
          setList([]);
          showErrorToast(error.message || errorMessage);
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [open, type, errorMessage]);

  return { list, loading };
}

/** Previous stock quantity for an item at a warehouse / machine. */
function usePreviousQty(open, itemId, itemTypeId, locationType, locationId, errorMessage) {
  const [qty, setQty] = useState(0);

  useEffect(() => {
    if (!open || !itemId || !itemTypeId || !locationType || !locationId) {
      setQty(0);
      return;
    }

    let ignore = false;
    setQty(0);

    (async () => {
      try {
        const balance = await fetchPreviousBalance(itemId, itemTypeId, locationType, locationId);
        if (!ignore) setQty(balance);
      } catch (error) {
        console.error("PREVIOUS BALANCE ERROR:", error);
        if (!ignore) {
          setQty(0);
          showErrorToast(error.message || errorMessage);
        }
      }
    })();

    return () => {
      ignore = true;
    };
  }, [open, itemId, itemTypeId, locationType, locationId, errorMessage]);

  return qty;
}

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

  const selectedDate = value ? new Date(`${value.slice(0, 10)}T00:00:00`) : undefined;
  const selectedTime = value?.includes("T") ? value.slice(11, 16) : undefined;

  const todayKey = format(today, "yyyy-MM-dd");
  const nowTime = format(today, "HH:mm");
  const isToday = selectedDate && format(selectedDate, "yyyy-MM-dd") === todayKey;

  const handleDateChange = (newDate) => {
    if (!newDate) return;
    onChange(`${format(newDate, "yyyy-MM-dd")}T${selectedTime || "10:00"}`);
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
          {selectedDate ? (
            `${format(selectedDate, "PPP")} - ${selectedTime || "Select time"}`
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
                      {selectedDate ? format(selectedDate, "EEEE, d") : "Pick a date"}
                    </p>
                  </div>

                  <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                    {TIME_SLOTS.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={selectedTime === slot ? "primary" : "outline"}
                        size="sm"
                        className="w-full"
                        disabled={!selectedDate || (disableFuture && isToday && slot > nowTime)}
                        onClick={() => handleTimeChange(slot)}
                      >
                        {slot}
                      </Button>
                    ))}
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
  onSelect,
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  getLabel,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [chosen, setChosen] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const buildUrl = useCallback(
    (pageNumber) => {
      const params = new URLSearchParams({
        page: String(pageNumber),
        limit: "100",
        query: debouncedQuery,
        status: "all",
      });

      const separator = endpoint.includes("?") ? "&" : "?";

      return `${endpoint}${separator}${params.toString()}`;
    },
    [endpoint, debouncedQuery],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setPage(1);
        setOptions([]);

        const result = await fetchJson(buildUrl(1), "Failed to load options.");
        if (cancelled) return;

        setOptions(getArray(result.data));
        setPage(Number(result.pagination?.page) || 1);
        setTotalPages(Number(result.pagination?.totalPages) || 1);
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
    })();

    return () => {
      cancelled = true;
    };
  }, [open, buildUrl]);

  const loadMore = async () => {
    if (loading || loadingMore || page >= totalPages) return;

    const nextPage = page + 1;

    try {
      setLoadingMore(true);

      const result = await fetchJson(buildUrl(nextPage), "Failed to load more options.");
      const records = getArray(result.data);

      setOptions((previous) => {
        const existingIds = new Set(previous.map((item) => String(item.id)));
        return [...previous, ...records.filter((item) => !existingIds.has(String(item.id)))];
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

  // Keep the chosen option so the label survives searching / closing.
  const selectedOption =
    options.find((item) => String(item.id) === String(value)) ||
    (chosen && String(chosen.id) === String(value) ? chosen : undefined);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{selectedOption ? getLabel(selectedOption) : placeholder}</span>
          <span className="ml-2">⌄</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={searchPlaceholder}
          className="mb-2"
        />

        <div
          className="max-h-56 overflow-y-auto"
          onScroll={(event) => {
            const el = event.currentTarget;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 30) loadMore();
          }}
        >
          {loading ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Loading...</p>
          ) : options.length ? (
            <>
              {options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-muted ${String(value) === String(option.id) ? "bg-muted" : ""
                    }`}
                  onClick={() => {
                    setChosen(option);
                    onChange?.(String(option.id));
                    onSelect?.(option);
                    setOpen(false);
                  }}
                >
                  {getLabel(option)}
                </button>
              ))}

              {loadingMore && (
                <p className="py-2 text-center text-xs text-muted-foreground">Loading more...</p>
              )}

              {!loadingMore && page >= totalPages && (
                <p className="py-2 text-center text-xs text-muted-foreground">No more records</p>
              )}
            </>
          ) : (
            <p className="py-4 text-center text-sm text-muted-foreground">No records found.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// --------------------------------------------------
// PRESENTATIONAL PIECES
// --------------------------------------------------

function FieldError({ message }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function UnitSuffix({ label }) {
  return label ? (
    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
      {label}
    </span>
  ) : null;
}

function ReadOnlyNumber({ label, value, unitLabel, strong = false }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={Number(value) || 0}
          readOnly
          className={`bg-muted ${strong ? "font-medium" : ""} ${unitLabel ? "pr-36" : ""}`}
        />
        <UnitSuffix label={unitLabel} />
      </div>
    </div>
  );
}

function DestinationSelector({
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
  disabled,
}) {
  const noun = typeValue === "location" ? "Warehouse" : "Machine";

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-3">
        <Label className="font-semibold">{title}</Label>

        <RadioGroup
          value={typeValue}
          onValueChange={onTypeChange}
          disabled={disabled}
          className="flex flex-wrap gap-6"
        >
          {[
            ["location", "Warehouse"],
            ["machinery", "Machine"],
          ].map(([value, label]) => (
            <div key={value} className="flex items-center gap-2">
              <RadioGroupItem value={value} id={`${radioPrefix}-${value}`} />
              <Label htmlFor={`${radioPrefix}-${value}`} className="cursor-pointer font-normal">
                {label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <FieldError message={typeError} />
      </div>

      {typeValue && (
        <div className="space-y-2">
          <Label>
            Select {noun}
            <span className="text-destructive"> *</span>
          </Label>

          <SelectSearch
            options={list.map((item) => ({
              label: getDestinationName(item, typeValue),
              value: String(item.id),
            }))}
            value={String(idValue || "")}
            onValueChange={onIdChange}
            placeholder={
              isLoading
                ? "Loading..."
                : list.length
                  ? `Select ${noun}`
                  : "No records found"
            }
            searchPlaceholder={`Search ${noun.toLowerCase()}...`}
            disabled={isLoading || disabled || list.length === 0}
          />

          <FieldError message={idError} />
        </div>
      )}
    </div>
  );
}

function CommentField({ value, error, disabled, onChange }) {
  return (
    <div className="space-y-2">
      <Label>Comment</Label>

      <Textarea
        placeholder="Enter additional comments..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={1000}
        rows={4}
        disabled={disabled}
        className="resize-none"
      />

      <div className="flex justify-between">
        {error ? <p className="text-sm text-destructive">{error}</p> : <span />}
        <p className="text-xs text-muted-foreground">{value.length}/1000</p>
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, disabled, error }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        maxLength={100}
      />
      <FieldError message={error} />
    </div>
  );
}

function DateField({ label, value, onChange, placeholder, disabled }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <DateTimePicker value={value} onChange={onChange} disabled={disabled} placeholder={placeholder} />
    </div>
  );
}

// --------------------------------------------------
// COMPONENT
// --------------------------------------------------

export default function IssueReceiptAddDialog({ open, closeDialog, onSuccess }) {
  const { data: session, status } = useSession();

  const userName = session?.user?.name || "admin";
  const userId = session?.user?.id || null;

  const { data: roleList = [], isLoading: rolesLoading } = useRoleSelectQuery();

  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);

  const [groups, setGroups] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [units, setUnits] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);

  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedRole, setSelectedRole] = useState("all");

  const [activeTab, setActiveTab] = useState("inward");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(getInitialForm);

  const isInward = activeTab === "inward";
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [customFields, setCustomFields] = useState({});
  // --------------------------------------------------
  // DERIVED DATA
  // --------------------------------------------------

  const requiredTransaction = isInward ? "receipt" : "issue";

  const transactionTypeId = useMemo(() => {
    const match = transactions.find((t) => getTransactionName(t) === requiredTransaction);
    return match ? String(match.id) : "";
  }, [transactions, requiredTransaction]);

  const debouncedQty = useDebouncedValue(form.Qty, 400);

  // Destination lists
  const inwardDest = useDestinationOptions(open, form.DestinationType, "Failed to load Receive To options.");
  const issueFrom = useDestinationOptions(open, form.IssueFromType, "Failed to load Issue From options.");
  const transferTo = useDestinationOptions(open, form.ReceiveToType, "Failed to load Receive To options.");

  // Previous quantities
  const receivePreviousQty = usePreviousQty(
    open,
    form.ItemMasterid,
    form.ItemTypeid,
    form.DestinationType,
    form.DestinationId,
    "Failed to fetch Receive To previous quantity.",
  );
  const issueFromPreviousQty = usePreviousQty(
    open,
    form.ItemMasterid,
    form.ItemTypeid,
    form.IssueFromType,
    form.IssueFromId,
    "Failed to fetch Issue From previous quantity.",
  );
  const transferReceivePreviousQty = usePreviousQty(
    open,
    form.ItemMasterid,
    form.ItemTypeid,
    form.ReceiveToType,
    form.ReceiveToId,
    "Failed to fetch Receive To previous quantity.",
  );

  const qtyNumber = Number(form.Qty) || 0;

  // Inward: balance at Receive To. Transfer: remaining stock at Issue From.
  const previousBalance = Number(isInward ? receivePreviousQty : issueFromPreviousQty) || 0;
  const balance = isInward ? previousBalance + qtyNumber : previousBalance - qtyNumber;
  const transferReceiveFinalBalance = (Number(transferReceivePreviousQty) || 0) + qtyNumber;

  const selectedUnit = useMemo(() => {
    const unitId = getItemUnitId(selectedItem);
    return units.find((unit) => String(unit.id) === unitId);
  }, [units, selectedItem]);

  const unitName = selectedUnit?.unitName || selectedUnit?.UnitName || "";
  const unitAbbreviation = selectedUnit?.abbreviation || selectedUnit?.Abbreviation || "";
  const unitLabel = unitAbbreviation ? `${unitName} (${unitAbbreviation})` : unitName;

  const total = (Number(form.Price || 0) * Number(form.Qty || 0)).toFixed(2);

  // --------------------------------------------------
  // FIELD UPDATES
  // --------------------------------------------------

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }, []);

  const applyGroupSelection = (ids) => {
    setSelectedGroups(ids);
    setSelectedItem(null);

    setForm((prev) => ({
      ...prev,
      ...ITEM_RESET,
      GroupName: groups.filter((g) => ids.includes(String(g.id))).map(getGroupName).filter(Boolean),
    }));

    setErrors((prev) => ({
      ...prev,
      ItemGroupid: ids.length ? "" : "Item Group is required.",
      ItemMasterid: "",
      ItemTypeid: "",
    }));
  };

  const handleGroupToggle = (groupId) =>
    applyGroupSelection(
      selectedGroups.includes(groupId)
        ? selectedGroups.filter((id) => id !== groupId)
        : [...selectedGroups, groupId],
    );

  const handleSelectAllGroups = () => applyGroupSelection(groups.map((g) => String(g.id)));

  const handleClearAllGroups = () => applyGroupSelection([]);

  const handleItemChange = (item) => {
    const conditionId = getItemConditionId(item);
    const matchedCondition = productTypes.find(
      (type) => String(type.id) === conditionId
    );

    setSelectedItem(item);

    setForm((prev) => ({
      ...prev,
      ItemMasterid: String(item.id),
      ItemGroupid: getItemGroupId(item),
      ItemTypeid: matchedCondition ? String(matchedCondition.id) : "",
      BrandManufacturerid: "",
      Price: "",
    }));

    setErrors((prev) => ({
      ...prev,
      ItemMasterid: "",
      ItemTypeid: matchedCondition
        ? ""
        : "Item condition is missing in Item Master.",
      BrandManufacturerid: "",
      Price: "",
    }));
  };

  const handleRoleChange = (value) => {
    setSelectedRole(value);
    setForm((prev) => ({ ...prev, Issue_by: "", RecivedBy: "" }));
    setErrors((prev) => ({ ...prev, Issue_by: "", RecivedBy: "" }));
  };

  // Creates a handler that switches a Warehouse/Machine type and clears its id.
  const makeTypeChangeHandler = (typeKey, idKey) => (value) => {
    setForm((prev) => ({ ...prev, [typeKey]: value, [idKey]: "" }));
    setErrors((prev) => ({ ...prev, [typeKey]: "", [idKey]: "" }));
  };

  const handleDestinationTypeChange = makeTypeChangeHandler("DestinationType", "DestinationId");
  const handleIssueFromTypeChange = makeTypeChangeHandler("IssueFromType", "IssueFromId");
  const handleTransferReceiveTypeChange = makeTypeChangeHandler("ReceiveToType", "ReceiveToId");

  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  const loadDropdowns = async () => {
    try {
      setDropdownLoading(true);

      const [groupResult, transactionResult, productTypeResult, unitResult] = await Promise.all([
        fetchJson("/api/inventory/item-groups?limit=100&status=active", "Failed to load item groups."),
        fetchJson("/api/inventory/transaction-type?limit=100&status=active", "Failed to load transaction types."),
        fetchJson("/api/inventory/product-type?limit=100&status=active", "Failed to load product types."),
        fetchJson("/api/inventory/unit?limit=100&status=active", "Failed to load units."),
      ]);

      const groupList = getArray(groupResult.data);

      setGroups(groupList);
      setTransactions(getArray(transactionResult.data));
      setProductTypes(getArray(productTypeResult.data));
      setUnits(getArray(unitResult.data));

    } catch (error) {
      console.error("STOCK MOVEMENT DROPDOWN ERROR:", error);
      showErrorToast(error.message || "Failed to load dropdown data.");
    } finally {
      setDropdownLoading(false);
    }
  };

  const resetState = () => {
    setForm(getInitialForm());
    setErrors({});
    setGroups([]);
    setTransactions([]);
    setProductTypes([]);
    setUnits([]);
    setStaffUsers([]);
    setSelectedItem(null);
    setSelectedGroups([]);
    setSelectedRole("all");
    setActiveTab("inward");
    setGroupDropdownOpen(false);
  };

  // Reset and load when the dialog opens
  useEffect(() => {
    if (!open) return;
    resetState();
    loadDropdowns();
  }, [open]);

  // Users by role
  useEffect(() => {
    if (!open) return;

    let ignore = false;

    (async () => {
      try {
        setStaffLoading(true);
        setStaffUsers([]);

        const params = new URLSearchParams({ limit: "100" });
        if (selectedRole !== "all") params.set("roleId", selectedRole);

        const response = await apiFetch(`/api/user-management/users?${params}`);
        const result = await response.json();

        if (!response.ok) throw new Error(result.message || "Failed to load users.");

        if (!ignore) setStaffUsers(getArray(result.data));
      } catch (error) {
        console.error("STAFF FETCH ERROR:", error);
        if (!ignore) {
          setStaffUsers([]);
          showErrorToast(error.message || "Failed to load users.");
        }
      } finally {
        if (!ignore) setStaffLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [open, selectedRole]);

  // Keep TransactionTypeid in sync with the active tab
  useEffect(() => {
    setForm((prev) =>
      prev.TransactionTypeid === transactionTypeId
        ? prev
        : { ...prev, TransactionTypeid: transactionTypeId },
    );
  }, [transactionTypeId]);

  // --------------------------------------------------
  // AUTO RATE
  // --------------------------------------------------

  useEffect(() => {
    const clearPrice = () =>
      setForm((prev) => (prev.Price === "" ? prev : { ...prev, Price: "" }));

    if (!open || !form.ItemMasterid || !transactionTypeId) {
      clearPrice();
      return;
    }

    if (!selectedItem || String(selectedItem.id) !== String(form.ItemMasterid)) return;

    // Receipt with brand needs a date
    if (requiredTransaction === "receipt" && form.BrandManufacturerid && !form.IssueDate) {
      clearPrice();
      return;
    }

    // Issue (FIFO) needs source, quantity and date
    if (
      requiredTransaction === "issue" &&
      (!form.IssueFromType ||
        !form.IssueFromId ||
        !form.IssueDate ||
        String(debouncedQty).trim() === "" ||
        !Number.isFinite(Number(debouncedQty)) ||
        Number(debouncedQty) < 0)
    ) {
      clearPrice();
      return;
    }

    let ignore = false;

    (async () => {
      try {
        setRateLoading(true);

        const rate = await fetchRate({
          item: selectedItem,
          transactionType: requiredTransaction,
          brandManufacturerId: form.BrandManufacturerid,
          issueDate: form.IssueDate,
          issueQty: debouncedQty,
          issueFromType: form.IssueFromType,
          issueFromId: form.IssueFromId,
        });

        if (ignore) return;

        setForm((prev) => ({ ...prev, Price: String(rate) }));
        setErrors((prev) => ({ ...prev, Price: "" }));
      } catch (error) {
        console.error(`${requiredTransaction.toUpperCase()} RATE ERROR:`, error);

        if (!ignore) {
          setForm((prev) => ({ ...prev, Price: "" }));
          setErrors((prev) => ({ ...prev, Price: error.message || "Rate not found." }));
        }
      } finally {
        if (!ignore) setRateLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [
    open,
    selectedItem,
    transactionTypeId,
    requiredTransaction,
    form.ItemMasterid,
    form.BrandManufacturerid,
    form.IssueDate,
    form.IssueFromType,
    form.IssueFromId,
    debouncedQty,
  ]);

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const validateQty = (newErrors) => {
    if (!String(form.Qty).trim()) {
      newErrors.Qty = "Quantity is required.";
    } else if (!Number.isFinite(Number(form.Qty)) || Number(form.Qty) <= 0) {
      newErrors.Qty = "Quantity must be greater than 0.";
    } else if (!Number.isInteger(Number(form.Qty))) {
      newErrors.Qty = "Quantity must be a whole number.";
    }
  };

  const validateCommonFields = (newErrors) => {
    if (!selectedGroups.length) newErrors.ItemGroupid = "Item Group is required.";
    if (!form.ItemMasterid) newErrors.ItemMasterid = "Item is required.";
    if (!form.ItemTypeid) newErrors.ItemTypeid = "Item Condition is required in Item Master.";
    if (!form.TransactionTypeid) newErrors.TransactionTypeid = "Transaction Type is required.";

    if (!form.IssueDate) {
      newErrors.IssueDate = "Date and time is required.";
    } else if (new Date(form.IssueDate) > new Date()) {
      newErrors.IssueDate = "Date and time cannot be in the future.";
    }

    validateQty(newErrors);
  };

  const validateInwardForm = (newErrors) => {
    if (!selectedRole) newErrors.UserRole = "User Role is required.";
    if (!form.Issue_by) newErrors.Issue_by = "User is required.";

    if (form.Price !== "" && (!Number.isFinite(Number(form.Price)) || Number(form.Price) < 0)) {
      newErrors.Price = "Rate must be a valid non-negative number.";
    }

    if (form.Comment.length > 1000) newErrors.Comment = "Comment cannot exceed 1000 characters.";

    if (form.ReciptChallanNo.length > 100) {
      newErrors.ReciptChallanNo = "Challan/Bill Number cannot exceed 100 characters.";
    }

    if (!form.DestinationType) {
      newErrors.DestinationType = "Please select Receive To Warehouse or Machine.";
    } else if (!form.DestinationId) {
      newErrors.DestinationId = "Please select a Receive To destination.";
    }
  };

  const validateTransferForm = (newErrors) => {
    if (!form.IssueFromType) {
      newErrors.IssueFromType = "Please select Issue From Warehouse or Machine.";
    } else if (!form.IssueFromId) {
      newErrors.IssueFromId = "Please select an Issue From destination.";
    }

    if (!form.ReceiveToType) {
      newErrors.ReceiveToType = "Please select Receive To Warehouse or Machine.";
    } else if (!form.ReceiveToId) {
      newErrors.ReceiveToId = "Please select a Receive To destination.";
    }

    if (
      form.IssueFromId &&
      form.ReceiveToId &&
      form.IssueFromType === form.ReceiveToType &&
      String(form.IssueFromId) === String(form.ReceiveToId)
    ) {
      newErrors.ReceiveToId = "Issue From and Receive To cannot be the same destination.";
    }

    if (form.Price === "" || !Number.isFinite(Number(form.Price)) || Number(form.Price) < 0) {
      newErrors.Price = "Please enter a valid non-negative rate.";
    }

    if (Number(form.Qty) > Number(issueFromPreviousQty)) {
      newErrors.Qty = "Transfer quantity cannot exceed the Issue From available quantity.";
    }

    if (form.GetPassNo.length > 100) {
      newErrors.GetPassNo = "Issue Slip/Gate Pass cannot exceed 100 characters.";
    }
  };

  const validateForm = () => {
    const newErrors = {};

    validateCommonFields(newErrors);
    (isInward ? validateInwardForm : validateTransferForm)(newErrors);

    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      showErrorToast("Please correct the highlighted fields.");
      return false;
    }

    return true;
  };

  // --------------------------------------------------
  // CLOSE / SAVE
  // --------------------------------------------------

  const handleClose = () => {
    if (loading) return;
    resetState();
    closeDialog?.();
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const missingCustomFields = validateRequiredCustomFields(
      customFieldDefinitions,
      customFields,
    );

    if (missingCustomFields.length > 0) {
      showErrorToast(
        `Please fill in required custom fields: ${missingCustomFields.join(", ")}`,
      );
      return;
    } 
    if (status === "loading") {
      showErrorToast("Please wait while your session loads.");
      return;
    }

    // Internal transfer uses the logged-in user.
    const issueBy = isInward ? form.Issue_by : userId;

    if (!issueBy) {
      showErrorToast(
        isInward
          ? "Please select Issue By."
          : "Unable to identify the logged-in user. Please log in again.",
      );
      return;
    }

    try {
      setLoading(true);

      const payload = {
        ...form,
        MovementType: isInward ? "INWARD" : "INTERNAL_TRANSFER",
        Issue_by: String(issueBy),

        Qty: qtyNumber,
        PreviousBalance: previousBalance,
        Balance: balance,
        Price: form.Price === "" || form.Price === null ? null : Number(form.Price),

        ...(isInward
          ? {
            ToType: form.DestinationType,
            ToId: form.DestinationId,
          }
          : {
            FromType: form.IssueFromType,
            FromId: form.IssueFromId,

            ToType: form.ReceiveToType,
            ToId: form.ReceiveToId,

            DestinationType: form.ReceiveToType,
            DestinationId: form.ReceiveToId,
            customFields: customFields ?? {},
            IssueFromPreviousQty: Number(issueFromPreviousQty) || 0,
            ReceiveToPreviousQty: Number(transferReceivePreviousQty) || 0,
          }),

        UserName: userName,
        UserId: userId,
      };

      const response = await apiFetch("/api/inventory/issue-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to create Stock Movement.");
      }

      showSuccessToast(
        isInward ? "Inward entry created successfully." : "Internal Transfer created successfully.",
      );

      onSuccess?.(result.data);
      resetState();
      closeDialog?.();
    } catch (error) {
      console.error("CREATE STOCK MOVEMENT ERROR:", error);
      showErrorToast(error.message || "Failed to create stock movement.");
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // SHARED FIELD RENDERERS
  // --------------------------------------------------
  const [groupSearch, setGroupSearch] = useState("");
  const filteredGroups = groups.filter((group) =>
    getGroupName(group)
      .toLowerCase()
      .includes(groupSearch.trim().toLowerCase())
  );
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
          onClick={() => {
            setGroupDropdownOpen((prev) => !prev);
            setGroupSearch("");
          }}
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
                  disabled={loading || !filteredGroups.length}
                >
                  Select All
                </button>

                <button
                  type="button"
                  className="text-xs text-destructive"
                  onClick={handleClearAllGroups}
                  disabled={loading || !selectedGroups.length}
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative py-2">
              <input
                type="text"
                value={groupSearch}
                onChange={(event) => setGroupSearch(event.target.value)}
                placeholder="Search item groups..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              />

              {groupSearch && (
                <button
                  type="button"
                  onClick={() => setGroupSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Group List */}
            <div
              className="max-h-[200px] overflow-y-auto overscroll-contain py-2"
              onWheel={(event) => event.stopPropagation()}
            >
              <div className="space-y-2">
                {filteredGroups.length ? (
                  filteredGroups.map((group) => {
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
                    {groups.length
                      ? "No matching groups found."
                      : "No groups found."}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setGroupDropdownOpen(false);
                  setGroupSearch("");
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Groups */}
      {selectedGroups.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {groups
            .filter((group) => selectedGroups.includes(String(group.id)))
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

      <FieldError message={errors.ItemGroupid} />
    </div>
  );

  const renderItemField = () => {
    const itemGroupIds = selectedGroups.join(",");

    return (
      <div className="space-y-2">
        <Label>
          Item Name <span className="text-destructive">*</span>
        </Label>

        <PaginatedSearchSelect
          key={itemGroupIds}
          endpoint={
            itemGroupIds
              ? `/api/inventory/item-master?itemGroupIds=${encodeURIComponent(itemGroupIds)}`
              : "/api/inventory/item-master"
          }
          value={form.ItemMasterid}
          onSelect={handleItemChange}
          placeholder={!selectedGroups.length ? "Select Item Group first" : "Select Item"}
          searchPlaceholder="Search items..."
          disabled={loading || !selectedGroups.length}
          getLabel={(item) =>
            item.ItemName || item.itemName || item.name || `Item #${item.id}`
          }
        />

        <FieldError message={errors.ItemMasterid} />
      </div>
    );
  };

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

      <FieldError message={errors.ItemTypeid} />
    </div>
  );

  const renderBrandField = () => (
    <div className="space-y-2">
      <Label>Brand / Manufacturer</Label>

      <PaginatedSearchSelect
        key={form.ItemMasterid}
        endpoint={
          form.ItemMasterid
            ? `/api/inventory/brand_manufacturer?itemMasterId=${encodeURIComponent(
              form.ItemMasterid
            )}`
            : "/api/inventory/brand_manufacturer"
        }
        value={form.BrandManufacturerid}
        onChange={(value) => updateField("BrandManufacturerid", value)}
        placeholder="Select Brand / Manufacturer"
        searchPlaceholder="Search brand or manufacturer..."
        disabled={loading || !form.ItemMasterid}
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

      <FieldError message={errors.BrandManufacturerid} />
    </div>
  );

  const renderTransactionField = () => (
    <div className="space-y-2">
      <Label>
        Transaction Type <span className="text-destructive">*</span>
      </Label>

      <Select value={transactionTypeId} disabled>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select Transaction Type" />
        </SelectTrigger>

        <SelectContent>
          {transactionTypeId && (
            <SelectItem value={transactionTypeId}>{isInward ? "Receipt" : "Issue"}</SelectItem>
          )}
        </SelectContent>
      </Select>

      <FieldError message={errors.TransactionTypeid} />
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

      <FieldError message={errors.IssueDate} />
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
          <UnitSuffix label={unitLabel} />
        </div>

        <FieldError message={errors.Qty} />
      </div>

      <div className="space-y-2">
        <Label>
          Rate (₹) <span className="text-destructive">*</span>
        </Label>

        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder={rateLoading ? "Fetching rate..." : "Enter rate"}
          value={form.Price}
          onChange={(event) => updateField("Price", event.target.value)}
          disabled={loading || rateLoading}
        />

        <FieldError message={errors.Price} />

        {rateLoading && (
          <p className="text-xs text-muted-foreground">Fetching applicable rate...</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Total Amount (Rate × Quantity)</Label>
        <Input type="number" value={total} readOnly className="bg-muted font-medium" />
      </div>
    </>
  );

  const renderCommentField = () => (
    <CommentField
      value={form.Comment}
      error={errors.Comment}
      disabled={loading}
      onChange={(value) => updateField("Comment", value)}
    />
  );

  // Fields shared by both tabs, in the same order as before.
  const renderCommonTop = () => (
    <>
      {renderItemGroupField()}
      {renderItemField()}
      {renderItemConditionField()}
      {renderBrandField()}
      {renderTransactionField()}
      {renderIssueDateField()}
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
      <DialogContent
        className="mx-auto flex max-h-[90vh] w-[calc(100%-2rem)] max-w-[886px] flex-col overflow-hidden"
        variant="fullscreen"
      >
        <DialogHeader>
          <DialogTitle>Add New Entry</DialogTitle>
          <DialogDescription>
            Select Inward or Internal Transfer and enter the stock movement details.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setErrors({});
            setGroupDropdownOpen(false);
          }}
          className="flex min-h-0 w-full flex-1 flex-col space-y-5 overflow-hidden"
        >
          <TabsList variant="line">
            <TabsTrigger value="inward" className="justify-start">
              <ArrowRight className="h-4 w-4" />
              Inward
            </TabsTrigger>

            <TabsTrigger value="internal-transfer" className="justify-start">
              <ArrowLeftRight className="h-4 w-4" />
              Internal Transfer
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="min-h-0 flex-1 overflow-y-auto py-0 ps-0 pe-3">
            <DialogBody className="space-y-6">
              {/* INWARD */}
              <TabsContent value="inward" className="mt-0 space-y-6">
                {renderCommonTop()}

                <div className="space-y-2">
                  <Label>
                    Receipt Form User Role <span className="text-destructive">*</span>
                  </Label>

                  <SelectSearch
                    options={[
                      { label: "All Roles", value: "all" },
                      ...roleList.map((role) => ({
                        label: role.name,
                        value: String(role.id),
                      })),
                    ]}
                    value={selectedRole}
                    onValueChange={handleRoleChange}
                    placeholder="Select User Role"
                    searchPlaceholder="Search user role..."
                    disabled={rolesLoading || loading}
                  />

                  <FieldError message={errors.UserRole} />
                </div>

                <div className="space-y-2">
                  <Label>
                    Receipt Form User <span className="text-destructive">*</span>
                  </Label>

                  <SelectSearch
                    options={staffUsers.map((staff) => ({
                      label: getStaffName(staff),
                      value: String(staff.id),
                    }))}
                    value={String(form.Issue_by || "")}
                    onValueChange={(value) => updateField("Issue_by", value)}
                    placeholder={staffLoading ? "Loading users..." : "Select User"}
                    searchPlaceholder="Search user..."
                    disabled={staffLoading || loading || staffUsers.length === 0}
                  />

                  <FieldError message={errors.Issue_by} />

                  {!staffLoading && staffUsers.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No users found for the selected role.
                    </p>
                  )}
                </div>

                <TextField
                  label="Challan/Bill Number"
                  placeholder="Enter Challan/Bill Number"
                  value={form.ReciptChallanNo}
                  onChange={(value) => updateField("ReciptChallanNo", value)}
                  disabled={loading}
                  error={errors.ReciptChallanNo}
                />

                <DateField
                  label="Challan/Bill Date & Time"
                  placeholder="Select Challan/Bill Date & Time"
                  value={form.ReceiptDate}
                  onChange={(value) => updateField("ReceiptDate", value)}
                  disabled={loading}
                />

                <TextField
                  label="Requisition Slip Number"
                  placeholder="Enter Requisition Slip Number"
                  value={form.RequisitionSupplyNo}
                  onChange={(value) => updateField("RequisitionSupplyNo", value)}
                  disabled={loading}
                />

                <DateField
                  label="Requisition Slip Date & Time"
                  placeholder="Select Requisition Date & Time"
                  value={form.RequisitionSupplyDate}
                  onChange={(value) => updateField("RequisitionSupplyDate", value)}
                  disabled={loading}
                />

                <TextField
                  label="Purchase Order Number"
                  placeholder="Enter Purchase Order Number"
                  value={form.PurchaseNo}
                  onChange={(value) => updateField("PurchaseNo", value)}
                  disabled={loading}
                />

                <DateField
                  label="Purchase Order Date & Time"
                  placeholder="Select Purchase Order Date & Time"
                  value={form.PurchaseDate}
                  onChange={(value) => updateField("PurchaseDate", value)}
                  disabled={loading}
                />

                {renderQuantityRateFields()}

                <DestinationSelector
                  title="Receipt To"
                  typeValue={form.DestinationType}
                  idValue={form.DestinationId}
                  onTypeChange={handleDestinationTypeChange}
                  onIdChange={(value) => updateField("DestinationId", value)}
                  list={inwardDest.list}
                  isLoading={inwardDest.loading}
                  typeError={errors.DestinationType}
                  idError={errors.DestinationId}
                  radioPrefix="inward-receive"
                  disabled={loading}
                />

                <ReadOnlyNumber
                  label="Receipt To Previous Quantity"
                  value={receivePreviousQty}
                  unitLabel={unitLabel}
                />

                <ReadOnlyNumber label="Final Balance (Receive To)" value={balance} strong />

                {renderCommentField()}
              </TabsContent>

              {/* INTERNAL TRANSFER */}
              <TabsContent value="internal-transfer" className="mt-0 space-y-6">
                {renderCommonTop()}

                <DestinationSelector
                  title="Issue From"
                  typeValue={form.IssueFromType}
                  idValue={form.IssueFromId}
                  onTypeChange={handleIssueFromTypeChange}
                  onIdChange={(value) => updateField("IssueFromId", value)}
                  list={issueFrom.list}
                  isLoading={issueFrom.loading}
                  typeError={errors.IssueFromType}
                  idError={errors.IssueFromId}
                  radioPrefix="transfer-issue-from"
                  disabled={loading}
                />

                <ReadOnlyNumber
                  label="Issue From Previous Quantity"
                  value={issueFromPreviousQty}
                  unitLabel={unitLabel}
                />

                <TextField
                  label="Issue Slip/Gate Pass"
                  placeholder="Enter Issue Slip/Gate Pass"
                  value={form.GetPassNo}
                  onChange={(value) => updateField("GetPassNo", value)}
                  disabled={loading}
                  error={errors.GetPassNo}
                />

                {renderQuantityRateFields()}

                <DestinationSelector
                  title="Receipt To"
                  typeValue={form.ReceiveToType}
                  idValue={form.ReceiveToId}
                  onTypeChange={handleTransferReceiveTypeChange}
                  onIdChange={(value) => updateField("ReceiveToId", value)}
                  list={transferTo.list}
                  isLoading={transferTo.loading}
                  typeError={errors.ReceiveToType}
                  idError={errors.ReceiveToId}
                  radioPrefix="transfer-receive-to"
                  disabled={loading}
                />

                <ReadOnlyNumber
                  label="Receipt To Previous Quantity"
                  value={transferReceivePreviousQty}
                  unitLabel={unitLabel}
                />

                <ReadOnlyNumber label="Issue From Final Balance" value={balance} strong />

                <ReadOnlyNumber
                  label="Receipt To Final Balance"
                  value={transferReceiveFinalBalance}
                  strong
                />

                {renderCommentField()}
              </TabsContent>
              {/* CUSTOM FIELDS */}

              <div className="space-y-4 border-t pt-5">
                <div>
                  <h3 className="text-base font-semibold">
                    Custom Fields
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Additional Item information.
                  </p>
                </div>

                <IssueReceiptCustomFields
                  values={customFields}
                  onChange={setCustomFields}
                  onFieldsLoaded={(loadedFields) => {
                    setCustomFieldDefinitions(loadedFields);
                  }}
                />
              </div>
            </DialogBody>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
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