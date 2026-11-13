"use client";

import { useEffect, useState } from "react";

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

const CountryEditDialog = ({ open, closeDialog, Country, onSuccess }) => {
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

  // =======================================================
  // AUTOFILL COUNTRY DATA
  // =======================================================

  useEffect(() => {
    if (Country) {
      setName(Country.name || "");

      setIso2(Country.iso2 || "");

      setIso3(Country.iso3 || "");

      setPhoneCode(Country.phoneCode || "");

      setCurrencyCode(Country.currencyCode || "");

      setCurrencyName(Country.currencyName || "");

      setIsActive(
        Country.isActive !== undefined && Country.isActive !== null
          ? Boolean(Country.isActive)
          : true,
      );
    }
  }, [Country]);

  // =======================================================
  // CLOSE
  // =======================================================

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

  // =======================================================
  // SUBMIT
  // =======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    // -------------------------------------------------------
    // VALIDATE COUNTRY
    // -------------------------------------------------------

    if (!Country?.id) {
      showErrorToast("Invalid Country.");

      return;
    }

    // -------------------------------------------------------
    // VALIDATE NAME
    // -------------------------------------------------------

    const countryName = name.trim();

    if (!countryName) {
      showErrorToast("Country name is required.");

      return;
    }

    // -------------------------------------------------------
    // VALIDATE ISO2
    // -------------------------------------------------------

    const countryIso2 = iso2.trim().toUpperCase();

    if (!countryIso2) {
      showErrorToast("ISO2 code is required.");

      return;
    }

    if (countryIso2.length !== 2) {
      showErrorToast("ISO2 code must contain exactly 2 characters.");

      return;
    }

    // -------------------------------------------------------
    // VALIDATE ISO3
    // -------------------------------------------------------

    const countryIso3 = iso3.trim().toUpperCase();

    if (!countryIso3) {
      showErrorToast("ISO3 code is required.");

      return;
    }

    if (countryIso3.length !== 3) {
      showErrorToast("ISO3 code must contain exactly 3 characters.");

      return;
    }

    // -------------------------------------------------------
    // PHONE CODE
    // -------------------------------------------------------

    const countryPhoneCode = phoneCode.trim();

    // -------------------------------------------------------
    // CURRENCY CODE
    // -------------------------------------------------------

    const countryCurrencyCode = currencyCode.trim().toUpperCase();

    if (countryCurrencyCode && countryCurrencyCode.length !== 3) {
      showErrorToast("Currency code must contain exactly 3 characters.");

      return;
    }

    // -------------------------------------------------------
    // CURRENCY NAME
    // -------------------------------------------------------

    const countryCurrencyName = currencyName.trim();

    try {
      setLoading(true);

      // =====================================================
      // UPDATE COUNTRY
      // =====================================================

      const response = await apiFetch("/api/countries", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: Country.id,

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

      // =====================================================
      // ERROR
      // =====================================================

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Failed to update country.");
      }

      // =====================================================
      // SUCCESS
      // =====================================================

      showSuccessToast(result?.message || "Country updated successfully.");

      // =====================================================
      // CLEAR FORM
      // =====================================================

      setName("");
      setIso2("");
      setIso3("");
      setPhoneCode("");
      setCurrencyCode("");
      setCurrencyName("");
      setIsActive(true);

      // =====================================================
      // PARENT REFRESH
      // =====================================================

      if (onSuccess) {
        await onSuccess(result?.data || result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error("UPDATE COUNTRY ERROR:", error);

      showErrorToast(error?.message || "Failed to update country.");
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // RENDER
  // =======================================================

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
              <DialogTitle>Edit Country</DialogTitle>

              <DialogDescription>Update country information.</DialogDescription>
            </DialogHeader>
            <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
              <DialogBody>
                <div className="space-y-2">
                  <label htmlFor="country-edit-name" className="text-sm font-medium">
                    Country Name
                    <span className="ms-1 text-destructive">*</span>
                  </label>

                  <Input
                    id="country-edit-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter country name"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* ISO2 */}

                  <div className="space-y-2">
                    <label
                      htmlFor="country-edit-iso2"
                      className="text-sm font-medium"
                    >
                      ISO2 Code
                      <span className="ms-1 text-destructive">*</span>
                    </label>

                    <Input
                      id="country-edit-iso2"
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
                    <label
                      htmlFor="country-edit-iso3"
                      className="text-sm font-medium"
                    >
                      ISO3 Code
                      <span className="ms-1 text-destructive">*</span>
                    </label>

                    <Input
                      id="country-edit-iso3"
                      type="text"
                      maxLength={3}
                      value={iso3}
                      onChange={(event) => setIso3(event.target.value.toUpperCase())}
                      placeholder="e.g. IND"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="country-edit-phone-code"
                    className="text-sm font-medium"
                  >
                    Phone Code
                  </label>

                  <Input
                    id="country-edit-phone-code"
                    type="text"
                    value={phoneCode}
                    onChange={(event) => setPhoneCode(event.target.value)}
                    placeholder="e.g. +91"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {/* CURRENCY CODE */}

                  <div className="space-y-2">
                    <label
                      htmlFor="country-edit-currency-code"
                      className="text-sm font-medium"
                    >
                      Currency Code
                    </label>

                    <Input
                      id="country-edit-currency-code"
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
                      htmlFor="country-edit-currency-name"
                      className="text-sm font-medium"
                    >
                      Currency Name
                    </label>

                    <Input
                      id="country-edit-currency-name"
                      type="text"
                      value={currencyName}
                      onChange={(event) => setCurrencyName(event.target.value)}
                      placeholder="e.g. Indian Rupee"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <label
                      htmlFor="country-edit-active"
                      className="text-sm font-medium"
                    >
                      Active
                    </label>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Enable this country for use in the system.
                    </p>
                  </div>

                  <Switch
                    id="country-edit-active"
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
                {loading ? "Updating..." : "Update Country"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog >
  );
};

export default CountryEditDialog;
