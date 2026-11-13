"use client";

import { useEffect, useMemo, useState } from "react";
import { RiBankLine, RiStore2Line } from "@remixicon/react";
import { Badge, BadgeDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const GROUP_COLORS = [
  "bg-green-500",
  "bg-destructive",
  "bg-violet-500",
  "bg-blue-500",
  "bg-orange-500",
];

function toNumber(value) {
  if (value === null || value === undefined || value === "") return 0;

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
  }).format(value);
}

const Highlights = ({ limit = 5 }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadInventory() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/inventory/invnetory-register", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load inventory data.");
        }

        setInventory(Array.isArray(result.data) ? result.data : []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message || "Unable to load inventory data.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadInventory();

    return () => controller.abort();
  }, []);

  const summary = useMemo(() => {
    const totalItems = inventory.length;

    const totalStock = inventory.reduce(
      (sum, item) => sum + toNumber(item.Balance),
      0,
    );

    const lowStockItems = inventory.filter((item) => {
      const balance = toNumber(item.Balance);
      const rawLevel = item.RestockLevel;

      // RestockLevel can fall back to a boolean in the current API.
      // Only compare when the threshold is actually numeric.
      if (
        rawLevel === null ||
        rawLevel === undefined ||
        rawLevel === "" ||
        typeof rawLevel === "boolean"
      ) {
        return false;
      }

      const threshold = Number(rawLevel);

      return (
        Number.isFinite(threshold) && threshold > 0 && balance <= threshold
      );
    }).length;

    return { totalItems, totalStock, lowStockItems };
  }, [inventory]);

  const groups = useMemo(() => {
    const groupMap = new Map();

    inventory.forEach((item) => {
      const name = item.GroupName || "Uncategorized";

      if (!groupMap.has(name)) {
        groupMap.set(name, {
          name,
          itemCount: 0,
          stock: 0,
        });
      }

      const group = groupMap.get(name);

      group.itemCount += 1;
      group.stock += toNumber(item.Balance);
    });

    return Array.from(groupMap.values())
      .sort((a, b) => b.itemCount - a.itemCount)
      .map((group) => ({
        ...group,
        percentage: summary.totalItems
          ? (group.itemCount / summary.totalItems) * 100
          : 0,
      }));
  }, [inventory, summary.totalItems]);

  const visibleGroups = groups.slice(0, Math.max(0, Number(limit) || 0));

  const visiblePercentage = visibleGroups.reduce(
    (sum, group) => sum + group.percentage,
    0,
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Inventory Highlights</CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 p-5 lg:p-7.5 lg:pt-4">
        {loading ? (
          <div className="flex min-h-40 items-center justify-center gap-3">
            <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">
              Loading inventory...
            </span>
          </div>
        ) : error ? (
          <div className="flex flex-col gap-3 py-6">
            <p className="text-sm text-destructive">{error}</p>

            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Inventory summary */}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-normal text-secondary-foreground">
                Total inventory items
              </span>

              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-3xl font-semibold text-mono">
                  {formatNumber(summary.totalItems)}
                </span>

                <Badge size="sm" variant="success" appearance="light">
                  Live data
                </Badge>
              </div>
            </div>

            {/* Inventory distribution bar */}
            <div
              className="flex h-2 w-full gap-1 overflow-hidden rounded-xs"
              aria-label="Inventory distribution by item group"
            >
              {visibleGroups.length > 0 ? (
                visibleGroups.map((group, index) => (
                  <div
                    key={group.name}
                    className={`${GROUP_COLORS[index % GROUP_COLORS.length]} h-full`}
                    style={{
                      width: `${group.percentage}%`,
                    }}
                    title={`${group.name}: ${group.percentage.toFixed(1)}%`}
                  />
                ))
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
            </div>

            {/* Group legend */}
            <div className="flex flex-wrap items-center gap-3">
              {visibleGroups.map((group, index) => (
                <div key={group.name} className="flex items-center gap-1.5">
                  <BadgeDot
                    className={GROUP_COLORS[index % GROUP_COLORS.length]}
                  />
                  <span className="text-sm text-foreground">{group.name}</span>
                </div>
              ))}
            </div>

            <div className="border-b border-input" />

            {/* Inventory metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-input p-3">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <RiStore2Line className="size-4" />
                  Total stock
                </div>

                <div className="text-xl font-semibold text-mono">
                  {formatNumber(summary.totalStock)}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  Units recorded in inventory
                </div>
              </div>

              <div className="rounded-lg border border-input p-3">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <RiBankLine className="size-4" />
                  Low stock
                </div>

                <div className="text-xl font-semibold text-mono">
                  {formatNumber(summary.lowStockItems)}
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  Items at or below restock level
                </div>
              </div>
            </div>

            <div className="border-b border-input" />

            {/* Item group breakdown */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground">
                Items by group
              </span>

              <span className="text-xs text-muted-foreground">
                {groups.length} groups
              </span>
            </div>

            {groups.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No inventory records found.
              </p>
            ) : (
              <div className="grid gap-3">
                {visibleGroups.map((group, index) => (
                  <div
                    key={group.name}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${GROUP_COLORS[index % GROUP_COLORS.length]} bg-opacity-10`}
                      >
                        <RiStore2Line className="size-4" />
                      </span>

                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-foreground">
                          {group.name}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {formatNumber(group.stock)} stock units
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-semibold text-foreground">
                        {formatNumber(group.itemCount)}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        {group.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}

                {groups.length > visibleGroups.length && (
                  <p className="text-xs text-muted-foreground">
                    Showing {visibleGroups.length} of {groups.length} groups.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export { Highlights };
