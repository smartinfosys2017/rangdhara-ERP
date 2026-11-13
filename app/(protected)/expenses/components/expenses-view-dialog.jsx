"use client";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// =======================================================
// STATIC DATA
// =======================================================

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
  },
  {
    id: "2",
    name: "CRM Development",
  },
  {
    id: "3",
    name: "Mobile Application",
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

// =======================================================
// HELPERS
// =======================================================

const getName = (list, id) => {
  return list.find((item) => item.id === String(id))?.name || "-";
};

// =======================================================
// COMPONENT
// =======================================================

export default function ExpensesViewDialog({ open, closeDialog, Expense }) {
  if (!Expense) {
    return null;
  }

  const categoryName = getName(CATEGORIES, Expense.category);

  const customerName = getName(CUSTOMERS, Expense.clientid);

  const projectName = getName(PROJECTS, Expense.project_id);

  const paymentName = getName(PAYMENT_MODES, Expense.paymentmode);

  const currencyName = getName(CURRENCIES, Expense.currency);

  const taxName = getName(TAXES, Expense.tax);

  const tax2Name = getName(TAXES, Expense.tax2);
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
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
          <DialogTitle>View Expense</DialogTitle>

          <DialogDescription>Expense details information.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* RECEIPT */}

          <div
            className="
            rounded-md
            border
            bg-muted/30
            p-5
            "
          >
            <h3 className="font-semibold mb-3">Receipt</h3>

            {Expense.receipt ? (
              <a
                href={Expense.receipt}
                target="_blank"
                className="
                  text-sm
                  text-primary
                  underline
                  "
              >
                View Receipt
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                No receipt attached
              </p>
            )}
          </div>

          {/* BASIC INFORMATION */}

          <div
            className="
            grid
            grid-cols-2
            gap-5
            "
          >
            <div>
              <label>Expense Name</label>

              <p className="font-medium">{Expense.expense_name || "-"}</p>
            </div>

            <div>
              <label>Reference No</label>

              <p>{Expense.reference_no || "-"}</p>
            </div>

            <div>
              <label>Category</label>

              <p>{categoryName}</p>
            </div>

            <div>
              <label>Expense Date</label>

              <p>{Expense.date || "-"}</p>
            </div>

            <div>
              <label>Amount</label>

              <p className="font-semibold">{Expense.amount || "0"}</p>
            </div>

            <div>
              <label>Currency</label>

              <p>{currencyName}</p>
            </div>

            <div>
              <label>Payment Mode</label>

              <p>{paymentName}</p>
            </div>

            <div>
              <label>Billable</label>

              <p>{Expense.billable ? "Yes" : "No"}</p>
            </div>
          </div>

          {/* TAX INFORMATION */}

          <div
            className="
            grid
            grid-cols-2
            gap-5
            "
          >
            <div>
              <label>Tax 1</label>

              <p>{taxName}</p>
            </div>

            <div>
              <label>Tax 2</label>

              <p>{tax2Name}</p>
            </div>
          </div>

          {/* CUSTOMER PROJECT */}

          <div
            className="
            grid
            grid-cols-2
            gap-5
            "
          >
            <div>
              <label>Customer</label>

              <p>{customerName}</p>
            </div>

            <div>
              <label>Project</label>

              <p>{projectName}</p>
            </div>
          </div>

          {/* NOTE */}

          <div>
            <label>Note</label>

            <div
              className="
              rounded-md
              border
              p-3
              text-sm
              "
            >
              {Expense.note || "-"}
            </div>
          </div>
          {/* DESCRIPTION */}

          <div>
            <label>Description</label>

            <div
              className="
              rounded-md
              border
              p-3
              text-sm
              whitespace-pre-wrap
              "
            >
              {Expense.description || "-"}
            </div>
          </div>

          {/* RECURRING */}

          <div
            className="
            rounded-md
            border
            p-5
            bg-muted/20
            "
          >
            <h3 className="font-semibold mb-4">Recurring Expense</h3>

            {Expense.recurring?.enabled ? (
              <div
                className="
                  grid
                  grid-cols-2
                  gap-5
                  "
              >
                <div>
                  <label>Repeat Every</label>

                  <p>{Expense.recurring.repeat_every || "-"}</p>
                </div>

                <div>
                  <label>Custom Repeat</label>

                  <p>
                    {Expense.recurring.custom_number
                      ? `${Expense.recurring.custom_number} ${Expense.recurring.custom_type}`
                      : "-"}
                  </p>
                </div>

                <div>
                  <label>Total Cycles</label>

                  <p>
                    {Expense.recurring.unlimited_cycles
                      ? "Unlimited"
                      : Expense.recurring.cycles}
                  </p>
                </div>

                <div>
                  <label>Auto Create Invoice</label>

                  <p>{Expense.recurring.create_invoice ? "Yes" : "No"}</p>
                </div>

                <div>
                  <label>Send Invoice</label>

                  <p>{Expense.recurring.send_invoice ? "Yes" : "No"}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This is not a recurring expense.
              </p>
            )}
          </div>

          {/* CREATED INFO */}

          <div
            className="
            grid
            grid-cols-2
            gap-5
            "
          >
            <div>
              <label>Created At</label>

              <p>{Expense.created_at || "-"}</p>
            </div>

            <div>
              <label>Updated At</label>

              <p>{Expense.updated_at || "-"}</p>
            </div>
          </div>
        </div>

        {/* FOOTER */}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              closeDialog?.();
            }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
