'use client';

import { useMemo, useState } from 'react';

import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';

import {
  Card,
  CardContent,
} from '@/components/ui/card';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  ScrollArea,
  ScrollBar,
} from '@/components/ui/scroll-area';

import TaskOverviewDialog from './task-overview-dialog';

const STAFF_MEMBERS = [
  {
    id: '1',
    name: 'Rang Dhara',
  },
  {
    id: '2',
    name: 'John Doe',
  },
  {
    id: '3',
    name: 'Jane Smith',
  },
];

const STATUS_OPTIONS = [
  {
    value: '1',
    label: 'Not Started',
  },
  {
    value: '4',
    label: 'In Progress',
  },
  {
    value: '3',
    label: 'Testing',
  },
  {
    value: '2',
    label: 'Awaiting Feedback',
  },
  {
    value: '5',
    label: 'Complete',
  },
];

const MONTHS = [
  {
    value: '1',
    label: 'January',
  },
  {
    value: '2',
    label: 'February',
  },
  {
    value: '3',
    label: 'March',
  },
  {
    value: '4',
    label: 'April',
  },
  {
    value: '5',
    label: 'May',
  },
  {
    value: '6',
    label: 'June',
  },
  {
    value: '7',
    label: 'July',
  },
  {
    value: '8',
    label: 'August',
  },
  {
    value: '9',
    label: 'September',
  },
  {
    value: '10',
    label: 'October',
  },
  {
    value: '11',
    label: 'November',
  },
  {
    value: '12',
    label: 'December',
  },
];

const YEARS = [
  '2024',
  '2025',
  '2026',
  '2027',
];

const TASKS = [
  {
    id: 1,

    name: 'Smart Test',

    startDate: '2026-09-09',

    dueDate: '2026-09-15',

    status: '4',

    attachments: 2,

    comments: 1,

    checklistItems: 0,

    loggedTime: '00:00',

    totalLoggedTime: '00:00',

    finishedOnTime: '-',

    assignedTo: 'Rang Dhara',

    memberId: '1',

    createdAt: '2026-09-09 10:14:32',

    description: '',

    priority: 'Medium',

    hourlyRate: '10.00',

    billable: true,

    billableAmount: '0.00',

    customFieldName: 'Smart Test',

    customFieldValue: 'Example',

    tags: [],

    reminders: [],

    assignees: [
      'Rang Dhara',
    ],

    followers: [],

    attachmentsList: [],

    checklist: [],

    commentsList: [
      {
        id: 1,
        user: 'Rang Dhara',
        text: 'DSAS',
        createdAt: '2026-09-11 15:16:43',
      },
    ],

    timesheets: [
      {
        id: 2,

        member: 'Rang Dhara',

        startTime: '2026-09-11 15:16',

        endTime: '2026-09-11 15:16',

        time: '00:00',

        decimal: '0.00',

        note: 'tEST',
      },

      {
        id: 1,

        member: 'Rang Dhara',

        startTime: '2026-09-09 10:15',

        endTime: '2026-09-09 10:15',

        time: '00:00',

        decimal: '0.00',

        note: '',
      },
    ],
  },

  {
    id: 2,

    name: 'Website Development',

    startDate: '2026-09-10',

    dueDate: '2026-09-20',

    status: '1',

    attachments: 1,

    comments: 0,

    checklistItems: 3,

    loggedTime: '02:30',

    totalLoggedTime: '02:30',

    finishedOnTime: '-',

    assignedTo: 'Rang Dhara',

    memberId: '1',

    createdAt: '2026-09-10 09:20:00',

    description:
      'Complete website development and testing.',

    priority: 'High',

    hourlyRate: '15.00',

    billable: true,

    billableAmount: '37.50',

    customFieldName: '',

    customFieldValue: '',

    tags: ['Website'],

    reminders: [],

    assignees: [
      'Rang Dhara',
    ],

    followers: [],

    attachmentsList: [
      'website-brief.pdf',
    ],

    checklist: [
      {
        id: 1,
        name: 'Complete frontend',
        completed: true,
      },
      {
        id: 2,
        name: 'Complete backend',
        completed: false,
      },
      {
        id: 3,
        name: 'Testing',
        completed: false,
      },
    ],

    commentsList: [],

    timesheets: [
      {
        id: 101,

        member: 'Rang Dhara',

        startTime: '2026-09-10 09:00',

        endTime: '2026-09-10 11:30',

        time: '02:30',

        decimal: '2.50',

        note: 'Website development',
      },
    ],
  },

  {
    id: 3,

    name: 'API Integration',

    startDate: '2026-09-05',

    dueDate: '2026-09-20',

    status: '1',

    attachments: 1,

    comments: 2,

    checklistItems: 5,

    loggedTime: '04:45',

    totalLoggedTime: '04:45',

    finishedOnTime: '-',

    assignedTo: 'Rang Dhara',

    memberId: '1',

    createdAt: '2026-09-05 09:30:00',

    description:
      'Integrate required third-party APIs.',

    priority: 'Medium',

    hourlyRate: '12.00',

    billable: true,

    billableAmount: '57.00',

    customFieldName: '',

    customFieldValue: '',

    tags: ['API'],

    reminders: [],

    assignees: [
      'Rang Dhara',
    ],

    followers: [],

    attachmentsList: [],

    checklist: [
      {
        id: 1,
        name: 'API credentials',
        completed: true,
      },
      {
        id: 2,
        name: 'Authentication',
        completed: false,
      },
    ],

    commentsList: [],

    timesheets: [],
  },

  {
    id: 4,

    name: 'Testing & Bug Fixing',

    startDate: '2026-08-25',

    dueDate: '2026-09-05',

    status: '5',

    attachments: 4,

    comments: 9,

    checklistItems: 10,

    loggedTime: '18:20',

    totalLoggedTime: '18:20',

    finishedOnTime: 'Yes',

    assignedTo: 'Jane Smith',

    memberId: '3',

    createdAt: '2026-08-25 10:00:00',

    description:
      'Complete application testing and bug fixing.',

    priority: 'High',

    hourlyRate: '20.00',

    billable: true,

    billableAmount: '366.67',

    customFieldName: '',

    customFieldValue: '',

    tags: ['Testing'],

    reminders: [],

    assignees: [
      'Jane Smith',
    ],

    followers: [],

    attachmentsList: [],

    checklist: [],

    commentsList: [],

    timesheets: [],
  },

  {
    id: 5,

    name: 'SEO Optimization',

    startDate: '2026-09-08',

    dueDate: '2026-09-25',

    status: '2',

    attachments: 2,

    comments: 3,

    checklistItems: 7,

    loggedTime: '06:10',

    totalLoggedTime: '06:10',

    finishedOnTime: '-',

    assignedTo: 'Rang Dhara',

    memberId: '1',

    createdAt: '2026-09-08 10:00:00',

    description:
      'Optimize website pages for search engines.',

    priority: 'Medium',

    hourlyRate: '10.00',

    billable: true,

    billableAmount: '61.67',

    customFieldName: '',

    customFieldValue: '',

    tags: ['SEO'],

    reminders: [],

    assignees: [
      'Rang Dhara',
    ],

    followers: [],

    attachmentsList: [],

    checklist: [],

    commentsList: [],

    timesheets: [],
  },
];

