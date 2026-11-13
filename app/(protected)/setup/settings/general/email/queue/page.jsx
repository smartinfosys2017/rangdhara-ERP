"use client";

import { useEffect, useMemo, useState } from "react";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { toast } from "sonner";
import { LoaderCircleIcon, Search, Send, Trash2 } from "lucide-react";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import Link from "next/link";

const showSuccessToast = (message) => {
    toast.custom(
        () => (
            <Alert variant="mono" icon="success">
                <AlertIcon>
                    <RiCheckboxCircleFill />
                </AlertIcon>

                <AlertTitle>{message}</AlertTitle>
            </Alert>
        ),
        {
            position: "top-center",
        },
    );
};

const showErrorToast = (message) => {
    toast.custom(
        (t) => (
            <Alert
                variant="mono"
                icon="destructive"
                close={true}
                onClose={() => toast.dismiss(t)}
            >
                <AlertIcon>
                    <RiErrorWarningFill />
                </AlertIcon>

                <AlertTitle>{message}</AlertTitle>
            </Alert>
        ),
        {
            position: "top-center",
        },
    );
};

export default function EmailQueuePage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sending, setSending] = useState(false);

    const [emailQueue, setEmailQueue] = useState([]);
    const [selectedQueueEmails, setSelectedQueueEmails] = useState([]);

    const [queueSearch, setQueueSearch] = useState("");
    const [queueStatus, setQueueStatus] = useState("all");

    const [enableEmailQueue, setEnableEmailQueue] = useState(false);

    const [excludeAttachments, setExcludeAttachments] = useState(false);
    const [deleting, setDeleting] = useState(false);
    useEffect(() => {
        loadQueue();
    }, []);

    const loadQueue = async () => {
        try {
            setLoading(true);

            const response = await fetch("/api/settings/general/email", {
                method: "GET",
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to load email queue.");
            }

            setEmailQueue(Array.isArray(result.queue) ? result.queue : []);

            const data = result.data || {};

            setEnableEmailQueue(
                data.enable_email_queue === "1" ||
                data.enable_email_queue === 1 ||
                data.enable_email_queue === true,
            );

            setExcludeAttachments(
                data.exclude_attachments === "1" ||
                data.exclude_attachments === 1 ||
                data.exclude_attachments === true,
            );
        } catch (error) {
            console.error("Load email queue error:", error);

            showErrorToast(error.message || "Failed to load email queue.");
        } finally {
            setLoading(false);
        }
    };

    const filteredQueue = useMemo(() => {
        const search = queueSearch.trim().toLowerCase();

        return emailQueue.filter((item) => {
            const matchesSearch =
                !search ||
                String(item.subject || "")
                    .toLowerCase()
                    .includes(search) ||
                String(item.to || "")
                    .toLowerCase()
                    .includes(search);

            const matchesStatus =
                queueStatus === "all" || item.status === queueStatus;

            return matchesSearch && matchesStatus;
        });
    }, [emailQueue, queueSearch, queueStatus]);

    const toggleQueueEmail = (id) => {
        setSelectedQueueEmails((current) => {
            if (current.includes(id)) {
                return current.filter((itemId) => itemId !== id);
            }

            return [...current, id];
        });
    };

    const toggleSelectAll = () => {
        const visibleIds = filteredQueue.map((item) => item.id);

        const allSelected =
            visibleIds.length > 0 &&
            visibleIds.every((id) => selectedQueueEmails.includes(id));

        if (allSelected) {
            setSelectedQueueEmails((current) =>
                current.filter((id) => !visibleIds.includes(id)),
            );
        } else {
            setSelectedQueueEmails((current) => [
                ...new Set([...current, ...visibleIds]),
            ]);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            const response = await fetch("/api/settings/general/email", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    enableEmailQueue,
                    excludeAttachments,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to save queue settings.");
            }

            showSuccessToast("Email queue settings saved successfully.");
        } catch (error) {
            console.error("Save queue settings error:", error);

            showErrorToast(error.message || "Failed to save queue settings.");
        } finally {
            setSaving(false);
        }
    };

    /*
     * NOTE:
     * These two operations should eventually call
     * dedicated queue API endpoints.
     *
     * Do not only change the UI status because
     * EmailQueue is the actual database history.
     */

    const handleSendSelected = async () => {
        if (selectedQueueEmails.length === 0) {
            showErrorToast("Please select at least one queued email.");
            return;
        }

        try {
            setSending(true);

            const response = await fetch(
                "/api/settings/general/email",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action: "send-queue",
                        queueIds: selectedQueueEmails,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to send queued emails."
                );
            }

            showSuccessToast(
                result.message || "Queued emails sent successfully."
            );

            setSelectedQueueEmails([]);

            await loadQueue();
        } catch (error) {
            console.error("Queue Send Error:", error);

            showErrorToast(
                error.message || "Failed to send queued emails."
            );
        } finally {
            setSending(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedQueueEmails.length === 0) {
            showErrorToast("Please select at least one email.");
            return;
        }

        try {
            setDeleting(true);

            const response = await fetch(
                "/api/settings/general/email",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action: "delete-queue",
                        queueIds: selectedQueueEmails,
                    }),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Failed to delete queued emails."
                );
            }

            showSuccessToast(
                result.message ||
                "Queued emails deleted successfully."
            );

            setSelectedQueueEmails([]);

            await loadQueue();
        } catch (error) {
            console.error(
                "Queue Delete Error:",
                error
            );

            showErrorToast(
                error.message ||
                "Failed to delete queued emails."
            );
        } finally {
            setDeleting(false);
        }
    };

    const allVisibleSelected =
        filteredQueue.length > 0 &&
        filteredQueue.every((item) => selectedQueueEmails.includes(item.id));

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-10">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircleIcon className="size-4 animate-spin" />
                        Loading email queue...
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="px-5 py-4 border-b border-border">
                <div className="flex flex-col">
                    {/* Heading */}
                    <CardTitle className="text-base font-semibold mb-4">
                        Email Settings
                    </CardTitle>

                    {/* Tabs */}
                    <div className="flex items-center gap-1">
                        <Link
                            href="/setup/settings/general/email/smtp"
                            className="px-3 py-2 text-sm text-muted-foreground"
                        >
                            SMTP Settings
                        </Link>

                        <Link
                            href="/setup/settings/general/email/queue"
                            className="px-3 py-2 text-sm font-medium border-b-2 border-primary"
                        >
                            Email Queue
                        </Link>

                        <Link
                            href="/setup/settings/general/email/bulk"
                            className="px-3 py-2 text-sm text-muted-foreground"
                        >
                            Bulk Email
                        </Link>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="py-12">
                <div className="space-y-6 lg:max-w-[1024px] mx-auto">
                    <div className="grid gap-5">
                        <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                            <Label className="flex w-full max-w-56">Enable Email Queue</Label>

                            <div className="grow flex items-center justify-between gap-4">
                                <span className="text-sm text-muted-foreground">
                                    Store outgoing emails in the queue before sending them.
                                </span>

                                <Switch
                                    size="sm"
                                    checked={enableEmailQueue}
                                    onCheckedChange={setEnableEmailQueue}
                                />
                            </div>
                        </div>

                        <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                            <Label className="flex w-full max-w-56">
                                Do not add emails with attachments in the queue?
                            </Label>

                            <div className="grow flex items-center justify-between gap-4">
                                <span className="text-sm text-muted-foreground">
                                    Emails containing attachments will be sent immediately.
                                </span>

                                <Switch
                                    size="sm"
                                    checked={excludeAttachments}
                                    onCheckedChange={setExcludeAttachments}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        <div>
                            <h3 className="text-base font-semibold">Email Queue</h3>

                            <p className="text-sm text-muted-foreground">
                                Manage pending and outgoing emails.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" disabled={selectedQueueEmails.length === 0 || sending} onClick={handleSendSelected} >
                                {sending ? (
                                    <>
                                        <LoaderCircleIcon className="size-4 mr-2 animate-spin" /> Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="size-4 mr-2" /> Send Selected
                                    </>
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="destructive"
                                onClick={handleDeleteSelected}
                                disabled={
                                    deleting ||
                                    selectedQueueEmails.length === 0
                                }
                            >
                                {deleting
                                    ? "Deleting..."
                                    : "Delete Selected"}
                            </Button>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative grow">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />

                            <Input
                                value={queueSearch}
                                onChange={(e) => setQueueSearch(e.target.value)}
                                placeholder="Search subject or recipient..."
                                className="pl-9"
                            />
                        </div>

                        <Select value={queueStatus} onValueChange={setQueueStatus}>
                            <SelectTrigger className="w-full md:w-44">
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>

                                <SelectItem value="pending">Pending</SelectItem>

                                <SelectItem value="sending">Sending</SelectItem>

                                <SelectItem value="sent">Sent</SelectItem>

                                <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border rounded-md overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40">
                                        <th className="w-12 p-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={allVisibleSelected}
                                                onChange={toggleSelectAll}
                                                className="size-4"
                                            />
                                        </th>

                                        <th className="text-left p-3">Subject</th>

                                        <th className="text-left p-3">To</th>

                                        <th className="text-left p-3">Date</th>

                                        <th className="text-left p-3">Status</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredQueue.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="p-8 text-center text-muted-foreground"
                                            >
                                                No emails found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredQueue.map((item) => {
                                            const selected = selectedQueueEmails.includes(item.id);

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={`border-b last:border-0 ${selected ? "bg-muted/30" : ""
                                                        }`}
                                                >
                                                    <td className="p-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selected}
                                                            onChange={() => toggleQueueEmail(item.id)}
                                                            className="size-4"
                                                        />
                                                    </td>

                                                    <td className="p-3 font-medium">
                                                        {item.subject || "-"}
                                                    </td>

                                                    <td className="p-3">{item.to || "-"}</td>

                                                    <td className="p-3 text-muted-foreground">
                                                        {item.createdAt
                                                            ? new Date(item.createdAt).toLocaleString()
                                                            : "-"}
                                                    </td>

                                                    <td className="p-3">
                                                        <span
                                                            className={
                                                                item.status === "sent"
                                                                    ? "text-green-600"
                                                                    : item.status === "failed"
                                                                        ? "text-red-600"
                                                                        : item.status === "sending"
                                                                            ? "text-blue-600"
                                                                            : "text-yellow-600"
                                                            }
                                                        >
                                                            {(item.status || "pending")
                                                                .replace(/([a-z])([A-Z])/g, "$1 $2")
                                                                .replace(/[_-]+/g, " ")
                                                                .replace(/\b\w/g, (char) => char.toUpperCase())}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="button" onClick={handleSave} disabled={saving}>
                            {saving ? (
                                <>
                                    <LoaderCircleIcon className="size-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
