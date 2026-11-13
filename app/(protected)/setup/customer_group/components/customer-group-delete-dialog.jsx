'use client';

import { useState } from 'react';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import { toast } from 'sonner';

import { apiFetch } from '@/lib/api';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

// =======================================================
// TOAST
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
};

const showErrorToast = (message) => {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close
        className="min-w-[320px] max-w-[500px] shadow-lg"
        onClose={() =>
          toast.dismiss(t)
        }
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
};

// =======================================================
// DELETE CUSTOMER GROUP DIALOG
// =======================================================

const CustomerGroupDeleteDialog = ({
  open,
  closeDialog,
  customerGroup,
  onSuccess,
}) => {
  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // DELETE CUSTOMER GROUP
  // =====================================================

  const handleDelete = async () => {
    if (!customerGroup?.id) {
      showErrorToast(
        'Customer group ID is required.'
      );

      return;
    }

    try {
      setLoading(true);

      // =================================================
      // DELETE API
      // =================================================

      const params = new URLSearchParams({
        id: String(customerGroup.id),
      });

      const response =
        await apiFetch(
          `/api/customer_group?${params.toString()}`,
          {
            method: 'DELETE',
          }
        );

      // =================================================
      // RESPONSE
      // =================================================

      const result =
        await response
          .json()
          .catch(() => ({}));

      // =================================================
      // ERROR
      // =================================================

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to delete customer group.'
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      showSuccessToast(
        result?.message ||
          'Customer group deleted successfully.'
      );

      // =================================================
      // SUCCESS CALLBACK
      // =================================================

      if (onSuccess) {
        onSuccess();
      } else {
        closeDialog?.();
      }
    } catch (error) {
      console.error(
        'DELETE CUSTOMER GROUP ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to delete customer group.'
      );
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
        <DialogHeader>
          <DialogTitle>
            Delete Customer Group
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to
            delete this customer group?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* =================================================
            CUSTOMER GROUP INFORMATION
        ================================================= */}

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            Customer Group
          </div>

          <div className="mt-1 font-semibold">
            {customerGroup?.name || '-'}
          </div>

          {customerGroup?.id && (
            <div className="mt-1 break-all text-xs text-muted-foreground">
              ID: {customerGroup.id}
            </div>
          )}

          {customerGroup?.createdAt && (
            <div className="mt-1 text-xs text-muted-foreground">
              Created:{' '}
              {new Date(
                customerGroup.createdAt
              ).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

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
            onClick={handleDelete}
            disabled={loading}
          >
            {loading
              ? 'Deleting...'
              : 'Delete Customer Group'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerGroupDeleteDialog;