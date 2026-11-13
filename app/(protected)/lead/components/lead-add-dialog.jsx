"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// -------------------------------
// STATIC OPTIONS
// -------------------------------

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

// -------------------------------
// COMPONENT
// -------------------------------

export default function LeadAddDialog({ open, closeDialog, onSuccess }) {
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

  const [language, setLanguage] = useState("");

  const [description, setDescription] = useState("");

  const [isPublic, setIsPublic] = useState(false);

  const [contactedToday, setContactedToday] = useState(true);

  const [errors, setErrors] = useState({});

  // -------------------------------
  // VALIDATION
  // -------------------------------

  const validate = () => {
    let error = {};

    if (!status) {
      error.status = "Status is required";
    }

    if (!source) {
      error.source = "Source is required";
    }

    if (!name) {
      error.name = "Name is required";
    }

    setErrors(error);

    if (Object.keys(error).length) {
      toast.error("Please fill required fields");

      return false;
    }

    return true;
  };

  // -------------------------------
  // SAVE
  // -------------------------------

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const leadData = {
      status,

      source,

      assigned,

      tags,

      name,

      title,

      email,

      website,

      phonenumber,

      lead_value: leadValue,

      company,

      address,

      city,

      state,

      country,

      zip,

      default_language: language,

      description,

      is_public: isPublic,

      contacted_today: contactedToday,
    };

    console.log("LEAD DATA", leadData);

    toast.success("Lead created successfully");

    onSuccess?.(leadData);
  };

  // -------------------------------
  // RESET CLOSE
  // -------------------------------

  const handleClose = () => {
    setErrors({});

    closeDialog?.();
  };

  // -------------------------------
  // JSX
  // -------------------------------

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
          <DialogTitle>Add Lead</DialogTitle>

          <DialogDescription>Create new lead</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-5">
          {/* STATUS */}

          <div>
            <label>Status *</label>

            <Select value={status} onValueChange={setStatus}>
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
            <label>Source *</label>

            <Select value={source} onValueChange={setSource}>
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

            <Select value={assigned} onValueChange={setAssigned}>
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
              placeholder="Tags"
            />
          </div>

          {/* NAME */}

          <div>
            <label>Name *</label>

            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {/* POSITION */}

          <div>
            <label>Position</label>

            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* EMAIL */}

          <div>
            <label>Email Address</label>

            <Input value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {/* WEBSITE */}

          <div>
            <label>Website</label>

            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {/* PHONE */}

          <div>
            <label>Phone</label>

            <Input
              value={phonenumber}
              onChange={(e) => setPhonenumber(e.target.value)}
            />
          </div>

          {/* VALUE */}

          <div>
            <label>Lead Value</label>

            <Input
              type="number"
              value={leadValue}
              onChange={(e) => setLeadValue(e.target.value)}
            />
          </div>

          {/* COMPANY */}

          <div>
            <label>Company</label>

            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          {/* ADDRESS */}

          <div className="col-span-2">
            <label>Address</label>

            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {/* CITY */}

          <div>
            <label>City</label>

            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>

          {/* STATE */}

          <div>
            <label>State</label>

            <Input value={state} onChange={(e) => setState(e.target.value)} />
          </div>

          {/* COUNTRY */}

          <div>
            <label>Country</label>

            <Select value={country} onValueChange={setCountry}>
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

            <Input value={zip} onChange={(e) => setZip(e.target.value)} />
          </div>

          {/* LANGUAGE */}

          <div>
            <label>Default Language</label>

            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {LANGUAGES.map((item) => (
                  <SelectItem key={item.id || "default"} value={item.id}>
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
            />
          </div>

          {/* CHECKBOXES */}

          <div className="col-span-2 flex gap-6">
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Public
            </label>

            <label className="flex gap-2">
              <input
                type="checkbox"

                checked={contactedToday}

                onChange={(e) => setContactedToday(e.target.checked)}
              />
              Contacted Today
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>

          <Button onClick={handleSave}>Save Lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
