
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";

import {
    CalendarIcon,
    Check,
    ChevronsUpDown,
    Search,
} from "lucide-react";

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
} from "./production-custom-fields";

// ======================================================
// API ENDPOINTS
// ======================================================

const API = {
    shifts: "/api/hr/Shift?limit=10000&status=active",
    dropdowns: "/api/production?type=dropdowns",
};

// ======================================================
// GENERAL HELPERS
// ======================================================

const getToday = () => format(new Date(), "yyyy-MM-dd'T'HH:mm");

const getDefaultForm = () => ({
    productionDate: getToday(),
    shiftId: "",
    machineId: "",
    itemId: "",
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

// ======================================================
// UNIT HELPERS
// ======================================================

const getItemUnitLabel = (item, units = []) => {
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
                icon={type === "success" ? "success" : "destructive"}
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

    // ======================================================
    // SEARCHABLE DROPDOWN STATES
    // ======================================================

    const [shiftDropdownOpen, setShiftDropdownOpen] = useState(false);
    const [shiftSearch, setShiftSearch] = useState("");

    const [machineDropdownOpen, setMachineDropdownOpen] = useState(false);
    const [machineSearch, setMachineSearch] = useState("");

    const [itemDropdownOpen, setItemDropdownOpen] = useState(false);
    const [itemSearch, setItemSearch] = useState("");

    // ======================================================
    // DATABASE DROPDOWN DATA
    // ======================================================

    const [shifts, setShifts] = useState([]);
    const [machines, setMachines] = useState([]);
    const [items, setItems] = useState([]);
    const [units, setUnits] = useState([]);

    // ======================================================
    // CUSTOM FIELDS
    // ======================================================

    const [customFieldDefinitions, setCustomFieldDefinitions] =
        useState([]);

    const [customFields, setCustomFields] = useState({});

    // ======================================================
    // FILTERED DROPDOWN OPTIONS
    // ======================================================

    const filteredShifts = useMemo(() => {
        const search = shiftSearch.trim().toLowerCase();

        if (!search) return shifts;

        return shifts.filter((shift) =>
            String(shift.name || "")
                .toLowerCase()
                .includes(search)
        );
    }, [shifts, shiftSearch]);

    const filteredMachines = useMemo(() => {
        const search = machineSearch.trim().toLowerCase();

        if (!search) return machines;

        return machines.filter((machine) =>
            `${machine.machineName || ""} ${machine.machineCode || ""}`
                .toLowerCase()
                .includes(search)
        );
    }, [machines, machineSearch]);

    const filteredItems = useMemo(() => {
        const search = itemSearch.trim().toLowerCase();

        if (!search) return items;

        return items.filter((record) =>
            String(getItemName(record))
                .toLowerCase()
                .includes(search)
        );
    }, [items, itemSearch]);

    // ======================================================
    // SELECTED OPTIONS
    // ======================================================

    const selectedShift = useMemo(
        () =>
            shifts.find(
                (shift) =>
                    String(shift.id) === String(form.shiftId)
            ) || null,
        [shifts, form.shiftId]
    );

    const selectedMachine = useMemo(
        () =>
            machines.find(
                (machine) =>
                    String(machine.id) === String(form.machineId)
            ) || null,
        [machines, form.machineId]
    );

    const selectedItem = useMemo(
        () =>
            items.find(
                (record) =>
                    String(getItemId(record)) === String(form.itemId)
            ) || null,
        [items, form.itemId]
    );

    const selectedUnitLabel = selectedItem
        ? getItemUnitLabel(selectedItem, units)
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

            const contentType = response.headers.get("content-type") || "";

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

            return result;
        };

        const loadDropdowns = async () => {
            setLoadingDropdowns(true);

            try {
                // Fetch Shift separately and all other dropdowns together.
                const [shiftResult, dropdownResult] = await Promise.allSettled([
                    fetchDropdown(API.shifts, "shifts"),
                    fetchDropdown(API.dropdowns, "production dropdowns"),
                ]);

                if (cancelled) return;

                // SHIFT DATA
                if (shiftResult.status === "fulfilled") {
                    setShifts(getResponseList(shiftResult.value));
                } else {
                    console.error("PRODUCTION SHIFTS DROPDOWN ERROR:", shiftResult.reason);
                    setShifts([]);
                }

                // MACHINE, ITEM AND UNIT DATA
                if (dropdownResult.status === "fulfilled") {
                    const dropdownData = dropdownResult.value?.data || {};

                    setMachines(
                        Array.isArray(dropdownData.machines)
                            ? dropdownData.machines
                            : []
                    );

                    setItems(
                        Array.isArray(dropdownData.items)
                            ? dropdownData.items
                            : []
                    );

                    setUnits(
                        Array.isArray(dropdownData.units)
                            ? dropdownData.units
                            : []
                    );
                } else {
                    console.error(
                        "PRODUCTION DROPDOWNS ERROR:",
                        dropdownResult.reason
                    );

                    setMachines([]);
                    setItems([]);
                    setUnits([]);
                }
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

        const productionItem = item?.item || null;

        setForm({
            productionDate: item?.productionDate
                ? format(
                    new Date(item.productionDate),
                    "yyyy-MM-dd'T'HH:mm"
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
        // setCustomFieldDefinitions([]);
        setErrors({});

        setShiftSearch("");
        setMachineSearch("");
        setItemSearch("");

        setShiftDropdownOpen(false);
        setMachineDropdownOpen(false);
        setItemDropdownOpen(false);
    }, [open, item]);

    // ======================================================
    // UPDATE UNIT WHEN ITEM CHANGES
    // ======================================================

    useEffect(() => {
        if (!selectedItem) return;

        const unitId = getItemUnitId(selectedItem);

        if (!unitId) return;

        setForm((previous) => {
            if (String(previous.unitId) === String(unitId)) {
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
        updateField("machineId", value);
    };

    // ======================================================
    // ITEM CHANGE
    // ======================================================

    const handleItemChange = (value) => {
        const selected = items.find(
            (record) =>
                String(getItemId(record)) === String(value)
        );

        setForm((previous) => ({
            ...previous,
            itemId: value,
            unitId: String(getItemUnitId(selected) || ""),
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
            newErrors.shiftId = "Please select a shift.";
        } else if (!selectedShift) {
            newErrors.shiftId = "Please select a valid shift.";
        }

        if (!form.machineId) {
            newErrors.machineId = "Please select a machine.";
        } else if (!selectedMachine) {
            newErrors.machineId = "Please select a valid machine.";
        }

        if (!form.itemId) {
            newErrors.itemId = "Please select an item.";
        } else if (!selectedItem) {
            newErrors.itemId = "Please select a valid item.";
        }

        if (
            form.productionQuantity !== "" &&
            (
                !Number.isFinite(Number(form.productionQuantity)) ||
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
                "Please select a valid machine and item."
            );

            return;
        }

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
                    result.message || "Failed to save production."
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
            console.error("PRODUCTION SAVE ERROR:", error);

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

        setShiftSearch("");
        setMachineSearch("");
        setItemSearch("");

        setShiftDropdownOpen(false);
        setMachineDropdownOpen(false);
        setItemDropdownOpen(false);

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
                            {item ? "Edit Production" : "Add Production"}
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
                                    <span className="text-destructive">*</span>
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
                                                    new Date(`${form.productionDate.slice(0, 10)}T00:00:00`),
                                                    "dd MMM yyyy"
                                                )
                                                : "Pick a date"}

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
                                                    ? new Date(`${form.productionDate.slice(0, 10)}T00:00:00`)
                                                    : undefined
                                            }
                                            onSelect={(date) =>
                                                updateField(
                                                    "productionDate",
                                                    date
                                                        ? `${format(date, "yyyy-MM-dd")}T${form.productionDate?.slice(11, 16) || format(new Date(), "HH:mm")}`
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
                                    <span className="text-destructive">*</span>
                                </label>

                                <Popover
                                    open={shiftDropdownOpen}
                                    onOpenChange={(value) => {
                                        setShiftDropdownOpen(value);

                                        if (!value) {
                                            setShiftSearch("");
                                        }
                                    }}
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={shiftDropdownOpen}
                                            disabled={loadingDropdowns}
                                            className="w-full justify-between font-normal"
                                        >
                                            <span className="truncate">
                                                {loadingDropdowns
                                                    ? "Loading shifts..."
                                                    : selectedShift?.name || "Select shift"}
                                            </span>

                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent
                                        align="start"
                                        className="w-[var(--radix-popover-trigger-width)] p-0"
                                    >
                                        <div className="flex items-center border-b px-3">
                                            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />

                                            <Input
                                                value={shiftSearch}
                                                onChange={(e) =>
                                                    setShiftSearch(e.target.value)
                                                }
                                                placeholder="Search shift..."
                                                className="h-10 border-0 shadow-none focus-visible:ring-0"
                                            />
                                        </div>

                                        <div className="max-h-56 overflow-y-auto overscroll-contain">
                                            <div className="p-1">
                                                {filteredShifts.length > 0 ? (
                                                    filteredShifts.map((shift) => (
                                                        <button
                                                            key={shift.id}
                                                            type="button"
                                                            onClick={() => {
                                                                updateField(
                                                                    "shiftId",
                                                                    String(shift.id)
                                                                );

                                                                setShiftDropdownOpen(false);
                                                                setShiftSearch("");
                                                            }}
                                                            className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                                        >
                                                            <span>{shift.name}</span>

                                                            <Check
                                                                className={`ml-2 h-4 w-4 ${String(form.shiftId) === String(shift.id)
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                                    }`}
                                                            />
                                                        </button>
                                                    ))
                                                ) : (
                                                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                                        No shifts found.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

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
                                    <span className="text-destructive">*</span>
                                </label>

                                <Popover
                                    open={machineDropdownOpen}
                                    onOpenChange={(value) => {
                                        setMachineDropdownOpen(value);

                                        if (!value) {
                                            setMachineSearch("");
                                        }
                                    }}
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={machineDropdownOpen}
                                            disabled={loadingDropdowns}
                                            className="w-full justify-between font-normal"
                                        >
                                            <span className="truncate">
                                                {loadingDropdowns
                                                    ? "Loading machines..."
                                                    : selectedMachine
                                                        ? `${selectedMachine.machineName} (${selectedMachine.machineCode})`
                                                        : "Select machine"}
                                            </span>

                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent
                                        align="start"
                                        className="w-[var(--radix-popover-trigger-width)] p-0"
                                    >
                                        <div className="flex items-center border-b px-3">
                                            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />

                                            <Input
                                                value={machineSearch}
                                                onChange={(e) =>
                                                    setMachineSearch(e.target.value)
                                                }
                                                placeholder="Search machine..."
                                                className="h-10 border-0 shadow-none focus-visible:ring-0"
                                            />
                                        </div>

                                        <div className="max-h-56 overflow-y-auto overscroll-contain">
                                            <div className="p-1">
                                                {filteredMachines.length > 0 ? (
                                                    filteredMachines.map((machine) => (
                                                        <button
                                                            key={machine.id}
                                                            type="button"
                                                            onClick={() => {
                                                                handleMachineChange(
                                                                    String(machine.id)
                                                                );

                                                                setMachineDropdownOpen(false);
                                                                setMachineSearch("");
                                                            }}
                                                            className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                                        >
                                                            <span>
                                                                {machine.machineName} ({machine.machineCode})
                                                            </span>

                                                            <Check
                                                                className={`ml-2 h-4 w-4 ${String(form.machineId) === String(machine.id)
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                                    }`}
                                                            />
                                                        </button>
                                                    ))
                                                ) : (
                                                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                                        No machines found.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

                                {errors.machineId && (
                                    <p className="mt-1 text-xs text-destructive">
                                        {errors.machineId}
                                    </p>
                                )}
                            </div>

                            {/* ITEM */}

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    Item{" "}
                                    <span className="text-destructive">*</span>
                                </label>

                                <Popover
                                    open={itemDropdownOpen}
                                    onOpenChange={(value) => {
                                        setItemDropdownOpen(value);

                                        if (!value) {
                                            setItemSearch("");
                                        }
                                    }}
                                >
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={itemDropdownOpen}
                                            disabled={loadingDropdowns || items.length === 0}
                                            className="w-full justify-between font-normal"
                                        >
                                            <span className="truncate">
                                                {loadingDropdowns
                                                    ? "Loading items..."
                                                    : selectedItem
                                                        ? getItemName(selectedItem)
                                                        : "Select item"}
                                            </span>

                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>

                                    <PopoverContent
                                        align="start"
                                        className="w-[var(--radix-popover-trigger-width)] p-0"
                                    >
                                        <div className="flex items-center border-b px-3">
                                            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />

                                            <Input
                                                value={itemSearch}
                                                onChange={(e) =>
                                                    setItemSearch(e.target.value)
                                                }
                                                placeholder="Search item..."
                                                className="h-10 border-0 shadow-none focus-visible:ring-0"
                                            />
                                        </div>

                                        <div className="max-h-56 overflow-y-auto overscroll-contain">
                                            <div className="p-1">
                                                {filteredItems.length > 0 ? (
                                                    filteredItems.map((record) => (
                                                        <button
                                                            key={getItemId(record)}
                                                            type="button"
                                                            onClick={() => {
                                                                handleItemChange(
                                                                    String(getItemId(record))
                                                                );

                                                                setItemDropdownOpen(false);
                                                                setItemSearch("");
                                                            }}
                                                            className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                                                        >
                                                            <span>{getItemName(record)}</span>

                                                            <Check
                                                                className={`ml-2 h-4 w-4 ${String(form.itemId) === String(getItemId(record))
                                                                    ? "opacity-100"
                                                                    : "opacity-0"
                                                                    }`}
                                                            />
                                                        </button>
                                                    ))
                                                ) : (
                                                    <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                                                        No items found.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>

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
                                        value={form.productionQuantity}
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
                                        updateField("remarks", e.target.value)
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
                                    onFieldsLoaded={(loadedFields) => {
                                        setCustomFieldDefinitions(loadedFields);
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
                            disabled={saving || loadingDropdowns}
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
