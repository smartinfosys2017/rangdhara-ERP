"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { LoaderCircleIcon } from "lucide-react";

import { can } from "@/lib/permissions";

export default function SystemInfoPage() {
  // =======================================================
  // USER SESSION / PERMISSIONS
  // =======================================================

  const { data: session, status: sessionStatus } = useSession();

  console.log("System Info Session:", session);
  console.log("System Info Permissions:", session?.user?.permissions);

  const userPermissions = useMemo(() => {
    return session?.user?.permissions || [];
  }, [session]);

  const canView = can("systeminfo.view", userPermissions);

  // =======================================================
  // STATE
  // =======================================================

  const [data, setData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  // =======================================================
  // LOAD SYSTEM INFORMATION
  // =======================================================

  useEffect(() => {
    if (sessionStatus !== "authenticated") {
      return;
    }

    if (!canView) {
      setLoading(false);
      return;
    }

    loadSystemInfo();
  }, [sessionStatus, canView]);

  const loadSystemInfo = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/settings/system-info", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to load system information.");
      }

      setData(result.data);
    } catch (error) {
      console.error(error);

      setError(error.message || "Failed to load system information.");
    } finally {
      setLoading(false);
    }
  };

  // =======================================================
  // SESSION LOADING
  // =======================================================

  if (sessionStatus === "loading") {
    return (
      <Card className="pb-2.5">
        <CardHeader>
          <CardTitle>System / Server Information</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex min-h-[180px] items-center justify-center">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-5 animate-spin" />

              <span>Checking permissions...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // =======================================================
  // NOT LOGGED IN
  // =======================================================

  if (sessionStatus !== "authenticated") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System / Server Information</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-destructive">
            Please login to access this page.
          </div>
        </CardContent>
      </Card>
    );
  }

  // =======================================================
  // ACCESS DENIED
  // =======================================================

  if (!canView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System / Server Information</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-destructive">
            You do not have permission to view system information.
          </div>
        </CardContent>
      </Card>
    );
  }

  // =======================================================
  // DATA LOADING
  // =======================================================

  if (loading) {
    return (
      <Card className="pb-2.5">
        <CardHeader>
          <CardTitle>System / Server Information</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex min-h-[180px] items-center justify-center">
            <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
              <LoaderCircleIcon className="size-5 animate-spin" />

              <span>Loading system information...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // =======================================================
  // ERROR
  // =======================================================

  if (error) {
    return (
      <Card className="pb-2.5">
        <CardHeader>
          <CardTitle>System / Server Information</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="text-destructive mb-4">{error}</div>

          <Button onClick={loadSystemInfo}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  // =======================================================
  // TABLE
  // =======================================================

  const renderTable = (title, rows) => (
    <div className="grid gap-3">
      <h3 className="text-base font-semibold">{title}</h3>

      <div className="border rounded-md overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left p-3 w-[35%]">Variable Name</th>

              <th className="text-left p-3">Value</th>
            </tr>
          </thead>

          <tbody>
            {rows.map(([name, value]) => (
              <tr key={name} className="border-b last:border-0">
                <td className="p-3 font-medium">{name}</td>

                <td className="p-3 text-muted-foreground break-all">
                  {value ?? "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // =======================================================
  // PAGE
  // =======================================================

  return (
    <Card>
      <CardHeader className="border-b border-border">
        <CardTitle>System / Server Information</CardTitle>
      </CardHeader>

      <CardContent className="py-12">
        <div className="space-y-6 lg:max-w-[1024px] mx-auto">
          {/* Application */}
          {renderTable("Application Information", [
            ["Environment", data.application.environment],
            ["Node.js Version", data.application.node_version],
            ["NPM Version", data.application.npm_version],
            ["Next.js Version", data.application.next_version],
            ["Process ID", data.application.process_id],
            ["Timezone", data.application.timezone],
          ])}

          {/* Server */}
          {renderTable("Node.js / Server Information", [
            ["Operating System", data.server.platform],
            ["Architecture", data.server.architecture],
            ["Hostname", data.server.hostname],
            ["CPU Cores", data.server.cpu_count],
            ["Total Memory", data.server.total_memory],
            ["Free Memory", data.server.free_memory],
            ["Server Uptime", data.server.uptime],
            ["Home Directory", data.server.home_directory],
            ["Temporary Directory", data.server.temp_directory],
          ])}

          {/* PostgreSQL */}
          {renderTable("PostgreSQL Information", [
            ["PostgreSQL Version", data.postgres.version],
            ["Database", data.postgres.database],
            ["Database User", data.postgres.user],
            ["Schema", data.postgres.schema],
            ["Active Connections", data.postgres.active_connections],
            ["Maximum Connections", data.postgres.max_connections],
            ["Database Size", data.postgres.database_size],
          ])}

          {/* Prisma */}
          {renderTable("Database ORM", [
            ["ORM", data.prisma.client],
            ["Database", data.prisma.database],
          ])}

          {/* Refresh */}
          <div className="flex justify-end">
            <Button type="button" onClick={loadSystemInfo}>
              Refresh Information
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
