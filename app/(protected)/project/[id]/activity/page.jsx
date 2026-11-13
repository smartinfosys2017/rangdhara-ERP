"use client";

import { useState } from "react";
import { Container } from "@/components/common/container";
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from "@/components/common/toolbar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  MessageSquare,
  Upload,
  Milestone,
  Receipt,
  Users,
  FolderPlus,
} from "lucide-react";

const activities = [
  {
    id: 6,
    time: "2 hrs ago",
    date: "2026-09-08 13:56:53",
    action: "Created discussion",
    description: "Welcome aboard",
    icon: MessageSquare,
    visible: true,
  },
  {
    id: 5,
    time: "2 hrs ago",
    date: "2026-09-08 13:53:36",
    action: "Uploaded project file",
    description: "a14a9ef73baa6e0a7407a16d9268115e.jpg",
    icon: Upload,
    visible: false,
  },
  {
    id: 4,
    time: "2 hrs ago",
    date: "2026-09-08 13:51:14",
    action: "Created new milestone",
    description: "Smart Test",
    icon: Milestone,
    visible: true,
  },
  {
    id: 3,
    time: "4 days ago",
    date: "2026-09-04 10:09:30",
    action: "Recorded Expense",
    description: "Smart Test",
    icon: Receipt,
    visible: true,
  },
  {
    id: 1,
    time: "4 days ago",
    date: "2026-09-04 09:11:15",
    action: "Added new team member",
    description: "Rang Dhara",
    icon: Users,
    visible: true,
  },
  {
    id: 2,
    time: "4 days ago",
    date: "2026-09-04 09:11:15",
    action: "Created the project",
    description: "",
    icon: FolderPlus,
    visible: true,
  },
];

export default function ActivityPage() {
  const [activitiesState, setActivitiesState] = useState(activities);

  const handleVisibilityChange = (id, checked) => {
    setActivitiesState((current) =>
      current.map((activity) =>
        activity.id === id
          ? { ...activity, visible: checked }
          : activity
      )
    );
  };

  return (
    <Container>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>Activity</ToolbarTitle>
        </ToolbarHeading>

        <ToolbarActions />
      </Toolbar>

      <div className="rounded-xl border bg-background">
        <div className="divide-y">
          {activitiesState.map((activity) => {
            const Icon = activity.icon;

            return (
              <div
                key={activity.id}
                className="p-5 transition-colors hover:bg-muted/20"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  {/* Activity Content */}
                  <div className="flex min-w-0 gap-4">
                    {/* Icon */}
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Icon className="size-4 text-muted-foreground" />
                    </div>

                    <div className="min-w-0">
                      {/* Date */}
                      <div
                        className="mb-2 text-xs text-muted-foreground"
                        title={activity.date}
                      >
                        {activity.time}
                      </div>

                      {/* User + Action */}
                      <p className="text-sm">
                        <span className="font-semibold">
                          Rang Dhara
                        </span>{" "}
                        -{" "}
                        <span className="font-semibold">
                          {activity.action}
                        </span>
                      </p>

                      {/* Description */}
                      {activity.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Visibility */}
                  <div className="flex shrink-0 items-center gap-3 lg:min-w-[180px] lg:justify-end">
                    <span className="text-sm text-muted-foreground">
                      Visible to customer
                    </span>

                    <Switch
                      checked={activity.visible}
                      onCheckedChange={(checked) =>
                        handleVisibilityChange(activity.id, checked)
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Container>
  );
}