"use client";

import { useEffect, useRef, useState } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Container } from "@/components/common/container";

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from "@/components/common/toolbar";

import { Button } from "@/components/ui/button";

import {
  Database,
  Download,
  Trash2,
  Upload,
  RefreshCw,
  History,
  HardDrive,
  RotateCcw,
  X,
} from "lucide-react";

export default function DatabaseBackupPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [history, setHistory] = useState([]);
  const [historyBackup, setHistoryBackup] = useState(null);

  const fileInputRef = useRef(null);

  const loadBackups = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/database-backup", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load database backups.");
      }

      setBackups(Array.isArray(data.backups) ? data.backups : []);
    } catch (err) {
      console.error("Load backups error:", err);

      setError(err.message || "Failed to load database backups.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const createBackup = async () => {
    if (creating) return;

    const confirmed = window.confirm(
      "Are you sure you want to create a new database backup?",
    );

    if (!confirmed) return;

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/database-backup", {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to create database backup.");
      }

      setSuccess(data.message || "Database backup created successfully.");

      await loadBackups();
    } catch (err) {
      console.error("Create backup error:", err);

      setError(err.message || "Failed to create database backup.");
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = (backup) => {
    if (!backup?.id) return;

    window.location.href = `/api/database-backup/download?id=${encodeURIComponent(
      backup.id,
    )}`;
  };

  const deleteBackup = async (backup) => {
    if (!backup?.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${backup.fileName}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/database-backup/delete?id=${encodeURIComponent(backup.id)}`,
        {
          method: "DELETE",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to delete database backup.");
      }

      setSuccess(data.message || "Database backup deleted successfully.");

      if (historyBackup?.id === backup.id) {
        setHistory([]);
        setHistoryBackup(null);
      }

      await loadBackups();
    } catch (err) {
      console.error("Delete backup error:", err);

      setError(err.message || "Failed to delete database backup.");
    }
  };

  const loadHistory = async (backup) => {
    if (!backup?.id) return;

    try {
      setError("");
      setHistoryBackup(backup);

      const response = await fetch(
        `/api/database-backup/download-history?backupId=${encodeURIComponent(
          backup.id,
        )}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load download history.");
      }

      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      console.error("Load history error:", err);

      setError(err.message || "Failed to load download history.");
    }
  };

  const restoreBackup = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    const confirmed = window.confirm(
      `Are you sure you want to restore the database from "${file.name}"?\n\nThis will replace data in the existing public database tables.`,
    );

    if (!confirmed) return;

    try {
      setRestoring(true);
      setError("");
      setSuccess("");

      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch("/api/database-backup/restore", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to restore database backup.");
      }

      setSuccess(data.message || "Database backup restored successfully.");

      await loadBackups();
    } catch (err) {
      console.error("Restore backup error:", err);

      setError(err.message || "Failed to restore database backup.");
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const formatBytes = (bytes) => {
    const value = Number(bytes || 0);

    if (!value) {
      return "0 Bytes";
    }

    const units = ["Bytes", "KB", "MB", "GB", "TB"];

    const index = Math.floor(Math.log(value) / Math.log(1024));

    const safeIndex = Math.min(index, units.length - 1);

    return `${(value / Math.pow(1024, safeIndex)).toFixed(
      safeIndex === 0 ? 0 : 2,
    )} ${units[safeIndex]}`;
  };

  return (
    <>
      {/* Page Header */}
      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarTitle>Database Backup</ToolbarTitle>

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator />

                <BreadcrumbItem>
                  <BreadcrumbPage>Database Backup</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>

          <ToolbarActions>
            <Button
              type="button"
              variant="outline"
              onClick={loadBackups}
              disabled={loading}
            >
              <RefreshCw
                className={`size-4 me-2 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Button
              type="button"
              variant="outline"
              disabled={restoring}
              onClick={() => fileInputRef.current?.click()}
            >
              {restoring ? (
                <RefreshCw className="size-4 me-2 animate-spin" />
              ) : (
                <RotateCcw className="size-4 me-2" />
              )}

              {restoring ? "Restoring..." : "Restore Backup"}
            </Button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              disabled={restoring}
              onChange={restoreBackup}
            />

            <Button
              type="button"
              variant="primary"
              onClick={createBackup}
              disabled={creating}
            >
              {creating ? (
                <RefreshCw className="size-4 me-2 animate-spin" />
              ) : (
                <HardDrive className="size-4 me-2" />
              )}

              {creating ? "Creating..." : "Create Backup"}
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>

      {/* Content */}
      <Container>
        <div className="grid gap-5 lg:gap-7.5">
          {/* Messages */}
          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <span className="flex-1">{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                className="shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              <span className="flex-1">{success}</span>

              <button
                type="button"
                onClick={() => setSuccess("")}
                className="shrink-0"
              >
                <X className="size-4" />
              </button>
            </div>
          )}

          {/* Backups */}
          <div className="card flex flex-col items-stretch text-card-foreground rounded-xl bg-card border border-border shadow-xs black/5">
            <div className="card-header flex items-center justify-between flex-wrap px-5 min-h-14 gap-2.5 border-b border-border py-5">
              <h3 className="card-title">Available Backups</h3>

              <div className="card-toolbar flex items-center justify-between flex-wrap px-5 min-h-14 gap-2.5 border-b border-border py-5">
                <span className="badge badge-light">
                  {backups.length} {backups.length === 1 ? "Backup" : "Backups"}
                </span>
              </div>
            </div>

            <div className="card-body gap-2.5 border-b border-border py-5">
              {loading ? (
                <div className="flex justify-center py-10">
                  <RefreshCw className="size-5 animate-spin" />
                </div>
              ) : backups.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex size-12 items-center justify-center rounded-md bg-muted mb-4">
                    <Database className="size-6 text-muted-foreground" />
                  </div>

                  <h3 className="text-sm font-semibold text-foreground">
                    No backups found
                  </h3>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Create a backup to see it here.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="w-full text-sm text-left rtl:text-right text-foreground border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-muted/40">
                        <th className="px-4 py-3.5 text-left font-medium text-muted-foreground border-b border-border">
                          File Name
                        </th>

                        <th className="px-4 py-3.5 text-left font-medium text-muted-foreground border-b border-border">
                          Size
                        </th>

                        <th className="px-4 py-3.5 text-left font-medium text-muted-foreground border-b border-border">
                          Status
                        </th>

                        <th className="px-4 py-3.5 text-center font-medium text-muted-foreground border-b border-border">
                          Downloads
                        </th>

                        <th className="px-4 py-3.5 text-left font-medium text-muted-foreground border-b border-border">
                          Created
                        </th>

                        <th className="px-4 py-3.5 text-right font-medium text-muted-foreground border-b border-border">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {backups.map((backup) => (
                        <tr
                          key={backup.id}
                          className="hover:bg-muted/40 transition-colors border-b border-border"
                        >
                          {/* File Name */}
                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                <Database className="size-5 text-primary" />
                              </div>

                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium text-foreground">
                                  {backup.fileName}
                                </span>

                                <span className="text-xs text-muted-foreground">
                                  ID: {backup.id}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Size */}
                          <td className="px-4 py-4 align-middle">
                            <span className="font-medium text-secondary-foreground">
                              {formatBytes(backup.fileSize)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4 align-middle">
                            <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                              {backup.status || "completed"}
                            </span>
                          </td>

                          {/* Downloads */}
                          <td className="px-4 py-4 align-middle text-center">
                            <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-secondary-foreground">
                              {Number(backup.downloadCount || 0)}
                            </span>
                          </td>

                          {/* Created */}
                          <td className="px-4 py-4 align-middle">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDate(backup.createdAt)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Download"
                                onClick={() => downloadBackup(backup)}
                                className="size-8 p-0"
                              >
                                <Download className="size-4" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="History"
                                onClick={() => loadHistory(backup)}
                                className="size-8 p-0"
                              >
                                <History className="size-4" />
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                title="Delete"
                                onClick={() => deleteBackup(backup)}
                                className="size-8 p-0"
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          {historyBackup && (
            <div className="card flex flex-col items-stretch text-card-foreground rounded-xl bg-card border border-border shadow-xs black/5">
              <div className="card-header flex items-center justify-between flex-wrap px-5 min-h-14 gap-2.5 border-b border-border py-5">
                <div className="card-title">
                  <div className="d-flex flex-column">
                    <h3
                      className="text-gray-800 fw-bold"
                      class="text-secondary-foreground"
                    >
                      Download History
                    </h3>

                    <span
                      className="text-muted fs-7 fw-normal"
                      class="text-secondary-foreground"
                    >
                      {historyBackup.fileName}
                    </span>
                  </div>
                </div>

                <div className="card-toolbar">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setHistory([]);
                      setHistoryBackup(null);
                    }}
                  >
                    <X className="size-4 me-2" />
                    Close
                  </Button>
                </div>
              </div>

              <div className="card-body flex items-center justify-between flex-wrap px-5 min-h-14 gap-2.5 border-b border-border py-5">
                {history.length === 0 ? (
                  <div className="card-header items-center justify-center py-10">
                    <History className="mb-3 size-10 text-muted-foreground" />

                    <h3 className="text-gray-800 fw-bold" class="text-secondary-foreground">
                      No download history
                    </h3>

                    <p className="text-muted" class="text-secondary-foreground">
                      This backup has not been downloaded yet.
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="w-full align-middle caption-bottom text-left rtl:text-right text-foreground font-normal text-sm border-separate border-spacing-0 table-fixed">
                      <thead>
                        <tr className="bg-muted/40">
                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground border-b border-border w-[22%]">
                            Downloaded By
                          </th>

                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground border-b border-border w-[15%]">
                            IP Address
                          </th>

                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground border-b border-border w-[43%]">
                            User Agent
                          </th>

                          <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground border-b border-border w-[20%]">
                            Downloaded At
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {history.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-muted/40 border-b border-border transition-colors"
                          >
                            {/* Downloaded By */}
                            <td className="p-4 align-middle">
                              <div className="flex items-center gap-3">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                                  <Download className="size-4 text-primary" />
                                </div>

                                <span className="font-medium text-foreground">
                                  {item.downloadedBy || "-"}
                                </span>
                              </div>
                            </td>

                            {/* IP Address */}
                            <td className="p-4 align-middle">
                              <span className="font-mono text-sm text-muted-foreground">
                                {item.ipAddress || "-"}
                              </span>
                            </td>

                            {/* User Agent */}
                            <td className="p-4 align-middle">
                              <div
                                className="max-w-[450px] truncate text-sm text-muted-foreground"
                                title={item.userAgent || ""}
                              >
                                {item.userAgent || "-"}
                              </div>
                            </td>

                            {/* Downloaded At */}
                            <td className="p-4 align-middle">
                              <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {formatDate(item.downloadedAt)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Information */}
          <div className="card flex flex-col items-stretch text-card-foreground rounded-xl bg-card border border-border shadow-xs black/5">
            <div className="card-body flex items-center justify-between flex-wrap px-5 min-h-14 gap-2.5 border-b border-border py-5">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Upload className="size-5 text-muted-foreground" />
                </div>

                <div>
                  <h3 className="font-semibold text-mono">
                    Database Backup Information
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-secondary-foreground">
                    Backups are generated from the existing PostgreSQL database
                    using the application's Prisma connection. The backup is
                    stored as a compressed ZIP file. Restore operations use the
                    existing database tables and do not create new database
                    schema objects.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
