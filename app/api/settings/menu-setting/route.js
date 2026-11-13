import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

// =======================================================
// FORMAT MENU
// =======================================================

const formatMenu = (menu) => ({
  id: menu.id,
  title: menu.title,
  slug: menu.slug,
  path: menu.path,
  icon: menu.icon,
  parentId: menu.parentId,
  module: menu.module,
  permission: menu.permission,
  sortOrder: menu.sortOrder,
  status: menu.status,
  menuType: menu.menuType,
  target: menu.target,
  createdAt: menu.createdAt,
  updatedAt: menu.updatedAt,
});

// =======================================================
// BUILD MENU TREE
// =======================================================

const buildMenuTree = (menus) => {
  const menuMap = new Map();

  const tree = [];

  menus.forEach((menu) => {
    menuMap.set(menu.id, {
      ...menu,
      children: [],
    });
  });

  menus.forEach((menu) => {
    const currentMenu = menuMap.get(menu.id);

    if (menu.parentId && menuMap.has(menu.parentId)) {
      menuMap.get(menu.parentId).children.push(currentMenu);
    } else {
      tree.push(currentMenu);
    }
  });

  return tree;
};

// =======================================================
// GET
// =======================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // =====================================================
    // SINGLE MENU
    // =====================================================

    const id = searchParams.get("id");

    if (id !== null) {
      const menu = await prisma.menu.findUnique({
        where: {
          id: String(id),
        },
      });

      if (!menu) {
        return NextResponse.json(
          {
            success: false,
            message: "Menu not found.",
          },
          {
            status: 404,
          },
        );
      }

      return NextResponse.json({
        success: true,
        data: formatMenu(menu),
      });
    }

    // =====================================================
    // PAGINATION
    // =====================================================

    const pageParam = Number(searchParams.get("page") || 1);

    const limitParam = Number(searchParams.get("limit") || 10);

    const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

    const limit =
      Number.isInteger(limitParam) && limitParam > 0
        ? Math.min(limitParam, 100)
        : 10;

    const skip = (page - 1) * limit;

    // =====================================================
    // SEARCH
    // =====================================================

    const search = (
      searchParams.get("search") ||
      searchParams.get("query") ||
      ""
    ).trim();

    // =====================================================
    // SORT
    // =====================================================

    const requestedSort = searchParams.get("sort")?.trim() || "sortOrder";

    const requestedDir = searchParams.get("dir")?.trim().toLowerCase() || "asc";

    const allowedSortFields = [
      "id",
      "title",
      "slug",
      "path",
      "module",
      "permission",
      "sortOrder",
      "status",
      "menuType",
      "target",
      "createdAt",
      "updatedAt",
    ];

    const sort = allowedSortFields.includes(requestedSort)
      ? requestedSort
      : "sortOrder";

    const dir = requestedDir === "desc" ? "desc" : "asc";

    // =====================================================
    // WHERE
    // =====================================================
    //
    // IMPORTANT:
    // There is NO status filter.
    //
    // status = true  -> included
    // status = false -> included
    //
    // =====================================================

    const where = {};

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
          },
        },
        {
          slug: {
            contains: search,
          },
        },
        {
          path: {
            contains: search,
          },
        },
        {
          module: {
            contains: search,
          },
        },
        {
          permission: {
            contains: search,
          },
        },
      ];
    }

    // =====================================================
    // TOTAL
    // =====================================================

    const total = await prisma.menu.count({
      where,
    });

    // =====================================================
    // PAGINATED DATA
    // =====================================================
    //
    // This is only for your paginated admin table.
    // It includes BOTH active and inactive menus.
    //
    // =====================================================

    const paginatedMenus = await prisma.menu.findMany({
      where,

      orderBy: {
        [sort]: dir,
      },

      skip,
      take: limit,

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
        createdAt: true,
        updatedAt: true,
      },
    });

    // =====================================================
    // ALL MENUS
    // =====================================================
    //
    // IMPORTANT:
    // This query gets ALL matching menus.
    //
    // There is NO:
    // skip
    // take
    // status filter
    //
    // Therefore status=false menus are included.
    //
    // =====================================================

    const allMenus = await prisma.menu.findMany({
      where,

      orderBy: [
        {
          sortOrder: "asc",
        },
        {
          createdAt: "asc",
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
        createdAt: true,
        updatedAt: true,
      },
    });

    // =====================================================
    // FORMAT ALL MENUS
    // =====================================================

    const formattedAllMenus = allMenus.map(formatMenu);

    // =====================================================
    // ALL MENU TREE
    // =====================================================
    //
    // Includes:
    //
    // status = true
    // status = false
    //
    // =====================================================

    const tree = buildMenuTree(formattedAllMenus);

    // =====================================================
    // ACTIVE TREE
    // =====================================================
    //
    // IMPORTANT:
    // We are NOT filtering status here.
    //
    // This keeps inactive menus such as Finance
    // available in the tree/list.
    //
    // =====================================================

    const activeTree = buildMenuTree(formattedAllMenus);

    // =====================================================
    // PAGINATION
    // =====================================================

    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      // ===================================================
      // ALL DB MENUS
      // ===================================================
      //
      // IMPORTANT:
      // This now contains ALL menus matching the search,
      // including status:false.
      //
      data: formattedAllMenus,

      // ===================================================
      // PAGINATED DATA
      // ===================================================
      //
      // Use this for your paginated admin table.
      //
      paginatedData: paginatedMenus.map(formatMenu),

      // ===================================================
      // ALL DB MENUS
      // ===================================================

      allMenus: formattedAllMenus,

      // ===================================================
      // ALL MENU TREE
      // ===================================================
      //
      // Includes active + inactive menus.
      //
      tree,

      // ===================================================
      // ACTIVE TREE
      // ===================================================
      //
      // Currently also includes active + inactive menus.
      //
      activeTree,

      // ===================================================
      // PAGINATION
      // ===================================================

      pagination: {
        page,
        limit,
        total,
        totalPages,

        hasNextPage: page < totalPages,

        hasPreviousPage: page > 1,
      },

      // ===================================================
      // SORT
      // ===================================================

      sort: {
        field: sort,
        direction: dir,
      },

      // ===================================================
      // SEARCH
      // ===================================================

      search,
    });
  } catch (error) {
    console.error("GET MENU ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to load menus.",
      },
      {
        status: 500,
      },
    );
  }
}

