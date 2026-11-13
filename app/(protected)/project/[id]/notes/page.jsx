"use client";

import { Container } from "@/components/common/container";
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from "@/components/common/toolbar";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Plus,
  StickyNote,
} from "lucide-react";

const notes = [
  {
    id: 1,
    title: "Project Requirements",
    content:
      "Client has requested a modern and responsive website with a clean dashboard interface.",
    dateAdded: "Sep 08, 2026 10:30 AM",
  },
  {
    id: 2,
    title: "Design Feedback",
    content:
      "Update the homepage layout, improve spacing, and adjust the mobile responsive sections.",
    dateAdded: "Sep 07, 2026 03:45 PM",
  },
  {
    id: 3,
    title: "Final Review",
    content:
      "Complete testing and review all project pages before the final delivery to the customer.",
    dateAdded: "Sep 06, 2026 11:15 AM",
  },
];

export default function NotesPage() {
  return (
    <Container>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>Notes</ToolbarTitle>
        </ToolbarHeading>

        <ToolbarActions>
          <Button>
            <Plus className="mr-2 size-4" />
            New Note
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="rounded-xl border bg-background">
        {/* Desktop Table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">
                  Note Title
                </th>

                <th className="w-[40%] px-4 py-3 text-left font-medium">
                  Note Content
                </th>

                <th className="px-4 py-3 text-left font-medium">
                  Date Added
                </th>

                <th className="w-16 px-4 py-3 text-center font-medium">
                  Options
                </th>
              </tr>
            </thead>

            <tbody>
              {notes.map((note) => (
                <tr
                  key={note.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <StickyNote className="size-4 text-muted-foreground" />

                      <span className="font-medium">
                        {note.title}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-muted-foreground">
                    <div className="max-w-xl">
                      {note.content}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-muted-foreground">
                    {note.dateAdded}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 p-4 md:hidden">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <StickyNote className="size-4 text-muted-foreground" />

                  <h3 className="font-medium">
                    {note.title}
                  </h3>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              </div>

              <p className="mb-4 text-sm text-muted-foreground">
                {note.content}
              </p>

              <div>
                <p className="text-xs text-muted-foreground">
                  Date Added
                </p>

                <p className="text-sm">
                  {note.dateAdded}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}