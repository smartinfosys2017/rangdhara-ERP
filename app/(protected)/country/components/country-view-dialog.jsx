"use client";

import { formatDate } from "@/lib/helpers";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// =======================================================
// INFO ITEM
// =======================================================

function InfoItem({ label, value }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>

      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

// =======================================================
// COMPONENT
// =======================================================

const CountryViewDialog = ({ open, closeDialog, Country }) => {
  if (!Country) {
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
            <DialogTitle>Country Details</DialogTitle>
            <DialogDescription>View country information.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* ID */}

                <InfoItem label="Country ID" value={`#${Country.id}`} />

                {/* NAME */}

                <InfoItem label="Country Name" value={Country.name || "-"} />

                {/* ISO2 */}

                <InfoItem label="ISO 2 Code" value={Country.iso2 || "-"} />

                {/* ISO3 */}

                <InfoItem label="ISO 3 Code" value={Country.iso3 || "-"} />

                {/* PHONE CODE */}

                <InfoItem label="Phone Code" value={Country.phoneCode || "-"} />

                {/* CURRENCY CODE */}

                <InfoItem label="Currency Code" value={Country.currencyCode || "-"} />

                {/* CURRENCY NAME */}

                <InfoItem label="Currency Name" value={Country.currencyName || "-"} />

                {/* STATUS */}

                <InfoItem
                  label="Status"
                  value={Country.isActive ? "Active" : "Inactive"}
                />

                {/* CREATED */}

                <InfoItem
                  label="Created At"
                  value={
                    Country.createdAt ? formatDate(new Date(Country.createdAt)) : "-"
                  }
                />

                {/* UPDATED */}

                <InfoItem
                  label="Updated At"
                  value={
                    Country.updatedAt ? formatDate(new Date(Country.updatedAt)) : "-"
                  }
                />

                {/* LAST SYNC */}

                <InfoItem
                  label="Last Sync At"
                  value={
                    Country.lastSyncAt
                      ? formatDate(new Date(Country.lastSyncAt))
                      : "-"
                  }
                />

                {/* DELETED */}

                <InfoItem
                  label="Deleted At"
                  value={
                    Country.deletedAt ? formatDate(new Date(Country.deletedAt)) : "-"
                  }
                />
              </div>
            </DialogBody>
          </ScrollArea>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDialog}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CountryViewDialog;
