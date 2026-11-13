"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

// ============================================================
// STATIC DATA
// ============================================================

const CUSTOMERS = [
  {
    id: "1",
    name: "Acme Corporation",
    email: "billing@acme.com",
    phone: "+1 555-123-4567",
    street: "123 Main Street",
    city: "New York",
    state: "NY",
    zip: "10001",
    country: "USA",
  },
  {
    id: "2",
    name: "Globex Corporation",
    email: "accounts@globex.com",
    phone: "+1 555-987-6543",
    street: "456 Market Street",
    city: "San Francisco",
    state: "CA",
    zip: "94105",
    country: "USA",
  },
  {
    id: "3",
    name: "Wayne Enterprises",
    email: "finance@wayne.com",
    phone: "+1 555-555-5555",
    street: "1007 Mountain Drive",
    city: "Gotham",
    state: "NJ",
    zip: "07001",
    country: "USA",
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

const ITEMS = [
  {
    id: "1",
    name: "Website Development",
    description: "web-dev",
    rate: 1500,
    unit: "project",
  },
  {
    id: "2",
    name: "UI/UX Design",
    description: "design",
    rate: 750,
    unit: "project",
  },
  {
    id: "3",
    name: "SEO Optimization",
    description: "seo",
    rate: 500,
    unit: "month",
  },
  {
    id: "4",
    name: "Consulting",
    description: "consulting",
    rate: 125,
    unit: "hour",
  },
];

const TAXES = [
  {
    id: "1",
    name: "IGST",
    rate: 12,
  },
  {
    id: "2",
    name: "GST",
    rate: 18,
  },
  {
    id: "3",
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
    id: "3",
    name: "Paid",
  },
  {
    id: "4",
    name: "Partially Paid",
  },
  {
    id: "5",
    name: "Overdue",
  },
  {
    id: "6",
    name: "Cancelled",
  },
];

const SALE_AGENTS = ["Rang Dhara"];

// ============================================================
// HELPERS
// ============================================================

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getDueDate() {
  const date = new Date();

  date.setDate(date.getDate() + 7);

  return date.toISOString().split("T")[0];
}

function formatMoney(amount, currency) {
  return `${currency?.symbol || "$"}${Number(amount || 0).toFixed(2)}`;
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
}

function createEmptyItem() {
  return {
    id: null,
    description: "",
    longDescription: "",
    quantity: 1,
    unit: "",
    rate: 0,
    taxes: [],
    optional: false,
  };
}

function findIdByValue(list, value, nameKeys = ["name"]) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "object") {
    value =
      value.id ?? value.value ?? value.name ?? value.code ?? value.symbol ?? "";
  }

  const stringValue = String(value);

  const directMatch = list.find((item) => String(item.id) === stringValue);

  if (directMatch) {
    return String(directMatch.id);
  }

  const nameMatch = list.find((item) =>
    nameKeys.some(
      (key) =>
        item[key] &&
        String(item[key]).toLowerCase() === stringValue.toLowerCase(),
    ),
  );

  return nameMatch ? String(nameMatch.id) : "";
}

function normalizeTaxes(taxes) {
  if (!Array.isArray(taxes)) {
    return [];
  }

  return taxes
    .map((tax) => {
      if (typeof tax === "object") {
        return findIdByValue(TAXES, tax.id ?? tax.name ?? tax.rate, [
          "name",
          "rate",
        ]);
      }

      return findIdByValue(TAXES, tax, ["name", "rate"]);
    })
    .filter(Boolean);
}

function normalizeInvoiceItems(invoiceItems) {
  if (!Array.isArray(invoiceItems)) {
    return [];
  }

  return invoiceItems.map((item, index) => ({
    id: item.id ?? index + 1,

    description: item.description ?? item.name ?? "",

    longDescription: item.longDescription ?? item.long_description ?? "",

    quantity: normalizeNumber(item.quantity, 1),

    unit: item.unit ?? "",

    rate: normalizeNumber(item.rate ?? item.price ?? item.amount, 0),

    taxes: normalizeTaxes(item.taxes),

    optional: Boolean(item.optional),
  }));
}

// ============================================================
// COMPONENT
// ============================================================

