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

export default function ProductTypeDeleteDialog({
  open,

  closeDialog,

  ProductType,

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
            Delete Item Type
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this Item Type?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-4">
          <p className="font-medium"> {ProductType?.ProductType ? ProductType.ProductType.length > 100 ? `${ProductType.ProductType.slice(0, 100)}...` : ProductType.ProductType : "-"} </p>
          
          {/* {ProductType?.Description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {ProductType.Description}
            </p>
          )} */}

          {/* <div className="mt-3 text-sm text-muted-foreground">
            <p>Status: {ProductType?.status ? "Active" : "Inactive"}</p>

            <p>Default: {ProductType?.isDefault ? "Yes" : "No"}</p>
          </div> */}

          <p className="mt-3 text-sm text-muted-foreground">
            This action will soft delete the Item Type.
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
            <Trash2 className="mr-2 h-4 w-4" />

            {loading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
