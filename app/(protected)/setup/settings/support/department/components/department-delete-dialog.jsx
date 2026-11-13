'use client';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { toast } from 'sonner';

import { apiFetch } from '@/lib/api';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { LoaderCircleIcon } from 'lucide-react';

const DepartmentDeleteDialog = ({
  open,
  closeDialog,
  department,
  onSuccess,
}) => {
  const queryClient =
    useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const response =
        await apiFetch(
          `/api/settings/support/department?id=${department.id}`,
          {
            method: 'DELETE',
          }
        );

      let result = {};

      try {
        result =
          await response.json();
      } catch {
        result = {};
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to delete department.'
        );
      }

      return result;
    },

    onSuccess: async (result) => {
      toast.custom(
        () => (
          <Alert
            variant="mono"
            icon="success"
            close={false}
          >
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>

            <AlertTitle>
              {result?.message ||
                'Department deleted successfully'}
            </AlertTitle>
          </Alert>
        ),
        {
          position: 'top-center',
        }
      );
      queryClient.invalidateQueries({
        queryKey: [
          'support-departments',
        ],
      });

      if (onSuccess) {
          await onSuccess(
            result?.data ||
              result?.department ||
              result
          );
        }
      closeDialog();
    },

    onError: (error) => {
      toast.custom(
        () => (
          <Alert
            variant="mono"
            icon="destructive"
            close={false}
          >
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>

            <AlertTitle>
              {error.message}
            </AlertTitle>
          </Alert>
        ),
        {
          position: 'top-center',
        }
      );
    },
  });

  const isProcessing =
    mutation.status ===
    'pending';

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !isProcessing) {
          closeDialog();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete Department
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to
            delete this department?
          </p>

          <div className="mt-4 rounded-lg border p-4">
            <div className="text-sm font-medium">
              {department?.name ||
                '-'}
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              ID: #{department?.id}
            </div>
          </div>

          <p className="mt-4 text-xs text-destructive">
            This action cannot be undone.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
            disabled={isProcessing}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={() =>
              mutation.mutate()
            }
            disabled={isProcessing}
          >
            {isProcessing && (
              <LoaderCircleIcon className="animate-spin" />
            )}

            Delete Department
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DepartmentDeleteDialog;