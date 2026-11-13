'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import { apiFetch } from '@/lib/api';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// =======================================================
// TOAST
// =======================================================

function showSuccessToast(message) {
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

        <AlertTitle>
          {message}
        </AlertTitle>
      </Alert>
    ),
    {
      position: 'top-center',
      duration: 4000,
    }
  );
}

function showErrorToast(message) {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close={true}
        className="min-w-[320px] max-w-[500px] shadow-lg"
        onClose={() => {
          toast.dismiss(t);
        }}
      >
        <AlertIcon>
          <RiErrorWarningFill className="size-5" />
        </AlertIcon>

        <AlertTitle>
          {message}
        </AlertTitle>
      </Alert>
    ),
    {
      position: 'top-center',
      duration: 5000,
    }
  );
}

// =======================================================
// COMPONENT
// =======================================================

const ExpenseCategoryDeleteDialog = ({
  open,
  closeDialog,
  expenseCategory,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  // =======================================================
  // DELETE EXPENSE CATEGORY
  // =======================================================

  const handleDelete = async () => {
    if (!expenseCategory?.id) {
      showErrorToast(
        'Invalid expense category ID.'
      );

      return;
    }

    setLoading(true);

    try {
      // =================================================
      // DELETE EXPENSE CATEGORY
      // =================================================

      const response = await apiFetch(
        `/api/finance/expense_category?id=${expenseCategory.id}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      // =================================================
      // ERROR
      // =================================================

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to delete expense category.'
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      showSuccessToast(
        result?.message ||
          'Expense category deleted successfully.'
      );

      // =================================================
      // CLOSE + REFRESH
      // =================================================

      if (onSuccess) {
        await onSuccess();
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'DELETE EXPENSE CATEGORY ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to delete expense category.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !loading) {
          closeDialog();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete Expense Category
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete
            this expense category?
          </DialogDescription>
        </DialogHeader>

        {/* =================================================
            EXPENSE CATEGORY DETAILS
        ================================================= */}

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            Expense Category
          </div>

          <div className="mt-1 font-semibold">
            {expenseCategory?.name || '-'}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            ID: #{expenseCategory?.id || '-'}
          </div>

          {expenseCategory?.description && (
            <div className="mt-3 border-t pt-3">
              <div className="text-xs text-muted-foreground">
                Description
              </div>

              <div className="mt-1 text-sm">
                {expenseCategory.description}
              </div>
            </div>
          )}
        </div>

        {/* =================================================
            WARNING
        ================================================= */}

        <p className="text-sm text-destructive">
          This action cannot be undone.
        </p>

        {/* =================================================
            FOOTER
        ================================================= */}

        <DialogFooter>
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
            onClick={handleDelete}
            disabled={loading}
          >
            {loading
              ? 'Deleting...'
              : 'Delete Expense Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseCategoryDeleteDialog;