"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

/*
|--------------------------------------------------------------------------
| Static Data
|--------------------------------------------------------------------------
*/

const STATIC_CREDIT_NOTE = {
  creditNoteNumber: "CN-000001",

  customer: "Smart",

  billing: {
    street: "111 W 7th St",
    city: "Los Angeles",
    state: "CA",
    zip: "90014",
    country: "GB",
  },

  shipping: {
    street: "111 W 7th St",
    city: "Los Angeles",
    state: "CA",
    zip: "90014",
    country: "GB",
  },

  creditNoteDate: "2026-09-02",

  referenceNo: "fds",

  currency: {
    code: "USD",
    symbol: "$",
  },

  items: [
    {
      id: 6,
      name: "raj",
      description: "raj",
      quantity: 123,
      rate: 110,
      taxes: [
        {
          name: "IGST",
          rate: 12,
        },
      ],
    },
  ],

  subtotal: 110,
  totalTax: 13.2,
  total: 123.2,
  creditsRemaining: 123.2,

  note: "hghg",

  terms: "fghgfh",
};

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function formatMoney(amount, currency) {
  return `${currency?.symbol || "$"}${Number(amount || 0).toFixed(2)}`;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  return value;
}

/*
|--------------------------------------------------------------------------
| Address Component
|--------------------------------------------------------------------------
*/

function AddressBlock({ address }) {
  if (!address) {
    return null;
  }

  return (
    <address className="mt-1 not-italic text-sm leading-6 text-muted-foreground">
      {address.street && <div>{address.street}</div>}

      {(address.city || address.state) && (
        <div>{[address.city, address.state].filter(Boolean).join(" ")}</div>
      )}

      {(address.country || address.zip) && (
        <div>{[address.country, address.zip].filter(Boolean).join(" ")}</div>
      )}
    </address>
  );
}

/*
|--------------------------------------------------------------------------
| Main Component
|--------------------------------------------------------------------------
*/

