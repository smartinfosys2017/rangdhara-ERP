"use client";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProjectDeleteDialog({
  open,

  closeDialog,

  project,

  onSuccess,
}) {
  if (!project) {
    return null;
  }

  const handleDelete = () => {
    console.log("DELETE PROJECT", project);

    toast.success("Project deleted successfully");

    onSuccess?.(project);

    closeDialog();
  };

  return (
    <Dialog
      open={open}

      onOpenChange={(value) => {
        if (!value) {
          closeDialog();
        }
      }}
    >
      <DialogContent
        className="
max-w-md
"
      >
        <DialogHeader>
          <DialogTitle>Delete Project</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this project?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="font-medium">{project.projectName}</p>

          <p className="text-sm text-muted-foreground">
            This action cannot be undone.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"

            onClick={closeDialog}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"

            onClick={handleDelete}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
