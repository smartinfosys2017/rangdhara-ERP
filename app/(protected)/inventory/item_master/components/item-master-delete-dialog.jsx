"use client";

import { Trash2, Package } from "lucide-react";

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

export default function ItemMasterDeleteDialog({
  open,
  closeDialog,
  ItemMaster,
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
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Item
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this inventory item?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-4">
           <p className="font-medium"> {ItemMaster?.ItemName? ItemMaster?.ItemName.length > 100? `${ItemMaster?.ItemName.slice(0, 100)}...`: ItemMaster?.ItemName: "-"} </p>
          {/* {ItemMaster?.Description && (
            <p className="mt-2 text-sm text-muted-foreground">
              {ItemMaster.Description}
            </p>
          )}

          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
            {ItemMaster?.id && (
              <p className="break-all">ID : {ItemMaster.id}</p>
            )}
          </div> */}

          <p className="mt-3 text-sm text-muted-foreground">
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
            onClick={() => onConfirm?.()}
          >
            <Trash2 className="mr-2 h-4 w-4" />

            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
