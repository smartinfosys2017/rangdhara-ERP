
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
import { ScrollArea } from "@/components/ui/scroll-area";

import {
    Alert,
    AlertIcon,
    AlertTitle,
} from "@/components/ui/alert";
import { RiCheckboxCircleFill } from "@remixicon/react";
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
  // Use UnitName directly from Item Master API first
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

  // Find matching Unit Master record
  const matchedUnit = unitId
    ? units.find((unit) => String(unit.id) === String(unitId))
    : null;

  // Prefer Unit Master data when available
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
  ipAddress: "",
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
  // LOAD ITEM MASTER
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

      return updated;
    });
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
            <AlertTitle>{"Invalid Item Master record"}</AlertTitle>
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
  };

  // ------------------------------------------------------
  // CLOSE DIALOG
  // ------------------------------------------------------

  const handleClose = () => {
    if (saving) return;

    resetForm();
    closeDialog();
  };

  // ------------------------------------------------------
  // SUBMIT FORM
  // ------------------------------------------------------

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.machineNumber.trim()) {
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Please enter Machine Number</AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );
      return;
    }

    if (!form.machineName.trim()) {
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Please enter Machine Name</AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );
      return;
    }

    if (selectedGroups.length === 0) {
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>Please select at least one Group Name</AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );
      return;
    }

    for (const item of selectedItems) {
      if (
        !String(item.itemQty).trim() ||
        !Number.isFinite(Number(item.itemQty)) ||
        Number(item.itemQty) <= 0
      ) {
        toast.custom(
          () => (
            <Alert variant="mono" icon="error" close={false}>
              <AlertIcon>
                <RiCheckboxCircleFill />
              </AlertIcon>
              <AlertTitle>{`Enter a valid quantity for ${item.Selecteditem}`}</AlertTitle>
            </Alert>
          ),
          {
            position: "top-center",
          },
        );
        return;
      }
    }

    try {
      setSaving(true);
      const machineData = {
        machineNumber: form.machineNumber.trim(),
        machineCode: form.machineCode.trim(),
        machineName: form.machineName.trim(),
        ipAddress: form.ipAddress.trim(),

        // Prisma schema defines GroupName as String.
        // Multiple groups are stored as a JSON string.
        GroupName: JSON.stringify(selectedGroups),
        comment: form.comment.trim(),
        status: form.status,

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
        throw new Error(
          result.message || "Failed to create machine"
        );
      }

      toast.custom(
        () => (
          <Alert variant="mono" icon="success" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>
              {result.message || "Machine created successfully"}
            </AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );

      if (onSuccess) {
        onSuccess(result.data);
      }

      resetForm();
      closeDialog();
    } catch (error) {
      console.error("CREATE MACHINE ERROR:", error);
      toast.custom(
        () => (
          <Alert variant="mono" icon="error" close={false}>
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>
            <AlertTitle>
              {error.message || "Something went wrong"}
            </AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        },
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------
  // UI
  // ------------------------------------------------------

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => !value && handleClose()}
    >
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Machine Master</DialogTitle>
          <DialogDescription>
            Enter machine information and select the items assigned to
            this machine.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <DialogBody>
            {/* MACHINE INFORMATION */}

            <div className="space-y-1">
              <h3 className="text-sm font-semibold border-b pb-2">
                Machine Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                <div className="space-y-2">
                  <Label>Machine Code</Label>

                  <Input
                    value={form.machineCode || "Auto Generated"}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                    placeholder="Auto generated machine code"
                  />
                </div>
                {/* MACHINE NAME */}

                <div className="space-y-2">
                  <Label>
                    Machine Name <span className="text-red-500">*</span>
                  </Label>

                  <Input
                    value={form.machineName}
                    onChange={(e) =>
                      handleChange("machineName", e.target.value)
                    }
                    placeholder="Enter machine name"
                  />
                </div>
                {/* MACHINE NUMBER */}

                <div className="space-y-2">
                  <Label>
                    Machine Number <span className="text-red-500">*</span>
                  </Label>

                  <Input
                    value={form.machineNumber}
                    onChange={(e) =>
                      handleChange("machineNumber", e.target.value)
                    }
                    placeholder="Enter machine number"
                  />
                </div>

                {/* IP ADDRESS */}

                <div className="space-y-2">
                  <Label>IP Address</Label>

                  <Input
                    value={form.ipAddress}
                    onChange={(e) =>
                      handleChange("ipAddress", e.target.value)
                    }
                    placeholder="Enter IP address"
                  />
                </div>

                {/* STATUS */}

                <div className="space-y-2">
                  <Label>Operational <span className="text-red-500">*</span></Label>

                  <Select
                    value={form.status ? "active" : "inactive"}
                    onValueChange={(value) =>
                      handleChange("status", value === "active")
                    }
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

            <div className="space-y-1">
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
                <Label>
                  Group Name <span className="text-red-500">*</span>
                </Label>

                <div className="relative">
                  <button
                    type="button"
                    disabled={loadingGroups}
                    onClick={() =>
                      setGroupDropdownOpen((prev) => !prev)
                    }
                    className="w-full min-h-10 border rounded-md px-3 py-2 text-sm text-left flex items-center justify-between gap-2 bg-background"
                  >
                    <span className="truncate">
                      {loadingGroups
                        ? "Loading groups."
                        : selectedGroups.length > 0
                          ? `${selectedGroups.length} group(s) selected`
                          : "Select groups"}
                    </span>

                    <span className="text-muted-foreground">
                      {groupDropdownOpen ? "▲" : "▼"}
                    </span>
                  </button>

                  {groupDropdownOpen && (
                    <div className="absolute z-50 top-full mt-1 w-full border rounded-md bg-popover shadow-md p-2">
                      <div className="flex items-center justify-between gap-2 pb-2 border-b">
                        <span className="text-xs font-medium">
                          Select Item Groups
                        </span>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => {
                              const allGroups = itemGroups
                                .map((group) => String(group.groupName || ""))
                                .filter(Boolean);

                              setSelectedGroups(allGroups);
                              setForm((prev) => ({
                                ...prev,
                                GroupName: allGroups,
                              }));
                            }}
                          >
                            Select All
                          </button>

                          <button
                            type="button"
                            className="text-xs text-destructive hover:underline"
                            onClick={clearSelectedGroups}
                          >
                            Clear All
                          </button>
                        </div>
                      </div>

                      <ScrollArea className="max-h-52">
                        <div className="space-y-1 py-2">
                          {itemGroups.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No groups found
                            </p>
                          ) : (
                            itemGroups.map((group) => {
                              const groupName = String(group.groupName || "");
                              const checked =
                                selectedGroups.includes(groupName);

                              return (
                                <label
                                  key={group.id}
                                  className="flex items-center gap-2 rounded px-2 py-2 text-sm cursor-pointer hover:bg-muted"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() =>
                                      handleGroupToggle(groupName)
                                    }
                                    className="h-4 w-4"
                                  />

                                  <span>{groupName}</span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>

                      <div className="border-t pt-2 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() =>
                            setGroupDropdownOpen(false)
                          }
                        >
                          Done
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

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
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Select All
                      </button>

                      <button
                        type="button"
                        onClick={handleClearAvailable}
                        disabled={!selectedAvailableIds.length}
                        className="text-xs font-medium text-destructive hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Clear All
                      </button>

                      <button
                        type="button"
                        onClick={handleTransferSelected}
                        disabled={!selectedAvailableIds.length}
                        className="text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
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
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Select All
                      </button>

                      <button
                        type="button"
                        onClick={handleClearDetails}
                        disabled={!selectedDetailIds.length}
                        className="text-xs font-medium text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Clear All
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveSelected}
                        disabled={!selectedDetailIds.length}
                        className="text-xs font-medium text-destructive hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
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
                                  onChange={(e) =>
                                    updateSelectedItem(
                                      item.itemMasterId,
                                      "itemQty",
                                      e.target.value
                                    )
                                  }
                                  className="h-9 w-[100px]"
                                  placeholder="Quantity"
                                />
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
              {saving ? "Saving." : "Save Machine"}
            </Button>
          </DialogFooter>
        </form>

      </DialogContent>
    </Dialog>
  );
}