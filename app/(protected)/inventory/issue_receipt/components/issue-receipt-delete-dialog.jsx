"use client";

import { Calendar, FileText, Package, Receipt, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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

export default function IssueReceiptDeleteDialog({
  open,
  closeDialog,
  IssueReceipt,
  onConfirm,
  loading = false,
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Issue/Receipt
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this Issue/Receipt?
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[60vh] overflow-hidden">
        <DialogBody>
        <div className="space-y-4 rounded-md border bg-muted/30 p-4">
          {/* ITEM DETAILS */}
          {/* 
          <div className="flex items-start gap-3">
            <Package className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Item Group
              </p>

              <p className="break-words font-medium">
                {displayValue(
                  IssueReceipt?.ItemGroup?.groupName ||
                    IssueReceipt?.ItemGroup?.name ||
                    IssueReceipt?.groupName ||
                    IssueReceipt?.ItemGroupid,
                )}
              </p>
            </div>
          </div> */}

          {/* ITEM MASTER */}
          {/* <pre className="whitespace-pre-wrap break-words text-xs">
                {JSON.stringify(IssueReceipt, null, 2)}
              </pre>*/}
              {/* Item Master */}
            <div className="flex min-w-0 items-start gap-3">
              <Package className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Item Master
                </p>
                <p className="break-words font-medium">
                  {displayValue(
                    IssueReceipt?.ItemMasterName || IssueReceipt?.ItemMasterid
                  )}
                </p>
              </div>
            </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            

            {/* Quantity */}
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Quantity</p>
              <p className="mt-1 break-words font-medium">
                {displayValue(IssueReceipt?.Qty)}
              </p>
            </div>

            {/* Price */}
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Price</p>
              <p className="mt-1 break-words font-medium">
                {displayValue(IssueReceipt?.Price)}
              </p>
            </div>

            {/* Transaction */}
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Transaction</p>
              <p className="mt-1 break-words font-medium">
                {displayValue(IssueReceipt?.TransactionTypeName)}
              </p>
            </div>

            {/* Balance */}
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Balance</p>
              <p className="mt-1 break-words font-medium">
                {displayValue(IssueReceipt?.Balance)}
              </p>
            </div>
          </div>

          {/* QUANTITY / PRICE */}
          {/* 
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Quantity
              </p>

              <p className="mt-1 font-medium">
                {displayValue(IssueReceipt?.Qty)}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">Price</p>

              <p className="mt-1 font-medium">
                {IssueReceipt?.Price !== null &&
                IssueReceipt?.Price !== undefined &&
                IssueReceipt?.Price !== ""
                  ? `₹${IssueReceipt.Price}`
                  : "-"}
              </p>
            </div>
          </div> */}

          {/* ISSUE DATE / CHALLAN */}

          {/* <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0" />

              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Issue Date
                </p>

                <p className="mt-1 text-sm">
                  {formatDate(IssueReceipt?.IssueDate)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Receipt className="mt-0.5 h-4 w-4 shrink-0" />

              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Challan No
                </p>

                <p className="mt-1 break-words text-sm">
                  {displayValue(IssueReceipt?.ReciptChallanNo)}
                </p>
              </div>
            </div>
          </div> */}

          {/* PARTICULAR */}

          {/* {IssueReceipt?.Particuler && (
            <div className="border-t pt-4">
              <div className="mb-1 flex items-center gap-2">
                <FileText className="h-4 w-4" />

                <p className="text-xs font-medium text-muted-foreground">
                  Particuler
                </p>
              </div>

              <p className="whitespace-pre-wrap text-sm">
                {IssueReceipt.Particuler}
              </p>
            </div>
          )} */}

          {/* WARNING */}

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </div>
        </div>
          </DialogBody>
          </ScrollArea>
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
            onClick={() => {
              onConfirm?.();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />

            {loading ? "Deleting..." : "Delete Issue/Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
