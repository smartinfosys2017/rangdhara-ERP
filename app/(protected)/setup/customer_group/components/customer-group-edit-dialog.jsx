'use client';

import { useEffect, useState } from 'react';

import { LoaderCircle } from 'lucide-react';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import { toast } from 'sonner';

import { apiFetch } from '@/lib/api';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
// COMPONENT
// =======================================================

export default function CustomerGroupEditDialog({
  open,
  closeDialog,
  onSuccess,
  customerGroup,
}) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
  });

  // =====================================================
  // LOAD CUSTOMER GROUP
  // =====================================================

  useEffect(() => {
    if (!customerGroup) {
      return;
    }

    setForm({
      name: customerGroup.name || '',
    });
  }, [customerGroup]);

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

    const name = form.name.trim();

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!name) {
      showErrorToast(
        'Customer group name is required.'
      );

      return;
    }

    if (!customerGroup?.id) {
      showErrorToast(
        'Customer group ID is missing.'
      );

      return;
    }

    try {
      setLoading(true);

      // -------------------------------------------------
      // UPDATE CUSTOMER GROUP
      // -------------------------------------------------

      const response = await apiFetch(
        '/api/customer_group',
        {
          method: 'PUT',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            id: customerGroup.id,
            name,
          }),
        }
      );

      const result = await response
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
          'Failed to update customer group.'
        );
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      showSuccessToast(
        result?.message ||
        'Customer group updated successfully.'
      );

      onSuccess?.();

      closeDialog?.();
    } catch (error) {
      console.error(
        'UPDATE CUSTOMER GROUP ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
        'Failed to update customer group.'
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
      <DialogContent>
        <form
          onSubmit={handleSubmit}
          className="flex flex-col h-full max-h-[90vh] overflow-hidden"
        >
          <DialogHeader>
            <DialogTitle>
              Edit Customer Group
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">

            <DialogBody className="space-y-6 pt-0 px-0 min-h-0">
              {/* =============================================
              CUSTOMER GROUP INFORMATION
          ============================================= */}

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold">
                    Customer Group Information
                  </h3>

                  <p className="text-sm text-muted-foreground">
                    Update the customer group name.
                  </p>
                </div>

                {/* NAME */}

                <div className="space-y-2">
                  <Label>
                    Customer Group Name

                    <span className="ml-1 text-destructive">
                      *
                    </span>
                  </Label>

                  <Input
                    value={form.name}
                    onChange={update('name')}
                    disabled={loading}
                    placeholder="Customer group name"
                    autoFocus
                  />
                </div>
              </div>
            </DialogBody>
          </ScrollArea>
          {/* =============================================
              FOOTER
          ============================================= */}

          <DialogFooter className="gap-2">
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
                'Update Customer Group'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}