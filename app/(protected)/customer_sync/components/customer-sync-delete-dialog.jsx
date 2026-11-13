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
        onClose={() => toast.dismiss(t)}
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
// DELETE CustomerSync DIALOG
// =======================================================

const CustomerSyncDeleteDialog = ({
  open,
  closeDialog,
  CustomerSync,
  onSuccess,
}) => {
  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // DELETE CustomerSync
  // =====================================================

  const handleDelete = async () => {
    if (!CustomerSync?.id) {
      showErrorToast(
        'Invalid CustomerSync.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/CustomerSync',
          {
            method: 'DELETE',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: CustomerSync.id,
            }),
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            result?.error ||
            'Failed to delete CustomerSync.'
        );
      }

      showSuccessToast(
        result?.message ||
          'CustomerSync deleted successfully.'
      );

      if (onSuccess) {
        onSuccess();
      }

      closeDialog?.();

    } catch (error) {
      console.error(
        'DELETE CustomerSync ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to delete CustomerSync.'
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
            Delete Customer
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to
            delete this customer? This
            action cannot be undone.
          </DialogDescription>

        </DialogHeader>

        {/* =================================================
            CUSTOMER INFORMATION
        ================================================= */}

        <div className="rounded-lg border bg-muted/30 p-4">

          <div className="text-sm text-muted-foreground">
            Customer
          </div>

          {/* NAME */}

          <div className="mt-1 font-semibold">
            {CustomerSync?.name || '-'}
          </div>

          {/* EMAIL */}

          {CustomerSync?.email && (
            <div className="mt-1 text-sm text-muted-foreground">
              {CustomerSync.email}
            </div>
          )}

          {/* PHONE */}

          {CustomerSync?.phone && (
            <div className="mt-1 text-sm text-muted-foreground">
              {CustomerSync.phone}
            </div>
          )}

          {/* ID */}

          <div className="mt-2 text-xs text-muted-foreground">
            ID: {CustomerSync?.id || '-'}
          </div>

          {/* LAST SYNCED */}

          {CustomerSync?.lastSyncedAt && (
            <div className="mt-1 text-xs text-muted-foreground">
              Last Synced:{' '}
              {new Date(
                CustomerSync.lastSyncedAt
              ).toLocaleString()}
            </div>
          )}

        </div>

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
              : 'Delete Customer'}
          </Button>

        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
};

export default CustomerSyncDeleteDialog;