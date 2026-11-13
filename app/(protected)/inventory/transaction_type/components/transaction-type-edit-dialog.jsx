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

// =======================================================
// EMPTY FORM
// =======================================================

const EMPTY_FORM = {
  id: null,

  TransactionType: "",

  Description: "",

  EffectOnTransaction: "addition",

  status: "true",

  isDefault: "false",
};

// =======================================================
// COMPONENT
// =======================================================

export default function TransactionTypeEditDialog({
  open,
  closeDialog,
  onSuccess,
  TransactionType,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  const [errors, setErrors] = useState({});

  // =======================================================
  // CUSTOM FIELDS
  // =======================================================

  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);

  const [customFields, setCustomFields] = useState({});

  const [customFieldsLoading, setCustomFieldsLoading] = useState(false);

  // =======================================================
  // LOAD EXISTING DATA + CUSTOM FIELDS
  // =======================================================

  useEffect(() => {
    if (!open) return;

    if (TransactionType) {
      setForm({
        id: TransactionType.id || null,

        TransactionType: TransactionType.TransactionType || "",

        Description: TransactionType.Description || "",

        EffectOnTransaction: TransactionType.EffectOnTransaction || "addition",

        status: TransactionType.status ? "true" : "false",

        isDefault: TransactionType.isDefault ? "true" : "false",
      });

      // Existing custom field values
      setCustomFields(TransactionType.customFields || {});
    } else {
      setForm(EMPTY_FORM);

      setCustomFields({});
    }

    setErrors({});

  }, [open, TransactionType]);



  // =======================================================
  // UPDATE FIELD
  // =======================================================

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

  // =======================================================
  // VALIDATION
  // =======================================================


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


  // =======================================================
  // UPDATE SAVE
  // =======================================================

  const handleSave = async () => {
    if (!validate()) return;

    const data = {
      id: form.id,

      TransactionType: form.TransactionType.trim(),

      Description: form.Description.trim() || "",

      EffectOnTransaction: form.EffectOnTransaction,

      status: form.status === "true",

      isDefault: form.isDefault === "true",

      // CUSTOM FIELDS
      customFields: customFields || {},
    };

    try {
      const response = await fetch("/api/inventory/transaction-type", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update Transaction Type.");
      }

      toast.success("Transaction Type updated successfully.");

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error("TRANSACTION TYPE UPDATE ERROR", error);

      toast.error(error.message || "Unable to update Transaction Type.");
    }
  };

  // =======================================================
  // CLOSE
  // =======================================================

  const handleClose = () => {
    setErrors({});

    setForm(EMPTY_FORM);

    setCustomFields({});

    setCustomFieldDefinitions([]);

    setCustomFieldsLoading(false);

    closeDialog?.();
  };

  // =======================================================
  // RENDER
  // =======================================================

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
          <DialogHeader >
            <DialogTitle>
              Edit Transaction Type
            </DialogTitle>

            <DialogDescription>
              Update Transaction Type information.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
              {/* TRANSACTION TYPE */}

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

              {/* DESCRIPTION */}


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


              {/* EFFECT */}

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

              {/* STATUS */}

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

              {/* DEFAULT */}

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

              {/* CUSTOM FIELDS */}

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
          {/* FOOTER */}

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
                "Update"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
