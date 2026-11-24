
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const ProductionDeleteDialog = ({
  open = false,
  onOpenChange,
  selectedCount = 0,
  loading = false,
  onConfirm,
}) => {
  const count = Math.max(0, Number(selectedCount) || 0);
  const isDisabled = loading || count === 0;

  const handleOpenChange = (nextOpen) => {
    if (loading) return;
    onOpenChange?.(nextOpen);
  };

  const handleConfirm = () => {
    if (isDisabled || typeof onConfirm !== "function") return;
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
            Are you sure you want to delete{" "}
            <strong className="font-semibold text-foreground">
              {count} production {count === 1 ? "record" : "records"}
            </strong>
            ?

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
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={isDisabled}
            onClick={handleConfirm}
          >
            <Trash2 className="mr-2 size-4" />
            {loading ? "Deleting..." : "Delete Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductionDeleteDialog;
