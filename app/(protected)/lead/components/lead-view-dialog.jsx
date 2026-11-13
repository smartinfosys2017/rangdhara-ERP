"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

// ------------------------------------
// STATIC OPTIONS
// ------------------------------------

const STATUS = [
  {
    id: "2",
    name: "ACTIVE",
  },
  {
    id: "3",
    name: "ACTIVE",
  },
  {
    id: "1",
    name: "Customer",
  },
];

const SOURCES = [
  {
    id: "1",
    name: "Google",
  },
  {
    id: "2",
    name: "Facebook",
  },
];

const USERS = [
  {
    id: "1",
    name: "Rang Dhara",
  },
];

const COUNTRIES = [
  {
    id: "102",
    name: "India",
  },
  {
    id: "236",
    name: "United States",
  },
];

const LANGUAGES = [
  {
    id: "",
    name: "System Default",
  },
  {
    id: "english",
    name: "English",
  },
  {
    id: "hindi",
    name: "Hindi",
  },
];

// ------------------------------------
// HELPERS
// ------------------------------------

const getName = (list, id) => {
  const item = list.find((item) => item.id === String(id));

  return item?.name || "-";
};

// ------------------------------------
// COMPONENT
// ------------------------------------

export default function LeadViewDialog({ open, closeDialog, lead }) {
  if (!lead) {
    return null;
  }

  return (
    <Dialog
      open={open}

      onOpenChange={(value) => {
        if (!value) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent
        className="
        max-w-5xl
        max-h-[95vh]
        overflow-y-auto
        "
      >
        <DialogHeader>
          <DialogTitle>View Lead</DialogTitle>

          <DialogDescription>Lead details information</DialogDescription>
        </DialogHeader>

        <div
          className="
          grid
          grid-cols-2
          gap-5
          "
        >
          <ViewItem label="Status" value={getName(STATUS, lead.status)} />

          <ViewItem label="Source" value={getName(SOURCES, lead.source)} />

          <ViewItem label="Assigned" value={getName(USERS, lead.assigned)} />

          <ViewItem label="Tags" value={lead.tags} />

          <ViewItem label="Name" value={lead.name} />

          <ViewItem label="Position" value={lead.title} />

          <ViewItem label="Email" value={lead.email} />

          <ViewItem label="Website" value={lead.website} />

          <ViewItem label="Phone" value={lead.phonenumber} />

          <ViewItem label="Lead Value" value={lead.lead_value} />

          <ViewItem label="Company" value={lead.company} />

          <ViewItem label="City" value={lead.city} />

          <ViewItem label="State" value={lead.state} />

          <ViewItem label="Country" value={getName(COUNTRIES, lead.country)} />

          <ViewItem label="Zip Code" value={lead.zip} />

          <ViewItem
            label="Language"
            value={getName(LANGUAGES, lead.default_language)}
          />

          <div
            className="
            col-span-2
            "
          >
            <label className="text-sm font-medium">Address</label>

            <div
              className="
              mt-1
              rounded-md
              border
              p-3
              text-sm
              "
            >
              {lead.address || "-"}
            </div>
          </div>

          <div
            className="
            col-span-2
            "
          >
            <label className="text-sm font-medium">Description</label>

            <div
              className="
              mt-1
              rounded-md
              border
              p-3
              text-sm
              whitespace-pre-wrap
              "
            >
              {lead.description || "-"}
            </div>
          </div>

          <div
            className="
            col-span-2
            flex
            gap-6
            "
          >
            <ViewItem label="Public" value={lead.is_public ? "Yes" : "No"} />

            <ViewItem
              label="Contacted Today"
              value={lead.contacted_today ? "Yes" : "No"}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------
// VIEW ITEM
// ------------------------------------

function ViewItem({ label, value }) {
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>

      <div
        className="
        mt-1
        rounded-md
        border
        bg-muted/30
        px-3
        py-2
        text-sm
        "
      >
        {value || "-"}
      </div>
    </div>
  );
}
