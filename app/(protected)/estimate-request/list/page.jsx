"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
            name: `email_${unique}`,
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
   DEFAULT VALUES
========================================================================== */

const getDefaultFields = () => [
    createField("text"),
    createField("email"),
    createField("textarea"),
];

const DEFAULT_FORM_INFO = {
    name: "Estimate Request",
    language: "english",
    status: "processing",
    responsible: "",
};

const DEFAULT_BRANDING = {
    submitButtonText: "Submit",
    buttonBackground: "#84c529",
    buttonTextColor: "#ffffff",
};

const DEFAULT_SUBMISSION = {
    action: "message",
    successMessage: "Thank You",
    redirectUrl: "",
};

const DEFAULT_NOTIFICATIONS = {
    enabled: true,
    type: "specific_staff",
    staff: [],
    roles: [],
};

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
            className={`flex items-center gap-4 p-4 rounded-xl border text-left transition ${
                active
                    ? "border-primary bg-primary-light"
                    : completed
                    ? "border-success bg-success-light"
                    : "border-gray-200 bg-white hover:border-primary"
            }`}
        >
            <div
                className={`size-11 rounded-full flex items-center justify-center shrink-0 font-semibold ${
                    active
                        ? "bg-primary text-white"
                        : completed
                        ? "bg-success text-white"
                        : "bg-gray-100 text-gray-600"
                }`}
            >
                {completed ? (
                    <i className="ki-filled ki-check" />
                ) : (
                    number
                )}
            </div>

            <div className="flex flex-col min-w-0">
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
    index,
    selected,
    onSelect,
    onDelete,
    onDuplicate,
    onDragStart,
    onDrop,
}) {
    const fieldType = FIELD_TYPES.find(
        (item) => item.type === field.type
    );

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={onSelect}
            className={`group rounded-xl border bg-white p-4 cursor-pointer transition ${
                selected
                    ? "border-primary ring-1 ring-primary"
                    : "border-gray-200 hover:border-primary"
            }`}
        >
            <div className="flex items-center gap-3">

                <div
                    className="cursor-grab text-gray-400"
                    title="Drag to reorder"
                >
                    <i className="ki-filled ki-menu" />
                </div>

                <div className="size-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <i
                        className={
                            fieldType?.icon ||
                            "ki-filled ki-pencil"
                        }
                    />
                </div>

                <div className="flex-1 min-w-0">

                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-800">
                            {field.label || field.type}
                        </span>

                        {field.required && (
                            <span className="text-danger">
                                *
                            </span>
                        )}
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                        {fieldType?.label || field.type}

                        {field.name && (
                            <>
                                {" "}
                                · {field.name}
                            </>
                        )}
                    </div>

                </div>

                <div className="flex items-center gap-1">

                    <button
                        type="button"
                        className="btn btn-sm btn-icon btn-light"
                        title="Duplicate"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate();
                        }}
                    >
                        <i className="ki-filled ki-copy" />
                    </button>

                    <button
                        type="button"
                        className="btn btn-sm btn-icon btn-light-danger"
                        title="Delete"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                        }}
                    >
                        <i className="ki-filled ki-trash" />
                    </button>

                </div>
            </div>

            {field.placeholder && (
                <div className="mt-3 ml-14 text-xs text-gray-400">
                    Placeholder: {field.placeholder}
                </div>
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
                <div className="card-body p-5">
                    <div className="text-center py-10">
                        <i className="ki-filled ki-pencil text-3xl text-gray-400" />

                        <p className="text-sm text-gray-500 mt-3">
                            Select a field to edit its settings.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const optionFields = [
        "select",
        "checkbox-group",
        "radio-group",
    ];

    return (
        <div className="card">

            <div className="card-header">
                <div>
                    <h3 className="card-title">
                        Field Settings
                    </h3>

                    <p className="text-xs text-gray-500 mt-1">
                        Edit selected field
                    </p>
                </div>

                <span className="badge badge-light-primary">
                    {field.type}
                </span>
            </div>

            <div className="card-body p-5">

                <div className="flex flex-col gap-5">

                    <FormInput
                        label="Label"
                        value={field.label || ""}
                        onChange={(e) =>
                            updateField(
                                "label",
                                e.target.value
                            )
                        }
                    />

                    {["header", "paragraph"].includes(
                        field.type
                    ) ? (
                        <FormTextarea
                            label="Text"
                            value={field.text || ""}
                            rows={5}
                            onChange={(e) =>
                                updateField(
                                    "text",
                                    e.target.value
                                )
                            }
                        />
                    ) : (
                        <>
                            <FormInput
                                label="Field Name"
                                value={field.name || ""}
                                onChange={(e) =>
                                    updateField(
                                        "name",
                                        e.target.value
                                    )
                                }
                            />

                            {field.type !== "file" && (
                                <FormInput
                                    label="Placeholder"
                                    value={
                                        field.placeholder ||
                                        ""
                                    }
                                    onChange={(e) =>
                                        updateField(
                                            "placeholder",
                                            e.target.value
                                        )
                                    }
                                />
                            )}

                            <FormTextarea
                                label="Help Text"
                                value={
                                    field.helpText || ""
                                }
                                rows={3}
                                onChange={(e) =>
                                    updateField(
                                        "helpText",
                                        e.target.value
                                    )
                                }
                            />

                            {[
                                "text",
                                "email",
                                "textarea",
                                "select",
                                "checkbox-group",
                                "radio-group",
                                "date",
                                "file",
                            ].includes(field.type) && (
                                <Toggle
                                    checked={
                                        Boolean(
                                            field.required
                                        )
                                    }
                                    label="Required field"
                                    onChange={(checked) =>
                                        updateField(
                                            "required",
                                            checked
                                        )
                                    }
                                />
                            )}

                            {field.type === "textarea" && (
                                <div className="grid grid-cols-2 gap-3">
                                    <FormInput
                                        label="Rows"
                                        type="number"
                                        value={
                                            field.rows || 4
                                        }
                                        onChange={(e) =>
                                            updateField(
                                                "rows",
                                                Number(
                                                    e.target.value
                                                )
                                            )
                                        }
                                    />

                                    <FormInput
                                        label="Max Length"
                                        type="number"
                                        value={
                                            field.maxlength ||
                                            ""
                                        }
                                        onChange={(e) =>
                                            updateField(
                                                "maxlength",
                                                Number(
                                                    e.target.value
                                                )
                                            )
                                        }
                                    />
                                </div>
                            )}
                        </>
                    )}

                    {optionFields.includes(
                        field.type
                    ) && (
                        <div>

                            <div className="flex items-center justify-between mb-3">
                                <label className="form-label mb-0">
                                    Options
                                </label>

                                <button
                                    type="button"
                                    className="btn btn-sm btn-light-primary"
                                    onClick={addOption}
                                >
                                    <i className="ki-filled ki-plus" />
                                    Add
                                </button>
                            </div>

                            <div className="flex flex-col gap-3">

                                {(field.options || []).map(
                                    (option, index) => (
                                        <div
                                            key={index}
                                            className="flex gap-2"
                                        >
                                            <input
                                                className="form-control"
                                                value={
                                                    option.label
                                                }
                                                placeholder="Label"
                                                onChange={(e) =>
                                                    updateOption(
                                                        index,
                                                        "label",
                                                        e.target.value
                                                    )
                                                }
                                            />

                                            <input
                                                className="form-control"
                                                value={
                                                    option.value
                                                }
                                                placeholder="Value"
                                                onChange={(e) =>
                                                    updateOption(
                                                        index,
                                                        "value",
                                                        e.target.value
                                                    )
                                                }
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
            <h3 className="text-base font-semibold text-gray-900">
                {title}
            </h3>

            <p className="text-sm text-gray-500 mt-1">
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
    required = false,
    ...props
}) {
    return (
        <div>
            <label className="form-label font-bold">
                {label}

                {required && (
                    <span className="text-danger ml-1">
                        *
                    </span>
                )}
            </label>

            <input
                className="form-control"
                {...props}
            />
        </div>
    );
}

/* ==========================================================================
   FORM SELECT
========================================================================== */

function FormSelect({
    label,
    required = false,
    options = [],
    ...props
}) {
    return (
        <div>
            <label className="form-label font-bold">
                {label}

                {required && (
                    <span className="text-danger ml-1">
                        *
                    </span>
                )}
            </label>

            <select
                className="form-select"
                {...props}
            >
                {options.map(
                    ([value, text]) => (
                        <option
                            key={value}
                            value={value}
                        >
                            {text}
                        </option>
                    )
                )}
            </select>
        </div>
    );
}

/* ==========================================================================
   FORM TEXTAREA
========================================================================== */

function FormTextarea({
    label,
    required = false,
    ...props
}) {
    return (
        <div>
            <label className="form-label font-bold">
                {label}

                {required && (
                    <span className="text-danger ml-1">
                        *
                    </span>
                )}
            </label>

            <textarea
                className="form-control"
                {...props}
            />
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

            <div className="flex gap-2">
                <input
                    type="color"
                    value={value}
                    onChange={(e) =>
                        onChange(e.target.value)
                    }
                    className="size-11 rounded border border-gray-300 cursor-pointer"
                />

                <input
                    type="text"
                    className="form-control"
                    value={value}
                    onChange={(e) =>
                        onChange(e.target.value)
                    }
                />
            </div>
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
        <button
            type="button"
            onClick={onChange}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition ${
                checked
                    ? "border-primary bg-primary-light"
                    : "border-gray-200 hover:border-primary"
            }`}
        >
            <div
                className={`size-5 rounded-full border flex items-center justify-center mt-0.5 ${
                    checked
                        ? "border-primary"
                        : "border-gray-300"
                }`}
            >
                {checked && (
                    <div className="size-2.5 rounded-full bg-primary" />
                )}
            </div>

            <div>
                <div className="font-semibold text-sm text-gray-800">
                    {title}
                </div>

                <div className="text-xs text-gray-500 mt-1">
                    {description}
                </div>
            </div>
        </button>
    );
}

/* ==========================================================================
   TOGGLE
========================================================================== */

function Toggle({
    checked,
    label,
    onChange,
}) {
    return (
        <label className="flex items-center justify-between gap-4 cursor-pointer">

            <span className="text-sm font-medium text-gray-800">
                {label}
            </span>

            <input
                type="checkbox"
                className="toggle"
                checked={checked}
                onChange={(e) =>
                    onChange(e.target.checked)
                }
            />
        </label>
    );
}

/* ==========================================================================
   MAIN PAGE
========================================================================== */

export default function EstimateRequestPage() {
    const router = useRouter();

    /* ----------------------------------------------------------------------
       PAGE MODE
    ---------------------------------------------------------------------- */

    const [mode, setMode] = useState("list");
    const [editingId, setEditingId] = useState(null);

    /* ----------------------------------------------------------------------
       LIST
    ---------------------------------------------------------------------- */

    const [list, setList] = useState([]);
    const [listLoading, setListLoading] =
        useState(true);
    const [listError, setListError] =
        useState("");

    /* ----------------------------------------------------------------------
       WIZARD
    ---------------------------------------------------------------------- */

    const [step, setStep] = useState(1);

    const [activeSetupTab, setActiveSetupTab] =
        useState("general");

    /* ----------------------------------------------------------------------
       FORM BUILDER
    ---------------------------------------------------------------------- */

    const [fields, setFields] = useState(
        getDefaultFields()
    );

    const [selectedFieldId, setSelectedFieldId] =
        useState(null);

    const [draggedField, setDraggedField] =
        useState(null);

    /* ----------------------------------------------------------------------
       SAVE STATE
    ---------------------------------------------------------------------- */

    const [loading, setLoading] =
        useState(false);

    const [saved, setSaved] =
        useState(false);

    const [error, setError] =
        useState("");

    /* ----------------------------------------------------------------------
       FORM DATA
    ---------------------------------------------------------------------- */

    const [formId, setFormId] =
        useState(null);

    const [publicToken, setPublicToken] =
        useState("");

    const [formUrl, setFormUrl] =
        useState("");

    const [formInfo, setFormInfo] =
        useState(DEFAULT_FORM_INFO);

    const [branding, setBranding] =
        useState(DEFAULT_BRANDING);

    const [submission, setSubmission] =
        useState(DEFAULT_SUBMISSION);

    const [notifications, setNotifications] =
        useState(DEFAULT_NOTIFICATIONS);

    /* ==========================================================================
       SELECTED FIELD
    ========================================================================== */

    const selectedField = useMemo(() => {
        return fields.find(
            (field) =>
                field.id === selectedFieldId
        );
    }, [
        fields,
        selectedFieldId,
    ]);

    /* ==========================================================================
       SLUG
    ========================================================================== */

    const formSlug = useMemo(() => {
        const name =
            formInfo.name ||
            "estimate-request";

        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }, [formInfo.name]);

    /* ==========================================================================
       IFRAME
    ========================================================================== */

    const iframeCode = useMemo(() => {
        if (!formUrl) {
            return "";
        }

        return `<iframe
  width="600"
  height="850"
  src="${formUrl}"
  frameborder="0"
  sandbox="allow-top-navigation allow-forms allow-scripts allow-same-origin allow-popups"
  allowfullscreen>
</iframe>`;
    }, [formUrl]);

    /* ==========================================================================
       LOAD FORMS
    ========================================================================== */

    const loadForms = async () => {
        try {
            setListLoading(true);
            setListError("");

            const response = await fetch(
                "/api/estimate-request/list",
                {
                    method: "GET",
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
                Array.isArray(data.forms)
                    ? data.forms
                    : []
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

    /* ==========================================================================
       INITIAL LOAD
    ========================================================================== */

    useEffect(() => {
        loadForms();
    }, []);

    /* ==========================================================================
       SELECT FIRST FIELD
    ========================================================================== */

    useEffect(() => {
        if (
            !selectedFieldId &&
            fields.length > 0
        ) {
            setSelectedFieldId(
                fields[0].id
            );
        }

        if (
            selectedFieldId &&
            !fields.some(
                (field) =>
                    field.id ===
                    selectedFieldId
            )
        ) {
            setSelectedFieldId(
                fields[0]?.id || null
            );
        }
    }, [
        fields,
        selectedFieldId,
    ]);

    /* ==========================================================================
       ADD NEW
    ========================================================================== */

    const handleAddNewForm = () => {
        router.push("/estimate-request");
    };
    /* ==========================================================================
       RESET FORM
    ========================================================================== */

    const resetForm = () => {
        const newFields =
            getDefaultFields();

        setMode("form");
        setEditingId(null);

        setFormId(null);
        setPublicToken("");
        setFormUrl("");

        setFormInfo({
            ...DEFAULT_FORM_INFO,
        });

        setBranding({
            ...DEFAULT_BRANDING,
        });

        setSubmission({
            ...DEFAULT_SUBMISSION,
        });

        setNotifications({
            ...DEFAULT_NOTIFICATIONS,
            staff: [],
            roles: [],
        });

        setFields(newFields);

        setSelectedFieldId(
            newFields[0]?.id || null
        );

        setDraggedField(null);

        setStep(1);
        setActiveSetupTab("general");

        setError("");
        setSaved(false);
    };

    /* ==========================================================================
       EDIT EXISTING FORM
    ========================================================================== */

    const editForm = (form) => {
        try {
            setError("");
            setSaved(false);

            const id =
                form.id ??
                form._id;

            if (!id) {
                throw new Error(
                    "Form ID is missing"
                );
            }

            const rawFields =
                Array.isArray(form.fields)
                    ? form.fields
                    : [];

            const loadedFields =
                rawFields.map(
                    (field, index) => ({
                        ...field,
                        id:
                            field.id ||
                            `${field.type || "field"}-${Date.now()}-${index}`,
                    })
                );

            setFormInfo({
                name:
                    form.name ||
                    "Estimate Request",

                language:
                    form.language ||
                    "english",

                status:
                    form.status ||
                    "processing",

                responsible:
                    form.responsible ||
                    "",
            });

            setBranding({
                ...DEFAULT_BRANDING,
                ...(form.branding || {}),
            });

            setSubmission({
                ...DEFAULT_SUBMISSION,
                ...(form.submission || {}),
            });

            setNotifications({
                ...DEFAULT_NOTIFICATIONS,
                ...(form.notifications || {}),
            });

            setFormId(id);
            setEditingId(id);

            const token =
                form.token ||
                form.publicToken ||
                "";

            setPublicToken(token);

            let url =
                form.url ||
                form.formUrl ||
                "";

            if (!url && token) {
                url = `${window.location.origin}/forms/quote/${token}`;
            }

            if (!url && form.slug) {
                url = `${window.location.origin}/forms/quote/${form.slug}`;
            }

            setFormUrl(url);

            setFields(
                loadedFields.length
                    ? loadedFields
                    : getDefaultFields()
            );

            setSelectedFieldId(
                loadedFields[0]?.id ||
                    null
            );

            setStep(1);
            setActiveSetupTab("general");
            setMode("form");
        } catch (err) {
            setError(
                err.message ||
                    "Unable to edit form"
            );
        }
    };

    /* ==========================================================================
       VIEW FORM
    ========================================================================== */

    const viewForm = (form) => {
        let url =
            form.url ||
            form.formUrl ||
            "";

        const token =
            form.token ||
            form.publicToken ||
            "";

        if (!url && token) {
            url = `${window.location.origin}/forms/quote/${token}`;
        }

        if (!url && form.slug) {
            url = `${window.location.origin}/forms/quote/${form.slug}`;
        }

        if (!url) {
            alert(
                "Public form URL is not available."
            );
            return;
        }

        window.open(
            url,
            "_blank",
            "noopener,noreferrer"
        );
    };

    /* ==========================================================================
       DELETE FORM
    ========================================================================== */

    const deleteForm = async (form) => {
        const id =
            form.id ??
            form._id;

        if (!id) {
            alert("Form ID is missing.");
            return;
        }

        const confirmed =
            window.confirm(
                `Are you sure you want to delete "${form.name || "this form"}"?`
            );

        if (!confirmed) {
            return;
        }

        try {
            setListError("");

            const response =
                await fetch(
                    `/api/estimate-request/list?id=${encodeURIComponent(
                        id
                    )}`,
                    {
                        method: "DELETE",
                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to delete form"
                );
            }

            setList(
                (current) =>
                    current.filter(
                        (item) =>
                            String(
                                item.id ??
                                    item._id
                            ) !==
                            String(id)
                    )
            );
        } catch (err) {
            setListError(
                err.message ||
                    "Failed to delete form"
            );
        }
    };

    /* ==========================================================================
       UPDATE FIELD
    ========================================================================== */

    const updateField = (
        key,
        value
    ) => {
        setFields((current) =>
            current.map((field) =>
                field.id ===
                selectedFieldId
                    ? {
                          ...field,
                          [key]: value,
                      }
                    : field
            )
        );
    };

    /* ==========================================================================
       ADD FIELD
    ========================================================================== */

    const addField = (type) => {
        const field =
            createField(type);

        setFields((current) => [
            ...current,
            field,
        ]);

        setSelectedFieldId(
            field.id
        );
    };

    /* ==========================================================================
       DELETE FIELD
    ========================================================================== */

    const deleteField = (id) => {
        setFields((current) =>
            current.filter(
                (field) =>
                    field.id !== id
            )
        );

        if (
            selectedFieldId === id
        ) {
            setSelectedFieldId(null);
        }
    };

    /* ==========================================================================
       DUPLICATE FIELD
    ========================================================================== */

    const duplicateField = (id) => {
        const source =
            fields.find(
                (field) =>
                    field.id === id
            );

        if (!source) {
            return;
        }

        const copy = {
            ...structuredClone(source),

            id: `${source.type}-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 7)}`,

            name: source.name
                ? `${source.name}_copy`
                : undefined,
        };

        const index =
            fields.findIndex(
                (field) =>
                    field.id === id
            );

        setFields((current) => {
            const result = [
                ...current,
            ];

            result.splice(
                index + 1,
                0,
                copy
            );

            return result;
        });

        setSelectedFieldId(
            copy.id
        );
    };

    /* ==========================================================================
       MOVE FIELD
    ========================================================================== */

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
            const result = [
                ...current,
            ];

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

    /* ==========================================================================
       OPTIONS
    ========================================================================== */

    const addOption = () => {
        if (!selectedField) {
            return;
        }

        const options =
            selectedField.options ||
            [];

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
        if (!selectedField) {
            return;
        }

        const options = [
            ...(selectedField.options ||
                []),
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

    const removeOption = (
        index
    ) => {
        if (!selectedField) {
            return;
        }

        const options = [
            ...(selectedField.options ||
                []),
        ];

        options.splice(index, 1);

        updateField(
            "options",
            options
        );
    };

    /* ==========================================================================
       DRAG
    ========================================================================== */

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

    /* ==========================================================================
       SAVE
    ========================================================================== */

    const saveForm = async () => {
        try {
            setLoading(true);
            setError("");
            setSaved(false);

            if (
                !formInfo.name.trim()
            ) {
                throw new Error(
                    "Form name is required"
                );
            }

            if (!fields.length) {
                throw new Error(
                    "Please add at least one field"
                );
            }

            const payload = {
                id: formId,

                name:
                    formInfo.name.trim(),

                slug: formSlug,

                language:
                    formInfo.language,

                status:
                    formInfo.status,

                responsible:
                    formInfo.responsible,

                fields,

                branding,

                submission,

                notifications,
            };

            const isEdit =
                Boolean(formId);

            const response =
                await fetch(
                    "/api/estimate-request/list",
                    {
                        method: isEdit
                            ? "PUT"
                            : "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                payload
                            ),
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to save form"
                );
            }

            const savedId =
                data.id ||
                formId;

            setFormId(savedId);
            setEditingId(savedId);

            if (data.token) {
                setPublicToken(
                    data.token
                );
            }

            let generatedUrl =
                data.url ||
                data.formUrl ||
                "";

            if (
                !generatedUrl
            ) {
                const token =
                    data.token ||
                    publicToken;

                if (token) {
                    generatedUrl = `${window.location.origin}/forms/quote/${token}`;
                } else {
                    generatedUrl = `${window.location.origin}/forms/quote/${formSlug}`;
                }
            }

            setFormUrl(
                generatedUrl
            );

            setSaved(true);

            await loadForms();

            setTimeout(() => {
                setSaved(false);
            }, 3000);
        } catch (err) {
            setError(
                err.message ||
                    "Something went wrong"
            );
        } finally {
            setLoading(false);
        }
    };

    /* ==========================================================================
       COPY
    ========================================================================== */

    const copyToClipboard =
        async (value) => {
            if (!value) {
                return;
            }

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

    /* ==========================================================================
       LIST PAGE
    ========================================================================== */

    if (mode === "list") {
        return (
            <div className="flex flex-col gap-6 p-5">

                <div className="flex flex-wrap items-center justify-between gap-5">

                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Estimate Request
                        </h1>

                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <span>
                                Forms
                            </span>

                            <i className="ki-filled ki-right text-xs" />

                            <span className="text-gray-700 font-medium">
                                Estimate Request
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={
                            handleAddNewForm
                        }
                    >
                        <i className="ki-filled ki-plus" />
                        Add New Form
                    </button>
                </div>

                {listError && (
                    <div className="alert alert-danger">
                        {listError}
                    </div>
                )}

                <div className="card p-5">

                    <div className="card-header">

                        <div>
                            <h3 className="card-title">
                                Estimate Request Forms
                            </h3>

                            <p className="text-xs text-gray-500 mt-1">
                                Create, edit and manage your estimate request forms.
                            </p>
                        </div>

                        <span className="badge badge-light-primary">
                            {list.length} Forms
                        </span>

                    </div>

                    <div className="card-body p-0">

                        {listLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <span className="spinner spinner-lg" />
                            </div>
                        ) : list.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">

                                <div className="size-14 rounded-full bg-primary-light flex items-center justify-center mb-4">
                                    <i className="ki-filled ki-notepad-edit text-2xl text-primary" />
                                </div>

                                <h3 className="text-base font-semibold text-gray-800">
                                    No forms found
                                </h3>

                                <p className="text-sm text-gray-500 mt-1 max-w-md">
                                    Create your first Estimate Request form to get started.
                                </p>

                                <button
                                    type="button"
                                    className="btn btn-primary mt-5"
                                    onClick={
                                        resetForm
                                    }
                                >
                                    <i className="ki-filled ki-plus" />
                                    Create Form
                                </button>

                            </div>
                        ) : (
                            <div className="overflow-x-auto">

                                <table className="table table-border w-full">

                                    <thead>
                                        <tr>
                                            <th>
                                                Form Name
                                            </th>

                                            <th>
                                                Status
                                            </th>

                                            <th>
                                                Language
                                            </th>

                                            <th>
                                                Fields
                                            </th>

                                            <th>
                                                Created
                                            </th>

                                            <th className="text-end">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>

                                        {list.map(
                                            (form) => {
                                                const formKey =
                                                    form.id ??
                                                    form._id;

                                                return (
                                                    <tr
                                                        key={
                                                            formKey
                                                        }
                                                    >

                                                        <td>
                                                            <div className="flex flex-col">

                                                                <span className="font-semibold text-gray-900">
                                                                    {form.name ||
                                                                        "Untitled Form"}
                                                                </span>

                                                                {form.slug && (
                                                                    <span className="text-xs text-gray-500 mt-1">
                                                                        /forms/quote/
                                                                        {
                                                                            form.slug
                                                                        }
                                                                    </span>
                                                                )}

                                                            </div>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`badge badge-sm ${
                                                                    form.status ===
                                                                    "completed"
                                                                        ? "badge-light-success"
                                                                        : form.status ===
                                                                          "cancelled"
                                                                        ? "badge-light-danger"
                                                                        : "badge-light-warning"
                                                                }`}
                                                            >
                                                                {form.status ||
                                                                    "processing"}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {
                                                                form.language ||
                                                                "english"
                                                            }
                                                        </td>

                                                        <td>
                                                            {Array.isArray(
                                                                form.fields
                                                            )
                                                                ? form
                                                                      .fields
                                                                      .length
                                                                : form.fieldCount ||
                                                                  0}
                                                        </td>

                                                        <td>
                                                            {form.createdAt
                                                                ? new Date(
                                                                      form.createdAt
                                                                  ).toLocaleDateString()
                                                                : "-"}
                                                        </td>

                                                        <td>
                                                            <div className="flex items-center justify-end gap-2">

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-light-success"
                                                                    onClick={() =>
                                                                        viewForm(
                                                                            form
                                                                        )
                                                                    }
                                                                    title="View form"
                                                                >
                                                                    <i className="ki-filled ki-eye" />
                                                                    View
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-light-primary"
                                                                    onClick={() =>
                                                                        editForm(
                                                                            form
                                                                        )
                                                                    }
                                                                    title="Edit form"
                                                                >
                                                                    <i className="ki-filled ki-pencil" />
                                                                    Edit
                                                                </button>

                                                                {(form.url ||
                                                                    form.formUrl ||
                                                                    form.token ||
                                                                    form.publicToken) && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-light"
                                                                        onClick={() => {
                                                                            let url =
                                                                                form.url ||
                                                                                form.formUrl;

                                                                            const token =
                                                                                form.token ||
                                                                                form.publicToken;

                                                                            if (
                                                                                !url &&
                                                                                token
                                                                            ) {
                                                                                url = `${window.location.origin}/forms/quote/${token}`;
                                                                            }

                                                                            copyToClipboard(
                                                                                url
                                                                            );
                                                                        }}
                                                                        title="Copy public URL"
                                                                    >
                                                                        <i className="ki-filled ki-copy" />
                                                                    </button>
                                                                )}

                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-light-danger"
                                                                    onClick={() =>
                                                                        deleteForm(
                                                                            form
                                                                        )
                                                                    }
                                                                    title="Delete form"
                                                                >
                                                                    <i className="ki-filled ki-trash" />
                                                                </button>

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

    /* ==========================================================================
       FORM BUILDER
    ========================================================================== */

    return (
        <div className="flex flex-col gap-6 p-5">

            {/* HEADER */}

            <div className="flex flex-wrap items-center justify-between gap-5">

                <div className="flex items-center gap-3">

                    <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={() => {
                            setMode("list");
                            loadForms();
                        }}
                    >
                        <i className="ki-filled ki-left" />
                        Back
                    </button>

                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            {formId
                                ? "Edit Estimate Request"
                                : "Create Estimate Request"}
                        </h1>

                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                            <span>
                                Forms
                            </span>

                            <i className="ki-filled ki-right text-xs" />

                            <span>
                                Estimate Request
                            </span>

                            {formId && (
                                <>
                                    <i className="ki-filled ki-right text-xs" />

                                    <span className="text-primary font-medium">
                                        Edit
                                    </span>
                                </>
                            )}
                        </div>
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
                                <span className="spinner spinner-sm" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <i className="ki-filled ki-check" />

                                {formId
                                    ? "Update Form"
                                    : "Save Form"}
                            </>
                        )}
                    </button>

                </div>
            </div>

            {/* WIZARD */}

            <div className="card">

                <div className="card-body p-4 lg:p-6">

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                        <WizardStep
                            number="01"
                            title="Form Builder"
                            description="Create and arrange fields"
                            active={step === 1}
                            completed={step > 1}
                            onClick={() =>
                                setStep(1)
                            }
                        />

                        <WizardStep
                            number="02"
                            title="Form Setup"
                            description="Configure form settings"
                            active={step === 2}
                            completed={step > 2}
                            onClick={() =>
                                setStep(2)
                            }
                        />

                        <WizardStep
                            number="03"
                            title="Integration"
                            description="Embed your form"
                            active={step === 3}
                            completed={false}
                            onClick={() =>
                                setStep(3)
                            }
                        />

                    </div>

                </div>
            </div>

            {/* ======================================================================
               STEP 1
            ====================================================================== */}

            {step === 1 && (
                <div className="grid grid-cols-1 xl:grid-cols-[260px_minmax(0,1fr)_340px] gap-5 items-start">

                    {/* FIELD LIBRARY */}

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

                    {/* CANVAS */}

                    <div className="card">

                        <div className="card-header">

                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="card-title">
                                        Form Builder
                                    </h3>

                                    <span className="badge badge-sm badge-light-primary">
                                        {
                                            fields.length
                                        }{" "}
                                        fields
                                    </span>
                                </div>

                                <p className="text-xs text-gray-500 mt-1">
                                    Drag fields to change their order.
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

                            {fields.length === 0 ? (
                                <div className="min-h-[550px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center">

                                    <i className="ki-filled ki-plus text-3xl text-primary" />

                                    <h3 className="text-base font-semibold text-gray-800 mt-4">
                                        Your form is empty
                                    </h3>

                                    <p className="text-sm text-gray-500 mt-1">
                                        Choose a field to start.
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

                    {/* EDITOR */}

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

            {/* ======================================================================
               STEP 2
            ====================================================================== */}

            {step === 2 && (
                <div className="card">

                    <div className="card-header p-5">

                        <div>
                            <h3 className="card-title">
                                Form Information & Setup
                            </h3>

                            <p className="text-xs text-gray-500 mt-1">
                                Configure how your form behaves.
                            </p>
                        </div>

                    </div>

                    <div className="card-body p-0">

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
                                            key={id}
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
                                                    : "border-transparent text-gray-500"
                                            }`}
                                        >
                                            <i
                                                className={`ki-filled ${icon}`}
                                            />

                                            {label}
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
                                                    "processing",
                                                    "Processing",
                                                ],
                                                [
                                                    "completed",
                                                    "Completed",
                                                ],
                                                [
                                                    "cancelled",
                                                    "Cancelled",
                                                ],
                                            ]}
                                        />

                                        <FormInput
                                            label="Responsible"
                                            placeholder="Responsible person"
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
                                        description="Customize your submit button."
                                    />

                                    <div className="grid gap-5">

                                        <FormInput
                                            label="Submit Button Text"
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

                                                <div className="text-sm font-semibold mb-4">
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
                                        description="Choose what happens after submission."
                                    />

                                    <div className="flex flex-col gap-3">

                                        <RadioCard
                                            checked={
                                                submission.action ===
                                                "message"
                                            }
                                            title="Display thank you message"
                                            description="Show a success message."
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
                                            description="Send visitor to a custom URL."
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
                                        description="Configure notification settings."
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

            {/* ======================================================================
               STEP 3
            ====================================================================== */}

            {step === 3 && (
                <div className="grid grid-cols-1 gap-5">

                    <div className="card">

                        <div className="card-header">

                            <div>
                                <h3 className="card-title">
                                    Integration Code
                                </h3>

                                <p className="text-xs text-gray-500 mt-1">
                                    Copy the iframe code and add it to your website.
                                </p>
                            </div>

                            <span className="badge badge-light-success">
                                {formUrl
                                    ? "Ready"
                                    : "Save form first"}
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
                                        disabled={
                                            !iframeCode
                                        }
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
                                    placeholder="Save the form first to generate iframe code."
                                    className="form-control font-mono text-xs w-full"
                                />

                            </div>

                            {formUrl && (
                                <div className="mb-6">

                                    <label className="form-label font-bold">
                                        Public Form URL
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

                                        <a
                                            href={
                                                formUrl
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary"
                                        >
                                            Open Form
                                        </a>

                                    </div>
                                </div>
                            )}

                            {publicToken && (
                                <div>

                                    <label className="form-label font-bold">
                                        Public Token
                                    </label>

                                    <input
                                        readOnly
                                        value={
                                            publicToken
                                        }
                                        className="form-control font-mono w-full"
                                    />

                                </div>
                            )}

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
                                onClick={
                                    saveForm
                                }
                                disabled={
                                    loading
                                }
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner spinner-sm" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="ki-filled ki-check" />

                                        {formId
                                            ? "Update Form"
                                            : "Save Form"}
                                    </>
                                )}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}