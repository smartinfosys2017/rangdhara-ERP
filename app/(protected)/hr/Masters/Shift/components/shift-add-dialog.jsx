"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoaderCircleIcon } from "lucide-react";

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

import { Input, InputAddon, InputGroup } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseTime } from "@internationalized/date";
import { Clock3 } from "lucide-react";
import { ShiftAddSchema } from "../forms/shift-add-schema";
import { DateInput, TimeField } from '@/components/ui/datefield';
const DEFAULT_FORM = {
  name: "",
  inTime: "",
  outTime: "",
  graceTime: "0",
  earlyInMinutes: "0",
  lateOutMinutes: "0",
  halfDayMinutes: "240",
  fullDayMinutes: "480",
  crossesMidnight: "false",
  description: "",
  status: "true",
};

export default function ShiftAddDialog({
  open,
  closeDialog,
  onSuccess,
  item = null,
}) {
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(ShiftAddSchema),
    defaultValues: DEFAULT_FORM,
    mode: "onSubmit",
  });

  // Reset the form when opening or changing the selected shift.
  useEffect(() => {
    if (!open) return;

    form.reset({
      name: item?.name ?? "",
      inTime: item?.inTime ?? "",
      outTime: item?.outTime ?? "",
      graceTime: String(item?.graceTime ?? 0),
      earlyInMinutes: String(item?.earlyInMinutes ?? 0),
      lateOutMinutes: String(item?.lateOutMinutes ?? 0),
      halfDayMinutes: String(item?.halfDayMinutes ?? 240),
      fullDayMinutes: String(item?.fullDayMinutes ?? 480),
      crossesMidnight: item?.crossesMidnight ? "true" : "false",
      description: item?.description ?? "",
      status:
        item?.status === false || item?.status === "false"
          ? "false"
          : "true",
    });
  }, [open, item, form]);

  const mutation = useMutation({
    mutationFn: async (values) => {
      const shiftData = {
        name: values.name.trim(),
        inTime: values.inTime,
        outTime: values.outTime,
        graceTime: Number(values.graceTime),
        earlyInMinutes: Number(values.earlyInMinutes),
        lateOutMinutes: Number(values.lateOutMinutes),
        halfDayMinutes: Number(values.halfDayMinutes),
        fullDayMinutes: Number(values.fullDayMinutes),
        crossesMidnight: values.crossesMidnight === "true",
        description: (values.description ?? "").trim(),
        status: values.status === "true",
      };

      const response = await apiFetch("/api/hr/Shift", {
        method: item ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          item ? { ...shiftData, id: item.id } : shiftData
        ),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message ||
          `Failed to ${item ? "update" : "create"} shift.`
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
                ? "Shift updated successfully."
                : "Shift added successfully."}
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
        queryKey: ["shift-shifts"],
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
              {item ? "Edit Shift" : "Add Shift"}
            </DialogTitle>

            <DialogDescription>
              {item
                ? "Update shift and attendance settings."
                : "Create a shift with its attendance settings."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <Form {...form}>
              <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
                {/* SHIFT NAME */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Shift Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Morning Shift"
                          maxLength={255}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* IN TIME */}
                  <FormField
                    control={form.control}
                    name="inTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          In Time <span className="text-destructive">*</span>
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

                  {/* OUT TIME */}
                  <FormField
                    control={form.control}
                    name="outTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Out Time <span className="text-destructive">*</span>
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
                </div>

                {/* OVERNIGHT SHIFT */}
                <FormField
                  control={form.control}
                  name="crossesMidnight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shift Crosses Midnight?</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">No</SelectItem>
                            <SelectItem value="true">Yes</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* GRACE / EARLY / LATE */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="graceTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grace Time (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="1440"
                            step="1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="earlyInMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Early In (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="1440"
                            step="1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lateOutMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Late Out (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="1440"
                            step="1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* ATTENDANCE THRESHOLDS */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="halfDayMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Half-Day Threshold (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            max="1440"
                            step="1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fullDayMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full-Day Threshold (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="1440"
                            step="1"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* DESCRIPTION */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter shift description"
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
                            <SelectItem value="true">Active</SelectItem>
                            <SelectItem value="false">Inactive</SelectItem>
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

                <Button type="submit" disabled={isProcessing}>
                  {isProcessing && (
                    <LoaderCircleIcon className="animate-spin" />
                  )}
                  {item ? "Update Shift" : "Add Shift"}
                </Button>
              </DialogFooter>

            </Form>
          </ScrollArea>
        </form>
      </DialogContent>
    </Dialog>
  );
}