"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { Checkbox } from "@/components/ui/checkbox";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function SubscriptionEditDialog({
    open,
    closeDialog,
    subscription,
    onSuccess,
}) {
    const [form, setForm] = useState({});
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (subscription) {
            setForm({
                id: subscription.id,
                billingPlan: subscription.billingPlan || "",
                quantity: subscription.quantity || 1,
                firstBillingDate: subscription.firstBillingDate || "",
                subscriptionName: subscription.subscriptionName || "",

                description: subscription.description || "",

                includeDescription: subscription.includeDescription || false,

                customer: subscription.customer || "",

                project: subscription.project || "",

                currency: subscription.currency || "USD",

                tax1: subscription.tax1 || "",

                tax2: subscription.tax2 || "",

                terms: subscription.terms || "",

                status: subscription.status || "Active",
            });
        }
    }, [subscription]);

    const handleChange = (field, value) => {
        setForm((prev) => ({
            ...prev,

            [field]: value,
        }));

        setErrors((prev) => ({
            ...prev,

            [field]: "",
        }));
    };

    const validate = () => {
        let error = {};

        if (!form.billingPlan) {
            error.billingPlan = "Billing plan is required";
        }

        if (!form.subscriptionName) {
            error.subscriptionName = "Subscription name is required";
        }

        if (!form.customer) {
            error.customer = "Customer is required";
        }

        setErrors(error);

        return Object.keys(error).length === 0;
    };

    const handleSave = () => {
        if (!validate()) {
            toast.error("Please fill required fields");

            return;
        }

        toast.success("Subscription updated successfully");

        onSuccess?.(form);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) {
                    closeDialog();
                }
            }}
        >
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Subscription</DialogTitle>

                    <DialogDescription>
                        Update subscription details.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* BILLING PLAN */}

                    <div>
                        <label className="text-sm font-medium">
                            Billing Plan *
                        </label>

                        <Select
                            value={form.billingPlan}
                            onValueChange={(v) =>
                                handleChange("billingPlan", v)
                            }
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select plan" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="monthly">
                                    Monthly Plan
                                </SelectItem>

                                <SelectItem value="yearly">
                                    Yearly Plan
                                </SelectItem>
                            </SelectContent>
                        </Select>

                        {errors.billingPlan && (
                            <p className="text-xs text-destructive">
                                {errors.billingPlan}
                            </p>
                        )}
                    </div>

                    {/* QUANTITY */}

                    <div>
                        <label className="text-sm font-medium">
                            Quantity *
                        </label>

                        <Input
                            type="number"
                            value={form.quantity || ""}
                            onChange={(e) =>
                                handleChange("quantity", e.target.value)
                            }
                        />
                    </div>

                    {/* FIRST BILLING DATE */}

                    <div>
                        <label className="text-sm font-medium">
                            First Billing Date
                        </label>

                        <Input
                            type="date"
                            value={form.firstBillingDate || ""}
                            onChange={(e) =>
                                handleChange("firstBillingDate", e.target.value)
                            }
                        />
                    </div>

                    {/* NAME */}

                    <div>
                        <label className="text-sm font-medium">
                            Subscription Name *
                        </label>

                        <Input
                            value={form.subscriptionName || ""}
                            onChange={(e) =>
                                handleChange("subscriptionName", e.target.value)
                            }
                        />

                        {errors.subscriptionName && (
                            <p className="text-xs text-destructive">
                                {errors.subscriptionName}
                            </p>
                        )}
                    </div>

                    {/* DESCRIPTION */}

                    <div>
                        <label className="text-sm font-medium">
                            Description
                        </label>

                        <Textarea
                            rows={4}
                            value={form.description || ""}
                            onChange={(e) =>
                                handleChange("description", e.target.value)
                            }
                        />
                    </div>

                    {/* INCLUDE DESCRIPTION */}

                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={form.includeDescription}
                            onCheckedChange={(v) =>
                                handleChange("includeDescription", v)
                            }
                        />

                        <label className="text-sm">
                            Include description in invoice item
                        </label>
                    </div>

                    {/* CUSTOMER */}

                    <div>
                        <label className="text-sm font-medium">
                            Customer *
                        </label>

                        <Input
                            value={form.customer || ""}
                            onChange={(e) =>
                                handleChange("customer", e.target.value)
                            }
                        />

                        {errors.customer && (
                            <p className="text-xs text-destructive">
                                {errors.customer}
                            </p>
                        )}
                    </div>

                    {/* PROJECT */}

                    <div>
                        <label className="text-sm font-medium">Project</label>

                        <Input
                            value={form.project || ""}
                            onChange={(e) =>
                                handleChange("project", e.target.value)
                            }
                        />
                    </div>

                    {/* STATUS */}

                    <div>
                        <label className="text-sm font-medium">Status</label>

                        <Select
                            value={form.status}
                            onValueChange={(v) => handleChange("status", v)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>

                                <SelectItem value="Pending">Pending</SelectItem>

                                <SelectItem value="Cancelled">
                                    Cancelled
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* CURRENCY */}

                    <div>
                        <label className="text-sm font-medium">
                            Currency *
                        </label>

                        <Select
                            value={form.currency}
                            onValueChange={(v) => handleChange("currency", v)}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="USD">USD $</SelectItem>

                                <SelectItem value="EUR">EUR €</SelectItem>

                                <SelectItem value="INR">INR ₹</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* TAX */}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">Tax 1</label>

                            <Input
                                value={form.tax1 || ""}
                                onChange={(e) =>
                                    handleChange("tax1", e.target.value)
                                }
                            />
                        </div>

                        <div>
                            <label className="text-sm font-medium">Tax 2</label>

                            <Input
                                value={form.tax2 || ""}
                                onChange={(e) =>
                                    handleChange("tax2", e.target.value)
                                }
                            />
                        </div>
                    </div>

                    {/* TERMS */}

                    <div>
                        <label className="text-sm font-medium">
                            Terms & Conditions
                        </label>

                        <Textarea
                            rows={4}
                            value={form.terms || ""}
                            onChange={(e) =>
                                handleChange("terms", e.target.value)
                            }
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={closeDialog}>
                        {" "}
                        Cancel{" "}
                    </Button>
                    <Button onClick={handleSave}>Update</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
