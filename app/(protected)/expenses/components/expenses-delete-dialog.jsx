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

export default function ExpensesDeleteDialog({
  open,
  closeDialog,
  Expenses,
  onConfirm,
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
          <DialogTitle className="flex Expenses-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Expenses
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this Expenses?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-4">
          <p className="font-medium">{Expenses?.description || "-"}</p>

          <p className="mt-1 text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"

            variant="outline"

            onClick={closeDialog}
          >
            Cancel
          </Button>

          <Button
            type="button"

            variant="destructive"

            onClick={() => {
              onConfirm?.();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
