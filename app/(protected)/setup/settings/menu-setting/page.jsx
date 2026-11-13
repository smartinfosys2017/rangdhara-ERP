'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  GripVertical,
  Pencil,
  Plus,
  Search,
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
  Input,
} from '@/components/ui/input';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

import MenuAddDialog from './components/menu-add-dialog';

import MenuEditDialog from './components/menu-edit-dialog';

import MenuDeleteDialog from './components/menu-delete-dialog';

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
| ICONS
|--------------------------------------------------------------------------
*/

const ICONS = {
  Menu: require('lucide-react').Menu,
  Home: require('lucide-react').Home,
  Users: require('lucide-react').Users,
  User: require('lucide-react').User,
  Settings: require('lucide-react').Settings,
  Building: require('lucide-react').Building,
  Globe: require('lucide-react').Globe,
  Mail: require('lucide-react').Mail,
  Database: require('lucide-react').Database,
  Shield: require('lucide-react').Shield,
  Lock: require('lucide-react').Lock,
  FileText: require('lucide-react').FileText,
  DollarSign: require('lucide-react').DollarSign,
  CreditCard: require('lucide-react').CreditCard,
  Package: require('lucide-react').Package,
  ShoppingCart:
    require('lucide-react').ShoppingCart,
  Briefcase:
    require('lucide-react').Briefcase,
  Clipboard:
    require('lucide-react').Clipboard,
  LayoutDashboard:
    require('lucide-react').LayoutDashboard,
};

/*
|--------------------------------------------------------------------------
| PAGE
|--------------------------------------------------------------------------
*/

