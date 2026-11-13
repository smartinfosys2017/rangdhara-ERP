"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useSession } from "next-auth/react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
const getToday = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getInitialForm = () => ({
  ItemGroupid: "",
  ItemMasterid: "",
  ItemTypeid: "",
  TransactionTypeid: "",
  IssueDate: getToday(),
  Qty: "",
  PreviousBalance: 0,
  Balance: 0,
  Issue_by: "",
  GetPassNo: "",
  DateOfRecive: "",
  ReciptChallanNo: "",
  RecivedBy: "",
  Comment: "",
  Price: "",
  Particuler: "",
});

export default function IssueReceiptAddDialog({
  open,
  closeDialog,
  onSuccess,
}) {
  // AUTHENTICATED USER
  const { data: session, status } = useSession();

  const userName = session?.user?.name || "admin";
  const userId = session?.user?.id || null;

  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [errors, setErrors] = useState({});
  const [form, setForm] = useState(getInitialForm());

  // UPDATE FIELD
  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // CALCULATE BALANCE
  const calculateBalance = (
    previousBalance,
    qty,
    transactionTypeId,
    transactionList = transactions,
  ) => {
    const previous = Number(previousBalance) || 0;
    const quantity = Number(qty) || 0;

    if (!transactionTypeId) return previous;

    const transaction = transactionList.find(
      (item) => String(item.id) === String(transactionTypeId),
    );

    if (!transaction) return previous;

    const effect = String(
      transaction.EffectOnTransaction ?? transaction.effectOnTransaction ?? "",
    )
      .trim()
      .toLowerCase();

    if (["addition", "add", "additions"].includes(effect)) {
      return previous + quantity;
    }

    if (
      ["deduction", "deductions", "deduct", "subtract", "subtraction"].includes(
        effect,
      )
    ) {
      return previous - quantity;
    }

    return previous;
  };

  // FETCH PREVIOUS BALANCE
  const fetchPreviousBalance = async (itemMasterId) => {
    if (!itemMasterId) return 0;

    try {
      const response = await apiFetch(
        `/api/inventory/issue-receipt/previous-balance/${itemMasterId}`,
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch previous balance");
      }

      return Number(result.data?.PreviousBalance ?? 0);
    } catch (error) {
      console.error("PREVIOUS BALANCE ERROR", error);
      toast.error(error.message || "Failed to fetch previous balance");
      return 0;
    }
  };

  // STAFF NAME
  const getStaffName = (staff) => {
    const name = [staff?.firstName, staff?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

    return (
      name ||
      staff?.username ||
      staff?.name ||
      staff?.email ||
      `User #${staff?.id}`
    );
  };

  // LOAD DROPDOWNS
  const loadDropdowns = async () => {
    try {
      setDropdownLoading(true);

      const [
        groupResponse,
        itemResponse,
        typeResponse,
        transactionResponse,
        staffResponse,
      ] = await Promise.all([
        apiFetch("/api/inventory/item-groups?limit=100&status=active"),
        apiFetch("/api/inventory/item-master?limit=100&status=active"),
        apiFetch("/api/inventory/product-type?limit=100&status=active"),
        apiFetch("/api/inventory/transaction-type?limit=100&status=active"),
        apiFetch("/api/staff?limit=100&status=active"),
      ]);

      const groupResult = await groupResponse.json();
      const itemResult = await itemResponse.json();
      const typeResult = await typeResponse.json();
      const transactionResult = await transactionResponse.json();
      const staffResult = await staffResponse.json();

      if (!groupResponse.ok || !groupResult.success) {
        throw new Error(groupResult.message || "Failed loading Item Groups");
      }

      if (!itemResponse.ok || !itemResult.success) {
        throw new Error(itemResult.message || "Failed loading Item Masters");
      }

      if (!typeResponse.ok || !typeResult.success) {
        throw new Error(typeResult.message || "Failed loading Item Types");
      }

      if (!transactionResponse.ok || !transactionResult.success) {
        throw new Error(
          transactionResult.message || "Failed loading Transaction Types",
        );
      }

      if (!staffResponse.ok || !staffResult.success) {
        throw new Error(staffResult.message || "Failed loading staff users");
      }

      const groupList = groupResult.data || [];
      const itemList = itemResult.data || [];
      const typeList = typeResult.data || [];
      const transactionList = transactionResult.data || [];
      const staffList = staffResult.data || staffResult.users || [];

      setGroups(groupList);
      setItems(itemList);
      setTypes(typeList);
      setTransactions(transactionList);
      setStaffUsers(staffList);

      const defaultGroup =
        groupList.find((item) => item.isDefault === true) || groupList[0];

      const defaultItem =
        itemList.find((item) => item.isDefault === true) ||
        itemList.find(
          (item) =>
            !defaultGroup?.id ||
            String(item.ItemGroupid) === String(defaultGroup.id),
        ) ||
        itemList[0];

      const defaultType =
        typeList.find((item) => item.isDefault === true) || typeList[0];

      const defaultTransaction =
        transactionList.find((item) => item.isDefault === true) ||
        transactionList[0];

      const defaultStaff = staffList[0];

      const defaultGroupId = defaultGroup?.id || "";
      const defaultItemMasterId = defaultItem?.id || "";
      const defaultTypeId = defaultType?.id || "";
      const defaultTransactionTypeId = defaultTransaction?.id || "";
      const defaultStaffId = defaultStaff?.id || "";

      let previousBalance = 0;

      if (defaultItemMasterId) {
        previousBalance = await fetchPreviousBalance(defaultItemMasterId);
      }

      const initialBalance = calculateBalance(
        previousBalance,
        "",
        defaultTransactionTypeId,
        transactionList,
      );

      setForm((prev) => ({
        ...prev,
        ItemGroupid: prev.ItemGroupid || defaultGroupId,
        ItemMasterid: prev.ItemMasterid || defaultItemMasterId,
        ItemTypeid: prev.ItemTypeid || defaultTypeId,
        TransactionTypeid: prev.TransactionTypeid || defaultTransactionTypeId,
        Issue_by: prev.Issue_by || defaultStaffId,
        RecivedBy: prev.RecivedBy || defaultStaffId,
        PreviousBalance: previousBalance,
        Balance: initialBalance,
      }));
    } catch (error) {
      console.error("ISSUE/RECEIPT DROPDOWN ERROR", error);
      toast.error(error.message || "Failed loading dropdown data");
    } finally {
      setDropdownLoading(false);
    }
  };

  // LOAD WHEN DIALOG OPENS
  useEffect(() => {
    if (!open) return;

    setForm(getInitialForm());
    loadDropdowns();
  }, [open]);

  // ITEM GROUP CHANGE
  const handleGroupChange = (value) => {
    setForm((prev) => ({
      ...prev,
      ItemGroupid: value,
      ItemMasterid: "",
      PreviousBalance: 0,
      Balance: 0,
    }));
  };

  // ITEM MASTER CHANGE
  const handleItemMasterChange = async (value) => {
    setForm((prev) => ({
      ...prev,
      ItemMasterid: value,
      PreviousBalance: 0,
      Balance: 0,
    }));

    if (!value) return;

    const previousBalance = await fetchPreviousBalance(value);

    setForm((prev) => ({
      ...prev,
      ItemMasterid: value,
      PreviousBalance: previousBalance,
      Balance: calculateBalance(
        previousBalance,
        prev.Qty,
        prev.TransactionTypeid,
        transactions,
      ),
    }));
  };

  // TRANSACTION TYPE CHANGE
  const handleTransactionTypeChange = (value) => {
    setForm((prev) => ({
      ...prev,
      TransactionTypeid: value,
      Balance: calculateBalance(
        prev.PreviousBalance,
        prev.Qty,
        value,
        transactions,
      ),
    }));
  };

  // QTY CHANGE
  const handleQtyChange = (value) => {
    setForm((prev) => ({
      ...prev,
      Qty: value,
      Balance: calculateBalance(
        prev.PreviousBalance,
        value,
        prev.TransactionTypeid,
        transactions,
      ),
    }));
  };

  // RESET
  const resetForm = () => {
    setForm(getInitialForm());
  };

  // CLOSE
  const handleClose = () => {
    if (loading) return;

    resetForm();
    closeDialog?.();
  };

  // VALIDATION
  const validateForm = () => {
    if (!form.ItemGroupid) {
      toast.error("Item Group is required");
      return false;
    }

    if (!form.ItemMasterid) {
      toast.error("Item Master is required");
      return false;
    }

    if (!form.ItemTypeid) {
      toast.error("Item Type is required");
      return false;
    }

    if (!form.TransactionTypeid) {
      toast.error("Transaction Type is required");
      return false;
    }

    if (!form.IssueDate) {
      toast.error("Issue Date is required");
      return false;
    }

    if (!form.Qty) {
      toast.error("Quantity is required");
      return false;
    }

    if (Number(form.Qty) <= 0) {
      toast.error("Quantity must be greater than 0");
      return false;
    }

    if (!form.Issue_by) {
      toast.error("Issue By is required");
      return false;
    }

    if (!form.RecivedBy) {
      toast.error("Received By is required");
      return false;
    }

    return true;
  };

  // SAVE
  const handleSubmit = async () => {
    if (!validateForm()) return;

    if (status === "loading") {
      toast.error("Please wait while your user session loads.");
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch("/api/inventory/issue-receipt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          Qty: Number(form.Qty),
          PreviousBalance: Number(form.PreviousBalance),
          Balance: Number(form.Balance),
          Price: form.Price ? Number(form.Price) : null,

          // Logged-in NextAuth user
          UserName: userName,
          UserId: userId,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed creating Issue/Receipt");
      }

      toast.success("Issue/Receipt created successfully");

      onSuccess?.(result.data);
      resetForm();
      closeDialog?.();
    } catch (error) {
      console.error("CREATE ISSUE/RECEIPT ERROR", error);
      toast.error(error.message || "Failed creating Issue/Receipt");
    } finally {
      setLoading(false);
    }
  };

  // FILTER ITEMS BY GROUP
  const filteredItems = items.filter(
    (item) =>
      !form.ItemGroupid ||
      String(item.ItemGroupid) === String(form.ItemGroupid),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) handleClose();
      }}
    >
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-[90vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>
            Add New Entry
          </DialogTitle>

          <DialogDescription>
            Enter the issue/receipt details below.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[60vh] overflow-hidden">
        <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* LEFT SIDE */}
            <div className="space-y-5">
              <div className="border-b pb-3">
                <h3 className="text-sm font-semibold">Item Details</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Select item and enter stock information
                </p>
              </div>

              {/* ITEM GROUP */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Item Group <span className="ml-1 text-destructive">*</span>
                </label>

                <Select
                  value={String(form.ItemGroupid || "")}
                  onValueChange={handleGroupChange}
                  disabled={dropdownLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Item Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {groups.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.groupName ||
                          item.GroupName ||
                          item.name ||
                          `Group #${item.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ITEM MASTER */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Item Master <span className="ml-1 text-destructive">*</span>
                </label>

                <Select
                  value={String(form.ItemMasterid || "")}
                  onValueChange={handleItemMasterChange}
                  disabled={dropdownLoading || !form.ItemGroupid}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Item Master" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredItems.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.ItemName ||
                          item.itemName ||
                          item.name ||
                          `Item #${item.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* ITEM TYPE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Item Type <span className="ml-1 text-destructive">*</span>
                </label>

                <Select
                  value={String(form.ItemTypeid || "")}
                  onValueChange={(value) => updateField("ItemTypeid", value)}
                  disabled={dropdownLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Item Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.ProductType ||
                          item.productType ||
                          item.name ||
                          `Type #${item.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TRANSACTION TYPE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Transaction Type{" "}
                  <span className="ml-1 text-destructive">*</span>
                </label>

                <Select
                  value={String(form.TransactionTypeid || "")}
                  onValueChange={handleTransactionTypeChange}
                  disabled={dropdownLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {transactions.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.TransactionType ||
                          item.transactionType ||
                          item.name ||
                          `Transaction #${item.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* DATE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Date <span className="ml-1 text-destructive">*</span>
                </label>
                <Input
                  type="date"
                  value={form.IssueDate}
                  onChange={(e) => updateField("IssueDate", e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* PREVIOUS BALANCE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Previous Balance</label>
                <Input
                  type="number"
                  value={form.PreviousBalance ?? 0}
                  readOnly
                  className="bg-muted"
                />
              </div>

              {/* QTY */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Qty <span className="ml-1 text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Enter quantity"
                  value={form.Qty}
                  onChange={(e) => handleQtyChange(e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* PRICE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter price"
                  value={form.Price || ""}
                  onChange={(e) => updateField("Price", e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* PARTICULER */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Particuler</label>
                <Input
                  placeholder="Enter particuler"
                  value={form.Particuler || ""}
                  onChange={(e) => updateField("Particuler", e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* BALANCE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Balance</label>
                <Input
                  type="number"
                  value={form.Balance ?? 0}
                  readOnly
                  className="bg-muted font-medium"
                />
              </div>
            </div>

            {/* RIGHT SIDE */}
            <div className="space-y-5">
              <div className="border-b pb-3">
                <h3 className="text-sm font-semibold">
                  Issue & Receive Details
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Enter issue and receiving information
                </p>
              </div>

              {/* ISSUE BY */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Issue By <span className="ml-1 text-destructive">*</span>
                </label>

                <Select
                  value={String(form.Issue_by || "")}
                  onValueChange={(value) => updateField("Issue_by", value)}
                  disabled={dropdownLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffUsers.map((staff) => (
                      <SelectItem key={staff.id} value={String(staff.id)}>
                        {getStaffName(staff)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gate Pass NO */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Gate Pass No</label>
                <Input
                  placeholder="Enter gate pass number"
                  value={form.GetPassNo}
                  onChange={(e) => updateField("GetPassNo", e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* DATE OF RECEIVE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Of Receive</label>
                <Input
                  type="date"
                  value={form.DateOfRecive}
                  onChange={(e) => updateField("DateOfRecive", e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* RECEIPT CHALLAN NO */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Receipt Challan No
                </label>
                <Input
                  placeholder="Enter receipt challan number"
                  value={form.ReciptChallanNo}
                  onChange={(e) =>
                    updateField("ReciptChallanNo", e.target.value)
                  }
                  disabled={loading}
                />
              </div>

              {/* RECEIVED BY */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Received By <span className="ml-1 text-destructive">*</span>
                </label>

                <Select
                  value={String(form.RecivedBy || "")}
                  onValueChange={(value) => updateField("RecivedBy", value)}
                  disabled={dropdownLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffUsers.map((staff) => (
                      <SelectItem key={staff.id} value={String(staff.id)}>
                        {getStaffName(staff)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* COMMENT */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Comment</label>
                <Textarea
                  placeholder="Enter any additional comments..."
                  value={form.Comment}
                  onChange={(e) => updateField("Comment", e.target.value)}
                  rows={6}
                  disabled={loading}
                  className="resize-none"
                />
                {errors.Comment && (
                  <p className="text-sm text-destructive">{errors.Comment}</p>
                )}

                <p className="text-xs text-muted-foreground">
                  {form.Comment.length}/1000 characters
                </p>
              </div>
            </div>
          </div>
        </DialogBody>
        </ScrollArea>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || dropdownLoading || status === "loading"}
          >
            {loading ? "Saving..." : "Save Issue/Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
