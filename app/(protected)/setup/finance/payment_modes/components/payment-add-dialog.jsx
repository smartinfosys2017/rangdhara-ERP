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

import { Textarea } from '@/components/ui/textarea';

import { Checkbox } from '@/components/ui/checkbox';

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

const PaymentMethodAddDialog = ({
  open,
  closeDialog,
  onSuccess,
}) => {
  // =====================================================
  // FORM STATE
  // =====================================================

  const [name, setName] = useState('');

  const [description, setDescription] =
    useState('');

  const [active, setActive] =
    useState(true);

  const [showOnPdf, setShowOnPdf] =
    useState(false);

  const [selectedByDefault, setSelectedByDefault] =
    useState(false);

  const [invoicesOnly, setInvoicesOnly] =
    useState(false);

  const [expensesOnly, setExpensesOnly] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setName('');
    setDescription('');
    setActive(true);
    setShowOnPdf(false);
    setSelectedByDefault(false);
    setInvoicesOnly(false);
    setExpensesOnly(false);
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
    // VALIDATE NAME
    // ---------------------------------------------------

    const paymentMethodName =
      name.trim();

    if (!paymentMethodName) {
      showErrorToast(
        'Payment method name is required.'
      );

      return;
    }

    // ---------------------------------------------------
    // DESCRIPTION
    // ---------------------------------------------------

    const paymentDescription =
      description.trim();

    try {
      setLoading(true);

      // =================================================
      // CREATE PAYMENT METHOD
      // =================================================

      const response = await apiFetch(
        '/api/finance/payment_modes',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            name: paymentMethodName,

            description:
              paymentDescription || null,

            active,

            show_on_pdf:
              showOnPdf,

            selected_by_default:
              selectedByDefault,

            invoices_only:
              invoicesOnly,

            expenses_only:
              expensesOnly,
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
            'Failed to create payment method.'
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      showSuccessToast(
        result?.message ||
          'Payment method created successfully.'
      );

      resetForm();

      // =================================================
      // PARENT REFRESH
      // =================================================

      if (onSuccess) {
        await onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'CREATE PAYMENT METHOD ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to create payment method.'
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
            Add Payment Method
          </DialogTitle>

          <DialogDescription>
            Create a new payment method.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* =================================================
              PAYMENT METHOD NAME
          ================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="payment-method-name"
              className="text-sm font-medium"
            >
              Payment Method Name

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="payment-method-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Enter payment method name"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="payment-method-description"
              className="text-sm font-medium"
            >
              Bank Accounts / Description
            </label>

            <Textarea
              id="payment-method-description"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Enter bank account information or description"
              rows={5}
              disabled={loading}
            />

            <p className="text-xs text-muted-foreground">
              This information can be shown on the invoice.
            </p>
          </div>

          {/* =================================================
              ACTIVE
          ================================================= */}

          <div className="flex items-center gap-2">
            <Checkbox
              id="payment-method-active"
              checked={active}
              onCheckedChange={(checked) =>
                setActive(
                  checked === true
                )
              }
              disabled={loading}
            />

            <label
              htmlFor="payment-method-active"
              className="cursor-pointer text-sm font-medium"
            >
              Active
            </label>
          </div>

          {/* =================================================
              SHOW ON PDF
          ================================================= */}

          <div className="flex items-center gap-2">
            <Checkbox
              id="payment-method-show-on-pdf"
              checked={showOnPdf}
              onCheckedChange={(checked) =>
                setShowOnPdf(
                  checked === true
                )
              }
              disabled={loading}
            />

            <label
              htmlFor="payment-method-show-on-pdf"
              className="cursor-pointer text-sm font-medium"
            >
              Show Bank Accounts / Description on Invoice PDF
            </label>
          </div>

          {/* =================================================
              SELECTED BY DEFAULT
          ================================================= */}

          <div className="flex items-center gap-2">
            <Checkbox
              id="payment-method-selected-default"
              checked={selectedByDefault}
              onCheckedChange={(checked) =>
                setSelectedByDefault(
                  checked === true
                )
              }
              disabled={loading}
            />

            <label
              htmlFor="payment-method-selected-default"
              className="cursor-pointer text-sm font-medium"
            >
              Selected by default on invoice
            </label>
          </div>

          <hr />

          {/* =================================================
              INVOICES ONLY
          ================================================= */}

          <div className="flex items-center gap-2">
            <Checkbox
              id="payment-method-invoices-only"
              checked={invoicesOnly}
              onCheckedChange={(checked) =>
                setInvoicesOnly(
                  checked === true
                )
              }
              disabled={loading}
            />

            <label
              htmlFor="payment-method-invoices-only"
              className="cursor-pointer text-sm font-medium"
            >
              Invoices Only
            </label>
          </div>

          {/* =================================================
              EXPENSES ONLY
          ================================================= */}

          <div className="flex items-center gap-2">
            <Checkbox
              id="payment-method-expenses-only"
              checked={expensesOnly}
              onCheckedChange={(checked) =>
                setExpensesOnly(
                  checked === true
                )
              }
              disabled={loading}
            />

            <label
              htmlFor="payment-method-expenses-only"
              className="cursor-pointer text-sm font-medium"
            >
              Expenses Only
            </label>
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
              Close
            </Button>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Creating...'
                : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodAddDialog;