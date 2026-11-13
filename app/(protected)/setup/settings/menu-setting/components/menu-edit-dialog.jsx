'use client';

import {
  useEffect,
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
| EDIT MENU DIALOG
|--------------------------------------------------------------------------
*/

export default function MenuEditDialog({
  open,
  closeDialog,
  onSuccess,
  menu,
  menus = [],
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
    parentId,
    setParentId,
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
  | SET FORM DATA
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!menu) {
      return;
    }

    setTitle(
      menu.title || ''
    );

    setSlug(
      menu.slug || ''
    );

    setPath(
      menu.path || ''
    );

    setIcon(
      menu.icon || ''
    );

    setParentId(
      menu.parentId || ''
    );

    setModule(
      menu.module || ''
    );

    setPermission(
      menu.permission || ''
    );

    setMenuType(
      menu.menuType || 'item'
    );

    setTarget(
      menu.target || '_self'
    );

    setStatus(
      menu.status !== false
    );
  }, [menu, open]);

  /*
  |--------------------------------------------------------------------------
  | GET DESCENDANTS
  |--------------------------------------------------------------------------
  */

  const getDescendantIds = (
    menuId
  ) => {
    const ids = new Set();

    const findChildren = (
      parentIdValue
    ) => {
      menus.forEach((item) => {
        if (
          item.parentId ===
          parentIdValue
        ) {
          ids.add(item.id);
          findChildren(item.id);
        }
      });
    };

    findChildren(menuId);

    return ids;
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

    if (!menu?.id) {
      showErrorToast(
        'Menu not found.'
      );

      return;
    }

    const trimmedTitle =
      title.trim();

    if (!trimmedTitle) {
      showErrorToast(
        'Menu title is required.'
      );

      return;
    }

    if (
      parentId &&
      parentId === menu.id
    ) {
      showErrorToast(
        'A menu cannot be its own parent.'
      );

      return;
    }

    const descendantIds =
      getDescendantIds(
        menu.id
      );

    if (
      parentId &&
      descendantIds.has(parentId)
    ) {
      showErrorToast(
        'A menu cannot be moved inside its own child menu.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/settings/menu-setting',
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              id: menu.id,
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
            'Failed to update menu.'
        );
      }

      showSuccessToast(
        'Menu updated successfully.'
      );

      onSuccess?.();

      closeDialog?.();
    } catch (error) {
      console.error(
        'UPDATE MENU ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to update menu.'
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | PARENT OPTIONS
  |--------------------------------------------------------------------------
  */

  const descendantIds =
    menu?.id
      ? getDescendantIds(menu.id)
      : new Set();

  const parentOptions =
    menus.filter((item) => {
      if (!menu) {
        return true;
      }

      if (
        item.id === menu.id
      ) {
        return false;
      }

      if (
        descendantIds.has(item.id)
      ) {
        return false;
      }

      return true;
    });

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
            Edit Menu
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-menu-title">
              Title
              <span className="ml-1 text-destructive">
                *
              </span>
            </Label>

            <Input
              id="edit-menu-title"
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
              <Label htmlFor="edit-menu-slug">
                Slug
              </Label>

              <Input
                id="edit-menu-slug"
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
              <Label htmlFor="edit-menu-path">
                Path
              </Label>

              <Input
                id="edit-menu-path"
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
              <Label htmlFor="edit-menu-icon">
                Icon
              </Label>

              <Input
                id="edit-menu-icon"
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
              <Label htmlFor="edit-menu-module">
                Module
              </Label>

              <Input
                id="edit-menu-module"
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
            <Label htmlFor="edit-menu-parent">
              Parent Menu
            </Label>

            <select
              id="edit-menu-parent"
              value={parentId}
              onChange={(event) =>
                setParentId(
                  event.target.value
                )
              }
              disabled={loading}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">
                Root Menu
              </option>

              {parentOptions.map(
                (item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.title}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-menu-permission">
              Permission
            </Label>

            <Input
              id="edit-menu-permission"
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
              <Label htmlFor="edit-menu-type">
                Menu Type
              </Label>

              <select
                id="edit-menu-type"
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
              <Label htmlFor="edit-menu-target">
                Target
              </Label>

              <select
                id="edit-menu-target"
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
              id="edit-menu-status"
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

            <Label htmlFor="edit-menu-status">
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
                'Update Menu'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}