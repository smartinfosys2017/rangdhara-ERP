'use client';

import {
  useState,
} from 'react';

import {
  LoaderCircle,
} from 'lucide-react';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import {
  toast,
} from 'sonner';

import {
  apiFetch,
} from '@/lib/api';

import {
  Button,
} from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Input,
} from '@/components/ui/input';

import {
  Label,
} from '@/components/ui/label';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

// =======================================================
// TOAST
// =======================================================

const showSuccessToast = (message) => {
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

        <AlertTitle>
          {message}
        </AlertTitle>
      </Alert>
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
      <Alert
        variant="mono"
        icon="destructive"
        close
        className="min-w-[320px] max-w-[500px] shadow-lg"
        onClose={() => toast.dismiss(t)}
      >
        <AlertIcon>
          <RiErrorWarningFill className="size-5" />
        </AlertIcon>

        <AlertTitle>
          {message}
        </AlertTitle>
      </Alert>
    ),
    {
      position: 'top-center',
      duration: 5000,
    }
  );
};

// =======================================================
// CUSTOMER_SYNC ADD DIALOG
// =======================================================

export default function CustomerSyncAddDialog({
  open,
  closeDialog,
  onSuccess,
}) {
  // =====================================================
  // LOADING
  // =====================================================

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // FORM
  // =====================================================

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // =====================================================
  // UPDATE FIELD
  // =====================================================

  const update =
    (key) =>
    (event) => {
      setForm((previous) => ({
        ...previous,
        [key]: event.target.value,
      }));
    };

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setForm({
      name: '',
      email: '',
      phone: '',
    });
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    // -----------------------------------------------
    // VALIDATION
    // -----------------------------------------------

    const name =
      form.name.trim();

    const email =
      form.email.trim().toLowerCase();

    const phone =
      form.phone.trim();

    if (!name) {
      showErrorToast(
        'Customer name is required.'
      );

      return;
    }

    if (!email) {
      showErrorToast(
        'Customer email is required.'
      );

      return;
    }

    // Basic email validation
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      showErrorToast(
        'Please enter a valid email address.'
      );

      return;
    }

    try {
      setLoading(true);

      // ---------------------------------------------
      // PAYLOAD
      // ---------------------------------------------

      const payload = {
        name,
        email,
        phone: phone || null,
      };

      console.log(
        '[CUSTOMER CREATE] Payload:',
        payload
      );

      // ---------------------------------------------
      // CREATE CUSTOMER
      // ---------------------------------------------

      const response =
        await apiFetch(
          '/api/CustomerSync',
          {
            method: 'POST',

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
        await response.json().catch(
          () => ({})
        );

      // ---------------------------------------------
      // ERROR
      // ---------------------------------------------

      if (
        !response.ok ||
        !result?.success
      ) {
        throw new Error(
          result?.error ||
            result?.message ||
            'Failed to create customer.'
        );
      }

      // ---------------------------------------------
      // SUCCESS
      // ---------------------------------------------

      showSuccessToast(
        'Customer created successfully.'
      );

      // ---------------------------------------------
      // RESET
      // ---------------------------------------------

      resetForm();

      // ---------------------------------------------
      // CLOSE / REFRESH
      // ---------------------------------------------

      onSuccess?.();

    } catch (error) {
      console.error(
        '[CUSTOMER CREATE ERROR]',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to create customer.'
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
          closeDialog?.();
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Add Customer
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
                Customer Information
              </h3>

              <p className="text-sm text-muted-foreground">
                Enter the customer details below.
              </p>
            </div>

            {/* NAME */}

            <div className="space-y-2">
              <Label htmlFor="customer-name">
                Name
                <span className="ml-1 text-destructive">
                  *
                </span>
              </Label>

              <Input
                id="customer-name"
                value={form.name}
                onChange={update('name')}
                disabled={loading}
                placeholder="Enter customer name"
                autoFocus
              />
            </div>

            {/* EMAIL */}

            <div className="space-y-2">
              <Label htmlFor="customer-email">
                Email
                <span className="ml-1 text-destructive">
                  *
                </span>
              </Label>

              <Input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={update('email')}
                disabled={loading}
                placeholder="customer@example.com"
              />
            </div>

            {/* PHONE */}

            <div className="space-y-2">
              <Label htmlFor="customer-phone">
                Phone
              </Label>

              <Input
                id="customer-phone"
                type="tel"
                value={form.phone}
                onChange={update('phone')}
                disabled={loading}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          {/* =================================================
              SYNC INFORMATION
          ================================================= */}

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="text-sm font-medium">
              Sync Information
            </div>

            <p className="mt-1 text-xs text-muted-foreground">
              Last synced time will be managed automatically
              by the system.
            </p>
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
                  Saving...
                </>
              ) : (
                'Add Customer'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}