
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogBody,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
    RiCheckboxCircleFill,
    RiErrorWarningFill,
} from "@remixicon/react";

import {
    Alert,
    AlertIcon,
    AlertTitle,
} from "@/components/ui/alert";

import ProductionCustomFields, {
    validateRequiredCustomFields,
} from "../../inventory/custom-fields/import-custom-fields";

// ======================================================
// API ENDPOINTS
// ======================================================

const API = {
    shifts: "/api/hr/Shift?limit=10000&status=active",
    machines: "/api/inventory/machine-master?limit=10000&status=active",
    items: "/api/inventory/item-master?limit=10000&status=active",
    units: "/api/inventory/unit?limit=10000",
};

// ======================================================
// GENERAL HELPERS
// ======================================================

const getToday = () => format(new Date(), "yyyy-MM-dd");

const getDefaultForm = () => ({
    productionDate: getToday(),
    shiftId: "",
    machineId: "",
    itemId: "",

    // UI-only field. Unit is fetched using ItemMaster.Unitid.
    unitId: "",

    productionQuantity: "",
    remarks: "",
});

const getResponseList = (result) => {
    if (Array.isArray(result)) return result;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result?.data?.data)) return result.data.data;
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.results)) return result.results;

    return [];
};

// ======================================================
// ITEM HELPERS
// ======================================================

const getItemId = (item) =>
    item?.id ||
    item?.ItemMasterid ||
    item?.itemId ||
    "";

const getItemName = (item) =>
    item?.ItemName ||
    item?.itemName ||
    item?.name ||
    "";

const getItemUnitId = (item) =>
    item?.Unitid ||
    item?.unitId ||
    item?.unit?.id ||
    item?.Unit?.id ||
    "";

const normalizeItemName = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

// ======================================================
// UNIT HELPERS
// ======================================================

const getItemUnitLabel = (
    item,
    units = [],
    assignedDetail = null
) => {
    const unitId = getItemUnitId(item);

    const unit =
        units.find(
            (record) => String(record.id) === String(unitId)
        ) ||
        item?.unit ||
        item?.Unit ||
        null;

    const unitName =
        unit?.unitName ||
        item?.unitName ||
        item?.UnitName ||
        assignedDetail?.itemUnit ||
        "";

    const abbreviation =
        unit?.abbreviation ||
        item?.unitAbbreviation ||
        item?.abbreviation ||
        "";

    if (unitName && abbreviation) {
        return `${unitName} (${abbreviation})`;
    }

    return unitName || abbreviation || "Unit";
};

// ======================================================
// MACHINE ITEM DETAILS
// ======================================================

const getMachineItemDetails = (machine) => {
    let details =
        machine?.itemDetails ||
        machine?.ItemDetails ||
        [];

    if (typeof details === "string") {
        try {
            details = JSON.parse(details);
        } catch (error) {
            console.error(
                "MACHINE ITEM DETAILS PARSE ERROR:",
                error
            );

            return [];
        }
    }

    return Array.isArray(details) ? details : [];
};

// ======================================================
// GET MACHINE ASSIGNED ITEMS
// ======================================================

