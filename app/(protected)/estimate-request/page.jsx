"use client";

import { useEffect, useMemo, useState } from "react";

/* ==========================================================================
   FIELD TYPES
========================================================================== */

const FIELD_TYPES = [
    {
        type: "header",
        label: "Header",
        description: "Add a section heading",
        icon: "ki-filled ki-text",
    },
    {
        type: "paragraph",
        label: "Paragraph",
        description: "Add descriptive text",
        icon: "ki-filled ki-notepad-edit",
    },
    {
        type: "text",
        label: "Text Field",
        description: "Single line text",
        icon: "ki-filled ki-pencil",
    },
    {
        type: "email",
        label: "Email",
        description: "Email address",
        icon: "ki-filled ki-sms",
    },
    {
        type: "textarea",
        label: "Text Area",
        description: "Long text response",
        icon: "ki-filled ki-message-text-2",
    },
    {
        type: "select",
        label: "Select",
        description: "Dropdown options",
        icon: "ki-filled ki-down-2",
    },
    {
        type: "checkbox-group",
        label: "Checkbox",
        description: "Multiple choices",
        icon: "ki-filled ki-check-circle",
    },
    {
        type: "radio-group",
        label: "Radio",
        description: "Single choice",
        icon: "ki-filled ki-radio-button",
    },
    {
        type: "date",
        label: "Date",
        description: "Date selector",
        icon: "ki-filled ki-calendar",
    },
    {
        type: "file",
        label: "File Upload",
        description: "Upload a file",
        icon: "ki-filled ki-file-up",
    },
];

/* ==========================================================================
   CREATE FIELD
========================================================================== */

const createField = (type) => {
    const unique = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 7)}`;

    const defaults = {
        header: {
            label: "Section Heading",
            text: "Section Heading",
        },

        paragraph: {
            label: "Paragraph",
            text: "Enter your paragraph text here.",
        },

        text: {
            label: "First Name",
            name: `text_${unique}`,
            placeholder: "Enter your name",
            helpText: "",
            required: false,
        },

        email: {
            label: "Email",
            name: "email",
            placeholder: "Enter your email",
            helpText: "",
            required: true,
        },

        textarea: {
            label: "Message",
            name: `message_${unique}`,
            placeholder: "Enter your message",
            helpText: "",
            required: false,
            rows: 4,
            maxlength: 500,
        },

        select: {
            label: "Select Option",
            name: `select_${unique}`,
            placeholder: "Select an option",
            required: false,
            options: [
                {
                    label: "Option 1",
                    value: "option_1",
                },
                {
                    label: "Option 2",
                    value: "option_2",
                },
            ],
        },

        "checkbox-group": {
            label: "Select Options",
            name: `checkbox_${unique}`,
            required: false,
            options: [
                {
                    label: "Option 1",
                    value: "option_1",
                },
                {
                    label: "Option 2",
                    value: "option_2",
                },
            ],
        },

        "radio-group": {
            label: "Choose One",
            name: `radio_${unique}`,
            required: false,
            options: [
                {
                    label: "Option 1",
                    value: "option_1",
                },
                {
                    label: "Option 2",
                    value: "option_2",
                },
            ],
        },

        date: {
            label: "Date",
            name: `date_${unique}`,
            required: false,
        },

        file: {
            label: "File Upload",
            name: `file_${unique}`,
            required: false,
        },
    };

    return {
        id: `${type}-${unique}`,
        type,
        ...defaults[type],
    };
};

/* ==========================================================================
   MAIN PAGE
========================================================================== */

export default function EstimateRequestPage() {
    const [mode, setMode] = useState("list");
    const [editingId, setEditingId] = useState(null);

    const [list, setList] = useState([]);
    const [listLoading, setListLoading] = useState(true);
    const [listError, setListError] = useState("");

    const [step, setStep] = useState(1);

    const [activeSetupTab, setActiveSetupTab] =
        useState("general");

    const [fields, setFields] = useState([
        createField("text"),
        createField("email"),
        createField("textarea"),
    ]);

    const [selectedFieldId, setSelectedFieldId] =
        useState(null);

    const [draggedField, setDraggedField] =
        useState(null);

    const [loading, setLoading] =
        useState(false);

    const [saved, setSaved] =
        useState(false);

    const [error, setError] =
        useState("");

    const [formId, setFormId] =
        useState(null);

    const [publicToken, setPublicToken] =
        useState("");

    const [formUrl, setFormUrl] =
        useState("");

    const [formInfo, setFormInfo] = useState({
        name: "Estimate Request",
        language: "english",
        status: "processing",
        responsible: "",
    });

    const [branding, setBranding] = useState({
        submitButtonText: "Submit",
        buttonBackground: "#84c529",
        buttonTextColor: "#ffffff",
    });

    const [submission, setSubmission] = useState({
        action: "message",
        successMessage: "Thank You",
        redirectUrl: "",
    });

    const [notifications, setNotifications] = useState({
        enabled: true,
        type: "specific_staff",
        staff: [],
        roles: [],
    });

    const selectedField = useMemo(() => {
        return fields.find(
            (field) => field.id === selectedFieldId
        );
    }, [fields, selectedFieldId]);

    const formSlug = useMemo(() => {
        const name =
            formInfo.name || "estimate-request";

        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }, [formInfo.name]);

    const estimateFormUrl  =
        typeof window !== "undefined"
            ? `${window.location.origin}/forms/estimate/${formSlug}`
            : `/forms/estimate/${formSlug}`;

    const iframeCode = `<iframe
  width="600"
  height="850"
  src="${formUrl}"
  frameborder="0"
  sandbox="allow-top-navigation allow-forms allow-scripts allow-same-origin allow-popups"
  allowfullscreen>
