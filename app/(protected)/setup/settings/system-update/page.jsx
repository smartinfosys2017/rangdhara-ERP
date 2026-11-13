"use client";

import { useEffect, useMemo, useState } from "react";

import { useSession } from "next-auth/react";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { toast } from "sonner";
import { LoaderCircleIcon } from "lucide-react";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { can } from "@/lib/permissions";

export default function SystemUpdatePage() {
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();

  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("systemupdate.view", userPermissions);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [purchaseKey, setPurchaseKey] = useState("");

  const [yourVersion, setYourVersion] = useState("3.4.1");
  const [latestVersion, setLatestVersion] = useState("3.4.1");

  const [latestVersionCode, setLatestVersionCode] = useState("341");

  // =======================================================
  // SUCCESS TOAST
  // =======================================================

  const showSuccessToast = (message) => {
    toast.custom(
      () => (
        <Alert variant="mono" icon="success">
          <AlertIcon>
            <RiCheckboxCircleFill />
          </AlertIcon>

          <AlertTitle>{message}</AlertTitle>
        </Alert>
      ),
      {
        position: "top-center",
      },
    );
  };

  // =======================================================
  // ERROR TOAST
  // =======================================================

  const showErrorToast = (message) => {
    toast.custom(
      (t) => (
        <Alert
          variant="mono"
          icon="destructive"
          close={true}
          onClose={() => {
            toast.dismiss(t);
          }}
        >
          <AlertIcon>
            <RiErrorWarningFill />
          </AlertIcon>

          <AlertTitle>{message}</AlertTitle>
        </Alert>
      ),
      {
        position: "top-center",
      },
    );
  };

  // =======================================================
  // LOAD SYSTEM UPDATE SETTINGS
  // =======================================================

  const loadSystemUpdateSettings = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/settings/system-update", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to load system update settings.",
        );
      }

      const data = result.data || {};

      setPurchaseKey(data.purchase_key || "");

      setYourVersion(data.your_version || "3.4.1");

      setLatestVersion(data.latest_version || "3.4.1");

      setLatestVersionCode(data.latest_version_code || "341");
    } catch (error) {
      console.error("Load system update settings error:", error);

      showErrorToast(error.message || "Failed to load system update settings.");
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // LOAD ONLY AFTER PERMISSION CHECK
  // =======================================================

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      return;
    }

    if (!canView) {
      setLoading(false);
      return;
    }

    loadSystemUpdateSettings();
  }, [sessionStatus, canView]);

  // =======================================================
  // SAVE SETTINGS
  // =======================================================

  const handleSave = async () => {
    if (!canView) {
      showErrorToast("You do not have permission to update system settings.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/settings/system-update", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          purchaseKey,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to save system update settings.",
        );
      }

      showSuccessToast("System update settings saved successfully.");

      await loadSystemUpdateSettings();
    } catch (error) {
      console.error("Save system update settings error:", error);

      showErrorToast(error.message || "Failed to save system update settings.");
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // VERSION COMPARISON
  // =======================================================

  const normalizeVersion = (version) => {
    return String(version || "")
      .replace(/^v/i, "")
      .split(".")
      .map((part) => parseInt(part, 10) || 0);
  };

  const isLatestVersion = () => {
    const current = normalizeVersion(yourVersion);
    const latest = normalizeVersion(latestVersion);

    const length = Math.max(current.length, latest.length);

    for (let i = 0; i < length; i++) {
      const currentPart = current[i] || 0;
      const latestPart = latest[i] || 0;

      if (currentPart < latestPart) {
        return false;
      }

      if (currentPart > latestPart) {
        return true;
      }
    }

    return true;
  };

  // =======================================================
  // SESSION LOADING
  // =======================================================

  if (sessionStatus === "loading") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Checking permissions...
          </div>
        </CardContent>
      </Card>
    );
  }

  // =======================================================
  // NOT AUTHENTICATED
  // =======================================================

  if (sessionStatus !== "authenticated") {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-destructive">
            You must be logged in to access this page.
          </p>
        </CardContent>
      </Card>
    );
  }

  // =======================================================
  // PERMISSION DENIED
  // =======================================================

  if (!canView) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-sm text-destructive">
            You do not have permission to view system update settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  // =======================================================
  // DATA LOADING
  // =======================================================

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircleIcon className="size-4 animate-spin" />
            Loading system update settings...
          </div>
        </CardContent>
      </Card>
    );
  }

  const latest = isLatestVersion();

  // =======================================================
  // PAGE
  // =======================================================

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>System Update</CardTitle>
      </CardHeader>

      <CardContent className="py-12">
        <div className="space-y-6 lg:max-w-[1024px] mx-auto">
          {/* PURCHASE KEY */}

          <div className="flex items-center flex-wrap lg:flex-nowrap gap-2.5">
            <Label htmlFor="purchase-key" className="flex w-full max-w-56">
              Purchase Key
            </Label>

            <div className="grow">
              <Input
                id="purchase-key"
                type="text"
                value={purchaseKey}
                onChange={(event) => setPurchaseKey(event.target.value)}
                placeholder="Enter your purchase key"
                autoComplete="off"
              />
            </div>
          </div>

          {/* VERSION INFORMATION */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-md border bg-info/10 p-5 text-center">
              <h4 className="font-bold text-base mb-1">Your Version</h4>

              <p className="font-semibold mb-0 text-sm">{yourVersion}</p>
            </div>

            <div className="rounded-md border bg-info/10 p-5 text-center">
              <h4 className="font-bold text-base mb-1">Latest Version</h4>

              <p className="font-semibold mb-0 text-sm">{latestVersion}</p>

              <input
                type="hidden"
                name="latest_version"
                value={latestVersionCode}
                readOnly
              />
            </div>
          </div>

          {/* UPDATE STATUS */}

          <div className="text-center py-2">
            {latest ? (
              <h3 className="font-semibold text-lg text-success">
                You are using the latest version
              </h3>
            ) : (
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-warning">
                  A new version is available
                </h3>

                <p className="text-sm text-muted-foreground">
                  Your version is {yourVersion}. The latest version is{" "}
                  {latestVersion}.
                </p>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    showSuccessToast(
                      "Update package download will be available here.",
                    )
                  }
                >
                  Check Update
                </Button>
              </div>
            )}
          </div>

          {/* SAVE */}

          <div className="flex justify-end border-t pt-5">
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <LoaderCircleIcon className="size-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Settings"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
