"use client";

import { useEffect, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { toast } from "sonner";

import { apiFetch } from "@/lib/api";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
const initialForm = {
  name: "",
  email: "",
  phone: "",
};

const ContactEditDialog = ({ open, closeDialog, contact, onSuccess }) => {
  const queryClient = useQueryClient();

  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(false);

  const isEditing = Boolean(contact?.id);

  // =====================================================
  // LOAD CONTACT INTO FORM
  // =====================================================

  useEffect(() => {
    if (!open) {
      return;
    }

    if (contact) {
      setForm({
        name: contact.name || "",
        email: contact.email || "",
        phone: contact.phone || "",
      });
    } else {
      setForm(initialForm);
    }
  }, [open, contact]);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) {
      return;
    }

    setForm(initialForm);

    closeDialog();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    const name = form.name.trim();

    const email = form.email.trim();

    const phone = form.phone.trim();

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!name) {
      toast.error("Contact name is required.");

      return;
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email address.");

      return;
    }

    // ---------------------------------------------------
    // PAYLOAD
    // ---------------------------------------------------

    const payload = {
      name,
      email,
      phone,
    };

    try {
      setLoading(true);

      let response;

      // =================================================
      // UPDATE
      // =================================================

      if (isEditing) {
        response = await apiFetch("/api/settings/support/contact", {
          method: "PUT",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            id: contact.id,
            ...payload,
          }),
        });
      }

      // =================================================
      // CREATE
      // =================================================
      else {
        response = await apiFetch("/api/settings/support/contact", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(payload),
        });
      }

      // -------------------------------------------------
      // RESPONSE
      // -------------------------------------------------

      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.success) {
        throw new Error(
          result?.message ||
          (isEditing
            ? "Failed to update contact."
            : "Failed to create contact."),
        );
      }

      // -------------------------------------------------
      // SUCCESS TOAST
      // -------------------------------------------------

      toast.success(
        result?.message ||
        (isEditing
          ? "Contact updated successfully."
          : "Contact created successfully."),
      );

      // -------------------------------------------------
      // REFRESH CONTACT LIST
      // -------------------------------------------------

      await queryClient.invalidateQueries({
        queryKey: ["support-contacts"],
      });

      // -------------------------------------------------
      // NOTIFICATION CALLBACK
      // IMPORTANT:
      // Call this ONLY after CRUD succeeds.
      // -------------------------------------------------

      const savedContact = result?.data || result?.contact || result;

      console.log("[CONTACT SAVE] Calling onSuccess:", savedContact);

      if (onSuccess) {
        await onSuccess(savedContact);
      } else {
        console.warn("[CONTACT SAVE] onSuccess is NOT provided");
      }

      // -------------------------------------------------
      // RESET + CLOSE
      // -------------------------------------------------

      setForm(initialForm);

      closeDialog();
    } catch (error) {
      console.error("CONTACT SAVE ERROR:", error);

      toast.error(error?.message || "Failed to save contact.");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Contact" : "Add Contact"}
              </DialogTitle>

              <DialogDescription>
                {isEditing
                  ? "Update contact information."
                  : "Create a new support contact."}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
              <DialogBody className="pt-2.5 space-y-6">

                <div className="space-y-2">
                  <label htmlFor="contact-name" className="text-sm font-medium">
                    Contact Name
                    <span className="ms-1 text-destructive">*</span>
                  </label>

                  <Input
                    id="contact-name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter contact name"
                    disabled={loading}
                    autoFocus
                  />
                </div>


                <div className="space-y-2">
                  <label htmlFor="contact-email" className="text-sm font-medium">
                    Email
                  </label>

                  <Input
                    id="contact-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="contact-phone" className="text-sm font-medium">
                    Phone
                  </label>

                  <Input
                    id="contact-phone"
                    name="phone"
                    type="text"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    disabled={loading}
                  />
                </div>



              </DialogBody>
            </ScrollArea>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={loading}>
                {loading
                  ? isEditing
                    ? "Updating..."
                    : "Creating..."
                  : isEditing
                    ? "Update Contact"
                    : "Create Contact"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactEditDialog;