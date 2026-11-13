"use client";

import {
  Container,
} from "@/components/common/container";

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from "@/components/common/toolbar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Plus,
  Ticket,
} from "lucide-react";

const tickets = [
  {
    id: 101,
    subject: "Website Design Changes",
    tags: "Design, UI",
    department: "Development",
    service: "Website Development",
    contact: "Rang Dhara",
    status: "Open",
    priority: "High",
    lastReply: "Sep 08, 2026 10:30 AM",
    created: "Sep 08, 2026 09:15 AM",
  },
  {
    id: 102,
    subject: "Login Issue",
    tags: "Bug, Login",
    department: "Support",
    service: "Technical Support",
    contact: "John Doe",
    status: "In Progress",
    priority: "Medium",
    lastReply: "Sep 07, 2026 04:20 PM",
    created: "Sep 07, 2026 02:10 PM",
  },
  {
    id: 103,
    subject: "Mobile Responsive Issue",
    tags: "Mobile, CSS",
    department: "Development",
    service: "Frontend Development",
    contact: "Jane Smith",
    status: "Closed",
    priority: "Low",
    lastReply: "Sep 06, 2026 03:45 PM",
    created: "Sep 05, 2026 11:30 AM",
  },
];

function getStatusVariant(status) {
  switch (status) {
    case "Open":
      return "default";
    case "In Progress":
      return "secondary";
    case "Closed":
      return "outline";
    default:
      return "outline";
  }
}

function getPriorityVariant(priority) {
  switch (priority) {
    case "High":
      return "destructive";
    case "Medium":
      return "secondary";
    case "Low":
      return "outline";
    default:
      return "outline";
  }
}

export default function TicketsPage() {
  return (
    <Container>
      <Toolbar>
        <ToolbarHeading>
          <ToolbarTitle>Tickets</ToolbarTitle>
        </ToolbarHeading>

        <ToolbarActions>
          <Button>
            <Plus className="mr-2 size-4" />
            New Ticket
          </Button>
        </ToolbarActions>
      </Toolbar>

      <div className="rounded-xl border bg-background">
        {/* Desktop Table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">
                  Subject
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Tags
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Department
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Service
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Contact
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Priority
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Last Reply
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Created
                </th>
              </tr>
            </thead>

            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-4 font-medium">
                    {ticket.id}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Ticket className="size-4 text-muted-foreground" />
                      <span className="font-medium">
                        {ticket.subject}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <span className="text-muted-foreground">
                      {ticket.tags}
                    </span>
                  </td>

                  <td className="px-4 py-4">
                    {ticket.department}
                  </td>

                  <td className="px-4 py-4">
                    {ticket.service}
                  </td>

                  <td className="px-4 py-4">
                    {ticket.contact}
                  </td>

                  <td className="px-4 py-4">
                    <Badge variant={getStatusVariant(ticket.status)}>
                      {ticket.status}
                    </Badge>
                  </td>

                  <td className="px-4 py-4">
                    <Badge
                      variant={getPriorityVariant(ticket.priority)}
                    >
                      {ticket.priority}
                    </Badge>
                  </td>

                  <td className="px-4 py-4 text-muted-foreground">
                    {ticket.lastReply}
                  </td>

                  <td className="px-4 py-4 text-muted-foreground">
                    {ticket.created}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-3 p-4 md:hidden">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="rounded-lg border p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Ticket className="size-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      #{ticket.id}
                    </span>
                  </div>

                  <h3 className="font-medium">
                    {ticket.subject}
                  </h3>
                </div>

                <Badge variant={getStatusVariant(ticket.status)}>
                  {ticket.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Tags
                  </p>
                  <p>{ticket.tags}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Department
                  </p>
                  <p>{ticket.department}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Service
                  </p>
                  <p>{ticket.service}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Contact
                  </p>
                  <p>{ticket.contact}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Priority
                  </p>
                  <Badge
                    variant={getPriorityVariant(ticket.priority)}
                  >
                    {ticket.priority}
                  </Badge>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Last Reply
                  </p>
                  <p>{ticket.lastReply}</p>
                </div>

                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground">
                    Created
                  </p>
                  <p>{ticket.created}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}