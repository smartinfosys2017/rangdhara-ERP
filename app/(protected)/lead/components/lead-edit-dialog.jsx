"use client";

import { useEffect, useState } from "react";

import { toast } from "sonner";

import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";

import { apiFetch } from "@/lib/api";

import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// =======================================================
// STATIC DATA
// =======================================================

const STATUS = [
  {
    id: "1",
    name: "Customer",
  },
  {
    id: "2",
    name: "ACTIVE",
  },
  {
    id: "3",
    name: "INACTIVE",
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
  {
    id: "3",
    name: "Website",
  },
];

const USERS = [
  {
    id: "1",
    name: "Rang Dhara",
  },
  {
    id: "2",
    name: "Admin",
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
    id: "system",
    name: "System Default",
  },
  {
    id: "english",
    name: "English",
  },
];

// =======================================================
// SUCCESS TOAST
// =======================================================

function showSuccessToast(message) {
  toast.custom(
    () => (
      <Alert
        variant="mono"
        icon="success"
        className="min-w-[320px] max-w-[500px] shadow-lg"
      >
        <AlertIcon>
          <RiCheckboxCircleFill className="size-5" />
        </AlertIcon>

        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),
    {
      position: "top-center",
      duration: 4000,
    },
  );
}

// =======================================================
// ERROR TOAST
// =======================================================

function showErrorToast(message) {
  toast.custom(
    (t) => (
      <Alert
        variant="mono"
        icon="destructive"
        close={true}
        className="min-w-[320px] max-w-[500px] shadow-lg"

        onClose={() => {
          toast.dismiss(t);
        }}
      >
        <AlertIcon>
          <RiErrorWarningFill className="size-5" />
        </AlertIcon>

        <AlertTitle>{message}</AlertTitle>
      </Alert>
    ),

    {
      position: "top-center",
      duration: 5000,
    },
  );
}

// =======================================================
// COMPONENT
// =======================================================

const LeadEditDialog = ({ open, closeDialog, Lead, onSuccess }) => {
  const [loading, setLoading] = useState(false);

  // =========================
  // FIELDS
  // =========================

  const [status, setStatus] = useState("");

  const [source, setSource] = useState("");

  const [assigned, setAssigned] = useState("");

  const [tags, setTags] = useState("");

  const [name, setName] = useState("");

  const [title, setTitle] = useState("");

  const [email, setEmail] = useState("");

  const [website, setWebsite] = useState("");

  const [phonenumber, setPhonenumber] = useState("");

  const [leadValue, setLeadValue] = useState("");

  const [company, setCompany] = useState("");

  const [address, setAddress] = useState("");

  const [city, setCity] = useState("");

  const [state, setState] = useState("");

  const [country, setCountry] = useState("");

  const [zip, setZip] = useState("");

  const [language, setLanguage] = useState("system");

  const [description, setDescription] = useState("");

  const [isPublic, setIsPublic] = useState(false);

  const [contactedToday, setContactedToday] = useState(false);

  // =======================================================
  // SET STATIC DATA WHILE EDIT
  // =======================================================

  useEffect(() => {
    if (!Lead) return;

    setStatus(String(Lead.status || ""));

    setSource(String(Lead.source || ""));

    setAssigned(String(Lead.assigned || ""));

    setTags(Lead.tags || "");

    setName(Lead.name || "");

    setTitle(Lead.title || "");

    setEmail(Lead.email || "");

    setWebsite(Lead.website || "");

    setPhonenumber(Lead.phonenumber || "");

    setLeadValue(Lead.lead_value || "");

    setCompany(Lead.company || "");

    setAddress(Lead.address || "");

    setCity(Lead.city || "");

    setState(Lead.state || "");

    setCountry(String(Lead.country || ""));

    setZip(Lead.zip || "");

    setLanguage(Lead.default_language || "system");

    setDescription(Lead.description || "");

    setIsPublic(Boolean(Lead.is_public));

    setContactedToday(Boolean(Lead.contacted_today));
  }, [Lead]);

  // =======================================================
  // CLOSE DIALOG
  // =======================================================

  const handleClose = () => {
    if (loading) return;

    closeDialog();
  };

  // =======================================================
  // SUBMIT UPDATE
  // =======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!Lead?.id) {
      showErrorToast("Invalid Lead.");

      return;
    }

    if (!name.trim()) {
      showErrorToast("Lead name is required.");

      return;
    }

    if (!status) {
      showErrorToast("Lead status is required.");

      return;
    }

    if (!source) {
      showErrorToast("Lead source is required.");

      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch("/api/leads", {
        method: "PUT",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          id: Lead.id,

          // STATIC SELECT DATA

          status,

          source,

          assigned,

          // BASIC INFO

          tags,

          name,

          title,

          email,

          website,

          phonenumber,

          // VALUE

          lead_value: leadValue,

          // COMPANY

          company,

          // ADDRESS

          address,

          city,

          state,

          country,

          zip,

          // LANGUAGE

          default_language: language,

          // DESCRIPTION

          description,

          // CHECKBOX

          is_public: isPublic,

          contacted_today: contactedToday,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(result?.message || "Failed to update Lead.");
      }

      showSuccessToast(result?.message || "Lead updated successfully.");

      if (onSuccess) {
        onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error("UPDATE LEAD ERROR:", error);

      showErrorToast(error?.message || "Failed to update Lead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}

      onOpenChange={(value) => {
        if (!value) {
          handleClose();
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
          <DialogTitle>Edit Lead</DialogTitle>

          <DialogDescription>Update Lead information.</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}

          className="space-y-6"
        >
          <div
            className="
              grid
              grid-cols-2
              gap-5
            "
          >
            {/* STATUS */}

            <div>
              <label>
                Status
                <span className="text-red-500">*</span>
              </label>

              <Select
                value={status}
                onValueChange={setStatus}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>

                <SelectContent>
                  {STATUS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SOURCE */}

            <div>
              <label>
                Source
                <span className="text-red-500">*</span>
              </label>

              <Select
                value={source}
                onValueChange={setSource}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Source" />
                </SelectTrigger>

                <SelectContent>
                  {SOURCES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ASSIGNED */}

            <div>
              <label>Assigned</label>

              <Select
                value={assigned}
                onValueChange={setAssigned}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>

                <SelectContent>
                  {USERS.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* TAGS */}

            <div>
              <label>Tags</label>

              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                disabled={loading}
                placeholder="Tags"
              />
            </div>

            {/* NAME */}

            <div>
              <label>Name *</label>

              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* POSITION */}

            <div>
              <label>Position</label>

              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* EMAIL */}

            <div>
              <label>Email Address</label>

              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* WEBSITE */}

            <div>
              <label>Website</label>

              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* PHONE */}

            <div>
              <label>Phone</label>

              <Input
                value={phonenumber}
                onChange={(e) => setPhonenumber(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* LEAD VALUE */}

            <div>
              <label>Lead Value</label>

              <Input
                type="number"
                value={leadValue}
                onChange={(e) => setLeadValue(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* COMPANY */}

            <div>
              <label>Company</label>

              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* ADDRESS */}

            <div className="col-span-2">
              <label>Address</label>

              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* CITY */}

            <div>
              <label>City</label>

              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* STATE */}

            <div>
              <label>State</label>

              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* COUNTRY */}

            <div>
              <label>Country</label>

              <Select
                value={country}
                onValueChange={setCountry}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Country" />
                </SelectTrigger>

                <SelectContent>
                  {COUNTRIES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ZIP */}

            <div>
              <label>Zip Code</label>

              <Input
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* LANGUAGE */}

            <div>
              <label>Default Language</label>

              <Select
                value={language}
                onValueChange={setLanguage}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {LANGUAGES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* DESCRIPTION */}

            <div className="col-span-2">
              <label>Description</label>

              <Textarea
                rows={4}

                value={description}

                onChange={(e) => setDescription(e.target.value)}

                disabled={loading}
              />
            </div>
          </div>

          {/* CHECKBOX */}

          <div className="flex gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"

                checked={isPublic}

                onChange={(e) => setIsPublic(e.target.checked)}

                disabled={loading}
              />
              Public
            </label>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"

                checked={contactedToday}

                onChange={(e) => setContactedToday(e.target.checked)}

                disabled={loading}
              />
              Contacted Today
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"

              variant="outline"

              onClick={handleClose}

              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"

              disabled={loading}
            >
              {loading ? "Updating..." : "Update Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default LeadEditDialog;
