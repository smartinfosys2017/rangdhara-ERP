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

export default function QuestionnaireCategoryDeleteDialog({
  open,

  closeDialog,

  QuestionnaireCategory,

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
            Delete Questionnaire Category
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this questionnaire categorys?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/30 p-4">
          <p className="font-medium"> {QuestionnaireCategory?.categoryName? QuestionnaireCategory.categoryName.length > 100? `${QuestionnaireCategory.categoryName.slice(0, 100)}...`: QuestionnaireCategory.categoryName: "-"} </p>

          {/* {QuestionnaireCategory?.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {QuestionnaireCategory.description}
            </p>
          )} */}

          <p className="mt-2 text-sm text-muted-foreground">
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
