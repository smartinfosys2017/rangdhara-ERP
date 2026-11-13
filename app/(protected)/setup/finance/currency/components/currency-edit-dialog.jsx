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

        <AlertTitle>{message}</AlertTitle>
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

        <AlertTitle>{message}</AlertTitle>
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

const CurrencyEditDialog = ({
  open,
  closeDialog,
  currency,
  onSuccess,
}) => {
  // =====================================================
  // FORM STATE
  // =====================================================

  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimalSeparator, setDecimalSeparator] =
    useState('.');
  const [thousandSeparator, setThousandSeparator] =
    useState(',');
  const [placement, setPlacement] =
    useState('before');

  const [loading, setLoading] = useState(false);

  // =====================================================
  // AUTOFILL CURRENCY DATA
  // =====================================================

  useEffect(() => {
    if (currency) {
      setName(currency.name || '');

      setSymbol(currency.symbol || '');

      setDecimalSeparator(
        currency.decimal_separator ?? '.'
      );

      setThousandSeparator(
        currency.thousand_separator ?? ','
      );

      setPlacement(
        currency.placement || 'before'
      );
    }
  }, [currency]);

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setName('');
    setSymbol('');
    setDecimalSeparator('.');
    setThousandSeparator(',');
    setPlacement('before');
  };

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) return;

    resetForm();

    closeDialog();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    // ---------------------------------------------------
    // VALIDATE CURRENCY
    // ---------------------------------------------------

    if (!currency?.id) {
      showErrorToast('Invalid currency.');

      return;
    }

    // ---------------------------------------------------
    // VALIDATE NAME
    // ---------------------------------------------------

    const currencyName = name.trim();

    if (!currencyName) {
      showErrorToast(
        'Currency name is required.'
      );

      return;
    }

    // ---------------------------------------------------
    // VALIDATE SYMBOL
    // ---------------------------------------------------

    const currencySymbol = symbol.trim();

    if (!currencySymbol) {
      showErrorToast(
        'Currency symbol is required.'
      );

      return;
    }

    // ---------------------------------------------------
    // VALIDATE DECIMAL SEPARATOR
    // ---------------------------------------------------

    const finalDecimalSeparator =
      decimalSeparator.trim();

    if (!finalDecimalSeparator) {
      showErrorToast(
        'Decimal separator is required.'
      );

      return;
    }

    // ---------------------------------------------------
    // VALIDATE THOUSAND SEPARATOR
    // ---------------------------------------------------

    const finalThousandSeparator =
      thousandSeparator.trim();

    if (!finalThousandSeparator) {
      showErrorToast(
        'Thousand separator is required.'
      );

      return;
    }

    // ---------------------------------------------------
    // VALIDATE PLACEMENT
    // ---------------------------------------------------

    const finalPlacement =
      placement === 'after'
        ? 'after'
        : 'before';

    try {
      setLoading(true);

      // =================================================
      // UPDATE CURRENCY
      // =================================================

      const response = await apiFetch(
        '/api/finance/currencies',
        {
          method: 'PUT',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            id: Number(currency.id),

            name: currencyName,

            symbol: currencySymbol,

            decimal_separator:
              finalDecimalSeparator,

            thousand_separator:
              finalThousandSeparator,

            placement: finalPlacement,
          }),
        }
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      // =================================================
      // ERROR
      // =================================================

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to update currency.'
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      showSuccessToast(
        result?.message ||
          'Currency updated successfully.'
      );

      resetForm();

      // =================================================
      // REFRESH PARENT LIST
      // =================================================

      if (onSuccess) {
        await onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'UPDATE CURRENCY ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to update currency.'
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
            Edit Currency
          </DialogTitle>

          <DialogDescription>
            Update currency information.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* =================================================
              CURRENCY NAME
          ================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="currency-edit-name"
              className="text-sm font-medium"
            >
              Currency Name

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="currency-edit-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Enter currency name"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* =================================================
              SYMBOL
          ================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="currency-edit-symbol"
              className="text-sm font-medium"
            >
              Currency Symbol

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="currency-edit-symbol"
              type="text"
              value={symbol}
              onChange={(event) =>
                setSymbol(event.target.value)
              }
              placeholder="e.g. $, €, ₹"
              disabled={loading}
            />
          </div>

          {/* =================================================
              DECIMAL SEPARATOR
          ================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="currency-edit-decimal-separator"
              className="text-sm font-medium"
            >
              Decimal Separator

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="currency-edit-decimal-separator"
              type="text"
              value={decimalSeparator}
              onChange={(event) =>
                setDecimalSeparator(
                  event.target.value
                )
              }
              placeholder="."
              maxLength={1}
              disabled={loading}
            />

            <p className="text-xs text-muted-foreground">
              Example: 10.50
            </p>
          </div>

          {/* =================================================
              THOUSAND SEPARATOR
          ================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="currency-edit-thousand-separator"
              className="text-sm font-medium"
            >
              Thousand Separator

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="currency-edit-thousand-separator"
              type="text"
              value={thousandSeparator}
              onChange={(event) =>
                setThousandSeparator(
                  event.target.value
                )
              }
              placeholder=","
              maxLength={1}
              disabled={loading}
            />

            <p className="text-xs text-muted-foreground">
              Example: 1,000
            </p>
          </div>

          {/* =================================================
              PLACEMENT
          ================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="currency-edit-placement"
              className="text-sm font-medium"
            >
              Symbol Placement

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <select
              id="currency-edit-placement"
              value={placement}
              onChange={(event) =>
                setPlacement(event.target.value)
              }
              disabled={loading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="before">
                Before amount — $100
              </option>

              <option value="after">
                After amount — 100$
              </option>
            </select>
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

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
                : 'Update Currency'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CurrencyEditDialog;