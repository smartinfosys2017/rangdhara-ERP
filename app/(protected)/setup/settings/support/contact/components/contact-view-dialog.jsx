'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Mail,
  Phone,
  User,
} from 'lucide-react';

import { formatDateTime } from '@/lib/helpers';

const ContactViewDialog = ({
  open,
  closeDialog,
  contact,
}) => {
  if (!contact) {
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
              Contact Details
            </DialogTitle>
            <DialogDescription>
              View the complete contact
              information.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody>
              <div className="space-y-6 py-2">
                {/* CONTACT NAME */}

                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <User className="size-4 text-muted-foreground" />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Contact Name
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {contact.name || '-'}
                    </p>
                  </div>
                </div>

                {/* EMAIL */}

                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Mail className="size-4 text-muted-foreground" />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Email
                    </p>

                    <p className="mt-1 text-sm font-medium break-all">
                      {contact.email || '-'}
                    </p>
                  </div>
                </div>

                {/* PHONE */}

                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Phone className="size-4 text-muted-foreground" />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Phone
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {contact.phone || '-'}
                    </p>
                  </div>
                </div>

                {/* ID / DATES */}

                <div className="grid grid-cols-1 gap-5 border-t pt-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Contact ID
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      #{contact.id}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Created
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {contact.createdAt
                        ? formatDateTime(
                          new Date(
                            contact.createdAt
                          )
                        )
                        : '-'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Updated
                    </p>

                    <p className="mt-1 text-sm font-medium">
                      {contact.updatedAt
                        ? formatDateTime(
                          new Date(
                            contact.updatedAt
                          )
                        )
                        : '-'}
                    </p>
                  </div>
                </div>
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

export default ContactViewDialog;