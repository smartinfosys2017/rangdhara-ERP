"use client";

import { useEffect, useRef, useState } from "react";

import { Copy, LoaderCircle } from "lucide-react";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { toast } from "sonner";

import { apiFetch } from "@/lib/api";

import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import CustomerCustomFields from "./customer-custom-fields";

/*
|--------------------------------------------------------------------------
| Languages
|--------------------------------------------------------------------------
*/

const languages = [
  "english",
  "dutch",
  "polish",
  "russian",
  "french",
  "german",
  "italian",
  "spanish",
  "portuguese",
  "chinese",
  "japanese",
];

/*
|--------------------------------------------------------------------------
| Success Toast
|--------------------------------------------------------------------------
*/

const showSuccessToast = (message) => {
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
      position: "top-center",
      duration: 4000,
    },
  );
};

/*
|--------------------------------------------------------------------------
| Error Toast
|--------------------------------------------------------------------------
*/

const showErrorToast = (message) => {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close
        className="min-w-[320px] max-w-[500px] shadow-lg"
        onClose={() => toast.dismiss(t)}
      >
        <AlertIcon>
          <RiErrorWarningFill className="size-5" />
        </AlertIcon>

        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    {
      position: "top-center",
      duration: 5000,
    },
  );
};

/*
|--------------------------------------------------------------------------
| Get Primitive Saved Value
|--------------------------------------------------------------------------
|
| Customer API may return:
|
| 1
| "1"
| { id: 1 }
| { code: "USD" }
| { name: "United States" }
|
*/

const getSavedReferenceValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "object") {
    return (
      value.id ??
      value.value ??
      value.code ??
      value.currencyCode ??
      value.countryCode ??
      value.isoCode ??
      value.slug ??
      value.name ??
      ""
    );
  }

  return value;
};

/*
|--------------------------------------------------------------------------
| Resolve Dropdown Value
|--------------------------------------------------------------------------
|
| SelectItem always uses:
|
| value={String(item.id)}
|
| Therefore the final value must be the matching item ID.
|
*/

const resolveDropdownValue = (savedValue, items) => {
  const normalizedSavedValue = getSavedReferenceValue(savedValue);

  if (
    normalizedSavedValue === null ||
    normalizedSavedValue === undefined ||
    normalizedSavedValue === ""
  ) {
    return "";
  }

  const saved = String(normalizedSavedValue).trim().toLowerCase();

  const match = items.find((item) => {
    const candidates = [
      item?.id,
      item?.code,
      item?.currencyCode,
      item?.isoCode,
      item?.countryCode,
      item?.value,
      item?.slug,
      item?.name,
    ];

    return candidates.some(
      (candidate) =>
        candidate !== null &&
        candidate !== undefined &&
        String(candidate).trim().toLowerCase() === saved,
    );
  });

  /*
   * IMPORTANT:
   *
   * Always return the actual SelectItem ID.
   * If there is no matching item, return an empty value.
   */
  if (match?.id !== undefined && match?.id !== null) {
    return String(match.id);
  }

  return "";
};

/*
|--------------------------------------------------------------------------
| Customer Edit Dialog
|--------------------------------------------------------------------------
*/

