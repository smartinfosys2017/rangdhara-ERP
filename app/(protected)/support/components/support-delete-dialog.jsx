"use client";

import { useState } from "react";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { toast } from "sonner";

import { apiFetch } from "@/lib/api";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

// =======================================================
// SUCCESS TOAST
// =======================================================

const showSuccessToast = (message) => {
  toast.custom(
    () => (
      <Alert
        variant="mono"
        icon="success"
        className="min-w-[320px] max-w-[500px] shadow-lg"
      >
        <AlertIcon>
          <RiCheckboxCircleFill className="size-5" />
        </AlertIcon>

        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    {
      position: "top-center",
      duration: 4000,
    },
  );
};

// =======================================================
// ERROR TOAST
// =======================================================

const showErrorToast = (message) => {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close
        className="min-w-[320px] max-w-[500px] shadow-lg"
        onClose={() => toast.dismiss(t)}
      >
        <AlertIcon>
          <RiErrorWarningFill className="size-5" />
        </AlertIcon>

        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    {
      position: "top-center",
      duration: 5000,
    },
  );
};

// =======================================================
// DELETE SUPPORT TICKET DIALOG
// =======================================================

const SupportDeleteDialog = ({ open, closeDialog, support, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  // =====================================================
  // DELETE TICKET
  // =====================================================

  const handleDelete = async () => {
    if (!support?.id) {
      showErrorToast("Invalid ticket ID.");
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch(`/api/support?id=${Number(support.id)}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to delete ticket.");
      }

      showSuccessToast(result?.message || "Ticket deleted successfully.");

      // Refresh list
      if (onSuccess) {
        await onSuccess();
      }

      // Close dialog
      closeDialog?.();
    } catch (error) {
      console.error("DELETE /api/support ERROR:", error);

      showErrorToast(error?.message || "Failed to delete ticket.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !loading) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent className="sm:max-w-[450px]">
        {/* =================================================
            HEADER
        ================================================= */}

        <DialogHeader>
          <DialogTitle>Delete Ticket</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this ticket? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        {/* =================================================
            TICKET INFORMATION
        ================================================= */}

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">Ticket</div>

          {/* Subject */}
          <div className="mt-1 font-semibold">{support?.subject || "-"}</div>

          {/* Ticket Number */}
          {support?.ticketNumber && (
            <div className="mt-1 text-xs text-muted-foreground">
              Ticket Number: {support.ticketNumber}
            </div>
          )}

          {/* ID */}
          <div className="mt-1 text-xs text-muted-foreground">
            ID: #{support?.id || "-"}
          </div>

          {/* Contact */}
          {support?.name && (
            <div className="mt-1 text-xs text-muted-foreground">
              Contact: {support.name}
            </div>
          )}

          {/* Email */}
          {support?.email && (
            <div className="mt-1 text-xs text-muted-foreground">
              Email: {support.email}
            </div>
          )}

          {/* Status */}
          {support?.status && (
            <div className="mt-1 text-xs text-muted-foreground">
              Status: {support.status}
            </div>
          )}

          {/* Priority */}
          {support?.priority !== undefined && support?.priority !== null && (
            <div className="mt-1 text-xs text-muted-foreground">
              Priority: {support.priority}
            </div>
          )}

          {/* Message */}
          {support?.message && (
            <div className="mt-2 line-clamp-3 text-sm text-muted-foreground">
              {support.message}
            </div>
          )}
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <DialogFooter>
          {/* Cancel */}
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
            disabled={loading}
          >
            Cancel
          </Button>

          {/* Delete */}
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupportDeleteDialog;
