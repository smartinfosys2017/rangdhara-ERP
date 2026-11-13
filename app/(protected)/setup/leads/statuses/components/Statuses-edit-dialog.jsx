'use client';

import { useEffect, useState } from 'react';

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

import { Input } from '@/components/ui/input';

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

const StatusesEditDialog = ({
  open,
  closeDialog,
  Statuses,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#b638f0');
  const [statusOrder, setStatusOrder] = useState('');

  const [loading, setLoading] = useState(false);

  // =======================================================
  // AUTOFILL STATUS DATA
  // =======================================================

  useEffect(() => {
    if (Statuses) {
      setName(Statuses.name || '');

      setColor(
        Statuses.color || '#b638f0'
      );

      setStatusOrder(
        Statuses.statusOrder !== null &&
        Statuses.statusOrder !== undefined
          ? String(Statuses.statusOrder)
          : ''
      );
    }
  }, [Statuses]);

  // =======================================================
  // CLOSE
  // =======================================================

  const handleClose = () => {
    if (loading) return;

    setName('');
    setColor('#b638f0');
    setStatusOrder('');

    closeDialog();
  };

  // =======================================================
  // SUBMIT
  // =======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    // -------------------------------------------------------
    // VALIDATE STATUS
    // -------------------------------------------------------

    if (!Statuses?.id) {
      showErrorToast(
        'Invalid Status.'
      );

      return;
    }

    // -------------------------------------------------------
    // VALIDATE NAME
    // -------------------------------------------------------

    const statusName = name.trim();

    if (!statusName) {
      showErrorToast(
        'Status name is required.'
      );

      return;
    }

    // -------------------------------------------------------
    // VALIDATE COLOR
    // -------------------------------------------------------

    const statusColor =
      color.trim() || '#b638f0';

    // -------------------------------------------------------
    // VALIDATE ORDER
    // -------------------------------------------------------

    const order = Number(statusOrder);

    if (
      !Number.isInteger(order) ||
      order < 0
    ) {
      showErrorToast(
        'Status order must be a valid number.'
      );

      return;
    }

    try {
      setLoading(true);

      // =====================================================
      // UPDATE STATUS
      // =====================================================

      const response = await apiFetch(
        '/api/leads/statuses',
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            id: Number(Statuses.id),
            name: statusName,
            color: statusColor,

            // Prisma field name
            statusOrder: order,
          }),
        }
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      // =====================================================
      // ERROR
      // =====================================================

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to update Status.'
        );
      }

      // =====================================================
      // SUCCESS
      // =====================================================

      showSuccessToast(
        result?.message ||
          'Status updated successfully.'
      );

      // Clear form
      setName('');
      setColor('#b638f0');
      setStatusOrder('');

      // Parent refresh
      if (onSuccess) {
        await onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'UPDATE STATUS ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to update Status.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit Status
          </DialogTitle>

          <DialogDescription>
            Update Status information.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* =================================================
              STATUS NAME
          ================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="Statuses-edit-name"
              className="text-sm font-medium"
            >
              Status Name

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="Statuses-edit-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Enter Status name"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* =================================================
              COLOR
          ================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="Statuses-edit-color"
              className="text-sm font-medium"
            >
              Color
            </label>

            <div className="flex items-center gap-2">
              <Input
                id="Statuses-edit-color"
                type="text"
                value={color}
                onChange={(event) =>
                  setColor(
                    event.target.value
                  )
                }
                placeholder="#b638f0"
                disabled={loading}
              />

              <input
                type="color"
                value={
                  color || '#b638f0'
                }
                onChange={(event) =>
                  setColor(
                    event.target.value
                  )
                }
                disabled={loading}
                className="h-10 w-12 cursor-pointer rounded-md border p-1"
              />
            </div>
          </div>

          {/* =================================================
              STATUS ORDER
          ================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="Statuses-edit-order"
              className="text-sm font-medium"
            >
              Status Order
            </label>

            <Input
              id="Statuses-edit-order"
              type="number"
              value={statusOrder}
              onChange={(event) =>
                setStatusOrder(
                  event.target.value
                )
              }
              placeholder="Enter status order"
              min="0"
              disabled={loading}
            />
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Updating...'
                : 'Update Status'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StatusesEditDialog;