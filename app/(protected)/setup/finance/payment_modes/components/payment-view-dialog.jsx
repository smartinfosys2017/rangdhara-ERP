'use client';

import { formatDate } from '@/lib/helpers';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// =======================================================
// INFO ITEM
// =======================================================

function InfoItem({
  label,
  value,
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="text-sm font-medium text-foreground">
        {value}
      </div>
    </div>
  );
}

// =======================================================
// BOOLEAN VALUE
// =======================================================

function BooleanValue({
  value,
}) {
  return (
    <span
      className={
        value
          ? 'inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700'
          : 'inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground'
      }
    >
      {value ? 'Yes' : 'No'}
    </span>
  );
}

// =======================================================
// COMPONENT
// =======================================================

const PaymentMethodViewDialog = ({
  open,
  closeDialog,
  payment,
}) => {
  if (!payment) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Payment Method Details
          </DialogTitle>

          <DialogDescription>
            View payment method information.
          </DialogDescription>
        </DialogHeader>

        {/* =============================================
            PAYMENT METHOD INFORMATION
        ============================================= */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* PAYMENT METHOD ID */}

          <InfoItem
            label="Payment Method ID"
            value={`#${payment.id}`}
          />

          {/* PAYMENT METHOD NAME */}

          <InfoItem
            label="Payment Method"
            value={payment.name || '-'}
          />

          {/* DESCRIPTION */}

          <div className="space-y-1 md:col-span-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Bank Accounts / Description
            </div>

            <div className="whitespace-pre-wrap text-sm font-medium text-foreground">
              {payment.description || '-'}
            </div>
          </div>

          {/* ACTIVE */}

          <InfoItem
            label="Active"
            value={
              <BooleanValue
                value={
                  payment.active === true
                }
              />
            }
          />

          {/* SHOW ON PDF */}

          <InfoItem
            label="Show on Invoice PDF"
            value={
              <BooleanValue
                value={
                  payment.show_on_pdf === true
                }
              />
            }
          />

          {/* SELECTED BY DEFAULT */}

          <InfoItem
            label="Selected by Default"
            value={
              <BooleanValue
                value={
                  payment.selected_by_default === true
                }
              />
            }
          />

          {/* INVOICES ONLY */}

          <InfoItem
            label="Invoices Only"
            value={
              <BooleanValue
                value={
                  payment.invoices_only === true
                }
              />
            }
          />

          {/* EXPENSES ONLY */}

          <InfoItem
            label="Expenses Only"
            value={
              <BooleanValue
                value={
                  payment.expenses_only === true
                }
              />
            }
          />

          {/* CREATED */}

          <InfoItem
            label="Created At"
            value={
              payment.createdAt
                ? formatDate(
                    new Date(
                      payment.createdAt
                    )
                  )
                : '-'
            }
          />

          {/* UPDATED */}

          <InfoItem
            label="Updated At"
            value={
              payment.updatedAt
                ? formatDate(
                    new Date(
                      payment.updatedAt
                    )
                  )
                : '-'
            }
          />
        </div>

        {/* =============================================
            FOOTER
        ============================================= */}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentMethodViewDialog;