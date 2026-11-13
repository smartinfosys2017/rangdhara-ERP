'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  LoaderCircle,
} from 'lucide-react';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import { toast } from 'sonner';

import { apiFetch } from '@/lib/api';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';

import { Label } from '@/components/ui/label';

// =======================================================
// TOAST
// =======================================================

const showSuccessToast = (message) => {
  toast.custom(
    () => (
      <div className="min-w-[320px] max-w-[500px] rounded-lg border bg-background p-4 shadow-lg">
        <div className="flex items-center gap-2">
          <RiCheckboxCircleFill className="size-5 text-green-500" />

          <span className="text-sm font-medium">
            {message}
          </span>
        </div>
      </div>
    ),
    {
      position: 'top-center',
      duration: 4000,
    }
  );
};

const showErrorToast = (message) => {
  toast.custom(
    (t) => (
      <div className="min-w-[320px] max-w-[500px] rounded-lg border bg-background p-4 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <RiErrorWarningFill className="size-5 text-destructive" />

            <span className="text-sm font-medium">
              {message}
            </span>
          </div>

          <button
            type="button"
            onClick={() => toast.dismiss(t)}
            className="text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      </div>
    ),
    {
      position: 'top-center',
      duration: 5000,
    }
  );
};

// =======================================================
// HELPERS
// =======================================================

const formatDateTimeForInput = (date) => {
  if (!date) {
    return '';
  }

  try {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const year = parsed.getFullYear();

    const month = String(
      parsed.getMonth() + 1
    ).padStart(2, '0');

    const day = String(
      parsed.getDate()
    ).padStart(2, '0');

    const hours = String(
      parsed.getHours()
    ).padStart(2, '0');

    const minutes = String(
      parsed.getMinutes()
    ).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
};

// =======================================================
// COMPONENT
// =======================================================

export default function CustomerSyncEditDialog({
  open,
  closeDialog,
  onSuccess,
  CustomerSync,
}) {
  const [loading, setLoading] =
    useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    lastSyncedAt: '',
  });

  // =====================================================
  // LOAD CustomerSync
  // =====================================================

  useEffect(() => {
    if (!CustomerSync) {
      return;
    }

    setForm({
      name:
        CustomerSync.name || '',

      email:
        CustomerSync.email || '',

      phone:
        CustomerSync.phone || '',

      lastSyncedAt:
        formatDateTimeForInput(
          CustomerSync.lastSyncedAt
        ),
    });
  }, [CustomerSync]);

  // =====================================================
  // UPDATE FIELD
  // =====================================================

  const update = (key) => (event) => {
    setForm((previous) => ({
      ...previous,
      [key]: event.target.value,
    }));
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!form.name.trim()) {
      showErrorToast(
        'CustomerSync name is required.'
      );

      return;
    }

    if (!form.email.trim()) {
      showErrorToast(
        'CustomerSync email is required.'
      );

      return;
    }

    if (!CustomerSync?.id) {
      showErrorToast(
        'CustomerSync ID is missing.'
      );

      return;
    }

    try {
      setLoading(true);

      // -------------------------------------------------
      // PAYLOAD
      // -------------------------------------------------

      const payload = {
        id: CustomerSync.id,

        name:
          form.name.trim(),

        email:
          form.email.trim(),

        phone:
          form.phone.trim() || null,

        lastSyncedAt:
          form.lastSyncedAt
            ? new Date(
                form.lastSyncedAt
              ).toISOString()
            : null,
      };

      // -------------------------------------------------
      // UPDATE CustomerSync
      // -------------------------------------------------

      const response =
        await apiFetch(
          '/api/CustomerSync',
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                payload
              ),
          }
        );

      const result =
        await response
          .json()
          .catch(() => ({}));

      // -------------------------------------------------
      // ERROR
      // -------------------------------------------------

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.message ||
            result?.error ||
            'Failed to update CustomerSync.'
        );
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      showSuccessToast(
        result?.message ||
          'CustomerSync updated successfully.'
      );

      onSuccess?.();

      closeDialog?.();

    } catch (error) {
      console.error(
        'UPDATE CustomerSync ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to update CustomerSync.'
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
        if (!value && !loading) {
          closeDialog?.();
        }
      }}
    >
      <DialogContent className="max-w-2xl">

        <DialogHeader>
          <DialogTitle>
            Edit CustomerSync
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          {/* =================================================
              CUSTOMER INFORMATION
          ================================================= */}

          <div className="space-y-4">

            <div>
              <h3 className="text-base font-semibold">
                CustomerSync Information
              </h3>

              <p className="text-sm text-muted-foreground">
                Update the CustomerSync details.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">

              {/* NAME */}

              <div className="space-y-2 md:col-span-2">

                <Label>
                  Name
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  value={form.name}
                  onChange={update('name')}
                  disabled={loading}
                  placeholder="CustomerSync name"
                />

              </div>

              {/* EMAIL */}

              <div className="space-y-2">

                <Label>
                  Email
                  <span className="ml-1 text-destructive">
                    *
                  </span>
                </Label>

                <Input
                  type="email"
                  value={form.email}
                  onChange={update('email')}
                  disabled={loading}
                  placeholder="customer@example.com"
                />

              </div>

              {/* PHONE */}

              <div className="space-y-2">

                <Label>
                  Phone
                </Label>

                <Input
                  type="tel"
                  value={form.phone}
                  onChange={update('phone')}
                  disabled={loading}
                  placeholder="+91 9876543210"
                />

              </div>

              {/* LAST SYNCED */}

              <div className="space-y-2 md:col-span-2">

                <Label>
                  Last Synced At
                </Label>

                <Input
                  type="datetime-local"
                  value={
                    form.lastSyncedAt
                  }
                  onChange={update(
                    'lastSyncedAt'
                  )}
                  disabled={loading}
                />

              </div>

            </div>

          </div>

          {/* =================================================
              SYSTEM INFORMATION
          ================================================= */}

          <div className="rounded-lg border bg-muted/30 p-4">

            <div className="space-y-1">

              <p className="text-sm font-medium">
                CustomerSync ID
              </p>

              <p className="break-all text-xs text-muted-foreground">
                {CustomerSync?.id || '-'}
              </p>

            </div>

            {CustomerSync?.createdAt && (
              <div className="mt-3">

                <p className="text-sm font-medium">
                  Created At
                </p>

                <p className="text-xs text-muted-foreground">
                  {new Date(
                    CustomerSync.createdAt
                  ).toLocaleString()}
                </p>

              </div>
            )}

            {CustomerSync?.updatedAt && (
              <div className="mt-3">

                <p className="text-sm font-medium">
                  Updated At
                </p>

                <p className="text-xs text-muted-foreground">
                  {new Date(
                    CustomerSync.updatedAt
                  ).toLocaleString()}
                </p>

              </div>
            )}

          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <DialogFooter>

            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle className="animate-spin" />
                  Updating...
                </>
              ) : (
                'Update CustomerSync'
              )}
            </Button>

          </DialogFooter>

        </form>

      </DialogContent>
    </Dialog>
  );
}