'use client';

import React from 'react';

const invoices = [
  {
    id: 1,
    invoiceNo: 'INV-0001',
    amount: '$1,250.00',
    totalTax: '$125.00',
    date: 'Sep 08, 2026',
    project: 'Website Development',
    tags: 'Web, Development',
    dueDate: 'Sep 30, 2026',
    status: 'Paid',
  },
  {
    id: 2,
    invoiceNo: 'INV-0002',
    amount: '$850.00',
    totalTax: '$85.00',
    date: 'Sep 05, 2026',
    project: 'UI/UX Design',
    tags: 'Design',
    dueDate: 'Sep 25, 2026',
    status: 'Unpaid',
  },
  {
    id: 3,
    invoiceNo: 'INV-0003',
    amount: '$2,100.00',
    totalTax: '$210.00',
    date: 'Aug 28, 2026',
    project: 'Mobile Application',
    tags: 'App, Development',
    dueDate: 'Sep 15, 2026',
    status: 'Overdue',
  },
];

export default function InvoicesPage() {
  return (
    <div className="space-y-5">

      <div className="card">

        <div className="card-header">
          <div className="card-title">
            Invoices
          </div>
        </div>

        <div className="card-body">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr role="row">

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Invoice #
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Total Tax
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Date
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Project
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Tags
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Due Date
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Status
                  </th>

                </tr>
              </thead>

              <tbody>

                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    role="row"
                    className="border-t"
                  >

                    <td className="px-4 py-3 text-sm font-medium">
                      {invoice.invoiceNo}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {invoice.amount}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {invoice.totalTax}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {invoice.date}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {invoice.project}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {invoice.tags}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {invoice.dueDate}
                    </td>

                    <td className="px-4 py-3 text-sm">

                      <span
                        className={
                          invoice.status === 'Paid'
                            ? 'text-green-600'
                            : invoice.status === 'Overdue'
                              ? 'text-red-600'
                              : 'text-yellow-600'
                        }
                      >
                        {invoice.status}
                      </span>

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