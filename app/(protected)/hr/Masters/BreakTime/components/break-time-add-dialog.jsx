"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoaderCircleIcon } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { parseTime } from "@internationalized/date";
import { Clock3 } from "lucide-react";
import { DateInput, TimeField } from '@/components/ui/datefield';
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

import { Input, InputAddon, InputGroup } from '@/components/ui/input';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BreakTimeAddSchema } from "../forms/break-time-add-schema";

const DEFAULT_FORM = {
  name: "",
  fromTime: "",
  toTime: "",
  breakType: "REGULAR",
  durationMinutes: "",
  isFlexible: false,
  status: "true",
};

const toTimeInputValue = (value) => {
  if (!value) return "";

  // Supports HH:mm, HH:mm:ss, and ISO date-time strings.
  const match = String(value).match(/(\d{2}):(\d{2})/);

  return match ? `${match[1]}:${match[2]}` : "";
};

export default function BreakTimeAddDialog({
  open,
  closeDialog,
  onSuccess,
  item = null,
}) {
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(BreakTimeAddSchema),
    defaultValues: DEFAULT_FORM,
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!open) return;

    form.reset({
      name: item?.name ?? "",
      fromTime: toTimeInputValue(item?.fromTime),
      toTime: toTimeInputValue(item?.toTime),
      breakType: item?.breakType ?? "REGULAR",
      durationMinutes:
        item?.durationMinutes != null
          ? String(item.durationMinutes)
          : "",
      isFlexible: item?.isFlexible === true,
      status:
        item?.status === false ||
          item?.status === "false" ||
          item?.status === 0
          ? "false"
          : "true",
    });
  }, [open, item, form]);

  const mutation = useMutation({
    mutationFn: async (values) => {
      const breakTimeData = {
        name: values.name.trim(),
        fromTime: values.fromTime,
        toTime: values.toTime,
        breakType: values.breakType,
        durationMinutes:
          values.durationMinutes === "" ||
            values.durationMinutes == null
            ? null
            : Number(values.durationMinutes),
        isFlexible: values.isFlexible,
        status: values.status === "true",
      };

      if (
        breakTimeData.durationMinutes !== null &&
        (!Number.isInteger(breakTimeData.durationMinutes) ||
          breakTimeData.durationMinutes < 0)
      ) {
        throw new Error(
          "Duration must be a non-negative whole number of minutes."
        );
      }

      const response = await apiFetch("/api/hr/BreakTime", {
        method: item ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          item
            ? { ...breakTimeData, id: item.id }
            : breakTimeData
        ),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
          `Failed to ${item ? "update" : "create"} break time.`
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
                ? "Break time updated successfully."
                : "Break time added successfully."}
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
        queryKey: ["break-time-break-times"],
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
        if (!value) handleClose();
      }}
    >
      <DialogContent>
        <form className="flex flex-col h-full max-h-[90vh] overflow-hidden" onSubmit={form.handleSubmit(handleSave)}>
          <DialogHeader>
            <DialogTitle>
              {item ? "Edit Break Time" : "Add Break Time"}
            </DialogTitle>

            <DialogDescription>
              {item
                ? "Update break time information."
                : "Create a new break time."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <Form {...form}>

              <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
                {/* NAME */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Break Time Name{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter break time name"
                          maxLength={255}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* FROM TIME */}
                <FormField
                  control={form.control}
                  name="fromTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        From Time <span className="text-destructive">*</span>
                      </FormLabel>

                      <FormControl>
                        <InputGroup className="w-full">
                          <InputAddon mode="icon">
                            <Clock3 />
                          </InputAddon>

                          <TimeField
                            value={field.value ? parseTime(field.value) : null}
                            onChange={(time) =>
                              field.onChange(
                                time
                                  ? `${String(time.hour).padStart(2, "0")}:${String(
                                    time.minute
                                  ).padStart(2, "0")}`
                                  : ""
                              )
                            }
                          >
                            <DateInput />
                          </TimeField>
                        </InputGroup>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* TO TIME */}
                <FormField
                  control={form.control}
                  name="toTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        To Time <span className="text-destructive">*</span>
                      </FormLabel>

                      <FormControl>
                        <InputGroup className="w-full">
                          <InputAddon mode="icon">
                            <Clock3 />
                          </InputAddon>

                          <TimeField
                            value={field.value ? parseTime(field.value) : null}
                            onChange={(time) =>
                              field.onChange(
                                time
                                  ? `${String(time.hour).padStart(2, "0")}:${String(
                                    time.minute
                                  ).padStart(2, "0")}`
                                  : ""
                              )
                            }
                          >
                            <DateInput />
                          </TimeField>
                        </InputGroup>
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* BREAK TYPE */}
                <FormField
                  control={form.control}
                  name="breakType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Break Type</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select break type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="unpaid">Unpaid</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* DURATION */}
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Enter duration in minutes"
                          value={field.value ?? ""}
                          onChange={(event) =>
                            field.onChange(event.target.value)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* FLEXIBLE */}
                <FormField
                  control={form.control}
                  name="isFlexible"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="cursor-pointer">
                        Flexible Break
                      </FormLabel>
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
                  {item ? "Update Break Time" : "Add Break Time"}
                </Button>
              </DialogFooter>

            </Form>
          </ScrollArea>
        </form>
      </DialogContent>
    </Dialog>
  );
}