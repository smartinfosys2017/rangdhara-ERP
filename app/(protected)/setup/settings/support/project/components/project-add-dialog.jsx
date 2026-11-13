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
  DialogBody,
  DialogTitle,
} from '@/components/ui/dialog';

import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
}

// =======================================================
// COMPONENT
// =======================================================

const ProjectAddDialog = ({
  open,
  closeDialog,
  onSuccess,
}) => {
  const [name, setName] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const handleClose = () => {
    if (loading) return;

    setName('');

    closeDialog();
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    const projectName =
      name.trim();

    if (!projectName) {
      showErrorToast(
        'Project name is required.'
      );

      return;
    }

    try {
      setLoading(true);

      const response =
        await apiFetch(
          '/api/settings/support/project',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              name: projectName,
            }),
          }
        );

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
          'Failed to create project.'
        );
      }

      showSuccessToast(
        result?.message ||
        'Project created successfully.'
      );

      setName('');

      if (onSuccess) {
        onSuccess(result);
      } else {
        closeDialog();
      }
    } catch (error) {
      console.error(
        'CREATE PROJECT ERROR:',
        error
      );

      showErrorToast(
        error?.message ||
        'Failed to create project.'
      );
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
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-5" >
          <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>
                Add Project
              </DialogTitle>

              <DialogDescription>
                Create a new project.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="grow min-h-0 flex flex-col h-full max-h-[90vh] overflow-hidden">
              <DialogBody>


                <div className="space-y-2">
                  <label
                    htmlFor="project-name"
                    className="text-sm font-medium"
                  >
                    Project Name
                    <span className="ms-1 text-destructive">
                      *
                    </span>
                  </label>

                  <Input
                    id="project-name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    placeholder="Enter project name"
                    disabled={loading}
                    autoFocus
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
                  : 'Create Project'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectAddDialog;