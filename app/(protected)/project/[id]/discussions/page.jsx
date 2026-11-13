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
  Eye,
  MessageSquare,
  MoreHorizontal,
  Plus,
} from 'lucide-react';

export const metadata = {
  title: 'Discussions',
  description: 'Manage project discussions.',
};

const discussions = [
  {
    id: 1,
    subject: 'Website Design Discussion',
    lastActivity: 'Sep 08, 2026 10:30 AM',
    totalComments: 8,
    visibleToCustomer: true,
  },
  {
    id: 2,
    subject: 'Project Requirements & Updates',
    lastActivity: 'Sep 07, 2026 04:15 PM',
    totalComments: 5,
    visibleToCustomer: true,
  },
  {
    id: 3,
    subject: 'Testing & Final Review',
    lastActivity: 'Sep 06, 2026 02:45 PM',
    totalComments: 3,
    visibleToCustomer: false,
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
              Discussions
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
                    Discussions
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>

          <ToolbarActions>
            <Button>
              <Plus className="mr-2 size-4" />
              New Discussion
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>


      {/* ---------------------------------------------------------
       * Discussions Table
       * --------------------------------------------------------- */}

      <Container>
        <div className="rounded-xl border bg-background">

          {/* Header */}
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Project Discussions
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage discussions and project communication.
              </p>
            </div>

            <Badge variant="secondary">
              {discussions.length} Discussions
            </Badge>
          </div>


          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-sm">

              <thead>
                <tr className="border-b bg-muted/40">

                  {/* Subject */}
                  <th className="px-5 py-3 text-left font-medium">
                    Subject
                  </th>

                  {/* Last Activity */}
                  <th className="px-5 py-3 text-left font-medium">
                    Last Activity
                  </th>

                  {/* Total Comments */}
                  <th className="px-5 py-3 text-left font-medium">
                    Total Comments
                  </th>

                  {/* Visible to Customer */}
                  <th className="px-5 py-3 text-left font-medium">
                    Visible to Customer
                  </th>

                  {/* Options */}
                  <th className="px-5 py-3 text-right font-medium">
                    Options
                  </th>

                </tr>
              </thead>


              <tbody>
                {discussions.map((discussion) => (
                  <tr
                    key={discussion.id}
                    className="border-b last:border-0 hover:bg-muted/30"
                  >

                    {/* Subject */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">

                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <MessageSquare className="size-4 text-muted-foreground" />
                        </div>

                        <div>
                          <div className="font-medium">
                            {discussion.subject}
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">
                            Discussion #{discussion.id}
                          </div>
                        </div>

                      </div>
                    </td>


                    {/* Last Activity */}
                    <td className="px-5 py-4">
                      <span className="whitespace-nowrap text-muted-foreground">
                        {discussion.lastActivity}
                      </span>
                    </td>


                    {/* Total Comments */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">

                        <MessageSquare className="size-4 text-muted-foreground" />

                        <span className="font-medium">
                          {discussion.totalComments}
                        </span>

                      </div>
                    </td>


                    {/* Visible to Customer */}
                    <td className="px-5 py-4">
                      {discussion.visibleToCustomer ? (
                        <Badge
                          variant="secondary"
                          className="gap-1"
                        >
                          <Eye className="size-3.5" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          No
                        </Badge>
                      )}
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
              Swipe horizontally to view all discussion columns.
            </p>
          </div>

        </div>
      </Container>
    </>
  );
}