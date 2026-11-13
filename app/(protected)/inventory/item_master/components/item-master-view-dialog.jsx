"use client";

import { useEffect, useState } from "react";

import {
  Calendar,
  CheckCircle,
  FileText,
  Layers,
  Package,
  Percent,
  Ruler,
  XCircle,
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// =======================================================
// DATE FORMAT
// =======================================================

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// =======================================================
// COMPONENT
// =======================================================

export default function ItemMasterViewDialog({
  open,
  closeDialog,
  ItemMaster,
}) {
  const [itemGroups, setItemGroups] = useState([]);

  const [units, setUnits] = useState([]);

  const [taxes, setTaxes] = useState([]);

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
      const [groupResponse, unitResponse, taxResponse] = await Promise.all([
        apiFetch("/api/inventory/item-groups?limit=100"),

        apiFetch("/api/inventory/unit?limit=100"),

        apiFetch("/api/finance/tax_rates?limit=100"),
      ]);

      const groupJson = await groupResponse.json();

      const unitJson = await unitResponse.json();

      const taxJson = await taxResponse.json();

      setItemGroups(groupJson.data || []);

      setUnits(unitJson.data || []);

      setTaxes(taxJson.data || []);
    } catch (error) {
      console.error("Dropdown loading error", error);
    }
  };

  // =======================================================
  // GET NAMES
  // =======================================================

  const getItemGroupName = (id) => {
    const data = itemGroups.find((item) => item.id === id);

    return data?.groupName || id || "-";
  };

  const getUnitName = (id) => {
    const data = units.find((item) => item.id === id);

    return data?.unitName || id || "-";
  };

  const getTaxName = (id) => {
    const data = taxes.find((item) => String(item.id) === String(id));

    return data?.name || data?.taxName || id || "-";
  };

  if (!ItemMaster) {
    return null;
  }

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
          <DialogTitle>Item Details</DialogTitle>

          <DialogDescription>View complete item information.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
        <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
          {/* ITEM NAME */}

          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <Package className="h-4 w-4" />
              Item Name
            </div>

            <p className="text-sm">{ItemMaster.ItemName || "-"}</p>
          </div>

          {/* GROUP + UNIT */}

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="mb-2 flex gap-2 font-semibold">
                <Layers className="h-4 w-4" />
                Item Group
              </div>

              <p>{getItemGroupName(ItemMaster.ItemGroupid)}</p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-2 flex gap-2 font-semibold">
                <Ruler className="h-4 w-4" />
                Unit
              </div>

              <p>{getUnitName(ItemMaster.Unitid)}</p>
            </div>
          </div>

          {/* DESCRIPTION */}

          <div className="rounded-lg border p-4">
            <div className="mb-2 flex gap-2 font-semibold">
              <FileText className="h-4 w-4" />
              Description
            </div>

            <p className="whitespace-pre-wrap text-sm">
              {ItemMaster.Description || "-"}
            </p>
          </div>

          {/* BALANCE + RATE */}

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <b>Opening Balance</b>

              <p>{ItemMaster.openingBalance || "-"}</p>
            </div>

            <div className="rounded-lg border p-4">
              <b>Rate</b>

              <p>{ItemMaster.rather || "-"}</p>
            </div>
          </div>

          {/* TAX */}

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="flex gap-2 font-semibold">
                <Percent className="h-4 w-4" />
                Tax 1
              </div>

              <p>{getTaxName(ItemMaster.Tax1)}</p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex gap-2 font-semibold">
                <Percent className="h-4 w-4" />
                Tax 2
              </div>

              <p>{getTaxName(ItemMaster.Tax2)}</p>
            </div>
          </div>

          {/* RELOCATE */}

          <div className="rounded-lg border p-4">
            <b>Applicable For Restock Level</b>

            <p>{ItemMaster.ApplicableForRelocateLevel ? "Yes" : "No"}</p>

            {ItemMaster.ApplicableForRelocateLevel && (
              <p>Level :{ItemMaster.RelocateLevel || "-"}</p>
            )}
          </div>

          {/* STATUS DEFAULT */}

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="flex gap-2 font-semibold">
                {ItemMaster.status ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                Status
              </div>

              <p>{ItemMaster.status ? "Active" : "Inactive"}</p>
            </div>

            <div className="rounded-lg border p-4">
              <b>Default Item</b>

              <p>{ItemMaster.isDefault ? "Yes" : "No"}</p>
            </div>
          </div>

          {/* DATE */}

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-4">
              <div className="flex gap-2 font-semibold">
                <Calendar className="h-4 w-4" />
                Created
              </div>

              <p>{formatDate(ItemMaster.createdAt)}</p>
            </div>

            <div className="rounded-lg border p-4">
              <div className="flex gap-2 font-semibold">
                <Calendar className="h-4 w-4" />
                Updated
              </div>

              <p>{formatDate(ItemMaster.updatedAt)}</p>
            </div>
          </div>

          {/* ID */}

          <div className="rounded-lg border p-4">
            <b>ID</b>

            <p className="break-all text-sm">{ItemMaster.id || "-"}</p>
          </div>
        </DialogBody>
        </ScrollArea>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={closeDialog}>
            Close
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