// =======================================================
// POST
// =======================================================

export async function POST(request) {
  try {
    const body = await request.json();

    // =====================================================
    // INPUT
    // =====================================================

    const title = typeof body?.title === "string" ? body.title.trim() : "";

    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";

    const path = typeof body?.path === "string" ? body.path.trim() : "";

    const icon = typeof body?.icon === "string" ? body.icon.trim() : "";

    const parentId =
      typeof body?.parentId === "string" ? body.parentId.trim() : "";

    const module = typeof body?.module === "string" ? body.module.trim() : "";

    const permission =
      typeof body?.permission === "string" ? body.permission.trim() : "";

    const menuType =
      typeof body?.menuType === "string" ? body.menuType.trim() : "item";

    const target =
      typeof body?.target === "string" ? body.target.trim() : "_self";

    const status = typeof body?.status === "boolean" ? body.status : true;

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Menu title is required.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // VALID MENU TYPE
    // =====================================================

    const allowedMenuTypes = ["item", "group", "label"];

    if (!allowedMenuTypes.includes(menuType)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid menu type.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // VALID TARGET
    // =====================================================

    const allowedTargets = ["_self", "_blank"];

    if (!allowedTargets.includes(target)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid menu target.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // PARENT CHECK
    // =====================================================

    if (parentId) {
      const parentMenu = await prisma.menu.findUnique({
        where: {
          id: parentId,
        },
      });

      if (!parentMenu) {
        return NextResponse.json(
          {
            success: false,
            message: "Parent menu not found.",
          },
          {
            status: 404,
          },
        );
      }
    }

    // =====================================================
    // DUPLICATE TITLE CHECK
    // =====================================================

    const duplicateMenu = await prisma.menu.findFirst({
      where: {
        title: title,
        parentId: parentId || null,
      },
    });

    if (duplicateMenu) {
      return NextResponse.json(
        {
          success: false,
          message:
            "A menu with this title already exists under the selected parent.",
        },
        {
          status: 409,
        },
      );
    }

    // =====================================================
    // GET NEXT SORT ORDER
    // =====================================================

    const lastMenu = await prisma.menu.findFirst({
      where: {
        parentId: parentId || null,
      },

      orderBy: {
        sortOrder: "desc",
      },
    });

    const sortOrder = lastMenu ? lastMenu.sortOrder + 1 : 0;

    // =====================================================
    // CREATE
    // =====================================================

    const menu = await prisma.menu.create({
      data: {
        title,

        slug: slug || null,

        path: path || null,

        icon: icon || null,

        parentId: parentId || null,

        module: module || null,

        permission: permission || null,

        sortOrder,

        status,

        menuType,

        target,
      },
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json(
      {
        success: true,

        message: "Menu created successfully.",

        data: formatMenu(menu),
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("CREATE MENU ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to create menu.",
      },
      {
        status: 500,
      },
    );
  }
}

// =======================================================
// PUT
// =======================================================
export async function PUT(request) {
  try {
    const body = await request.json();

    // =====================================================
    // INPUT
    // =====================================================

    const id = typeof body?.id === "string" ? body.id.trim() : "";

    const title = typeof body?.title === "string" ? body.title.trim() : "";

    const slug = typeof body?.slug === "string" ? body.slug.trim() : "";

    const path = typeof body?.path === "string" ? body.path.trim() : "";

    const icon = typeof body?.icon === "string" ? body.icon.trim() : "";

    const parentId =
      typeof body?.parentId === "string" ? body.parentId.trim() : "";

    const module = typeof body?.module === "string" ? body.module.trim() : "";

    const permission =
      typeof body?.permission === "string" ? body.permission.trim() : "";

    const menuType =
      typeof body?.menuType === "string" ? body.menuType.trim() : "item";

    const target =
      typeof body?.target === "string" ? body.target.trim() : "_self";

    const status = typeof body?.status === "boolean" ? body.status : true;

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Menu ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Menu title is required.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // FIND MENU
    // =====================================================

    const existingMenu = await prisma.menu.findUnique({
      where: {
        id,
      },
    });

    if (!existingMenu) {
      return NextResponse.json(
        {
          success: false,
          message: "Menu not found.",
        },
        {
          status: 404,
        },
      );
    }

    // =====================================================
    // SELF PARENT CHECK
    // =====================================================

    if (parentId && parentId === id) {
      return NextResponse.json(
        {
          success: false,
          message: "A menu cannot be its own parent.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // PARENT CHECK
    // =====================================================

    if (parentId) {
      const parentMenu = await prisma.menu.findUnique({
        where: {
          id: parentId,
        },
      });

      if (!parentMenu) {
        return NextResponse.json(
          {
            success: false,
            message: "Parent menu not found.",
          },
          {
            status: 404,
          },
        );
      }

      // ===================================================
      // CHECK CIRCULAR HIERARCHY
      // ===================================================

      let currentParentId = parentId;

      const visitedIds = new Set();

      while (currentParentId) {
        if (currentParentId === id) {
          return NextResponse.json(
            {
              success: false,
              message: "A menu cannot be moved inside its own child menu.",
            },
            {
              status: 400,
            },
          );
        }

        if (visitedIds.has(currentParentId)) {
          break;
        }

        visitedIds.add(currentParentId);

        const currentParent = await prisma.menu.findUnique({
          where: {
            id: currentParentId,
          },

          select: {
            parentId: true,
          },
        });

        if (!currentParent) {
          break;
        }

        currentParentId = currentParent.parentId;
      }
    }

    // =====================================================
    // DUPLICATE TITLE CHECK
    // =====================================================

    const duplicateMenu = await prisma.menu.findFirst({
      where: {
        title: title,

        parentId: parentId || null,

        NOT: {
          id,
        },
      },
    });

    if (duplicateMenu) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Another menu with this title already exists under the selected parent.",
        },
        {
          status: 409,
        },
      );
    }

    // =====================================================
    // SORT ORDER
    // =====================================================

    let sortOrder = existingMenu.sortOrder;

    const oldParentId = existingMenu.parentId || null;

    const newParentId = parentId || null;

    // =====================================================
    // PARENT CHANGED
    // =====================================================

    if (oldParentId !== newParentId) {
      const lastMenu = await prisma.menu.findFirst({
        where: {
          parentId: newParentId,

          NOT: {
            id,
          },
        },

        orderBy: {
          sortOrder: "desc",
        },
      });

      sortOrder = lastMenu ? lastMenu.sortOrder + 1 : 0;
    }

    // =====================================================
    // UPDATE CURRENT MENU
    // =====================================================

    const menu = await prisma.menu.update({
      where: {
        id,
      },

      data: {
        title,

        slug: slug || null,

        path: path || null,

        icon: icon || null,

        parentId: newParentId,

        module: module || null,

        permission: permission || null,

        sortOrder,

        status,

        menuType,

        target,
      },
    });

    // =====================================================
    // UPDATE ALL CHILDREN WHEN PARENT IS INACTIVE
    // =====================================================
    //
    // If current menu is changed to false:
    //
    // Leads = false
    //
    // Then all children become false:
    //
    // Statuses = false
    // Sources = false
    // Email Integration = false
    //
    // This also works for nested children.
    //
    // If parent is changed back to true:
    // DO NOT automatically activate children.
    //
    // Children keep their existing status.
    // =====================================================

    if (status === false) {
      async function deactivateChildren(parentMenuId) {
        const children = await prisma.menu.findMany({
          where: {
            parentId: parentMenuId,
          },

          select: {
            id: true,
          },
        });

        for (const child of children) {
          // ---------------------------------------------
          // Deactivate child
          // ---------------------------------------------

          await prisma.menu.update({
            where: {
              id: child.id,
            },

            data: {
              status: false,
            },
          });

          // ---------------------------------------------
          // Recursively deactivate grandchildren
          // ---------------------------------------------

          await deactivateChildren(child.id);
        }
      }

      await deactivateChildren(id);
    }

    // =====================================================
    // GET UPDATED MENU TREE
    // =====================================================

    const updatedMenu = await prisma.menu.findUnique({
      where: {
        id,
      },
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      message:
        status === false
          ? "Menu updated successfully. All child menus have also been deactivated."
          : "Menu updated successfully.",

      data: formatMenu(updatedMenu),
    });
  } catch (error) {
    console.error("UPDATE MENU ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update menu.",
      },
      {
        status: 500,
      },
    );
  }
}

// =======================================================
// PATCH
// =======================================================

export async function PATCH(request) {
  try {
    const body = await request.json();

    const action = typeof body?.action === "string" ? body.action.trim() : "";

    const id = typeof body?.id === "string" ? body.id.trim() : "";

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!action) {
      return NextResponse.json(
        {
          success: false,
          message: "Menu action is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Menu ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // FIND MENU
    // =====================================================

    const menu = await prisma.menu.findUnique({
      where: {
        id,
      },
    });

    if (!menu) {
      return NextResponse.json(
        {
          success: false,
          message: "Menu not found.",
        },
        {
          status: 404,
        },
      );
    }

    // =====================================================
    // STATUS
    // =====================================================

    if (action === "status") {
      const newStatus =
        typeof body?.status === "boolean" ? body.status : !menu.status;

      const updatedMenu = await prisma.menu.update({
        where: {
          id,
        },

        data: {
          status: newStatus,
        },
      });
       // =====================================================
    // UPDATE ALL CHILDREN WHEN PARENT IS INACTIVE
    // =====================================================
    //
    // If current menu is changed to false:
    //
    // Leads = false
    //
    // Then all children become false:
    //
    // Statuses = false
    // Sources = false
    // Email Integration = false
    //
    // This also works for nested children.
    //
    // If parent is changed back to true:
    // DO NOT automatically activate children.
    //
    // Children keep their existing status.
    // =====================================================

      if (newStatus === false) {
        async function deactivateChildren(parentMenuId) {
          const children = await prisma.menu.findMany({
            where: {
              parentId: parentMenuId,
            },

            select: {
              id: true,
            },
          });

          for (const child of children) {
            // ---------------------------------------------
            // Deactivate child
            // ---------------------------------------------

            await prisma.menu.update({
              where: {
                id: child.id,
              },

              data: {
                status: false,
              },
            });

            // ---------------------------------------------
            // Recursively deactivate grandchildren
            // ---------------------------------------------

            await deactivateChildren(child.id);
          }
        }

        await deactivateChildren(id);
      }
      return NextResponse.json({
        success: true,

        message: newStatus
          ? "Menu activated successfully."
          : "Menu deactivated successfully.",

        data: formatMenu(updatedMenu),
      });
    }

    // =====================================================
    // MOVE UP / DOWN
    // =====================================================

    if (action === "move") {
      const direction = body?.direction;

      if (direction !== "up" && direction !== "down") {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid move direction.",
          },
          {
            status: 400,
          },
        );
      }

      const siblings = await prisma.menu.findMany({
        where: {
          parentId: menu.parentId || null,
        },

        orderBy: {
          sortOrder: "asc",
        },
      });

      const currentIndex = siblings.findIndex((item) => item.id === id);

      if (currentIndex === -1) {
        return NextResponse.json(
          {
            success: false,
            message: "Menu position not found.",
          },
          {
            status: 404,
          },
        );
      }

      const targetIndex =
        direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (targetIndex < 0 || targetIndex >= siblings.length) {
        return NextResponse.json({
          success: true,

          message: `Menu is already at the ${direction === "up" ? "top" : "bottom"} position.`,
        });
      }

      const targetMenu = siblings[targetIndex];

      // ===================================================
      // SWAP SORT ORDER
      // ===================================================

      await prisma.$transaction([
        prisma.menu.update({
          where: {
            id: menu.id,
          },

          data: {
            sortOrder: targetMenu.sortOrder,
          },
        }),

        prisma.menu.update({
          where: {
            id: targetMenu.id,
          },

          data: {
            sortOrder: menu.sortOrder,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,

        message: `Menu moved ${direction} successfully.`,
      });
    }

    // =====================================================
    // REORDER
    // =====================================================

    if (action === "reorder") {
      const items = Array.isArray(body?.items) ? body.items : [];

      if (!items.length) {
        return NextResponse.json(
          {
            success: false,
            message: "Reorder items are required.",
          },
          {
            status: 400,
          },
        );
      }

      const operations = items
        .filter((item) => item?.id && Number.isFinite(Number(item.sortOrder)))
        .map((item) =>
          prisma.menu.update({
            where: {
              id: String(item.id),
            },

            data: {
              sortOrder: Number(item.sortOrder),
            },
          }),
        );

      if (!operations.length) {
        return NextResponse.json(
          {
            success: false,
            message: "No valid reorder items found.",
          },
          {
            status: 400,
          },
        );
      }

      await prisma.$transaction(operations);

      return NextResponse.json({
        success: true,

        message: "Menus reordered successfully.",
      });
    }

    // =====================================================
    // INVALID ACTION
    // =====================================================

    return NextResponse.json(
      {
        success: false,
        message: "Invalid menu action.",
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    console.error("PATCH MENU ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to update menu.",
      },
      {
        status: 500,
      },
    );
  }
}

// =======================================================
// DELETE
// =======================================================

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);

    // =====================================================
    // GET ID FROM QUERY
    // =====================================================

    let id = searchParams.get("id");

    // =====================================================
    // ALSO SUPPORT JSON BODY
    // =====================================================

    if (!id) {
      try {
        const body = await request.json();

        if (typeof body?.id === "string") {
          id = body.id.trim();
        }
      } catch {
        // No JSON body.
      }
    }

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          message: "Menu ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    // =====================================================
    // FIND MENU
    // =====================================================

    const existingMenu = await prisma.menu.findUnique({
      where: {
        id: String(id),
      },
    });

    if (!existingMenu) {
      return NextResponse.json(
        {
          success: false,
          message: "Menu not found.",
        },
        {
          status: 404,
        },
      );
    }

    // =====================================================
    // FIND ALL CHILDREN
    // =====================================================

    const collectChildIds = async (parentId) => {
      const children = await prisma.menu.findMany({
        where: {
          parentId,
        },

        select: {
          id: true,
        },
      });

      let ids = children.map((child) => child.id);

      for (const child of children) {
        const childIds = await collectChildIds(child.id);

        ids = [...ids, ...childIds];
      }

      return ids;
    };

    const childIds = await collectChildIds(String(id));

    // =====================================================
    // DELETE
    // =====================================================

    await prisma.$transaction(async (transaction) => {
      if (childIds.length) {
        await transaction.menu.deleteMany({
          where: {
            id: {
              in: childIds,
            },
          },
        });
      }

      await transaction.menu.delete({
        where: {
          id: String(id),
        },
      });
    });

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      success: true,

      message: childIds.length
        ? `Menu and ${childIds.length} child menu${childIds.length === 1 ? "" : "s"} deleted successfully.`
        : "Menu deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE MENU ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to delete menu.",
      },
      {
        status: 500,
      },
    );
  }
}
