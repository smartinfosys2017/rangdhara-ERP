'use client';

import { useState } from 'react';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import { toast } from 'sonner';

import { apiFetch } from '@/lib/api';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

// =======================================================
// TOAST
// =======================================================

const showSuccessToast = (message) => {
  toast.custom(
    () => (
      <Alert
        variant="mono"
        icon="success"
        className="min-w-[320px] max-w-[500px] shadow-lg"
      >
        <AlertIcon>
          <RiCheckboxCircleFill className="size-5" />
        </AlertIcon>

        <AlertTitle>
          {message}
        </AlertTitle>
      </Alert>
    ),
    {
      position: 'top-center',
      duration: 4000,
    }
  );
};

const showErrorToast = (message) => {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close
        className="min-w-[320px] max-w-[500px] shadow-lg"
        onClose={() =>
          toast.dismiss(t)
        }
      >
        <AlertIcon>
          <RiErrorWarningFill className="size-5" />
        </AlertIcon>

        <AlertTitle>
          {message}
        </AlertTitle>
      </Alert>
    ),
    {
      position: 'top-center',
      duration: 5000,
    }
  );
};

// =======================================================
// DELETE TASK DIALOG
// =======================================================

const TaskDeleteDialog = ({
  open,
  closeDialog,
  task,
  onSuccess,
}) => {
  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // DELETE TASK
  // =====================================================

  const handleDelete = async () => {
    if (!task?.id) {
      showErrorToast(
        'Invalid task.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/task',
          {
            method: 'DELETE',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: task.id,
            }),
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to delete task.'
        );
      }

      showSuccessToast(
        result?.message ||
          'Task deleted successfully.'
      );

      if (onSuccess) {
        onSuccess();
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'DELETE TASK ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to delete task.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !loading) {
          closeDialog();
        }
      }}
    >
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            Delete Task
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to
            delete this task? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* =================================================
            TASK INFORMATION
        ================================================= */}

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            Task
          </div>

          <div className="mt-1 font-semibold">
            {task?.name || '-'}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            ID: #{task?.id}
          </div>

          {task?.status && (
            <div className="mt-1 text-xs text-muted-foreground">
              Status: {task.status}
            </div>
          )}

          {task?.priority !==
            undefined && (
            <div className="mt-1 text-xs text-muted-foreground">
              Priority: {task.priority}
            </div>
          )}

          {task?.description && (
            <div className="mt-2 text-sm text-muted-foreground">
              {task.description}
            </div>
          )}
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading
              ? 'Deleting...'
              : 'Delete Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TaskDeleteDialog;