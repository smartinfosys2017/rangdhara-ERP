"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { CalendarDays, LoaderCircleIcon } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import {
  Dialog,
  DialogContent,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { HolidayAddSchema } from "../forms/holiday-add-schema";

const DEFAULT_FORM = {
  name: "",
  fromDate: "",
  toDate: "",
  description: "",
  status: "true",
};

export default function HolidayAddDialog({
  open,
  closeDialog,
  onSuccess,
  item = null,
}) {
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(HolidayAddSchema),
    defaultValues: DEFAULT_FORM,
    mode: "onSubmit",
  });

  // Reset form when dialog opens or selected holiday changes.
  useEffect(() => {
    if (open) {
      form.reset({
        name: item?.name ?? "",
        fromDate: item?.fromDate
          ? String(item.fromDate).slice(0, 10)
          : "",
        toDate: item?.toDate
          ? String(item.toDate).slice(0, 10)
          : "",
        description: item?.description ?? "",
        status:
          item?.status === false || item?.status === "false"
            ? "false"
            : "true",
      });
    }
  }, [open, item, form]);

  const mutation = useMutation({
    mutationFn: async (values) => {
      const holidayData = {
        name: values.name.trim(),
        fromDate: values.fromDate,
        toDate: values.toDate,
        description: (values.description ?? "").trim(),
        status: values.status === "true",
      };

      const response = await apiFetch("/api/hr/Holiday", {
        method: item ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          item ? { ...holidayData, id: item.id } : holidayData
        ),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
          `Failed to ${item ? "update" : "create"} holiday.`
        );
      }

      return result;
    },

    onSuccess: async (result) => {
      toast.custom(
        () => (
          <Alert variant="mono" icon="success" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>
              {item
                ? "Holiday updated successfully."
                : "Holiday added successfully."}
            </AlertTitle>
          </Alert>
        ),
        { position: "top-center" }
      );

      closeDialog?.();

      if (typeof onSuccess === "function") {
        await onSuccess(result.data);
      }

      await queryClient.invalidateQueries({
        queryKey: ["holiday-holidays"],
      });
    },

    onError: (error) => {
      toast.custom(
        () => (
          <Alert variant="mono" icon="destructive" close={false}>
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>
            <AlertTitle>{error.message}</AlertTitle>
          </Alert>
        ),
        { position: "top-center" }
      );
    },
  });

  const isProcessing = mutation.isPending;

  const handleSave = (values) => {
    mutation.mutate(values);
  };

  const handleClose = () => {
    if (isProcessing) return;

    form.reset(DEFAULT_FORM);
    closeDialog?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent>
        <form className="flex flex-col h-full max-h-[90vh] overflow-hidden" onSubmit={form.handleSubmit(handleSave)}>
          <DialogHeader>
            <DialogTitle>
              {item ? "Edit Holiday" : "Add Holiday"}
            </DialogTitle>

            <DialogDescription>
              {item
                ? "Update holiday information."
                : "Create a new holiday."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <Form {...form}>

              <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
                {/* HOLIDAY NAME */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Holiday Name{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>

                      <FormControl>
                        <Input
                          placeholder="Enter holiday name"
                          maxLength={255}
                          {...field}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* FROM DATE */}
                <FormField
                  control={form.control}
                  name="fromDate"
                  render={({ field }) => {
                    const selectedDate = field.value
                      ? parseISO(field.value)
                      : undefined;

                    return (
                      <FormItem>
                        <FormLabel>
                          From Date <span className="text-destructive">*</span>
                        </FormLabel>

                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                mode="input"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarDays className="mr-2 size-4" />

                                {selectedDate && !Number.isNaN(selectedDate.getTime())
                                  ? format(selectedDate, "MMM dd, yyyy")
                                  : "Pick a from date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>

                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                selectedDate && !Number.isNaN(selectedDate.getTime())
                                  ? selectedDate
                                  : undefined
                              }
                              defaultMonth={
                                selectedDate && !Number.isNaN(selectedDate.getTime())
                                  ? selectedDate
                                  : undefined
                              }
                              onSelect={(date) => {
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "");

                                // Clear To Date if it becomes earlier than From Date.
                                const toDate = form.getValues("toDate");

                                if (date && toDate && toDate < format(date, "yyyy-MM-dd")) {
                                  form.setValue("toDate", "", {
                                    shouldDirty: true,
                                    shouldValidate: true,
                                  });
                                }
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* TO DATE */}
                <FormField
                  control={form.control}
                  name="toDate"
                  render={({ field }) => {
                    const selectedDate = field.value
                      ? parseISO(field.value)
                      : undefined;

                    const fromDate = form.watch("fromDate");

                    const minDate = fromDate
                      ? parseISO(fromDate)
                      : undefined;

                    return (
                      <FormItem>
                        <FormLabel>
                          To Date <span className="text-destructive">*</span>
                        </FormLabel>

                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                mode="input"
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                <CalendarDays className="mr-2 size-4" />

                                {selectedDate && !Number.isNaN(selectedDate.getTime())
                                  ? format(selectedDate, "MMM dd, yyyy")
                                  : "Pick a to date"}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>

                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                selectedDate && !Number.isNaN(selectedDate.getTime())
                                  ? selectedDate
                                  : undefined
                              }
                              defaultMonth={
                                selectedDate && !Number.isNaN(selectedDate.getTime())
                                  ? selectedDate
                                  : minDate
                              }
                              disabled={(date) =>
                                !!minDate && date < minDate
                              }
                              onSelect={(date) => {
                                field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>

                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* DESCRIPTION */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>

                      <FormControl>
                        <Textarea
                          placeholder="Enter holiday description"
                          maxLength={1000}
                          rows={3}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* STATUS */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>

                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="true">
                              Active
                            </SelectItem>

                            <SelectItem value="false">
                              Inactive
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </DialogBody>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={!form.formState.isDirty || isProcessing}
                >
                  {isProcessing && (
                    <LoaderCircleIcon className="animate-spin" />
                  )}

                  {item ? "Update Holiday" : "Add Holiday"}
                </Button>
              </DialogFooter>
            </Form>
          </ScrollArea>
        </form>
      </DialogContent>
    </Dialog>
  );
}