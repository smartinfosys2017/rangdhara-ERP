"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { useSession } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// =======================================================
// GET TODAY
// =======================================================

const getToday = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

// =======================================================
// EMPTY FORM
// =======================================================

const EMPTY_FORM = {
  id: null,
  ItemGroupid: "",
  ItemMasterid: "",
  ItemTypeid: "",
  TransactionTypeid: "",
  IssueDate: getToday(),
  PreviousBalance: 0,
  Qty: "",
  Price: "",
  Particuler: "",
  Balance: 0,
  Issue_by: "",
  GetPassNo: "",
  DateOfRecive: "",
  ReciptChallanNo: "",
  RecivedBy: "",
  Comment: "",
};

// =======================================================
// COMPONENT
// =======================================================

export default function IssueReceiptEditDialog({
  open,
  closeDialog,
  onSuccess,
  IssueReceipt,
}) {
  // =====================================================
  // AUTHENTICATED NEXTAUTH USER
  // =====================================================

  const { data: session, status } = useSession();

  const userName = session?.user?.name || "admin";
  const userId = session?.user?.id || null;

  // =====================================================
  // STATES
  // =====================================================

  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);

  const [groups, setGroups] = useState([]);
  const [items, setItems] = useState([]);
  const [types, setTypes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);

  // =====================================================
  // STAFF NAME
  // =====================================================

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

  // =====================================================
  // CALCULATE BALANCE
  // =====================================================

  const calculateBalance = (
    previousBalance,
    qty,
    transactionTypeId,
    transactionList = transactions,
  ) => {
    const previous = Number(previousBalance) || 0;
    const quantity = Number(qty) || 0;

    if (!transactionTypeId) {
      return previous;
    }

    const transaction = transactionList.find(
      (item) => String(item.id) === String(transactionTypeId),
    );

    if (!transaction) {
      return previous;
    }

    const effect = String(
      transaction.EffectOnTransaction ?? transaction.effectOnTransaction ?? "",
    )
      .trim()
      .toLowerCase();

    // ADDITION

    if (["addition", "add", "additions"].includes(effect)) {
      return previous + quantity;
    }

    // DEDUCTION

    if (
      ["deduction", "deductions", "deduct", "subtract", "subtraction"].includes(
        effect,
      )
    ) {
      return previous - quantity;
    }

    return previous;
  };

  // =====================================================
  // LOAD DROPDOWNS
  // =====================================================

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
    } catch (error) {
      console.error("Issue/Receipt EDIT DROPDOWN ERROR", error);

      toast.error(error.message || "Failed loading dropdown data");
    } finally {
      setDropdownLoading(false);
    }
  };

  // =====================================================
  // LOAD DATA WHEN DIALOG OPENS
  // =====================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    setErrors({});
    setForm({ ...EMPTY_FORM });

    loadDropdowns();

    if (!IssueReceipt) {
      return;
    }

    setForm({
      id: IssueReceipt.id || null,

      ItemGroupid: IssueReceipt.ItemGroupid || "",
      ItemMasterid: IssueReceipt.ItemMasterid || "",
      ItemTypeid: IssueReceipt.ItemTypeid || "",
      TransactionTypeid: IssueReceipt.TransactionTypeid || "",

      IssueDate: IssueReceipt.IssueDate
        ? String(IssueReceipt.IssueDate).substring(0, 10)
        : getToday(),

      PreviousBalance: IssueReceipt.PreviousBalance ?? 0,

      Qty: IssueReceipt.Qty ?? "",

      Price:
        IssueReceipt.Price !== null && IssueReceipt.Price !== undefined
          ? String(IssueReceipt.Price)
          : "",

      Particuler: IssueReceipt.Particuler || "",

      Balance: IssueReceipt.Balance ?? 0,

      Issue_by: IssueReceipt.Issue_by || "",
      GetPassNo: IssueReceipt.GetPassNo || "",

      DateOfRecive: IssueReceipt.DateOfRecive
        ? String(IssueReceipt.DateOfRecive).substring(0, 10)
        : "",

      ReciptChallanNo: IssueReceipt.ReciptChallanNo || "",
      RecivedBy: IssueReceipt.RecivedBy || "",
      Comment: IssueReceipt.Comment || "",
    });
  }, [open, IssueReceipt]);

  // =====================================================
  // RECALCULATE BALANCE WHEN TRANSACTION DATA LOADS
  // =====================================================

  useEffect(() => {
    if (!open || !IssueReceipt || !transactions.length) {
      return;
    }

    if (!form.TransactionTypeid) {
      return;
    }

    const calculatedBalance = calculateBalance(
      form.PreviousBalance,
      form.Qty,
      form.TransactionTypeid,
      transactions,
    );

    setForm((prev) => ({
      ...prev,
      Balance: calculatedBalance,
    }));
  }, [open, IssueReceipt, transactions, form.TransactionTypeid]);

  // =====================================================
  // CHANGE FIELD
  // =====================================================

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: "",
    }));
  };

  // =====================================================
  // ITEM GROUP CHANGE
  // =====================================================

  const handleGroupChange = (value) => {
    setForm((prev) => ({
      ...prev,
      ItemGroupid: value,
      ItemMasterid: "",
      PreviousBalance: 0,
      Balance: 0,
    }));

    setErrors((prev) => ({
      ...prev,
      ItemGroupid: "",
      ItemMasterid: "",
    }));
  };

  // =====================================================
  // ITEM MASTER CHANGE
  // =====================================================

  const handleItemMasterChange = async (value) => {
    setForm((prev) => ({
      ...prev,
      ItemMasterid: value,
      PreviousBalance: 0,
      Balance: 0,
    }));

    setErrors((prev) => ({
      ...prev,
      ItemMasterid: "",
    }));

    if (!value) {
      return;
    }

    try {
      const response = await apiFetch(
        `/api/inventory/issue-receipt/previous-balance/${value}`,
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch previous balance");
      }

      const previousBalance = Number(result.data?.PreviousBalance ?? 0);

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
    } catch (error) {
      console.error("EDIT PREVIOUS BALANCE ERROR", error);

      toast.error(error.message || "Failed to fetch previous balance");
    }
  };

  // =====================================================
  // TRANSACTION TYPE CHANGE
  // =====================================================

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

    setErrors((prev) => ({
      ...prev,
      TransactionTypeid: "",
    }));
  };

  // =====================================================
  // QTY CHANGE
  // =====================================================

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

    setErrors((prev) => ({
      ...prev,
      Qty: "",
    }));
  };

  // =====================================================
  // VALIDATION
  // =====================================================

  const validate = () => {
    const newErrors = {};

    if (!form.ItemGroupid) {
      newErrors.ItemGroupid = "Item Group is required.";
    }

    if (!form.ItemMasterid) {
      newErrors.ItemMasterid = "Item Master is required.";
    }

    if (!form.ItemTypeid) {
      newErrors.ItemTypeid = "Item Type is required.";
    }

    if (!form.TransactionTypeid) {
      newErrors.TransactionTypeid = "Transaction Type is required.";
    }

    if (!form.IssueDate) {
      newErrors.IssueDate = "Issue Date is required.";
    }

    if (!form.Qty) {
      newErrors.Qty = "Quantity is required.";
    } else if (Number.isNaN(Number(form.Qty)) || Number(form.Qty) <= 0) {
      newErrors.Qty = "Quantity must be greater than 0.";
    }

    if (!form.Issue_by) {
      newErrors.Issue_by = "Issue By is required.";
    }

    if (!form.RecivedBy) {
      newErrors.RecivedBy = "Received By is required.";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error("Please complete required fields.");
      return false;
    }

    return true;
  };

  // =====================================================
  // SAVE / UPDATE
  // =====================================================

  const handleSave = async () => {
    if (status === "loading") {
      toast.error("Please wait while your user session loads.");
      return;
    }

    if (!validate()) {
      return;
    }

    if (!form.id) {
      toast.error("Issue/Receipt ID is missing.");
      return;
    }

    const finalBalance = calculateBalance(
      form.PreviousBalance,
      form.Qty,
      form.TransactionTypeid,
      transactions,
    );

    const issueReceiptData = {
      id: form.id,

      ItemGroupid: form.ItemGroupid,
      ItemMasterid: form.ItemMasterid,
      ItemTypeid: form.ItemTypeid,
      TransactionTypeid: form.TransactionTypeid,

      IssueDate: form.IssueDate,

      PreviousBalance:
        form.PreviousBalance === "" ? 0 : Number(form.PreviousBalance),

      Qty: Number(form.Qty),

      Price: form.Price === "" ? null : Number(form.Price),

      Particuler: form.Particuler.trim() || null,

      Balance: Number(finalBalance),

      Issue_by: form.Issue_by,
      GetPassNo: form.GetPassNo.trim() || null,
      DateOfRecive: form.DateOfRecive || null,
      ReciptChallanNo: form.ReciptChallanNo.trim() || null,
      RecivedBy: form.RecivedBy,
      Comment: form.Comment.trim() || null,

      // Logged-in NextAuth user
      UserName: userName,
      UserId: userId,
    };

    try {
      setLoading(true);

      const response = await apiFetch(
        `/api/inventory/issue-receipt?id=${encodeURIComponent(form.id)}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(issueReceiptData),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update Issue/Receipt.");
      }

      toast.success("Issue/Receipt updated successfully.");

      onSuccess?.(result.data);

      setErrors({});
      setForm({ ...EMPTY_FORM });
      closeDialog?.();
    } catch (error) {
      console.error("Issue/Receipt UPDATE ERROR:", error);

      toast.error(error.message || "Unable to update Issue/Receipt.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) {
      return;
    }

    setErrors({});
    setForm({ ...EMPTY_FORM });

    closeDialog?.();
  };

  // =====================================================
  // FILTER ITEMS
  // =====================================================

  const filteredItems = items.filter(
    (item) =>
      !form.ItemGroupid ||
      String(item.ItemGroupid) === String(form.ItemGroupid),
  );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-[90vw] sm:max-w-[600px] md:max-w-[700px] lg:max-w-[900px] xl:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>
            Edit Issue/Receipt
          </DialogTitle>

          <DialogDescription>
            Update the Issue/Receipt details below.
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
                  Update item and stock information
                </p>
              </div>

              {/* ITEM GROUP */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Item Group
                  <span className="ml-1 text-destructive">*</span>
                </label>

                <Select
                  value={String(form.ItemGroupid || "")}
                  onValueChange={handleGroupChange}
                  disabled={loading || dropdownLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select Item Group" />
                  </SelectTrigger>

                  <SelectContent>
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

                {errors.ItemGroupid && (
                  <p className="text-xs text-destructive">
                    {errors.ItemGroupid}
                  </p>
                )}
              </div>

              {/* ITEM MASTER */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Item Master
                  <span className="ml-1 text-destructive">*</span>
                </label>

                <Select
                  value={String(form.ItemMasterid || "")}
                  onValueChange={handleItemMasterChange}
                  disabled={loading || dropdownLoading || !form.ItemGroupid}
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

                {errors.ItemMasterid && (
                  <p className="text-xs text-destructive">
                    {errors.ItemMasterid}
                  </p>
                )}
              </div>

              {/* ITEM TYPE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Item Type
                  <span className="ml-1 text-destructive">*</span>
                </label>

                <Select
                  value={String(form.ItemTypeid || "")}
                  onValueChange={(value) => handleChange("ItemTypeid", value)}
                  disabled={loading || dropdownLoading}
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

                {errors.ItemTypeid && (
                  <p className="text-xs text-destructive">
                    {errors.ItemTypeid}
                  </p>
                )}
              </div>

              {/* TRANSACTION TYPE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Transaction Type
                  <span className="ml-1 text-destructive">*</span>
                </label>

                <Select
                  value={String(form.TransactionTypeid || "")}
                  onValueChange={handleTransactionTypeChange}
                  disabled={loading || dropdownLoading}
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

                {errors.TransactionTypeid && (
                  <p className="text-xs text-destructive">
                    {errors.TransactionTypeid}
                  </p>
                )}
              </div>

              {/* DATE */}

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Date
                  <span className="ml-1 text-destructive">*</span>
                </label>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      mode="input"
                      placeholder={!form.IssueDate}
                      disabled={loading}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="size-4" />

                      {form.IssueDate
                        ? format(
                          new Date(`${String(form.IssueDate).slice(0, 10)}T00:00:00`),
                          "MM/dd/yyyy"
                        )
                        : <span>MM/DD/YYYY</span>}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        form.IssueDate
                          ? new Date(`${String(form.IssueDate).slice(0, 10)}T00:00:00`)
                          : undefined
                      }
                      onSelect={(selectedDate) =>
                        handleChange(
                          "IssueDate",
                          selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""
                        )
                      }
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>

                {errors.IssueDate && (
                  <p className="text-xs text-destructive">
                    {errors.IssueDate}
                  </p>
                )}
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
                  Qty
                  <span className="ml-1 text-destructive">*</span>
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

                {errors.Qty && (
                  <p className="text-xs text-destructive">{errors.Qty}</p>
                )}
              </div>

              {/* PRICE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Enter price"
                  value={form.Price}
                  onChange={(e) => handleChange("Price", e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* PARTICULAR */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Particuler</label>

                <Input
                  placeholder="Enter particuler"
                  value={form.Particuler}
                  onChange={(e) => handleChange("Particuler", e.target.value)}
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
                  Update issue and receiving information
                </p>
              </div>

              {/* ISSUE BY */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Issue By
                  <span className="ml-1 text-destructive">*</span>
                </label>

                <Select
                  value={String(form.Issue_by || "")}
                  onValueChange={(value) => handleChange("Issue_by", value)}
                  disabled={loading || dropdownLoading}
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

                {errors.Issue_by && (
                  <p className="text-xs text-destructive">{errors.Issue_by}</p>
                )}
              </div>

              {/* Gate Pass NO */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Gate Pass No</label>

                <Input
                  placeholder="Enter Gate Pass number"
                  value={form.GetPassNo}
                  onChange={(e) => handleChange("GetPassNo", e.target.value)}
                  disabled={loading}
                />
              </div>

              {/* DATE OF RECEIVE */}
              {/* DATE OF RECEIVE */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Date Of Receive
                </label>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      mode="input"
                      placeholder={!form.DateOfRecive}
                      disabled={loading}
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="size-4" />

                      {form.DateOfRecive
                        ? format(
                          new Date(`${String(form.DateOfRecive).slice(0, 10)}T00:00:00`),
                          "MM/dd/yyyy"
                        )
                        : <span>MM/DD/YYYY</span>}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        form.DateOfRecive
                          ? new Date(`${String(form.DateOfRecive).slice(0, 10)}T00:00:00`)
                          : undefined
                      }
                      onSelect={(selectedDate) =>
                        updateField(
                          "DateOfRecive",
                          selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""
                        )
                      }
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
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
                    handleChange("ReciptChallanNo", e.target.value)
                  }
                  disabled={loading}
                />
              </div>

              {/* RECEIVED BY */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Received By
                  <span className="ml-1 text-destructive">*</span>
                </label>

                <Select
                  value={String(form.RecivedBy || "")}
                  onValueChange={(value) => handleChange("RecivedBy", value)}
                  disabled={loading || dropdownLoading}
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

                {errors.RecivedBy && (
                  <p className="text-xs text-destructive">{errors.RecivedBy}</p>
                )}
              </div>

              {/* COMMENT */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Comment</label>

                <Textarea
                  placeholder="Enter any additional comments..."
                  value={form.Comment}
                  onChange={(e) => handleChange("Comment", e.target.value)}
                  rows={6}
                  disabled={loading}
                  className="resize-none"
                />
              </div>
            </div>
          </div>
        </DialogBody>
        </ScrollArea>
        {/* FOOTER */}
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
            onClick={handleSave}
            disabled={loading || dropdownLoading || status === "loading"}
          >
            {loading ? "Saving..." : "Update Issue/Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
