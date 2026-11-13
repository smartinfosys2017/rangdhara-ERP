"use client";

import { useEffect, useState } from "react";

import { LoaderCircle, Plus, X } from "lucide-react";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { toast } from "sonner";

import { apiFetch } from "@/lib/api";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Label } from "@/components/ui/label";

import { Textarea } from "@/components/ui/textarea";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

// =======================================================
// TOAST
// =======================================================

const showSuccessToast = (message) => {
  toast.custom(
    () => (
      <Alert
        variant="mono"
        icon="success"
        className="min-w-[320px] max-w-[500px] shadow-lg"
      >
        <AlertIcon>
          <RiCheckboxCircleFill className="size-5" />
        </AlertIcon>

        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    {
      position: "top-center",
      duration: 4000,
    },
  );
};

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
// DEFAULT FORM
// =======================================================

const getDefaultForm = () => ({
  subject: "",

  contactId: "",
  userId: "",

  name: "",
  email: "",

  department: "",

  cc: "",

  tags: "",

  assigned: "",

  priority: "2",

  service: "",

  projectId: "",

  message: "",

  attachments: [],
});

// =======================================================
// PRIORITIES
// =======================================================

const priorities = [
  {
    value: "1",
    label: "Low",
  },
  {
    value: "2",
    label: "Medium",
  },
  {
    value: "3",
    label: "High",
  },
];

// =======================================================
// SUPPORT ADD DIALOG
// =======================================================

export default function SupportAddDialog({ open, closeDialog, onSuccess }) {
  // =====================================================
  // LOADING
  // =====================================================

  const [loading, setLoading] = useState(false);

  const [optionsLoading, setOptionsLoading] = useState(false);

  // =====================================================
  // FORM
  // =====================================================

  const [form, setForm] = useState(getDefaultForm());

  // =====================================================
  // OPTIONS
  // =====================================================

  const [contacts, setContacts] = useState([]);

  const [departments, setDepartments] = useState([]);

  const [staff, setStaff] = useState([]);

  const [services, setServices] = useState([]);

  const [projects, setProjects] = useState([]);

  // =====================================================
  // UPDATE FIELD
  // =====================================================

  const update = (key) => (event) => {
    setForm((previous) => ({
      ...previous,

      [key]: event.target.value,
    }));
  };

  // =====================================================
  // CONTACT CHANGE
  // =====================================================

  const handleContactChange = (event) => {
    const contactId = event.target.value;

    const selectedContact = contacts.find(
      (contact) =>
        String(contact.id ?? contact.contactId ?? contact.value) ===
        String(contactId),
    );

    setForm((previous) => ({
      ...previous,

      contactId,

      userId:
        selectedContact?.userid ??
        selectedContact?.userId ??
        selectedContact?.customerId ??
        "",

      name: selectedContact?.name ?? selectedContact?.fullName ?? "",

      email: selectedContact?.email ?? "",
    }));
  };

  // =====================================================
  // FILE CHANGE
  // =====================================================

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (!selectedFiles.length) {
      return;
    }

    const currentFiles = Array.isArray(form.attachments)
      ? form.attachments
      : [];

    const combinedFiles = [...currentFiles, ...selectedFiles];

    if (combinedFiles.length > 4) {
      showErrorToast("You can upload a maximum of 4 attachments.");

      setForm((previous) => ({
        ...previous,

        attachments: combinedFiles.slice(0, 4),
      }));

      event.target.value = "";

      return;
    }

    setForm((previous) => ({
      ...previous,

      attachments: combinedFiles,
    }));

    event.target.value = "";
  };

  // =====================================================
  // REMOVE FILE
  // =====================================================

  const removeAttachment = (index) => {
    setForm((previous) => ({
      ...previous,

      attachments: previous.attachments.filter(
        (_, fileIndex) => fileIndex !== index,
      ),
    }));
  };

  // =====================================================
  // LOAD SUPPORT OPTIONS
  // =====================================================

  const loadOptions = async () => {
    try {
      setOptionsLoading(true);

      /*
       * These endpoints should return:
       *
       * contacts
       * departments
       * staff
       * services
       * projects
       *
       * If your existing API uses different endpoint
       * names, only change the URLs below.
       */

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
      console.error("LOAD SUPPORT OPTIONS ERROR:", error);

      showErrorToast(error?.message || "Failed to load ticket options.");
    } finally {
      setOptionsLoading(false);
    }
  };

  // =====================================================
  // LOAD WHEN DIALOG OPENS
  // =====================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    loadOptions();
  }, [open]);

  // =====================================================
  // RESET
  // =====================================================

  const resetForm = () => {
    setForm(getDefaultForm());
  };

  // =====================================================
  // VALIDATION
  // =====================================================

  const validateForm = () => {
    if (!form.subject.trim()) {
      showErrorToast("Subject is required.");

      return false;
    }

    if (!form.contactId) {
      showErrorToast("Contact is required.");

      return false;
    }

    if (!form.department) {
      showErrorToast("Department is required.");

      return false;
    }

    if (!form.message.trim()) {
      showErrorToast("Ticket message is required.");

      return false;
    }

    if (form.attachments.length > 4) {
      showErrorToast("You can upload a maximum of 4 attachments.");

      return false;
    }

    return true;
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // -------------------------------------------------
      // FORMDATA
      // -------------------------------------------------

      const formData = new FormData();

      formData.append("subject", form.subject.trim());

      formData.append("contactid", form.contactId);

      formData.append("userid", form.userId || "");

      formData.append("name", form.name || "");

      formData.append("email", form.email || "");

      formData.append("department", form.department);

      formData.append("cc", form.cc.trim());

      formData.append("tags", form.tags.trim());

      formData.append("assigned", form.assigned || "");

      formData.append("priority", form.priority);

      formData.append("service", form.service || "");

      formData.append("project_id", form.projectId || "");

      formData.append("message", form.message.trim());

      // -------------------------------------------------
      // ATTACHMENTS
      // -------------------------------------------------

      form.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });

      // -------------------------------------------------
      // CREATE TICKET
      // -------------------------------------------------

      /*
       * Important:
       *
       * Do NOT set Content-Type manually.
       * Browser will automatically create:
       *
       * multipart/form-data;
       * boundary=...
       */

      const response = await apiFetch("/api/support", {
        method: "POST",

        body: formData,
      });

      const result = await response.json();

      // -------------------------------------------------
      // ERROR
      // -------------------------------------------------

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to create ticket.");
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      showSuccessToast(result?.message || "Ticket created successfully.");

      // -------------------------------------------------
      // RESET
      // -------------------------------------------------

      resetForm();

      // -------------------------------------------------
      // CALLBACK
      // -------------------------------------------------

      onSuccess?.(result?.data || result);
    } catch (error) {
      console.error("CREATE SUPPORT TICKET ERROR:", error);

      showErrorToast(error?.message || "Failed to create ticket.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value && !loading) {
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
          <DialogTitle>Add Ticket</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-8"
          encType="multipart/form-data"
        >
          {/* =================================================
              TICKET INFORMATION
          ================================================= */}

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Ticket Information</h3>

              <p className="text-sm text-muted-foreground">
                Enter the basic information for the support ticket.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* SUBJECT */}

              <div className="space-y-2 md:col-span-2">
                <Label>
                  Subject
                  <span className="ml-1 text-destructive">*</span>
                </Label>

                <Input
                  value={form.subject}
                  onChange={update("subject")}
                  disabled={loading}
                  placeholder="Ticket subject"
                />
              </div>

              {/* CONTACT */}

              <div className="space-y-2">
                <Label>
                  Contact
                  <span className="ml-1 text-destructive">*</span>
                </Label>

                <select
                  value={form.contactId}
                  onChange={handleContactChange}
                  disabled={loading || optionsLoading}
                  className="
                    flex h-10 w-full
                    rounded-md
                    border border-input
                    bg-background
                    px-3 py-2
                    text-sm
                  "
                >
                  <option value="">Select Contact</option>

                  {contacts.map((contact) => {
                    const id = contact.id ?? contact.contactId ?? contact.value;

                    const name =
                      contact.name ??
                      contact.fullName ??
                      contact.label ??
                      `Contact ${id}`;

                    const email = contact.email ? ` - ${contact.email}` : "";

                    return (
                      <option key={id} value={id}>
                        {name}
                        {email}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* DEPARTMENT */}

              <div className="space-y-2">
                <Label>
                  Department
                  <span className="ml-1 text-destructive">*</span>
                </Label>

                <select
                  value={form.department}
                  onChange={update("department")}
                  disabled={loading || optionsLoading}
                  className="
                    flex h-10 w-full
                    rounded-md
                    border border-input
                    bg-background
                    px-3 py-2
                    text-sm
                  "
                >
                  <option value="">Select Department</option>

                  {departments.map((department) => {
                    const id =
                      department.id ??
                      department.departmentId ??
                      department.value;

                    const name =
                      department.name ?? department.label ?? `Department ${id}`;

                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* NAME */}

              <div className="space-y-2">
                <Label>Name</Label>

                <Input value={form.name} disabled placeholder="Contact name" />
              </div>

              {/* EMAIL */}

              <div className="space-y-2">
                <Label>Email Address</Label>

                <Input
                  type="email"
                  value={form.email}
                  disabled
                  placeholder="Contact email"
                />
              </div>

              {/* CC */}

              <div className="space-y-2">
                <Label>CC</Label>

                <Input
                  value={form.cc}
                  onChange={update("cc")}
                  disabled={loading}
                  placeholder="email@example.com"
                />
              </div>

              {/* PRIORITY */}

              <div className="space-y-2">
                <Label>Priority</Label>

                <select
                  value={form.priority}
                  onChange={update("priority")}
                  disabled={loading}
                  className="
                    flex h-10 w-full
                    rounded-md
                    border border-input
                    bg-background
                    px-3 py-2
                    text-sm
                  "
                >
                  {priorities.map((priority) => (
                    <option key={priority.value} value={priority.value}>
                      {priority.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* =================================================
              ASSIGNMENT
          ================================================= */}

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Assignment</h3>

              <p className="text-sm text-muted-foreground">
                Assign the ticket and optionally link it to a service or
                project.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* ASSIGNED */}

              <div className="space-y-2">
                <Label>Assign Ticket</Label>

                <select
                  value={form.assigned}
                  onChange={update("assigned")}
                  disabled={loading || optionsLoading}
                  className="
                    flex h-10 w-full
                    rounded-md
                    border border-input
                    bg-background
                    px-3 py-2
                    text-sm
                  "
                >
                  <option value="">None</option>

                  {staff.map((user) => {
                    const id = user.id ?? user.staffId ?? user.value;

                    const name =
                      user.name ?? user.fullName ?? user.label ?? `User ${id}`;

                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* SERVICE */}

              <div className="space-y-2">
                <Label>Service</Label>

                <select
                  value={form.service}
                  onChange={update("service")}
                  disabled={loading || optionsLoading}
                  className="
                    flex h-10 w-full
                    rounded-md
                    border border-input
                    bg-background
                    px-3 py-2
                    text-sm
                  "
                >
                  <option value="">Select Service</option>

                  {services.map((service) => {
                    const id = service.id ?? service.serviceId ?? service.value;

                    const name =
                      service.name ?? service.label ?? `Service ${id}`;

                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* PROJECT */}

              <div className="space-y-2">
                <Label>Project</Label>

                <select
                  value={form.projectId}
                  onChange={update("projectId")}
                  disabled={loading || optionsLoading}
                  className="
                    flex h-10 w-full
                    rounded-md
                    border border-input
                    bg-background
                    px-3 py-2
                    text-sm
                  "
                >
                  <option value="">Select Project</option>

                  {projects.map((project) => {
                    const id = project.id ?? project.projectId ?? project.value;

                    const name =
                      project.name ?? project.label ?? `Project ${id}`;

                    return (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* TAGS */}

              <div className="space-y-2">
                <Label>Tags</Label>

                <Input
                  value={form.tags}
                  onChange={update("tags")}
                  disabled={loading}
                  placeholder="bug, urgent, website"
                />

                <p className="text-xs text-muted-foreground">
                  Separate multiple tags with commas.
                </p>
              </div>
            </div>
          </div>

          {/* =================================================
              TICKET BODY
          ================================================= */}

          <div className="space-y-4">
            <div>
              <h3 className="text-base font-semibold">Ticket Body</h3>

              <p className="text-sm text-muted-foreground">
                Describe the issue or request in detail.
              </p>
            </div>

            {/* MESSAGE */}

            <div className="space-y-2">
              <Label>
                Message
                <span className="ml-1 text-destructive">*</span>
              </Label>

              <Textarea
                value={form.message}
                onChange={update("message")}
                disabled={loading}
                placeholder="Enter ticket message..."
                rows={8}
              />
            </div>

            {/* =================================================
                ATTACHMENTS
            ================================================= */}

            <div className="space-y-3">
              <Label>Attachments</Label>

              <div className="rounded-md border p-4">
                <div className="flex items-center gap-3">
                  <Input
                    type="file"
                    multiple
                    disabled={loading || form.attachments.length >= 4}
                    accept="
                      .jpg,
                      .jpeg,
                      .png,
                      .pdf,
                      .doc,
                      .zip,
                      .rar
                    "
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                </div>

                <p className="mt-2 text-xs text-muted-foreground">
                  Allowed: JPG, JPEG, PNG, PDF, DOC, ZIP, RAR. Maximum 4 files.
                </p>

                {/* FILE LIST */}

                {form.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {form.attachments.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="
                            flex
                            items-center
                            justify-between
                            rounded-md
                            border
                            bg-muted/30
                            px-3
                            py-2
                          "
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {file.name}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAttachment(index)}
                          disabled={loading}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={loading || optionsLoading}>
              {loading ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Opening Ticket...
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  Open Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
