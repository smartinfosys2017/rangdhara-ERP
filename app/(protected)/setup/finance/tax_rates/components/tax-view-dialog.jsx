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
// COMPONENT
// =======================================================

const taxViewDialog = ({
  open,
  closeDialog,
  tax,
}) => {
  if (!tax) {
    return null;
  }

  // =====================================================
  // TAX RATE
  // =====================================================

  const taxRate =
    tax.rate ??
    tax.taxRate ??
    tax.taxrate ??
    0;

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
            Tax Details
          </DialogTitle>

          <DialogDescription>
            View tax information.
          </DialogDescription>
        </DialogHeader>

        {/* =============================================
            TAX INFORMATION
        ============================================= */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* TAX ID */}

          <InfoItem
            label="Tax ID"
            value={`#${tax.id}`}
          />

          {/* TAX NAME */}

          <InfoItem
            label="Tax Name"
            value={tax.name || '-'}
          />

          {/* TAX RATE */}

          <InfoItem
            label="Tax Rate"
            value={`${taxRate}%`}
          />

          {/* CREATED */}

          <InfoItem
            label="Created At"
            value={
              tax.createdAt
                ? formatDate(
                    new Date(
                      tax.createdAt
                    )
                  )
                : '-'
            }
          />

          {/* UPDATED */}

          <InfoItem
            label="Updated At"
            value={
              tax.updatedAt
                ? formatDate(
                    new Date(
                      tax.updatedAt
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

export default taxViewDialog;