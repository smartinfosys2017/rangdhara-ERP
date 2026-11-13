
"use client";

import { useCallback, useEffect, useState } from "react";
import {
    LoaderCircle,
    Plus,
    Pencil,
    Trash2,
    ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

// =====================================================
// INITIAL FORM DATA
// =====================================================

const initialFormData = {
    followupDate: "",
    followupResponse: "",
    appointmentDate: "",
    appointmentResponse: "",
    interviewConductedBy: "",
    mode: "",
    status: "",
};

// =====================================================
// HELPERS
// =====================================================

const formatDate = (value) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const extractData = (result) => {
    return result?.data?.data ?? result?.data ?? null;
};

const getErrorMessage = (result, fallback) => {
    return result?.message || fallback;
};

// =====================================================
// REUSABLE FIELD
// =====================================================

function FieldRow({ label, children }) {
    return (
        <div className="grid gap-2 md:grid-cols-[220px_1fr] md:items-center">
            <Label>{label}</Label>
            <div className="min-w-0">{children}</div>
        </div>
    );
}

// =====================================================
// MAIN COMPONENT
// =====================================================

export default function CandidateFollowupDetails({
    candidateId,
    onSuccess,
    closeDialog,
    onPrevious,
    mode = "add",
}) {
    const [form, setForm] = useState({ ...initialFormData });

    const [followupList, setFollowupList] = useState([]);

    const [editingId, setEditingId] = useState(null);

    const [loading, setLoading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const isEditing = Boolean(editingId);

    // =================================================
    // FORM UPDATE
    // =================================================

    const updateField = (name, value) => {
        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    // =================================================
    // RESET FORM
    // =================================================

    const resetForm = () => {
        setForm({ ...initialFormData });
        setEditingId(null);
    };

    // =================================================
    // LOAD FOLLOW-UP DETAILS
    // =================================================

    const loadFollowupDetails = useCallback(async () => {
        if (!candidateId) return;

        try {
            setLoadingDetails(true);

            const response = await apiFetch(
                `/api/candidate/follow-up-detail?candidateId=${encodeURIComponent(candidateId)}`,
                { method: "GET" }
            );

            const result =
                typeof response?.json === "function"
                    ? await response.json()
                    : response;

            if (
                response?.ok === false ||
                result?.success === false
            ) {
                throw new Error(
                    getErrorMessage(
                        result,
                        "Unable to load follow-up details."
                    )
                );
            }

            const data = extractData(result);

            // API returns one record because candidateId is unique.
            setFollowupList(data ? [data] : []);

        } catch (error) {
            console.error("LOAD FOLLOW-UP DETAILS ERROR:", error);
            toast.error(
                error?.message || "Unable to load follow-up details."
            );
        } finally {
            setLoadingDetails(false);
        }
    }, [candidateId]);

    // =================================================
    // INITIALIZE
    // =================================================

    useEffect(() => {
        if (candidateId) {
            loadFollowupDetails();
        } else {
            setFollowupList([]);
            resetForm();
        }
    }, [candidateId, loadFollowupDetails]);

    // =================================================
    // EDIT RECORD
    // =================================================

    const handleEdit = (item) => {
        setEditingId(item.id);

        setForm({
            followupDate: formatDate(item.followupDate),
            followupResponse: item.followupResponse ?? "",
            appointmentDate: formatDate(item.appointmentDate),
            appointmentResponse: item.appointmentResponse ?? "",
            interviewConductedBy: item.interviewConductedBy ?? "",
            mode: item.mode ?? "",
            status: item.status ?? "",
        });

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    // =================================================
    // DELETE RECORD
    // =================================================

    const handleDelete = async (item) => {
        if (loading) return;

        const confirmed = window.confirm(
            "Are you sure you want to delete this follow-up detail?"
        );

        if (!confirmed) return;

        try {
            setLoading(true);

            const response = await apiFetch(
                `/api/candidate/follow-up-detail?candidateId=${encodeURIComponent(candidateId)}`,
                { method: "DELETE" }
            );

            const result =
                typeof response?.json === "function"
                    ? await response.json()
                    : response;

            if (
                response?.ok === false ||
                result?.success === false
            ) {
                throw new Error(
                    getErrorMessage(
                        result,
                        "Unable to delete follow-up details."
                    )
                );
            }

            setFollowupList((previous) =>
                previous.filter((record) => record.id !== item.id)
            );

            if (editingId === item.id) {
                resetForm();
            }

            toast.success(
                result?.message || "Follow-up details deleted successfully."
            );

            await onSuccess?.(null);

        } catch (error) {
            console.error("DELETE FOLLOW-UP ERROR:", error);
            toast.error(
                error?.message || "Unable to delete follow-up details."
            );
        } finally {
            setLoading(false);
        }
    };

    // =================================================
    // SUBMIT FORM
    // =================================================

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (loading || loadingDetails) return;

        if (!candidateId) {
            toast.error("Please save candidate basic details first.");
            return;
        }

        try {
            setLoading(true);

            const payload = {
                candidateId,
                followupDate: form.followupDate || null,
                followupResponse: form.followupResponse.trim() || null,
                appointmentDate: form.appointmentDate || null,
                appointmentResponse:
                    form.appointmentResponse.trim() || null,
                interviewConductedBy:
                    form.interviewConductedBy.trim() || null,
                mode: form.mode.trim() || null,
                status: form.status.trim() || null,
            };

            const method = isEditing ? "PUT" : "POST";

            const response = await apiFetch(
                "/api/candidate/follow-up-detail",
                {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            const result =
                typeof response?.json === "function"
                    ? await response.json()
                    : response;

            if (
                response?.ok === false ||
                result?.success === false
            ) {
                throw new Error(
                    getErrorMessage(
                        result,
                        "Unable to save follow-up details."
                    )
                );
            }

            const savedData = extractData(result);

            toast.success(
                result?.message ||
                    (isEditing
                        ? "Follow-up details updated successfully."
                        : "Follow-up details saved successfully.")
            );

            resetForm();

            await loadFollowupDetails();
            await onSuccess?.(savedData);

        } catch (error) {
            console.error("SAVE FOLLOW-UP DETAILS ERROR:", error);
            toast.error(
                error?.message || "Unable to save follow-up details."
            );
        } finally {
            setLoading(false);
        }
    };

    // =================================================
    // LOADING STATE
    // =================================================

    if (loadingDetails) {
        return (
            <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-5 animate-spin" />
                Loading follow-up details...
            </div>
        );
    }

    // =================================================
    // RENDER
    // =================================================

    return (
        <div className="flex flex-col gap-5">

            {/* FOLLOW-UP FORM */}

            <Card>
                <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <CardTitle>
                            {isEditing
                                ? "Edit Follow-up Details"
                                : "Add Follow-up Details"}
                        </CardTitle>

                        {isEditing && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={resetForm}
                            >
                                <ArrowLeft className="mr-2 size-4" />
                                Cancel Edit
                            </Button>
                        )}
                    </div>
                </CardHeader>

                <CardContent>
                    <form
                        onSubmit={handleSubmit}
                        className="flex flex-col gap-5"
                    >
                        <FieldRow label="Follow-up Date">
                            <Input
                                type="date"
                                value={form.followupDate}
                                onChange={(e) =>
                                    updateField("followupDate", e.target.value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Follow-up Response">
                            <Textarea
                                placeholder="Enter follow-up response"
                                value={form.followupResponse}
                                onChange={(e) =>
                                    updateField(
                                        "followupResponse",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Appointment Date">
                            <Input
                                type="date"
                                value={form.appointmentDate}
                                onChange={(e) =>
                                    updateField(
                                        "appointmentDate",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Appointment Response">
                            <Textarea
                                placeholder="Enter appointment response"
                                value={form.appointmentResponse}
                                onChange={(e) =>
                                    updateField(
                                        "appointmentResponse",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Interview Conducted By">
                            <Input
                                placeholder="Enter interviewer name"
                                value={form.interviewConductedBy}
                                onChange={(e) =>
                                    updateField(
                                        "interviewConductedBy",
                                        e.target.value
                                    )
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Mode">
                            <Input
                                placeholder="e.g. Online, Offline, Phone"
                                value={form.mode}
                                onChange={(e) =>
                                    updateField("mode", e.target.value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <FieldRow label="Status">
                            <Input
                                placeholder="e.g. Pending, Completed, Scheduled"
                                value={form.status}
                                onChange={(e) =>
                                    updateField("status", e.target.value)
                                }
                                disabled={loading}
                            />
                        </FieldRow>

                        <div className="flex flex-wrap justify-between gap-3 border-t pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={loading}
                                onClick={onPrevious}
                            >
                                Previous
                            </Button>

                            <div className="flex flex-wrap gap-2">
                                {closeDialog && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={loading}
                                        onClick={closeDialog}
                                    >
                                        Cancel
                                    </Button>
                                )}

                                <Button
                                    type="submit"
                                    disabled={loading || !candidateId}
                                >
                                    {loading ? (
                                        <>
                                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : isEditing ? (
                                        "Update Follow-up"
                                    ) : (
                                        "Save Follow-up"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* EXISTING FOLLOW-UP LIST - EDIT MODE ONLY */}

            {mode === "edit" && (
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-3">
                            <CardTitle>Follow-up Details List</CardTitle>

                            {followupList.length === 0 && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={resetForm}
                                >
                                    <Plus className="mr-2 size-4" />
                                    Add Follow-up
                                </Button>
                            )}
                        </div>
                    </CardHeader>

                    <CardContent>
                        {followupList.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                No follow-up details found.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[850px] text-sm">
                                    <thead>
                                        <tr className="border-b text-left">
                                            <th className="p-3">Follow-up Date</th>
                                            <th className="p-3">Follow-up Response</th>
                                            <th className="p-3">Appointment Date</th>
                                            <th className="p-3">Interviewer</th>
                                            <th className="p-3">Mode</th>
                                            <th className="p-3">Status</th>
                                            <th className="p-3 text-right">Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {followupList.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="p-3">
                                                    {formatDate(item.followupDate) || "-"}
                                                </td>

                                                <td className="max-w-48 truncate p-3">
                                                    {item.followupResponse || "-"}
                                                </td>

                                                <td className="p-3">
                                                    {formatDate(item.appointmentDate) || "-"}
                                                </td>

                                                <td className="p-3">
                                                    {item.interviewConductedBy || "-"}
                                                </td>

                                                <td className="p-3">
                                                    {item.mode || "-"}
                                                </td>

                                                <td className="p-3">
                                                    {item.status || "-"}
                                                </td>

                                                <td className="p-3">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="icon"
                                                            title="Edit"
                                                            disabled={loading}
                                                            onClick={() =>
                                                                handleEdit(item)
                                                            }
                                                        >
                                                            <Pencil className="size-4" />
                                                        </Button>

                                                        <Button
                                                            type="button"
                                                            variant="destructive"
                                                            size="icon"
                                                            title="Delete"
                                                            disabled={loading}
                                                            onClick={() =>
                                                                handleDelete(item)
                                                            }
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
