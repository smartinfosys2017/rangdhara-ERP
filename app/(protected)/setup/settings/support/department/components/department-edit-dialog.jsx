'use client';

import { useEffect } from 'react';
import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from '@remixicon/react';

import {
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { apiFetch } from '@/lib/api';

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from '@/components/ui/alert';

import { Button } from '@/components/ui/button';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

import { Input } from '@/components/ui/input';

import { LoaderCircleIcon } from 'lucide-react';

const DepartmentEditDialog = ({
  open,
  closeDialog,
  department,
  onSuccess,
}) => {
  const queryClient =
    useQueryClient();

  const form = useForm({
    defaultValues: {
      name: '',
    },

    mode: 'onSubmit',
  });

  /*
  |--------------------------------------------------------------------------
  | Populate form when department changes
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (department) {
      form.reset({
        name:
          department.name || '',
      });
    } else {
      form.reset({
        name: '',
      });
    }
  }, [department, form]);

  /*
  |--------------------------------------------------------------------------
  | Mutation
  |--------------------------------------------------------------------------
  */

  const mutation = useMutation({
    mutationFn: async (values) => {
      const response =
        await apiFetch(
          '/api/settings/support/department',
          {
            method: department
              ? 'PUT'
              : 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              department
                ? {
                    id: department.id,
                    name: values.name.trim(),
                  }
                : {
                    name: values.name.trim(),
                  }
            ),
          }
        );

      let result = {};

      try {
        result =
          await response.json();
      } catch {
        result = {};
      }

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result?.message ||
            'Unable to save department.'
        );
      }

      return result;
    },

    onSuccess: async (result) => {
      toast.custom(
        () => (
          <Alert
            variant="mono"
            icon="success"
            close={false}
          >
            <AlertIcon>
              <RiCheckboxCircleFill />
            </AlertIcon>

            <AlertTitle>
              {result?.message ||
                (department
                  ? 'Department updated successfully'
                  : 'Department added successfully')}
            </AlertTitle>
          </Alert>
        ),
        {
          position: 'top-center',
        }
      );

      queryClient.invalidateQueries({
        queryKey: [
          'support-departments',
        ],
      });

      form.reset();
      if (onSuccess) {
        await onSuccess(
          result?.data ||
            result?.department ||
            result
        );
      }
      closeDialog();
    },

    onError: (error) => {
      toast.custom(
        () => (
          <Alert
            variant="mono"
            icon="destructive"
            close={false}
          >
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>

            <AlertTitle>
              {error.message}
            </AlertTitle>
          </Alert>
        ),
        {
          position: 'top-center',
        }
      );
    },
  });

  const isProcessing =
    mutation.status ===
    'pending';

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const handleSubmit = (values) => {
    const name =
      values.name?.trim();

    if (!name) {
      form.setError('name', {
        type: 'manual',
        message:
          'Department name is required.',
      });

      return;
    }

    mutation.mutate({
      name,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Dialog close
  |--------------------------------------------------------------------------
  */

  const handleClose = () => {
    if (isProcessing) {
      return;
    }

    form.reset();

    closeDialog();
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
        <DialogHeader>
          <DialogTitle>
            {department
              ? 'Edit Department'
              : 'Add Department'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(
              handleSubmit
            )}
          >
            <DialogBody className="pt-2.5 space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Department Name
                    </FormLabel>

                    <FormControl>
                      <Input
                        placeholder="Enter department name"
                        {...field}
                        disabled={
                          isProcessing
                        }
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />
            </DialogBody>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={
                  isProcessing
                }
              >
                Cancel
              </Button>

              <Button
                type="submit"
                disabled={
                  !form.formState
                    .isDirty ||
                  isProcessing
                }
              >
                {isProcessing && (
                  <LoaderCircleIcon className="animate-spin" />
                )}

                {department
                  ? 'Update Department'
                  : 'Add Department'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DepartmentEditDialog;