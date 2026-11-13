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

import { Button } from '@/components/ui/button';

import {
  CalendarDays,
  Clock3,
  MoreHorizontal,
  Plus,
  UserRound,
} from 'lucide-react';

export const metadata = {
  title: 'Timesheets',
  description: 'Manage project timesheets.',
};

const timesheets = [
  {
    id: 1,
    member: 'Rang Dhara',
    task: 'Website UI Design',
    tags: 'Design',
    startTime: '09:00 AM',
    endTime: '11:30 AM',
    note: 'Created homepage and dashboard UI designs.',
    time: '02:30',
    decimal: '2.50',
  },
  {
    id: 2,
    member: 'John Doe',
    task: 'Frontend Development',
    tags: 'Development',
    startTime: '11:00 AM',
    endTime: '02:00 PM',
    note: 'Implemented responsive project components.',
    time: '03:00',
    decimal: '3.00',
  },
  {
    id: 3,
    member: 'Rang Dhara',
    task: 'Testing & QA',
    tags: 'Testing',
    startTime: '03:00 PM',
    endTime: '05:15 PM',
    note: 'Tested project pages and fixed UI issues.',
    time: '02:15',
    decimal: '2.25',
  },
];

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
              Timesheets
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
                    Timesheets
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>

          <ToolbarActions>
            <Button>
              <Plus className="mr-2 size-4" />
              Add Timesheet
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>


      {/* ---------------------------------------------------------
       * Timesheet Table
       * --------------------------------------------------------- */}

      <Container>
        <div className="rounded-xl border bg-background">

          {/* Table Header */}
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Project Timesheets
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Track member time entries for this project.
              </p>
            </div>

            <div className="text-sm text-muted-foreground">
              {timesheets.length} entries
            </div>
          </div>


          {/* Desktop Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">

              <thead>
                <tr className="border-b bg-muted/40">

                  <th className="px-5 py-3 text-left font-medium">
                    Member
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Task
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Timesheet Tags
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Start Time
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    End Time
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Note
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Time (h)
                  </th>

                  <th className="px-5 py-3 text-left font-medium">
                    Time (decimal)
                  </th>

                  <th className="px-5 py-3 text-right font-medium">
                    Options
                  </th>

                </tr>
              </thead>


              <tbody>
                {timesheets.map((timesheet) => (
                  <tr
                    key={timesheet.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >

                    {/* Member */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">

                        <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                          <UserRound className="size-4 text-muted-foreground" />
                        </div>

                        <span className="font-medium whitespace-nowrap">
                          {timesheet.member}
                        </span>

                      </div>
                    </td>


                    {/* Task */}
                    <td className="px-5 py-4">
                      <span className="font-medium whitespace-nowrap">
                        {timesheet.task}
                      </span>
                    </td>


                    {/* Tags */}
                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-md bg-muted px-2.5 py-1 text-xs font-medium">
                        {timesheet.tags}
                      </span>
                    </td>


                    {/* Start Time */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Clock3 className="size-4 text-muted-foreground" />
                        {timesheet.startTime}
                      </div>
                    </td>


                    {/* End Time */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <Clock3 className="size-4 text-muted-foreground" />
                        {timesheet.endTime}
                      </div>
                    </td>


                    {/* Note */}
                    <td className="max-w-[260px] px-5 py-4">
                      <span className="block truncate text-muted-foreground">
                        {timesheet.note}
                      </span>
                    </td>


                    {/* Time */}
                    <td className="px-5 py-4">
                      <span className="font-medium whitespace-nowrap">
                        {timesheet.time}
                      </span>
                    </td>


                    {/* Decimal */}
                    <td className="px-5 py-4">
                      <span className="font-medium whitespace-nowrap">
                        {timesheet.decimal}
                      </span>
                    </td>


                    {/* Options */}
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


          {/* Mobile-friendly note */}
          <div className="border-t p-4 md:hidden">
            <p className="text-xs text-muted-foreground">
              Swipe horizontally to view all timesheet columns.
            </p>
          </div>

        </div>
      </Container>
    </>
  );
}