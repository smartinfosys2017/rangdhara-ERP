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
| ADD MENU DIALOG
|--------------------------------------------------------------------------
*/

export default function MenuAddDialog({
  open,
  closeDialog,
  onSuccess,
  parentId = '',
}) {
  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    title,
    setTitle,
  ] = useState('');

  const [
    slug,
    setSlug,
  ] = useState('');

  const [
    path,
    setPath,
  ] = useState('');

  const [
    icon,
    setIcon,
  ] = useState('');

  const [
    module,
    setModule,
  ] = useState('');

  const [
    permission,
    setPermission,
  ] = useState('');

  const [
    menuType,
    setMenuType,
  ] = useState('item');

  const [
    target,
    setTarget,
  ] = useState('_self');

  const [
    status,
    setStatus,
  ] = useState(true);

  /*
  |--------------------------------------------------------------------------
  | RESET FORM
  |--------------------------------------------------------------------------
  */

  const resetForm = () => {
    setTitle('');
    setSlug('');
    setPath('');
    setIcon('');
    setModule('');
    setPermission('');
    setMenuType('item');
    setTarget('_self');
    setStatus(true);
  };

  /*
  |--------------------------------------------------------------------------
  | SUBMIT
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      showErrorToast(
        'Menu title is required.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/settings/menu-setting',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              title: trimmedTitle,
              slug:
                slug.trim() || null,
              path:
                path.trim() || null,
              icon:
                icon.trim() || null,
              parentId:
                parentId || null,
              module:
                module.trim() || null,
              permission:
                permission.trim() || null,
              menuType,
              target,
              status,
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
            'Failed to create menu.'
        );
      }

      showSuccessToast(
        'Menu created successfully.'
      );

      resetForm();

      onSuccess?.();

      closeDialog?.();
    } catch (error) {
      console.error(
        'CREATE MENU ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to create menu.'
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Add Menu
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="menu-title">
              Title
              <span className="ml-1 text-destructive">
                *
              </span>
            </Label>

            <Input
              id="menu-title"
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              disabled={loading}
              placeholder="Menu title"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="menu-slug">
                Slug
              </Label>

              <Input
                id="menu-slug"
                value={slug}
                onChange={(event) =>
                  setSlug(
                    event.target.value
                  )
                }
                disabled={loading}
                placeholder="menu-slug"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-path">
                Path
              </Label>

              <Input
                id="menu-path"
                value={path}
                onChange={(event) =>
                  setPath(
                    event.target.value
                  )
                }
                disabled={loading}
                placeholder="/setup/settings"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="menu-icon">
                Icon
              </Label>

              <Input
                id="menu-icon"
                value={icon}
                onChange={(event) =>
                  setIcon(
                    event.target.value
                  )
                }
                disabled={loading}
                placeholder="Settings"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-module">
                Module
              </Label>

              <Input
                id="menu-module"
                value={module}
                onChange={(event) =>
                  setModule(
                    event.target.value
                  )
                }
                disabled={loading}
                placeholder="settings"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="menu-permission">
              Permission
            </Label>

            <Input
              id="menu-permission"
              value={permission}
              onChange={(event) =>
                setPermission(
                  event.target.value
                )
              }
              disabled={loading}
              placeholder="settings.view"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="menu-type">
                Menu Type
              </Label>

              <select
                id="menu-type"
                value={menuType}
                onChange={(event) =>
                  setMenuType(
                    event.target.value
                  )
                }
                disabled={loading}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="item">
                  Item
                </option>

                <option value="group">
                  Group
                </option>

                <option value="label">
                  Label
                </option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="menu-target">
                Target
              </Label>

              <select
                id="menu-target"
                value={target}
                onChange={(event) =>
                  setTarget(
                    event.target.value
                  )
                }
                disabled={loading}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="_self">
                  Same Window
                </option>

                <option value="_blank">
                  New Window
                </option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              id="menu-status"
              type="checkbox"
              checked={status}
              onChange={(event) =>
                setStatus(
                  event.target.checked
                )
              }
              disabled={loading}
              className="size-4"
            />

            <Label htmlFor="menu-status">
              Active
            </Label>
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
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Saving...
                </>
              ) : (
                'Add Menu'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}