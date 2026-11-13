import fs from "fs";
import path from "path";

const MODULES_DIR = path.join(process.cwd(), "modules");

export function getInstalledModules() {
  if (!fs.existsSync(MODULES_DIR)) {
    return [];
  }

  const entries = fs.readdirSync(MODULES_DIR, {
    withFileTypes: true,
  });

  const modules = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const modulePath = path.join(MODULES_DIR, entry.name);

    const manifestPath = path.join(modulePath, "module.json");

    const moduleEntryPath = path.join(modulePath, "src", "module.js");

    if (!fs.existsSync(manifestPath)) {
      continue;
    }

    if (!fs.existsSync(moduleEntryPath)) {
      continue;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

      modules.push({
        folder: entry.name,

        path: modulePath,

        alias: manifest.alias,

        name: manifest.name,

        version: manifest.version,

        description: manifest.description || "",

        urlPath: manifest.urlPath || null,

        entry: moduleEntryPath,

        update: manifest.update || {
          releaseDate: null,
          features: [],
          remarks: "",
        },
      });
    } catch (error) {
      console.error(`[MODULE REGISTRY] Failed to read ${entry.name}`, error);
    }
  }

  return modules;
}

export function getModuleByAlias(alias) {
  const modules = getInstalledModules();

  return modules.find((module) => module.alias === alias) || null;
}

export function compareVersions(versionA, versionB) {
  const a = versionA.replace(/^v/, "").split(".").map(Number);

  const b = versionB.replace(/^v/, "").split(".").map(Number);

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