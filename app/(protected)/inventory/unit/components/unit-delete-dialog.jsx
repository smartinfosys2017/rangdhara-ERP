"use client";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { LoaderCircleIcon } from "lucide-react";

const UnitDeleteDialog = ({ open, closeDialog, Unit, onSuccess }) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!Unit?.id) {
        throw new Error("Unit ID is missing.");
      }

      const response = await apiFetch(`/api/inventory/unit/${Unit.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Failed to delete Unit.");
      }

      return result;
    },

    onSuccess: async (result) => {
      toast.custom(
        () => (
          <Alert variant="mono" icon="success" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Unit deleted successfully.</AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );

      closeDialog?.();

      if (typeof onSuccess === "function") {
        await onSuccess(result.data);
      }

      await queryClient.invalidateQueries({
        queryKey: ["unit-units"],
      });
    },

    onError: (error) => {
      toast.custom(
        () => (
          <Alert variant="mono" icon="destructive" close={false}>
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>
            <AlertTitle>{error.message || "Unable to delete Unit."}</AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );
    },
  });

  const isProcessing = mutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !isProcessing) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
        </DialogHeader>

        <DialogDescription>
          Are you sure you want to delete this Unit?
        </DialogDescription>

        <div className="rounded-md border bg-muted/30 p-4">
          <p className="font-medium">
            {Unit?.unitName
              ? Unit.unitName.length > 100
                ? `${Unit.unitName.slice(0, 100)}...`
                : Unit.unitName
              : "-"}
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
            disabled={isProcessing}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={isProcessing || !Unit?.id}
          >
            {isProcessing && <LoaderCircleIcon className="animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnitDeleteDialog;