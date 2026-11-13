"use client";

import { useEffect, useState } from "react";

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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
// =======================================================
// EMPTY FORM
// =======================================================

const EMPTY_FORM = {
  id: null,

  groupName: "",

  description: "",

  status: "true",

  isDefault: "false",
};

// =======================================================
// COMPONENT
// =======================================================

export default function ItemGroupEditDialog({
  open,

  closeDialog,

  onSuccess,

  ItemGroup,
}) {
  const [form, setForm] = useState(EMPTY_FORM);

  const [errors, setErrors] = useState({});

  // =======================================================
  // LOAD DATA
  // =======================================================

  useEffect(() => {
    if (!open) return;

    if (ItemGroup) {
      setForm({
        id: ItemGroup.id || null,

        groupName: ItemGroup.groupName || "",

        description: ItemGroup.description || "",

        status: ItemGroup.status ? "true" : "false",

        isDefault: ItemGroup.isDefault ? "true" : "false",
      });
    } else {
      setForm(EMPTY_FORM);
    }

    setErrors({});
  }, [open, ItemGroup]);

  // =======================================================
  // CHANGE FIELD
  // =======================================================

  const handleChange = (field, value) => {
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

    const groupName = form.groupName?.trim() || "";

    if (!groupName) {
      newErrors.groupName = "Group name is required.";
    } else if (groupName.length > 255) {
      newErrors.groupName = "Group name must not exceed 255 characters.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.custom(
        () => (
          <Alert variant="mono" icon="destructive" close={false}>
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>
            <AlertTitle>Please check the required fields and character limits.</AlertTitle>
          </Alert>
        ),
        { position: "top-center" },
      );
      return false;
    }

    return true;
  };

  // =======================================================
  // SAVE
  // =======================================================

  const handleSave = async () => {
    if (!validate()) return;

    const itemGroupData = {
      id: form.id,

      groupName: form.groupName.trim(),

      description: form.description.trim() || null,

      status: form.status === "true",

      isDefault: form.isDefault === "true",
    };

    try {
      const response = await fetch("/api/inventory/item-groups", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify(itemGroupData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update item group.");
      }

      console.log("Updated Item Group:", result.data);
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>
              Item group updated successfully.
            </AlertTitle>
          </Alert>
        ),
        { position: "top-center" },
      );
      onSuccess?.(result.data);

      handleClose();
    } catch (error) {
      console.error("ITEM GROUP UPDATE ERROR:", error);

      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>
              {error.message}
            </AlertTitle>
          </Alert>
        ),
        { position: "top-center" },
      );
    }
  };

  // =======================================================
  // CLOSE
  // =======================================================

  const handleClose = () => {
    setErrors({});

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
      <DialogContent className="max-h-[75vh] overflow-y-auto">
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Edit Item Group
            </DialogTitle>
            <DialogDescription>Update item group information.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
              {/* GROUP NAME */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Group Name <span className="text-destructive">*</span>
                </label>

                <Input
                  value={form.groupName}

                  placeholder="Enter group name"

                  onChange={(e) => handleChange("groupName", e.target.value)}
                />

                {errors.groupName && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.groupName}
                  </p>
                )}
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description
                </label>

                <Textarea
                  rows={4}

                  value={form.description}

                  placeholder="Enter description"

                  onChange={(e) => handleChange("description", e.target.value)}
                />
              </div>

              {/* STATUS */}

              <div>
                <label className="mb-2 block text-sm font-medium">Status <span className="text-destructive">*</span></label>

                <Select
                  value={form.status}

                  onValueChange={(value) => handleChange("status", value)}
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
                  Default Group <span className="text-destructive">*</span>
                </label>

                <Select
                  value={form.isDefault}

                  onValueChange={(value) => handleChange("isDefault", value)}
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
