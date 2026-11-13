'use client';

import React from 'react';
import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { useCustomer } from '../components/customer-context';


export default function CustomerAdminsPage() {

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


  const admins =
    customer?.admins ||
    customer?.customer_admins ||
    [];


  return (
    <div className="card">

      {/* Header */}

      <div className="card-header">

        <div className="card-title">
          Customer Admins
        </div>


        <div className="card-toolbar">

          <Button type="button">

            <Plus />

            Assign Admin

          </Button>

        </div>

      </div>


      {/* Table */}

      <div className="card-body p-0">

        <div className="overflow-x-auto">

          <table className="w-full text-sm">

            <thead>

              <tr className="border-b bg-muted/40">

                <th className="px-6 py-4 text-left font-medium">
                  Staff Member
                </th>

                <th className="px-6 py-4 text-left font-medium">
                  Date Assigned
                </th>

                <th className="px-6 py-4 text-right font-medium">
                  Options
                </th>

              </tr>

            </thead>


            <tbody>

              {admins.length === 0 ? (

                <tr>

                  <td
                    colSpan={3}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    No entries found
                  </td>

                </tr>

              ) : (

                admins.map((admin, index) => (

                  <tr
                    key={
                      admin?.id ||
                      admin?.staff_id ||
                      index
                    }
                    className="border-b last:border-b-0"
                  >

                    <td className="px-6 py-4">

                      {admin?.staff_name ||
                        admin?.name ||
                        admin?.staff ||
                        '-'}

                    </td>


                    <td className="px-6 py-4">

                      {admin?.date_assigned ||
                        admin?.assigned_at ||
                        '-'}

                    </td>


                    <td className="px-6 py-4 text-right">

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                      >
                        Remove
                      </Button>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

      </div>

    </div>
  );
}