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

const TaxAddDialog = ({
  open,
  closeDialog,
  onSuccess,
}) => {
  const [name, setName] =
    useState('');

  const [taxrate, setTaxrate] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) return;

    setName('');
    setTaxrate('');

    closeDialog();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const taxName =
      name.trim();

    if (!taxName) {
      showErrorToast(
        'Tax name is required.'
      );

      return;
    }

    const taxRate =
      taxrate.trim();

    if (
      taxRate !== '' &&
      (
        Number.isNaN(
          Number(taxRate)
        ) ||
        Number(taxRate) < 0 ||
        Number(taxRate) > 100
      )
    ) {
      showErrorToast(
        'Tax rate must be between 0 and 100.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/finance/tax_rates',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              name: taxName,

              taxrate:
                taxRate === ''
                  ? null
                  : Number(taxRate),
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
            'Failed to create Tax.'
        );
      }

      showSuccessToast(
        result?.message ||
          'Tax created successfully.'
      );

      setName('');
      setTaxrate('');

      if (onSuccess) {
        onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'CREATE Tax ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to create Tax.'
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
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add Tax
          </DialogTitle>

          <DialogDescription>
            Create a new Tax.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* =================================================
              TAX NAME
          ================================================== */}

          <div className="space-y-2">
            <label
              htmlFor="Tax-name"
              className="text-sm font-medium"
            >
              Tax Name

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="Tax-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Enter Tax name"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* =================================================
              TAX RATE
          ================================================== */}

          <div className="space-y-2">
            <label
              htmlFor="Tax-rate"
              className="text-sm font-medium"
            >
              Tax Rate (percent)
            </label>

            <Input
              id="Tax-rate"
              type="number"
              value={taxrate}
              onChange={(event) =>
                setTaxrate(
                  event.target.value
                )
              }
              placeholder="Enter Tax rate"
              min="0"
              max="100"
              step="0.01"
              disabled={loading}
            />
          </div>

          {/* =================================================
              FOOTER
          ================================================== */}

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
                : 'Create Tax'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaxAddDialog;