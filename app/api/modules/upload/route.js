import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import {
  mkdir,
  writeFile,
  rm,
  readdir,
  readFile,
  access,
  cp,
} from "fs/promises";

import path from "path";

const AdmZip = require("adm-zip");

export const runtime = "nodejs";

// =======================================================
// CONSTANTS
// =======================================================

const PROJECT_ROOT = process.cwd();

const MODULES_ROOT = path.join(PROJECT_ROOT, "modules");

const APP_ROOT = path.join(PROJECT_ROOT, "app");

const PROTECTED_APP_ROOT = path.join(PROJECT_ROOT, "app", "(protected)");

const API_APP_ROOT = path.join(PROJECT_ROOT, "app", "api");

const TEMP_ROOT = path.join(PROJECT_ROOT, "tmp", "module_uploads");

const MAX_FILE_SIZE = 50 * 1024 * 1024;

// =======================================================
// MODULE ALIAS VALIDATION
// =======================================================

function isValidAlias(alias) {
  return (
    typeof alias === "string" &&
    /^[a-z0-9_]+$/.test(alias) &&
    alias.length >= 2 &&
    alias.length <= 100
  );
}

// =======================================================
// MODULE VERSION VALIDATION
// =======================================================
//
// Supported format:
//
// 1.0.0
// 1.2.5
// 10.25.100
//
// =======================================================

function isValidVersion(version) {
  return typeof version === "string" && /^\d+\.\d+\.\d+$/.test(version.trim());
}

// =======================================================
// VERSION COMPARISON
// =======================================================
//
// Returns:
//
//  1 = versionA is newer
//  0 = versions are equal
// -1 = versionA is older
//
// Example:
//
// compareVersions("1.0.1", "1.0.0") => 1
// compareVersions("1.0.0", "1.0.0") => 0
// compareVersions("1.0.0", "1.0.1") => -1
//
// =======================================================

function compareVersions(versionA, versionB) {
  const normalize = (version) => {
    return String(version || "")
      .trim()
      .replace(/^v/i, "")
      .split(".")
      .map((part) => {
        const number = parseInt(part, 10);

        return Number.isFinite(number) ? number : 0;
      });
  };

  const a = normalize(versionA);
  const b = normalize(versionB);

  const length = Math.max(a.length, b.length);

  for (let i = 0; i < length; i++) {
    const partA = a[i] || 0;
    const partB = b[i] || 0;

    if (partA > partB) {
      return 1;
    }

    if (partA < partB) {
      return -1;
    }
  }

  return 0;
}

// =======================================================
// MODULE FOLDER
// =======================================================

function getModuleFolderName(alias) {
  return String(alias).trim().toLowerCase().replace(/_/g, "-");
}

// =======================================================
// PATH EXISTS
// =======================================================

async function pathExists(targetPath) {
  try {
    await access(targetPath);

    return true;
  } catch {
    return false;
  }
}

// =======================================================
// WINDOWS SAFE REMOVE
// =======================================================

async function removeDirectory(targetPath, options = {}) {
  if (!(await pathExists(targetPath))) {
    return;
  }

  const retries = options.retries ?? 8;

  const retryDelay = options.retryDelay ?? 500;

  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await rm(targetPath, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 200,
      });

      if (!(await pathExists(targetPath))) {
        return;
      }
    } catch (error) {
      lastError = error;

      const retryable =
        error?.code === "EPERM" ||
        error?.code === "EBUSY" ||
        error?.code === "ENOTEMPTY" ||
        error?.code === "EACCES";

      if (!retryable) {
        throw error;
      }
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(
    `Unable to remove directory "${targetPath}". Windows may have a file or folder locked. ${
      lastError?.message || ""
    }`,
  );
}

// =======================================================
// WINDOWS SAFE COPY
// =======================================================

async function copyDirectory(sourcePath, destinationPath, options = {}) {
  const retries = options.retries ?? 8;

  const retryDelay = options.retryDelay ?? 500;

  let lastError = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await cp(sourcePath, destinationPath, {
        recursive: true,
        force: true,
        errorOnExist: false,
        preserveTimestamps: false,
      });

      return;
    } catch (error) {
      lastError = error;

      const retryable =
        error?.code === "EPERM" ||
        error?.code === "EBUSY" ||
        error?.code === "ENOTEMPTY" ||
        error?.code === "EACCES";

      if (!retryable) {
        throw error;
      }
    }

    if (attempt < retries) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw new Error(
    `Unable to copy directory "${sourcePath}" to "${destinationPath}". ${
      lastError?.message || ""
    }`,
  );
}

// =======================================================
// FIND MODULE MANIFEST
// =======================================================

async function findManifest(extractPath) {
  const rootEntries = await readdir(extractPath, {
    withFileTypes: true,
  });

  // ---------------------------------------------------
  // module.json directly in ZIP root
  // ---------------------------------------------------

  const rootManifest = rootEntries.find(
    (entry) => entry.isFile() && entry.name === "module.json",
  );

  if (rootManifest) {
    return {
      manifestPath: path.join(extractPath, "module.json"),

      moduleRoot: extractPath,
    };
  }

  // ---------------------------------------------------
  // module.json inside one root directory
  // ---------------------------------------------------

  for (const entry of rootEntries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const moduleRoot = path.join(extractPath, entry.name);

    const manifestPath = path.join(moduleRoot, "module.json");

    if (await pathExists(manifestPath)) {
      return {
        manifestPath,

        moduleRoot,
      };
    }
  }

  return null;
}

// =======================================================
// ZIP PATH SECURITY
// =======================================================

function validateZipEntry(entryPath) {
  if (!entryPath || typeof entryPath !== "string") {
    throw new Error("Invalid ZIP entry.");
  }

  const normalized = entryPath.replace(/\\/g, "/");

  if (normalized.includes("\0")) {
    throw new Error(`Invalid ZIP entry detected: ${entryPath}`);
  }

  if (normalized.startsWith("/")) {
    throw new Error(`Unsafe ZIP entry detected: ${entryPath}`);
  }

  if (/^[a-zA-Z]:\//.test(normalized)) {
    throw new Error(`Unsafe ZIP entry detected: ${entryPath}`);
  }

  const parts = normalized.split("/");

  if (parts.includes("..")) {
    throw new Error(`Unsafe ZIP entry detected: ${entryPath}`);
  }

  return normalized;
}

// =======================================================
// SAFE PATH INSIDE ROOT
// =======================================================

function assertInsideRoot(targetPath, rootPath, message) {
  const resolvedTarget = path.resolve(targetPath);

  const resolvedRoot = path.resolve(rootPath);

  if (
    resolvedTarget !== resolvedRoot &&
    !resolvedTarget.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    throw new Error(message);
  }
}

// =======================================================
// WINDOWS PATH -> IMPORT PATH
// =======================================================

function toImportPath(filePath) {
  return filePath.split(path.sep).join("/");
}

// =======================================================
// NEXT.JS FILE TYPE
// =======================================================

function getNextFileType(fileName) {
  if (/^page\.(js|jsx|ts|tsx)$/.test(fileName)) {
    return "page";
  }

  if (/^route\.(js|jsx|ts|tsx)$/.test(fileName)) {
    return "route";
  }

  if (
    /^(layout|loading|error|not-found|template|default|forbidden|unauthorized)\.(js|jsx|ts|tsx)$/.test(
      fileName,
    )
  ) {
    return "app";
  }

  return null;
}

// =======================================================
// FIND NEXT.JS APP FILES
// =======================================================

