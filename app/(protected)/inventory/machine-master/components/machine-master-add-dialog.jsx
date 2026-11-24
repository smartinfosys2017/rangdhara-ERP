
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Alert,
  AlertIcon,
  AlertTitle,
} from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RiCheckboxCircleFill, RiErrorWarningFill, } from "@remixicon/react";

import MachineCustomFields, { validateRequiredCustomFields, } from "../../custom-fields/import-custom-fields";
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
    { position: "top-center" },
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
    { position: "top-center" },
  );
};
// ------------------------------------------------------
// API HELPER
// ------------------------------------------------------

const apiFetch = (url, options = {}) =>
  fetch(url, {
    credentials: "same-origin",
    ...options,
  });

// ------------------------------------------------------
// HELPERS
// ------------------------------------------------------

const getItemId = (item) =>
  String(item?.id || item?.itemMasterId || "");

const getItemName = (item) =>
  item?.ItemName ||
  item?.itemName ||
  item?.name ||
  item?.Selecteditem ||
  "";

const getItemUnit = (item, units = []) => {
  // Use UnitName directly from Item API first
  const directUnit =
    item?.UnitName ||
    item?.unitName ||
    item?.unit?.unitName ||
    item?.Unit?.unitName ||
    item?.itemUnit;

  const unitId =
    item?.Unitid ||
    item?.unitId ||
    item?.UnitId ||
    item?.unitID ||
    item?.unit?.id ||
    item?.Unit?.id;

  // Find matching Unit record
  const matchedUnit = unitId
    ? units.find((unit) => String(unit.id) === String(unitId))
    : null;

  // Prefer Unit data when available
  const unitName =
    matchedUnit?.unitName ||
    directUnit ||
    "";

  const abbreviation =
    matchedUnit?.abbreviation ||
    "";

  if (!unitName || unitName === "-") return "";

  // Return format: CM (Test)
  return abbreviation
    ? `${unitName} (${abbreviation})`
    : String(unitName);
};

const getItemGroup = (item, groups = []) => {
  const directGroup =
    item?.GroupName ||
    item?.groupName ||
    item?.itemGroup?.groupName ||
    item?.ItemGroup?.groupName ||
    item?.group?.groupName ||
    item?.itemGroupName ||
    item?.SelectedGroupName;

  if (directGroup) {
    return String(directGroup);
  }

  const groupId =
    item?.ItemGroupid ||
    item?.itemGroupId ||
    item?.groupId ||
    item?.ItemGroup?.id ||
    item?.itemGroup?.id;

  if (!groupId) return "";

  const matchedGroup = groups.find(
    (group) => String(group.id) === String(groupId)
  );

  return matchedGroup?.groupName || "";
};

const getItemQuantity = (item) =>
  item?.openingBalance ??
  item?.quantity ??
  item?.itemQty ??
  "1";

const getArrayFromResponse = (json) => {
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.data?.items)) return json.data.items;
  if (Array.isArray(json?.items)) return json.items;
  return [];
};

const isActive = (item) => {
  if (item?.status === undefined || item?.status === null) {
    return true;
  }

  return (
    item.status === true ||
    item.status === 1 ||
    item.status === "1" ||
    String(item.status).toUpperCase() === "ACTIVE"
  );
};

// ------------------------------------------------------
// INITIAL FORM
// ------------------------------------------------------
const generateMachineCode = () => {
  return `MCH-${crypto.randomUUID()
    .replace(/-/g, "")
    .substring(0, 8)
    .toUpperCase()}`;
};
const initialForm = {
  machineNumber: "",
  machineCode: generateMachineCode(),
  machineName: "",
  GroupName: [],
  OperateId: "",
  comment: "",
  status: true,
};

// ------------------------------------------------------
// COMPONENT
// ------------------------------------------------------

