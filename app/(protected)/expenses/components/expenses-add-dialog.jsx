"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
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

// ----------------------------------------------------
// STATIC DATA
// ----------------------------------------------------

const CATEGORIES = [
  {
    id: "1",
    name: "Smart Test",
  },
  {
    id: "2",
    name: "Office Expense",
  },
];

const CUSTOMERS = [
  {
    id: "1",
    name: "Acme Corporation",
  },
  {
    id: "2",
    name: "Globex Corporation",
  },
];

const PROJECTS = [
  {
    id: "1",
    name: "Website Redesign",
    customerId: "1",
  },
  {
    id: "2",
    name: "CRM Development",
    customerId: "1",
  },
  {
    id: "3",
    name: "Mobile Application",
    customerId: "2",
  },
];

const PAYMENT_MODES = [
  {
    id: "1",
    name: "Bank",
  },
  {
    id: "2",
    name: "Cash",
  },
];

const TAXES = [
  {
    id: "",
    name: "No Tax",
  },
  {
    id: "1",
    name: "12% IGST",
  },
];

const CURRENCIES = [
  {
    id: "1",
    name: "USD ($)",
  },
  {
    id: "2",
    name: "EUR (€)",
  },
  {
    id: "3",
    name: "INR (₹)",
  },
];

// ----------------------------------------------------
// HELPERS
// ----------------------------------------------------

function getToday() {
  return new Date().toISOString().split("T")[0];
}

// ----------------------------------------------------
// COMPONENT
// ----------------------------------------------------

