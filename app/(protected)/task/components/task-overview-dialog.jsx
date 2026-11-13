"use client";

import { useEffect, useRef, useState } from "react";

import {
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  Paperclip,
  Users,
  UserPlus,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Separator } from "@/components/ui/separator";

// =====================================================
// STATUS CLASS
// =====================================================

const getStatusClass = (status) => {
  switch (status) {
    case "Not Started":
      return "text-slate-500 border-slate-300 bg-slate-50";

    case "In Progress":
      return "text-blue-600 border-blue-200 bg-blue-50";

    case "Testing":
      return "text-sky-600 border-sky-200 bg-sky-50";

    case "Awaiting Feedback":
      return "text-lime-600 border-lime-200 bg-lime-50";

    case "Complete":
      return "text-green-600 border-green-200 bg-green-50";

    default:
      return "text-muted-foreground border-border bg-muted";
  }
};

// =====================================================
// INFO ITEM
// =====================================================

function InfoItem({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

      <div>
        <p className="text-xs text-muted-foreground">{label}</p>

        <div className="mt-0.5 text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

// =====================================================
// HELPERS
// =====================================================

const formatDateTime = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const getTimeDifference = (start, end) => {
  if (!start || !end) {
    return {
      minutes: 0,
      timeSpent: "00:00",
      decimal: 0,
    };
  }

  const startDate = new Date(start.replace(" ", "T"));
  const endDate = new Date(end.replace(" ", "T"));

  const difference = Math.max(
    0,
    Math.floor((endDate.getTime() - startDate.getTime()) / 60000),
  );

  const hours = Math.floor(difference / 60);
  const minutes = difference % 60;

  return {
    minutes: difference,
    timeSpent: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}`,
    decimal: Number((difference / 60).toFixed(2)),
  };
};

// =====================================================
// COMPONENT
// =====================================================

export default function TaskOverviewDialog({ task, open, onOpenChange }) {
  const [taskData, setTaskData] = useState(task);

  const [commentText, setCommentText] = useState("");

  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [timerStart, setTimerStart] = useState(null);

  const [timerSeconds, setTimerSeconds] = useState(0);

  const timerRef = useRef(null);

  const attachmentInputRef = useRef(null);

  // =====================================================
  // SYNC TASK
  // =====================================================

  useEffect(() => {
    if (!task) {
      return;
    }

    setTaskData({
      ...task,
      checklist: Array.isArray(task.checklist) ? [...task.checklist] : [],
      timesheets: Array.isArray(task.timesheets) ? [...task.timesheets] : [],
      followers: Array.isArray(task.followers) ? [...task.followers] : [],
      commentsList: Array.isArray(task.comments) ? [...task.comments] : [],
    });

    setCommentText("");
  }, [task]);

  // =====================================================
  // TIMER
  // =====================================================

  useEffect(() => {
    if (!isTimerRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      return;
    }

    timerRef.current = setInterval(() => {
      if (!timerStart) {
        return;
      }

      const seconds = Math.floor((Date.now() - timerStart.getTime()) / 1000);

      setTimerSeconds(seconds);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isTimerRunning, timerStart]);

  // =====================================================
  // FORMAT TIMER
  // =====================================================

  const formatTimer = (seconds) => {
    const hours = Math.floor(seconds / 3600);

    const minutes = Math.floor((seconds % 3600) / 60);

    const remainingSeconds = seconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0",
    )}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  // =====================================================
  // MARK COMPLETE
  // =====================================================

  const handleMarkComplete = () => {
    setTaskData((previous) => ({
      ...previous,
      statusLabel: "Complete",
      finishedOnTime: "Yes",
    }));
  };

  // =====================================================
  // STATISTICS
  // =====================================================

  const handleStatistics = () => {
    const timesheets = taskData?.timesheets || [];

    const totalMinutes = timesheets.reduce((total, item) => {
      const start = item.startTime;
      const end = item.endTime;

      return total + getTimeDifference(start, end).minutes;
    }, 0);

    const hours = Math.floor(totalMinutes / 60);

    const minutes = totalMinutes % 60;

    const message = [
      `Task: ${taskData.name}`,
      `Status: ${taskData.statusLabel}`,
      `Timesheets: ${timesheets.length}`,
      `Total logged time: ${String(hours).padStart(
        2,
        "0",
      )}:${String(minutes).padStart(2, "0")}`,
      `Checklist items: ${(taskData.checklist || []).length}`,
      `Comments: ${
        Array.isArray(taskData.commentsList)
          ? taskData.commentsList.length
          : Number(taskData.comments || 0)
      }`,
      `Attachments: ${taskData.attachments || 0}`,
    ].join("\n");

    window.alert(message);
  };

  // =====================================================
  // TIMESHEETS SCROLL
  // =====================================================

  const handleTimesheets = () => {
    const element = document.getElementById("task-timesheets-section");

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  // =====================================================
  // START / STOP TIMER
  // =====================================================

  const handleTimer = () => {
    if (!isTimerRunning) {
      const now = new Date();

      setTimerStart(now);

      setTimerSeconds(0);

      setIsTimerRunning(true);

      return;
    }

    const end = new Date();

    const start = timerStart || end;

    const startTime = formatDateTime(start);

    const endTime = formatDateTime(end);

    const calculated = getTimeDifference(startTime, endTime);

    const newTimesheet = {
      id: Date.now(),
      member: taskData.assignedTo || "Current User",
      startTime,
      endTime,
      timeSpent: calculated.timeSpent,
      decimal: calculated.decimal,
      note: "",
    };

    setTaskData((previous) => ({
      ...previous,
      timesheets: [...(previous.timesheets || []), newTimesheet],
      loggedTime: calculated.timeSpent,
    }));

    setIsTimerRunning(false);

    setTimerStart(null);

    setTimerSeconds(0);
  };

  // =====================================================
  // EDIT DESCRIPTION
  // =====================================================

  const handleEditDescription = () => {
    const description = window.prompt(
      "Enter task description:",
      taskData.description || "",
    );

    if (description === null) {
      return;
    }

    setTaskData((previous) => ({
      ...previous,
      description,
    }));
  };

  // =====================================================
  // ADD CHECKLIST
  // =====================================================

  const handleAddChecklist = () => {
    const name = window.prompt("Enter checklist item:");

    if (!name || !name.trim()) {
      return;
    }

    const newItem = {
      id: Date.now(),
      name: name.trim(),
      completed: false,
    };

    setTaskData((previous) => ({
      ...previous,
      checklist: [...(previous.checklist || []), newItem],
    }));
  };

  // =====================================================
  // TOGGLE CHECKLIST
  // =====================================================

  const handleToggleChecklist = (id) => {
    setTaskData((previous) => ({
      ...previous,
      checklist: (previous.checklist || []).map((item) =>
        item.id === id
          ? {
              ...item,
              completed: !item.completed,
            }
          : item,
      ),
    }));
  };

  // =====================================================
  // ADD COMMENT
  // =====================================================

  const handleAddComment = () => {
    const comment = commentText.trim();

    if (!comment) {
      return;
    }

    const newComment = {
      id: Date.now(),
      user: taskData.assignedTo || "Current User",
      comment,
      createdAt: formatDateTime(new Date()),
    };

    setTaskData((previous) => ({
      ...previous,
      commentsList: [...(previous.commentsList || []), newComment],
      comments: Array.isArray(previous.commentsList)
        ? previous.commentsList.length + 1
        : Number(previous.comments || 0) + 1,
    }));

    setCommentText("");
  };

  // =====================================================
  // EDIT TIMESHEET
  // =====================================================

  const handleEditTimesheet = (timesheet) => {
    const startTime = window.prompt("Start Time:", timesheet.startTime || "");

    if (startTime === null) {
      return;
    }

    const endTime = window.prompt("End Time:", timesheet.endTime || "");

    if (endTime === null) {
      return;
    }

    const note = window.prompt("Note:", timesheet.note || "");

    if (note === null) {
      return;
    }

    const calculated = getTimeDifference(startTime, endTime);

    setTaskData((previous) => ({
      ...previous,
      timesheets: (previous.timesheets || []).map((item) =>
        item.id === timesheet.id
          ? {
              ...item,
              startTime,
              endTime,
              timeSpent: calculated.timeSpent,
              decimal: calculated.decimal,
              note,
            }
          : item,
      ),
    }));
  };

  // =====================================================
  // ADD TIMESHEET
  // =====================================================

  const handleAddTimesheet = () => {
    const member = window.prompt(
      "Member:",
      taskData.assignedTo || "Current User",
    );

    if (member === null) {
      return;
    }

    const startTime = window.prompt("Start Time:", formatDateTime(new Date()));

    if (startTime === null) {
      return;
    }

    const endTime = window.prompt("End Time:", formatDateTime(new Date()));

    if (endTime === null) {
      return;
    }

    const note = window.prompt("Note:", "");

    if (note === null) {
      return;
    }

    const calculated = getTimeDifference(startTime, endTime);

    const newTimesheet = {
      id: Date.now(),
      member,
      startTime,
      endTime,
      timeSpent: calculated.timeSpent,
      decimal: calculated.decimal,
      note,
    };

    setTaskData((previous) => ({
      ...previous,
      timesheets: [...(previous.timesheets || []), newTimesheet],
    }));
  };

  // =====================================================
  // DELETE TIMESHEET
  // =====================================================

  const handleDeleteTimesheet = (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this timesheet?",
    );

    if (!confirmed) {
      return;
    }

    setTaskData((previous) => ({
      ...previous,
      timesheets: (previous.timesheets || []).filter((item) => item.id !== id),
    }));
  };

  // =====================================================
  // ASSIGN TASK
  // =====================================================

  const handleAssignTask = () => {
    const assignee = window.prompt(
      "Assign task to:",
      taskData.assignedTo || "",
    );

    if (assignee === null) {
      return;
    }

    setTaskData((previous) => ({
      ...previous,
      assignedTo: assignee.trim(),
    }));
  };

  // =====================================================
  // REMOVE ASSIGNEE
  // =====================================================

  const handleRemoveAssignee = () => {
    setTaskData((previous) => ({
      ...previous,
      assignedTo: "",
    }));
  };

  // =====================================================
  // ADD FOLLOWER
  // =====================================================

  const handleAddFollower = () => {
    const follower = window.prompt("Add follower:");

    if (!follower || !follower.trim()) {
      return;
    }

    setTaskData((previous) => ({
      ...previous,
      followers: [...(previous.followers || []), follower.trim()],
    }));
  };

  // =====================================================
  // REMOVE FOLLOWER
  // =====================================================

  const handleRemoveFollower = (index) => {
    setTaskData((previous) => ({
      ...previous,
      followers: (previous.followers || []).filter(
        (_, followerIndex) => followerIndex !== index,
      ),
    }));
  };

  // =====================================================
  // MAKE PUBLIC
  // =====================================================

  const handleMakePublic = () => {
    setTaskData((previous) => ({
      ...previous,
      isPublic: true,
    }));
  };

  // =====================================================
  // ATTACHMENT
  // =====================================================

  const handleAttachmentClick = () => {
    if (attachmentInputRef.current) {
      attachmentInputRef.current.click();
    }
  };

  const handleAttachmentChange = (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    setTaskData((previous) => ({
      ...previous,
      attachments: Number(previous.attachments || 0) + files.length,
    }));

    event.target.value = "";
  };

  // =====================================================
  // SAFETY
  // =====================================================

  if (!taskData) {
    return null;
  }

  const commentCount = Array.isArray(taskData.commentsList)
    ? taskData.commentsList.length
    : Number(taskData.comments || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          max-w-6xl
          max-h-[90vh]
          overflow-y-auto
          p-0
        "
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <DialogHeader
          className="
            border-b
            px-6
            py-5
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-3
                  text-xl
                "
              >
                {taskData.name}

                <span
                  className={`
                    rounded-md
                    border
                    px-2
                    py-1
                    text-xs
                    font-medium
                    ${getStatusClass(taskData.statusLabel)}
                  `}
                >
                  {taskData.statusLabel}
                </span>
              </DialogTitle>

              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium">
                  {taskData.isPublic ? "Public Task" : "Private Task"}
                </span>{" "}
                —{" "}
                {!taskData.isPublic && (
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={handleMakePublic}
                  >
                    Make public
                  </button>
                )}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* ================================================= */}
        {/* BODY */}
        {/* ================================================= */}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px]">
          {/* ================================================= */}
          {/* LEFT */}
          {/* ================================================= */}

          <div className="p-6">
            {/* CREATED */}

            <p className="mb-5 text-sm text-muted-foreground">
              Created at{" "}
              <span className="font-medium text-foreground">
                {taskData.createdAt}
              </span>
            </p>

            {/* ACTION BUTTONS */}

            <div className="mb-5 flex flex-wrap gap-2">
              <Button
                size="icon"
                variant="default"
                title="Mark as complete"
                onClick={handleMarkComplete}
              >
                <Check className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                variant="outline"
                title="Statistics"
                onClick={handleStatistics}
              >
                <FileText className="h-4 w-4" />
              </Button>

              <Button
                size="icon"
                variant="outline"
                title="Timesheets"
                onClick={handleTimesheets}
              >
                <Clock className="h-4 w-4" />
              </Button>

              <Button variant="secondary" onClick={handleTimer}>
                <Clock className="mr-2 h-4 w-4" />

                {isTimerRunning
                  ? `Stop Timer (${formatTimer(timerSeconds)})`
                  : "Start Timer"}
              </Button>
            </div>

            <Separator className="mb-6" />

            {/* ================================================= */}
            {/* DESCRIPTION */}
            {/* ================================================= */}

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold">Description</h3>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditDescription}
                >
                  Edit
                </Button>
              </div>

              {taskData.description ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  {taskData.description}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No description for this task
                </p>
              )}
            </section>

            <Separator className="my-6" />

            {/* ================================================= */}
            {/* CHECKLIST */}
            {/* ================================================= */}

            <section>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold">Checklist Items</h3>

                <Button
                  variant="ghost"
                  size="icon"
                  title="Add checklist item"
                  onClick={handleAddChecklist}
                >
                  +
                </Button>
              </div>

              {taskData.checklist?.length > 0 ? (
                <div className="space-y-2">
                  {taskData.checklist.map((item) => (
                    <div
                      key={item.id}
                      className="
                          flex
                          items-center
                          gap-3
                          rounded-md
                          border
                          p-3
                        "
                      onClick={() => handleToggleChecklist(item.id)}
                    >
                      <CheckCircle2
                        className={`
                            h-4
                            w-4
                            ${
                              item.completed
                                ? "text-green-500"
                                : "text-muted-foreground"
                            }
                          `}
                      />

                      <span
                        className={
                          item.completed
                            ? "text-sm line-through text-muted-foreground"
                            : "text-sm"
                        }
                      >
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Checklist items not found for this task
                </p>
              )}
            </section>

            <Separator className="my-6" />

            {/* ================================================= */}
            {/* COMMENTS */}
            {/* ================================================= */}

            <section>
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />

                <h3 className="text-base font-semibold">Comments</h3>

                <span className="text-sm text-muted-foreground">
                  ({commentCount})
                </span>
              </div>

              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                className="
                  min-h-[90px]
                  w-full
                  resize-none
                  rounded-md
                  border
                  bg-background
                  px-3
                  py-2
                  text-sm
                  outline-none
                  focus:ring-2
                  focus:ring-primary
                "
                placeholder="Add Comment"
              />

              <div className="mt-3 flex justify-end">
                <Button onClick={handleAddComment}>Add Comment</Button>
              </div>
            </section>

            <Separator className="my-6" />

            {/* ================================================= */}
            {/* TIMESHEETS */}
            {/* ================================================= */}

            <section id="task-timesheets-section">
              <h3 className="mb-4 text-base font-semibold">Timesheets</h3>

              {taskData.timesheets?.length > 0 ? (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-4 py-3 text-left">Member</th>

                        <th className="px-4 py-3 text-left">Start Time</th>

                        <th className="px-4 py-3 text-left">End Time</th>

                        <th className="px-4 py-3 text-left">Time Spent</th>
                      </tr>
                    </thead>

                    <tbody>
                      {taskData.timesheets.map((timesheet) => (
                        <tr
                          key={timesheet.id}
                          className="border-t cursor-pointer hover:bg-muted/50"
                          onClick={() => handleEditTimesheet(timesheet)}
                          title="Click to edit timesheet"
                        >
                          <td className="px-4 py-3">{timesheet.member}</td>

                          <td className="px-4 py-3">{timesheet.startTime}</td>

                          <td className="px-4 py-3">{timesheet.endTime}</td>

                          <td className="px-4 py-3">{timesheet.timeSpent}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="border-t p-3">
                    <Button variant="outline" onClick={handleAddTimesheet}>
                      Add Timesheet
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">
                    No timesheets found for this task.
                  </p>

                  <Button
                    variant="outline"
                    className="mt-3"
                    onClick={handleAddTimesheet}
                  >
                    Add Timesheet
                  </Button>
                </div>
              )}
            </section>
          </div>

          {/* ================================================= */}
          {/* RIGHT SIDEBAR */}
          {/* ================================================= */}

          <div
            className="
              border-t
              bg-muted/20
              p-6
              lg:border-l
              lg:border-t-0
            "
          >
            {/* ================================================= */}
            {/* TASK INFO */}
            {/* ================================================= */}

            <h3 className="mb-5 text-base font-semibold">Task Info</h3>

            <div className="space-y-5">
              <InfoItem icon={CheckCircle2} label="Status">
                <span
                  className={`
                    inline-flex
                    rounded-md
                    border
                    px-2
                    py-1
                    text-xs
                    ${getStatusClass(taskData.statusLabel)}
                  `}
                >
                  {taskData.statusLabel}
                </span>
              </InfoItem>

              <InfoItem icon={Calendar} label="Start Date">
                {taskData.startDate}
              </InfoItem>

              <InfoItem icon={CalendarCheck} label="Due Date">
                {taskData.dueDate || "-"}
              </InfoItem>

              <InfoItem icon={CheckCircle2} label="Priority">
                {taskData.priority}
              </InfoItem>

              <InfoItem icon={Clock} label="Hourly Rate">
                {taskData.hourlyRate}
              </InfoItem>

              <InfoItem icon={DollarSign} label="Billable">
                {taskData.billable ? "Billable (Not Billed)" : "Not Billable"}
              </InfoItem>

              <InfoItem icon={DollarSign} label="Billable Amount">
                {taskData.billableAmount}
              </InfoItem>

              <InfoItem icon={Clock} label="Your logged time">
                {taskData.loggedTime}
              </InfoItem>

              <InfoItem icon={Clock} label="Total logged time">
                <span className="text-green-600">
                  {taskData.totalLoggedTime}
                </span>
              </InfoItem>
            </div>

            <Separator className="my-6" />

            {/* ================================================= */}
            {/* ASSIGNEES */}
            {/* ================================================= */}

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />

                <h3 className="text-base font-semibold">Assignees</h3>
              </div>

              <div className="mb-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleAssignTask}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign task to
                </Button>
              </div>

              {taskData.assignedTo ? (
                <div
                  className="
                  rounded-md
                  border
                  bg-background
                  p-3
                "
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="
                      flex
                      h-9
                      w-9
                      items-center
                      justify-center
                      rounded-full
                      bg-muted
                    "
                    >
                      <Users className="h-4 w-4" />
                    </div>

                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {taskData.assignedTo}
                      </p>

                      <p className="text-xs text-muted-foreground">Assigned</p>
                    </div>

                    <button
                      type="button"
                      className="text-destructive"
                      title="Remove assignee"
                      onClick={handleRemoveAssignee}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No assignee for this task
                </p>
              )}
            </div>

            <Separator className="my-6" />

            {/* ================================================= */}
            {/* FOLLOWERS */}
            {/* ================================================= */}

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />

                <h3 className="text-base font-semibold">Followers</h3>
              </div>

              <Button
                variant="outline"
                className="mb-3 w-full justify-start"
                onClick={handleAddFollower}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Followers
              </Button>

              {taskData.followers?.length > 0 ? (
                <div className="space-y-2">
                  {taskData.followers.map((follower, index) => (
                    <div
                      key={`${follower}-${index}`}
                      className="
                          flex
                          items-center
                          justify-between
                          rounded-md
                          border
                          bg-background
                          p-3
                        "
                    >
                      <span className="text-sm">{follower}</span>

                      <button
                        type="button"
                        className="text-destructive"
                        title="Remove follower"
                        onClick={() => handleRemoveFollower(index)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No followers for this task
                </p>
              )}
            </div>

            <Separator className="my-6" />

            {/* ================================================= */}
            {/* ATTACHMENTS */}
            {/* ================================================= */}

            <div>
              <div className="mb-3 flex items-center gap-2">
                <Paperclip className="h-5 w-5 text-muted-foreground" />

                <h3 className="text-base font-semibold">Attachments</h3>
              </div>

              <input
                ref={attachmentInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachmentChange}
              />

              <div
                className="
                  rounded-md
                  border-2
                  border-dashed
                  p-6
                  text-center
                  cursor-pointer
                "
                onClick={handleAttachmentClick}
              >
                <Paperclip className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />

                <p className="text-sm text-muted-foreground">
                  Drop files here to upload
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {taskData.attachments || 0} attachment(s)
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
