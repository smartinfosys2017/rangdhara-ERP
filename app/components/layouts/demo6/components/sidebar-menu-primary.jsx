"use client";

import { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";

import { usePermissionMenu } from "@/hooks/use-permission-menu";
import { cn } from "@/lib/utils";

import {
  AccordionMenu,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from "@/components/ui/accordion-menu";

export function SidebarMenuPrimary() {
  const pathname = usePathname();

  const { menuSidebarCompact, permissions, status } = usePermissionMenu();

  const menuItems = Array.isArray(menuSidebarCompact) ? menuSidebarCompact : [];

  /*
   * ============================================================
   * DYNAMIC ICON
   * ============================================================
   *
   * Database/API:
   *
   * icon: "LayoutGrid"
   *
   * Convert string to Lucide React component:
   *
   * Icons["LayoutGrid"]
   *
   */

  const getMenuIcon = useCallback((iconName) => {
    if (!iconName) {
      return Icons.Menu;
    }

    // If already a React component
    if (typeof iconName !== "string") {
      return iconName;
    }

    // Find icon from lucide-react
    return Icons[iconName] || Icons.Menu;
  }, []);

  const matchPath = useCallback(
    (path) =>
      path === pathname || (path?.length > 1 && pathname.startsWith(path)),
    [pathname],
  );

  const classNames = {
    root: "space-y-2.5 px-3.5",
    group: "gap-px",
    label:
      "uppercase text-xs font-medium text-muted-foreground/70 pt-2.25 pb-px",
    separator: "",
    item: "h-9 hover:bg-transparent border border-transparent text-accent-foreground hover:text-mono data-[selected=true]:text-mono data-[selected=true]:bg-background data-[selected=true]:border-border data-[selected=true]:font-medium",
    sub: "",
    subTrigger:
      "h-9 hover:bg-transparent border border-transparent text-accent-foreground hover:text-mono data-[selected=true]:text-mono data-[selected=true]:bg-background data-[selected=true]:border-border data-[selected=true]:font-medium",
    subContent: "py-0",
    indicator: "",
  };

  const buildMenu = (items) => {
    if (!Array.isArray(items)) {
      return null;
    }

    return items.map((item, index) => {
      if (!item.heading && !item.disabled) {
        return buildMenuItemRoot(item, index);
      }

      return null;
    });
  };

  const buildMenuItemRoot = (item, index) => {
    const MenuIcon = getMenuIcon(item.icon);

    if (Array.isArray(item.children) && item.children.length > 0) {
      return (
        <AccordionMenuSub
          key={item.path || `root-${index}`}
          value={item.path || `root-${index}`}
        >
          <AccordionMenuSubTrigger className="text-sm font-medium">
            <MenuIcon data-slot="accordion-menu-icon" className="size-4" />

            <span data-slot="accordion-menu-title">{item.title}</span>
          </AccordionMenuSubTrigger>

          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `root-${index}`}
            className="ps-6"
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(item.children, 1)}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    }

    return (
      <AccordionMenuItem
        key={item.path || `root-${index}`}
        value={item.path || ""}
        className="text-sm font-medium"
      >
        <Link href={item.path || "#"}>
          <MenuIcon data-slot="accordion-menu-icon" className="size-4" />

          <span data-slot="accordion-menu-title">{item.title}</span>
        </Link>
      </AccordionMenuItem>
    );
  };

  const buildMenuItemChildren = (items, level = 0) => {
    if (!Array.isArray(items)) {
      return null;
    }

    return items.map((item, index) => {
      if (!item.heading && !item.disabled) {
        return buildMenuItemChild(item, index, level);
      }

      return null;
    });
  };

  const buildMenuItemChild = (item, index, level = 0) => {
    const MenuIcon = getMenuIcon(item.icon);

    if (Array.isArray(item.children) && item.children.length > 0) {
      return (
        <AccordionMenuSub
          key={item.path || `child-${level}-${index}`}
          value={item.path || `child-${level}-${index}`}
        >
          <AccordionMenuSubTrigger className="text-[13px]">
            {item.collapse ? (
              <span className="text-muted-foreground">
                <span className="hidden [[data-state=open]>span>&]:inline">
                  {item.collapseTitle}
                </span>

                <span className="inline [[data-state=open]>span>&]:hidden">
                  {item.expandTitle}
                </span>
              </span>
            ) : (
              <>
                {item.icon && (
                  <MenuIcon
                    data-slot="accordion-menu-icon"
                    className="size-4"
                  />
                )}

                {item.title}
              </>
            )}
          </AccordionMenuSubTrigger>

          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `child-${level}-${index}`}
            className={cn("ps-4", !item.collapse && "relative")}
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(
                item.children,
                item.collapse ? level : level + 1,
              )}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    }

    return (
      <AccordionMenuItem
        key={item.path || `child-${level}-${index}`}
        value={item.path || ""}
        className="text-[13px]"
      >
        <Link href={item.path || "#"}>
          {item.icon && (
            <MenuIcon data-slot="accordion-menu-icon" className="size-4" />
          )}

          {item.title}
        </Link>
      </AccordionMenuItem>
    );
  };

  return (
    <AccordionMenu
      type="single"
      selectedValue={pathname}
      matchPath={matchPath}
      collapsible
      classNames={classNames}
    >
      {buildMenu(menuItems)}
    </AccordionMenu>
  );
}
