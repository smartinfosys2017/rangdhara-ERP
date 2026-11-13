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

const contract_typeViewDialog = ({
  open,
  closeDialog,
  contract_type,
}) => {
  if (!contract_type) {
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
            Contract Type Details
          </DialogTitle>

          <DialogDescription>
            View Contract Type information.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InfoItem
            label="Contract Type ID"
            value={`#${contract_type.id}`}
          />

          <InfoItem
            label="Contract Type Name"
            value={
              contract_type.name || '-'
            }
          />

          <InfoItem
            label="Created At"
            value={
              contract_type.createdAt
                ? formatDate(
                    new Date(
                      contract_type.createdAt
                    )
                  )
                : '-'
            }
          />

          <InfoItem
            label="Updated At"
            value={
              contract_type.updatedAt
                ? formatDate(
                    new Date(
                      contract_type.updatedAt
                    )
                  )
                : '-'
            }
          />
        </div>

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

export default contract_typeViewDialog;