export default function InvoicesEditDialog({
  open,
  closeDialog,
  onSuccess,
  invoice,
}) {
  // ----------------------------------------------------------
  // BASIC INFORMATION
  // ----------------------------------------------------------

  const [customerId, setCustomerId] = useState("");

  const [projectId, setProjectId] = useState("");

  const [invoiceNumber, setInvoiceNumber] = useState("");

  const [invoiceDate, setInvoiceDate] = useState(getToday());

  const [dueDate, setDueDate] = useState(getDueDate());

  const [referenceNo, setReferenceNo] = useState("");

  const [tags, setTags] = useState("");

  const [currencyId, setCurrencyId] = useState(CURRENCIES[0]?.id || "1");

  const [status, setStatus] = useState(STATUSES[0]?.id || "1");

  const [saleAgent, setSaleAgent] = useState(SALE_AGENTS[0] || "");

  const [discountType, setDiscountType] = useState("before_tax");

  const [adminNote, setAdminNote] = useState("");

  // ----------------------------------------------------------
  // BILLING
  // ----------------------------------------------------------

  const [billing, setBilling] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });

  // ----------------------------------------------------------
  // SHIPPING
  // ----------------------------------------------------------

  const [includeShipping, setIncludeShipping] = useState(false);

  const [showShippingOnInvoice, setShowShippingOnInvoice] = useState(true);

  const [shipping, setShipping] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });

  const [shippingDialogOpen, setShippingDialogOpen] = useState(false);

  // ----------------------------------------------------------
  // ITEMS
  // ----------------------------------------------------------

  const [items, setItems] = useState([]);

  const [selectedItemId, setSelectedItemId] = useState(null);

  const [showQuantityAs, setShowQuantityAs] = useState("1");

  const [currentItem, setCurrentItem] = useState(createEmptyItem());

  // ----------------------------------------------------------
  // DISCOUNT / TOTAL
  // ----------------------------------------------------------

  const [discountMode, setDiscountMode] = useState("percent");

  const [discountPercent, setDiscountPercent] = useState(0);

  const [discountFixed, setDiscountFixed] = useState(0);

  const [adjustment, setAdjustment] = useState(0);

  // ----------------------------------------------------------
  // NOTES
  // ----------------------------------------------------------

  const [clientNote, setClientNote] = useState("");

  const [terms, setTerms] = useState("");

  // ----------------------------------------------------------
  // ERRORS
  // ----------------------------------------------------------

  const [errors, setErrors] = useState({});

  // ==========================================================
  // DERIVED DATA
  // ==========================================================

  const selectedCustomer = useMemo(() => {
    return CUSTOMERS.find(
      (customer) => String(customer.id) === String(customerId),
    );
  }, [customerId]);

  const selectedCurrency = useMemo(() => {
    return (
      CURRENCIES.find(
        (currency) => String(currency.id) === String(currencyId),
      ) || CURRENCIES[0]
    );
  }, [currencyId]);

  const filteredProjects = useMemo(() => {
    return PROJECTS.filter(
      (project) => String(project.customerId) === String(customerId),
    );
  }, [customerId]);

  // ==========================================================
  // LOAD INVOICE DATA
  // ==========================================================

  useEffect(() => {
    if (!open || !invoice) {
      return;
    }

    const customerValue =
      invoice.customerId ?? invoice.customer_id ?? invoice.customer ?? "";

    const projectValue =
      invoice.projectId ?? invoice.project_id ?? invoice.project ?? "";

    const currencyValue =
      invoice.currencyId ?? invoice.currency_id ?? invoice.currency ?? "";

    const statusValue = invoice.status ?? "1";

    // --------------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------------

    const normalizedCustomerId = findIdByValue(CUSTOMERS, customerValue, [
      "name",
    ]);

    setCustomerId(normalizedCustomerId);

    // --------------------------------------------------------
    // PROJECT
    // --------------------------------------------------------

    const normalizedProjectId = findIdByValue(PROJECTS, projectValue, ["name"]);

    setProjectId(normalizedProjectId);

    // --------------------------------------------------------
    // INVOICE NUMBER
    // --------------------------------------------------------

    setInvoiceNumber(
      String(invoice.invoiceNumber ?? invoice.invoiceNo ?? "").replace(
        /^INV-/i,
        "",
      ),
    );

    // --------------------------------------------------------
    // DATES
    // --------------------------------------------------------

    setInvoiceDate(
      invoice.invoiceDate ?? invoice.invoice_date ?? invoice.date ?? getToday(),
    );

    setDueDate(invoice.dueDate ?? invoice.due_date ?? getDueDate());

    // --------------------------------------------------------
    // OTHER INFORMATION
    // --------------------------------------------------------

    setReferenceNo(invoice.referenceNo ?? invoice.reference_no ?? "");

    setTags(
      Array.isArray(invoice.tags)
        ? invoice.tags.join(", ")
        : (invoice.tags ?? ""),
    );

    // --------------------------------------------------------
    // CURRENCY
    // --------------------------------------------------------

    const normalizedCurrencyId = findIdByValue(CURRENCIES, currencyValue, [
      "name",
      "code",
      "symbol",
    ]);

    setCurrencyId(normalizedCurrencyId || CURRENCIES[0]?.id);

    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    const normalizedStatus = findIdByValue(STATUSES, statusValue, ["name"]);

    setStatus(normalizedStatus || STATUSES[0]?.id);

    // --------------------------------------------------------
    // SALE AGENT
    // --------------------------------------------------------

    setSaleAgent(
      invoice.saleAgent ?? invoice.sale_agent ?? SALE_AGENTS[0] ?? "",
    );

    // --------------------------------------------------------
    // DISCOUNT TYPE
    // --------------------------------------------------------

    setDiscountType(
      invoice.discountType ?? invoice.discount_type ?? "before_tax",
    );

    // --------------------------------------------------------
    // BILLING
    // --------------------------------------------------------

    if (invoice.billing) {
      setBilling({
        street: invoice.billing.street ?? "",
        city: invoice.billing.city ?? "",
        state: invoice.billing.state ?? "",
        zip: invoice.billing.zip ?? "",
        country: invoice.billing.country ?? "",
      });
    } else if (normalizedCustomerId) {
      const customer = CUSTOMERS.find(
        (item) => String(item.id) === String(normalizedCustomerId),
      );

      if (customer) {
        setBilling({
          street: customer.street || "",
          city: customer.city || "",
          state: customer.state || "",
          zip: customer.zip || "",
          country: customer.country || "",
        });
      }
    }

    // --------------------------------------------------------
    // SHIPPING
    // --------------------------------------------------------

    if (invoice.shipping) {
      setIncludeShipping(true);

      setShowShippingOnInvoice(invoice.shipping.showOnInvoice !== false);

      setShipping({
        street: invoice.shipping.street ?? "",
        city: invoice.shipping.city ?? "",
        state: invoice.shipping.state ?? "",
        zip: invoice.shipping.zip ?? "",
        country: invoice.shipping.country ?? "",
      });
    } else {
      setIncludeShipping(false);

      setShowShippingOnInvoice(true);

      setShipping({
        street: "",
        city: "",
        state: "",
        zip: "",
        country: "",
      });
    }

    // --------------------------------------------------------
    // ITEMS
    // --------------------------------------------------------

    const normalizedItems = normalizeInvoiceItems(invoice.items);

    setItems(normalizedItems);

    setSelectedItemId(null);

    setCurrentItem(createEmptyItem());

    // --------------------------------------------------------
    // QUANTITY
    // --------------------------------------------------------

    setShowQuantityAs(
      invoice.showQuantityAs ?? invoice.show_quantity_as ?? "1",
    );

    // --------------------------------------------------------
    // DISCOUNT
    // --------------------------------------------------------

    setDiscountMode(invoice.discountMode ?? invoice.discount_mode ?? "percent");

    setDiscountPercent(
      normalizeNumber(invoice.discountPercent ?? invoice.discount_percent, 0),
    );

    setDiscountFixed(
      normalizeNumber(invoice.discountFixed ?? invoice.discount_fixed, 0),
    );

    // --------------------------------------------------------
    // ADJUSTMENT
    // --------------------------------------------------------

    setAdjustment(normalizeNumber(invoice.adjustment, 0));

    // --------------------------------------------------------
    // NOTES
    // --------------------------------------------------------

    setAdminNote(invoice.adminNote ?? invoice.admin_note ?? "");

    setClientNote(invoice.clientNote ?? invoice.client_note ?? "");

    setTerms(invoice.terms ?? "");

    // --------------------------------------------------------
    // RESET ERRORS
    // --------------------------------------------------------

    setErrors({});
  }, [open, invoice]);

  // ==========================================================
  // CUSTOMER CHANGE
  // ==========================================================

  const handleCustomerChange = (value) => {
    setCustomerId(value);

    setProjectId("");

    const customer = CUSTOMERS.find(
      (item) => String(item.id) === String(value),
    );

    if (!customer) {
      return;
    }

    setBilling({
      street: customer.street || "",
      city: customer.city || "",
      state: customer.state || "",
      zip: customer.zip || "",
      country: customer.country || "",
    });

    if (!includeShipping) {
      setShipping({
        street: customer.street || "",
        city: customer.city || "",
        state: customer.state || "",
        zip: customer.zip || "",
        country: customer.country || "",
      });
    }
  };

  // ==========================================================
  // ITEM SELECT
  // ==========================================================

  const handleItemSelect = (value) => {
    setSelectedItemId(value);

    const selected = ITEMS.find((item) => String(item.id) === String(value));

    if (!selected) {
      setCurrentItem(createEmptyItem());

      return;
    }

    setCurrentItem({
      id: selected.id,
      description: selected.name || "",
      longDescription: selected.description || "",
      quantity: 1,
      unit: selected.unit || "",
      rate: normalizeNumber(selected.rate, 0),
      taxes: [],
      optional: false,
    });
  };

  // ==========================================================
  // TAX TOGGLE
  // ==========================================================

  const handleTaxToggle = (taxId) => {
    setCurrentItem((previous) => {
      const taxes = previous.taxes || [];

      const exists = taxes.includes(String(taxId));

      return {
        ...previous,

        taxes: exists
          ? taxes.filter((id) => id !== String(taxId))
          : [...taxes, String(taxId)],
      };
    });
  };

  // ==========================================================
  // ADD ITEM
  // ==========================================================

  const handleAddItem = () => {
    const description = String(currentItem.description || "").trim();

    const quantity = normalizeNumber(currentItem.quantity, 0);

    const rate = normalizeNumber(currentItem.rate, 0);

    if (!description) {
      toast.error("Item description is required.");

      return;
    }

    if (quantity <= 0) {
      toast.error("Quantity must be greater than 0.");

      return;
    }

    if (rate < 0) {
      toast.error("Rate cannot be negative.");

      return;
    }

    const itemToAdd = {
      ...currentItem,
      id: currentItem.id ?? `item-${Date.now()}`,
      description,
      quantity,
      rate,
      taxes: currentItem.taxes || [],
    };

    setItems((previous) => [...previous, itemToAdd]);

    setCurrentItem(createEmptyItem());

    setSelectedItemId(null);
  };

  // ==========================================================
  // REMOVE ITEM
  // ==========================================================

  const handleRemoveItem = (index) => {
    setItems((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  // ==========================================================
  // CALCULATIONS
  // ==========================================================

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = normalizeNumber(item.quantity, 0);

      const rate = normalizeNumber(item.rate, 0);

      return sum + quantity * rate;
    }, 0);
  }, [items]);

  const totalTax = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = normalizeNumber(item.quantity, 0);

      const rate = normalizeNumber(item.rate, 0);

      const itemAmount = quantity * rate;

      const taxRate = (item.taxes || []).reduce((taxSum, taxId) => {
        const tax = TAXES.find(
          (itemTax) => String(itemTax.id) === String(taxId),
        );

        return taxSum + normalizeNumber(tax?.rate, 0);
      }, 0);

      return sum + itemAmount * (taxRate / 100);
    }, 0);
  }, [items]);

  const discountAmount = useMemo(() => {
    if (discountMode === "fixed") {
      return Math.min(normalizeNumber(discountFixed, 0), subtotal);
    }

    return Math.min(
      subtotal * (normalizeNumber(discountPercent, 0) / 100),
      subtotal,
    );
  }, [discountMode, discountPercent, discountFixed, subtotal]);

  const total = useMemo(() => {
    let value = subtotal;

    if (discountType === "before_tax") {
      value = subtotal - discountAmount + totalTax;
    } else if (discountType === "after_tax") {
      value = subtotal + totalTax - discountAmount;
    } else {
      value = subtotal + totalTax;
    }

    value += normalizeNumber(adjustment, 0);

    return Math.max(0, value);
  }, [subtotal, totalTax, discountAmount, discountType, adjustment]);

  // ==========================================================
  // VALIDATION
  // ==========================================================

  const validate = () => {
    const newErrors = {};

    if (!customerId) {
      newErrors.customerId = "Customer is required.";
    }

    if (!invoiceNumber) {
      newErrors.invoiceNumber = "Invoice number is required.";
    }

    if (!invoiceDate) {
      newErrors.invoiceDate = "Invoice date is required.";
    }

    if (!dueDate) {
      newErrors.dueDate = "Due date is required.";
    }

    if (!items.length) {
      newErrors.items = "At least one invoice item is required.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      toast.error("Please fix the highlighted fields.");

      return false;
    }

    return true;
  };

  // ==========================================================
  // SAVE / UPDATE
  // ==========================================================

  const handleSave = (action = "save") => {
    if (!invoice?.id) {
      toast.error("Invoice ID is missing.");

      return;
    }

    if (!validate()) {
      return;
    }

    const invoiceData = {
      // IMPORTANT:
      // Keep existing invoice ID
      id: invoice.id,

      invoiceNumber: `INV-${invoiceNumber}`,

      customerId,

      customer: selectedCustomer?.name || "",

      projectId,

      project:
        PROJECTS.find((project) => String(project.id) === String(projectId))
          ?.name || "",

      invoiceDate,

      dueDate,

      referenceNo,

      tags,

      currency: currencyId,

      currencyData: selectedCurrency,

      status,

      saleAgent,

      discountType,

      discountMode,

      discountPercent:
        discountMode === "percent" ? Number(discountPercent || 0) : 0,

      discountFixed: discountMode === "fixed" ? Number(discountFixed || 0) : 0,

      adjustment: Number(adjustment || 0),

      billing,

      shipping: includeShipping
        ? {
            ...shipping,
            showOnInvoice: showShippingOnInvoice,
          }
        : null,

      includeShipping,

      showQuantityAs,

      items,

      subtotal,

      totalTax,

      discountAmount,

      total,

      adminNote,

      clientNote,

      terms,

      action,
    };

    console.log("Updated Invoice Data:", invoiceData);

    // --------------------------------------------------------
    // TOAST
    // --------------------------------------------------------

    if (action === "send") {
      toast.success("Invoice updated and ready to send.");
    } else if (action === "send_later") {
      toast.success("Invoice updated and scheduled to send later.");
    } else {
      toast.success("Invoice updated successfully.");
    }

    // --------------------------------------------------------
    // RETURN UPDATED DATA
    // --------------------------------------------------------

    onSuccess?.(invoiceData);
  };

  // ==========================================================
  // CLOSE
  // ==========================================================

  const handleClose = () => {
    setErrors({});

    setShippingDialogOpen(false);

    closeDialog?.();
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <>
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
            max-w-[1400px]
            max-h-[95vh]
            overflow-hidden
            p-0
          "
        >
          {/* ==================================================
              HEADER
          ================================================== */}

          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Edit Invoice</DialogTitle>

            <DialogDescription>
              Update invoice details, items, billing information and payment
              settings.
            </DialogDescription>
          </DialogHeader>

          {/* ==================================================
              MAIN CONTENT
          ================================================== */}

          <div className="max-h-[calc(95vh-180px)] overflow-y-auto px-6">
            {/* =================================================
                INVOICE INFORMATION
            ================================================= */}

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Invoice Information</h3>

                <p className="text-sm text-muted-foreground">
                  Update customer and invoice details.
                </p>
              </div>

              {/* CUSTOMER / PROJECT */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer</label>

                  <select
                    value={customerId}
                    onChange={(event) =>
                      handleCustomerChange(event.target.value)
                    }
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Select Customer</option>

                    {CUSTOMERS.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>

                  {errors.customerId && (
                    <p className="text-xs text-destructive">
                      {errors.customerId}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Project</label>

                  <select
                    value={projectId}
                    onChange={(event) => setProjectId(event.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="">Select Project</option>

                    {filteredProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BILLING / SHIPPING */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Billing Address</h4>

                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() =>
                        setBilling({
                          street: selectedCustomer?.street || "",
                          city: selectedCustomer?.city || "",
                          state: selectedCustomer?.state || "",
                          zip: selectedCustomer?.zip || "",
                          country: selectedCustomer?.country || "",
                        })
                      }
                    >
                      Reset
                    </button>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>{billing.street || "-"}</div>

                    <div>
                      {[billing.city, billing.state, billing.zip]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </div>

                    <div>{billing.country || "-"}</div>
                  </div>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Shipping Address</h4>

                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                      onClick={() => setShippingDialogOpen(true)}
                    >
                      Edit
                    </button>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    {includeShipping ? (
                      <>
                        <div>{shipping.street || "-"}</div>

                        <div>
                          {[shipping.city, shipping.state, shipping.zip]
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </div>

                        <div>{shipping.country || "-"}</div>
                      </>
                    ) : (
                      <div>Shipping address not included.</div>
                    )}
                  </div>
                </div>
              </div>

              {/* INVOICE NUMBER / DATES */}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice Number</label>

                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(event) => setInvoiceNumber(event.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  />

                  {errors.invoiceNumber && (
                    <p className="text-xs text-destructive">
                      {errors.invoiceNumber}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Invoice Date</label>

                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(event) => setInvoiceDate(event.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Due Date</label>

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Reference No.</label>

                  <input
                    type="text"
                    value={referenceNo}
                    onChange={(event) => setReferenceNo(event.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  />
                </div>
              </div>

              {/* TAG / CURRENCY / STATUS / SALE AGENT */}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>

                  <input
                    type="text"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    placeholder="tag1, tag2"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency</label>

                  <select
                    value={currencyId}
                    onChange={(event) => setCurrencyId(event.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.id} value={currency.id}>
                        {currency.name} ({currency.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>

                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    {STATUSES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Sale Agent</label>

                  <select
                    value={saleAgent}
                    onChange={(event) => setSaleAgent(event.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    {SALE_AGENTS.map((agent) => (
                      <option key={agent} value={agent}>
                        {agent}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* DISCOUNT TYPE / ADMIN NOTE */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount Type</label>

                  <select
                    value={discountType}
                    onChange={(event) => setDiscountType(event.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  >
                    <option value="before_tax">Before Tax</option>

                    <option value="after_tax">After Tax</option>

                    <option value="none">No Discount</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Note</label>

                  <textarea
                    value={adminNote}
                    onChange={(event) => setAdminNote(event.target.value)}
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Internal note..."
                  />
                </div>
              </div>
            </div>

            {/* =================================================
                ITEMS
            ================================================= */}

            <div className="mt-8 space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Invoice Items</h3>

                <p className="text-sm text-muted-foreground">
                  Update products or services included in this invoice.
                </p>
              </div>

              {/* ITEM FORM */}

              <div className="rounded-lg border p-4">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium">Item</label>

                    <select
                      value={selectedItemId || ""}
                      onChange={(event) => handleItemSelect(event.target.value)}
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    >
                      <option value="">Select Item</option>

                      {ITEMS.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Quantity</label>

                    <input
                      type="number"
                      min="1"
                      value={currentItem.quantity}
                      onChange={(event) =>
                        setCurrentItem((previous) => ({
                          ...previous,
                          quantity: event.target.value,
                        }))
                      }
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Rate</label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentItem.rate}
                      onChange={(event) =>
                        setCurrentItem((previous) => ({
                          ...previous,
                          rate: event.target.value,
                        }))
                      }
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Unit</label>

                    <input
                      type="text"
                      value={currentItem.unit}
                      onChange={(event) =>
                        setCurrentItem((previous) => ({
                          ...previous,
                          unit: event.target.value,
                        }))
                      }
                      className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    />
                  </div>
                </div>

                {/* DESCRIPTION */}

                <div className="mt-4 space-y-2">
                  <label className="text-sm font-medium">Description</label>

                  <textarea
                    value={currentItem.description}
                    onChange={(event) =>
                      setCurrentItem((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                    rows={2}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  />
                </div>

                {/* TAXES */}

                <div className="mt-4">
                  <label className="text-sm font-medium">Taxes</label>

                  <div className="flex flex-wrap gap-4 mt-2">
                    {TAXES.map((tax) => {
                      const checked = (currentItem.taxes || []).includes(
                        String(tax.id),
                      );

                      return (
                        <label
                          key={tax.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleTaxToggle(tax.id)}
                          />
                          {tax.name} ({tax.rate}%)
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
                  >
                    Add Item
                  </button>
                </div>
              </div>

              {/* ADDED ITEMS */}

              {items.length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3">Description</th>

                        <th className="text-right p-3">Qty</th>

                        <th className="text-left p-3">Unit</th>

                        <th className="text-right p-3">Rate</th>

                        <th className="text-right p-3">Amount</th>

                        <th className="text-center p-3">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item, index) => {
                        const quantity = normalizeNumber(item.quantity, 0);

                        const rate = normalizeNumber(item.rate, 0);

                        const amount = quantity * rate;

                        return (
                          <tr key={item.id ?? index} className="border-t">
                            <td className="p-3">
                              <div className="font-medium">
                                {item.description}
                              </div>

                              {item.longDescription && (
                                <div className="text-xs text-muted-foreground">
                                  {item.longDescription}
                                </div>
                              )}
                            </td>

                            <td className="p-3 text-right">{item.quantity}</td>

                            <td className="p-3">{item.unit || "-"}</td>

                            <td className="p-3 text-right">
                              {formatMoney(rate, selectedCurrency)}
                            </td>

                            <td className="p-3 text-right font-medium">
                              {formatMoney(amount, selectedCurrency)}
                            </td>

                            <td className="p-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="text-destructive hover:underline"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {errors.items && (
                <p className="text-sm text-destructive">{errors.items}</p>
              )}

              {/* SUMMARY */}

              <div className="flex justify-end">
                <div className="w-full md:w-[400px] space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>

                    <span>{formatMoney(subtotal, selectedCurrency)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Discount</span>

                    <span>
                      -{formatMoney(discountAmount, selectedCurrency)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span>Tax</span>

                    <span>{formatMoney(totalTax, selectedCurrency)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span>Adjustment</span>

                    <input
                      type="number"
                      step="0.01"
                      value={adjustment}
                      onChange={(event) => setAdjustment(event.target.value)}
                      className="w-32 h-9 rounded-md border bg-background px-3 text-right"
                    />
                  </div>

                  <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                    <span>Total</span>

                    <span>{formatMoney(total, selectedCurrency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* =================================================
                NOTES
            ================================================= */}

            <div className="mt-8 mb-8 space-y-6">
              <div>
                <h3 className="text-lg font-semibold">Notes</h3>

                <p className="text-sm text-muted-foreground">
                  Add notes and payment terms for the customer.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Client Note</label>

                  <textarea
                    value={clientNote}
                    onChange={(event) => setClientNote(event.target.value)}
                    rows={4}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Note visible to customer..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Terms & Conditions
                  </label>

                  <textarea
                    value={terms}
                    onChange={(event) => setTerms(event.target.value)}
                    rows={4}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    placeholder="Payment terms..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ==================================================
              FOOTER
          ================================================== */}

          <div className="border-t bg-background px-6 py-4">
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSave("send_later")}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Update and Send Later
              </button>

              <button
                type="button"
                onClick={() => handleSave("send")}
                className="rounded-md border px-4 py-2 text-sm"
              >
                Update & Send
              </button>

              <button
                type="button"
                onClick={() => handleSave("save")}
                className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
              >
                Update
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================
          SHIPPING ADDRESS DIALOG
      ====================================================== */}

      <Dialog open={shippingDialogOpen} onOpenChange={setShippingDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Shipping Address</DialogTitle>

            <DialogDescription>
              Update the shipping address for this invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeShipping}
                onChange={(event) => setIncludeShipping(event.target.checked)}
              />
              Include shipping address
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showShippingOnInvoice}
                onChange={(event) =>
                  setShowShippingOnInvoice(event.target.checked)
                }
                disabled={!includeShipping}
              />
              Show shipping address on invoice
            </label>

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Street</label>

                <input
                  type="text"
                  value={shipping.street}
                  onChange={(event) =>
                    setShipping((previous) => ({
                      ...previous,
                      street: event.target.value,
                    }))
                  }
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">City</label>

                  <input
                    type="text"
                    value={shipping.city}
                    onChange={(event) =>
                      setShipping((previous) => ({
                        ...previous,
                        city: event.target.value,
                      }))
                    }
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">State</label>

                  <input
                    type="text"
                    value={shipping.state}
                    onChange={(event) =>
                      setShipping((previous) => ({
                        ...previous,
                        state: event.target.value,
                      }))
                    }
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">ZIP</label>

                  <input
                    type="text"
                    value={shipping.zip}
                    onChange={(event) =>
                      setShipping((previous) => ({
                        ...previous,
                        zip: event.target.value,
                      }))
                    }
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Country</label>

                  <input
                    type="text"
                    value={shipping.country}
                    onChange={(event) =>
                      setShipping((previous) => ({
                        ...previous,
                        country: event.target.value,
                      }))
                    }
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              type="button"
              onClick={() => setShippingDialogOpen(false)}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
