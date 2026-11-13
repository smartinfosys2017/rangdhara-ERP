"use client";

import { useRef, useState } from "react";

import { toast } from "sonner";

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from "@remixicon/react";

import { apiFetch } from "@/lib/api";

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from "@/components/ui/alert";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

// =======================================================
// CONSTANTS
// =======================================================

const MAX_FILE_SIZE = 50 * 1024 * 1024;

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
// FILE SIZE FORMAT
// =======================================================

function formatFileSize(bytes) {
  if (!bytes) {
    return "0 Bytes";
  }

  const units = [
    "Bytes",
    "KB",
    "MB",
    "GB",
  ];

  const index = Math.floor(
    Math.log(bytes) / Math.log(1024),
  );

  return `${(
    bytes / Math.pow(1024, index)
  ).toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

// =======================================================
// COMPONENT
// =======================================================

const CustomerImport = ({
  open,
  closeDialog,
  onSuccess,
}) => {
  // =====================================================
  // STATE
  // =====================================================

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef(null);

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) {
      return;
    }

    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    closeDialog();
  };

  // =====================================================
  // FILE CHANGE
  // =====================================================

  const handleFileChange = (event) => {
    const selectedFile =
      event.target.files?.[0] || null;

    // Reset previous state
    setFile(null);

    if (!selectedFile) {
      return;
    }

    // ---------------------------------------------------
    // FILE TYPE VALIDATION
    // ---------------------------------------------------

    const fileName =
      selectedFile.name.toLowerCase();

    if (!fileName.endsWith(".csv")) {
      showErrorToast(
        "Please select a valid CSV file.",
      );

      event.target.value = "";

      return;
    }

    // ---------------------------------------------------
    // FILE SIZE VALIDATION
    // ---------------------------------------------------

    if (selectedFile.size > MAX_FILE_SIZE) {
      showErrorToast(
        "CSV file size must not exceed 50 MB.",
      );

      event.target.value = "";

      return;
    }

    setFile(selectedFile);
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!file) {
      showErrorToast(
        "Please select a CSV file.",
      );

      return;
    }

    const fileName =
      file.name.toLowerCase();

    if (!fileName.endsWith(".csv")) {
      showErrorToast(
        "Please select a valid CSV file.",
      );

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showErrorToast(
        "CSV file size must not exceed 50 MB.",
      );

      return;
    }

    try {
      setLoading(true);

      // -------------------------------------------------
      // FORM DATA
      // -------------------------------------------------

      const formData = new FormData();

      formData.append(
        "file",
        file,
      );

      // -------------------------------------------------
      // API REQUEST
      // -------------------------------------------------

      const response = await apiFetch(
        "/api/customer-export/import",
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response
        .json()
        .catch(() => ({}));

      // -------------------------------------------------
      // ERROR
      // -------------------------------------------------

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            "Failed to import customers.",
        );
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      showSuccessToast(
        result?.message ||
          "Customers imported successfully.",
      );

      // -------------------------------------------------
      // RESET
      // -------------------------------------------------

      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // -------------------------------------------------
      // CALLBACK
      // -------------------------------------------------

      if (onSuccess) {
        await onSuccess(
          result?.data || result,
        );
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        "CUSTOMER IMPORT ERROR:",
        error,
      );

      showErrorToast(
        error?.message ||
          "Failed to import customers.",
      );
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
      <DialogContent className="sm:max-w-[550px]">
        {/* =================================================
            HEADER
        ================================================= */}

        <DialogHeader>
          <DialogTitle>
            Import Customers
          </DialogTitle>

          <DialogDescription>
            Upload a CSV file to import customer
            records into the system.
          </DialogDescription>
        </DialogHeader>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* ===============================================
              CSV FILE
          =============================================== */}

          <div className="space-y-2">
            <label
              htmlFor="customer-csv-file"
              className="text-sm font-medium"
            >
              Customer CSV File

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              ref={fileInputRef}
              id="customer-csv-file"
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={loading}
            />

            <p className="text-xs text-muted-foreground">
              Only CSV files are supported. Maximum
              file size is 50 MB.
            </p>
          </div>

          {/* ===============================================
              SELECTED FILE
          =============================================== */}

          {file && (
            <Alert
              variant="mono"
              icon="info"
            >
              <AlertIcon>
                <RiCheckboxCircleFill className="size-5" />
              </AlertIcon>

              <AlertTitle>
                <div className="flex flex-col gap-1">
                  <span>
                    {file.name}
                  </span>

                  <span className="text-xs text-muted-foreground font-normal">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              </AlertTitle>
            </Alert>
          )}

          {/* ===============================================
              FOOTER
          =============================================== */}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                !file ||
                loading
              }
            >
              {loading
                ? "Importing..."
                : "Import Customers"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerImport;