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

      <div className="text-sm font-medium text-foreground whitespace-pre-wrap">
        {value}
      </div>
    </div>
  );
}

// =======================================================
// COMPONENT
// =======================================================

const ExpenseCategoryViewDialog = ({
  open,
  closeDialog,
  expenseCategory,
}) => {
  if (!expenseCategory) {
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
            Expense Category Details
          </DialogTitle>

          <DialogDescription>
            View expense category information.
          </DialogDescription>
        </DialogHeader>

        {/* =============================================
            EXPENSE CATEGORY INFORMATION
        ============================================= */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* CATEGORY ID */}

          <InfoItem
            label="Category ID"
            value={`#${expenseCategory.id}`}
          />

          {/* CATEGORY NAME */}

          <InfoItem
            label="Category Name"
            value={
              expenseCategory.name || '-'
            }
          />

          {/* DESCRIPTION */}

          <div className="md:col-span-2">
            <InfoItem
              label="Category Description"
              value={
                expenseCategory.description || '-'
              }
            />
          </div>

          {/* CREATED */}

          <InfoItem
            label="Created At"
            value={
              expenseCategory.createdAt
                ? formatDate(
                    new Date(
                      expenseCategory.createdAt
                    )
                  )
                : '-'
            }
          />

          {/* UPDATED */}

          <InfoItem
            label="Updated At"
            value={
              expenseCategory.updatedAt
                ? formatDate(
                    new Date(
                      expenseCategory.updatedAt
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

export default ExpenseCategoryViewDialog;