"use client";

import { useEffect, useState } from "react";

import { NotificationsSheet } from "@/partials/topbar/notifications-sheet";
import { UserDropdownMenu } from "@/partials/topbar/user-dropdown-menu";

import { MessageSquareDot } from "lucide-react";

import { toAbsoluteUrl } from "@/lib/helpers";
import { Button } from "@/components/ui/button";

export function SidebarFooter() {
  const [notificationCount, setNotificationCount] = useState(0);

  const [profilePhoto, setProfilePhoto] = useState(
    toAbsoluteUrl("/media/avatars/300-2.png"),
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProfilePhoto() {
      try {
        const response = await fetch("/api/user-details", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        const photo =
          data?.profilePhoto ||
          data?.userDetails?.profilePhoto ||
          data?.data?.profilePhoto ||
          data?.userDetails?.data?.profilePhoto ||
          "";

        if (isMounted && photo) {
          setProfilePhoto(photo);
        }
      } catch (error) {
        console.error("Failed to load profile photo:", error);
      }
    }

    loadProfilePhoto();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-center justify-between shrink-0 ps-4 pe-3.5 h-14">
      <UserDropdownMenu
        trigger={
          <img
            key={profilePhoto}
            className="size-9 rounded-full border-2 border-secondary shrink-0 cursor-pointer object-cover"
            src={profilePhoto}
            alt="User Avatar"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = toAbsoluteUrl(
                "/media/avatars/300-2.png",
              );
            }}
          />
        }
      />

      <div className="flex flex-center gap-1.5">
        <NotificationsSheet
          onUnreadCountChange={setNotificationCount}
          trigger={
            <Button
              variant="ghost"
              mode="icon"
              className="relative hover:bg-background hover:[&_svg]:text-primary"
            >
              <MessageSquareDot className="size-4.5!" />

              {notificationCount > 0 && (
                <span
                  className="
                    absolute
                    -top-0.5
                    -right-0.5
                    min-w-4
                    h-4
                    px-1
                    rounded-full
                    bg-destructive
                    text-white
                    text-[15px]
                    font-semibold
                    leading-4
                    text-center
                    border
                    border-background
                  "
                >
                  {notificationCount > 99 ? "99+" : notificationCount}
                </span>
              )}
            </Button>
          }
        />

        {/* ChatSheet can be enabled here if required. */}
      </div>
    </div>
  );
}