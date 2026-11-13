
import prisma from "@/lib/prisma";

/**
 * Get one setting using its group and key.
 * Example: getSetting("company", "company_name")
 */
export async function getSetting(group, key) {
  try {
    const setting = await prisma.setting.findFirst({
      where: {
        group,
        key,
      },
      select: {
        value: true,
      },
    });

    return setting?.value ?? null;
  } catch (error) {
    console.error(`Error fetching setting ${group}.${key}:`, error);
    return null;
  }
}

/**
 * Get all settings in one database query.
 * Result: settings.company.company_name
 */
export async function getAllSettings() {
  try {
    const rows = await prisma.setting.findMany({
      select: {
        group: true,
        key: true,
        value: true,
      },
    });

    const settings = {};

    for (const row of rows) {
      if (!settings[row.group]) {
        settings[row.group] = {};
      }

      settings[row.group][row.key] = row.value;
    }

    // Default company name
    if (
      typeof settings.company?.company_name !== "string" ||
      !settings.company.company_name.trim()
    ) {
      settings.company = settings.company || {};
      settings.company.company_name = "Rangdhara Fabrics";
    }

    return settings;
  } catch (error) {
    console.error("Error fetching all settings:", error);

    return {
      company: {
        company_name: "Rangdhara Fabrics",
      },
      general: {},
    };
  }
}
