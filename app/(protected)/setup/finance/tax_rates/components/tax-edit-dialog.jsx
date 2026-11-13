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

const TaxEditDialog = ({
  open,
  closeDialog,
  tax,
  onSuccess,
}) => {
  const [name, setName] =
    useState('');

  const [taxrate, setTaxrate] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // LOAD TAX DATA
  // =====================================================

  useEffect(() => {
    if (tax) {
      setName(
        tax.name || ''
      );

      setTaxrate(
        tax.taxrate !== null &&
        tax.taxrate !== undefined
          ? String(tax.taxrate)
          : ''
      );
    }
  }, [tax]);

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

    // ---------------------------------------------------
    // CHECK TAX
    // ---------------------------------------------------

    if (!tax?.id) {
      showErrorToast(
        'Invalid Tax.'
      );

      return;
    }

    // ---------------------------------------------------
    // TAX NAME
    // ---------------------------------------------------

    const taxName =
      name.trim();

    if (!taxName) {
      showErrorToast(
        'Tax name is required.'
      );

      return;
    }

    // ---------------------------------------------------
    // TAX RATE
    // ---------------------------------------------------

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

      // -------------------------------------------------
      // UPDATE TAX
      // -------------------------------------------------

      const response =
        await apiFetch(
          '/api/finance/tax_rates',
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: tax.id,

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

      // -------------------------------------------------
      // RESPONSE ERROR
      // -------------------------------------------------

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to update Tax.'
        );
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      showSuccessToast(
        result?.message ||
          'Tax updated successfully.'
      );

      if (onSuccess) {
        onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'UPDATE Tax ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to update Tax.'
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
            Edit Tax
          </DialogTitle>

          <DialogDescription>
            Update Tax information.
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
              htmlFor="tax-edit-name"
              className="text-sm font-medium"
            >
              Tax Name

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="tax-edit-name"
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
              htmlFor="tax-edit-rate"
              className="text-sm font-medium"
            >
              Tax Rate (percent)
            </label>

            <Input
              id="tax-edit-rate"
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
                ? 'Updating...'
                : 'Update Tax'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TaxEditDialog;