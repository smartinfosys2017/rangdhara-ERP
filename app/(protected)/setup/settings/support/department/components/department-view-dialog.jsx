'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';

import { formatDate, formatDateTime } from '@/lib/helpers';

const DepartmentViewDialog = ({
  open,
  closeDialog,
  department,
}) => {
  if (!department) {
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Department Details
          </DialogTitle>

          <DialogDescription>
            View department information.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-5 py-4 sm:grid-cols-2">
          {/* ID */}
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Department ID
            </div>

            <div className="text-sm font-medium">
              #{department.id}
            </div>
          </div>

          {/* NAME */}
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Department Name
            </div>

            <div className="text-sm font-medium">
              {department.name || '-'}
            </div>
          </div>

          {/* CREATED */}
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Created At
            </div>

            <div className="text-sm font-medium">
              {department.createdAt
                ? formatDateTime(
                    new Date(
                      department.createdAt
                    )
                  )
                : '-'}
            </div>
          </div>

          {/* UPDATED */}
          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Updated At
            </div>

            <div className="text-sm font-medium">
              {department.updatedAt
                ? formatDateTime(
                    new Date(
                      department.updatedAt
                    )
                  )
                : '-'}
            </div>
          </div>
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

export default DepartmentViewDialog;