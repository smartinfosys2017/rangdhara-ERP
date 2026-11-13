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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// =======================================================
// FORMAT DATE
// =======================================================

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// =======================================================
// FORMAT DATE ONLY
// =======================================================

const formatDateOnly = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

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

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-[90vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>
            Issue/Receipt Details
          </DialogTitle>

          <DialogDescription>
            View complete Issue/Receipt information.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[60vh] overflow-hidden">
        <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
          <div className="space-y-6 py-4">
            {/* ===================================================== */}
            {/* ITEM DETAILS */}
            {/* ===================================================== */}

            <div>
              <div className="mb-4 flex items-center gap-2 border-b pb-3">
                <Package className="h-5 w-5" />

                <div>
                  <h3 className="text-sm font-semibold">Item Details</h3>

                  <p className="text-xs text-muted-foreground">
                    Item and transaction information
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* ITEM GROUP */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Item Group
                  </div>

                  <p className="break-words text-sm font-medium">
                    {displayValue(
                      IssueReceipt.ItemGroup?.groupName ||
                      IssueReceipt.ItemGroup?.name ||
                      IssueReceipt.groupName ||
                      IssueReceipt.ItemGroupid,
                    )}
                  </p>
                </div>

                {/* ITEM MASTER */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Item Master
                  </div>

                  <p className="break-words text-sm font-medium">
                    {displayValue(
                      IssueReceipt.ItemMaster?.itemName ||
                      IssueReceipt.ItemMaster?.name ||
                      IssueReceipt.itemName ||
                      IssueReceipt.ItemMasterid,
                    )}
                  </p>
                </div>

                {/* ITEM TYPE */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Item Type
                  </div>

                  <p className="break-words text-sm font-medium">
                    {displayValue(
                      IssueReceipt.ItemType?.name ||
                      IssueReceipt.ItemType?.typeName ||
                      IssueReceipt.itemTypeName ||
                      IssueReceipt.ItemTypeid,
                    )}
                  </p>
                </div>

                {/* TRANSACTION TYPE */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 text-xs font-medium text-muted-foreground">
                    Transaction Type
                  </div>

                  <p className="break-words text-sm font-medium">
                    {displayValue(
                      IssueReceipt.TransactionType?.name ||
                      IssueReceipt.TransactionType?.transactionName ||
                      IssueReceipt.transactionTypeName ||
                      IssueReceipt.TransactionTypeid,
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ===================================================== */}
            {/* STOCK / QUANTITY DETAILS */}
            {/* ===================================================== */}

            <div>
              <div className="mb-4 flex items-center gap-2 border-b pb-3">
                <ClipboardList className="h-5 w-5" />

                <div>
                  <h3 className="text-sm font-semibold">
                    Stock & Quantity Details
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Balance, quantity and pricing information
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* PREVIOUS BALANCE */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <ArrowDown className="h-4 w-4" />
                    Previous Balance
                  </div>

                  <p className="text-lg font-semibold">
                    {displayValue(IssueReceipt.PreviousBalance)}
                  </p>
                </div>

                {/* QUANTITY */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Hash className="h-4 w-4" />
                    Quantity
                  </div>

                  <p className="text-lg font-semibold">
                    {displayValue(IssueReceipt.Qty)}
                  </p>
                </div>

                {/* PRICE */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <IndianRupee className="h-4 w-4" />
                    Price
                  </div>

                  <p className="text-lg font-semibold">
                    {IssueReceipt.Price !== null &&
                      IssueReceipt.Price !== undefined &&
                      IssueReceipt.Price !== ""
                      ? `₹${IssueReceipt.Price}`
                      : "-"}
                  </p>
                </div>

                {/* BALANCE */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <ArrowUp className="h-4 w-4" />
                    Balance
                  </div>

                  <p className="text-lg font-semibold">
                    {displayValue(IssueReceipt.Balance)}
                  </p>
                </div>
              </div>
            </div>

            {/* ===================================================== */}
            {/* DATE DETAILS */}
            {/* ===================================================== */}

            <div>
              <div className="mb-4 flex items-center gap-2 border-b pb-3">
                <Calendar className="h-5 w-5" />

                <div>
                  <h3 className="text-sm font-semibold">Date Details</h3>

                  <p className="text-xs text-muted-foreground">
                    Issue and receiving dates
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* ISSUE DATE */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Issue Date
                  </div>

                  <p className="text-sm">
                    {formatDateOnly(IssueReceipt.IssueDate)}
                  </p>
                </div>

                {/* DATE OF RECEIVE */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Date Of Receive
                  </div>

                  <p className="text-sm">
                    {formatDateOnly(IssueReceipt.DateOfRecive)}
                  </p>
                </div>
              </div>
            </div>

            {/* ===================================================== */}
            {/* ISSUE & RECEIVE DETAILS */}
            {/* ===================================================== */}

            <div>
              <div className="mb-4 flex items-center gap-2 border-b pb-3">
                <User className="h-5 w-5" />

                <div>
                  <h3 className="text-sm font-semibold">
                    Issue & Receive Details
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Issue and receiving information
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* ISSUE BY */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <User className="h-4 w-4" />
                    Issue By
                  </div>

                  <p className="break-all text-sm">
                    {displayValue(
                      IssueReceipt.IssueBy?.name ||
                      IssueReceipt.IssueBy?.username ||
                      IssueReceipt.issueByName ||
                      IssueReceipt.Issue_by,
                    )}
                  </p>
                </div>

                {/* Gate Pass NO */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Receipt className="h-4 w-4" />
                    Gate Pass No
                  </div>

                  <p className="text-sm">
                    {displayValue(IssueReceipt.GetPassNo)}
                  </p>
                </div>

                {/* RECEIPT CHALLAN NO */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <FileText className="h-4 w-4" />
                    Receipt Challan No
                  </div>

                  <p className="text-sm">
                    {displayValue(IssueReceipt.ReciptChallanNo)}
                  </p>
                </div>

                {/* RECEIVED BY */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <User className="h-4 w-4" />
                    Received By
                  </div>

                  <p className="break-all text-sm">
                    {displayValue(
                      IssueReceipt.ReceivedBy?.name ||
                      IssueReceipt.ReceivedBy?.username ||
                      IssueReceipt.receivedByName ||
                      IssueReceipt.RecivedBy,
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* ===================================================== */}
            {/* PARTICULAR */}
            {/* ===================================================== */}

            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4" />
                Particuler
              </div>

              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {displayValue(IssueReceipt.Particuler)}
              </p>
            </div>

            {/* ===================================================== */}
            {/* COMMENT */}
            {/* ===================================================== */}

            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <MessageSquare className="h-4 w-4" />
                Comment
              </div>

              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {displayValue(IssueReceipt.Comment)}
              </p>
            </div>

            {/* ===================================================== */}
            {/* SYSTEM DETAILS */}
            {/* ===================================================== */}

            <div>
              <div className="mb-4 flex items-center gap-2 border-b pb-3">
                <FileText className="h-5 w-5" />

                <div>
                  <h3 className="text-sm font-semibold">System Details</h3>

                  <p className="text-xs text-muted-foreground">
                    Record information
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* CREATED */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Created At
                  </div>

                  <p className="text-sm">{formatDate(IssueReceipt.createdAt)}</p>
                </div>

                {/* UPDATED */}

                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2 font-semibold">
                    <Calendar className="h-4 w-4" />
                    Updated At
                  </div>

                  <p className="text-sm">{formatDate(IssueReceipt.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* ===================================================== */}
            {/* ID */}
            {/* ===================================================== */}

            <div className="rounded-lg border p-4">
              <div className="mb-2 font-semibold">ID</div>

              <p className="break-all text-sm text-muted-foreground">
                {displayValue(IssueReceipt.id)}
              </p>
            </div>
          </div>
        </DialogBody>
        </ScrollArea>
        {/* ===================================================== */}
        {/* FOOTER */}
        {/* ===================================================== */}

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
