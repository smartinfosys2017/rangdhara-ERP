"use client";

import { useEffect, useState } from "react";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { toast } from "sonner";
import { LoaderCircleIcon } from "lucide-react";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

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
                onClose={() => {
                    toast.dismiss(t);
                }}
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

export default function SMTPSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sendingTest, setSendingTest] = useState(false);

    const [mailEngine, setMailEngine] = useState("SMTP");
    const [emailProtocol, setEmailProtocol] = useState("smtp");
    const [emailEncryption, setEmailEncryption] = useState("tls");

    const [smtpHost, setSmtpHost] = useState("");
    const [smtpPort, setSmtpPort] = useState("587");

    const [email, setEmail] = useState("");
    const [smtpUsername, setSmtpUsername] = useState("");
    const [smtpPassword, setSmtpPassword] = useState("");

    const [emailCharset, setEmailCharset] = useState("UTF-8");

    const [bccAllEmails, setBccAllEmails] = useState("");
    const [emailSignature, setEmailSignature] = useState("");
    const [predefinedHeader, setPredefinedHeader] = useState("");
    const [predefinedFooter, setPredefinedFooter] = useState("");

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);

            const response = await fetch("/api/settings/general/email", {
                method: "GET",
                cache: "no-store",
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to load email settings.");
            }

            const data = result.data || {};

            setMailEngine(data.mail_engine || "SMTP");

            setEmailProtocol(data.email_protocol || "smtp");

            setEmailEncryption(data.email_encryption || "tls");

            setSmtpHost(data.smtp_host || "");

            setSmtpPort(String(data.smtp_port || "587"));

            setEmail(data.email || "");

            setSmtpUsername(data.smtp_username || "");

            /*
             * Do not expose the existing SMTP password
             * from the API.
             *
             * User can enter a new password here.
             */
            setSmtpPassword("");

            setEmailCharset(data.email_charset || "UTF-8");

            setBccAllEmails(data.bcc_all_emails || "");

            setEmailSignature(data.email_signature || "");

            setPredefinedHeader(data.predefined_header || "");

            setPredefinedFooter(data.predefined_footer || "");
        } catch (error) {
            console.error("Load email settings error:", error);

            showErrorToast(error.message || "Failed to load email settings.");
        } finally {
            setLoading(false);
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
                    mailEngine,
                    emailProtocol,
                    emailEncryption,
                    smtpHost,
                    smtpPort,
                    email,
                    smtpUsername,
                    smtpPassword,
                    emailCharset,
                    bccAllEmails,
                    emailSignature,
                    predefinedHeader,
                    predefinedFooter,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to save email settings.");
            }

            showSuccessToast("Email settings saved successfully.");

            await loadSettings();
        } catch (error) {
            console.error("Save email settings error:", error);

            showErrorToast(error.message || "Failed to save email settings.");
        } finally {
            setSaving(false);
        }
    };

    const handleTestEmail = async () => {
        if (!email.trim()) {
            showErrorToast("Please enter the email address first.");

            return;
        }

        try {
            setSendingTest(true);

            const response = await fetch("/api/settings/general/email", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    action: "test-email",
                    test_email: email,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to send test email.");
            }

            showSuccessToast("Test email sent successfully.");
        } catch (error) {
            console.error("Test email error:", error);

            showErrorToast(error.message || "Failed to send test email.");
        } finally {
            setSendingTest(false);
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-10">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <LoaderCircleIcon className="size-4 animate-spin" />
                        Loading email settings...
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
                            className="relative inline-flex items-center px-4 py-2.5 text-sm font-medium text-primary"
                        >
                            SMTP Settings
                            <span className="absolute bottom-0 start-0 end-0 h-0.5 bg-primary" />
                        </Link>

                        <Link
                            href="/setup/settings/general/email/queue"
                            className="relative inline-flex items-center px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                            Email Queue
                        </Link>

                        <Link
                            href="/setup/settings/general/email/bulk"
                            className="relative inline-flex items-center px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
                        >
                            Bulk Email
                        </Link>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="py-12">
                <div className="space-y-5 lg:max-w-[1024px] mx-auto">
                    <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56">Mail Engine</Label>

                        <div className="grow">
                            <Select value={mailEngine} onValueChange={setMailEngine}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="SMTP">SMTP</SelectItem>

                                    <SelectItem value="Sendmail">Sendmail</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56">Email Protocol</Label>

                        <div className="grow">
                            <Select value={emailProtocol} onValueChange={setEmailProtocol}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="smtp">SMTP</SelectItem>

                                    <SelectItem value="sendmail">Sendmail</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56">Email Encryption</Label>

                        <div className="grow">
                            <Select
                                value={emailEncryption}
                                onValueChange={setEmailEncryption}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>

                                    <SelectItem value="ssl">SSL</SelectItem>

                                    <SelectItem value="tls">TLS</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56">SMTP Host</Label>

                        <div className="grow">
                            <Input
                                value={smtpHost}
                                onChange={(e) => setSmtpHost(e.target.value)}
                                placeholder="smtp.gmail.com"
                            />
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56">Port</Label>

                        <div className="grow">
                            <Input
                                type="number"
                                value={smtpPort}
                                onChange={(e) => setSmtpPort(e.target.value)}
                                placeholder="587"
                            />
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56">Email</Label>

                        <div className="grow">
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="info@example.com"
                            />
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56">SMTP Username</Label>

                        <div className="grow">
                            <Input
                                value={smtpUsername}
                                onChange={(e) => setSmtpUsername(e.target.value)}
                                placeholder="username"
                            />
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56">SMTP Password</Label>

                        <div className="grow">
                            <Input
                                type="password"
                                value={smtpPassword}
                                onChange={(e) => setSmtpPassword(e.target.value)}
                                placeholder="Enter new password"
                            />
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56">Email Charset</Label>

                        <div className="grow">
                            <Select value={emailCharset} onValueChange={setEmailCharset}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="UTF-8">UTF-8</SelectItem>

                                    <SelectItem value="ISO-8859-1">ISO-8859-1</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56">BCC All Emails To</Label>

                        <div className="grow">
                            <Input
                                type="email"
                                value={bccAllEmails}
                                onChange={(e) => setBccAllEmails(e.target.value)}
                                placeholder="bcc@example.com"
                            />
                        </div>
                    </div>

                    <div className="flex items-start flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56 pt-2.5">
                            Email Signature
                        </Label>

                        <div className="grow">
                            <Textarea
                                value={emailSignature}
                                onChange={(e) => setEmailSignature(e.target.value)}
                                rows={5}
                            />
                        </div>
                    </div>

                    <div className="flex items-start flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56 pt-2.5">
                            Predefined Header
                        </Label>

                        <div className="grow">
                            <Textarea
                                value={predefinedHeader}
                                onChange={(e) => setPredefinedHeader(e.target.value)}
                                rows={5}
                            />
                        </div>
                    </div>

                    <div className="flex items-start flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56 pt-2.5">
                            Predefined Footer
                        </Label>

                        <div className="grow">
                            <Textarea
                                value={predefinedFooter}
                                onChange={(e) => setPredefinedFooter(e.target.value)}
                                rows={5}
                            />
                        </div>
                    </div>

                    <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
                        <Label className="flex w-full max-w-56">Send Test Email</Label>

                        <div className="grow">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleTestEmail}
                                disabled={sendingTest}
                            >
                                {sendingTest ? (
                                    <>
                                        <LoaderCircleIcon className="size-4 mr-2 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    "Send Test Email"
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
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
