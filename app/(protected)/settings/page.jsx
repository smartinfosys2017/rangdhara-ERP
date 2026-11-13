"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [activeEnv, setActiveEnv] = useState("local");
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [runningCron, setRunningCron] = useState(false);

  useEffect(() => {
    loadEnvironment();
  }, []);

  async function loadEnvironment() {
    try {
      const response = await fetch("/api/settings/toggle");

      if (!response.ok) {
        throw new Error("Failed to load environment");
      }

      const data = await response.json();
      setActiveEnv(data.activeEnv || "local");
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // SWITCH DATABASE
  // =====================================================
  async function handleToggle(env) {
    if (
      env === activeEnv ||
      switching ||
      syncing ||
      importing ||
      runningCron
    ) {
      return;
    }

    setSwitching(true);

    try {
      const response = await fetch("/api/settings/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetEnv: env,
        }),
      });

      const text = await response.text();
      console.log("STATUS:", response.status);
      console.log("RESPONSE:", text);

      let data = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          console.error("Invalid JSON:", text);
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error || `Server error: ${response.status} `
        );
      }

      if (data.success) {
        setActiveEnv(data.activeEnv);
      }
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setSwitching(false);
    }
  }

  // =====================================================
  // SYNC LOCAL → LIVE
  // =====================================================
  async function handleSync() {
    if (syncing || switching || importing || runningCron) {
      return;
    }

    setSyncing(true);

    try {
      const response = await fetch("/api/sync/export-local", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const text = await response.text();

      console.log("[SYNC] STATUS:", response.status);
      console.log("[SYNC] RESPONSE:", text);

      let data = {};

      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          console.error("[SYNC] Invalid JSON:", text);
        }
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
          data.message ||
          `Sync failed: ${response.status} `
        );
      }

      if (data.success) {
        alert(
          data.message ||
          "Local data synchronized to Live successfully."
        );
      } else {
        alert(
          data.error ||
          data.message ||
          "Synchronization failed."
        );
      }
    } catch (error) {
      console.error("[SYNC ERROR]", error);

      alert(
        error?.message || "Failed to synchronize data."
      );
    } finally {
      setSyncing(false);
    }
  }

  // =====================================================
  // RUN INVENTORY ALERTS + EMAIL QUEUE
  // =====================================================
  async function handleRunCron() {
    if (busy || runningCron) {
      return;
    }

    const confirmed = window.confirm(
      "Run the inventory restock check and process eligible queued emails now?"
    );

    if (!confirmed) {
      return;
    }

    setRunningCron(true);

    try {
      const response = await fetch(
        "/api/cron/process-inventory-alerts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          "Failed to process inventory alerts."
        );
      }

      const restock = data.restock || {};
      const emailQueue = data.emailQueue || {};

      alert(
        "Inventory alerts processed successfully.\n\n" +
        `Items checked: ${restock.checked ?? 0} \n` +
        `New restock alerts: ${restock.alertsCreated ?? 0} \n` +
        `Alerts reset: ${restock.alertsReset ?? 0} \n` +
        `Emails sent: ${emailQueue.sent ?? 0} \n` +
        `Emails failed: ${emailQueue.failed ?? 0} \n` +
        `Emails remaining this hour: ${emailQueue.remaining ?? 0} `
      );
    } catch (error) {
      console.error("RUN INVENTORY ALERTS ERROR:", error);

      alert(
        error?.message ||
        "Failed to run inventory alerts."
      );
    } finally {
      setRunningCron(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        Loading configurations...
      </div>
    );
  }

  const busy =
    switching ||
    syncing ||
    importing ||
    runningCron;

  return (
    <div className="p-8 max-w-md mx-auto">
      <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
        {/* Heading */}
        <h1 className="text-xl font-bold text-gray-800">
          Database Connection Hub
        </h1>

        <p className="text-sm text-gray-500">
          Select which database server handles your CRUD
          operations.
        </p>

        {/* Environment Toggle */}
        <div className="flex border border-gray-200 rounded-lg p-1 bg-gray-50">

          <button
            type="button"
            disabled={busy}
            onClick={() => handleToggle('local')}
            className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-all ${activeEnv === 'local'
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-700 hover:text-gray-900'
              }`}
          >
            💻 Local
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => handleToggle('live')}
            className={`flex-1 py-2 text-center text-sm font-medium rounded-md transition-all ${activeEnv === 'live'
              ? 'bg-emerald-600 text-white shadow'
              : 'text-gray-700 hover:text-gray-900'
              }`}
          >
            🌐 Live
          </button>

        </div>

        {/* Status */}
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          Status:{" "}
          <span className="font-bold">
            {activeEnv.toUpperCase()}
          </span>
        </div>

        {/* Switching Message */}
        {switching && (
          <div className="text-sm text-gray-500">
            Switching database...
          </div>
        )}

        {/* Local → Live Sync Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={handleSync}
            className={`w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white transition-all ${busy
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow'
              }`}
          >
            {syncing
              ? '⏳ Synchronizing...'
              : '🔄 Sync Local → Live'}
          </button>
        </div>

        {/* Sync Message */}
        {syncing && (
          <div className="text-sm text-gray-500 text-center">
            Synchronizing data, please wait...
          </div>
        )}


        {/* Import Message */}
        {importing && (
          <div className="text-sm text-gray-500 text-center">
            Importing Local data into Live, please wait...
          </div>
        )}

        {/* Inventory Alerts + Email Queue */}
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <h2 className="text-sm font-semibold text-gray-800">
            Inventory Notifications
          </h2>

          <p className="text-xs text-gray-500">
            Check stock levels, create restock notifications,
            and process eligible queued emails.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={handleRunCron}
            className={`w - full py - 2.5 px - 4 rounded - lg text - sm font - semibold text - white transition - all ${busy
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700 shadow"
              } `}
          >
            {runningCron
              ? "⏳ Processing Inventory Alerts..."
              : "🔔 Run Inventory Alerts & Email Queue"}
          </button>
        </div>
      </div>
    </div>
  );
}