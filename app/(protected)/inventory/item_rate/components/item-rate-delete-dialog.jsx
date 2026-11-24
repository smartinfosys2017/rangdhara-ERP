
"use client";

import { Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

// =======================================================
// COMPONENT
// =======================================================

export default function ItemRateDeleteDialog({
  open,
  closeDialog,
  ItemRate,
  onConfirm,
  loading = false,
}) {
  const getDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getItemName = () => {
    return (
      ItemRate?.itemMaster?.ItemName ||
      ItemRate?.ItemName ||
      ItemRate?.itemName ||
      "-"
    );
  };

  const getBrandName = () => {
    const brand = ItemRate?.brandManufacturer;

    if (brand) {
      const brandName =
        brand.brandName ||
        brand.BrandName ||
        "";

      const manufacturerName =
        brand.manufacturerName ||
        brand.ManufacturerName ||
        "";

      if (brandName && manufacturerName) {
        return `${brandName} / ${manufacturerName}`;
      }

      return brandName || manufacturerName || brand.name || "-";
    }

    return ItemRate?.BrandManufacturerName || "-";
  };

  const getItemCondition = () => {
    return (
      ItemRate?.itemCondition?.ProductType ||
      ItemRate?.ItemConditionName ||
      "-"
    );
  };

  const itemName = getItemName();

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Item Rate
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this item rate?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-4">
          {/* ITEM NAME */}

          <p className="font-medium break-words">
            {itemName.length > 100
              ? `${itemName.slice(0, 100)}...`
              : itemName}
          </p>

          {/* ITEM RATE DETAILS */}
{/* 
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                Rate
              </span>

              <span className="font-medium">
                ₹{Number(ItemRate?.Rate || 0).toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                Brand / Manufacturer
              </span>

              <span className="text-right font-medium">
                {getBrandName()}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                Item Condition
              </span>

              <span className="text-right font-medium">
                {getItemCondition()}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                Applicable From
              </span>

              <span className="font-medium">
                {getDate(ItemRate?.ApplicableFromDate)}
              </span>
            </div>

            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">
                Applicable To
              </span>

              <span className="font-medium">
                {getDate(ItemRate?.ApplicableToDate)}
              </span>
            </div>

            {ItemRate?.id && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">
                  ID
                </span>

                <span className="break-all text-right">
                  {ItemRate.id}
                </span>
              </div>
            )}
          </div> */}

          <p className="mt-4 text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={loading}
            onClick={() => onConfirm?.()}
          >
            <Trash2 className="mr-2 h-4 w-4" />

            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
