"use client";

import { useMemo } from "react";

import {
  CalendarDays,
  Check,
  Download,
  FileText,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// -----------------------------------------------------------------------------
// STATIC DATA
// -----------------------------------------------------------------------------

const CUSTOMERS = [
  {
    id: "1",
    name: "Acme Corporation",
    email: "billing@acme.com",
    phone: "+1 555 100 2000",
    street: "123 Business Avenue",
    city: "New York",
    state: "NY",
    country: "United States",
    zip: "10001",
  },
  {
    id: "2",
    name: "Globex Corporation",
    email: "accounts@globex.com",
    phone: "+1 555 200 3000",
    street: "456 Market Street",
    city: "San Francisco",
    state: "CA",
    country: "United States",
    zip: "94105",
  },
  {
    id: "3",
    name: "Wayne Enterprises",
    email: "finance@wayne.com",
    phone: "+1 555 300 4000",
    street: "1007 Mountain Drive",
    city: "Gotham",
    state: "NJ",
    country: "United States",
    zip: "07001",
  },
];

const PROJECTS = [
  {
    id: "1",
    name: "Website Redesign",
    customerId: "1",
  },
  {
    id: "2",
    name: "CRM Development",
    customerId: "1",
  },
  {
    id: "3",
    name: "Mobile Application",
    customerId: "2",
  },
  {
    id: "4",
    name: "ERP Implementation",
    customerId: "3",
  },
];

const TAXES = [
  {
    id: "igst",
    name: "IGST",
    rate: 12,
  },
  {
    id: "gst",
    name: "GST",
    rate: 18,
  },
  {
    id: "vat",
    name: "VAT",
    rate: 10,
  },
];

const CURRENCIES = [
  {
    id: "1",
    name: "USD",
    symbol: "$",
  },
  {
    id: "2",
    name: "EUR",
    symbol: "€",
  },
  {
    id: "3",
    name: "INR",
    symbol: "₹",
  },
];

const STATUSES = [
  {
    id: "1",
    name: "Draft",
  },
  {
    id: "2",
    name: "Sent",
  },
  {
    id: "5",
    name: "Expired",
  },
  {
    id: "3",
    name: "Declined",
  },
  {
    id: "4",
    name: "Accepted",
  },
];

const SALE_AGENTS = [
  {
    id: "1",
    name: "Rang Dhara",
  },
];

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function formatMoney(amount, currency) {
  return `${currency?.symbol || "$"}${Number(amount || 0).toLocaleString(
    "en-US",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
}

function formatDate(value) {
  if (!value) {
    return "--";
  }

  const dateString =
    typeof value === "string" && value.includes("T")
      ? value.split("T")[0]
      : value;

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getCustomer(estimate) {
  if (!estimate) {
    return null;
  }

  return (
    CUSTOMERS.find(
      (customer) =>
        String(customer.id) === String(estimate.customerId),
    ) ||
    CUSTOMERS.find(
      (customer) =>
        customer.name.toLowerCase() ===
        String(estimate.customer || "").toLowerCase(),
    ) ||
    null
  );
}

function getProject(estimate) {
  if (!estimate) {
    return null;
  }

  return (
    PROJECTS.find(
      (project) =>
        String(project.id) === String(estimate.projectId),
    ) ||
    PROJECTS.find(
      (project) =>
        project.name.toLowerCase() ===
        String(estimate.project || "").toLowerCase(),
    ) ||
    null
  );
}

function getCurrency(estimate) {
  if (!estimate) {
    return CURRENCIES[0];
  }

  return (
    CURRENCIES.find(
      (currency) =>
        String(currency.id) ===
        String(
          estimate.currencyId ||
            estimate.currency ||
            "",
        ),
    ) ||
    CURRENCIES.find(
      (currency) =>
        currency.name.toLowerCase() ===
        String(estimate.currency || "").toLowerCase(),
    ) ||
    CURRENCIES[0]
  );
}

function getStatus(estimate) {
  if (!estimate) {
    return null;
  }

  return (
    STATUSES.find(
      (status) =>
        String(status.id) ===
        String(estimate.status),
    ) ||
    STATUSES.find(
      (status) =>
        status.name.toLowerCase() ===
        String(estimate.status || "").toLowerCase(),
    ) ||
    null
  );
}

function getSaleAgent(estimate) {
  if (!estimate) {
    return null;
  }

  return (
    SALE_AGENTS.find(
      (agent) =>
        String(agent.id) ===
        String(estimate.saleAgent),
    ) ||
    SALE_AGENTS.find(
      (agent) =>
        agent.name.toLowerCase() ===
        String(estimate.saleAgent || "").toLowerCase(),
    ) ||
    null
  );
}

function normalizeTaxes(taxes) {
  if (!Array.isArray(taxes)) {
    return [];
  }

  return taxes
    .map((tax) => {
      if (typeof tax === "string") {
        return (
          TAXES.find(
            (taxItem) =>
              taxItem.id === tax ||
              taxItem.name.toLowerCase() === tax.toLowerCase(),
          ) || {
            id: tax,
            name: tax,
            rate: 0,
          }
        );
      }

      return (
        TAXES.find(
          (taxItem) =>
            taxItem.id === String(tax.id) ||
            taxItem.name.toLowerCase() ===
              String(tax.name || "").toLowerCase(),
        ) || {
          id: tax.id || `tax-${Date.now()}`,
          name: tax.name || "Tax",
          rate: Number(tax.rate || 0),
        }
      );
    })
    .filter(Boolean);
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item, index) => ({
    id:
      item.id ||
      item.itemId ||
      `estimate-item-${index}`,

    name:
      item.name ||
      item.description ||
      "",

    description:
      item.description ||
      item.name ||
      "",

    longDescription:
      item.longDescription ||
      item.long_description ||
      "",

    quantity: Number(
      item.quantity ??
        item.qty ??
        1,
    ),

    unit: item.unit || "",

    rate: Number(
      item.rate ??
        item.price ??
        0,
    ),

    taxes: normalizeTaxes(
      item.taxes,
    ),

    optional: Boolean(
      item.optional,
    ),
  }));
}

// -----------------------------------------------------------------------------
// STATUS BADGE
// -----------------------------------------------------------------------------

function StatusBadge({ status }) {
  const statusName = status?.name || "Draft";

  const classes = {
    Draft:
      "bg-muted text-muted-foreground",

    Sent:
      "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",

    Expired:
      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",

    Declined:
      "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",

    Accepted:
      "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        classes[statusName] || classes.Draft
      }`}
    >
      {statusName}
    </span>
  );
}

