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
// COLOR ITEM
// =======================================================

function ColorItem({
  color,
}) {
  const validColor =
    typeof color === 'string' &&
    color.trim()
      ? color.trim()
      : '#7cb342';

  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Color
      </div>

      <div className="flex items-center gap-2">
        <div
          className="h-7 w-7 rounded-md border"
          style={{
            backgroundColor: validColor,
          }}
        />

        <span className="text-sm font-medium text-foreground">
          {color || '-'}
        </span>
      </div>
    </div>
  );
}

// =======================================================
// COMPONENT
// =======================================================

const StatusesViewDialog = ({
  open,
  closeDialog,
  Statuses,
}) => {
  if (!Statuses) {
    return null;
  }

  // Prisma uses statusOrder
  // Fallback included in case old API data uses statusorder.
  const statusOrder =
    Statuses.statusOrder ??
    Statuses.statusorder ??
    '-';

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
            Status Details
          </DialogTitle>

          <DialogDescription>
            View lead status information.
          </DialogDescription>
        </DialogHeader>

        {/* =============================================
            STATUS INFORMATION
        ============================================= */}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

          {/* ID */}

          <InfoItem
            label="Status ID"
            value={`#${Statuses.id}`}
          />

          {/* NAME */}

          <InfoItem
            label="Status Name"
            value={
              Statuses.name || '-'
            }
          />

          {/* COLOR */}

          <ColorItem
            color={Statuses.color}
          />

          {/* ORDER */}

          <InfoItem
            label="Order"
            value={statusOrder}
          />

          {/* CREATED */}

          <InfoItem
            label="Created At"
            value={
              Statuses.createdAt
                ? formatDate(
                    new Date(
                      Statuses.createdAt
                    )
                  )
                : '-'
            }
          />

          {/* UPDATED */}

          <InfoItem
            label="Updated At"
            value={
              Statuses.updatedAt
                ? formatDate(
                    new Date(
                      Statuses.updatedAt
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

export default StatusesViewDialog;