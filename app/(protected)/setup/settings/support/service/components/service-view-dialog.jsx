'use client';

import { formatDateTime } from '@/lib/helpers';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// =======================================================
// INFO ITEM
// =======================================================

const InfoItem = ({
  label,
  value,
}) => {
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
};

// =======================================================
// VIEW DIALOG
// =======================================================

const ServiceViewDialog = ({
  open,
  closeDialog,
  service,
}) => {
  if (!service) {
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
        <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              Service Details
            </DialogTitle>

            <DialogDescription>
              View service information.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody>

              <div className="grid grid-cols-1 gap-6 py-4 md:grid-cols-2">
                <InfoItem
                  label="Service ID"
                  value={`#${service.id}`}
                />

                <InfoItem
                  label="Service Name"
                  value={
                    service.name || '-'
                  }
                />

                <InfoItem
                  label="Created At"
                  value={
                    service.createdAt
                      ? formatDateTime(
                        new Date(
                          service.createdAt
                        )
                      )
                      : '-'
                  }
                />

                <InfoItem
                  label="Updated At"
                  value={
                    service.updatedAt
                      ? formatDateTime(
                        new Date(
                          service.updatedAt
                        )
                      )
                      : '-'
                  }
                />
              </div>
            </DialogBody>
          </ScrollArea>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceViewDialog;