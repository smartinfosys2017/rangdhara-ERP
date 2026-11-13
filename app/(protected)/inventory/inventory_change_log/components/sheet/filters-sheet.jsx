
'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

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
   STORE CLIENT FILTERS SHEET
========================================================= */

export function StoreClientFiltersSheet({
  trigger,
  setPagination,

  // User filter
  users = [],
  selectedUserIds = [],
  setSelectedUserIds,

  // Group filter
  groups = [],
  selectedGroupIds = [],
  setSelectedGroupIds,

  // Item filter
  itemMasterList = [],
  itemNameFilter = [],
  setItemNameFilter,

  // Item type filter
  productTypes = [],
  itemTypeFilter = [],
  setItemTypeFilter,

  // Action filter
  actionFilter = '',
  setActionFilter,
}) {
  const [open, setOpen] = useState(false);

  const [draftUserIds, setDraftUserIds] = useState([]);
  const [draftGroupIds, setDraftGroupIds] = useState([]);
  const [draftItemNames, setDraftItemNames] = useState([]);
  const [draftItemTypes, setDraftItemTypes] = useState([]);
  const [draftAction, setDraftAction] = useState('');

  useEffect(() => {
    if (!open) return;

    setDraftUserIds([...(selectedUserIds || [])]);
    setDraftGroupIds([...(selectedGroupIds || [])]);
    setDraftItemNames([...(itemNameFilter || [])]);
    setDraftItemTypes([...(itemTypeFilter || [])]);
    setDraftAction(actionFilter || '');
  }, [
    open,
    selectedUserIds,
    selectedGroupIds,
    itemNameFilter,
    itemTypeFilter,
    actionFilter,
  ]);

  const resetPagination = () => {
    setPagination?.((previous) => ({
      ...previous,
      pageIndex: 0,
    }));
  };

  const handleReset = () => {
    setDraftUserIds([]);
    setDraftGroupIds([]);
    setDraftItemNames([]);
    setDraftItemTypes([]);
    setDraftAction('');

    setSelectedUserIds?.([]);
    setSelectedGroupIds?.([]);
    setItemNameFilter?.([]);
    setItemTypeFilter?.([]);
    setActionFilter?.('');

    resetPagination();
    setOpen(false);
  };

  const handleApply = () => {
    setSelectedUserIds?.([...draftUserIds]);
    setSelectedGroupIds?.([...draftGroupIds]);
    setItemNameFilter?.([...draftItemNames]);
    setItemTypeFilter?.([...draftItemTypes]);
    setActionFilter?.(draftAction);

    resetPagination();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent className="sm:w-[320px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle>Inventory Register Filters</SheetTitle>
        </SheetHeader>

        <SheetBody className="min-h-0 flex-1 py-0">
          <ScrollArea className="h-[calc(100dvh-12rem)]">
            <div className="space-y-5 p-5">

              {/* USER */}
              {/* <MultiSelectDropdown
                label="User"
                placeholder="All users"
                options={users}
                selectedIds={draftUserIds}
                setSelectedIds={setDraftUserIds}
                getId={(item) =>
                  item.id ??
                  item.userId ??
                  item.user_id ??
                  item._id
                }
                getLabel={(item) =>
                  item.name ??
                  item.userName ??
                  item.username ??
                  item.fullName ??
                  item.email ??
                  'Unnamed user'
                }
              /> */}

              {/* GROUP NAME */}
              <MultiSelectDropdown
                label="Group Name"
                placeholder="All groups"
                options={groups}
                selectedIds={draftGroupIds}
                setSelectedIds={setDraftGroupIds}
                getId={(item) =>
                  item.id ??
                  item._id ??
                  item.groupId ??
                  item.GroupId
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
                  item.id ??
                  item.ItemMasterid ??
                  item.itemId ??
                  item.itemMasterId
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
                  item.itemTypeId ??
                  item.productTypeId
                }
                getLabel={(item) =>
                  item.ItemTypeName ??
                  item.itemTypeName ??
                  item.ProductType ??
                  item.productType ??
                  item.name ??
                  'Unnamed item type'
                }
              />

              {/* ACTION */}
              {/* <div className="min-w-0 space-y-1.5">
                <label
                  htmlFor="inventory-register-action"
                  className="text-sm font-medium"
                >
                  Action
                </label>

                <select
                  id="inventory-register-action"
                  value={draftAction}
                  onChange={(event) => setDraftAction(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">All actions</option>
                  <option value="Add">Add</option>
                  <option value="Edit">Edit</option>
                </select>
              </div> */}

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
