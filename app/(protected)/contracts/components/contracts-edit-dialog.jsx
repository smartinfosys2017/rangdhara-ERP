"use client";

import { useEffect, useMemo, useState } from "react";

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

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";

const CUSTOMERS = [
  {
    id: "1",
    name: "Acme Corporation",
  },
  {
    id: "2",
    name: "Globex Corporation",
  },
  {
    id: "3",
    name: "Wayne Enterprises",
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

const CONTRACT_TYPES = [
  {
    id: "2",
    name: "Smart Contract",
  },
];

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

function getContractValue(contract, ...keys) {
  for (const key of keys) {
    if (contract?.[key] !== undefined && contract?.[key] !== null) {
      return contract[key];
    }
  }

  return "";
}

const ContractEditDialog = ({ open, closeDialog, Contract, onSuccess }) => {


  const [trash, setTrash] = useState(false);

  const [notVisibleToClient, setNotVisibleToClient] = useState(false);

  const [customerId, setCustomerId] = useState("");

  const [projectId, setProjectId] = useState("");

  const [subject, setSubject] = useState("");

  const [contractValue, setContractValue] = useState("");

  const [contractType, setContractType] = useState("");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState({});

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!Contract) {
      return;
    }

    setTrash(Boolean(getContractValue(Contract, "trash")));

    setNotVisibleToClient(
      Boolean(
        getContractValue(
          Contract,
          "not_visible_to_client",
          "notVisibleToClient",
        ),
      ),
    );

    setCustomerId(
      String(
        getContractValue(Contract, "client", "customerId", "customer_id") || "",
      ),
    );

    setProjectId(
      String(
        getContractValue(Contract, "project_id", "projectId", "project") || "",
      ),
    );

    setSubject(getContractValue(Contract, "subject", "name") || "");

    setContractValue(
      getContractValue(Contract, "contract_value", "contractValue", "value"),
    );

    setContractType(
      String(getContractValue(Contract, "contract_type", "contractType") || ""),
    );

    setStartDate(
      getContractValue(Contract, "datestart", "startDate", "start_date") || "",
    );

    setEndDate(
      getContractValue(Contract, "dateend", "endDate", "end_date") || "",
    );

    setDescription(getContractValue(Contract, "description") || "");

    setErrors({});
  }, [Contract]);


  const filteredProjects = useMemo(() => {
    if (!customerId) {
      return [];
    }

    return PROJECTS.filter(
      (project) => String(project.customerId) === String(customerId),
    );
  }, [customerId]);

  const handleCustomerChange = (value) => {
    setCustomerId(value);

    // Reset project when customer changes
    setProjectId("");

    setErrors((prev) => ({
      ...prev,
      customerId: "",
    }));
  };


  const validate = () => {
    const newErrors = {};

    if (!customerId) {
      newErrors.customerId = "Customer is required.";
    }

    if (!subject.trim()) {
      newErrors.subject = "Subject is required.";
    }

    if (!startDate) {
      newErrors.startDate = "Start date is required.";
    }

    if (contractValue !== "" && Number(contractValue) < 0) {
      newErrors.contractValue = "Contract value cannot be negative.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showErrorToast("Please complete the required fields.");

      return false;
    }

    return true;
  };

  const handleClose = () => {
    if (loading) {
      return;
    }

    setErrors({});

    closeDialog();
  };


  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!Contract?.id) {
      showErrorToast("Invalid Contract.");

      return;
    }

    if (!validate()) {
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch("/api/leads/Contracts", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: Contract.id,

          trash,

          not_visible_to_client: notVisibleToClient,

          client: customerId,

          project_id: projectId,

          subject: subject.trim(),

          contract_value: contractValue === "" ? "" : Number(contractValue),

          contract_type: contractType,

          datestart: startDate,

          dateend: endDate,

          description: description.trim(),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Failed to update Contract.");
      }

      showSuccessToast(result?.message || "Contract updated successfully.");

      if (onSuccess) {
        onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error("UPDATE Contract ERROR:", error);

      showErrorToast(error?.message || "Failed to update Contract.");
    } finally {
      setLoading(false);
    }
  };

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
        <DialogHeader>
          <DialogTitle>Edit Contract</DialogTitle>

          <DialogDescription>
            Update contract information, customer, value, dates and description.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="flex flex-wrap gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={trash}
                onChange={(event) => setTrash(event.target.checked)}
                className="h-4 w-4"
                disabled={loading}
              />

              <span>Trash</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={notVisibleToClient}
                onChange={(event) =>
                  setNotVisibleToClient(event.target.checked)
                }
                className="h-4 w-4"
                disabled={loading}
              />

              <span>Hide from customer</span>
            </label>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              <span className="text-destructive">*</span> Customer
            </label>

            <Select
              value={customerId}
              onValueChange={handleCustomerChange}
              disabled={loading}
            >
              <SelectTrigger
                className={errors.customerId ? "border-destructive" : ""}
              >
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>

              <SelectContent>
                {CUSTOMERS.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {errors.customerId && (
              <p className="mt-1 text-xs text-destructive">
                {errors.customerId}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Project</label>

            <Select
              value={projectId}
              onValueChange={setProjectId}
              disabled={loading || !customerId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>

              <SelectContent>
                {filteredProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              <span className="text-destructive">*</span> Subject
            </label>

            <Input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Enter contract subject"
              disabled={loading}
              className={errors.subject ? "border-destructive" : ""}
            />

            {errors.subject && (
              <p className="mt-1 text-xs text-destructive">{errors.subject}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Contract Value
            </label>

            <div className="flex">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={contractValue}
                onChange={(event) => setContractValue(event.target.value)}
                placeholder="0.00"
                disabled={loading}
                className={
                  errors.contractValue
                    ? "rounded-r-none border-destructive"
                    : "rounded-r-none"
                }
              />

              <div className="flex h-10 items-center rounded-r-md border border-l-0 bg-muted px-4 text-sm font-medium">
                $
              </div>
            </div>

            {errors.contractValue && (
              <p className="mt-1 text-xs text-destructive">
                {errors.contractValue}
              </p>
            )}

            <p className="mt-1 text-xs text-muted-foreground">
              Base currency will be used.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Contract Type
            </label>

            <Select
              value={contractType}
              onValueChange={setContractType}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Nothing selected" />
              </SelectTrigger>

              <SelectContent>
                {CONTRACT_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* START DATE */}

            <div>
              <label className="mb-2 block text-sm font-medium">
                <span className="text-destructive">*</span> Start Date
              </label>

              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                disabled={loading}
                className={errors.startDate ? "border-destructive" : ""}
              />

              {errors.startDate && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.startDate}
                </p>
              )}
            </div>

            {/* END DATE */}

            <div>
              <label className="mb-2 block text-sm font-medium">End Date</label>

              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Description
            </label>

            <Textarea
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Enter contract description..."
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update Contract"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractEditDialog;
