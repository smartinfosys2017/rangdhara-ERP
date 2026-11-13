"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { can } from "@/lib/permissions";

/**
 * ============================================================
 * CHECK MENU STATUS
 * ============================================================
 */
function isMenuInactive(item) {
  if (!item) {
    return true;
  }

  return (
    item.status === false ||
    item.status === 0 ||
    item.status === "false" ||
    item.status === "0"
  );
}

/**
 * ============================================================
 * ADMIN MENU FILTER
 * ============================================================
 *
 * Admin:
 * - Ignore permissions
 * - Show active menus
 * - Hide inactive menus
 * - If parent is inactive, hide entire branch
 */
function filterMenuByStatus(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item) {
        return null;
      }

      /**
       * IMPORTANT:
       *
       * Parent inactive = hide entire branch.
       *
       * Do this BEFORE processing children.
       */
      if (isMenuInactive(item)) {
        return null;
      }

      /**
       * Process children recursively.
       */
      if (Array.isArray(item.children)) {
        const filteredChildren = filterMenuByStatus(item.children);

        return {
          ...item,
          children: filteredChildren,
        };
      }

      return item;
    })
    .filter(Boolean);
}

/**
 * ============================================================
 * USER MENU FILTER
 * ============================================================
 *
 * Normal users:
 * - Check status
 * - Check permissions
 * - Inactive parent hides entire branch
 */
function filterMenuByPermissions(items, permissions) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item) => {
      if (!item) {
        return null;
      }

      /**
       * ======================================================
       * INACTIVE MENU
       * ======================================================
       *
       * This MUST happen before children are processed.
       */
      if (isMenuInactive(item)) {
        return null;
      }

      /**
       * ======================================================
       * FILTER CHILDREN
       * ======================================================
       */
      let filteredChildren = [];

      if (Array.isArray(item.children)) {
        filteredChildren = filterMenuByPermissions(item.children, permissions);
      }

      /**
       * ======================================================
       * HEADING
       * ======================================================
       */
      if (item.menuType === "heading" || item.heading) {
        if (filteredChildren.length > 0) {
          return {
            ...item,
            children: filteredChildren,
          };
        }

        return null;
      }

      /**
       * ======================================================
       * SEPARATOR
       * ======================================================
       */
      if (item.menuType === "separator" || item.separator) {
        return item;
      }

      /**
       * ======================================================
       * CHECK PERMISSION
       * ======================================================
       */
      let hasPermission = true;

      if (item.permission) {
        hasPermission = can(item.permission, permissions);
      }

      /**
       * ======================================================
       * MENU WITH CHILDREN
       * ======================================================
       */
      if (Array.isArray(item.children)) {
        /**
         * Parent has visible children.
         */
        if (filteredChildren.length > 0) {
          return {
            ...item,
            children: filteredChildren,
          };
        }

        /**
         * Parent has no visible children.
         *
         * Show parent only if it has permission
         * and has a path.
         */
        if (hasPermission && item.path) {
          return {
            ...item,
            children: [],
          };
        }

        return null;
      }

      /**
       * ======================================================
       * NORMAL MENU ITEM
       * ======================================================
       */
      if (!hasPermission) {
        return null;
      }

      return item;
    })
    .filter(Boolean);
}

/**
 * ============================================================
 * USE PERMISSION MENU
 * ============================================================
 */
export function usePermissionMenu() {
  const { data: session, status } = useSession();

  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * ----------------------------------------------------------
   * ROLE
   * ----------------------------------------------------------
   */
  const roleSlug = session?.user?.roleSlug || "";

  const isAdmin = roleSlug === "admin";

  /**
   * ----------------------------------------------------------
   * USER PERMISSIONS
   * ----------------------------------------------------------
   */
  const permissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  /**
   * ----------------------------------------------------------
   * LOAD DYNAMIC MENUS
   * ----------------------------------------------------------
   */
  useEffect(() => {
    if (status !== "authenticated") {
      setMenus([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadMenus() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/menu", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load menus");
        }

        const data = await response.json();

        // console.log("API /api/menu RESULT:", data);
        // console.log("API MENUS:", data?.menus);

        if (!cancelled) {
          setMenus(Array.isArray(data?.menus) ? data.menus : []);
        }
      } catch (err) {
        console.error("MENU LOAD ERROR:", err);

        if (!cancelled) {
          setMenus([]);
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMenus();

    return () => {
      cancelled = true;
    };
  }, [status]);

  /**
   * ==========================================================
   * MAIN SIDEBAR
   * ==========================================================
   *
   * ADMIN:
   *   Status filtering ONLY
   *   Permissions are ignored
   *
   * NORMAL USER:
   *   Status + permission filtering
   */
  const menuSidebar = useMemo(() => {
    if (status !== "authenticated") {
      return [];
    }

    if (isAdmin) {
      return filterMenuByStatus(menus);
    }

    return filterMenuByPermissions(menus, permissions);
  }, [menus, permissions, status, isAdmin]);

  /**
   * ==========================================================
   * CUSTOM MENU
   * ==========================================================
   */
  const menuSidebarCustom = useMemo(() => {
    if (status !== "authenticated") {
      return [];
    }

    if (isAdmin) {
      return filterMenuByStatus(menus);
    }

    return filterMenuByPermissions(menus, permissions);
  }, [menus, permissions, status, isAdmin]);

  /**
   * ==========================================================
   * COMPACT MENU
   * ==========================================================
   */
  const menuSidebarCompact = useMemo(() => {
    if (status !== "authenticated") {
      return [];
    }

    if (isAdmin) {
      return filterMenuByStatus(menus);
    }

    return filterMenuByPermissions(menus, permissions);
  }, [menus, permissions, status, isAdmin]);

  /**
   * ==========================================================
   * DEBUG
   * ==========================================================
  //  */
  // useEffect(() => {
  //   console.log("=================================");
  //   console.log("MENU DEBUG");
  //   console.log("Role:", roleSlug);
  //   console.log("Is Admin:", isAdmin);
  //   console.log("Raw Menus:", menus);
  //   console.log("Sidebar:", menuSidebar);
  //   console.log("=================================");
  // }, [roleSlug, isAdmin, menus, menuSidebar]);

  /**
   * ==========================================================
   * RETURN
   * ==========================================================
   */
  return {
    menuSidebar,
    menuSidebarCustom,
    menuSidebarCompact,
    menus,
    permissions,
    roleSlug,
    isAdmin,
    status,
    loading,
    error,
  };
}