const getStatusLabel = (status) => {
  return (
    STATUS_OPTIONS.find(
      (item) =>
        item.value === String(status)
    )?.label || '-'
  );
};

const getStatusClass = (status) => {
  switch (String(status)) {
    case '1':
      return 'text-slate-500';

    case '4':
      return 'text-blue-500';

    case '3':
      return 'text-sky-600';

    case '2':
      return 'text-lime-600';

    case '5':
      return 'text-green-500';

    default:
      return 'text-muted-foreground';
  }
};

export default function TaskOverview() {
  const [member, setMember] = useState('');

  const [month, setMonth] = useState('9');

  const [status, setStatus] = useState('');

  const [year, setYear] = useState('2026');

  const [selectedTask, setSelectedTask] =
    useState(null);

  const [appliedFilters, setAppliedFilters] =
    useState({
      member: '',
      month: '9',
      status: '',
      year: '2026',
    });

  const filteredTasks = useMemo(() => {
    return TASKS.filter((task) => {
      if (
        appliedFilters.member &&
        task.memberId !==
          appliedFilters.member
      ) {
        return false;
      }

      if (
        appliedFilters.status &&
        task.status !==
          appliedFilters.status
      ) {
        return false;
      }

      if (appliedFilters.month) {
        const taskDate = new Date(
          task.startDate
        );

        const taskMonth = String(
          taskDate.getMonth() + 1
        );

        if (
          taskMonth !==
          appliedFilters.month
        ) {
          return false;
        }
      }

      if (appliedFilters.year) {
        const taskDate = new Date(
          task.startDate
        );

        const taskYear = String(
          taskDate.getFullYear()
        );

        if (
          taskYear !==
          appliedFilters.year
        ) {
          return false;
        }
      }

      return true;
    });
  }, [appliedFilters]);

  const handleFilter = () => {
    setAppliedFilters({
      member,
      month,
      status,
      year,
    });
  };

  const handleReset = () => {
    setMember('');

    setMonth('9');

    setStatus('');

    setYear('2026');

    setAppliedFilters({
      member: '',
      month: '9',
      status: '',
      year: '2026',
    });
  };

  return (
    <div className="space-y-6">
      {/* FILTERS */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            {/* STAFF */}
            <div>
              <Select
                value={member || 'all'}
                onValueChange={(value) =>
                  setMember(
                    value === 'all'
                      ? ''
                      : value
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Staff Members" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    All Staff Members
                  </SelectItem>

                  {STAFF_MEMBERS.map(
                    (staff) => (
                      <SelectItem
                        key={staff.id}
                        value={staff.id}
                      >
                        {staff.name}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* MONTH */}
            <div>
              <Select
                value={month || 'all'}
                onValueChange={(value) =>
                  setMonth(
                    value === 'all'
                      ? ''
                      : value
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    All Months
                  </SelectItem>

                  {MONTHS.map((item) => (
                    <SelectItem
                      key={item.value}
                      value={item.value}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* STATUS */}
            <div>
              <Select
                value={status || 'all'}
                onValueChange={(value) =>
                  setStatus(
                    value === 'all'
                      ? ''
                      : value
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">
                    All
                  </SelectItem>

                  {STATUS_OPTIONS.map(
                    (item) => (
                      <SelectItem
                        key={item.value}
                        value={item.value}
                      >
                        {item.label}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* YEAR */}
            <div>
              <Select
                value={year}
                onValueChange={setYear}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>

                <SelectContent>
                  {YEARS.map((item) => (
                    <SelectItem
                      key={item}
                      value={item}
                    >
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* BUTTONS */}
            <div className="flex gap-2">
              <Button
                type="button"
                className="flex-1"
                onClick={handleFilter}
              >
                Filter
              </Button>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleReset}
                title="Reset filters"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TASK TABLE */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">
                    Name
                  </TableHead>

                  <TableHead className="min-w-[130px]">
                    Start Date
                  </TableHead>

                  <TableHead className="min-w-[130px]">
                    Due Date
                  </TableHead>

                  <TableHead className="min-w-[150px]">
                    Status
                  </TableHead>

                  <TableHead className="min-w-[180px]">
                    Total attachments added
                  </TableHead>

                  <TableHead className="min-w-[140px]">
                    Total comments
                  </TableHead>

                  <TableHead className="min-w-[140px]">
                    Checklist Items
                  </TableHead>

                  <TableHead className="min-w-[160px]">
                    Total Logged Time
                  </TableHead>

                  <TableHead className="min-w-[150px]">
                    Finished on time?
                  </TableHead>

                  <TableHead className="min-w-[160px]">
                    Assigned to
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredTasks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="h-32 text-center text-muted-foreground"
                    >
                      No tasks found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTasks.map(
                    (task) => (
                      <TableRow
                        key={task.id}
                      >
                        {/* NAME */}
                        <TableCell>
                          <Button
                            type="button"
                            variant="link"
                            className="h-auto p-0 font-medium"
                            onClick={() =>
                              setSelectedTask(
                                task
                              )
                            }
                          >
                            {task.name}
                          </Button>
                        </TableCell>

                        <TableCell>
                          {task.startDate}
                        </TableCell>

                        <TableCell>
                          {task.dueDate}
                        </TableCell>

                        <TableCell>
                          <span
                            className={`font-medium ${getStatusClass(
                              task.status
                            )}`}
                          >
                            {getStatusLabel(
                              task.status
                            )}
                          </span>
                        </TableCell>

                        <TableCell>
                          {task.attachments}
                        </TableCell>

                        <TableCell>
                          {task.commentsList
                            ?.length ||
                            task.comments ||
                            0}
                        </TableCell>

                        <TableCell>
                          {task.checklistItems}
                        </TableCell>

                        <TableCell>
                          {task.totalLoggedTime ||
                            task.loggedTime}
                        </TableCell>

                        <TableCell>
                          {task.finishedOnTime ===
                          'Yes' ? (
                            <span className="font-medium text-green-600">
                              Yes
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              {task.finishedOnTime}
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {task.assignedTo}
                        </TableCell>
                      </TableRow>
                    )
                  )
                )}
              </TableBody>
            </Table>

            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>

      {/* RESULT COUNT */}
      <div className="text-sm text-muted-foreground">
        Showing{' '}
        <span className="font-medium text-foreground">
          {filteredTasks.length}
        </span>{' '}
        task
        {filteredTasks.length !== 1
          ? 's'
          : ''}
      </div>

      {/* TASK DETAIL DIALOG */}
      <TaskOverviewDialog
        open={Boolean(selectedTask)}
        closeDialog={() =>
          setSelectedTask(null)
        }
        task={selectedTask}
      />
    </div>
  );
}