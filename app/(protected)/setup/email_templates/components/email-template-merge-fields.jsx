"use client";

import { useState } from "react";

import { Check, Copy, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MERGE_FIELD_GROUPS = [
  {
    title: "Client",
    fields: [
      {
        key: "contact_firstname",
        label: "Contact Firstname",
      },
      {
        key: "contact_lastname",
        label: "Contact Lastname",
      },
      {
        key: "contact_phonenumber",
        label: "Contact Phone Number",
      },
      {
        key: "contact_title",
        label: "Contact Title",
      },
      {
        key: "contact_email",
        label: "Contact Email",
      },
      {
        key: "client_company",
        label: "Client Company",
      },
      {
        key: "client_phonenumber",
        label: "Client Phone Number",
      },
      {
        key: "client_country",
        label: "Client Country",
      },
      {
        key: "client_city",
        label: "Client City",
      },
      {
        key: "client_zip",
        label: "Client Zip",
      },
      {
        key: "client_state",
        label: "Client State",
      },
      {
        key: "client_address",
        label: "Client Address",
      },
      {
        key: "client_vat_number",
        label: "Client Vat Number",
      },
      {
        key: "client_id",
        label: "Client ID",
      },
      {
        key: "password",
        label: "Password",
      },
      {
        key: "client_website",
        label: "Client Website",
      },
    ],
  },
  {
    title: "Company",
    fields: [
      {
        key: "company_name",
        label: "Company Name",
      },
      {
        key: "company_email",
        label: "Company Email",
      },
      {
        key: "company_phone",
        label: "Company Phone Number",
      },
      {
        key: "company_address",
        label: "Company Address",
      },
    ],
  },
  {
    title: "User",
    fields: [
      {
        key: "user_name",
        label: "User Name",
      },
      {
        key: "user_email",
        label: "User Email",
      },
    ],
  },
  {
    title: "System",
    fields: [
      {
        key: "date",
        label: "Date",
      },
      {
        key: "time",
        label: "Time",
      },
      {
        key: "site_name",
        label: "Site Name",
      },
      {
        key: "site_url",
        label: "Site URL",
      },
    ],
  },
];

const EmailTemplateMergeFields = ({ onSelect, disabled = false }) => {
  const [copiedField, setCopiedField] = useState("");

  const handleInsert = (field) => {
    if (disabled) {
      return;
    }

    const value = `{${field.key}}`;

    if (onSelect) {
      onSelect(value, field);
    }
  };

  const handleCopy = async (field) => {
    if (disabled) {
      return;
    }

    const value = `{${field.key}}`;

    try {
      await navigator.clipboard.writeText(value);

      setCopiedField(field.key);

      toast.success("Merge field copied.");

      setTimeout(() => {
        setCopiedField("");
      }, 1500);
    } catch (error) {
      console.error("Copy Merge Field Error:", error);

      toast.error("Failed to copy merge field.");
    }
  };

  return (
    <div className="rounded-xl border bg-card">
      {/* Header */}
      <div className="border-b px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold">Available Merge Fields</h3>

            <p className="mt-1 text-xs text-muted-foreground">
              Use dynamic fields in your email template.
            </p>
          </div>

          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {MERGE_FIELD_GROUPS.reduce(
              (total, group) => total + group.fields.length,
              0,
            )}{" "}
            Fields
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="max-w-3xl">
          <div className="overflow-hidden rounded-lg border">
            {MERGE_FIELD_GROUPS.map((group) => (
              <div key={group.title}>
                {/* Group Header */}
                <div className="bg-muted/50 px-4 py-2 font-semibold">
                  {group.title}
                </div>

                {/* List */}
                <div className="divide-y">
                  {group.fields.map((field) => {
                    const value = `{${field.key}}`;
                    const isCopied = copiedField === field.key;

                    return (
                      <div
                        key={field.key}
                        className="flex items-center justify-between gap-4 px-4 py-2.5"
                      >
                        {/* Field Name */}
                        <span className="min-w-0 text-sm">{field.label}</span>

                        {/* Actions */}
                        <div className="flex shrink-0 items-center gap-2">
                          {/* Merge Field */}
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => handleInsert(field)}
                            className="cursor-pointer text-sm font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                            title="Insert merge field"
                          >
                            {value}
                          </button>

                          {/* Insert */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={disabled}
                            onClick={() => handleInsert(field)}
                            className="h-8 gap-1.5 px-2.5"
                            title="Insert into template"
                          >
                            <Plus className="size-3.5" />
                            Insert
                          </Button>

                          {/* Copy */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={disabled}
                            onClick={() => handleCopy(field)}
                            className="size-8"
                            title={isCopied ? "Copied" : "Copy merge field"}
                          >
                            {isCopied ? (
                              <Check className="size-4 text-green-600" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export { MERGE_FIELD_GROUPS };

export default EmailTemplateMergeFields;