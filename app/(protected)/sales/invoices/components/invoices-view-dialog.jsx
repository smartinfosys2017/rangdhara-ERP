"use client";

import { Download } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/* =========================================================
   STATIC INVOICE DATA
========================================================= */

const STATIC_INVOICE = {
  invoiceNumber: "INV-000001",

  status: "Paid",

  companyName: "Rang Dhara",
  companyAddress: "123 Business Avenue, New York, NY 10001",
  companyEmail: "info@rangdhara.com",
  companyPhone: "+1 555 100 2000",

  customer: "Smart",
  customerEmail: "smart@example.com",
  customerPhone: "+1 555 555 5555",

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

  invoiceDate: "2026-09-11",
  dueDate: "2026-10-16",

  saleAgent: "Rang Dhara",

  project: "Website Redesign",

  currency: {
    name: "USD",
    symbol: "$",
  },

  items: [
    {
      id: 1,
      name: "raj",
      description: "raj",
      quantity: 123,
      rate: 11,
      taxes: [
        {
          name: "IGST",
          rate: 12,
        },
      ],
    },
    {
      id: 2,
      name: "dsads",
      description: "sdaasd",
      quantity: 1,
      rate: 10,
      taxes: [
        {
          name: "IGST",
          rate: 12,
        },
      ],
    },
    {
      id: 3,
      name: "terf",
      description: "feerw",
      quantity: 1,
      rate: 12,
      taxes: [
        {
          name: "IGST",
          rate: 12,
        },
      ],
    },
  ],

  subtotal: 33,
  totalTax: 3.96,
  discountAmount: 0,
  adjustment: 0,
  total: 36.96,
  totalPaid: 36.96,
  amountDue: 0,

  clientNote: "weqe",

  terms: "qweqwe",

  payments: [
    {
      id: 1,
      mode: "Bank",
      date: "2026-09-02",
      amount: 36.96,
    },
  ],
};

/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMoney(amount, currency) {
  return `${currency.symbol}${Number(amount || 0).toFixed(2)}`;
}

function getStatusClass(status) {
  const value = String(status || "").toLowerCase();

  if (value === "paid") {
    return "border-green-200 bg-green-100 text-green-700";
  }

  if (value === "sent") {
    return "border-blue-200 bg-blue-100 text-blue-700";
  }

  if (value === "partially paid") {
    return "border-yellow-200 bg-yellow-100 text-yellow-700";
  }

  if (value === "overdue") {
    return "border-red-200 bg-red-100 text-red-700";
  }

  if (value === "cancelled") {
    return "border-gray-200 bg-gray-100 text-gray-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
}

/* =========================================================
   ADDRESS
========================================================= */

function AddressBlock({ address }) {
  return (
    <address className="mt-1 not-italic text-sm leading-6 text-muted-foreground">
      {address?.street && <div>{address.street}</div>}

      <div>{[address?.city, address?.state].filter(Boolean).join(" ")}</div>

      <div>{[address?.country, address?.zip].filter(Boolean).join(" ")}</div>
    </address>
  );
}

/* =========================================================
   COMPONENT
========================================================= */

export default function InvoicesViewDialog({ open, closeDialog }) {
  const invoice = STATIC_INVOICE;

  const handleDownload = () => {
    window.print();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent
        className="
          w-[96vw]
          max-w-[1250px]
          max-h-[95vh]
          overflow-hidden
          p-0
        "
      >
        {/* Accessible Dialog Header */}
        <DialogHeader className="sr-only">
          <DialogTitle>Invoice {invoice.invoiceNumber}</DialogTitle>

          <DialogDescription>Invoice preview</DialogDescription>
        </DialogHeader>

        <div
          id="invoice-preview"
          className="max-h-[95vh] overflow-y-auto bg-muted/20"
        >
          {/* =================================================
              TOP HEADER
          ================================================= */}

          <div className="sticky top-0 z-30 border-b bg-background/95 shadow-sm backdrop-blur">
            <div className="px-5 py-4 sm:px-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="m-0 text-xl font-bold">
                    {invoice.invoiceNumber}
                  </h3>

                  <div className="mt-2">
                    <Badge
                      variant="outline"
                      className={getStatusClass(invoice.status)}
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDownload}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => closeDialog?.()}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              INVOICE DOCUMENT
          ================================================= */}

          <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 lg:px-8">
            <div className="rounded-lg border bg-background shadow-sm">
              <div className="p-5 sm:p-8 lg:p-10">
                {/* =================================================
                    COMPANY LEFT + BILL/SHIP RIGHT
                ================================================= */}

                <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                  {/* =========================
                      LEFT SIDE
                  ========================= */}

                  <div>
                    <h4 className="text-base font-semibold text-foreground">
                      {invoice.invoiceNumber}
                    </h4>

                    <div className="mt-4">
                      <div className="text-base font-semibold">
                        {invoice.companyName}
                      </div>

                      <address className="mt-2 not-italic text-sm leading-6 text-muted-foreground">
                        {invoice.companyAddress}
                      </address>

                      <div className="text-sm leading-6 text-muted-foreground">
                        {invoice.companyEmail}
                      </div>

                      <div className="text-sm leading-6 text-muted-foreground">
                        {invoice.companyPhone}
                      </div>
                    </div>
                  </div>

                  {/* =========================
                      RIGHT SIDE
                  ========================= */}

                  <div className="text-left md:text-right">
                    {/* BILL TO */}

                    <div>
                      <span className="font-medium text-foreground">
                        Bill To
                      </span>

                      <address className="mt-1 not-italic text-sm leading-6 text-muted-foreground">
                        <strong className="font-semibold text-foreground">
                          {invoice.customer}
                        </strong>

                        <div>{invoice.billing.street}</div>

                        <div>
                          {invoice.billing.city} {invoice.billing.state}
                        </div>

                        <div>
                          {invoice.billing.country} {invoice.billing.zip}
                        </div>
                      </address>
                    </div>

                    {/* SHIP TO */}

                    <div className="mt-5">
                      <span className="font-medium text-foreground">
                        Ship To
                      </span>

                      <AddressBlock address={invoice.shipping} />
                    </div>

                    {/* INVOICE INFORMATION */}

                    <div className="mt-5 space-y-1 text-sm">
                      <p className="m-0">
                        <span className="font-medium text-foreground">
                          Invoice Date:
                        </span>{" "}
                        {formatDate(invoice.invoiceDate)}
                      </p>

                      <p className="m-0">
                        <span className="font-medium text-foreground">
                          Due Date:
                        </span>{" "}
                        {formatDate(invoice.dueDate)}
                      </p>

                      <p className="m-0">
                        <span className="font-medium text-foreground">
                          Sale Agent:
                        </span>{" "}
                        {invoice.saleAgent}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator className="my-8" />

                {/* =================================================
                    ITEMS TABLE
                ================================================= */}

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

                        <th className="w-[10%] px-3 py-3 text-right font-semibold">
                          Qty
                        </th>

                        <th className="w-[12%] px-3 py-3 text-right font-semibold">
                          Rate
                        </th>

                        <th className="w-[17%] px-3 py-3 text-right font-semibold">
                          Tax
                        </th>

                        <th className="w-[18%] px-3 py-3 text-right font-semibold">
                          Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {invoice.items.map((item, index) => {
                        const amount =
                          Number(item.quantity) * Number(item.rate);

                        return (
                          <tr key={item.id} className="border-b">
                            <td className="px-3 py-4 text-center">
                              {index + 1}
                            </td>

                            <td className="px-3 py-4">
                              <div className="font-semibold">{item.name}</div>

                              {item.description && (
                                <div className="mt-1 text-sm text-muted-foreground">
                                  {item.description}
                                </div>
                              )}
                            </td>

                            <td className="px-3 py-4 text-right">
                              {item.quantity}
                            </td>

                            <td className="px-3 py-4 text-right">
                              {formatMoney(item.rate, invoice.currency)}
                            </td>

                            <td className="px-3 py-4 text-right">
                              {item.taxes.map((tax) => (
                                <div
                                  key={`${item.id}-${tax.name}`}
                                  className="whitespace-nowrap"
                                >
                                  {tax.name} {Number(tax.rate).toFixed(2)}%
                                </div>
                              ))}
                            </td>

                            <td className="px-3 py-4 text-right">
                              {formatMoney(amount, invoice.currency)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* =================================================
                    TOTALS
                ================================================= */}

                <div className="mt-6 flex justify-end">
                  <div className="w-full max-w-[500px]">
                    <table className="w-full text-right text-sm">
                      <tbody>
                        <tr>
                          <td className="py-2 pr-8 font-semibold">Sub Total</td>

                          <td className="py-2">
                            {formatMoney(invoice.subtotal, invoice.currency)}
                          </td>
                        </tr>

                        <tr>
                          <td className="py-2 pr-8 font-semibold">
                            IGST (12.00%)
                          </td>

                          <td className="py-2">
                            {formatMoney(invoice.totalTax, invoice.currency)}
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3 pr-8 text-base font-bold">
                            Total
                          </td>

                          <td className="py-3 text-base font-bold">
                            {formatMoney(invoice.total, invoice.currency)}
                          </td>
                        </tr>

                        <tr>
                          <td className="py-2 pr-8 font-semibold">
                            Total Paid
                          </td>

                          <td className="py-2">
                            -{formatMoney(invoice.totalPaid, invoice.currency)}
                          </td>
                        </tr>

                        <tr>
                          <td className="py-3 pr-8 font-bold">Amount Due</td>

                          <td className="py-3 font-bold">
                            {formatMoney(invoice.amountDue, invoice.currency)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* =================================================
                    NOTE
                ================================================= */}

                <div className="mt-8">
                  <p className="font-semibold">Note:</p>

                  <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {invoice.clientNote}
                  </div>
                </div>

                {/* =================================================
                    TERMS & CONDITIONS
                ================================================= */}

                <div className="mt-8">
                  <Separator className="mb-6" />

                  <p className="font-semibold">Terms & Conditions</p>

                  <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {invoice.terms}
                  </div>
                </div>

                {/* =================================================
                    TRANSACTIONS
                ================================================= */}

                <div className="mt-8">
                  <Separator className="mb-6" />

                  <p className="font-semibold">Transactions</p>

                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full min-w-[650px] text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="px-3 py-3 text-left font-semibold">
                            Payment #
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            Payment Mode
                          </th>

                          <th className="px-3 py-3 text-left font-semibold">
                            Date
                          </th>

                          <th className="px-3 py-3 text-right font-semibold">
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {invoice.payments.map((payment, index) => (
                          <tr key={payment.id} className="border-b">
                            <td className="px-3 py-3">{index + 1}</td>

                            <td className="px-3 py-3">{payment.mode}</td>

                            <td className="px-3 py-3">
                              {formatDate(payment.date)}
                            </td>

                            <td className="px-3 py-3 text-right font-medium">
                              {formatMoney(payment.amount, invoice.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Separator className="mt-8" />

                <div className="flex justify-end pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => closeDialog?.()}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
