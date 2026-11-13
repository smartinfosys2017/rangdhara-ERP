"use client";

import { useEffect, useState } from "react";

export default function PublicEstimateForm({ params }) {
    const [form, setForm] = useState(null);
    const [values, setValues] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");
    const [token, setToken] = useState("");

    useEffect(() => {
        async function loadForm() {
            try {
                const resolvedParams = await params;
                const currentToken = resolvedParams.token;

                setToken(currentToken);

                const response = await fetch(
                    `/api/estimate-request/${currentToken}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Form not found"
                    );
                }

                setForm(data.form);
            } catch (err) {
                setError(
                    err.message || "Failed to load form"
                );
            } finally {
                setLoading(false);
            }
        }

        loadForm();
    }, [params]);

    const updateValue = (name, value) => {
        setValues((current) => ({
            ...current,
            [name]: value,
        }));
    };

    const submitForm = async () => {
        try {
            setSubmitting(true);
            setError("");

            const fields = form?.fields || [];

            for (const field of fields) {
                if (
                    field.type === "header" ||
                    field.type === "paragraph"
                ) {
                    continue;
                }

                if (
                    field.required &&
                    (
                        values[field.name] === undefined ||
                        values[field.name] === null ||
                        values[field.name] === "" ||
                        (
                            Array.isArray(values[field.name]) &&
                            values[field.name].length === 0
                        )
                    )
                ) {
                    setError(
                        `${field.label || "This field"} is required`
                    );

                    const element =
                        document.getElementById(
                            `field-${field.name}`
                        );

                    if (element) {
                        element.scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        });
                    }

                    setSubmitting(false);
                    return;
                }
            }

            const response = await fetch(
                "/api/estimate-request/submit",
                {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        token,
                        values,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Submission failed"
                );
            }

            if (
                data.action === 1 &&
                data.redirectUrl
            ) {
                window.location.href =
                    data.redirectUrl;

                return;
            }

            setSubmitted(true);
        } catch (err) {
            console.error(
                "Estimate form submission error:",
                err
            );

            setError(
                err.message ||
                    "Failed to submit estimate request"
            );

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="estimate-page estimate-loading">
                <div className="estimate-loading-box">
                    <div className="estimate-spinner"></div>

                    <h2>Loading form...</h2>

                    <p>
                        Please wait while we prepare
                        your estimate request form.
                    </p>
                </div>
            </div>
        );
    }

    if (error && !form) {
        return (
            <div className="estimate-page estimate-loading">
                <div className="estimate-error-box">
                    <div className="estimate-error-icon">
                        ×
                    </div>

                    <h2>
                        Form Not Found
                    </h2>

                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <>
                <style>{estimateFormCSS}</style>

                <div className="estimate-page estimate-success-page">
                    <div className="estimate-success-card">
                        <div className="estimate-success-icon">
                            ✓
                        </div>

                        <h1>
                            Thank You!
                        </h1>

                        <p>
                            {form?.successSubmitMessage ||
                                "Your estimate request has been submitted successfully."}
                        </p>
                    </div>
                </div>
            </>
        );
    }

    const fields = form?.fields || [];

    return (
        <>
            <style>{estimateFormCSS}</style>

            <div className="estimate-page">

                {/* Hero/Header */}
                <div className="estimate-header">
                    <div className="estimate-header-inner">

                        <div className="estimate-badge">
                            Estimate Request
                        </div>

                        <h1>
                            {form?.name ||
                                "Request an Estimate"}
                        </h1>

                        {form?.description && (
                            <p>
                                {form.description}
                            </p>
                        )}
                    </div>
                </div>

                <div className="estimate-container">

                    {/* Form Card */}
                    <div className="estimate-card">

                        <div className="estimate-card-header">
                            <div>
                                <h2>
                                    Request Details
                                </h2>

                                <p>
                                    Please provide the
                                    information below
                                    and we will get back
                                    to you shortly.
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="estimate-alert">
                                <span className="estimate-alert-icon">
                                    !
                                </span>

                                <span>
                                    {error}
                                </span>
                            </div>
                        )}

                        <div className="estimate-form">

                            {fields.map(
                                (field) => {

                                    if (
                                        field.type ===
                                        "header"
                                    ) {
                                        return (
                                            <div
                                                key={
                                                    field.id
                                                }
                                                className="estimate-section-title"
                                            >
                                                <h3>
                                                    {
                                                        field.text
                                                    }
                                                </h3>

                                                <div className="estimate-section-line"></div>
                                            </div>
                                        );
                                    }

                                    if (
                                        field.type ===
                                        "paragraph"
                                    ) {
                                        return (
                                            <div
                                                key={
                                                    field.id
                                                }
                                                className="estimate-description"
                                            >
                                                {
                                                    field.text
                                                }
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={
                                                field.id
                                            }
                                            id={`field-${field.name}`}
                                            className="estimate-field-wrapper"
                                        >
                                            <PublicField
                                                field={
                                                    field
                                                }
                                                value={
                                                    values[
                                                        field.name
                                                    ]
                                                }
                                                onChange={
                                                    updateValue
                                                }
                                            />
                                        </div>
                                    );
                                }
                            )}

                        </div>

                        {/* Submit */}
                        <div className="estimate-submit-area">

                            <button
                                type="button"
                                className="estimate-submit-button"
                                disabled={
                                    submitting
                                }
                                onClick={
                                    submitForm
                                }
                                style={{
                                    backgroundColor:
                                        form?.submitButtonBgColor ||
                                        "#2563eb",

                                    color:
                                        form?.submitButtonTextColor ||
                                        "#ffffff",
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <span className="estimate-button-spinner"></span>
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        {form?.submitButtonText ||
                                            "Submit Request"}

                                        <span className="estimate-button-arrow">
                                            →
                                        </span>
                                    </>
                                )}
                            </button>

                            <p className="estimate-privacy">
                                Your information is secure
                                and will only be used to
                                process your estimate
                                request.
                            </p>

                        </div>

                    </div>

                </div>
            </div>
        </>
    );
}


/* =========================================================
   FIELD COMPONENT
========================================================= */

function PublicField({
    field,
    value,
    onChange,
}) {
    const label = (
        <label className="estimate-label">
            {field.label}

            {field.required && (
                <span className="estimate-required">
                    *
                </span>
            )}
        </label>
    );

    /* TEXTAREA */
    if (field.type === "textarea") {
        return (
            <div>
                {label}

                <textarea
                    rows={field.rows || 5}
                    maxLength={
                        field.maxlength ||
                        undefined
                    }
                    placeholder={
                        field.placeholder ||
                        ""
                    }
                    value={value || ""}
                    onChange={(e) =>
                        onChange(
                            field.name,
                            e.target.value
                        )
                    }
                    className="estimate-input estimate-textarea"
                />

                {field.helpText && (
                    <div className="estimate-help">
                        {field.helpText}
                    </div>
                )}
            </div>
        );
    }

    /* SELECT */
    if (field.type === "select") {
        return (
            <div>
                {label}

                <select
                    value={value || ""}
                    onChange={(e) =>
                        onChange(
                            field.name,
                            e.target.value
                        )
                    }
                    className="estimate-input estimate-select"
                >
                    <option value="">
                        {field.placeholder ||
                            "Select an option"}
                    </option>

                    {(field.options || []).map(
                        (option) => (
                            <option
                                key={
                                    option.value
                                }
                                value={
                                    option.value
                                }
                            >
                                {
                                    option.label
                                }
                            </option>
                        )
                    )}
                </select>

                {field.helpText && (
                    <div className="estimate-help">
                        {field.helpText}
                    </div>
                )}
            </div>
        );
    }

    /* RADIO */
    if (
        field.type ===
        "radio-group"
    ) {
        return (
            <div>
                {label}

                <div className="estimate-radio-group">
                    {(field.options || []).map(
                        (option) => (
                            <label
                                key={
                                    option.value
                                }
                                className={`estimate-radio-card ${
                                    value ===
                                    option.value
                                        ? "selected"
                                        : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name={
                                        field.name
                                    }
                                    value={
                                        option.value
                                    }
                                    checked={
                                        value ===
                                        option.value
                                    }
                                    onChange={() =>
                                        onChange(
                                            field.name,
                                            option.value
                                        )
                                    }
                                />

                                <span className="estimate-radio-custom"></span>

                                <span>
                                    {
                                        option.label
                                    }
                                </span>
                            </label>
                        )
                    )}
                </div>
            </div>
        );
    }

    /* CHECKBOX */
    if (
        field.type ===
        "checkbox-group"
    ) {
        const selected =
            Array.isArray(value)
                ? value
                : [];

        return (
            <div>
                {label}

                <div className="estimate-checkbox-group">
                    {(field.options || []).map(
                        (option) => {
                            const checked =
                                selected.includes(
                                    option.value
                                );

                            return (
                                <label
                                    key={
                                        option.value
                                    }
                                    className={`estimate-checkbox-card ${
                                        checked
                                            ? "selected"
                                            : ""
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={
                                            checked
                                        }
                                        onChange={() => {
                                            const next =
                                                checked
                                                    ? selected.filter(
                                                          (
                                                              item
                                                          ) =>
                                                              item !==
                                                              option.value
                                                      )
                                                    : [
                                                          ...selected,
                                                          option.value,
                                                      ];

                                            onChange(
                                                field.name,
                                                next
                                            );
                                        }}
                                    />

                                    <span className="estimate-checkbox-custom">
                                        {checked &&
                                            "✓"}
                                    </span>

                                    <span>
                                        {
                                            option.label
                                        }
                                    </span>
                                </label>
                            );
                        }
                    )}
                </div>
            </div>
        );
    }

    /* DATE */
    if (field.type === "date") {
        return (
            <div>
                {label}

                <input
                    type="date"
                    value={
                        value || ""
                    }
                    onChange={(e) =>
                        onChange(
                            field.name,
                            e.target.value
                        )
                    }
                    className="estimate-input"
                />

                {field.helpText && (
                    <div className="estimate-help">
                        {field.helpText}
                    </div>
                )}
            </div>
        );
    }

    /* FILE */
    if (field.type === "file") {
        return (
            <div>
                {label}

                <div className="estimate-file-wrapper">
                    <input
                        type="file"
                        onChange={(e) =>
                            onChange(
                                field.name,
                                e.target.files?.[0]
                                    ?.name || ""
                            )
                        }
                    />

                    <div className="estimate-file-content">
                        <div className="estimate-file-icon">
                            ↑
                        </div>

                        <div>
                            <strong>
                                Choose a file
                            </strong>

                            <span>
                                Click to upload
                            </span>
                        </div>
                    </div>
                </div>

                {field.helpText && (
                    <div className="estimate-help">
                        {field.helpText}
                    </div>
                )}
            </div>
        );
    }

    /* EMAIL / NUMBER / TEXT */
    return (
        <div>
            {label}

            <input
                type={
                    field.type === "email"
                        ? "email"
                        : field.type === "number"
                        ? "number"
                        : "text"
                }
                value={
                    value || ""
                }
                placeholder={
                    field.placeholder ||
                    ""
                }
                maxLength={
                    field.maxlength ||
                    undefined
                }
                onChange={(e) =>
                    onChange(
                        field.name,
                        e.target.value
                    )
                }
                className="estimate-input"
            />

            {field.helpText && (
                <div className="estimate-help">
                    {field.helpText}
                </div>
            )}
        </div>
    );
}


/* =========================================================
   CSS
========================================================= */

const estimateFormCSS = `
    * {
        box-sizing: border-box;
    }

    .estimate-page {
        min-height: 100vh;
        background: #f5f7fb;
        color: #172033;
        padding-bottom: 60px;
    }

    /* HEADER */

    .estimate-header {
        background: linear-gradient(
            135deg,
            #111827 0%,
            #1f2937 100%
        );
        padding: 60px 20px 90px;
        color: #ffffff;
    }

    .estimate-header-inner {
        max-width: 850px;
        margin: 0 auto;
        text-align: center;
    }

    .estimate-badge {
        display: inline-flex;
        align-items: center;
        padding: 7px 14px;
        border-radius: 30px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 18px;
    }

    .estimate-header h1 {
        margin: 0;
        font-size: 38px;
        line-height: 1.2;
        font-weight: 700;
        letter-spacing: -0.5px;
    }

    .estimate-header p {
        max-width: 650px;
        margin: 16px auto 0;
        color: #cbd5e1;
        font-size: 16px;
        line-height: 1.7;
    }

    /* CONTAINER */

    .estimate-container {
        width: calc(100% - 40px);
        max-width: 900px;
        margin: -45px auto 0;
        position: relative;
    }

    /* CARD */

    .estimate-card {
        background: #ffffff;
        border-radius: 18px;
        box-shadow:
            0 20px 50px rgba(15, 23, 42, 0.10);
        overflow: hidden;
    }

    .estimate-card-header {
        padding: 30px 36px;
        border-bottom: 1px solid #edf0f5;
    }

    .estimate-card-header h2 {
        margin: 0;
        font-size: 22px;
        font-weight: 700;
        color: #111827;
    }

    .estimate-card-header p {
        margin: 7px 0 0;
        color: #64748b;
        font-size: 14px;
    }

    /* ALERT */

    .estimate-alert {
        margin: 25px 36px 0;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 13px 16px;
        background: #fff1f2;
        border: 1px solid #fecdd3;
        color: #be123c;
        border-radius: 9px;
        font-size: 14px;
    }

    .estimate-alert-icon {
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: #be123c;
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
    }

    /* FORM */

    .estimate-form {
        padding: 35px 36px 10px;
        display: flex;
        flex-direction: column;
        gap: 25px;
    }

    .estimate-field-wrapper {
        width: 100%;
    }

    .estimate-label {
        display: block;
        margin-bottom: 8px;
        color: #1e293b;
        font-size: 14px;
        font-weight: 600;
    }

    .estimate-required {
        color: #dc2626;
        margin-left: 4px;
    }

    .estimate-input {
        width: 100%;
        min-height: 48px;
        padding: 12px 14px;
        border: 1px solid #d8dee9;
        border-radius: 8px;
        background: #ffffff;
        color: #111827;
        font-size: 14px;
        outline: none;
        transition:
            border-color .2s ease,
            box-shadow .2s ease;
    }

    .estimate-input:hover {
        border-color: #aeb8c8;
    }

    .estimate-input:focus {
        border-color: #2563eb;
        box-shadow:
            0 0 0 3px rgba(37,99,235,.10);
    }

    .estimate-textarea {
        min-height: 120px;
        resize: vertical;
        line-height: 1.6;
    }

    .estimate-select {
        cursor: pointer;
    }

    .estimate-help {
        margin-top: 6px;
        color: #94a3b8;
        font-size: 12px;
        line-height: 1.5;
    }

    /* SECTION */

    .estimate-section-title {
        margin-top: 10px;
        margin-bottom: -5px;
    }

    .estimate-section-title h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        color: #111827;
    }

    .estimate-section-line {
        width: 45px;
        height: 3px;
        margin-top: 9px;
        background: #2563eb;
        border-radius: 10px;
    }

    .estimate-description {
        color: #64748b;
        font-size: 14px;
        line-height: 1.7;
        padding: 5px 0;
    }

    /* RADIO */

    .estimate-radio-group {
        display: grid;
        grid-template-columns:
            repeat(2, minmax(0, 1fr));
        gap: 10px;
    }

    .estimate-radio-card {
        position: relative;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 13px 15px;
        border: 1px solid #d8dee9;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        color: #334155;
        transition: .2s ease;
    }

    .estimate-radio-card:hover {
        border-color: #93c5fd;
        background: #f8fbff;
    }

    .estimate-radio-card.selected {
        border-color: #2563eb;
        background: #eff6ff;
        color: #1d4ed8;
    }

    .estimate-radio-card input {
        position: absolute;
        opacity: 0;
    }

    .estimate-radio-custom {
        width: 17px;
        height: 17px;
        flex: 0 0 17px;
        border: 2px solid #94a3b8;
        border-radius: 50%;
        position: relative;
    }

    .estimate-radio-card.selected
    .estimate-radio-custom {
        border-color: #2563eb;
    }

    .estimate-radio-card.selected
    .estimate-radio-custom::after {
        content: "";
        position: absolute;
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #2563eb;
        top: 3px;
        left: 3px;
    }

    /* CHECKBOX */

    .estimate-checkbox-group {
        display: grid;
        grid-template-columns:
            repeat(2, minmax(0, 1fr));
        gap: 10px;
    }

    .estimate-checkbox-card {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 13px 15px;
        border: 1px solid #d8dee9;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        color: #334155;
        transition: .2s ease;
    }

    .estimate-checkbox-card:hover {
        border-color: #93c5fd;
        background: #f8fbff;
    }

    .estimate-checkbox-card.selected {
        border-color: #2563eb;
        background: #eff6ff;
        color: #1d4ed8;
    }

    .estimate-checkbox-card input {
        display: none;
    }

    .estimate-checkbox-custom {
        width: 18px;
        height: 18px;
        border: 2px solid #94a3b8;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        flex: 0 0 18px;
    }

    .estimate-checkbox-card.selected
    .estimate-checkbox-custom {
        border-color: #2563eb;
        background: #2563eb;
        color: #ffffff;
    }

    /* FILE */

    .estimate-file-wrapper {
        position: relative;
        border: 1px dashed #b8c2d1;
        border-radius: 10px;
        background: #f8fafc;
        min-height: 110px;
        overflow: hidden;
        cursor: pointer;
    }

    .estimate-file-wrapper input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: pointer;
        z-index: 2;
    }

    .estimate-file-content {
        min-height: 110px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 13px;
        color: #475569;
    }

    .estimate-file-content strong {
        display: block;
        font-size: 14px;
    }

    .estimate-file-content span {
        display: block;
        margin-top: 3px;
        color: #94a3b8;
        font-size: 12px;
    }

    .estimate-file-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background: #e0edff;
        color: #2563eb;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 22px;
        font-weight: 700;
    }

    /* SUBMIT */

    .estimate-submit-area {
        padding: 25px 36px 35px;
        border-top: 1px solid #edf0f5;
        margin-top: 20px;
    }

    .estimate-submit-button {
        width: 100%;
        min-height: 52px;
        border: 0;
        border-radius: 9px;
        padding: 14px 20px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        transition:
            transform .2s ease,
            opacity .2s ease,
            box-shadow .2s ease;
    }

    .estimate-submit-button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow:
            0 8px 20px rgba(37,99,235,.18);
    }

    .estimate-submit-button:disabled {
        opacity: .65;
        cursor: not-allowed;
    }

    .estimate-button-arrow {
        font-size: 20px;
        line-height: 1;
    }

    .estimate-privacy {
        text-align: center;
        margin: 12px 0 0;
        color: #94a3b8;
        font-size: 12px;
    }

    .estimate-button-spinner,
    .estimate-spinner {
        border: 3px solid rgba(255,255,255,.35);
        border-top-color: currentColor;
        border-radius: 50%;
        animation: estimate-spin .8s linear infinite;
    }

    .estimate-button-spinner {
        width: 17px;
        height: 17px;
    }

    .estimate-spinner {
        width: 38px;
        height: 38px;
        color: #2563eb;
        border-color: #dbeafe;
        border-top-color: #2563eb;
        margin: 0 auto 20px;
    }

    @keyframes estimate-spin {
        to {
            transform: rotate(360deg);
        }
    }

    /* LOADING */

    .estimate-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 30px;
    }

    .estimate-loading-box,
    .estimate-error-box {
        width: 100%;
        max-width: 450px;
        background: #ffffff;
        border-radius: 16px;
        padding: 45px 30px;
        text-align: center;
        box-shadow:
            0 15px 40px rgba(15,23,42,.08);
    }

    .estimate-loading-box h2,
    .estimate-error-box h2 {
        margin: 0;
        font-size: 20px;
        color: #111827;
    }

    .estimate-loading-box p,
    .estimate-error-box p {
        margin: 8px 0 0;
        color: #64748b;
        font-size: 14px;
    }

    .estimate-error-icon {
        width: 55px;
        height: 55px;
        margin: 0 auto 18px;
        border-radius: 50%;
        background: #fee2e2;
        color: #dc2626;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 30px;
        font-weight: 400;
    }

    /* SUCCESS */

    .estimate-success-page {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 30px;
    }

    .estimate-success-card {
        max-width: 550px;
        width: 100%;
        background: #ffffff;
        border-radius: 18px;
        padding: 55px 35px;
        text-align: center;
        box-shadow:
            0 20px 50px rgba(15,23,42,.10);
    }

    .estimate-success-icon {
        width: 70px;
        height: 70px;
        margin: 0 auto 20px;
        border-radius: 50%;
        background: #dcfce7;
        color: #16a34a;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 35px;
        font-weight: 700;
    }

    .estimate-success-card h1 {
        margin: 0;
        font-size: 26px;
        color: #111827;
    }

    .estimate-success-card p {
        margin: 12px 0 0;
        color: #64748b;
        line-height: 1.7;
    }

    /* MOBILE */

    @media (max-width: 640px) {

        .estimate-header {
            padding: 40px 20px 75px;
        }

        .estimate-header h1 {
            font-size: 28px;
        }

        .estimate-container {
            width: calc(100% - 24px);
            margin-top: -35px;
        }

        .estimate-card {
            border-radius: 14px;
        }

        .estimate-card-header,
        .estimate-form,
        .estimate-submit-area {
            padding-left: 20px;
            padding-right: 20px;
        }

        .estimate-alert {
            margin-left: 20px;
            margin-right: 20px;
        }

        .estimate-radio-group,
        .estimate-checkbox-group {
            grid-template-columns: 1fr;
        }

        .estimate-submit-area {
            padding-bottom: 25px;
        }
    }
`;