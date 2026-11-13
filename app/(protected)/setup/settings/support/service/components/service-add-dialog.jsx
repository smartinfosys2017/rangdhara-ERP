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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

const initialForm = {
  name: '',
};

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

const ServiceAddDialog = ({
  open,
  closeDialog,
  onSuccess,
}) => {
  const [form, setForm] =
    useState(initialForm);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  useEffect(() => {
    if (open) {
      setForm(initialForm);
      setError('');
    }
  }, [open]);

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError('');
  };

  const handleClose = () => {
    if (loading) {
      return;
    }

    setForm(initialForm);
    setError('');

    closeDialog();
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const name =
      form.name.trim();

    if (!name) {
      setError(
        'Service name is required.'
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
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              name,
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
          'Failed to create service.'
        );
      }

      showSuccessToast(
        result?.message ||
        'Service created successfully.'
      );

      setForm(initialForm);
      setError('');

      if (onSuccess) {
        onSuccess(result.data);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'CREATE SERVICE ERROR:',
        error
      );

      const message =
        error?.message ||
        'Failed to create service.';

      setError(message);
      showErrorToast(message);
    } finally {
      setLoading(false);
    }
  };

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
        <form onSubmit={handleSubmit} >
          <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                Add Service
              </DialogTitle>

              <DialogDescription>
                Create a new support service.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
              <DialogBody className="pt-2.5 space-y-6">
                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="service-name"
                      className="text-sm font-medium"
                    >
                      Service Name
                      <span className="ms-1 text-destructive">
                        *
                      </span>
                    </label>

                    <Input
                      id="service-name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={
                        handleChange
                      }
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
                  !form.name.trim()
                }
              >
                {loading
                  ? 'Creating...'
                  : 'Create Service'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceAddDialog;