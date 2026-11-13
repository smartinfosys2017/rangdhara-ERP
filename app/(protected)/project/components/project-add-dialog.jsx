"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Textarea } from "@/components/ui/textarea";

// ----------------------------------------------------
// STATIC DATA
// ----------------------------------------------------

const CUSTOMERS = [
  {
    id: "1",
    name: "Acme Corporation",
  },
  {
    id: "2",
    name: "Globex Corporation",
  },
  {
    id: "3",
    name: "Wayne Enterprises",
  },
];

const PROJECTS = [
  {
    id: "1",
    name: "Website Redesign",
    customerId: "1",
  },
  {
    id: "2",
    name: "CRM Development",
    customerId: "1",
  },
  {
    id: "3",
    name: "Mobile Application",
    customerId: "2",
  },
  {
    id: "4",
    name: "ERP Implementation",
    customerId: "3",
  },
];

const BILLING_TYPES = [
  {
    id: "1",
    name: "Fixed Rate",
  },
  {
    id: "2",
    name: "Project Hours",
  },
  {
    id: "3",
    name: "Task Hours",
  },
];

const PROJECT_STATUS = [
  {
    id: "1",
    name: "Not Started",
  },
  {
    id: "2",
    name: "In Progress",
  },
  {
    id: "3",
    name: "On Hold",
  },
  {
    id: "4",
    name: "Finished",
  },
  {
    id: "5",
    name: "Cancelled",
  },
];

const MEMBERS = [
  {
    id: "1",
    name: "Rang Dhara",
  },
  {
    id: "2",
    name: "John Smith",
  },
  {
    id: "3",
    name: "David",
  },
];

// ----------------------------------------------------
// HELPERS
// ----------------------------------------------------

function getToday() {
  return new Date().toISOString().split("T")[0];
}

// ----------------------------------------------------
// COMPONENT
// ----------------------------------------------------

export default function ProjectAddDialog({ open, closeDialog, onSuccess }) {
  // ---------------- FORM STATES ----------------

  const [projectName, setProjectName] = useState("");

  const [customerId, setCustomerId] = useState("");

  const [projectId, setProjectId] = useState("");

  const [progressFromTasks, setProgressFromTasks] = useState(true);

  const [billingType, setBillingType] = useState("1");

  const [status, setStatus] = useState("2");

  const [sendFinishedEmail, setSendFinishedEmail] = useState(false);

  const [projectCost, setProjectCost] = useState("");

  const [ratePerHour, setRatePerHour] = useState("");

  const [estimatedHours, setEstimatedHours] = useState("");

  const [members, setMembers] = useState([]);

  const [startDate, setStartDate] = useState(getToday());

  const [deadline, setDeadline] = useState("");

  const [tags, setTags] = useState("");

  const [description, setDescription] = useState("");

  // ---------------- SETTINGS ----------------

  const [contactNotification, setContactNotification] = useState("1");

  const [visibleTabs, setVisibleTabs] = useState([
    "overview",
    "tasks",
    "timesheets",
    "milestones",
    "files",
  ]);

  const [customerSettings, setCustomerSettings] = useState({
    view_tasks: true,

    create_tasks: true,

    edit_tasks: true,

    comment_on_tasks: true,

    upload_files: true,

    view_timesheets: true,

    view_activity_log: true,
  });

  // ---------------- VALIDATION ----------------

  const [errors, setErrors] = useState({});

  // ---------------- DERIVED DATA ----------------

  const filteredProjects = useMemo(() => {
    if (!customerId) return [];

    return PROJECTS.filter((item) => item.customerId === customerId);
  }, [customerId]);

  // ---------------- CUSTOMER CHANGE ----------------

  const handleCustomerChange = (value) => {
    setCustomerId(value);

    setProjectId("");

    setErrors((prev) => ({
      ...prev,

      customerId: "",
    }));
  };

  // ---------------- VALIDATE ----------------

  const validate = () => {
    let newErrors = {};

    if (!projectName.trim()) {
      newErrors.projectName = "Project name is required";
    }

    if (!customerId) {
      newErrors.customerId = "Customer is required";
    }

    if (!startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (projectCost && Number(projectCost) < 0) {
      newErrors.projectCost = "Invalid project cost";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length) {
      toast.error("Please complete required fields");

      return false;
    }

    return true;
  };
  // ----------------------------------------------------
  // SAVE PROJECT
  // ----------------------------------------------------

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const projectData = {
      name: projectName,

      clientid: customerId,

      project_id: projectId,

      progress_from_tasks: progressFromTasks,

      progress: 0,

      billing_type: billingType,

      status,

      project_cost: projectCost,

      rate_per_hour: ratePerHour,

      estimated_hours: estimatedHours,

      members,

      start_date: startDate,

      deadline,

      tags,

      description,

      send_finished_email: sendFinishedEmail,

      settings: {
        contact_notification: contactNotification,

        available_features: visibleTabs,

        customer_permissions: customerSettings,
      },
    };

    console.log("PROJECT DATA", projectData);

    toast.success("Project created successfully");

    onSuccess?.(projectData);
  };

  // ----------------------------------------------------
  // CLOSE
  // ----------------------------------------------------

  const handleClose = () => {
    setErrors({});

    closeDialog?.();
  };

  // ----------------------------------------------------
  // JSX
  // ----------------------------------------------------

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent
        className="
max-w-4xl
max-h-[95vh]
overflow-y-auto
"
      >
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>

          <DialogDescription>
            Create project with customer, billing and permissions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* PROJECT NAME */}

          <div>
            <label className="text-sm font-medium">
              <span className="text-red-500">*</span>
              Project Name
            </label>

            <Input
              value={projectName}

              onChange={(e) => setProjectName(e.target.value)}

              placeholder="Enter project name"
            />

            {errors.projectName && (
              <p className="text-sm text-red-500">{errors.projectName}</p>
            )}
          </div>

          {/* CUSTOMER */}

          <div>
            <label className="text-sm font-medium">
              <span className="text-red-500">*</span>
              Customer
            </label>

            <Select
              value={customerId}

              onValueChange={handleCustomerChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Customer" />
              </SelectTrigger>

              <SelectContent>
                {CUSTOMERS.map((item) => (
                  <SelectItem
                    key={item.id}

                    value={item.id}
                  >
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* PROJECT TEMPLATE */}

          {customerId && (
            <div>
              <label className="text-sm font-medium">Project Template</label>

              <Select
                value={projectId}

                onValueChange={setProjectId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Project" />
                </SelectTrigger>

                <SelectContent>
                  {filteredProjects.map((item) => (
                    <SelectItem
                      key={item.id}

                      value={item.id}
                    >
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* PROGRESS */}

          <label
            className="
flex
items-center
gap-2
"
          >
            <input
              type="checkbox"

              checked={progressFromTasks}

              onChange={(e) => setProgressFromTasks(e.target.checked)}
            />
            Calculate progress through tasks
          </label>

          {/* BILLING STATUS */}

          <div
            className="
grid
grid-cols-2
gap-4
"
          >
            <Select
              value={billingType}

              onValueChange={setBillingType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Billing Type" />
              </SelectTrigger>

              <SelectContent>
                {BILLING_TYPES.map((item) => (
                  <SelectItem
                    key={item.id}

                    value={item.id}
                  >
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}

              onValueChange={setStatus}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>

              <SelectContent>
                {PROJECT_STATUS.map((item) => (
                  <SelectItem
                    key={item.id}

                    value={item.id}
                  >
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* COST DETAILS */}

          <div
            className="
grid
grid-cols-3
gap-4
"
          >
            <div>
              <label>Project Cost</label>

              <Input
                type="number"

                value={projectCost}

                onChange={(e) => setProjectCost(e.target.value)}
              />
            </div>

            <div>
              <label>Rate / Hour</label>

              <Input
                type="number"

                value={ratePerHour}

                onChange={(e) => setRatePerHour(e.target.value)}
              />
            </div>

            <div>
              <label>Estimated Hours</label>

              <Input
                type="number"

                value={estimatedHours}

                onChange={(e) => setEstimatedHours(e.target.value)}
              />
            </div>
          </div>

          {/* DATES */}

          <div
            className="
grid
grid-cols-2
gap-4
"
          >
            <div>
              <label>Start Date</label>

              <Input
                type="date"

                value={startDate}

                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div>
              <label>Deadline</label>

              <Input
                type="date"

                value={deadline}

                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
          </div>

          {/* MEMBERS */}

          <div>
            <label>Project Members</label>

            <Select
              onValueChange={(value) => {
                if (!members.includes(value)) {
                  setMembers([...members, value]);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Add member" />
              </SelectTrigger>

              <SelectContent>
                {MEMBERS.map((item) => (
                  <SelectItem
                    key={item.id}

                    value={item.id}
                  >
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-2 flex gap-2 flex-wrap">
              {members.map((id) => {
                const member = MEMBERS.find((x) => x.id === id);

                return (
                  <span
                    key={id}

                    className="
px-3
py-1
bg-muted
rounded
text-sm
"
                  >
                    {member?.name}

                    <button
                      className="ml-2"

                      onClick={() =>
                        setMembers(members.filter((x) => x !== id))
                      }
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>

          {/* TAGS */}

          <Input
            placeholder="Tags"

            value={tags}

            onChange={(e) => setTags(e.target.value)}
          />

          {/* DESCRIPTION */}

          <Textarea
            placeholder="Project Description"

            value={description}

            onChange={(e) => setDescription(e.target.value)}
          />

          {/* EMAIL */}

          <label
            className="flex gap-2 items-center"
          >
            <input
              type="checkbox"

              checked={sendFinishedEmail}

              onChange={(e) => setSendFinishedEmail(e.target.checked)}
            />
            Send finished project email
          </label>
        </div>

        <DialogFooter>
          <Button  variant="outline"  onClick={handleClose}>
            Cancel
          </Button>

          <Button onClick={handleSave}>Save Project</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
