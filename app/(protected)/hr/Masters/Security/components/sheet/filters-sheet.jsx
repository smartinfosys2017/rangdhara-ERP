
'use client';

import { useEffect, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { Info, CalendarDays } from 'lucide-react';
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
}) {
  const [open, setOpen] = useState(false);

  const [draftStatus, setDraftStatus] = useState(statusFilter || 'all');

  const [createdDate, setCreatedDate] = useState(
    () => toDateRange(createdFrom, createdTo),
  );

  const [updatedDate, setUpdatedDate] = useState(
    () => toDateRange(updatedFrom, updatedTo),
  );

  // Refresh draft values whenever the sheet opens.
  useEffect(() => {
    if (!open) return;

    setDraftStatus(statusFilter || 'all');
    setCreatedDate(toDateRange(createdFrom, createdTo));
    setUpdatedDate(toDateRange(updatedFrom, updatedTo));
  }, [
    open,
    statusFilter,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
  ]);

  const handleReset = () => {
    setDraftStatus('all');
    setCreatedDate({ from: undefined, to: undefined });
    setUpdatedDate({ from: undefined, to: undefined });

    setStatusFilter('all');
    setCreatedFrom('');
    setCreatedTo('');
    setUpdatedFrom('');
    setUpdatedTo('');

    setOpen(false);
  };

  const handleApply = () => {
    setStatusFilter(draftStatus || 'all');

    setCreatedFrom(toDateString(createdDate?.from));
    setCreatedTo(toDateString(createdDate?.to));

    setUpdatedFrom(toDateString(updatedDate?.from));
    setUpdatedTo(toDateString(updatedDate?.to));

    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent className="sm:w-[320px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle>Filter Security</SheetTitle>
        </SheetHeader>

        <SheetBody className="py-0">
          <ScrollArea className="h-[calc(100dvh-11.5rem)]">
            <div className="space-y-4 px-5 pt-5">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">Status</span>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="size-4 text-muted-foreground" />
                  </TooltipTrigger>

                  <TooltipContent>
                    <p>Filter security by status.</p>
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

            <div className="space-y-5 pb-5">
              <DateRangeFilter
                label="Created Date"
                date={createdDate}
                setDate={setCreatedDate}
              />

              <DateRangeFilter
                label="Updated Date"
                date={updatedDate}
                setDate={setUpdatedDate}
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