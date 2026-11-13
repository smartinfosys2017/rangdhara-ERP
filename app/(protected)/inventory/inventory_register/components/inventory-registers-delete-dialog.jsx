
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

const InventoryRregistersDeleteDialog = ({
  open,
  onOpenChange,
  selectedCount = 0,
  loading = false,
  onConfirm,
}) => {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!loading) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-full bg-destructive/10">
              <Trash2 className="size-5 text-destructive" />
            </span>
            Delete Inventory Rregister
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete{" "}
            <strong className="text-foreground">
              {selectedCount} inventory rregister
              {selectedCount !== 1 ? "s" : ""}
            </strong>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            disabled={loading || selectedCount === 0}
            onClick={onConfirm}
          >
            <Trash2 className="mr-2 size-4" />
            {loading ? "Deleting..." : "Delete Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryRregistersDeleteDialog;
