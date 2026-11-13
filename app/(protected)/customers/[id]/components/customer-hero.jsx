'use client';

import React from 'react';
import {
  Building2,
  Mail,
  Phone,
} from 'lucide-react';

function Skeleton() {
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center gap-4">

          <div className="size-14 animate-pulse rounded-xl bg-muted" />

          <div className="space-y-2">
            <div className="h-5 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>

        </div>
      </div>
    </div>
  );
}

export default function CustomerHero({
  customer,
  isLoading,
}) {
  if (isLoading) {
    return <Skeleton />;
  }

  if (!customer) {
    return null;
  }

  const company =
    customer?.company ||
    customer?.name ||
    'Customer';

  const phone =
    customer?.phonenumber ||
    customer?.phone ||
    '';

  const email =
    customer?.email ||
    '';

  return (
    <div className="card mb-5">

      <div className="card-body">

        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

          {/* Customer */}
          <div className="flex items-center gap-4">

            <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">

              <Building2 className="size-7 text-primary" />

            </div>

            <div>

              <h2 className="text-xl font-semibold">
                {company}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Customer #{customer?.id}
              </p>

            </div>

          </div>


          {/* Contact */}
          <div className="flex flex-col gap-2 text-sm text-muted-foreground md:items-end">

            {email && (
              <div className="flex items-center gap-2">
                <Mail className="size-4" />
                <span>{email}</span>
              </div>
            )}

            {phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4" />
                <span>{phone}</span>
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
}