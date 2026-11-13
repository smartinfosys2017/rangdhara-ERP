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

const showSuccessToast = (
  message
) => {
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

const showErrorToast = (
  message
) => {
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
// DELETE Employee DIALOG
// =======================================================

const EmployeeDeleteDialog = ({
  open,
  closeDialog,
  employee,
  onSuccess,
}) => {
  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // DELETE Employee
  // =====================================================

  const handleDelete = async () => {
    if (!employee?.id) {
      showErrorToast(
        'Invalid employee.'
      );

      return;
    }

    try {
      setLoading(true);

      /*
      |--------------------------------------------------------------------------
      | DELETE employee
      |--------------------------------------------------------------------------
      |
      | Your API DELETE route expects:
      |
      | {
      |   id: employee.id
      | }
      |
      */

      const response =
        await apiFetch(
          '/api/employee',
          {
            method: 'DELETE',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: employee.id,
            }),
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      /*
      |--------------------------------------------------------------------------
      | ERROR
      |--------------------------------------------------------------------------
      */

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to delete employee.'
        );
      }

      /*
      |--------------------------------------------------------------------------
      | SUCCESS
      |--------------------------------------------------------------------------
      */

      showSuccessToast(
        result?.message ||
          'Employee deleted successfully.'
      );

      /*
      |--------------------------------------------------------------------------
      | Refresh Employee List
      |--------------------------------------------------------------------------
      */

      if (onSuccess) {
        onSuccess();
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'DELETE employee ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to delete employee.'
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
            Delete Employee
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to
            delete this employee? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* =================================================
            employee INFORMATION
        ================================================= */}

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            Employee
          </div>

          <div className="mt-1 font-semibold">
            {employee?.company || '-'}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            ID: #{employee?.id}
          </div>

          {employee?.phone && (
            <div className="mt-1 text-xs text-muted-foreground">
              Phone: {employee.phone}
            </div>
          )}

          {employee?.website && (
            <div className="mt-1 text-xs text-muted-foreground">
              Website: {employee.website}
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
              : 'Delete Employee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeDeleteDialog;