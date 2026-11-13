'use client';

import { useEffect, useState } from 'react';

import {
  CalendarDays,
  ChevronDown,
  Download,
  Ellipsis,
  FileText,
  Mail,
  Printer,
  Trash2,
} from 'lucide-react';

import { toast } from 'sonner';

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

import { Textarea } from '@/components/ui/textarea';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// -----------------------------------------------------------------------------
// STATIC PAYMENT MODES
// -----------------------------------------------------------------------------

const PAYMENT_MODES = [
  {
    id: '1',
    name: 'Bank',
  },
  {
    id: '2',
    name: 'Credit Card',
  },
  {
    id: '3',
    name: 'Cash',
  },
  {
    id: '4',
    name: 'PayPal',
  },
  {
    id: '5',
    name: 'Cheque',
  },
];

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function formatAmount(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export default function PaymentsViewDialog({
  open,
  closeDialog,
  payment,
  onSuccess,
}) {
  // ---------------------------------------------------------------------------
  // TAB
  // ---------------------------------------------------------------------------

  const [activeTab, setActiveTab] =
    useState('receipt');

  // ---------------------------------------------------------------------------
  // PAYMENT FORM
  // ---------------------------------------------------------------------------

  const [amount, setAmount] =
    useState('');

  const [date, setDate] =
    useState(getToday());

  const [paymentMode, setPaymentMode] =
    useState('');

  const [paymentMethod, setPaymentMethod] =
    useState('');

  const [transactionId, setTransactionId] =
    useState('');

  const [note, setNote] =
    useState('');

  // ---------------------------------------------------------------------------
  // PAYMENT DATA
  // ---------------------------------------------------------------------------

  const paymentData = payment || {
    id: 1,
    paymentNo: 'PAY-0001',
    invoiceNo: 'INV-000001',
    paymentMode: 'Bank',
    paymentModeId: '1',
    paymentMethod: '',
    transactionId: 'we22422344243',
    customer: 'Smart',
    customerId: '1',
    amount: 36.96,
    date: '2026-09-02',
    invoiceDate: '2026-09-11',
    invoiceAmount: 36.96,
    paymentAmount: 36.96,
    note: 'dsdw',
    billing: {
      street: '111 W 7th St',
      city: 'Los Angeles',
      state: 'CA',
      country: 'GB',
      zip: '90014',
    },
  };

  // ---------------------------------------------------------------------------
  // LOAD PAYMENT DATA
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab('receipt');

    setAmount(
      paymentData.amount !== undefined &&
        paymentData.amount !== null
        ? String(paymentData.amount)
        : '',
    );

    setDate(
      paymentData.date ||
        getToday(),
    );

    setPaymentMode(
      paymentData.paymentModeId ||
        PAYMENT_MODES.find(
          (mode) =>
            mode.name.toLowerCase() ===
            String(
              paymentData.paymentMode || '',
            ).toLowerCase(),
        )?.id ||
        '',
    );

    setPaymentMethod(
      paymentData.paymentMethod || '',
    );

    setTransactionId(
      paymentData.transactionId || '',
    );

    setNote(
      paymentData.note || '',
    );
  }, [
    open,
    paymentData.id,
    paymentData.amount,
    paymentData.date,
    paymentData.paymentMode,
    paymentData.paymentModeId,
    paymentData.paymentMethod,
    paymentData.transactionId,
    paymentData.note,
  ]);

  // ---------------------------------------------------------------------------
  // CLOSE
  // ---------------------------------------------------------------------------

  const handleClose = () => {
    closeDialog?.();
  };

  // ---------------------------------------------------------------------------
  // SAVE PAYMENT
  // ---------------------------------------------------------------------------

  const handleSave = () => {
    if (!amount) {
      toast.error(
        'Amount received is required.',
      );

      return;
    }

    if (!date) {
      toast.error(
        'Payment date is required.',
      );

      return;
    }

    const selectedMode =
      PAYMENT_MODES.find(
        (mode) =>
          mode.id === paymentMode,
      );

    const updatedPayment = {
      ...paymentData,

      amount: Number(amount),

      date,

      paymentMode:
        selectedMode?.name || '',

      paymentModeId: paymentMode,

      paymentMethod,

      transactionId,

      note,
    };

    console.log(
      'Payment Data:',
      updatedPayment,
    );

    toast.success(
      'Payment updated successfully.',
    );

    onSuccess?.(updatedPayment);
  };

  // ---------------------------------------------------------------------------
  // EMAIL
  // ---------------------------------------------------------------------------

  const handleSendEmail = () => {
    toast.success(
      'Payment receipt email is ready to send.',
    );
  };

  // ---------------------------------------------------------------------------
  // PDF ACTIONS
  // ---------------------------------------------------------------------------

  const handlePdfAction = (action) => {
    if (action === 'view') {
      toast.info(
        'Payment receipt PDF opened.',
      );
    }

    if (action === 'new-tab') {
      toast.info(
        'Payment receipt PDF opened in a new tab.',
      );
    }

    if (action === 'download') {
      toast.success(
        'Payment receipt PDF download started.',
      );
    }

    if (action === 'print') {
      toast.info(
        'Payment receipt print dialog opened.',
      );
    }
  };

  // ---------------------------------------------------------------------------
  // DELETE
  // ---------------------------------------------------------------------------

  const handleDelete = () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this payment?',
    );

    if (!confirmed) {
      return;
    }

    console.log(
      'Delete payment:',
      paymentData,
    );

    toast.success(
      'Payment deleted successfully.',
    );

    closeDialog?.();
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent className="max-w-5xl w-[95vw] max-h-[95vh] overflow-y-auto p-0">
        {/* ================================================================= */}
        {/* HEADER */}
        {/* ================================================================= */}

        <DialogHeader className="border-b px-6 py-5">
          <DialogTitle className="text-lg font-bold text-foreground">
            Payment for Invoice{' '}
            <button
              type="button"
              className="font-bold text-primary hover:underline"
              onClick={() => {
                toast.info(
                  `Invoice ${paymentData.invoiceNo}`,
                );
              }}
            >
              {paymentData.invoiceNo}
            </button>
          </DialogTitle>

          <DialogDescription>
            View payment receipt and manage
            payment details.
          </DialogDescription>
        </DialogHeader>

        <div className="mx-auto w-full max-w-4xl px-6 pb-6">
          {/* =============================================================== */}
          {/* TABS */}
          {/* =============================================================== */}

          <div className="mb-4 border-b">
            <div
              className="flex gap-1 overflow-x-auto"
              role="tablist"
            >
              <button
                type="button"
                role="tab"
                aria-selected={
                  activeTab === 'receipt'
                }
                onClick={() =>
                  setActiveTab('receipt')
                }
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'receipt'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Payment Receipt
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={
                  activeTab === 'payment'
                }
                onClick={() =>
                  setActiveTab('payment')
                }
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === 'payment'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Payment
              </button>
            </div>
          </div>

          {/* =============================================================== */}
          {/* PAYMENT RECEIPT TAB */}
          {/* =============================================================== */}

          {activeTab === 'receipt' && (
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="p-6">
                {/* --------------------------------------------------------- */}
                {/* ACTIONS */}
                {/* --------------------------------------------------------- */}

                <div className="mb-6 flex justify-end">
                  <div className="flex items-center gap-2">
                    {/* EMAIL */}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      title="Send to client"
                      onClick={
                        handleSendEmail
                      }
                    >
                      <Mail className="h-4 w-4" />
                    </Button>

                    {/* PDF */}
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                      >
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                        >
                          <FileText className="h-4 w-4" />

                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="end"
                      >
                        <DropdownMenuItem
                          onClick={() =>
                            handlePdfAction(
                              'view',
                            )
                          }
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View PDF
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            handlePdfAction(
                              'new-tab',
                            )
                          }
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          View PDF in New Tab
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            handlePdfAction(
                              'download',
                            )
                          }
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() =>
                            handlePdfAction(
                              'print',
                            )
                          }
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Print
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* DELETE */}
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      title="Delete payment"
                      onClick={
                        handleDelete
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* --------------------------------------------------------- */}
                {/* ADDRESSES */}
                {/* --------------------------------------------------------- */}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* LEFT */}
                  <div>
                    <div className="text-sm leading-6 text-muted-foreground">
                      {/* Payment company/sender */}
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="text-left md:text-right">
                    <div className="text-sm leading-6 text-muted-foreground">
                      <button
                        type="button"
                        className="font-bold text-foreground hover:text-primary hover:underline"
                        onClick={() =>
                          toast.info(
                            `Customer: ${paymentData.customer}`,
                          )
                        }
                      >
                        {paymentData.customer}
                      </button>

                      {paymentData.billing && (
                        <>
                          {paymentData.billing.street && (
                            <div>
                              {
                                paymentData
                                  .billing
                                  .street
                              }
                            </div>
                          )}

                          <div>
                            {paymentData.billing
                              .city || ''}
                            {paymentData.billing
                              .city &&
                            paymentData.billing
                              .state
                              ? ', '
                              : ''}
                            {paymentData.billing
                              .state || ''}
                          </div>

                          <div>
                            {paymentData.billing
                              .country || ''}
                            {paymentData.billing
                              .country &&
                            paymentData.billing
                              .zip
                              ? ' '
                              : ''}
                            {paymentData.billing
                              .zip || ''}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* --------------------------------------------------------- */}
                {/* TITLE */}
                {/* --------------------------------------------------------- */}

                <div className="mt-8">
                  <h3 className="text-xl font-bold uppercase tracking-wide">
                    Payment Receipt
                  </h3>
                </div>

                {/* --------------------------------------------------------- */}
                {/* PAYMENT INFORMATION */}
                {/* --------------------------------------------------------- */}

                <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* LEFT */}
                  <div>
                    <div className="flex items-center justify-between border-b py-3">
                      <span className="font-medium text-muted-foreground">
                        Payment Date:
                      </span>

                      <span className="font-medium">
                        {paymentData.date ||
                          '-'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b py-3">
                      <span className="font-medium text-muted-foreground">
                        Payment Mode:
                      </span>

                      <span className="font-medium">
                        {paymentData.paymentMode ||
                          '-'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b py-3">
                      <span className="font-medium text-muted-foreground">
                        Transaction ID:
                      </span>

                      <span className="max-w-[60%] break-all text-right font-medium">
                        {paymentData.transactionId ||
                          '-'}
                      </span>
                    </div>
                  </div>

                  {/* RIGHT / TOTAL */}
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm text-muted-foreground">
                      Total Amount
                    </span>

                    <span className="text-base font-semibold">
                      {payment?.currencySymbol || '$'}
                      {Number(
                        payment?.paymentAmount ??
                        payment?.amount ??
                        0
                      ).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                {/* --------------------------------------------------------- */}
                {/* PAYMENT FOR */}
                {/* --------------------------------------------------------- */}

                <div className="mt-6">
                  <h4 className="mb-4 text-base font-semibold">
                    Payment For
                  </h4>

                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full min-w-[650px] text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">
                            Invoice Number
                          </th>

                          <th className="px-4 py-3 text-left font-semibold">
                            Invoice Date
                          </th>

                          <th className="px-4 py-3 text-right font-semibold">
                            Invoice Amount
                          </th>

                          <th className="px-4 py-3 text-right font-semibold">
                            Payment Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        <tr className="border-t">
                          <td className="px-4 py-3 font-medium">
                            {
                              paymentData.invoiceNo
                            }
                          </td>

                          <td className="px-4 py-3">
                            {paymentData.invoiceDate ||
                              '-'}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {formatAmount(
                              paymentData.invoiceAmount ??
                                paymentData.amount,
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {formatAmount(
                              paymentData.paymentAmount ??
                                paymentData.amount,
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =============================================================== */}
          {/* PAYMENT TAB */}
          {/* =============================================================== */}

          {activeTab === 'payment' && (
            <div className="rounded-lg border bg-card shadow-sm">
              <div className="p-6">
                <div className="space-y-5">
                  {/* ------------------------------------------------------- */}
                  {/* AMOUNT */}
                  {/* ------------------------------------------------------- */}

                  <div>
                    <label
                      htmlFor="payment-amount"
                      className="mb-2 block text-sm font-medium"
                    >
                      <span className="text-destructive">
                        *
                      </span>{' '}
                      Amount Received
                    </label>

                    <Input
                      id="payment-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={Number(
                        payment?.paymentAmount ??
                        payment?.amount ??
                        0
                      )}
                      onChange={(event) =>
                        setAmount(
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  {/* ------------------------------------------------------- */}
                  {/* PAYMENT DATE */}
                  {/* ------------------------------------------------------- */}

                  <div>
                    <label
                      htmlFor="payment-date"
                      className="mb-2 block text-sm font-medium"
                    >
                      <span className="text-destructive">
                        *
                      </span>{' '}
                      Payment Date
                    </label>

                    <div className="relative">
                      <Input
                        id="payment-date"
                        type="date"
                        value={date}
                        onChange={(event) =>
                          setDate(
                            event.target.value,
                          )
                        }
                        className="pr-10"
                      />

                      <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>

                  {/* ------------------------------------------------------- */}
                  {/* PAYMENT MODE */}
                  {/* ------------------------------------------------------- */}

                  <div>
                    <label
                      htmlFor="payment-mode"
                      className="mb-2 block text-sm font-medium"
                    >
                      Payment Mode
                    </label>

                    <Select
                      value={paymentMode}
                      onValueChange={
                        setPaymentMode
                      }
                    >
                      <SelectTrigger id="payment-mode">
                        <SelectValue placeholder="Nothing selected" />
                      </SelectTrigger>

                      <SelectContent>
                        {PAYMENT_MODES.map(
                          (mode) => (
                            <SelectItem
                              key={mode.id}
                              value={mode.id}
                            >
                              {mode.name}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>

                    <p className="mt-2 text-xs text-muted-foreground">
                      Some payment gateways
                      support different or
                      multiple payment methods
                      like Credit Card, PayPal
                      and Bank.
                    </p>
                  </div>

                  {/* ------------------------------------------------------- */}
                  {/* PAYMENT METHOD */}
                  {/* ------------------------------------------------------- */}

                  <div>
                    <label
                      htmlFor="payment-method"
                      className="mb-2 block text-sm font-medium"
                    >
                      Payment Method
                    </label>

                    <Input
                      id="payment-method"
                      value={paymentData.paymentMode ||
                          '-'}
                      onChange={(event) =>
                        setPaymentMethod(
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  {/* ------------------------------------------------------- */}
                  {/* TRANSACTION ID */}
                  {/* ------------------------------------------------------- */}

                  <div>
                    <label
                      htmlFor="transaction-id"
                      className="mb-2 block text-sm font-medium"
                    >
                      Transaction ID
                    </label>

                    <Input
                      id="transaction-id"
                      value={transactionId}
                      onChange={(event) =>
                        setTransactionId(
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  {/* ------------------------------------------------------- */}
                  {/* NOTE */}
                  {/* ------------------------------------------------------- */}

                  <div>
                    <label
                      htmlFor="payment-note"
                      className="mb-2 block text-sm font-medium"
                    >
                      Note
                    </label>

                    <Textarea
                      id="payment-note"
                      rows={7}
                      value={note}
                      onChange={(event) =>
                        setNote(
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  {/* ------------------------------------------------------- */}
                  {/* SAVE */}
                  {/* ------------------------------------------------------- */}

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      onClick={handleSave}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* DIALOG FOOTER */}
        {/* ================================================================= */}

        <DialogFooter className="border-t bg-background px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}