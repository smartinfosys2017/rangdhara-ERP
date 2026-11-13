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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

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

const CurrencyAddDialog = ({
  open,
  closeDialog,
  onSuccess,
}) => {
  const [name, setName] =
    useState('');

  const [symbol, setSymbol] =
    useState('');

  const [decimalSeparator, setDecimalSeparator] =
    useState(',');

  const [thousandSeparator, setThousandSeparator] =
    useState(',');

  const [placement, setPlacement] =
    useState('before');

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) return;

    setName('');
    setSymbol('');
    setDecimalSeparator(',');
    setThousandSeparator(',');
    setPlacement('before');

    closeDialog();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    // ===================================================
    // CURRENCY CODE
    // ===================================================

    const currencyName =
      name.trim().toUpperCase();

    if (!currencyName) {
      showErrorToast(
        'Currency code is required.'
      );

      return;
    }

    if (
      !/^[A-Z]{3}$/.test(
        currencyName
      )
    ) {
      showErrorToast(
        'Currency code must be a valid 3-letter ISO code.'
      );

      return;
    }

    // ===================================================
    // SYMBOL
    // ===================================================

    const currencySymbol =
      symbol.trim();

    if (!currencySymbol) {
      showErrorToast(
        'Currency symbol is required.'
      );

      return;
    }

    // ===================================================
    // DECIMAL SEPARATOR
    // ===================================================

    if (
      decimalSeparator !== ',' &&
      decimalSeparator !== '.'
    ) {
      showErrorToast(
        'Please select a valid decimal separator.'
      );

      return;
    }

    // ===================================================
    // THOUSAND SEPARATOR
    // ===================================================

    const finalThousandSeparator =
      thousandSeparator === 'none'
        ? ''
        : thousandSeparator;

    if (
      ![
        ',',
        '.',
        "'",
        '',
        ' ',
      ].includes(
        finalThousandSeparator
      )
    ) {
      showErrorToast(
        'Please select a valid thousand separator.'
      );

      return;
    }

    // ===================================================
    // PLACEMENT
    // ===================================================

    if (
      placement !== 'before' &&
      placement !== 'after'
    ) {
      showErrorToast(
        'Please select currency placement.'
      );

      return;
    }

    // ===================================================
    // API
    // ===================================================

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/finance/currencies',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              name: currencyName,

              symbol:
                currencySymbol,

              decimal_separator:
                decimalSeparator,

              thousand_separator:
                finalThousandSeparator,

              placement,
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
            'Failed to create Currency.'
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      showSuccessToast(
        result?.message ||
          'Currency created successfully.'
      );

      // Reset fields

      setName('');
      setSymbol('');
      setDecimalSeparator(',');
      setThousandSeparator(',');
      setPlacement('before');

      // Refresh parent

      if (onSuccess) {
        onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'CREATE Currency ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to create Currency.'
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
            Add Currency
          </DialogTitle>

          <DialogDescription>
            Create a new Currency.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* =================================================
              INFO
          ================================================== */}

          <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
            Make sure to enter a valid currency ISO code.
          </div>

          {/* =================================================
              CURRENCY CODE
          ================================================== */}

          <div className="space-y-2">
            <label
              htmlFor="Currency-name"
              className="text-sm font-medium"
            >
              Currency Code

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="Currency-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="ISO Code"
              disabled={loading}
              autoFocus
              maxLength={3}
            />
          </div>

          {/* =================================================
              SYMBOL
          ================================================== */}

          <div className="space-y-2">
            <label
              htmlFor="Currency-symbol"
              className="text-sm font-medium"
            >
              Symbol

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="Currency-symbol"
              type="text"
              value={symbol}
              onChange={(event) =>
                setSymbol(
                  event.target.value
                )
              }
              placeholder="₹"
              disabled={loading}
            />
          </div>

          {/* =================================================
              SEPARATORS
          ================================================== */}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            {/* =================================================
                DECIMAL SEPARATOR
            ================================================== */}

            <div className="space-y-2">
              <label
                htmlFor="Currency-decimal-separator"
                className="text-sm font-medium"
              >
                Decimal Separator

                <span className="ms-1 text-destructive">
                  *
                </span>
              </label>

              <Select
                value={decimalSeparator}
                onValueChange={
                  setDecimalSeparator
                }
                disabled={loading}
              >
                <SelectTrigger
                  id="Currency-decimal-separator"
                >
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value=",">
                    ,
                  </SelectItem>

                  <SelectItem value=".">
                    .
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* =================================================
                THOUSAND SEPARATOR
            ================================================== */}

            <div className="space-y-2">
              <label
                htmlFor="Currency-thousand-separator"
                className="text-sm font-medium"
              >
                Thousand Separator

                <span className="ms-1 text-destructive">
                  *
                </span>
              </label>

              <Select
                value={
                  thousandSeparator
                }
                onValueChange={
                  setThousandSeparator
                }
                disabled={loading}
              >
                <SelectTrigger
                  id="Currency-thousand-separator"
                >
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value=",">
                    ,
                  </SelectItem>

                  <SelectItem value=".">
                    .
                  </SelectItem>

                  <SelectItem value="'">
                    Apostrophe (')
                  </SelectItem>

                  <SelectItem value="none">
                    None
                  </SelectItem>

                  <SelectItem value=" ">
                    Space
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* =================================================
              CURRENCY PLACEMENT
          ================================================== */}

          <div className="space-y-3">
            <label className="text-sm font-medium">
              Currency Placement

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <RadioGroup
              value={placement}
              onValueChange={
                setPlacement
              }
              disabled={loading}
              className="flex flex-col gap-3 sm:flex-row sm:gap-6"
            >

              {/* BEFORE */}

              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value="before"
                  id="currency-placement-before"
                />

                <label
                  htmlFor="currency-placement-before"
                  className="cursor-pointer text-sm"
                >
                  Before Amount
                </label>
              </div>

              {/* AFTER */}

              <div className="flex items-center gap-2">
                <RadioGroupItem
                  value="after"
                  id="currency-placement-after"
                />

                <label
                  htmlFor="currency-placement-after"
                  className="cursor-pointer text-sm"
                >
                  After Amount
                </label>
              </div>

            </RadioGroup>
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
                : 'Create Currency'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CurrencyAddDialog;