export default function ExpensesAddDialog({ open, closeDialog, onSuccess }) {
  // ----------------------------------------------------
  // BASIC EXPENSE STATES
  // ----------------------------------------------------

  const [receipt, setReceipt] = useState(null);

  const [expenseName, setExpenseName] = useState("");

  const [referenceNo, setReferenceNo] = useState("");

  const [note, setNote] = useState("");

  const [category, setCategory] = useState("");

  const [date, setDate] = useState(getToday());

  const [amount, setAmount] = useState("");

  const [currency, setCurrency] = useState("1");

  const [tax, setTax] = useState("");

  const [tax2, setTax2] = useState("");

  const [paymentMode, setPaymentMode] = useState("");

  const [customerId, setCustomerId] = useState("");

  const [projectId, setProjectId] = useState("");

  const [billable, setBillable] = useState(false);

  // ----------------------------------------------------
  // RECURRING STATES
  // ----------------------------------------------------

  const [isRecurring, setIsRecurring] = useState(false);

  const [repeatEvery, setRepeatEvery] = useState("");

  const [repeatCustomNumber, setRepeatCustomNumber] = useState(1);

  const [repeatCustomType, setRepeatCustomType] = useState("day");

  const [cycles, setCycles] = useState(0);

  const [unlimitedCycles, setUnlimitedCycles] = useState(true);

  const [createInvoice, setCreateInvoice] = useState(false);

  const [sendInvoice, setSendInvoice] = useState(false);

  // ----------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------

  const [errors, setErrors] = useState({});

  // ----------------------------------------------------
  // PROJECT FILTER
  // ----------------------------------------------------

  const filteredProjects = useMemo(() => {
    if (!customerId) {
      return [];
    }

    return PROJECTS.filter((item) => item.customerId === customerId);
  }, [customerId]);

  // ----------------------------------------------------
  // NEXT PART
  // JSX RETURN + ALL FIELDS
  // ----------------------------------------------------
  // ----------------------------------------------------
  // VALIDATION
  // ----------------------------------------------------

  const validate = () => {
    let newErrors = {};

    if (!category) {
      newErrors.category = "Expense category is required";
    }

    if (!amount) {
      newErrors.amount = "Amount is required";
    }

    if (Number(amount) < 0) {
      newErrors.amount = "Amount cannot be negative";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      toast.error("Please complete required fields");

      return false;
    }

    return true;
  };

  // ----------------------------------------------------
  // SAVE EXPENSE
  // ----------------------------------------------------

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const expenseData = {
      receipt,

      expense_name: expenseName,

      reference_no: referenceNo,

      note,

      category,

      date,

      amount,

      currency,

      tax,

      tax2,

      paymentmode: paymentMode,

      clientid: customerId,

      project_id: projectId,

      billable,

      recurring: {
        enabled: isRecurring,

        repeat_every: repeatEvery,

        custom_number: repeatCustomNumber,

        custom_type: repeatCustomType,

        cycles: unlimitedCycles ? 0 : cycles,

        unlimited_cycles: unlimitedCycles,

        create_invoice: createInvoice,

        send_invoice: sendInvoice,
      },
    };

    console.log("EXPENSE DATA", expenseData);

    toast.success("Expense created successfully");

    onSuccess?.(expenseData);
  };

  // ----------------------------------------------------
  // CLOSE
  // ----------------------------------------------------

  const handleClose = () => {
    setErrors({});

    closeDialog?.();
  };

  // ----------------------------------------------------
  // JSX
  // ----------------------------------------------------

  return (
    <Dialog
      open={open}

      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className="
        max-w-4xl
        max-h-[95vh]
        overflow-y-auto
        "
      >
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>

          <DialogDescription>Create new expense record</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* RECEIPT */}

          <div
            className="
            border
            rounded-md
            p-5
            bg-muted/30
            "
          >
            <label className="font-medium">Attach Receipt</label>

            <Input
              type="file"

              className="mt-3"

              onChange={(e) => setReceipt(e.target.files[0])}
            />
          </div>

          {/* RECURRING */}

          <div>
            <label
              className="
              flex
              items-center
              gap-2
              "
            >
              <input
                type="checkbox"

                checked={isRecurring}

                onChange={(e) => setIsRecurring(e.target.checked)}
              />
              Recurring Expense
            </label>

            {isRecurring && (
              <div
                className="
                border
                rounded-md
                p-5
                mt-4
                space-y-4
                "
              >
                <Select
                  value={repeatEvery}

                  onValueChange={setRepeatEvery}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder="
                      Repeat Every
                      "
                    />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="1-week">Week</SelectItem>

                    <SelectItem value="2-week">2 Weeks</SelectItem>

                    <SelectItem value="1-month">Month</SelectItem>

                    <SelectItem value="2-month">2 Months</SelectItem>

                    <SelectItem value="3-month">3 Months</SelectItem>

                    <SelectItem value="6-month">6 Months</SelectItem>

                    <SelectItem value="1-year">Year</SelectItem>

                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>

                {repeatEvery === "custom" && (
                  <div
                    className="
                    grid
                    grid-cols-2
                    gap-4
                    "
                  >
                    <Input
                      type="number"

                      value={repeatCustomNumber}

                      onChange={(e) => setRepeatCustomNumber(e.target.value)}
                    />

                    <Select
                      value={repeatCustomType}

                      onValueChange={setRepeatCustomType}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="day">Day(s)</SelectItem>

                        <SelectItem value="week">Week(s)</SelectItem>

                        <SelectItem value="month">Month(s)</SelectItem>

                        <SelectItem value="year">Year(s)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label>Total Cycles</label>

                  <Input
                    type="number"

                    disabled={unlimitedCycles}

                    value={cycles}

                    onChange={(e) => setCycles(e.target.value)}
                  />

                  <label
                    className="
                    flex
                    gap-2
                    mt-2
                    "
                  >
                    <input
                      type="checkbox"

                      checked={unlimitedCycles}

                      onChange={(e) => setUnlimitedCycles(e.target.checked)}
                    />
                    Infinity
                  </label>
                </div>

                <label
                  className="
                  flex
                  gap-2
                  "
                >
                  <input
                    type="checkbox"

                    checked={createInvoice}

                    onChange={(e) => setCreateInvoice(e.target.checked)}
                  />
                  Auto Create Invoice
                </label>

                <label
                  className="
                  flex
                  gap-2
                  "
                >
                  <input
                    type="checkbox"

                    checked={sendInvoice}

                    onChange={(e) => setSendInvoice(e.target.checked)}
                  />
                  Send invoice to customer
                </label>
              </div>
            )}
          </div>

          {/* NAME */}

          <div>
            <label className="text-sm font-medium">Name</label>

            <Input
              value={expenseName}

              onChange={(e) => setExpenseName(e.target.value)}

              placeholder="Expense name"
            />
          </div>

          {/* REFERENCE */}

          <div>
            <label className="text-sm font-medium">Reference #</label>

            <Input
              value={referenceNo}

              onChange={(e) => setReferenceNo(e.target.value)}

              placeholder="Reference number"
            />
          </div>

          {/* NOTE */}

          <div>
            <label className="text-sm font-medium">Note</label>

            <Textarea
              rows={3}

              value={note}

              onChange={(e) => setNote(e.target.value)}

              placeholder="Expense note"
            />
          </div>

          {/* CATEGORY */}

          <div>
            <label className="text-sm font-medium">
              <span className="text-red-500">*</span>
              Expense Category
            </label>

            <Select
              value={category}

              onValueChange={setCategory}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder="
                  Select Category
                  "
                />
              </SelectTrigger>

              <SelectContent>
                {CATEGORIES.map((item) => (
                  <SelectItem
                    key={item.id}

                    value={item.id}
                  >
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {errors.category && (
              <p className="text-sm text-red-500">{errors.category}</p>
            )}
          </div>

          {/* DATE */}

          <div>
            <label className="text-sm font-medium">Expense Date</label>

            <Input
              type="date"

              value={date}

              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* AMOUNT + CURRENCY */}

          <div
            className="
            grid
            grid-cols-2
            gap-4
            "
          >
            <div>
              <label className="text-sm font-medium">Amount</label>

              <Input
                type="number"

                value={amount}

                onChange={(e) => setAmount(e.target.value)}
              />

              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium">Currency</label>

              <Select
                value={currency}

                onValueChange={setCurrency}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {CURRENCIES.map((item) => (
                    <SelectItem
                      key={item.id}

                      value={item.id}
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* TAX 1 + TAX 2 */}

          <div
            className="
            grid
            grid-cols-2
            gap-4
            "
          >
            <div>
              <label className="text-sm font-medium">Tax 1</label>

              <Select
                value={tax}

                onValueChange={setTax}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No Tax" />
                </SelectTrigger>

                <SelectContent>
                  {TAXES.map((item) => (
                    <SelectItem
                      key={item.id || "none"}

                      value={item.id}
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Tax 2</label>

              <Select
                value={tax2}

                onValueChange={setTax2}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No Tax" />
                </SelectTrigger>

                <SelectContent>
                  {TAXES.map((item) => (
                    <SelectItem
                      key={item.id || "none"}

                      value={item.id}
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* PAYMENT MODE */}

          <div>
            <label className="text-sm font-medium">Payment Mode</label>

            <Select
              value={paymentMode}

              onValueChange={setPaymentMode}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder="
                  Select Payment Mode
                  "
                />
              </SelectTrigger>

              <SelectContent>
                {PAYMENT_MODES.map((item) => (
                  <SelectItem
                    key={item.id}

                    value={item.id}
                  >
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CUSTOMER */}

          <div>
            <label className="text-sm font-medium">Customer</label>

            <Select
              value={customerId}

              onValueChange={(value) => {
                setCustomerId(value);

                setProjectId("");
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder="
                  Select Customer
                  "
                />
              </SelectTrigger>

              <SelectContent>
                {CUSTOMERS.map((item) => (
                  <SelectItem
                    key={item.id}

                    value={item.id}
                  >
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PROJECT */}

          {customerId && (
            <div>
              <label className="text-sm font-medium">Project</label>

              <Select
                value={projectId}

                onValueChange={setProjectId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder="
                      Select Project
                      "
                  />
                </SelectTrigger>

                <SelectContent>
                  {filteredProjects.map((item) => (
                    <SelectItem
                      key={item.id}

                      value={item.id}
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* BILLABLE */}

          <label
            className="
            flex
            items-center
            gap-2
            "
          >
            <input
              type="checkbox"

              checked={billable}

              onChange={(e) => setBillable(e.target.checked)}
            />
            Billable
          </label>
        </div>

        {/* FOOTER */}

        <DialogFooter>
          <Button
            variant="outline"

            onClick={handleClose}
          >
            Cancel
          </Button>

          <Button onClick={handleSave}>Save Expense</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}