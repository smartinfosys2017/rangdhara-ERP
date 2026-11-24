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
  ArrowLeftRight,
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
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
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
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
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
// NORMALIZE LOCATION TYPE
// =======================================================

const normalizeLocationType = (value) => {
  const type = String(value || "")
    .trim()
    .toUpperCase();

  if (type === "MACHINE" || type === "MACHINERY") {
    return "MACHINE";
  }

  if (type === "LOCATION") {
    return "LOCATION";
  }

  return type;
};

// =======================================================
// GET LOCATION TYPE LABEL
// =======================================================

const getLocationTypeLabel = (value) => {
  const type = normalizeLocationType(value);

  if (type === "LOCATION") return "Location";
  if (type === "MACHINE") return "Machinery";
  if (type === "VENDOR") return "Vendor";

  return displayValue(value);
};

// =======================================================
// GET MOVEMENT TYPE
// =======================================================

const getMovementType = (record) => {
  const movementType = String(
    record?.MovementType || ""
  )
    .trim()
    .toUpperCase();

  if (movementType) {
    return movementType;
  }

  if (
    String(record?.FromType || "").toUpperCase() ===
    "VENDOR"
  ) {
    return "INWARD";
  }

  if (record?.FromType && record?.ToType) {
    return "INTERNAL_TRANSFER";
  }

  return "INWARD";
};

// =======================================================
// GET DESTINATION NAME
// =======================================================

