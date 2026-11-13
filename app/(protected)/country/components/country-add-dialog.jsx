"use client";

import { useState } from "react";

import { toast } from "sonner";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { apiFetch } from "@/lib/api";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Switch } from "@/components/ui/switch";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
      position: "top-center",
      duration: 4000,
    },
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
      position: "top-center",
      duration: 5000,
    },
  );
}

// =======================================================
// COMPONENT
// =======================================================

const CountryAddDialog = ({ open, closeDialog, onSuccess }) => {
  // =====================================================
  // FORM STATE
  // =====================================================

  const [name, setName] = useState("");
  const [iso2, setIso2] = useState("");
  const [iso3, setIso3] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const [currencyName, setCurrencyName] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(false);

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) return;

    setName("");
    setIso2("");
    setIso3("");
    setPhoneCode("");
    setCurrencyCode("");
    setCurrencyName("");
    setIsActive(true);

    closeDialog();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const countryName = name.trim();
    const countryIso2 = iso2.trim().toUpperCase();
    const countryIso3 = iso3.trim().toUpperCase();
    const countryPhoneCode = phoneCode.trim();
    const countryCurrencyCode = currencyCode.trim().toUpperCase();
    const countryCurrencyName = currencyName.trim();

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!countryName) {
      showErrorToast("Country name is required.");

      return;
    }

    if (!countryIso2) {
      showErrorToast("ISO2 code is required.");

      return;
    }

    if (countryIso2.length !== 2) {
      showErrorToast("ISO2 code must contain exactly 2 characters.");

      return;
    }

    if (!countryIso3) {
      showErrorToast("ISO3 code is required.");

      return;
    }

    if (countryIso3.length !== 3) {
      showErrorToast("ISO3 code must contain exactly 3 characters.");

      return;
    }

    if (countryCurrencyCode && countryCurrencyCode.length !== 3) {
      showErrorToast("Currency code must contain exactly 3 characters.");

      return;
    }

    try {
      setLoading(true);

      // -------------------------------------------------
      // API REQUEST
      // -------------------------------------------------

      const response = await apiFetch("/api/countries", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          name: countryName,

          iso2: countryIso2,

          iso3: countryIso3,

          phoneCode: countryPhoneCode || null,

          currencyCode: countryCurrencyCode || null,

          currencyName: countryCurrencyName || null,

          isActive,
        }),
      });

      const result = await response.json().catch(() => ({}));

      // -------------------------------------------------
      // ERROR
      // -------------------------------------------------

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Failed to create country.");
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      showSuccessToast(result?.message || "Country created successfully.");

      // Reset form
      setName("");
      setIso2("");
      setIso3("");
      setPhoneCode("");
      setCurrencyCode("");
      setCurrencyName("");
      setIsActive(true);

      if (onSuccess) {
        await onSuccess(result?.data || result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error("CREATE COUNTRY ERROR:", error);

      showErrorToast(error?.message || "Failed to create country.");
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
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Add Country</DialogTitle>

              <DialogDescription>Create a new country.</DialogDescription>
            </DialogHeader>


            <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
              <DialogBody>
                {/* ===========================================
              COUNTRY NAME
          =========================================== */}

                <div className="space-y-2">
                  <label htmlFor="country-name" className="text-sm font-medium">
                    Country Name
                    <span className="ms-1 text-destructive">*</span>
                  </label>

                  <Input
                    id="country-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter country name"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                {/* ===========================================
              ISO CODES
          =========================================== */}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* ISO2 */}

                  <div className="space-y-2">
                    <label htmlFor="country-iso2" className="text-sm font-medium">
                      ISO2 Code
                      <span className="ms-1 text-destructive">*</span>
                    </label>

                    <Input
                      id="country-iso2"
                      type="text"
                      maxLength={2}
                      value={iso2}
                      onChange={(event) => setIso2(event.target.value.toUpperCase())}
                      placeholder="e.g. IN"
                      disabled={loading}
                    />
                  </div>

                  {/* ISO3 */}

                  <div className="space-y-2">
                    <label htmlFor="country-iso3" className="text-sm font-medium">
                      ISO3 Code
                      <span className="ms-1 text-destructive">*</span>
                    </label>

                    <Input
                      id="country-iso3"
                      type="text"
                      maxLength={3}
                      value={iso3}
                      onChange={(event) => setIso3(event.target.value.toUpperCase())}
                      placeholder="e.g. IND"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* ===========================================
              PHONE CODE
          =========================================== */}

                <div className="space-y-2">
                  <label htmlFor="country-phone-code" className="text-sm font-medium">
                    Phone Code
                  </label>

                  <Input
                    id="country-phone-code"
                    type="text"
                    value={phoneCode}
                    onChange={(event) => setPhoneCode(event.target.value)}
                    placeholder="e.g. +91"
                    disabled={loading}
                  />
                </div>

                {/* ===========================================
              CURRENCY
          =========================================== */}

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* CURRENCY CODE */}

                  <div className="space-y-2">
                    <label
                      htmlFor="country-currency-code"
                      className="text-sm font-medium"
                    >
                      Currency Code
                    </label>

                    <Input
                      id="country-currency-code"
                      type="text"
                      maxLength={3}
                      value={currencyCode}
                      onChange={(event) =>
                        setCurrencyCode(event.target.value.toUpperCase())
                      }
                      placeholder="e.g. INR"
                      disabled={loading}
                    />
                  </div>

                  {/* CURRENCY NAME */}

                  <div className="space-y-2">
                    <label
                      htmlFor="country-currency-name"
                      className="text-sm font-medium"
                    >
                      Currency Name
                    </label>

                    <Input
                      id="country-currency-name"
                      type="text"
                      value={currencyName}
                      onChange={(event) => setCurrencyName(event.target.value)}
                      placeholder="e.g. Indian Rupee"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* ===========================================
              ACTIVE STATUS
          =========================================== */}

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <label htmlFor="country-active" className="text-sm font-medium">
                      Active
                    </label>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Enable this country for use in the system.
                    </p>
                  </div>

                  <Switch
                    id="country-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                    disabled={loading}
                  />
                </div>
              </DialogBody>
            </ScrollArea>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Country"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CountryAddDialog;