export default function CustomerEditDialog({
  open,
  closeDialog,
  onSuccess,
  customer,
}) {
  const [loading, setLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Customer Groups
  |--------------------------------------------------------------------------
  */

  const [customerGroups, setCustomerGroups] = useState([]);

  const [groupsLoading, setGroupsLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Custom Fields
  |--------------------------------------------------------------------------
  */

  const [customFieldsLoading, setCustomFieldsLoading] = useState(false);

  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);

  const [customFields, setCustomFields] = useState({});

  /*
  |--------------------------------------------------------------------------
  | Countries
  |--------------------------------------------------------------------------
  */

  const [countries, setCountries] = useState([]);

  const [countryPage, setCountryPage] = useState(1);

  const [countryHasMore, setCountryHasMore] = useState(true);

  const [loadingCountries, setLoadingCountries] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Currencies
  |--------------------------------------------------------------------------
  */

  const [currencies, setCurrencies] = useState([]);

  const [currencyPage, setCurrencyPage] = useState(1);

  const [currencyHasMore, setCurrencyHasMore] = useState(true);

  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Loading Refs
  |--------------------------------------------------------------------------
  */

  const countryLoadingRef = useRef(false);

  const currencyLoadingRef = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | Original Customer Dropdown Values
  |--------------------------------------------------------------------------
  */

  const customerCurrencyRef = useRef("");

  const customerCountryRef = useRef("");

  const customerBillingCountryRef = useRef("");

  const customerShippingCountryRef = useRef("");

  /*
  |--------------------------------------------------------------------------
  | Form
  |--------------------------------------------------------------------------
  */

  const [form, setForm] = useState({
    company: "",
    vat: "",
    email: "",
    phone: "",
    website: "",

    currency: "",
    defaultLanguage: "",

    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",

    billingStreet: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    billingCountry: "",

    shippingStreet: "",
    shippingCity: "",
    shippingState: "",
    shippingZip: "",
    shippingCountry: "",

    groups: [],
    active: true,
  });

  /*
  |--------------------------------------------------------------------------
  | Get Select Scroll Element
  |--------------------------------------------------------------------------
  */

  const getSelectScrollElement = (event) => {
    let element = event.target;

    if (!(element instanceof HTMLElement)) {
      return null;
    }

    const viewport = element.closest("[data-radix-select-viewport]");

    if (viewport) {
      return viewport;
    }

    return element;
  };

  /*
  |--------------------------------------------------------------------------
  | Load Countries
  |--------------------------------------------------------------------------
  */

  const loadCountries = async (page = 1) => {
    if (countryLoadingRef.current || (!countryHasMore && page !== 1)) {
      return;
    }

    try {
      countryLoadingRef.current = true;

      setLoadingCountries(true);

      const response = await apiFetch(
        `/api/countries?page=${page}&limit=200&sort=name&dir=asc`,
        {
          method: "GET",
        },
      );

      const result =
        typeof response?.json === "function" ? await response.json() : response;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load countries.");
      }

      const newCountries = Array.isArray(result.data) ? result.data : [];

      setCountries((previous) => {
        if (page === 1) {
          return newCountries;
        }

        const existingIds = new Set(previous.map((item) => String(item.id)));

        const uniqueCountries = newCountries.filter(
          (item) => !existingIds.has(String(item.id)),
        );

        return [...previous, ...uniqueCountries];
      });

      /*
       * Resolve selected countries after API data arrives.
       */
      if (page === 1) {
        const resolvedCountry = resolveDropdownValue(
          customerCountryRef.current,
          newCountries,
        );

        const resolvedBillingCountry = resolveDropdownValue(
          customerBillingCountryRef.current,
          newCountries,
        );

        const resolvedShippingCountry = resolveDropdownValue(
          customerShippingCountryRef.current,
          newCountries,
        );

        setForm((previous) => ({
          ...previous,
          country: resolvedCountry,
          billingCountry: resolvedBillingCountry,
          shippingCountry: resolvedShippingCountry,
        }));
      }

      setCountryPage(page);

      const totalPages = Number(result?.pagination?.totalPages) || 0;

      setCountryHasMore(page < totalPages);
    } catch (error) {
      console.error("LOAD COUNTRIES ERROR:", error);

      showErrorToast(error?.message || "Failed to load countries.");
    } finally {
      countryLoadingRef.current = false;

      setLoadingCountries(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Load Currencies
  |--------------------------------------------------------------------------
  */

  const loadCurrencies = async (page = 1) => {
    if (currencyLoadingRef.current || (!currencyHasMore && page !== 1)) {
      return;
    }

    try {
      currencyLoadingRef.current = true;

      setLoadingCurrencies(true);

      const response = await apiFetch(
        `/api/finance/currencies?page=${page}&limit=200&sort=name&dir=asc`,
        {
          method: "GET",
        },
      );

      const result =
        typeof response?.json === "function" ? await response.json() : response;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load currencies.");
      }

      const newCurrencies = Array.isArray(result.data) ? result.data : [];

      setCurrencies((previous) => {
        if (page === 1) {
          return newCurrencies;
        }

        const existingIds = new Set(previous.map((item) => String(item.id)));

        const uniqueCurrencies = newCurrencies.filter(
          (item) => !existingIds.has(String(item.id)),
        );

        return [...previous, ...uniqueCurrencies];
      });

      /*
       * IMPORTANT:
       *
       * The customer value can be:
       *
       * 5
       * "5"
       * { id: 5 }
       * { code: "USD" }
       *
       * But SelectItem uses:
       *
       * value={String(currency.id)}
       *
       * Therefore resolve the customer's saved value
       * to the actual currency ID after currencies load.
       */
      if (page === 1) {
        const resolvedCurrency = resolveDropdownValue(
          customerCurrencyRef.current,
          newCurrencies,
        );

        setForm((previous) => ({
          ...previous,
          currency: resolvedCurrency,
        }));
      }

      setCurrencyPage(page);

      const totalPages = Number(result?.pagination?.totalPages) || 0;

      setCurrencyHasMore(page < totalPages);
    } catch (error) {
      console.error("LOAD CURRENCIES ERROR:", error);

      showErrorToast(error?.message || "Failed to load currencies.");
    } finally {
      currencyLoadingRef.current = false;

      setLoadingCurrencies(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Country Scroll
  |--------------------------------------------------------------------------
  */

  const handleCountryScroll = (event) => {
    const element = getSelectScrollElement(event);

    if (!element) {
      return;
    }

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    if (
      distanceFromBottom <= 60 &&
      countryHasMore &&
      !countryLoadingRef.current
    ) {
      loadCountries(countryPage + 1);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Currency Scroll
  |--------------------------------------------------------------------------
  */

  const handleCurrencyScroll = (event) => {
    const element = getSelectScrollElement(event);

    if (!element) {
      return;
    }

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    if (
      distanceFromBottom <= 60 &&
      currencyHasMore &&
      !currencyLoadingRef.current
    ) {
      loadCurrencies(currencyPage + 1);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Load Customer Groups
  |--------------------------------------------------------------------------
  */

  const loadCustomerGroups = async () => {
    try {
      setGroupsLoading(true);

      const response = await apiFetch(
        "/api/customer_group?page=1&limit=100&sort=name&dir=asc",
        {
          method: "GET",
        },
      );

      const result =
        typeof response?.json === "function" ? await response.json() : response;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load customer groups.");
      }

      setCustomerGroups(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error("LOAD CUSTOMER GROUPS ERROR:", error);

      showErrorToast(error?.message || "Failed to load customer groups.");

      setCustomerGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Load Custom Fields
  |--------------------------------------------------------------------------
  */

  const loadCustomFields = async () => {
    try {
      setCustomFieldsLoading(true);

      const response = await apiFetch("/api/custom_fields?fieldto=customers", {
        method: "GET",
      });

      const result =
        typeof response?.json === "function" ? await response.json() : response;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load custom fields.");
      }

      const fields = Array.isArray(result.data) ? result.data : [];

      setCustomFieldDefinitions(fields);

      const defaultValues = {};

      fields.forEach((field) => {
        if (!field?.slug) {
          return;
        }

        if (field.type === "file" || field.type === "image") {
          defaultValues[field.slug] = "";

          return;
        }

        if (field.type === "multifile" || field.type === "multiimage") {
          defaultValues[field.slug] = [];

          return;
        }

        if (field.type === "checkbox") {
          defaultValues[field.slug] =
            field.defaultValue === "true" || field.defaultValue === "1";

          return;
        }

        if (field.type === "multiselect") {
          if (field.defaultValue) {
            if (
              typeof field.defaultValue === "string" &&
              field.defaultValue.startsWith("[")
            ) {
              try {
                const parsed = JSON.parse(field.defaultValue);

                if (Array.isArray(parsed)) {
                  defaultValues[field.slug] = parsed;

                  return;
                }
              } catch {
                // Continue below.
              }
            }

            defaultValues[field.slug] = String(field.defaultValue)
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);

            return;
          }

          defaultValues[field.slug] = [];

          return;
        }

        defaultValues[field.slug] = field.defaultValue ?? "";
      });

      if (customer?.custom_field_values || customer?.customFields) {
        setCustomFields(
          customer.custom_field_values || customer.customFields || {},
        );
      } else {
        setCustomFields(defaultValues);
      }
    } catch (error) {
      console.error("LOAD CUSTOMER CUSTOM FIELDS ERROR:", error);

      showErrorToast(error?.message || "Failed to load custom fields.");

      setCustomFieldDefinitions([]);
    } finally {
      setCustomFieldsLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Load Customer Into Form
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!open || !customer) {
      return;
    }

    /*
     * Save original currency value BEFORE loading currencies.
     */
    customerCurrencyRef.current =
      customer.defaultCurrency ??
      customer.currency ??
      customer.currencyId ??
      customer.default_currency ??
      "";

    /*
     * Save original country values BEFORE loading countries.
     */
    customerCountryRef.current =
      customer.country ?? customer.countryId ?? customer.country_id ?? "";

    customerBillingCountryRef.current =
      customer.billingCountry ??
      customer.billingCountryId ??
      customer.billing_country_id ??
      "";

    customerShippingCountryRef.current =
      customer.shippingCountry ??
      customer.shippingCountryId ??
      customer.shipping_country_id ??
      "";

    /*
     * Initial form.
     *
     * Currency and countries are resolved again after
     * their respective API data has loaded.
     */
    setForm({
      company: customer.company || "",

      vat: customer.vatNumber || "",
      email: customer.email || "",
      phone: customer.phone || "",

      website: customer.website || "",

      /*
       * Do NOT rely on this value for the final Select value.
       * loadCurrencies() will resolve it to the actual ID.
       */
      currency: "",

      defaultLanguage: customer.defaultLanguage || "",

      address: customer.address || "",

      city: customer.city || "",

      state: customer.state || "",

      zip: customer.zip || "",

      /*
       * Do NOT rely on this value for the final Select value.
       * loadCountries() will resolve it to the actual ID.
       */
      country: "",

      billingStreet: customer.billingStreet || "",

      billingCity: customer.billingCity || "",

      billingState: customer.billingState || "",

      billingZip: customer.billingZip || "",

      billingCountry: "",

      shippingStreet: customer.shippingStreet || "",

      shippingCity: customer.shippingCity || "",

      shippingState: customer.shippingState || "",

      shippingZip: customer.shippingZip || "",

      shippingCountry: "",

      groups: (() => {
        if (Array.isArray(customer.groups)) {
          const group = customer.groups[0];

          if (typeof group === "object" && group !== null) {
            return String(group.id ?? group.groupId ?? group.value ?? "");
          }

          return group != null ? String(group) : "";
        }

        if (typeof customer.groups === "object" && customer.groups !== null) {
          return String(
            customer.groups.id ??
              customer.groups.groupId ??
              customer.groups.value ??
              "",
          );
        }

        return customer.groups != null ? String(customer.groups) : "";
      })(),

      active: typeof customer.active === "boolean" ? customer.active : true,
    });

    /*
     * Existing custom fields.
     */
    setCustomFields(
      customer.custom_field_values || customer.customFields || {},
    );

    /*
     * Reset countries.
     */
    setCountries([]);

    setCountryPage(1);

    setCountryHasMore(true);

    countryLoadingRef.current = false;

    /*
     * Reset currencies.
     */
    setCurrencies([]);

    setCurrencyPage(1);

    setCurrencyHasMore(true);

    currencyLoadingRef.current = false;

    /*
     * Load database data.
     */
    loadCustomerGroups();

    loadCustomFields();

    loadCountries(1);

    loadCurrencies(1);
  }, [open, customer]);

  /*
  |--------------------------------------------------------------------------
  | Generic Input Update
  |--------------------------------------------------------------------------
  */

  const update = (key) => (event) => {
    setForm((previous) => ({
      ...previous,
      [key]: event.target.value,
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | Copy Billing To Shipping
  |--------------------------------------------------------------------------
  */

  const copyBillingToShipping = () => {
    setForm((previous) => ({
      ...previous,

      shippingStreet: previous.billingStreet,

      shippingCity: previous.billingCity,

      shippingState: previous.billingState,

      shippingZip: previous.billingZip,

      shippingCountry: previous.billingCountry,
    }));

    showSuccessToast("Billing address copied to shipping address.");
  };

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    /*
     * Validation.
     */
    if (!form.company.trim()) {
      showErrorToast("Company is required.");

      return;
    }

    if (!customer?.id) {
      showErrorToast("Customer ID is missing.");

      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch("/api/customers", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: customer.id,

          ...form,

          customFields: customFields || {},
        }),
      });

      const result =
        typeof response?.json === "function" ? await response.json() : response;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to update customer.");
      }

      showSuccessToast("Customer updated successfully.");

      onSuccess?.();
    } catch (error) {
      console.error("UPDATE CUSTOMER ERROR:", error);

      showErrorToast(error?.message || "Failed to update customer.");
    } finally {
      setLoading(false);
    }
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
          closeDialog?.();
        }
      }}
    >
      <DialogContent
        className="
          max-h-[90vh]
          max-w-5xl
          overflow-y-auto
        "
      >
        <DialogHeader>
          <DialogTitle>Edit Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ==========================================================
              CUSTOMER INFORMATION
          ========================================================== */}

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Customer Information</h3>

              <p className="text-sm text-muted-foreground">
                Update the customer's basic information.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* COMPANY */}

              <div className="space-y-2">
                <Label>
                  Company
                  <span className="ml-1 text-destructive">*</span>
                </Label>

                <Input
                  value={form.company}
                  onChange={update("company")}
                  disabled={loading}
                  placeholder="Company name"
                />
              </div>

              {/* VAT */}

              <div className="space-y-2">
                <Label>VAT Number</Label>

                <Input
                  value={form.vat}
                  onChange={update("vat")}
                  disabled={loading}
                  placeholder="VAT number"
                />
              </div>
              {/* Email */}
              <div className="space-y-2">
                <Label>
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="email"
                  value={form.email}
                   onChange={update("email")}
                  placeholder="john@example.com"
                />
              </div>

              {/* PHONE */}

              <div className="space-y-2">
                <Label>Phone</Label>

                <Input
                  value={form.phone}
                  onChange={update("phone")}
                  disabled={loading}
                  placeholder="Phone number"
                />
              </div>

              {/* WEBSITE */}

              <div className="space-y-2">
                <Label>Website</Label>

                <Input
                  value={form.website}
                  onChange={update("website")}
                  disabled={loading}
                  placeholder="https://example.com"
                />
              </div>

              {/* CUSTOMER GROUP */}

              <div className="space-y-2">
                <Label>Customer Group</Label>

                <Select
                  value={
                    Array.isArray(form.groups)
                      ? form.groups[0] || "none"
                      : form.groups || "none"
                  }
                  onValueChange={(value) => {
                    setForm((previous) => ({
                      ...previous,

                      groups: value === "none" ? [] : [value],
                    }));
                  }}
                  disabled={loading || groupsLoading}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        groupsLoading
                          ? "Loading groups..."
                          : "Select customer group"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="none">No Customer Group</SelectItem>

                    {customerGroups.map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* CURRENCY */}

              <div className="space-y-2">
                <Label>Currency</Label>

                <Select
                  value={form.currency || ""}
                  onValueChange={(value) => {
                    setForm((previous) => ({
                      ...previous,
                      currency: value,
                    }));
                  }}
                  disabled={loading || loadingCurrencies}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingCurrencies
                          ? "Loading currencies..."
                          : "Select currency"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent
                    className="max-h-[300px]"
                    onScrollCapture={handleCurrencyScroll}
                  >
                    {currencies.map((currency) => (
                      <SelectItem key={currency.id} value={String(currency.id)}>
                        {currency.name}

                        {currency.symbol ? ` (${currency.symbol})` : ""}
                      </SelectItem>
                    ))}

                    {loadingCurrencies && (
                      <div className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Loading more currencies...
                      </div>
                    )}

                    {!loadingCurrencies &&
                      !currencyHasMore &&
                      currencies.length > 0 && (
                        <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                          No more currencies
                        </div>
                      )}

                    {!loadingCurrencies && currencies.length === 0 && (
                      <div className="px-3 py-3 text-center text-sm text-muted-foreground">
                        No currencies found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* LANGUAGE */}

              <div className="space-y-2">
                <Label>Default Language</Label>

                <select
                  value={form.defaultLanguage}
                  onChange={update("defaultLanguage")}
                  disabled={loading}
                  className="
                    flex h-10 w-full rounded-md
                    border border-input
                    bg-background px-3 py-2
                    text-sm ring-offset-background
                    focus:outline-none
                    focus:ring-2 focus:ring-ring
                    focus:ring-offset-2
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  <option value="">Select Language</option>

                  {languages.map((language) => (
                    <option key={language} value={language}>
                      {language.charAt(0).toUpperCase() + language.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ==========================================================
              CUSTOMER ADDRESS
          ========================================================== */}

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Customer Address</h3>

              <p className="text-sm text-muted-foreground">
                Update the primary customer address.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* ADDRESS */}

              <div className="space-y-2 md:col-span-2">
                <Label>Address</Label>

                <Input
                  value={form.address}
                  onChange={update("address")}
                  disabled={loading}
                  placeholder="Street address"
                />
              </div>

              {/* CITY */}

              <div className="space-y-2">
                <Label>City</Label>

                <Input
                  value={form.city}
                  onChange={update("city")}
                  disabled={loading}
                  placeholder="City"
                />
              </div>

              {/* STATE */}

              <div className="space-y-2">
                <Label>State</Label>

                <Input
                  value={form.state}
                  onChange={update("state")}
                  disabled={loading}
                  placeholder="State"
                />
              </div>

              {/* ZIP */}

              <div className="space-y-2">
                <Label>ZIP</Label>

                <Input
                  value={form.zip}
                  onChange={update("zip")}
                  disabled={loading}
                  placeholder="ZIP code"
                />
              </div>

              {/* COUNTRY */}

              <div className="space-y-2">
                <Label>Country</Label>

                <Select
                  value={form.country || ""}
                  onValueChange={(value) => {
                    setForm((previous) => ({
                      ...previous,
                      country: value,
                    }));
                  }}
                  disabled={loading || loadingCountries}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingCountries
                          ? "Loading countries..."
                          : "Select Country"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent
                    className="max-h-[300px]"
                    onScrollCapture={handleCountryScroll}
                  >
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={String(country.id)}>
                        {country.name}
                      </SelectItem>
                    ))}

                    {loadingCountries && (
                      <div className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Loading more countries...
                      </div>
                    )}

                    {!loadingCountries &&
                      !countryHasMore &&
                      countries.length > 0 && (
                        <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                          No more countries
                        </div>
                      )}

                    {!loadingCountries && countries.length === 0 && (
                      <div className="px-3 py-3 text-center text-sm text-muted-foreground">
                        No countries found
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ==========================================================
              BILLING ADDRESS
          ========================================================== */}

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Billing Address</h3>

              <p className="text-sm text-muted-foreground">
                Update the customer's billing address.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* BILLING STREET */}

              <div className="space-y-2 md:col-span-2">
                <Label>Billing Street</Label>

                <Input
                  value={form.billingStreet}
                  onChange={update("billingStreet")}
                  disabled={loading}
                  placeholder="Billing street"
                />
              </div>

              {/* BILLING CITY */}

              <div className="space-y-2">
                <Label>Billing City</Label>

                <Input
                  value={form.billingCity}
                  onChange={update("billingCity")}
                  disabled={loading}
                  placeholder="Billing city"
                />
              </div>

              {/* BILLING STATE */}

              <div className="space-y-2">
                <Label>Billing State</Label>

                <Input
                  value={form.billingState}
                  onChange={update("billingState")}
                  disabled={loading}
                  placeholder="Billing state"
                />
              </div>

              {/* BILLING ZIP */}

              <div className="space-y-2">
                <Label>Billing ZIP</Label>

                <Input
                  value={form.billingZip}
                  onChange={update("billingZip")}
                  disabled={loading}
                  placeholder="Billing ZIP"
                />
              </div>

              {/* BILLING COUNTRY */}

              <div className="space-y-2">
                <Label>Billing Country</Label>

                <Select
                  value={form.billingCountry || ""}
                  onValueChange={(value) => {
                    setForm((previous) => ({
                      ...previous,
                      billingCountry: value,
                    }));
                  }}
                  disabled={loading || loadingCountries}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingCountries
                          ? "Loading countries..."
                          : "Select Country"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent
                    className="max-h-[300px]"
                    onScrollCapture={handleCountryScroll}
                  >
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={String(country.id)}>
                        {country.name}
                      </SelectItem>
                    ))}

                    {loadingCountries && (
                      <div className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Loading more countries...
                      </div>
                    )}

                    {!loadingCountries &&
                      !countryHasMore &&
                      countries.length > 0 && (
                        <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                          No more countries
                        </div>
                      )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ==========================================================
              SHIPPING ADDRESS
          ========================================================== */}

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold">Shipping Address</h3>

                <p className="text-sm text-muted-foreground">
                  Update the customer's shipping address.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyBillingToShipping}
                disabled={loading}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Billing Address
              </Button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* SHIPPING STREET */}

              <div className="space-y-2 md:col-span-2">
                <Label>Shipping Street</Label>

                <Input
                  value={form.shippingStreet}
                  onChange={update("shippingStreet")}
                  disabled={loading}
                  placeholder="Shipping street"
                />
              </div>

              {/* SHIPPING CITY */}

              <div className="space-y-2">
                <Label>Shipping City</Label>

                <Input
                  value={form.shippingCity}
                  onChange={update("shippingCity")}
                  disabled={loading}
                  placeholder="Shipping city"
                />
              </div>

              {/* SHIPPING STATE */}

              <div className="space-y-2">
                <Label>Shipping State</Label>

                <Input
                  value={form.shippingState}
                  onChange={update("shippingState")}
                  disabled={loading}
                  placeholder="Shipping state"
                />
              </div>

              {/* SHIPPING ZIP */}

              <div className="space-y-2">
                <Label>Shipping ZIP</Label>

                <Input
                  value={form.shippingZip}
                  onChange={update("shippingZip")}
                  disabled={loading}
                  placeholder="Shipping ZIP"
                />
              </div>

              {/* SHIPPING COUNTRY */}

              <div className="space-y-2">
                <Label>Shipping Country</Label>

                <Select
                  value={form.shippingCountry || ""}
                  onValueChange={(value) => {
                    setForm((previous) => ({
                      ...previous,
                      shippingCountry: value,
                    }));
                  }}
                  disabled={loading || loadingCountries}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingCountries
                          ? "Loading countries..."
                          : "Select Country"
                      }
                    />
                  </SelectTrigger>

                  <SelectContent
                    className="max-h-[300px]"
                    onScrollCapture={handleCountryScroll}
                  >
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={String(country.id)}>
                        {country.name}
                      </SelectItem>
                    ))}

                    {loadingCountries && (
                      <div className="flex items-center justify-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Loading more countries...
                      </div>
                    )}

                    {!loadingCountries &&
                      !countryHasMore &&
                      countries.length > 0 && (
                        <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                          No more countries
                        </div>
                      )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* ==========================================================
              CUSTOM FIELDS
          ========================================================== */}

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Custom Fields</h3>

              <p className="text-sm text-muted-foreground">
                Additional customer information.
              </p>
            </div>

            {customFieldsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Loading custom fields...
              </div>
            ) : (
              <CustomerCustomFields
                fields={customFieldDefinitions}
                values={customFields}
                onChange={setCustomFields}
                disabled={loading}
              />
            )}
          </div>

          {/* ==========================================================
              FOOTER
          ========================================================== */}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading || customFieldsLoading}>
              {loading ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Update Customer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
