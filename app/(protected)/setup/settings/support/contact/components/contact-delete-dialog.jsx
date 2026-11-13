"use client";

import { useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";

import { Trash2 } from "lucide-react";

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

const ContactDeleteDialog = ({ open, closeDialog, contact, onSuccess }) => {
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);

  // =====================================================
  // DELETE CONTACT
  // =====================================================

  const handleDelete = async () => {
    if (!contact?.id) {
      toast.error("Contact not found.");
      return;
    }

    try {
      setLoading(true);

      console.log("[CONTACT DELETE] Deleting contact:", contact);

      const response = await apiFetch(
        `/api/settings/support/contact?id=${contact.id}`,
        {
          method: "DELETE",
        },
      );

      const result = await response.json().catch(() => ({}));

      console.log("[CONTACT DELETE] API response:", response.status, result);

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Failed to delete contact.");
      }

      // =================================================
      // SUCCESS
      // =================================================

      toast.success(result?.message || "Contact deleted successfully.");

      // =================================================
      // REFRESH CONTACT LIST
      // =================================================

      await queryClient.invalidateQueries({
        queryKey: ["support-contacts"],
      });

      // =================================================
      // NOTIFICATION
      // =================================================

      console.log("[CONTACT DELETE] Calling onSuccess:", contact);

      if (typeof onSuccess === "function") {
        await onSuccess(contact);
      } else {
        console.warn("[CONTACT DELETE] onSuccess callback missing");
      }

      // =================================================
      // CLOSE
      // =================================================

      closeDialog();
    } catch (error) {
      console.error("[CONTACT DELETE ERROR]:", error);

      toast.error(error?.message || "Failed to delete contact.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) {
      return;
    }

    closeDialog();
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>Delete Contact</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this contact? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        {contact && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold">{contact.name || "-"}</p>

              {contact.email && (
                <p className="text-sm text-muted-foreground">{contact.email}</p>
              )}

              {contact.phone && (
                <p className="text-sm text-muted-foreground">{contact.phone}</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            <Trash2 className="size-4" />

            {loading ? "Deleting..." : "Delete Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactDeleteDialog;
