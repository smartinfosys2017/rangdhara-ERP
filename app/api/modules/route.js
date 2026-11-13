import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

// =======================================================
// PATHS
// =======================================================

const PROJECT_ROOT = process.cwd();

const MODULES_ROOT = path.join(PROJECT_ROOT, "modules");

const NEXT_APP_ROOT = path.join(PROJECT_ROOT, "app");

// =======================================================
// BUILD STATUS
// =======================================================
//
// Automatic production build and PM2 restart are disabled.
//
// The module system now uses a no-spawn architecture.
//
// After installing, activating, deactivating or uninstalling
// a module, run manually:
//
// npm run build
//
// Then restart the application / PM2 if required.
//
// =======================================================

function getBuildStatus(action) {
  return {
    started: false,

    status: "MANUAL_REQUIRED",

    action,

    message:
      "Automatic production build is disabled because the module system uses the no-spawn architecture. Run npm run build and restart the application manually.",
  };
}

// =======================================================
// SECURITY HELPERS
// =======================================================

function isSafeModuleFolder(folderName) {
  return /^[a-z0-9-]+$/.test(folderName);
}

function moduleFolderFromAlias(alias) {
  return alias.replace(/_/g, "-");
}

// =======================================================
// FIND ALL FILES INSIDE MODULE src/app
// =======================================================

async function findModuleAppFiles(moduleAppRoot) {
  const files = [];

  async function walk(currentDirectory) {
    let entries;

    try {
      entries = await fs.readdir(currentDirectory, {
        withFileTypes: true,
      });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDirectory, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  try {
    await fs.access(moduleAppRoot);
  } catch {
    return files;
  }

  await walk(moduleAppRoot);

  return files;
}

// =======================================================
// REMOVE EMPTY DIRECTORIES
// =======================================================

async function removeEmptyDirectories(startDirectory) {
  let currentDirectory = path.resolve(startDirectory);

  const protectedRoot = path.resolve(path.join(NEXT_APP_ROOT, "(protected)"));

  const apiRoot = path.resolve(path.join(NEXT_APP_ROOT, "api"));

  while (true) {
    const insideProtected = currentDirectory.startsWith(
      `${protectedRoot}${path.sep}`,
    );

    const insideApi = currentDirectory.startsWith(`${apiRoot}${path.sep}`);

    if (!insideProtected && !insideApi) {
      break;
    }

    try {
      const entries = await fs.readdir(currentDirectory);

      if (entries.length > 0) {
        break;
      }

      await fs.rmdir(currentDirectory);

      currentDirectory = path.dirname(currentDirectory);
    } catch {
      break;
    }
  }
}

// =======================================================
// GET BRIDGE PATH
// =======================================================

function getBridgePath(moduleFile) {
  const normalizedModuleFile = moduleFile.split(path.sep).join("/");

  const marker = "/src/app/";

  const markerIndex = normalizedModuleFile.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  const relativeAppPath = normalizedModuleFile.slice(
    markerIndex + marker.length,
  );

  // =====================================================
  // API ROUTES
  // =====================================================

  if (relativeAppPath === "api" || relativeAppPath.startsWith("api/")) {
    return path.join(NEXT_APP_ROOT, relativeAppPath);
  }

  // =====================================================
  // ALREADY PROTECTED
  // =====================================================

  if (
    relativeAppPath === "(protected)" ||
    relativeAppPath.startsWith("(protected)/")
  ) {
    return path.join(NEXT_APP_ROOT, relativeAppPath);
  }

  // =====================================================
  // NORMAL APP ROUTE
  // =====================================================

  return path.join(NEXT_APP_ROOT, "(protected)", relativeAppPath);
}

// =======================================================
// REMOVE GENERATED MODULE BRIDGES
// =======================================================

async function removeModuleBridges(alias) {
  const moduleFolderName = moduleFolderFromAlias(alias);

  if (!isSafeModuleFolder(moduleFolderName)) {
    throw new Error(`Invalid module folder name: ${moduleFolderName}`);
  }

  const moduleAppRoot = path.join(MODULES_ROOT, moduleFolderName, "src", "app");

  const moduleFiles = await findModuleAppFiles(moduleAppRoot);

  const removedBridges = [];

  for (const moduleFile of moduleFiles) {
    const bridgePath = getBridgePath(moduleFile);

    if (!bridgePath) {
      continue;
    }

    const resolvedBridgePath = path.resolve(bridgePath);

    const protectedRoot = path.resolve(path.join(NEXT_APP_ROOT, "(protected)"));

    const apiRoot = path.resolve(path.join(NEXT_APP_ROOT, "api"));

    const isProtectedBridge = resolvedBridgePath.startsWith(
      `${protectedRoot}${path.sep}`,
    );

    const isApiBridge = resolvedBridgePath.startsWith(`${apiRoot}${path.sep}`);

    // ===================================================
    // SECURITY CHECK
    // ===================================================

    if (!isProtectedBridge && !isApiBridge) {
      console.warn("[MODULE BRIDGE REMOVE] Skipped unsafe path:", bridgePath);

      continue;
    }

    // ===================================================
    // CHECK BRIDGE EXISTS
    // ===================================================

    try {
      await fs.access(bridgePath);
    } catch {
      continue;
    }

    // ===================================================
    // READ BRIDGE
    // ===================================================

    let bridgeContent;

    try {
      bridgeContent = await fs.readFile(bridgePath, "utf8");
    } catch {
      continue;
    }

    // ===================================================
    // EXPECTED MODULE IMPORT
    // ===================================================

    let expectedImport = path.relative(path.dirname(bridgePath), moduleFile);

    expectedImport = expectedImport.split(path.sep).join("/");

    if (!expectedImport.startsWith(".")) {
      expectedImport = `./${expectedImport}`;
    }

    // ===================================================
    // SECURITY:
    // ONLY DELETE MODULE GENERATED BRIDGES
    // ===================================================

    if (!bridgeContent.includes(expectedImport)) {
      console.warn(
        "[MODULE BRIDGE REMOVE] Skipped non-module file:",
        bridgePath,
      );

      continue;
    }

    // ===================================================
    // DELETE BRIDGE
    // ===================================================

    try {
      await fs.unlink(bridgePath);
    } catch (error) {
      console.error(
        "[MODULE BRIDGE REMOVE] Failed to delete:",
        bridgePath,
        error,
      );

      continue;
    }

    removedBridges.push(path.relative(PROJECT_ROOT, bridgePath));

    // ===================================================
    // REMOVE EMPTY DIRECTORIES
    // ===================================================

    await removeEmptyDirectories(path.dirname(bridgePath));
  }

  return removedBridges;
}

// =======================================================
// GET
// FETCH INSTALLED MODULES
// =======================================================

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // ===================================================
    // PAGINATION
    // ===================================================

    const requestedPage = parseInt(searchParams.get("page") || "1", 10);

    const requestedLimit = parseInt(searchParams.get("limit") || "10", 10);

    const page = Number.isFinite(requestedPage)
      ? Math.max(requestedPage, 1)
      : 1;

    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 100)
      : 10;

    // ===================================================
    // SEARCH
    // ===================================================

    const query = searchParams.get("query")?.trim() || "";

    // ===================================================
    // STATUS
    // ===================================================

    const requestedStatus =
      searchParams.get("status")?.trim().toUpperCase() || "";

    const allowedStatuses = ["INSTALLED", "ACTIVE", "INACTIVE"];

    const statusFilter = allowedStatuses.includes(requestedStatus)
      ? requestedStatus
      : null;

    // ===================================================
    // SORT
    // ===================================================

    const requestedSort = searchParams.get("sort") || "id";

    const requestedDirection = searchParams.get("dir") || "desc";

    const allowedSortFields = [
      "id",
      "alias",
      "name",
      "author",
      "version",
      "status",
      "urlPath",
      "createdAt",
      "updatedAt",
    ];

    const sortField = allowedSortFields.includes(requestedSort)
      ? requestedSort
      : "id";

    const sortDirection = requestedDirection === "asc" ? "asc" : "desc";

    // ===================================================
    // WHERE
    // ===================================================

    const where = {
      deletedAt: null,

      ...(statusFilter
        ? {
            status: statusFilter,
          }
        : {}),

      ...(query
        ? {
            OR: [
              {
                alias: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                name: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                author: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                version: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                status: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    // ===================================================
    // TOTAL
    // ===================================================

    const total = await prisma.extensionModule.count({
      where,
    });

    // ===================================================
    // PAGINATION OFFSET
    // ===================================================

    const skip = (page - 1) * limit;

    // ===================================================
    // MODULES
    // ===================================================

    const modules = await prisma.extensionModule.findMany({
      where,

      orderBy: {
        [sortField]: sortDirection,
      },

      skip,

      take: limit,
    });

    // ===================================================
    // RESPONSE
    // ===================================================

    return NextResponse.json({
      success: true,

      modules,

      data: modules,

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[MODULE GET ERROR]", error);

    return NextResponse.json(
      {
        success: false,

        message: error?.message || "Failed to fetch modules.",

        error:
          process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      {
        status: 500,
      },
    );
  }
}

// =======================================================
// PATCH
// ACTIVATE / DEACTIVATE / INSTALL
// =======================================================

export async function PATCH(request) {
  try {
    const body = await request.json();

    const { id, action } = body;

    // ===================================================
    // VALIDATE ID
    // ===================================================

    if (!id || typeof id !== "string" || !id.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Module ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const moduleId = id.trim();

    // ===================================================
    // VALIDATE ACTION
    // ===================================================

    const allowedActions = ["install", "activate", "deactivate"];

    if (!allowedActions.includes(action)) {
      return NextResponse.json(
        {
          success: false,

          message: 'Invalid action. Use "install", "activate" or "deactivate".',
        },
        {
          status: 400,
        },
      );
    }

    // ===================================================
    // FIND MODULE
    // ===================================================

    const existingModule = await prisma.extensionModule.findFirst({
      where: {
        id: moduleId,
        deletedAt: null,
      },
    });

    if (!existingModule) {
      return NextResponse.json(
        {
          success: false,

          message: "Module not found or already uninstalled.",
        },
        {
          status: 404,
        },
      );
    }

    // ===================================================
    // TARGET STATUS
    // ===================================================

    let targetStatus;

    switch (action) {
      case "install":
        targetStatus = "INSTALLED";
        break;

      case "activate":
        targetStatus = "ACTIVE";
        break;

      case "deactivate":
        targetStatus = "INACTIVE";
        break;

      default:
        targetStatus = existingModule.status;
    }

    // ===================================================
    // UPDATE MODULE STATUS
    // ===================================================

    const updatedModule = await prisma.extensionModule.update({
      where: {
        id: moduleId,
      },

      data: {
        status: targetStatus,

        deletedAt: null,
      },
    });

    // ===================================================
    // BUILD
    // ===================================================
    //
    // Automatic npm / PM2 execution is intentionally
    // disabled.
    //
    // This prevents:
    //
    // spawn EINVAL
    //
    // and keeps the module API completely no-spawn.
    //
    // ===================================================

    const build = getBuildStatus(action);

    if (action === "activate") {
      console.log(`[MODULE ACTIVATE] ${existingModule.alias} is now ACTIVE.`);

      console.log("[MODULE ACTIVATE] Automatic production build is disabled.");
    }

    // ===================================================
    // MESSAGE
    // ===================================================

    let message;

    switch (action) {
      case "install":
        message =
          "Module installed successfully. Run npm run build manually if required.";
        break;

      case "activate":
        message =
          "Module activated successfully. Automatic production build is disabled. Run npm run build manually.";
        break;

      case "deactivate":
        message =
          "Module deactivated successfully. Run npm run build manually if required.";
        break;

      default:
        message = "Module status updated successfully.";
    }

    // ===================================================
    // RESPONSE
    // ===================================================

    return NextResponse.json({
      success: true,

      message,

      module: updatedModule,

      build,
    });
  } catch (error) {
    console.error("[MODULE STATUS UPDATE ERROR]", error);

    return NextResponse.json(
      {
        success: false,

        message: error?.message || "Failed to update module status.",
      },
      {
        status: 500,
      },
    );
  }
}

// =======================================================
// POST
// UNINSTALL MODULE
// =======================================================

export async function POST(request) {
  try {
    const body = await request.json();

    const { id, action } = body;

    // ===================================================
    // VALIDATE ACTION
    // ===================================================

    if (action !== "uninstall") {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid action. Expected "uninstall".',
        },
        {
          status: 400,
        },
      );
    }

    // ===================================================
    // VALIDATE ID
    // ===================================================

    if (!id || typeof id !== "string" || !id.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Module ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const moduleId = id.trim();

    // ===================================================
    // FIND MODULE
    // ===================================================

    const existingModule = await prisma.extensionModule.findFirst({
      where: {
        id: moduleId,
        deletedAt: null,
      },
    });

    if (!existingModule) {
      return NextResponse.json(
        {
          success: false,
          message: "Module not found or already uninstalled.",
        },
        {
          status: 404,
        },
      );
    }

    // ===================================================
    // VALIDATE ALIAS
    // ===================================================

    if (!existingModule.alias || typeof existingModule.alias !== "string") {
      return NextResponse.json(
        {
          success: false,

          message: "Module alias is missing. Cannot uninstall module safely.",
        },
        {
          status: 400,
        },
      );
    }

    // ===================================================
    // GET MODULE FOLDER
    // ===================================================

    const moduleFolderName = moduleFolderFromAlias(existingModule.alias);

    // ===================================================
    // SECURITY CHECK
    // ===================================================

    if (!isSafeModuleFolder(moduleFolderName)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid module folder name.",
        },
        {
          status: 400,
        },
      );
    }

    // ===================================================
    // MODULE DIRECTORY
    // ===================================================

    const moduleDirectory = path.join(MODULES_ROOT, moduleFolderName);

    // ===================================================
    // SECURITY CHECK
    // ===================================================

    const resolvedModulesRoot = path.resolve(MODULES_ROOT);

    const resolvedModuleDirectory = path.resolve(moduleDirectory);

    if (
      !resolvedModuleDirectory.startsWith(`${resolvedModulesRoot}${path.sep}`)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unsafe module directory.",
        },
        {
          status: 400,
        },
      );
    }

    // ===================================================
    // REMOVE GENERATED NEXT.JS BRIDGES
    // ===================================================

    let removedBridges = [];

    try {
      removedBridges = await removeModuleBridges(existingModule.alias);
    } catch (bridgeError) {
      console.error("[MODULE BRIDGE REMOVE ERROR]", bridgeError);

      return NextResponse.json(
        {
          success: false,

          message:
            bridgeError?.message || "Unable to remove module route bridges.",
        },
        {
          status: 500,
        },
      );
    }

    // ===================================================
    // REMOVE COMPLETE MODULE DIRECTORY
    // ===================================================

    let moduleDirectoryRemoved = false;

    try {
      await fs.rm(moduleDirectory, {
        recursive: true,
        force: true,
      });

      moduleDirectoryRemoved = true;
    } catch (moduleRemoveError) {
      console.error("[MODULE DIRECTORY REMOVE ERROR]", moduleRemoveError);

      return NextResponse.json(
        {
          success: false,

          message:
            moduleRemoveError?.message ||
            "Module bridges were removed, but the module directory could not be deleted.",

          bridgesRemoved: removedBridges.length,

          removedBridges,
        },
        {
          status: 500,
        },
      );
    }

    // ===================================================
    // REMOVE MODULE FROM SIDEBAR
    // ===================================================

    let removedMenuCount = 0;

    try {
      const menuUpdateResult = await prisma.menu.updateMany({
        where: {
          module: existingModule.alias,
        },

        data: {
          status: false,
        },
      });

      removedMenuCount = menuUpdateResult.count;

      console.log("[MODULE MENU REMOVE]", {
        alias: existingModule.alias,

        menusUpdated: removedMenuCount,
      });
    } catch (menuError) {
      console.error("[MODULE MENU REMOVE ERROR]", menuError);

      return NextResponse.json(
        {
          success: false,

          message:
            menuError?.message ||
            "Module sidebar menu could not be deactivated.",
        },
        {
          status: 500,
        },
      );
    }

    // ===================================================
    // SOFT DELETE DATABASE RECORD
    // ===================================================

    const uninstalledModule = await prisma.extensionModule.update({
      where: {
        id: moduleId,
      },

      data: {
        status: "INACTIVE",

        deletedAt: new Date(),
      },
    });

    // ===================================================
    // BUILD STATUS
    // ===================================================
    //
    // Automatic build is disabled.
    //
    // Route bridges have been removed from the filesystem,
    // but Next.js production build must be performed
    // manually.
    //
    // ===================================================

    const build = getBuildStatus("uninstall");

    console.log(`[MODULE UNINSTALL] ${existingModule.alias} was uninstalled.`);

    console.log("[MODULE UNINSTALL] Automatic production build is disabled.");

    // ===================================================
    // RESPONSE
    // ===================================================

    return NextResponse.json({
      success: true,

      message:
        "Module uninstalled and completely removed successfully. Run npm run build manually to apply the route changes to the production build.",

      module: uninstalledModule,

      moduleDirectoryRemoved,

      moduleDirectory: path.relative(PROJECT_ROOT, moduleDirectory),

      bridgesRemoved: removedBridges.length,

      removedBridges,

      menusRemoved: removedMenuCount,

      build,
    });
  } catch (error) {
    console.error("[MODULE UNINSTALL ERROR]", error);

    return NextResponse.json(
      {
        success: false,

        message: error?.message || "Failed to uninstall module.",
      },
      {
        status: 500,
      },
    );
  }
}
