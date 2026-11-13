'use client';

import { useEffect, useState } from 'react';

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

import { Input } from '@/components/ui/input';

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

const ContractTypeEditDialog = ({
  open,
  closeDialog,
  contract_type,
  onSuccess,
}) => {
  const [name, setName] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    if (contract_type) {
      setName(
        contract_type.name || ''
      );
    }
  }, [contract_type]);

  const handleClose = () => {
    if (loading) return;

    closeDialog();
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    if (!contract_type?.id) {
      showErrorToast(
        'Invalid contract type.'
      );

      return;
    }

    const contract_typeName =
      name.trim();

    if (!contract_typeName) {
      showErrorToast(
        'contract type name is required.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/contract_type',
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: contract_type.id,
              name: contract_typeName,
            }),
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
            'Failed to update Contract Type.'
        );
      }

      showSuccessToast(
        result?.message ||
          'Contract Type updated successfully.'
      );

      if (onSuccess) {
        onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'UPDATE Contract Type ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to update Contract Type.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit Contract Type
          </DialogTitle>

          <DialogDescription>
            Update Contract Type information.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="space-y-2">
            <label
              htmlFor="contract_type-edit-name"
              className="text-sm font-medium"
            >
              Contract Type Name
              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="contract-type-edit-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Enter contract type name"
              disabled={loading}
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Updating...'
                : 'Update Contract Type'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractTypeEditDialog;