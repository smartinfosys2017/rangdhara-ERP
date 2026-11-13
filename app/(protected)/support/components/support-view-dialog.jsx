"use client";

import { useEffect, useState } from "react";

import {
  LoaderCircle,
  Mail,
  User,
  Building2,
  BriefcaseBusiness,
  Tag,
  MessageSquare,
  CalendarDays,
  Hash,
  UserRoundCheck,
  CircleDot,
  Wrench,
} from "lucide-react";

import { RiErrorWarningFill } from "@remixicon/react";

import { toast } from "sonner";

import { apiFetch } from "@/lib/api";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Separator } from "@/components/ui/separator";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

// =======================================================
// TOAST
// =======================================================

const showErrorToast = (message) => {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close
        className="min-w-[320px] max-w-[500px] shadow-lg"
        onClose={() => toast.dismiss(t)}
      >
        <AlertIcon>
          <RiErrorWarningFill className="size-5" />
        </AlertIcon>

        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    {
      position: "top-center",
      duration: 5000,
    },
  );
};

// =======================================================
// HELPERS
// =======================================================

const getId = (item) => {
  if (!item) {
    return "";
  }

  return (
    item.id ??
    item.value ??
    item.contactId ??
    item.departmentId ??
    item.serviceId ??
    item.projectId ??
    item.staffId ??
    ""
  );
};

const getName = (item, fallback = "-") => {
  if (!item) {
    return fallback;
  }

  return item.name ?? item.fullName ?? item.label ?? item.title ?? fallback;
};

const findById = (items, value) => {
  if (!Array.isArray(items) || !value) {
    return null;
  }

  return items.find((item) => String(getId(item)) === String(value)) || null;
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
};

const getPriorityLabel = (priority) => {
  switch (String(priority)) {
    case "1":
      return "Low";

    case "2":
      return "Medium";

    case "3":
      return "High";

    default:
      return "-";
  }
};

const getPriorityVariant = (priority) => {
  switch (String(priority)) {
    case "1":
      return "secondary";

    case "2":
      return "outline";

    case "3":
      return "destructive";

    default:
      return "outline";
  }
};

const getStatusVariant = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "open":
      return "success";

    case "pending":
      return "warning";

    case "closed":
      return "secondary";

    default:
      return "outline";
  }
};

const formatStatus = (status) => {
  if (!status) {
    return "-";
  }

  return String(status).charAt(0).toUpperCase() + String(status).slice(1);
};

const splitTags = (tags) => {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags;
  }

  return String(tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

// =======================================================
// INFO ITEM
// =======================================================

function InfoItem({ icon: Icon, label, value, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-4" />}

        <span>{label}</span>
      </div>

      <div className="text-sm font-medium">{children ?? value ?? "-"}</div>
    </div>
  );
}

// =======================================================
// SECTION
// =======================================================

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>

      {children}
    </div>
  );
}

// =======================================================
// VIEW DIALOG
// =======================================================

export default function SupportViewDialog({ open, closeDialog, support }) {
  // =====================================================
  // LOADING
  // =====================================================

  const [loading, setLoading] = useState(false);

  const [optionsLoading, setOptionsLoading] = useState(false);

  // =====================================================
  // TICKET
  // =====================================================

  const [ticket, setTicket] = useState(null);

  // =====================================================
  // OPTIONS
  // =====================================================

  const [contacts, setContacts] = useState([]);

  const [departments, setDepartments] = useState([]);

  const [staff, setStaff] = useState([]);

  const [services, setServices] = useState([]);

  const [projects, setProjects] = useState([]);

  // =====================================================
  // LOAD OPTIONS
  // =====================================================

  const loadOptions = async () => {
    try {
      setOptionsLoading(true);

      const [
        contactsResponse,
        departmentsResponse,
        staffResponse,
        servicesResponse,
        projectsResponse,
      ] = await Promise.all([
        apiFetch("/api/support/contacts", {
          method: "GET",
        }),

        apiFetch("/api/support/departments", {
          method: "GET",
        }),

        apiFetch("/api/support/staff", {
          method: "GET",
        }),

        apiFetch("/api/support/services", {
          method: "GET",
        }),

        apiFetch("/api/support/projects", {
          method: "GET",
        }),
      ]);

      const [
        contactsResult,
        departmentsResult,
        staffResult,
        servicesResult,
        projectsResult,
      ] = await Promise.all([
        contactsResponse.json(),
        departmentsResponse.json(),
        staffResponse.json(),
        servicesResponse.json(),
        projectsResponse.json(),
      ]);

      if (contactsResponse.ok && contactsResult?.success) {
        setContacts(
          Array.isArray(contactsResult.data) ? contactsResult.data : [],
        );
      }

      if (departmentsResponse.ok && departmentsResult?.success) {
        setDepartments(
          Array.isArray(departmentsResult.data) ? departmentsResult.data : [],
        );
      }

      if (staffResponse.ok && staffResult?.success) {
        setStaff(Array.isArray(staffResult.data) ? staffResult.data : []);
      }

      if (servicesResponse.ok && servicesResult?.success) {
        setServices(
          Array.isArray(servicesResult.data) ? servicesResult.data : [],
        );
      }

      if (projectsResponse.ok && projectsResult?.success) {
        setProjects(
          Array.isArray(projectsResult.data) ? projectsResult.data : [],
        );
      }
    } catch (error) {
      console.error("LOAD SUPPORT VIEW OPTIONS ERROR:", error);

      showErrorToast(error?.message || "Failed to load ticket options.");
    } finally {
      setOptionsLoading(false);
    }
  };

  // =====================================================
  // LOAD TICKET
  // =====================================================

  const loadTicket = async () => {
    if (!support?.id) {
      setTicket(null);
      return;
    }

    try {
      setLoading(true);

      setTicket(null);

      const response = await apiFetch(`/api/support?id=${support.id}`, {
        method: "GET",
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to load ticket.");
      }

      const ticketData = result?.data?.ticket || result?.data || null;

      if (!ticketData) {
        throw new Error("Ticket data was not returned.");
      }

      setTicket(ticketData);
    } catch (error) {
      console.error("LOAD SUPPORT TICKET ERROR:", error);

      setTicket(null);

      showErrorToast(error?.message || "Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD WHEN OPEN
  // =====================================================

  useEffect(() => {
    if (!open || !support?.id) {
      return;
    }

    loadOptions();
    loadTicket();
  }, [open, support?.id]);

  // =====================================================
  // LOOKUP VALUES
  // =====================================================

  const contact = findById(contacts, ticket?.contactId);

  const department = findById(departments, ticket?.department);

  const assignedUser = findById(staff, ticket?.assigned);

  const service = findById(services, ticket?.service);

  const project = findById(projects, ticket?.projectId);

  const tags = splitTags(ticket?.tags);

  // =====================================================
  // CONTACT DISPLAY
  // =====================================================

  const contactName = ticket?.name || getName(contact);

  const contactEmail = ticket?.email || contact?.email || "-";

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent
        className="
          max-h-[90vh]
          max-w-5xl
          overflow-y-auto
        "
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Ticket Details</span>

            {ticket?.ticketNumber && (
              <Badge variant="outline">{ticket.ticketNumber}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="flex min-h-[350px] items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-5 animate-spin" />
              Loading ticket...
            </div>
          </div>
        ) : !ticket ? (
          <div className="flex min-h-[250px] items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-medium">Ticket could not be loaded.</p>

              <p className="mt-1 text-xs text-muted-foreground">
                Please close this dialog and try again.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* =================================================
                TICKET HEADER
            ================================================= */}

            <div className="rounded-lg border bg-muted/20 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    Subject
                  </p>

                  <h2 className="mt-1 break-words text-xl font-semibold">
                    {ticket.subject || "-"}
                  </h2>

                  {ticket.ticketNumber && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {ticket.ticketNumber}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={getStatusVariant(ticket.status)}>
                    <CircleDot className="mr-1 size-3" />

                    {formatStatus(ticket.status)}
                  </Badge>

                  <Badge variant={getPriorityVariant(ticket.priority)}>
                    {getPriorityLabel(ticket.priority)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* =================================================
                TICKET INFORMATION
            ================================================= */}

            <Section title="Ticket Information">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* TICKET NUMBER */}

                <InfoItem
                  icon={Hash}
                  label="Ticket Number"
                  value={ticket.ticketNumber}
                />

                {/* STATUS */}

                <InfoItem icon={CircleDot} label="Status">
                  <Badge variant={getStatusVariant(ticket.status)}>
                    {formatStatus(ticket.status)}
                  </Badge>
                </InfoItem>

                {/* PRIORITY */}

                <InfoItem icon={CircleDot} label="Priority">
                  <Badge variant={getPriorityVariant(ticket.priority)}>
                    {getPriorityLabel(ticket.priority)}
                  </Badge>
                </InfoItem>

                {/* CREATED */}

                <InfoItem
                  icon={CalendarDays}
                  label="Created"
                  value={formatDate(ticket.createdAt)}
                />

                {/* UPDATED */}

                <InfoItem
                  icon={CalendarDays}
                  label="Last Updated"
                  value={formatDate(ticket.updatedAt)}
                />
              </div>
            </Section>

            <Separator />

            {/* =================================================
                CONTACT INFORMATION
            ================================================= */}

            <Section title="Contact Information">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* CONTACT */}

                <InfoItem icon={User} label="Contact" value={contactName} />

                {/* EMAIL */}

                <InfoItem icon={Mail} label="Email" value={contactEmail} />

                {/* CONTACT ID */}

                <InfoItem
                  icon={Hash}
                  label="Contact ID"
                  value={ticket.contactId}
                />

                {/* USER ID */}

                <InfoItem icon={User} label="User ID" value={ticket.userId} />

                {/* CC */}

                <InfoItem icon={Mail} label="CC" value={ticket.cc} />
              </div>
            </Section>

            <Separator />

            {/* =================================================
                ASSIGNMENT
            ================================================= */}

            <Section title="Assignment">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* DEPARTMENT */}

                <InfoItem
                  icon={Building2}
                  label="Department"
                  value={
                    department
                      ? getName(department)
                      : ticket.department
                        ? `Department ${ticket.department}`
                        : "-"
                  }
                />

                {/* ASSIGNED */}

                <InfoItem
                  icon={UserRoundCheck}
                  label="Assigned To"
                  value={
                    assignedUser
                      ? getName(assignedUser)
                      : ticket.assigned
                        ? `User ${ticket.assigned}`
                        : "-"
                  }
                />

                {/* SERVICE */}

                <InfoItem
                  icon={Wrench}
                  label="Service"
                  value={
                    service
                      ? getName(service)
                      : ticket.service
                        ? `Service ${ticket.service}`
                        : "-"
                  }
                />

                {/* PROJECT */}

                <InfoItem
                  icon={BriefcaseBusiness}
                  label="Project"
                  value={
                    project
                      ? getName(project)
                      : ticket.projectId
                        ? `Project ${ticket.projectId}`
                        : "-"
                  }
                />
              </div>
            </Section>

            <Separator />

            {/* =================================================
                TAGS
            ================================================= */}

            <Section title="Tags">
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag, index) => (
                    <Badge
                      key={`${tag}-${index}`}
                      variant="secondary"
                      className="gap-1"
                    >
                      <Tag className="size-3" />

                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tags added.</p>
              )}
            </Section>

            <Separator />

            {/* =================================================
                MESSAGE
            ================================================= */}

            <Section title="Ticket Message">
              <div className="rounded-lg border bg-muted/20 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="size-4" />
                  Message
                </div>

                <div className="whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                  {ticket.message || "No message available."}
                </div>
              </div>
            </Section>

            {/* =================================================
                CUSTOM FIELDS
            ================================================= */}

            {Array.isArray(ticket.customFields) &&
              ticket.customFields.length > 0 && (
                <>
                  <Separator />

                  <Section title="Custom Fields">
                    <div className="grid gap-4 md:grid-cols-2">
                      {ticket.customFields.map((field, index) => {
                        const fieldName =
                          field.name ??
                          field.label ??
                          field.key ??
                          `Field ${index + 1}`;

                        const fieldValue =
                          field.value ?? field.fieldValue ?? "";

                        return (
                          <div
                            key={field.id ?? field.key ?? index}
                            className="rounded-md border p-4"
                          >
                            <p className="text-xs font-medium text-muted-foreground">
                              {fieldName}
                            </p>

                            <p className="mt-1 break-words text-sm font-medium">
                              {fieldValue || "-"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                </>
              )}

            {/* =================================================
                LOADING LOOKUPS
            ================================================= */}

            {optionsLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LoaderCircle className="size-3 animate-spin" />
                Loading related information...
              </div>
            )}
          </div>
        )}

        {/* =================================================
            FOOTER
        ================================================= */}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={closeDialog}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
