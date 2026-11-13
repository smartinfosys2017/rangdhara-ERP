"use client";

import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const EmailTemplateDelete = ({
  open = false,
  item = null,
  closeDialog,
  onConfirm,
  loading = false,
}) => {
  const handleClose = () => {
    if (loading) {
      return;
    }

    closeDialog?.();
  };

  const handleConfirm = async () => {
    if (!item?.id || loading) {
      return;
    }

    await onConfirm?.(item);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>

            <AlertDialogTitle>Delete Email Template?</AlertDialogTitle>
          </div>

          <AlertDialogDescription className="pt-2">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {item?.name || "this email template"}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} onClick={handleClose}>
            Cancel
          </AlertDialogCancel>

          <AlertDialogAction
            variant="destructive"
            disabled={loading || !item?.id}
            onClick={(event) => {
              event.preventDefault();
              handleConfirm();
            }}
          >
            {loading ? (
              <>
                <Loader2 className="me-2 size-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="me-2 size-4" />
                Delete
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default EmailTemplateDelete;