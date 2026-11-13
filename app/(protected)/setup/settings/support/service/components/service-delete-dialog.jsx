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

const showSuccessToast = (
  message
) => {
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

const showErrorToast = (
  message
) => {
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
// DELETE DIALOG
// =======================================================

const ServiceDeleteDialog = ({
  open,
  closeDialog,
  service,
  onSuccess,
}) => {
  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async () => {
    if (!service?.id) {
      showErrorToast(
        'Invalid service.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          `/api/settings/support/service?id=${service.id}`,
          {
            method: 'DELETE',
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to delete service.'
        );
      }

      showSuccessToast(
        result?.message ||
          'Service deleted successfully.'
      );

      if (onSuccess) {
        onSuccess();
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'DELETE SERVICE ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to delete service.'
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
          closeDialog();
        }
      }}
    >
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            Delete Service
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete
            this service? This action cannot
            be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            Service
          </div>

          <div className="mt-1 font-semibold">
            {service?.name || '-'}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            ID: #{service?.id}
          </div>
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
            onClick={handleDelete}
            disabled={loading}
          >
            {loading
              ? 'Deleting...'
              : 'Delete Service'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceDeleteDialog;