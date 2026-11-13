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
| Component
|--------------------------------------------------------------------------
*/

export default function CustomerAddDialog({ open, closeDialog, onSuccess }) {
  /*
  |--------------------------------------------------------------------------
  | Main Loading
  |--------------------------------------------------------------------------
  */

  const [loading, setLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Custom Fields Loading
  |--------------------------------------------------------------------------
  */

  const [customFieldsLoading, setCustomFieldsLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Customer Groups
  |--------------------------------------------------------------------------
  */

  const [customerGroups, setCustomerGroups] = useState([]);

  const [groupsLoading, setGroupsLoading] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | Custom Field Definitions
  |--------------------------------------------------------------------------
  */

  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);

  /*
  |--------------------------------------------------------------------------
  | Custom Field Values
  |--------------------------------------------------------------------------
  */

  const [customFields, setCustomFields] = useState({});

  /*
  |--------------------------------------------------------------------------
  | Customer Form
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

    /*
    |--------------------------------------------------------------------------
    | Main Address
    |--------------------------------------------------------------------------
    */

    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",

    /*
    |--------------------------------------------------------------------------
    | Billing Address
    |--------------------------------------------------------------------------
    */

    billingStreet: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    billingCountry: "",

    /*
    |--------------------------------------------------------------------------
    | Shipping Address
    |--------------------------------------------------------------------------
    */

    shippingStreet: "",
    shippingCity: "",
    shippingState: "",
    shippingZip: "",
    shippingCountry: "",

    /*
    |--------------------------------------------------------------------------
    | Other
    |--------------------------------------------------------------------------
    */

    groups: [],
    active: true,
  });

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
  |
  | Prevent multiple API calls when user reaches bottom.
  |
  */

  const countryLoadingRef = useRef(false);

  const currencyLoadingRef = useRef(false);

  /*
  |--------------------------------------------------------------------------
  | Load Countries
  |--------------------------------------------------------------------------
  */

  const loadCountries = async (page = 1) => {
    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate request
    |--------------------------------------------------------------------------
    */

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

      /*
      |--------------------------------------------------------------------------
      | apiFetch can return Response or JSON
      |--------------------------------------------------------------------------
      */

      const result =
        typeof response?.json === "function" ? await response.json() : response;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load countries.");
      }

      const newCountries = Array.isArray(result.data) ? result.data : [];

      /*
      |--------------------------------------------------------------------------
      | Append / Replace
      |--------------------------------------------------------------------------
      */

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
      |--------------------------------------------------------------------------
      | Update Page
      |--------------------------------------------------------------------------
      */

      setCountryPage(page);

      /*
      |--------------------------------------------------------------------------
      | Update Has More
      |--------------------------------------------------------------------------
      */

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
    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate request
    |--------------------------------------------------------------------------
    */

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

      /*
      |--------------------------------------------------------------------------
      | apiFetch can return Response or JSON
      |--------------------------------------------------------------------------
      */

      const result =
        typeof response?.json === "function" ? await response.json() : response;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to load currencies.");
      }

      const newCurrencies = Array.isArray(result.data) ? result.data : [];

      /*
      |--------------------------------------------------------------------------
      | Append / Replace
      |--------------------------------------------------------------------------
      */

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
      |--------------------------------------------------------------------------
      | Update Page
      |--------------------------------------------------------------------------
      */

      setCurrencyPage(page);

      /*
      |--------------------------------------------------------------------------
      | Update Has More
      |--------------------------------------------------------------------------
      */

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
  | Get Actual Select Scroll Element
  |--------------------------------------------------------------------------
  |
  | Radix Select uses an internal viewport.
  | This finds the real scrollable element.
  |
  */

  const getSelectScrollElement = (event) => {
    let element = event.target;

    if (!(element instanceof HTMLElement)) {
      return null;
    }

    /*
    |--------------------------------------------------------------------------
    | Radix Select Viewport
    |--------------------------------------------------------------------------
    */

    const viewport = element.closest("[data-radix-select-viewport]");

    if (viewport) {
      return viewport;
    }

    /*
    |--------------------------------------------------------------------------
    | Fallback
    |--------------------------------------------------------------------------
    */

    return element;
  };

  /*
  |--------------------------------------------------------------------------
  | Country Scroll Handler
  |--------------------------------------------------------------------------
  */

  const handleCountryScroll = (event) => {
    const element = getSelectScrollElement(event);

    if (!element) {
      return;
    }

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    /*
    |--------------------------------------------------------------------------
    | Load next page when 60px from bottom
    |--------------------------------------------------------------------------
    */

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
  | Currency Scroll Handler
  |--------------------------------------------------------------------------
  */

  const handleCurrencyScroll = (event) => {
    const element = getSelectScrollElement(event);

    if (!element) {
      return;
    }

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    /*
    |--------------------------------------------------------------------------
    | Load next page when 60px from bottom
    |--------------------------------------------------------------------------
    */

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

      /*
      |--------------------------------------------------------------------------
      | Default Custom Values
      |--------------------------------------------------------------------------
      */

      const defaultValues = {};

      fields.forEach((field) => {
        if (!field?.slug) {
          return;
        }

        /*
        |--------------------------------------------------------------------------
        | File / Image
        |--------------------------------------------------------------------------
        */

        if (field.type === "file" || field.type === "image") {
          defaultValues[field.slug] = "";

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Multi File / Multi Image
        |--------------------------------------------------------------------------
        */

        if (field.type === "multifile" || field.type === "multiimage") {
          defaultValues[field.slug] = [];

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Checkbox
        |--------------------------------------------------------------------------
        */

        if (field.type === "checkbox") {
          defaultValues[field.slug] =
            field.defaultValue === "true" || field.defaultValue === "1";

          return;
        }

        /*
        |--------------------------------------------------------------------------
        | Multiselect
        |--------------------------------------------------------------------------
        */

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
                // Continue below
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

        /*
        |--------------------------------------------------------------------------
        | Normal Field
        |--------------------------------------------------------------------------
        */

        defaultValues[field.slug] = field.defaultValue ?? "";
      });

      setCustomFields(defaultValues);
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
  | Load Data When Dialog Opens
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!open) {
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Reset Country Pagination
    |--------------------------------------------------------------------------
    */

    setCountries([]);

    setCountryPage(1);

    setCountryHasMore(true);

    countryLoadingRef.current = false;

    /*
    |--------------------------------------------------------------------------
    | Reset Currency Pagination
    |--------------------------------------------------------------------------
    */

    setCurrencies([]);

    setCurrencyPage(1);

    setCurrencyHasMore(true);

    currencyLoadingRef.current = false;

    /*
    |--------------------------------------------------------------------------
    | Load Data
    |--------------------------------------------------------------------------
    */

    loadCustomFields();

    loadCustomerGroups();

    loadCountries(1);

    loadCurrencies(1);
  }, [open]);

  /*
  |--------------------------------------------------------------------------
  | Update Normal Form Field
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
    |--------------------------------------------------------------------------
    | Validation
    |--------------------------------------------------------------------------
    */

    if (!form.company.trim()) {
      showErrorToast("Company is required.");

      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch("/api/customers", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...form,

          customFields: customFields || {},
        }),
      });

      const result =
        typeof response?.json === "function" ? await response.json() : response;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to create customer.");
      }

      /*
      |--------------------------------------------------------------------------
      | Success
      |--------------------------------------------------------------------------
      */

      showSuccessToast("Customer created successfully.");

      setCustomFields({});

      onSuccess?.();
    } catch (error) {
      console.error("CREATE CUSTOMER ERROR:", error);

      showErrorToast(error?.message || "Failed to create customer.");
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
          <DialogTitle>Add Customer</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ==========================================================
              CUSTOMER INFORMATION
          ========================================================== */}

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Customer Information</h3>

              <p className="text-sm text-muted-foreground">
                Enter the customer's basic information.
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
              <div className="space-y-2">
                <Label>
                  Email <span className="text-destructive">*</span>
                </Label>

                <Input
                  type="email"
                  name="email"
                  value={form.email || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
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
                  disabled={loading}
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
                Enter the primary customer address.
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
                  disabled={loading}
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
                Enter the customer's billing address.
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
                  disabled={loading}
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
                  Enter the customer's shipping address.
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
                  disabled={loading}
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
                "Add Customer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}