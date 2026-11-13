'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarDays, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';

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

/* =========================================================
   MULTI SELECT DROPDOWN
========================================================= */

function MultiSelectDropdown({
  label,
  placeholder,
  options = [],
  selectedIds = [],
  setSelectedIds,
  getId,
  getLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const normalizedSelectedIds = (selectedIds || []).map(String);

  const updateSelection = (id, checked) => {
    const normalizedId = String(id);

    setSelectedIds((previous) => {
      const current = (previous || []).map(String);

      if (checked) {
        return current.includes(normalizedId)
          ? current
          : [...current, normalizedId];
      }

      return current.filter((value) => value !== normalizedId);
    });
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
                  onClick={() => setSelectedIds([])}
                >
                  Clear selection
                </Button>

                {options.map((option, index) => {
                  const rawId = getId(option);

                  if (rawId == null) return null;

                  const id = String(rawId);

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

/* =========================================================
   DATE HELPERS
========================================================= */

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

/* =========================================================
   DATE RANGE FILTER
========================================================= */

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

        <PopoverContent
          className="w-auto max-w-[95vw] p-0"
          align="start"
        >
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={1}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* =========================================================
   STORE CLIENT FILTERS SHEET
========================================================= */

export function StoreClientFiltersSheet({
  trigger,
  setPagination,

  restockFilter = '',
  setRestockFilter,

  selectedGroupIds = [],
  setSelectedGroupIds,

  itemNameFilter = [],
  setItemNameFilter,

  itemTypeFilter = [],
  setItemTypeFilter,

  groups: initialGroups = [],
  productTypes = [],
  itemMasterList = [],

  addedFrom = '',
  setAddedFrom,
  addedTo = '',
  setAddedTo,

  updatedFrom = '',
  setUpdatedFrom,
  updatedTo = '',
  setUpdatedTo,
}) {
  const [open, setOpen] = useState(false);

  const [draftRestockFilter, setDraftRestockFilter] =
    useState(restockFilter);

  const [draftGroupIds, setDraftGroupIds] =
    useState([...selectedGroupIds]);

  const [draftItemNames, setDraftItemNames] =
    useState([...itemNameFilter]);

  const [draftItemTypes, setDraftItemTypes] =
    useState([...itemTypeFilter]);

  const [draftAddedDate, setDraftAddedDate] = useState(
    () => toDateRange(addedFrom, addedTo),
  );

  const [draftUpdatedDate, setDraftUpdatedDate] = useState(
    () => toDateRange(updatedFrom, updatedTo),
  );

  useEffect(() => {
    if (!open) return;

    setDraftRestockFilter(restockFilter);
    setDraftGroupIds([...selectedGroupIds]);
    setDraftItemNames([...itemNameFilter]);
    setDraftItemTypes([...itemTypeFilter]);

    setDraftAddedDate(toDateRange(addedFrom, addedTo));
    setDraftUpdatedDate(toDateRange(updatedFrom, updatedTo));
  }, [
    open,
    restockFilter,
    selectedGroupIds,
    itemNameFilter,
    itemTypeFilter,
    addedFrom,
    addedTo,
    updatedFrom,
    updatedTo,
  ]);

  const resetPagination = () => {
    setPagination?.((previous) => ({
      ...previous,
      pageIndex: 0,
    }));
  };

  const hasInventoryFilters =
    Boolean(draftRestockFilter) ||
    draftGroupIds.length > 0 ||
    draftItemNames.length > 0 ||
    draftItemTypes.length > 0;

  const hasDateFilters =
    Boolean(draftAddedDate?.from) ||
    Boolean(draftAddedDate?.to) ||
    Boolean(draftUpdatedDate?.from) ||
    Boolean(draftUpdatedDate?.to);

  const handleReset = () => {
    setDraftRestockFilter('');
    setDraftGroupIds([]);
    setDraftItemNames([]);
    setDraftItemTypes([]);

    setDraftAddedDate({ from: undefined, to: undefined });
    setDraftUpdatedDate({ from: undefined, to: undefined });

    setRestockFilter?.('');
    setSelectedGroupIds?.([]);
    setItemNameFilter?.([]);
    setItemTypeFilter?.([]);

    setAddedFrom?.('');
    setAddedTo?.('');
    setUpdatedFrom?.('');
    setUpdatedTo?.('');

    resetPagination();
    setOpen(false);
  };

  const handleApply = () => {
    setRestockFilter?.(draftRestockFilter);
    setSelectedGroupIds?.([...draftGroupIds]);
    setItemNameFilter?.([...draftItemNames]);
    setItemTypeFilter?.([...draftItemTypes]);

    setAddedFrom?.(toDateString(draftAddedDate?.from));
    setAddedTo?.(toDateString(draftAddedDate?.to));

    setUpdatedFrom?.(toDateString(draftUpdatedDate?.from));
    setUpdatedTo?.(toDateString(draftUpdatedDate?.to));

    resetPagination();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent
        className="inset-y-5 end-5 flex h-auto w-[calc(100%-2.5rem)] flex-col rounded-lg p-0 sm:w-[420px] sm:max-w-none"
      >
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle>Inventory Filters</SheetTitle>
        </SheetHeader>

        <SheetBody className="min-h-0 flex-1 py-0">
          <ScrollArea className="h-[calc(100dvh-12rem)]">
            <div className="space-y-5 p-5">

              {/* INVENTORY FILTERS */}
              {/* RESTOCK LEVEL */}
              <div className="min-w-0 space-y-1.5">
                <label className="text-sm font-medium">
                  Restock Level
                </label>

                <select
                  value={draftRestockFilter}
                  onChange={(event) => setDraftRestockFilter(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All stock levels</option>
                  <option value="lte">Balance ≤ restock level</option>
                  <option value="gt">Balance &gt; restock level</option>
                </select>
              </div>

              {/* GROUP NAME */}
              <MultiSelectDropdown
                label="Group Name"
                placeholder="All groups"
                options={initialGroups}
                selectedIds={draftGroupIds}
                setSelectedIds={setDraftGroupIds}
                getId={(item) =>
                  item.id ?? item._id ?? item.groupId
                }
                getLabel={(item) =>
                  item.groupName ??
                  item.GroupName ??
                  item.name ??
                  'Unnamed group'
                }
              />

              {/* ITEM NAME */}
              <MultiSelectDropdown
                label="Item Name"
                placeholder="All items"
                options={itemMasterList}
                selectedIds={draftItemNames}
                setSelectedIds={setDraftItemNames}
                getId={(item) =>
                  item.id ?? item.ItemMasterid ?? item.itemId
                }
                getLabel={(item) =>
                  item.ItemName ??
                  item.ItemMasterName ??
                  item.itemName ??
                  item.name ??
                  'Unnamed item'
                }
              />

              {/* ITEM TYPE */}
              <MultiSelectDropdown
                label="Item Type"
                placeholder="All item types"
                options={productTypes}
                selectedIds={draftItemTypes}
                setSelectedIds={setDraftItemTypes}
                getId={(item) =>
                  item.id ??
                  item.ItemTypeid ??
                  item.productTypeId
                }
                getLabel={(item) =>
                  item.ItemTypeName ??
                  item.itemTypeName ??
                  item.ProductType ??
                  item.name ??
                  'Unnamed item type'
                }
              />

              <div className="border-b border-border" />
              {/* DATE FILTERS */}
              <div className="grid grid-cols-1 gap-5">
                <DateRangeFilter
                  label="Added Date"
                  date={draftAddedDate}
                  setDate={setDraftAddedDate}
                />

                <DateRangeFilter
                  label="Updated Date"
                  date={draftUpdatedDate}
                  setDate={setDraftUpdatedDate}
                />
              </div>

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