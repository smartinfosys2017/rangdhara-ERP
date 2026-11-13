
"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { APP_SETTINGS } from "@/config/settings.config";

const SettingsContext = createContext(undefined);

const LOCAL_STORAGE_PREFIX = "app_settings_";

const isBrowser = () => typeof window !== "undefined";

function cloneSettings(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function getFromPath(obj, path) {
  return path
    .split(".")
    .reduce((acc, part) => acc?.[part], obj);
}

function setToPath(obj, path, value) {
  const result = cloneSettings(obj);
  const keys = path.split(".");
  const lastKey = keys.pop();

  let current = result;

  for (const key of keys) {
    if (
      !current[key] ||
      typeof current[key] !== "object" ||
      Array.isArray(current[key])
    ) {
      current[key] = {};
    }

    current = current[key];
  }

  current[lastKey] = value;

  return result;
}

function mergeSettings(base, updates) {
  const result = cloneSettings(base);

  for (const [key, value] of Object.entries(updates || {})) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      result[key] = mergeSettings(
        result[key] &&
          typeof result[key] === "object" &&
          !Array.isArray(result[key])
          ? result[key]
          : {},
        value
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

function storeLeaf(path, value) {
  if (!isBrowser()) return;

  try {
    localStorage.setItem(
      `${LOCAL_STORAGE_PREFIX}${path}`,
      JSON.stringify(value)
    );
  } catch (error) {
    console.error("LocalStorage write error:", error);
  }
}

function getLeafFromStorage(path) {
  if (!isBrowser()) return undefined;

  try {
    const item = localStorage.getItem(
      `${LOCAL_STORAGE_PREFIX}${path}`
    );

    return item !== null ? JSON.parse(item) : undefined;
  } catch (error) {
    console.error("LocalStorage read error:", error);
    return undefined;
  }
}

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => ({
    ...cloneSettings(APP_SETTINGS),
    company: {
      company_name: "Rangdhara Fabrics",
    },
  }));

  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        // Start with the existing app configuration.
        let initialSettings = cloneSettings(APP_SETTINGS);

        // Preserve existing localStorage settings.
        if (isBrowser()) {
          const storageKeys = Object.keys(localStorage).filter(
            (key) => key.startsWith(LOCAL_STORAGE_PREFIX)
          );

          for (const storageKey of storageKeys) {
            const path = storageKey.replace(
              LOCAL_STORAGE_PREFIX,
              ""
            );

            const value = getLeafFromStorage(path);

            if (value !== undefined) {
              initialSettings = setToPath(
                initialSettings,
                path,
                value
              );
            }
          }
        }

        // Apply initial settings immediately.
        if (!cancelled) {
          setSettings(initialSettings);
        }

        // Load settings stored in the database.
        const response = await fetch("/api/settings", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Settings API returned ${response.status}`
          );
        }

        const result = await response.json();

        if (!result.success || !result.settings) {
          throw new Error("Invalid settings API response");
        }

        // Database values override matching local values.
        const databaseSettings = result.settings;

        const finalSettings = mergeSettings(
          initialSettings,
          databaseSettings
        );

        // Ensure company name has a usable default.
        if (
          typeof finalSettings.company?.company_name !==
            "string" ||
          !finalSettings.company.company_name.trim()
        ) {
          finalSettings.company = {
            ...finalSettings.company,
            company_name: "Rangdhara Fabrics",
          };
        }

        if (!cancelled) {
          setSettings(finalSettings);
        }
      } catch (error) {
        console.error("Failed to load database settings:", error);

        // Keep APP_SETTINGS and localStorage values if
        // the database request fails.
      } finally {
        if (!cancelled) {
          setSettingsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const getOption = useCallback(
    (path) => getFromPath(settings, path),
    [settings]
  );

  const setOption = useCallback((path, value) => {
    setSettings((previous) =>
      setToPath(previous, path, value)
    );
  }, []);

  const storeOption = useCallback((path, value) => {
    setSettings((previous) =>
      setToPath(previous, path, value)
    );

    storeLeaf(path, value);
  }, []);

  const contextValue = useMemo(
    () => ({
      getOption,
      setOption,
      storeOption,
      settings,
      settingsLoading,
    }),
    [
      getOption,
      setOption,
      storeOption,
      settings,
      settingsLoading,
    ]
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error(
      "useSettings must be used within a SettingsProvider"
    );
  }

  return context;
};
