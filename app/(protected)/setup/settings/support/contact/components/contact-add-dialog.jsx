'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
const initialForm = {
  name: '',
  email: '',
  phone: '',
};

const ContactAddDialog = ({
  open,
  closeDialog,
}) => {
  const queryClient =
    useQueryClient();

  const [form, setForm] =
    useState(initialForm);

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // FORM CHANGE
  // =====================================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

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

    const name =
      form.name.trim();

    const email =
      form.email.trim();

    const phone =
      form.phone.trim();

    // ===================================================
    // VALIDATION
    // ===================================================

    if (!name) {
      toast.error(
        'Contact name is required.'
      );

      return;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
      )
    ) {
      toast.error(
        'Please enter a valid email address.'
      );

      return;
    }

    try {
      setLoading(true);

      // =================================================
      // CREATE CONTACT
      // =================================================

      const response = await apiFetch(
        '/api/settings/support/contact',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            name,
            email,
            phone,
          }),
        }
      );

      // =================================================
      // RESPONSE
      // =================================================

      const result =
        await response
          .json()
          .catch(() => ({}));

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
          'Failed to create contact.'
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      toast.success(
        result?.message ||
        'Contact created successfully.'
      );

      // =================================================
      // REFRESH CONTACT LIST
      // =================================================

      await queryClient.invalidateQueries({
        queryKey: [
          'support-contacts',
        ],
      });

      // =================================================
      // RESET
      // =================================================

      setForm(initialForm);

      closeDialog();
    } catch (error) {
      console.error(
        'CREATE CONTACT ERROR:',
        error
      );

      toast.error(
        error?.message ||
        'Failed to create contact.'
      );
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
        <form   onSubmit={handleSubmit}  className="space-y-6" >
          <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                Add Contact
              </DialogTitle>
              <DialogDescription>
                Create a new support contact.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
              <DialogBody className="pt-2.5 space-y-6">

                {/* =================================================
              CONTACT NAME
          ================================================== */}

                <div className="space-y-2">
                  <label
                    htmlFor="contact-add-name"
                    className="text-sm font-medium"
                  >
                    Contact Name
                    <span className="ms-1 text-destructive">
                      *
                    </span>
                  </label>

                  <Input
                    id="contact-add-name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter contact name"
                    disabled={loading}
                    autoFocus
                  />
                </div>

                {/* =================================================
              EMAIL
          ================================================== */}

                <div className="space-y-2">
                  <label
                    htmlFor="contact-add-email"
                    className="text-sm font-medium"
                  >
                    Email
                  </label>

                  <Input
                    id="contact-add-email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                    disabled={loading}
                  />
                </div>

                {/* =================================================
              PHONE
          ================================================== */}

                <div className="space-y-2">
                  <label
                    htmlFor="contact-add-phone"
                    className="text-sm font-medium"
                  >
                    Phone
                  </label>

                  <Input
                    id="contact-add-phone"
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

              <Button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? 'Creating...'
                  : 'Create Contact'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContactAddDialog;