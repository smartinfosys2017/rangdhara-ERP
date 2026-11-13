"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import {
  LayoutDashboard,
  ListTodo,
  Clock3,
  Milestone,
  Folder,
  MessageSquare,
  GanttChart,
  Ticket,
  FileSignature,
  StickyNote,
  Activity,
} from "lucide-react";

export default function ProjectLayout({ children }) {
  const { id } = useParams();
  const pathname = usePathname();

  /*
   * ---------------------------------------------------------
   * Project Tabs
   * ---------------------------------------------------------
   */

  const navRoutes = useMemo(
    () => ({
      overview: {
        title: "Overview",
        icon: LayoutDashboard,
        path: `/project/${id}`,
      },

      tasks: {
        title: "Tasks",
        icon: ListTodo,
        path: `/project/${id}/tasks`,
      },

      timesheets: {
        title: "Timesheets",
        icon: Clock3,
        path: `/project/${id}/timesheets`,
      },

      milestones: {
        title: "Milestones",
        icon: Milestone,
        path: `/project/${id}/milestones`,
      },

      files: {
        title: "Files",
        icon: Folder,
        path: `/project/${id}/files`,
      },

      discussions: {
        title: "Discussions",
        icon: MessageSquare,
        path: `/project/${id}/discussions`,
      },

      gantt: {
        title: "Gantt",
        icon: GanttChart,
        path: `/project/${id}/gantt`,
      },

      tickets: {
        title: "Tickets",
        icon: Ticket,
        path: `/project/${id}/tickets`,
      },

      contracts: {
        title: "Contracts",
        icon: FileSignature,
        path: `/project/${id}/contracts`,
      },

      notes: {
        title: "Notes",
        icon: StickyNote,
        path: `/project/${id}/notes`,
      },

      activity: {
        title: "Activity",
        icon: Activity,
        path: `/project/${id}/activity`,
      },
    }),
    [id]
  );

  /*
   * ---------------------------------------------------------
   * Active Tab
   * ---------------------------------------------------------
   */

  const activeTab =
    Object.entries(navRoutes).find(
      ([, route]) => route.path === pathname
    )?.[0] || "overview";

  return (
    <div className="space-y-5">

      {/* ===================================================== */}
      {/* PROJECT TABS */}
      {/* ===================================================== */}

      <div className="rounded-xl border bg-background">

        <div className="overflow-x-auto">

          <nav className="flex min-w-max px-2">

            {Object.entries(navRoutes).map(
              ([key, route]) => {
                const Icon = route.icon;

                const isActive = activeTab === key;

                return (
                  <Link
                    key={key}
                    href={route.path}
                    className={`
                      flex
                      items-center
                      gap-2
                      border-b-2
                      px-4
                      py-3
                      text-sm
                      font-medium
                      transition-colors
                      ${
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="size-4" />

                    <span>
                      {route.title}
                    </span>
                  </Link>
                );
              }
            )}

          </nav>

        </div>

      </div>

      {/* ===================================================== */}
      {/* PAGE CONTENT */}
      {/* ===================================================== */}

      <main>
        {children}
      </main>

    </div>
  );
}