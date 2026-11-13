"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Plus, Trash2, EyeOff } from "lucide-react";
import { toast } from "sonner";

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

// -----------------------------------------------------------------------------
// STATIC DATA
// -----------------------------------------------------------------------------

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

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function getToday() {
    return new Date().toISOString().split("T")[0];
}

function formatCurrency(value) {
    const amount = Number(value || 0);

    return `$${amount.toFixed(2)}`;
}

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------

export default function ContractAddDialog({ open, closeDialog, onSuccess }) {
    // ---------------------------------------------------------------------------
    // FORM STATE
    // ---------------------------------------------------------------------------

    const [trash, setTrash] = useState(false);

    const [notVisibleToClient, setNotVisibleToClient] = useState(false);

    const [customerId, setCustomerId] = useState("");

    const [projectId, setProjectId] = useState("");

    const [subject, setSubject] = useState("");

    const [contractValue, setContractValue] = useState("");

    const [contractType, setContractType] = useState("");

    const [startDate, setStartDate] = useState(getToday());

    const [endDate, setEndDate] = useState("");

    const [description, setDescription] = useState("");

    // ---------------------------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------------------------

    const [errors, setErrors] = useState({});

    // ---------------------------------------------------------------------------
    // DERIVED DATA
    // ---------------------------------------------------------------------------

    const selectedCustomer = useMemo(() => {
        return CUSTOMERS.find((customer) => customer.id === customerId);
    }, [customerId]);

    const filteredProjects = useMemo(() => {
        if (!customerId) {
            return [];
        }

        return PROJECTS.filter((project) => project.customerId === customerId);
    }, [customerId]);

    // ---------------------------------------------------------------------------
    // CUSTOMER CHANGE
    // ---------------------------------------------------------------------------

    const handleCustomerChange = (value) => {
        setCustomerId(value);

        // Same behavior as Perfex:
        // changing customer should reset the project.
        setProjectId("");

        setErrors((prev) => ({
            ...prev,
            customerId: "",
        }));
    };

    // ---------------------------------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------------------------------

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
            toast.error("Please complete the required fields.");

            return false;
        }

        return true;
    };

    // ---------------------------------------------------------------------------
    // SAVE
    // ---------------------------------------------------------------------------

    const handleSave = () => {
        if (!validate()) {
            return;
        }

        const contractData = {
            trash,
            not_visible_to_client: notVisibleToClient,

            client: customerId,

            customer: selectedCustomer?.name || "",

            project_id: projectId,

            subject,

            contract_value: contractValue === "" ? "" : Number(contractValue),

            contract_type: contractType,

            datestart: startDate,

            dateend: endDate,

            description,
        };

        console.log("Contract Data:", contractData);

        toast.success("Contract saved successfully.");

        onSuccess?.(contractData);
    };

    // ---------------------------------------------------------------------------
    // CLOSE
    // ---------------------------------------------------------------------------

    const handleClose = () => {
        setErrors({});

        closeDialog?.();
    };

    // ---------------------------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------------------------

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
                    <DialogTitle>Create New Contract</DialogTitle>

                    <DialogDescription>
                        Add a new contract and configure its customer, value,
                        dates and description.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* ---------------------------------------------------------------- */}
                    {/* VISIBILITY */}
                    {/* ---------------------------------------------------------------- */}

                    <div className="flex flex-wrap gap-6">
                        <label className="flex cursor-pointer items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={trash}
                                onChange={(event) =>
                                    setTrash(event.target.checked)
                                }
                                className="h-4 w-4"
                            />

                            <Trash2 className="h-4 w-4 text-muted-foreground" />

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
                            />

                            <EyeOff className="h-4 w-4 text-muted-foreground" />

                            <span>Hide from customer</span>
                        </label>
                    </div>

                    {/* ---------------------------------------------------------------- */}
                    {/* CUSTOMER */}
                    {/* ---------------------------------------------------------------- */}

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            <span className="text-destructive">*</span> Customer
                        </label>

                        <Select
                            value={customerId}
                            onValueChange={handleCustomerChange}
                        >
                            <SelectTrigger
                                className={
                                    errors.customerId
                                        ? "border-destructive"
                                        : ""
                                }
                            >
                                <SelectValue placeholder="Select and begin typing" />
                            </SelectTrigger>

                            <SelectContent>
                                {CUSTOMERS.map((customer) => (
                                    <SelectItem
                                        key={customer.id}
                                        value={customer.id}
                                    >
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

                    {/* ---------------------------------------------------------------- */}
                    {/* PROJECT */}
                    {/* ---------------------------------------------------------------- */}

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Project
                        </label>

                        <Select
                            value={projectId}
                            onValueChange={setProjectId}
                            disabled={!customerId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select and begin typing" />
                            </SelectTrigger>

                            <SelectContent>
                                {filteredProjects.map((project) => (
                                    <SelectItem
                                        key={project.id}
                                        value={project.id}
                                    >
                                        {project.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ---------------------------------------------------------------- */}
                    {/* SUBJECT */}
                    {/* ---------------------------------------------------------------- */}

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            <span className="text-destructive">*</span> Subject
                        </label>

                        <Input
                            value={subject}
                            onChange={(event) => setSubject(event.target.value)}
                            placeholder="Enter contract subject"
                            className={
                                errors.subject ? "border-destructive" : ""
                            }
                        />

                        {errors.subject && (
                            <p className="mt-1 text-xs text-destructive">
                                {errors.subject}
                            </p>
                        )}
                    </div>

                    {/* ---------------------------------------------------------------- */}
                    {/* CONTRACT VALUE */}
                    {/* ---------------------------------------------------------------- */}

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
                                onChange={(event) =>
                                    setContractValue(event.target.value)
                                }
                                placeholder="0.00"
                                className="rounded-r-none"
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

                    {/* ---------------------------------------------------------------- */}
                    {/* CONTRACT TYPE */}
                    {/* ---------------------------------------------------------------- */}

                    <div>
                        <div className="flex items-end gap-2">
                            <div className="flex-1">
                                <label className="mb-2 block text-sm font-medium">
                                    Contract Type
                                </label>

                                <Select
                                    value={contractType}
                                    onValueChange={setContractType}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Nothing selected" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {CONTRACT_TYPES.map((type) => (
                                            <SelectItem
                                                key={type.id}
                                                value={type.id}
                                            >
                                                {type.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                    toast.info(
                                        "New contract type creation can be connected here.",
                                    )
                                }
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* ---------------------------------------------------------------- */}
                    {/* DATES */}
                    {/* ---------------------------------------------------------------- */}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                <span className="text-destructive">*</span>{" "}
                                Start Date
                            </label>

                            <div className="relative">
                                <Input
                                    type="date"
                                    value={startDate}
                                    onChange={(event) =>
                                        setStartDate(event.target.value)
                                    }
                                    className={
                                        errors.startDate
                                            ? "border-destructive pr-10"
                                            : "pr-10"
                                    }
                                />

                                <CalendarDays className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>

                            {errors.startDate && (
                                <p className="mt-1 text-xs text-destructive">
                                    {errors.startDate}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                End Date
                            </label>

                            <div className="relative">
                                <Input
                                    type="date"
                                    value={endDate}
                                    onChange={(event) =>
                                        setEndDate(event.target.value)
                                    }
                                    className="pr-10"
                                />

                                <CalendarDays className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            </div>
                        </div>
                    </div>

                    {/* ---------------------------------------------------------------- */}
                    {/* DESCRIPTION */}
                    {/* ---------------------------------------------------------------- */}

                    <div>
                        <label className="mb-2 block text-sm font-medium">
                            Description
                        </label>

                        <Textarea
                            rows={6}
                            value={description}
                            onChange={(event) =>
                                setDescription(event.target.value)
                            }
                            placeholder="Enter contract description..."
                        />
                    </div>

                    {/* ---------------------------------------------------------------- */}
                    {/* PREVIEW */}
                    {/* ---------------------------------------------------------------- */}

                    {contractValue !== "" && (
                        <div className="rounded-md border bg-muted/20 p-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">
                                    Contract Value
                                </span>

                                <span className="font-semibold">
                                    {formatCurrency(contractValue)}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* ------------------------------------------------------------------ */}
                {/* FOOTER */}
                {/* ------------------------------------------------------------------ */}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                    >
                        Cancel
                    </Button>

                    <Button type="button" onClick={handleSave}>
                        Save
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
