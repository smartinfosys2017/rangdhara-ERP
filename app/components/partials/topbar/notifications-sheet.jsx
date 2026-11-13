"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import {
  Bell,
  Calendar,
  ClipboardCheck,
  DollarSign,
  FileText,
  MessageCircle,
  Settings,
  Settings2,
  Shield,
  Tablet,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ScrollArea } from "@/components/ui/scroll-area";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { CardNotification } from "@/partials/cards";

import Item1 from "./notifications/item-1";
import Item2 from "./notifications/item-2";
import Item3 from "./notifications/item-3";
import Item4 from "./notifications/item-4";
import Item5 from "./notifications/item-5";
import Item6 from "./notifications/item-6";
import Item10 from "./notifications/item-10";
import Item11 from "./notifications/item-11";
import Item13 from "./notifications/item-13";
import Item14 from "./notifications/item-14";
import Item15 from "./notifications/item-15";
import Item16 from "./notifications/item-16";
import Item17 from "./notifications/item-17";
import Item18 from "./notifications/item-18";
import Item19 from "./notifications/item-19";
import Item20 from "./notifications/item-20";

const iconMap = {
  task: Tablet,
  budget: DollarSign,
  invoice: FileText,
  feedback: MessageCircle,
  collaboration: Users,
  meeting: Calendar,
  custom_field: ClipboardCheck,
  general_settings: Settings,
  company_information: Users,
  customer_settings: Settings,
  customer: Users,
  contact: Users,
  department: Users,
};

