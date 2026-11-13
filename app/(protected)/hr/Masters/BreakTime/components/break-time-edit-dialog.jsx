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
import { Checkbox } from "@/components/ui/checkbox";

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

export default function BreakTimeEditDialog({
  open,
  closeDialog,
  onSuccess,
  BreakTime,
}) {
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(BreakTimeAddSchema),
    defaultValues: DEFAULT_FORM,
    mode: "onSubmit",
  });

  useEffect(() => {
    if (!open || !BreakTime) return;

    form.reset({
      name: BreakTime.name ?? "",
      fromTime: BreakTime.fromTime
        ? String(BreakTime.fromTime).slice(0, 5)
        : "",
      toTime: BreakTime.toTime
        ? String(BreakTime.toTime).slice(0, 5)
        : "",
      breakType: BreakTime.breakType ?? "REGULAR",
      durationMinutes:
        BreakTime.durationMinutes != null
          ? String(BreakTime.durationMinutes)
          : "",
      isFlexible: Boolean(BreakTime.isFlexible),
      status:
        BreakTime.status === false ||
          BreakTime.status === "false"
          ? "false"
          : "true",
    });
  }, [open, BreakTime, form]);

  const mutation = useMutation({
    mutationFn: async (values) => {
      if (!BreakTime?.id) {
        throw new Error("Break Time ID is missing.");
      }

      const breakTimeData = {
        id: BreakTime.id,
        name: values.name.trim(),
        fromTime: values.fromTime,
        toTime: values.toTime,
        breakType: values.breakType,
        durationMinutes:
          values.durationMinutes === "" ||
            values.durationMinutes == null
            ? null
            : Number(values.durationMinutes),
        isFlexible: Boolean(values.isFlexible),
        status: values.status === "true",
      };

      const response = await apiFetch("/api/hr/BreakTime", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(breakTimeData),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to update break time."
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
              Break time updated successfully.
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
            <AlertTitle>
              {error.message || "Unable to update break time."}
            </AlertTitle>
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
            <DialogTitle className="text-xl font-bold">
              Edit Break Time
            </DialogTitle>

            <DialogDescription>
              Update break time information.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <Form {...form}>

              <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
                {/* BREAK TIME NAME */}
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
                      <FormLabel>
                        Break Type{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>

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
                      <FormLabel>Duration (Minutes)</FormLabel>

                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="Enter duration in minutes"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* FLEXIBLE BREAK */}
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
                  Update Break Time
                </Button>
              </DialogFooter>
            </Form>
          </ScrollArea>
        </form>
      </DialogContent>
    </Dialog>
  );
}