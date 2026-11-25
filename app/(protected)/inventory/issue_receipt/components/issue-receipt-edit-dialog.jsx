"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

const DESTINATION_TYPES = [
  ["location", "Warehouse"],
  ["machinery", "Machine"],
];

// Extra fields on the Inward tab (text / date pairs), rendered from config.
const INWARD_DOC_FIELDS = [
  { type: "text", key: "ReciptChallanNo", label: "Challan/Bill Number", placeholder: "Enter Challan/Bill Number", showError: true },
  { type: "date", key: "ReceiptDate", label: "Challan/Bill Date & Time", placeholder: "Select Challan/Bill Date & Time" },
  { type: "text", key: "RequisitionSupplyNo", label: "Requisition Slip Number", placeholder: "Enter Requisition Slip Number" },
  { type: "date", key: "RequisitionSupplyDate", label: "Requisition Slip Date & Time", placeholder: "Select Requisition Date & Time" },
  { type: "text", key: "PurchaseNo", label: "Purchase Order Number", placeholder: "Enter Purchase Order Number" },
  { type: "date", key: "PurchaseDate", label: "Purchase Order Date & Time", placeholder: "Select Purchase Order Date & Time" },
];

const ITEM_RESET = { ItemGroupid: "", ItemMasterid: "", ItemTypeid: "", Price: "" };

const getArray = (data) => (Array.isArray(data) ? data : []);

const getGroupName = (group) => group.groupName || group.GroupName;

const toOptions = (list, getLabel) =>
  list.map((entry) => ({ label: getLabel(entry), value: String(entry.id) }));

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

const normalizeLocationType = (type) =>
  String(type).toUpperCase() === "MACHINERY" ? "MACHINE" : String(type).toUpperCase();

const isInternalTransfer = (record) => {
  const transactionTypeName = String(
    record?.TransactionTypeName || ""
  )
    .trim()
    .toLowerCase();

  const movementType = String(
    record?.MovementType || ""
  )
    .trim()
    .toUpperCase();

  // Receipt always opens the Inward tab.
  if (transactionTypeName === "receipt") {
    return false;
  }

  // Internal transfer opens the Internal Transfer tab.
  if (movementType === "INTERNAL_TRANSFER") {
    return true;
  }

  return false;
};

const getItemGroupId = (item) =>
  String(item?.ItemGroupid ?? item?.itemGroupId ?? item?.ItemGroupId ?? item?.groupId ?? "");

const getItemConditionId = (item) => String(item?.ItemConditionid ?? item?.itemConditionId ?? "");

const getItemUnitId = (item) =>
  String(item?.Unitid ?? item?.unitId ?? item?.UnitId ?? item?.unitid ?? "");


const getTransactionName = (item) =>
  String(
    item?.TransactionTypeName ||
    item?.TransactionType ||
    item?.transactionType ||
    item?.name ||
    ""
  )
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

const getItemLabel = (item) => item.ItemName || item.itemName || item.name || `Item #${item.id}`;

const getBrandLabel = (brand) => {
  const brandName =
    brand?.brandName ||
    brand?.BrandName ||
    "";

  const manufacturerName =
    brand?.manufacturerName ||
    brand?.ManufacturerName ||
    "";

  if (
    brandName &&
    manufacturerName &&
    brandName.toLowerCase() !== manufacturerName.toLowerCase()
  ) {
    return `${brandName} - ${manufacturerName}`;
  }

  return (
    brandName ||
    manufacturerName ||
    brand?.name ||
    brand?.Name ||
    `Brand #${brand?.id}`
  );
};

// Item saved on the record (relation object, or a minimal fallback with the id).
const getSavedItem = (record) => {
  const relation = record?.ItemMaster || record?.itemMaster || record?.Item || record?.item;
  if (relation?.id) return relation;
  if (!record?.ItemMasterid) return null;

  return {
    id: record.ItemMasterid,
    ItemName: record.ItemName || record.itemName || record.ItemMasterName || "",
  };
};

