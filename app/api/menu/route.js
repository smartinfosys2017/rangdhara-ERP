import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const menus = await prisma.menu.findMany({
      where: {
        status: true,
      },
      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          title: "asc",
        },
      ],
      select: {
        id: true,
        title: true,
        slug: true,
        path: true,
        icon: true,
        parentId: true,
        module: true,
        permission: true,
        sortOrder: true,
        status: true,
        menuType: true,
        target: true,
      },
    });

    /*
     * ----------------------------------------------------
     * BUILD PARENT / CHILD TREE
     * ----------------------------------------------------
     */

    const menuMap = new Map();

    menus.forEach((menu) => {
      menuMap.set(menu.id, {
        ...menu,
        children: [],
      });
    });

    const rootMenus = [];

    menus.forEach((menu) => {
      const currentMenu = menuMap.get(menu.id);

      /*
       * No parent = root menu
       */
      if (!menu.parentId) {
        rootMenus.push(currentMenu);
        return;
      }

      /*
       * Parent exists
       */
      const parentMenu = menuMap.get(menu.parentId);

      if (parentMenu) {
        parentMenu.children.push(currentMenu);
      } else {
        /*
         * If parent does not exist, keep menu
         * as root instead of losing it.
         */
        rootMenus.push(currentMenu);
      }
    });

    return NextResponse.json({
      success: true,
      menus: rootMenus,
    });
  } catch (error) {
    console.error("MENU API ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load menus",
        menus: [],
      },
      {
        status: 500,
      },
    );
  }
}