export function NotificationsSheet({ trigger, onUnreadCountChange }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  /**
   * Get notifications from database.
   */
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message || result?.error || "Failed to fetch notifications.",
        );
      }

      const list = Array.isArray(result.notifications)
        ? result.notifications
        : [];

      setNotifications(list);

      const unread = list.filter(
        (notification) => notification?.isRead === false,
      ).length;

      setUnreadCount(unread);
      onUnreadCountChange?.(unread);
      // console.log(
      //   "[NOTIFICATIONS SHEET] Refreshed:",
      //   list.length,
      //   "notifications",
      // );
    } catch (error) {
      console.error("[NOTIFICATIONS SHEET GET ERROR]", error);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Initial notification load.
   */
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  /**
   * Refresh when another component in the
   * SAME browser context creates/receives
   * a notification.
   */
  useEffect(() => {
    const handleNotificationRefresh = () => {
      // console.log("[NOTIFICATIONS SHEET] Refresh event received");

      fetchNotifications();
    };

    const handleNotificationReceived = () => {
      // console.log("[NOTIFICATIONS SHEET] Received event");

      fetchNotifications();
    };

    window.addEventListener("notifications-refresh", handleNotificationRefresh);

    window.addEventListener(
      "notifications-received",
      handleNotificationReceived,
    );

    return () => {
      window.removeEventListener(
        "notifications-refresh",
        handleNotificationRefresh,
      );

      window.removeEventListener(
        "notifications-received",
        handleNotificationReceived,
      );
    };
  }, [fetchNotifications]);

  /**
   * Refresh when browser/tab becomes visible.
   */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
      //  console.log("[NOTIFICATIONS SHEET] Page visible - refreshing");

        fetchNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications]);

  /**
   * Refresh periodically while online.
   */
  useEffect(() => {
    if (typeof window === "undefined" || !navigator.onLine) {
      return;
    }

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
      //  console.log("[NOTIFICATIONS SHEET] Periodic refresh");

        fetchNotifications();
      }
    }, 3600000); // 1 hour = 60 * 60 * 1000 ms

    return () => {
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  /**
   * Refresh when browser comes back online.
   */
  useEffect(() => {
    const handleOnline = () => {
      // console.log("[NOTIFICATIONS SHEET] Browser online - refreshing");

      fetchNotifications();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [fetchNotifications]);

  /**
   * ==================================================
   * MARK SINGLE NOTIFICATION AS READ
   * ==================================================
   */
  const handleMarkAsRead = async (notificationId) => {
    if (!notificationId) {
      console.error("[NOTIFICATIONS] Missing notification ID");
      return false;
    }

    // Optimistic UI update
    let wasUnread = false;

    setNotifications((prev) =>
      prev.map((notification) => {
        if (notification.id === notificationId) {
          wasUnread = notification.isRead === false;

          return {
            ...notification,
            isRead: true,
          };
        }

        return notification;
      }),
    );

    if (wasUnread) {
      //setUnreadCount((prev) => Math.max(0, prev - 1));
      setUnreadCount((count) => {
        const newCount = Math.max(0, count - 1);

        onUnreadCountChange?.(newCount);

        return newCount;
      });
    }

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mark-read",
          id: notificationId,
        }),
        cache: "no-store",
      });

      const result = await response.json();

      console.log("[NOTIFICATIONS] Mark read response:", result);

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.message ||
            result?.error ||
            "Failed to mark notification as read.",
        );
      }

      return true;
    } catch (error) {
      console.error("[MARK NOTIFICATION AS READ ERROR]", error);

      // Roll UI back if API failed
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                isRead: false,
              }
            : notification,
        ),
      );

      if (wasUnread) {
        //setUnreadCount((prev) => prev + 1);
        setUnreadCount((count) => {
          const newCount = count + unreadNew;

          onUnreadCountChange?.(newCount);

          return newCount;
        });
      }

      return false;
    }
  };

  /**
   * Mark all notifications as read.
   */
  const handleMarkAllAsRead = async () => {
    if (markingRead) {
      return;
    }

    try {
      setMarkingRead(true);

      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mark-all-read",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message ||
            result?.error ||
            "Failed to mark notifications as read.",
        );
      }

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );

      setUnreadCount(0);

      window.dispatchEvent(new CustomEvent("notifications-refresh"));
    } catch (error) {
      console.error("[MARK ALL AS READ ERROR]", error);
    } finally {
      setMarkingRead(false);
    }
  };

  /**
   * Format notification date.
   */
  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    try {
      return new Date(date).toLocaleString();
    } catch {
      return "";
    }
  };
  const handleNotificationClick = async (event, notification) => {
    if (!notification?.id) {
      return;
    }

    // Mark notification as read
    if (notification.isRead === false) {
      await handleMarkAsRead(notification.id);
    }

    // If notification has a URL,
    // allow the anchor to open it normally.
  };
  /**
   * ==================================================
   * Dynamic notification item.
   *
   * Clicking an unread notification:
   * 1. Marks it as read.
   * 2. Updates the unread count.
   * 3. Opens notification.url in a new tab.
   * ==================================================
   */
  const renderNotification = (notification, index) => {
    const Icon = iconMap[notification?.module] || ClipboardCheck;

    const isUnread = notification?.isRead === false;

    const actionLabels = {
      created: "Created",
      updated: "Updated",
      deleted: "Deleted",
    };

    const actionLabel = actionLabels[notification?.action] || "Notification";

    const notificationContent = (
      <CardNotification
        icon={Icon}
        title={
          <div className="flex items-center gap-2">
            <span>{notification?.title || "Notification"}</span>

            {isUnread && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                Unread
              </span>
            )}
          </div>
        }
        description={
          <div className="flex flex-col gap-1">
            <span>{notification?.message || ""}</span>

            <span className="text-xs text-muted-foreground">{actionLabel}</span>
          </div>
        }
        actions={
          <div className="flex flex-col items-end gap-1">
            {isUnread && (
              <span className="text-xs font-medium text-primary">New</span>
            )}

            <span className="text-xs text-muted-foreground">
              {formatDate(notification?.createdAt)}
            </span>
          </div>
        }
      />
    );

    return (
      <div
        key={notification?.id || `${notification?.module}-${index}`}
        className={`relative ${isUnread ? "bg-muted/30" : ""}`}
      >
        {isUnread && (
          <span className="absolute left-2 top-6 z-10 h-2 w-2 rounded-full bg-primary" />
        )}

        {notification?.url ? (
          <a
            href={notification.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => handleNotificationClick(event, notification)}
            className="block cursor-pointer transition-colors hover:bg-muted/50"
          >
            {notificationContent}
          </a>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (notification?.isRead === false) {
                handleMarkAsRead(notification.id);
              }
            }}
            className="block w-full cursor-pointer text-left transition-colors hover:bg-muted/50"
          >
            {notificationContent}
          </button>
        )}

        {index < notifications.length - 1 && (
          <div className="border-b border-b-border" />
        )}
      </div>
    );
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" className="relative">
            <Bell className="h-5 w-5" />

            {unreadCount > 0 && (
              <span
                className="
                  absolute
                  -right-1
                  -top-1
                  flex
                  min-h-5
                  min-w-5
                  items-center
                  justify-center
                  rounded-full
                  bg-destructive
                  px-1
                  text-[10px]
                  font-semibold
                  text-destructive-foreground
                "
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        )}
      </SheetTrigger>

      <SheetContent
        className="
          p-0
          gap-0
          sm:w-[500px]
          sm:max-w-none
          inset-5
          start-auto
          h-auto
          rounded-lg
          [&_[data-slot=sheet-close]]:top-4.5
          [&_[data-slot=sheet-close]]:end-5
        "
      >
        <SheetHeader className="mb-0">
          <SheetTitle className="p-3">Notifications</SheetTitle>
        </SheetHeader>

        <SheetBody className="p-0">
          <ScrollArea className="h-[calc(100vh-10.5rem)]">
            <Tabs defaultValue="all" className="w-full relative">
              <TabsList variant="line" className="w-full px-5 mb-5">
                <TabsTrigger value="all">
                  <span className="flex items-center gap-2">
                    All
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </span>
                </TabsTrigger>

                {/* <TabsTrigger value="inbox" className="relative">
                  Inbox
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 absolute top-1 -end-1" />
                </TabsTrigger>

                <TabsTrigger value="team">Team</TabsTrigger>

                <TabsTrigger value="following">Following</TabsTrigger>

                <div className="grow flex items-center justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        mode="icon"
                        className="mb-1"
                      >
                        <Settings className="size-4.5!" />
                      </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                      className="w-44"
                      side="bottom"
                      align="end"
                    >
                      <DropdownMenuItem asChild>
                        <Link href="/account/members/teams">
                          <Users />
                          Invite Users
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Settings2 />
                          <span>Team Settings</span>
                        </DropdownMenuSubTrigger>

                        <DropdownMenuPortal>
                          <DropdownMenuSubContent className="w-44">
                            <DropdownMenuItem asChild>
                              <Link href="/account/members/import-members">
                                <Shield />
                                Find Members
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                              <Link href="/account/members/import-members">
                                <Calendar />
                                Meetings
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                              <Link href="/account/members/import-members">
                                <Shield />
                                Group Settings
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuPortal>
                      </DropdownMenuSub>

                      <DropdownMenuItem asChild>
                        <Link href="/account/security/privacy-settings">
                          <Shield />
                          Group Settings
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div> */}
              </TabsList>

              {/* ALL */}
              <TabsContent value="all" className="mt-0">
                <div className="flex flex-col gap-0">
                  {loading ? (
                    <div className="p-5 text-sm text-muted-foreground">
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-5 text-sm text-muted-foreground">
                      No notifications found.
                    </div>
                  ) : (
                    notifications.map(renderNotification)
                  )}
                </div>
              </TabsContent>

              {/* INBOX */}
              <TabsContent value="inbox" className="mt-0">
                <div className="flex flex-col gap-5">
                  <Item13 />

                  <div className="border-b border-b-border" />

                  <Item14 />

                  <div className="border-b border-b-border" />

                  <Item15 />

                  <div className="border-b border-b-border" />

                  <Item16 />

                  <div className="border-b border-b-border" />

                  <Item3
                    userName="Benjamin Harris"
                    avatar="300-30.png"
                    badgeColor="offline"
                    description="requested to upgrade plan"
                    link=""
                    day=""
                    date="4 days ago"
                    info="Marketing"
                  />

                  <div className="border-b border-b-border" />

                  <Item5
                    userName="Isaac Morgan"
                    avatar="300-24.png"
                    badgeColor="online"
                    description="mentioned you in"
                    link="Data Transmission"
                    day="topic"
                    date="6 days ago"
                    info="Dev Team"
                  />
                </div>
              </TabsContent>

              {/* TEAM */}
              <TabsContent value="team" className="mt-0">
                <div className="flex flex-col gap-5">
                  <Item10 />

                  <div className="border-b border-b-border" />

                  <Item5
                    userName="Adrian Vale"
                    avatar="300-6.png"
                    badgeColor="offline"
                    description="posted a new article"
                    link="Marketing"
                    day="to 13 May"
                    date="2 days ago"
                    info="Marketing"
                  />

                  <div className="border-b border-b-border" />

                  <Item11 />

                  <div className="border-b border-b-border" />

                  <Item1
                    userName="Selene Silverleaf"
                    avatar="300-21.png"
                    description="commented on"
                    link="SiteSculpt"
                    label=""
                    time="4 days ago"
                    specialist="Manager"
                    text="This design is simply stunning! From layout to color, it's a work of art."
                  />

                  <div className="border-b border-b-border" />

                  <Item3
                    userName="Thalia Fox"
                    avatar="300-13.png"
                    badgeColor="online"
                    description="has invited you to join"
                    link="Design Research"
                    day=""
                    date="4 days ago"
                    info="Dev Team"
                  />
                </div>
              </TabsContent>

              {/* FOLLOWING */}
              <TabsContent value="following" className="mt-0">
                <div className="flex flex-col gap-5">
                  <Item18 />

                  <div className="border-b border-b-border" />

                  <Item17 />

                  <div className="border-b border-b-border" />

                  <Item19 />

                  <div className="border-b border-b-border" />

                  <Item5
                    userName="Chloe Morgan"
                    avatar="300-34.png"
                    badgeColor="online"
                    description="posted a new article"
                    link="User Experience"
                    day=""
                    date="1 day ago"
                    info="Nexus"
                  />

                  <div className="border-b border-b-border" />

                  <Item20 />

                  <div className="border-b border-b-border" />

                  <Item3
                    userName="Thalia Fox"
                    avatar="300-13.png"
                    badgeColor="offline"
                    description="has invited you to join"
                    link="Design Research"
                    day=""
                    date="4 days ago"
                    info="Dev Team"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </SheetBody>

        <SheetFooter className="border-t border-border p-5 grid grid-cols-2 gap-2.5">
          <Button variant="outline">Archive all</Button>

          <Button
            variant="outline"
            onClick={handleMarkAllAsRead}
            disabled={markingRead || unreadCount === 0}
          >
            {markingRead ? "Marking..." : "Mark all as read"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
