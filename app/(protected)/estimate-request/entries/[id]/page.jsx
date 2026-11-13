"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EstimateRequestEntryPage() {
    const params = useParams();
    const router = useRouter();

    const id = params?.id;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!id) {
            return;
        }

        const loadEntry = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `/api/estimate-request/entries/${encodeURIComponent(
                        id
                    )}`,
                    {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        cache: "no-store",
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message ||
                            "Estimate request entry not found"
                    );
                }

                setData(result);
            } catch (err) {
                console.error(
                    "Failed to load estimate request:",
                    err
                );

                setError(
                    err.message ||
                        "Failed to load estimate request"
                );
            } finally {
                setLoading(false);
            }
        };

        loadEntry();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
                <div className="text-center">
                    <div className="text-lg font-semibold">
                        Loading estimate request...
                    </div>

                    <div className="text-sm text-gray-500 mt-2">
                        Please wait
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
                <div className="card max-w-lg w-full">
                    <div className="card-body p-8 text-center">
                        <div className="text-danger text-4xl mb-4">
                            ×
                        </div>

                        <h1 className="text-xl font-semibold mb-2">
                            Estimate Request Not Found
                        </h1>

                        <p className="text-gray-500 mb-6">
                            {error}
                        </p>

                        <button
                            type="button"
                            className="btn"
                            onClick={() =>
                                router.push(
                                    "/estimate-request"
                                )
                            }
                        >
                            Back to Estimate Requests
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return null;
    }

    /*
     * Expected API response:
     *
     * {
     *     entry: {
     *         id,
     *         formId,
     *         publicToken,
     *         data,
     *         status,
     *         createdAt,
     *         updatedAt
     *     },
     *     form: {
     *         id,
     *         name,
     *         slug
     *     }
     * }
     */

    const entry = data.entry || {};
    const form = data.form || {};

    const requestData =
        entry.data && typeof entry.data === "object"
            ? entry.data
            : {};

    const formatLabel = (key) => {
        if (!key) {
            return "";
        }

        return key
            .replace(/[_-]+/g, " ")
            .replace(
                /([a-z])([A-Z])/g,
                "$1 $2"
            )
            .replace(/\b\w/g, (char) =>
                char.toUpperCase()
            );
    };

    const formatValue = (value) => {
        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "—";
        }

        if (Array.isArray(value)) {
            return value.join(", ");
        }

        if (
            typeof value === "object"
        ) {
            return JSON.stringify(
                value,
                null,
                2
            );
        }

        return String(value);
    };

    const formatDate = (date) => {
        if (!date) {
            return "—";
        }

        try {
            return new Date(date).toLocaleString(
                "en-IN",
                {
                    dateStyle: "medium",
                    timeStyle: "short",
                }
            );
        } catch {
            return date;
        }
    };

    const getStatus = (status) => {
        switch (Number(status)) {
            case 0:
                return {
                    label: "New",
                    className:
                        "bg-blue-100 text-blue-700",
                };

            case 1:
                return {
                    label: "Processed",
                    className:
                        "bg-green-100 text-green-700",
                };

            case 2:
                return {
                    label: "Pending",
                    className:
                        "bg-yellow-100 text-yellow-700",
                };

            case 3:
                return {
                    label: "Rejected",
                    className:
                        "bg-red-100 text-red-700",
                };

            default:
                return {
                    label: `Status ${status}`,
                    className:
                        "bg-gray-100 text-gray-700",
                };
        }
    };

    const status = getStatus(entry.status);

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-5">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                    <div>
                        <button
                            type="button"
                            onClick={() =>
                                router.push(
                                    "/estimate-request/entries"
                                )
                            }
                            className="text-sm text-gray-500 hover:text-gray-900 mb-3"
                        >
                            ← Back to Estimate Requests
                        </button>

                        <h1 className="text-2xl font-semibold">
                            Estimate Request
                        </h1>

                        <p className="text-gray-500 mt-1">
                            View submitted estimate request details
                        </p>
                    </div>

                    <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${status.className}`}
                    >
                        {status.label}
                    </span>
                </div>

                {/* Request information */}
                <div className="card mb-6">
                    <div className="card-body p-6">
                        <h2 className="text-lg font-semibold mb-5">
                            Request Information
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            <div>
                                <div className="text-sm text-gray-500">
                                    Form
                                </div>

                                <div className="font-medium mt-1">
                                    {form.name ||
                                        "Estimate Request Form"}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm text-gray-500">
                                    Form ID
                                </div>

                                <div className="font-medium mt-1">
                                    {entry.formId ||
                                        "—"}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm text-gray-500">
                                    Request ID
                                </div>

                                <div className="font-medium mt-1">
                                    {entry.id ||
                                        "—"}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm text-gray-500">
                                    Submitted
                                </div>

                                <div className="font-medium mt-1">
                                    {formatDate(
                                        entry.createdAt
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm text-gray-500">
                                    Last Updated
                                </div>

                                <div className="font-medium mt-1">
                                    {formatDate(
                                        entry.updatedAt
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="text-sm text-gray-500">
                                    Public Token
                                </div>

                                <div className="font-mono text-sm break-all mt-1">
                                    {entry.publicToken ||
                                        id}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Submitted values */}
                <div className="card">
                    <div className="card-body p-6">
                        <h2 className="text-lg font-semibold mb-5">
                            Submitted Information
                        </h2>

                        {Object.keys(
                            requestData
                        ).length === 0 ? (
                            <div className="text-gray-500 py-5">
                                No submitted information found.
                            </div>
                        ) : (
                            <div className="divide-y">
                                {Object.entries(
                                    requestData
                                ).map(
                                    ([
                                        key,
                                        value,
                                    ]) => (
                                        <div
                                            key={key}
                                            className="grid grid-cols-1 md:grid-cols-3 gap-2 py-4"
                                        >
                                            <div className="font-medium text-gray-700">
                                                {formatLabel(
                                                    key
                                                )}
                                            </div>

                                            <div className="md:col-span-2 text-gray-900 break-words">
                                                {typeof value ===
                                                "object" &&
                                                value !==
                                                    null ? (
                                                    <pre className="text-sm bg-gray-50 rounded p-3 overflow-auto">
                                                        {formatValue(
                                                            value
                                                        )}
                                                    </pre>
                                                ) : (
                                                    formatValue(
                                                        value
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}