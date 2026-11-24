
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { History } from "lucide-react";
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

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";
import MachineCustomFields, { validateRequiredCustomFields, } from "../../custom-fields/import-custom-fields";
// ------------------------------------------------------
// API HELPER
// ------------------------------------------------------

const apiFetch = (url, options = {}) =>
  fetch(url, {
    credentials: "same-origin",
    ...options,
  });
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
// HELPERS
// ------------------------------------------------------

const getItemId = (item) =>
  String(
    item?.id ??
    item?.itemMasterId ??
    item?.ItemMasterid ??
    item?.itemId ??
    ""
  );

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

  if (directGroup) return String(directGroup);

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
  if (Array.isArray(json)) return json;
  return [];
};

const parseJsonArray = (value) => {
  if (Array.isArray(value)) return value;

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === "object") return [parsed];

      return [];
    } catch {
      // Support a single group name stored as plain text.
      return [value.trim()];
    }
  }

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
function DetailCard({ icon: Icon, title, children }) {
  return (
    <div className="rounded-lg border p-3 space-y-2 min-w-0">
      <div className="flex items-center gap-2 font-semibold text-sm">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        {title}
      </div>

      <div className="text-sm text-muted-foreground break-words">
        {children || "-"}
      </div>
    </div>
  );
}
const normalizeGroups = (value) =>
  parseJsonArray(value)
    .map((group) => {
      if (typeof group === "string") return group;

      return (
        group?.groupName ||
        group?.GroupName ||
        group?.name ||
        ""
      );
    })
    .filter(Boolean);

const normalizeMachineItems = (value) => {
  const items = parseJsonArray(value);

  return items
    .map((item) => ({
      itemMasterId: String(
        item?.itemMasterId ??
        item?.ItemMasterid ??
        item?.itemMasterID ??
        item?.itemId ??
        item?.id ??
        ""
      ),

      SelectedGroupName:
        item?.SelectedGroupName ??
        item?.groupName ??
        item?.GroupName ??
        item?.itemGroupName ??
        "",

      Selecteditem:
        item?.Selecteditem ??
        item?.ItemName ??
        item?.itemName ??
        item?.name ??
        "",

      itemUnit:
        item?.itemUnit ??
        item?.UnitName ??
        item?.unitName ??
        item?.unit?.unitName ??
        "",

      itemQty: String(
        item?.itemQty ??
        item?.quantity ??
        item?.qty ??
        "1"
      ),

      itemdescription:
        item?.itemdescription ??
        item?.comment ??
        item?.description ??
        "",
    }))
    .filter((item) => item.itemMasterId);
};

const normalizeStatus = (status) => {
  if (status === undefined || status === null) return true;

  return (
    status === true ||
    status === 1 ||
    status === "1" ||
    String(status).toUpperCase() === "ACTIVE"
  );
};

// ------------------------------------------------------
// INITIAL FORM
// ------------------------------------------------------

const EMPTY_FORM = {
  id: null,
  machineNumber: "",
  machineCode: "",
  machineName: "",
  GroupName: [],
  OperateId: "",
  comment: "",
  status: true,
};

// ------------------------------------------------------
// COMPONENT
// ------------------------------------------------------