export default function CreditNoteViewDialog({ open, closeDialog }) {
  /*
  |--------------------------------------------------------------------------
  | Static credit note
  |--------------------------------------------------------------------------
  */

  const creditNote = STATIC_CREDIT_NOTE;

  /*
  |--------------------------------------------------------------------------
  | Close
  |--------------------------------------------------------------------------
  */

  const handleClose = () => {
    closeDialog?.();
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className="
          w-[96vw]
          max-w-[1200px]
          max-h-[95vh]
          overflow-hidden
          p-0
        "
      >
        {/* =========================================================
            ACCESSIBLE HEADER
        ========================================================= */}

        <DialogHeader className="sr-only">
          <DialogTitle>Credit Note {creditNote.creditNoteNumber}</DialogTitle>

          <DialogDescription>Credit note preview</DialogDescription>
        </DialogHeader>

        {/* =========================================================
            CREDIT NOTE PREVIEW
        ========================================================= */}

        <div
          id="credit-note-preview"
          className="max-h-[95vh] overflow-y-auto bg-muted/20"
        >
          {/* =======================================================
              TOP HEADER
          ======================================================= */}

          <div className="sticky top-0 z-30 border-b bg-background/95 shadow-sm backdrop-blur">
            <div className="px-5 py-4 sm:px-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="m-0 text-xl font-bold">
                    {creditNote.creditNoteNumber}
                  </h3>
                </div>

                <Button type="button" variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </div>
          </div>

          {/* =======================================================
              CREDIT NOTE DOCUMENT
          ======================================================= */}

          <main className="mx-auto max-w-[1050px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="rounded-lg border bg-background shadow-sm">
              <div className="p-5 sm:p-8 lg:p-10">
                {/* =================================================
                    CREDIT NOTE HEADER
                ================================================= */}

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  {/* ===============================================
                      LEFT SIDE
                  =============================================== */}

                  <div>
                    <h4 className="text-base font-bold text-foreground">
                      {creditNote.creditNoteNumber}
                    </h4>

                    <address className="mt-3 not-italic text-sm leading-6 text-muted-foreground">
                      {/* Company address can be added here if required */}
                    </address>
                  </div>

                  {/* ===============================================
                      RIGHT SIDE
                  =============================================== */}

                  <div className="text-left md:text-right">
                    {/* BILL TO */}

                    <div>
                      <span className="font-bold text-foreground">Bill To</span>

                      <address className="mt-1 not-italic text-sm leading-6 text-muted-foreground">
                        <strong className="font-semibold text-foreground">
                          {creditNote.customer}
                        </strong>

                        <div>{creditNote.billing.street}</div>

                        <div>
                          {creditNote.billing.city} {creditNote.billing.state}
                        </div>

                        <div>
                          {creditNote.billing.country} {creditNote.billing.zip}
                        </div>
                      </address>
                    </div>

                    {/* SHIP TO */}

                    <div className="mt-5">
                      <span className="font-bold text-foreground">Ship to</span>

                      <AddressBlock address={creditNote.shipping} />
                    </div>

                    {/* CREDIT NOTE DATE */}

                    <p className="m-0 mt-5 text-sm">
                      <span className="font-bold text-foreground">
                        Credit Note Date:
                      </span>{" "}
                      {formatDate(creditNote.creditNoteDate)}
                    </p>

                    {/* REFERENCE */}

                    <p className="m-0 mt-1 text-sm">
                      <span className="font-bold text-foreground">
                        Reference #:
                      </span>{" "}
                      {creditNote.referenceNo || "-"}
                    </p>
                  </div>
                </div>

                {/* =================================================
                    ITEMS
                ================================================= */}

                <div className="mt-8">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="w-[5%] px-3 py-3 text-center font-semibold">
                            #
                          </th>

                          <th className="w-[38%] px-3 py-3 text-left font-semibold">
                            Item
                          </th>

                          <th className="w-[9%] px-3 py-3 text-right font-semibold">
                            Qty
                          </th>

                          <th className="w-[9%] px-3 py-3 text-right font-semibold">
                            Rate
                          </th>

                          <th className="w-[20%] px-3 py-3 text-right font-semibold">
                            Tax
                          </th>

                          <th className="w-[19%] px-3 py-3 text-right font-semibold">
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {creditNote.items.map((item, index) => {
                          const quantity = Number(item.quantity || 0);

                          const rate = Number(item.rate || 0);

                          const amount = quantity * rate;

                          return (
                            <tr key={item.id || index} className="border-b">
                              {/* # */}

                              <td className="px-3 py-4 text-center">
                                {index + 1}
                              </td>

                              {/* ITEM */}

                              <td className="px-3 py-4">
                                <div className="font-semibold text-foreground">
                                  {item.name}
                                </div>

                                {item.description && (
                                  <div className="mt-1 text-sm text-muted-foreground">
                                    {item.description}
                                  </div>
                                )}
                              </td>

                              {/* QTY */}

                              <td className="px-3 py-4 text-right">
                                {quantity}
                              </td>

                              {/* RATE */}

                              <td className="px-3 py-4 text-right">
                                {formatMoney(rate, creditNote.currency)}
                              </td>

                              {/* TAX */}

                              <td className="px-3 py-4 text-right">
                                {Array.isArray(item.taxes) &&
                                  item.taxes.map((tax, taxIndex) => (
                                    <div
                                      key={`${item.id}-${taxIndex}`}
                                      className="whitespace-nowrap"
                                    >
                                      {tax.name} {Number(tax.rate).toFixed(2)}%
                                    </div>
                                  ))}
                              </td>

                              {/* AMOUNT */}

                              <td className="px-3 py-4 text-right">
                                {formatMoney(amount, creditNote.currency)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* =================================================
                    TOTALS
                ================================================= */}

                <div className="mt-5 flex justify-end">
                  <div className="w-full max-w-[500px]">
                    <table className="w-full text-right text-sm">
                      <tbody>
                        {/* SUB TOTAL */}

                        <tr>
                          <td className="py-2 pr-8">
                            <span className="font-medium text-foreground">
                              Sub Total
                            </span>
                          </td>

                          <td className="py-2">
                            {formatMoney(
                              creditNote.subtotal,
                              creditNote.currency,
                            )}
                          </td>
                        </tr>

                        {/* TAX */}

                        <tr>
                          <td className="py-2 pr-8 font-medium text-foreground">
                            IGST (12.00%)
                          </td>

                          <td className="py-2">
                            {formatMoney(
                              creditNote.totalTax,
                              creditNote.currency,
                            )}
                          </td>
                        </tr>

                        {/* TOTAL */}

                        <tr>
                          <td className="py-2 pr-8">
                            <span className="font-medium text-foreground">
                              Total
                            </span>
                          </td>

                          <td className="py-2 font-medium">
                            {formatMoney(creditNote.total, creditNote.currency)}
                          </td>
                        </tr>

                        {/* CREDITS REMAINING */}

                        <tr>
                          <td className="py-2 pr-8">
                            <span className="font-medium text-foreground">
                              Credits Remaining
                            </span>
                          </td>

                          <td className="py-2">
                            {formatMoney(
                              creditNote.creditsRemaining,
                              creditNote.currency,
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* =================================================
                    NOTE
                ================================================= */}

                {creditNote.note && (
                  <div className="mt-6">
                    <p className="font-medium text-foreground">Note</p>

                    <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {creditNote.note}
                    </div>
                  </div>
                )}

                {/* =================================================
                    TERMS & CONDITIONS
                ================================================= */}

                {creditNote.terms && (
                  <div className="mt-6">
                    <p className="font-medium text-foreground">
                      Terms & Conditions
                    </p>

                    <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {creditNote.terms}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
