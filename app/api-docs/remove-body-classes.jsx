"use client";

import { useEffect } from "react";

export default function RemoveBodyClasses() {
  useEffect(() => {
    const body = document.body;

    body.classList.remove(
      "antialiased",
      "flex",
      "h-full",
      "text-base",
      "text-foreground",
      "bg-background"
    );

    return () => {
      // Optional: restore classes when leaving API docs
      body.classList.add(
        "antialiased",
        "flex",
        "h-full",
        "text-base",
        "text-foreground",
        "bg-background"
      );
    };
  }, []);

  return null;
}