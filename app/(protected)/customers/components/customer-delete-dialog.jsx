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
// DELETE CUSTOMER DIALOG
// =======================================================

const CustomerDeleteDialog = ({
  open,
  closeDialog,
  customer,
  onSuccess,
}) => {
  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // DELETE CUSTOMER
  // =====================================================

  const handleDelete = async () => {
    if (!customer?.id) {
      showErrorToast(
        'Invalid customer.'
      );

      return;
    }

    try {
      setLoading(true);

      /*
      |--------------------------------------------------------------------------
      | DELETE CUSTOMER
      |--------------------------------------------------------------------------
      |
      | Your API DELETE route expects:
      |
      | {
      |   id: customer.id
      | }
      |
      */

      const response =
        await apiFetch(
          '/api/customers',
          {
            method: 'DELETE',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: customer.id,
            }),
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      /*
      |--------------------------------------------------------------------------
      | ERROR
      |--------------------------------------------------------------------------
      */

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to delete customer.'
        );
      }

      /*
      |--------------------------------------------------------------------------
      | SUCCESS
      |--------------------------------------------------------------------------
      */

      showSuccessToast(
        result?.message ||
          'Customer deleted successfully.'
      );

      /*
      |--------------------------------------------------------------------------
      | Refresh Customer List
      |--------------------------------------------------------------------------
      */

      if (onSuccess) {
        onSuccess();
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'DELETE CUSTOMER ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to delete customer.'
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

          <div className="mt-1 font-semibold">
            {customer?.company || '-'}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            ID: #{customer?.id}
          </div>

          {customer?.phone && (
            <div className="mt-1 text-xs text-muted-foreground">
              Phone: {customer.phone}
            </div>
          )}

          {customer?.website && (
            <div className="mt-1 text-xs text-muted-foreground">
              Website: {customer.website}
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

export default CustomerDeleteDialog;