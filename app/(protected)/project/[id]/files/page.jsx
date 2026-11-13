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
  Check,
  File,
  FileText,
  Image,
  MoreHorizontal,
  Plus,
  Upload,
  UserRound,
} from 'lucide-react';

export const metadata = {
  title: 'Files',
  description: 'Manage project files.',
};

const files = [
  {
    id: 1,
    filename: 'homepage-design.fig',
    fileType: 'Figma File',
    lastActivity: 'Updated 2 hours ago',
    comments: 4,
    visibleToCustomer: true,
    uploadedBy: 'Rang Dhara',
    dateUploaded: 'Sep 08, 2026',
    icon: FileText,
  },
  {
    id: 2,
    filename: 'project-documentation.pdf',
    fileType: 'PDF',
    lastActivity: 'Updated yesterday',
    comments: 2,
    visibleToCustomer: true,
    uploadedBy: 'John Doe',
    dateUploaded: 'Sep 07, 2026',
    icon: File,
  },
  {
    id: 3,
    filename: 'homepage-preview.png',
    fileType: 'PNG Image',
    lastActivity: 'Updated Sep 05, 2026',
    comments: 0,
    visibleToCustomer: false,
    uploadedBy: 'Rang Dhara',
    dateUploaded: 'Sep 05, 2026',
    icon: Image,
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
              Files
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
                    Project Files
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </ToolbarHeading>

          <ToolbarActions>
            <Button>
              <Upload className="mr-2 size-4" />
              Upload File
            </Button>
          </ToolbarActions>
        </Toolbar>
      </Container>


      {/* ---------------------------------------------------------
       * Files Table
       * --------------------------------------------------------- */}

      <Container>
        <div className="rounded-xl border bg-background">

          {/* Table Header */}
          <div className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Project Files
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage files and documents associated with this project.
              </p>
            </div>

            <Badge variant="secondary">
              {files.length} Files
            </Badge>
          </div>


          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">

              <thead>
                <tr className="border-b bg-muted/40">

                  {/* Select All */}
                  <th className="w-12 px-5 py-3 text-left">
                    <input
                      type="checkbox"
                      id="mass_select_all"
                      className="size-4 cursor-pointer rounded border-input"
                    />
                  </th>

                  {/* Filename */}
                  <th className="px-5 py-3 text-left font-medium">
                    Filename
                  </th>

                  {/* File Type */}
                  <th className="px-5 py-3 text-left font-medium">
                    File type
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

                  {/* Uploaded By */}
                  <th className="px-5 py-3 text-left font-medium">
                    Uploaded by
                  </th>

                  {/* Date Uploaded */}
                  <th className="px-5 py-3 text-left font-medium">
                    Date uploaded
                  </th>

                  {/* Options */}
                  <th className="px-5 py-3 text-right font-medium">
                    Options
                  </th>

                </tr>
              </thead>


              <tbody>
                {files.map((file) => {
                  const FileIcon = file.icon;

                  return (
                    <tr
                      key={file.id}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >

                      {/* Checkbox */}
                      <td className="px-5 py-4">
                        <input
                          type="checkbox"
                          className="size-4 cursor-pointer rounded border-input"
                        />
                      </td>


                      {/* Filename */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">

                          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <FileIcon className="size-4 text-muted-foreground" />
                          </div>

                          <span className="font-medium whitespace-nowrap">
                            {file.filename}
                          </span>

                        </div>
                      </td>


                      {/* File Type */}
                      <td className="px-5 py-4">
                        <Badge variant="outline">
                          {file.fileType}
                        </Badge>
                      </td>


                      {/* Last Activity */}
                      <td className="px-5 py-4">
                        <span className="whitespace-nowrap text-muted-foreground">
                          {file.lastActivity}
                        </span>
                      </td>


                      {/* Total Comments */}
                      <td className="px-5 py-4">
                        <span className="font-medium">
                          {file.comments}
                        </span>
                      </td>


                      {/* Visible to Customer */}
                      <td className="px-5 py-4">
                        {file.visibleToCustomer ? (
                          <div className="flex items-center gap-2">
                            <div className="flex size-6 items-center justify-center rounded-full bg-muted">
                              <Check className="size-3.5" />
                            </div>

                            <span>
                              Yes
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            No
                          </span>
                        )}
                      </td>


                      {/* Uploaded By */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">

                          <div className="flex size-8 items-center justify-center rounded-full bg-muted">
                            <UserRound className="size-4 text-muted-foreground" />
                          </div>

                          <span className="whitespace-nowrap">
                            {file.uploadedBy}
                          </span>

                        </div>
                      </td>


                      {/* Date Uploaded */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                          <CalendarDays className="size-4" />

                          <span>
                            {file.dateUploaded}
                          </span>
                        </div>
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
                  );
                })}
              </tbody>

            </table>
          </div>


          {/* Mobile note */}
          <div className="border-t p-4 md:hidden">
            <p className="text-xs text-muted-foreground">
              Swipe horizontally to view all file columns.
            </p>
          </div>

        </div>
      </Container>
    </>
  );
}