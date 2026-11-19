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
import { ScrollArea } from "@/components/ui/scroll-area";

import { apiFetch } from "@/lib/api";

export default function ItemMasterEditDialog({
  open,
  closeDialog,
  ItemMaster,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);

  const [itemGroups, setItemGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [locations, setLocations] = useState([]);
  const [machines, setMachines] = useState([]);
  const [itemCondition, setitemCondition] = useState([]);

  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    id: "",
    ItemGroupid: "",
    ItemName: "",
    Description: "",
    openingBalance: "",
    Unitid: "",
    rather: "",
    Tax1: "",
    Tax2: "",
    Locationid: "",
    Machineid: "",
    ItemConditionid: "",
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
          onClose={() => toast.dismiss(t)}
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
  // LOAD DROPDOWNS
  // ============================

  useEffect(() => {
    if (open) {
      loadDropdowns();
    }
  }, [open]);

  const loadDropdowns = async () => {
    try {
      const [groupRes, unitRes, taxRes, locationRes, machineRes, itemConditionRes] =
        await Promise.all([
          apiFetch("/api/inventory/item-groups?limit=100&status=active"),
          apiFetch("/api/inventory/unit?limit=100&status=active"),
          apiFetch("/api/finance/tax_rates?status=active"),
          apiFetch("/api/inventory/location?limit=100&status=active"),
          apiFetch("/api/inventory/machine-master?limit=100&status=active"),
          apiFetch("/api/inventory/product-type?limit=100&status=active"),
        ]);

      const [groupsData, unitsData, taxData, locationsData, machinesData, itemConditionData] =
        await Promise.all([
          groupRes.json(),
          unitRes.json(),
          taxRes.json(),
          locationRes.json(),
          machineRes.json(),
          itemConditionRes.json(),
        ]);

      setItemGroups(groupsData.data || []);
      setUnits(unitsData.data || []);
      setTaxes(taxData.data || []);

      setLocations(
        (locationsData.data || []).filter(
          (location) =>
            (location.status === true ||
              location.status === "true" ||
              location.status === 1) &&
            !location.deletedAt,
        ),
      );

      setMachines(
        (machinesData.data || []).filter(
          (machine) =>
            (machine.status === true ||
              machine.status === "true" ||
              machine.status === 1) &&
            !machine.deletedAt,
        ),
      );

      setitemCondition(
        (itemConditionData.data || []).filter(
          (item) =>
            (item.status === true ||
              item.status === "true" ||
              item.status === 1) &&
            !item.deletedAt,
        ),
      );
    } catch (error) {
      console.error("LOAD ITEM DROPDOWNS ERROR", error);
      showErrorToast("Failed to load dropdown data.");
    }
  };

  // ============================
  // LOAD ITEM DATA
  // ============================

  useEffect(() => {
    if (ItemMaster) {
      setForm({
        id: ItemMaster.id || "",
        ItemGroupid: String(ItemMaster.ItemGroupid || ""),
        ItemName: ItemMaster.ItemName || "",
        Description: ItemMaster.Description || "",
        openingBalance: ItemMaster.openingBalance ?? "",
        Unitid: String(ItemMaster.Unitid || ""),
        rather: ItemMaster.rather ?? "",
        Tax1: String(ItemMaster.Tax1 || ""),
        Tax2: String(ItemMaster.Tax2 || ""),

        Locationid: String(ItemMaster.Locationid ?? ""),
        Machineid: String(ItemMaster.Machineid ?? ""),
        ItemConditionid: String(ItemMaster.ItemConditionid ?? ""),

        ApplicableForRelocateLevel:
          ItemMaster.ApplicableForRelocateLevel ?? false,

        RelocateLevel: ItemMaster.RelocateLevel || "",
        status: ItemMaster.status ?? true,
        isDefault: ItemMaster.isDefault ?? false,
      });

      setErrors({});
    }
  }, [ItemMaster]);

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
  // VALIDATION
  // ============================

  const validate = () => {
    const newErrors = {};

    const ItemName = form.ItemName?.trim() || "";
    const Description = form.Description?.trim() || "";
    const openingBalance = Number(form.openingBalance || 0);
    if (!form.ItemGroupid) {
      newErrors.ItemGroupid = "Item Group is required.";
    }
    if (!form.ItemConditionid) {
      newErrors.ItemConditionid = "Item Condition is required.";
    }
    if (!ItemName) {
      newErrors.ItemName = "Item Name is required.";
    } else if (ItemName.length > 255) {
      newErrors.ItemName = "Item Name must not exceed 255 characters.";
    }

    if (!form.Unitid) {
      newErrors.Unitid = "Unit is required.";
    }
    if (openingBalance > 0 && !form.Locationid && !form.Machineid) {
      newErrors.Locationid =
        "Please select either Location or Machine.";

      newErrors.Machineid =
        "Please select either Location or Machine.";
    }
    if (form.ApplicableForRelocateLevel && !form.RelocateLevel?.trim()) {
      newErrors.RelocateLevel = "Restock Level is required.";
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
  // UPDATE ITEM
  // ============================

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const response = await apiFetch("/api/inventory/item-master", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...form,

          ItemName: form.ItemName.trim(),

          Description: form.Description.trim(),

          openingBalance: String(form.openingBalance ?? ""),

          rather: Number(form.rather || 0),

          Tax1: String(form.Tax1 || ""),

          Tax2: String(form.Tax2 || ""),

          Locationid: form.Locationid || null,

          Machineid: form.Machineid || null,

          ItemConditionid: form.ItemConditionid || null,

          status: form.status ?? true,

          isDefault: form.isDefault ?? false,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Update failed");
      }

      // Parent handles notification, refresh and inventory sync.
      onSuccess?.(result.data);

      closeDialog?.();
    } catch (error) {
      console.error("UPDATE ITEM ERROR", error);

      showErrorToast(
        error?.message || "Something went wrong while updating the item.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // RENDER
  // ============================

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
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>
              Update inventory item details.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
              {/* ITEM GROUP */}

              <div>
                <label>
                  Item Group <span className="text-destructive">*</span>
                </label>

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
                <label>
                  Item Name <span className="text-destructive">*</span>
                </label>

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
                <label>
                  Unit (Abbreviation) <span className="text-destructive">*</span>
                </label>

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
                        {unit.unitName} ({unit.abbreviation})
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
                <label>Opening Balance <span className="text-destructive">*</span></label>

                <Input
                  type="number"
                  value={form.openingBalance}
                  onChange={(e) =>
                    updateField("openingBalance", e.target.value)
                  }
                />
              </div>
              {/* Closing BALANCE */}
              <div>
                <label>Closing Balance <span className="text-destructive">*</span></label>

                <Input
                  type="number"
                  value={form.openingBalance}
                  readonly
                />
              </div>
              {/* LOCATION */}

              <div>
                <label className="text-sm font-medium">
                  Location
                  {Number(form.openingBalance || 0) > 0 && (
                    <span className="text-destructive"> *</span>
                  )}
                </label>

                <Select
                  value={form.Locationid || "none"}
                  onValueChange={(value) =>
                    updateField("Locationid", value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger
                    className={errors.Locationid ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Select Location" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">No Location</SelectItem>

                    {locations.map((location) => (
                      <SelectItem key={location.id} value={String(location.id)}>
                        {location.locationName} ({location.locationCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.Locationid && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.Locationid}
                  </p>
                )}
              </div>

              {/* MACHINE */}

              <div>
                <label>Machine
                  {Number(form.openingBalance || 0) > 0 && (
                    <span className="text-destructive"> *</span>
                  )}
                </label>

                <Select
                  value={form.Machineid || "none"}
                  onValueChange={(value) =>
                    updateField("Machineid", value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger
                    className={errors.Machineid ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Select Machine" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">No Machine</SelectItem>

                    {machines.map((machine) => (
                      <SelectItem key={machine.id} value={String(machine.id)}>
                        {machine.machineName} ({machine.machineCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.Machineid && (
                  <p className="mt-1 text-sm text-destructive">
                    {errors.Machineid}
                  </p>
                )}
              </div>

              {/* Item Condition */}

              <div>
                <label>Item Condition <span className="text-destructive"> *</span></label>

                <Select
                  value={form.ItemConditionid || "none"}
                  onValueChange={(value) =>
                    updateField("ItemConditionid", value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger
                    className={errors.ItemConditionid ? "border-destructive" : ""}
                  >
                    <SelectValue placeholder="Select Item Condition" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">Select Item Condition</SelectItem>
                    {itemCondition.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.ProductType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {errors.ItemConditionid && (
                  <p className="text-sm text-destructive">
                    {errors.ItemConditionid}
                  </p>
                )}
              </div>


              {/* RATE */}

              <div>
                <label>Rate (₹) <span className="text-destructive">*</span></label>

                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={form.rather}
                  onChange={(e) => updateField("rather", e.target.value)}
                />
              </div>

              {/* TAX 1 */}

              <div>
                <label>Tax 1</label>

                <Select
                  value={String(form.Tax1 || "")}
                  onValueChange={(value) => updateField("Tax1", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Tax" />
                  </SelectTrigger>

                  <SelectContent>
                    {taxes
                      .filter((tax) => String(tax.id) !== String(form.Tax2))
                      .map((tax) => (
                        <SelectItem key={tax.id} value={String(tax.id)}>
                          {tax.name || tax.taxName} ({tax.taxrate} %)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TAX 2 */}

              <div>
                <label>Tax 2</label>

                <Select
                  value={String(form.Tax2 || "")}
                  onValueChange={(value) => updateField("Tax2", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Tax" />
                  </SelectTrigger>

                  <SelectContent>
                    {taxes
                      .filter((tax) => String(tax.id) !== String(form.Tax1))
                      .map((tax) => (
                        <SelectItem key={tax.id} value={String(tax.id)}>
                          {tax.name || tax.taxName} ({tax.taxrate} %)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="text-sm font-medium">Description</label>

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

                <label>Applicable For Restock Level</label>
              </div>

              {form.ApplicableForRelocateLevel && (
                <div>
                  <label>
                    Restock Level <span className="text-destructive">*</span>
                  </label>

                  <Input
                    value={form.RelocateLevel}
                    onChange={(e) =>
                      updateField("RelocateLevel", e.target.value)
                    }
                  />

                  {errors.RelocateLevel && (
                    <p className="text-sm text-destructive">
                      {errors.RelocateLevel}
                    </p>
                  )}
                </div>
              )}

              {/* STATUS */}

              <div>
                <label>
                  Status <span className="text-destructive">*</span>
                </label>

                <Select
                  value={String(form.status)}
                  onValueChange={(value) =>
                    updateField("status", value === "true")
                  }
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
                <label>
                  Is Default <span className="text-destructive">*</span>
                </label>

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
            <Button variant="outline" onClick={closeDialog} disabled={loading}>
              Cancel
            </Button>

            <Button disabled={loading} onClick={handleSubmit}>
              {loading ? "Updating..." : "Update"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}