export default function MenuSettingPage() {
  const [
    menus,
    setMenus,
  ] = useState([]);

  const [
    tree,
    setTree,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    expanded,
    setExpanded,
  ] = useState({});

  const [
    addDialogOpen,
    setAddDialogOpen,
  ] = useState(false);

  const [
    editDialogOpen,
    setEditDialogOpen,
  ] = useState(false);

  const [
    deleteDialogOpen,
    setDeleteDialogOpen,
  ] = useState(false);

  const [
    selectedMenu,
    setSelectedMenu,
  ] = useState(null);

  const [
    selectedParentId,
    setSelectedParentId,
  ] = useState('');

  /*
  |--------------------------------------------------------------------------
  | FETCH MENUS
  |--------------------------------------------------------------------------
  */

  const fetchMenus = useCallback(
    async () => {
      try {
        setLoading(true);

        const response =
          await apiFetch(
            '/api/settings/menu-setting',
            {
              method: 'GET',
              cache: 'no-store',
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
              'Failed to load menus.'
          );
        }

        setMenus(
          result.data || []
        );

        setTree(
          result.tree || []
        );
      } catch (error) {
        console.error(
          'FETCH MENU ERROR:',
          error
        );

        setMenus([]);
        setTree([]);

        showErrorToast(
          error?.message ||
            'Failed to load menus.'
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  /*
  |--------------------------------------------------------------------------
  | FLATTEN TREE
  |--------------------------------------------------------------------------
  */

  const flattenTree = useCallback(
    (
      items,
      level = 0,
      parentId = null
    ) => {
      const result = [];

      items.forEach((item) => {
        result.push({
          ...item,
          level,
          parentId,
        });

        if (
          item.children &&
          item.children.length
        ) {
          result.push(
            ...flattenTree(
              item.children,
              level + 1,
              item.id
            )
          );
        }
      });

      return result;
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | FLAT MENU LIST
  |--------------------------------------------------------------------------
  */

  const flatMenus = useMemo(
    () => {
      return flattenTree(
        tree
      );
    },
    [
      tree,
      flattenTree,
    ]
  );

  /*
  |--------------------------------------------------------------------------
  | FILTERED MENUS
  |--------------------------------------------------------------------------
  */

  const filteredMenus =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      if (!searchValue) {
        return flatMenus;
      }

      return flatMenus.filter(
        (item) =>
          item.title
            ?.toLowerCase()
            .includes(searchValue) ||
          item.slug
            ?.toLowerCase()
            .includes(searchValue) ||
          item.path
            ?.toLowerCase()
            .includes(searchValue) ||
          item.module
            ?.toLowerCase()
            .includes(searchValue)
      );
    }, [
      flatMenus,
      search,
    ]);

  /*
  |--------------------------------------------------------------------------
  | OPEN ADD
  |--------------------------------------------------------------------------
  */

  const handleAdd = (
    parentId = ''
  ) => {
    setSelectedParentId(
      parentId || ''
    );

    setAddDialogOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN EDIT
  |--------------------------------------------------------------------------
  */

  const handleEdit = (
    menu
  ) => {
    setSelectedMenu(menu);

    setEditDialogOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN DELETE
  |--------------------------------------------------------------------------
  */

  const handleDelete = (
    menu
  ) => {
    setSelectedMenu(menu);

    setDeleteDialogOpen(true);
  };

  /*
  |--------------------------------------------------------------------------
  | TOGGLE EXPANDED
  |--------------------------------------------------------------------------
  */

  const toggleExpanded = (
    id
  ) => {
    setExpanded(
      (previous) => ({
        ...previous,
        [id]:
          !previous[id],
      })
    );
  };

  /*
  |--------------------------------------------------------------------------
  | STATUS
  |--------------------------------------------------------------------------
  */

  const handleStatus = async (
    menu
  ) => {
    try {
      const response =
        await apiFetch(
          '/api/settings/menu-setting',
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              action: 'status',
              id: menu.id,
              status:
                !menu.status,
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
            'Failed to update menu status.'
        );
      }

      showSuccessToast(
        `Menu ${
          !menu.status
            ? 'activated'
            : 'deactivated'
        } successfully.`
      );

      fetchMenus();
    } catch (error) {
      console.error(
        'MENU STATUS ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to update menu status.'
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | MOVE MENU
  |--------------------------------------------------------------------------
  */

  const handleMove = async (
    menu,
    direction
  ) => {
    try {
      const response =
        await apiFetch(
          '/api/settings/menu-setting',
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              action: 'move',
              id: menu.id,
              direction,
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
            'Failed to move menu.'
        );
      }

      fetchMenus();
    } catch (error) {
      console.error(
        'MOVE MENU ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to move menu.'
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | GET SIBLINGS
  |--------------------------------------------------------------------------
  */

  const getSiblings = (
    menu
  ) => {
    return menus
      .filter(
        (item) =>
          (item.parentId || null) ===
          (menu.parentId || null)
      )
      .sort(
        (a, b) =>
          a.sortOrder -
          b.sortOrder
      );
  };

  /*
  |--------------------------------------------------------------------------
  | CAN MOVE UP
  |--------------------------------------------------------------------------
  */

  const canMoveUp = (
    menu
  ) => {
    const siblings =
      getSiblings(menu);

    const index =
      siblings.findIndex(
        (item) =>
          item.id === menu.id
      );

    return index > 0;
  };

  /*
  |--------------------------------------------------------------------------
  | CAN MOVE DOWN
  |--------------------------------------------------------------------------
  */

  const canMoveDown = (
    menu
  ) => {
    const siblings =
      getSiblings(menu);

    const index =
      siblings.findIndex(
        (item) =>
          item.id === menu.id
      );

    return (
      index !== -1 &&
      index <
        siblings.length - 1
    );
  };

  /*
  |--------------------------------------------------------------------------
  | ICON
  |--------------------------------------------------------------------------
  */

  const MenuIcon = ({
    icon,
  }) => {
    const IconComponent =
      ICONS[icon] ||
      ICONS.Menu;

    return (
      <IconComponent className="size-4 shrink-0" />
    );
  };

  /*
  |--------------------------------------------------------------------------
  | RENDER MENU
  |--------------------------------------------------------------------------
  */

  const renderMenu = (
    items,
    level = 0
  ) => {
    return items
      .map((item) => {
        const hasChildren =
          item.children &&
          item.children.length > 0;

        const isExpanded =
          expanded[item.id] ||
          search.trim();

        const siblingItems =
          getSiblings(item);

        const siblingIndex =
          siblingItems.findIndex(
            (sibling) =>
              sibling.id ===
              item.id
          );

        return (
          <div
            key={item.id}
            className="border-b last:border-b-0"
          >
            <div
              className="group flex items-center gap-2 px-4 py-3 hover:bg-muted/40"
              style={{
                paddingLeft:
                  `${16 + level * 32}px`,
              }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() =>
                    toggleExpanded(
                      item.id
                    )
                  }
                  className="flex size-7 items-center justify-center rounded-md hover:bg-muted"
                >
                  {isExpanded ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                </button>
              ) : (
                <div className="size-7" />
              )}

              <div className="cursor-grab text-muted-foreground">
                <GripVertical className="size-4" />
              </div>

              <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                <MenuIcon
                  icon={item.icon}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {item.title}
                  </span>

                  {hasChildren && (
                    <span className="text-xs text-muted-foreground">
                      {item.children.length}{' '}
                      children
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {item.path && (
                    <span>
                      {item.path}
                    </span>
                  )}

                  {item.module && (
                    <span>
                      Module: {item.module}
                    </span>
                  )}

                  {item.permission && (
                    <span>
                      Permission:{' '}
                      {item.permission}
                    </span>
                  )}
                </div>
              </div>

              <div className="hidden items-center gap-2 md:flex">
                <span
                  className={
                    item.status
                      ? 'rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700'
                      : 'rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700'
                  }
                >
                  {item.status
                    ? 'Active'
                    : 'Inactive'}
                </span>

                <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                  #{item.sortOrder}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Move Up"
                  onClick={() =>
                    handleMove(
                      item,
                      'up'
                    )
                  }
                  disabled={
                    siblingIndex <= 0
                  }
                >
                  <ChevronUp className="size-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Move Down"
                  onClick={() =>
                    handleMove(
                      item,
                      'down'
                    )
                  }
                  disabled={
                    siblingIndex ===
                      -1 ||
                    siblingIndex >=
                      siblingItems.length -
                        1
                  }
                >
                  <ChevronDown className="size-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Add Child Menu"
                  onClick={() =>
                    handleAdd(
                      item.id
                    )
                  }
                >
                  <Plus className="size-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title={
                    item.status
                      ? 'Deactivate'
                      : 'Activate'
                  }
                  onClick={() =>
                    handleStatus(
                      item
                    )
                  }
                >
                  <span
                    className={
                      item.status
                        ? 'size-2 rounded-full bg-green-500'
                        : 'size-2 rounded-full bg-red-500'
                    }
                  />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Edit"
                  onClick={() =>
                    handleEdit(
                      item
                    )
                  }
                >
                  <Pencil className="size-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Delete"
                  onClick={() =>
                    handleDelete(
                      item
                    )
                  }
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>

            {hasChildren &&
              isExpanded && (
                <div>
                  {renderMenu(
                    item.children,
                    level + 1
                  )}
                </div>
              )}
          </div>
        );
      });
  };

  /*
  |--------------------------------------------------------------------------
  | FILTER TREE FOR SEARCH
  |--------------------------------------------------------------------------
  */

  const filterTree = useCallback(
    (
      items,
      searchValue
    ) => {
      if (!searchValue) {
        return items;
      }

      return items.reduce(
        (result, item) => {
          const titleMatch =
            item.title
              ?.toLowerCase()
              .includes(
                searchValue
              );

          const slugMatch =
            item.slug
              ?.toLowerCase()
              .includes(
                searchValue
              );

          const pathMatch =
            item.path
              ?.toLowerCase()
              .includes(
                searchValue
              );

          const moduleMatch =
            item.module
              ?.toLowerCase()
              .includes(
                searchValue
              );

          const permissionMatch =
            item.permission
              ?.toLowerCase()
              .includes(
                searchValue
              );

          const children =
            item.children
              ? filterTree(
                  item.children,
                  searchValue
                )
              : [];

          if (
            titleMatch ||
            slugMatch ||
            pathMatch ||
            moduleMatch ||
            permissionMatch ||
            children.length
          ) {
            result.push({
              ...item,
              children,
            });
          }

          return result;
        },
        []
      );
    },
    []
  );

  const displayTree =
    useMemo(() => {
      return filterTree(
        tree,
        search
          .trim()
          .toLowerCase()
      );
    }, [
      tree,
      search,
      filterTree,
    ]);

  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

  return (
    <div className="container-fluid">
      <div className="flex flex-col gap-5">
        {/* HEADER */}

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              Menu Setting
            </h1>

            <p className="text-sm text-muted-foreground">
              Manage application menus,
              hierarchy, permissions and
              visibility.
            </p>
          </div>

          <Button
            type="button"
            onClick={() =>
              handleAdd()
            }
          >
            <Plus />
            Add Menu
          </Button>
        </div>

        {/* SEARCH */}

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search menus..."
            className="pl-9"
          />
        </div>

        {/* MENU LIST */}

        <div className="overflow-hidden rounded-xl border bg-background">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">
                Menus
              </h2>

              <p className="text-xs text-muted-foreground">
                {menus.length} menu
                {menus.length === 1
                  ? ''
                  : 's'}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-muted-foreground">
              Loading menus...
            </div>
          ) : !displayTree.length ? (
            <div className="px-6 py-10 text-center">
              <div className="text-sm font-medium">
                No menus found
              </div>

              <p className="mt-1 text-sm text-muted-foreground">
                {search
                  ? 'Try a different search.'
                  : 'Create your first menu.'}
              </p>
            </div>
          ) : (
            <div>
              {renderMenu(
                displayTree
              )}
            </div>
          )}
        </div>
      </div>

      {/* ADD */}

      <MenuAddDialog
        open={
          addDialogOpen
        }
        closeDialog={() => {
          setAddDialogOpen(
            false
          );

          setSelectedParentId(
            ''
          );
        }}
        parentId={
          selectedParentId
        }
        onSuccess={() => {
          fetchMenus();
        }}
      />

      {/* EDIT */}

      <MenuEditDialog
        open={
          editDialogOpen
        }
        closeDialog={() => {
          setEditDialogOpen(
            false
          );

          setSelectedMenu(
            null
          );
        }}
        menu={
          selectedMenu
        }
        menus={
          menus
        }
        onSuccess={() => {
          fetchMenus();
        }}
      />

      {/* DELETE */}

      <MenuDeleteDialog
        open={
          deleteDialogOpen
        }
        closeDialog={() => {
          setDeleteDialogOpen(
            false
          );

          setSelectedMenu(
            null
          );
        }}
        menu={
          selectedMenu
        }
        onSuccess={() => {
          fetchMenus();
        }}
      />
    </div>
  );
}