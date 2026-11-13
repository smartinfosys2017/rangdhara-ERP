"use client";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircleIcon } from "lucide-react";

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

const ShiftDeleteDialog = ({
  open,
  closeDialog,
  Shift,
  onSuccess,
}) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!Shift?.id) {
        throw new Error("Shift ID is missing.");
      }

      const response = await apiFetch("/api/hr/Shift", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: Shift.id }),
      });

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Failed to delete shift.");
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
            <AlertTitle>Shift deleted successfully.</AlertTitle>
          </Alert>
        ),
        { position: "top-center" }
      );

      closeDialog?.();

      if (typeof onSuccess === "function") {
        await onSuccess(result.data);
      }

      await queryClient.invalidateQueries({
        queryKey: ["shift-shifts"],
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
              {error.message || "Unable to delete shift."}
            </AlertTitle>
          </Alert>
        ),
        { position: "top-center" }
      );
    },
  });

  const isProcessing = mutation.isPending;

  const formatTime = (value) => {
    if (!value) return "-";

    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value));

    if (!match) return String(value);

    const hours = Number(match[1]);
    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;

    return `${displayHour}:${match[2]} ${suffix}`;
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
      <DialogContent showCloseButton={false} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Delete</DialogTitle>
        </DialogHeader>

        <DialogDescription>
          Are you sure you want to delete this shift?
        </DialogDescription>

        <div className="rounded-md border bg-muted/30 p-4">
          <p className="font-medium">
            {Shift?.name
              ? Shift.name.length > 100
                ? `${Shift.name.slice(0, 100)}...`
                : Shift.name
              : "-"}
          </p>

          {/* <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>
              <span className="font-medium">In Time:</span>{" "}
              {formatTime(Shift?.inTime)}
            </p>

            <p>
              <span className="font-medium">Out Time:</span>{" "}
              {formatTime(Shift?.outTime)}
            </p>

            <p>
              <span className="font-medium">Grace Time:</span>{" "}
              {Shift?.graceTime ?? 0} minutes
            </p>

            <p>
              <span className="font-medium">Crosses Midnight:</span>{" "}
              {Shift?.crossesMidnight ? "Yes" : "No"}
            </p>

            <p>
              <span className="font-medium">Status:</span>{" "}
              {Shift?.status ? "Active" : "Inactive"}
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
            disabled={isProcessing || !Shift?.id}
          >
            {isProcessing && (
              <LoaderCircleIcon className="animate-spin" />
            )}
            Delete Shift
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftDeleteDialog;