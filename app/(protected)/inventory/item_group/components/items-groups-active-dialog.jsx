
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
import { CheckCircle } from "lucide-react";

const ItemGroupsActiveDialog = ({
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
            <CheckCircle className="size-5 text-green-600" />
            Mark Item Groups Active
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to mark{" "}
            <strong className="text-foreground">
              {selectedCount} item group
              {selectedCount !== 1 ? "s" : ""}
            </strong>{" "}
            as active?
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
            disabled={loading || selectedCount === 0}
            onClick={onConfirm}
          >
            <CheckCircle className="mr-2 size-4" />
            {loading ? "Updating..." : "Mark Active"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ItemGroupsActiveDialog;