export default function MachineMasterEditDialog({
  open,
  closeDialog,
  onSuccess,

  // Parent component passes Machine.
  MachineMaster,
  machine,
  Machine,
  machineData,
  selectedMachine,
}) {
  const currentMachine =
    MachineMaster ||
    machine ||
    Machine ||
    machineData ||
    selectedMachine ||
    null;

  const [form, setForm] = useState(EMPTY_FORM);

  const [itemGroups, setItemGroups] = useState([]);
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [units, setUnits] = useState([]);

  const [searchItem, setSearchItem] = useState("");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedAvailableIds, setSelectedAvailableIds] = useState([]);
  const [selectedDetailIds, setSelectedDetailIds] = useState([]);
  const [changeLogs, setChangeLogs] = useState([]);
  const [loadingChangeLogs, setLoadingChangeLogs] = useState(false);

  const [customFieldDefinitions, setCustomFieldDefinitions] = useState([]);
  const [customFields, setCustomFields] = useState({});
  const [customFieldsReady, setCustomFieldsReady] = useState(false);
  const [errors, setErrors] = useState({});
  // ------------------------------------------------------
  // LOAD UNITS
  // ------------------------------------------------------

  const loadUnits = async () => {
    try {
      setLoadingUnits(true);

      const response = await apiFetch(
        "/api/inventory/unit?limit=100"
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to load units");
      }

      setUnits(getArrayFromResponse(result));
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

      const response = await apiFetch(
        "/api/inventory/item-groups?limit=100&status=active"
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Failed to load item groups");
      }

      setItemGroups(getArrayFromResponse(result));
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
  // LOAD ITEM 
  // ------------------------------------------------------

  const loadAvailableItems = async () => {
    try {
      setLoadingItems(true);

      const response = await apiFetch(
        "/api/inventory/item-master?limit=100&status=active"
      );

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Failed to load items");
      }

      setAvailableItems(
        getArrayFromResponse(result).filter(isActive)
      );
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
    loadAvailableItems();
    loadUnits();
  }, [open]);

  // ------------------------------------------------------
  // LOAD EXISTING MACHINE DATA
  // ------------------------------------------------------

  useEffect(() => {
    if (!open || !currentMachine) return;

    console.log("EDIT MACHINE DATA:", currentMachine);

    const machineGroups = normalizeGroups(
      currentMachine.GroupName ??
      currentMachine.groupName
    );

    const machineItems = normalizeMachineItems(
      currentMachine.itemDetails ??
      currentMachine.ItemDetails ??
      currentMachine.machineItems ??
      currentMachine.machineItemDetails
    );

    setForm({
      id: currentMachine.id ?? null,

      machineNumber:
        currentMachine.machineNumber ??
        currentMachine.MachineNumber ??
        "",

      machineCode:
        currentMachine.machineCode ??
        currentMachine.MachineCode ??
        "",

      machineName:
        currentMachine.machineName ??
        currentMachine.MachineName ??
        "",

      GroupName: machineGroups,

      OperateId: String(
        currentMachine.OperateId ??
        currentMachine.operateId ??
        currentMachine.operatorId ??
        ""
      ),

      comment:
        currentMachine.comment ??
        currentMachine.Comment ??
        "",

      status: normalizeStatus(currentMachine.status),
    });
    setCustomFields(currentMachine?.customFields ?? {});
    setCustomFieldDefinitions([]);
    setCustomFieldsReady(false);

    setSelectedGroups(machineGroups);
    setSelectedItems(machineItems);
    setSelectedAvailableIds([]);
    setSelectedDetailIds([]);
    setSearchItem("");
    setGroupDropdownOpen(false);
  }, [open, currentMachine]);

  useEffect(() => {
    if (!open || !MachineMaster?.id) {
      setChangeLogs([]);
      return;
    }

    const fetchChangeLogs = async () => {
      try {
        setLoadingChangeLogs(true);

        const response = await fetch(
          `/api/inventory/machine-master/${MachineMaster.id}/change-logs`,
          {
            credentials: "same-origin",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to fetch change history.");
        }

        setChangeLogs(result.data || []);
      } catch (error) {
        console.error("FETCH MACHINE CHANGE LOG ERROR:", error);
        setChangeLogs([]);
      } finally {
        setLoadingChangeLogs(false);
      }
    };

    fetchChangeLogs();
  }, [open, MachineMaster?.id]);
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
  // GROUP MULTI-SELECT
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

      return updated;
    });
  };

  const handleSelectAllGroups = () => {
    const allGroups = itemGroups
      .map((group) => String(group.groupName || ""))
      .filter(Boolean);

    setSelectedGroups(allGroups);

    setForm((prev) => ({
      ...prev,
      GroupName: allGroups,
    }));
  };

  const clearSelectedGroups = () => {
    setSelectedGroups([]);

    setForm((prev) => ({
      ...prev,
      GroupName: [],
    }));
  };

  // ------------------------------------------------------
  // FILTER AVAILABLE ITEMS
  // ------------------------------------------------------

  const filteredItems = useMemo(() => {
    let items = [...availableItems];

    if (selectedGroups.length > 0) {
      items = items.filter((item) => {
        const itemGroup = getItemGroup(item, itemGroups).toLowerCase();

        return selectedGroups.some(
          (group) => group.toLowerCase() === itemGroup
        );
      });
    }

    if (searchItem.trim()) {
      const search = searchItem.trim().toLowerCase();

      items = items.filter((item) => {
        const name = String(getItemName(item)).toLowerCase();
        const unit = String(getItemUnit(item, units)).toLowerCase();

        return name.includes(search) || unit.includes(search);
      });
    }

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
            <AlertTitle>
              {"Invalid Item record"}
            </AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );
      return;
    }

    if (
      selectedItems.some(
        (selected) => String(selected.itemMasterId) === itemId
      )
    ) {
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>
              {"Item already selected"}
            </AlertTitle>
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
          ? { ...item, [field]: value }
          : item
      )
    );
  };

  // ------------------------------------------------------
  // REMOVE ITEM
  // ------------------------------------------------------

  const handleRemoveItem = (itemId) => {
    const id = String(itemId);

    setSelectedItems((prev) =>
      prev.filter((item) => String(item.itemMasterId) !== id)
    );

    setSelectedDetailIds((prev) =>
      prev.filter((selectedId) => selectedId !== id)
    );
  };

  // ------------------------------------------------------
  // AVAILABLE ITEMS BULK SELECTION
  // ------------------------------------------------------

  const handleSelectAllAvailable = () => {
    setSelectedAvailableIds(filteredItems.map(getItemId));
  };

  const handleClearAvailable = () => {
    setSelectedAvailableIds([]);
  };

  const handleAvailableToggle = (itemId) => {
    const id = String(itemId);

    setSelectedAvailableIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
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
            <AlertTitle>
              {error.message || "Please select at least one available item"}
            </AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );
      return;
    }

    const newItems = selected.map((item) => ({
      itemMasterId: getItemId(item),
      SelectedGroupName: getItemGroup(item, itemGroups),
      Selecteditem: getItemName(item),
      itemUnit: getItemUnit(item, units),
      itemQty: String(getItemQuantity(item) || "1"),
      itemdescription: "",
    }));

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
    setSelectedAvailableIds([]);
  };

  // ------------------------------------------------------
  // SELECTED ITEMS BULK SELECTION
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
            <AlertTitle>
              {"Please select at least one item to remove"}
            </AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );
      return;
    }

    const count = selectedDetailIds.length;

    setSelectedItems((prev) =>
      prev.filter(
        (item) =>
          !selectedDetailIds.includes(String(item.itemMasterId))
      )
    );

    setSelectedDetailIds([]);
    toast.custom(
      () => (
        <Alert variant="mono" icon="success" close={false}>
          <AlertIcon>
            <RiCheckboxCircleFill />
          </AlertIcon>
          <AlertTitle>{`${count} item(s) removed`}</AlertTitle>
        </Alert>
      ),
      {
        position: "top-center",
      },
    );
  };

  // ------------------------------------------------------
  // KEYBOARD NAVIGATION
  // ------------------------------------------------------

  const handleItemListKeyDown = (
    e,
    items,
    selectedIds,
    setSelectedIds,
    getId,
    listName
  ) => {
    const currentId = e.currentTarget.dataset.itemId;

    const currentIndex = items.findIndex(
      (item) => getId(item) === currentId
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
      case "Enter":
        e.preventDefault();

        setSelectedIds((prev) =>
          prev.includes(currentId)
            ? prev.filter((id) => id !== currentId)
            : [...prev, currentId]
        );

        return;

      default:
        return;
    }

    const nextId = getId(items[nextIndex]);

    document
      .querySelector(
        `[data-list="${listName}"][data-item-id="${CSS.escape(nextId)}"]`
      )
      ?.focus();
  };

  // ------------------------------------------------------
  // RESET FORM
  // ------------------------------------------------------

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setSelectedGroups([]);
    setSelectedItems([]);
    setSelectedAvailableIds([]);
    setSelectedDetailIds([]);
    setSearchItem("");
    setGroupDropdownOpen(false);
    setErrors({});
    setCustomFields({});
    setCustomFieldDefinitions([]);
    setCustomFieldsReady(false);
  };

  // ------------------------------------------------------
  // CLOSE DIALOG
  // ------------------------------------------------------

  const handleClose = () => {
    if (saving) return;

    resetForm();
    closeDialog?.();
  };

  const validateForm = () => {
    const newErrors = {};

    if (!String(form.machineCode || "").trim()) {
      newErrors.machineCode = "Machine Code is required.";
    }

    if (!String(form.machineName || "").trim()) {
      newErrors.machineName = "Machine Name is required.";
    }

    if (!String(form.machineNumber || "").trim()) {
      newErrors.machineNumber = "Machine Number is required.";
    }

    if (!form.id) {
      newErrors.id = "Machine record ID is missing.";
    }

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

    if (!customFieldsReady) {
      newErrors.customFields = "Custom fields are still loading. Please try again.";
    } else {
      const missingCustomFields = validateRequiredCustomFields(
        customFieldDefinitions,
        customFields
      );

      if (missingCustomFields.length > 0) {
        newErrors.customFields =
          `Please fill in required custom fields: ${missingCustomFields.join(", ")}`;
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // ------------------------------------------------------
  // UPDATE MACHINE
  // ------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showErrorToast("Please fix the highlighted fields before updating.");
      return;
    }

    try {
      setSaving(true);

      const machineData = {
        id: form.id,
        machineNumber: form.machineNumber.trim(),
        machineCode: form.machineCode.trim(),
        machineName: form.machineName.trim(),
        GroupName: JSON.stringify(selectedGroups),
        OperateId: form.OperateId || null,
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

      const response = await apiFetch("/api/inventory/machine-master", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(machineData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update machine.");
      }

      showSuccessToast(result.message || "Machine updated successfully.");

      onSuccess?.(result.data || machineData);

      resetForm();
      closeDialog?.();

    } catch (error) {
      console.error("UPDATE MACHINE ERROR:", error);
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
          <DialogTitle>Edit Machinery</DialogTitle>
          <DialogDescription>
            Update machine information and assigned items.
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>
                      Machine Code <span className="text-red-500">*</span>
                    </Label>

                    <Input
                      value={form.machineCode}
                      readOnly
                      className={`bg-muted cursor-not-allowed ${errors.machineCode ? "border-red-500 focus-visible:ring-red-500" : ""
                        }`}
                    />

                    {errors.machineCode && (
                      <p className="text-xs text-red-500">{errors.machineCode}</p>
                    )}
                  </div>

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
                      <p className="text-xs text-red-500">{errors.machineName}</p>
                    )}
                  </div>

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
                      <p className="text-xs text-red-500">{errors.machineNumber}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Operational <span className="text-red-500">*</span>
                    </Label>

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

              {/* MACHINE ITEM DETAILS */}

              <div className="pt-2 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2">
                  <div>
                    <h3 className="text-sm font-semibold">
                      Machine Item Details
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select active items for this machine.
                    </p>
                  </div>

                  <span className="text-sm font-medium">
                    Selected Items: {selectedItems.length}
                  </span>
                </div>

                {/* GROUP NAME */}

                <div className="space-y-2">
                  <Label>
                    Item Group
                  </Label>

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

                  {selectedGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {selectedGroups.map((group) => (
                        <span
                          key={group}
                          className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded px-2 py-1"
                        >
                          {group}

                          <button
                            type="button"
                            onClick={() => handleGroupToggle(group)}
                            className="font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    No group selected displays all active items.
                  </p>
                </div>

                {/* TWO COLUMN ITEM SELECTION */}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
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
                        : "Showing all active items"}
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
                            const checked =
                              selectedAvailableIds.includes(itemId);

                            return (
                              <div
                                key={itemId}
                                className={`flex items-center justify-between gap-2 border rounded-md p-2 transition-colors ${checked
                                  ? "bg-primary/10 border-primary"
                                  : "hover:bg-muted/50"
                                  }`}
                              >
                                <label
                                  htmlFor={`edit-available-${itemId}`}
                                  className="flex items-center gap-2 min-w-0 cursor-pointer"
                                >
                                  <input
                                    id={`edit-available-${itemId}`}
                                    data-list="available"
                                    data-item-id={itemId}
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      handleAvailableToggle(itemId)
                                    }
                                    onKeyDown={(e) =>
                                      handleItemListKeyDown(
                                        e,
                                        filteredItems,
                                        selectedAvailableIds,
                                        setSelectedAvailableIds,
                                        getItemId,
                                        "available"
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
                                </label>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddItem(item)}
                                >
                                  Add
                                </Button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* SELECTED ITEM DETAILS */}

                  <div className="border rounded-lg p-2 space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="font-semibold text-sm">
                        Selected Items ({selectedItems.length})
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
                            {selectedItems.map((item) => {
                              const itemId = String(item.itemMasterId);

                              return (
                                <tr
                                  key={itemId}
                                  className="border-b hover:bg-muted/40"
                                >
                                  <td className="p-2 text-center">
                                    <input
                                      type="checkbox"
                                      data-list="details"
                                      data-item-id={itemId}
                                      checked={selectedDetailIds.includes(itemId)}
                                      onChange={() =>
                                        handleDetailToggle(itemId)
                                      }
                                      onKeyDown={(e) =>
                                        handleItemListKeyDown(
                                          e,
                                          selectedItems,
                                          selectedDetailIds,
                                          setSelectedDetailIds,
                                          (selectedItem) =>
                                            String(selectedItem.itemMasterId),
                                          "details"
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
                                      <p className="mt-1 text-xs text-red-500 whitespace-normal">
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
                              );
                            })}
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
                {saving ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
          <div className="mt-3 space-y-3">
            <DetailCard>
              <div className=" space-y-1">
                <div className="flex items-center gap-1">
                  <History className="h-5 w-5" />
                  <h3 className="text-base font-semibold">
                    Machine Activity Log
                  </h3>

                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {changeLogs.length}
                  </span>
                </div>

                {loadingChangeLogs ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Loading change history...
                  </div>
                ) : changeLogs.length === 0 ? (
                  <div className="rounded-md border py-6 text-center text-sm text-muted-foreground">
                    No change history available.
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted">
                        <tr>
                          <th className="whitespace-nowrap px-1 py-1 text-left">
                            Date & Time
                          </th>
                          <th className="whitespace-nowrap px-1 py-1 text-left">
                            Updated By
                          </th>
                          <th className="px-1 py-1 text-left">Field</th>
                          <th className="px-1 py-1 text-left">Old Value</th>
                          <th className="px-1 py-1 text-left">New Value</th>
                        </tr>
                      </thead>


                      <tbody>
                        {changeLogs.map((log) => {
                          let details = {};

                          try {
                            details =
                              typeof log.Details === "string"
                                ? JSON.parse(log.Details)
                                : log.Details || {};
                          } catch {
                            details = {};
                          }

                          const formatValue = (value) => {
                            if (value === null || value === undefined || value === "") {
                              return "-";
                            }

                            if (typeof value === "boolean") {
                              return value ? "Active" : "Inactive";
                            }

                            if (Array.isArray(value)) {
                              if (value.length === 0) return "-";

                              return value
                                .map((item, index) => {
                                  if (typeof item === "object" && item !== null) {
                                    return Object.entries(item)
                                      .map(([key, val]) => `${key}: ${formatValue(val)}`)
                                      .join(", ");
                                  }

                                  return String(item);
                                })
                                .join(" | ");
                            }

                            if (typeof value === "object") {
                              return Object.entries(value)
                                .map(([key, val]) => `${key}: ${formatValue(val)}`)
                                .join(", ");
                            }

                            return String(value);
                          };

                          const changedFields = Object.entries(details).filter(
                            ([, change]) =>
                              change &&
                              typeof change === "object" &&
                              ("oldValue" in change || "newValue" in change)
                          );

                          return (
                            <tr key={log.id} className="border-t align-top">
                              <td className="whitespace-nowrap px-1 py-1">
                                {log.createdAt
                                  ? new Date(log.createdAt).toLocaleString()
                                  : "-"}
                              </td>

                              <td className="whitespace-nowrap px-1 py-1">
                                {log.UserName || "-"}
                              </td>

                              <td className="px-1 py-1">
                                <span className="font-medium">
                                  {log.Selecteditem || "-"}
                                </span>
                                <div className="text-xs text-muted-foreground">
                                  {log.Action || "-"}
                                </div>
                              </td>

                              <td className="max-w-[250px] break-words px-1 py-1">
                                {changedFields.length > 0 ? (
                                  <div className="space-y-2">
                                    {changedFields.map(([field, change]) => (
                                      <div key={field}>
                                        <div className="text-xs font-semibold capitalize text-muted-foreground">
                                          {field.replace(/([A-Z])/g, " $1")}
                                        </div>
                                        <div>{formatValue(change.oldValue)}</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>

                              <td className="max-w-[250px] break-words px-1 py-1">
                                {changedFields.length > 0 ? (
                                  <div className="space-y-2">
                                    {changedFields.map(([field, change]) => (
                                      <div key={field}>
                                        <div className="text-xs font-semibold capitalize text-muted-foreground">
                                          {field.replace(/([A-Z])/g, " $1")}
                                        </div>
                                        <div>{formatValue(change.newValue)}</div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>

                    </table>
                  </div>
                )}
              </div>
            </DetailCard>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}