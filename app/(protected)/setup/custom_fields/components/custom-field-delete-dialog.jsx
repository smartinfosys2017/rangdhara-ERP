'use client';

import { useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Button } from '@/components/ui/button';

import { LoaderCircleIcon } from 'lucide-react';

export default function CustomFieldDeleteDialog({
  open,
   onOpenChange = () => {},
  field,
  onSuccess,
}) {
  const [deleting, setDeleting] =
    useState(false);

  const handleDelete = async () => {
    if (!field?.id) {
      return;
    }

    try {
      setDeleting(true);

      const response = await fetch(
        '/api/custom_fields',
        {
          method: 'DELETE',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            id: field.id,
          }),
        }
      );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ||
            'Failed to delete custom field.'
        );
      }

      await onSuccess?.();
    } catch (error) {
      console.error(error);

      alert(
        error.message ||
          'Failed to delete custom field.'
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!deleting) {
          onOpenChange(value);
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete Custom Field
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete{' '}
            <strong>
              {field?.name}
            </strong>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              onOpenChange(false)
            }
            disabled={deleting}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting && (
              <LoaderCircleIcon className="mr-2 h-4 w-4 animate-spin" />
            )}

            {deleting
              ? 'Deleting...'
              : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}