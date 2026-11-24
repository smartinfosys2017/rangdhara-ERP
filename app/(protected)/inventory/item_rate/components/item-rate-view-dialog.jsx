
"use client";

import { useEffect, useState } from "react";

import {
  Calendar,
  FileText,
  Layers,
  Package,
  Ruler,
  IndianRupee,
  Building2,
  ClipboardCheck,
} from "lucide-react";

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
import { apiFetch } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";

// =======================================================
// DATE FORMAT
// =======================================================

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// =======================================================
// COMPONENT
// =======================================================

export default function ItemRateViewDialog({
  open,
  closeDialog,
  ItemRate,
}) {
  const [itemGroups, setItemGroups] = useState([]);
  const [itemMasters, setItemMasters] = useState([]);
  const [brands, setBrands] = useState([]);
  const [units, setUnits] = useState([]);
  const [itemConditions, setItemConditions] = useState([]);

  // =======================================================
  // LOAD DROPDOWN DATA
  // =======================================================

  useEffect(() => {
    if (open) {
      loadDropdownData();
    }
  }, [open]);

  const loadDropdownData = async () => {
    try {
      const [
        groupResponse,
        itemResponse,
        brandResponse,
        unitResponse,
        conditionResponse,
      ] = await Promise.all([
        apiFetch("/api/inventory/item-groups?limit=100"),
        apiFetch("/api/inventory/item-master?limit=100"),
        apiFetch("/api/inventory/brand_manufacturer?limit=100"),
        apiFetch("/api/inventory/unit?limit=100"),
        apiFetch("/api/inventory/product-type?limit=100"),
      ]);

      const [
        groupJson,
        itemJson,
        brandJson,
        unitJson,
        conditionJson,
      ] = await Promise.all([
        groupResponse.json(),
        itemResponse.json(),
        brandResponse.json(),
        unitResponse.json(),
        conditionResponse.json(),
      ]);

      setItemGroups(groupJson.data || []);
      setItemMasters(itemJson.data || []);
      setBrands(brandJson.data || []);
      setUnits(unitJson.data || []);
      setItemConditions(conditionJson.data || []);
    } catch (error) {
      console.error("ITEM RATE DROPDOWN LOADING ERROR:", error);
    }
  };

  // =======================================================
  // GET ITEM GROUP NAME
  // =======================================================

  const getItemGroupName = (id) => {
    if (!id) return "-";

    const data = itemGroups.find(
      (item) => String(item.id) === String(id),
    );

    return data?.groupName || data?.name || id;
  };

  // =======================================================
  // GET ITEM NAME
  // =======================================================

  const getItemName = (id) => {
    if (!id) return "-";

    const data = itemMasters.find(
      (item) => String(item.id) === String(id),
    );

    return data?.ItemName || id;
  };

  // =======================================================
  // GET BRAND / MANUFACTURER NAME
  // =======================================================

  const getBrandName = (id) => {
    if (!id) return "-";

    const data = brands.find(
      (item) => String(item.id) === String(id),
    );

    if (!data) return id;

    const brandName =
      data.brandName ||
      data.BrandName ||
      "";

    const manufacturerName =
      data.manufacturerName ||
      data.ManufacturerName ||
      "";

    if (brandName && manufacturerName) {
      return `${brandName} / ${manufacturerName}`;
    }

    return (
      brandName ||
      manufacturerName ||
      data.name ||
      id
    );
  };

  // =======================================================
  // GET UNIT NAME
  // =======================================================

  const getUnitName = (id) => {
    if (!id) return "-";

    const data = units.find(
      (item) => String(item.id) === String(id),
    );

    if (!data) return id;

    return data.abbreviation
      ? `${data.unitName} (${data.abbreviation})`
      : data.unitName || id;
  };

  // =======================================================
  // GET ITEM CONDITION NAME
  // =======================================================

  const getItemConditionName = (id) => {
    if (!id) return "-";

    const data = itemConditions.find(
      (item) => String(item.id) === String(id),
    );

    return data?.ProductType || data?.name || id;
  };

  if (!ItemRate) {
    return null;
  }

  // =======================================================
  // RENDER
  // =======================================================

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

          {/* HEADER */}

          <DialogHeader>
            <DialogTitle>Item Rate Details</DialogTitle>

            <DialogDescription>
              View complete item rate information.
            </DialogDescription>
          </DialogHeader>

           <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">

              {/* ITEM NAME */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Package className="h-4 w-4" />
                  Item Name
                </div>

                <p className="text-sm break-words">
                  {ItemRate.ItemName ||
                    ItemRate.itemMaster?.ItemName ||
                    getItemName(ItemRate.ItemMasterid)}
                </p>
              </div>

              {/* ITEM GROUP + UNIT */}

              <div className="grid grid-cols-2 gap-4">

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Layers className="h-4 w-4" />
                    Item Group
                  </div>

                  <p className="text-sm break-words">
                    {ItemRate.groupName ||
                      ItemRate.itemGroup?.groupName ||
                      getItemGroupName(ItemRate.ItemGroupid)}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Ruler className="h-4 w-4" />
                    Unit
                  </div>

                  <p className="text-sm break-words">
                    {ItemRate.unitName ||
                      ItemRate.unit?.unitName
                        ? `${ItemRate.unit?.unitName || ItemRate.unitName}${
                            ItemRate.unit?.abbreviation ||
                            ItemRate.abbreviation
                              ? ` (${ItemRate.unit?.abbreviation || ItemRate.abbreviation})`
                              : ""
                          }`
                        : getUnitName(ItemRate.Unitid)}
                  </p>
                </div>

              </div>

              {/* BRAND / MANUFACTURER */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <Building2 className="h-4 w-4" />
                  Brand / Manufacturer
                </div>

                <p className="text-sm break-words">
                  {ItemRate.BrandManufacturerName ||
                    ItemRate.brandManufacturerName ||
                    getBrandName(ItemRate.BrandManufacturerid)}
                </p>
              </div>

              {/* ITEM CONDITION */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <ClipboardCheck className="h-4 w-4" />
                  Item Condition
                </div>

                <p className="text-sm break-words">
                  {ItemRate.ItemConditionName ||
                    ItemRate.itemCondition?.ProductType ||
                    getItemConditionName(ItemRate.ItemConditionid)}
                </p>
              </div>

              {/* RATE */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <IndianRupee className="h-4 w-4" />
                  Rate
                </div>

                <p className="text-xl font-semibold">
                  ₹{Number(ItemRate.Rate || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>

              {/* APPLICABLE DATES */}

              <div className="grid grid-cols-2 gap-4">

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Applicable From
                  </div>

                  <p className="text-sm">
                    {formatDate(ItemRate.ApplicableFromDate)}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Applicable To
                  </div>

                  <p className="text-sm">
                    {formatDate(ItemRate.ApplicableToDate)}
                  </p>
                </div>

              </div>

              {/* COMMENTS */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" />
                  Comments
                </div>

                <p className="whitespace-pre-wrap text-sm break-words">
                  {ItemRate.Comments || "-"}
                </p>
              </div>

              {/* CREATED + UPDATED DATE */}

              <div className="grid grid-cols-2 gap-4">

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Created Date
                  </div>

                  <p className="text-sm">
                    {formatDateTime(ItemRate.createdAt)}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Updated Date
                  </div>

                  <p className="text-sm">
                    {formatDateTime(ItemRate.updatedAt)}
                  </p>
                </div>

              </div>

              {/* ID */}

              <div className="rounded-lg border p-4">
                <b className="text-sm">ID</b>

                <p className="mt-2 break-all text-sm text-muted-foreground">
                  {ItemRate.id || "-"}
                </p>
              </div>

            </DialogBody>
          </ScrollArea>

          {/* FOOTER */}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={closeDialog}
            >
              Close
            </Button>
          </DialogFooter>

        </div>
      </DialogContent>
    </Dialog>
  );
}
