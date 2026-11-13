"use client";

import { useEffect, useState } from "react";

import {
  RiCheckboxCircleFill,
  RiErrorWarningFill,
} from "@remixicon/react";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import { useForm } from "react-hook-form";

import { toast } from "sonner";

import { apiFetch } from "@/lib/api";

import {
  Alert,
  AlertIcon,
  AlertTitle,
} from "@/components/ui/alert";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";

import { LoaderCircleIcon } from "lucide-react";

const DepartmentAddDialog = ({
  open,
  closeDialog,
  onSuccess,
}) => {
  const queryClient =
    useQueryClient();

  const [editingDepartment, setEditingDepartment] =
    useState(null);

  /*
  |--------------------------------------------------------------------------
  | Form
  |--------------------------------------------------------------------------
  */

  const form = useForm({
    defaultValues: {
      name: "",
    },

    mode: "onSubmit",
  });

  /*
  |--------------------------------------------------------------------------
  | Listen for Edit
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleEdit =
      (event) => {
        const department =
          event.detail;

        if (!department) {
          return;
        }

        setEditingDepartment(
          department
        );

        form.reset({
          name:
            department.name || "",
        });
      };

    window.addEventListener(
      "department-edit",
      handleEdit
    );

    return () => {
      window.removeEventListener(
        "department-edit",
        handleEdit
      );
    };
  }, [form]);

  /*
  |--------------------------------------------------------------------------
  | Reset
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (open) {
      setEditingDepartment(
        null
      );

      form.reset({
        name: "",
      });
    }
  }, [open, form]);

  /*
  |--------------------------------------------------------------------------
  | Open Edit Dialog
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const handleEdit =
      (event) => {
        const department =
          event.detail;

        if (!department) {
          return;
        }

        setEditingDepartment(
          department
        );

        form.reset({
          name:
            department.name || "",
        });
      };

    window.addEventListener(
      "department-edit",
      handleEdit
    );

    return () => {
      window.removeEventListener(
        "department-edit",
        handleEdit
      );
    };
  }, [form]);

  /*
  |--------------------------------------------------------------------------
  | Mutation
  |--------------------------------------------------------------------------
  */

  const mutation = useMutation({
    mutationFn: async (values) => {
      const isEditing =
        Boolean(
          editingDepartment?.id
        );

      const response =
        await apiFetch(
          "/api/settings/support/department",
          {
            method: isEditing
              ? "PUT"
              : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              isEditing
                ? {
                    id: editingDepartment.id,
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
            (isEditing
              ? "Failed to update department."
              : "Failed to add department.")
        );
      }

      return result;
    },

    /*
    |--------------------------------------------------------------------------
    | Success
    |--------------------------------------------------------------------------
    */

    onSuccess: async (result) => {
      const message =
        result?.message ||
        (editingDepartment
          ? "Department updated successfully."
          : "Department added successfully.");

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
              {message}
            </AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        }
      );

      queryClient.invalidateQueries({
        queryKey: [
          "support-departments",
        ],
      });

      setEditingDepartment(
        null
      );

      form.reset({
        name: "",
      });
      if (onSuccess) {
          await onSuccess(
            result?.data ||
              result?.department ||
              result
          );
        }
      closeDialog();
    },

    /*
    |--------------------------------------------------------------------------
    | Error
    |--------------------------------------------------------------------------
    */

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
              {error?.message ||
                "Something went wrong."}
            </AlertTitle>
          </Alert>
        ),
        {
          position: "top-center",
        }
      );
    },
  });

  /*
  |--------------------------------------------------------------------------
  | Processing
  |--------------------------------------------------------------------------
  */

  const isProcessing =
    mutation.status ===
    "pending";

  /*
  |--------------------------------------------------------------------------
  | Submit
  |--------------------------------------------------------------------------
  */

  const handleSubmit = (values) => {
    const name =
      values.name?.trim() || "";

    if (!name) {
      form.setError("name", {
        type: "manual",
        message:
          "Department name is required.",
      });

      return;
    }

    mutation.mutate({
      name,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Close
  |--------------------------------------------------------------------------
  */

  const handleClose = () => {
    if (isProcessing) {
      return;
    }

    setEditingDepartment(
      null
    );

    form.reset({
      name: "",
    });

    closeDialog();
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <Dialog
      open={
        open ||
        Boolean(editingDepartment)
      }
      onOpenChange={(value) => {
        if (!value) {
          handleClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editingDepartment
              ? "Edit Department"
              : "Add Department"}
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
                render={({
                  field,
                }) => (
                  <FormItem>
                    <FormLabel>
                      Department Name
                    </FormLabel>

                    <FormControl>
                      <Input
                        placeholder="Enter department name"
                        disabled={
                          isProcessing
                        }
                        {...field}
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
                onClick={
                  handleClose
                }
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

                {editingDepartment
                  ? "Update Department"
                  : "Add Department"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default DepartmentAddDialog;