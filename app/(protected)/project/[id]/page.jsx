"use client";

import { useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";

import {
  MoreHorizontal,
  Plus,
  FileText,
  Pin,
  Pencil,
  Copy,
  CircleCheck,
  PauseCircle,
  XCircle,
  Download,
  Eye,
  Trash2,
  Users,
  CalendarDays,
  Clock3,
  DollarSign,
  CheckSquare,
  Timer,
  Receipt,
  Wallet,
  FileSignature,
  FolderOpen,
  MessageSquare,
  StickyNote,
  Activity,
  ListTodo,
  Milestone,
  Ticket,
  BarChart3,
  GanttChart,
  Building2,
  UserRound,
  Tag,
  BriefcaseBusiness,
  ArrowUpRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";

import { Progress } from "@/components/ui/progress";


/*
 * ---------------------------------------------------------
 * Small helper components
 * ---------------------------------------------------------
 */

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className="size-4 text-muted-foreground" />
      </div>

      <div className="min-w-0">
        <div className="text-xs font-medium text-muted-foreground">
          {label}
        </div>

        <div className="mt-1 break-words text-sm font-medium">
          {value || "-"}
        </div>
      </div>
    </div>
  );
}


function StatCard({
  icon: Icon,
  title,
  value,
  description,
  progress,
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>

            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {value}
            </p>

            {description && (
              <p className="mt-1 text-xs text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-5 text-muted-foreground" />
          </div>
        </div>

        {typeof progress === "number" && (
          <div className="mt-4">
            <Progress value={Math.min(Math.max(progress, 0), 100)} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}


/*
 * ---------------------------------------------------------
 * Project Header
 * ---------------------------------------------------------
 */

function ProjectHeader({ project }) {
  const {
    projectName,
    customer,
    status,
    projectNumber,
    progress,
    members,
  } = project;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

          {/* Project information */}
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-12">
              <AvatarFallback>
                {projectName
                  ?.split(" ")
                  ?.slice(0, 2)
                  ?.map((word) => word.charAt(0))
                  ?.join("")
                  ?.toUpperCase() || "PR"}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-semibold">
                  {projectName}
                </h1>

                <Badge variant="secondary">
                  {status}
                </Badge>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span>
                  Customer:{" "}
                  <span className="font-medium text-foreground">
                    {customer}
                  </span>
                </span>

                <span>
                  Project #:{" "}
                  <span className="font-medium text-foreground">
                    {projectNumber}
                  </span>
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex -space-x-2">
                  <Avatar className="size-7 border-2 border-background">
                    <AvatarFallback className="text-[10px]">
                      RD
                    </AvatarFallback>
                  </Avatar>

                  <Avatar className="size-7 border-2 border-background">
                    <AvatarFallback className="text-[10px]">
                      +2
                    </AvatarFallback>
                  </Avatar>
                </div>

                <span className="text-xs text-muted-foreground">
                  {members}
                </span>
              </div>
            </div>
          </div>


          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button>
              <Plus className="mr-2 size-4" />
              New Task
            </Button>

            <Button variant="outline">
              <FileText className="mr-2 size-4" />
              Invoice Project
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Pin className="mr-2 size-4" />
                  Pin Project
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <Pencil className="mr-2 size-4" />
                  Edit Project
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <Copy className="mr-2 size-4" />
                  Copy Project
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem>
                  <CircleCheck className="mr-2 size-4" />
                  Mark as Not Started
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <PauseCircle className="mr-2 size-4" />
                  On Hold
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <XCircle className="mr-2 size-4" />
                  Cancelled
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <CircleCheck className="mr-2 size-4" />
                  Finished
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem>
                  <Download className="mr-2 size-4" />
                  Export Project Data
                </DropdownMenuItem>

                <DropdownMenuItem>
                  <Eye className="mr-2 size-4" />
                  View as Customer
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 size-4" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>


        {/* Project progress */}
        <div className="mt-6 border-t pt-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">
              Project Progress
            </span>

            <span className="text-sm font-semibold">
              {progress}%
            </span>
          </div>

          <Progress value={progress} />
        </div>
      </CardContent>
    </Card>
  );
}


/*
 * ---------------------------------------------------------
 * Overview
 * ---------------------------------------------------------
 */

function ProjectOverview({ project }) {
  const {
    projectName,
    customer,
    status,
    projectNumber,
    startDate,
    deadline,
    dateCreated,
    billingType,
    totalRate,
    estimatedHours,
    totalLoggedHours,
    description,
    progress,
    openTasks,
    totalTasks,
    daysLeft,
    totalDays,
    totalExpenses,
    billableExpenses,
    billedExpenses,
    unbilledExpenses,
    members,
    tags,
  } = project;

  const daysPercentage =
    totalDays > 0
      ? Math.round((daysLeft / totalDays) * 10000) / 100
      : 0;

  const taskPercentage =
    totalTasks > 0
      ? Math.round((openTasks / totalTasks) * 100)
      : 0;

  return (
    <div className="space-y-5">

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <StatCard
          icon={CheckSquare}
          title="Open Tasks"
          value={`${openTasks}/${totalTasks}`}
          description="Tasks remaining"
          progress={taskPercentage}
        />

        <StatCard
          icon={CalendarDays}
          title="Days Left"
          value={daysLeft}
          description={`${totalDays} total project days`}
          progress={daysPercentage}
        />

        <StatCard
          icon={Clock3}
          title="Logged Hours"
          value={totalLoggedHours}
          description={`Estimated ${estimatedHours}`}
        />

        <StatCard
          icon={DollarSign}
          title="Total Rate"
          value={totalRate}
          description={billingType}
        />
      </div>


      {/* Main content */}
      <div className="grid gap-5 xl:grid-cols-3">

        {/* Left */}
        <div className="space-y-5 xl:col-span-2">

          {/* Project details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">

                <DetailItem
                  icon={HashIcon}
                  label="Project #"
                  value={projectNumber}
                />

                <DetailItem
                  icon={UserRound}
                  label="Customer"
                  value={customer}
                />

                <DetailItem
                  icon={BriefcaseBusiness}
                  label="Billing Type"
                  value={billingType}
                />

                <DetailItem
                  icon={DollarSign}
                  label="Total Rate"
                  value={totalRate}
                />

                <DetailItem
                  icon={CircleCheck}
                  label="Status"
                  value={status}
                />

                <DetailItem
                  icon={CalendarDays}
                  label="Date Created"
                  value={dateCreated}
                />

                <DetailItem
                  icon={CalendarDays}
                  label="Start Date"
                  value={startDate}
                />

                <DetailItem
                  icon={CalendarDays}
                  label="Deadline"
                  value={deadline}
                />

                <DetailItem
                  icon={Clock3}
                  label="Estimated Hours"
                  value={estimatedHours}
                />

                <DetailItem
                  icon={Timer}
                  label="Total Logged Hours"
                  value={totalLoggedHours}
                />

                <DetailItem
                  icon={Tag}
                  label="Tags"
                  value={tags}
                />

                <DetailItem
                  icon={Users}
                  label="Members"
                  value={members}
                />
              </div>
            </CardContent>
          </Card>


          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {description || "No description available."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Right */}
        <div className="space-y-5">

          {/* Project summary */}
          <Card>
            <CardHeader>
              <CardTitle>{projectName}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Overall Progress
                  </span>

                  <span className="text-sm font-semibold">
                    {progress}%
                  </span>
                </div>

                <Progress value={progress} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Start Date
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {startDate}
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Deadline
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    {deadline}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>


          {/* Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Expenses</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">

                <ExpenseRow
                  icon={Receipt}
                  title="Total Expenses"
                  value={totalExpenses}
                />

                <ExpenseRow
                  icon={DollarSign}
                  title="Billable Expenses"
                  value={billableExpenses}
                />

                <ExpenseRow
                  icon={Wallet}
                  title="Billed Expenses"
                  value={billedExpenses}
                />

                <ExpenseRow
                  icon={ArrowUpRight}
                  title="Unbilled Expenses"
                  value={unbilledExpenses}
                />

              </div>
            </CardContent>
          </Card>


          {/* Logged hours */}
          <Card>
            <CardHeader>
              <CardTitle>Logged Hours</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
                <div className="text-center">
                  <BarChart3 className="mx-auto size-8 text-muted-foreground" />

                  <p className="mt-2 text-sm font-medium">
                    No logged hours
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Time tracking data will appear here.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}


/*
 * ---------------------------------------------------------
 * Generic Tab Content
 * ---------------------------------------------------------
 */

function EmptyTab({
  icon: Icon,
  title,
  description,
  buttonText,
}) {
  return (
    <Card>
      <CardContent className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">

        <div className="flex size-14 items-center justify-center rounded-xl bg-muted">
          <Icon className="size-7 text-muted-foreground" />
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          {title}
        </h2>

        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>

        {buttonText && (
          <Button className="mt-5">
            <Plus className="mr-2 size-4" />
            {buttonText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}


/*
 * ---------------------------------------------------------
 * Tasks
 * ---------------------------------------------------------
 */

function ProjectTasks({ project }) {
  return (
    <EmptyTab
      icon={ListTodo}
      title="Project Tasks"
      description={`Manage tasks for ${project.projectName}. Create, assign and track project tasks from this section.`}
      buttonText="New Task"
    />
  );
}


/*
 * ---------------------------------------------------------
 * Timesheets
 * ---------------------------------------------------------
 */

function ProjectTimesheets({ project }) {
  return (
    <EmptyTab
      icon={Clock3}
      title="Timesheets"
      description={`Track time entries and logged hours for ${project.projectName}.`}
      buttonText="Add Timesheet"
    />
  );
}


/*
 * ---------------------------------------------------------
 * Milestones
 * ---------------------------------------------------------
 */

function ProjectMilestones({ project }) {
  return (
    <EmptyTab
      icon={Milestone}
      title="Milestones"
      description={`Create and manage milestones for ${project.projectName}.`}
      buttonText="New Milestone"
    />
  );
}


/*
 * ---------------------------------------------------------
 * Files
 * ---------------------------------------------------------
 */

function ProjectFiles({ project }) {
  return (
    <EmptyTab
      icon={FolderOpen}
      title="Project Files"
      description={`Upload and manage documents and files related to ${project.projectName}.`}
      buttonText="Upload File"
    />
  );
}


/*
 * ---------------------------------------------------------
 * Discussions
 * ---------------------------------------------------------
 */

function ProjectDiscussions({ project }) {
  return (
    <EmptyTab
      icon={MessageSquare}
      title="Discussions"
      description={`Project discussions and communication for ${project.projectName} will appear here.`}
      buttonText="New Discussion"
    />
  );
}


/*
 * ---------------------------------------------------------
 * Gantt
 * ---------------------------------------------------------
 */

function ProjectGantt({ project }) {
  return (
    <EmptyTab
      icon={GanttChart}
      title="Gantt Chart"
      description={`View the project timeline, tasks and milestones for ${project.projectName}.`}
    />
  );
}


/*
 * ---------------------------------------------------------
 * Tickets
 * ---------------------------------------------------------
 */

function ProjectTickets({ project }) {
  return (
    <EmptyTab
      icon={Ticket}
      title="Project Tickets"
      description={`Support tickets related to ${project.projectName} will appear here.`}
      buttonText="New Ticket"
    />
  );
}


/*
 * ---------------------------------------------------------
 * Contracts
 * ---------------------------------------------------------
 */

function ProjectContracts({ project }) {
  return (
    <EmptyTab
      icon={FileSignature}
      title="Contracts"
      description={`View and manage contracts associated with ${project.projectName}.`}
      buttonText="New Contract"
    />
  );
}


/*
 * ---------------------------------------------------------
 * Notes
 * ---------------------------------------------------------
 */

function ProjectNotes({ project }) {
  return (
    <EmptyTab
      icon={StickyNote}
      title="Project Notes"
      description={`Add and manage internal notes for ${project.projectName}.`}
      buttonText="Add Note"
    />
  );
}


/*
 * ---------------------------------------------------------
 * Activity
 * ---------------------------------------------------------
 */

function ProjectActivity({ project }) {
  return (
    <EmptyTab
      icon={Activity}
      title="Activity"
      description={`View all recent activity and changes made to ${project.projectName}.`}
    />
  );
}


/*
 * ---------------------------------------------------------
 * Expense Row
 * ---------------------------------------------------------
 */

function ExpenseRow({
  icon: Icon,
  title,
  value,
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>

        <span className="text-sm">
          {title}
        </span>
      </div>

      <span className="text-sm font-semibold">
        {value}
      </span>
    </div>
  );
}


/*
 * ---------------------------------------------------------
 * Hash Icon
 * ---------------------------------------------------------
 */

function HashIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" x2="20" y1="9" y2="9" />
      <line x1="4" x2="20" y1="15" y2="15" />
      <line x1="10" x2="8" y1="3" y2="21" />
      <line x1="16" x2="14" y1="3" y2="21" />
    </svg>
  );
}


/*
 * ---------------------------------------------------------
 * Main Page
 * ---------------------------------------------------------
 */

export default function ProjectPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const id = params?.id;


  /*
   * -------------------------------------------------------
   * Active tab
   * -------------------------------------------------------
   */

  const activeTab = searchParams.get("tab") || "overview";


  /*
   * -------------------------------------------------------
   * Project Data
   *
   * Replace this section later with your API/database data.
   * -------------------------------------------------------
   */

  const project = useMemo(
    () => ({
      id,

      projectName: "Smart Test",

      customer: "Smart",

      status: "In Progress",

      projectNumber: id || "1",

      startDate: "2026-09-04",

      deadline: "2026-09-25",

      dateCreated: "2026-09-04",

      billingType: "Fixed Rate",

      totalRate: "$4,533.00",

      estimatedHours: "34:00",

      totalLoggedHours: "00:00",

      description: "Smart testing",

      progress: 100,

      openTasks: 0,

      totalTasks: 0,

      daysLeft: 17,

      totalDays: 21,

      totalExpenses: "$15.00",

      billableExpenses: "$0.00",

      billedExpenses: "$0.00",

      unbilledExpenses: "$0.00",

      members: "Rang Dhara",

      tags: "-",
    }),
    [id]
  );


  /*
   * -------------------------------------------------------
   * Tab content
   * -------------------------------------------------------
   */

  const renderTabContent = () => {
    switch (activeTab) {
      case "tasks":
        return <ProjectTasks project={project} />;

      case "timesheets":
        return <ProjectTimesheets project={project} />;

      case "milestones":
        return <ProjectMilestones project={project} />;

      case "files":
        return <ProjectFiles project={project} />;

      case "discussions":
        return <ProjectDiscussions project={project} />;

      case "gantt":
        return <ProjectGantt project={project} />;

      case "tickets":
        return <ProjectTickets project={project} />;

      case "contracts":
        return <ProjectContracts project={project} />;

      case "notes":
        return <ProjectNotes project={project} />;

      case "activity":
        return <ProjectActivity project={project} />;

      case "overview":
      default:
        return <ProjectOverview project={project} />;
    }
  };


  /*
   * -------------------------------------------------------
   * Render
   * -------------------------------------------------------
   */

  return (
    <div className="space-y-5">

      {/* Project header */}
      <ProjectHeader project={project} />

      {/* Selected tab content */}
      {renderTabContent()}

    </div>
  );
}