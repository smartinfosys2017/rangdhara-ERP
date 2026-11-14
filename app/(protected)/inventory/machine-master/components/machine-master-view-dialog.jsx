
"use client";
import { History } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Calendar,
  CheckCircle,
  FileText,
  Layers,
  XCircle,
  Cpu,
  Hash,
  Network,
  User,
  Package,
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
import { ScrollArea } from "@/components/ui/scroll-area";

// ------------------------------------------------------
// HELPERS
// ------------------------------------------------------

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return value.trim() ? [value] : [];
    }
  }

  return [];
};

const getMachineGroups = (machine) => {
  return parseJsonArray(
    machine?.GroupName ?? machine?.groupName
  )
    .map((group) => {
      if (typeof group === "string") return group;

      return group?.groupName || group?.name || "";
    })
    .filter(Boolean);
};

const getMachineItems = (machine) => {
  return parseJsonArray(
    machine?.itemDetails ??
    machine?.ItemDetails ??
    machine?.machineItems
  );
};

const getItemName = (item) =>
  item?.Selecteditem ||
  item?.ItemName ||
  item?.itemName ||
  item?.name ||
  "-";

const getItemUnit = (item) =>
  item?.itemUnit ||
  item?.UnitName ||
  item?.unitName ||
  "-";

const getItemGroup = (item) =>
  item?.SelectedGroupName ||
  item?.groupName ||
  item?.GroupName ||
  "-";

const getItemQuantity = (item) =>
  item?.itemQty ??
  item?.quantity ??
  "-";

const getItemComment = (item) =>
  item?.itemdescription ||
  item?.comment ||
  item?.description ||
  "-";

const isMachineActive = (status) =>
  status === true ||
  status === 1 ||
  status === "1" ||
  String(status).toUpperCase() === "ACTIVE";

// ------------------------------------------------------
// REUSABLE DETAIL CARD
// ------------------------------------------------------

function DetailCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border p-3 space-y-2 min-w-0">
      <div className="flex items-center gap-2 font-semibold text-sm">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {title}
      </div>

      <div className="text-sm text-muted-foreground break-words">
        {children || "-"}
      </div>
    </div>
  );
}

// ------------------------------------------------------
// COMPONENT
// ------------------------------------------------------

