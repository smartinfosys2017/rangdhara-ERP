'use client';

import { useEffect, useState } from 'react';

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
  DialogBody,
  DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
// COMPONENT
// =======================================================

const ServiceEditDialog = ({
  open,
  closeDialog,
  service,
  onSuccess,
}) => {
  const [name, setName] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  // =====================================================
  // SET SERVICE
  // =====================================================

  useEffect(() => {
    if (open && service) {
      setName(
        service.name || ''
      );

      setError('');
    }
  }, [open, service]);

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) {
      return;
    }

    setName('');
    setError('');

    closeDialog();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const serviceName =
      name.trim();

    if (!serviceName) {
      setError(
        'Service name is required.'
      );

      return;
    }

    if (!service?.id) {
      setError(
        'Invalid service.'
      );

      return;
    }

    try {
      setLoading(true);
      setError('');

      const response =
        await apiFetch(
          '/api/settings/support/service',
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: service.id,
              name: serviceName,
            }),
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
          'Failed to update service.'
        );
      }

      showSuccessToast(
        result?.message ||
        'Service updated successfully.'
      );

      if (onSuccess) {
        onSuccess(result.data);
      } else {
        handleClose();
      }
    } catch (error) {
      console.error(
        'UPDATE SERVICE ERROR:',
        error
      );

      const message =
        error?.message ||
        'Failed to update service.';

      setError(message);

      showErrorToast(message);
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
        <form
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                Edit Service
              </DialogTitle>

              <DialogDescription>
                Update service information.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
              <DialogBody className="pt-2.5 space-y-6">
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="edit-service-name"
                      className="text-sm font-medium"
                    >
                      Service Name
                      <span className="ms-1 text-destructive">
                        *
                      </span>
                    </label>

                    <Input
                      id="edit-service-name"
                      name="name"
                      type="text"
                      value={name}
                      onChange={(event) => {
                        setName(
                          event.target.value
                        );

                        setError('');
                      }}
                      placeholder="Enter service name"
                      disabled={loading}
                      autoFocus
                      maxLength={255}
                    />

                    {error && (
                      <p className="text-sm text-destructive">
                        {error}
                      </p>
                    )}
                  </div>
                </div>
              </DialogBody>
            </ScrollArea>
            <DialogFooter className="gap-2">
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
                disabled={
                  loading ||
                  !name.trim()
                }
              >
                {loading
                  ? 'Updating...'
                  : 'Update Service'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceEditDialog;