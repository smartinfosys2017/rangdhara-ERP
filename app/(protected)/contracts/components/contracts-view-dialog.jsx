"use client";

import { useEffect, useState } from "react";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { toast } from "sonner";

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
// HELPERS
// =======================================================

function getValue(contract, ...keys) {
  for (const key of keys) {
    if (
      contract?.[key] !== undefined &&
      contract?.[key] !== null &&
      contract?.[key] !== ""
    ) {
      return contract[key];
    }
  }

  return "";
}

function formatValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  const amount = Number(value);

  if (Number.isNaN(amount)) {
    return value;
  }

  return `$${amount.toFixed(2)}`;
}

function formatBoolean(value) {
  return value === true || value === 1 || value === "1" || value === "true";
}

// =======================================================
// INFO FIELD
// =======================================================

function InfoField({ label, value, className = "" }) {
  return (
    <div className={className}>
      <div className="mb-1 text-sm font-medium text-muted-foreground">
        {label}
      </div>

      <div className="min-h-10 rounded-md border bg-muted/20 px-3 py-2 text-sm">
        {formatValue(value)}
      </div>
    </div>
  );
}

// =======================================================
// COMPONENT
// =======================================================

const ContractViewDialog = ({ open, closeDialog, Contract }) => {
  const [contract, setContract] = useState(null);

  // =====================================================
  // LOAD CONTRACT
  // =====================================================

  useEffect(() => {
    if (Contract) {
      setContract(Contract);
    } else {
      setContract(null);
    }
  }, [Contract]);

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    closeDialog?.();
  };

  // =====================================================
  // INVALID CONTRACT
  // =====================================================

  useEffect(() => {
    if (open && !Contract) {
      showErrorToast("Invalid Contract.");
    }
  }, [open, Contract]);

  // =====================================================
  // VALUES
  // =====================================================

  const customer = getValue(contract, "customer", "customer_name");

  const project = getValue(contract, "project", "project_name");

  const subject = getValue(contract, "subject", "name");

  const contractValue = getValue(
    contract,
    "contract_value",
    "contractValue",
    "value",
  );

  const contractType = getValue(
    contract,
    "contract_type_name",
    "contract_type",
    "contractType",
  );

  const startDate = getValue(contract, "datestart", "startDate", "start_date");

  const endDate = getValue(contract, "dateend", "endDate", "end_date");

  const description = getValue(contract, "description");

  const trash = formatBoolean(getValue(contract, "trash"));

  const notVisibleToClient = formatBoolean(
    getValue(contract, "not_visible_to_client", "notVisibleToClient"),
  );

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
      <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto">
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <DialogHeader>
          <DialogTitle>View Contract</DialogTitle>

          <DialogDescription>
            View contract information and details.
          </DialogDescription>
        </DialogHeader>

        {contract && (
          <div className="space-y-6">
            {/* ================================================= */}
            {/* STATUS */}
            {/* ================================================= */}

            <div className="flex flex-wrap gap-3">
              <div
                className={`inline-flex items-center rounded-md border px-3 py-2 text-sm ${
                  trash
                    ? "border-destructive/30 bg-destructive/10 text-destructive"
                    : "bg-muted/20"
                }`}
              >
                <span className="font-medium">Trash:</span>

                <span className="ms-2">{trash ? "Yes" : "No"}</span>
              </div>

              <div
                className={`inline-flex items-center rounded-md border px-3 py-2 text-sm ${
                  notVisibleToClient
                    ? "border-warning/30 bg-warning/10"
                    : "bg-muted/20"
                }`}
              >
                <span className="font-medium">Hide from customer:</span>

                <span className="ms-2">
                  {notVisibleToClient ? "Yes" : "No"}
                </span>
              </div>
            </div>

            {/* ================================================= */}
            {/* CUSTOMER / PROJECT */}
            {/* ================================================= */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField label="Customer" value={customer} />

              <InfoField label="Project" value={project} />
            </div>

            {/* ================================================= */}
            {/* SUBJECT */}
            {/* ================================================= */}

            <InfoField label="Subject" value={subject} />

            {/* ================================================= */}
            {/* VALUE / TYPE */}
            {/* ================================================= */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField
                label="Contract Value"
                value={formatCurrency(contractValue)}
              />

              <InfoField label="Contract Type" value={contractType} />
            </div>

            {/* ================================================= */}
            {/* DATES */}
            {/* ================================================= */}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField label="Start Date" value={formatDate(startDate)} />

              <InfoField label="End Date" value={formatDate(endDate)} />
            </div>

            {/* ================================================= */}
            {/* DESCRIPTION */}
            {/* ================================================= */}

            <div>
              <div className="mb-1 text-sm font-medium text-muted-foreground">
                Description
              </div>

              <div className="min-h-[140px] whitespace-pre-wrap rounded-md border bg-muted/20 px-3 py-3 text-sm">
                {description ? description : "-"}
              </div>
            </div>

            {/* ================================================= */}
            {/* CONTRACT ID */}
            {/* ================================================= */}

            {contract?.id && (
              <InfoField label="Contract ID" value={contract.id} />
            )}
          </div>
        )}

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractViewDialog;