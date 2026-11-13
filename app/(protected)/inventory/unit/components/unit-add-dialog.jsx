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

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { UnitAddSchema } from "../forms/unit-add-schema";

const DEFAULT_FORM = {
  unitName: "",
  abbreviation: "",
  status: "true",
};

export default function UnitAddDialog({
  open,
  closeDialog,
  onSuccess,
  item = null,
}) {
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: zodResolver(UnitAddSchema),
    defaultValues: DEFAULT_FORM,
    mode: "onSubmit",
  });

  // Reset form whenever the dialog opens or the selected unit changes.
  useEffect(() => {
    if (open) {
      form.reset({
        unitName: item?.unitName ?? "",
        abbreviation: item?.abbreviation ?? "",
        status:
          item?.status === false || item?.status === "false" ? "false" : "true",
      });
    }
  }, [open, item, form]);

  const mutation = useMutation({
    mutationFn: async (values) => {
      const unitData = {
        unitName: values.unitName.trim(),
        abbreviation: values.abbreviation.trim(),
        status: values.status === "true",
      };

      const response = await apiFetch("/api/inventory/unit", {
        method: item ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item ? { ...unitData, id: item.id } : unitData),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || `Failed to ${item ? "update" : "create"} unit.`,
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
              {item ? "Unit updated successfully." : "Unit added successfully."}
            </AlertTitle>
          </Alert>
        ),
        { position: "top-center" },
      );

      closeDialog?.();

      if (typeof onSuccess === "function") {
        await onSuccess(result.data);
      }

      await queryClient.invalidateQueries({
        queryKey: ["unit-units"],
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
        { position: "top-center" },
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
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{item ? "Edit Unit" : "Add Unit"}</DialogTitle>

            <DialogDescription>
              {item ? "Update Unit information." : "Create a new Unit."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)}>
              <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
                <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
                  {/* UNIT NAME */}
                  <FormField
                    control={form.control}
                    name="unitName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Unit Name <span className="text-destructive">*</span>
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="Enter unit name"
                            maxLength={255}
                            {...field}
                          />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ABBREVIATION */}
                  <FormField
                    control={form.control}
                    name="abbreviation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Abbreviation <span className="text-destructive">*</span>
                        </FormLabel>

                        <FormControl>
                          <Input
                            placeholder="Enter abbreviation"
                            maxLength={100}
                            {...field}
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
                        <FormLabel>Status<span className="text-destructive">*</span></FormLabel>

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
              </ScrollArea>
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
                  {isProcessing && <LoaderCircleIcon className="animate-spin" />}

                  {item ? "Update Unit" : "Add Unit"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}