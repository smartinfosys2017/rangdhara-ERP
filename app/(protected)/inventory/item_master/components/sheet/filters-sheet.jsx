
"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, ChevronDown, Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ======================================================
// DATE HELPERS
// ======================================================

const toDate = (value) => {
  if (!value) return undefined;

  const parsed = parseISO(value);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const toDateRange = (from, to) => ({
  from: toDate(from),
  to: toDate(to),
});

const toDateString = (date) =>
  date ? format(date, "yyyy-MM-dd") : "";

// ======================================================
// DATE RANGE FILTER
// ======================================================

function DateRangeFilter({ label, date, setDate }) {
  return (
    <div className="flex flex-col gap-2.5 px-5">
      <span className="text-sm font-medium">{label}</span>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 font-normal"
          >
            <CalendarDays className="size-4 shrink-0" />

            {date?.from ? (
              date.to ? (
                <span>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </span>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Select date range</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ======================================================
// NUMBER RANGE FILTER
// ======================================================

function NumberRangeFilter({
  label,
  fromLabel,
  toLabel,
  fromValue,
  toValue,
  setFromValue,
  setToValue,
}) {
  return (
    <div className="space-y-3 px-5">
      <Label>{label}</Label>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {fromLabel}
          </Label>

          <Input
            type="number"
            min="0"
            step="any"
            placeholder={fromLabel}
            value={fromValue}
            onChange={(e) => setFromValue(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            {toLabel}
          </Label>

          <Input
            type="number"
            min="0"
            step="any"
            placeholder={toLabel}
            value={toValue}
            onChange={(e) => setToValue(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

// ======================================================
// USER FILTER
// ======================================================

function UserFilter({
  id,
  label,
  placeholder,
  value,
  onChange,
  users,
}) {
  return (
    <div className="space-y-2 px-5 pb-5">
      <Label htmlFor={id}>{label}</Label>

      <Select
        value={value || "all"}
        onValueChange={(selectedValue) =>
          onChange(selectedValue === "all" ? "" : selectedValue)
        }
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>

        <SelectContent>
          <SelectItem value="all">All Administrators</SelectItem>

          {users.map((user) => (
            <SelectItem key={String(user.id)} value={String(user.id)}>
              {user.name || user.email || `User ${user.id}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ======================================================
// MAIN FILTER SHEET
// ======================================================

export function StoreClientFiltersSheet({
  trigger,

  statusFilter = "all",
  setStatusFilter,

  createdFrom = "",
  setCreatedFrom,
  createdTo = "",
  setCreatedTo,

  updatedFrom = "",
  setUpdatedFrom,
  updatedTo = "",
  setUpdatedTo,

  selectedGroupIds = [],
  setSelectedGroupIds,

  restockFilter = "all",
  setRestockFilter,

  createdBy = "",
  setCreatedBy,

  updatedBy = "",
  setUpdatedBy,

  restockLevelMin = "",
  setRestockLevelMin,

  restockLevelMax = "",
  setRestockLevelMax,

  closingBalanceFrom = "",
  setClosingBalanceFrom,

  closingBalanceTo = "",
  setClosingBalanceTo,

  setPagination,
}) {
  const [open, setOpen] = useState(false);

  // ======================================================
  // USERS
  // ======================================================

  const [users, setUsers] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const fetchUsers = async () => {
      try {
        const response = await fetch(
          "/api/inventory/filter-users",
          {
            method: "GET",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Failed to fetch administrator users"
          );
        }

        if (!cancelled) {
          setUsers(
            Array.isArray(result.data) ? result.data : []
          );
        }
      } catch (error) {
        console.error("FETCH FILTER USERS ERROR:", error);

        if (!cancelled) {
          setUsers([]);
        }
      }
    };

    fetchUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  // ======================================================
  // GROUP DATA
  // ======================================================

  const [groups, setGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);

  // ======================================================
  // DRAFT FILTER STATES
  // ======================================================

  const [draftStatus, setDraftStatus] = useState(statusFilter);

  const [draftCreatedDate, setDraftCreatedDate] = useState(() =>
    toDateRange(createdFrom, createdTo)
  );

  const [draftUpdatedDate, setDraftUpdatedDate] = useState(() =>
    toDateRange(updatedFrom, updatedTo)
  );

  const [draftGroupIds, setDraftGroupIds] = useState(
    selectedGroupIds
  );

  const [draftRestockFilter, setDraftRestockFilter] = useState(
    restockFilter || "all"
  );

  const [draftCreatedBy, setDraftCreatedBy] = useState(createdBy);
  const [draftUpdatedBy, setDraftUpdatedBy] = useState(updatedBy);

  const [draftRestockLevelMin, setDraftRestockLevelMin] = useState(
    restockLevelMin
  );

  const [draftRestockLevelMax, setDraftRestockLevelMax] = useState(
    restockLevelMax
  );

  const [draftClosingBalanceFrom, setDraftClosingBalanceFrom] = useState(
    closingBalanceFrom
  );

  const [draftClosingBalanceTo, setDraftClosingBalanceTo] = useState(
    closingBalanceTo
  );

  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  // ======================================================
  // LOAD GROUP NAMES
  // ======================================================

  useEffect(() => {
    let cancelled = false;

    const loadGroupNames = async () => {
      setGroupsLoading(true);

      try {
        const response = await fetch(
          "/api/inventory/item-groups?limit=10000",
          {
            method: "GET",
            credentials: "same-origin",
            headers: {
              Accept: "application/json",
            },
          }
        );

        const result = await response.json();

        if (!response.ok || result.success === false) {
          throw new Error(
            result.message || "Failed to load item groups"
          );
        }

        const groupList = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.data?.groups)
            ? result.data.groups
            : Array.isArray(result.groups)
              ? result.groups
              : [];

        const uniqueGroups = [
          ...new Map(
            groupList
              .filter((group) => {
                const id = group.id ?? group._id ?? group.groupId;

                const name =
                  typeof group.groupName === "string"
                    ? group.groupName.trim()
                    : "";

                return id != null && name.length > 0;
              })
              .map((group) => {
                const id = group.id ?? group._id ?? group.groupId;

                return [
                  String(id),
                  {
                    id,
                    groupName: group.groupName.trim(),
                  },
                ];
              })
          ).values(),
        ].sort((a, b) =>
          a.groupName.localeCompare(b.groupName)
        );

        if (!cancelled) {
          setGroups(uniqueGroups);
        }
      } catch (error) {
        console.error("LOAD GROUP NAMES ERROR:", error);

        if (!cancelled) {
          setGroups([]);
        }
      } finally {
        if (!cancelled) {
          setGroupsLoading(false);
        }
      }
    };

    loadGroupNames();

    return () => {
      cancelled = true;
    };
  }, []);

  // ======================================================
  // REFRESH DRAFT FILTERS WHEN SHEET OPENS
  // ======================================================

  useEffect(() => {
    if (!open) return;

    setDraftStatus(statusFilter || "all");

    setDraftCreatedDate(
      toDateRange(createdFrom, createdTo)
    );

    setDraftUpdatedDate(
      toDateRange(updatedFrom, updatedTo)
    );

    setDraftGroupIds(
      Array.isArray(selectedGroupIds)
        ? [...selectedGroupIds]
        : []
    );

    setDraftRestockFilter(restockFilter || "all");

    setDraftCreatedBy(createdBy || "");
    setDraftUpdatedBy(updatedBy || "");

    setDraftRestockLevelMin(restockLevelMin ?? "");
    setDraftRestockLevelMax(restockLevelMax ?? "");

    setDraftClosingBalanceFrom(closingBalanceFrom ?? "");
    setDraftClosingBalanceTo(closingBalanceTo ?? "");

    setGroupDropdownOpen(false);
  }, [open]);

  // ======================================================
  // RESET PAGINATION
  // ======================================================

  const resetPagination = () => {
    setPagination?.((previous) => ({
      ...previous,
      pageIndex: 0,
    }));
  };

  // ======================================================
  // RESET FILTERS
  // ======================================================

  const handleReset = () => {
    setDraftStatus("all");
    setStatusFilter?.("all");

    setDraftCreatedDate({
      from: undefined,
      to: undefined,
    });

    setCreatedFrom?.("");
    setCreatedTo?.("");

    setDraftUpdatedDate({
      from: undefined,
      to: undefined,
    });

    setUpdatedFrom?.("");
    setUpdatedTo?.("");

    setDraftGroupIds([]);
    setSelectedGroupIds?.([]);

    setDraftRestockFilter("all");
    setRestockFilter?.("all");

    setDraftCreatedBy("");
    setCreatedBy?.("");

    setDraftUpdatedBy("");
    setUpdatedBy?.("");

    setDraftRestockLevelMin("");
    setDraftRestockLevelMax("");
    setRestockLevelMin?.("");
    setRestockLevelMax?.("");

    setDraftClosingBalanceFrom("");
    setDraftClosingBalanceTo("");
    setClosingBalanceFrom?.("");
    setClosingBalanceTo?.("");

    setGroupDropdownOpen(false);

    resetPagination();
    setOpen(false);
  };

  // ======================================================
  // APPLY FILTERS
  // ======================================================

  const handleApply = () => {
    if (
      draftRestockLevelMin !== "" &&
      draftRestockLevelMax !== "" &&
      Number(draftRestockLevelMin) > Number(draftRestockLevelMax)
    ) {
      return;
    }

    if (
      draftClosingBalanceFrom !== "" &&
      draftClosingBalanceTo !== "" &&
      Number(draftClosingBalanceFrom) >
      Number(draftClosingBalanceTo)
    ) {
      return;
    }

    setStatusFilter?.(draftStatus || "all");

    setCreatedFrom?.(
      toDateString(draftCreatedDate?.from)
    );

    setCreatedTo?.(
      toDateString(draftCreatedDate?.to)
    );

    setUpdatedFrom?.(
      toDateString(draftUpdatedDate?.from)
    );

    setUpdatedTo?.(
      toDateString(draftUpdatedDate?.to)
    );

    setSelectedGroupIds?.(draftGroupIds);

    setRestockFilter?.(draftRestockFilter || "all");

    setCreatedBy?.(draftCreatedBy);
    setUpdatedBy?.(draftUpdatedBy);

    setRestockLevelMin?.(draftRestockLevelMin);
    setRestockLevelMax?.(draftRestockLevelMax);

    setClosingBalanceFrom?.(draftClosingBalanceFrom);
    setClosingBalanceTo?.(draftClosingBalanceTo);

    resetPagination();
    setOpen(false);
  };

  // ======================================================
  // GROUP SELECTION
  // ======================================================

  const toggleGroup = (groupId, checked) => {
    setDraftGroupIds((previous) => {
      const exists = previous.some(
        (id) => String(id) === String(groupId)
      );

      if (checked) {
        return exists ? previous : [...previous, groupId];
      }

      return previous.filter(
        (id) => String(id) !== String(groupId)
      );
    });
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent className="sm:w-[320px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle>Filter Item Masters</SheetTitle>
        </SheetHeader>

        <SheetBody className="min-h-0 flex-1 py-0">
          <ScrollArea className="h-[calc(100dvh-12rem)]">
            {/* STATUS */}
            <div className="space-y-3 px-5 pt-5">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">Status</span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Status filter information"
                      className="inline-flex"
                    >
                      <Info className="size-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>

                  <TooltipContent>
                    <p>Filter item masters by status.</p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <ToggleGroup
                type="single"
                variant="outline"
                value={draftStatus}
                onValueChange={(value) => {
                  if (value) setDraftStatus(value);
                }}
                className="grid grid-cols-3"
              >
                <ToggleGroupItem value="all">All</ToggleGroupItem>
                <ToggleGroupItem value="active">Active</ToggleGroupItem>
                <ToggleGroupItem value="inactive">Inactive</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="my-5 border-b border-border" />

            {/* APPLICABLE FOR RESTOCK LEVEL */}
            <div className="space-y-3 px-5">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">
                  Applicable for Restock Level
                </span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Restock level filter information"
                      className="inline-flex"
                    >
                      <Info className="size-4 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>

                  <TooltipContent>
                    <p>
                      Filter item masters by restock level applicability.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              <ToggleGroup
                type="single"
                variant="outline"
                value={draftRestockFilter}
                onValueChange={(value) => {
                  if (value) setDraftRestockFilter(value);
                }}
                className="grid grid-cols-3"
              >
                <ToggleGroupItem value="all">All</ToggleGroupItem>
                <ToggleGroupItem value="true">Yes</ToggleGroupItem>
                <ToggleGroupItem value="false">No</ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="my-5 border-b border-border" />

            {/* GROUP NAME */}
            <div className="space-y-2 px-5">
              <Label>Group Name</Label>

              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal"
                  onClick={() =>
                    setGroupDropdownOpen((previous) => !previous)
                  }
                  aria-expanded={groupDropdownOpen}
                >
                  <span>
                    {draftGroupIds.length > 0
                      ? `${draftGroupIds.length} group(s) selected`
                      : "All groups"}
                  </span>

                  <ChevronDown
                    className={`ml-2 size-4 transition-transform ${groupDropdownOpen ? "rotate-180" : ""
                      }`}
                  />
                </Button>

                {groupDropdownOpen && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-background p-2 shadow-md">
                    {groupsLoading ? (
                      <p className="p-2 text-sm text-muted-foreground">
                        Loading groups...
                      </p>
                    ) : groups.length === 0 ? (
                      <p className="p-2 text-sm text-muted-foreground">
                        No groups available. Check the API response.
                      </p>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mb-1 w-full justify-start"
                          onClick={() => setDraftGroupIds([])}
                        >
                          Clear selection
                        </Button>

                        {groups.map((group) => (
                          <label
                            key={String(group.id)}
                            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-muted"
                          >
                            <Checkbox
                              checked={draftGroupIds.some(
                                (id) =>
                                  String(id) === String(group.id)
                              )}
                              onCheckedChange={(checked) =>
                                toggleGroup(
                                  group.id,
                                  checked === true
                                )
                              }
                            />

                            <span className="min-w-0 break-words">
                              {group.groupName}
                            </span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="my-5 border-b border-border" />

            {/* RESTOCK LEVEL RANGE */}
            <NumberRangeFilter
              label="Restock Level Range"
              fromLabel="Minimum"
              toLabel="Maximum"
              fromValue={draftRestockLevelMin}
              toValue={draftRestockLevelMax}
              setFromValue={setDraftRestockLevelMin}
              setToValue={setDraftRestockLevelMax}
            />

            <div className="my-5 border-b border-border" />

            {/* CLOSING BALANCE RANGE */}
            <NumberRangeFilter
              label="Closing Balance"
              fromLabel="From"
              toLabel="To"
              fromValue={draftClosingBalanceFrom}
              toValue={draftClosingBalanceTo}
              setFromValue={setDraftClosingBalanceFrom}
              setToValue={setDraftClosingBalanceTo}
            />

            <div className="my-5 border-b border-border" />

            {/* DATE FILTERS */}
            <div className="space-y-5 pb-5">
              <DateRangeFilter
                label="Created Date"
                date={draftCreatedDate}
                setDate={setDraftCreatedDate}
              />

              <DateRangeFilter
                label="Updated Date"
                date={draftUpdatedDate}
                setDate={setDraftUpdatedDate}
              />
            </div>

            <div className="my-5 border-b border-border" />

            {/* CREATED BY */}
            <UserFilter
              id="createdByFilter"
              label="Created By"
              placeholder="Select creator"
              value={draftCreatedBy}
              onChange={setDraftCreatedBy}
              users={users}
            />

            {/* UPDATED BY */}
            <UserFilter
              id="updatedByFilter"
              label="Updated By"
              placeholder="Select updater"
              value={draftUpdatedBy}
              onChange={setDraftUpdatedBy}
              users={users}
            />
          </ScrollArea>
        </SheetBody>

        {/* FOOTER */}
        <SheetFooter className="flex flex-row gap-3 border-t border-border px-5 py-3.5">
          <Button
            type="button"
            variant="outline"
            className="basis-1/2"
            onClick={handleReset}
          >
            Reset
          </Button>

          <Button
            type="button"
            className="basis-1/2"
            onClick={handleApply}
          >
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}