const getMachineAssignedItems = (
    machine,
    allItems = []
) => {
    if (!machine || !Array.isArray(allItems)) {
        return [];
    }

    const itemDetails = getMachineItemDetails(machine);

    const idMap = new Map();
    const nameMap = new Map();
    const skuMap = new Map();
    const descriptionMap = new Map();

    allItems.forEach((record) => {
        const id = String(getItemId(record) || "");

        if (!id) return;

        idMap.set(id, record);

        const name = normalizeItemName(getItemName(record));
        const sku = normalizeItemName(record?.SKU);
        const description = normalizeItemName(
            record?.Description
        );

        if (name && !nameMap.has(name)) {
            nameMap.set(name, record);
        }

        if (sku && !skuMap.has(sku)) {
            skuMap.set(sku, record);
        }

        if (description && !descriptionMap.has(description)) {
            descriptionMap.set(description, record);
        }
    });

    const findItem = (candidates) => {
        // PASS 1: EXACT MATCH

        for (const value of candidates) {
            const text = String(value ?? "").trim();

            if (!text) continue;

            const normalized = normalizeItemName(text);

            const found =
                idMap.get(text) ||
                nameMap.get(normalized) ||
                skuMap.get(normalized) ||
                descriptionMap.get(normalized);

            if (found) return found;
        }

        // PASS 2: PARTIAL MATCH

        for (const value of candidates) {
            const normalized = normalizeItemName(value);

            if (normalized.length < 3) continue;

            const found = allItems.find((record) =>
                [
                    getItemName(record),
                    record?.SKU,
                    record?.Description,
                ]
                    .map(normalizeItemName)
                    .filter(Boolean)
                    .some(
                        (key) =>
                            key.includes(normalized) ||
                            normalized.includes(key)
                    )
            );

            if (found) return found;
        }

        return null;
    };

    const matchedItems = [];
    const addedIds = new Set();

    itemDetails.forEach((detail) => {
        if (detail?.deletedAt) return;

        const selected =
            detail?.Selecteditem ??
            detail?.selectedItem ??
            detail?.selecteditem;

        const candidates = [];

        candidates.push(
            detail?.itemId,
            detail?.ItemId,
            detail?.ItemMasterid
        );

        if (
            typeof selected === "object" &&
            selected !== null
        ) {
            candidates.push(
                selected.id,
                selected.value,
                selected.ItemMasterid,
                selected.ItemName,
                selected.itemName,
                selected.label,
                selected.name
            );
        } else {
            candidates.push(selected);
        }

        const matchedItem = findItem(candidates);

        if (!matchedItem) {
            console.warn(
                "Assigned machine item not found in Item Master:",
                selected
            );

            return;
        }

        const itemId = String(getItemId(matchedItem));

        if (addedIds.has(itemId)) return;

        addedIds.add(itemId);

        matchedItems.push({
            ...matchedItem,
            _machineItemDetail: detail,
        });
    });

    return matchedItems;
};

// ======================================================
// TOAST HELPERS
// ======================================================

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
        { position: "top-center" }
    );
};

const showErrorToast = (message) => {
    toast.custom(
        (t) => (
            <Alert
                variant="mono"
                icon="destructive"
                close
                onClose={() => toast.dismiss(t)}
            >
                <AlertIcon>
                    <RiErrorWarningFill />
                </AlertIcon>

                <AlertTitle>{message}</AlertTitle>
            </Alert>
        ),
        { position: "top-center" }
    );
};

const showToast = (type, message) => {
    toast.custom(
        () => (
            <Alert
                variant="mono"
                icon={
                    type === "success"
                        ? "success"
                        : "destructive"
                }
                close={false}
            >
                <AlertIcon>
                    {type === "success" ? (
                        <RiCheckboxCircleFill />
                    ) : (
                        <RiErrorWarningFill />
                    )}
                </AlertIcon>

                <AlertTitle>{message}</AlertTitle>
            </Alert>
        ),
        { position: "top-center" }
    );
};

// ======================================================
// COMPONENT
// ======================================================

