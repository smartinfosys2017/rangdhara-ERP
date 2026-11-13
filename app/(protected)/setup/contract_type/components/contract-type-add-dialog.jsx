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

const ContractTypeAddDialog = ({
  open,
  closeDialog,
  onSuccess,
}) => {
  const [name, setName] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const handleClose = () => {
    if (loading) return;

    setName('');

    closeDialog();
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const ContractTypeName =
      name.trim();

    if (!ContractTypeName) {
      showErrorToast(
        'Contract Type name is required.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/contract_type',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              name: ContractTypeName,
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
            'Failed to create Contract Type.'
        );
      }

      showSuccessToast(
        result?.message ||
          'Contract Type created successfully.'
      );

      setName('');

      if (onSuccess) {
        onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'CREATE Contract Type ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to create Contract Type.'
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
            Add Contract Type
          </DialogTitle>

          <DialogDescription>
            Create a new Contract Type.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="space-y-2">
            <label
              htmlFor="Contract Type-name"
              className="text-sm font-medium"
            >
              Contract Type Name
              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="contract-type-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Enter Contract Type name"
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
                ? 'Creating...'
                : 'Create Contract Type'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractTypeAddDialog;