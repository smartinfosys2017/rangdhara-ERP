"use client";

import { useEffect, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { Info, CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const toDate = (value) => {
  if (!value) return undefined;

  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const toDateRange = (from, to) => ({
  from: toDate(from),
  to: toDate(to),
});

const toDateString = (date) => (date ? format(date, "yyyy-MM-dd") : "");

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

const UserFilter = ({ label, value, onChange, users }) => (
  <div className="flex flex-col gap-2.5 px-5">
    <span className="text-sm font-medium text-mono">{label}</span>

    <Select value={value || "all"} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={`Select ${label}`} />
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="all">All</SelectItem>

        {users.map((user) => (
          <SelectItem key={user.id} value={user.id}>
            {user.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
  createdByFilter,
  setCreatedByFilter,
  updatedByFilter,
  setUpdatedByFilter,
}) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState([]);

  const [draftStatus, setDraftStatus] = useState(statusFilter || "all");

  const [createdDate, setCreatedDate] = useState(() =>
    toDateRange(createdFrom, createdTo),
  );

  const [updatedDate, setUpdatedDate] = useState(() =>
    toDateRange(updatedFrom, updatedTo),
  );

  const [draftCreatedBy, setDraftCreatedBy] = useState(
    createdByFilter || "all",
  );

  const [draftUpdatedBy, setDraftUpdatedBy] = useState(
    updatedByFilter || "all",
  );

  // Fetch administrator users when the sheet opens.
  useEffect(() => {
    if (!open) return;

    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/inventory/filter-users");

        const result = await response.json();

        if (response.ok && result.success) {
          setUsers(result.data || []);
        } else {
          console.error("Failed to fetch filter users:", result.message);
        }
      } catch (error) {
        console.error("Error fetching filter users:", error);
      }
    };

    fetchUsers();
  }, [open]);

  // Refresh draft values whenever the sheet opens.
  useEffect(() => {
    if (!open) return;

    setDraftStatus(statusFilter || "all");
    setCreatedDate(toDateRange(createdFrom, createdTo));
    setUpdatedDate(toDateRange(updatedFrom, updatedTo));
    setDraftCreatedBy(createdByFilter || "all");
    setDraftUpdatedBy(updatedByFilter || "all");
  }, [
    open,
    statusFilter,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    createdByFilter,
    updatedByFilter,
  ]);

  const handleReset = () => {
    setDraftStatus("all");
    setCreatedDate({ from: undefined, to: undefined });
    setUpdatedDate({ from: undefined, to: undefined });
    setDraftCreatedBy("all");
    setDraftUpdatedBy("all");

    setStatusFilter("all");
    setCreatedFrom("");
    setCreatedTo("");
    setUpdatedFrom("");
    setUpdatedTo("");
    setCreatedByFilter("");
    setUpdatedByFilter("");

    setOpen(false);
  };

  const handleApply = () => {
    setStatusFilter(draftStatus || "all");

    setCreatedFrom(toDateString(createdDate?.from));
    setCreatedTo(toDateString(createdDate?.to));

    setUpdatedFrom(toDateString(updatedDate?.from));
    setUpdatedTo(toDateString(updatedDate?.to));

    setCreatedByFilter(draftCreatedBy === "all" ? "" : draftCreatedBy);

    setUpdatedByFilter(draftUpdatedBy === "all" ? "" : draftUpdatedBy);

    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent className="sm:w-[320px] sm:max-w-none inset-5 start-auto h-auto rounded-lg p-0 [&_[data-slot=sheet-close]]:top-4.5 [&_[data-slot=sheet-close]]:end-5">
        <SheetHeader className="border-b border-border px-5 py-3.5">
          <SheetTitle>Filter Location</SheetTitle>
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
                    <p>Filter location by status.</p>
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

            <div className="my-5 border-b border-border" />

            <div className="space-y-5 pb-5">
              <UserFilter
                label="Created By"
                value={draftCreatedBy}
                onChange={setDraftCreatedBy}
                users={users}
              />

              <UserFilter
                label="Updated By"
                value={draftUpdatedBy}
                onChange={setDraftUpdatedBy}
                users={users}
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

          <Button type="button" className="basis-1/2" onClick={handleApply}>
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}