export default function MachineMasterViewDialog({
  open,
  closeDialog,
  MachineMaster,
}) {
  if (!MachineMaster) return null;

  const groups = getMachineGroups(MachineMaster);
  const items = getMachineItems(MachineMaster);

  const status = isMachineActive(MachineMaster.status);
  const [changeLogs, setChangeLogs] = useState([]);
  const [loadingChangeLogs, setLoadingChangeLogs] = useState(false);
  useEffect(() => {
    if (!open || !MachineMaster?.id) {
      setChangeLogs([]);
      return;
    }

    const fetchChangeLogs = async () => {
      try {
        setLoadingChangeLogs(true);

        const response = await fetch(
          `/api/inventory/machine-master/${MachineMaster.id}/change-logs`,
          {
            credentials: "same-origin",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to fetch change history.");
        }

        setChangeLogs(result.data || []);
      } catch (error) {
        console.error("FETCH MACHINE CHANGE LOG ERROR:", error);
        setChangeLogs([]);
      } finally {
        setLoadingChangeLogs(false);
      }
    };

    fetchChangeLogs();
  }, [open, MachineMaster?.id]);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) closeDialog?.();
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">

        <div className="flex flex-col max-h-[85vh] overflow-hidden">
          {/* HEADER */}
          <DialogHeader>
            <DialogTitle>
              Machine Master Details
            </DialogTitle>

            <DialogDescription>
              View complete machine information and assigned items.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
              {/* CONTENT */}

              {/* MACHINE INFORMATION */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold border-b pb-2">
                  Machine Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                  <DetailCard
                    icon={Hash}
                    title="Machine Code"
                  >
                    {MachineMaster.machineCode}
                  </DetailCard>

                  <DetailCard
                    icon={Cpu}
                    title="Machine Name"
                  >
                    {MachineMaster.machineName}
                  </DetailCard>

                  <DetailCard
                    icon={Hash}
                    title="Machine Number"
                  >
                    {MachineMaster.machineNumber}
                  </DetailCard>

                  <DetailCard
                    icon={Network}
                    title="IP Address"
                  >
                    {MachineMaster.ipAddress}
                  </DetailCard>
                  {/* OPERATIONAL STATUS */}

                  <DetailCard
                    icon={status ? CheckCircle : XCircle}
                    title="Operational"
                  >
                    <span
                      className={
                        status
                          ? "font-medium text-green-600"
                          : "font-medium text-red-600"
                      }
                    >
                      {status ? "Yes" : "No"}
                    </span>
                  </DetailCard>
                </div>
              </div>
              {/* GROUP NAME */}
              <div className="rounded-lg border p-3 mt-3  space-y-3">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Group Names ({groups.length})
                </div>

                {groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No groups assigned.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {groups.map((group, index) => (
                      <span
                        key={`${group}-${index}`}
                        className="inline-flex items-center rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                      >
                        {group}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {/* MACHINE COMMENT */}
              <div className="mt-3 space-y-3">
                <DetailCard
                  icon={FileText}
                  title="Machine Comment"
                >
                  <p className="whitespace-pre-wrap ">
                    {MachineMaster.comment || "-"}
                  </p>
                </DetailCard>
              </div>
              {/* ASSIGNED ITEM DETAILS */}
              <div className="mt-3  space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />

                    <h3 className="text-sm font-semibold">
                      Assigned Item Details
                    </h3>
                  </div>

                  <span className="text-sm font-medium">
                    Total Items: {items.length}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-lg border p-8 text-center">
                    <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />

                    <p className="text-sm font-medium">
                      No items assigned
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      No item details are available for this machine.
                    </p>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto border rounded-lg">
                    <table className="min-w-[700px] w-full text-sm border-collapse">
                      <thead className="bg-muted">
                        <tr className="border-b">
                          <th className="p-3 text-left font-semibold w-[50px]">
                            #
                          </th>

                          <th className="p-3 text-left font-semibold">
                            Item Name
                          </th>

                          <th className="p-3 text-left font-semibold">
                            Group
                          </th>

                          <th className="p-3 text-left font-semibold">
                            Unit
                          </th>

                          <th className="p-3 text-right font-semibold">
                            Quantity
                          </th>

                          <th className="p-3 text-left font-semibold">
                            Comment
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {items.map((item, index) => (
                          <tr
                            key={
                              item.id ||
                              item.itemMasterId ||
                              index
                            }
                            className="border-b last:border-0 hover:bg-muted/40"
                          >
                            <td className="p-3 text-muted-foreground">
                              {index + 1}
                            </td>

                            <td className="p-3 font-medium">
                              {getItemName(item)}
                            </td>

                            <td className="p-3">
                              {getItemGroup(item)}
                            </td>

                            <td className="p-3">
                              {getItemUnit(item)}
                            </td>

                            <td className="p-3 text-right font-medium">
                              {getItemQuantity(item)}
                            </td>

                            <td className="p-3 whitespace-pre-wrap">
                              {getItemComment(item)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {/* CREATED / UPDATED */}
              <div className="mt-3 space-y-3">
                <h3 className="text-sm font-semibold border-b pb-2">
                  Record Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailCard
                    icon={Calendar}
                    title="Created At"
                  >
                    {formatDate(MachineMaster.createdAt)}
                  </DetailCard>

                  <DetailCard
                    icon={Calendar}
                    title="Updated At"
                  >
                    {formatDate(MachineMaster.updatedAt)}
                  </DetailCard>
                </div>
              </div>
              {/* RECORD ID */}
              <div className="mt-3 space-y-3">
                <DetailCard
                  icon={Hash}
                  title="Machine ID"
                >
                  {MachineMaster.id}
                </DetailCard>
              </div>

              {/* MACHINE CHANGE HISTORY */}
              <div className="mt-3 mb-3 rounded-lg border p-3 min-w-0 flex flex-col h-[450px] shrink-0">

                {/* HEADER */}
                <div className="flex shrink-0 items-center justify-between border-b pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-muted-foreground" />

                    <h3 className="text-sm font-semibold">
                      Machine Change History
                    </h3>

                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                      {changeLogs.length}
                    </span>
                  </div>
                </div>

                {/* CONTENT */}
                {loadingChangeLogs ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    Loading change history...
                  </div>
                ) : changeLogs.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center rounded-md border text-sm text-muted-foreground">
                    No change history available.
                  </div>
                ) : (
                  <div className="min-h-0 flex-1 w-full overflow-auto rounded-md border">
                    <table className="w-full min-w-[750px] text-sm border-collapse">
                      <thead className="sticky top-0 z-20 bg-muted">
                        <tr className="border-b">
                          <th className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                            Date & Time
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                            Updated By
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            Field
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            Old Value
                          </th>
                          <th className="px-3 py-2 text-left font-semibold">
                            New Value
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {changeLogs.map((log) => {
                          let details = {};

                          try {
                            details =
                              typeof log.Details === "string"
                                ? JSON.parse(log.Details)
                                : log.Details || {};
                          } catch {
                            details = {};
                          }

                          const formatValue = (value) => {
                            if (value === null || value === undefined || value === "") {
                              return "-";
                            }

                            if (typeof value === "boolean") {
                              return value ? "Active" : "Inactive";
                            }

                            if (Array.isArray(value)) {
                              if (!value.length) return "-";

                              return value.map((item) => {
                                if (typeof item === "object" && item !== null) {
                                  return Object.entries(item)
                                    .map(([key, val]) => `${key}: ${formatValue(val)}`)
                                    .join(", ");
                                }

                                return String(item);
                              }).join(" | ");
                            }

                            if (typeof value === "object") {
                              return Object.entries(value)
                                .map(([key, val]) => `${key}: ${formatValue(val)}`)
                                .join(", ");
                            }

                            return String(value);
                          };

                          const changedFields = Object.entries(details).filter(
                            ([, change]) =>
                              change &&
                              typeof change === "object" &&
                              ("oldValue" in change || "newValue" in change)
                          );

                          return (
                            <tr
                              key={log.id}
                              className="border-b last:border-0 align-top hover:bg-muted/40"
                            >
                              <td className="whitespace-nowrap px-3 py-2">
                                {formatDate(log.createdAt)}
                              </td>

                              <td className="whitespace-nowrap px-3 py-2">
                                {log.UserName || "-"}
                              </td>

                              <td className="px-3 py-2">
                                <div className="font-medium">
                                  {log.Selecteditem || "-"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {log.Action || "-"}
                                </div>
                              </td>

                              <td className="max-w-[250px] break-words px-3 py-2">
                                {changedFields.length ? (
                                  <div className="space-y-2">
                                    {changedFields.map(([field, change]) => (
                                      <div key={field}>
                                        <div className="text-xs font-semibold capitalize text-muted-foreground">
                                          {field.replace(/([A-Z])/g, " $1")}
                                        </div>
                                        <div>{formatValue(change.oldValue)}</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : "-"}
                              </td>

                              <td className="max-w-[250px] break-words px-3 py-2">
                                {changedFields.length ? (
                                  <div className="space-y-2">
                                    {changedFields.map(([field, change]) => (
                                      <div key={field}>
                                        <div className="text-xs font-semibold capitalize text-muted-foreground">
                                          {field.replace(/([A-Z])/g, " $1")}
                                        </div>
                                        <div>{formatValue(change.newValue)}</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </ScrollArea>
          </DialogBody>
        </div>

      </DialogContent>
    </Dialog>
  );
}