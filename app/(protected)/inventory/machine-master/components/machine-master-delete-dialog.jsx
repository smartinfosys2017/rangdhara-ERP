
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

export default function MachineMasterDeleteDialog({
  open,
  closeDialog,
  MachineMaster,
  onConfirm,
  loading = false,
}) {
  const machineNumber = MachineMaster?.machineNumber || "-";
  const machineName = MachineMaster?.machineName || "-";
  const machineCode = MachineMaster?.machineCode || "-";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !loading) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Machine
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this machine?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-4 space-y-2">
          <div>
            <p className="text-xs text-muted-foreground">
              Machine Code
            </p>
            <p className="font-medium break-all">
              {machineCode}
            </p>
          </div>

          <p className="pt-2 text-sm text-muted-foreground">
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
            disabled={loading || !MachineMaster}
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