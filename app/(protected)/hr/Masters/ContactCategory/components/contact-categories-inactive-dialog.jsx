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
import { XCircle } from "lucide-react";

const ContactCategorysInactiveDialog = ({
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
            <XCircle className="size-5 text-red-600" />
            Mark Contact Category Inactive
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to mark{" "}
            <strong className="text-foreground">
              {selectedCount} contact category
              {selectedCount !== 1 ? "s" : ""}
            </strong>{" "}
            as inactive?
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
            <XCircle className="mr-2 size-4" />
            {loading ? "Updating..." : "Mark Inactive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactCategorysInactiveDialog;