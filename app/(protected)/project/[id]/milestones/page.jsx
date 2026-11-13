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
  MoreHorizontal,
  Plus,
  Target,
} from 'lucide-react';

export const metadata = {
  title: 'Milestones',
  description: 'Manage project milestones.',
};

const milestones = [
  {
    id: 1,
    name: 'UI Design',
    startDate: 'Sep 04, 2026',
    dueDate: 'Sep 10, 2026',
    description:
      'Complete the website UI design, layouts, and responsive screens.',
  },
  {
    id: 2,
    name: 'Development',
    startDate: 'Sep 11, 2026',
    dueDate: 'Sep 20, 2026',
    description:
      'Develop the frontend functionality based on the approved UI design.',
  },
  {
    id: 3,
    name: 'Testing & Launch',
    startDate: 'Sep 21, 2026',
    dueDate: 'Sep 25, 2026',
    description:
      'Complete QA testing, resolve issues, and prepare the project for launch.',
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
              Milestones
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
                    Milestones
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>

          <ToolbarActions>
            <Button>
              <Plus className="mr-2 size-4" />
              New Milestone
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>


      {/* ---------------------------------------------------------
       * Milestones Table
       * --------------------------------------------------------- */}

      <Container>
        <div className="rounded-xl border bg-background">

          {/* Table Header */}
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Project Milestones
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage important project milestones and deadlines.
              </p>
            </div>

            <Badge variant="secondary">
              {milestones.length} Milestones
            </Badge>
          </div>


          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">

              <thead>
                <tr className="border-b bg-muted/40">

                  {/* Name */}
                  <th className="px-5 py-3 text-left font-medium">
                    Name
                  </th>

                  {/* Start Date */}
                  <th className="px-5 py-3 text-left font-medium">
                    Start Date
                  </th>

                  {/* Due Date */}
                  <th className="px-5 py-3 text-left font-medium">
                    Due date
                  </th>

                  {/* Description */}
                  <th className="px-5 py-3 text-left font-medium">
                    Description
                  </th>

                  {/* Options */}
                  <th className="w-16 px-5 py-3 text-right font-medium">
                    Options
                  </th>

                </tr>
              </thead>


              <tbody>
                {milestones.map((milestone) => (
                  <tr
                    key={milestone.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >

                    {/* Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">

                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Target className="size-4 text-muted-foreground" />
                        </div>

                        <span className="font-medium whitespace-nowrap">
                          {milestone.name}
                        </span>

                      </div>
                    </td>


                    {/* Start Date */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                        <CalendarDays className="size-4" />

                        <span>
                          {milestone.startDate}
                        </span>
                      </div>
                    </td>


                    {/* Due Date */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 whitespace-nowrap">

                        <CalendarDays className="size-4 text-muted-foreground" />

                        <span className="font-medium">
                          {milestone.dueDate}
                        </span>

                      </div>
                    </td>


                    {/* Description */}
                    <td className="max-w-[450px] px-5 py-4">
                      <span className="block truncate text-muted-foreground">
                        {milestone.description}
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


          {/* Mobile note */}
          <div className="border-t p-4 md:hidden">
            <p className="text-xs text-muted-foreground">
              Swipe horizontally to view all milestone columns.
            </p>
          </div>

        </div>
      </Container>
    </>
  );
}