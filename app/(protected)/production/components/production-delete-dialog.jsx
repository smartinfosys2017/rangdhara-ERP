
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

export default function ProductionDeleteDialog({
  open = false,
  onOpenChange,
  closeDialog,
  Production = null,
  selectedCount = 0,
  onConfirm,
  loading = false,
}) {
  const handleClose = () => {
    if (loading) return;

    if (onOpenChange) {
      onOpenChange(false);
    } else {
      closeDialog?.();
    }
  };

  const handleConfirm = () => {
    if (loading || !Production?.id || typeof onConfirm !== "function") {
      return;
    }

    onConfirm();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (loading) return;
        if (!value) handleClose();
      }}
    >
      <DialogContent
        className="sm:max-w-md"
        onEscapeKeyDown={(event) => {
          if (loading) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (loading) event.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </span>
            Delete Production
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this production record?

            <span className="mt-2 block text-destructive">
              This action cannot be undone.
            </span>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleClose}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={loading || !Production?.id}
            onClick={handleConfirm}
          >
            <Trash2 className="mr-2 size-4" />
            {loading ? "Deleting..." : "Delete Record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
