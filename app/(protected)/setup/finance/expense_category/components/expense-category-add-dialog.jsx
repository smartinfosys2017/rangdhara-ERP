'use client';

import { useState } from 'react';

import { toast } from 'sonner';

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import { apiFetch } from '@/lib/api';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';

import { Textarea } from '@/components/ui/textarea';

// =======================================================
// TOAST
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
      position: 'top-center',
      duration: 4000,
    }
  );
}

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
      position: 'top-center',
      duration: 5000,
    }
  );
}

// =======================================================
// COMPONENT
// =======================================================

const ExpenseCategoryAddDialog = ({
  open,
  closeDialog,
  onSuccess,
}) => {
  // =====================================================
  // FORM STATE
  // =====================================================

  const [name, setName] = useState('');

  const [description, setDescription] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setName('');
    setDescription('');
  };

  // =====================================================
  // CLOSE
  // =====================================================

  const handleClose = () => {
    if (loading) return;

    resetForm();

    closeDialog();
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    // ---------------------------------------------------
    // VALIDATE NAME
    // ---------------------------------------------------

    const expenseCategoryName =
      name.trim();

    if (!expenseCategoryName) {
      showErrorToast(
        'Expense category name is required.'
      );

      return;
    }

    // ---------------------------------------------------
    // DESCRIPTION
    // ---------------------------------------------------

    const expenseCategoryDescription =
      description.trim();

    try {
      setLoading(true);

      // =================================================
      // CREATE EXPENSE CATEGORY
      // =================================================

      const response = await apiFetch(
        '/api/finance/expense_category',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            name: expenseCategoryName,

            description:
              expenseCategoryDescription || null,
          }),
        }
      );

      const result =
        await response
          .json()
          .catch(() => ({}));

      // =================================================
      // ERROR
      // =================================================

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
            'Failed to create expense category.'
        );
      }

      // =================================================
      // SUCCESS
      // =================================================

      showSuccessToast(
        result?.message ||
          'Expense category created successfully.'
      );

      resetForm();

      // =================================================
      // PARENT REFRESH
      // =================================================

      if (onSuccess) {
        await onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'CREATE EXPENSE CATEGORY ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
          'Failed to create expense category.'
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
        <DialogHeader>
          <DialogTitle>
            Add Expense Category
          </DialogTitle>

          <DialogDescription>
            Create a new expense category.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          {/* =================================================
              EXPENSE CATEGORY NAME
          ================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="expense-category-name"
              className="text-sm font-medium"
            >
              Expense Category Name

              <span className="ms-1 text-destructive">
                *
              </span>
            </label>

            <Input
              id="expense-category-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="Enter expense category name"
              disabled={loading}
              autoFocus
            />
          </div>

          {/* =================================================
              DESCRIPTION
          ================================================= */}

          <div className="space-y-2">
            <label
              htmlFor="expense-category-description"
              className="text-sm font-medium"
            >
              Description
            </label>

            <Textarea
              id="expense-category-description"
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Enter expense category description"
              rows={5}
              disabled={loading}
            />
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Close
            </Button>

            <Button
              type="submit"
              disabled={loading}
            >
              {loading
                ? 'Creating...'
                : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ExpenseCategoryAddDialog;