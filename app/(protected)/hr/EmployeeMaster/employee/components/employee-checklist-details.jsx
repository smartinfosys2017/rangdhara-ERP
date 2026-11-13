
"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Save, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function EmployeeChecklistDetails({
    employeeId,
    onPrevious,
    onSuccess,
    closeDialog,
    readOnly = false,
}) {
    const [checklistItems, setChecklistItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const getResponseData = (response) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.data?.items)) return response.data.items;
        if (Array.isArray(response?.items)) return response.items;

        return [];
    };

    const loadChecklist = useCallback(async () => {
        try {
            setLoading(true);

            // 1. Fetch master checklist
            let checklistResponse = await apiFetch(
                "/api/hr/Checklist?status=true"
            );

            // Handle native Fetch Response if returned
            if (checklistResponse instanceof Response) {
                checklistResponse = await checklistResponse.json();
            }

            console.log("Raw Master API Response:", checklistResponse);

            // Handle direct and nested response formats
            const masterItems = Array.isArray(checklistResponse?.data)
                ? checklistResponse.data
                : Array.isArray(checklistResponse?.data?.data)
                    ? checklistResponse.data.data
                    : Array.isArray(checklistResponse?.items)
                        ? checklistResponse.items
                        : [];

            // 2. Fetch employee checklist details
            let detailResponse = { data: [] };

            if (employeeId) {
                detailResponse = await apiFetch(
                    `/api/employee/checklist-detail?employeeId=${encodeURIComponent(employeeId)}`
                );

                if (detailResponse instanceof Response) {
                    detailResponse = await detailResponse.json();
                }
            }

            console.log("Raw Employee API Response:", detailResponse);

            const savedDetails = Array.isArray(detailResponse?.data)
                ? detailResponse.data
                : Array.isArray(detailResponse?.data?.data)
                    ? detailResponse.data.data
                    : [];

            // 3. Map saved employee details
            const savedDetailsMap = new Map(
                savedDetails.map((detail) => [
                    detail.checklistId,
                    detail,
                ])
            );

            // 4. Create final list using master checklist
            const finalChecklistItems = masterItems.map((item) => {
                const savedDetail = savedDetailsMap.get(item.id);

                return {
                    checklistId: item.id,
                    itemName: item.itemName,
                    description: item.description || "",
                    status: savedDetail?.status || "PENDING",
                    comment: savedDetail?.comment || "",
                };
            });

            // 5. Update UI
            setChecklistItems(finalChecklistItems);

            console.log("Master Checklist:", masterItems);
            console.log("Employee Checklist:", savedDetails);
            console.log("Final Checklist:", finalChecklistItems);

        } catch (error) {
            console.error("Error loading employee checklist:", error);
            toast.error(error.message || "Failed to load checklist items.");
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => {
        loadChecklist();
    }, [loadChecklist]);

    const updateChecklistItem = (checklistId, field, value) => {
        setChecklistItems((previous) =>
            previous.map((item) =>
                item.checklistId === checklistId
                    ? { ...item, [field]: value }
                    : item
            )
        );
    };

    const handleSave = async () => {
        if (!employeeId) {
            toast.error("Employee ID is required.");
            return;
        }

        try {
            setSaving(true);

            const payload = {
                employeeId,
                checklistDetails: checklistItems.map((item) => ({
                    checklistId: item.checklistId,
                    status: item.status,
                    comment: item.comment.trim(),
                })),
            };

            const response = await apiFetch(
                "/api/employee/checklist-detail",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (response?.success === false) {
                throw new Error(
                    response.message || "Failed to save checklist."
                );
            }

            toast.success("Employee checklist saved successfully.");

            onSuccess?.(response?.data || checklistItems);
        } catch (error) {
            console.error("Error saving employee checklist:", error);
            toast.error(
                error.message || "Failed to save employee checklist."
            );
        } finally {
            setSaving(false);
        }
    };

    const checkedCount = checklistItems.filter(
        (item) => item.status === "CHECKED"
    ).length;

    const pendingCount = checklistItems.length - checkedCount;

    if (loading) {
        return (
            <div className="flex min-h-[200px] items-center justify-center">
                <LoaderCircle className="h-6 w-6 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6" id="employee_checklist_details">
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardCheck className="h-5 w-5" />
                                Employee Checklist
                            </CardTitle>

                            <CardDescription className="mt-1">
                                Review checklist items and update their
                                completion status.
                            </CardDescription>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">
                                Total: {checklistItems.length}
                            </Badge>

                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                Checked: {checkedCount}
                            </Badge>

                            <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
                                Pending: {pendingCount}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    {checklistItems.length === 0 ? (
                        <div className="rounded-md border border-dashed p-8 text-center">
                            <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />

                            <p className="font-medium">
                                No checklist items found
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Add active checklist items in the Checklist
                                Master to display them here.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-muted/50">
                                    <tr className="border-b">
                                        <th className="px-4 py-3 text-left font-semibold">
                                            #
                                        </th>

                                        <th className="px-4 py-3 text-left font-semibold">
                                            Item Name
                                        </th>

                                        <th className="px-4 py-3 text-left font-semibold">
                                            Status
                                        </th>

                                        <th className="px-4 py-3 text-left font-semibold">
                                            Comment
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {checklistItems.map((item, index) => (
                                        <tr
                                            key={item.checklistId}
                                            className="border-b last:border-0"
                                        >
                                            <td className="px-4 py-3">
                                                {index + 1}
                                            </td>

                                            <td className="px-4 py-3">
                                                <div className="font-medium">
                                                    {item.itemName}
                                                </div>

                                                {item.description && (
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {item.description}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="min-w-[180px] px-4 py-3">
                                                <Select
                                                    value={item.status}
                                                    onValueChange={(value) =>
                                                        updateChecklistItem(
                                                            item.checklistId,
                                                            "status",
                                                            value
                                                        )
                                                    }
                                                    disabled={readOnly}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        <SelectItem value="PENDING">
                                                            Pending
                                                        </SelectItem>

                                                        <SelectItem value="CHECKED">
                                                            Checked
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </td>

                                            <td className="min-w-[220px] px-4 py-3">
                                                <Textarea
                                                    value={item.comment}
                                                    onChange={(event) =>
                                                        updateChecklistItem(
                                                            item.checklistId,
                                                            "comment",
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Enter comment..."
                                                    rows={2}
                                                    disabled={readOnly}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex flex-wrap justify-between gap-2">
                <div>
                    {onPrevious && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onPrevious}
                            disabled={saving}
                        >
                            Previous
                        </Button>
                    )}
                </div>

                <div className="flex gap-2">
                    {closeDialog && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={closeDialog}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                    )}

                    {!readOnly && (
                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || checklistItems.length === 0}
                        >
                            {saving ? (
                                <>
                                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Checklist
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}