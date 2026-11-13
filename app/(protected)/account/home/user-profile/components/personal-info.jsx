"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SquarePen, Check, X } from "lucide-react";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { AvatarInput } from "@/partials/common/avatar-input";

const fields = [
  { key: "name", label: "Name", type: "text" },
  { key: "availability", label: "Availability", type: "select" },
  { key: "birthday", label: "Birthday", type: "date" },
  { key: "gender", label: "Gender", type: "select" },
  { key: "address", label: "Address", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "state", label: "State", type: "text" },
  { key: "country", label: "Country", type: "select" },
  { key: "postalCode", label: "Postal Code", type: "text" },
];

const formatBirthday = (value) => {
  if (!value) return "Not provided";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not provided"
    : date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const PersonalInfo = ({ onUserDataUpdated }) => {
  const [profile, setProfile] = useState({});
  const [account, setAccount] = useState({});
  const [editing, setEditing] = useState(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Country dropdown state
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [countryPage, setCountryPage] = useState(1);
  const [countryHasMore, setCountryHasMore] = useState(true);
  const countryLoadingRef = useRef(false);

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/user-details", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load profile");
      }

      setAccount(result.user || {});
      setProfile(result.userDetails || {});
    } catch (error) {
      toast.error(error.message || "Unable to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * Load countries from the database.
   */
  const loadCountries = useCallback(
    async (page = 1) => {
      if (countryLoadingRef.current || (!countryHasMore && page !== 1)) {
        return;
      }

      try {
        countryLoadingRef.current = true;
        setLoadingCountries(true);

        const response = await apiFetch(
          `/api/countries?page=${page}&limit=200&sort=name&dir=asc`,
          { method: "GET" },
        );

        const result =
          typeof response?.json === "function"
            ? await response.json()
            : response;

        if (!result?.success) {
          throw new Error(result?.message || "Failed to load countries.");
        }

        const newCountries = Array.isArray(result.data) ? result.data : [];

        setCountries((previous) => {
          if (page === 1) {
            return newCountries;
          }

          const existingIds = new Set(previous.map((item) => String(item.id)));

          const uniqueCountries = newCountries.filter(
            (item) => !existingIds.has(String(item.id)),
          );

          return [...previous, ...uniqueCountries];
        });

        setCountryPage(page);

        const totalPages = Number(result?.pagination?.totalPages) || 0;

        setCountryHasMore(page < totalPages);
      } catch (error) {
        console.error("LOAD COUNTRIES ERROR:", error);
        toast.error(error.message || "Failed to load countries.");
      } finally {
        countryLoadingRef.current = false;
        setLoadingCountries(false);
      }
    },
    [countryHasMore],
  );

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  /*
   * Load countries when the Country edit icon is clicked.
   */
  const startEdit = async (field) => {
    if (field.key === "country" && countries.length === 0) {
      await loadCountries(1);
    }

    setEditing(field.key);

    const currentValue =
      field.key === "name"
        ? (profile.name ?? account.name ?? "")
        : (profile[field.key] ?? "");

    setValue(
      field.type === "date" && currentValue
        ? String(currentValue).slice(0, 10)
        : String(currentValue),
    );
  };

  /*
   * Save profile field.
   */
  const saveField = async (field) => {
    setSaving(true);

    try {
      const response = await fetch("/api/user-details", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [field.key]: value,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to save profile");
      }

      if (result.userDetails) {
        setProfile(result.userDetails);
      } else {
        setProfile((previous) => ({
          ...previous,
          [field.key]: value,
        }));
      }

      setEditing(null);
      toast.success("Profile updated successfully");

      if (onUserDataUpdated) {
        await onUserDataUpdated();
      }
    } catch (error) {
      toast.error(error.message || "Unable to save profile");
    } finally {
      setSaving(false);
    }
  };

  const displayValue = (field) => {
    const current =
      field.key === "name"
        ? (profile.name ?? account.name)
        : profile[field.key];

    if (field.key === "birthday") {
      return formatBirthday(current);
    }

    if (field.key === "availability") {
      return current || "available";
    }

    if (field.key === "gender") {
      return current || "Not provided";
    }

    return current || "Not provided";
  };

  return (
    <Card className="min-w-full">
      <CardHeader>
        <CardTitle>Personal Info</CardTitle>
      </CardHeader>

      <CardContent className="kt-scrollable-x-auto pb-3 p-0">
        <Table className="align-middle text-sm text-muted-foreground">
          <TableBody>
            {/* Profile photo */}
            <TableRow>
              <TableCell className="py-2 min-w-28 text-secondary-foreground font-normal">
                Photo
              </TableCell>

              <TableCell className="py-2 min-w-32">
                <span className="text-foreground">
                  Upload or change your profile photo
                </span>
              </TableCell>

              <TableCell className="py-2 text-center">
                <div className="flex justify-center">
                  <AvatarInput />
                </div>
              </TableCell>
            </TableRow>

            {fields.map((field) => (
              <TableRow key={field.key}>
                <TableCell className="py-3 min-w-28 text-secondary-foreground font-normal">
                  {field.label}
                </TableCell>

                <TableCell className="py-3 min-w-48">
                  {editing === field.key ? (
                    <div className="space-y-2">
                      <Label htmlFor={`profile-${field.key}`}>
                        {field.label}
                      </Label>

                      {field.type === "select" ? (
                        <select
                          id={`profile-${field.key}`}
                          className="w-full rounded-md border bg-background p-2 text-foreground"
                          value={value}
                          onChange={(event) => setValue(event.target.value)}
                          disabled={field.key === "country" && loadingCountries}
                        >
                          <option value="">
                            {field.key === "country" && loadingCountries
                              ? "Loading countries..."
                              : `Select ${field.label}`}
                          </option>

                          {(field.key === "availability"
                            ? ["available", "busy", "unavailable"]
                            : field.key === "gender"
                              ? ["Male", "Female", "Other", "Prefer not to say"]
                              : field.key === "country"
                                ? countries.map((country) => country.name)
                                : []
                          ).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          id={`profile-${field.key}`}
                          type={field.type}
                          value={value}
                          onChange={(event) => setValue(event.target.value)}
                        />
                      )}
                    </div>
                  ) : field.key === "availability" ? (
                    <Badge size="md" variant="success" appearance="light">
                      {loading ? "Loading..." : displayValue(field)}
                    </Badge>
                  ) : (
                    <span className="text-foreground font-normal">
                      {loading ? "Loading..." : displayValue(field)}
                    </span>
                  )}
                </TableCell>

                <TableCell className="py-3 text-center">
                  {editing === field.key ? (
                    <div className="flex justify-center gap-1">
                      <Button
                        variant="ghost"
                        mode="icon"
                        disabled={saving}
                        onClick={() => saveField(field)}
                        aria-label={`Save ${field.label}`}
                      >
                        <Check size={16} className="text-green-600" />
                      </Button>

                      <Button
                        variant="ghost"
                        mode="icon"
                        disabled={saving}
                        onClick={() => setEditing(null)}
                        aria-label="Cancel editing"
                      >
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      mode="icon"
                      disabled={loading}
                      onClick={() => startEdit(field)}
                      aria-label={`Edit ${field.label}`}
                    >
                      <SquarePen size={16} className="text-blue-500" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export { PersonalInfo };