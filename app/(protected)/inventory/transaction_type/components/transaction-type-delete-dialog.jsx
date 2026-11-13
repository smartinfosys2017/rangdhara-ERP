"use client";

import { Trash2, PlusCircle, MinusCircle } from "lucide-react";

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

export default function TransactionTypeDeleteDialog({
  open,

  closeDialog,

  TransactionType,

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            className="
            flex
            items-center
            gap-2
            text-destructive
            "
          >
            <Trash2 className="h-5 w-5" />
            Delete Transaction Type
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this transaction type?
          </DialogDescription>
        </DialogHeader>

        <div
          className="
          rounded-md
          border
          bg-muted/30
          p-4
          space-y-3
          "
        >
          {/* NAME */}

          <div>
            <p className="font-medium"> {TransactionType?.TransactionType ? TransactionType.TransactionType.length > 100 ? `${TransactionType.TransactionType.slice(0, 100)}...` : TransactionType.TransactionType : "-"} </p>
          </div>

          {/* DESCRIPTION */}

          {/* {TransactionType?.Description && (
            <p
              className="
              text-sm
              text-muted-foreground
              "
            >
              {TransactionType.Description}
            </p>
          )} */}

          {/* EFFECT */}

          {/* <div
            className="
            flex
            items-center
            gap-2
            text-sm
            "
          >
            {TransactionType?.EffectOnTransaction === "addition" ? (
              <PlusCircle
                className="
                h-4
                w-4
                text-green-600
                "
              />
            ) : (
              <MinusCircle
                className="
                h-4
                w-4
                text-red-600
                "
              />
            )}

            <span className="capitalize">
              {TransactionType?.EffectOnTransaction || "-"}
            </span>
          </div> */}

          <p
            className="
            text-sm
            text-muted-foreground
            "
          >
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

            onClick={() => {
              onConfirm?.();
            }}
          >
            <Trash2
              className="
              mr-2
              h-4
              w-4
              "
            />

            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
