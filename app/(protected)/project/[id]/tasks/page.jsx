import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { Container } from '@/components/common/container';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarTitle,
} from '@/components/common/toolbar';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  MoreHorizontal,
  Plus,
  UserRound,
} from 'lucide-react';

export const metadata = {
  title: 'Tasks',
  description: 'Manage tasks.',
};

const tasks = [
  {
    id: 1,
    title: 'Website UI Design',
    description: 'Create the initial website UI design and layout.',
    status: 'In Progress',
    priority: 'High',
    assignee: 'Rang Dhara',
    dueDate: 'Sep 12, 2026',
    progress: 60,
  },
  {
    id: 2,
    title: 'Frontend Development',
    description: 'Develop the frontend pages based on the approved design.',
    status: 'Not Started',
    priority: 'Medium',
    assignee: 'John Doe',
    dueDate: 'Sep 18, 2026',
    progress: 0,
  },
  {
    id: 3,
    title: 'Testing & QA',
    description: 'Test all completed modules and fix reported issues.',
    status: 'Completed',
    priority: 'Low',
    assignee: 'Rang Dhara',
    dueDate: 'Sep 25, 2026',
    progress: 100,
  },
];

function getStatusBadge(status) {
  switch (status) {
    case 'Completed':
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="size-3.5" />
          Completed
        </Badge>
      );

    case 'In Progress':
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock3 className="size-3.5" />
          In Progress
        </Badge>
      );

    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Circle className="size-3.5" />
          Not Started
        </Badge>
      );
  }
}

function getPriorityBadge(priority) {
  if (priority === 'High') {
    return (
      <Badge variant="destructive">
        High
      </Badge>
    );
  }

  if (priority === 'Medium') {
    return (
      <Badge variant="secondary">
        Medium
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      Low
    </Badge>
  );
}

export default function Page() {
  return (
    <>
      {/* ---------------------------------------------------------
       * Toolbar
       * --------------------------------------------------------- */}

      <Container>
        <Toolbar>
          <ToolbarHeading>
            <ToolbarTitle>
              Tasks
            </ToolbarTitle>

            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">
                    Home
                  </BreadcrumbLink>
                </BreadcrumbItem>

                <BreadcrumbSeparator />

                <BreadcrumbItem>
                  <BreadcrumbPage>
                    Task Management
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>

          <ToolbarActions>
            <Button>
              <Plus className="mr-2 size-4" />
              New Task
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>


      {/* ---------------------------------------------------------
       * Task List
       * --------------------------------------------------------- */}

      <Container>
        <div className="rounded-xl border bg-background">

          {/* Header */}
          <div className="flex flex-col gap-4 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Project Tasks
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage and track project tasks.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {tasks.length} Tasks
              </Badge>
            </div>
          </div>


          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-5 py-3 text-left font-medium">
                    Task
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Status
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Priority
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Assignee
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Due Date
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Progress
                  </th>

                  <th className="w-12 px-5 py-3" />
                </tr>
              </thead>

              <tbody>
                {tasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >
                    {/* Task */}
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          {task.status === 'Completed' ? (
                            <CheckCircle2 className="size-4" />
                          ) : (
                            <Circle className="size-4 text-muted-foreground" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-medium">
                            {task.title}
                          </div>

                          <div className="mt-1 max-w-[280px] truncate text-xs text-muted-foreground">
                            {task.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      {getStatusBadge(task.status)}
                    </td>

                    {/* Priority */}
                    <td className="px-5 py-4">
                      {getPriorityBadge(task.priority)}
                    </td>

                    {/* Assignee */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                          <UserRound className="size-4 text-muted-foreground" />
                        </div>

                        <span className="whitespace-nowrap">
                          {task.assignee}
                        </span>
                      </div>
                    </td>

                    {/* Due date */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                        <CalendarDays className="size-4" />
                        {task.dueDate}
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="px-5 py-4">
                      <div className="w-28">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {task.progress}%
                          </span>
                        </div>

                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{
                              width: `${task.progress}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
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
          <div className="divide-y md:hidden">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-5"
              >
                <div className="flex items-start justify-between gap-3">

                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {task.status === 'Completed' ? (
                        <CheckCircle2 className="size-4" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-medium">
                        {task.title}
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {task.description}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                </div>


                <div className="mt-4 flex flex-wrap gap-2">
                  {getStatusBadge(task.status)}
                  {getPriorityBadge(task.priority)}
                </div>


                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <UserRound className="size-3.5" />
                      Assignee
                    </div>

                    <div className="mt-1 font-medium">
                      {task.assignee}
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      Due Date
                    </div>

                    <div className="mt-1 font-medium">
                      {task.dueDate}
                    </div>
                  </div>

                </div>


                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Progress
                    </span>

                    <span className="font-medium">
                      {task.progress}%
                    </span>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${task.progress}%`,
                      }}
                    />
                  </div>
                </div>

              </div>
            ))}
          </div>

        </div>
      </Container>
    </>
  );
}