// Brand saved on the record.
const getSavedBrand = (record) => {
  const relation =
    record?.BrandManufacturer ||
    record?.ItemBrand ||
    record?.Brand ||
    record?.brandManufacturer ||
    record?.itemBrand;
  if (relation?.id) return relation;

  const id = String(
    record?.BrandManufacturerid ||
    record?.ItemBrandid ||
    record?.brandManufacturerId ||
    record?.itemBrandid ||
    "",
  );
  return id ? { id, brandName: "", manufacturerName: "" } : null;
};

const getInitialForm = (record) => ({
  ItemGroupid: String(record?.ItemGroupid || ""),
  GroupName: getArray(record?.GroupName),
  ItemMasterid: String(record?.ItemMasterid || ""),
  BrandManufacturerid: String(getSavedBrand(record)?.id || ""),
  ItemTypeid: String(record?.ItemTypeid || ""),
  TransactionTypeid: String(record?.TransactionTypeid || ""),
  IssueDate: toDateTimeInput(record?.IssueDate),

  Qty: record?.Qty == null ? "" : String(record.Qty),
  Issue_by: String(record?.Issue_by || ""),
  RecivedBy: String(record?.RecivedBy || ""),

  GetPassNo: record?.GetPassNo || "",
  IssueFromType: normalizeType(record?.IssueFromType || record?.FromType),
  IssueFromId: String(record?.IssueFromId || record?.FromId || ""),
  ReceiveToType: normalizeType(record?.ReceiveToType || record?.ToType),
  ReceiveToId: String(record?.ReceiveToId || record?.ToId || ""),

  ReciptChallanNo: record?.ReciptChallanNo || "",
  ReceiptDate: toDateTimeInput(record?.ReceiptDate),
  RequisitionSupplyNo: record?.RequisitionSupplyNo || "",
  RequisitionSupplyDate: toDateTimeInput(record?.RequisitionSupplyDate),
  PurchaseNo: record?.PurchaseNo || "",
  PurchaseDate: toDateTimeInput(record?.PurchaseDate),

  // Kept so existing values are not wiped on update.
  DateOfRecive: toDateTimeInput(record?.DateOfRecive),
  Particuler: record?.Particuler || "",

  Comment: record?.Comment || "",
  Price: record?.Price == null ? "" : String(record.Price),

  DestinationType: normalizeType(record?.DestinationType || record?.ToType),
  DestinationId: String(record?.DestinationId || record?.ToId || ""),
});

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