const getDestinationName = (record) => {
  const destinationType = normalizeLocationType(
    record?.DestinationType || record?.ToType
  );

  if (destinationType === "LOCATION") {
    return (
      record?.ToLocationName ||
      record?.DestinationLocationName ||
      record?.LocationName ||
      record?.DestinationName ||
      record?.locationName ||
      record?.Location?.locationName ||
      record?.Location?.LocationName ||
      "-"
    );
  }

  if (destinationType === "MACHINE") {
    return (
      record?.ToMachineName ||
      record?.DestinationMachineName ||
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
// GET SOURCE NAME
// =======================================================

const getSourceName = (record) => {
  const sourceType = normalizeLocationType(
    record?.FromType || record?.IssueFromType
  );

  if (sourceType === "LOCATION") {
    return (
      record?.FromLocationName ||
      record?.SourceLocationName ||
      record?.SourceName ||
      record?.FromLocation?.locationName ||
      record?.FromLocation?.LocationName ||
      record?.SourceLocation?.locationName ||
      record?.SourceLocation?.LocationName ||
      "-"
    );
  }

  if (sourceType === "MACHINE") {
    return (
      record?.FromMachineName ||
      record?.SourceMachineName ||
      record?.SourceName ||
      record?.FromMachine?.machineName ||
      record?.FromMachine?.MachineName ||
      record?.SourceMachine?.machineName ||
      record?.SourceMachine?.MachineName ||
      "-"
    );
  }

  if (sourceType === "VENDOR") {
    return "Vendor";
  }

  return record?.SourceName || "-";
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
    <div className="min-w-0 rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        {Icon && (
          <Icon className="h-4 w-4 shrink-0" />
        )}

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
        <h3 className="text-sm font-semibold">
          {title}
        </h3>

        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

// =======================================================
// LOCATION / MACHINE DETAILS
// =======================================================

function StockLocationCard({
  title,
  type,
  name,
  id,
  previousBalance,
  quantity,
  finalBalance,
  isSource = false,
}) {
  const normalizedType = normalizeLocationType(type);

  const LocationIcon =
    normalizedType === "MACHINE" ? Truck : MapPin;

  return (
    <div className="min-w-0 space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-2 border-b pb-3 text-sm font-semibold">
        {isSource ? (
          <ArrowUp className="h-4 w-4 text-destructive" />
        ) : (
          <ArrowDown className="h-4 w-4 text-green-600" />
        )}

        {title}
      </div>

      <DetailCard
        label="Type"
        value={getLocationTypeLabel(type)}
        icon={MapPin}
      />

      <DetailCard
        label="Name"
        value={name}
        icon={LocationIcon}
      />

      <DetailCard
        label="ID"
        value={id}
        icon={Hash}
      />

      <DetailCard
        label="Previous Stock"
        value={previousBalance}
        icon={ArrowDown}
      />

      <DetailCard
        label={isSource ? "Stock Issued" : "Stock Received"}
        value={quantity}
        icon={Package}
      />

      <DetailCard
        label={isSource ? "Remaining Stock" : "Final Stock"}
        value={finalBalance}
        icon={ArrowUp}
        valueClassName="font-semibold"
      />
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

  const movementType = getMovementType(record);
  const isInternalTransfer =
    movementType === "INTERNAL_TRANSFER";

  const quantity = Number(record.Qty || 0);
  const rate = Number(record.Price || 0);
  const total = quantity * rate;

  // =====================================================
  // SOURCE DETAILS
  // =====================================================

  const sourceType =
    record.FromType || record.IssueFromType;

  const sourceId =
    record.FromId || record.IssueFromId;

  const sourceName = getSourceName(record);

  // Main IssueReceipt PreviousBalance and Balance
  // represent source balances for internal transfers.
  const sourcePreviousBalance = Number(
    record.PreviousBalance || 0
  );

  const sourceFinalBalance = Number(
    record.Balance || 0
  );

  // =====================================================
  // DESTINATION DETAILS
  // =====================================================

  const destinationType = isInternalTransfer
    ? record.ToType || record.ReceiveToType
    : record.DestinationType || record.ToType;

  const destinationId = isInternalTransfer
    ? record.ToId || record.ReceiveToId
    : record.DestinationId || record.ToId;

  const destinationName = isInternalTransfer
    ? getDestinationName({
      ...record,
      DestinationType: destinationType,
    })
    : getDestinationName(record);

  // Destination balance values should preferably come
  // from the destination stock ledger in the GET API.
  const destinationPreviousBalance =
    record.DestinationPreviousBalance ??
    record.ReceiveToPreviousQty ??
    null;

  const destinationFinalBalance =
    record.DestinationNewBalance ??
    record.ReceiveToBalance ??
    (
      destinationPreviousBalance !== null
        ? Number(destinationPreviousBalance) + quantity
        : null
    );

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

        {/* HEADER */}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isInternalTransfer ? (
              <ArrowLeftRight className="h-5 w-5" />
            ) : (
              <Package className="h-5 w-5" />
            )}

            Stock Movement Details
          </DialogTitle>

          <DialogDescription>
            View complete stock movement information.
          </DialogDescription>
        </DialogHeader>

        {/* CONTENT */}

        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[70vh] overflow-hidden">
          <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
            <div className="space-y-6 py-4">

              {/* MOVEMENT TYPE */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 text-sm font-semibold">
                  Movement Type
                </div>

                <p className="text-sm font-semibold text-primary">
                  {movementType === "INTERNAL_TRANSFER"
                    ? "Internal Transfer"
                    : "Inward"}
                </p>
              </div>

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
                    label={
                      isInternalTransfer
                        ? "Issue From Previous Balance"
                        : "Previous Balance"
                    }
                    value={sourcePreviousBalance}
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
                    label={
                      isInternalTransfer
                        ? "Issue From Final Balance"
                        : "Final Balance"
                    }
                    value={sourceFinalBalance}
                    icon={ArrowUp}
                    valueClassName="text-lg font-semibold"
                  />

                  {isInternalTransfer && (
                    <>
                      <DetailCard
                        label="Receive To Previous Balance"
                        value={destinationPreviousBalance}
                        icon={ArrowDown}
                        valueClassName="text-lg font-semibold"
                      />

                      <DetailCard
                        label="Receive To Final Balance"
                        value={destinationFinalBalance}
                        icon={ArrowUp}
                        valueClassName="text-lg font-semibold"
                      />
                    </>
                  )}
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

              {/* SOURCE & DESTINATION DETAILS */}

              <div>
                <SectionHeader
                  icon={MapPin}
                  title={
                    isInternalTransfer
                      ? "Transfer Location Details"
                      : "Destination Details"
                  }
                  description={
                    isInternalTransfer
                      ? "Stock transfer source and receiving destination"
                      : "Selected receiving location or machinery"
                  }
                />

                <div
                  className={`grid grid-cols-1 gap-4 ${isInternalTransfer
                      ? "lg:grid-cols-2"
                      : "sm:grid-cols-2"
                    }`}
                >
                  {/* SOURCE */}

                  {isInternalTransfer && (
                    <StockLocationCard
                      title="Issue From (Source)"
                      type={sourceType}
                      name={sourceName}
                      id={sourceId}
                      previousBalance={sourcePreviousBalance}
                      quantity={quantity}
                      finalBalance={sourceFinalBalance}
                      isSource
                    />
                  )}

                  {/* DESTINATION */}

                  <StockLocationCard
                    title={
                      isInternalTransfer
                        ? "Receive To (Destination)"
                        : "Destination"
                    }
                    type={destinationType}
                    name={destinationName}
                    id={destinationId}
                    previousBalance={
                      isInternalTransfer
                        ? destinationPreviousBalance
                        : null
                    }
                    quantity={quantity}
                    finalBalance={
                      isInternalTransfer
                        ? destinationFinalBalance
                        : null
                    }
                  />
                </div>
              </div>

              {/* PARTICULAR */}

              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 font-semibold">
                  <FileText className="h-4 w-4" />
                  Particular
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