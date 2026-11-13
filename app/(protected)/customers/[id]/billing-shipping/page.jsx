'use client';

import React from 'react';

import { useCustomer } from '../components/customer-context';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';


function AddressField({
  label,
  value,
}) {
  return (
    <div className="space-y-2">

      <label className="text-sm font-medium">
        {label}
      </label>

      <Input
        value={value ?? ''}
        readOnly
      />

    </div>
  );
}


function AddressCard({
  title,
  fields,
  action,
}) {
  return (
    <div className="card">

      <div className="card-header">

        <div className="flex w-full items-center justify-between gap-3">

          <div className="card-title">
            {title}
          </div>

          {action}

        </div>

      </div>


      <div className="card-body">

        <div className="grid grid-cols-1 gap-5">

          <AddressField
            label="Street"
            value={fields.street}
          />

          <AddressField
            label="City"
            value={fields.city}
          />

          <AddressField
            label="State"
            value={fields.state}
          />

          <AddressField
            label="Zip Code"
            value={fields.zip}
          />

          <AddressField
            label="Country"
            value={fields.country}
          />

        </div>

      </div>

    </div>
  );
}


export default function BillingShippingPage() {

  const {
    customer,
    isLoading,
  } = useCustomer();


  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          Loading...
        </div>
      </div>
    );
  }


  if (!customer) {
    return null;
  }


  const billing = {
    street:
      customer?.billing_street ||
      customer?.billing_address ||
      '',

    city:
      customer?.billing_city ||
      '',

    state:
      customer?.billing_state ||
      '',

    zip:
      customer?.billing_zip ||
      '',

    country:
      customer?.billing_country ||
      '',
  };


  const shipping = {
    street:
      customer?.shipping_street ||
      customer?.shipping_address ||
      '',

    city:
      customer?.shipping_city ||
      '',

    state:
      customer?.shipping_state ||
      '',

    zip:
      customer?.shipping_zip ||
      '',

    country:
      customer?.shipping_country ||
      '',
  };


  return (
    <div className="space-y-5">

      {/* =================================================
          Billing & Shipping
      ================================================= */}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        <AddressCard
          title="Billing Address"
          fields={billing}
          action={
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
            >
              Same as Customer Info
            </button>
          }
        />


        <AddressCard
          title="Shipping Address"
          fields={shipping}
          action={
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
            >
              Copy Billing Address
            </button>
          }
        />

      </div>


      {/* =================================================
          Update Existing Records
      ================================================= */}

      <div className="rounded-lg border bg-muted/40 p-5">

        <div className="space-y-5">

          <div className="flex items-start gap-3">

            <Checkbox
              id="update_all_other_transactions"
            />

            <div className="space-y-1">

              <label
                htmlFor="update_all_other_transactions"
                className="text-sm font-medium"
              >
                Update the shipping/billing info on all
                previous invoices/estimates
              </label>

              <p className="text-sm text-muted-foreground">
                This will update the billing and shipping
                information on previous invoices and
                estimates.
              </p>

            </div>

          </div>


          <div className="flex items-start gap-3">

            <Checkbox
              id="update_credit_notes"
            />

            <div>

              <label
                htmlFor="update_credit_notes"
                className="text-sm font-medium"
              >
                Update the shipping/billing info on all
                previous credit notes
              </label>

              <p className="mt-1 text-sm text-muted-foreground">
                Closed credit notes are not affected.
              </p>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}