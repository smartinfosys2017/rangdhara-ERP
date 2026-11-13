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

/*
|--------------------------------------------------------------------------
| Static Data
|--------------------------------------------------------------------------
*/

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

const ITEMS = [
  {
    id: "1",
    name: "Website Development",
    subtext: "web-dev",
    description: "Website Development",
    longDescription: "Professional website development services.",
    rate: 1500,
    unit: "project",
  },
  {
    id: "2",
    name: "UI/UX Design",
    subtext: "design",
    description: "UI/UX Design",
    longDescription: "UI and UX design services.",
    rate: 750,
    unit: "project",
  },
  {
    id: "3",
    name: "SEO Optimization",
    subtext: "seo",
    description: "SEO Optimization",
    longDescription: "Search engine optimization services.",
    rate: 500,
    unit: "month",
  },
  {
    id: "4",
    name: "Consulting",
    subtext: "consulting",
    description: "Consulting Services",
    longDescription: "Professional consulting services.",
    rate: 125,
    unit: "hour",
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
    name: "Open",
  },
  {
    id: "3",
    name: "Applied",
  },
  {
    id: "4",
    name: "Partially Applied",
  },
  {
    id: "5",
    name: "Cancelled",
  },
];

const SALE_AGENTS = [
  {
    id: "1",
    name: "Rang Dhara",
  },
];

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function formatMoney(amount, currency) {
  return `${currency?.symbol || "$"}${Number(amount || 0).toFixed(2)}`;
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

function normalizeNumber(value, defaultValue = 0) {
  const number = Number(value);

  return Number.isFinite(number) ? number : defaultValue;
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return [createEmptyItem()];
  }

  return items.map((item) => ({
    id: item?.id ?? null,
    description: item?.description ?? "",
    longDescription: item?.longDescription ?? "",
    quantity: normalizeNumber(item?.quantity, 1),
    unit: item?.unit ?? "",
    rate: normalizeNumber(item?.rate, 0),
    taxes: Array.isArray(item?.taxes) ? item.taxes : [],
    optional: Boolean(item?.optional),
  }));
}

function getCreditNoteNumber(number) {
  if (!number) {
    return "";
  }

  return String(number).replace(/^CN-/i, "");
}

/*
|--------------------------------------------------------------------------
| Component
|--------------------------------------------------------------------------
*/

export default function CreditNoteEditDialog({
  open,
  closeDialog,
  onSuccess,
  creditNote,
}) {
  /*
    |--------------------------------------------------------------------------
    | Main Fields
    |--------------------------------------------------------------------------
    */

  const [customerId, setCustomerId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [creditNoteNumber, setCreditNoteNumber] = useState("");
  const [creditNoteDate, setCreditNoteDate] = useState(getToday());
  const [referenceNo, setReferenceNo] = useState("");
  const [tags, setTags] = useState("");
  const [currencyId, setCurrencyId] = useState("1");
  const [status, setStatus] = useState("Draft");
  const [saleAgent, setSaleAgent] = useState("");
  const [discountType, setDiscountType] = useState("before-tax");
  const [adminNote, setAdminNote] = useState("");

  /*
    |--------------------------------------------------------------------------
    | Billing / Shipping
    |--------------------------------------------------------------------------
    */

  const [billing, setBilling] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });

  const [shipping, setShipping] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "",
  });

  const [includeShipping, setIncludeShipping] = useState(false);
  const [showShippingOnCreditNote, setShowShippingOnCreditNote] =
    useState(false);

  /*
    |--------------------------------------------------------------------------
    | Items
    |--------------------------------------------------------------------------
    */

  const [items, setItems] = useState([createEmptyItem()]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [showQuantityAs, setShowQuantityAs] = useState("quantity");
  const [currentItem, setCurrentItem] = useState(createEmptyItem());

  /*
    |--------------------------------------------------------------------------
    | Discount
    |--------------------------------------------------------------------------
    */

  const [discountMode, setDiscountMode] = useState("percent");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountFixed, setDiscountFixed] = useState(0);
  const [adjustment, setAdjustment] = useState(0);

  /*
    |--------------------------------------------------------------------------
    | Notes
    |--------------------------------------------------------------------------
    */

  const [clientNote, setClientNote] = useState("");
  const [terms, setTerms] = useState("");

  /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

  const [errors, setErrors] = useState({});

  /*
    |--------------------------------------------------------------------------
    | Load Existing Credit Note
    |--------------------------------------------------------------------------
    */

  useEffect(() => {
    if (!open || !creditNote) {
      return;
    }

    setCustomerId(creditNote?.customerId ? String(creditNote.customerId) : "");

    setProjectId(creditNote?.projectId ? String(creditNote.projectId) : "");

    setCreditNoteNumber(getCreditNoteNumber(creditNote?.creditNoteNumber));

    setCreditNoteDate(creditNote?.creditNoteDate || getToday());

    setReferenceNo(creditNote?.referenceNo || "");

    setTags(creditNote?.tags || "");

    setCurrencyId(creditNote?.currency ? String(creditNote.currency) : "1");

    setStatus(creditNote?.status || "Draft");

    setSaleAgent(creditNote?.saleAgent || "");

    setDiscountType(creditNote?.discountType || "before-tax");

    setDiscountMode(creditNote?.discountMode || "percent");

    setDiscountPercent(normalizeNumber(creditNote?.discountPercent, 0));

    setDiscountFixed(normalizeNumber(creditNote?.discountFixed, 0));

    setAdjustment(normalizeNumber(creditNote?.adjustment, 0));

    setAdminNote(creditNote?.adminNote || "");

    setClientNote(creditNote?.clientNote || "");

    setTerms(creditNote?.terms || "");

    setBilling({
      street: creditNote?.billing?.street || "",
      city: creditNote?.billing?.city || "",
      state: creditNote?.billing?.state || "",
      zip: creditNote?.billing?.zip || "",
      country: creditNote?.billing?.country || "",
    });

    setShipping({
      street: creditNote?.shipping?.street || "",
      city: creditNote?.shipping?.city || "",
      state: creditNote?.shipping?.state || "",
      zip: creditNote?.shipping?.zip || "",
      country: creditNote?.shipping?.country || "",
    });

    setIncludeShipping(Boolean(creditNote?.shipping));

    setShowShippingOnCreditNote(
      Boolean(creditNote?.shipping?.showOnCreditNote),
    );

    setShowQuantityAs(creditNote?.showQuantityAs || "quantity");

    setItems(normalizeItems(creditNote?.items));

    setErrors({});
  }, [open, creditNote]);

  /*
    |--------------------------------------------------------------------------
    | Selected Customer
    |--------------------------------------------------------------------------
    */

  const selectedCustomer = useMemo(() => {
    return CUSTOMERS.find(
      (customer) => String(customer.id) === String(customerId),
    );
  }, [customerId]);

  /*
    |--------------------------------------------------------------------------
    | Selected Currency
    |--------------------------------------------------------------------------
    */

  const selectedCurrency = useMemo(() => {
    return (
      CURRENCIES.find(
        (currency) => String(currency.id) === String(currencyId),
      ) || CURRENCIES[0]
    );
  }, [currencyId]);

  /*
    |--------------------------------------------------------------------------
    | Filter Projects
    |--------------------------------------------------------------------------
    */

  const filteredProjects = useMemo(() => {
    if (!customerId) {
      return PROJECTS;
    }

    return PROJECTS.filter(
      (project) => String(project.customerId) === String(customerId),
    );
  }, [customerId]);

  /*
    |--------------------------------------------------------------------------
    | Customer Change
    |--------------------------------------------------------------------------
    */

  const handleCustomerChange = (value) => {
    setCustomerId(value);

    const customer = CUSTOMERS.find(
      (item) => String(item.id) === String(value),
    );

    if (customer?.billing) {
      setBilling({
        street: customer.billing.street || "",
        city: customer.billing.city || "",
        state: customer.billing.state || "",
        zip: customer.billing.zip || "",
        country: customer.billing.country || "",
      });
    }

    const currentProject = PROJECTS.find(
      (project) => String(project.id) === String(projectId),
    );

    if (currentProject && String(currentProject.customerId) !== String(value)) {
      setProjectId("");
    }
  };

  /*
    |--------------------------------------------------------------------------
    | Item Change
    |--------------------------------------------------------------------------
    */

  const handleItemChange = (value) => {
    setSelectedItemId(value);

    const item = ITEMS.find((item) => String(item.id) === String(value));

    if (!item) {
      return;
    }

    setCurrentItem({
      id: item.id,
      description: item.description,
      longDescription: "",
      quantity: 1,
      unit: item.unit,
      rate: item.rate,
      taxes: [],
      optional: false,
    });
  };

  /*
    |--------------------------------------------------------------------------
    | Tax Change
    |--------------------------------------------------------------------------
    */

  const handleTaxChange = (taxId, checked) => {
    setCurrentItem((previous) => {
      const taxes = Array.isArray(previous.taxes) ? previous.taxes : [];

      if (checked) {
        return {
          ...previous,
          taxes: [...taxes, taxId],
        };
      }

      return {
        ...previous,
        taxes: taxes.filter((id) => String(id) !== String(taxId)),
      };
    });
  };

  /*
    |--------------------------------------------------------------------------
    | Add Item
    |--------------------------------------------------------------------------
    */

  const handleAddItem = () => {
    if (!currentItem.description?.trim()) {
      toast.error("Please enter item description.");
      return;
    }

    setItems((previous) => [
      ...previous,
      {
        ...currentItem,
        quantity: normalizeNumber(currentItem.quantity, 1),
        rate: normalizeNumber(currentItem.rate, 0),
      },
    ]);

    setCurrentItem(createEmptyItem());
    setSelectedItemId("");
  };

  /*
    |--------------------------------------------------------------------------
    | Remove Item
    |--------------------------------------------------------------------------
    */

  const handleRemoveItem = (index) => {
    setItems((previous) => {
      const updatedItems = previous.filter(
        (_, itemIndex) => itemIndex !== index,
      );

      return updatedItems.length > 0 ? updatedItems : [createEmptyItem()];
    });
  };

  /*
    |--------------------------------------------------------------------------
    | Update Item
    |--------------------------------------------------------------------------
    */

  const handleUpdateItem = (index, field, value) => {
    setItems((previous) =>
      previous.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );
  };

  /*
    |--------------------------------------------------------------------------
    | Item Subtotal
    |--------------------------------------------------------------------------
    */

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = normalizeNumber(item.quantity, 0);

      const rate = normalizeNumber(item.rate, 0);

      return sum + quantity * rate;
    }, 0);
  }, [items]);

  /*
    |--------------------------------------------------------------------------
    | Total Tax
    |--------------------------------------------------------------------------
    */

  const totalTax = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = normalizeNumber(item.quantity, 0);

      const rate = normalizeNumber(item.rate, 0);

      const itemSubtotal = quantity * rate;

      const itemTax = (item.taxes || []).reduce((taxSum, taxId) => {
        const tax = TAXES.find(
          (taxItem) => String(taxItem.id) === String(taxId),
        );

        if (!tax) {
          return taxSum;
        }

        return taxSum + (itemSubtotal * Number(tax.rate || 0)) / 100;
      }, 0);

      return sum + itemTax;
    }, 0);
  }, [items]);

  /*
    |--------------------------------------------------------------------------
    | Discount
    |--------------------------------------------------------------------------
    */

  const discountAmount = useMemo(() => {
    if (discountMode === "fixed") {
      return Math.max(0, normalizeNumber(discountFixed, 0));
    }

    return Math.max(0, (subtotal * normalizeNumber(discountPercent, 0)) / 100);
  }, [subtotal, discountMode, discountPercent, discountFixed]);

  /*
    |--------------------------------------------------------------------------
    | Total
    |--------------------------------------------------------------------------
    */

  const total = useMemo(() => {
    return Math.max(
      0,
      subtotal + totalTax - discountAmount + normalizeNumber(adjustment, 0),
    );
  }, [subtotal, totalTax, discountAmount, adjustment]);

  /*
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

  const validate = () => {
    const validationErrors = {};

    if (!customerId) {
      validationErrors.customerId = "Please select a customer.";
    }

    if (!creditNoteNumber?.trim()) {
      validationErrors.creditNoteNumber = "Please enter credit note number.";
    }

    if (!creditNoteDate) {
      validationErrors.creditNoteDate = "Please select credit note date.";
    }

    const validItems = items.filter(
      (item) =>
        item?.description?.trim() && normalizeNumber(item.quantity, 0) > 0,
    );

    if (validItems.length === 0) {
      validationErrors.items = "Please add at least one item.";
    }

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast.error("Please fix the required fields.");

      return false;
    }

    return true;
  };

  /*
    |--------------------------------------------------------------------------
    | Update Credit Note
    |--------------------------------------------------------------------------
    */

  const handleSave = (action = "save") => {
    if (!validate()) {
      return;
    }

    if (!creditNote?.id) {
      toast.error("Credit note ID is missing.");

      return;
    }

    const creditNoteData = {
      id: creditNote.id,

      creditNoteNumber: `CN-${creditNoteNumber}`,

      customerId,
      customer: selectedCustomer?.name || "",

      projectId,

      creditNoteDate,

      referenceNo,

      tags,

      currency: currencyId,

      status,

      saleAgent,

      discountType,

      discountMode,

      discountPercent:
        discountMode === "percent" ? normalizeNumber(discountPercent, 0) : 0,

      discountFixed:
        discountMode === "fixed" ? normalizeNumber(discountFixed, 0) : 0,

      adjustment: normalizeNumber(adjustment, 0),

      billing,

      shipping: includeShipping
        ? {
            ...shipping,
            showOnCreditNote: showShippingOnCreditNote,
          }
        : null,

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

    console.log("Updated Credit Note Data:", creditNoteData);

    if (action === "send") {
      toast.success("Credit note updated and ready to send.");
    } else if (action === "send-later") {
      toast.success("Credit note updated and scheduled to send later.");
    } else {
      toast.success("Credit note updated successfully.");
    }

    onSuccess?.(creditNoteData);
  };

  /*
    |--------------------------------------------------------------------------
    | Close
    |--------------------------------------------------------------------------
    */

  const handleClose = () => {
    if (closeDialog) {
      closeDialog();
    }

    setErrors({});
  };

  /*
    |--------------------------------------------------------------------------
    | Dialog
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Credit Note</DialogTitle>

          <DialogDescription>
            Update the credit note details, customer information, items, taxes,
            discounts and notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* =====================================================
                        Basic Information
                    ====================================================== */}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Customer</label>

              <Select value={customerId} onValueChange={handleCustomerChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>

                <SelectContent>
                  {CUSTOMERS.map((customer) => (
                    <SelectItem key={customer.id} value={String(customer.id)}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {errors.customerId && (
                <p className="text-sm text-red-500">{errors.customerId}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>

              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>

                <SelectContent>
                  {filteredProjects.map((project) => (
                    <SelectItem key={project.id} value={String(project.id)}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Credit Note Number</label>

              <Input
                value={creditNoteNumber}
                onChange={(event) => setCreditNoteNumber(event.target.value)}
                placeholder="000001"
              />

              {errors.creditNoteNumber && (
                <p className="text-sm text-red-500">
                  {errors.creditNoteNumber}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Credit Note Date</label>

              <Input
                type="date"
                value={creditNoteDate}
                onChange={(event) => setCreditNoteDate(event.target.value)}
              />

              {errors.creditNoteDate && (
                <p className="text-sm text-red-500">{errors.creditNoteDate}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Reference No.</label>

              <Input
                value={referenceNo}
                onChange={(event) => setReferenceNo(event.target.value)}
                placeholder="Reference number"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>

              <Input
                value={tags}
                onChange={(event) => setTags(event.target.value)}
                placeholder="Tags"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Currency</label>

              <Select value={currencyId} onValueChange={setCurrencyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>

                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.id} value={String(currency.id)}>
                      {currency.code} ({currency.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>

              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>

                <SelectContent>
                  {STATUSES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sale Agent</label>

              <Select value={saleAgent} onValueChange={setSaleAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sale agent" />
                </SelectTrigger>

                <SelectContent>
                  {SALE_AGENTS.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* =====================================================
                        Billing
                    ====================================================== */}

          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold">Billing Address</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Street"
                value={billing.street}
                onChange={(event) =>
                  setBilling((previous) => ({
                    ...previous,
                    street: event.target.value,
                  }))
                }
              />

              <Input
                placeholder="City"
                value={billing.city}
                onChange={(event) =>
                  setBilling((previous) => ({
                    ...previous,
                    city: event.target.value,
                  }))
                }
              />

              <Input
                placeholder="State"
                value={billing.state}
                onChange={(event) =>
                  setBilling((previous) => ({
                    ...previous,
                    state: event.target.value,
                  }))
                }
              />

              <Input
                placeholder="ZIP"
                value={billing.zip}
                onChange={(event) =>
                  setBilling((previous) => ({
                    ...previous,
                    zip: event.target.value,
                  }))
                }
              />

              <Input
                placeholder="Country"
                value={billing.country}
                onChange={(event) =>
                  setBilling((previous) => ({
                    ...previous,
                    country: event.target.value,
                  }))
                }
              />
            </div>
          </div>

          {/* =====================================================
                        Shipping
                    ====================================================== */}

          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={includeShipping}
                onCheckedChange={(checked) =>
                  setIncludeShipping(Boolean(checked))
                }
              />

              <label className="text-sm font-medium">
                Include Shipping Address
              </label>
            </div>

            {includeShipping && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Street"
                    value={shipping.street}
                    onChange={(event) =>
                      setShipping((previous) => ({
                        ...previous,
                        street: event.target.value,
                      }))
                    }
                  />

                  <Input
                    placeholder="City"
                    value={shipping.city}
                    onChange={(event) =>
                      setShipping((previous) => ({
                        ...previous,
                        city: event.target.value,
                      }))
                    }
                  />

                  <Input
                    placeholder="State"
                    value={shipping.state}
                    onChange={(event) =>
                      setShipping((previous) => ({
                        ...previous,
                        state: event.target.value,
                      }))
                    }
                  />

                  <Input
                    placeholder="ZIP"
                    value={shipping.zip}
                    onChange={(event) =>
                      setShipping((previous) => ({
                        ...previous,
                        zip: event.target.value,
                      }))
                    }
                  />

                  <Input
                    placeholder="Country"
                    value={shipping.country}
                    onChange={(event) =>
                      setShipping((previous) => ({
                        ...previous,
                        country: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={showShippingOnCreditNote}
                    onCheckedChange={(checked) =>
                      setShowShippingOnCreditNote(Boolean(checked))
                    }
                  />

                  <label className="text-sm">
                    Show shipping address on credit note
                  </label>
                </div>
              </>
            )}
          </div>

          {/* =====================================================
                        Items
                    ====================================================== */}

          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Items</h3>

              <Select value={showQuantityAs} onValueChange={setShowQuantityAs}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="quantity">Quantity</SelectItem>

                  <SelectItem value="hours">Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {errors.items && (
              <p className="text-sm text-red-500">{errors.items}</p>
            )}

            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id || index} className="border rounded-md p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(event) =>
                        handleUpdateItem(
                          index,
                          "description",
                          event.target.value,
                        )
                      }
                    />

                    <Input
                      placeholder="Unit"
                      value={item.unit}
                      onChange={(event) =>
                        handleUpdateItem(index, "unit", event.target.value)
                      }
                    />

                    <Input
                      type="number"
                      min="1"
                      placeholder="Quantity"
                      value={item.quantity}
                      onChange={(event) =>
                        handleUpdateItem(
                          index,
                          "quantity",
                          Number(event.target.value),
                        )
                      }
                    />

                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Rate"
                      value={item.rate}
                      onChange={(event) =>
                        handleUpdateItem(
                          index,
                          "rate",
                          Number(event.target.value),
                        )
                      }
                    />

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {formatMoney(
                          normalizeNumber(item.quantity, 0) *
                            normalizeNumber(item.rate, 0),
                          selectedCurrency,
                        )}
                      </span>

                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>

                  <Textarea
                    className="mt-3"
                    placeholder="Long description"
                    value={item.longDescription}
                    onChange={(event) =>
                      handleUpdateItem(
                        index,
                        "longDescription",
                        event.target.value,
                      )
                    }
                  />

                  <div className="flex flex-wrap gap-4 mt-3">
                    {TAXES.map((tax) => (
                      <div key={tax.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={(item.taxes || []).some(
                            (taxId) => String(taxId) === String(tax.id),
                          )}
                          onCheckedChange={(checked) => {
                            setItems((previous) =>
                              previous.map((currentItem, itemIndex) => {
                                if (itemIndex !== index) {
                                  return currentItem;
                                }

                                const currentTaxes = Array.isArray(
                                  currentItem.taxes,
                                )
                                  ? currentItem.taxes
                                  : [];

                                return {
                                  ...currentItem,
                                  taxes: checked
                                    ? [...currentTaxes, tax.id]
                                    : currentTaxes.filter(
                                        (id) => String(id) !== String(tax.id),
                                      ),
                                };
                              }),
                            );
                          }}
                        />

                        <span className="text-sm">
                          {tax.name} ({tax.rate}
                          %)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Add New Item</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={selectedItemId} onValueChange={handleItemChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select item" />
                  </SelectTrigger>

                  <SelectContent>
                    {ITEMS.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  placeholder="Description"
                  value={currentItem.description}
                  onChange={(event) =>
                    setCurrentItem((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                />

                <Input
                  type="number"
                  min="1"
                  value={currentItem.quantity}
                  onChange={(event) =>
                    setCurrentItem((previous) => ({
                      ...previous,
                      quantity: Number(event.target.value),
                    }))
                  }
                />

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={currentItem.rate}
                  onChange={(event) =>
                    setCurrentItem((previous) => ({
                      ...previous,
                      rate: Number(event.target.value),
                    }))
                  }
                />
              </div>

              <div className="mt-3 flex justify-end">
                <Button type="button" onClick={handleAddItem}>
                  Add Item
                </Button>
              </div>
            </div>
          </div>

          {/* =====================================================
                        Discount / Adjustment
                    ====================================================== */}

          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-lg font-semibold">Discount & Adjustment</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Discount Mode</label>

                <Select value={discountMode} onValueChange={setDiscountMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>

                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {discountMode === "percent" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount %</label>

                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent}
                    onChange={(event) =>
                      setDiscountPercent(Number(event.target.value))
                    }
                  />
                </div>
              )}

              {discountMode === "fixed" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Discount Amount</label>

                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discountFixed}
                    onChange={(event) =>
                      setDiscountFixed(Number(event.target.value))
                    }
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Discount Type</label>

                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="before-tax">Before Tax</SelectItem>

                    <SelectItem value="after-tax">After Tax</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Adjustment</label>

                <Input
                  type="number"
                  step="0.01"
                  value={adjustment}
                  onChange={(event) =>
                    setAdjustment(Number(event.target.value))
                  }
                />
              </div>
            </div>
          </div>

          {/* =====================================================
                        Summary
                    ====================================================== */}

          <div className="flex justify-end">
            <div className="w-full md:w-[350px] space-y-3 border rounded-lg p-4">
              <div className="flex justify-between">
                <span>Subtotal</span>

                <span>{formatMoney(subtotal, selectedCurrency)}</span>
              </div>

              <div className="flex justify-between">
                <span>Tax</span>

                <span>{formatMoney(totalTax, selectedCurrency)}</span>
              </div>

              <div className="flex justify-between">
                <span>Discount</span>

                <span>-{formatMoney(discountAmount, selectedCurrency)}</span>
              </div>

              <div className="flex justify-between">
                <span>Adjustment</span>

                <span>{formatMoney(adjustment, selectedCurrency)}</span>
              </div>

              <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                <span>Total</span>

                <span>{formatMoney(total, selectedCurrency)}</span>
              </div>
            </div>
          </div>

          {/* =====================================================
                        Admin Note
                    ====================================================== */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Admin Note</label>

            <Textarea
              value={adminNote}
              onChange={(event) => setAdminNote(event.target.value)}
              placeholder="Admin note"
            />
          </div>

          {/* =====================================================
                        Client Note
                    ====================================================== */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Client Note</label>

            <Textarea
              value={clientNote}
              onChange={(event) => setClientNote(event.target.value)}
              placeholder="Client note"
            />
          </div>

          {/* =====================================================
                        Terms
                    ====================================================== */}

          <div className="space-y-2">
            <label className="text-sm font-medium">Terms & Conditions</label>

            <Textarea
              value={terms}
              onChange={(event) => setTerms(event.target.value)}
              placeholder="Terms and conditions"
            />
          </div>
        </div>

        {/* =========================================================
                    Footer
                ========================================================== */}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave("send-later")}
          >
            Update & Send Later
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleSave("send")}
          >
            Update & Send
          </Button>

          <Button type="button" onClick={() => handleSave("save")}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
