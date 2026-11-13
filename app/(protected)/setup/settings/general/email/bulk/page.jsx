"use client";

import { useState } from "react";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { toast } from "sonner";
import { LoaderCircleIcon, Paperclip, Send, X } from "lucide-react";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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

export default function BulkEmailPage() {
    const [bulkRecipients, setBulkRecipients] = useState("");

    const [bulkSubject, setBulkSubject] = useState("");

    const [bulkMessage, setBulkMessage] = useState("");

    const [sendingBulk, setSendingBulk] = useState(false);
    const [bulkAttachments, setBulkAttachments] = useState([]);
    const handleBulkEmail = async () => {
        const recipients = bulkRecipients
            .split(",")
            .map((email) => email.trim())
            .filter(Boolean);

        if (recipients.length === 0) {
            showErrorToast("Please enter at least one recipient email address.");
            return;
        }

        if (!bulkSubject.trim()) {
            showErrorToast("Please enter an email subject.");
            return;
        }

        if (!bulkMessage.trim()) {
            showErrorToast("Please enter an email message.");
            return;
        }

        try {
            setSendingBulk(true);

            const formData = new FormData();

            formData.append("action", "bulk-email");
            formData.append("recipients", JSON.stringify(recipients));
            formData.append("subject", bulkSubject);
            formData.append("message", bulkMessage);

            bulkAttachments.forEach((file) => {
                formData.append("attachments", file);
            });

            const response = await fetch(
                "/api/settings/general/email",
                {
                    method: "POST",
                    body: formData,
                },
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to send bulk email.",
                );
            }

            showSuccessToast(
                result.message ||
                `Bulk email sent successfully to ${result.sent || recipients.length
                } recipient(s).`,
            );

            setBulkRecipients("");
            setBulkSubject("");
            setBulkMessage("");
            setBulkAttachments([]);
        } catch (error) {
            console.error("Bulk email error:", error);

            showErrorToast(
                error.message || "Failed to send bulk email.",
            );
        } finally {
            setSendingBulk(false);
        }
    };

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
                            className="px-3 py-2 text-sm text-muted-foreground"
                        >
                            Email Queue
                        </Link>

                        <Link
                            href="/setup/settings/general/email/bulk"
                            className="px-3 py-2 text-sm font-medium border-b-2 border-primary"
                        >
                            Bulk Email
                        </Link>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="py-12">
                <div className="grid gap-5 lg:max-w-[1024px] mx-auto">
                    <div>
                        <h3 className="text-base font-semibold">Send Bulk Email</h3>

                        <p className="text-sm text-muted-foreground mt-1">
                            Send an email to multiple recipients at once.
                        </p>
                    </div>

                    <div className="flex items-start flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56 pt-2.5">Recipients</Label>

                        <div className="grow">
                            <Textarea
                                value={bulkRecipients}
                                onChange={(e) => setBulkRecipients(e.target.value)}
                                placeholder="john@example.com, sarah@example.com, mike@example.com"
                                rows={4}
                            />

                            <p className="text-xs text-muted-foreground mt-2">
                                Enter multiple email addresses separated by commas.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56">Subject</Label>

                        <div className="grow">
                            <Input
                                value={bulkSubject}
                                onChange={(e) => setBulkSubject(e.target.value)}
                                placeholder="Enter email subject"
                            />
                        </div>
                    </div>

                    <div className="flex items-start flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56 pt-2.5">Message</Label>

                        <div className="grow">
                            <Textarea
                                value={bulkMessage}
                                onChange={(e) => setBulkMessage(e.target.value)}
                                placeholder="Write your email message..."
                                rows={10}
                            />
                        </div>
                    </div>
                    <div className="flex items-start flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56 pt-2.5">
                            Attachments
                        </Label>

                        <div className="grow">
                            <Input
                                type="file"
                                multiple
                                onChange={(e) => {
                                    const files = Array.from(e.target.files || []);

                                    setBulkAttachments((current) => [
                                        ...current,
                                        ...files,
                                    ]);

                                    e.target.value = "";
                                }}
                            />

                            <p className="text-xs text-muted-foreground mt-2">
                                Select one or more files to attach to the email.
                            </p>

                            {bulkAttachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {bulkAttachments.map((file, index) => (
                                        <div
                                            key={`${file.name}-${index}`}
                                            className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <Paperclip className="size-4 shrink-0 text-muted-foreground" />

                                                <span className="text-sm truncate">
                                                    {file.name}
                                                </span>

                                                <span className="text-xs text-muted-foreground shrink-0">
                                                    ({(file.size / 1024).toFixed(1)} KB)
                                                </span>
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setBulkAttachments((current) =>
                                                        current.filter(
                                                            (_, fileIndex) =>
                                                                fileIndex !== index,
                                                        ),
                                                    );
                                                }}
                                            >
                                                <X className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    {(bulkRecipients || bulkSubject || bulkMessage) && (
                        <div className="rounded-md border bg-muted/20 p-4">
                            <h4 className="font-medium mb-3">Email Preview</h4>

                            <div className="grid gap-2 text-sm">
                                <div>
                                    <span className="font-medium">To:</span>{" "}
                                    {bulkRecipients || "-"}
                                </div>

                                <div>
                                    <span className="font-medium">Subject:</span>{" "}
                                    {bulkSubject || "-"}
                                </div>

                                <div className="pt-2 border-t mt-2 whitespace-pre-wrap">
                                    {bulkMessage || "-"}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end mt-2.5">
                        <Button
                            type="button"
                            onClick={handleBulkEmail}
                            disabled={sendingBulk}
                        >
                            {sendingBulk ? (
                                <>
                                    <LoaderCircleIcon className="size-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="size-4 mr-2" />
                                    Send Bulk Email
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
