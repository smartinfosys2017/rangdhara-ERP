"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import TransactionCustomFields from "./transaction-custom-fields";

const DEFAULT_FORM = {
  TransactionType: "",
  Description: "",
  EffectOnTransaction: "addition",
  status: "true",
  isDefault: "false",
};

export default function TransactionTypeAddDialog({
  open,
  closeDialog,
  onSuccess,
}) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});

  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [customFields, setCustomFields] = useState({});
  const [customFieldsLoading, setCustomFieldsLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  useEffect(() => {
    if (!open) {
      return;
    }
  }, [open]);


  const validate = () => {
    const newErrors = {};

    const TransactionType = form.TransactionType?.trim() || "";
    const Description = form.Description?.trim() || "";

    if (!TransactionType) {
      newErrors.TransactionType = "Transaction Type is required.";
    } else if (TransactionType.length > 255) {
      newErrors.TransactionType =
        "Transaction Type must not exceed 255 characters.";
    }

    if (!Description) {
      newErrors.Description = "Description is required.";
    } else if (Description.length > 255) {
      newErrors.Description = "Description must not exceed 255 characters.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error("Please check the required fields and character limits.");
      return false;
    }

    return true;
  };


  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    const data = {
      TransactionType: form.TransactionType.trim(),
      Description: form.Description.trim() || "",
      EffectOnTransaction: form.EffectOnTransaction,
      status: form.status === "true",
      isDefault: form.isDefault === "true",
      customFields: customFields || {},
    };

    try {
      const response = await fetch("/api/inventory/transaction-type", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message || "Failed to create Transaction Type.",
        );
      }

      toast.success("Transaction Type added successfully.");

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error("TRANSACTION TYPE CREATE ERROR", error);

      toast.error(error?.message || "Failed to add Transaction Type.");
    }
  };

  const handleClose = () => {
    setErrors({});
    setForm(DEFAULT_FORM);
    setCustomFields({});
    setCustomFieldDefinitions([]);
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
            <DialogTitle>
              Add Transaction Type
            </DialogTitle>

            <DialogDescription>Create a new transaction type.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Transaction Type <span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.TransactionType}
                  placeholder="Enter transaction type"
                  onChange={(e) => updateField("TransactionType", e.target.value)}
                />

                {errors.TransactionType && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.TransactionType}
                  </p>
                )}
              </div>


              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description <span className="text-destructive">*</span>
                </label>

                <Textarea
                  rows={4}
                  maxLength={255}
                  value={form.Description}
                  placeholder="Enter description"
                  onChange={(e) => updateField("Description", e.target.value)}
                  aria-invalid={!!errors.Description}
                  className={errors.Description ? "border-destructive" : ""}
                />

                {errors.Description && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.Description}
                  </p>
                )}

                <p className="mt-1 text-xs text-muted-foreground">
                  {form.Description.length}/255 characters
                </p>
              </div>


              <div>
                <label className="mb-2 block text-sm font-medium">
                  Effect On Transaction
                </label>

                <Select
                  value={form.EffectOnTransaction}
                  onValueChange={(value) =>
                    updateField("EffectOnTransaction", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="addition">Addition</SelectItem>

                    <SelectItem value="deductions">Deductions</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Status</label>

                <Select
                  value={form.status}
                  onValueChange={(value) => updateField("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>

                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Default Transaction Type
                </label>

                <Select
                  value={form.isDefault}
                  onValueChange={(value) => updateField("isDefault", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>

                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4 border-t pt-5">
                <div>
                  <h3 className="text-base font-semibold">Custom Fields</h3>

                  <p className="text-sm text-muted-foreground">
                    Additional transaction type information.
                  </p>
                </div>

                {customFieldsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading custom fields...
                  </div>
                ) : (
                  <TransactionCustomFields
                    fields={customFieldDefinitions}
                    values={customFields}
                    onChange={setCustomFields}
                    disabled={customFieldsLoading}
                  />
                )}
              </div>
            </DialogBody>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={customFieldsLoading}
            >
              Close
            </Button>

            <Button onClick={handleSave} disabled={customFieldsLoading}>
              {customFieldsLoading ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
