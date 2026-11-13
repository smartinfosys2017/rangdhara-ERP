"use client";

import { toast } from "sonner";

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from "@remixicon/react";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";

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

export default function CustomerExportActions() {
  // =====================================================
  // EXPORT
  // =====================================================

  function handleExport() {
    try {
      window.location.href =
        "/api/customer-export/export";

      showSuccessToast(
        "Customer export started successfully.",
      );
    } catch (error) {
      console.error(
        "CUSTOMER EXPORT ERROR:",
        error,
      );

      showErrorToast(
        "Failed to export customers.",
      );
    }
  }

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Button
      type="button"
      variant="primary"
      onClick={handleExport}
    >
      <i className="ki-duotone ki-file-down fs-2 me-2">
        <span className="path1"></span>
        <span className="path2"></span>
      </i>

      Export Customers
    </Button>
  );
}