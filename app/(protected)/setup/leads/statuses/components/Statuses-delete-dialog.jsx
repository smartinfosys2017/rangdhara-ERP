'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// =======================================================
// TOAST
// =======================================================

function showSuccessToast(message) {
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
}

function showErrorToast(message) {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close={true}
        className="min-w-[320px] max-w-[500px] shadow-lg"
        onClose={() => {
          toast.dismiss(t);
        }}
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
}

// =======================================================
// COMPONENT
// =======================================================

const StatusesDeleteDialog = ({
  open,
  closeDialog,
  statuses,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  // =====================================================
  // DELETE STATUS
  // =====================================================

  const handleDelete = async () => {
    if (!statuses?.id) {
      showErrorToast(
        'Invalid Status ID.'
      );
      return;
    }

    try {
      setLoading(true);

      // -------------------------------------------------
      // DELETE API
      // IMPORTANT: statuses (NOT statuses)
      // -------------------------------------------------

      const response = await apiFetch(
        `/api/leads/statuses?id=${statuses.id}`,
        {
          method: 'DELETE',
        }
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      // -------------------------------------------------
      // ERROR
      // -------------------------------------------------

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to delete status.'
        );
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      showSuccessToast(
        result?.message ||
          'Status deleted successfully.'
      );

      // -------------------------------------------------
      // CLOSE + REFRESH PARENT
      // -------------------------------------------------

      if (onSuccess) {
        await onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'DELETE STATUS ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to delete status.'
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Delete Status
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to delete
            this status?
          </DialogDescription>
        </DialogHeader>

        {/* =============================================
            STATUS INFORMATION
        ============================================= */}

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            Status
          </div>

          <div className="mt-1 font-semibold">
            {statuses?.name || '-'}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            ID: #{statuses?.id || '-'}
          </div>

          {/* COLOR */}

          {statuses?.color && (
            <div className="mt-3 flex items-center gap-2">
              <div
                className="size-5 rounded-full border"
                style={{
                  backgroundColor:
                    statuses.color,
                }}
              />

              <span className="text-xs text-muted-foreground">
                {statuses.color}
              </span>
            </div>
          )}

          {/* ORDER */}

          {statuses?.statusorder !==
            undefined && (
            <div className="mt-2 text-xs text-muted-foreground">
              Order: {statuses.statusorder}
            </div>
          )}
        </div>

        {/* =============================================
            WARNING
        ============================================= */}

        <p className="text-sm text-destructive">
          This action cannot be undone.
        </p>

        {/* =============================================
            FOOTER
        ============================================= */}

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
              : 'Delete Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StatusesDeleteDialog;