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

        <AlertTitle>{message}</AlertTitle>
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

        <AlertTitle>{message}</AlertTitle>
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

const StatusesAddDialog = ({
  open,
  closeDialog,
  onSuccess,
}) => {
  // =====================================================
  // FORM STATE
  // =====================================================

  const [name, setName] = useState('');
  const [color, setColor] = useState('#7cb342');
  const [statusorder, setStatusorder] = useState('2');

  const [loading, setLoading] = useState(false);

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) return;

    setName('');
    setColor('#7cb342');
    setStatusorder('2');

    closeDialog();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const statusName = name.trim();

    const order = Number(statusorder);

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!statusName) {
      showErrorToast(
        'Status name is required.'
      );

      return;
    }

    if (
      !Number.isInteger(order) ||
      order < 0
    ) {
      showErrorToast(
        'Please enter a valid order.'
      );

      return;
    }

    try {
      setLoading(true);

      // -------------------------------------------------
      // API REQUEST
      // -------------------------------------------------

      const response = await apiFetch(
        '/api/leads/statuses',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            name: statusName,
            color: color.trim(),
            statusorder: order,
          }),
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
            'Failed to create status.'
        );
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      showSuccessToast(
        result?.message ||
          'Status created successfully.'
      );

      setName('');
      setColor('#7cb342');
      setStatusorder('2');

      if (onSuccess) {
        await onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'CREATE STATUS ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to create status.'
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
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add Lead Status
          </DialogTitle>

          <DialogDescription>
            Create a new lead status.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* ===========================================
              STATUS NAME
          =========================================== */}

          <div className="space-y-2">
            <label
              htmlFor="status-name"
              className="text-sm font-medium"
            >
              Status Name
              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="status-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Enter status name"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* ===========================================
              COLOR
          =========================================== */}

          <div className="space-y-2">
            <label
              htmlFor="status-color"
              className="text-sm font-medium"
            >
              Color
            </label>

            <div className="flex items-center gap-2">
              <input
                id="status-color"
                type="color"
                value={color}
                onChange={(event) =>
                  setColor(
                    event.target.value
                  )
                }
                disabled={loading}
                className="h-10 w-12 cursor-pointer rounded-md border p-1"
              />

              <Input
                type="text"
                value={color}
                onChange={(event) =>
                  setColor(
                    event.target.value
                  )
                }
                placeholder="#7cb342"
                disabled={loading}
              />
            </div>
          </div>

          {/* ===========================================
              ORDER
          =========================================== */}

          <div className="space-y-2">
            <label
              htmlFor="status-order"
              className="text-sm font-medium"
            >
              Order
            </label>

            <Input
              id="status-order"
              type="number"
              min="0"
              value={statusorder}
              onChange={(event) =>
                setStatusorder(
                  event.target.value
                )
              }
              placeholder="Enter order"
              disabled={loading}
            />
          </div>

          {/* ===========================================
              FOOTER
          =========================================== */}

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
                ? 'Creating...'
                : 'Create Status'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StatusesAddDialog;