// -----------------------------------------------------------------------------
// ADDRESS
// -----------------------------------------------------------------------------

function AddressBlock({ address }) {
  if (!address) {
    return null;
  }

  return (
    <address className="not-italic text-sm leading-6 text-muted-foreground">
      {address.street && (
        <div>{address.street}</div>
      )}

      {(address.city || address.state) && (
        <div>
          {address.city}
          {address.city && address.state
            ? ", "
            : ""}
          {address.state}
        </div>
      )}

      {(address.country || address.zip) && (
        <div>
          {address.country}
          {address.country && address.zip
            ? " "
            : ""}
          {address.zip}
        </div>
      )}
    </address>
  );
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export default function EstimatesViewDialog({
  open,
  closeDialog,
  estimate,
}) {
  const customer = useMemo(
    () => getCustomer(estimate),
    [estimate],
  );

  const project = useMemo(
    () => getProject(estimate),
    [estimate],
  );

  const currency = useMemo(
    () => getCurrency(estimate),
    [estimate],
  );

  const status = useMemo(
    () => getStatus(estimate),
    [estimate],
  );

  const saleAgent = useMemo(
    () => getSaleAgent(estimate),
    [estimate],
  );

  const items = useMemo(
    () => normalizeItems(estimate?.items),
    [estimate],
  );

  // ---------------------------------------------------------------------------
  // ESTIMATE NUMBER
  // ---------------------------------------------------------------------------

  const estimateNumber = useMemo(() => {
    const value =
      estimate?.estimateNumber ||
      estimate?.estimateNo ||
      estimate?.number ||
      estimate?.id;

    if (!value) {
      return "EST-000000";
    }

    const stringValue = String(value);

    if (
      stringValue
        .toUpperCase()
        .startsWith("EST-")
    ) {
      return stringValue;
    }

    return `EST-${stringValue.padStart(
      6,
      "0",
    )}`;
  }, [estimate]);

  // ---------------------------------------------------------------------------
  // ADDRESSES
  // ---------------------------------------------------------------------------

  const billing =
    estimate?.billing ||
    estimate?.billingAddress ||
    customer;

  const shipping =
    estimate?.shipping ||
    estimate?.shippingAddress ||
    null;

  const includeShipping =
    Boolean(
      estimate?.includeShipping ||
        estimate?.shipping ||
        estimate?.shippingAddress,
    );

  // ---------------------------------------------------------------------------
  // CALCULATIONS
  // ---------------------------------------------------------------------------

  const calculatedSubtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) *
            Number(item.rate || 0),
        0,
      ),
    [items],
  );

  const calculatedTax = useMemo(
    () =>
      items.reduce(
        (sum, item) => {
          const amount =
            Number(item.quantity || 0) *
            Number(item.rate || 0);

          const taxRate =
            item.taxes.reduce(
              (taxSum, tax) =>
                taxSum +
                Number(tax.rate || 0),
              0,
            );

          return (
            sum +
            (amount * taxRate) / 100
          );
        },
        0,
      ),
    [items],
  );

  const subtotal =
    estimate?.subtotal !== undefined
      ? Number(
          estimate.subtotal || 0,
        )
      : calculatedSubtotal;

  const totalTax =
    estimate?.totalTax !== undefined
      ? Number(
          estimate.totalTax || 0,
        )
      : calculatedTax;

  const discountMode =
    estimate?.discountMode ||
    "percent";

  const calculatedDiscount =
    estimate?.discountAmount !==
    undefined
      ? Number(
          estimate.discountAmount ||
            0,
        )
      : discountMode === "fixed"
        ? Math.min(
            Number(
              estimate?.discountFixed ||
                0,
            ),
            subtotal,
          )
        : (subtotal *
            Number(
              estimate?.discountPercent ||
                0,
            )) /
          100;

  const discountType =
    estimate?.discountType || "";

  const discountAmount =
    discountType === "before_tax" ||
    discountType === "after_tax"
      ? calculatedDiscount
      : 0;

  const adjustment =
    Number(
      estimate?.adjustment || 0,
    );

  const calculatedTotal =
    Math.max(
      0,
      subtotal +
        totalTax -
        discountAmount +
        adjustment,
    );

  const total =
    estimate?.total !== undefined
      ? Number(
          estimate.total || 0,
        )
      : calculatedTotal;

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------

  const handleDownload = () => {
    window.print();
  };

  const handleAccept = () => {
    console.log(
      "Accept estimate:",
      estimate,
    );
  };

  const handleDecline = () => {
    console.log(
      "Decline estimate:",
      estimate,
    );
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

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
          max-w-[1400px]
          overflow-hidden
          p-0
        "
      >
        {/* =============================================================== */}
        {/* DIALOG HEADER */}
        {/* =============================================================== */}

        <DialogHeader className="border-b px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">
                {estimateNumber}
              </DialogTitle>

              <DialogDescription className="mt-1">
                Estimate preview
              </DialogDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="size-4" />
                Download
              </Button>

              {status?.name !== "Declined" &&
                status?.name !== "Accepted" && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDecline}
                    >
                      <X className="size-4" />
                      Decline
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAccept}
                    >
                      <Check className="size-4" />
                      Accept
                    </Button>
                  </>
                )}
            </div>
          </div>
        </DialogHeader>

        {/* =============================================================== */}
        {/* SCROLLABLE PREVIEW */}
        {/* =============================================================== */}

        <div className="max-h-[calc(95vh-150px)] overflow-y-auto bg-muted/20">
          {!estimate ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <FileText className="mx-auto mb-3 size-10 text-muted-foreground" />

                <h3 className="font-semibold">
                  Estimate not found
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Estimate information is not available.
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-[1100px] p-4 sm:p-6 lg:p-8">
              {/* ========================================================= */}
              {/* ESTIMATE DOCUMENT */}
              {/* ========================================================= */}

              <div className="rounded-lg border bg-background shadow-sm">
                <div className="p-5 sm:p-8 lg:p-10">
                  {/* ===================================================== */}
                  {/* COMPANY / LOGO */}
                  {/* ===================================================== */}

                  <div className="mb-8">
                    <div className="flex items-start justify-between gap-6">
                      <div>
                        {estimate.companyLogo ? (
                          <img
                            src={
                              estimate.companyLogo
                            }
                            alt="Company Logo"
                            className="max-h-16 max-w-[220px] object-contain"
                          />
                        ) : (
                          <div className="text-2xl font-bold">
                            Rang Dhara
                          </div>
                        )}

                        <div className="mt-1 text-sm text-muted-foreground">
                          Estimate
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold">
                          {estimateNumber}
                        </div>

                        <div className="mt-2">
                          <StatusBadge
                            status={
                              status
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t" />

                  {/* ===================================================== */}
                  {/* BILLING INFORMATION */}
                  {/* ===================================================== */}

                  <div className="py-8">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                      {/* COMPANY */}
                      <div>
                        <h3 className="mb-3 text-lg font-bold">
                          {estimateNumber}
                        </h3>

                        <div className="text-sm leading-6 text-muted-foreground">
                          <div className="font-semibold text-foreground">
                            Rang Dhara
                          </div>

                          {estimate.companyAddress && (
                            <div className="mt-1 whitespace-pre-line">
                              {
                                estimate.companyAddress
                              }
                            </div>
                          )}

                          {estimate.companyEmail && (
                            <div>
                              {
                                estimate.companyEmail
                              }
                            </div>
                          )}

                          {estimate.companyPhone && (
                            <div>
                              {
                                estimate.companyPhone
                              }
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CUSTOMER */}
                      <div className="md:text-right">
                        <div className="mb-2 text-sm font-medium text-muted-foreground">
                          To
                        </div>

                        {customer?.name && (
                          <div className="mb-1 text-sm font-bold text-foreground">
                            {customer.name}
                          </div>
                        )}

                        <div className="md:flex md:justify-end">
                          <AddressBlock
                            address={
                              billing
                            }
                          />
                        </div>

                        {customer?.email && (
                          <div className="mt-1 break-all text-sm text-muted-foreground">
                            {
                              customer.email
                            }
                          </div>
                        )}

                        {customer?.phone && (
                          <div className="text-sm text-muted-foreground">
                            {
                              customer.phone
                            }
                          </div>
                        )}

                        {/* SHIPPING */}
                        {includeShipping &&
                          shipping && (
                            <div className="mt-6">
                              <div className="mb-2 text-sm font-medium text-muted-foreground">
                                Ship to
                              </div>

                              <div className="md:flex md:justify-end">
                                <AddressBlock
                                  address={
                                    shipping
                                  }
                                />
                              </div>
                            </div>
                          )}

                        {/* DATES */}
                        <div className="mt-6 space-y-2 text-sm">
                          <div>
                            <span className="font-medium">
                              Estimate Date:
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {formatDate(
                                estimate.estimateDate ||
                                  estimate.date,
                              )}
                            </span>
                          </div>

                          <div>
                            <span className="font-medium">
                              Expiry Date:
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {formatDate(
                                estimate.expiryDate,
                              )}
                            </span>
                          </div>

                          <div>
                            <span className="font-medium">
                              Sale Agent:
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {saleAgent?.name ||
                                estimate.saleAgent ||
                                "--"}
                            </span>
                          </div>

                          {project?.name ||
                            estimate.project ? (
                            <div>
                              <span className="font-medium">
                                Project:
                              </span>{" "}
                              <span className="text-muted-foreground">
                                {project?.name ||
                                  estimate.project}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ===================================================== */}
                  {/* ITEMS */}
                  {/* ===================================================== */}

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[750px] border-collapse text-sm">
                      <thead>
                        <tr className="border-y bg-muted/40">
                          <th className="w-[6%] px-3 py-3 text-center font-semibold">
                            #
                          </th>

                          <th className="w-[38%] px-3 py-3 text-left font-semibold">
                            Item
                          </th>

                          <th className="w-[12%] px-3 py-3 text-right font-semibold">
                            Qty
                          </th>

                          <th className="w-[14%] px-3 py-3 text-right font-semibold">
                            Rate
                          </th>

                          <th className="w-[15%] px-3 py-3 text-right font-semibold">
                            Tax
                          </th>

                          <th className="w-[15%] px-3 py-3 text-right font-semibold">
                            Amount
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {items.length > 0 ? (
                          items.map(
                            (
                              item,
                              index,
                            ) => {
                              const amount =
                                Number(
                                  item.quantity ||
                                    0,
                                ) *
                                Number(
                                  item.rate ||
                                    0,
                                );

                              return (
                                <tr
                                  key={`${item.id}-${index}`}
                                  className="border-b align-top"
                                >
                                  <td className="px-3 py-4 text-center">
                                    {index +
                                      1}
                                  </td>

                                  <td className="px-3 py-4">
                                    <div className="font-semibold">
                                      {item.name ||
                                        item.description ||
                                        `Item ${
                                          index +
                                          1
                                        }`}
                                    </div>

                                    {item.longDescription ||
                                    item.description ? (
                                      <div className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                                        {item.longDescription ||
                                          item.description}
                                      </div>
                                    ) : null}

                                    {item.optional && (
                                      <span className="mt-2 inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                                        Optional
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-3 py-4 text-right">
                                    {
                                      item.quantity
                                    }

                                    {item.unit
                                      ? ` ${item.unit}`
                                      : ""}
                                  </td>

                                  <td className="px-3 py-4 text-right">
                                    {formatMoney(
                                      item.rate,
                                      currency,
                                    )}
                                  </td>

                                  <td className="px-3 py-4 text-right">
                                    {item.taxes
                                      .length >
                                    0 ? (
                                      <div className="space-y-1">
                                        {item.taxes.map(
                                          (
                                            tax,
                                            taxIndex,
                                          ) => (
                                            <div
                                              key={`${tax.id}-${taxIndex}`}
                                              className="whitespace-nowrap"
                                            >
                                              {
                                                tax.name
                                              }{" "}
                                              {Number(
                                                tax.rate,
                                              ).toFixed(
                                                2,
                                              )}
                                              %
                                            </div>
                                          ),
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-muted-foreground">
                                        -
                                      </span>
                                    )}
                                  </td>

                                  <td className="px-3 py-4 text-right font-medium">
                                    {formatMoney(
                                      amount,
                                      currency,
                                    )}
                                  </td>
                                </tr>
                              );
                            },
                          )
                        ) : (
                          <tr>
                            <td
                              colSpan={
                                6
                              }
                              className="px-4 py-10 text-center text-muted-foreground"
                            >
                              No items found
                              for this
                              estimate.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* ===================================================== */}
                  {/* TOTALS */}
                  {/* ===================================================== */}

                  <div className="mt-6 flex justify-end">
                    <div className="w-full max-w-md">
                      <table className="w-full text-sm">
                        <tbody>
                          <tr>
                            <td className="py-2 text-right font-semibold">
                              Sub Total
                            </td>

                            <td className="w-[160px] py-2 text-right">
                              {formatMoney(
                                subtotal,
                                currency,
                              )}
                            </td>
                          </tr>

                          {discountAmount >
                            0 && (
                            <tr>
                              <td className="py-2 text-right font-semibold">
                                Discount
                              </td>

                              <td className="py-2 text-right">
                                -
                                {formatMoney(
                                  discountAmount,
                                  currency,
                                )}
                              </td>
                            </tr>
                          )}

                          {totalTax >
                            0 && (
                            <tr>
                              <td className="py-2 text-right font-semibold">
                                Total Tax
                              </td>

                              <td className="py-2 text-right">
                                {formatMoney(
                                  totalTax,
                                  currency,
                                )}
                              </td>
                            </tr>
                          )}

                          {adjustment !==
                            0 && (
                            <tr>
                              <td className="py-2 text-right font-semibold">
                                Adjustment
                              </td>

                              <td className="py-2 text-right">
                                {formatMoney(
                                  adjustment,
                                  currency,
                                )}
                              </td>
                            </tr>
                          )}

                          <tr className="border-t">
                            <td className="pt-4 text-right text-base font-bold">
                              Total
                            </td>

                            <td className="pt-4 text-right text-lg font-bold">
                              {formatMoney(
                                total,
                                currency,
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ===================================================== */}
                  {/* NOTE */}
                  {/* ===================================================== */}

                  {estimate.clientNote && (
                    <div className="mt-10">
                      <p className="mb-2 font-semibold">
                        Note:
                      </p>

                      <div className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                        {
                          estimate.clientNote
                        }
                      </div>
                    </div>
                  )}

                  {/* ===================================================== */}
                  {/* TERMS */}
                  {/* ===================================================== */}

                  {estimate.terms && (
                    <div className="mt-8 border-t pt-6">
                      <p className="mb-2 font-semibold">
                        Terms & Conditions
                      </p>

                      <div className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
                        {
                          estimate.terms
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* =============================================================== */}
        {/* FOOTER */}
        {/* =============================================================== */}

        <DialogFooter className="border-t bg-background px-6 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}