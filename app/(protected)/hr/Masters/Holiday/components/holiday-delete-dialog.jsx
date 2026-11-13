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

const HolidayDeleteDialog = ({
  open,
  closeDialog,
  Holiday,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!Holiday?.id) {
        throw new Error("Holiday ID is missing.");
      }

      const response = await apiFetch(
        `/api/hr/Holiday/${Holiday.id}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || "Failed to delete holiday."
        );
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
            <AlertTitle>Holiday deleted successfully.</AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        }
      );

      closeDialog?.();

      if (typeof onSuccess === "function") {
        await onSuccess(result.data);
      }

      await queryClient.invalidateQueries({
        queryKey: ["holiday-holidays"],
      });
    },

    onError: (error) => {
      toast.custom(
        () => (
          <Alert variant="mono" icon="destructive" close={false}>
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>
            <AlertTitle>
              {error.message || "Unable to delete holiday."}
            </AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        }
      );
    },
  });

  const isProcessing = mutation.isPending;

  const formatDate = (date) => {
    if (!date) return "-";

    const value = String(date).slice(0, 10);
    const parts = value.split("-");

    if (parts.length !== 3) return value;

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  const handleClose = () => {
    if (isProcessing) return;
    closeDialog?.();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !isProcessing) {
          handleClose();
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
        </DialogHeader>

        <DialogDescription>
          Are you sure you want to delete this holiday?
        </DialogDescription>

        <div className="rounded-md border bg-muted/30 p-4">
          <p className="font-medium">
            {Holiday?.name
              ? Holiday.name.length > 100
                ? `${Holiday.name.slice(0, 100)}...`
                : Holiday.name
              : "-"}
          </p>

          {/* <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-medium">From:</span>{" "}
              {formatDate(Holiday?.fromDate)}
            </p>

            <p>
              <span className="font-medium">To:</span>{" "}
              {formatDate(Holiday?.toDate)}
            </p>
          </div> */}

          <p className="mt-3 text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={() => mutation.mutate()}
            disabled={isProcessing || !Holiday?.id}
          >
            {isProcessing && (
              <LoaderCircleIcon className="animate-spin" />
            )}
            Delete Holiday
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HolidayDeleteDialog;