'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

function MultiSelectDropdown({
  label,
  placeholder,
  options = [],
  selectedIds = [],
  setSelectedIds,
  getId,
  getLabel,
  setPagination,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const normalizedSelectedIds = selectedIds.map(String);

  const updateSelection = (id, checked) => {
    const normalizedId = String(id);

    setSelectedIds((previous) => {
      const normalizedPrevious = previous.map(String);

      if (checked) {
        return normalizedPrevious.includes(normalizedId)
          ? normalizedPrevious
          : [...normalizedPrevious, normalizedId];
      }

      return normalizedPrevious.filter(
        (selectedId) => selectedId !== normalizedId,
      );
    });

    setPagination?.((previous) => ({
      ...previous,
      pageIndex: 0,
    }));
  };

  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-sm font-medium">{label}</label>

      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal"
          onClick={() => setIsOpen((previous) => !previous)}
          aria-expanded={isOpen}
        >
          <span className="truncate">
            {normalizedSelectedIds.length
              ? `${normalizedSelectedIds.length} selected`
              : placeholder}
          </span>

          <ChevronDown
            className={`ml-2 size-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''
              }`}
          />
        </Button>

        {isOpen && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-background p-2 shadow-md">
            {options.length === 0 ? (
              <p className="p-2 text-sm text-muted-foreground">
                No options available
              </p>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mb-1 w-full justify-start"
                  disabled={normalizedSelectedIds.length === 0}
                  onClick={() => {
                    setSelectedIds([]);
                    setPagination?.((previous) => ({
                      ...previous,
                      pageIndex: 0,
                    }));
                  }}
                >
                  Clear selection
                </Button>

                {options.map((option, index) => {
                  const id = String(getId(option));

                  return (
                    <label
                      key={id || index}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={normalizedSelectedIds.includes(id)}
                        onCheckedChange={(checked) =>
                          updateSelection(id, checked === true)
                        }
                      />

                      <span className="break-words">
                        {getLabel(option)}
                      </span>
                    </label>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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
  date ? format(date, 'yyyy-MM-dd') : '';

function DateRangeFilter({ label, date, setDate }) {
  return (
    <div className="min-w-0 space-y-2">
      <label className="text-sm font-medium">{label}</label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2 font-normal"
          >
            <CalendarDays className="size-4 shrink-0" />

            <span className="truncate">
              {date?.from
                ? date.to
                  ? `${format(date.from, 'LLL dd, y')} - ${format(
                    date.to,
                    'LLL dd, y',
                  )}`
                  : format(date.from, 'LLL dd, y')
                : 'Select date range'}
            </span>
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

export function StoreClientFiltersSheet({
  trigger,
  setPagination,

  quantityMin = '',
  setQuantityMin,
  quantityMax = '',
  setQuantityMax,

  priceMin = '',
  setPriceMin,
  priceMax = '',
  setPriceMax,

  issueByFilter = [],
  setIssueByFilter,
  receivedByFilter = [],
  setReceivedByFilter,

  transactionTypeFilter = [],
  setTransactionTypeFilter,

  selectedGroupIds = [],
  setSelectedGroupIds,

  itemTypeFilter = [],
  setItemTypeFilter,

  itemNameFilter = [],
  setItemNameFilter,

  staffFilterList = [],
  transactionTypes = [],
  groups: initialGroups = [],
  productTypes = [],
  itemMasterList = [],

  addedFrom = '',
  setAddedFrom,
  addedTo = '',
  setAddedTo,

  issueFrom = '',
  setIssueFrom,
  issueTo = '',
  setIssueTo,

  updatedFrom = '',
  setUpdatedFrom,
  updatedTo = '',
  setUpdatedTo,
}) {
  const [open, setOpen] = useState(false);

  const [groups, setGroups] = useState(initialGroups);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  const [draftQuantityMin, setDraftQuantityMin] = useState(quantityMin);
  const [draftQuantityMax, setDraftQuantityMax] = useState(quantityMax);
  const [draftPriceMin, setDraftPriceMin] = useState(priceMin);
  const [draftPriceMax, setDraftPriceMax] = useState(priceMax);

  const [draftIssueBy, setDraftIssueBy] = useState([...issueByFilter]);
  const [draftReceivedBy, setDraftReceivedBy] = useState([
    ...receivedByFilter,
  ]);
  const [draftTransactionTypes, setDraftTransactionTypes] = useState([
    ...transactionTypeFilter,
  ]);
  const [draftGroupIds, setDraftGroupIds] = useState([
    ...selectedGroupIds,
  ]);
  const [draftItemTypes, setDraftItemTypes] = useState([
    ...itemTypeFilter,
  ]);
  const [draftItemNames, setDraftItemNames] = useState([
    ...itemNameFilter,
  ]);

  const [draftAddedDate, setDraftAddedDate] = useState(
    () => toDateRange(addedFrom, addedTo),
  );
  const [draftIssueDate, setDraftIssueDate] = useState(
    () => toDateRange(issueFrom, issueTo),
  );
  const [draftUpdatedDate, setDraftUpdatedDate] = useState(
    () => toDateRange(updatedFrom, updatedTo),
  );

  useEffect(() => {
    let cancelled = false;

    const loadGroups = async () => {
      setGroupsLoading(true);

      try {
        const response = await fetch(
          '/api/inventory/item-groups?limit=10000',
          {
            credentials: 'same-origin',
            headers: { Accept: 'application/json' },
          },
        );

        const result = await response.json();

        if (!response.ok || result.success === false) {
          throw new Error(result.message || 'Failed to load groups');
        }

        const list = Array.isArray(result.data)
          ? result.data
          : Array.isArray(result.data?.groups)
            ? result.data.groups
            : Array.isArray(result.groups)
              ? result.groups
              : [];

        const uniqueGroups = [
          ...new Map(
            list
              .filter((group) => {
                const id = group.id ?? group._id ?? group.groupId;
                return (
                  id != null &&
                  typeof group.groupName === 'string' &&
                  group.groupName.trim()
                );
              })
              .map((group) => {
                const id = group.id ?? group._id ?? group.groupId;

                return [
                  String(id),
                  { id, groupName: group.groupName.trim() },
                ];
              }),
          ).values(),
        ].sort((a, b) => a.groupName.localeCompare(b.groupName));

        if (!cancelled) setGroups(uniqueGroups);
      } catch (error) {
        console.error('LOAD GROUP NAMES ERROR:', error);
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    };

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    setDraftQuantityMin(quantityMin);
    setDraftQuantityMax(quantityMax);
    setDraftPriceMin(priceMin);
    setDraftPriceMax(priceMax);

    setDraftIssueBy([...issueByFilter]);
    setDraftReceivedBy([...receivedByFilter]);
    setDraftTransactionTypes([...transactionTypeFilter]);
    setDraftGroupIds([...selectedGroupIds]);
    setDraftItemTypes([...itemTypeFilter]);
    setDraftItemNames([...itemNameFilter]);

    setDraftAddedDate(toDateRange(addedFrom, addedTo));
    setDraftIssueDate(toDateRange(issueFrom, issueTo));
    setDraftUpdatedDate(toDateRange(updatedFrom, updatedTo));

    setGroupDropdownOpen(false);
  }, [
    open,
    quantityMin,
    quantityMax,
    priceMin,
    priceMax,
    issueByFilter,
    receivedByFilter,
    transactionTypeFilter,
    selectedGroupIds,
    itemTypeFilter,
    itemNameFilter,
    addedFrom,
    addedTo,
    issueFrom,
    issueTo,
    updatedFrom,
    updatedTo,
  ]);

  const resetPagination = () => {
    setPagination?.((previous) => ({
      ...previous,
      pageIndex: 0,
    }));
  };

  const toggleGroup = (id, checked) => {
    setDraftGroupIds((previous) => {
      const exists = previous.some(
        (value) => String(value) === String(id),
      );

      if (checked) {
        return exists ? previous : [...previous, id];
      }

      return previous.filter(
        (value) => String(value) !== String(id),
      );
    });
  };

  const handleReset = () => {
    setDraftQuantityMin('');
    setDraftQuantityMax('');
    setDraftPriceMin('');
    setDraftPriceMax('');

    setDraftIssueBy([]);
    setDraftReceivedBy([]);
    setDraftTransactionTypes([]);
    setDraftGroupIds([]);
    setDraftItemTypes([]);
    setDraftItemNames([]);

    setDraftAddedDate({ from: undefined, to: undefined });
    setDraftIssueDate({ from: undefined, to: undefined });
    setDraftUpdatedDate({ from: undefined, to: undefined });

    setQuantityMin?.('');
    setQuantityMax?.('');
    setPriceMin?.('');
    setPriceMax?.('');

    setIssueByFilter?.([]);
    setReceivedByFilter?.([]);
    setTransactionTypeFilter?.([]);
    setSelectedGroupIds?.([]);
    setItemTypeFilter?.([]);
    setItemNameFilter?.([]);

    setAddedFrom?.('');
    setAddedTo?.('');
    setIssueFrom?.('');
    setIssueTo?.('');
    setUpdatedFrom?.('');
    setUpdatedTo?.('');

    resetPagination();
    setOpen(false);
  };

  const handleApply = () => {
    setQuantityMin?.(draftQuantityMin);
    setQuantityMax?.(draftQuantityMax);
    setPriceMin?.(draftPriceMin);
    setPriceMax?.(draftPriceMax);

    setIssueByFilter?.([...draftIssueBy]);
    setReceivedByFilter?.([...draftReceivedBy]);
    setTransactionTypeFilter?.([...draftTransactionTypes]);
    setSelectedGroupIds?.([...draftGroupIds]);
    setItemTypeFilter?.([...draftItemTypes]);
    setItemNameFilter?.([...draftItemNames]);

    setAddedFrom?.(toDateString(draftAddedDate?.from));
    setAddedTo?.(toDateString(draftAddedDate?.to));
    setIssueFrom?.(toDateString(draftIssueDate?.from));
    setIssueTo?.(toDateString(draftIssueDate?.to));
    setUpdatedFrom?.(toDateString(draftUpdatedDate?.from));
    setUpdatedTo?.(toDateString(draftUpdatedDate?.to));

    resetPagination();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent className="sm:w-[320px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle>Inventory Filters</SheetTitle>
        </SheetHeader>

        <SheetBody className="min-h-0 flex-1 py-0">
          <ScrollArea className="h-[calc(100dvh-12rem)]">
            <div className="space-y-5 p-5">
              {/* QUANTITY RANGE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Quantity range
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    min="0"
                    placeholder="Min quantity"
                    value={draftQuantityMin}
                    onChange={(event) =>
                      setDraftQuantityMin(event.target.value)
                    }
                  />
                  <Input
                    type="number"
                    min="0"
                    placeholder="Max quantity"
                    value={draftQuantityMax}
                    onChange={(event) =>
                      setDraftQuantityMax(event.target.value)
                    }
                  />
                </div>
              </div>

              {/* PRICE RANGE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Price range
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Min price"
                    value={draftPriceMin}
                    onChange={(event) =>
                      setDraftPriceMin(event.target.value)
                    }
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Max price"
                    value={draftPriceMax}
                    onChange={(event) =>
                      setDraftPriceMax(event.target.value)
                    }
                  />
                </div>
              </div>

              {/* ISSUE BY */}
              <MultiSelectDropdown
                label="Issue By"
                placeholder="All staff"
                options={staffFilterList}
                selectedIds={draftIssueBy}
                setSelectedIds={setDraftIssueBy}
                getId={(item) => item.id}
                getLabel={(item) => item.name}
                setPagination={setPagination}
              />

              {/* RECEIVED BY */}
              <MultiSelectDropdown
                label="Received By"
                placeholder="All staff"
                options={staffFilterList}
                selectedIds={draftReceivedBy}
                setSelectedIds={setDraftReceivedBy}
                getId={(item) => item.id}
                getLabel={(item) => item.name}
                setPagination={setPagination}
              />

              {/* TRANSACTION TYPE */}
              <MultiSelectDropdown
                label="Transaction Type"
                placeholder="All transaction types"
                options={transactionTypes}
                selectedIds={draftTransactionTypes}
                setSelectedIds={setDraftTransactionTypes}
                getId={(item) =>
                  item.id ?? item.TransactionTypeid
                }
                getLabel={(item) =>
                  item.TransactionTypeName ??
                  item.transactionTypeName ??
                  item.name ??
                  item.TransactionType ??
                  'Unnamed transaction type'
                }
                setPagination={setPagination}
              />

              {/* GROUP NAME */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Group Name
                </label>

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
                      {draftGroupIds.length
                        ? `${draftGroupIds.length} group(s) selected`
                        : 'All groups'}
                    </span>

                    <ChevronDown
                      className={`ml-2 size-4 transition-transform ${groupDropdownOpen ? 'rotate-180' : ''
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
                          No groups available.
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
                                    String(id) === String(group.id),
                                )}
                                onCheckedChange={(checked) =>
                                  toggleGroup(
                                    group.id,
                                    checked === true,
                                  )
                                }
                              />
                              <span className="break-words">
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

              {/* ITEM TYPE */}
              <MultiSelectDropdown
                label="Item Type"
                placeholder="All item types"
                options={productTypes}
                selectedIds={draftItemTypes}
                setSelectedIds={setDraftItemTypes}
                getId={(item) => item.id ?? item.ItemTypeid}
                getLabel={(item) =>
                  item.ItemTypeName ??
                  item.itemTypeName ??
                  item.name ??
                  item.ProductType ??
                  'Unnamed item type'
                }
                setPagination={setPagination}
              />

              {/* ITEM NAME */}
              <MultiSelectDropdown
                label="Item Name"
                placeholder="All items"
                options={itemMasterList}
                selectedIds={draftItemNames}
                setSelectedIds={setDraftItemNames}
                getId={(item) => item.id ?? item.ItemMasterid}
                getLabel={(item) =>
                  item.ItemName ??
                  item.ItemMasterName ??
                  item.itemName ??
                  item.name ??
                  'Unnamed item'
                }
                setPagination={setPagination}
              />

              <div className="border-b border-border" />

              {/* DATE FILTERS */}
              <DateRangeFilter
                label="Added Date"
                date={draftAddedDate}
                setDate={setDraftAddedDate}
              />

              <DateRangeFilter
                label="Issue Date"
                date={draftIssueDate}
                setDate={setDraftIssueDate}
              />

              <DateRangeFilter
                label="Updated Date"
                date={draftUpdatedDate}
                setDate={setDraftUpdatedDate}
              />
            </div>
          </ScrollArea>
        </SheetBody>

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