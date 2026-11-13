"use client";

import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import {
  Plus,
  FileText,
  MoreHorizontal,
  Pin,
  Pencil,
  Copy,
  CircleCheck,
  PauseCircle,
  XCircle,
  Download,
  ExternalLink,
  Trash2,
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
  Users,
  Hourglass,
  Receipt,
  DollarSign,
} from "lucide-react";

export default function ProjectViewDialog({
  open,
  closeDialog,
  project,
}) {
  const [showMore, setShowMore] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [showSales, setShowSales] = useState(false);

  if (!project) {
    return null;
  }

  /*
   * --------------------------------------------------------------------------
   * Project Data
   * --------------------------------------------------------------------------
   *
   * Your existing project object is used first.
   * Defaults are provided so the Perfex-style view does not break if
   * some values are not available in your API response.
   */

  const projectName =
    project.projectName || project.name || "Smart Test";

  const customer =
    project.customer || "Smart";

  const status =
    project.status || "In Progress";

  const projectNumber =
    project.projectNumber || project.id || "1";

  const startDate =
    project.startDate || "2026-09-04";

  const deadline =
    project.deadline || "2026-09-25";

  const dateCreated =
    project.dateCreated || startDate;

  const billingType =
    project.billingType || "Fixed Rate";

  const totalRate =
    project.totalRate || "$4,533.00";

  const estimatedHours =
    project.estimatedHours || "34:00";

  const totalLoggedHours =
    project.totalLoggedHours || "00:00";

  const description =
    project.description || "Smart testing";

  const progress =
    Number(project.progress ?? 100);

  const openTasks =
    Number(project.openTasks ?? 0);

  const totalTasks =
    Number(project.totalTasks ?? 0);

  const daysLeft =
    Number(project.daysLeft ?? 17);

  const totalDays =
    Number(project.totalDays ?? 21);

  const totalExpenses =
    project.totalExpenses || "$15.00";

  const billableExpenses =
    project.billableExpenses || "$0.00";

  const billedExpenses =
    project.billedExpenses || "$0.00";

  const unbilledExpenses =
    project.unbilledExpenses || "$0.00";

  const members =
    project.members || "Rang Dhara";

  const tags =
    project.tags || "-";

  const daysPercentage =
    totalDays > 0
      ? Math.round((daysLeft / totalDays) * 10000) / 100
      : 0;

  const taskPercentage =
    totalTasks > 0
      ? Math.round((openTasks / totalTasks) * 100)
      : 0;

  /*
   * --------------------------------------------------------------------------
   * Tabs
   * --------------------------------------------------------------------------
   */

  const tabs = [
    {
      name: "Overview",
      icon: LayoutDashboard,
    },
    {
      name: "Tasks",
      icon: ListTodo,
    },
    {
      name: "Timesheets",
      icon: Clock3,
    },
    {
      name: "Milestones",
      icon: Milestone,
    },
    {
      name: "Files",
      icon: Folder,
    },
    {
      name: "Discussions",
      icon: MessageSquare,
    },
    {
      name: "Gantt",
      icon: GanttChart,
    },
    {
      name: "Tickets",
      icon: Ticket,
    },
    {
      name: "Contracts",
      icon: FileSignature,
    },
    {
      name: "Notes",
      icon: StickyNote,
    },
    {
      name: "Activity",
      icon: Activity,
    },
  ];

  /*
   * --------------------------------------------------------------------------
   * Helper
   * --------------------------------------------------------------------------
   */

  const DetailItem = ({ label, value }) => (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">
        {label}
      </dt>

      <dd className="text-sm font-medium text-foreground">
        {value || "-"}
      </dd>
    </div>
  );

  /*
   * --------------------------------------------------------------------------
   * Render
   * --------------------------------------------------------------------------
   */

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          closeDialog();
        }
      }}
    >
      <DialogContent
        className="
          w-[96vw]
          max-w-[1400px]
          max-h-[95vh]
          overflow-hidden
          p-0
        "
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {projectName}
          </DialogTitle>

          <DialogDescription>
            Project details and overview
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[95vh] overflow-y-auto bg-background">

          {/* ================================================================= */}
          {/* PROJECT HEADER */}
          {/* ================================================================= */}

          <div className="border-b px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

              {/* Left side */}
              <div className="flex flex-wrap items-center gap-3">

                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    {projectName}
                  </h2>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {customer}
                  </p>
                </div>

                {/* Member */}
                <div className="flex items-center gap-2 border-l pl-3">
                  <div
                    className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-full
                      bg-primary
                      text-xs
                      font-semibold
                      text-primary-foreground
                    "
                  >
                    RD
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Team Member
                    </p>

                    <p className="text-sm font-medium">
                      {members}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <span
                  className="
                    inline-flex
                    items-center
                    rounded-md
                    border
                    border-blue-200
                    bg-blue-50
                    px-3
                    py-1.5
                    text-xs
                    font-medium
                    text-blue-700
                    dark:border-blue-900
                    dark:bg-blue-950
                    dark:text-blue-300
                  "
                >
                  {status}
                </span>
              </div>

              {/* Right side actions */}
              <div className="flex flex-wrap items-center gap-2">

                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  New Task
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Invoice Project
                </Button>

                <div className="relative">

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => setShowMore(!showMore)}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    More
                  </Button>

                  {showMore && (
                    <div
                      className="
                        absolute
                        right-0
                        z-50
                        mt-2
                        w-56
                        rounded-md
                        border
                        bg-background
                        p-1
                        shadow-lg
                      "
                    >
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
                      >
                        <Pin className="h-4 w-4" />
                        Pin Project
                      </button>

                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit Project
                      </button>

                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Project
                      </button>

                      <div className="my-1 border-t" />

                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
                      >
                        <CircleCheck className="h-4 w-4" />
                        Mark as Not Started
                      </button>

                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
                      >
                        <PauseCircle className="h-4 w-4" />
                        Mark as On Hold
                      </button>

                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
                      >
                        <XCircle className="h-4 w-4" />
                        Mark as Cancelled
                      </button>

                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
                      >
                        <CircleCheck className="h-4 w-4" />
                        Mark as Finished
                      </button>

                      <div className="my-1 border-t" />

                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
                      >
                        <Download className="h-4 w-4" />
                        Export project data
                      </button>

                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-muted"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View as customer
                      </button>

                      <div className="my-1 border-t" />

                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive hover:bg-muted"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete Project
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* TABS */}
          {/* ================================================================= */}

          <div className="border-b">
            <div className="flex overflow-x-auto px-5">

              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.name;

                return (
                  <button
                    key={tab.name}
                    type="button"
                    onClick={() => setActiveTab(tab.name)}
                    className={`
                      flex
                      shrink-0
                      items-center
                      gap-2
                      border-b-2
                      px-3
                      py-3
                      text-xs
                      font-medium
                      transition-colors
                      ${
                        isActive
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.name}
                  </button>
                );
              })}

              {/* Sales */}
              <div className="relative shrink-0">

                <button
                  type="button"
                  onClick={() => setShowSales(!showSales)}
                  className="
                    flex
                    items-center
                    gap-1
                    border-b-2
                    border-transparent
                    px-3
                    py-3
                    text-xs
                    font-medium
                    text-muted-foreground
                    hover:text-foreground
                  "
                >
                  Sales
                  <span className="text-[10px]">
                    ▼
                  </span>
                </button>

                {showSales && (
                  <div
                    className="
                      absolute
                      left-0
                      top-full
                      z-50
                      mt-1
                      w-44
                      rounded-md
                      border
                      bg-background
                      p-1
                      shadow-lg
                    "
                  >
                    {[
                      "Proposals",
                      "Estimates",
                      "Invoices",
                      "Subscriptions",
                      "Expenses",
                      "Credit Notes",
                    ].map((item) => (
                      <button
                        key={item}
                        type="button"
                        className="
                          block
                          w-full
                          rounded-sm
                          px-3
                          py-2
                          text-left
                          text-sm
                          hover:bg-muted
                        "
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* PROJECT PROGRESS */}
          {/* ================================================================= */}

          <div className="px-5 py-5">

            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold">
                Project Progress
              </span>

              <span className="text-sm font-semibold text-primary">
                {progress}%
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* ================================================================= */}
          {/* MAIN CONTENT */}
          {/* ================================================================= */}

          <div className="px-5 pb-8">

            <div className="relative grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">

              {/* Desktop divider */}
              <div
                className="
                  absolute
                  bottom-0
                  left-1/2
                  top-0
                  hidden
                  w-px
                  bg-border
                  md:block
                "
              />

              {/* ============================================================= */}
              {/* LEFT COLUMN - OVERVIEW */}
              {/* ============================================================= */}

              <div>

                <div className="mb-5 flex items-center justify-between">

                  <h3 className="text-lg font-semibold">
                    Overview
                  </h3>

                  <button
                    type="button"
                    className="
                      flex
                      items-center
                      gap-1
                      text-xs
                      font-medium
                      text-primary
                      hover:underline
                    "
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export project data
                  </button>

                </div>

                <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">

                  <DetailItem
                    label="Project #"
                    value={projectNumber}
                  />

                  <DetailItem
                    label="Customer"
                    value={customer}
                  />

                  <DetailItem
                    label="Billing Type"
                    value={billingType}
                  />

                  <DetailItem
                    label="Total Rate"
                    value={totalRate}
                  />

                  <DetailItem
                    label="Status"
                    value={status}
                  />

                  <DetailItem
                    label="Date Created"
                    value={dateCreated}
                  />

                  <DetailItem
                    label="Start Date"
                    value={startDate}
                  />

                  <DetailItem
                    label="Deadline"
                    value={deadline}
                  />

                  <DetailItem
                    label="Estimated Hours"
                    value={estimatedHours}
                  />

                  <DetailItem
                    label="Total Logged Hours"
                    value={totalLoggedHours}
                  />

                  <DetailItem
                    label="Tags"
                    value={tags}
                  />

                  <DetailItem
                    label="Members"
                    value={members}
                  />

                </dl>

                {/* Description */}
                <div className="mt-7">

                  <h4 className="mb-2 text-sm font-semibold">
                    Description
                  </h4>

                  <div
                    className="
                      rounded-lg
                      border
                      bg-muted/20
                      p-4
                      text-sm
                      leading-6
                      text-muted-foreground
                    "
                  >
                    {description}
                  </div>

                </div>

              </div>

              {/* ============================================================= */}
              {/* RIGHT COLUMN */}
              {/* ============================================================= */}

              <div>

                <h3 className="mb-5 text-lg font-semibold">
                  {projectName}
                </h3>

                {/* ----------------------------------------------------------- */}
                {/* STAT CARDS */}
                {/* ----------------------------------------------------------- */}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  {/* Open Tasks */}
                  <div className="rounded-lg border bg-background p-4">

                    <div className="flex items-start justify-between">

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Open Tasks
                        </p>

                        <p className="mt-1 text-xl font-semibold">
                          {openTasks} / {totalTasks}
                        </p>
                      </div>

                      <ListTodo className="h-5 w-5 text-muted-foreground" />

                    </div>

                    <div className="mt-4">

                      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                        <span>Progress</span>
                        <span>{taskPercentage}%</span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">

                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${taskPercentage}%`,
                          }}
                        />

                      </div>

                    </div>

                  </div>

                  {/* Days Left */}
                  <div className="rounded-lg border bg-background p-4">

                    <div className="flex items-start justify-between">

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Days Left
                        </p>

                        <p className="mt-1 text-xl font-semibold">
                          {daysLeft} / {totalDays}
                        </p>
                      </div>

                      <Clock3 className="h-5 w-5 text-muted-foreground" />

                    </div>

                    <div className="mt-4">

                      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                        <span>Time</span>
                        <span>{daysPercentage}%</span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">

                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.min(daysPercentage, 100)}%`,
                          }}
                        />

                      </div>

                    </div>

                  </div>

                </div>

                {/* ----------------------------------------------------------- */}
                {/* EXPENSES */}
                {/* ----------------------------------------------------------- */}

                <div className="mt-7">

                  <div className="mb-4 flex items-center gap-2">

                    <DollarSign className="h-4 w-4 text-muted-foreground" />

                    <h4 className="text-sm font-semibold">
                      Expenses
                    </h4>

                  </div>

                  <div className="grid grid-cols-2 gap-3">

                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">
                        Total Expenses
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        {totalExpenses}
                      </p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">
                        Billable Expenses
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        {billableExpenses}
                      </p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">
                        Billed Expenses
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        {billedExpenses}
                      </p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground">
                        Unbilled Expenses
                      </p>

                      <p className="mt-1 text-lg font-semibold">
                        {unbilledExpenses}
                      </p>
                    </div>

                  </div>

                </div>

                {/* ----------------------------------------------------------- */}
                {/* LOGGED HOURS */}
                {/* ----------------------------------------------------------- */}

                <div className="mt-7">

                  <div className="mb-4 flex items-center justify-between">

                    <h4 className="flex items-center gap-2 text-sm font-semibold">

                      <Hourglass className="h-4 w-4 text-muted-foreground" />

                      Total Logged Hours

                    </h4>

                    <button
                      type="button"
                      className="
                        rounded-md
                        border
                        bg-background
                        px-3
                        py-1.5
                        text-xs
                        text-muted-foreground
                        hover:bg-muted
                      "
                    >
                      This Week
                      <span className="ml-2">
                        ▼
                      </span>
                    </button>

                  </div>

                  <div className="rounded-lg border p-4">

                    <div className="relative h-52">

                      {/* Grid */}
                      <div className="absolute inset-0 flex flex-col justify-between">

                        <div className="border-t border-dashed" />

                        <div className="border-t border-dashed" />

                        <div className="border-t border-dashed" />

                        <div className="border-t border-dashed" />

                        <div className="border-t" />

                      </div>

                      {/* Empty bars */}
                      <div
                        className="
                          absolute
                          inset-x-0
                          bottom-6
                          top-0
                          flex
                          items-end
                          justify-around
                          px-3
                        "
                      >

                        {[
                          "Mon",
                          "Tue",
                          "Wed",
                          "Thu",
                          "Fri",
                          "Sat",
                          "Sun",
                        ].map((day) => (
                          <div
                            key={day}
                            className="flex h-full w-8 flex-col justify-end"
                          >
                            <div className="h-0 w-full rounded-t bg-primary" />
                          </div>
                        ))}

                      </div>

                      {/* Labels */}
                      <div
                        className="
                          absolute
                          bottom-0
                          left-0
                          right-0
                          flex
                          justify-around
                          text-[10px]
                          text-muted-foreground
                        "
                      >
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                        <span>Sun</span>
                      </div>

                    </div>

                    <div className="mt-3 text-center text-xs text-muted-foreground">
                      No logged hours for this period
                    </div>

                  </div>

                </div>

              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* FOOTER */}
          {/* ================================================================= */}

          <DialogFooter className="border-t px-5 py-4">

            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
            >
              Close
            </Button>

          </DialogFooter>

        </div>
      </DialogContent>
    </Dialog>
  );
}