async function findNextRoutes(moduleAppPath, currentRelativePath = "") {
  if (!(await pathExists(moduleAppPath))) {
    return [];
  }

  const currentPath = currentRelativePath
    ? path.join(moduleAppPath, currentRelativePath)
    : moduleAppPath;

  const entries = await readdir(currentPath, {
    withFileTypes: true,
  });

  const routes = [];

  for (const entry of entries) {
    const relativePath = path.join(currentRelativePath, entry.name);

    const fullPath = path.join(moduleAppPath, relativePath);

    if (entry.isDirectory()) {
      const nested = await findNextRoutes(moduleAppPath, relativePath);

      routes.push(...nested);

      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const type = getNextFileType(entry.name);

    if (!type) {
      continue;
    }

    routes.push({
      type,

      fileName: entry.name,

      relativePath,

      fullPath,
    });
  }

  return routes;
}

// =======================================================
// GET BRIDGE FILE PATH
// =======================================================

function getBridgeFilePath(relativePath) {
  const normalized = relativePath.split(path.sep).join("/");

  // ---------------------------------------------------
  // API ROUTES
  // ---------------------------------------------------

  if (normalized === "api" || normalized.startsWith("api/")) {
    const apiRelativePath = normalized.substring(4);

    return path.join(API_APP_ROOT, apiRelativePath);
  }

  // ---------------------------------------------------
  // ALREADY PROTECTED
  // ---------------------------------------------------

  if (normalized === "(protected)" || normalized.startsWith("(protected)/")) {
    const protectedRelativePath =
      normalized === "(protected)"
        ? ""
        : normalized.substring("(protected)/".length);

    return path.join(PROTECTED_APP_ROOT, protectedRelativePath);
  }

  // ---------------------------------------------------
  // NORMAL APP ROUTE
  // ---------------------------------------------------

  return path.join(PROTECTED_APP_ROOT, normalized);
}

// =======================================================
// GET BRIDGE ROOT
// =======================================================

function getBridgeRoot(bridgeFile) {
  const normalized = path.resolve(bridgeFile);

  const protectedRoot = path.resolve(PROTECTED_APP_ROOT);

  const apiRoot = path.resolve(API_APP_ROOT);

  if (
    normalized === apiRoot ||
    normalized.startsWith(`${apiRoot}${path.sep}`)
  ) {
    return API_APP_ROOT;
  }

  if (
    normalized === protectedRoot ||
    normalized.startsWith(`${protectedRoot}${path.sep}`)
  ) {
    return PROTECTED_APP_ROOT;
  }

  return APP_ROOT;
}

// =======================================================
// GENERATE BRIDGE CONTENT
// =======================================================

function createBridgeContent(type, importPath) {
  if (type === "route") {
    return `export * from "${importPath}";\n`;
  }

  return (
    `export { default } from "${importPath}";\n` +
    `export * from "${importPath}";\n`
  );
}

// =======================================================
// WRITE FILE ONLY IF CHANGED
// =======================================================

async function writeFileIfChanged(filePath, content) {
  let existingContent = null;

  try {
    existingContent = await readFile(filePath, "utf8");
  } catch {
    // File does not exist.
  }

  if (existingContent === content) {
    return false;
  }

  await mkdir(path.dirname(filePath), {
    recursive: true,
  });

  await writeFile(filePath, content, "utf8");

  return true;
}

// =======================================================
// GENERATE SINGLE BRIDGE
// =======================================================

async function generateRouteBridge({
  moduleRoot,
  sourceFile,
  bridgeFile,
  type,
}) {
  assertInsideRoot(
    sourceFile,
    moduleRoot,
    "Module route source escaped module directory.",
  );

  const bridgeRoot = getBridgeRoot(bridgeFile);

  assertInsideRoot(bridgeFile, bridgeRoot, "Invalid Next.js bridge path.");

  let importPath = path.relative(path.dirname(bridgeFile), sourceFile);

  importPath = toImportPath(importPath);

  if (!importPath.startsWith(".")) {
    importPath = `./${importPath}`;
  }

  const bridgeCode = createBridgeContent(type, importPath);

  const changed = await writeFileIfChanged(bridgeFile, bridgeCode);

  return {
    source: sourceFile,

    bridge: bridgeFile,

    type,

    changed,
  };
}

// =======================================================
// GENERATE MODULE ROUTE BRIDGES
// =======================================================

async function generateModuleBridges({ moduleRoot }) {
  const moduleAppPath = path.join(moduleRoot, "src", "app");

  if (!(await pathExists(moduleAppPath))) {
    return [];
  }

  const routes = await findNextRoutes(moduleAppPath);

  if (!routes.length) {
    return [];
  }

  const generatedBridges = [];

  for (const route of routes) {
    const bridgeFile = getBridgeFilePath(route.relativePath);

    const result = await generateRouteBridge({
      moduleRoot,

      sourceFile: route.fullPath,

      bridgeFile,

      type: route.type,
    });

    generatedBridges.push({
      type: route.type,

      source: path.relative(PROJECT_ROOT, result.source),

      bridge: path.relative(PROJECT_ROOT, result.bridge),

      changed: result.changed,
    });
  }

  return generatedBridges;
}

// =======================================================
// REMOVE EMPTY DIRECTORIES
// =======================================================

async function removeEmptyParentDirectories(directory) {
  const root = getBridgeRoot(path.join(directory, "dummy"));

  let current = path.resolve(directory);

  const resolvedRoot = path.resolve(root);

  while (
    current !== resolvedRoot &&
    current.startsWith(`${resolvedRoot}${path.sep}`)
  ) {
    try {
      const entries = await readdir(current);

      if (entries.length > 0) {
        break;
      }

      await rm(current, {
        recursive: false,
        force: true,
      });

      current = path.dirname(current);
    } catch {
      break;
    }
  }
}

// =======================================================
// REMOVE MODULE ROUTE BRIDGES
// =======================================================

async function removeModuleBridges({ moduleRoot }) {
  const moduleAppPath = path.join(moduleRoot, "src", "app");

  if (!(await pathExists(moduleAppPath))) {
    return [];
  }

  const routes = await findNextRoutes(moduleAppPath);

  const removed = [];

  for (const route of routes) {
    const bridgeFile = getBridgeFilePath(route.relativePath);

    if (!(await pathExists(bridgeFile))) {
      continue;
    }

    let content;

    try {
      content = await readFile(bridgeFile, "utf8");
    } catch {
      continue;
    }

    let expectedImport = path.relative(
      path.dirname(bridgeFile),
      route.fullPath,
    );

    expectedImport = toImportPath(expectedImport);

    if (!expectedImport.startsWith(".")) {
      expectedImport = `./${expectedImport}`;
    }

    const expectedImportStatement = `"${expectedImport}"`;

    if (!content.includes(expectedImportStatement)) {
      continue;
    }

    await rm(bridgeFile, {
      force: true,
    });

    removed.push(path.relative(PROJECT_ROOT, bridgeFile));

    await removeEmptyParentDirectories(path.dirname(bridgeFile));
  }

  return removed;
}

// =======================================================
// REMOVE OLD MODULE BRIDGES
// =======================================================

async function removeModuleBridgesByAlias(alias) {
  const moduleFolderName = getModuleFolderName(alias);

  const moduleRoot = path.join(MODULES_ROOT, moduleFolderName);

  if (!(await pathExists(moduleRoot))) {
    return [];
  }

  return removeModuleBridges({
    moduleRoot,
  });
}

// =======================================================
// VERIFY MODULE SOURCE
// =======================================================

async function verifyModuleSource(moduleRoot, alias = null) {
  const srcPath = path.join(moduleRoot, "src");

  if (!(await pathExists(srcPath))) {
    throw new Error("Module installation failed: src directory is missing.");
  }

  // ---------------------------------------------------
  // MODULE ENTRY
  // ---------------------------------------------------

  const moduleEntryPath = path.join(srcPath, "module.js");

  if (!(await pathExists(moduleEntryPath))) {
    throw new Error("Module installation failed: src/module.js is missing.");
  }

  // ---------------------------------------------------
  // CUSTOMER EXPORT
  // ---------------------------------------------------

  if (alias === "customer_export") {
    const requiredFiles = [
      path.join(srcPath, "lib", "customer-export", "CustomerCSVExport.js"),

      path.join(srcPath, "lib", "customer-export", "CustomerCSVImport.js"),

      path.join(srcPath, "lib", "customer-export", "customerFields.js"),
    ];

    const missingFiles = [];

    for (const filePath of requiredFiles) {
      if (!(await pathExists(filePath))) {
        missingFiles.push(path.relative(moduleRoot, filePath));
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(
        `Customer Export module is incomplete. Missing: ${missingFiles.join(
          ", ",
        )}`,
      );
    }
  }

  // ---------------------------------------------------
  // DATABASE BACKUP
  // ---------------------------------------------------

  if (alias === "database_backup") {
    const requiredFiles = [
      path.join(srcPath, "module.js"),

      path.join(srcPath, "lib", "database-backup.js"),

      path.join(srcPath, "app", "database-backup", "page.jsx"),

      path.join(srcPath, "app", "api", "database-backup", "route.js"),

      path.join(srcPath, "app", "api", "database-backup", "delete", "route.js"),

      path.join(
        srcPath,
        "app",
        "api",
        "database-backup",
        "download",
        "route.js",
      ),

      path.join(
        srcPath,
        "app",
        "api",
        "database-backup",
        "download-history",
        "route.js",
      ),

      path.join(
        srcPath,
        "app",
        "api",
        "database-backup",
        "restore",
        "route.js",
      ),
    ];

    const missingFiles = [];

    for (const filePath of requiredFiles) {
      if (!(await pathExists(filePath))) {
        missingFiles.push(path.relative(moduleRoot, filePath));
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(
        `Database Backup module is incomplete. Missing: ${missingFiles.join(
          ", ",
        )}`,
      );
    }
  }

  return {
    srcPath,
  };
}

// =======================================================
// DATABASE BACKUP SCHEMA VALIDATION
// =======================================================

async function validateModuleSchema(moduleRoot, alias) {
  const schemaPath = path.join(moduleRoot, "src", "schema.prisma");

  // ---------------------------------------------------
  // DATABASE BACKUP
  // ---------------------------------------------------

  if (alias === "database_backup") {
    if (!(await pathExists(schemaPath))) {
      return {
        exists: false,

        skipped: true,

        reason:
          "Database Backup does not require src/schema.prisma. It uses the existing Prisma client and runtime PostgreSQL tables.",
      };
    }

    const schema = await readFile(schemaPath, "utf8");

    if (!schema.trim()) {
      throw new Error("Database Backup src/schema.prisma exists but is empty.");
    }

    return {
      exists: true,

      skipped: true,

      reason: "Database Backup schema.prisma is optional and was not executed.",

      schemaPath: path.relative(PROJECT_ROOT, schemaPath),
    };
  }

  // ---------------------------------------------------
  // OTHER MODULES
  // ---------------------------------------------------

  if (!(await pathExists(schemaPath))) {
    return {
      exists: false,

      skipped: true,

      reason: "No src/schema.prisma found.",
    };
  }

  const schema = await readFile(schemaPath, "utf8");

  if (!schema.trim()) {
    throw new Error("Module schema.prisma exists but is empty.");
  }

  return {
    exists: true,

    skipped: true,

    reason:
      "Module Prisma schema detected. Prisma CLI synchronization is disabled in the no-spawn module installer.",

    schemaPath: path.relative(PROJECT_ROOT, schemaPath),
  };
}

// =======================================================
// CREATE / UPDATE MODULE MENU
// =======================================================

async function syncModuleMenu(manifest) {
  const menuConfig = manifest?.menu;

  if (!menuConfig) {
    return null;
  }

  const title =
    typeof menuConfig.label === "string" ? menuConfig.label.trim() : "";

  const pathValue =
    typeof menuConfig.href === "string" ? menuConfig.href.trim() : "";

  const icon =
    typeof menuConfig.icon === "string" ? menuConfig.icon.trim() : "";

  if (!title || !pathValue) {
    console.warn(
      "[MODULE MENU] Invalid menu configuration. Menu was not created.",
    );

    return null;
  }

  const slug =
    pathValue.replace(/^\/+/, "").replace(/\/+$/, "").split("/").pop() ||
    manifest.alias;

  const permissions = Array.isArray(manifest.permissions)
    ? manifest.permissions.filter(
        (permission) => typeof permission === "string" && permission.trim(),
      )
    : [];

  const permission = permissions.length > 0 ? permissions[0].trim() : null;

  const menuStatus =
    menuConfig.active !== undefined
      ? menuConfig.active !== false
      : manifest.active !== false;

  const existingMenu = await prisma.menu.findFirst({
    where: {
      module: manifest.alias,
    },

    orderBy: {
      sortOrder: "asc",
    },
  });

  if (existingMenu) {
    const menu = await prisma.menu.update({
      where: {
        id: existingMenu.id,
      },

      data: {
        title,

        slug: slug || null,

        path: pathValue || null,

        icon: icon || null,

        module: manifest.alias,

        permission,

        status: menuStatus,

        menuType: "item",

        target: "_self",
      },
    });

    return {
      action: "updated",

      menu,
    };
  }

  const lastMenu = await prisma.menu.findFirst({
    where: {
      parentId: null,
    },

    orderBy: {
      sortOrder: "desc",
    },

    select: {
      sortOrder: true,
    },
  });

  const sortOrder = lastMenu ? lastMenu.sortOrder + 1 : 0;

  const menu = await prisma.menu.create({
    data: {
      title,

      slug: slug || null,

      path: pathValue || null,

      icon: icon || null,

      parentId: null,

      module: manifest.alias,

      permission,

      sortOrder,

      status: menuStatus,

      menuType: "item",

      target: "_self",
    },
  });

  return {
    action: "created",

    menu,
  };
}

// =======================================================
// INSTALL MODULE FILES
// =======================================================

async function installModuleFiles(sourcePath, destinationPath) {
  assertInsideRoot(
    destinationPath,
    MODULES_ROOT,
    "Invalid module destination path.",
  );

  if (path.resolve(destinationPath) === path.resolve(MODULES_ROOT)) {
    throw new Error("A module cannot replace the modules root directory.");
  }

  // ---------------------------------------------------
  // REMOVE OLD DESTINATION
  // ---------------------------------------------------

  if (await pathExists(destinationPath)) {
    await removeDirectory(destinationPath, {
      retries: 10,
      retryDelay: 700,
    });
  }

  // ---------------------------------------------------
  // CREATE PARENT
  // ---------------------------------------------------

  await mkdir(path.dirname(destinationPath), {
    recursive: true,
  });

  // ---------------------------------------------------
  // COPY MODULE
  // ---------------------------------------------------

  await copyDirectory(sourcePath, destinationPath, {
    retries: 10,
    retryDelay: 700,
  });

  // ---------------------------------------------------
  // VERIFY
  // ---------------------------------------------------

  if (!(await pathExists(destinationPath))) {
    throw new Error(
      `Module copy failed. Destination does not exist: ${destinationPath}`,
    );
  }
}

// =======================================================
// POST
// INSTALL / UPDATE MODULE
// =======================================================

export async function POST(request) {
  let zipPath = null;

  let extractPath = null;

  let backupPath = null;

  let temporaryModulePath = null;

  let finalModulePath = null;

  let oldModuleBackupAvailable = false;

  let newModuleInstalled = false;

  let removedOldBridges = [];

  let generatedBridges = [];

  let existingModule = null;

  let moduleRecord = null;

  let moduleWasCreated = false;

  let previousVersion = null;

  let currentVersion = null;

  let isUpdate = false;

  let versionComparison = null;

  try {
    // ===================================================
    // FORM DATA
    // ===================================================

    const formData = await request.formData();

    // ---------------------------------------------------
    // SUPPORT BOTH FIELD NAMES
    // ---------------------------------------------------

    const file = formData.get("moduleZip") || formData.get("file");

    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        {
          success: false,

          type: "invalid_upload",

          message:
            "No archive ZIP package provided. Use form-data field 'moduleZip' or 'file'.",
        },
        {
          status: 400,
        },
      );
    }

    // ===================================================
    // VALIDATE ZIP
    // ===================================================

    if (!file.name || !file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json(
        {
          success: false,

          type: "invalid_file",

          message: "Only ZIP files are allowed.",
        },
        {
          status: 400,
        },
      );
    }

    // ===================================================
    // FILE SIZE
    // ===================================================

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,

          type: "file_too_large",

          message: "Module ZIP file cannot exceed 50 MB.",
        },
        {
          status: 400,
        },
      );
    }

    // ===================================================
    // DIRECTORIES
    // ===================================================

    await mkdir(TEMP_ROOT, {
      recursive: true,
    });

    await mkdir(MODULES_ROOT, {
      recursive: true,
    });

    // ===================================================
    // UPLOAD ID
    // ===================================================

    const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // ===================================================
    // SAVE ZIP
    // ===================================================

    zipPath = path.join(TEMP_ROOT, `module-${uploadId}.zip`);

    const buffer = Buffer.from(await file.arrayBuffer());

    await writeFile(zipPath, buffer);

    // ===================================================
    // EXTRACTION DIRECTORY
    // ===================================================

    extractPath = path.join(TEMP_ROOT, `.install-${uploadId}`);

    await mkdir(extractPath, {
      recursive: true,
    });

    // ===================================================
    // OPEN ZIP
    // ===================================================

    const zip = new AdmZip(zipPath);

    const zipEntries = zip.getEntries();

    for (const entry of zipEntries) {
      validateZipEntry(entry.entryName);
    }

    // ===================================================
    // EXTRACT ZIP
    // ===================================================

    for (const entry of zipEntries) {
      const entryPath = validateZipEntry(entry.entryName);

      const destinationPath = path.resolve(extractPath, entryPath);

      assertInsideRoot(
        destinationPath,
        extractPath,
        "Unsafe ZIP extraction path.",
      );

      if (entry.isDirectory) {
        await mkdir(destinationPath, {
          recursive: true,
        });

        continue;
      }

      await mkdir(path.dirname(destinationPath), {
        recursive: true,
      });

      await writeFile(destinationPath, entry.getData());
    }

    // ===================================================
    // FIND MANIFEST
    // ===================================================

    const manifestInfo = await findManifest(extractPath);

    if (!manifestInfo) {
      throw new Error("Invalid module package. module.json was not found.");
    }

    // ===================================================
    // READ MANIFEST
    // ===================================================

    let manifestRaw = await readFile(manifestInfo.manifestPath, "utf8");

    manifestRaw = manifestRaw.replace(/^\uFEFF/, "");

    let manifest;

    try {
      manifest = JSON.parse(manifestRaw);
    } catch {
      throw new Error("Invalid module.json. The JSON format is incorrect.");
    }

    // ===================================================
    // VALIDATE MANIFEST
    // ===================================================

    if (!manifest.alias) {
      throw new Error("module.json is missing the required 'alias' field.");
    }

    if (!isValidAlias(manifest.alias)) {
      throw new Error(
        "Invalid module alias. Use only lowercase letters, numbers and underscores.",
      );
    }

    if (!manifest.name) {
      throw new Error("module.json is missing the required 'name' field.");
    }

    if (!manifest.version) {
      throw new Error("module.json is missing the required 'version' field.");
    }

    if (!isValidVersion(manifest.version)) {
      throw new Error(
        "Invalid module version. Version must use format X.Y.Z, for example 1.0.1.",
      );
    }

    // ===================================================
    // MODULE SOURCE
    // ===================================================

    const moduleSrcPath = path.join(manifestInfo.moduleRoot, "src");

    if (!(await pathExists(moduleSrcPath))) {
      throw new Error(
        "Invalid module package. The module must contain a src folder.",
      );
    }

    // ===================================================
    // DATABASE LOOKUP
    // ===================================================

    existingModule = await prisma.extensionModule.findUnique({
      where: {
        alias: manifest.alias,
      },
    });

    isUpdate = !!existingModule;

    // ===================================================
    // VERSION CHECK
    // ===================================================

    if (existingModule) {
      previousVersion = existingModule.version;

      currentVersion = existingModule.version;

      versionComparison = compareVersions(
        manifest.version,
        existingModule.version,
      );

      console.log("[MODULE VERSION CHECK]", {
        alias: manifest.alias,

        installed: existingModule.version,

        uploaded: manifest.version,

        comparison: versionComparison,
      });

      // -------------------------------------------------
      // SAME VERSION
      // -------------------------------------------------

      if (versionComparison === 0) {
        return NextResponse.json(
          {
            success: false,

            type: "already_installed",

            action: "none",

            message: `You already have version ${existingModule.version} installed.`,

            module: {
              id: existingModule.id,

              alias: existingModule.alias,

              name: existingModule.name,

              currentVersion: existingModule.version,

              uploadedVersion: manifest.version,
            },
          },
          {
            status: 409,
          },
        );
      }

      // -------------------------------------------------
      // OLDER VERSION
      // -------------------------------------------------

      if (versionComparison < 0) {
        return NextResponse.json(
          {
            success: false,

            type: "older_version",

            action: "none",

            message: `Uploaded version ${manifest.version} is older than the installed version ${existingModule.version}.`,

            module: {
              id: existingModule.id,

              alias: existingModule.alias,

              name: existingModule.name,

              currentVersion: existingModule.version,

              uploadedVersion: manifest.version,
            },
          },
          {
            status: 409,
          },
        );
      }

      // -------------------------------------------------
      // NEWER VERSION
      // -------------------------------------------------

      if (versionComparison > 0) {
        console.log(
          `[MODULE UPDATE] ${manifest.alias}: ${existingModule.version} -> ${manifest.version}`,
        );
      }
    }

    // ===================================================
    // MODULE FOLDER
    // ===================================================

    const expectedModuleFolderName = getModuleFolderName(manifest.alias);

    const moduleFolderName =
      typeof manifest.moduleFolder === "string" && manifest.moduleFolder.trim()
        ? manifest.moduleFolder.trim()
        : expectedModuleFolderName;

    if (!/^[a-z0-9-]+$/.test(moduleFolderName)) {
      throw new Error(
        "Invalid module folder name. Use only lowercase letters, numbers and hyphens.",
      );
    }

    if (moduleFolderName !== expectedModuleFolderName) {
      throw new Error(
        `Invalid module folder name. For alias "${manifest.alias}", the module folder must be "${expectedModuleFolderName}".`,
      );
    }

    // ===================================================
    // FINAL MODULE PATH
    // ===================================================

    finalModulePath = path.join(MODULES_ROOT, moduleFolderName);

    assertInsideRoot(
      finalModulePath,
      MODULES_ROOT,
      "Invalid module installation path.",
    );

    // ===================================================
    // PREPARE TEMPORARY MODULE
    // ===================================================

    temporaryModulePath = path.join(
      TEMP_ROOT,
      `.module-${manifest.alias}-${uploadId}`,
    );

    await removeDirectory(temporaryModulePath);

    await mkdir(temporaryModulePath, {
      recursive: true,
    });

    // ===================================================
    // COPY ZIP MODULE TO TEMP
    // ===================================================

    await copyDirectory(manifestInfo.moduleRoot, temporaryModulePath, {
      retries: 8,
      retryDelay: 500,
    });

    console.log(
      "[MODULE INSTALL] ZIP source copied to temporary module directory.",
    );

    // ===================================================
    // VERIFY TEMP MODULE
    // ===================================================

    const verification = await verifyModuleSource(
      temporaryModulePath,
      manifest.alias,
    );

    console.log("[MODULE SOURCE VERIFIED]", {
      alias: manifest.alias,

      src: path.relative(PROJECT_ROOT, verification.srcPath),
    });

    // ===================================================
    // VALIDATE SCHEMA
    // ===================================================

    const prismaSchemaResult = await validateModuleSchema(
      temporaryModulePath,
      manifest.alias,
    );

    console.log("[MODULE PRISMA SCHEMA]", prismaSchemaResult);

    // ===================================================
    // BACKUP EXISTING MODULE
    // ===================================================

    if (isUpdate && (await pathExists(finalModulePath))) {
      backupPath = path.join(
        TEMP_ROOT,
        `.backup-${manifest.alias}-${uploadId}`,
      );

      await removeDirectory(backupPath);

      await copyDirectory(finalModulePath, backupPath, {
        retries: 10,
        retryDelay: 700,
      });

      oldModuleBackupAvailable = await pathExists(backupPath);

      console.log("[MODULE BACKUP]", {
        source: finalModulePath,

        backup: backupPath,
      });
    }

    // ===================================================
    // REMOVE OLD BRIDGES
    // ===================================================

    if (isUpdate && (await pathExists(finalModulePath))) {
      removedOldBridges = await removeModuleBridgesByAlias(manifest.alias);

      console.log("[MODULE OLD BRIDGES REMOVED]", removedOldBridges);
    }

    // ===================================================
    // REMOVE OLD MODULE
    // ===================================================

    if (await pathExists(finalModulePath)) {
      await removeDirectory(finalModulePath, {
        retries: 10,
        retryDelay: 700,
      });
    }

    // ===================================================
    // INSTALL NEW MODULE
    // ===================================================

    await installModuleFiles(temporaryModulePath, finalModulePath);

    newModuleInstalled = true;

    console.log("[MODULE INSTALL] New module copied successfully.");

    // ===================================================
    // VERIFY FINAL MODULE
    // ===================================================

    await verifyModuleSource(finalModulePath, manifest.alias);

    // ===================================================
    // GENERATE NEXT.JS BRIDGES
    // ===================================================

    generatedBridges = await generateModuleBridges({
      moduleRoot: finalModulePath,
    });

    console.log("[MODULE BRIDGES]", {
      alias: manifest.alias,

      generated: generatedBridges.length,

      changed: generatedBridges.filter((item) => item.changed).length,
    });

    // ===================================================
    // CREATE / UPDATE EXTENSION MODULE
    // ===================================================

    if (existingModule) {
      moduleRecord = await prisma.extensionModule.update({
        where: {
          id: existingModule.id,
        },

        data: {
          name: manifest.name,

          description: manifest.description || null,

          version: manifest.version,

          author: manifest.author || null,

          status: "INSTALLED",

          icon: manifest.icon || "element-11",

          urlPath: manifest.urlPath || null,

          deletedAt: null,
        },
      });
    } else {
      moduleRecord = await prisma.extensionModule.create({
        data: {
          alias: manifest.alias,

          name: manifest.name,

          description: manifest.description || null,

          version: manifest.version,

          author: manifest.author || null,

          status: "INSTALLED",

          icon: manifest.icon || "element-11",

          urlPath: manifest.urlPath || null,

          deletedAt: null,
        },
      });

      moduleWasCreated = true;
    }

    // ===================================================
    // SYNC MODULE MENU
    // ===================================================

    let moduleMenu = null;

    try {
      moduleMenu = await syncModuleMenu(manifest);

      if (moduleMenu) {
        console.log("[MODULE MENU]", {
          action: moduleMenu.action,

          id: moduleMenu.menu.id,

          title: moduleMenu.menu.title,

          path: moduleMenu.menu.path,

          module: moduleMenu.menu.module,

          permission: moduleMenu.menu.permission,

          status: moduleMenu.menu.status,
        });
      }
    } catch (menuError) {
      console.error("[MODULE MENU ERROR]", menuError);

      throw new Error(
        `Module installed, but menu synchronization failed: ${
          menuError?.message || "Unknown menu error"
        }`,
      );
    }

    // ===================================================
    // CLEAN BACKUP
    // ===================================================

    if (backupPath) {
      await removeDirectory(backupPath, {
        retries: 5,
        retryDelay: 300,
      });

      backupPath = null;

      oldModuleBackupAvailable = false;
    }

    // ===================================================
    // CLEAN TEMP MODULE
    // ===================================================

    if (temporaryModulePath) {
      await removeDirectory(temporaryModulePath, {
        retries: 5,
        retryDelay: 300,
      });

      temporaryModulePath = null;
    }

    // ===================================================
    // CLEAN EXTRACTION
    // ===================================================

    if (extractPath) {
      await removeDirectory(extractPath, {
        retries: 5,
        retryDelay: 300,
      });

      extractPath = null;
    }

    // ===================================================
    // CLEAN ZIP
    // ===================================================

    if (zipPath) {
      await rm(zipPath, {
        force: true,
        maxRetries: 5,
        retryDelay: 300,
      });

      zipPath = null;
    }

    // ===================================================
    // SUCCESS
    // ===================================================

    const updateInformation = manifest.update || {
      releaseDate: null,

      features: [],

      remarks: "",
    };

    return NextResponse.json({
      success: true,

      message: isUpdate
        ? `Module updated successfully from version ${previousVersion} to version ${manifest.version}.`
        : "Module installed successfully.",

      action: isUpdate ? "update" : "install",

      // -------------------------------------------------
      // VERSION
      // -------------------------------------------------

      version: {
        previous: isUpdate ? previousVersion : null,

        current: manifest.version,

        uploaded: manifest.version,

        action: isUpdate ? "updated" : "installed",
      },

      // -------------------------------------------------
      // UPDATE INFORMATION
      // -------------------------------------------------

      update: updateInformation,

      // -------------------------------------------------
      // MODULE
      // -------------------------------------------------

      module: {
        id: moduleRecord.id,

        alias: moduleRecord.alias,

        name: moduleRecord.name,

        description: moduleRecord.description,

        version: moduleRecord.version,

        author: moduleRecord.author,

        status: moduleRecord.status,

        icon: moduleRecord.icon,

        urlPath: moduleRecord.urlPath,
      },

      installedPath: `modules/${moduleFolderName}`,

      absolutePath: finalModulePath,

      // -------------------------------------------------
      // PRISMA
      // -------------------------------------------------

      prismaSchema: prismaSchemaResult,

      prismaSchemaChanged: false,

      // -------------------------------------------------
      // BRIDGES
      // -------------------------------------------------

      generatedBridges,

      routesGenerated: generatedBridges.length,

      bridgesChanged: generatedBridges.filter((item) => item.changed).length,

      oldBridgesRemoved: removedOldBridges.length,

      removedOldBridges,

      // -------------------------------------------------
      // MENU
      // -------------------------------------------------

      moduleMenu: moduleMenu
        ? {
            action: moduleMenu.action,

            id: moduleMenu.menu.id,

            title: moduleMenu.menu.title,

            path: moduleMenu.menu.path,

            module: moduleMenu.menu.module,

            permission: moduleMenu.menu.permission,

            status: moduleMenu.menu.status,
          }
        : null,

      // -------------------------------------------------
      // INSTALLER
      // -------------------------------------------------

      moduleSource: "uploaded ZIP",

      installer: "no-spawn",

      buildRequired: true,

      buildCommand: "npm run build",

      messageAfterInstall:
        "Module installed and Next.js route bridges synchronized without using spawn, rename, or Prisma CLI. Run npm run build before production use.",
    });
  } catch (error) {
    console.error("[MODULE UPLOAD ERROR]", error);

    // ===================================================
    // ROLLBACK NEW BRIDGES
    // ===================================================

    try {
      if (Array.isArray(generatedBridges)) {
        for (const bridge of generatedBridges) {
          const bridgePath = path.join(PROJECT_ROOT, bridge.bridge);

          if (await pathExists(bridgePath)) {
            await rm(bridgePath, {
              force: true,
            });

            await removeEmptyParentDirectories(path.dirname(bridgePath));
          }
        }
      }
    } catch (bridgeRollbackError) {
      console.error("[MODULE ROLLBACK BRIDGE ERROR]", bridgeRollbackError);
    }

    // ===================================================
    // ROLLBACK MODULE
    // ===================================================

    try {
      // -------------------------------------------------
      // Remove partially installed module
      // -------------------------------------------------

      if (
        newModuleInstalled &&
        finalModulePath &&
        (await pathExists(finalModulePath))
      ) {
        await removeDirectory(finalModulePath, {
          retries: 10,
          retryDelay: 700,
        });
      }

      // -------------------------------------------------
      // Restore previous module
      // -------------------------------------------------

      if (
        oldModuleBackupAvailable &&
        backupPath &&
        (await pathExists(backupPath))
      ) {
        await installModuleFiles(backupPath, finalModulePath);

        console.log("[MODULE ROLLBACK] Previous module restored.");
      }
    } catch (rollbackError) {
      console.error("[MODULE ROLLBACK ERROR]", rollbackError);
    }

    // ===================================================
    // RESTORE OLD BRIDGES
    // ===================================================

    try {
      if (finalModulePath && (await pathExists(finalModulePath))) {
        await generateModuleBridges({
          moduleRoot: finalModulePath,
        });

        console.log("[MODULE ROLLBACK] Previous route bridges regenerated.");
      }
    } catch (bridgeRestoreError) {
      console.error("[MODULE ROLLBACK BRIDGES ERROR]", bridgeRestoreError);
    }

    // ===================================================
    // DATABASE ROLLBACK
    // ===================================================
    //
    // If the filesystem was restored after a DB update,
    // restore the previous module version in DB too.
    //
    // ===================================================

    try {
      if (isUpdate && existingModule && previousVersion) {
        await prisma.extensionModule.update({
          where: {
            id: existingModule.id,
          },

          data: {
            version: previousVersion,

            status: "INSTALLED",
          },
        });

        console.log(
          "[MODULE ROLLBACK] Previous database module version restored.",
        );
      }

      // -------------------------------------------------
      // If this was a new installation and the database
      // record was created before an error occurred,
      // remove it.
      // -------------------------------------------------

      if (moduleWasCreated && moduleRecord?.id) {
        await prisma.extensionModule.delete({
          where: {
            id: moduleRecord.id,
          },
        });

        console.log(
          "[MODULE ROLLBACK] Newly created module database record removed.",
        );
      }
    } catch (databaseRollbackError) {
      console.error("[MODULE DATABASE ROLLBACK ERROR]", databaseRollbackError);
    }

    // ===================================================
    // CLEAN TEMP MODULE
    // ===================================================

    if (temporaryModulePath) {
      try {
        await removeDirectory(temporaryModulePath, {
          retries: 5,
          retryDelay: 300,
        });
      } catch {}
    }

    // ===================================================
    // CLEAN EXTRACTION
    // ===================================================

    if (extractPath) {
      try {
        await removeDirectory(extractPath, {
          retries: 5,
          retryDelay: 300,
        });
      } catch {}
    }

    // ===================================================
    // CLEAN ZIP
    // ===================================================

    if (zipPath) {
      try {
        await rm(zipPath, {
          force: true,
          maxRetries: 5,
          retryDelay: 300,
        });
      } catch {}
    }

    // ===================================================
    // CLEAN BACKUP
    // ===================================================

    if (backupPath) {
      try {
        await removeDirectory(backupPath, {
          retries: 5,
          retryDelay: 300,
        });
      } catch {}
    }

    // ===================================================
    // ERROR RESPONSE
    // ===================================================

    return NextResponse.json(
      {
        success: false,

        type: error?.type || "MODULE_UPLOAD_ERROR",

        message: error?.message || "Failed to upload module.",

        installer: "no-spawn",

        error: error?.code || "MODULE_UPLOAD_ERROR",

        version: {
          previous: previousVersion,

          uploaded: currentVersion,
        },
      },
      {
        status: error?.statusCode || 500,
      },
    );
  }
}