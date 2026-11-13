"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { RiCheckboxCircleFill, RiErrorWarningFill } from "@remixicon/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LoaderCircleIcon } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { getInitials } from "@/lib/helpers";
import { Alert, AlertIcon, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardHeading,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { AccountProfileSchema } from "../forms/account-profile-schema";
import { useAccount } from "./account-context";

const DEFAULT_AVATAR = "/media/avatars/300-2.png";

export default function AccountDetails() {
  const queryClient = useQueryClient();
  const { data: session, update: updateSession } = useSession();
  const { user } = useAccount();

  const [avatarExistingPreview, setAvatarExistingPreview] = useState(null);
  const [avatarAttachedPreview, setAvatarAttachedPreview] = useState(null);

  const avatarFileRef = useRef(null);

  const safeUser = user ?? {};

  const transformedProfile = {
    ...safeUser,
    avatarFile: null,
    avatarAction: "",
    name: safeUser.name || "",
  };

  const form = useForm({
    resolver: zodResolver(AccountProfileSchema),
    defaultValues: transformedProfile,
    mode: "onSubmit",
  });

  // Update the form and avatar when the logged-in user's data loads.
  useEffect(() => {
    if (!user) return;

    setAvatarExistingPreview(user.avatar || null);
    setAvatarAttachedPreview(null);

    form.reset({
      ...user,
      avatarFile: null,
      avatarAction: "",
      name: user.name || "",
    });
  }, [user, form]);

  const mutation = useMutation({
    mutationFn: async (values) => {
      const formData = new FormData();

      Object.entries(values).forEach(([key, value]) => {
        if (key === "avatarFile") {
          if (value instanceof File) {
            formData.append("avatarFile", value);
          }
          return;
        }

        if (value !== undefined && value !== null) {
          formData.append(key, String(value));
        }
      });

      const response = await apiFetch("/api/user-management/account/profile", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.message || "Unable to update account.");
      }

      return result;
    },

    onSuccess: async (updatedUser) => {
      await queryClient.invalidateQueries({
        queryKey: ["account-profile"],
      });

      const savedUser = updatedUser?.user ?? updatedUser?.data ?? updatedUser;

      if (savedUser && typeof savedUser === "object") {
        setAvatarExistingPreview(savedUser.avatar || null);
        setAvatarAttachedPreview(null);

        form.reset({
          ...form.getValues(),
          ...savedUser,
          avatarFile: null,
          avatarAction: "",
          name: savedUser.name || "",
        });

        if (session) {
          await updateSession({ user: savedUser });
        }
      }

      toast.custom(() => (
        <Alert variant="mono" icon="success">
          <AlertIcon>
            <RiCheckboxCircleFill />
          </AlertIcon>
          <AlertTitle>Account updated successfully</AlertTitle>
        </Alert>
      ));
    },

    onError: (error) => {
      toast.custom(
        () => (
          <Alert variant="mono" icon="destructive">
            <AlertIcon>
              <RiErrorWarningFill />
            </AlertIcon>
            <AlertTitle>{error.message}</AlertTitle>
          </Alert>
        ),
        { position: "top-center" },
      );
    },
  });

  const isProcessing = mutation.isPending;

  const handleRemoveAvatar = () => {
    setAvatarExistingPreview(null);
    setAvatarAttachedPreview(null);

    form.setValue("avatarFile", null, { shouldDirty: true });
    form.setValue("avatarAction", "remove", { shouldDirty: true });
    form.trigger("avatarFile");
  };

  const handleCancelAvatar = () => {
    setAvatarAttachedPreview(null);
    setAvatarExistingPreview(user?.avatar || null);

    form.setValue("avatarFile", null, { shouldDirty: true });
    form.setValue("avatarAction", "", { shouldDirty: true });

    if (avatarFileRef.current) {
      avatarFileRef.current.value = "";
    }
  };

  const handleChangeAvatar = (event, field) => {
    const file = event.target.files?.[0] || null;

    if (!file) return;

    field.onChange(file);
    form.setValue("avatarFile", file, { shouldDirty: true });
    form.setValue("avatarAction", "save", { shouldDirty: true });

    const reader = new FileReader();

    reader.onload = () => {
      setAvatarAttachedPreview(reader.result);
    };

    reader.readAsDataURL(file);
  };

  const handleFormReset = () => {
    form.reset({
      ...(user ?? {}),
      avatarFile: null,
      avatarAction: "",
      name: user?.name || "",
    });

    setAvatarAttachedPreview(null);
    setAvatarExistingPreview(user?.avatar || null);

    if (avatarFileRef.current) {
      avatarFileRef.current.value = "";
    }
  };

  const handleSubmit = (values) => {
    mutation.mutate(values);
  };

  const avatarSrc = avatarAttachedPreview || avatarExistingPreview || undefined;

  return (
    <Card>
      <CardHeader className="py-4">
        <CardHeading>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage profile information</CardDescription>
        </CardHeading>
      </CardHeader>

      <CardContent className="py-8">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="mx-auto space-y-6 lg:w-[500px]"
          >
            {/* Avatar */}
            <FormField
              control={form.control}
              name="avatarFile"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-5">
                    <Avatar className="size-24">
                      <AvatarImage src={avatarSrc} alt={user?.name || ""} />

                      <AvatarFallback className="text-2xl">
                        {getInitials(user?.name || user?.email || "")}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <FormLabel>Profile Avatar</FormLabel>

                      <FormControl>
                        <div className="my-1.5 flex flex-col space-y-1">
                          <div className="flex space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => avatarFileRef.current?.click()}
                            >
                              Attach Image
                            </Button>

                            {(avatarAttachedPreview ||
                              (!avatarAttachedPreview &&
                                !avatarExistingPreview &&
                                user?.avatar)) && (
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCancelAvatar}
                              >
                                Cancel
                              </Button>
                            )}

                            {user?.avatar &&
                              avatarExistingPreview &&
                              !avatarAttachedPreview && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={handleRemoveAvatar}
                                >
                                  Remove
                                </Button>
                              )}
                          </div>

                          <input
                            ref={avatarFileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/gif,image/webp"
                            className="hidden"
                            onChange={(event) =>
                              handleChangeAvatar(event, field)
                            }
                          />
                        </div>
                      </FormControl>

                      <FormDescription>
                        Supported formats: PNG, JPEG, GIF, and WebP. Maximum
                        size: 1 MB.
                      </FormDescription>

                      <FormMessage />
                    </div>
                  </div>
                </FormItem>
              )}
            />

            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={handleFormReset}>
                Reset
              </Button>

              <Button
                type="submit"
                disabled={!form.formState.isDirty || isProcessing}
              >
                {isProcessing && <LoaderCircleIcon className="animate-spin" />}
                Save Profile
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
