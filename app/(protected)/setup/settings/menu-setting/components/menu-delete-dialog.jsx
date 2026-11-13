'use client';

import {
  useState,
} from 'react';

import {
  LoaderCircle,
  Trash2,
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
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

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
| DELETE MENU DIALOG
|--------------------------------------------------------------------------
*/

export default function MenuDeleteDialog({
  open,
  closeDialog,
  onSuccess,
  menu,
}) {
  const [
    loading,
    setLoading,
  ] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */

  const handleDelete = async () => {
    if (!menu?.id) {
      showErrorToast(
        'Menu not found.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/settings/menu-setting',
          {
            method: 'DELETE',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: menu.id,
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
            'Failed to delete menu.'
        );
      }

      showSuccessToast(
        'Menu deleted successfully.'
      );

      onSuccess?.();

      closeDialog?.();
    } catch (error) {
      console.error(
        'DELETE MENU ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to delete menu.'
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Delete Menu
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <Trash2 className="mt-0.5 size-5 text-destructive" />

            <div className="space-y-1">
              <p className="text-sm font-medium">
                Delete this menu?
              </p>

              <p className="text-sm text-muted-foreground">
                You are about to delete{' '}
                <span className="font-medium text-foreground">
                  {menu?.title || 'this menu'}
                </span>
                .
              </p>

              <p className="text-xs text-muted-foreground">
                If this menu has child menus,
                they will also be deleted.
              </p>
            </div>
          </div>
        </div>

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
            {loading ? (
              <>
                <LoaderCircle className="animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 />
                Delete Menu
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}