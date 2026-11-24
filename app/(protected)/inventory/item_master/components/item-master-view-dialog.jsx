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
  MapPin,
  Cog,
  Barcode,
  ScanBarcode,
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
  const [locations, setLocations] = useState([]);
  const [machines, setMachines] = useState([]);
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
        unitResponse,
        taxResponse,
        locationResponse,
        machineResponse,
        itemConditionResponse,
      ] = await Promise.all([
        apiFetch("/api/inventory/item-groups?limit=100"),
        apiFetch("/api/inventory/unit?limit=100"),
        apiFetch("/api/finance/tax_rates?limit=100"),
        apiFetch("/api/inventory/location?limit=100"),
        apiFetch("/api/inventory/machine-master?limit=100"),
        apiFetch("/api/inventory/product-type?limit=100"),
      ]);

      const [
        groupJson,
        unitJson,
        taxJson,
        locationJson,
        machineJson,
        itemConditionJson,
      ] = await Promise.all([
        groupResponse.json(),
        unitResponse.json(),
        taxResponse.json(),
        locationResponse.json(),
        machineResponse.json(),
        itemConditionResponse.json(),
      ]);

      setItemGroups(groupJson.data || []);
      setUnits(unitJson.data || []);
      setTaxes(taxJson.data || []);
      setLocations(locationJson.data || []);
      setMachines(machineJson.data || []);
      setItemConditions(itemConditionJson.data || []);
    } catch (error) {
      console.error("Dropdown loading error", error);
    }
  };

  // =======================================================
  // GET NAMES
  // =======================================================

  const getItemGroupName = (id) => {
    const data = itemGroups.find((item) => String(item.id) === String(id));

    return data?.groupName || id || "-";
  };

  const getUnitName = (id) => {
    const data = units.find((item) => String(item.id) === String(id));

    if (!data) return id || "-";

    return data.abbreviation
      ? `${data.unitName} (${data.abbreviation})`
      : data.unitName || "-";
  };

  const getTaxName = (id) => {
    if (!id) return "-";

    const data = taxes.find((item) => String(item.id) === String(id));

    return data?.name || data?.taxName || id || "-";
  };

  // =======================================================
  // GET Warehouse NAME
  // =======================================================

  const getLocationName = (id) => {
    if (!id) return "-";

    const data = locations.find((item) => String(item.id) === String(id));

    if (!data) return id;

    return data.locationCode
      ? `${data.locationName} (${data.locationCode})`
      : data.locationName || "-";
  };

  // =======================================================
  // GET MACHINE NAME
  // =======================================================

  const getMachineName = (id) => {
    if (!id) return "-";

    const data = machines.find((item) => String(item.id) === String(id));

    if (!data) return id;

    return data.machineCode
      ? `${data.machineName} (${data.machineCode})`
      : data.machineName || "-";
  };

  // =======================================================
  // GET ITEM CONDITION NAME
  // =======================================================

  const getItemConditionName = (id) => {
    if (!id) return "-";

    const data = itemConditions.find((item) => String(item.id) === String(id));

    if (!data) return id;

    return data.ProductType || "-";
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
          {/* HEADER */}

          <DialogHeader>
            <DialogTitle>Item Details</DialogTitle>

            <DialogDescription>
              View complete item information.
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

                <p className="text-sm">{ItemMaster.ItemName || "-"}</p>
              </div>

              {/* SKU + BARCODE */}

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Barcode className="h-4 w-4" />
                    SKU
                  </div>

                  <p className="text-sm break-all">{ItemMaster.SKU || "-"}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <ScanBarcode className="h-4 w-4" />
                    Barcode
                  </div>

                  <p className="text-sm break-all">
                    {ItemMaster.Barcode || "-"}
                  </p>
                </div>
              </div>

              {/* GROUP + UNIT */}

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex gap-2 font-semibold">
                    <Layers className="h-4 w-4" />
                    Item Group
                  </div>

                  <p className="text-sm">
                    {getItemGroupName(ItemMaster.ItemGroupid)}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex gap-2 font-semibold">
                    <Ruler className="h-4 w-4" />
                    Unit
                  </div>

                  <p className="text-sm">{getUnitName(ItemMaster.Unitid)}</p>
                </div>
              </div>

              {/* LOCATION + MACHINE + ITEM CONDITION */}

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex gap-2 font-semibold">
                    <MapPin className="h-4 w-4" />
                    Location
                  </div>

                  <p className="text-sm break-words">
                    {getLocationName(ItemMaster.Locationid)}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex gap-2 font-semibold">
                    <Cog className="h-4 w-4" />
                    Machine
                  </div>

                  <p className="text-sm break-words">
                    {getMachineName(ItemMaster.Machineid)}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex gap-2 font-semibold">
                    <Cog className="h-4 w-4" />
                    Item Condition
                  </div>

                  <p className="text-sm break-words">
                    {getItemConditionName(ItemMaster.ItemConditionid)}
                  </p>
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

                  <p className="text-sm">{ItemMaster.openingBalance || "-"}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <b>Closing Balance</b>

                  <p className="text-sm">{ItemMaster.openingBalance || "-"}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <b>Rate</b>

                  <p className="text-sm">{ItemMaster.rather ?? "-"}</p>
                </div>
              </div>

              {/* TAX */}

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex gap-2 font-semibold">
                    <Percent className="h-4 w-4" />
                    Tax 1
                  </div>

                  <p className="text-sm">{getTaxName(ItemMaster.Tax1)}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex gap-2 font-semibold">
                    <Percent className="h-4 w-4" />
                    Tax 2
                  </div>

                  <p className="text-sm">{getTaxName(ItemMaster.Tax2)}</p>
                </div>
              </div>

              {/* RELOCATE */}

              <div className="rounded-lg border p-4">
                <b>Applicable For Restock Level</b>

                <p className="text-sm">
                  {ItemMaster.ApplicableForRelocateLevel ? "Yes" : "No"}
                </p>

                {ItemMaster.ApplicableForRelocateLevel && (
                  <p className="mt-1 text-sm">
                    Level: {ItemMaster.RelocateLevel || "-"}
                  </p>
                )}
              </div>

              {/* STATUS + DEFAULT */}

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex gap-2 font-semibold">
                    {ItemMaster.status ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    Status
                  </div>

                  <p className="text-sm">
                    {ItemMaster.status ? "Active" : "Inactive"}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <b>Default Item</b>

                  <p className="mt-2 text-sm">
                    {ItemMaster.isDefault ? "Yes" : "No"}
                  </p>
                </div>
              </div>

              {/* DATE */}

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Created Date
                  </div>

                  <p className="text-sm">{formatDate(ItemMaster.createdAt)}</p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Updated Date
                  </div>

                  <p className="text-sm">{formatDate(ItemMaster.updatedAt)}</p>
                </div>
              </div>

              {/* ID */}

              <div className="rounded-lg border p-4">
                <b>ID</b>

                <p className="break-all text-sm mt-2">{ItemMaster.id || "-"}</p>
              </div>
            </DialogBody>
          </ScrollArea>

          {/* FOOTER */}

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