async function fetchPreviousBalance(itemMasterId, itemTypeId, locationType, locationId) {
  const params = new URLSearchParams({
    itemTypeId: String(itemTypeId),
    locationType: normalizeLocationType(locationType),
    locationId: String(locationId),
  });

  const { data } = await fetchJson(
    `/api/inventory/issue-receipt/previous-balance/${itemMasterId}?${params}`,
    "Failed to fetch stock balance.",
  );

  return Number(data?.PreviousBalance ?? data?.previousBalance ?? data?.Balance ?? data?.balance ?? 0);
}
async function fetchPreviousBalanceDetails(
  itemMasterId,
  itemTypeId,
  locationType,
  locationId
) {
  const params = new URLSearchParams();

  if (itemTypeId) params.set("itemTypeId", String(itemTypeId));
  if (locationType) {
    params.set("locationType", normalizeLocationType(locationType));
  }
  if (locationId) params.set("locationId", String(locationId));

  const query = params.toString();

  const { data } = await fetchJson(
    `/api/inventory/issue-receipt/previous-balance/${itemMasterId}${query ? `?${query}` : ""}`,
    "Failed to fetch stock balance and rate."
  );

  return data || {};
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

  const nowTime = format(today, "HH:mm");
  const isToday = selectedDate && format(selectedDate, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

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
            className="p-2"
          />

          <div className="relative w-full sm:w-40 max-sm:h-48">
            <div className="absolute inset-0 py-4 max-sm:border-t">
              <ScrollArea className="h-full sm:border-s">
                <div className="space-y-3">
                  <div className="px-5 text-sm font-medium">
                    {selectedDate ? format(selectedDate, "EEEE, d") : "Pick a date"}
                  </div>

                  <div className="grid gap-1.5 px-5 max-sm:grid-cols-2">
                    {TIME_SLOTS.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={selectedTime === slot ? "primary" : "outline"}
                        size="sm"
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
  placeholder = "Select an option",
  searchPlaceholder = "Search...",
  getLabel,
  disabled = false,
  selectedRecord,
  filterOptions,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);

  const filteredOptions = useMemo(() => {
    if (!filterOptions) return options;

    return options.filter(filterOptions);
  }, [options, filterOptions]);

  const selectedOption =
    filteredOptions.find(
      (item) => String(item.id) === String(value)
    ) ||
    (selectedRecord && String(selectedRecord.id) === String(value)
      ? selectedRecord
      : undefined);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const buildUrl = useCallback(
    (pageNumber) =>
      `${endpoint}?${new URLSearchParams({
        page: String(pageNumber),
        limit: "100",
        query: debouncedQuery,
        status: "all",
      })}`,
    [endpoint, debouncedQuery],
  );

  // Fetch only while the dropdown is open.
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
        const ids = new Set(previous.map((item) => String(item.id)));
        return [...previous, ...records.filter((item) => !ids.has(String(item.id)))];
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
          ) : filteredOptions.length ? (
            <>
              {filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`w-full rounded px-3 py-2 text-left text-sm hover:bg-muted ${String(value) === String(option.id) ? "bg-muted" : ""
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
// ITEM GROUP CHECKBOX SELECT
// --------------------------------------------------

function GroupSelect({ groups, selected, onChange, loading, disabled, error }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return groups.filter((group) => String(getGroupName(group) || "").toLowerCase().includes(term));
  }, [groups, search]);

  const selectedGroups = useMemo(
    () => groups.filter((group) => selected.includes(String(group.id))),
    [groups, selected],
  );

  const toggle = (groupId) =>
    onChange(
      selected.includes(groupId) ? selected.filter((id) => id !== groupId) : [...selected, groupId],
    );

  return (
    <div className="space-y-2">
      <Label>
        Item Group <span className="text-destructive">*</span>
      </Label>

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          disabled={loading || disabled}
          onClick={() => setOpen((previous) => !previous)}
        >
          <span className="truncate">
            {loading
              ? "Loading groups..."
              : selected.length
                ? `${selected.length} group(s) selected`
                : "Select Item Groups"}
          </span>
          <span>▼</span>
        </Button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-background p-3 shadow-lg">
            <div className="space-y-2 border-b pb-2">
              <Input
                placeholder="Search item groups..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />

              <div className="flex justify-between">
                <span className="text-sm font-medium">Select Item Groups</span>

                <div className="flex gap-3">
                  <button
                    type="button"
                    className="text-xs text-primary"
                    onClick={() => onChange(groups.map((group) => String(group.id)))}
                  >
                    Select All
                  </button>

                  <button
                    type="button"
                    className="text-xs text-destructive"
                    onClick={() => onChange([])}
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>

            <div className="max-h-[200px] overflow-y-auto py-2">
              {filtered.length ? (
                filtered.map((group) => {
                  const groupId = String(group.id);

                  return (
                    <label
                      key={group.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-accent"
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(groupId)}
                        onChange={() => toggle(groupId)}
                        disabled={disabled}
                      />
                      {getGroupName(group)}
                    </label>
                  );
                })
              ) : (
                <p className="py-3 text-center text-sm text-muted-foreground">No groups found.</p>
              )}
            </div>

            <div className="flex justify-end border-t pt-2">
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  setSearch("");
                }}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedGroups.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedGroups.map((group) => (
            <span key={group.id} className="rounded bg-primary/10 px-2 py-1 text-xs text-primary">
              {getGroupName(group)}
            </span>
          ))}
        </div>
      )}

      <FieldError message={error} />
    </div>
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
          {DESTINATION_TYPES.map(([value, label]) => (
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

          <Select
            value={String(idValue || "")}
            onValueChange={onIdChange}
            disabled={isLoading || disabled || list.length === 0}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={isLoading ? "Loading..." : list.length ? `Select ${noun}` : "No records found"}
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
// EDIT DIALOG
// --------------------------------------------------

export default function IssueReceiptEditDialog({ open, closeDialog, IssueReceipt, onSuccess }) {
  const { data: session, status } = useSession();

  const userName = session?.user?.name || "admin";
  const userId = session?.user?.id || null;

  const { data: roleList = [], isLoading: rolesLoading } = useRoleSelectQuery();

  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);

  const [groups, setGroups] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [units, setUnits] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);

  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedRole, setSelectedRole] = useState("all");
  const [activeTab, setActiveTab] = useState(() =>
    isInternalTransfer(IssueReceipt) ? "internal-transfer" : "inward",
  );

  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(() => getInitialForm(IssueReceipt));
  const [selectedItem, setSelectedItem] = useState(() => getSavedItem(IssueReceipt));
  const [selectedBrand, setSelectedBrand] = useState(() =>
    getSavedBrand(IssueReceipt),
  );

  // Stock quantities before this movement (saved values, refreshed on change).
  const [receivePreviousQty, setReceivePreviousQty] = useState(0);
  const [issueFromPreviousQty, setIssueFromPreviousQty] = useState(0);
  const [transferReceivePreviousQty, setTransferReceivePreviousQty] = useState(0);

  const isInward = activeTab === "inward";
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [customFieldsReady, setCustomFieldsReady] = useState(false);
  const [customFields, setCustomFields] = useState({});
  // --------------------------------------------------
  // DERIVED DATA
  // --------------------------------------------------

  const requiredTransaction = isInward ? "receipt" : "issue";

  const transactionTypeId = useMemo(() => {
    const match = transactions.find((t) => getTransactionName(t) === requiredTransaction);
    return match ? String(match.id) : "";
  }, [transactions, requiredTransaction]);

  const groupIds = useMemo(() => groups.map((group) => String(group.id)), [groups]);

  const roleOptions = useMemo(
    () => [{ label: "All Roles", value: "all" }, ...toOptions(roleList, (role) => role.name)],
    [roleList],
  );

  // Destination lists
  const inwardDest = useDestinationOptions(open, form.DestinationType, "Failed to load Receive To options.");
  const issueFrom = useDestinationOptions(open, form.IssueFromType, "Failed to load Issue From options.");
  const transferTo = useDestinationOptions(open, form.ReceiveToType, "Failed to load Receive To options.");

  const qtyNumber = Number(form.Qty) || 0;

  // Inward: balance at Receive To. Transfer: remaining stock at Issue From.
  const previousBalance = Number(isInward ? receivePreviousQty : issueFromPreviousQty) || 0;
  const balance = isInward ? previousBalance + qtyNumber : previousBalance - qtyNumber;
  const transferReceiveFinalBalance = (Number(transferReceivePreviousQty) || 0) + qtyNumber;

  const unitLabel = useMemo(() => {
    const unit = units.find((u) => String(u.id) === getItemUnitId(selectedItem));
    const name = unit?.unitName || unit?.UnitName || "";
    const abbreviation = unit?.abbreviation || unit?.Abbreviation || "";
    return abbreviation ? `${name} (${abbreviation})` : name;
  }, [units, selectedItem]);

  const total = (Number(form.Price || 0) * qtyNumber).toFixed(2);

  // --------------------------------------------------
  // FIELD UPDATES
  // --------------------------------------------------

  const updateField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }, []);

  const resetStockValues = () => {
    setReceivePreviousQty(0);
    setIssueFromPreviousQty(0);
    setTransferReceivePreviousQty(0);
  };

  /** Fetches the previous stock at a destination into the given setter. */
  const refreshBalance = async (itemId, conditionId, type, id, setter) => {
    if (!itemId || !conditionId || !type || !id) return;

    try {
      setter(await fetchPreviousBalance(itemId, conditionId, type, id));
    } catch (error) {
      console.error("PREVIOUS BALANCE ERROR:", error);
      showErrorToast(error.message || "Failed to fetch stock balance.");
    }
  };

  // Keeps the chosen item if its group is still selected; otherwise clears it.
  const applyGroupSelection = (ids) => {
    const itemGroupId = String(form.ItemGroupid || getItemGroupId(selectedItem) || "");
    const keepItem = Boolean(form.ItemMasterid) && ids.includes(itemGroupId);

    setSelectedGroups(ids);

    setForm((prev) => ({
      ...prev,
      GroupName: groups
        .filter((group) => ids.includes(String(group.id)))
        .map(getGroupName)
        .filter(Boolean),
      ...(keepItem ? {} : ITEM_RESET),
    }));

    if (!keepItem) {
      setSelectedItem(null);
      resetStockValues();
    }

    setErrors((prev) => ({
      ...prev,
      ItemGroupid: ids.length ? "" : "Item Group is required.",
      ...(keepItem ? {} : { ItemMasterid: "", ItemTypeid: "" }),
    }));
  };

  const handleItemChange = async (value, item) => {
    if (!item) return;

    const conditionId = getItemConditionId(item);

    setSelectedItem(item);

    setForm((prev) => ({
      ...prev,
      ItemMasterid: String(item.id),
      ItemGroupid: getItemGroupId(item),
      ItemTypeid: conditionId,
      Price: "",
    }));

    resetStockValues();

    setErrors((prev) => ({
      ...prev,
      ItemMasterid: "",
      ItemTypeid: conditionId
        ? ""
        : "Item condition is missing in Item Master.",
      Price: "",
    }));

    if (!conditionId) return;

    const targets = isInward
      ? [
        [
          form.DestinationType,
          form.DestinationId,
          setReceivePreviousQty,
        ],
      ]
      : [
        [
          form.IssueFromType,
          form.IssueFromId,
          setIssueFromPreviousQty,
        ],
        [
          form.ReceiveToType,
          form.ReceiveToId,
          setTransferReceivePreviousQty,
        ],
      ];

    try {
      const validTargets = targets.filter(
        ([type, id]) => type && id
      );

      // Fetch rate and stock balance from the previous-balance API.
      const results = await Promise.all(
        validTargets.map(async ([type, id, setter]) => {
          const data = await fetchPreviousBalanceDetails(
            item.id,
            conditionId,
            type,
            id
          );

          setter(
            Number(
              data?.PreviousBalance ??
              data?.previousBalance ??
              data?.Balance ??
              data?.balance ??
              0
            )
          );

          return data;
        })
      );

      // If no destination has been selected yet, fetch the item rate
      // without destination-specific balance parameters.
      let rateData = results[0];

      if (!rateData) {
        rateData = await fetchPreviousBalanceDetails(
          item.id,
          conditionId,
          "",
          ""
        );
      }

      const rate =
        rateData?.Rate ??
        rateData?.rate ??
        rateData?.Price ??
        rateData?.price;

      if (rate !== undefined && rate !== null && rate !== "") {
        setForm((prev) => ({
          ...prev,
          Price: String(rate),
        }));

        setErrors((prev) => ({
          ...prev,
          Price: "",
        }));
      }
    } catch (error) {
      console.error("ITEM BALANCE / RATE FETCH ERROR:", error);
      showErrorToast(
        error.message || "Failed to fetch item rate and stock balance."
      );
    }
  };

  const handleRoleChange = (value) => {
    setSelectedRole(value);
    // The selected user is kept; the list reloads with the new role filter.
    setErrors((prev) => ({ ...prev, Issue_by: "" }));
  };

  // Switches a Warehouse/Machine type, clears its id and its previous quantity.
  const makeTypeChangeHandler = (typeKey, idKey, setQty) => (value) => {
    setForm((prev) => ({ ...prev, [typeKey]: value, [idKey]: "" }));
    setQty(0);
    setErrors((prev) => ({ ...prev, [typeKey]: "", [idKey]: "" }));
  };

  const handleDestinationTypeChange = makeTypeChangeHandler("DestinationType", "DestinationId", setReceivePreviousQty);
  const handleIssueFromTypeChange = makeTypeChangeHandler("IssueFromType", "IssueFromId", setIssueFromPreviousQty);
  const handleTransferReceiveTypeChange = makeTypeChangeHandler("ReceiveToType", "ReceiveToId", setTransferReceivePreviousQty);

  // Sets a destination id and refreshes its previous quantity.
  const makeIdChangeHandler = (idKey, typeKey, setQty) => (value) => {
    updateField(idKey, value);
    refreshBalance(form.ItemMasterid, form.ItemTypeid, form[typeKey], value, setQty);
  };

  const handleDestinationIdChange = makeIdChangeHandler("DestinationId", "DestinationType", setReceivePreviousQty);
  const handleIssueFromIdChange = makeIdChangeHandler("IssueFromId", "IssueFromType", setIssueFromPreviousQty);
  const handleReceiveToIdChange = makeIdChangeHandler("ReceiveToId", "ReceiveToType", setTransferReceivePreviousQty);

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

      // If the record has no item details (name / unit / group), look it up.
      let savedItem = getSavedItem(IssueReceipt);

      if (savedItem && !(savedItem.ItemName || savedItem.itemName || savedItem.name)) {
        try {
          const itemResult = await fetchJson(
            "/api/inventory/item-master?limit=100&status=all",
            "Failed to load item.",
          );
          const found = getArray(itemResult.data).find(
            (item) => String(item.id) === String(savedItem.id),
          );
          if (found) savedItem = found;
        } catch (error) {
          console.error("SAVED ITEM LOOKUP ERROR:", error);
        }
      }

      setGroups(groupList);
      setTransactions(getArray(transactionResult.data));
      setProductTypes(getArray(productTypeResult.data));
      setUnits(getArray(unitResult.data));
      setSelectedItem(savedItem);

      // Selected group: record group, else the item's group, else by group name.
      const recordGroupNames = getArray(IssueReceipt?.GroupName);
      const currentGroupId = String(IssueReceipt?.ItemGroupid || getItemGroupId(savedItem) || "");

      const initialGroupIds = currentGroupId
        ? [currentGroupId]
        : groupList
          .filter((group) => recordGroupNames.includes(getGroupName(group)))
          .map((group) => String(group.id));

      setSelectedGroups(initialGroupIds);
      // Load the actual saved brand record so the edit dropdown displays
      // its name instead of displaying only the saved brand ID.
      let savedBrandRecord = getSavedBrand(IssueReceipt);

      if (savedBrandRecord?.id) {
        const hasBrandName =
          savedBrandRecord.brandName ||
          savedBrandRecord.BrandName ||
          savedBrandRecord.manufacturerName ||
          savedBrandRecord.ManufacturerName ||
          savedBrandRecord.name;

        if (!hasBrandName) {
          try {
            const brandResult = await fetchJson(
              "/api/inventory/brand_manufacturer?limit=100&status=all",
              "Failed to load brands.",
            );

            const matchedBrand = getArray(brandResult.data).find(
              (brand) => String(brand.id) === String(savedBrandRecord.id),
            );

            if (matchedBrand) {
              savedBrandRecord = matchedBrand;
            }
          } catch (error) {
            console.error("SAVED BRAND LOOKUP ERROR:", error);
          }
        }
      }

      setSelectedBrand(savedBrandRecord);
      setForm((prev) => ({
        ...prev,
        ItemGroupid: prev.ItemGroupid || currentGroupId,
        GroupName: recordGroupNames.length
          ? recordGroupNames
          : groupList
            .filter((group) => initialGroupIds.includes(String(group.id)))
            .map(getGroupName),
      }));
    } catch (error) {
      console.error("STOCK MOVEMENT EDIT DROPDOWN ERROR:", error);
      showErrorToast(error.message || "Failed to load dropdown data.");
    } finally {
      setDropdownLoading(false);
    }
  };

  // Reset, prefill and load when the dialog opens for a record.
  useEffect(() => {
    if (!open || !IssueReceipt?.id) return;

    const initial = getInitialForm(IssueReceipt);

    setForm(initial);
    setErrors({});
    setSelectedItem(getSavedItem(IssueReceipt));
    setSelectedBrand(getSavedBrand(IssueReceipt));
    setSelectedGroups(initial.ItemGroupid ? [initial.ItemGroupid] : []);
    setSelectedRole("all");
    setActiveTab(isInternalTransfer(IssueReceipt) ? "internal-transfer" : "inward");

    // Saved balances are the starting values, so this movement is not
    // treated as a new one.
    setReceivePreviousQty(
      Number(IssueReceipt.ReceiveToPreviousQty ?? IssueReceipt.PreviousBalance ?? 0),
    );
    setIssueFromPreviousQty(
      Number(IssueReceipt.IssueFromPreviousQty ?? IssueReceipt.PreviousBalance ?? 0),
    );
    setTransferReceivePreviousQty(Number(IssueReceipt.ReceiveToPreviousQty || 0));
    setCustomFields(IssueReceipt?.customFields ?? {});
    setCustomFieldDefinitions([]);
    setCustomFieldsReady(false);
    loadDropdowns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, IssueReceipt?.id]);

  // Users by role
  useEffect(() => {
    if (!open) return;

    let ignore = false;

    (async () => {
      try {
        setStaffLoading(true);

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
    if (!open || !transactionTypeId) return;

    setForm((prev) => {
      if (
        String(prev.TransactionTypeid) ===
        String(transactionTypeId)
      ) {
        return prev;
      }

      return {
        ...prev,
        TransactionTypeid: transactionTypeId,
      };
    });
  }, [open, transactionTypeId]);

  const staffOptions = useMemo(() => toOptions(staffUsers, getStaffName), [staffUsers]);

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const validateCommonFields = (newErrors) => {
    if (!selectedGroups.length && !form.ItemGroupid) newErrors.ItemGroupid = "Item Group is required.";
    if (!form.ItemMasterid) newErrors.ItemMasterid = "Item is required.";
    if (!form.ItemTypeid) newErrors.ItemTypeid = "Item Condition is required.";
    if (!form.TransactionTypeid) newErrors.TransactionTypeid = "Transaction Type is required.";

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

    if (form.Price !== "" && (!Number.isFinite(Number(form.Price)) || Number(form.Price) < 0)) {
      newErrors.Price = "Rate must be a valid non-negative number.";
    }

    if (String(form.Comment || "").length > 1000) {
      newErrors.Comment = "Comment cannot exceed 1000 characters.";
    }
  };

  const validateInwardForm = (newErrors) => {
    if (!form.Issue_by) newErrors.Issue_by = "User is required.";

    if (!form.DestinationType) {
      newErrors.DestinationType = "Please select Receive To Warehouse or Machine.";
    } else if (!form.DestinationId) {
      newErrors.DestinationId = "Please select a destination.";
    }

    if (String(form.ReciptChallanNo || "").length > 100) {
      newErrors.ReciptChallanNo = "Challan/Bill Number cannot exceed 100 characters.";
    }
  };

  const validateTransferForm = (newErrors) => {
    if (!form.IssueFromType) {
      newErrors.IssueFromType = "Please select Issue From type.";
    } else if (!form.IssueFromId) {
      newErrors.IssueFromId = "Please select Issue From.";
    }

    if (!form.ReceiveToType) {
      newErrors.ReceiveToType = "Please select Receive To type.";
    } else if (!form.ReceiveToId) {
      newErrors.ReceiveToId = "Please select Receive To.";
    }

    if (
      form.IssueFromId &&
      form.ReceiveToId &&
      form.IssueFromType === form.ReceiveToType &&
      String(form.IssueFromId) === String(form.ReceiveToId)
    ) {
      newErrors.ReceiveToId = "Issue From and Receive To cannot be the same destination.";
    }

    // This movement's own quantity is already deducted from the saved stock.
    if (Number(form.Qty) > Number(issueFromPreviousQty) + Number(IssueReceipt?.Qty || 0)) {
      newErrors.Qty = "Transfer quantity cannot exceed the available Issue From quantity.";
    }

    if (String(form.GetPassNo || "").length > 100) {
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
    closeDialog?.();
  };

  const handleSubmit = async () => {
    if (!IssueReceipt?.id) {
      showErrorToast("Stock Movement ID is missing.");
      return;
    }

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

        TransactionTypeid: String(transactionTypeId),
        TransactionTypeName: isInward ? "Receipt" : "Issue",
        MovementType: isInward ? "INWARD" : "INTERNAL_TRANSFER",

        ItemGroupid: String(form.ItemGroupid),
        ItemMasterid: String(form.ItemMasterid),
        ItemTypeid: String(form.ItemTypeid),
        TransactionTypeid: String(form.TransactionTypeid),

        Qty: qtyNumber,
        PreviousBalance: previousBalance,
        Balance: balance,
        Price: form.Price === "" || form.Price == null ? null : Number(form.Price),

        Issue_by: String(issueBy),
        RecivedBy: form.RecivedBy ? String(form.RecivedBy) : null,
        customFields: customFields ?? {},
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

        ...(isInward
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
        `/api/inventory/issue-receipt?id=${encodeURIComponent(IssueReceipt.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update Stock Movement.");
      }

      showSuccessToast(
        isInward ? "Inward entry updated successfully." : "Internal Transfer updated successfully.",
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
  // SHARED FIELD RENDERERS
  // --------------------------------------------------

  const renderCommonTop = () => (
    <>
      {/* Item Group */}
      <GroupSelect
        groups={groups}
        selected={selectedGroups}
        onChange={applyGroupSelection}
        loading={dropdownLoading}
        disabled={loading}
        error={errors.ItemGroupid}
      />

      {/* Item */}
      <div className="space-y-2">
        <Label>
          Item Name <span className="text-destructive">*</span>
        </Label>

        <PaginatedSearchSelect
          key={`item-${selectedGroups.join("-")}`}
          endpoint="/api/inventory/item-master"
          value={form.ItemMasterid}
          onChange={handleItemChange}
          selectedRecord={selectedItem}
          placeholder={
            !selectedGroups.length
              ? "Select Item Group first"
              : "Select Item"
          }
          searchPlaceholder="Search items..."
          disabled={loading || !selectedGroups.length}
          getLabel={getItemLabel}
          filterOptions={(item) =>
            selectedGroups.includes(getItemGroupId(item))
          }
        />

        <FieldError message={errors.ItemMasterid} />
      </div>

      {/* Item Condition (auto from Item Master) */}
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

      {/* Brand / Manufacturer */}
      <div className="space-y-2">
        <Label>Brand / Manufacturer</Label>

        <PaginatedSearchSelect
          key={form.ItemMasterid}
          endpoint="/api/inventory/brand_manufacturer"
          value={form.BrandManufacturerid}
          onChange={(value, brand) => {
            updateField("BrandManufacturerid", value);

            if (brand) {
              setSelectedBrand(brand);
            }
          }}
          selectedRecord={selectedBrand}
          placeholder="Select Brand / Manufacturer"
          searchPlaceholder="Search brand or manufacturer..."
          disabled={loading || !form.ItemMasterid}
          getLabel={getBrandLabel}
        />
      </div>

      {/* Transaction Type */}
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

      {/* Date & Time */}
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
    </>
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
          placeholder="Enter rate"
          value={form.Price}
          onChange={(event) => updateField("Price", event.target.value)}
          disabled={loading}
        />

        <FieldError message={errors.Price} />
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
                      {roleOptions.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
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
                      <SelectValue placeholder={staffLoading ? "Loading users..." : "Select User"} />
                    </SelectTrigger>

                    <SelectContent>
                      {staffOptions.map((staff) => (
                        <SelectItem key={staff.value} value={staff.value}>
                          {staff.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <FieldError message={errors.Issue_by} />
                </div>

                {INWARD_DOC_FIELDS.map(({ type, key, label, placeholder, showError }) =>
                  type === "text" ? (
                    <TextField
                      key={key}
                      label={label}
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(value) => updateField(key, value)}
                      disabled={loading}
                      error={showError ? errors[key] : undefined}
                    />
                  ) : (
                    <DateField
                      key={key}
                      label={label}
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(value) => updateField(key, value)}
                      disabled={loading}
                    />
                  ),
                )}

                {renderQuantityRateFields()}

                <DestinationSelector
                  title="Receipt To"
                  typeValue={form.DestinationType}
                  idValue={form.DestinationId}
                  onTypeChange={handleDestinationTypeChange}
                  onIdChange={handleDestinationIdChange}
                  list={inwardDest.list}
                  isLoading={inwardDest.loading}
                  typeError={errors.DestinationType}
                  idError={errors.DestinationId}
                  radioPrefix="edit-inward-receive"
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
                  onIdChange={handleIssueFromIdChange}
                  list={issueFrom.list}
                  isLoading={issueFrom.loading}
                  typeError={errors.IssueFromType}
                  idError={errors.IssueFromId}
                  radioPrefix="edit-transfer-issue-from"
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
                  onIdChange={handleReceiveToIdChange}
                  list={transferTo.list}
                  isLoading={transferTo.loading}
                  typeError={errors.ReceiveToType}
                  idError={errors.ReceiveToId}
                  radioPrefix="edit-transfer-receive-to"
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
            {loading ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}