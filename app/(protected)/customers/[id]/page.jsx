'use client';

import React from 'react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { Checkbox } from '@/components/ui/checkbox';

import { useCustomer } from './components/customer-context';


function Field({
  label,
  value,
  required = false,
}) {
  return (
    <div className="space-y-2">

      <label className="text-sm font-medium">
        {label}

        {required && (
          <span className="ml-1 text-destructive">
            *
          </span>
        )}
      </label>

      <Input
        value={value ?? ''}
        readOnly
      />

    </div>
  );
}


export default function CustomerDetailsPage() {
  const {
    customer,
    isLoading,
  } = useCustomer();


  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          Loading customer...
        </div>
      </div>
    );
  }


  if (!customer) {
    return (
      <div className="card">
        <div className="card-body">
          Customer not found.
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-5">

      {/* =================================================
          Customer Details
      ================================================= */}

      <div className="card">

        <div className="card-header">

          <div className="card-title">
            Customer Details
          </div>

        </div>


        <div className="card-body space-y-6">

          {/* Show Primary Contact */}

          <div className="flex items-start gap-3">

            <Checkbox
              id="show_primary_contact"
              defaultChecked={
                Boolean(
                  customer?.show_primary_contact
                )
              }
            />

            <div>

              <label
                htmlFor="show_primary_contact"
                className="text-sm font-medium"
              >
                Show primary contact full name on
                Invoices, Estimates, Payments, Credit
                Notes
              </label>

            </div>

          </div>


          {/* Main Fields */}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

            <Field
              label="Company"
              value={customer?.company}
              required
            />

            <Field
              label="VAT Number"
              value={customer?.vat}
            />

            <Field
              label="Phone"
              value={
                customer?.phonenumber ||
                customer?.phone
              }
            />

            <Field
              label="Website"
              value={customer?.website}
            />

            <Field
              label="Groups"
              value={
                Array.isArray(customer?.groups)
                  ? customer.groups.join(', ')
                  : customer?.groups
              }
            />

            <Field
              label="Currency"
              value={
                customer?.currency ||
                customer?.default_currency ||
                'System Default'
              }
            />

            <Field
              label="Default Language"
              value={
                customer?.default_language ||
                'System Default'
              }
            />

          </div>


          {/* Address */}

          <div className="border-t pt-5">

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              <div className="space-y-2 md:col-span-2">

                <label className="text-sm font-medium">
                  Address
                </label>

                <Textarea
                  value={customer?.address ?? ''}
                  readOnly
                  rows={4}
                />

              </div>


              <Field
                label="City"
                value={customer?.city}
              />

              <Field
                label="State"
                value={customer?.state}
              />

              <Field
                label="Zip Code"
                value={customer?.zip}
              />

              <Field
                label="Country"
                value={customer?.country}
              />

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          Customer Information
      ================================================= */}

      <div className="card">

        <div className="card-header">

          <div className="card-title">
            Customer Information
          </div>

        </div>

        <div className="card-body">

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

            <Field
              label="Customer ID"
              value={customer?.id}
            />

            <Field
              label="Created At"
              value={customer?.created_at}
            />

            <Field
              label="Updated At"
              value={customer?.updated_at}
            />

          </div>

        </div>

      </div>

    </div>
  );
}