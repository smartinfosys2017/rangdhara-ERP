'use client';

import {
  useState,
} from 'react';

import {
  LoaderCircle,
} from 'lucide-react';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import {
  toast,
} from 'sonner';

import {
  apiFetch,
} from '@/lib/api';

import {
  Button,
} from '@/components/ui/button';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Input,
} from '@/components/ui/input';

import {
  Label,
} from '@/components/ui/label';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
/*
|--------------------------------------------------------------------------
| TOAST
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| ADD CUSTOMER GROUP
|--------------------------------------------------------------------------
*/

export default function CustomerGroupAddDialog({
  open,
  closeDialog,
  onSuccess,
}) {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    name,
    setName,
  ] = useState('');

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      showErrorToast(
        'Customer group name is required.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/customer_group',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              name: trimmedName,
            }),
          }
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
          'Failed to create customer group.'
        );
      }

      showSuccessToast(
        'Customer group created successfully.'
      );

      setName('');

      onSuccess?.();

      closeDialog?.();
    } catch (error) {
      console.error(
        'CREATE CUSTOMER GROUP ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
        'Failed to create customer group.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col h-full max-h-[90vh] overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle>
              Add Customer Group
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogBody>

              <div className="space-y-2">
                <Label htmlFor="customer-group-name">
                  Name
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  id="customer-group-name"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value
                    )
                  }
                  disabled={loading}
                  placeholder="Customer group name"
                  autoFocus
                />
              </div>


            </DialogBody>
          </ScrollArea>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Customer Group'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}