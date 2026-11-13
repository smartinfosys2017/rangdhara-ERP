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
  DialogTitle,
} from "@/components/ui/dialog";

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

const CountryDeleteDialog = ({ open, closeDialog, countries, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  // =====================================================
  // DELETE COUNTRY
  // =====================================================

  const handleDelete = async () => {
    if (!countries?.id) {
      showErrorToast("Invalid Country ID.");
      return;
    }

    try {
      setLoading(true);

      // -------------------------------------------------
      // DELETE API
      // -------------------------------------------------

      const response = await apiFetch(`/api/countries?id=${countries.id}`, {
        method: "DELETE",
      });

      const result = await response.json().catch(() => ({}));

      // -------------------------------------------------
      // ERROR
      // -------------------------------------------------

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Failed to delete country.");
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      showSuccessToast(result?.message || "Country deleted successfully.");

      // -------------------------------------------------
      // CLOSE + REFRESH PARENT
      // -------------------------------------------------

      if (onSuccess) {
        await onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error("DELETE COUNTRY ERROR:", error);

      showErrorToast(error?.message || "Failed to delete country.");
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
        if (!value && !loading) {
          closeDialog();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Country</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this country?
          </DialogDescription>
        </DialogHeader>

        {/* =============================================
            COUNTRY INFORMATION
        ============================================= */}

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">Country</div>

          <div className="mt-1 font-semibold">{countries?.name || "-"}</div>

          <div className="mt-1 text-xs text-muted-foreground">
            ID: #{countries?.id || "-"}
          </div>

          {/* ISO CODES */}

          {(countries?.iso2 || countries?.iso3) && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {countries?.iso2 && (
                <span className="rounded-md border bg-background px-2 py-1 text-xs font-medium">
                  ISO2: {countries.iso2}
                </span>
              )}

              {countries?.iso3 && (
                <span className="rounded-md border bg-background px-2 py-1 text-xs font-medium">
                  ISO3: {countries.iso3}
                </span>
              )}
            </div>
          )}

          {/* PHONE CODE */}

          {countries?.phoneCode && (
            <div className="mt-3 text-xs text-muted-foreground">
              Phone Code: {countries.phoneCode}
            </div>
          )}

          {/* CURRENCY */}

          {(countries?.currencyCode || countries?.currencyName) && (
            <div className="mt-2 text-xs text-muted-foreground">
              Currency: {countries?.currencyCode || "-"}
              {countries?.currencyName ? ` - ${countries.currencyName}` : ""}
            </div>
          )}

          {/* ACTIVE STATUS */}

          {countries?.isActive !== undefined &&
            countries?.isActive !== null && (
              <div className="mt-2 text-xs text-muted-foreground">
                Status:{" "}
                <span className="font-medium">
                  {countries.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            )}
        </div>

        {/* =============================================
            WARNING
        ============================================= */}

        <p className="text-sm text-destructive">
          This action cannot be undone.
        </p>

        {/* =============================================
            FOOTER
        ============================================= */}

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete Country"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CountryDeleteDialog;
