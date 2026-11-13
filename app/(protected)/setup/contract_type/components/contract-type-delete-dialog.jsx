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

const ContractTypeDeleteDialog = ({
  open,
  closeDialog,
  contract_type,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  // =======================================================
  // DELETE contract_type
  // =======================================================

  const handleDelete = async () => {
    if (!contract_type?.id) {
      showErrorToast('Invalid contract_type ID.');
      return;
    }

    setLoading(true);

    try {
      const response = await apiFetch(
        `/api/contract_type?id=${contract_type.id}`,
        {
          method: 'DELETE',
        }
      );

      const result = await response
        .json()
        .catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message ||
            'Failed to delete contract_type.'
        );
      }

      // ---------------------------------------------------
      // SUCCESS
      // ---------------------------------------------------

      showSuccessToast(
        result?.message ||
          'contract_type deleted successfully.'
      );

      // Close dialog + refresh parent list
      if (onSuccess) {
        await onSuccess();
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'Delete contract_type Error:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to delete contract_type.'
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
            Delete contract type
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete
            this contract type?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            contract type
          </div>

          <div className="mt-1 font-semibold">
            {contract_type?.name || '-'}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            ID: #{contract_type?.id || '-'}
          </div>
        </div>

        <p className="text-sm text-destructive">
          This action cannot be undone.
        </p>

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
              : 'Delete Contract Type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractTypeDeleteDialog;