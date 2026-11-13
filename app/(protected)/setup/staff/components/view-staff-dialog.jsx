'use client';

import {
Mail,
Phone,
User,
ShieldCheck,
BriefcaseBusiness,
Globe,
Clock,
Facebook,
Linkedin,
MessageSquare,
Timer,
FolderKanban,
CalendarDays,
FileText,
CheckCircle2,
XCircle,
DollarSign,
BarChart3,
} from 'lucide-react';

import {
Dialog,
DialogContent,
DialogDescription,
DialogHeader,
DialogTitle,
} from '@/components/ui/dialog';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import {
Tabs,
TabsContent,
TabsList,
TabsTrigger,
} from '@/components/ui/tabs';

export default function ViewStaffDialog({
open,
onOpenChange,
staff,
}) {
if (!staff) return null;

const fullName =
`${staff.firstName || ''} ${staff.lastName || ''}`.trim() ||
'Staff Member';

const initials =
`${staff.firstName?.[0] || ''}${staff.lastName?.[0] || ''}`.toUpperCase();

return ( <Dialog
   open={open}
   onOpenChange={onOpenChange}
 > <DialogContent className="max-w-6xl p-0 overflow-hidden">
<DialogHeader className="border-b bg-background px-6 py-5"> <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"> <div> <DialogTitle className="text-xl font-semibold">
{fullName} </DialogTitle>


          <DialogDescription className="mt-1">
            View staff information, notes, timesheets, reports and projects.
          </DialogDescription>
        </div>

        <div className="flex items-center gap-2">
          {staff.isAdministrator && (
            <Badge className="gap-1">
              <ShieldCheck className="size-3.5" />
              Administrator
            </Badge>
          )}

          {staff.isActive ? (
            <Badge
              variant="success"
              className="gap-1"
            >
              <CheckCircle2 className="size-3.5" />
              Active
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="gap-1"
            >
              <XCircle className="size-3.5" />
              Inactive
            </Badge>
          )}
        </div>
      </div>
    </DialogHeader>

    {/* CONTENT */}
    <div className="max-h-[78vh] overflow-y-auto">
      <Tabs
        defaultValue="staff"
        className="w-full"
      >
        {/*  MAIN TABS */}
        <div className="border-b bg-muted/20 px-6 pt-4">
          <TabsList className="h-auto w-full justify-start gap-1 rounded-none bg-transparent p-0">
            <TabsTrigger
              value="staff"
              className="gap-2 rounded-b-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary"
            >
              <User className="size-4" />
              Staff
            </TabsTrigger>

            <TabsTrigger
              value="notes"
              className="gap-2 rounded-b-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary"
            >
              <MessageSquare className="size-4" />
              Notes
            </TabsTrigger>

            <TabsTrigger
              value="timesheets"
              className="gap-2 rounded-b-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary"
            >
              <Timer className="size-4" />
              Timesheets & Reports
            </TabsTrigger>

            <TabsTrigger
              value="projects"
              className="gap-2 rounded-b-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary"
            >
              <FolderKanban className="size-4" />
              Projects
            </TabsTrigger>
          </TabsList>
        </div>

        {/*  STAFF TAB */}
        <TabsContent
          value="staff"
          className="mt-0 p-6"
        >
          {/* Profile Header */}
          <div className="rounded-xl border bg-muted/20 p-5">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              {staff.profileImage ? (
                <img
                  src={staff.profileImage}
                  alt={fullName}
                  className="size-24 shrink-0 rounded-full border object-cover"
                />
              ) : (
                <div className="flex size-24 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                  {initials || 'ST'}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold">
                    {fullName}
                  </h2>

                  {staff.isAdministrator && (
                    <Badge>
                      Administrator
                    </Badge>
                  )}
                </div>

                <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4" />
                  {staff.email || '-'}
                </p>

                {staff.phone && (
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="size-4" />
                    {staff.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Information */}
          <div className="mt-6">
            <SectionTitle
              icon={User}
              title="Staff Information"
            />

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <InfoCard
                icon={Mail}
                label="Email"
                value={staff.email}
              />

              <InfoCard
                icon={Phone}
                label="Phone"
                value={staff.phone}
              />

              <InfoCard
                icon={BriefcaseBusiness}
                label="Hourly Rate"
                value={
                  staff.hourlyRate !== null &&
                  staff.hourlyRate !== undefined
                    ? `$${Number(staff.hourlyRate).toFixed(2)}`
                    : '$0.00'
                }
              />

              <InfoCard
                icon={Globe}
                label="Language"
                value={
                  staff.defaultLanguage ||
                  'System Default'
                }
              />

              <InfoCard
                icon={Clock}
                label="Timezone"
                value={
                  staff.timezone ||
                  'System Default'
                }
              />

              <InfoCard
                icon={Globe}
                label="Direction"
                value={
                  staff.direction ||
                  'System Default'
                }
              />
            </div>
          </div>

          <Separator className="my-6" />
          {/* Roles */}
          <div>
            <SectionTitle
              icon={ShieldCheck}
              title="Assigned Roles"
            />
  
            <div className="mt-4 flex flex-wrap gap-2">
              {staff.roleName ? (
                <Badge
                  variant="outline"
                  className="px-3 py-1"
                >
                  {staff.roleName}
                </Badge>
              ) : (
                <EmptyState text="No role assigned." />
              )}
            </div>
          </div>

          {/* Social Profiles */}
          {(staff.facebook ||
            staff.linkedin ||
            staff.skype) && (
            <>
              <Separator className="my-6" />

              <div>
                <SectionTitle
                  icon={Globe}
                  title="Social Profiles"
                />

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {staff.facebook && (
                    <SocialItem
                      icon={Facebook}
                      label="Facebook"
                      value={staff.facebook}
                    />
                  )}

                  {staff.linkedin && (
                    <SocialItem
                      icon={Linkedin}
                      label="LinkedIn"
                      value={staff.linkedin}
                    />
                  )}

                  {staff.skype && (
                    <SocialItem
                      icon={MessageSquare}
                      label="Skype"
                      value={staff.skype}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Email Signature */}
          {staff.emailSignature && (
            <>
              <Separator className="my-6" />

              <div>
                <SectionTitle
                  icon={Mail}
                  title="Email Signature"
                />

                <div className="mt-4 rounded-lg border bg-muted/20 p-4 whitespace-pre-wrap text-sm">
                  {staff.emailSignature}
                </div>
              </div>
            </>
          )}
        </TabsContent>

        {/*  NOTES TAB */}
        <TabsContent
          value="notes"
          className="mt-0 p-6"
        >
          <SectionTitle
            icon={MessageSquare}
            title="Staff Notes"
          />

          <div className="mt-5 rounded-xl border">
            {staff.notes?.length ? (
              <div className="divide-y">
                {staff.notes.map((note) => (
                  <div
                    key={note.id}
                    className="p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">
                          {note.title ||
                            'Note'}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                          {note.description ||
                            note.note ||
                            '-'}
                        </p>
                      </div>

                      {note.createdAt && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatDate(
                            note.createdAt
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyPanel
                icon={MessageSquare}
                title="No notes found"
                description="There are no notes available for this staff member."
              />
            )}
          </div>
        </TabsContent>

        {/*  TIMESHEETS & REPORTS TAB */}
        <TabsContent
          value="timesheets"
          className="mt-0 p-6"
        >
          <SectionTitle
            icon={Timer}
            title="Timesheet Summary"
          />

          {/* Summary Cards */}
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={Clock}
              label="Total Hours"
              value={
                staff.timesheetSummary
                  ?.totalHours ?? '0h'
              }
            />

            <SummaryCard
              icon={Timer}
              label="Billable Hours"
              value={
                staff.timesheetSummary
                  ?.billableHours ?? '0h'
              }
            />

            <SummaryCard
              icon={DollarSign}
              label="Billable Amount"
              value={
                staff.timesheetSummary
                  ?.billableAmount
                  ? `$${Number(
                      staff.timesheetSummary.billableAmount
                    ).toFixed(2)}`
                  : '$0.00'
              }
            />

            <SummaryCard
              icon={BarChart3}
              label="Total Entries"
              value={
                staff.timesheetSummary
                  ?.totalEntries ?? 0
              }
            />
          </div>

          {/* Timesheet Table */}
          <div className="mt-6">
            <div className="mb-4 flex items-center justify-between">
              <SectionTitle
                icon={CalendarDays}
                title="Recent Timesheets"
              />
            </div>

            <div className="overflow-hidden rounded-xl border">
              {staff.timesheets?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left font-medium">
                          Date
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Project
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Task
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Hours
                        </th>

                        <th className="px-4 py-3 text-left font-medium">
                          Billable
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {staff.timesheets.map(
                        (item) => (
                          <tr
                            key={item.id}
                            className="border-b last:border-0"
                          >
                            <td className="px-4 py-3">
                              {formatDate(
                                item.date ||
                                  item.createdAt
                              )}
                            </td>

                            <td className="px-4 py-3 font-medium">
                              {item.projectName ||
                                item.project?.name ||
                                '-'}
                            </td>

                            <td className="px-4 py-3">
                              {item.taskName ||
                                item.task?.name ||
                                '-'}
                            </td>

                            <td className="px-4 py-3">
                              {item.hours ??
                                item.totalHours ??
                                '0'}
                            </td>

                            <td className="px-4 py-3">
                              {item.billable ? (
                                <Badge variant="success">
                                  Yes
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  No
                                </Badge>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyPanel
                  icon={Timer}
                  title="No timesheets found"
                  description="No timesheet records are available for this staff member."
                />
              )}
            </div>
          </div>

          {/* Reports */}
          <div className="mt-6">
            <SectionTitle
              icon={FileText}
              title="Reports"
            />

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <ReportCard
                title="Timesheet Report"
                description="Review logged working hours and billable time."
                value={
                  staff.timesheetSummary
                    ?.totalHours ?? '0h'
                }
              />

              <ReportCard
                title="Billing Report"
                description="Review billable hours and staff billing."
                value={
                  staff.timesheetSummary
                    ?.billableAmount
                    ? `$${Number(
                        staff.timesheetSummary.billableAmount
                      ).toFixed(2)}`
                    : '$0.00'
                }
              />
            </div>
          </div>
        </TabsContent>

        {/*    PROJECTS TAB */}
        <TabsContent
          value="projects"
          className="mt-0 p-6"
        >
          <SectionTitle
            icon={FolderKanban}
            title="Projects"
          />

          <div className="mt-5 rounded-xl border">
            {staff.projects?.length ? (
              <div className="divide-y">
                {staff.projects.map(
                  (project) => (
                    <div
                      key={project.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <FolderKanban className="size-5 text-primary" />
                        </div>

                        <div>
                          <p className="font-medium">
                            {project.name ||
                              project.projectName ||
                              'Project'}
                          </p>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {project.description ||
                              'No project description available.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {project.status && (
                          <Badge variant="outline">
                            {project.status}
                          </Badge>
                        )}

                        {project.progress !==
                          undefined && (
                          <span className="text-sm text-muted-foreground">
                            {project.progress}%
                          </span>
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <EmptyPanel
                icon={FolderKanban}
                title="No projects found"
                description="This staff member is not assigned to any projects."
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </DialogContent>
</Dialog>

);
}

/* SECTION TITLE */

function SectionTitle({
icon: Icon,
title,
}) {
return ( <div className="flex items-center gap-2"> <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10"> <Icon className="size-4 text-primary" /> </div>

  <h3 className="font-semibold">
    {title}
  </h3>
</div>

);
}

/* INFO CARD */

function InfoCard({
icon: Icon,
label,
value,
}) {
return ( <div className="flex items-start gap-3 rounded-lg border bg-background p-4"> <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted"> <Icon className="size-4 text-muted-foreground" /> </div>

  <div className="min-w-0">
    <p className="text-xs text-muted-foreground">
      {label}
    </p>

    <p className="mt-1 break-words text-sm font-medium">
      {value || '-'}
    </p>
  </div>
</div>

);
}

/* SOCIAL ITEM  */

function SocialItem({
icon: Icon,
label,
value,
}) {
return ( <div className="rounded-lg border p-4"> <div className="flex items-center gap-2"> <Icon className="size-4 text-muted-foreground" />

    <span className="text-xs text-muted-foreground">
      {label}
    </span>
  </div>

  <p className="mt-2 break-all text-sm font-medium">
    {value}
  </p>
</div>

);
}

/* SUMMARY CARD */

function SummaryCard({
icon: Icon,
label,
value,
}) {
return ( <div className="rounded-xl border bg-background p-4"> <div className="flex items-center justify-between"> <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10"> <Icon className="size-4 text-primary" /> </div> </div>

  <p className="mt-4 text-xs text-muted-foreground">
    {label}
  </p>

  <p className="mt-1 text-xl font-semibold">
    {value}
  </p>
</div>

);
}

/* REPORT CARD */

function ReportCard({
title,
description,
value,
}) {
return ( <div className="rounded-xl border p-5"> <div className="flex items-start justify-between gap-4"> <div> <p className="font-medium">
{title} </p>

      <p className="mt-1 text-sm text-muted-foreground">
        {description}
      </p>
    </div>

    <FileText className="size-5 text-muted-foreground" />
  </div>

  <div className="mt-5">
    <p className="text-xs text-muted-foreground">
      Total
    </p>

    <p className="mt-1 text-lg font-semibold">
      {value}
    </p>
  </div>
</div>
);
}

/* EMPTY STATE */

function EmptyState({
text,
}) {
return ( <p className="text-sm text-muted-foreground">
{text} </p>
);
}

/* EMPTY PANEL */

function EmptyPanel({
icon: Icon,
title,
description,
}) {
return ( <div className="flex min-h-[220px] flex-col items-center justify-center p-8 text-center"> <div className="flex size-12 items-center justify-center rounded-full bg-muted"> <Icon className="size-5 text-muted-foreground" /> </div>

  <p className="mt-4 font-medium">
    {title}
  </p>

  <p className="mt-1 max-w-md text-sm text-muted-foreground">
    {description}
  </p>
</div>

);
}

/* DATE */

function formatDate(value) {
if (!value) return '-';

const date = new Date(value);

if (Number.isNaN(date.getTime())) {
return String(value);
}

return date.toLocaleDateString(
undefined,
{
year: 'numeric',
month: 'short',
day: 'numeric',
}
);
}
