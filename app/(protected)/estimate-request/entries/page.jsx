"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function EstimateRequestEntriesPage() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [error, setError] = useState("");

    /* ============================================================
       FETCH ENTRIES
    ============================================================ */

    const fetchEntries = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                "/api/estimate-request/entries",
                {
                    method: "GET",
                    cache: "no-store",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load entries"
                );
            }

            /*
             * Supports different API response formats:
             *
             * { entries: [] }
             * { data: [] }
             * []
             */

            const list =
                Array.isArray(data)
                    ? data
                    : data.entries ||
                      data.data ||
                      [];

            setEntries(list);
        } catch (err) {
            console.error(
                "Fetch entries error:",
                err
            );

            setError(
                err.message ||
                    "Unable to load estimate requests."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    /* ============================================================
       DELETE ENTRY
    ============================================================ */

    const deleteEntry = async (id) => {
        if (!id) return;

        const confirmed = window.confirm(
            "Are you sure you want to delete this estimate request?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setDeletingId(id);

            const response = await fetch(
                `/api/estimate-request/entries/${id}`,
                {
                    method: "DELETE",
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to delete entry"
                );
            }

            setEntries((current) =>
                current.filter(
                    (entry) =>
                        getEntryId(entry) !== id
                )
            );
        } catch (err) {
            console.error(
                "Delete entry error:",
                err
            );

            alert(
                err.message ||
                    "Unable to delete estimate request."
            );
        } finally {
            setDeletingId(null);
        }
    };

    /* ============================================================
       GET ENTRY ID
    ============================================================ */

    const getEntryId = (entry) => {
        return (
            entry?.id ||
            entry?._id ||
            entry?.token ||
            entry?.publicToken ||
            ""
        );
    };

    /* ============================================================
       GET DATE
    ============================================================ */

    const formatDate = (date) => {
        if (!date) {
            return "-";
        }

        try {
            return new Date(
                date
            ).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return date;
        }
    };

    /* ============================================================
       GET NAME
    ============================================================ */

    const getName = (entry) => {
        return (
            entry?.name ||
            entry?.fullName ||
            entry?.customerName ||
            entry?.data?.name ||
            entry?.data?.fullName ||
            entry?.data?.["text_1787554977074-48y5o"] ||
            entry?.data?.["text_1787548502959-excfs"] ||
            "-"
        );
    };
     /* ============================================================
       GET form Name
    ============================================================ */

    const getFormName = (entry) => {
        return (
            entry?.formName ||
            "-"
        );
    };
    /* ============================================================
       GET EMAIL
    ============================================================ */

    const getEmail = (entry) => {
        return (
            entry?.email ||
            entry?.customerEmail ||
            entry?.data?.email ||
            entry?.data?.["Email"] ||
            "-"
        );
    };

    /* ============================================================
       GET STATUS
    ============================================================ */

    const getStatus = (entry) => {
        return (
            entry?.status ||
            "processing"
        );
    };

    /* ============================================================
       STATUS BADGE
    ============================================================ */

    const StatusBadge = ({
        status,
    }) => {
        const normalized =
            String(status)
                .toLowerCase();

        let className =
            "badge badge-light-warning";

        if (
            normalized ===
                "completed" ||
            normalized === "complete"
        ) {
            className =
                "badge badge-light-success";
        }

        if (
            normalized ===
                "cancelled" ||
            normalized === "canceled"
        ) {
            className =
                "badge badge-light-danger";
        }

        if (
            normalized ===
                "processing" ||
            normalized === "pending"
        ) {
            className =
                "badge badge-light-warning";
        }

        return (
            <span
                className={`${className} capitalize`}
            >
                {status}
            </span>
        );
    };

    /* ============================================================
       LOADING
    ============================================================ */

    if (loading) {
        return (
            <div className="flex flex-col gap-6">

                <PageHeader />

                <div className="card">

                    <div className="card-body">

                        <div className="flex items-center justify-center py-20">

                            <span className="spinner spinner-lg"></span>

                            <span className="ms-3 text-sm text-gray-500">
                                Loading estimate requests...
                            </span>

                        </div>

                    </div>

                </div>

            </div>
        );
    }

    /* ============================================================
       MAIN
    ============================================================ */

    return (
        <div className="flex flex-col gap-6 p-5">

            {/* ======================================================
                HEADER
            ====================================================== */}

            <PageHeader
                count={entries.length}
                onRefresh={fetchEntries}
            />

            {/* ======================================================
                ERROR
            ====================================================== */}

            {error && (
                <div className="alert alert-danger">

                    <i className="ki-filled ki-information-2" />

                    <span>
                        {error}
                    </span>

                    <button
                        type="button"
                        className="btn btn-sm btn-light-danger ms-auto"
                        onClick={fetchEntries}
                    >
                        Retry
                    </button>

                </div>
            )}

            {/* ======================================================
                TABLE
            ====================================================== */}

            <div className="card">

                <div className="card-header">

                    <div>

                        <h3 className="card-title">
                            Estimate Requests
                        </h3>

                        <p className="text-xs text-gray-500 mt-1">
                            View and manage submitted estimate requests.
                        </p>

                    </div>

                    <div className="flex items-center gap-2">

                        <span className="badge badge-light-primary">
                            {entries.length} Entries
                        </span>

                    </div>

                </div>

                <div className="card-body p-0">

                    {entries.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="overflow-x-auto">

                            <table className="table table-border w-full">

                                <thead>

                                    <tr>

                                        <th className="min-w-[220px]">
                                            Customer
                                        </th>

                                        <th className="min-w-[220px]">
                                            Email
                                        </th>

                                        <th className="min-w-[150px]">
                                            Status
                                        </th>

                                        <th className="min-w-[180px]">
                                            Submitted
                                        </th>

                                        <th className="w-[160px] text-end">
                                            Actions
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {entries.map(
                                        (
                                            entry,
                                            index
                                        ) => {
                                            const id =
                                                getEntryId(
                                                    entry
                                                );

                                            return (
                                                <tr
                                                    key={
                                                        id ||
                                                        index
                                                    }
                                                >

                                                    {/* CUSTOMER */}

                                                    <td>

                                                        <div className="flex items-center gap-3">

                                                            <div className="size-10 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0">

                                                                <i className="ki-filled ki-user text-lg" />

                                                            </div>

                                                            <div className="flex flex-col">

                                                                <span className="text-sm font-semibold text-gray-900">

                                                                    {getName(
                                                                        entry
                                                                    )}

                                                                </span>

                                                                <span className="text-xs text-gray-500">

                                                                   {getFormName(entry)}

                                                                </span>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    {/* EMAIL */}

                                                    <td>

                                                        <span className="text-sm text-gray-700">

                                                            {getEmail(
                                                                entry
                                                            )}

                                                        </span>

                                                    </td>

                                                    {/* STATUS */}

                                                    <td>

                                                        <StatusBadge
                                                            status={getStatus(
                                                                entry
                                                            )}
                                                        />

                                                    </td>

                                                    {/* DATE */}

                                                    <td>

                                                        <span className="text-sm text-gray-600">

                                                            {formatDate(
                                                                entry?.createdAt ||
                                                                    entry?.created_at ||
                                                                    entry?.submittedAt ||
                                                                    entry?.date
                                                            )}

                                                        </span>

                                                    </td>

                                                    {/* ACTIONS */}

                                                    <td>

                                                        <div className="flex items-center justify-end gap-2">

                                                            {/* VIEW */}

                                                            {id && (
                                                                <Link
                                                                    href={`/estimate-request/entries/${encodeURIComponent(
                                                                        id
                                                                    )}`}
                                                                    className="btn btn-sm btn-light-primary"
                                                                    title="View"
                                                                >

                                                                    <i className="ki-filled ki-eye" />

                                                                    <span className="hidden lg:inline">
                                                                        View
                                                                    </span>

                                                                </Link>
                                                            )}

                                                            {/* DELETE */}

                                                            {id && (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-light-danger"
                                                                    disabled={
                                                                        deletingId ===
                                                                        id
                                                                    }
                                                                    onClick={() =>
                                                                        deleteEntry(
                                                                            id
                                                                        )
                                                                    }
                                                                    title="Delete"
                                                                >

                                                                    {deletingId ===
                                                                    id ? (
                                                                        <span className="spinner spinner-sm"></span>
                                                                    ) : (
                                                                        <i className="ki-filled ki-trash" />
                                                                    )}

                                                                    <span className="hidden lg:inline">
                                                                        Delete
                                                                    </span>

                                                                </button>
                                                            )}

                                                        </div>

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>
                    )}

                </div>

            </div>

        </div>
    );
}

/* ================================================================
   PAGE HEADER
================================================================ */

function PageHeader({
    count,
    onRefresh,
}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-5">

            <div className="flex flex-col gap-1">

                <h1 className="text-xl font-semibold text-gray-900">
                    Estimate Requests
                </h1>

                <div className="flex items-center gap-2 text-sm text-gray-500">

                    <span>
                        Forms
                    </span>

                    <i className="ki-filled ki-right text-xs" />

                    <span className="text-gray-700 font-medium">
                        Estimate Requests
                    </span>

                </div>

            </div>

            <div className="flex items-center gap-3">

                {typeof count ===
                    "number" && (
                    <span className="badge badge-light-primary">
                        {count} Total
                    </span>
                )}

                {onRefresh && (
                    <button
                        type="button"
                        className="btn btn-light-primary"
                        onClick={onRefresh}
                    >

                        <i className="ki-filled ki-arrows-circle" />

                        Refresh

                    </button>
                )}

            </div>

        </div>
    );
}

/* ================================================================
   EMPTY STATE
================================================================ */

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-5">

            <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center mb-5">

                <i className="ki-filled ki-document text-3xl text-gray-400" />

            </div>

            <h3 className="text-base font-semibold text-gray-800">
                No Estimate Requests
            </h3>

            <p className="text-sm text-gray-500 mt-1 text-center max-w-md">
                There are currently no submitted estimate requests.
            </p>

        </div>
    );
}