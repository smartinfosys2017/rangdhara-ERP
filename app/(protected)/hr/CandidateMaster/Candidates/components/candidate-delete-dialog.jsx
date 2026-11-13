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
// DELETE Candidate DIALOG
// =======================================================

const CandidateDeleteDialog = ({
  open,
  closeDialog,
  candidate,
  onSuccess,
}) => {
  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // DELETE Candidate
  // =====================================================

  const handleDelete = async () => {
    if (!candidate?.id) {
      showErrorToast(
        'Invalid candidate.'
      );

      return;
    }

    try {
      setLoading(true);

      /*
      |--------------------------------------------------------------------------
      | DELETE candidate
      |--------------------------------------------------------------------------
      |
      | Your API DELETE route expects:
      |
      | {
      |   id: candidate.id
      | }
      |
      */

      const response =
        await apiFetch(
          '/api/candidate',
          {
            method: 'DELETE',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: candidate.id,
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
            'Failed to delete candidate.'
        );
      }

      /*
      |--------------------------------------------------------------------------
      | SUCCESS
      |--------------------------------------------------------------------------
      */

      showSuccessToast(
        result?.message ||
          'Candidate deleted successfully.'
      );

      /*
      |--------------------------------------------------------------------------
      | Refresh Candidate List
      |--------------------------------------------------------------------------
      */

      if (onSuccess) {
        onSuccess();
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'DELETE candidate ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to delete candidate.'
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
            Delete Candidate
          </DialogTitle>

          <DialogDescription>
            Are you sure you want to
            delete this candidate? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* =================================================
            candidate INFORMATION
        ================================================= */}

        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            Candidate
          </div>

          <div className="mt-1 font-semibold">
            {candidate?.company || '-'}
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            ID: #{candidate?.id}
          </div>

          {candidate?.phone && (
            <div className="mt-1 text-xs text-muted-foreground">
              Phone: {candidate.phone}
            </div>
          )}

          {candidate?.website && (
            <div className="mt-1 text-xs text-muted-foreground">
              Website: {candidate.website}
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
              : 'Delete Candidate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CandidateDeleteDialog;