export default function MachineMasterAddDialog({
  open,
  closeDialog,
  onSuccess,
}) {
  const [form, setForm] = useState(initialForm);

  const [itemGroups, setItemGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);

  const [selectedGroups, setSelectedGroups] = useState([]);
  const [searchItem, setSearchItem] = useState("");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [selectedAvailableIds, setSelectedAvailableIds] = useState([]);
  const [selectedDetailIds, setSelectedDetailIds] = useState([]);

  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [customFields, setCustomFields] = useState({});
  const [customFieldsReady, setCustomFieldsReady] = useState(false);

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleItemListKeyDown = (
    e,
    items,
    selectedIds,
    setSelectedIds,
    getId
  ) => {
    const currentIndex = items.findIndex(
      (item) => getId(item) === e.currentTarget.dataset.itemId
    );

    if (currentIndex === -1) return;

    let nextIndex = currentIndex;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        nextIndex = Math.min(currentIndex + 1, items.length - 1);
        break;

      case "ArrowUp":
        e.preventDefault();
        nextIndex = Math.max(currentIndex - 1, 0);
        break;

      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;

      case "End":
        e.preventDefault();
        nextIndex = items.length - 1;
        break;

      case " ":
      case "Enter": {
        e.preventDefault();

        const id = getId(items[currentIndex]);

        setSelectedIds((prev) =>
          prev.includes(id)
            ? prev.filter((itemId) => itemId !== id)
            : [...prev, id]
        );
        return;
      }

      default:
        return;
    }

    const nextId = getId(items[nextIndex]);

    document
      .querySelector(`[data-item-id="${CSS.escape(nextId)}"]`)
      ?.focus();
  };
  // ------------------------------------------------------
  // FORM HANDLER
  // ------------------------------------------------------

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };
  // ------------------------------------------------------
  // LOAD UNITS
  // ------------------------------------------------------

  const loadUnits = async () => {
    try {
      setLoadingUnits(true);

      const res = await apiFetch("/api/inventory/unit?limit=100");
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.message || "Failed to load units");
      }

      setUnits(getArrayFromResponse(json));
    } catch (error) {
      console.error("LOAD UNITS ERROR:", error);
      setUnits([]);
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>
              {error.message || "Unable to load units"}
            </AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );

    } finally {
      setLoadingUnits(false);
    }
  };
  // ------------------------------------------------------
  // LOAD ITEM GROUPS
  // ------------------------------------------------------

  const loadItemGroups = async () => {
    try {
      setLoadingGroups(true);

      const res = await apiFetch(
        "/api/inventory/item-groups?limit=100&status=active"
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load item groups");
      }

      setItemGroups(getArrayFromResponse(json));
    } catch (error) {
      console.error("LOAD ITEM GROUPS ERROR:", error);
      setItemGroups([]);
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>
              {error.message || "Unable to load item groups"}
            </AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );
    } finally {
      setLoadingGroups(false);
    }
  };

  // ------------------------------------------------------
  // LOAD USERS
  // ------------------------------------------------------

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);

      const response = await apiFetch(
        "/api/inventory/filter-users",
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to fetch administrator users"
        );
      }

      setUsers(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error("FETCH FILTER USERS ERROR:", error);
      setUsers([]);
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>
              {error.message || "Unable to load users"}
            </AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );
    } finally {
      setLoadingUsers(false);
    }
  };

  // ------------------------------------------------------
  // LOAD ITEM
  // ------------------------------------------------------

  const loadAvailableItems = async () => {
    try {
      setLoadingItems(true);

      const res = await apiFetch(
        "/api/inventory/item-master?limit=100&status=active"
      );

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load items");
      }

      const items = getArrayFromResponse(json).filter(isActive);

      setAvailableItems(items);
    } catch (error) {
      console.error("LOAD AVAILABLE ITEMS ERROR:", error);
      setAvailableItems([]);
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>
              {error.message || "Unable to load available items"}
            </AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );

    } finally {
      setLoadingItems(false);
    }
  };

  // ------------------------------------------------------
  // LOAD DATA WHEN DIALOG OPENS
  // ------------------------------------------------------

  useEffect(() => {
    if (!open) return;

    loadItemGroups();
    fetchUsers();
    loadAvailableItems();
    loadUnits();
  }, [open]);

  // ------------------------------------------------------
  // MULTI-SELECT GROUP HANDLER
  // ------------------------------------------------------

  const handleGroupToggle = (groupName) => {
    setSelectedGroups((prev) => {
      const updated = prev.includes(groupName)
        ? prev.filter((item) => item !== groupName)
        : [...prev, groupName];

      setForm((formPrev) => ({
        ...formPrev,
        GroupName: updated,
      }));

      setSelectedAvailableIds([]);

      return updated;
    });
  };

  const clearSelectedGroups = () => {
    setSelectedGroups([]);

    setForm((prev) => ({
      ...prev,
      GroupName: [],
    }));
    setSelectedAvailableIds([]);
  };

  // ------------------------------------------------------
  // FILTER AVAILABLE ITEMS
  // ------------------------------------------------------

  const filteredItems = useMemo(() => {
    let items = [...availableItems];

    // No group selected: show all active items.
    // Groups selected: show items belonging to selected groups.
    if (selectedGroups.length > 0) {
      items = items.filter((item) => {
        const itemGroup = getItemGroup(item, itemGroups).toLowerCase();

        return selectedGroups.some(
          (group) => group.toLowerCase() === itemGroup
        );
      });
    }

    // Search by item name or unit.
    if (searchItem.trim()) {
      const search = searchItem.trim().toLowerCase();

      items = items.filter((item) => {
        const name = getItemName(item).toLowerCase();
        const unit = String(getItemUnit(item, units)).toLowerCase();

        return name.includes(search) || unit.includes(search);
      });
    }

    // Hide items already selected.
    const selectedIds = new Set(
      selectedItems.map((item) => String(item.itemMasterId))
    );

    return items.filter(
      (item) => !selectedIds.has(getItemId(item))
    );
  }, [
    availableItems,
    itemGroups,
    units,
    selectedGroups,
    searchItem,
    selectedItems,
  ]);
  const groupOptions = useMemo(
    () =>
      itemGroups
        .filter((group) => group.groupName)
        .map((group) => ({
          label: String(group.groupName),
          value: String(group.groupName),
        })),
    [itemGroups],
  );
  // ------------------------------------------------------
  // ADD ITEM
  // ------------------------------------------------------

  const handleAddItem = (item) => {
    const itemId = getItemId(item);

    if (!itemId) {
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>{"Invalid Item record"}</AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );
      return;
    }

    const alreadySelected = selectedItems.some(
      (selected) => String(selected.itemMasterId) === itemId
    );

    if (alreadySelected) {
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>{"Item already selected"}</AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );

      return;
    }

    const newItem = {
      itemMasterId: itemId,
      SelectedGroupName: getItemGroup(item, itemGroups),
      Selecteditem: getItemName(item),
      itemUnit: getItemUnit(item, units),
      itemQty: String(getItemQuantity(item) || "1"),
      itemdescription: "",
    };

    setSelectedItems((prev) => [...prev, newItem]);
    setSelectedAvailableIds((prev) =>
      prev.filter((id) => id !== itemId)
    );
    toast.custom(
      () => (
        <Alert variant="mono" icon="success" close={false}>
          <AlertIcon>
            <RiCheckboxCircleFill />
          </AlertIcon>
          <AlertTitle>{`${newItem.Selecteditem} added`}</AlertTitle>
        </Alert>
      ),
      {
        position: "top-center",
      },
    );
  };

  // ------------------------------------------------------
  // UPDATE SELECTED ITEM
  // ------------------------------------------------------

  const updateSelectedItem = (itemId, field, value) => {
    setSelectedItems((prev) =>
      prev.map((item) =>
        String(item.itemMasterId) === String(itemId)
          ? {
            ...item,
            [field]: value,
          }
          : item
      )
    );
  };

  // ------------------------------------------------------
  // REMOVE SELECTED ITEM
  // ------------------------------------------------------

  const handleRemoveItem = (itemId) => {
    setSelectedItems((prev) =>
      prev.filter(
        (item) => String(item.itemMasterId) !== String(itemId)
      )
    );
  };
  // ------------------------------------------------------
  // AVAILABLE ITEMS: BULK SELECTION
  // ------------------------------------------------------

  const handleSelectAllAvailable = () => {
    setSelectedAvailableIds(filteredItems.map(getItemId));
  };

  const handleClearAvailable = () => {
    setSelectedAvailableIds([]);
  };

  const handleAvailableToggle = (itemId) => {
    setSelectedAvailableIds((prev) =>
      prev.includes(String(itemId))
        ? prev.filter((id) => id !== String(itemId))
        : [...prev, String(itemId)]
    );
  };

  // ------------------------------------------------------
  // TRANSFER SELECTED ITEMS
  // ------------------------------------------------------

  const handleTransferSelected = () => {
    const selected = filteredItems.filter((item) =>
      selectedAvailableIds.includes(getItemId(item))
    );

    if (!selected.length) {
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>{"Please select at least one available item"}</AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );

      return;
    }

    const newItems = selected
      .filter(
        (item) =>
          !selectedItems.some(
            (selectedItem) =>
              String(selectedItem.itemMasterId) === getItemId(item)
          )
      )
      .map((item) => ({
        itemMasterId: getItemId(item),
        SelectedGroupName: getItemGroup(item, itemGroups),
        Selecteditem: getItemName(item),
        itemUnit: getItemUnit(item, units),
        itemQty: String(getItemQuantity(item) || "1"),
        itemdescription: "",
      }));

    if (newItems.length) {
      setSelectedItems((prev) => [...prev, ...newItems]);
      toast.custom(
        () => (
          <Alert variant="mono" icon="success" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>{`${newItems.length} item(s) transferred`}</AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );
    }

    setSelectedAvailableIds([]);
  };

  // ------------------------------------------------------
  // SELECTED ITEMS: BULK SELECTION
  // ------------------------------------------------------

  const handleSelectAllDetails = () => {
    setSelectedDetailIds(
      selectedItems.map((item) => String(item.itemMasterId))
    );
  };

  const handleClearDetails = () => {
    setSelectedDetailIds([]);
  };

  const handleDetailToggle = (itemId) => {
    const id = String(itemId);

    setSelectedDetailIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    );
  };

  // ------------------------------------------------------
  // REMOVE SELECTED ITEMS
  // ------------------------------------------------------

  const handleRemoveSelected = () => {
    if (!selectedDetailIds.length) {
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>{"Please select at least one item to remove"}</AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );

      return;
    }

    setSelectedItems((prev) =>
      prev.filter(
        (item) =>
          !selectedDetailIds.includes(String(item.itemMasterId))
      )
    );

    toast.custom(
      () => (
        <Alert variant="mono" icon="success" close={false}>
          <AlertIcon>
            <RiCheckboxCircleFill />
          </AlertIcon>
          <AlertTitle>{`${selectedDetailIds.length} item(s) removed`}</AlertTitle>
        </Alert>
      ),
      {
        position: "top-center",
      },
    );
    setSelectedDetailIds([]);
  };
  // ------------------------------------------------------
  // RESET FORM
  // ------------------------------------------------------

  const resetForm = () => {
    setForm({
      ...initialForm,
      machineCode: generateMachineCode(),
    });

    setSelectedGroups([]);
    setSelectedItems([]);
    setSelectedAvailableIds([]);
    setSelectedDetailIds([]);
    setSearchItem("");
    setGroupDropdownOpen(false);

    setErrors({});
    setSubmitted(false);
    setCustomFields({});
  };

  // ------------------------------------------------------
  // CLOSE DIALOG
  // ------------------------------------------------------

  const handleClose = () => {
    if (saving) return;

    resetForm();
    closeDialog();
  };
  const validateForm = () => {
    const newErrors = {};

    // Machine Code
    if (!String(form.machineCode || "").trim()) {
      newErrors.machineCode = "Machine Code is required.";
    }

    // Machine Name
    if (!String(form.machineName || "").trim()) {
      newErrors.machineName = "Machine Name is required.";
    }

    // Machine Number
    if (!String(form.machineNumber || "").trim()) {
      newErrors.machineNumber = "Machine Number is required.";
    }

    // Item quantity
    selectedItems.forEach((item) => {
      const quantity = Number(item.itemQty);

      if (
        !String(item.itemQty ?? "").trim() ||
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        newErrors[`quantity_${item.itemMasterId}`] =
          `Enter a valid quantity for ${item.Selecteditem}.`;
      }
    });

    // Required custom fields
    const missingCustomFields = validateRequiredCustomFields(
      customFieldDefinitions,
      customFields
    );

    if (missingCustomFields.length > 0) {
      newErrors.customFields =
        `Please fill in required custom fields: ${missingCustomFields.join(", ")}`;
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };
  // ------------------------------------------------------
  // SUBMIT FORM
  // ------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSubmitted(true);

    if (!validateForm()) {
      showErrorToast("Please fix the highlighted fields before saving.");
      return;
    }

    try {
      setSaving(true);

      const machineData = {
        machineNumber: form.machineNumber.trim(),
        machineCode: form.machineCode.trim(),
        machineName: form.machineName.trim(),
        GroupName: JSON.stringify(selectedGroups),
        comment: form.comment.trim(),
        status: form.status,
        customFields: customFields ?? {},
        itemDetails: selectedItems.map((item) => ({
          itemMasterId: item.itemMasterId,
          SelectedGroupName: item.SelectedGroupName,
          Selecteditem: item.Selecteditem,
          itemUnit: item.itemUnit,
          itemQty: String(item.itemQty),
          itemdescription: item.itemdescription || "",
        })),
      };

      const response = await apiFetch(
        "/api/inventory/machine-master",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(machineData),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to create machine.");
      }

      showSuccessToast(
        result.message || "Machine created successfully."
      );

      if (onSuccess) {
        onSuccess(result.data);
      }

      resetForm();
      closeDialog();
    } catch (error) {
      console.error("CREATE MACHINE ERROR:", error);
      showErrorToast(error.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------
  // UI
  // ------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogContent className="mx-auto flex w-[calc(100%-2rem)] max-w-[886px] max-h-[90vh] flex-col gap-0 overflow-hidden  px-4 sm:px-6 md:px-10 " variant="fullscreen">
        <DialogHeader>
          <DialogTitle>Add Machinery</DialogTitle>
          <DialogDescription>
            Enter machine information and select the items assigned to
            this machine.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="min-h-0 flex-1 py-0 mb-5 ps-0 pe-3 -me-7">
          <form onSubmit={handleSubmit} className="space-y-3">
            <DialogBody className="space-y-6">
              {/* MACHINE INFORMATION */}

              <div className="space-y-1">
                <h3 className="text-sm font-semibold border-b pb-2">
                  Machine Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  <div className="space-y-2">
                    <Label>
                      Machine Code <span className="text-red-500">*</span>
                    </Label>

                    <Input
                      value={form.machineCode || ""}
                      readOnly
                      className={`bg-muted cursor-not-allowed ${errors.machineCode ? "border-red-500 focus-visible:ring-red-500" : ""
                        }`}
                      placeholder="Auto generated machine code"
                    />

                    {errors.machineCode && (
                      <p className="text-xs text-red-500">
                        {errors.machineCode}
                      </p>
                    )}
                  </div>
                  {/* MACHINE NAME */}

                  <div className="space-y-2">
                    <Label>
                      Machine Name <span className="text-red-500">*</span>
                    </Label>

                    <Input
                      value={form.machineName}
                      onChange={(e) => {
                        handleChange("machineName", e.target.value);
                        setErrors((prev) => ({
                          ...prev,
                          machineName: "",
                        }));
                      }}
                      placeholder="Enter machine name"
                      className={
                        errors.machineName
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    />

                    {errors.machineName && (
                      <p className="text-xs text-red-500">
                        {errors.machineName}
                      </p>
                    )}
                  </div>
                  {/* MACHINE NUMBER */}

                  <div className="space-y-2">
                    <Label>
                      Machine Number <span className="text-red-500">*</span>
                    </Label>

                    <Input
                      value={form.machineNumber}
                      onChange={(e) => {
                        handleChange("machineNumber", e.target.value);
                        setErrors((prev) => ({
                          ...prev,
                          machineNumber: "",
                        }));
                      }}
                      placeholder="Enter machine number"
                      className={
                        errors.machineNumber
                          ? "border-red-500 focus-visible:ring-red-500"
                          : ""
                      }
                    />

                    {errors.machineNumber && (
                      <p className="text-xs text-red-500">
                        {errors.machineNumber}
                      </p>
                    )}
                  </div>

                  {/* STATUS */}

                  <div className="space-y-2">
                    <Label>Operational <span className="text-red-500">*</span></Label>

                    <Select
                      value={form.status ? "active" : "inactive"}
                      onValueChange={(value) =>
                        handleChange("status", value === "active")
                      }
                      className="cursor-pointer"
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="active">Yes</SelectItem>
                        <SelectItem value="inactive">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* MACHINE COMMENT */}

                <div className="space-y-2">
                  <Label>Comment</Label>

                  <Textarea
                    value={form.comment}
                    onChange={(e) =>
                      handleChange("comment", e.target.value)
                    }
                    placeholder="Enter machine comment"
                    rows={2}
                  />
                </div>
              </div>

              {/* ITEM SELECTION */}

              <div className="pt-2 space-y-1">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Machine Item Details
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select all active items
                    </p>
                  </div>

                  <span className="text-sm font-medium">
                    Selected Items: {selectedItems.length}
                  </span>
                </div>
                {/* GROUP NAME MULTI-SELECT */}

                <div className="space-y-2">
                  <Label>Item Group</Label>

                  <MultiSelect
                    options={groupOptions}
                    value={selectedGroups}
                    onValueChange={(values) => {
                      const uniqueValues = [...new Set(values)];

                      setSelectedGroups(uniqueValues);

                      setForm((prev) => ({
                        ...prev,
                        GroupName: uniqueValues,
                      }));

                      // Clear selections that are no longer visible after filtering.
                      setSelectedAvailableIds([]);
                    }}
                    placeholder={loadingGroups ? "Loading groups..." : "Select Item Groups"}
                    searchPlaceholder="Search Item Group..."
                    disabled={loadingGroups || groupOptions.length === 0}
                  />

                  <p className="text-xs text-muted-foreground">
                    {selectedGroups.length > 0
                      ? `Showing items from: ${selectedGroups.join(", ")}`
                      : "No group selected displays all active items."}
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
                  {/* AVAILABLE ITEMS */}

                  <div className="border rounded-lg p-2 space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm">
                        Available Items ({filteredItems.length})
                      </h4>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleSelectAllAvailable}
                          disabled={!filteredItems.length}
                          className="text-xs font-medium text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Select All
                        </button>

                        <button
                          type="button"
                          onClick={handleClearAvailable}
                          disabled={!selectedAvailableIds.length}
                          className="text-xs font-medium text-destructive hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Clear All
                        </button>

                        <button
                          type="button"
                          onClick={handleTransferSelected}
                          disabled={!selectedAvailableIds.length}
                          className="text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Transfer Selected ({selectedAvailableIds.length})
                        </button>
                      </div>
                    </div>

                    <Input
                      value={searchItem}
                      onChange={(e) => setSearchItem(e.target.value)}
                      placeholder="Search item name or unit"
                    />

                    <p className="text-xs text-muted-foreground">
                      {selectedGroups.length > 0
                        ? `Showing items from: ${selectedGroups.join(", ")}`
                        : "Showing all active Items"}
                    </p>

                    <ScrollArea className="h-[380px] pr-1">
                      <div className="space-y-1">
                        {loadingItems ? (
                          <div className="text-center text-sm text-muted-foreground py-5">
                            Loading available items...
                          </div>
                        ) : filteredItems.length === 0 ? (
                          <div className="text-center text-sm text-muted-foreground py-5">
                            No available items found.
                          </div>
                        ) : (
                          filteredItems.map((item) => {
                            const itemId = getItemId(item);
                            const checked = selectedAvailableIds.includes(itemId);

                            return (
                              <label
                                key={itemId}
                                className={`flex items-center justify-between gap-2 border rounded-md p-2 cursor-pointer transition-colors ${checked ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                                  }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <input
                                    id={`available-${itemId}`}
                                    data-item-id={itemId}
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleAvailableToggle(itemId)}
                                    onKeyDown={(e) =>
                                      handleItemListKeyDown(
                                        e,
                                        filteredItems,
                                        selectedAvailableIds,
                                        setSelectedAvailableIds,
                                        getItemId
                                      )
                                    }
                                    className="h-4 w-4 shrink-0 accent-primary"
                                  />

                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {getItemName(item)}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                      Unit: {getItemUnit(item, units) || "-"}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                      Group: {getItemGroup(item, itemGroups) || "-"}
                                    </p>
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddItem(item)}
                                >
                                  Add
                                </Button>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* SELECTED ITEM DETAILS */}

                  <div className="border rounded-lg p-1 space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm">
                        Selected Item ({selectedItems.length})
                      </h4>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleSelectAllDetails}
                          disabled={!selectedItems.length}
                          className="text-xs font-medium text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Select All
                        </button>

                        <button
                          type="button"
                          onClick={handleClearDetails}
                          disabled={!selectedDetailIds.length}
                          className="text-xs font-medium text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Clear All
                        </button>

                        <button
                          type="button"
                          onClick={handleRemoveSelected}
                          disabled={!selectedDetailIds.length}
                          className="text-xs font-medium text-destructive hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Remove Selected ({selectedDetailIds.length})
                        </button>
                      </div>
                    </div>

                    {selectedItems.length === 0 ? (
                      <div className="h-[380px] flex flex-col items-center justify-center text-center">
                        <p className="text-sm font-medium text-muted-foreground">
                          No items selected
                        </p>

                        <p className="text-xs text-muted-foreground mt-1">
                          Select items from the Available Items panel.
                        </p>
                      </div>
                    ) : (
                      <div className="h-[430px] w-full overflow-auto border rounded-md">
                        <table className="min-w-[768px] w-full text-sm border-collapse">
                          <thead className="sticky top-0 bg-muted z-20">
                            <tr className="border-b">
                              <th className="p-2 w-[45px] text-center">
                                <input
                                  type="checkbox"
                                  checked={
                                    selectedItems.length > 0 &&
                                    selectedDetailIds.length === selectedItems.length
                                  }
                                  onChange={(e) =>
                                    e.target.checked
                                      ? handleSelectAllDetails()
                                      : handleClearDetails()
                                  }
                                  aria-label="Select all selected items"
                                  className="h-4 w-4 accent-primary"
                                />
                              </th>
                              <th className="text-left p-1 font-semibold whitespace-nowrap w-[180px]">
                                Item Name
                              </th>
                              <th className="text-left p-1 font-semibold whitespace-nowrap w-[100px]">
                                Unit
                              </th>

                              <th className="text-left p-1 font-semibold whitespace-nowrap w-[130px]">
                                Quantity
                              </th>

                              <th className="text-left p-1 font-semibold whitespace-nowrap w-[250px]">
                                Comment
                              </th>

                              <th className="text-center p-1 font-semibold whitespace-nowrap w-[120px]">
                                Action
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {selectedItems.map((item) => (
                              <tr
                                key={item.itemMasterId}
                                className="border-b hover:bg-muted/40"
                              >
                                <td className="p-2 text-center">
                                  <input
                                    type="checkbox"
                                    data-item-id={String(item.itemMasterId)}
                                    checked={selectedDetailIds.includes(
                                      String(item.itemMasterId)
                                    )}
                                    onChange={() => handleDetailToggle(item.itemMasterId)}
                                    onKeyDown={(e) =>
                                      handleItemListKeyDown(
                                        e,
                                        selectedItems,
                                        selectedDetailIds,
                                        setSelectedDetailIds,
                                        (selectedItem) => String(selectedItem.itemMasterId)
                                      )
                                    }
                                    aria-label={`Select ${item.Selecteditem}`}
                                    className="h-4 w-4 accent-primary"
                                  />
                                </td>
                                <td className="p-1 font-medium whitespace-nowrap">
                                  {item.Selecteditem}
                                </td>
                                <td className="p-1 whitespace-nowrap">
                                  {item.itemUnit || "-"}
                                </td>
                                <td className="p-1">
                                  <Input
                                    type="number"
                                    min="0.01"
                                    step="any"
                                    value={item.itemQty}
                                    onChange={(e) => {
                                      updateSelectedItem(
                                        item.itemMasterId,
                                        "itemQty",
                                        e.target.value
                                      );

                                      setErrors((prev) => ({
                                        ...prev,
                                        [`quantity_${item.itemMasterId}`]: "",
                                      }));
                                    }}
                                    className={`h-9 w-[100px] ${errors[`quantity_${item.itemMasterId}`]
                                      ? "border-red-500 focus-visible:ring-red-500"
                                      : ""
                                      }`}
                                    placeholder="Quantity"
                                  />

                                  {errors[`quantity_${item.itemMasterId}`] && (
                                    <p className="text-xs text-red-500 mt-1 whitespace-normal">
                                      {errors[`quantity_${item.itemMasterId}`]}
                                    </p>
                                  )}
                                </td>

                                <td className="p-1">
                                  <Input
                                    value={item.itemdescription || ""}
                                    onChange={(e) =>
                                      updateSelectedItem(
                                        item.itemMasterId,
                                        "itemdescription",
                                        e.target.value
                                      )
                                    }
                                    className="h-9 w-[220px]"
                                    placeholder="Enter comment"
                                  />
                                </td>

                                {/* ACTION */}
                                <td className="p-3 text-center whitespace-nowrap">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() =>
                                      handleRemoveItem(item.itemMasterId)
                                    }
                                  >
                                    Remove
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CUSTOM FIELDS */}

              <div className="space-y-4 border-t pt-5">
                <div>
                  <h3 className="text-base font-semibold">Custom Fields</h3>

                  <p className="text-sm text-muted-foreground">
                    Additional machine information.
                  </p>
                </div>

                <MachineCustomFields
                  values={customFields}
                  onChange={setCustomFields}
                  onFieldsLoaded={(loadedFields) => {
                    setCustomFieldDefinitions(loadedFields);
                    setCustomFieldsReady(true);
                  }}
                />
                {errors.customFields && (
                  <p className="text-sm text-red-500">
                    {errors.customFields}
                  </p>
                )}
              </div>
            </DialogBody>
            {/* FOOTER */}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}