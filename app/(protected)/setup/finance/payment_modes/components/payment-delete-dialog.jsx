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

const PaymentMethodDeleteDialog = ({
  open,
  closeDialog,
  payment,
  onSuccess,
}) => {
  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // DELETE PAYMENT METHOD
  // =====================================================

  const handleDelete = async () => {
    if (!payment?.id) {
      showErrorToast(
        'Invalid payment method ID.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          `/api/finance/payment_modes?id=${payment.id}`,
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
            'Failed to delete payment method.'
        );
      }

      showSuccessToast(
        result?.message ||
          'Payment method deleted successfully.'
      );

      if (onSuccess) {
        await onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'DELETE PAYMENT METHOD ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to delete payment method.'
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete Payment Method
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this payment method?
          </DialogDescription>
        </DialogHeader>

        {/* PAYMENT INFORMATION */}

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            Payment Method
          </div>

          <div className="mt-1 font-semibold">
            {payment?.name || '-'}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            ID: #{payment?.id || '-'}
          </div>

          {payment?.description && (
            <div className="mt-2 text-sm text-muted-foreground">
              {payment.description}
            </div>
          )}
        </div>

        {/* WARNING */}

        <p className="text-sm text-destructive">
          This action cannot be undone.
        </p>

        {/* FOOTER */}

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
              : 'Delete Payment Method'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodDeleteDialog;