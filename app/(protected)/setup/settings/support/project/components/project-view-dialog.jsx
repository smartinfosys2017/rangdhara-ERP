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

const ProjectViewDialog = ({
  open,
  closeDialog,
  project,
}) => {
  if (!project) {
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
            Project Details
          </DialogTitle>

          <DialogDescription>
            View project information.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <InfoItem
            label="Project ID"
            value={`#${project.id}`}
          />

          <InfoItem
            label="Project Name"
            value={
              project.name || '-'
            }
          />

          <InfoItem
            label="Created At"
            value={
              project.createdAt
                ? formatDate(
                    new Date(
                      project.createdAt
                    )
                  )
                : '-'
            }
          />

          <InfoItem
            label="Updated At"
            value={
              project.updatedAt
                ? formatDate(
                    new Date(
                      project.updatedAt
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

export default ProjectViewDialog;