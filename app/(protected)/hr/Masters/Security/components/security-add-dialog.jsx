"use client";

import { useState } from "react";

import { toast } from "sonner";

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

// =======================================================
// DEFAULT FORM
// =======================================================

const DEFAULT_FORM = {
  securityName: "",

  description: "",

  status: "true",

  isDefault: "false",
};

// =======================================================
// COMPONENT
// =======================================================

export default function SecurityAddDialog({
  open,

  closeDialog,

  onSuccess,

  item = null,
}) {
  const [form, setForm] = useState({
    ...DEFAULT_FORM,

    ...(item && {
      securityName: item.securityName || "",

      description: item.description || "",

      status: item.status ? "true" : "false",

      isDefault: item.isDefault ? "true" : "false",
    }),
  });

  const [errors, setErrors] = useState({});

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

    const securityName = form.securityName?.trim() || "";

    if (!securityName) {
      newErrors.securityName = "Group name is required.";
    } else if (securityName.length > 255) {
      newErrors.securityName = "Group name must not exceed 255 characters.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error("Please check the required fields and character limits.");
      return false;
    }

    return true;
  };

  // =======================================================
  // SAVE
  // =======================================================

  const handleSave = async () => {
    if (!validate()) return;

    const securityData = {
      securityName: form.securityName.trim(),

      description: form.description.trim() || null,

      status: form.status === "true",

      isDefault: form.isDefault === "true",
    };

    try {
      const response = await fetch("/api/hr/Security", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(securityData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to create security.");
      }

      console.log("Created Security:", result.data);

      toast.success("Security added successfully.");

      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error("Security CREATE ERROR", error);

      toast.error(error.message || "Failed to add security.");
    }
  };

  // =======================================================
  // CLOSE
  // =======================================================

  const handleClose = () => {
    setErrors({});

    setForm({
      ...DEFAULT_FORM,
    });

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
              {item ? "Edit Security" : "Add Security"}
            </DialogTitle>

            <DialogDescription>
              {item
                ? "Update security information."
                : "Create a new security."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
              {/* GROUP NAME */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Group Name <span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.securityName}

                  placeholder="Enter group name"

                  onChange={(e) => updateField("securityName", e.target.value)}
                />

                {errors.securityName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.securityName}
                  </p>
                )}
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <Textarea rows={4} placeholder="Enter description" value={form.description} onChange={(e) => updateField("description", e.target.value)} />
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
                  Default Group
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
            </DialogBody>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose} >
              Close
            </Button>
            <Button type="button" onClick={handleSave} >
              Save
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
