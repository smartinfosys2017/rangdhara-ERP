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

const SourceViewDialog = ({
  open,
  closeDialog,
  Source,
}) => {
  if (!Source) {
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
            Source Details
          </DialogTitle>

          <DialogDescription>
            View Source information.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InfoItem
            label="Source ID"
            value={`#${Source.id}`}
          />

          <InfoItem
            label="Source Name"
            value={
              Source.name || '-'
            }
          />

          <InfoItem
            label="Created At"
            value={
              Source.createdAt
                ? formatDate(
                    new Date(
                      Source.createdAt
                    )
                  )
                : '-'
            }
          />

          <InfoItem
            label="Updated At"
            value={
              Source.updatedAt
                ? formatDate(
                    new Date(
                      Source.updatedAt
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

export default SourceViewDialog;