export default function ProductionAddDialog({
    open,
    closeDialog,
    onSuccess,
    item = null,
}) {
    const [form, setForm] = useState(getDefaultForm);

    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);

    // DATABASE DROPDOWN DATA

    const [shifts, setShifts] = useState([]);
    const [machines, setMachines] = useState([]);
    const [items, setItems] = useState([]);
    const [units, setUnits] = useState([]);

    // CUSTOM FIELDS

    const [customFieldDefinitions, setCustomFieldDefinitions] =
        useState([]);

    const [customFields, setCustomFields] = useState({});

    // ======================================================
    // SELECTED MACHINE
    // ======================================================

    const selectedMachine = useMemo(() => {
        return (
            machines.find(
                (machine) =>
                    String(machine.id) ===
                    String(form.machineId)
            ) || null
        );
    }, [machines, form.machineId]);

    const filteredItems = useMemo(() => {
        return items;
    }, [items]);

    // ======================================================
    // SELECTED ITEM
    // ======================================================

    const selectedItem = useMemo(() => {
        return (
            filteredItems.find(
                (record) =>
                    String(getItemId(record)) ===
                    String(form.itemId)
            ) || null
        );
    }, [filteredItems, form.itemId]);

    const selectedMachineItemDetail =
        selectedItem?._machineItemDetail || null;

    const selectedUnitLabel = selectedItem
        ? getItemUnitLabel(
            selectedItem,
            units,
            selectedMachineItemDetail
        )
        : "Unit (Abbreviation)";

    // ======================================================
    // FETCH DROPDOWNS
    // ======================================================

    useEffect(() => {
        if (!open) return;

        let cancelled = false;

        const fetchDropdown = async (url, key) => {
            const response = await fetch(url, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                cache: "no-store",
            });

            const contentType =
                response.headers.get("content-type") || "";

            if (!contentType.includes("application/json")) {
                throw new Error(
                    `Invalid API response from ${url}. HTTP Status: ${response.status}`
                );
            }

            const result = await response.json();

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.message || `Failed to load ${key}.`
                );
            }

            return getResponseList(result);
        };

        const loadDropdowns = async () => {
            setLoadingDropdowns(true);

            const dropdowns = [
                {
                    key: "shifts",
                    url: API.shifts,
                    setter: setShifts,
                },
                {
                    key: "machines",
                    url: API.machines,
                    setter: setMachines,
                },
                {
                    key: "items",
                    url: API.items,
                    setter: setItems,
                },
                {
                    key: "units",
                    url: API.units,
                    setter: setUnits,
                },
            ];

            try {
                await Promise.all(
                    dropdowns.map(
                        async ({ key, url, setter }) => {
                            try {
                                const data = await fetchDropdown(
                                    url,
                                    key
                                );

                                if (!cancelled) {
                                    setter(data);
                                }
                            } catch (error) {
                                console.error(
                                    `PRODUCTION ${key.toUpperCase()} DROPDOWN ERROR:`,
                                    error
                                );

                                if (!cancelled) {
                                    setter([]);
                                }
                            }
                        }
                    )
                );
            } finally {
                if (!cancelled) {
                    setLoadingDropdowns(false);
                }
            }
        };

        loadDropdowns();

        return () => {
            cancelled = true;
        };
    }, [open]);

    // ======================================================
    // INITIALIZE FORM
    // ======================================================

    useEffect(() => {
        if (!open) return;

        const productionItem =
            item?.item || null;

        setForm({
            productionDate: item?.productionDate
                ? format(
                    new Date(item.productionDate),
                    "yyyy-MM-dd"
                )
                : getToday(),

            shiftId: String(
                item?.shiftId ||
                item?.shift?.id ||
                ""
            ),

            machineId: String(
                item?.machineId ||
                item?.machine?.id ||
                ""
            ),

            itemId: String(
                item?.itemId ||
                productionItem?.id ||
                item?.ItemMasterid ||
                ""
            ),

            // Unit belongs to ItemMaster, not Production.
            unitId: String(
                productionItem?.Unitid ||
                productionItem?.unit?.id ||
                ""
            ),

            productionQuantity:
                item?.productionQuantity ?? "",

            remarks: item?.remarks || "",
        });

        setCustomFields(item?.customFields || {});
        setCustomFieldDefinitions([]);
        setErrors({});
    }, [open, item]);

    // ======================================================
    // UPDATE UNIT WHEN ITEM CHANGES
    // ======================================================

    useEffect(() => {
        if (!selectedItem) return;

        const unitId = getItemUnitId(selectedItem);

        if (!unitId) return;

        setForm((previous) => {
            if (
                String(previous.unitId) === String(unitId)
            ) {
                return previous;
            }

            return {
                ...previous,
                unitId: String(unitId),
            };
        });
    }, [selectedItem]);

    // ======================================================
    // UPDATE FIELD
    // ======================================================

    const updateField = (field, value) => {
        setForm((previous) => ({
            ...previous,
            [field]: value,
        }));

        setErrors((previous) => ({
            ...previous,
            [field]: "",
        }));
    };

    // ======================================================
    // MACHINE CHANGE
    // ======================================================

    const handleMachineChange = (value) => {
        setForm((prev) => ({
            ...prev,
            machineId: value,
        }));

        setErrors((prev) => ({
            ...prev,
            machineId: "",
        }));
    };

    // ======================================================
    // ITEM CHANGE
    // ======================================================

    const handleItemChange = (value) => {
        const selected = filteredItems.find(
            (record) =>
                String(getItemId(record)) === String(value)
        );

        setForm((previous) => ({
            ...previous,
            itemId: value,
            unitId: String(
                getItemUnitId(selected) || ""
            ),
        }));

        setErrors((previous) => ({
            ...previous,
            itemId: "",
        }));
    };

    // ======================================================
    // VALIDATION
    // ======================================================

    const validate = () => {
        const newErrors = {};

        if (!form.productionDate) {
            newErrors.productionDate =
                "Production date is required.";
        }

        if (!form.shiftId) {
            newErrors.shiftId =
                "Please select a shift.";
        } else if (
            !shifts.some(
                (record) =>
                    String(record.id) ===
                    String(form.shiftId)
            )
        ) {
            newErrors.shiftId =
                "Please select a valid shift.";
        }

        if (!form.machineId) {
            newErrors.machineId =
                "Please select a machine.";
        } else if (!selectedMachine) {
            newErrors.machineId =
                "Please select a valid machine.";
        }

        if (!form.itemId) {
            newErrors.itemId =
                "Please select an item.";
        } else if (!selectedItem) {
            newErrors.itemId =
                "Selected item is not assigned to this machine.";
        }

        if (
            form.productionQuantity !== "" &&
            (
                !Number.isFinite(
                    Number(form.productionQuantity)
                ) ||
                Number(form.productionQuantity) < 0
            )
        ) {
            newErrors.productionQuantity =
                "Enter a valid production quantity.";
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
            showToast(
                "error",
                "Please complete all required production fields."
            );

            return false;
        }

        return true;
    };

    // ======================================================
    // SAVE PRODUCTION
    // ======================================================

    const handleSave = async () => {
        if (saving || loadingDropdowns) return;

        if (!validate()) return;

        const missingCustomFields =
            validateRequiredCustomFields(
                customFieldDefinitions,
                customFields
            );

        if (missingCustomFields.length > 0) {
            showErrorToast(
                `Please fill in required custom fields: ${missingCustomFields.join(", ")}`
            );

            return;
        }

        if (!selectedItem || !selectedMachine) {
            showErrorToast(
                "Please select a valid machine and its assigned item."
            );

            return;
        }

        // IMPORTANT:
        // Only send fields that exist in the current Production model.
        // Do not send productionCode, productionName, unitId or quantity.

        const productionData = {
            productionDate: form.productionDate,

            shiftId: form.shiftId,
            machineId: form.machineId,
            itemId: String(getItemId(selectedItem)),

            productionQuantity:
                form.productionQuantity === ""
                    ? 0
                    : Number(form.productionQuantity),

            remarks: form.remarks.trim(),

            customFields: customFields || {},
        };

        try {
            setSaving(true);

            const response = await fetch("/api/production", {
                method: item ? "PUT" : "POST",

                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify(
                    item
                        ? {
                            id: item.id,
                            ...productionData,
                        }
                        : productionData
                ),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Failed to save production."
                );
            }

            showSuccessToast(
                item
                    ? "Production updated successfully."
                    : "Production added successfully."
            );

            onSuccess?.(result.data);

            setErrors({});
            setForm(getDefaultForm());
            setCustomFields({});

            closeDialog?.();
        } catch (error) {
            console.error(
                "PRODUCTION SAVE ERROR:",
                error
            );

            showErrorToast(
                error.message || "Something went wrong."
            );
        } finally {
            setSaving(false);
        }
    };

    // ======================================================
    // CLOSE DIALOG
    // ======================================================

    const handleClose = () => {
        if (saving) return;

        setErrors({});
        setForm(getDefaultForm());
        setCustomFields({});

        closeDialog?.();
    };

    // ======================================================
    // RENDER
    // ======================================================

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!value) handleClose();
            }}
        >
            <DialogContent>
                <div className="flex h-full max-h-[90vh] flex-col overflow-hidden">

                    <DialogHeader>
                        <DialogTitle>
                            {item
                                ? "Edit Production"
                                : "Add Production"}
                        </DialogTitle>

                        <DialogDescription>
                            {item
                                ? "Update production information."
                                : "Create a new production record."}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
                        <DialogBody className="space-y-5 pt-0 px-0 min-h-0">

                            {/* PRODUCTION DATE */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Select Date{" "}
                                    <span className="text-destructive">
                                        *
                                    </span>
                                </label>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full justify-between font-normal"
                                        >
                                            {form.productionDate
                                                ? format(
                                                    new Date(
                                                        `${form.productionDate}T00:00:00`
                                                    ),
                                                    "MM/dd/yyyy"
                                                )
                                                : "MM/DD/YYYY"}

                                            <CalendarIcon className="size-4 text-muted-foreground" />
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent
                                        className="w-auto p-0"
                                        align="start"
                                    >
                                        <Calendar
                                            mode="single"
                                            selected={
                                                form.productionDate
                                                    ? new Date(
                                                        `${form.productionDate}T00:00:00`
                                                    )
                                                    : undefined
                                            }
                                            onSelect={(date) =>
                                                updateField(
                                                    "productionDate",
                                                    date
                                                        ? format(
                                                            date,
                                                            "yyyy-MM-dd"
                                                        )
                                                        : ""
                                                )
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>

                                {errors.productionDate && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.productionDate}
                                    </p>
                                )}
                            </div>

                            {/* SHIFT */}

                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    Select Shift{" "}
                                    <span className="text-destructive">
                                        *
                                    </span>
                                </label>

                                <Select
                                    value={form.shiftId}
                                    onValueChange={(value) =>
                                        updateField(
                                            "shiftId",
                                            value
                                        )
                                    }
                                    disabled={loadingDropdowns}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={
                                                loadingDropdowns
                                                    ? "Loading shifts..."
                                                    : "Select shift"
                                            }
                                        />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {shifts.map((shift) => (
                                            <SelectItem
                                                key={shift.id}
                                                value={String(
                                                    shift.id
                                                )}
                                            >
                                                {shift.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {errors.shiftId && (
                                    <p className="text-xs text-destructive">
                                        {errors.shiftId}
                                    </p>
                                )}
                            </div>

                            {/* MACHINE */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Select Machine{" "}
                                    <span className="text-destructive">
                                        *
                                    </span>
                                </label>

                                <Select
                                    value={form.machineId}
                                    onValueChange={
                                        handleMachineChange
                                    }
                                    disabled={loadingDropdowns}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={
                                                loadingDropdowns
                                                    ? "Loading machines..."
                                                    : "Select machine"
                                            }
                                        />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {machines.map((machine) => (
                                            <SelectItem
                                                key={machine.id}
                                                value={String(
                                                    machine.id
                                                )}
                                            >
                                                {machine.machineName} (
                                                {machine.machineCode})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {errors.machineId && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.machineId}
                                    </p>
                                )}
                            </div>

                            {/* MACHINE-WISE ITEM */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Item{" "}
                                    <span className="text-destructive">
                                        *
                                    </span>
                                </label>

                                <Select
                                    value={form.itemId}
                                    onValueChange={handleItemChange}
                                    disabled={loadingDropdowns || filteredItems.length === 0}
                                >
                                    <SelectTrigger>
                                        <SelectValue
                                            placeholder={
                                                loadingDropdowns
                                                    ? "Loading items..."
                                                    : "Select item"
                                            }
                                        />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {filteredItems.map((record) => (
                                            <SelectItem
                                                key={getItemId(record)}
                                                value={String(getItemId(record))}
                                            >
                                                {getItemName(record)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {errors.itemId && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.itemId}
                                    </p>
                                )}
                            </div>

                            {/* PRODUCTION QUANTITY */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Production Quantity
                                </label>

                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={
                                            form.productionQuantity
                                        }
                                        placeholder="Enter production quantity"
                                        onChange={(e) =>
                                            updateField(
                                                "productionQuantity",
                                                e.target.value
                                            )
                                        }
                                    />

                                    <div className="flex h-9 min-w-[110px] items-center justify-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                                        {selectedUnitLabel}
                                    </div>
                                </div>

                                {errors.productionQuantity && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.productionQuantity}
                                    </p>
                                )}
                            </div>

                            {/* REMARKS */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Remarks
                                </label>

                                <Textarea
                                    value={form.remarks}
                                    placeholder="Enter remarks"
                                    rows={3}
                                    onChange={(e) =>
                                        updateField(
                                            "remarks",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            {/* CUSTOM FIELDS */}

                            <div className="space-y-4 border-t pt-5">
                                <div>
                                    <h3 className="text-base font-semibold">
                                        Custom Fields
                                    </h3>

                                    <p className="text-sm text-muted-foreground">
                                        Additional production information.
                                    </p>
                                </div>

                                <ProductionCustomFields
                                    values={customFields}
                                    onChange={setCustomFields}
                                    onFieldsLoaded={(
                                        loadedFields
                                    ) => {
                                        setCustomFieldDefinitions(
                                            loadedFields
                                        );
                                    }}
                                />
                            </div>

                        </DialogBody>
                    </ScrollArea>

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleClose}
                            disabled={saving}
                        >
                            Close
                        </Button>

                        <Button
                            type="button"
                            onClick={handleSave}
                            disabled={
                                saving || loadingDropdowns
                            }
                        >
                            {saving
                                ? "Saving..."
                                : loadingDropdowns
                                    ? "Loading..."
                                    : item
                                        ? "Update"
                                        : "Save"}
                        </Button>
                    </DialogFooter>

                </div>
            </DialogContent>
        </Dialog>
    );
}
