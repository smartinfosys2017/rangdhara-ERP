"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoaderCircleIcon, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BreakTimeDeleteDialog({
  BreakTime,
  open,
  onOpenChange,
}) {
  const queryClient = useQueryClient();
  const [internalOpen, setInternalOpen] = useState(false);

  const isControlled = typeof open === "boolean";
  const dialogOpen = isControlled ? open : internalOpen;

  const setDialogOpen = (value) => {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!BreakTime?.id) {
        throw new Error("Break time ID is required.");
      }

      const response = await fetch("/api/hr/BreakTime", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: BreakTime.id,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(
          result?.message || "Failed to delete break time."
        );
      }

      return result;
    },

    onSuccess: (result) => {
      toast.success(
        result?.message || "Break time deleted successfully."
      );

      queryClient.invalidateQueries({
        queryKey: ["break-time-break-times"],
      });

      // Close popup after successful API response
      setDialogOpen(false);
    },

    onError: (error) => {
      toast.error(error?.message || "Failed to delete break time.");
    },

    onError: (error) => {
      toast.error(error?.message || "Failed to delete break time.");
    },
  });

  const handleDelete = (event) => {
    event.preventDefault();
    deleteMutation.mutate();
  };

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Break Time
          </AlertDialogTitle>

          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {BreakTime?.name || "this break time"}
            </span>
            ? This action will deactivate the break time.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* {BreakTime && (
          <div className="space-y-3 rounded-md border p-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Time</span>
              <span>
                {BreakTime.fromTime || "--:--"} -{" "}
                {BreakTime.toTime || "--:--"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Break Type</span>
              <span className="capitalize">
                {BreakTime.breakType || "—"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Duration</span>
              <span>
                {BreakTime.durationMinutes != null
                  ? `${BreakTime.durationMinutes} minutes`
                  : "—"}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Flexible Break</span>
              <span>{BreakTime.isFlexible ? "Yes" : "No"}</span>
            </div>
          </div>
        )} */}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>

          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending || !BreakTime?.id}
          >
            {deleteMutation.isPending ? (
              <>
                <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}