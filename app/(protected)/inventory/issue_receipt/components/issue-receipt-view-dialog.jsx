"use client";

import {
  Calendar,
  FileText,
  Package,
  Receipt,
  User,
  ArrowDown,
  ArrowUp,
  Hash,
  IndianRupee,
  MessageSquare,
  ClipboardList,
  MapPin,
  Truck,
  Calculator,
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

// =======================================================
// DISPLAY VALUE
// =======================================================

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
};

// =======================================================
// FORMAT DATE AND TIME
// =======================================================

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// =======================================================
// FORMAT DATE ONLY
// =======================================================

const formatDateOnly = (value) => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// =======================================================
// FORMAT CURRENCY
// =======================================================

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "-";
  }

  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// =======================================================
// GET DESTINATION NAME
// =======================================================

const getDestinationName = (record) => {
  const destinationType = String(
    record?.DestinationType || ""
  ).toLowerCase();

  if (destinationType === "location") {
    return (
      record?.LocationName ||
      record?.DestinationName ||
      record?.locationName ||
      record?.Location?.locationName ||
      record?.Location?.LocationName ||
      "-"
    );
  }

  if (destinationType === "machinery") {
    return (
      record?.MachineName ||
      record?.DestinationName ||
      record?.machineName ||
      record?.Machine?.machineName ||
      record?.Machine?.MachineName ||
      record?.MachineMaster?.machineName ||
      record?.MachineMaster?.MachineName ||
      "-"
    );
  }

  return record?.DestinationName || "-";
};

// =======================================================
// INFORMATION CARD
// =======================================================

function DetailCard({
  label,
  value,
  icon: Icon,
  valueClassName = "",
}) {
  return (
    <div className="rounded-lg border p-4 min-w-0">
      <div className="mb-2 flex items-center gap-2 font-semibold text-sm">
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span>{label}</span>
      </div>

      <p
        className={`break-words text-sm text-muted-foreground ${valueClassName}`}
      >
        {displayValue(value)}
      </p>
    </div>
  );
}

// =======================================================
// SECTION HEADER
// =======================================================

function SectionHeader({
  icon: Icon,
  title,
  description,
}) {
  return (
    <div className="mb-4 flex items-center gap-2 border-b pb-3">
      <Icon className="h-5 w-5 shrink-0" />

      <div>
        <h3 className="text-sm font-semibold">{title}</h3>

        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

// =======================================================
// COMPONENT
// =======================================================

export default function IssueReceiptViewDialog({
  open,
  closeDialog,
  IssueReceipt,
}) {
  if (!IssueReceipt) {
    return null;
  }

  const record = IssueReceipt;

  const quantity = Number(record.Qty || 0);
  const rate = Number(record.Price || 0);
  const total = quantity * rate;

  const destinationType = String(
    record.DestinationType || ""
  ).toLowerCase();

  const destinationName = getDestinationName(record);

  const destinationLabel =
    destinationType === "location"
      ? "Location"
      : destinationType === "machinery"
        ? "Machinery"
        : "Destination";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-[90vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px] max-h-[95vh]">

        <DialogHeader>
          <DialogTitle>
            
            Stock Movement Details
          </DialogTitle>

          <DialogDescription>
            View complete stock movement information.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[70vh] overflow-hidden">
          <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
            <div className="space-y-6 py-4">

              {/* ITEM DETAILS */}

              <div>
                <SectionHeader
                  icon={Package}
                  title="Item Details"
                  description="Item and transaction information"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <DetailCard
                    label="Item Group"
                    value={record.ItemGroupName}
                    icon={Package}
                  />

                  <DetailCard
                    label="Item"
                    value={record.ItemMasterName}
                    icon={Package}
                  />

                  <DetailCard
                    label="Item Condition"
                    value={record.ItemTypeName}
                    icon={FileText}
                  />

                  <DetailCard
                    label="Transaction Type"
                    value={record.TransactionTypeName}
                    icon={Receipt}
                  />

                </div>
              </div>

              {/* STOCK / QUANTITY DETAILS */}

              <div>
                <SectionHeader
                  icon={ClipboardList}
                  title="Stock & Quantity Details"
                  description="Balance, quantity and pricing information"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                  <DetailCard
                    label="Previous Balance"
                    value={record.PreviousBalance}
                    icon={ArrowDown}
                    valueClassName="text-lg font-semibold"
                  />

                  <DetailCard
                    label="Quantity"
                    value={record.Qty}
                    icon={Hash}
                    valueClassName="text-lg font-semibold"
                  />

                  <DetailCard
                    label="Rate"
                    value={formatCurrency(record.Price)}
                    icon={IndianRupee}
                    valueClassName="text-lg font-semibold"
                  />

                  <DetailCard
                    label="Total"
                    value={formatCurrency(total)}
                    icon={Calculator}
                    valueClassName="text-lg font-semibold"
                  />

                  <DetailCard
                    label="Balance"
                    value={record.Balance}
                    icon={ArrowUp}
                    valueClassName="text-lg font-semibold"
                  />

                </div>
              </div>

              {/* DATE DETAILS */}

              <div>
                <SectionHeader
                  icon={Calendar}
                  title="Date Details"
                  description="Issue, receipt and receiving dates"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <DetailCard
                    label="Issue Date & Time"
                    value={formatDate(record.IssueDate)}
                    icon={Calendar}
                  />

                  <DetailCard
                    label="Date Of Receive"
                    value={formatDateOnly(record.DateOfRecive)}
                    icon={Calendar}
                  />

                  <DetailCard
                    label="Receipt Date & Time"
                    value={formatDate(record.ReceiptDate)}
                    icon={Calendar}
                  />

                  <DetailCard
                    label="Requisition Supply Date & Time"
                    value={formatDate(record.RequisitionSupplyDate)}
                    icon={Calendar}
                  />

                  <DetailCard
                    label="Purchase Order Date & Time"
                    value={formatDate(record.PurchaseDate)}
                    icon={Calendar}
                  />

                </div>
              </div>

              {/* ISSUE & RECEIVE DETAILS */}

              <div>
                <SectionHeader
                  icon={User}
                  title="Issue & Receive Details"
                  description="Issue and receiving information"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <DetailCard
                    label="Issue By"
                    value={record.IssueByName}
                    icon={User}
                  />

                  <DetailCard
                    label="Gate Pass No"
                    value={record.GetPassNo}
                    icon={Receipt}
                  />

                  <DetailCard
                    label="Receipt Challan No"
                    value={record.ReciptChallanNo}
                    icon={FileText}
                  />

                  <DetailCard
                    label="Received By"
                    value={record.ReceivedByName}
                    icon={User}
                  />

                </div>
              </div>

              {/* REQUISITION DETAILS */}

              <div>
                <SectionHeader
                  icon={ClipboardList}
                  title="Requisition Details"
                  description="Requisition supply information"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <DetailCard
                    label="Requisition Supply Number"
                    value={record.RequisitionSupplyNo}
                    icon={FileText}
                  />

                  <DetailCard
                    label="Requisition Supply Date & Time"
                    value={formatDate(record.RequisitionSupplyDate)}
                    icon={Calendar}
                  />

                </div>
              </div>

              {/* PURCHASE ORDER DETAILS */}

              <div>
                <SectionHeader
                  icon={Receipt}
                  title="Purchase Order Details"
                  description="Purchase order information"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <DetailCard
                    label="Purchase Order Number"
                    value={record.PurchaseNo}
                    icon={FileText}
                  />

                  <DetailCard
                    label="Purchase Order Date & Time"
                    value={formatDate(record.PurchaseDate)}
                    icon={Calendar}
                  />

                </div>
              </div>

              {/* DESTINATION DETAILS */}

              <div>
                <SectionHeader
                  icon={MapPin}
                  title="Destination Details"
                  description="Selected location or machinery"
                />

                <div className="rounded-lg border p-4 space-y-4">

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                    <DetailCard
                      label="Destination Type"
                      value={
                        destinationType === "location"
                          ? "Location"
                          : destinationType === "machinery"
                            ? "Machinery"
                            : record.DestinationType
                      }
                      icon={MapPin}
                    />

                    <DetailCard
                      label={destinationLabel}
                      value={destinationName}
                      icon={
                        destinationType === "machinery"
                          ? Truck
                          : MapPin
                      }
                    />

                  </div>

                </div>
              </div>

              {/* PARTICULAR */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" />
                  Particuler
                </div>

                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {displayValue(record.Particuler)}
                </p>
              </div>

              {/* COMMENT */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <MessageSquare className="h-4 w-4" />
                  Comment
                </div>

                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {displayValue(record.Comment)}
                </p>
              </div>

              {/* SYSTEM DETAILS */}

              <div>
                <SectionHeader
                  icon={FileText}
                  title="System Details"
                  description="Record information"
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <DetailCard
                    label="Created By"
                    value={record.CreatedByName}
                    icon={User}
                  />

                  <DetailCard
                    label="Updated By"
                    value={record.UpdatedByName}
                    icon={User}
                  />

                  <DetailCard
                    label="Created Date"
                    value={formatDate(record.createdAt)}
                    icon={Calendar}
                  />

                  <DetailCard
                    label="Updated Date"
                    value={formatDate(record.updatedAt)}
                    icon={Calendar}
                  />

                </div>
              </div>

              {/* ID */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 font-semibold">
                  ID
                </div>

                <p className="break-all text-sm text-muted-foreground">
                  {displayValue(record.id)}
                </p>
              </div>

            </div>
          </DialogBody>
        </ScrollArea>

        {/* FOOTER */}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={closeDialog}
          >
            Close
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}