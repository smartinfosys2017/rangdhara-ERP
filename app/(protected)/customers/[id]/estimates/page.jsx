'use client';

import React from 'react';

const estimates = [
  {
    id: 1,
    estimateNo: 'EST-0001',
    amount: '$2,500.00',
    totalTax: '$250.00',
    project: 'Website Development',
    tags: 'Web, Development',
    date: 'Sep 08, 2026',
    expiryDate: 'Sep 30, 2026',
    referenceNo: 'REF-1001',
    status: 'Accepted',
  },
  {
    id: 2,
    estimateNo: 'EST-0002',
    amount: '$1,750.00',
    totalTax: '$175.00',
    project: 'UI/UX Design',
    tags: 'Design, UI/UX',
    date: 'Sep 05, 2026',
    expiryDate: 'Sep 25, 2026',
    referenceNo: 'REF-1002',
    status: 'Sent',
  },
  {
    id: 3,
    estimateNo: 'EST-0003',
    amount: '$4,200.00',
    totalTax: '$420.00',
    project: 'Mobile Application',
    tags: 'App, Development',
    date: 'Aug 28, 2026',
    expiryDate: 'Sep 20, 2026',
    referenceNo: 'REF-1003',
    status: 'Draft',
  },
];

export default function EstimatesPage() {
  return (
    <div className="space-y-5">

      <div className="card">

        <div className="card-header">
          <div className="card-title">
            Estimates
          </div>
        </div>

        <div className="card-body">

          <div className="overflow-x-auto">

            <table className="w-full">

              <thead>
                <tr role="row">

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Estimate #
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Total Tax
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Project
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Tags
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Date
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Expiry Date
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Reference #
                  </th>

                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Status
                  </th>

                </tr>
              </thead>

              <tbody>

                {estimates.map((estimate) => (
                  <tr
                    key={estimate.id}
                    role="row"
                    className="border-t"
                  >

                    <td className="px-4 py-3 text-sm font-medium">
                      {estimate.estimateNo}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {estimate.amount}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {estimate.totalTax}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {estimate.project}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {estimate.tags}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {estimate.date}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {estimate.expiryDate}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {estimate.referenceNo}
                    </td>

                    <td className="px-4 py-3 text-sm">

                      <span
                        className={
                          estimate.status === 'Accepted'
                            ? 'text-green-600'
                            : estimate.status === 'Sent'
                              ? 'text-blue-600'
                              : 'text-muted-foreground'
                        }
                      >
                        {estimate.status}
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