"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { apiFetch } from "@/lib/api";

export default function ItemMasterAddDialog({ open, closeDialog, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const [itemGroups, setItemGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState({
    ItemGroupid: "",
    ItemName: "",
    Description: "",
    openingBalance: "",
    Unitid: "",
    rather: "",
    Tax1: "",
    Tax2: "",
    ApplicableForRelocateLevel: false,
    RelocateLevel: "",
    status: true,
    isDefault: false,
  });

  // ============================
  // TOAST HELPERS
  // ============================

  const showSuccessToast = (message) => {
    toast.custom(
      () => (
        <Alert variant="mono" icon="success">
          <AlertIcon>
            <RiCheckboxCircleFill />
          </AlertIcon>

          <AlertTitle>{message}</AlertTitle>
        </Alert>
      ),
      {
        position: "top-center",
      },
    );
  };

  const showErrorToast = (message) => {
    toast.custom(
      (t) => (
        <Alert
          variant="mono"
          icon="destructive"
          close={true}
          onClose={() => {
            toast.dismiss(t);
          }}
        >
          <AlertIcon>
            <RiErrorWarningFill />
          </AlertIcon>

          <AlertTitle>{message}</AlertTitle>
        </Alert>
      ),
      {
        position: "top-center",
      },
    );
  };

  // ============================
  // LOAD DROPDOWN
  // ============================

  useEffect(() => {
    if (open) {
      loadItemGroups();
      loadUnits();
      loadTaxes();
    }
  }, [open]);


  const loadItemGroups = async () => {
    try {
      const res = await apiFetch("/api/inventory/item-groups?limit=100&status=active");
      const json = await res.json();

      const groups = json.data || [];
      setItemGroups(groups);

      // Automatically select the default Item Group
      const defaultGroup = groups.find(
        (item) =>
          item.isDefault === true ||
          item.isDefault === 1 ||
          item.isDefault === "1"
      );

      if (defaultGroup) {
        setForm((prev) => ({
          ...prev,
          ItemGroupid: String(defaultGroup.id),
        }));
      }
    } catch (error) {
      console.error("LOAD ITEM GROUPS ERROR", error);
    }
  };

  const loadUnits = async () => {
    try {
      const res = await apiFetch("/api/inventory/unit?limit=100");

      const json = await res.json();

      setUnits(json.data || []);
    } catch (error) {
      console.error("LOAD UNITS ERROR", error);
    }
  };

  const loadTaxes = async () => {
    try {
      const res = await apiFetch("/api/finance/tax_rates");

      const json = await res.json();

      setTaxes(json.data || []);
    } catch (error) {
      console.error("LOAD TAXES ERROR", error);
    }
  };

  // ============================
  // UPDATE FIELD
  // ============================

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [key]: "",
    }));
  };

  // ============================
  // RESET FORM
  // ============================

  const resetForm = () => {
    setForm({
      ItemGroupid: "",
      ItemName: "",
      Description: "",
      openingBalance: "",
      Unitid: "",
      rather: "",
      Tax1: "",
      Tax2: "",
      ApplicableForRelocateLevel: false,
      RelocateLevel: "",
      status: true,
      isDefault: false,
    });
  };

  const validate = () => {
    const newErrors = {};

    const ItemName = form.ItemName?.trim() || "";
    const Description = form.Description?.trim() || "";

    if (!form.ItemGroupid) {
      newErrors.ItemGroupid = "Item Group is required.";
    }

    if (!ItemName) {
      newErrors.ItemName = "Item Name is required.";
    } else if (ItemName.length > 255) {
      newErrors.ItemName = "Item Name must not exceed 255 characters.";
    }

    if (!form.Unitid) {
      newErrors.Unitid = "Unit is required.";
    }

    if (Description.length > 255) {
      newErrors.Description = "Description must not exceed 255 characters.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showErrorToast("Please check the required fields and character limits.");
      return false;
    }

    return true;
  };

  // ============================
  // SAVE
  // ============================

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }
    try {
      setLoading(true);

      const response = await apiFetch("/api/inventory/item-master", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...form,

          ItemName: form.ItemName.trim(),

          rather: Number(form.rather || 0),

          Tax1: String(form.Tax1 || ""),

          Tax2: String(form.Tax2 || ""),

          status: form.status ?? true,

          isDefault: form.isDefault ?? false,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Failed creating item");
      }

      // ============================
      // SUCCESS TOAST
      // ============================

      // showSuccessToast(
      //   result?.data?.ItemName
      //     ? `Item "${result.data.ItemName}" created successfully`
      //     : "Item created successfully",
      // );

      // Send created item back to parent.
      // Parent handles notification API,
      // refresh and inventory sync.
      onSuccess?.(result.data);

      closeDialog?.();

      resetForm();
    } catch (error) {
      console.error("CREATE ITEM MASTER ERROR", error);

      showErrorToast(
        error?.message || "Something went wrong while creating the item.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent>
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Add Item</DialogTitle>

          <DialogDescription>Create new inventory item.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
         <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
          {/* ITEM GROUP */}

          <div>
            <label className="text-sm font-medium">Item Group</label>

            <Select
              value={form.ItemGroupid}
              onValueChange={(value) => updateField("ItemGroupid", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Item Group" />
              </SelectTrigger>

              <SelectContent>
                {itemGroups.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.groupName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.ItemGroupid && (
              <p className="mt-1 text-sm text-destructive">
                {errors.ItemGroupid}
              </p>
            )}
          </div>

          {/* ITEM NAME */}

          <div>
            <label>Item Name <span className="text-destructive">*</span></label>

            <Input
              value={form.ItemName}
              onChange={(e) => updateField("ItemName", e.target.value)}
            />
            {errors.ItemName && (
              <p className="mt-1 text-sm text-destructive">
                {errors.ItemName}
              </p>
            )}

            <p className="mt-1 text-xs text-muted-foreground">
              {form.ItemName.length}/255 characters
            </p>
          </div>

          {/* UNIT */}

          <div>
            <label>Unit <span className="text-destructive">*</span></label>

            <Select
              value={form.Unitid}
              onValueChange={(value) => updateField("Unitid", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Unit" />
              </SelectTrigger>

              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit.id} value={String(unit.id)}>
                    {unit.unitName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.Unitid && (
              <p className="mt-1 text-sm text-destructive">
                {errors.Unitid}
              </p>
            )}
          </div>

          {/* OPENING BALANCE */}

          <div>
            <label>Opening Balance</label>

            <Input
              value={form.openingBalance}
              onChange={(e) => updateField("openingBalance", e.target.value)}
            />
          </div>

          {/* RATE */}

          <div>
            <label>Rate</label>

            <Input
              type="number"
              value={form.rather}
              onChange={(e) => updateField("rather", e.target.value)}
            />
          </div>

          {/* TAX 1 */}

          <div>
            <label>Tax 1</label>

            <Select
              value={form.Tax1}
              onValueChange={(value) => updateField("Tax1", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Tax 1" />
              </SelectTrigger>

              <SelectContent>
                {taxes
                  .filter((tax) => String(tax.id) !== String(form.Tax2))
                  .map((tax) => (
                    <SelectItem key={tax.id} value={String(tax.id)}>
                      {tax.name || tax.taxName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* TAX 2 */}

          <div>
            <label>Tax 2</label>

            <Select
              value={form.Tax2}
              onValueChange={(value) => updateField("Tax2", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Tax 2" />
              </SelectTrigger>

              <SelectContent>
                {taxes
                  .filter((tax) => String(tax.id) !== String(form.Tax1))
                  .map((tax) => (
                    <SelectItem key={tax.id} value={String(tax.id)}>
                      {tax.name || tax.taxName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {/* DESCRIPTION */}


          <div>
            <label className="text-sm font-medium">Description </label>

            <Textarea
              value={form.Description}
              maxLength={255}
              onChange={(e) => updateField("Description", e.target.value)}
              placeholder="Enter description"
              rows={4}
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


          {/* RELOCATE */}

          <div className="flex items-center gap-2">
            <Checkbox
              checked={form.ApplicableForRelocateLevel}
              onCheckedChange={(value) =>
                updateField("ApplicableForRelocateLevel", value)
              }
            />

            <span>Applicable For Restock Level</span>
          </div>

          {form.ApplicableForRelocateLevel && (
            <div>
              <label>Restock Level</label>

              <Input
                value={form.RelocateLevel}
                onChange={(e) => updateField("RelocateLevel", e.target.value)}
              />
            </div>
          )}

          {/* STATUS */}

          <div>
            <label>Status</label>

            <Select
              value={String(form.status)}
              onValueChange={(value) => updateField("status", value === "true")}
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
            <label>Default</label>

            <Select
              value={String(form.isDefault)}
              onValueChange={(value) =>
                updateField("isDefault", value === "true")
              }
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
          <Button  variant="outline" onClick={() => { resetForm();  closeDialog?.();  }}  disabled={loading} >
            Cancel
          </Button>

          <Button disabled={loading} onClick={handleSubmit}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
