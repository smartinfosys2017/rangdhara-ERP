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

const PaymentMethodEditDialog = ({
  open,
  closeDialog,
  payment,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const [active, setActive] = useState(true);
  const [showOnPdf, setShowOnPdf] = useState(false);
  const [selectedByDefault, setSelectedByDefault] =
    useState(false);
  const [invoicesOnly, setInvoicesOnly] = useState(false);
  const [expensesOnly, setExpensesOnly] = useState(false);

  const [loading, setLoading] = useState(false);

  // =====================================================
  // LOAD PAYMENT DATA
  // =====================================================

  useEffect(() => {
    if (!payment) {
      return;
    }

    setName(payment.name ?? '');

    setDescription(
      payment.description ?? ''
    );

    setActive(
      payment.active === true
    );

    setShowOnPdf(
      payment.show_on_pdf === true
    );

    setSelectedByDefault(
      payment.selected_by_default === true
    );

    setInvoicesOnly(
      payment.invoices_only === true
    );

    setExpensesOnly(
      payment.expenses_only === true
    );
  }, [payment, open]);

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) {
      return;
    }

    setName('');
    setDescription('');
    setActive(true);
    setShowOnPdf(false);
    setSelectedByDefault(false);
    setInvoicesOnly(false);
    setExpensesOnly(false);

    closeDialog();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!payment?.id) {
      showErrorToast(
        'Invalid payment method.'
      );

      return;
    }

    const paymentMethodName =
      name.trim();

    if (!paymentMethodName) {
      showErrorToast(
        'Payment method name is required.'
      );

      return;
    }

    const paymentDescription =
      description.trim();

    try {
      setLoading(true);

      const response = await apiFetch(
        '/api/finance/payment_modes',
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            id: payment.id,

            name: paymentMethodName,

            description:
              paymentDescription || null,

            active: Boolean(active),

            show_on_pdf:
              Boolean(showOnPdf),

            selected_by_default:
              Boolean(selectedByDefault),

            invoices_only:
              Boolean(invoicesOnly),

            expenses_only:
              Boolean(expensesOnly),
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
            'Failed to update payment method.'
        );
      }

      showSuccessToast(
        result?.message ||
          'Payment method updated successfully.'
      );

      if (onSuccess) {
        await onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'UPDATE PAYMENT METHOD ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to update payment method.'
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
            Edit Payment Method
          </DialogTitle>

          <DialogDescription>
            Update payment method information.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* NAME */}

          <div className="space-y-2">
            <label
              htmlFor="payment-method-edit-name"
              className="text-sm font-medium"
            >
              Payment Method Name

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="payment-method-edit-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Enter payment method name"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* DESCRIPTION */}

          <div className="space-y-2">
            <label
              htmlFor="payment-method-edit-description"
              className="text-sm font-medium"
            >
              Bank Accounts / Description
            </label>

            <Textarea
              id="payment-method-edit-description"
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

          {/* ACTIVE */}

          <div className="flex items-center gap-2">
            <Checkbox
              id="payment-method-edit-active"
              checked={active}
              onCheckedChange={(checked) =>
                setActive(checked === true)
              }
              disabled={loading}
            />

            <label
              htmlFor="payment-method-edit-active"
              className="cursor-pointer text-sm font-medium"
            >
              Active
            </label>
          </div>

          {/* SHOW ON PDF */}

          <div className="flex items-center gap-2">
            <Checkbox
              id="payment-method-edit-show-on-pdf"
              checked={showOnPdf}
              onCheckedChange={(checked) =>
                setShowOnPdf(checked === true)
              }
              disabled={loading}
            />

            <label
              htmlFor="payment-method-edit-show-on-pdf"
              className="cursor-pointer text-sm font-medium"
            >
              Show Bank Accounts / Description on Invoice PDF
            </label>
          </div>

          {/* SELECTED BY DEFAULT */}

          <div className="flex items-center gap-2">
            <Checkbox
              id="payment-method-edit-selected-default"
              checked={selectedByDefault}
              onCheckedChange={(checked) =>
                setSelectedByDefault(
                  checked === true
                )
              }
              disabled={loading}
            />

            <label
              htmlFor="payment-method-edit-selected-default"
              className="cursor-pointer text-sm font-medium"
            >
              Selected by default on invoice
            </label>
          </div>

          <hr />

          {/* INVOICES ONLY */}

          <div className="flex items-center gap-2">
            <Checkbox
              id="payment-method-edit-invoices-only"
              checked={invoicesOnly}
              onCheckedChange={(checked) =>
                setInvoicesOnly(
                  checked === true
                )
              }
              disabled={loading}
            />

            <label
              htmlFor="payment-method-edit-invoices-only"
              className="cursor-pointer text-sm font-medium"
            >
              Invoices Only
            </label>
          </div>

          {/* EXPENSES ONLY */}

          <div className="flex items-center gap-2">
            <Checkbox
              id="payment-method-edit-expenses-only"
              checked={expensesOnly}
              onCheckedChange={(checked) =>
                setExpensesOnly(
                  checked === true
                )
              }
              disabled={loading}
            />

            <label
              htmlFor="payment-method-edit-expenses-only"
              className="cursor-pointer text-sm font-medium"
            >
              Expenses Only
            </label>
          </div>

          {/* FOOTER */}

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
                : 'Update Payment Method'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodEditDialog;
