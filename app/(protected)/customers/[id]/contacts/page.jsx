'use client';

import React from 'react';

const admins = [
  {
    id: 1,
    name: 'John Smith',
    email: 'john.smith@example.com',
    position: 'Manager',
    phone: '+1 555-0101',
    active: true,
    lastLogin: 'Sep 08, 2026 10:30 AM',
  },
  {
    id: 2,
    name: 'Sarah Johnson',
    email: 'sarah.johnson@example.com',
    position: 'Administrator',
    phone: '+1 555-0102',
    active: true,
    lastLogin: 'Sep 07, 2026 03:45 PM',
  },
  {
    id: 3,
    name: 'Michael Brown',
    email: 'michael.brown@example.com',
    position: 'Accountant',
    phone: '+1 555-0103',
    active: false,
    lastLogin: 'Sep 05, 2026 11:20 AM',
  },
];

export default function CustomerAdminsPage() {
  return (
    <div className="space-y-5">

      <div className="card">

        <div className="card-header">
          <div className="card-title">
            Customer Admins
          </div>
        </div>

        <div className="card-body">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr role="row">
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Full Name
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Email
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Position
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Phone
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Active
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Last Login
                  </th>
                </tr>
              </thead>

              <tbody>

                {admins.map((admin) => (
                  <tr
                    key={admin.id}
                    role="row"
                    className="border-t"
                  >

                    <td className="px-4 py-3 text-sm">
                      {admin.name}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {admin.email}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {admin.position}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {admin.phone}
                    </td>

                    <td className="px-4 py-3 text-sm">

                      <span
                        className={
                          admin.active
                            ? 'text-green-600'
                            : 'text-red-600'
                        }
                      >
                        {admin.active ? 'Yes' : 'No'}
                      </span>

                    </td>

                    <td className="px-4 py-3 text-sm">
                      {admin.lastLogin}
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </div>
  );
}