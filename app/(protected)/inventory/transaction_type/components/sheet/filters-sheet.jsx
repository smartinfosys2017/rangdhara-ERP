
'use client';

import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Info, CalendarDays, Search, X, } from 'lucide-react';

import { Button } from '@/components/ui/button';
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

import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

const DateRangeFilter = ({ label, date, setDate }) => (
  <div className="flex flex-col gap-2.5 px-5">
    <span className="text-sm font-medium text-mono">{label}</span>

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
                {format(date.from, 'LLL dd, y')} -{' '}
                {format(date.to, 'LLL dd, y')}
              </span>
            ) : (
              format(date.from, 'LLL dd, y')
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

const UserFilter = ({
  label,
  value,
  onChange,
  users,
  loading,
}) => (
  <div className="flex flex-col gap-2.5 px-5">
    <span className="text-sm font-medium text-mono">{label}</span>

    <select
      value={value || 'all'}
      onChange={(e) =>
        onChange(e.target.value === 'all' ? '' : e.target.value)
      }
      disabled={loading}
      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
    >
      <option value="all">
        {loading ? 'Loading users...' : 'All'}
      </option>

      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name}
        </option>
      ))}
    </select>
  </div>
);

export function StoreClientFiltersSheet({
  trigger,

  statusFilter,
  setStatusFilter,

  createdFrom,
  setCreatedFrom,
  createdTo,
  setCreatedTo,

  updatedFrom,
  setUpdatedFrom,
  updatedTo,
  setUpdatedTo,

  createdBy,
  setCreatedBy,

  updatedBy,
  setUpdatedBy,
  searchInput,
  setSearchInput,
  handleSearch,
}) {
  const [open, setOpen] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [draftStatus, setDraftStatus] = useState(statusFilter || 'all');

  const [draftCreatedBy, setDraftCreatedBy] = useState(createdBy || '');
  const [draftUpdatedBy, setDraftUpdatedBy] = useState(updatedBy || '');

  const [createdDate, setCreatedDate] = useState(() =>
    toDateRange(createdFrom, createdTo),
  );

  const [updatedDate, setUpdatedDate] = useState(() =>
    toDateRange(updatedFrom, updatedTo),
  );

  // Fetch users for Created By and Updated By dropdowns.
  useEffect(() => {
    let isMounted = true;

    const fetchUsers = async () => {
      try {
        setUsersLoading(true);

        const response = await fetch('/api/inventory/filter-users');
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Failed to fetch users.');
        }

        if (isMounted) {
          setUsers(result.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch filter users:', error);

        if (isMounted) {
          setUsers([]);
        }
      } finally {
        if (isMounted) {
          setUsersLoading(false);
        }
      }
    };

    fetchUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  // Refresh draft values whenever the sheet opens.
  useEffect(() => {
    if (!open) return;

    setDraftStatus(statusFilter || 'all');

    setDraftCreatedBy(createdBy || '');
    setDraftUpdatedBy(updatedBy || '');

    setCreatedDate(toDateRange(createdFrom, createdTo));
    setUpdatedDate(toDateRange(updatedFrom, updatedTo));
  }, [
    open,
    statusFilter,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    createdBy,
    updatedBy,
  ]);

  // Reset all filters.
  const handleReset = () => {
    setDraftStatus('all');

    setDraftCreatedBy('');
    setDraftUpdatedBy('');

    setCreatedDate({
      from: undefined,
      to: undefined,
    });

    setUpdatedDate({
      from: undefined,
      to: undefined,
    });

    setStatusFilter('all');

    setCreatedBy('');
    setUpdatedBy('');

    setCreatedFrom('');
    setCreatedTo('');

    setUpdatedFrom('');
    setUpdatedTo('');
    setSearchInput("");
    setOpen(false);
  };

  // Apply selected filters.
  const handleApply = () => {
    setStatusFilter(draftStatus || 'all');

    setCreatedBy(draftCreatedBy);
    setUpdatedBy(draftUpdatedBy);

    setCreatedFrom(toDateString(createdDate?.from));
    setCreatedTo(toDateString(createdDate?.to));

    setUpdatedFrom(toDateString(updatedDate?.from));
    setUpdatedTo(toDateString(updatedDate?.to));

    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent
        className="sm:w-[320px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5"
      >
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle>Filter Transaction Type</SheetTitle>
        </SheetHeader>

        <SheetBody className="py-0">
          <ScrollArea className="h-[calc(100dvh-11.5rem)]">
            {/* SEARCH */}
            <div className="px-5 pt-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleSearch(event);
                      setOpen(false);
                    }
                  }}
                  placeholder="Search transaction type"
                  className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  autoComplete="off"
                />

                {searchInput.length > 0 && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchInput("");
                      setOpen(false);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>
            </div>
            {/* Status Filter */}
            <div className="space-y-4 px-5 pt-5">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">Status</span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-4 text-muted-foreground" />
                  </TooltipTrigger>

                  <TooltipContent>
                    <p>Filter transaction types by status.</p>
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
                <ToggleGroupItem value="all">
                  All
                </ToggleGroupItem>

                <ToggleGroupItem value="active">
                  Active
                </ToggleGroupItem>

                <ToggleGroupItem value="inactive">
                  Inactive
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="my-5 border-b border-border" />

            {/* Date and User Filters */}
            <div className="space-y-5 pb-5">
              <DateRangeFilter
                label="Created Date"
                date={createdDate}
                setDate={setCreatedDate}
              />
              {/* Created By Filter */}
              <UserFilter
                label="Created By"
                value={draftCreatedBy}
                onChange={setDraftCreatedBy}
                users={users}
                loading={usersLoading}
              />
              <DateRangeFilter
                label="Updated Date"
                date={updatedDate}
                setDate={setUpdatedDate}
              />
              {/* Updated By Filter */}
              <UserFilter
                label="Updated By"
                value={draftUpdatedBy}
                onChange={setDraftUpdatedBy}
                users={users}
                loading={usersLoading}
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