</iframe>`;
{formUrl && (
    <>
        <div className="mb-6">
            <label className="form-label font-bold">
                Public Form URL
            </label>

            <div className="flex gap-2">
                <input
                    readOnly
                    value={formUrl}
                    className="form-control w-full"
                />

                <button
                    type="button"
                    className="btn btn-light-primary"
                    onClick={() =>
                        copyToClipboard(formUrl)
                    }
                >
                    <i className="ki-filled ki-copy" />
                </button>

                <a
                    href={formUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                >
                    Open Form
                </a>
            </div>
        </div>
    </>
)}
    /* ----------------------------------------------------------------------
       SELECT FIRST FIELD
    ---------------------------------------------------------------------- */

    useEffect(() => {
        if (
            !selectedFieldId &&
            fields.length > 0
        ) {
            setSelectedFieldId(fields[0].id);
        }

        if (
            selectedFieldId &&
            !fields.some(
                (field) =>
                    field.id === selectedFieldId
            )
        ) {
            setSelectedFieldId(
                fields[0]?.id || null
            );
        }
    }, [fields, selectedFieldId]);

    /* ----------------------------------------------------------------------
       UPDATE FIELD
    ---------------------------------------------------------------------- */

    const updateField = (key, value) => {
        setFields((current) =>
            current.map((field) =>
                field.id === selectedFieldId
                    ? {
                          ...field,
                          [key]: value,
                      }
                    : field
            )
        );
    };

    /* ----------------------------------------------------------------------
       ADD FIELD
    ---------------------------------------------------------------------- */

    const addField = (type) => {
        const field = createField(type);

        setFields((current) => [
            ...current,
            field,
        ]);

        setSelectedFieldId(field.id);
    };

    /* ----------------------------------------------------------------------
       DELETE
    ---------------------------------------------------------------------- */

    const deleteField = (id) => {
        setFields((current) =>
            current.filter(
                (field) => field.id !== id
            )
        );

        if (selectedFieldId === id) {
            setSelectedFieldId(null);
        }
    };

    /* ----------------------------------------------------------------------
       DUPLICATE
    ---------------------------------------------------------------------- */

    const duplicateField = (id) => {
        const source = fields.find(
            (field) => field.id === id
        );

        if (!source) return;

        const copy = {
            ...structuredClone(source),
            id: `${source.type}-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 7)}`,
            name: source.name
                ? `${source.name}_copy`
                : undefined,
        };

        const index = fields.findIndex(
            (field) => field.id === id
        );

        setFields((current) => {
            const result = [...current];

            result.splice(
                index + 1,
                0,
                copy
            );

            return result;
        });

        setSelectedFieldId(copy.id);
    };

    /* ----------------------------------------------------------------------
       MOVE
    ---------------------------------------------------------------------- */

    const moveField = (
        fromIndex,
        toIndex
    ) => {
        if (
            fromIndex === toIndex ||
            fromIndex === null ||
            toIndex === null
        ) {
            return;
        }

        setFields((current) => {
            const result = [...current];

            const [item] =
                result.splice(
                    fromIndex,
                    1
                );

            result.splice(
                toIndex,
                0,
                item
            );

            return result;
        });
    };

    /* ----------------------------------------------------------------------
       OPTIONS
    ---------------------------------------------------------------------- */

    const addOption = () => {
        if (!selectedField) return;

        const options =
            selectedField.options || [];

        updateField("options", [
            ...options,
            {
                label: `Option ${
                    options.length + 1
                }`,
                value: `option_${
                    options.length + 1
                }`,
            },
        ]);
    };

    const updateOption = (
        index,
        key,
        value
    ) => {
        if (!selectedField) return;

        const options = [
            ...(selectedField.options || []),
        ];

        options[index] = {
            ...options[index],
            [key]: value,
        };

        updateField(
            "options",
            options
        );
    };

    const removeOption = (index) => {
        if (!selectedField) return;

        const options = [
            ...(selectedField.options || []),
        ];

        options.splice(index, 1);

        updateField(
            "options",
            options
        );
    };
    const loadForms = async () => {
    try {
        setListLoading(true);
        setListError("");

        const response =
            await fetch(
                "/api/estimate-request",
                {
                    cache: "no-store",
                }
            );

        const data =
            await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                    "Failed to load forms"
            );
        }

        setList(
            data.forms || []
        );
    } catch (err) {
        setListError(
            err.message ||
                "Failed to load forms"
        );
    } finally {
        setListLoading(false);
    }
};

useEffect(() => {
    loadForms();
}, []);
    /* ----------------------------------------------------------------------
       DRAG
    ---------------------------------------------------------------------- */

    const handleDragStart = (
        index
    ) => {
        setDraggedField(index);
    };

    const handleDrop = (index) => {
        if (
            draggedField === null
        ) {
            return;
        }

        moveField(
            draggedField,
            index
        );

        setDraggedField(null);
    };

    /* ----------------------------------------------------------------------
       SAVE
    ---------------------------------------------------------------------- */

    const saveForm = async () => {
    try {
        setLoading(true);
        setError("");
        setSaved(false);

        const payload = {
            id: formId,
            name: formInfo.name,
            slug: formSlug,
            language: formInfo.language,
            status: formInfo.status,
            responsible: formInfo.responsible,
            fields,
            branding,
            submission,
            notifications,
        };

        const response = await fetch("/api/estimate-request", {
            method: formId ? "PUT" : "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to save form"
            );
        }

        setFormId(data.id);
        setPublicToken(data.token);

        const generatedUrl =
            data.url ||
            `${window.location.origin}/forms/quote/${data.token}?styled=1`;

        setFormUrl(generatedUrl);
        setSaved(true);

        setTimeout(() => {
            setSaved(false);
        }, 3000);

    } catch (err) {
        setError(
            err.message || "Something went wrong"
        );
    } finally {
        setLoading(false);
    }
};

    /* ----------------------------------------------------------------------
       COPY
    ---------------------------------------------------------------------- */

    const copyToClipboard =
        async (value) => {
            try {
                await navigator.clipboard.writeText(
                    value
                );

                alert(
                    "Copied to clipboard"
                );
            } catch {
                alert(
                    "Unable to copy"
                );
            }
        };

    /* ----------------------------------------------------------------------
       RENDER
    ---------------------------------------------------------------------- */

    return (
        <div className="flex flex-col gap-6 p-5">

            {/* ==============================================================
                PAGE HEADER
            ============================================================== */}

            <div className="flex flex-wrap items-center justify-between gap-5">

                <div className="flex flex-col gap-1">

                    <h1 className="text-xl font-semibold text-gray-900">
                        Estimate Request
                    </h1>

                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>Forms</span>

                        <i className="ki-filled ki-right text-xs" />

                        <span className="text-gray-700 font-medium">
                            Estimate Request
                        </span>
                    </div>

                </div>

                <div className="flex items-center gap-3">

                    {saved && (
                        <div className="flex items-center gap-2 text-success text-sm font-medium">

                            <i className="ki-filled ki-check-circle" />

                            Saved successfully

                        </div>
                    )}

                    {error && (
                        <div className="text-danger text-sm">
                            {error}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={saveForm}
                        disabled={loading}
                        className="btn btn-primary"
                    >
                        {loading ? (
                            <>
                                <span className="spinner spinner-sm"></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <i className="ki-filled ki-check" />
                                Save Form
                            </>
                        )}
                    </button>

                </div>

            </div>

            {/* ==============================================================
                WIZARD
            ============================================================== */}

            <div className="card">

                <div className="card-body p-4 lg:p-6">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                        <WizardStep
                            number="01"
                            title="Form Builder"
                            description="Create and arrange fields"
                            active={
                                step === 1
                            }
                            completed={
                                step > 1
                            }
                            onClick={() =>
                                setStep(1)
                            }
                        />

                        <WizardStep
                            number="02"
                            title="Form Setup"
                            description="Configure form settings"
                            active={
                                step === 2
                            }
                            completed={
                                step > 2
                            }
                            onClick={() =>
                                setStep(2)
                            }
                        />

                        <WizardStep
                            number="03"
                            title="Integration"
                            description="Embed your form"
                            active={
                                step === 3
                            }
                            completed={false}
                            onClick={() =>
                                setStep(3)
                            }
                        />

                    </div>

                </div>

            </div>

            {/* ==============================================================
                STEP 1
            ============================================================== */}

            {step === 1 && (
                <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_340px] gap-5 items-start">

                    {/* ======================================================
                        FIELD LIBRARY
                    ====================================================== */}

                    <div className="card">

                        <div className="card-header p-5">

                            <div>
                                <h3 className="card-title">
                                    Field Library
                                </h3>

                                <p className="text-xs text-gray-500 mt-1">
                                    Click a field to add it
                                </p>
                            </div>

                        </div>

                        <div className="card-body p-3">

                            <div className="flex flex-col gap-2">

                                {FIELD_TYPES.map(
                                    (item) => (
                                        <button
                                            key={
                                                item.type
                                            }
                                            type="button"
                                            onClick={() =>
                                                addField(
                                                    item.type
                                                )
                                            }
                                            className="group flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:border-primary hover:bg-primary-light transition text-left"
                                        >

                                            <div className="flex items-center justify-center size-9 rounded-lg bg-gray-100 group-hover:bg-primary group-hover:text-white transition">

                                                <i
                                                    className={
                                                        item.icon
                                                    }
                                                />

                                            </div>

                                            <div className="flex flex-col min-w-0">

                                                <span className="text-sm font-semibold text-gray-800 group-hover:text-primary">
                                                    {
                                                        item.label
                                                    }
                                                </span>

                                                <span className="text-xs text-gray-500 truncate">
                                                    {
                                                        item.description
                                                    }
                                                </span>

                                            </div>

                                        </button>
                                    )
                                )}

                            </div>

                        </div>

                    </div>

                    {/* ======================================================
                        FORM CANVAS
                    ====================================================== */}

                    <div className="card">

                        <div className="card-header">

                            <div className="flex flex-col gap-1">

                                <div className="flex items-center gap-2">

                                    <h3 className="card-title">
                                        Form Builder
                                    </h3>

                                    <span className="badge badge-sm badge-light-primary">
                                        {
                                            fields.length
                                        } fields
                                    </span>

                                </div>

                                <p className="text-xs text-gray-500">
                                    Drag fields to change their
                                    order. Select a field to edit
                                    its settings.
                                </p>

                            </div>

                            <button
                                type="button"
                                className="btn btn-sm btn-light-primary"
                                onClick={() =>
                                    addField(
                                        "text"
                                    )
                                }
                            >
                                <i className="ki-filled ki-plus" />
                                Add Field
                            </button>

                        </div>

                        <div className="card-body bg-gray-50/70 min-h-[650px]">

                            {fields.length ===
                            0 ? (
                                <div className="min-h-[550px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center">

                                    <div className="size-14 rounded-full bg-primary-light flex items-center justify-center mb-4">

                                        <i className="ki-filled ki-plus text-2xl text-primary" />

                                    </div>

                                    <h3 className="text-base font-semibold text-gray-800">
                                        Your form is empty
                                    </h3>

                                    <p className="text-sm text-gray-500 mt-1 text-center max-w-sm">
                                        Choose a field from
                                        the Field Library
                                        to start building
                                        your form.
                                    </p>

                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">

                                    {fields.map(
                                        (
                                            field,
                                            index
                                        ) => (
                                            <BuilderField
                                                key={
                                                    field.id
                                                }
                                                field={
                                                    field
                                                }
                                                index={
                                                    index
                                                }
                                                selected={
                                                    selectedFieldId ===
                                                    field.id
                                                }
                                                onSelect={() =>
                                                    setSelectedFieldId(
                                                        field.id
                                                    )
                                                }
                                                onDelete={() =>
                                                    deleteField(
                                                        field.id
                                                    )
                                                }
                                                onDuplicate={() =>
                                                    duplicateField(
                                                        field.id
                                                    )
                                                }
                                                onDragStart={() =>
                                                    handleDragStart(
                                                        index
                                                    )
                                                }
                                                onDrop={() =>
                                                    handleDrop(
                                                        index
                                                    )
                                                }
                                            />
                                        )
                                    )}

                                </div>
                            )}

                        </div>

                        <div className="card-footer flex items-center justify-between">

                            <button
                                type="button"
                                className="btn btn-light"
                                disabled
                            >
                                <i className="ki-filled ki-left" />
                                Previous
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() =>
                                    setStep(2)
                                }
                            >
                                Continue
                                <i className="ki-filled ki-right" />
                            </button>

                        </div>

                    </div>

                    {/* ======================================================
                        FIELD SETTINGS
                    ====================================================== */}

                    <div className="xl:sticky xl:top-24">

                        <FieldEditor
                            field={
                                selectedField
                            }
                            updateField={
                                updateField
                            }
                            addOption={
                                addOption
                            }
                            updateOption={
                                updateOption
                            }
                            removeOption={
                                removeOption
                            }
                        />

                    </div>

                </div>
            )}

            {/* ==============================================================
                STEP 2
            ============================================================== */}

            {step === 2 && (
                <div className="card">

                    <div className="card-header p-5">

                        <div>

                            <h3 className="card-title">
                                Form Information & Setup
                            </h3>

                            <p className="text-xs text-gray-500 mt-1">
                                Configure how your estimate
                                request form behaves.
                            </p>

                        </div>

                    </div>

                    <div className="card-body p-0">

                        {/* TABS */}

                        <div className="border-b border-gray-200 px-5 lg:px-7">

                            <div className="flex flex-wrap gap-6">

                                {[
                                    [
                                        "general",
                                        "General",
                                        "ki-setting-2",
                                    ],
                                    [
                                        "branding",
                                        "Appearance",
                                        "ki-brush",
                                    ],
                                    [
                                        "submission",
                                        "Submission",
                                        "ki-check-circle",
                                    ],
                                    [
                                        "notifications",
                                        "Notifications",
                                        "ki-notification-on",
                                    ],
                                ].map(
                                    ([
                                        id,
                                        label,
                                        icon,
                                    ]) => (
                                        <button
                                            key={
                                                id
                                            }
                                            type="button"
                                            onClick={() =>
                                                setActiveSetupTab(
                                                    id
                                                )
                                            }
                                            className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 ${
                                                activeSetupTab ===
                                                id
                                                    ? "border-primary text-primary"
                                                    : "border-transparent text-gray-500 hover:text-gray-800"
                                            }`}
                                        >

                                            <i
                                                className={`ki-filled ${icon}`}
                                            />

                                            {
                                                label
                                            }

                                        </button>
                                    )
                                )}

                            </div>

                        </div>

                        <div className="p-5 lg:p-7">

                            {/* GENERAL */}

                            {activeSetupTab ===
                                "general" && (
                                <div className="max-w-3xl">

                                    <SectionTitle
                                        title="General Information"
                                        description="Basic information used to identify your form."
                                    />

                                    <div className="grid gap-5">

                                        <FormInput
                                            label="Form Name"
                                            required
                                            value={
                                                formInfo.name
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setFormInfo(
                                                    {
                                                        ...formInfo,
                                                        name: e
                                                            .target
                                                            .value,
                                                    }
                                                )
                                            }
                                        />

                                        <FormSelect
                                            label="Language"
                                            required
                                            value={
                                                formInfo.language
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setFormInfo(
                                                    {
                                                        ...formInfo,
                                                        language:
                                                            e
                                                                .target
                                                                .value,
                                                    }
                                                )
                                            }
                                            options={[
                                                [
                                                    "english",
                                                    "English",
                                                ],
                                                [
                                                    "french",
                                                    "French",
                                                ],
                                                [
                                                    "german",
                                                    "German",
                                                ],
                                                [
                                                    "spanish",
                                                    "Spanish",
                                                ],
                                            ]}
                                        />

                                        <FormSelect
                                            label="Status"
                                            required
                                            value={
                                                formInfo.status
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setFormInfo(
                                                    {
                                                        ...formInfo,
                                                        status:
                                                            e
                                                                .target
                                                                .value,
                                                    }
                                                )
                                            }
                                            options={[
                                                [
                                                    "0",
                                                    "Processing",
                                                ],
                                                [
                                                    "1",
                                                    "Completed",
                                                ],
                                                [
                                                    "2",
                                                    "Cancelled",
                                                ],
                                            ]}
                                        />

                                        <FormInput
                                            label="Responsible"
                                            placeholder="Select responsible person"
                                            value={
                                                formInfo.responsible
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setFormInfo(
                                                    {
                                                        ...formInfo,
                                                        responsible:
                                                            e
                                                                .target
                                                                .value,
                                                    }
                                                )
                                            }
                                        />

                                    </div>

                                </div>
                            )}

                            {/* BRANDING */}

                            {activeSetupTab ===
                                "branding" && (
                                <div className="max-w-3xl">

                                    <SectionTitle
                                        title="Appearance"
                                        description="Customize the appearance of your form submit button."
                                    />

                                    <div className="grid gap-5">

                                        <FormInput
                                            label="Submit Button Text"
                                            required
                                            value={
                                                branding.submitButtonText
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setBranding(
                                                    {
                                                        ...branding,
                                                        submitButtonText:
                                                            e
                                                                .target
                                                                .value,
                                                    }
                                                )
                                            }
                                        />

                                        <div className="grid md:grid-cols-2 gap-5">

                                            <ColorInput
                                                label="Button Background"
                                                value={
                                                    branding.buttonBackground
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    setBranding(
                                                        {
                                                            ...branding,
                                                            buttonBackground:
                                                                value,
                                                        }
                                                    )
                                                }
                                            />

                                            <ColorInput
                                                label="Button Text Color"
                                                value={
                                                    branding.buttonTextColor
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    setBranding(
                                                        {
                                                            ...branding,
                                                            buttonTextColor:
                                                                value,
                                                        }
                                                    )
                                                }
                                            />

                                        </div>

                                        <div className="card bg-gray-50">

                                            <div className="card-body">

                                                <div className="text-sm font-semibold text-gray-800 mb-4">
                                                    Button Preview
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn"
                                                    style={{
                                                        backgroundColor:
                                                            branding.buttonBackground,
                                                        color: branding.buttonTextColor,
                                                    }}
                                                >
                                                    {
                                                        branding.submitButtonText
                                                    }
                                                </button>

                                            </div>

                                        </div>

                                    </div>

                                </div>
                            )}

                            {/* SUBMISSION */}

                            {activeSetupTab ===
                                "submission" && (
                                <div className="max-w-3xl">

                                    <SectionTitle
                                        title="Submission Settings"
                                        description="Choose what happens after a visitor submits the form."
                                    />

                                    <div className="flex flex-col gap-3">

                                        <RadioCard
                                            checked={
                                                submission.action ===
                                                "message"
                                            }
                                            title="Display thank you message"
                                            description="Show a success message after submission."
                                            onChange={() =>
                                                setSubmission(
                                                    {
                                                        ...submission,
                                                        action: "message",
                                                    }
                                                )
                                            }
                                        />

                                        <RadioCard
                                            checked={
                                                submission.action ===
                                                "redirect"
                                            }
                                            title="Redirect to another website"
                                            description="Send the visitor to a custom URL."
                                            onChange={() =>
                                                setSubmission(
                                                    {
                                                        ...submission,
                                                        action: "redirect",
                                                    }
                                                )
                                            }
                                        />

                                    </div>

                                    <div className="mt-6">

                                        {submission.action ===
                                            "message" ? (
                                            <FormTextarea
                                                label="Success Message"
                                                required
                                                value={
                                                    submission.successMessage
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setSubmission(
                                                        {
                                                            ...submission,
                                                            successMessage:
                                                                e
                                                                    .target
                                                                    .value,
                                                        }
                                                    )
                                                }
                                            />
                                        ) : (
                                            <FormInput
                                                label="Redirect URL"
                                                type="url"
                                                placeholder="https://example.com/thank-you"
                                                value={
                                                    submission.redirectUrl
                                                }
                                                onChange={(
                                                    e
                                                ) =>
                                                    setSubmission(
                                                        {
                                                            ...submission,
                                                            redirectUrl:
                                                                e
                                                                    .target
                                                                    .value,
                                                        }
                                                    )
                                                }
                                            />
                                        )}

                                    </div>

                                </div>
                            )}

                            {/* NOTIFICATIONS */}

                            {activeSetupTab ===
                                "notifications" && (
                                <div className="max-w-3xl">

                                    <SectionTitle
                                        title="Notifications"
                                        description="Configure who receives notifications for new submissions."
                                    />

                                    <div className="card border border-gray-200">

                                        <div className="card-body">

                                            <Toggle
                                                checked={
                                                    notifications.enabled
                                                }
                                                label="Enable email notifications"
                                                onChange={(
                                                    checked
                                                ) =>
                                                    setNotifications(
                                                        {
                                                            ...notifications,
                                                            enabled:
                                                                checked,
                                                        }
                                                    )
                                                }
                                            />

                                        </div>

                                    </div>

                                    {notifications.enabled && (
                                        <div className="mt-5">

                                            <label className="form-label font-bold">
                                                Notification Type
                                            </label>

                                            <div className="flex flex-col gap-3">

                                                <RadioCard
                                                    checked={
                                                        notifications.type ===
                                                        "specific_staff"
                                                    }
                                                    title="Specific Staff Members"
                                                    description="Notify selected staff members."
                                                    onChange={() =>
                                                        setNotifications(
                                                            {
                                                                ...notifications,
                                                                type: "specific_staff",
                                                            }
                                                        )
                                                    }
                                                />

                                                <RadioCard
                                                    checked={
                                                        notifications.type ===
                                                        "roles"
                                                    }
                                                    title="Staff Members with Roles"
                                                    description="Notify staff based on their role."
                                                    onChange={() =>
                                                        setNotifications(
                                                            {
                                                                ...notifications,
                                                                type: "roles",
                                                            }
                                                        )
                                                    }
                                                />

                                                <RadioCard
                                                    checked={
                                                        notifications.type ===
                                                        "assigned"
                                                    }
                                                    title="Responsible Person"
                                                    description="Notify the responsible person."
                                                    onChange={() =>
                                                        setNotifications(
                                                            {
                                                                ...notifications,
                                                                type: "assigned",
                                                            }
                                                        )
                                                    }
                                                />

                                            </div>

                                        </div>
                                    )}

                                </div>
                            )}

                        </div>

                    </div>

                    <div className="card-footer flex items-center justify-between">

                        <button
                            type="button"
                            className="btn btn-light"
                            onClick={() =>
                                setStep(1)
                            }
                        >
                            <i className="ki-filled ki-left" />
                            Previous
                        </button>

                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() =>
                                setStep(3)
                            }
                        >
                            Continue
                            <i className="ki-filled ki-right" />
                        </button>

                    </div>

                </div>
            )}

            {/* ==============================================================
                STEP 3
            ============================================================== */}

            {step === 3 && (
                <div className="grid grid-cols-1 w-full gap-5">

                    {/* INTEGRATION */}

                    <div className="card">

                        <div className="card-header">

                            <div>

                                <h3 className="card-title">
                                    Integration Code
                                </h3>

                                <p className="text-xs text-gray-500 mt-1">
                                    Copy the iframe code and add it
                                    to your website.
                                </p>

                            </div>

                            <span className="badge badge-light-success">
                                Ready
                            </span>

                        </div>

                        <div className="card-body p-5 lg:p-7">

                            <div className="mb-6">

                                <div className="flex items-center justify-between mb-2">

                                    <label className="form-label mb-0">
                                        Iframe Code
                                    </label>

                                    <button
                                        type="button"
                                        className="btn btn-sm btn-light-primary"
                                        onClick={() =>
                                            copyToClipboard(
                                                iframeCode
                                            )
                                        }
                                    >
                                        <i className="ki-filled ki-copy" />
                                        Copy
                                    </button>

                                </div>

                                <textarea
                                    readOnly
                                    rows={10}
                                    value={
                                        iframeCode
                                    }
                                    className="form-control font-mono text-xs w-full    "
                                />

                            </div>

                            <div>

                                <label className="form-label">
                                    Direct Form URL
                                </label>

                                <div className="flex gap-2">

                                    <input
                                        readOnly
                                        value={
                                            formUrl
                                        }
                                        className="form-control"
                                    />

                                    <button
                                        type="button"
                                        className="btn btn-light-primary"
                                        onClick={() =>
                                            copyToClipboard(
                                                formUrl
                                            )
                                        }
                                    >
                                        <i className="ki-filled ki-copy" />
                                    </button>

                                </div>

                            </div>

                        </div>

                        <div className="card-footer flex justify-between">

                            <button
                                type="button"
                                className="btn btn-light"
                                onClick={() =>
                                    setStep(2)
                                }
                            >
                                <i className="ki-filled ki-left" />
                                Previous
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={saveForm}
                                disabled={loading}
                            >
                                <i className="ki-filled ki-check" />
                                {loading
                                    ? "Saving..."
                                    : "Save Form"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

/* ==========================================================================
   WIZARD STEP
========================================================================== */

function WizardStep({
    number,
    title,
    description,
    active,
    completed,
    onClick,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`group flex items-center gap-4 p-4 rounded-xl border text-left transition ${
                active
                    ? "border-primary bg-primary-light"
                    : completed
                    ? "border-success bg-success-light"
                    : "border-gray-200 bg-white hover:border-primary"
            }`}
        >

            <div
                className={`size-11 rounded-full flex items-center justify-center shrink-0 font-semibold ${
                    completed
                        ? "bg-success text-white"
                        : active
                        ? "bg-primary text-white"
                        : "bg-gray-200 text-gray-600"
                }`}
            >
                {completed ? (
                    <i className="ki-filled ki-check" />
                ) : (
                    number
                )}
            </div>

            <div className="flex flex-col">

                <span
                    className={`text-sm font-semibold ${
                        active
                            ? "text-primary"
                            : "text-gray-800"
                    }`}
                >
                    {title}
                </span>

                <span className="text-xs text-gray-500 mt-1">
                    {description}
                </span>

            </div>

        </button>
    );
}

/* ==========================================================================
   BUILDER FIELD
========================================================================== */

function BuilderField({
    field,
    selected,
    onSelect,
    onDelete,
    onDuplicate,
    onDragStart,
    onDrop,
}) {
    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={(e) =>
                e.preventDefault()
            }
            onDrop={onDrop}
            onClick={onSelect}
            className={`group relative bg-white rounded-xl border-2 p-4 cursor-pointer transition ${
                selected
                    ? "border-primary shadow-md"
                    : "border-gray-200 hover:border-gray-300"
            }`}
        >

            {/* TOP BAR */}

            <div className="flex items-center justify-between gap-3 mb-4">

                <div className="flex items-center gap-3">

                    <div className="cursor-grab text-gray-400">

                        <i className="ki-filled ki-menu text-lg" />

                    </div>

                    <span
                        className={`badge badge-sm ${
                            selected
                                ? "badge-light-primary"
                                : "badge-light"
                        }`}
                    >
                        {field.type}
                    </span>

                </div>

                <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100">

                    <button
                        type="button"
                        className="btn btn-xs btn-icon btn-light"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate();
                        }}
                        title="Duplicate"
                    >
                        <i className="ki-filled ki-copy" />
                    </button>

                    <button
                        type="button"
                        className="btn btn-xs btn-icon btn-light-danger"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                        title="Delete"
                    >
                        <i className="ki-filled ki-trash" />
                    </button>

                </div>

            </div>

            {/* FIELD */}

            <FieldPreview field={field} />

        </div>
    );
}

/* ==========================================================================
   FIELD PREVIEW
========================================================================== */

function FieldPreview({
    field,
}) {
    if (field.type === "header") {
        return (
            <div>

                <h3 className="text-lg font-semibold text-gray-900">
                    {field.text}
                </h3>

            </div>
        );
    }

    if (field.type === "paragraph") {
        return (
            <p className="text-sm text-gray-600 leading-6">
                {field.text}
            </p>
        );
    }

    return (
        <div>

            <label className="form-label font-bold">

                {field.label}

                {field.required && (
                    <span className="text-danger ms-1">
                        *
                    </span>
                )}

            </label>

            {field.type ===
                "textarea" && (
                <textarea
                    disabled
                    rows={
                        field.rows ||
                        4
                    }
                    placeholder={
                        field.placeholder
                    }
                    className="form-control"
                />
            )}

            {field.type ===
                "select" && (
                <select
                    disabled
                    className="form-control"
                >
                    <option>
                        {field.placeholder ||
                            "Select an option"}
                    </option>

                    {(
                        field.options ||
                        []
                    ).map(
                        (
                            option,
                            index
                        ) => (
                            <option
                                key={
                                    index
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
            )}

            {field.type ===
                "checkbox-group" && (
                <div className="flex flex-col gap-2">

                    {(
                        field.options ||
                        []
                    ).map(
                        (
                            option,
                            index
                        ) => (
                            <label
                                key={
                                    index
                                }
                                className="flex items-center gap-2 text-sm text-gray-700"
                            >
                                <input
                                    type="checkbox"
                                    disabled
                                    className="checkbox"
                                />

                                {
                                    option.label
                                }

                            </label>
                        )
                    )}

                </div>
            )}

            {field.type ===
                "radio-group" && (
                <div className="flex flex-col gap-2">

                    {(
                        field.options ||
                        []
                    ).map(
                        (
                            option,
                            index
                        ) => (
                            <label
                                key={
                                    index
                                }
                                className="flex items-center gap-2 text-sm text-gray-700"
                            >

                                <input
                                    type="radio"
                                    disabled
                                    className="radio"
                                />

                                {
                                    option.label
                                }

                            </label>
                        )
                    )}

                </div>
            )}

            {field.type ===
                "file" && (
                <input
                    disabled
                    type="file"
                    className="form-control"
                />
            )}

            {field.type ===
                "date" && (
                <input
                    disabled
                    type="date"
                    className="form-control"
                />
            )}

            {(field.type ===
                "text" ||
                field.type ===
                    "email") && (
                <input
                    disabled
                    type={
                        field.type
                    }
                    placeholder={
                        field.placeholder
                    }
                    className="form-control"
                />
            )}

            {field.helpText && (
                <p className="text-xs text-gray-500 mt-2">
                    {
                        field.helpText
                    }
                </p>
            )}

        </div>
    );
}

/* ==========================================================================
   FIELD EDITOR
========================================================================== */

function FieldEditor({
    field,
    updateField,
    addOption,
    updateOption,
    removeOption,
}) {
    if (!field) {
        return (
            <div className="card">

                <div className="card-header">

                    <h3 className="card-title">
                        Field Settings
                    </h3>

                </div>

                <div className="card-body min-h-[300px] flex flex-col items-center justify-center text-center">

                    <div className="size-14 rounded-xl bg-gray-100 flex items-center justify-center mb-4">

                        <i className="ki-filled ki-setting-2 text-2xl text-gray-500" />

                    </div>

                    <h4 className="text-sm font-semibold text-gray-800">
                        No field selected
                    </h4>

                    <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
                        Select a field from the
                        form builder to edit
                        its settings.
                    </p>

                </div>

            </div>
        );
    }

    const isContentField =
        ["header", "paragraph"].includes(
            field.type
        );

    return (
        <div className="card">

            <div className="card-header">

                <div>

                    <h3 className="card-title">
                        Field Settings
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                        Edit the selected field.
                    </p>

                </div>

                <span className="badge badge-light-primary">
                    {field.type}
                </span>

            </div>

            <div className="card-body">

                {isContentField ? (
                    <FormTextarea
                        label={
                            field.type ===
                            "header"
                                ? "Heading"
                                : "Paragraph"
                        }
                        rows={
                            field.type ===
                            "header"
                                ? 3
                                : 5
                        }
                        value={
                            field.text ||
                            ""
                        }
                        onChange={(e) =>
                            updateField(
                                "text",
                                e.target
                                    .value
                            )
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-5">

                        <FormInput
                            label="Label"
                            value={
                                field.label ||
                                ""
                            }
                            onChange={(
                                e
                            ) =>
                                updateField(
                                    "label",
                                    e.target
                                        .value
                                )
                            }
                        />

                        <FormInput
                            label="Field Name"
                            value={
                                field.name ||
                                ""
                            }
                            onChange={(
                                e
                            ) =>
                                updateField(
                                    "name",
                                    e.target
                                        .value
                                )
                            }
                        />

                        <FormInput
                            label="Placeholder"
                            value={
                                field.placeholder ||
                                ""
                            }
                            onChange={(
                                e
                            ) =>
                                updateField(
                                    "placeholder",
                                    e.target
                                        .value
                                )
                            }
                        />

                        <FormInput
                            label="Help Text"
                            value={
                                field.helpText ||
                                ""
                            }
                            onChange={(
                                e
                            ) =>
                                updateField(
                                    "helpText",
                                    e.target
                                        .value
                                )
                            }
                        />

                        <div className="separator" />

                        <Toggle
                            checked={Boolean(
                                field.required
                            )}
                            label="Required Field"
                            description="Visitor must complete this field."
                            onChange={(
                                checked
                            ) =>
                                updateField(
                                    "required",
                                    checked
                                )
                            }
                        />

                        {field.type ===
                            "textarea" && (
                            <>
                                <FormInput
                                    label="Rows"
                                    type="number"
                                    value={
                                        field.rows ||
                                        4
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        updateField(
                                            "rows",
                                            Number(
                                                e
                                                    .target
                                                    .value
                                            )
                                        )
                                    }
                                />

                                <FormInput
                                    label="Maximum Length"
                                    type="number"
                                    value={
                                        field.maxlength ||
                                        ""
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        updateField(
                                            "maxlength",
                                            Number(
                                                e
                                                    .target
                                                    .value
                                            )
                                        )
                                    }
                                />
                            </>
                        )}

                        {[
                            "select",
                            "checkbox-group",
                            "radio-group",
                        ].includes(
                            field.type
                        ) && (
                            <div>

                                <div className="flex items-center justify-between mb-3">

                                    <label className="form-label mb-0">
                                        Options
                                    </label>

                                    <button
                                        type="button"
                                        className="btn btn-xs btn-light-primary"
                                        onClick={
                                            addOption
                                        }
                                    >
                                        <i className="ki-filled ki-plus" />
                                        Add Option
                                    </button>

                                </div>

                                <div className="flex flex-col gap-2">

                                    {(
                                        field.options ||
                                        []
                                    ).map(
                                        (
                                            option,
                                            index
                                        ) => (
                                            <div
                                                key={
                                                    index
                                                }
                                                className="flex gap-2"
                                            >

                                                <input
                                                    value={
                                                        option.label
                                                    }
                                                    onChange={(
                                                        e
                                                    ) =>
                                                        updateOption(
                                                            index,
                                                            "label",
                                                            e
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    className="form-control"
                                                    placeholder="Label"
                                                />

                                                <input
                                                    value={
                                                        option.value
                                                    }
                                                    onChange={(
                                                        e
                                                    ) =>
                                                        updateOption(
                                                            index,
                                                            "value",
                                                            e
                                                                .target
                                                                .value
                                                        )
                                                    }
                                                    className="form-control"
                                                    placeholder="Value"
                                                />

                                                <button
                                                    type="button"
                                                    className="btn btn-icon btn-light-danger"
                                                    onClick={() =>
                                                        removeOption(
                                                            index
                                                        )
                                                    }
                                                >
                                                    <i className="ki-filled ki-trash" />
                                                </button>

                                            </div>
                                        )
                                    )}

                                </div>

                            </div>
                        )}

                    </div>
                )}

            </div>

        </div>
    );
}

/* ==========================================================================
   SECTION TITLE
========================================================================== */

function SectionTitle({
    title,
    description,
}) {
    return (
        <div className="mb-6">

            <h4 className="text-base font-semibold text-gray-900">
                {title}
            </h4>

            <p className="text-xs text-gray-500 mt-1">
                {description}
            </p>

        </div>
    );
}

/* ==========================================================================
   FORM INPUT
========================================================================== */

function FormInput({
    label,
    required,
    value,
    onChange,
    placeholder,
    type = "text",
}) {
    return (
        <div>

            <label className="form-label font-bold">

                {label}

                {required && (
                    <span className="text-danger ms-1">
                        *
                    </span>
                )}

            </label>

            <input
                type={type}
                value={
                    value ?? ""
                }
                onChange={onChange}
                placeholder={
                    placeholder
                }
                className="form-control"
            />

        </div>
    );
}

/* ==========================================================================
   FORM TEXTAREA
========================================================================== */

function FormTextarea({
    label,
    required,
    value,
    onChange,
    rows = 4,
}) {
    return (
        <div>

            <label className="form-label font-bold">

                {label}

                {required && (
                    <span className="text-danger ms-1">
                        *
                    </span>
                )}

            </label>

            <textarea
                rows={rows}
                value={
                    value ?? ""
                }
                onChange={onChange}
                className="form-control"
            />

        </div>
    );
}

/* ==========================================================================
   SELECT
========================================================================== */

function FormSelect({
    label,
    required,
    value,
    onChange,
    options,
}) {
    return (
        <div>

            <label className="form-label font-bold">

                {label}

                {required && (
                    <span className="text-danger ms-1">
                        *
                    </span>
                )}

            </label>

            <select
                value={value}
                onChange={onChange}
                className="form-select"
            >

                {options.map(
                    ([
                        optionValue,
                        optionLabel,
                    ]) => (
                        <option
                            key={
                                optionValue
                            }
                            value={
                                optionValue
                            }
                        >
                            {
                                optionLabel
                            }
                        </option>
                    )
                )}

            </select>

        </div>
    );
}

/* ==========================================================================
   COLOR INPUT
========================================================================== */

function ColorInput({
    label,
    value,
    onChange,
}) {
    return (
        <div>

            <label className="form-label font-bold">
                {label}
            </label>

            <div className="flex items-center gap-2">

                <input
                    type="color"
                    value={
                        value
                    }
                    onChange={(e) =>
                        onChange(
                            e.target
                                .value
                        )
                    }
                    className="size-10 rounded-lg border border-gray-300 cursor-pointer p-1"
                />

                <input
                    type="text"
                    value={
                        value
                    }
                    onChange={(e) =>
                        onChange(
                            e.target
                                .value
                        )
                    }
                    className="form-control"
                />

            </div>

        </div>
    );
}

/* ==========================================================================
   TOGGLE
========================================================================== */

function Toggle({
    checked,
    label,
    description,
    onChange,
}) {
    return (
        <div className="flex items-center justify-between gap-5">

            <div>

                <div className="text-sm font-semibold text-gray-800">
                    {label}
                </div>

                {description && (
                    <div className="text-xs text-gray-500 mt-1">
                        {
                            description
                        }
                    </div>
                )}

            </div>

            <label className="switch">

                <input
                    type="checkbox"
                    checked={
                        checked
                    }
                    onChange={(e) =>
                        onChange(
                            e.target
                                .checked
                        )
                    }
                />

                <span />

            </label>

        </div>
    );
}

/* ==========================================================================
   RADIO CARD
========================================================================== */

function RadioCard({
    checked,
    title,
    description,
    onChange,
}) {
    return (
        <label
            className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                checked
                    ? "border-primary bg-primary-light"
                    : "border-gray-200 hover:border-gray-300"
            }`}
        >

            <input
                type="radio"
                checked={
                    checked
                }
                onChange={
                    onChange
                }
                className="radio mt-1"
            />

            <div>

                <div className="text-sm font-semibold text-gray-800">
                    {title}
                </div>

                <div className="text-xs text-gray-500 mt-1">
                    {
                        description
                    }
                </div>

            </div>

        </label>
    );
}

/* ==========================================================================
   PREVIEW
========================================================================== */

function PreviewForm({
    fields,
    branding,
}) {
    return (
        <div className="flex flex-col gap-5">

            {fields.map(
                (field) => (
                    <div
                        key={
                            field.id
                        }
                    >

                        <FieldPreview
                            field={
                                field
                            }
                        />

                    </div>
                )
            )}

            <button
                type="button"
                className="btn justify-center"
                style={{
                    backgroundColor:
                        branding.buttonBackground,
                    color:
                        branding.buttonTextColor,
                }}
            >
                {
                    branding.submitButtonText
                }
            </button>

        </div>
    );
}